import { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native'
import { supabase } from '../lib/supabase'

interface Manual {
  id: string
  title: string
  description: string
  car_brand: string
  car_model: string
  manual_type: string
  file_url: string
  file_size: number
  thumbnail_url?: string
  required_tier: string
  created_at: string
}

const manualTypeLabels: Record<string, string> = {
  car_manual: 'Manual de Coche',
  exhaust_installation: 'Instalacion de Escape',
  maintenance: 'Mantenimiento',
  other: 'Otros'
}

export default function ManualsScreen() {
  const [manuals, setManuals] = useState<Manual[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  useEffect(() => {
    fetchManuals()
  }, [])

  async function fetchManuals() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('manuals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setManuals(data || [])
    } catch (err) {
      console.error('Error fetching manuals:', err)
      Alert.alert('Error', 'No se pudieron cargar los manuales')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(manual: Manual) {
    try {
      const { data, error } = await supabase.storage
        .from('manuals')
        .createSignedUrl(manual.file_url, 3600)

      if (error) throw error

      if (data?.signedUrl) {
        Alert.alert(
          'Descargar Manual',
          `Para descargar "${manual.title}", abre este enlace en tu navegador:\n\n${data.signedUrl}`,
          [
            { text: 'OK' }
          ]
        )
      }
    } catch (err) {
      console.error('Error downloading manual:', err)
      Alert.alert('Error', 'No se pudo obtener el enlace de descarga')
    }
  }

  const filteredManuals = manuals.filter(manual => {
    const matchesSearch =
      manual.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manual.car_brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manual.car_model.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = selectedType === 'all' || manual.manual_type === selectedType

    return matchesSearch && matchesType
  })

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const renderManual = ({ item }: { item: Manual }) => (
    <View style={styles.manualCard}>
      <View style={styles.manualHeader}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>{'\u{1F4C4}'}</Text>
        </View>
        <View style={styles.manualInfo}>
          <Text style={styles.manualTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.manualSubtitle}>
            {item.car_brand} {item.car_model}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {manualTypeLabels[item.manual_type]}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.fileSize}>{formatFileSize(item.file_size)}</Text>
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => handleDownload(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.downloadButtonText}>Descargar</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0071E3" />
        <Text style={styles.loadingText}>Cargando manuales...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por titulo, marca o modelo..."
          placeholderTextColor="#86868B"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Tipo:</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, selectedType === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedType('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterButtonText, selectedType === 'all' && styles.filterButtonTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          {Object.entries(manualTypeLabels).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[styles.filterButton, selectedType === value && styles.filterButtonActive]}
              onPress={() => setSelectedType(value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterButtonText, selectedType === value && styles.filterButtonTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filteredManuals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F4DA}'}</Text>
          </View>
          <Text style={styles.emptyText}>
            {searchTerm || selectedType !== 'all'
              ? 'No se encontraron manuales'
              : 'No hay manuales disponibles'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredManuals}
          renderItem={renderManual}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
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
  searchContainer: {
    padding: 20,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    color: '#1D1D1F',
    padding: 12,
    borderRadius: 12,
    fontSize: 17,
    borderWidth: 1,
    borderColor: '#D2D2D7',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterLabel: {
    color: '#6E6E73',
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '500',
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 980,
    backgroundColor: '#F5F5F7',
  },
  filterButtonActive: {
    backgroundColor: '#1D1D1F',
  },
  filterButtonText: {
    color: '#6E6E73',
    fontSize: 13,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
    paddingTop: 4,
  },
  manualCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  manualHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 14,
  },
  iconContainer: {
    width: 52,
    height: 52,
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  manualInfo: {
    flex: 1,
  },
  manualTitle: {
    color: '#1D1D1F',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  manualSubtitle: {
    color: '#6E6E73',
    fontSize: 14,
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8FAF0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 980,
  },
  badgeText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    color: '#6E6E73',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F7',
  },
  fileSize: {
    color: '#86868B',
    fontSize: 14,
  },
  downloadButton: {
    backgroundColor: '#0071E3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 980,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyText: {
    color: '#86868B',
    fontSize: 16,
    textAlign: 'center',
  },
})
