import { View, Text, StyleSheet } from 'react-native'

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>✅ Conexión Exitosa</Text>
      <Text style={styles.subtitle}>La app móvil está funcionando</Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Si ves este mensaje, significa que:
        </Text>
        <Text style={styles.listItem}>• Expo está corriendo correctamente</Text>
        <Text style={styles.listItem}>• La conexión de red funciona</Text>
        <Text style={styles.listItem}>• El bundle se compiló sin errores</Text>
      </View>
      <Text style={styles.footer}>
        Ahora puedes restaurar la app completa
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  title: {
    color: '#10b981',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 18,
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 12,
    marginBottom: 32,
    width: '100%',
    maxWidth: 400,
  },
  infoText: {
    color: '#e2e8f0',
    fontSize: 16,
    marginBottom: 16,
  },
  listItem: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 8,
  },
  footer: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
  },
})
