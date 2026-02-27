import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { useAuthStore } from '../stores/authStore'

export default function ProfileScreen({ navigation }: any) {
  const { profile, updateProfile, signOut } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [companyName, setCompanyName] = useState(profile?.company_name || '')
  const [taxId, setTaxId] = useState(profile?.tax_id || '')
  const [loading, setLoading] = useState(false)

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    )
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateProfile({
        full_name: fullName,
        phone: phone || null,
        company_name: companyName || null,
        tax_id: taxId || null,
      })
      Alert.alert('Exito', 'Perfil actualizado correctamente')
      setEditing(false)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al actualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al cerrar sesion')
    }
  }

  const needsDocumentation =
    (profile.user_type === 'professional' || profile.user_type === 'workshop') && !profile.is_verified

  const userTypeLabels: Record<string, string> = {
    standard: 'Particular',
    regular: 'Particular',
    professional: 'Profesional',
    workshop: 'Taller',
    premium: 'Premium',
    admin: 'Administrador',
  }

  const userTypeBadgeColors: Record<string, { bg: string; text: string }> = {
    standard: { bg: '#F5F5F7', text: '#6E6E73' },
    regular: { bg: '#F5F5F7', text: '#6E6E73' },
    professional: { bg: '#E8F0FF', text: '#0071E3' },
    workshop: { bg: '#E8F8ED', text: '#34C759' },
    premium: { bg: '#FFF3E0', text: '#FF9500' },
    admin: { bg: '#FFECEB', text: '#FF3B30' },
  }

  const badgeColor = userTypeBadgeColors[profile.user_type] || { bg: '#F5F5F7', text: '#6E6E73' }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mi Perfil</Text>
        {!editing && (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Card */}
      <View style={styles.section}>
        {editing ? (
          <>
            <Text style={styles.sectionTitle}>Editar Perfil</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nombre completo"
                placeholderTextColor="#86868B"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Telefono</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Telefono"
                placeholderTextColor="#86868B"
                keyboardType="phone-pad"
              />
            </View>

            {(profile.user_type === 'professional' || profile.user_type === 'workshop') && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Nombre de la Empresa</Text>
                  <TextInput
                    style={styles.input}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Empresa"
                    placeholderTextColor="#86868B"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>NIF/CIF</Text>
                  <TextInput
                    style={styles.input}
                    value={taxId}
                    onChangeText={setTaxId}
                    placeholder="NIF/CIF"
                    placeholderTextColor="#86868B"
                  />
                </View>
              </>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, loading && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setEditing(false)
                  setFullName(profile.full_name)
                  setPhone(profile.phone || '')
                  setCompanyName(profile.company_name || '')
                  setTaxId(profile.tax_id || '')
                }}
              >
                <Text style={styles.buttonSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Name + badge */}
            <View style={styles.profileTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{profile.full_name}</Text>
                <Text style={styles.profileEmail}>{profile.email || profile.id}</Text>
                <View style={[styles.typeBadge, { backgroundColor: badgeColor.bg }]}>
                  <Text style={[styles.typeBadgeText, { color: badgeColor.text }]}>
                    {userTypeLabels[profile.user_type] || profile.user_type}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <InfoRow label="Telefono" value={profile.phone || 'No especificado'} />
            {(profile.user_type === 'professional' || profile.user_type === 'workshop') && (
              <>
                <InfoRow label="Empresa" value={profile.company_name || 'No especificada'} />
                <InfoRow label="NIF/CIF" value={profile.tax_id || 'No especificado'} />
              </>
            )}
            <InfoRow
              label="Verificacion"
              value={profile.is_verified ? 'Verificado' : 'Pendiente'}
              valueColor={profile.is_verified ? '#34C759' : '#FF9500'}
            />
            <InfoRow
              label="Miembro desde"
              value={new Date(profile.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
              })}
              isLast
            />
          </>
        )}
      </View>

      {/* Documentation Section */}
      {needsDocumentation && (
        <View style={styles.docSection}>
          <View style={styles.docHeader}>
            <Text style={styles.docWarningIcon}>📋</Text>
            <Text style={styles.docTitle}>Documentacion Requerida</Text>
          </View>

          <Text style={styles.docDescription}>
            Para verificar tu cuenta y comenzar a{' '}
            {profile.user_type === 'professional' ? 'vender productos' : 'ofrecer servicios'},
            necesitas subir la siguiente documentacion:
          </Text>

          <View style={styles.docList}>
            <DocumentItem title="Licencia de Negocio o Alta de Autonomo" status="pending" />
            <DocumentItem title="Registro Fiscal (NIF/CIF)" status="pending" />
            <DocumentItem title="Documento de Identidad" status="pending" />
            {profile.user_type === 'workshop' && (
              <DocumentItem title="Seguro de Responsabilidad Civil" status="pending" />
            )}
          </View>

          <View style={styles.docNote}>
            <Text style={styles.docNoteText}>
              La funcionalidad de subida de documentos estara disponible proximamente. Por favor, contacta con soporte para verificar tu cuenta manualmente.
            </Text>
          </View>
        </View>
      )}

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Cerrar Sesion</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function InfoRow({
  label,
  value,
  valueColor,
  isLast,
}: {
  label: string
  value: string
  valueColor?: string
  isLast?: boolean
}) {
  return (
    <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  )
}

