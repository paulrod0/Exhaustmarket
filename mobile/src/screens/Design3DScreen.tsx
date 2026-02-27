import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export default function Design3DScreen() {
  const { profile, user } = useAuthStore()
  const [designs, setDesigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const canUpload = profile?.user_type === 'professional' || profile?.user_type === 'premium'
  const hasAccess = canUpload

  useEffect(() => {
    if (hasAccess) {
      fetchDesigns()
    }
  }, [user, hasAccess])

  const fetchDesigns = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('design_3d')
        .select('*')
        .or(`uploaded_by.eq.${user?.id},is_public.eq.true`)
        .order('created_at', { ascending: false })

      setDesigns(data || [])
    } catch (error) {
      console.error('Error fetching designs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!hasAccess) {
    return (
      <View style={styles.restrictedContainer}>
        <View style={styles.restrictedIconContainer}>
          <Text style={styles.restrictedIcon}>{'\u{1F512}'}</Text>
        </View>
        <Text style={styles.restrictedTitle}>Acceso Restringido</Text>
        <Text style={styles.restrictedText}>
          El acceso a los disenos 3D esta disponible solo para usuarios con plan Profesional o Premium.
        </Text>
        <TouchableOpacity style={styles.upgradeButton} activeOpacity={0.7}>
          <Text style={styles.upgradeButtonText}>Ver Planes</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {canUpload && (
          <TouchableOpacity style={styles.uploadButton} activeOpacity={0.7}>
            <Text style={styles.uploadButtonText}>+ Subir Diseno</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Cargando disenos...</Text>
        </View>
      ) : (
        <FlatList
          data={designs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DesignCard design={item} isOwner={item.uploaded_by === user?.id} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>No hay disenos disponibles todavia</Text>
            </View>
          }
          numColumns={2}
          columnWrapperStyle={styles.row}
        />
      )}
    </View>
  )
}

function DesignCard({ design, isOwner }: any) {
  return (
    <View style={styles.designCard}>
      <View style={styles.designPreview}>
        <Text style={styles.designIcon}>{'\u{1F4E6}'}</Text>
        {isOwner && (
          <View style={styles.visibilityBadge}>
            <Text style={styles.visibilityText}>
              {design.is_public ? 'Publico' : 'Privado'}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.designTitle} numberOfLines={2}>
        {design.title}
      </Text>
      {design.description && (
        <Text style={styles.designDescription} numberOfLines={2}>
          {design.description}
        </Text>
      )}
      {design.file_size && (
        <Text style={styles.designSize}>
          {(design.file_size / 1024 / 1024).toFixed(2)} MB
        </Text>
      )}
      <TouchableOpacity style={styles.viewButton} activeOpacity={0.7}>
        <Text style={styles.viewButtonText}>Ver en 3D</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  restrictedContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  restrictedIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  restrictedIcon: {
    fontSize: 36,
  },
  restrictedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  restrictedText: {
    fontSize: 16,
    color: '#6E6E73',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 300,
    lineHeight: 24,
  },
  upgradeButton: {
    backgroundColor: '#0071E3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 980,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    alignItems: 'flex-end',
  },
  uploadButton: {
    backgroundColor: '#0071E3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 980,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  designCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  designPreview: {
    width: '100%',
    height: 120,
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  designIcon: {
    fontSize: 48,
  },
  visibilityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 980,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  visibilityText: {
    fontSize: 10,
    color: '#6E6E73',
    fontWeight: '600',
  },
  designTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  designDescription: {
    fontSize: 12,
    color: '#86868B',
    marginBottom: 4,
    lineHeight: 17,
  },
  designSize: {
    fontSize: 11,
    color: '#86868B',
    marginBottom: 10,
  },
  viewButton: {
    backgroundColor: '#F5F5F7',
    paddingVertical: 10,
    borderRadius: 980,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#0071E3',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  loadingText: {
    color: '#86868B',
    fontSize: 16,
  },
  emptyText: {
    color: '#86868B',
    fontSize: 16,
    textAlign: 'center',
  },
})
