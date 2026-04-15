import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Copy, Trash2, Eye, EyeOff, ImageOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LAYOUT_BY_ID, type ExhaustSchemaRecord } from '../../lib/schemaDefinitions'

export default function AdminSchemasListPage() {
  const navigate = useNavigate()
  const [schemas, setSchemas] = useState<ExhaustSchemaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string>('Todas')

  async function loadSchemas() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('exhaust_schemas' as any)
      .select('*')
      .order('brand', { ascending: true })
      .order('model', { ascending: true })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSchemas((data ?? []) as unknown as ExhaustSchemaRecord[])
    setLoading(false)
  }

  useEffect(() => {
    void loadSchemas()
  }, [])

  const brands = useMemo(() => {
    const set = new Set(schemas.map((s) => s.brand))
    return ['Todas', ...Array.from(set).sort()]
  }, [schemas])

  const filtered = useMemo(() => {
    let list = schemas
    if (selectedBrand !== 'Todas') {
      list = list.filter((s) => s.brand === selectedBrand)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.brand.toLowerCase().includes(q) ||
          s.model.toLowerCase().includes(q) ||
          s.engine.toLowerCase().includes(q),
      )
    }
    return list
  }, [schemas, selectedBrand, search])

  async function toggleActive(schema: ExhaustSchemaRecord) {
    const { error } = await supabase
      .from('exhaust_schemas' as any)
      .update({ is_active: !schema.is_active } as any)
      .eq('id', schema.id)
    if (error) {
      alert('Error al cambiar estado: ' + error.message)
      return
    }
    await loadSchemas()
  }

  async function duplicate(schema: ExhaustSchemaRecord) {
    const copy = {
      brand: schema.brand,
      model: `${schema.model} (copia)`,
      year: schema.year,
      engine: schema.engine,
      power: schema.power,
      layout: schema.layout,
      color: schema.color,
      note: schema.note,
      components: schema.components,
      cover_url: schema.cover_url,
      gallery_urls: schema.gallery_urls,
      is_active: false,
    }
    const { data, error } = await supabase
      .from('exhaust_schemas' as any)
      .insert(copy as any)
      .select('id')
      .single()
    if (error) {
      alert('Error al duplicar: ' + error.message)
      return
    }
    navigate(`/admin/esquemas/${(data as any).id}`)
  }

  async function remove(schema: ExhaustSchemaRecord) {
    if (!window.confirm(`¿Borrar "${schema.brand} ${schema.model}" permanentemente?`)) return
    const { error } = await supabase
      .from('exhaust_schemas' as any)
      .delete()
      .eq('id', schema.id)
    if (error) {
      alert('Error al borrar: ' + error.message)
      return
    }
    await loadSchemas()
  }

  return (
    <div>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
            Esquemas de escape
          </h1>
          <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0' }}>
            {schemas.length} modelos · {brands.length - 1} marcas
          </p>
        </div>
        <Link
          to="/admin/esquemas/nuevo"
          style={{
            backgroundColor: '#0071E3',
            color: 'white',
            padding: '9px 16px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={15} />
          Añadir modelo
        </Link>
      </header>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 16,
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 380 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#86868B',
            }}
          />
          <input
            type="text"
            placeholder="Buscar por marca, modelo o motor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '9px 12px 9px 34px',
              borderRadius: 8,
              border: '1px solid #E5E5EA',
              fontSize: 13,
              outline: 'none',
              backgroundColor: '#FFFFFF',
            }}
          />
        </div>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            border: '1px solid #E5E5EA',
            fontSize: 13,
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          {brands.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            backgroundColor: '#FFE5E7',
            color: '#D70015',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#86868B', fontSize: 13 }}>
          Cargando modelos…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: '#86868B',
            fontSize: 13,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E5E5EA',
          }}
        >
          No se encontraron modelos para esos filtros.
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E5E5EA',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 140px 110px 90px 180px',
              gap: 12,
              padding: '10px 16px',
              backgroundColor: '#F5F5F7',
              fontSize: 11,
              fontWeight: 600,
              color: '#86868B',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
            className="admin-list-header"
          >
            <div>Foto</div>
            <div>Marca / Modelo</div>
            <div>Layout</div>
            <div>Potencia</div>
            <div>Estado</div>
            <div style={{ textAlign: 'right' }}>Acciones</div>
          </div>

          {filtered.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 140px 110px 90px 180px',
                gap: 12,
                padding: '12px 16px',
                borderTop: '1px solid #F2F2F7',
                alignItems: 'center',
                fontSize: 13,
              }}
              className="admin-list-row"
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: '#F5F5F7',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {s.cover_url ? (
                  <img
                    src={s.cover_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <ImageOff size={16} style={{ color: '#C7C7CC' }} />
                )}
              </div>

              <div>
                <div style={{ fontWeight: 500, color: '#1D1D1F' }}>
                  <span style={{ color: s.color }}>●</span> {s.brand} {s.model}
                </div>
                <div style={{ fontSize: 11, color: '#86868B' }}>
                  {s.year} · {s.engine}
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#86868B' }}>
                {LAYOUT_BY_ID[s.layout]?.label ?? s.layout}
              </div>

              <div style={{ fontSize: 12, color: '#1D1D1F' }}>{s.power}</div>

              <div>
                <button
                  onClick={() => toggleActive(s)}
                  title={s.is_active ? 'Despublicar' : 'Publicar'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: s.is_active ? '#34C759' : '#86868B',
                    fontWeight: 500,
                  }}
                >
                  {s.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                  {s.is_active ? 'Activo' : 'Oculto'}
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  justifyContent: 'flex-end',
                }}
              >
                <Link
                  to={`/admin/esquemas/${s.id}`}
                  title="Editar"
                  style={actionBtnStyle}
                >
                  <Edit2 size={13} />
                </Link>
                <button
                  type="button"
                  onClick={() => duplicate(s)}
                  title="Duplicar"
                  style={actionBtnStyle}
                >
                  <Copy size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(s)}
                  title="Eliminar"
                  style={{ ...actionBtnStyle, color: '#D70015' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .admin-list-header { display: none !important; }
          .admin-list-row {
            grid-template-columns: 50px 1fr auto !important;
            grid-template-rows: auto auto !important;
          }
          .admin-list-row > :nth-child(3),
          .admin-list-row > :nth-child(4),
          .admin-list-row > :nth-child(5) {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

const actionBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 6,
  border: '1px solid #E5E5EA',
  backgroundColor: '#FFFFFF',
  color: '#1D1D1F',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
}
