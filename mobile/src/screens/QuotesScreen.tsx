import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useAuthStore } from '../stores/authStore'
import { useQuoteStore } from '../stores/quoteStore'

export default function QuotesScreen() {
  const { user, profile } = useAuthStore()
  const {
    workshops,
    sentRequests,
    receivedRequests,
    loading,
    fetchWorkshops,
    fetchSentRequests,
    fetchReceivedRequests,
    createQuoteRequest,
    respondToQuote,
    updateRequestStatus,
  } = useQuoteStore()

  const [view, setView] = useState<'sent' | 'received'>('sent')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRespondModal, setShowRespondModal] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  // Create quote form state
  const [targetUserId, setTargetUserId] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carYear, setCarYear] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [specifications, setSpecifications] = useState('')

  // Respond to quote form state
  const [responsePrice, setResponsePrice] = useState('')
  const [responseNotes, setResponseNotes] = useState('')
  const [responseValidUntil, setResponseValidUntil] = useState('')

  useEffect(() => {
    if (user) {
      fetchWorkshops()
      fetchSentRequests()
      fetchReceivedRequests()
    }
  }, [user])

  const canReceiveQuotes =
    profile?.user_type === 'workshop' ||
    profile?.user_type === 'professional' ||
    profile?.user_type === 'premium'

  const resetCreateForm = () => {
    setTargetUserId('')
    setCarModel('')
    setCarYear('')
    setServiceType('')
    setSpecifications('')
  }

  const resetRespondForm = () => {
    setResponsePrice('')
    setResponseNotes('')
    setResponseValidUntil('')
    setSelectedRequestId(null)
  }

  const handleCreateQuote = async () => {
    if (!targetUserId || !carModel || !carYear || !serviceType) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios')
      return
    }

    const yearNum = parseInt(carYear, 10)
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      Alert.alert('Error', 'Ingresa un ano valido')
      return
    }

    try {
      await createQuoteRequest({
        target_user_id: targetUserId,
        car_model: carModel,
        car_year: yearNum,
        service_type: serviceType,
        specifications,
      })
      setShowCreateModal(false)
      resetCreateForm()
      Alert.alert('Exito', 'Solicitud de cotizacion enviada correctamente')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo enviar la solicitud')
    }
  }

  const handleRespondToQuote = async () => {
    if (!selectedRequestId || !responsePrice) {
      Alert.alert('Error', 'Por favor ingresa al menos el precio')
      return
    }

    const priceNum = parseFloat(responsePrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Error', 'Ingresa un precio valido')
      return
    }

    try {
      await respondToQuote({
        quote_request_id: selectedRequestId,
        price: priceNum,
        notes: responseNotes,
        valid_until: responseValidUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      setShowRespondModal(false)
      resetRespondForm()
      Alert.alert('Exito', 'Cotizacion enviada correctamente')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo enviar la cotizacion')
    }
  }

  const handleAccept = (requestId: string) => {
    Alert.alert('Confirmar', 'Deseas aceptar esta cotizacion?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aceptar', onPress: () => updateRequestStatus(requestId, 'accepted') },
    ])
  }

  const handleReject = (requestId: string) => {
    Alert.alert('Confirmar', 'Deseas rechazar esta cotizacion?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Rechazar', style: 'destructive', onPress: () => updateRequestStatus(requestId, 'rejected') },
    ])
  }

  const openRespondModal = (requestId: string) => {
    setSelectedRequestId(requestId)
    setShowRespondModal(true)
  }

  const renderSentCard = ({ item }: { item: any }) => (
    <QuoteRequestCard request={item}>
      {item.status === 'quoted' && item.quotes && item.quotes.length > 0 && (
        <View style={styles.quoteResponse}>
          <Text style={styles.quoteResponseLabel}>Cotizacion recibida:</Text>
          <Text style={styles.quoteResponsePrice}>
            $ {item.quotes[0].price}
          </Text>
          {item.quotes[0].notes ? (
            <Text style={styles.quoteResponseNotes}>{item.quotes[0].notes}</Text>
          ) : null}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAccept(item.id)}
            >
              <Text style={styles.acceptButtonText}>Aceptar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item.id)}
            >
              <Text style={styles.rejectButtonText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </QuoteRequestCard>
  )

  const renderReceivedCard = ({ item }: { item: any }) => (
    <QuoteRequestCard request={item}>
      {item.sender && (
        <Text style={styles.senderInfo}>
          De: {item.sender.company_name || item.sender.full_name}
        </Text>
      )}
      {item.status === 'pending' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.respondButton]}
          onPress={() => openRespondModal(item.id)}
        >
          <Text style={styles.respondButtonText}>Responder</Text>
        </TouchableOpacity>
      )}
      {item.status === 'quoted' && item.quotes && item.quotes.length > 0 && (
        <View style={styles.quoteResponse}>
          <Text style={styles.quoteResponseLabel}>Tu cotizacion:</Text>
          <Text style={styles.quoteResponsePrice}>$ {item.quotes[0].price}</Text>
        </View>
      )}
    </QuoteRequestCard>
  )

  return (
    <View style={styles.container}>
      {/* Tabs - Apple Segmented Control */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, view === 'sent' && styles.tabActive]}
            onPress={() => setView('sent')}
          >
            <Text style={[styles.tabText, view === 'sent' && styles.tabTextActive]}>
              Enviadas
            </Text>
          </TouchableOpacity>
          {canReceiveQuotes && (
            <TouchableOpacity
              style={[styles.tab, view === 'received' && styles.tabActive]}
              onPress={() => setView('received')}
            >
              <Text style={[styles.tabText, view === 'received' && styles.tabTextActive]}>
                Recibidas
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0071E3" />
        </View>
      ) : (
        <FlatList
          data={view === 'sent' ? sentRequests : receivedRequests}
          keyExtractor={(item) => item.id}
          renderItem={view === 'sent' ? renderSentCard : renderReceivedCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>
                No hay solicitudes {view === 'sent' ? 'enviadas' : 'recibidas'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal: Create Quote Request */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nueva Solicitud de Cotizacion</Text>
                <TouchableOpacity onPress={() => { setShowCreateModal(false); resetCreateForm() }}>
                  <Text style={styles.modalClose}>Cerrar</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Taller / Profesional *</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={targetUserId}
                  onValueChange={(val) => setTargetUserId(val)}
                  style={styles.modalPicker}
                  dropdownIconColor="#86868B"
                >
                  <Picker.Item label="Seleccionar..." value="" color="#86868B" />
                  {workshops.map((w: any) => (
                    <Picker.Item
                      key={w.id}
                      label={w.company_name || w.full_name}
                      value={w.id}
                      color={Platform.OS === 'ios' ? '#1D1D1F' : '#000'}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Modelo del vehiculo *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej: Honda Civic"
                placeholderTextColor="#86868B"
                value={carModel}
                onChangeText={setCarModel}
              />

              <Text style={styles.inputLabel}>Ano del vehiculo *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej: 2020"
                placeholderTextColor="#86868B"
                value={carYear}
                onChangeText={setCarYear}
                keyboardType="numeric"
                maxLength={4}
              />

              <Text style={styles.inputLabel}>Tipo de servicio *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej: Instalacion de escape deportivo"
                placeholderTextColor="#86868B"
                value={serviceType}
                onChangeText={setServiceType}
              />

              <Text style={styles.inputLabel}>Especificaciones</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Describe los detalles adicionales..."
                placeholderTextColor="#86868B"
                value={specifications}
                onChangeText={setSpecifications}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleCreateQuote}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Enviar Solicitud</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Respond to Quote */}
      <Modal
        visible={showRespondModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowRespondModal(false); resetRespondForm() }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Responder Cotizacion</Text>
              <TouchableOpacity onPress={() => { setShowRespondModal(false); resetRespondForm() }}>
                <Text style={styles.modalClose}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Precio (EUR) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: 850.00"
              placeholderTextColor="#86868B"
              value={responsePrice}
              onChangeText={setResponsePrice}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Notas</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Detalles de la cotizacion..."
              placeholderTextColor="#86868B"
              value={responseNotes}
              onChangeText={setResponseNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Valido hasta (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: 2026-03-15"
              placeholderTextColor="#86868B"
              value={responseValidUntil}
              onChangeText={setResponseValidUntil}
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleRespondToQuote}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Enviar Cotizacion</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function QuoteRequestCard({ request, children }: { request: any; children?: React.ReactNode }) {
  const statusColors: Record<string, string> = {
    pending: '#FF9500',
    quoted: '#0071E3',
    accepted: '#34C759',
    rejected: '#FF3B30',
  }

  const statusBgColors: Record<string, string> = {
    pending: '#FFF8F0',
    quoted: '#F0F7FF',
    accepted: '#F0FFF5',
    rejected: '#FFF5F5',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    quoted: 'Cotizado',
    accepted: 'Aceptado',
    rejected: 'Rechazado',
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {request.service_type}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBgColors[request.status] || '#F5F5F7' }]}>
          <Text style={[styles.statusBadgeText, { color: statusColors[request.status] || '#86868B' }]}>
            {statusLabels[request.status] || request.status}
          </Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>
        {request.car_model} ({request.car_year})
      </Text>
      {request.specifications ? (
        <Text style={styles.cardDescription}>{request.specifications}</Text>
      ) : null}
      <Text style={styles.cardDate}>
        {new Date(request.created_at).toLocaleDateString('es-ES')}
      </Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabsWrapper: {
    padding: 20,
    paddingBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#1D1D1F',
  },
  tabText: {
    color: '#6E6E73',
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 100,
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
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D1D1F',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 980,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#6E6E73',
    marginBottom: 6,
    fontWeight: '400',
  },
  cardDescription: {
    fontSize: 15,
    color: '#86868B',
    marginBottom: 6,
    lineHeight: 22,
    fontWeight: '400',
  },
  cardDate: {
    fontSize: 13,
    color: '#86868B',
    fontWeight: '400',
  },
  senderInfo: {
    fontSize: 14,
    color: '#0071E3',
    marginTop: 10,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    color: '#86868B',
    fontSize: 17,
    textAlign: 'center',
    fontWeight: '400',
  },

  // Quote response section
  quoteResponse: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: '#D2D2D7',
  },
  quoteResponseLabel: {
    fontSize: 13,
    color: '#86868B',
    marginBottom: 4,
    fontWeight: '400',
  },
  quoteResponsePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#34C759',
    marginBottom: 4,
  },
  quoteResponseNotes: {
    fontSize: 14,
    color: '#6E6E73',
    marginBottom: 10,
    lineHeight: 20,
    fontWeight: '400',
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 980,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  rejectButtonText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '600',
  },
  respondButton: {
    backgroundColor: '#0071E3',
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 980,
    alignItems: 'center',
  },
  respondButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0071E3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 32,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  modalClose: {
    color: '#0071E3',
    fontSize: 17,
    fontWeight: '400',
    padding: 6,
  },
  inputLabel: {
    fontSize: 15,
    color: '#1D1D1F',
    marginBottom: 8,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D2D2D7',
    borderRadius: 12,
    padding: 12,
    fontSize: 17,
    color: '#1D1D1F',
    marginBottom: 20,
  },
  modalTextArea: {
    minHeight: 100,
  },
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D2D2D7',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  modalPicker: {
    color: '#1D1D1F',
    height: 50,
  },
  submitButton: {
    backgroundColor: '#0071E3',
    paddingVertical: 12,
    borderRadius: 980,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
})
