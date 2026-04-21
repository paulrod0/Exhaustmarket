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
import PanelDashboardScreen from './src/screens/panel/PanelDashboardScreen'
import PanelProductsScreen from './src/screens/panel/PanelProductsScreen'
import PanelOrdersScreen from './src/screens/panel/PanelOrdersScreen'
import PanelInvoicesScreen from './src/screens/panel/PanelInvoicesScreen'
import PanelCatalogSyncScreen from './src/screens/panel/PanelCatalogSyncScreen'
import SchemasScreen from './src/screens/SchemasScreen'
import SchemaDetailScreen from './src/screens/SchemaDetailScreen'
import BrandsScreen from './src/screens/BrandsScreen'
import BrandDetailScreen from './src/screens/BrandDetailScreen'
import GuidesScreen from './src/screens/GuidesScreen'
import GuideDetailScreen from './src/screens/GuideDetailScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()
const PanelStackNav = createNativeStackNavigator()
const SchemasStackNav = createNativeStackNavigator()
const BrandsStackNav = createNativeStackNavigator()
const GuidesStackNav = createNativeStackNavigator()

const contentHeaderStyle = {
  headerStyle: { backgroundColor: '#FFFFFF' },
  headerTintColor: '#1D1D1F',
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
  headerShadowVisible: false,
}

function SchemasStack() {
  return (
    <SchemasStackNav.Navigator screenOptions={contentHeaderStyle}>
      <SchemasStackNav.Screen name="SchemasList" component={SchemasScreen} options={{ title: 'Esquemas' }} />
      <SchemasStackNav.Screen name="SchemaDetail" component={SchemaDetailScreen} options={{ title: 'Esquema' }} />
      <SchemasStackNav.Screen name="BrandDetail" component={BrandDetailScreen} options={{ title: 'Marca' }} />
      <SchemasStackNav.Screen name="GuideDetail" component={GuideDetailScreen} options={{ title: 'Guía' }} />
    </SchemasStackNav.Navigator>
  )
}

function BrandsStack() {
  return (
    <BrandsStackNav.Navigator screenOptions={contentHeaderStyle}>
      <BrandsStackNav.Screen name="BrandsList" component={BrandsScreen} options={{ title: 'Marcas' }} />
      <BrandsStackNav.Screen name="BrandDetail" component={BrandDetailScreen} options={{ title: 'Marca' }} />
      <BrandsStackNav.Screen name="SchemaDetail" component={SchemaDetailScreen} options={{ title: 'Esquema' }} />
    </BrandsStackNav.Navigator>
  )
}

function GuidesStack() {
  return (
    <GuidesStackNav.Navigator screenOptions={contentHeaderStyle}>
      <GuidesStackNav.Screen name="GuidesList" component={GuidesScreen} options={{ title: 'Guías' }} />
      <GuidesStackNav.Screen name="GuideDetail" component={GuideDetailScreen} options={{ title: 'Guía' }} />
      <GuidesStackNav.Screen name="SchemaDetail" component={SchemaDetailScreen} options={{ title: 'Esquema' }} />
    </GuidesStackNav.Navigator>
  )
}

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#1D1D1F',
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'ExhaustMarket', headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar Sesion' }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Registrarse' }} />
    </Stack.Navigator>
  )
}

function PanelStack() {
  return (
    <PanelStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#1D1D1F',
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <PanelStackNav.Screen name="PanelDashboard" component={PanelDashboardScreen} options={{ title: 'Mi Panel' }} />
      <PanelStackNav.Screen name="PanelProducts" component={PanelProductsScreen} options={{ title: 'Mis Productos' }} />
      <PanelStackNav.Screen name="PanelOrders" component={PanelOrdersScreen} options={{ title: 'Pedidos' }} />
      <PanelStackNav.Screen name="PanelInvoices" component={PanelInvoicesScreen} options={{ title: 'Facturas' }} />
      <PanelStackNav.Screen name="PanelCatalogSync" component={PanelCatalogSyncScreen} options={{ title: 'Sincronizar Catalogo' }} />
    </PanelStackNav.Navigator>
  )
}

function MainTabs() {
  const { profile } = useAuthStore()
  const showDesigns = profile?.user_type === 'professional' || profile?.user_type === 'premium'
  const showPanel = profile?.user_type === 'workshop' || profile?.user_type === 'professional'

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#1D1D1F',
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#D2D2D7',
          borderTopWidth: 0.5,
          height: 50,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#0071E3',
        tabBarInactiveTintColor: '#86868B',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Schemas" component={SchemasStack} options={{ title: 'Esquemas', headerShown: false }} />
      <Tab.Screen name="Brands" component={BrandsStack} options={{ title: 'Marcas', headerShown: false }} />
      <Tab.Screen name="Guides" component={GuidesStack} options={{ title: 'Guías', headerShown: false }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: 'Marketplace' }} />
      {showDesigns && (
        <Tab.Screen name="Designs" component={Design3DScreen} options={{ title: 'Diseños 3D' }} />
      )}
      {showPanel && (
        <Tab.Screen name="Panel" component={PanelStack} options={{ title: 'Panel', headerShown: false }} />
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
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#1D1D1F',
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
          title: 'Suscripciones',
        }}
      />
      <Stack.Screen
        name="Quotes"
        component={QuotesScreen}
        options={{ ...contentHeaderStyle, headerShown: true, title: 'Presupuestos' }}
      />
      <Stack.Screen
        name="Manuals"
        component={ManualsScreen}
        options={{ ...contentHeaderStyle, headerShown: true, title: 'Manuales' }}
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#0071E3" />
        <Text style={{ color: '#86868B', marginTop: 16, fontSize: 15, fontWeight: '400' }}>Cargando...</Text>
      </View>
    )
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  )
}