function DocumentItem({ title, status }: { title: string; status: 'pending' | 'approved' | 'rejected' }) {
  const statusConfig = {
    pending: { icon: '🕐', bg: '#FFF8E6', text: '#FF9500', label: 'Pendiente' },
    approved: { icon: '✅', bg: '#E8F8ED', text: '#34C759', label: 'Aprobado' },
    rejected: { icon: '❌', bg: '#FFECEB', text: '#FF3B30', label: 'Rechazado' },
  }
  const config = statusConfig[status]

  return (
    <View style={styles.docItem}>
      <Text style={styles.docItemTitle}>{title}</Text>
      <View style={[styles.docItemBadge, { backgroundColor: config.bg }]}>
        <Text style={styles.docItemIcon}>{config.icon}</Text>
        <Text style={[styles.docItemBadgeText, { color: config.text }]}>{config.label}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    color: '#86868B',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.5,
  },
  editButton: {
    backgroundColor: '#0071E3',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 980,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  section: {
    marginHorizontal: 20,
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 20,
  },
  profileTopRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
    color: '#6E6E73',
    marginBottom: 10,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 980,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#D2D2D7',
    marginBottom: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#1D1D1F',
    fontSize: 15,
    marginBottom: 8,
    fontWeight: '600',
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 980,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#0071E3',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0071E3',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#0071E3',
    fontSize: 17,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D2D2D7',
  },
  infoLabel: {
    color: '#6E6E73',
    fontSize: 15,
    fontWeight: '400',
  },
  infoValue: {
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '500',
  },
  // Documentation section
  docSection: {
    marginHorizontal: 20,
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  docWarningIcon: {
    fontSize: 20,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  docDescription: {
    fontSize: 14,
    color: '#6E6E73',
    lineHeight: 20,
    marginBottom: 16,
  },
  docList: {
    gap: 8,
  },
  docItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
  },
  docItemTitle: {
    flex: 1,
    fontSize: 14,
    color: '#1D1D1F',
    marginRight: 10,
  },
  docItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 980,
  },
  docItemIcon: {
    fontSize: 12,
  },
  docItemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  docNote: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
  },
  docNoteText: {
    fontSize: 13,
    color: '#86868B',
    lineHeight: 19,
  },
  signOutButton: {
    margin: 20,
    marginBottom: 40,
    alignItems: 'center',
    paddingVertical: 14,
  },
  signOutButtonText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '500',
  },
})
