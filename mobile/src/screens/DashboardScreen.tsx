import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardData {
  monthlyRevenue: number
  totalRevenue: number
  totalOrders: number
  pendingQuotes: number
  recentTransactions: Transaction[]
  products: Product[]
  totalProducts: number
  lowStockCount: number
  recentQuotes: QuoteRequest[]
}

interface Transaction {
  id: string
  amount: number
  type: string
  status: string
  created_at: string
}

interface Product {
  id: string
  product_name: string
  stock: number
  price: number
  is_active: boolean
}

interface QuoteRequest {
  id: string
  car_model: string
  car_year: number | null
  service_type: string
  status: string
  created_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER_TYPE_LABELS: Record<string, string> = {
  standard: 'Particular',
  professional: 'Profesional',
  workshop: 'Taller',
  premium: 'Premium',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: '#E8F8ED', text: '#34C759' },
  pending: { bg: '#FFF8E6', text: '#FF9500' },
  cancelled: { bg: '#FFECEB', text: '#FF3B30' },
  rejected: { bg: '#FFECEB', text: '#FF3B30' },
  accepted: { bg: '#E8F8ED', text: '#34C759' },
  paid: { bg: '#E8F8ED', text: '#34C759' },
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completado',
  pending: 'Pendiente',
  cancelled: 'Cancelado',
  rejected: 'Rechazado',
  accepted: 'Aceptado',
  paid: 'Pagado',
}

const TYPE_LABELS: Record<string, string> = {
  purchase: 'Compra',
  sale: 'Venta',
  service: 'Servicio',
  subscription: 'Suscripcion',
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function getFirstOfMonth(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

// ── Main Export ────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }: any) {
  const { profile } = useAuthStore()

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0071E3" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    )
  }

  const isPro =
    profile.user_type === 'workshop' ||
    profile.user_type === 'professional' ||
    profile.user_type === 'premium'

  if (isPro) {
    return <ProDashboard profile={profile} navigation={navigation} />
  }

  return <DefaultDashboard profile={profile} navigation={navigation} />
}

// ── ProDashboard ───────────────────────────────────────────────────────────────

