import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Factory, BookOpen, ExternalLink, FileText, Download, Lock, Box, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import {
  ARTICLE_CATEGORY_LABEL,
  canDownloadManual,
  canSeeOem,
  type AftermarketBrand,
  type Article,
} from '../lib/contentTypes'

interface Related3D { id: string; title: string; thumbnail_url: string | null; file_url: string | null; files: { url: string; name: string }[] | null; part_type: string | null }

interface Props {
  schemaId: string
  schemaBrand: string
  /** Para las relaciones con alcance «todas las motorizaciones del modelo» (scope = 'modelo'). */
  schemaModel?: string
  schemaLayout: string
}

interface RelatedManual {
  id: string
  title: string
  car_brand: string | null
  car_model: string | null
  manual_type: string | null
  file_url: string | null
  required_tier: string | null
}

type Tab = 'guias' | 'manuales' | '3d' | 'kit'

/**
 * "Contenido relacionado" bajo el esquema interactivo: bloque único Guías · Manuales · Archivos 3D ·
 * Kit de materiales (este último, reservado). Además, un bloque aparte de marcas recomendadas.
 * Cada enlace vale para esta motorización (scope 'schema') o para TODAS las motorizaciones del
 * modelo (scope 'modelo', puesto en cualquier esquema de la misma marca + modelo).
 * El facade Neon NO soporta selects anidados: todo se lee en dos pasos con `.in`.
 */
