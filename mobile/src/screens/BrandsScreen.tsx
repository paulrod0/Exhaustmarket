import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native'
import { supabase } from '../lib/supabase'
import {
  PRICE_TIER_LABEL,
  type AftermarketBrand,
  type PriceTier,
} from '../lib/contentTypes'

export default function BrandsScreen({ navigation }: any) {
  const [brands, setBrands] = useState<AftermarketBrand[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState<PriceTier | 'all'>('all')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('aftermarket_brands')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
        .order('name')
      setBrands((data ?? []) as unknown as AftermarketBrand[])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    let list = brands
    if (tier !== 'all') list = list.filter((b) => b.price_tier === tier)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.country?.toLowerCase().includes(q) ||
          b.specialties.join(' ').toLowerCase().includes(q),
      )
    }
    return list
  }, [brands, search, tier])

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0071E3" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={{ padding: 16, paddingBottom: 4 }}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre, país o especialidad…"
          placeholderTextColor="#86868B"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
        style={{ flexGrow: 0, marginBottom: 6 }}
      >
        {(['all', 'budget', 'mid', 'premium', 'ultra-premium'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTier(t === 'all' ? 'all' : (t as PriceTier))}
            style={[styles.pill, tier === t && styles.pillActive]}
          >
            <Text style={[styles.pillText, tier === t && styles.pillTextActive]}>
              {t === 'all' ? 'Todas las gamas' : PRICE_TIER_LABEL[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('BrandDetail', { slug: item.slug })}
          >
            <View style={styles.logo}>
              {item.logo_url ? (
                <Image source={{ uri: item.logo_url }} style={{ width: 48, height: 48 }} resizeMode="contain" />
              ) : (
                <Text style={{ fontSize: 22 }}>🏭</Text>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.price_tier && (
                  <View style={[styles.tierBadge, tierBadgeStyle(item.price_tier)]}>
                    <Text style={[styles.tierBadgeText, { color: tierFg(item.price_tier) }]}>
                      {PRICE_TIER_LABEL[item.price_tier]}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.country} numberOfLines={1}>
                {item.country}{item.founded_year ? ` · ${item.founded_year}` : ''}
              </Text>
              {item.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay marcas con esos filtros.</Text>}
      />
    </View>
  )
}

function tierBadgeStyle(tier: PriceTier) {
  const map: Record<PriceTier, object> = {
    budget: { backgroundColor: '#F5F5F7' },
    mid: { backgroundColor: '#D1F7D1' },
    premium: { backgroundColor: '#D1EAFE' },
    'ultra-premium': { backgroundColor: '#FFE5D1' },
  }
  return map[tier]
}

function tierFg(tier: PriceTier) {
  const map: Record<PriceTier, string> = {
    budget: '#86868B',
    mid: '#1A8C1A',
    premium: '#0060C0',
    'ultra-premium': '#B25400',
  }
  return map[tier]
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  search: {
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1D1D1F',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#F5F5F7',
    borderRadius: 980,
  },
  pillActive: { backgroundColor: '#1D1D1F' },
  pillText: { fontSize: 12, fontWeight: '500', color: '#1D1D1F' },
  pillTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F2F2F7',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  name: { fontSize: 15, fontWeight: '600', color: '#1D1D1F', flexShrink: 1 },
  country: { fontSize: 11, color: '#86868B', marginTop: 2 },
  description: { fontSize: 12, color: '#1D1D1F', marginTop: 4, lineHeight: 17 },
  chevron: { fontSize: 22, color: '#C7C7CC', marginLeft: 4 },
  tierBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierBadgeText: { fontSize: 9, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#86868B', marginTop: 40, fontSize: 13 },
})
