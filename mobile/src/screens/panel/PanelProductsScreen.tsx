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
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { usePanelStore } from '../../stores/panelStore'
import { useAuthStore } from '../../stores/authStore'

export default function PanelProductsScreen() {
  const { profile } = useAuthStore()
  const {
    myProducts,
    myServices,
    loading,
    fetchMyProducts,
    fetchMyServices,
    createProduct,
    updateProduct,
    deleteProduct,
    createService,
    updateService,
    deleteService,
  } = usePanelStore()

  const isWorkshop = profile?.user_type === 'workshop'
  const items = isWorkshop ? myServices : myProducts

  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formStock, setFormStock] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isWorkshop) {
      fetchMyServices()
    } else {
      fetchMyProducts()
    }
  }, [])

  const openAddModal = () => {
    setEditingItem(null)
    setFormName('')
    setFormDescription('')
    setFormPrice('')
    setFormStock('')
    setModalVisible(true)
  }

  const openEditModal = (item: any) => {
    setEditingItem(item)
    setFormName(item.name || '')
    setFormDescription(item.description || '')
    setFormPrice(item.price?.toString() || '')
    setFormStock(item.stock?.toString() || '')
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio')
      return
    }
    setSubmitting(true)
    try {
      const payload: any = {
        name: formName.trim(),
        description: formDescription.trim(),
        price: formPrice ? parseFloat(formPrice) : 0,
      }
      if (!isWorkshop) {
        payload.stock = formStock ? parseInt(formStock, 10) : 0
      }

      if (editingItem) {
        if (isWorkshop) {
          await updateService(editingItem.id, payload)
        } else {
          await updateProduct(editingItem.id, payload)
        }
        Alert.alert('Actualizado', 'Elemento actualizado correctamente')
      } else {
        if (isWorkshop) {
          await createService(payload)
        } else {
          await createProduct(payload)
        }
        Alert.alert('Creado', 'Elemento creado correctamente')
      }
      setModalVisible(false)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (item: any) => {
    Alert.alert(
      'Confirmar eliminacion',
      `Eliminar "${item.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isWorkshop) {
                await deleteService(item.id)
              } else {
                await deleteProduct(item.id)
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Error al eliminar')
            }
          },
        },
      ]
    )
  }

  const handleToggleActive = async (item: any) => {
    try {
      const newActive = item.is_active === false ? true : false
      if (isWorkshop) {
        await updateService(item.id, { is_active: newActive })
      } else {
        await updateProduct(item.id, { is_active: newActive })
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al actualizar estado')
    }
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.is_active !== false
                  ? '#E8FAF0'
                  : '#F5F5F7',
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: item.is_active !== false ? '#34C759' : '#86868B' },
            ]}
          >
            {item.is_active !== false ? 'Activo' : 'Inactivo'}
          </Text>
        </View>
      </View>

      <View style={styles.itemDetails}>
        <Text style={styles.itemPrice}>
          {item.price != null ? `${Number(item.price).toFixed(2)}` : '--'}
        </Text>
        {!isWorkshop && (
          <Text style={styles.itemStock}>Stock: {item.stock ?? 0}</Text>
        )}
      </View>

      <View style={styles.itemActions}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Activo</Text>
          <Switch
            value={item.is_active !== false}
            onValueChange={() => handleToggleActive(item)}
            trackColor={{ false: '#D2D2D7', true: '#34C759' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEditModal(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.editBtnText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteBtnText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0071E3" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                No hay {isWorkshop ? 'servicios' : 'productos'} registrados
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAddModal} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

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
            <Text style={styles.modalTitle}>
              {editingItem ? 'Editar' : 'Nuevo'}{' '}
              {isWorkshop ? 'Servicio' : 'Producto'}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Nombre"
                placeholderTextColor="#86868B"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Descripcion</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Descripcion"
                placeholderTextColor="#86868B"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Precio</Text>
              <TextInput
                style={styles.input}
                value={formPrice}
                onChangeText={setFormPrice}
                placeholder="0.00"
                placeholderTextColor="#86868B"
                keyboardType="decimal-pad"
              />
            </View>

            {!isWorkshop && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Stock</Text>
                <TextInput
                  style={styles.input}
                  value={formStock}
                  onChangeText={setFormStock}
                  placeholder="0"
                  placeholderTextColor="#86868B"
                  keyboardType="number-pad"
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {submitting ? 'Guardando...' : 'Guardar'}
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
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyText: {
    color: '#86868B',
    fontSize: 16,
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: '#F5F5F7',
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 980,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0071E3',
    letterSpacing: -0.3,
  },
  itemStock: {
    fontSize: 14,
    color: '#6E6E73',
    alignSelf: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    color: '#6E6E73',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: '#0071E3',
  },
  editBtnText: {
    color: '#0071E3',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteBtnText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0071E3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 32,
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
    marginBottom: 18,
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
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
