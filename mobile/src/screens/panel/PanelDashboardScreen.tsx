import { useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { usePanelStore } from '../../stores/panelStore'

export default function PanelDashboardScreen({ navigation }: any) {
  const { stats, myProducts, loading, fetchStats, fetchMyProducts, fetchMyServices } =
    usePanelStore()

  useEffect(() => {
    fetchStats()
    fetchMyProducts()
    fetchMyServices()
  }, [])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0071E3" />
        <Text style={styles.loadingText}>Cargando panel...</Text>
      </View>
    )
  }

  const recentProducts = myProducts.slice(0, 3)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title="Revenue Total"
            value={`${stats.totalRevenue.toFixed(2)}`}
            color="#34C759"
          />
          <StatCard
            title="Revenue Mensual"
            value={`${stats.monthlyRevenue.toFixed(2)}`}
            color="#0071E3"
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            title="Pedidos"
            value={stats.totalOrders.toString()}
            color="#AF52DE"
          />
          <StatCard
            title="Presupuestos Pendientes"
            value={stats.pendingQuotes.toString()}
            color="#FF9500"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones</Text>
        <View style={styles.navGrid}>
          <NavButton
            title="Productos"
            onPress={() => navigation.navigate('PanelProducts')}
          />
          <NavButton
            title="Pedidos"
            onPress={() => navigation.navigate('PanelOrders')}
          />
          <NavButton
            title="Facturas"
            onPress={() => navigation.navigate('PanelInvoices')}
          />
          <NavButton
            title="Sincronizar Catalogo"
            onPress={() => navigation.navigate('PanelCatalogSync')}
          />
        </View>
      </View>

      {recentProducts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos Recientes</Text>
          {recentProducts.map((product: any) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>
                  {product.price != null ? `${Number(product.price).toFixed(2)}` : 'Sin precio'}
                </Text>
              </View>
              <View
                style={[
                  styles.activeBadge,
                  {
                    backgroundColor:
                      product.is_active !== false
                        ? '#E8FAF0'
                        : '#F5F5F7',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.activeBadgeText,
                    {
                      color: product.is_active !== false ? '#34C759' : '#86868B',
                    },
                  ]}
                >
                  {product.is_active !== false ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  )
}

function NavButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.navButton} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.navButtonText}>{title}</Text>
      <Text style={styles.navButtonArrow}>{'\u203A'}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    color: '#86868B',
    marginTop: 16,
    fontSize: 16,
  },
  statsGrid: {
    padding: 20,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    padding: 20,
    borderRadius: 18,
  },
  statTitle: {
    fontSize: 13,
    color: '#86868B',
    marginBottom: 10,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  navButton: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D2D2D7',
  },
  navButtonText: {
    color: '#0071E3',
    fontSize: 14,
    fontWeight: '600',
  },
  navButtonArrow: {
    color: '#0071E3',
    fontSize: 22,
    fontWeight: '300',
    opacity: 0.6,
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    padding: 18,
    borderRadius: 18,
    marginBottom: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#6E6E73',
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 980,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
})
