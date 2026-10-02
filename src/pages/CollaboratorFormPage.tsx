import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Send, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react'
import PhotoUploader from '../components/admin/PhotoUploader'
import FileManagerField from '../components/admin/FileManagerField'
import { useCollabStore } from '../stores/collabStore'
import { toast } from '../lib/toast'

// ─── Rutas ───
type Route = 'A' | 'B-F1' | 'B-F2' | 'B-F3'
const ROUTES: { id: Route; title: string; desc: string }[] = [
  { id: 'A', title: 'Ruta A — Ya existe catálogo oficial online', desc: 'Referencia OEM verificable con una o dos fuentes web oficiales.' },
  { id: 'B-F1', title: 'Ruta B · Fase 1 — Desmontaje', desc: 'Vídeo/fotos + guía paso a paso del desmontaje.' },
  { id: 'B-F2', title: 'Ruta B · Fase 2 — Piezas y referencias', desc: 'Una foto por pieza con la referencia visible.' },
  { id: 'B-F3', title: 'Ruta B · Fase 3 — Sistema fabricado e instalado', desc: 'Despiece completo del sistema fabricado.' },
]

// ─── Listas cerradas (del HTML de referencia) ───
const COMBUSTIBLES = ['Diésel', 'Gasolina', 'Híbrido', 'Eléctrico (sin escape)', 'GLP/GNC']
const COMPONENTE_TIPOS = ['Catalizador delantero', 'Catalizador trasero', 'Filtro de partículas (FAP/DPF)', 'Downpipe', 'Tubo intermedio', 'Silenciador central', 'Silenciador trasero', 'Colector de escape', 'Sistema completo', 'Otro']
const DIAMETROS = ['38 mm (1,5")', '42,4 mm', '45 mm', '48,3 mm', '50,8 mm (2")', '54 mm', '57 mm', '60 mm', '60,3 mm', '63,5 mm (2,5")', '70 mm', '76 mm (3")', '80 mm', '88,9 mm (3,5")', '101,6 mm (4")', 'Varía según el tramo', 'Otro']
const CODO_GRADOS = ['15°', '30°', '45°', '60°', '90°', '180°', 'Otro']
const CODO_RADIOS = ['1,5D (radio corto)', '2D (radio largo)', 'Otro']
const BRIDA_TIPOS = ['Brida plana', 'V-band', 'Abrazadera / clamp', 'Unión soldada', 'Otro']
const SIL_TIPOS = ['Resonador', 'Silencioso central', 'Silencioso trasero', 'Deportivo / straight-through', 'Antidrone', 'Cámara central', 'Cámara lateral', 'Multicámara', 'Absorción', 'Otro']
const SIL_FORMAS = ['Redondo', 'Ovalado', 'Rectangular']
const VALV_TIPOS = ['Por vacío', 'Eléctrica / motorizada', 'Mecánica (por presión)', 'Manual (cable/mando)', 'Otro']
const SONDA_TIPOS = ['Lambda banda estrecha', 'Lambda banda ancha', 'Sensor temperatura (EGT)', 'Sensor de presión', 'Otro']
const SONDA_ROSCAS = ['M18 x 1,5', 'M12 x 1,25', 'M12 x 1,5', 'Otra']
const FLEX_TIPOS = ['Trenzado simple', 'Trenzado con malla exterior', 'Con fuelle interior', 'Otro']

const blankColaborador = () => ({ nombre: '', empresa: '', email: '', usuario_app: '' })
const blankVehiculo = () => ({ marca: '', modelo: '', anios: '', motorizacion: '', combustible: '' })
const blankScan3d = () => ({ ofrece: false, url: '', formato: '', file_url: null as string | null })
const blankConfirm = () => ({ veracidad: false, fotos: false, condiciones: false })