function ProDashboard({ profile, navigation }: { profile: any; navigation: any }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboardData = useCallback(async () => {
    try {
      const userId = profile.id
      const firstOfMonth = getFirstOfMonth()

      // Run all queries in parallel
      const [
        monthlyRevenueRes,
        totalRevenueRes,
        totalOrdersRes,
        pendingQuotesRes,
        recentTransactionsRes,
        productsRes,
        totalProductsRes,
        lowStockRes,
        recentQuotesRes,
      ] = await Promise.all([
        // Monthly revenue
        supabase
          .from('transactions')
          .select('amount')
          .eq('seller_id', userId)
          .eq('status', 'completed')
          .gte('created_at', firstOfMonth),

        // Total revenue
        supabase
          .from('transactions')
          .select('amount')
          .eq('seller_id', userId)
          .eq('status', 'completed'),

        // Total orders count
        supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', userId),

        // Pending quotes count
        supabase
          .from('quote_requests')
          .select('id', { count: 'exact', head: true })
          .eq('target_user_id', userId)
          .eq('status', 'pending'),

        // Recent transactions (last 5)
        supabase
          .from('transactions')
          .select('id, amount, type, status, created_at')
          .eq('seller_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),

        // Products with low stock (stock < 10)
        supabase
          .from('professional_products')
          .select('id, product_name, stock, price, is_active')
          .eq('professional_id', userId)
          .lt('stock', 10)
          .order('stock', { ascending: true })
          .limit(10),

        // Total products count
        supabase
          .from('professional_products')
          .select('id', { count: 'exact', head: true })
          .eq('professional_id', userId)
          .eq('is_active', true),

        // Low stock count (stock < 5)
        supabase
          .from('professional_products')
          .select('id', { count: 'exact', head: true })
          .eq('professional_id', userId)
          .lt('stock', 5),

        // Recent quote requests (last 3)
        supabase
          .from('quote_requests')
          .select('id, car_model, car_year, service_type, status, created_at')
          .eq('target_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      const monthlyRevenue = (monthlyRevenueRes.data || []).reduce(
        (sum: number, t: any) => sum + (t.amount || 0),
        0
      )
      const totalRevenue = (totalRevenueRes.data || []).reduce(
        (sum: number, t: any) => sum + (t.amount || 0),
        0
      )

      setData({
        monthlyRevenue,
        totalRevenue,
        totalOrders: totalOrdersRes.count || 0,
        pendingQuotes: pendingQuotesRes.count || 0,
        recentTransactions: recentTransactionsRes.data || [],
        products: productsRes.data || [],
        totalProducts: totalProductsRes.count || 0,
        lowStockCount: lowStockRes.count || 0,
        recentQuotes: recentQuotesRes.data || [],
      })
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [profile.id])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadDashboardData()
  }, [loadDashboardData])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0071E3" />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0071E3" />
      }
    >
      {/* ── Header Card ─────────────────────────────────────────────── */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            {profile.company_name ? (
              <Text style={styles.headerSubtitle}>{profile.company_name}</Text>
            ) : (
              <Text style={styles.headerSubtitle}>{profile.full_name}</Text>
            )}
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {(USER_TYPE_LABELS[profile.user_type] || profile.user_type).toUpperCase()}
            </Text>
          </View>
        </View>
        {!profile.is_verified && (
          <View style={styles.verificationBanner}>
            <Text style={styles.verificationText}>
              Verificacion pendiente - Sube tu documentacion en Perfil
            </Text>
          </View>
        )}
      </View>

      {/* ── KPI Cards (2x2) ─────────────────────────────────────────── */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiRow}>
          <KPICard
            label="Ingresos Mes"
            value={formatCurrency(data?.monthlyRevenue || 0)}
            color="#34C759"
          />
          <KPICard
            label="Ingresos Totales"
            value={formatCurrency(data?.totalRevenue || 0)}
            color="#0071E3"
          />
        </View>
        <View style={styles.kpiRow}>
          <KPICard
            label="Total Pedidos"
            value={String(data?.totalOrders || 0)}
            color="#1D1D1F"
          />
          <KPICard
            label="Cotizaciones Pend."
            value={String(data?.pendingQuotes || 0)}
            color={data?.pendingQuotes ? '#FF9500' : '#1D1D1F'}
          />
        </View>
      </View>

      {/* ── Ventas Recientes ────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ventas Recientes</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Panel', { screen: 'PanelOrders' })}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionAction}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {data?.recentTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Sin transacciones recientes</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {data?.recentTransactions.map((tx, index) => (
              <View
                key={tx.id}
                style={[
                  styles.listRow,
                  index < (data?.recentTransactions.length || 0) - 1 && styles.listRowBorder,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowAmount}>{formatCurrency(tx.amount)}</Text>
                  <Text style={styles.listRowDate}>{formatDate(tx.created_at)}</Text>
                </View>
                <View style={styles.badgeRow}>
                  <StatusBadge status={tx.type} labels={TYPE_LABELS} fallbackColor="#0071E3" />
                  <StatusBadge status={tx.status} labels={STATUS_LABELS} />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Inventario ──────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Inventario</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Panel', { screen: 'PanelProducts' })}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionAction}>Ver productos</Text>
          </TouchableOpacity>
        </View>

        {/* Inventory summary strip */}
        <View style={styles.inventorySummary}>
          <View style={styles.inventoryStat}>
            <Text style={styles.inventoryStatValue}>{data?.totalProducts || 0}</Text>
            <Text style={styles.inventoryStatLabel}>Productos activos</Text>
          </View>
          <View style={styles.inventoryDivider} />
          <View style={styles.inventoryStat}>
            <Text
              style={[
                styles.inventoryStatValue,
                (data?.lowStockCount || 0) > 0 && { color: '#FF3B30' },
              ]}
            >
              {data?.lowStockCount || 0}
            </Text>
            <Text style={styles.inventoryStatLabel}>Stock critico ({'<'}5)</Text>
          </View>
        </View>

        {data?.products.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Todo el inventario en buen estado</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {data?.products.map((product, index) => {
              const isCritical = product.stock < 5
              const isLow = product.stock < 10
              return (
                <View
                  key={product.id}
                  style={[
                    styles.listRow,
                    index < (data?.products.length || 0) - 1 && styles.listRowBorder,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.product_name}
                    </Text>
                    <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                  </View>
                  <View
                    style={[
                      styles.stockBadge,
                      {
                        backgroundColor: isCritical
                          ? '#FFECEB'
                          : isLow
                            ? '#FFF8E6'
                            : '#E8F8ED',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockBadgeText,
                        {
                          color: isCritical ? '#FF3B30' : isLow ? '#FF9500' : '#34C759',
                        },
                      ]}
                    >
                      {product.stock} uds
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* ── Cotizaciones Recibidas ──────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cotizaciones Recibidas</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Quotes')} activeOpacity={0.7}>
            <Text style={styles.sectionAction}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {data?.recentQuotes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Sin cotizaciones recientes</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {data?.recentQuotes.map((quote, index) => (
              <View
                key={quote.id}
                style={[
                  styles.listRow,
                  index < (data?.recentQuotes.length || 0) - 1 && styles.listRowBorder,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.quoteCar} numberOfLines={1}>
                    {quote.car_model}
                    {quote.car_year ? ` (${quote.car_year})` : ''}
                  </Text>
                  <Text style={styles.quoteService}>{quote.service_type}</Text>
                  <Text style={styles.listRowDate}>{formatDate(quote.created_at)}</Text>
                </View>
                <StatusBadge status={quote.status} labels={STATUS_LABELS} />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones Rapidas</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          <QuickActionButton
            label="Panel"
            onPress={() => navigation.navigate('Panel', { screen: 'PanelDashboard' })}
          />
          <QuickActionButton
            label="Marketplace"
            onPress={() => navigation.navigate('Marketplace')}
          />
          <QuickActionButton
            label="Cotizaciones"
            onPress={() => navigation.navigate('Quotes')}
          />
          <QuickActionButton
            label="Facturas"
            onPress={() => navigation.navigate('Panel', { screen: 'PanelInvoices' })}
          />
          <QuickActionButton
            label="Perfil"
            onPress={() => navigation.navigate('Profile')}
          />
        </ScrollView>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

// ── DefaultDashboard (standard user) ───────────────────────────────────────────

function DefaultDashboard({ profile, navigation }: { profile: any; navigation: any }) {
  const [stats, setStats] = useState({ orders: 0, quotes: 0, pendingQuotes: 0 })
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const userId = profile.id

      const [ordersRes, quotesRes, pendingRes, subRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('buyer_id', userId),

        supabase
          .from('quote_requests')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),

        supabase
          .from('quote_requests')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'pending'),

        supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle(),
      ])

      setStats({
        orders: ordersRes.count || 0,
        quotes: quotesRes.count || 0,
        pendingQuotes: pendingRes.count || 0,
      })
      setSubscription(subRes.data)
    } catch (err) {
      console.error('Default dashboard load error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [profile.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0071E3" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0071E3" />
      }
    >
      {/* ── Welcome Header ──────────────────────────────────────────── */}
      <View style={styles.headerCard}>
        <Text style={styles.defaultWelcome}>Bienvenido,</Text>
        <Text style={styles.headerTitle}>{profile.full_name}</Text>
        <View style={styles.defaultBadgeRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>PARTICULAR</Text>
          </View>
          <View
            style={[
              styles.verificationPill,
              { backgroundColor: profile.is_verified ? '#E8F8ED' : '#FFF8E6' },
            ]}
          >
            <Text
              style={[
                styles.verificationPillText,
                { color: profile.is_verified ? '#34C759' : '#FF9500' },
              ]}
            >
              {profile.is_verified ? 'Verificado' : 'Pendiente'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Stats row ───────────────────────────────────────────────── */}
      <View style={styles.kpiRow}>
        <KPICard label="Mis Pedidos" value={String(stats.orders)} color="#0071E3" />
        <KPICard label="Cotizaciones" value={String(stats.quotes)} color="#1D1D1F" />
        <KPICard
          label="Pendientes"
          value={String(stats.pendingQuotes)}
          color={stats.pendingQuotes > 0 ? '#FF9500' : '#1D1D1F'}
        />
      </View>

      {/* ── Subscription Card ───────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tu Plan</Text>
        <View style={styles.subscriptionCard}>
          {subscription ? (
            <>
              <Text style={styles.subscriptionTier}>
                Plan activo - {subscription.billing_cycle === 'monthly' ? 'Mensual' : 'Anual'}
              </Text>
              {subscription.expires_at && (
                <Text style={styles.subscriptionExpiry}>
                  Expira: {formatDate(subscription.expires_at)}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.subscriptionTier}>Plan gratuito</Text>
          )}
          <TouchableOpacity
            style={styles.upgradePill}
            onPress={() => navigation.navigate('Subscriptions')}
            activeOpacity={0.7}
          >
            <Text style={styles.upgradePillText}>
              {subscription ? 'Gestionar plan' : 'Mejorar plan'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones Rapidas</Text>
        <View style={styles.defaultActionsGrid}>
          <DefaultActionCard
            title="Marketplace"
            subtitle="Explorar productos y servicios"
            onPress={() => navigation.navigate('Marketplace')}
          />
          <DefaultActionCard
            title="Presupuestos"
            subtitle="Solicitar o ver cotizaciones"
            onPress={() => navigation.navigate('Quotes')}
          />
          <DefaultActionCard
            title="Manuales"
            subtitle="Consultar manuales tecnicos"
            onPress={() => navigation.navigate('Manuals')}
          />
          <DefaultActionCard
            title="Mi Perfil"
            subtitle="Configuracion de cuenta"
            onPress={() => navigation.navigate('Profile')}
          />
        </View>
      </View>

      {/* ── Activity Suggestions ────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sugerencias</Text>
        <View style={styles.listCard}>
          <TouchableOpacity
            style={styles.suggestionRow}
            onPress={() => navigation.navigate('Marketplace')}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.suggestionTitle}>Explora el Marketplace</Text>
              <Text style={styles.suggestionSubtitle}>
                Encuentra piezas y servicios de escape profesionales
              </Text>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </TouchableOpacity>
          <View style={styles.listRowBorder} />
          <TouchableOpacity
            style={styles.suggestionRow}
            onPress={() => navigation.navigate('Quotes')}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.suggestionTitle}>Solicita un presupuesto</Text>
              <Text style={styles.suggestionSubtitle}>
                Obtiene cotizaciones de talleres verificados
              </Text>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

// ── Shared Sub-components ──────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <View style={styles.kpiCard}>
      <Text style={[styles.kpiValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  )
}

function StatusBadge({
  status,
  labels,
  fallbackColor,
}: {
  status: string
  labels: Record<string, string>
  fallbackColor?: string
}) {
  const colors = STATUS_COLORS[status] || {
    bg: fallbackColor ? `${fallbackColor}1A` : '#F5F5F7',
    text: fallbackColor || '#6E6E73',
  }
  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.statusBadgeText, { color: colors.text }]}>
        {labels[status] || status}
      </Text>
    </View>
  )
}

function QuickActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickActionPill} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.quickActionPillText}>{label}</Text>
    </TouchableOpacity>
  )
}

function DefaultActionCard({
  title,
  subtitle,
  onPress,
}: {
  title: string
  subtitle: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.defaultActionCard} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.defaultActionTitle}>{title}</Text>
      <Text style={styles.defaultActionSubtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#86868B',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 15,
    fontWeight: '400',
  },

  // Header Card
  headerCard: {
    margin: 20,
    marginBottom: 0,
    padding: 24,
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6E6E73',
    marginTop: 4,
  },
  typeBadge: {
    backgroundColor: '#0071E3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 980,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  verificationBanner: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFF8E6',
    borderRadius: 10,
  },
  verificationText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FF9500',
  },

  // Default welcome
  defaultWelcome: {
    fontSize: 15,
    color: '#6E6E73',
    fontWeight: '400',
    marginBottom: 2,
  },
  defaultBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  verificationPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 980,
  },
  verificationPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // KPI Grid
  kpiGrid: {
    padding: 20,
    paddingBottom: 0,
    gap: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    padding: 16,
    paddingVertical: 18,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#86868B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.3,
  },
  sectionAction: {
    fontSize: 15,
    fontWeight: '400',
    color: '#0071E3',
  },

  // List Card (shadow card)
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  listRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  listRowAmount: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  listRowDate: {
    fontSize: 13,
    fontWeight: '400',
    color: '#86868B',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 980,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Inventory
  inventorySummary: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    alignItems: 'center',
  },
  inventoryStat: {
    flex: 1,
    alignItems: 'center',
  },
  inventoryStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.3,
  },
  inventoryStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#86868B',
    marginTop: 4,
  },
  inventoryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: '#D2D2D7',
  },

  // Products
  productName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6E6E73',
    marginTop: 2,
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 980,
    marginLeft: 12,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Quotes
  quoteCar: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  quoteService: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6E6E73',
    marginTop: 2,
  },

  // Quick actions
  quickActionsScroll: {
    paddingTop: 10,
    gap: 10,
  },
  quickActionPill: {
    backgroundColor: '#0071E3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 980,
  },
  quickActionPillText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Empty state
  emptyCard: {
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#86868B',
  },

  // Default dashboard
  defaultActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  defaultActionCard: {
    width: '48%',
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    padding: 18,
    flexGrow: 1,
    flexBasis: '45%',
  },
  defaultActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  defaultActionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6E6E73',
    lineHeight: 18,
  },

  // Subscription
  subscriptionCard: {
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    padding: 20,
    marginTop: 4,
  },
  subscriptionTier: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  subscriptionExpiry: {
    fontSize: 13,
    fontWeight: '400',
    color: '#86868B',
    marginBottom: 14,
  },
  upgradePill: {
    backgroundColor: '#0071E3',
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 980,
    marginTop: 10,
  },
  upgradePillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Suggestions
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  suggestionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6E6E73',
    marginTop: 2,
  },
  chevron: {
    fontSize: 17,
    fontWeight: '400',
    color: '#86868B',
    marginLeft: 12,
  },
})
