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
import { useAuthStore } from '../stores/authStore'
import {
  ARTICLE_CATEGORY_LABEL,
  canViewTiers,
  USER_TIER_LABEL,
  cheapestTier,
  type Article,
  type UserTier,
} from '../lib/contentTypes'
import { MarkdownRenderer } from '../lib/markdown'

interface LinkedSchema {
  id: string
  brand: string
  model: string
  year: string
  cover_url: string | null
  color: string
}

export default function GuideDetailScreen({ route, navigation }: any) {
  const { slug } = route.params as { slug: string }
  const { user, profile } = useAuthStore()
  const [article, setArticle] = useState<Article | null>(null)
  const [linkedSchemas, setLinkedSchemas] = useState<LinkedSchema[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: art } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle()
      const artTyped = art as unknown as Article | null
      setArticle(artTyped)
      if (artTyped) {
        navigation.setOptions({ title: ARTICLE_CATEGORY_LABEL[artTyped.category] })
        const { data: links } = await supabase
          .from('schema_article_links')
          .select('exhaust_schemas(id, brand, model, year, cover_url, color, is_active)')
          .eq('article_id', artTyped.id)
        const schemas = (links ?? [])
          .map((r: any) => r.exhaust_schemas)
          .filter((s: any) => s && s.is_active) as LinkedSchema[]
        setLinkedSchemas(schemas)
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
  if (!article) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#86868B' }}>Guía no encontrada.</Text>
      </View>
    )
  }

  const authorized = canViewTiers(article.allowed_tiers, profile?.user_type, (profile as any)?.is_admin)
  const lowest = cheapestTier(article.allowed_tiers)

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {article.cover_url && (
        <Image source={{ uri: article.cover_url }} style={styles.cover} resizeMode="cover" />
      )}
      <View style={styles.header}>
        <Text style={styles.category}>{ARTICLE_CATEGORY_LABEL[article.category]}</Text>
        <Text style={styles.title}>{article.title}</Text>
        {article.subtitle && <Text style={styles.subtitle}>{article.subtitle}</Text>}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>⏱ {article.reading_minutes} min</Text>
          {article.published_at && (
            <Text style={styles.meta}>
              📅 {new Date(article.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {!authorized ? (
          <>
            {article.excerpt && <Text style={styles.excerpt}>{article.excerpt}</Text>}
            <View style={styles.paywall}>
              <Text style={styles.paywallTitle}>🔒 Contenido exclusivo</Text>
              <Text style={styles.paywallText}>
                Este {ARTICLE_CATEGORY_LABEL[article.category].toLowerCase()} es exclusivo para{' '}
                {article.allowed_tiers.map((t) => USER_TIER_LABEL[t as UserTier] ?? t).join(', ')}.
                {'\n\n'}
                {user
                  ? lowest
                    ? `Actualiza tu plan a ${USER_TIER_LABEL[lowest]} para ver el vídeo, los archivos y el contenido completo.`
                    : 'Actualiza tu plan para ver todo.'
                  : 'Regístrate gratis para acceder.'}
              </Text>
              <TouchableOpacity
                style={styles.paywallButton}
                onPress={() => {
                  if (user) navigation.getParent()?.navigate('Subscriptions')
                  else navigation.getParent()?.navigate('Login')
                }}
              >
                <Text style={styles.paywallButtonText}>
                  {user ? 'Ver planes disponibles →' : 'Crear cuenta →'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {article.video_url && (
              <TouchableOpacity
                style={styles.videoLink}
                onPress={() => Linking.openURL(article.video_url!).catch(() => {})}
              >
                <Text style={styles.videoLinkEmoji}>▶</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.videoLinkTitle}>Ver vídeo del tutorial</Text>
                  <Text style={styles.videoLinkSub}>Se abre en el navegador</Text>
                </View>
                <Text style={{ color: '#FFFFFF' }}>→</Text>
              </TouchableOpacity>
            )}

            <MarkdownRenderer source={article.content_md} />

            {article.attachment_url && (
              <View style={styles.attachBox}>
                <Text style={styles.attachTitle}>Archivo adjunto</Text>
                <TouchableOpacity
                  style={styles.attachButton}
                  onPress={() => Linking.openURL(article.attachment_url!).catch(() => {})}
                >
                  <Text style={styles.attachButtonText}>
                    {article.attachment_type === '3d-model' ? '◈ Descargar modelo 3D' : '📄 Abrir archivo'}
                  </Text>
                </TouchableOpacity>
                {article.attachment_type === '3d-model' && (
                  <Text style={styles.attachHint}>
                    Para visualizar el modelo 3D interactivo, abre esta guía en la web.
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </View>

      {linkedSchemas.length > 0 && (
        <View style={styles.linkedSection}>
          <Text style={styles.linkedTitle}>Modelos a los que aplica</Text>
          {linkedSchemas.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.linkedRow}
              onPress={() => navigation.navigate('SchemaDetail', { schemaId: s.id })}
            >
              <View style={styles.linkedCover}>
                {s.cover_url ? (
                  <Image source={{ uri: s.cover_url }} style={{ width: 52, height: 52 }} />
                ) : (
                  <Text>🚗</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.linkedBrand}>
                  <Text style={{ color: s.color }}>● </Text>
                  {s.brand} {s.model}
                </Text>
                <Text style={styles.linkedYear}>{s.year}</Text>
              </View>
              <Text style={{ color: '#86868B' }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {article.tags.length > 0 && (
        <View style={styles.tags}>
          {article.tags.map((t) => (
            <View key={t} style={styles.tagPill}>
              <Text style={styles.tagPillText}>#{t}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  header: { padding: 20 },
  category: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0071E3',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1D1D1F', marginTop: 6, letterSpacing: -0.5, lineHeight: 34 },
  subtitle: { fontSize: 16, color: '#86868B', marginTop: 6, lineHeight: 22 },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 12 },
  meta: { fontSize: 12, color: '#86868B' },
  content: { paddingHorizontal: 20 },
  excerpt: { fontSize: 16, color: '#1D1D1F', lineHeight: 24, marginBottom: 12 },
  paywall: {
    backgroundColor: '#1D1D1F',
    borderRadius: 16,
    padding: 22,
    marginVertical: 18,
    alignItems: 'center',
  },
  paywallTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  paywallText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  paywallButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 980,
  },
  paywallButtonText: { color: '#1D1D1F', fontSize: 13, fontWeight: '600' },
  videoLink: {
    backgroundColor: '#0071E3',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  videoLinkEmoji: { color: '#FFFFFF', fontSize: 22 },
  videoLinkTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  videoLinkSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  attachBox: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
  },
  attachTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#86868B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  attachButton: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
  },
  attachButtonText: { fontSize: 14, color: '#0071E3', fontWeight: '600', textAlign: 'center' },
  attachHint: { fontSize: 11, color: '#86868B', marginTop: 8, textAlign: 'center' },
  linkedSection: { padding: 20 },
  linkedTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#86868B',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    marginBottom: 6,
  },
  linkedCover: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  linkedBrand: { fontSize: 14, fontWeight: '600', color: '#1D1D1F' },
  linkedYear: { fontSize: 11, color: '#86868B', marginTop: 2 },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 20,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F5F5F7',
    borderRadius: 980,
  },
  tagPillText: { fontSize: 12, color: '#1D1D1F' },
})
