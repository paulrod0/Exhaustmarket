import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import {
  canViewTiers,
  USER_TIER_SHORT_LABEL,
  cheapestTier,
  LAYOUT_LABEL,
  type ExhaustSchemaRecord,
  type UserTier,
} from '../lib/contentTypes'

export default function SchemasScreen({ navigation }: any) {
  const [schemas, setSchemas] = useState<ExhaustSchemaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string>('Todos')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('exhaust_schemas')
        .select('*')
        .eq('is_active', true)
        .order('brand')
        .order('model')
      setSchemas((data ?? []) as unknown as ExhaustSchemaRecord[])
      setLoading(false)
    })()
  }, [])

  const brands = useMemo(
    () => ['Todos', ...Array.from(new Set(schemas.map((s) => s.brand)))].sort(),
    [schemas],
  )

  const filtered = useMemo(() => {
    let list = schemas
    if (selectedBrand !== 'Todos') list = list.filter((s) => s.brand === selectedBrand)
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

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0071E3" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por marca, modelo o motor…"
          placeholderTextColor="#86868B"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.brandStrip}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
      >
        {brands.map((b) => (
          <TouchableOpacity
            key={b}
            onPress={() => setSelectedBrand(b)}
            style={[
              styles.brandPill,
              selectedBrand === b && styles.brandPillActive,
            ]}
          >
            <Text
              style={[
                styles.brandPillText,
                selectedBrand === b && styles.brandPillTextActive,
              ]}
            >
              {b}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => <SchemaCard schema={item} onPress={() => navigation.navigate('SchemaDetail', { schemaId: item.id })} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No se encontraron modelos.</Text>
        }
      />
    </View>
  )
}

function SchemaCard({ schema, onPress }: { schema: ExhaustSchemaRecord; onPress: () => void }) {
  const { profile } = useAuthStore()
  const locked = !canViewTiers(schema.allowed_tiers, profile?.user_type, (profile as any)?.is_admin)
  const lowest = cheapestTier(schema.allowed_tiers)

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.85}>
      <View style={styles.cardImage}>
        {schema.cover_url ? (
          <Image source={{ uri: schema.cover_url }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <View style={[styles.cardImage, { backgroundColor: '#F5F5F7' }]} />
        )}
        {schema.allowed_tiers.length > 0 ? (
          <View style={[styles.tierBadge, locked ? styles.tierBadgeLocked : styles.tierBadgeUnlocked]}>
            <Text style={[styles.tierBadgeText, locked && { color: '#FFD700' }]}>
              {locked && '🔒 '}
              {lowest ? USER_TIER_SHORT_LABEL[lowest as UserTier] : 'Premium'}
            </Text>
          </View>
        ) : (
          <View style={[styles.tierBadge, styles.tierBadgeFree]}>
            <Text style={[styles.tierBadgeText, { color: '#1A8C1A' }]}>Gratis</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardBrand} numberOfLines={1}>
          <Text style={{ color: schema.color }}>● </Text>
          {schema.brand} {schema.model}
        </Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          {schema.year} · {schema.engine} · {schema.power}
        </Text>
        <Text style={styles.cardLayout}>{LAYOUT_LABEL[schema.layout]}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  search: {
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1D1D1F',
  },
  brandStrip: {
    flexGrow: 0,
    marginBottom: 4,
  },
  brandPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#F5F5F7',
    borderRadius: 980,
    marginRight: 6,
  },
  brandPillActive: {
    backgroundColor: '#1D1D1F',
  },
  brandPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  brandPillTextActive: {
    color: '#FFFFFF',
  },
  empty: {
    textAlign: 'center',
    color: '#86868B',
    marginTop: 40,
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F2F2F7',
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#F5F5F7',
    position: 'relative',
  },
  cardBody: {
    padding: 12,
  },
  cardBrand: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 12,
    color: '#86868B',
    marginBottom: 4,
  },
  cardLayout: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0071E3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 980,
  },
  tierBadgeUnlocked: { backgroundColor: '#FFF7E5' },
  tierBadgeLocked: { backgroundColor: '#1D1D1F' },
  tierBadgeFree: { backgroundColor: '#E8F5E9' },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B25400',
  },
})