export default function SchemaRelatedPanel({ schemaId, schemaBrand, schemaModel, schemaLayout }: Props) {
  const { profile } = useAuthStore()
  const [brands, setBrands] = useState<AftermarketBrand[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [manuals, setManuals] = useState<RelatedManual[]>([])
  const [designs3d, setDesigns3d] = useState<Related3D[]>([])
  const [threeDCount, setThreeDCount] = useState(0) // nº de 3D asociados (aunque el usuario no pueda verlos)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('guias')
  const canSee3d = canSeeOem(profile?.user_type, profile?.is_admin)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)

      // Esquemas hermanos (misma marca + modelo): sus enlaces con alcance «modelo» también valen aquí.
      let siblingIds: string[] = []
      if (schemaModel) {
        const { data: sib } = await supabase.from('exhaust_schemas' as any).select('id').eq('brand', schemaBrand).eq('model', schemaModel).limit(200)
        siblingIds = ((sib ?? []) as any[]).map((s) => s.id).filter((id) => id && id !== schemaId)
      }
      if (cancelled) return
      const linksOf = async (table: string, cols: string) => {
        const direct = supabase.from(table as any).select(cols).eq('schema_id', schemaId)
        const model = siblingIds.length
          ? supabase.from(table as any).select(cols).in('schema_id', siblingIds).eq('scope', 'modelo')
          : Promise.resolve({ data: [] as any[] })
        const [a, b] = await Promise.all([direct, model])
        return { data: [...((a.data ?? []) as any[]), ...((b.data ?? []) as any[])] }
      }

      const sugPromise = supabase.from('schema_brand_suggestions' as any).select('brand_id').eq('schema_id', schemaId)
      const guideLinksPromise = linksOf('schema_article_links', 'article_id, kind, display_order')
      const manualLinksPromise = linksOf('schema_manual_links', 'manual_id, display_order')
      const threeDLinksPromise = linksOf('schema_3d_links', 'design_3d_id, display_order')

      const brandLc = schemaBrand.toLowerCase()
      const layoutLc = schemaLayout.toLowerCase()
      const tagMatchPromise = supabase
        .from('articles' as any)
        .select('*')
        .eq('is_published', true)
        .overlaps('tags', [brandLc, layoutLc])
        .order('published_at', { ascending: false })
        .limit(3)

      const [sugRes, guideRes, manualRes, threeDRes, tagRes] = await Promise.all([
        sugPromise, guideLinksPromise, manualLinksPromise, threeDLinksPromise, tagMatchPromise,
      ])
      if (cancelled) return

      // Marcas
      const brandIds = [...new Set((sugRes.data ?? []).map((r: any) => r.brand_id).filter(Boolean))]
      let suggestedBrands: AftermarketBrand[] = []
      if (brandIds.length > 0) {
        const { data: bData } = await supabase.from('aftermarket_brands' as any).select('*').in('id', brandIds as string[])
        const bMap = new Map(((bData ?? []) as any[]).map((b) => [b.id, b]))
        suggestedBrands = (brandIds as string[]).map((id) => bMap.get(id) as AftermarketBrand | undefined)
          .filter((b): b is AftermarketBrand => b != null && b.is_active)
      }

      // Guías directas + fallback por tags
      const guideRows = [...((guideRes.data ?? []) as any[])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      const articleIds = [...new Set(guideRows.map((r) => r.article_id).filter(Boolean))]
      let directArticles: Article[] = []
      if (articleIds.length > 0) {
        const { data: aData } = await supabase.from('articles' as any).select('*').in('id', articleIds as string[])
        const aMap = new Map(((aData ?? []) as any[]).map((a) => [a.id, a]))
        directArticles = (articleIds as string[]).map((id) => aMap.get(id) as Article | undefined)
          .filter((a): a is Article => a != null && a.is_published)
      }
      const directIds = new Set(directArticles.map((a) => a.id))
      const tagMatched = (tagRes.data ?? []).filter((a: any) => !directIds.has(a.id)) as unknown as Article[]
      const combinedArticles = [...directArticles, ...tagMatched].slice(0, 6)

      // Manuales relacionados
      const manualRows = [...((manualRes.data ?? []) as any[])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      const manualIds = [...new Set(manualRows.map((r) => r.manual_id).filter(Boolean))]
      let relatedManuals: RelatedManual[] = []
      if (manualIds.length > 0) {
        const { data: mData } = await supabase.from('manuals' as any)
          .select('id, title, car_brand, car_model, manual_type, file_url, required_tier')
          .in('id', manualIds as string[])
        const mMap = new Map(((mData ?? []) as any[]).map((m) => [m.id, m]))
        relatedManuals = (manualIds as string[]).map((id) => mMap.get(id) as RelatedManual | undefined)
          .filter((m): m is RelatedManual => m != null)
      }
      // Archivos 3D asociados. design_3d es OEM-gated: solo Profesional+ ve el detalle; el resto
      // ve el contador con un aviso. threeDCount cuenta los enlaces aunque no se puedan ver.
      const threeDRows = [...((threeDRes.data ?? []) as any[])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      const designIds = [...new Set(threeDRows.map((r) => r.design_3d_id).filter(Boolean))]
      let related3d: Related3D[] = []
      if (designIds.length > 0 && canSee3d) {
        const { data: dData } = await supabase.from('design_3d' as any)
          .select('id, title, thumbnail_url, file_url, files, part_type')
          .in('id', designIds as string[])
        const dMap = new Map(((dData ?? []) as any[]).map((d) => [d.id, d]))
        related3d = (designIds as string[]).map((id) => dMap.get(id) as Related3D | undefined).filter((d): d is Related3D => d != null)
      }
      if (cancelled) return

      setBrands(suggestedBrands)
      setArticles(combinedArticles)
      setManuals(relatedManuals)
      setDesigns3d(related3d)
      setThreeDCount(designIds.length)
      // Pestaña inicial = la primera con contenido.
      setTab(combinedArticles.length > 0 ? 'guias' : relatedManuals.length > 0 ? 'manuales' : designIds.length > 0 ? '3d' : 'kit')
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [schemaId, schemaBrand, schemaModel, schemaLayout])

  if (loading) return null
  // El bloque se muestra siempre (con el Kit de materiales reservado), aunque aún no haya enlaces.
  const hasContentBlock = true

  const cardStyle: React.CSSProperties = { backgroundColor: '#FFFFFF', border: '1px solid #F2F2F7', borderRadius: 14, padding: 18 }
  const rowLink: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: 10, backgroundColor: '#FAFAFA', borderRadius: 10, textDecoration: 'none', color: 'inherit' }

  return (
    <section style={{ marginTop: 24, display: 'grid', gridTemplateColumns: brands.length > 0 && hasContentBlock ? '1fr 1fr' : '1fr', gap: 16 }} className="schema-related-panel">
      {brands.length > 0 && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Marcas recomendadas para este modelo</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {brands.map((b) => (
              <Link key={b.id} to={`/marcas/${b.slug}`} style={rowLink}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F2F2F7' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#FFFFFF', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {b.logo_url ? <img src={b.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Factory size={16} style={{ color: '#C7C7CC' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: '#86868B' }}>{b.country}{b.founded_year ? ` · ${b.founded_year}` : ''}</div>
                </div>
                <ExternalLink size={13} style={{ color: '#86868B', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasContentBlock && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Contenido relacionado</h3>
          {/* Pestañas */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <TabBtn active={tab === 'guias'} onClick={() => setTab('guias')} disabled={articles.length === 0}>Guías{articles.length ? ` (${articles.length})` : ''}</TabBtn>
            <TabBtn active={tab === 'manuales'} onClick={() => setTab('manuales')} disabled={manuals.length === 0}>Manuales{manuals.length ? ` (${manuals.length})` : ''}</TabBtn>
            <TabBtn active={tab === '3d'} onClick={() => setTab('3d')} disabled={threeDCount === 0}>Archivos 3D{threeDCount ? ` (${threeDCount})` : ''}</TabBtn>
            <TabBtn active={tab === 'kit'} onClick={() => setTab('kit')}>Kit de materiales</TabBtn>
          </div>

          {tab === 'kit' && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 4px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Package size={17} style={{ color: '#86868B' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>Kit de materiales sugerido · próximamente</div>
                <div style={{ fontSize: 12, color: '#86868B', marginTop: 3, lineHeight: 1.5 }}>
                  Aquí aparecerá la lista de materiales para este montaje (tubos, curvas, bridas, abrazaderas, silenciosos…)
                  con sus medidas y enlace directo al marketplace.
                </div>
              </div>
            </div>
          )}

          {tab === 'guias' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {articles.map((a) => (
                <Link key={a.id} to={`/guias/${a.slug}`} style={rowLink}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F2F2F7' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#FFFFFF', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {a.cover_url ? <img src={a.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <BookOpen size={16} style={{ color: '#C7C7CC' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#0071E3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{ARTICLE_CATEGORY_LABEL[a.category]}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {tab === 'manuales' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {manuals.map((m) => {
                const unlocked = canDownloadManual(m.required_tier, profile?.user_type, Boolean(profile?.is_admin)) && !!m.file_url
                return (
                  <a key={m.id} href={unlocked ? (m.file_url as string) : '/subscriptions'} target={unlocked ? '_blank' : undefined} rel="noreferrer" style={rowLink}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F2F2F7' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={16} style={{ color: '#86868B' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                      <div style={{ fontSize: 11, color: '#86868B' }}>{[m.car_brand, m.car_model].filter(Boolean).join(' ')}</div>
                    </div>
                    {unlocked ? <Download size={14} style={{ color: '#0071E3', flexShrink: 0 }} /> : <Lock size={13} style={{ color: '#86868B', flexShrink: 0 }} />}
                  </a>
                )
              })}
            </div>
          )}

          {tab === '3d' && (
            canSee3d ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {designs3d.map((d) => {
                  const dl = (d.files && d.files.length > 0 ? d.files[0]?.url : d.file_url) || undefined
                  return (
                    <a key={d.id} href={dl ?? '/designs'} target={dl ? '_blank' : undefined} rel="noreferrer" style={rowLink}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F2F2F7' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#FFFFFF', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {d.thumbnail_url ? <img src={d.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Box size={16} style={{ color: '#C7C7CC' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                        {d.part_type && <div style={{ fontSize: 11, color: '#86868B' }}>{d.part_type}</div>}
                      </div>
                      <Download size={14} style={{ color: '#0071E3', flexShrink: 0 }} />
                    </a>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#86868B', fontSize: 13, padding: '12px 4px' }}>
                <Lock size={15} /> {threeDCount} archivo{threeDCount === 1 ? '' : 's'} 3D · disponibles para Profesional+.
              </div>
            )
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .schema-related-panel { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}

function TabBtn({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{
        padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        border: '1px solid ' + (active ? '#0071E3' : '#E5E5EA'),
        background: active ? '#0071E3' : '#fff', color: disabled ? '#C7C7CC' : active ? '#fff' : '#3A3A3C',
      }}>
      {children}
    </button>
  )
}

const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }
