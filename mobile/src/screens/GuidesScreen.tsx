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
import { useAuthStore } from '../stores/authStore'
import {
  ARTICLE_CATEGORY_LABEL,
  canViewTiers,
  cheapestTier,
  USER_TIER_SHORT_LABEL,
  type Article,
  type ArticleCategory,
  type UserTier,
} from '../lib/contentTypes'

export default function GuidesScreen({ navigation }: any) {
  const { profile } = useAuthStore()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ArticleCategory | 'all'>('all')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
      setArticles((data ?? []) as unknown as Article[])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    let list = articles
    if (category !== 'all') list = list.filter((a) => a.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt?.toLowerCase().includes(q) ||
          a.tags.join(' ').toLowerCase().includes(q),
      )
    }
    return list
  }, [articles, search, category])

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0071E3" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={{ padding: 16, paddingBottom: 6 }}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar guías, tutoriales, reviews…"
          placeholderTextColor="#86868B"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
        style={{ flexGrow: 0, marginBottom: 6 }}
      >
        {(['all', 'guide', 'tutorial', 'review', 'comparison', 'news'] as const).map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setCategory(c === 'all' ? 'all' : (c as ArticleCategory))}
            style={[styles.pill, category === c && styles.pillActive]}
          >
            <Text style={[styles.pillText, category === c && styles.pillTextActive]}>
              {c === 'all' ? 'Todas' : ARTICLE_CATEGORY_LABEL[c]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <ArticleCard article={item} profile={profile} onPress={() => navigation.navigate('GuideDetail', { slug: item.slug })} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay guías con esos filtros.</Text>}
      />
    </View>
  )
}

function ArticleCard({ article, profile, onPress }: { article: Article; profile: any; onPress: () => void }) {
  const locked = !canViewTiers(article.allowed_tiers, profile?.user_type, profile?.is_admin)
  const lowest = cheapestTier(article.allowed_tiers)
  const tierLabel = lowest ? USER_TIER_SHORT_LABEL[lowest as UserTier] : null
  const isFree = !article.allowed_tiers || article.allowed_tiers.length === 0

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.85}>
      <View style={styles.cardImage}>
        {article.cover_url ? (
          <Image source={{ uri: article.cover_url }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <View style={[styles.cardImage, { backgroundColor: '#F5F5F7' }]} />
        )}
        <View style={styles.badgesTopLeft}>
          {isFree ? (
            <View style={[styles.tagBadge, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.tagBadgeText, { color: '#1A8C1A' }]}>Gratis</Text>
            </View>
          ) : (
            <View
              style={[
                styles.tagBadge,
                locked ? { backgroundColor: '#1D1D1F' } : { backgroundColor: '#FFF7E5' },
              ]}
            >
              <Text
                style={[
                  styles.tagBadgeText,
                  locked ? { color: '#FFD700' } : { color: '#B25400' },
                ]}
              >
                {locked && '🔒 '}
                {tierLabel ?? 'Premium'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.badgesTopRight}>
          {article.video_url && (
            <View style={styles.mediaBadge}>
              <Text style={styles.mediaBadgeText}>▶ Vídeo</Text>
            </View>
          )}
          {article.attachment_url && (
            <View style={styles.mediaBadge}>
              <Text style={styles.mediaBadgeText}>
                {article.attachment_type === '3d-model' ? '◈ 3D' : '📄 PDF'}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.category}>{ARTICLE_CATEGORY_LABEL[article.category]}</Text>
        <Text style={styles.title} numberOfLines={2}>{article.title}</Text>
        {article.excerpt && (
          <Text style={styles.excerpt} numberOfLines={2}>{article.excerpt}</Text>
        )}
        <Text style={styles.reading}>⏱ {article.reading_minutes} min de lectura</Text>
      </View>
    </TouchableOpacity>
  )
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
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#F5F5F7',
    position: 'relative',
  },
  cardBody: { padding: 14 },
  category: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0071E3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 4,
    lineHeight: 20,
  },
  excerpt: { fontSize: 13, color: '#86868B', marginTop: 6, lineHeight: 18 },
  reading: { fontSize: 11, color: '#86868B', marginTop: 10 },
  badgesTopLeft: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 5 },
  badgesTopRight: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 5 },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 980,
  },
  tagBadgeText: { fontSize: 10, fontWeight: '600' },
  mediaBadge: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mediaBadgeText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  empty: { textAlign: 'center', color: '#86868B', marginTop: 40, fontSize: 13 },
})
