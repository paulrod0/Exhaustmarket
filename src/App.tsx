import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import PanelLayout from './components/PanelLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import MarketplacePage from './pages/MarketplacePage'
import ProfilePage from './pages/ProfilePage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import QuotesPage from './pages/QuotesPage'
import Design3DPage from './pages/Design3DPage'
import ManualsPage from './pages/ManualsPage'
import PanelDashboardPage from './pages/panel/PanelDashboardPage'
import PanelProductsPage from './pages/panel/PanelProductsPage'
import PanelOrdersPage from './pages/panel/PanelOrdersPage'
import PanelInvoicesPage from './pages/panel/PanelInvoicesPage'
import PanelCatalogSyncPage from './pages/panel/PanelCatalogSyncPage'

function App() {
  const { setUser, setLoading, fetchProfile } = useAuthStore()

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
  }, [setUser, setLoading, fetchProfile])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="subscriptions" element={<ProtectedRoute><SubscriptionsPage /></ProtectedRoute>} />
          <Route path="quotes" element={<ProtectedRoute><QuotesPage /></ProtectedRoute>} />
          <Route path="designs" element={<ProtectedRoute><Design3DPage /></ProtectedRoute>} />
          <Route path="manuals" element={<ProtectedRoute><ManualsPage /></ProtectedRoute>} />
        </Route>
        <Route path="panel" element={<PanelGuard><PanelLayout /></PanelGuard>}>
          <Route index element={<PanelDashboardPage />} />
          <Route path="products" element={<PanelProductsPage />} />
          <Route path="orders" element={<PanelOrdersPage />} />
          <Route path="invoices" element={<PanelInvoicesPage />} />
          <Route path="catalog-sync" element={<PanelCatalogSyncPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Cargando...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PanelGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuthStore()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
        Cargando...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (profile?.user_type !== 'workshop' && profile?.user_type !== 'professional') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default App
