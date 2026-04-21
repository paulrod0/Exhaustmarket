import { useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native'
import { supabase } from '../lib/supabase'
import {
  PRICE_TIER_LABEL,
  type AftermarketBrand,
  type PriceTier,
} from '../lib/contentTypes'

interface SchemaRef {
  id: string
  brand: string
  model: string
  year: string
  engine: string
  power: string
  color: string
  cover_url: string | null
  is_active: boolean
}

export default function BrandDetailScreen({ route, navigation }: any) {
  const { slug } = route.params as { slug: string }
  const [brand, setBrand] = useState<AftermarketBrand | null>(null)
  const [schemas, setSchemas] = useState<SchemaRef[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: b } = await supabase
        .from('aftermarket_brands')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()
      const brandTyped = b as unknown as AftermarketBrand | null
      setBrand(brandTyped)
      if (brandTyped) {
        navigation.setOptions({ title: brandTyped.name })
        const { data: links } = await supabase
          .from('schema_brand_suggestions')
          .select('exhaust_schemas(id, brand, model, year, engine, power, color, cover_url, is_active)')
          .eq('brand_id', brandTyped.id)
        const found = (links ?? [])
          .map((r: any) => r.exhaust_schemas)
          .filter((s: any) => s && s.is_active) as SchemaRef[]
        setSchemas(found)
      }
      setLoading(false)
    })()
  }, [slug, navigation])

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0071E3" />
      </View>
    )
  }
  if (!brand) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#86868B' }}>No se encontró esta marca.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View style={styles.logoBig}>
          {brand.logo_url ? (
            <Image source={{ uri: brand.logo_url }} style={{ width: 80, height: 80 }} resizeMode="contain" />
          ) : (
            <Text style={{ fontSize: 36 }}>🏭</Text>
          )}
        </View>
        <Text style={styles.name}>{brand.name}</Text>
        <View style={styles.metaRow}>
          {brand.country && <Text style={styles.meta}>📍 {brand.country}</Text>}
          {brand.founded_year && <Text style={styles.meta}>📅 {brand.founded_year}</Text>}
        </View>
        {brand.price_tier && (
          <View style={[styles.tierBadge, { backgroundColor: '#FFF7E5' }]}>
            <Text style={[styles.tierBadgeText, { color: '#B25400' }]}>
              {PRICE_TIER_LABEL[brand.price_tier as PriceTier]}
            </Text>
          </View>
        )}
        {brand.description && (
          <Text style={styles.description}>{brand.description}</Text>
        )}
        {brand.specialties.length > 0 && (
          <View style={styles.specialties}>
            {brand.specialties.map((s) => (
              <View key={s} style={styles.specialtyPill}>
                <Text style={styles.specialtyText}>{s}</Text>
              </View>
            ))}
          </View>
        )}
        {brand.website && (
          <TouchableOpacity
            style={styles.websiteButton}
            onPress={() => Linking.openURL(brand.website!).catch(() => {})}
          >
            <Text style={styles.websiteButtonText}>Visitar {brand.name} ↗</Text>
          </TouchableOpacity>
        )}
      </View>

      {schemas.length > 0 && (
        <View style={styles.schemas}>
          <Text style={styles.schemasTitle}>Modelos recomendados</Text>
          {schemas.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.schemaCard}
              onPress={() => navigation.navigate('SchemaDetail', { schemaId: s.id })}
            >
              <View style={styles.schemaCover}>
                {s.cover_url ? (
                  <Image source={{ uri: s.cover_url }} style={{ width: 64, height: 64 }} />
                ) : (
                  <Text>🚗</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.schemaBrand}>
                  <Text style={{ color: s.color }}>● </Text>
                  {s.brand} {s.model}
                </Text>
                <Text style={styles.schemaSub}>
                  {s.year} · {s.engine}
                </Text>
                <Text style={styles.schemaPower}>{s.power}</Text>
              </View>
              <Text style={{ color: '#86868B' }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  logoBig: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  name: { fontSize: 26, fontWeight: '700', color: '#1D1D1F', letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
  meta: { fontSize: 12, color: '#86868B' },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 980,
    marginTop: 10,
  },
  tierBadgeText: { fontSize: 11, fontWeight: '600' },
  description: {
    fontSize: 14,
    color: '#1D1D1F',
    lineHeight: 20,
    marginTop: 14,
    textAlign: 'center',
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
  },
  specialtyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F5F5F7',
    borderRadius: 980,
  },
  specialtyText: { fontSize: 11, color: '#1D1D1F' },
  websiteButton: {
    marginTop: 18,
    backgroundColor: '#0071E3',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 980,
  },
  websiteButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  schemas: { padding: 16 },
  schemasTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#86868B',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  schemaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    marginBottom: 6,
  },
  schemaCover: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  schemaBrand: { fontSize: 14, fontWeight: '600', color: '#1D1D1F' },
  schemaSub: { fontSize: 11, color: '#86868B', marginTop: 2 },
  schemaPower: { fontSize: 12, color: '#0071E3', marginTop: 2, fontWeight: '500' },
})