export default function CollaboratorFormPage() {
  const { mine, submit, fetchMine } = useCollabStore()
  const [route, setRoute] = useState<Route>('A')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tempId] = useState(() => 'sub-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36))

  // Estado por bloques (se ensambla en `data` al enviar según la ruta).
  const [colaborador, setColaborador] = useState(blankColaborador())
  const [instalador, setInstalador] = useState(blankColaborador())
  const [vehiculo, setVehiculo] = useState(blankVehiculo())
  const [caseCode, setCaseCode] = useState('')
  const [scan3d, setScan3d] = useState(blankScan3d())
  const [confirm, setConfirm] = useState(blankConfirm())
  const [notas, setNotas] = useState('')

  // Ruta A
  const [componente, setComponente] = useState({ tipo: '', ref_oem: '' })
  const [fuentes, setFuentes] = useState<any[]>([{ nombre: '', url: '', fecha: '', captura_url: null }])
  const [fotoVehiculo, setFotoVehiculo] = useState<string | null>(null)
  const [fotoPieza, setFotoPieza] = useState<string | null>(null)

  // B-F1 desmontaje
  const [videoUrl, setVideoUrl] = useState('')
  const [indicaciones, setIndicaciones] = useState('')
  const [fotosGaleria, setFotosGaleria] = useState<{ coverUrl: string | null; galleryUrls: string[] }>({ coverUrl: null, galleryUrls: [] })

  // B-F2 piezas
  const [piezas, setPiezas] = useState<any[]>([{ nombre: '', referencia: '', foto_url: null, notas: '' }])

  // B-F3 despiece
  const [diametroPrincipal, setDiametroPrincipal] = useState('')
  const [material, setMaterial] = useState('')
  const [codos, setCodos] = useState<any[]>([])
  const [tramos, setTramos] = useState<any[]>([])
  const [bridas, setBridas] = useState<any[]>([])
  const [silenciadores, setSilenciadores] = useState<any[]>([])
  const [valvulas, setValvulas] = useState<any[]>([])
  const [sondas, setSondas] = useState<any[]>([])
  const [flexibles, setFlexibles] = useState<any[]>([])
  const [despieceArchivo, setDespieceArchivo] = useState<string | null>(null)

  useEffect(() => { void fetchMine() }, [fetchMine])

  const photos = useMemo(() => [fotosGaleria.coverUrl, ...fotosGaleria.galleryUrls].filter(Boolean) as string[], [fotosGaleria])

  async function handleSubmit() {
    setError(null)
    // Validación mínima: identidad + vehículo + confirmaciones.
    const ident = route === 'B-F3' ? instalador : colaborador
    if (!ident.nombre.trim() || !ident.usuario_app.trim()) { setError('Indica tu nombre y el usuario/email de tu cuenta.'); return }
    if (!vehiculo.marca.trim() || !vehiculo.modelo.trim()) { setError('Marca y modelo del vehículo son obligatorios.'); return }
    if (!confirm.veracidad || !confirm.condiciones) { setError('Debes marcar las confirmaciones obligatorias.'); return }

    // Ensamblar el blob según la ruta.
    const base: any = { route, vehiculo, notas: notas.trim() || null, scan_3d: scan3d, confirmaciones: confirm }
    if (route === 'A') {
      if (!fuentes[0]?.url) { setError('La Fuente 1 (URL) es obligatoria en la Ruta A.'); return }
      Object.assign(base, { colaborador, componente, fuentes, fotos: { vehiculo: fotoVehiculo, pieza: fotoPieza } })
    } else if (route === 'B-F1') {
      Object.assign(base, { colaborador, case_code: caseCode || null, desmontaje: { video_url: videoUrl || null, indicaciones, fotos: photos } })
    } else if (route === 'B-F2') {
      Object.assign(base, { colaborador, case_code: caseCode || null, piezas })
    } else {
      Object.assign(base, {
        instalador, case_code: caseCode || null,
        sistema: { diametro_principal: diametroPrincipal, material_necesario: material, codos, tramos, bridas, silenciadores, valvulas, sondas, flexibles, despiece_archivo: despieceArchivo, video_url: videoUrl || null, fotos: photos },
      })
    }

    setSaving(true)
    try {
      const title = `${vehiculo.marca} ${vehiculo.modelo}`.trim() + (route !== 'A' ? ` · ${route}` : '')
      await submit(title, base, {
        route,
        case_code: caseCode || null,
        scan_3d_url: scan3d.ofrece ? (scan3d.file_url || scan3d.url || null) : null,
        scan_3d_format: scan3d.ofrece ? (scan3d.formato || null) : null,
      })
      toast.success('¡Enviado! Un administrador lo revisará antes de publicarlo.')
      // Reset ligero (mantiene la ruta elegida)
      setColaborador(blankColaborador()); setInstalador(blankColaborador()); setVehiculo(blankVehiculo())
      setCaseCode(''); setScan3d(blankScan3d()); setConfirm(blankConfirm()); setNotas('')
      setComponente({ tipo: '', ref_oem: '' }); setFuentes([{ nombre: '', url: '', fecha: '', captura_url: null }])
      setFotoVehiculo(null); setFotoPieza(null); setVideoUrl(''); setIndicaciones('')
      setFotosGaleria({ coverUrl: null, galleryUrls: [] }); setPiezas([{ nombre: '', referencia: '', foto_url: null, notas: '' }])
      setDiametroPrincipal(''); setMaterial(''); setCodos([]); setTramos([]); setBridas([]); setSilenciadores([]); setValvulas([]); setSondas([]); setFlexibles([]); setDespieceArchivo(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al enviar'
      setError(msg); toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', margin: 0 }}>Programa de colaboradores</h1>
        <p style={{ fontSize: 14, color: '#86868B', margin: '6px 0 0', lineHeight: 1.5 }}>
          Envía datos verificados de un modelo. Cada envío se revisa manualmente antes de publicarse — nada se publica automáticamente.
        </p>
      </header>

      {/* Selector de ruta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: 22 }}>
        {ROUTES.map((r) => (
          <button key={r.id} onClick={() => setRoute(r.id)} style={routeBtn(route === r.id)}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{r.title}</div>
            <div style={{ fontSize: 11, color: '#86868B', lineHeight: 1.4 }}>{r.desc}</div>
          </button>
        ))}
      </div>

      {/* Identidad */}
      <Card title={route === 'B-F3' ? 'Quién realiza el montaje' : 'Tus datos'}>
        <PersonFields value={route === 'B-F3' ? instalador : colaborador} onChange={route === 'B-F3' ? setInstalador : setColaborador} />
      </Card>

      {/* Caso (fases B-F2/F3) */}
      {(route === 'B-F2' || route === 'B-F3') && (
        <Card title="Identificación del caso">
          <Field label="Código de caso (si ya te lo hemos facilitado)"><input style={inp} value={caseCode} onChange={(e) => setCaseCode(e.target.value)} placeholder="Ej. EM-2026-000123" /></Field>
        </Card>
      )}

      {/* Vehículo */}
      <Card title="Vehículo">
        <div style={grid2}>
          <Field label="Marca *"><input style={inp} value={vehiculo.marca} onChange={(e) => setVehiculo({ ...vehiculo, marca: e.target.value })} placeholder="Volkswagen" /></Field>
          <Field label="Modelo *"><input style={inp} value={vehiculo.modelo} onChange={(e) => setVehiculo({ ...vehiculo, modelo: e.target.value })} placeholder="Golf VII" /></Field>
          <Field label="Motorización"><input style={inp} value={vehiculo.motorizacion} onChange={(e) => setVehiculo({ ...vehiculo, motorizacion: e.target.value })} placeholder="2.0 TDI 150cv" /></Field>
          <Field label="Año(s)"><input style={inp} value={vehiculo.anios} onChange={(e) => setVehiculo({ ...vehiculo, anios: e.target.value })} placeholder="2015-2017" /></Field>
          <Field label="Combustible">
            <select style={inp} value={vehiculo.combustible} onChange={(e) => setVehiculo({ ...vehiculo, combustible: e.target.value })}>
              <option value="">Selecciona…</option>{COMBUSTIBLES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      {/* ─── RUTA A ─── */}
      {route === 'A' && (
        <>
          <Card title="Componente y referencia OEM">
            <div style={grid2}>
              <Field label="Tipo de componente *">
                <select style={inp} value={componente.tipo} onChange={(e) => setComponente({ ...componente, tipo: e.target.value })}>
                  <option value="">Selecciona…</option>{COMPONENTE_TIPOS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Referencia OEM propuesta *"><input style={inp} value={componente.ref_oem} onChange={(e) => setComponente({ ...componente, ref_oem: e.target.value })} /></Field>
            </div>
          </Card>

          <Card title="Fuentes de verificación">
            <p style={hint}>La Fuente 1 es obligatoria. Aportar una 2ª fuente sube el pago (dato "verificado" vs "candidato").</p>
            <Repeatable items={fuentes} setItems={setFuentes} min={1} addLabel="+ Añadir otra fuente"
              blank={() => ({ nombre: '', url: '', fecha: '', captura_url: null })}
              label={(i) => `Fuente ${i + 1}`}
              render={(f, upd) => (
                <>
                  <div style={grid2}>
                    <Field label="Nombre del catálogo / tienda oficial"><input style={inp} value={f.nombre} onChange={(e) => upd({ nombre: e.target.value })} placeholder="parts.vw.com…" /></Field>
                    <Field label="URL"><input style={inp} value={f.url} onChange={(e) => upd({ url: e.target.value })} placeholder="https://…" /></Field>
                  </div>
                  <div style={grid2}>
                    <Field label="Fecha de consulta"><input type="date" style={inp} value={f.fecha} onChange={(e) => upd({ fecha: e.target.value })} /></Field>
                    <Field label="Captura de pantalla"><FileManagerField value={f.captura_url} onChange={(url) => upd({ captura_url: url })} kind="image" bucket="content-media" prefix={`${tempId}/fuentes`} accept="image/*,.pdf" maxSizeMB={20} /></Field>
                  </div>
                </>
              )}
            />
          </Card>

          <Card title="Fotos (opcional pero valoradas)">
            <div style={grid2}>
              <Field label="Foto del vehículo"><FileManagerField value={fotoVehiculo} onChange={setFotoVehiculo} kind="image" bucket="content-media" prefix={`${tempId}/foto`} accept="image/*" maxSizeMB={20} /></Field>
              <Field label="Foto de la pieza"><FileManagerField value={fotoPieza} onChange={setFotoPieza} kind="image" bucket="content-media" prefix={`${tempId}/foto`} accept="image/*" maxSizeMB={20} /></Field>
            </div>
          </Card>
        </>
      )}

      {/* ─── B-F1 DESMONTAJE ─── */}
      {route === 'B-F1' && (
        <Card title="Desmontaje">
          <p style={hint}>Los vídeos pesan demasiado para adjuntarlos: súbelo a YouTube/Drive y pega el enlace.</p>
          <Field label="Enlace al vídeo del desmontaje"><input style={inp} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" /></Field>
          <Field label="Indicaciones paso a paso *"><textarea style={{ ...inp, minHeight: 120, resize: 'vertical' }} value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} placeholder="Herramientas, orden de pasos, pares de apriete, precauciones…" /></Field>
          <Field label="Fotos paso a paso"><PhotoUploader schemaId={`${tempId}/desmontaje`} coverUrl={fotosGaleria.coverUrl} galleryUrls={fotosGaleria.galleryUrls} onChange={setFotosGaleria} /></Field>
        </Card>
      )}

      {/* ─── B-F2 PIEZAS ─── */}
      {route === 'B-F2' && (
        <Card title="Piezas">
          <p style={hint}>Una foto por pieza con la referencia bien visible: es la prueba que sustituye a la fuente oficial.</p>
          <Repeatable items={piezas} setItems={setPiezas} min={1} addLabel="+ Añadir otra pieza"
            blank={() => ({ nombre: '', referencia: '', foto_url: null, notas: '' })}
            label={(i) => `Pieza ${i + 1}`}
            render={(p, upd) => (
              <>
                <div style={grid2}>
                  <Field label="Nombre de la pieza *"><input style={inp} value={p.nombre} onChange={(e) => upd({ nombre: e.target.value })} placeholder="Catalizador trasero" /></Field>
                  <Field label="Referencia (como en la foto) *"><input style={inp} value={p.referencia} onChange={(e) => upd({ referencia: e.target.value })} /></Field>
                </div>
                <Field label="Foto de la pieza con la referencia visible *"><FileManagerField value={p.foto_url} onChange={(url) => upd({ foto_url: url })} kind="image" bucket="content-media" prefix={`${tempId}/piezas`} accept="image/*" maxSizeMB={20} /></Field>
                <Field label="Notas / ubicación"><input style={inp} value={p.notas} onChange={(e) => upd({ notas: e.target.value })} placeholder="entre el downpipe y el silencioso central" /></Field>
              </>
            )}
          />
        </Card>
      )}

      {/* ─── B-F3 DESPIECE ─── */}
      {route === 'B-F3' && (
        <>
          <Card title="Material">
            <Field label="Diámetro principal del tubo *">
              <select style={inp} value={diametroPrincipal} onChange={(e) => setDiametroPrincipal(e.target.value)}>
                <option value="">Selecciona…</option>{DIAMETROS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Material necesario *"><textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Tipo de acero/aleación, diámetros, espesores, soldadura…" /></Field>
          </Card>

          <Card title="Despiece de materiales">
            <Repeatable items={codos} setItems={setCodos} label={(i) => `Codo ${i + 1}`} addLabel="+ Añadir codo" blank={() => ({ grados: '', cantidad: '', radio: '', diametro: '' })}
              render={(c, upd) => (<div style={grid2}>
                <Field label="Grados"><select style={inp} value={c.grados} onChange={(e) => upd({ grados: e.target.value })}><option value="">…</option>{CODO_GRADOS.map((g) => <option key={g}>{g}</option>)}</select></Field>
                <Field label="Cantidad"><input type="number" style={inp} value={c.cantidad} onChange={(e) => upd({ cantidad: e.target.value })} /></Field>
                <Field label="Radio"><select style={inp} value={c.radio} onChange={(e) => upd({ radio: e.target.value })}><option value="">…</option>{CODO_RADIOS.map((r) => <option key={r}>{r}</option>)}</select></Field>
                <Field label="Diámetro (si distinto)"><input style={inp} value={c.diametro} onChange={(e) => upd({ diametro: e.target.value })} /></Field>
              </div>)} />

            <Repeatable items={tramos} setItems={setTramos} label={(i) => `Tramo recto ${i + 1}`} addLabel="+ Añadir tramo recto" blank={() => ({ longitud: '', diametro: '', cantidad: '' })}
              render={(t, upd) => (<div style={grid2}>
                <Field label="Longitud"><input style={inp} value={t.longitud} onChange={(e) => upd({ longitud: e.target.value })} placeholder="45 cm" /></Field>
                <Field label="Diámetro"><input style={inp} value={t.diametro} onChange={(e) => upd({ diametro: e.target.value })} placeholder="60 mm" /></Field>
                <Field label="Cantidad"><input type="number" style={inp} value={t.cantidad} onChange={(e) => upd({ cantidad: e.target.value })} /></Field>
              </div>)} />

            <Repeatable items={bridas} setItems={setBridas} label={(i) => `Brida/conexión ${i + 1}`} addLabel="+ Añadir brida/conexión" blank={() => ({ tipo: '', medida: '', cantidad: '', foto_url: null })}
              render={(b, upd) => (<>
                <div style={grid2}>
                  <Field label="Tipo"><select style={inp} value={b.tipo} onChange={(e) => upd({ tipo: e.target.value })}><option value="">…</option>{BRIDA_TIPOS.map((x) => <option key={x}>{x}</option>)}</select></Field>
                  <Field label="Medida / diámetro"><input style={inp} value={b.medida} onChange={(e) => upd({ medida: e.target.value })} placeholder="60 mm" /></Field>
                  <Field label="Cantidad"><input type="number" style={inp} value={b.cantidad} onChange={(e) => upd({ cantidad: e.target.value })} /></Field>
                  <Field label="Foto/archivo con medidas"><FileManagerField value={b.foto_url} onChange={(url) => upd({ foto_url: url })} kind="file" bucket="tutorial-files" prefix={`${tempId}/bridas`} accept="image/*,.pdf,.stl,.step,.stp,.obj" maxSizeMB={50} /></Field>
                </div>
              </>)} />

            <Repeatable items={silenciadores} setItems={setSilenciadores} label={(i) => `Silenciador ${i + 1}`} addLabel="+ Añadir silenciador" blank={() => ({ tipo: '', forma: '', dimensiones: '', diametro_es: '', cantidad: '', foto_url: null })}
              render={(s, upd) => (<>
                <div style={grid2}>
                  <Field label="Tipo"><select style={inp} value={s.tipo} onChange={(e) => upd({ tipo: e.target.value })}><option value="">…</option>{SIL_TIPOS.map((x) => <option key={x}>{x}</option>)}</select></Field>
                  <Field label="Forma"><select style={inp} value={s.forma} onChange={(e) => upd({ forma: e.target.value })}><option value="">…</option>{SIL_FORMAS.map((x) => <option key={x}>{x}</option>)}</select></Field>
                  <Field label="Dimensiones"><input style={inp} value={s.dimensiones} onChange={(e) => upd({ dimensiones: e.target.value })} placeholder="400x200x130 mm" /></Field>
                  <Field label="Diámetro entrada/salida"><input style={inp} value={s.diametro_es} onChange={(e) => upd({ diametro_es: e.target.value })} placeholder="60/76 mm" /></Field>
                  <Field label="Cantidad"><input type="number" style={inp} value={s.cantidad} onChange={(e) => upd({ cantidad: e.target.value })} /></Field>
                  <Field label="Foto/plano o archivo 3D"><FileManagerField value={s.foto_url} onChange={(url) => upd({ foto_url: url })} kind="file" bucket="tutorial-files" prefix={`${tempId}/sil`} accept="image/*,.pdf,.stl,.step,.stp,.obj" maxSizeMB={50} /></Field>
                </div>
              </>)} />

            <Repeatable items={valvulas} setItems={setValvulas} label={(i) => `Válvula ${i + 1}`} addLabel="+ Añadir válvula" blank={() => ({ tipo: '', diametro: '', ubicacion: '', cantidad: '' })}
              render={(v, upd) => (<div style={grid2}>
                <Field label="Tipo"><select style={inp} value={v.tipo} onChange={(e) => upd({ tipo: e.target.value })}><option value="">…</option>{VALV_TIPOS.map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Diámetro"><input style={inp} value={v.diametro} onChange={(e) => upd({ diametro: e.target.value })} placeholder="63,5 mm" /></Field>
                <Field label="Ubicación"><input style={inp} value={v.ubicacion} onChange={(e) => upd({ ubicacion: e.target.value })} /></Field>
                <Field label="Cantidad"><input type="number" style={inp} value={v.cantidad} onChange={(e) => upd({ cantidad: e.target.value })} /></Field>
              </div>)} />

            <Repeatable items={sondas} setItems={setSondas} label={(i) => `Sonda/sensor ${i + 1}`} addLabel="+ Añadir sonda/sensor" blank={() => ({ tipo: '', rosca: '', ubicacion: '', cantidad: '' })}
              render={(s, upd) => (<div style={grid2}>
                <Field label="Tipo"><select style={inp} value={s.tipo} onChange={(e) => upd({ tipo: e.target.value })}><option value="">…</option>{SONDA_TIPOS.map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Rosca"><select style={inp} value={s.rosca} onChange={(e) => upd({ rosca: e.target.value })}><option value="">…</option>{SONDA_ROSCAS.map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Ubicación"><input style={inp} value={s.ubicacion} onChange={(e) => upd({ ubicacion: e.target.value })} placeholder="pre/post-catalizador" /></Field>
                <Field label="Cantidad"><input type="number" style={inp} value={s.cantidad} onChange={(e) => upd({ cantidad: e.target.value })} /></Field>
              </div>)} />

            <Repeatable items={flexibles} setItems={setFlexibles} label={(i) => `Flexible ${i + 1}`} addLabel="+ Añadir tramo flexible" blank={() => ({ diametro: '', longitud: '', tipo: '', ubicacion_cantidad: '' })}
              render={(f, upd) => (<div style={grid2}>
                <Field label="Diámetro"><input style={inp} value={f.diametro} onChange={(e) => upd({ diametro: e.target.value })} placeholder="60 mm" /></Field>
                <Field label="Longitud"><input style={inp} value={f.longitud} onChange={(e) => upd({ longitud: e.target.value })} placeholder="10 cm" /></Field>
                <Field label="Tipo"><select style={inp} value={f.tipo} onChange={(e) => upd({ tipo: e.target.value })}><option value="">…</option>{FLEX_TIPOS.map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Ubicación / cantidad"><input style={inp} value={f.ubicacion_cantidad} onChange={(e) => upd({ ubicacion_cantidad: e.target.value })} /></Field>
              </div>)} />

            <Field label="Lista de despiece detallada (PDF/hoja de cálculo, opcional)"><FileManagerField value={despieceArchivo} onChange={setDespieceArchivo} kind="file" bucket="tutorial-files" prefix={`${tempId}/despiece`} accept=".pdf,.xlsx,.csv,image/*" maxSizeMB={50} /></Field>
          </Card>

          <Card title="Resultado final">
            <Field label="Enlace a vídeo del sistema terminado (opcional)"><input style={inp} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" /></Field>
            <Field label="Fotos del sistema terminado e instalado"><PhotoUploader schemaId={`${tempId}/resultado`} coverUrl={fotosGaleria.coverUrl} galleryUrls={fotosGaleria.galleryUrls} onChange={setFotosGaleria} /></Field>
            <Field label="Notas adicionales"><textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={notas} onChange={(e) => setNotas(e.target.value)} /></Field>
          </Card>
        </>
      )}

      {/* Escaneo 3D (todas las rutas) */}
      <Card title="Escaneo 3D (opcional — muy valorado)">
        <p style={hint}>Si eres profesional y tienes equipo de escaneado 3D, aporta el escaneo. Se valora y paga aparte. Tras verificarlo, un admin lo sube a la sección de Diseños 3D.</p>
        <label style={checkRow}>
          <input type="checkbox" checked={scan3d.ofrece} onChange={(e) => setScan3d({ ...scan3d, ofrece: e.target.checked })} />
          Puedo aportar un escaneo 3D de la(s) pieza(s)/carrocería.
        </label>
        {scan3d.ofrece && (
          <>
            <Field label="Subir el archivo 3D directamente (recomendado)">
              <FileManagerField
                value={scan3d.file_url}
                onChange={(url) => setScan3d({ ...scan3d, file_url: url })}
                kind="file"
                bucket="tutorial-files"
                prefix={`${tempId}/scan3d`}
                accept=".stl,.stp,.step,.obj,.ply,.igs,.iges,.zip,model/stl,model/step,model/obj"
                maxSizeMB={512}
              />
              <p style={{ fontSize: 11, color: '#86868B', margin: '4px 0 0' }}>
                Se guarda en la plataforma (no caduca). Si el archivo es enorme y no sube, usa el enlace de abajo.
              </p>
            </Field>
            <div style={grid2}>
              <Field label="…o pega un enlace de descarga (Drive/WeTransfer…)"><input style={inp} value={scan3d.url} onChange={(e) => setScan3d({ ...scan3d, url: e.target.value })} placeholder="https://…" /></Field>
              <Field label="Formato"><input style={inp} value={scan3d.formato} onChange={(e) => setScan3d({ ...scan3d, formato: e.target.value })} placeholder="STL, OBJ, STEP…" /></Field>
            </div>
          </>
        )}
      </Card>

      {/* Notas (rutas A/B1/B2) */}
      {route !== 'B-F3' && (
        <Card title="Notas adicionales">
          <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Compatibilidades, dudas sobre la referencia, plataforma compartida…" />
        </Card>
      )}

      {/* Confirmaciones */}
      <Card title="Confirmaciones">
        <label style={checkRow}><input type="checkbox" checked={confirm.veracidad} onChange={(e) => setConfirm({ ...confirm, veracidad: e.target.checked })} /> Confirmo que no he inventado ni completado datos que no pueda verificar.</label>
        <label style={checkRow}><input type="checkbox" checked={confirm.fotos} onChange={(e) => setConfirm({ ...confirm, fotos: e.target.checked })} /> Confirmo que las fotos/vídeos son míos o tengo permiso para compartirlos.</label>
        <label style={checkRow}><input type="checkbox" checked={confirm.condiciones} onChange={(e) => setConfirm({ ...confirm, condiciones: e.target.checked })} /> Entiendo que mi envío pasa por revisión manual y que el pago se acredita como saldo en el monedero interno.</label>
      </Card>

      {error && <div style={errorBox}>{error}</div>}
      <button onClick={handleSubmit} disabled={saving} style={submitBtn}>
        {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
        {saving ? 'Enviando…' : 'Enviar para revisión'}
      </button>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      {/* Mis envíos */}
      {mine.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1D1D1F', margin: '0 0 12px' }}>Mis envíos</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mine.map((s) => (
              <div key={s.id} style={submissionRow}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#1D1D1F', fontSize: 14 }}>{s.title || '(sin título)'}{s.route ? ` · ${s.route}` : ''}</div>
                  <div style={{ fontSize: 12, color: '#86868B' }}>{new Date(s.created_at).toLocaleString('es-ES')}</div>
                  {s.review_notes && <div style={{ fontSize: 12, color: '#B25400', marginTop: 4 }}>Nota del revisor: {s.review_notes}</div>}
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Sub-componentes ───
function PersonFields({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <>
      <div style={grid2}>
        <Field label="Nombre completo *"><input style={inp} value={value.nombre} onChange={(e) => onChange({ ...value, nombre: e.target.value })} /></Field>
        <Field label="Empresa / marca (si aplica)"><input style={inp} value={value.empresa} onChange={(e) => onChange({ ...value, empresa: e.target.value })} placeholder="Talleres Pérez S.L." /></Field>
      </div>
      <div style={grid2}>
        <Field label="Email de contacto"><input style={inp} value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} /></Field>
        <Field label="Usuario/email de tu cuenta *"><input style={inp} value={value.usuario_app} onChange={(e) => onChange({ ...value, usuario_app: e.target.value })} /></Field>
      </div>
    </>
  )
}

function Repeatable({ items, setItems, blank, label, addLabel, render, min = 0 }: {
  items: any[]; setItems: (v: any[]) => void; blank: () => any; label: (i: number) => string; addLabel: string; min?: number
  render: (item: any, update: (patch: any) => void) => React.ReactNode
}) {
  const update = (i: number, patch: any) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const remove = (i: number) => { if (items.length > min) setItems(items.filter((_, j) => j !== i)) }
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={repBlock}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0071E3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label(i)}</span>
            {items.length > min && <button type="button" onClick={() => remove(i)} style={iconBtn}><Trash2 size={14} /></button>}
          </div>
          {render(it, (patch) => update(i, patch))}
        </div>
      ))}
      <button type="button" onClick={() => setItems([...items, blank()])} style={addBtn}><Plus size={15} /> {addLabel}</button>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={cardStyle}><h2 style={sectionTitle}>{title}</h2>{children}</section>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'block', marginBottom: 12 }}><span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3A3A3C', marginBottom: 5 }}>{label}</span>{children}</label>
}
function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const map = { pending: { bg: '#FFF3CD', fg: '#8A6D00', icon: <Clock size={12} />, label: 'Pendiente' }, approved: { bg: '#D1F7D1', fg: '#1A8C1A', icon: <CheckCircle2 size={12} />, label: 'Aprobado' }, rejected: { bg: '#FEE2E2', fg: '#B91C1C', icon: <XCircle size={12} />, label: 'Rechazado' } } as const
  const c = map[status] ?? map.pending
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: c.bg, color: c.fg, borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.icon} {c.label}</span>
}

// ─── Estilos ───
const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #E5E5EA', borderRadius: 14, padding: 20, marginBottom: 16 }
const sectionTitle: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: '#1D1D1F', margin: '0 0 14px' }
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E5EA', fontSize: 14, outline: 'none', background: '#fff', fontFamily: 'inherit' }
const hint: React.CSSProperties = { fontSize: 12, color: '#86868B', margin: '0 0 12px', lineHeight: 1.5 }
const repBlock: React.CSSProperties = { border: '1px solid #F0F0F2', background: '#FAFAFC', borderRadius: 12, padding: 14, marginBottom: 10 }
const iconBtn: React.CSSProperties = { background: 'none', border: '1px solid #E5E5EA', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#FF3B30', display: 'inline-flex' }
const addBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F5F5F7', border: '1px solid #E5E5EA', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, color: '#0071E3', cursor: 'pointer' }
const checkRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#3A3A3C', marginBottom: 10, lineHeight: 1.4, cursor: 'pointer' }
const submitBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0071E3', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }
const errorBox: React.CSSProperties = { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 14 }
const submissionRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, padding: '12px 16px' }
const routeBtn = (active: boolean): React.CSSProperties => ({ textAlign: 'left', background: active ? 'linear-gradient(180deg,#F0F7FF,#fff)' : '#fff', border: '1px solid ' + (active ? '#0071E3' : '#E5E5EA'), borderRadius: 12, padding: '14px 16px', cursor: 'pointer' })
