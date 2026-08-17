import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
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
import PaymentResultPage from './pages/PaymentResultPage'
import PanelDashboardPage from './pages/panel/PanelDashboardPage'
import PanelProductsPage from './pages/panel/PanelProductsPage'
import PanelOrdersPage from './pages/panel/PanelOrdersPage'
import PanelInvoicesPage from './pages/panel/PanelInvoicesPage'
import PanelCatalogSyncPage from './pages/panel/PanelCatalogSyncPage'
import PanelApiKeysPage from './pages/panel/PanelApiKeysPage'
import ExhaustSchemasPage from './pages/ExhaustSchemasPage'
import BrandsPage from './pages/BrandsPage'
import BrandDetailPage from './pages/BrandDetailPage'
import GuidesPage from './pages/GuidesPage'
import GuideDetailPage from './pages/GuideDetailPage'
import AdminLayout from './components/AdminLayout'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminSchemasListPage from './pages/admin/AdminSchemasListPage'
import AdminSchemaEditorPage from './pages/admin/AdminSchemaEditorPage'
import AdminBrandsListPage from './pages/admin/AdminBrandsListPage'
import AdminBrandEditorPage from './pages/admin/AdminBrandEditorPage'
import AdminArticlesListPage from './pages/admin/AdminArticlesListPage'
import AdminArticleEditorPage from './pages/admin/AdminArticleEditorPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminSubscriptionsPage from './pages/admin/AdminSubscriptionsPage'
import AdminVehiclesListPage from './pages/admin/AdminVehiclesListPage'
import AdminVehicleEditorPage from './pages/admin/AdminVehicleEditorPage'
import AdminPartsListPage from './pages/admin/AdminPartsListPage'
import AdminPartEditorPage from './pages/admin/AdminPartEditorPage'
import AdminAftermarketProductsListPage from './pages/admin/AdminAftermarketProductsListPage'
import AdminAftermarketProductEditorPage from './pages/admin/AdminAftermarketProductEditorPage'
import AdminQAPanelPage from './pages/admin/AdminQAPanelPage'
import AdminKycReviewPage from './pages/admin/AdminKycReviewPage'
import CompatibilidadPage from './pages/CompatibilidadPage'
import MarketplaceBrowsePage from './pages/MarketplaceBrowsePage'
import MarketplaceProductPage from './pages/MarketplaceProductPage'
import MarketplaceCartPage from './pages/MarketplaceCartPage'
import MarketplaceOrdersPage from './pages/MarketplaceOrdersPage'
import PanelKycPage from './pages/panel/PanelKycPage'
import PanelMessagesPage from './pages/panel/PanelMessagesPage'
import PanelWalletPage from './pages/panel/PanelWalletPage'
import ToastHost from './components/ToastHost'

function App() {
  // El bootstrap de auth lo maneja <AuthBridge /> en main.tsx desde los hooks
  // de Clerk. Aqui ya no llamamos a supabase.auth.getSession() para evitar la
  // race-condition que causaba el loop login<->dashboard.
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login/*" element={<LoginPage />} />
          <Route path="register/*" element={<RegisterPage />} />
          <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="marketplace" element={<MarketplaceBrowsePage />} />
          <Route path="marketplace/:kind/:id" element={<MarketplaceProductPage />} />
          <Route path="marketplace/carrito" element={<MarketplaceCartPage />} />
          <Route path="marketplace/pedidos" element={<ProtectedRoute><MarketplaceOrdersPage /></ProtectedRoute>} />
          <Route path="marketplace-legacy" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="subscriptions" element={<ProtectedRoute><SubscriptionsPage /></ProtectedRoute>} />
          <Route path="quotes" element={<ProtectedRoute><QuotesPage /></ProtectedRoute>} />
          <Route path="designs" element={<ProtectedRoute><Design3DPage /></ProtectedRoute>} />
          <Route path="manuals" element={<ProtectedRoute><ManualsPage /></ProtectedRoute>} />
          <Route path="esquemas" element={<ProtectedRoute><ExhaustSchemasPage /></ProtectedRoute>} />
          <Route path="marcas" element={<BrandsPage />} />
          <Route path="marcas/:slug" element={<BrandDetailPage />} />
          <Route path="guias" element={<GuidesPage />} />
          <Route path="guias/:slug" element={<GuideDetailPage />} />
          <Route path="payment-result" element={<PaymentResultPage />} />
          <Route path="compatibilidad" element={<CompatibilidadPage />} />
        </Route>
        <Route path="panel" element={<PanelGuard><PanelLayout /></PanelGuard>}>
          <Route index element={<PanelDashboardPage />} />
          <Route path="products" element={<PanelProductsPage />} />
          <Route path="orders" element={<PanelOrdersPage />} />
          <Route path="invoices" element={<PanelInvoicesPage />} />
          <Route path="catalog-sync" element={<PanelCatalogSyncPage />} />
          <Route path="api-keys" element={<PanelApiKeysPage />} />
          <Route path="kyc" element={<PanelKycPage />} />
          <Route path="mensajes" element={<PanelMessagesPage />} />
          <Route path="monedero" element={<PanelWalletPage />} />
        </Route>
        <Route path="admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="esquemas" element={<AdminSchemasListPage />} />
          <Route path="esquemas/nuevo" element={<AdminSchemaEditorPage />} />
          <Route path="esquemas/:id" element={<AdminSchemaEditorPage />} />
          <Route path="marcas" element={<AdminBrandsListPage />} />
          <Route path="marcas/nuevo" element={<AdminBrandEditorPage />} />
          <Route path="marcas/:id" element={<AdminBrandEditorPage />} />
          <Route path="articulos" element={<AdminArticlesListPage />} />
          <Route path="articulos/nuevo" element={<AdminArticleEditorPage />} />
          <Route path="articulos/:id" element={<AdminArticleEditorPage />} />
          <Route path="usuarios" element={<AdminUsersPage />} />
          <Route path="suscripciones" element={<AdminSubscriptionsPage />} />

          {/* === Catálogo relacional v2 (formularios A/B/C/D) === */}
          <Route path="data/vehiculos" element={<AdminVehiclesListPage />} />
          <Route path="data/vehiculos/nuevo" element={<AdminVehicleEditorPage />} />
          <Route path="data/vehiculos/:id" element={<AdminVehicleEditorPage />} />
          <Route path="data/piezas" element={<AdminPartsListPage />} />
          <Route path="data/piezas/nuevo" element={<AdminPartEditorPage />} />
          <Route path="data/piezas/:id" element={<AdminPartEditorPage />} />
          <Route path="data/productos" element={<AdminAftermarketProductsListPage />} />
          <Route path="data/productos/nuevo" element={<AdminAftermarketProductEditorPage />} />
          <Route path="data/productos/:id" element={<AdminAftermarketProductEditorPage />} />
          <Route path="qa" element={<AdminQAPanelPage />} />
          <Route path="kyc" element={<AdminKycReviewPage />} />
        </Route>
      </Routes>
      <ToastHost />
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

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuthStore()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#1D1D1F', color: 'white' }}>
        Cargando...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile?.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default App
