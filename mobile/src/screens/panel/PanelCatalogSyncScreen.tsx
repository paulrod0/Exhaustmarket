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
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { usePanelStore } from '../../stores/panelStore'

const SOURCE_TYPES = [
  { label: 'CSV', value: 'csv' },
  { label: 'API REST', value: 'api' },
  { label: 'XML Feed', value: 'xml' },
  { label: 'JSON Feed', value: 'json' },
]

export default function PanelCatalogSyncScreen() {
  const {
    catalogSources,
    loading,
    fetchCatalogSources,
    addCatalogSource,
    deleteCatalogSource,
    triggerSync,
  } = usePanelStore()

  const [modalVisible, setModalVisible] = useState(false)
  const [sourceType, setSourceType] = useState('csv')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  useEffect(() => {
    fetchCatalogSources()
  }, [])

  const handleAdd = async () => {
    if (!sourceUrl.trim()) {
      Alert.alert('Error', 'La URL es obligatoria')
      return
    }
    setSubmitting(true)
    try {
      await addCatalogSource({
        name: sourceName.trim() || sourceUrl.trim(),
        source_type: sourceType,
        url: sourceUrl.trim(),
        sync_status: 'idle',
      })
      Alert.alert('Agregado', 'Fuente de catalogo agregada')
      setModalVisible(false)
      setSourceUrl('')
      setSourceName('')
      setSourceType('csv')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al agregar fuente')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSync = async (sourceId: string) => {
    setSyncingId(sourceId)
    try {
      await triggerSync(sourceId)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al sincronizar')
    } finally {
      setSyncingId(null)
    }
  }

  const handleDelete = (source: any) => {
    Alert.alert(
      'Eliminar fuente',
      `Eliminar "${source.name || source.url}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCatalogSource(source.id)
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Error al eliminar')
            }
          },
        },
      ]
    )
  }

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'syncing':
        return { color: '#FF9500', label: 'Sincronizando...' }
      case 'success':
        return { color: '#34C759', label: 'Sincronizado' }
      case 'error':
        return { color: '#FF3B30', label: 'Error' }
      case 'idle':
      default:
        return { color: '#86868B', label: 'Sin sincronizar' }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'csv':
        return 'CSV'
      case 'api':
        return 'API'
      case 'xml':
        return 'XML'
      case 'json':
        return 'JSON'
      default:
        return 'SRC'
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    const status = getStatusIndicator(item.sync_status)
    const isSyncing = syncingId === item.id || item.sync_status === 'syncing'

    return (
      <View style={styles.sourceCard}>
        <View style={styles.sourceHeader}>
          <View style={styles.typeIconContainer}>
            <Text style={styles.typeIconText}>{getTypeIcon(item.source_type)}</Text>
          </View>
          <View style={styles.sourceInfo}>
            <Text style={styles.sourceName} numberOfLines={1}>
              {item.name || item.url}
            </Text>
            <Text style={styles.sourceUrl} numberOfLines={1}>
              {item.url}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            {isSyncing && (
              <ActivityIndicator size="small" color="#FF9500" style={styles.syncSpinner} />
            )}
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          {item.last_synced_at && (
            <Text style={styles.lastSynced}>
              Ultimo: {new Date(item.last_synced_at).toLocaleDateString('es-ES', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>

        <View style={styles.sourceActions}>
          <TouchableOpacity
            style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
            onPress={() => handleSync(item.id)}
            disabled={isSyncing}
            activeOpacity={0.7}
          >
            <Text style={[styles.syncBtnText, isSyncing && styles.syncBtnTextDisabled]}>
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteSourceBtn}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteSourceBtnText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

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
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>Agregar Fuente</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={catalogSources}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>Sin fuentes de catalogo</Text>
            <Text style={styles.emptyText}>
              Agrega una fuente para sincronizar tu catalogo automaticamente
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
            <Text style={styles.modalTitle}>Nueva Fuente de Catalogo</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nombre (opcional)</Text>
              <TextInput
                style={styles.input}
                value={sourceName}
                onChangeText={setSourceName}
                placeholder="Nombre de la fuente"
                placeholderTextColor="#86868B"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Tipo de fuente</Text>
              <View style={styles.typeSelector}>
                {SOURCE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeSelectorItem,
                      sourceType === t.value && styles.typeSelectorItemActive,
                    ]}
                    onPress={() => setSourceType(t.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.typeSelectorText,
                        sourceType === t.value && styles.typeSelectorTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>URL</Text>
              <TextInput
                style={styles.input}
                value={sourceUrl}
                onChangeText={setSourceUrl}
                placeholder="https://example.com/catalog.csv"
                placeholderTextColor="#86868B"
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleAdd}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {submitting ? 'Agregando...' : 'Agregar'}
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
  headerArea: {
    padding: 20,
    paddingBottom: 4,
  },
  addButton: {
    backgroundColor: '#0071E3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 980,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  sourceCard: {
    backgroundColor: '#F5F5F7',
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#D2D2D7',
  },
  typeIconText: {
    color: '#0071E3',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  sourceUrl: {
    fontSize: 12,
    color: '#86868B',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  syncSpinner: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lastSynced: {
    fontSize: 11,
    color: '#86868B',
  },
  sourceActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 14,
  },
  syncBtn: {
    flex: 1,
    backgroundColor: '#0071E3',
    paddingVertical: 12,
    borderRadius: 980,
    alignItems: 'center',
  },
  syncBtnDisabled: {
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#D2D2D7',
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  syncBtnTextDisabled: {
    color: '#86868B',
  },
  deleteSourceBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 980,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteSourceBtnText: {
    color: '#FF3B30',
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
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeSelectorItem: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    paddingVertical: 12,
    borderRadius: 980,
    alignItems: 'center',
  },
  typeSelectorItemActive: {
    backgroundColor: '#1D1D1F',
  },
  typeSelectorText: {
    color: '#6E6E73',
    fontSize: 13,
    fontWeight: '600',
  },
  typeSelectorTextActive: {
    color: '#FFFFFF',
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
