import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Picker } from '@react-navigation/native'
import { useAuthStore, UserType } from '../stores/authStore'

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [userType, setUserType] = useState<UserType>('standard')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuthStore()

  const handleSubmit = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Error', 'Por favor completa todos los campos')
      return
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contrasena debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, fullName, userType)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Unete a ExhaustMarket</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre Completo</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Juan Perez"
              placeholderTextColor="#86868B"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor="#86868B"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contrasena (minimo 6 caracteres)</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="********"
              placeholderTextColor="#86868B"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tipo de Usuario</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentOption, userType === 'standard' && styles.segmentOptionSelected]}
                onPress={() => setUserType('standard')}
              >
                <Text style={[styles.segmentOptionText, userType === 'standard' && styles.segmentOptionTextSelected]}>
                  Particular
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentOption, userType === 'professional' && styles.segmentOptionSelected]}
                onPress={() => setUserType('professional')}
              >
                <Text style={[styles.segmentOptionText, userType === 'professional' && styles.segmentOptionTextSelected]}>
                  Profesional
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentOption, userType === 'workshop' && styles.segmentOptionSelected]}
                onPress={() => setUserType('workshop')}
              >
                <Text style={[styles.segmentOptionText, userType === 'workshop' && styles.segmentOptionTextSelected]}>
                  Taller
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {(userType === 'professional' || userType === 'workshop') && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Como {userType === 'professional' ? 'Profesional' : 'Taller'}, necesitaras verificar tu cuenta subiendo documentacion legal despues del registro.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>
              Ya tienes cuenta? <Text style={styles.linkTextBold}>Inicia sesion aqui</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 24,
  },
  formContainer: {
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6E6E73',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '400',
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
  segmentedControl: {
    flexDirection: 'row',
    gap: 0,
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    padding: 3,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentOptionSelected: {
    backgroundColor: '#1D1D1F',
  },
  segmentOptionText: {
    color: '#6E6E73',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  infoText: {
    color: '#6E6E73',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  button: {
    backgroundColor: '#0071E3',
    borderRadius: 980,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#6E6E73',
    fontSize: 15,
    fontWeight: '400',
  },
  linkTextBold: {
    color: '#0071E3',
    fontWeight: '600',
  },
})
