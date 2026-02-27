import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { usePanelStore } from '../../stores/panelStore'

export default function PanelInvoicesScreen() {
  const {
    myInvoices,
    loading,
    fetchMyInvoices,
    createInvoice,
    generateInvoicePdf,
  } = usePanelStore()

  const [modalVisible, setModalVisible] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientTaxId, setClientTaxId] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemAmount, setItemAmount] = useState('')
  const [invoiceItems, setInvoiceItems] = useState<{ description: string; amount: number }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)

  useEffect(() => {
    fetchMyInvoices()
  }, [])

  const addItem = () => {
    if (!itemDescription.trim() || !itemAmount.trim()) {
      Alert.alert('Error', 'Completa la descripcion y el monto del concepto')
      return
    }
    const amount = parseFloat(itemAmount)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'El monto debe ser un numero positivo')
      return
    }
    setInvoiceItems([...invoiceItems, { description: itemDescription.trim(), amount }])
    setItemDescription('')
    setItemAmount('')
  }

  const removeItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index))
  }

  const handleCreateInvoice = async () => {
    if (!clientName.trim()) {
      Alert.alert('Error', 'El nombre del cliente es obligatorio')
      return
    }
    if (invoiceItems.length === 0) {
      Alert.alert('Error', 'Agrega al menos un concepto')
      return
    }
    setSubmitting(true)
    try {
      const total = invoiceItems.reduce((sum, item) => sum + item.amount, 0)
      await createInvoice({
        client_name: clientName.trim(),
        client_tax_id: clientTaxId.trim() || null,
        items: invoiceItems,
        total,
        status: 'pending',
      })
      Alert.alert('Creada', 'Factura creada correctamente')
      setModalVisible(false)
      setClientName('')
      setClientTaxId('')
      setInvoiceItems([])
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al crear factura')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGeneratePdf = async (invoiceId: string) => {
    setGeneratingPdf(invoiceId)
    try {
      const url = await generateInvoicePdf(invoiceId)
      if (url) {
        Alert.alert('PDF Generado', 'El PDF de la factura ha sido generado correctamente')
      } else {
        Alert.alert('Error', 'No se pudo generar el PDF')
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al generar PDF')
    } finally {
      setGeneratingPdf(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500'
      case 'paid':
        return '#34C759'
      case 'cancelled':
        return '#FF3B30'
      case 'draft':
        return '#86868B'
      default:
        return '#86868B'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFF3E0'
      case 'paid':
        return '#E8FAF0'
      case 'cancelled':
        return '#FFEBEE'
      case 'draft':
        return '#F5F5F7'
      default:
        return '#F5F5F7'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'paid':
        return 'Pagada'
      case 'cancelled':
        return 'Cancelada'
      case 'draft':
        return 'Borrador'
      default:
        return status
    }
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusBg(item.status) }]}>
          <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.cardDate}>
        {new Date(item.created_at).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.total}>
          {item.total != null ? `${Number(item.total).toFixed(2)}` : '--'}
        </Text>
        <TouchableOpacity
          style={styles.pdfButton}
          onPress={() => handleGeneratePdf(item.id)}
          disabled={generatingPdf === item.id}
          activeOpacity={0.7}
        >
          {generatingPdf === item.id ? (
            <ActivityIndicator size="small" color="#0071E3" />
          ) : (
            <Text style={styles.pdfButtonText}>Generar PDF</Text>
          )}
        </TouchableOpacity>
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
      <View style={styles.headerArea}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.createButtonText}>Crear Factura</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={myInvoices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>Sin facturas</Text>
            <Text style={styles.emptyText}>
              Crea tu primera factura con el boton de arriba
            </Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Nueva Factura</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Cliente</Text>
                <TextInput
                  style={styles.input}
                  value={clientName}
                  onChangeText={setClientName}
                  placeholder="Nombre del cliente"
                  placeholderTextColor="#86868B"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>NIF/CIF del cliente</Text>
                <TextInput
                  style={styles.input}
                  value={clientTaxId}
                  onChangeText={setClientTaxId}
                  placeholder="NIF/CIF (opcional)"
                  placeholderTextColor="#86868B"
                />
              </View>

              <Text style={styles.itemsSectionTitle}>Conceptos</Text>

              {invoiceItems.map((item, index) => (
                <View key={index} style={styles.invoiceItemRow}>
                  <View style={styles.invoiceItemInfo}>
                    <Text style={styles.invoiceItemDesc}>{item.description}</Text>
                    <Text style={styles.invoiceItemAmount}>
                      {item.amount.toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(index)} activeOpacity={0.7}>
                    <Text style={styles.removeItemText}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.addItemRow}>
                <TextInput
                  style={[styles.input, styles.addItemDescription]}
                  value={itemDescription}
                  onChangeText={setItemDescription}
                  placeholder="Descripcion"
                  placeholderTextColor="#86868B"
                />
                <TextInput
                  style={[styles.input, styles.addItemAmount]}
                  value={itemAmount}
                  onChangeText={setItemAmount}
                  placeholder="Monto"
                  placeholderTextColor="#86868B"
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={styles.addItemBtn} onPress={addItem} activeOpacity={0.7}>
                  <Text style={styles.addItemBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {invoiceItems.length > 0 && (
                <Text style={styles.totalPreview}>
                  Total: {invoiceItems.reduce((s, i) => s + i.amount, 0).toFixed(2)}
                </Text>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={handleCreateInvoice}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalBtnPrimaryText}>
                    {submitting ? 'Creando...' : 'Crear Factura'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerArea: {
    padding: 20,
    paddingBottom: 4,
  },
  createButton: {
    backgroundColor: '#0071E3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 980,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
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
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D1D1F',
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
  cardDate: {
    fontSize: 13,
    color: '#86868B',
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
  total: {
    fontSize: 22,
    fontWeight: '700',
    color: '#34C759',
    letterSpacing: -0.3,
  },
  pdfButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  pdfButtonText: {
    color: '#0071E3',
    fontSize: 14,
    fontWeight: '600',
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
    paddingTop: 12,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#D2D2D7',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#6E6E73',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D2D2D7',
    borderRadius: 12,
    padding: 12,
    fontSize: 17,
    color: '#1D1D1F',
  },
  itemsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
    marginTop: 4,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  invoiceItemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginRight: 12,
  },
  invoiceItemDesc: {
    color: '#1D1D1F',
    fontSize: 14,
    flex: 1,
  },
  invoiceItemAmount: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '600',
  },
  removeItemText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  addItemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  addItemDescription: {
    flex: 2,
  },
  addItemAmount: {
    flex: 1,
  },
  addItemBtn: {
    backgroundColor: '#0071E3',
    width: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addItemBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '300',
  },
  totalPreview: {
    color: '#1D1D1F',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 980,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: '#0071E3',
  },
  modalBtnCancel: {
    backgroundColor: '#F5F5F7',
  },
  modalBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBtnCancelText: {
    color: '#6E6E73',
    fontSize: 16,
    fontWeight: '600',
  },
})
