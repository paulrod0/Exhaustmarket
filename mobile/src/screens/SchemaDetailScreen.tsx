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
  return (
    <View style={[styles.compDetail, { borderColor: color + '40' }]}>
      <View style={[styles.compDetailHeader, { backgroundColor: color }]}>
        <Text style={styles.compDetailTitle}>{comp.name}</Text>
      </View>
      <View style={styles.compDetailBody}>
        <View style={styles.compMetaRow}>
          <View style={styles.compMetaCell}>
            <Text style={styles.compMetaLabel}>Material</Text>
            <Text style={styles.compMetaValue}>{comp.material || '—'}</Text>
          </View>
          <View style={styles.compMetaCell}>
            <Text style={styles.compMetaLabel}>Temperatura</Text>
            <Text style={styles.compMetaValue}>{comp.temp || '—'}</Text>
          </View>
        </View>
        {comp.description && (
          <View style={styles.compBlock}>
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
