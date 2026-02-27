import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text, ActivityIndicator } from 'react-native'
import { useAuthStore } from './src/stores/authStore'
import { supabase } from './src/lib/supabase'

import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import HomeScreen from './src/screens/HomeScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import MarketplaceScreen from './src/screens/MarketplaceScreen'
import QuotesScreen from './src/screens/QuotesScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import SubscriptionsScreen from './src/screens/SubscriptionsScreen'
import Design3DScreen from './src/screens/Design3DScreen'
import ManualsScreen from './src/screens/ManualsScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'AutoMarket' }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar Sesión' }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Registrarse' }} />
    </Stack.Navigator>
  )
}

function MainTabs() {
  const { profile } = useAuthStore()
  const showDesigns = profile?.user_type === 'professional' || profile?.user_type === 'premium'

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: 'Marketplace' }} />
      <Tab.Screen name="Quotes" component={QuotesScreen} options={{ title: 'Presupuestos' }} />
      <Tab.Screen name="Manuals" component={ManualsScreen} options={{ title: 'Manuales' }} />
      {showDesigns && (
        <Tab.Screen name="Designs" component={Design3DScreen} options={{ title: 'Diseños 3D' }} />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  )
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Subscriptions"
        component={SubscriptionsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#fff',
          title: 'Suscripciones',
        }}
      />
    </Stack.Navigator>
  )
}

export default function App() {
  const { user, setUser, setLoading, fetchProfile, loading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile().catch(console.error)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile().catch(console.error)
        }
      })()
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ color: '#fff', marginTop: 16 }}>Cargando...</Text>
      </View>
    )
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  )
}
