import { useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { usePanelStore } from '../../stores/panelStore'

export default function PanelOrdersScreen() {
  const { myTransactions, loading, fetchMyTransactions } = usePanelStore()

  useEffect(() => {
    fetchMyTransactions()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500'
      case 'completed':
        return '#34C759'
      case 'cancelled':
        return '#FF3B30'
      default:
        return '#86868B'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFF3E0'
      case 'completed':
        return '#E8FAF0'
      case 'cancelled':
        return '#FFEBEE'
      default:
        return '#F5F5F7'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'completed':
        return 'Completado'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>
          {new Date(item.created_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        <View style={[styles.badge, { backgroundColor: getStatusBg(item.status) }]}>
          <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.buyerName}>
        {item.buyer?.full_name || 'Comprador desconocido'}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.amount}>
          {item.amount != null ? `${Number(item.amount).toFixed(2)}` : '--'}
        </Text>
        {item.type && (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.type}</Text>
          </View>
        )}
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0071E3" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={myTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>Sin pedidos</Text>
            <Text style={styles.emptyText}>
              Aun no tienes pedidos registrados
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#F5F5F7',
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardDate: {
    fontSize: 13,
    color: '#86868B',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 980,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buyerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 14,
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0071E3',
    letterSpacing: -0.3,
  },
  typeBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: '#D2D2D7',
  },
  typeBadgeText: {
    color: '#6E6E73',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyText: {
    color: '#86868B',
    fontSize: 15,
    textAlign: 'center',
  },
})
