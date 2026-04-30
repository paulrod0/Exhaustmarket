import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import {
  canViewTiers,
  cheapestTier,
  USER_TIER_LABEL,
  LAYOUT_LABEL,
  ARTICLE_CATEGORY_LABEL,
  type ExhaustSchemaRecord,
  type ExhaustComponent,
  type AftermarketBrand,
  type Article,
  type UserTier,
} from '../lib/contentTypes'

export default function SchemaDetailScreen({ route, navigation }: any) {
  const { schemaId } = route.params as { schemaId: string }
  const { user, profile } = useAuthStore()
  const [schema, setSchema] = useState<ExhaustSchemaRecord | null>(null)
  const [brands, setBrands] = useState<AftermarketBrand[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedComp, setSelectedComp] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [schemaRes, brandsRes, articlesRes] = await Promise.all([
        supabase.from('exhaust_schemas').select('*').eq('id', schemaId).maybeSingle(),
        supabase
          .from('schema_brand_suggestions')
          .select('aftermarket_brands(*)')
          .eq('schema_id', schemaId),
        supabase
          .from('schema_article_links')
          .select('articles(*)')
          .eq('schema_id', schemaId),
      ])
      setSchema(schemaRes.data as unknown as ExhaustSchemaRecord | null)
      const bs = (brandsRes.data ?? [])
        .map((r: any) => r.aftermarket_brands as AftermarketBrand)
        .filter((b: any) => b && b.is_active)
      setBrands(bs)
      const arts = (articlesRes.data ?? [])
        .map((r: any) => r.articles as Article)
        .filter((a: any) => a && a.is_published)
      setArticles(arts)
      setLoading(false)
    })()
  }, [schemaId])

  useEffect(() => {
    if (schema) {
      navigation.setOptions({ title: `${schema.brand} ${schema.model}` })
    }
  }, [schema, navigation])

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0071E3" />
      </View>
    )
  }
  if (!schema) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#86868B' }}>No se encontró este esquema.</Text>
      </View>
    )
  }

  const authorized = canViewTiers(schema.allowed_tiers, profile?.user_type, (profile as any)?.is_admin)
  const components = Object.values(schema.components ?? {})
  const selected = selectedComp ? schema.components[selectedComp] : null

  // Stats agregadas para los stat cards
  const componentsCount = components.length
  const materialsCount =
    schema.total_materials_count ??
    new Set(components.map((c) => c.material).filter(Boolean)).size
  const totalHours =
    schema.total_estimated_hours ??
    components.reduce((s, c) => s + (c.fabrication_hours ?? 0), 0)
  const totalCost =
    schema.total_estimated_cost ??
    components.reduce((s, c) => s + (c.total_cost ?? c.material_cost ?? 0), 0)
  const breakdown = schema.cost_breakdown ?? {}

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header info */}
      <View style={styles.header}>
        {schema.cover_url && (
          <Image
            source={{ uri: schema.cover_url }}
            style={styles.cover}
            resizeMode="cover"
          />
        )}
        <View style={styles.headerContent}>
          <Text style={styles.brand}>
            <Text style={{ color: schema.color }}>● </Text>
            {schema.brand} {schema.model}
          </Text>
          <Text style={styles.year}>{schema.year}</Text>
          <View style={styles.statsRow}>
            <Stat label="Motor" value={schema.engine} />
            <Stat label="Potencia" value={schema.power} />
            <Stat label="Arquitectura" value={LAYOUT_LABEL[schema.layout]} />
          </View>
          {schema.note && <Text style={styles.note}>{schema.note}</Text>}

          {/* Stats cards: componentes / materiales / horas / coste */}
          <View style={styles.statCardsRow}>
            <StatCard label="Componentes" value={String(componentsCount)} accent="#0071E3" />
            <StatCard label="Materiales" value={String(materialsCount)} accent="#34C759" />
            <StatCard
              label="Horas est."
              value={totalHours > 0 ? `${totalHours.toFixed(1)} h` : '—'}
              accent="#FF9500"
            />
            <StatCard
              label="Coste total"
              value={totalCost > 0 ? `${totalCost.toFixed(0)} €` : '—'}
              accent={schema.color}
              highlight
            />
          </View>
        </View>
      </View>

      {/* Gallery */}
      {schema.gallery_urls.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gallery}
        >
          {schema.gallery_urls.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.galleryImage} />
          ))}
        </ScrollView>
      )}

      {/* Paywall */}
      {!authorized && (
        <View style={styles.paywall}>
          <Text style={styles.paywallTitle}>🔒 Esquema técnico exclusivo</Text>
          <Text style={styles.paywallText}>
            El diagrama interactivo con materiales, temperaturas y consejos técnicos está disponible
            para{' '}
            {schema.allowed_tiers
              .map((t) => USER_TIER_LABEL[t as UserTier] ?? t)
              .join(', ')}
            .
          </Text>
          <TouchableOpacity
            style={styles.paywallButton}
            onPress={() => {
              if (user) {
                navigation.getParent()?.navigate('Subscriptions')
              } else {
                navigation.getParent()?.navigate('Login')
              }
            }}
          >
            <Text style={styles.paywallButtonText}>
              {user ? 'Ver planes disponibles →' : 'Crear cuenta gratis →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Components */}
      {authorized && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Componentes del sistema</Text>
          <View style={styles.componentsGrid}>
            {components.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.componentPill,
                  selectedComp === c.id && {
                    backgroundColor: schema.color,
                    borderColor: schema.color,
                  },
                ]}
                onPress={() => setSelectedComp(selectedComp === c.id ? null : c.id)}
              >
                <Text
                  style={[
                    styles.componentPillText,
                    selectedComp === c.id && { color: '#FFFFFF' },
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selected && <ComponentDetail comp={selected} color={schema.color} />}
        </View>
      )}

      {/* Despiece A */}
      {authorized && schema.despiece && schema.despiece.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>A. Despiece / Material necesario</Text>
          <View style={{ gap: 6 }}>
            {schema.despiece.map((d, i) => (
              <View key={i} style={styles.despieceRow}>
                <Text style={styles.despieceElement}>{d.element}</Text>
                <Text style={styles.despieceMeta}>
                  {d.material} · {d.specification}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <Text style={styles.despieceTag}>📦 {d.quantity}</Text>
                  <Text style={styles.despieceTag}>⚙️ {d.process}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Costes B */}
      {authorized && (breakdown.materials != null || breakdown.labor != null || breakdown.consumables != null || breakdown.hours != null) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>B. Estimación de costes y horas</Text>
          {breakdown.materials != null && (
            <CostRow label="Materiales" value={`${breakdown.materials} €`} color="#0071E3" />
          )}
          {breakdown.consumables != null && (
            <CostRow label="Consumibles" value={`${breakdown.consumables} €`} color="#86868B" />
          )}
          {breakdown.labor != null && (
            <CostRow label="Mano de obra" value={`${breakdown.labor} €`} color="#FF9500" />
          )}
          {breakdown.hours != null && (
            <CostRow label="Horas estimadas" value={`${breakdown.hours} h`} color="#34C759" />
          )}
          {((breakdown.materials ?? 0) + (breakdown.consumables ?? 0) + (breakdown.labor ?? 0)) > 0 && (
            <View style={styles.costTotal}>
              <Text style={styles.costTotalLabel}>Total estimado</Text>
              <Text style={[styles.costTotalValue, { color: schema.color }]}>
                {(breakdown.materials ?? 0) + (breakdown.consumables ?? 0) + (breakdown.labor ?? 0)} €
              </Text>
            </View>
          )}
        </View>
      )}

      {/* OEM C */}
      {authorized && components.some((c) => c.oem_ref) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>C. Referencias OEM por componente</Text>
          {components.filter((c) => c.oem_ref).map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.oemRow}
              onPress={() => setSelectedComp(c.id)}
            >
              <Text style={styles.oemName}>{c.name}</Text>
              <Text style={[styles.oemRef, { color: schema.color }]}>{c.oem_ref}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Fotos técnicas D */}
      {authorized && schema.reference_photos && schema.reference_photos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>D. Fotos de referencia</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {schema.reference_photos.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.refPhoto} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Vídeo E */}
      {authorized && schema.related_video_url && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>E. Vídeo de instalación</Text>
          <TouchableOpacity
            style={styles.videoLink}
            onPress={() => {
              if (schema.related_video_url) {
                require('react-native').Linking.openURL(schema.related_video_url).catch(() => {})
              }
            }}
          >
            <Text style={styles.videoLinkEmoji}>▶</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.videoLinkTitle}>Ver vídeo en navegador</Text>
              <Text style={styles.videoLinkSub}>YouTube / Vimeo</Text>
            </View>
            <Text style={{ color: '#FFFFFF' }}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Marcas recomendadas */}
      {brands.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Marcas recomendadas para este modelo</Text>
          {brands.slice(0, 8).map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.brandRow}
              onPress={() => navigation.navigate('BrandDetail', { slug: b.slug })}
            >
              <View style={styles.brandLogo}>
                {b.logo_url ? (
                  <Image source={{ uri: b.logo_url }} style={{ width: 40, height: 40 }} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: 16 }}>🏭</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.brandName}>{b.name}</Text>
                <Text style={styles.brandCountry}>
                  {b.country}{b.founded_year ? ` · ${b.founded_year}` : ''}
                </Text>
              </View>
              <Text style={{ color: '#86868B' }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Guías asociadas */}
      {articles.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tutoriales y guías</Text>
          {articles.slice(0, 5).map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.articleRow}
              onPress={() => navigation.navigate('GuideDetail', { slug: a.slug })}
            >
              <View style={styles.articleCover}>
                {a.cover_url ? (
                  <Image source={{ uri: a.cover_url }} style={{ width: 52, height: 52 }} />
                ) : (
                  <Text>📖</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.articleCategory}>{ARTICLE_CATEGORY_LABEL[a.category]}</Text>
                <Text style={styles.articleTitle} numberOfLines={2}>{a.title}</Text>
              </View>
              <Text style={{ color: '#86868B' }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

function ComponentDetail({ comp, color }: { comp: ExhaustComponent; color: string }) {
  const rows: Array<{ label: string; value: string }> = []
  if (comp.oem_ref) rows.push({ label: 'Referencia OEM', value: comp.oem_ref })
  if (comp.material) rows.push({ label: 'Material principal', value: comp.material })
  if (comp.diameter_mm != null) rows.push({ label: 'Diámetro tubo', value: `${comp.diameter_mm} mm` })
  if (comp.thickness_mm != null) rows.push({ label: 'Espesor', value: `${comp.thickness_mm} mm` })
  if (comp.fabrication_hours != null) rows.push({ label: 'Tiempo fabricación', value: `${comp.fabrication_hours} h` })
  if (comp.material_cost != null) rows.push({ label: 'Coste material', value: `${comp.material_cost} €` })
  if (comp.temp) rows.push({ label: 'Temperatura', value: comp.temp })

  return (
    <View style={[styles.compDetail, { borderColor: color + '40' }]}>
      <View style={[styles.compDetailHeader, { backgroundColor: color, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={styles.compDetailTitle}>{comp.name}</Text>
        {comp.fabricable && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 980 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>Fabricable</Text>
          </View>
        )}
      </View>
      <View style={styles.compDetailBody}>
        {rows.map((r, i) => (
          <View key={i} style={styles.fichaRow}>
            <Text style={styles.fichaLabel}>{r.label}</Text>
            <Text style={[styles.fichaValue, r.label === 'Referencia OEM' && { fontFamily: 'Courier' }]}>
              {r.value}
            </Text>
          </View>
        ))}

        {comp.total_cost != null && (
          <View style={styles.fichaTotal}>
            <Text style={styles.fichaTotalLabel}>Coste total estimado</Text>
            <Text style={[styles.fichaTotalValue, { color }]}>{comp.total_cost} €</Text>
          </View>
        )}

        {comp.difficulty && (
          <View style={styles.fichaRow}>
            <Text style={styles.fichaLabel}>Dificultad</Text>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 980,
                backgroundColor:
                  comp.difficulty === 'baja' ? '#D1F7D1' : comp.difficulty === 'media' ? '#FFF7E5' : '#FFE5E7',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color:
                    comp.difficulty === 'baja' ? '#1A8C1A' : comp.difficulty === 'media' ? '#B25400' : '#D70015',
                  textTransform: 'capitalize',
                }}
              >
                {comp.difficulty}
              </Text>
            </View>
          </View>
        )}

        {comp.description && (
          <View style={[styles.compBlock, { marginTop: 10 }]}>
            <Text style={styles.compBlockLabel}>Descripción</Text>
            <Text style={styles.compBlockText}>{comp.description}</Text>
          </View>
        )}
        {comp.tip && (
          <View style={[styles.compBlock, { backgroundColor: '#FFF7E5' }]}>
            <Text style={[styles.compBlockLabel, { color: '#B25400' }]}>💡 Consejo</Text>
            <Text style={styles.compBlockText}>{comp.tip}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

function StatCard({
  label,
  value,
  accent,
  highlight = false,
}: {
  label: string
  value: string
  accent: string
  highlight?: boolean
}) {
  return (
    <View
      style={[
        styles.statCard,
        highlight && { backgroundColor: `${accent}10`, borderColor: `${accent}40` },
      ]}
    >
      <Text style={[styles.statCardValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabelMobile}>{label}</Text>
    </View>
  )
}

function CostRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.costRow}>
      <View style={[styles.costDot, { backgroundColor: color }]} />
      <Text style={styles.costRowLabel}>{label}</Text>
      <Text style={styles.costRowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#FFFFFF' },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  headerContent: { padding: 16 },
  brand: { fontSize: 22, fontWeight: '700', color: '#1D1D1F', letterSpacing: -0.5 },
  year: { fontSize: 13, color: '#86868B', marginTop: 2, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  stat: {},
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#86868B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 13, fontWeight: '500', color: '#1D1D1F', marginTop: 2 },
  note: {
    marginTop: 12,
    fontSize: 13,
    color: '#1D1D1F',
    lineHeight: 19,
    backgroundColor: '#F5F5F7',
    padding: 10,
    borderRadius: 10,
  },
  gallery: { padding: 16, gap: 8 },
  galleryImage: { width: 260, aspectRatio: 4 / 3, borderRadius: 12, marginRight: 8 },
  paywall: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1D1D1F',
    borderRadius: 16,
    alignItems: 'center',
  },
  paywallTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  paywallText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
  },
  paywallButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 980,
  },
  paywallButtonText: { color: '#1D1D1F', fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#86868B',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  componentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  componentPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  componentPillText: { fontSize: 12, color: '#1D1D1F' },
  compDetail: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  compDetailHeader: { padding: 12 },
  compDetailTitle: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  compDetailBody: { padding: 14, gap: 12 },
  compMetaRow: { flexDirection: 'row', gap: 10 },
  compMetaCell: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    padding: 10,
    borderRadius: 10,
  },
  compMetaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#86868B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compMetaValue: { fontSize: 13, color: '#1D1D1F', marginTop: 2 },
  compBlock: { backgroundColor: '#F5F5F7', padding: 12, borderRadius: 10 },
  compBlockLabel: { fontSize: 10, fontWeight: '600', color: '#86868B', letterSpacing: 0.5 },
  compBlockText: { fontSize: 14, color: '#1D1D1F', lineHeight: 20, marginTop: 4 },
  // Stats cards
  statCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  statCard: {
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
  },
  statCardValue: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  statLabelMobile: { fontSize: 11, color: '#86868B', marginTop: 2 },
  // Ficha técnica rows
  fichaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  fichaLabel: { fontSize: 12, color: '#86868B' },
  fichaValue: { fontSize: 13, fontWeight: '500', color: '#1D1D1F' },
  fichaTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    marginTop: 4,
  },
  fichaTotalLabel: { fontSize: 12, color: '#86868B' },
  fichaTotalValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  // Despiece A
  despieceRow: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 12,
  },
  despieceElement: { fontSize: 14, fontWeight: '600', color: '#1D1D1F' },
  despieceMeta: { fontSize: 12, color: '#86868B', marginTop: 2 },
  despieceTag: { fontSize: 11, color: '#1D1D1F' },
  // Costes B
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  costDot: { width: 8, height: 8, borderRadius: 4 },
  costRowLabel: { flex: 1, fontSize: 13, color: '#1D1D1F' },
  costRowValue: { fontSize: 13, fontWeight: '600', color: '#1D1D1F' },
  costTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    marginTop: 8,
  },
  costTotalLabel: { fontSize: 13, fontWeight: '600', color: '#1D1D1F' },
  costTotalValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  // OEM C
  oemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  oemName: { fontSize: 13, color: '#1D1D1F' },
  oemRef: { fontSize: 12, fontFamily: 'Courier', fontWeight: '600' },
  // Fotos D
  refPhoto: {
    width: 180,
    height: 135,
    borderRadius: 10,
    backgroundColor: '#F5F5F7',
    marginRight: 6,
  },
  // Vídeo E
  videoLink: {
    backgroundColor: '#0071E3',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  videoLinkEmoji: { color: '#FFFFFF', fontSize: 22 },
  videoLinkTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  videoLinkSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    marginBottom: 6,
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandName: { fontSize: 14, fontWeight: '600', color: '#1D1D1F' },
  brandCountry: { fontSize: 11, color: '#86868B' },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    marginBottom: 6,
  },
  articleCover: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  articleCategory: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0071E3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  articleTitle: { fontSize: 14, fontWeight: '500', color: '#1D1D1F', marginTop: 2 },
})
