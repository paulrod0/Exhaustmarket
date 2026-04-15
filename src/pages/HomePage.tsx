import { Link } from 'react-router-dom'
import { Car, Wrench, Factory, ShoppingBag, FileText, Layers, BookOpen } from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      {/* ── HERO SECTION ─────────────────────────────────── */}
      <section
        className="section-dark"
        style={{ padding: '140px 0 120px' }}
      >
        <div className="content-width" style={{ textAlign: 'center' }}>
          <h1
            className="text-headline-xl animate-fade-in-up"
            style={{ color: '#F5F5F7', marginBottom: '12px' }}
          >
            ExhaustMarket
          </h1>
          <p
            className="text-body-large animate-fade-in-up"
            style={{ color: '#86868B', marginBottom: '28px', animationDelay: '0.1s' }}
          >
            Tu marketplace de repuestos de escape
          </p>
          <div
            className="animate-fade-in-up"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              animationDelay: '0.2s',
            }}
          >
            <Link to="/esquemas" className="btn-text" style={{ fontSize: '21px' }}>
              Ver esquemas
            </Link>
            <Link to="/marcas" className="btn-text" style={{ fontSize: '21px' }}>
              Marcas aftermarket
            </Link>
            <Link to="/guias" className="btn-text" style={{ fontSize: '21px' }}>
              Guías y reviews
            </Link>
          </div>
        </div>
      </section>

      {/* ── NUEVAS SECCIONES MVP ───────────────────────── */}
      <section style={{ padding: '40px 0 12px' }}>
        <div
          className="content-width"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          <MvpTile
            icon={<Layers size={24} />}
            title="Esquemas interactivos"
            body="200+ modelos de alta gama. Haz clic en cualquier componente para ver materiales, temperaturas y consejos de instalación."
            to="/esquemas"
            accent="#0071E3"
          />
          <MvpTile
            icon={<Factory size={24} />}
            title="Marcas aftermarket"
            body="Akrapovic, Capristo, Milltek, Remus, HKS... fabricantes de referencia con fichas y especialidades."
            to="/marcas"
            accent="#34C759"
          />
          <MvpTile
            icon={<BookOpen size={24} />}
            title="Guías técnicas"
            body="Materiales, downpipes, X-pipe vs H-pipe, homologación ITV... todo lo que necesitas antes de comprar."
            to="/guias"
            accent="#FF9500"
          />
        </div>
      </section>

      {/* ── FEATURE TILES (2-column) ─────────────────────── */}
      <section style={{ padding: '12px 0 0' }}>
        <div
          className="content-width-wide home-feature-grid"
        >
          {/* Marketplace Tile — Light */}
          <div
            className="animate-fade-in-up"
            style={{
              background: '#F5F5F7',
              borderRadius: '18px',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '60px 40px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(0, 113, 227, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <ShoppingBag size={28} style={{ color: '#0071E3' }} />
            </div>
            <h2
              className="text-headline"
              style={{ color: '#1D1D1F', marginBottom: '12px' }}
            >
              Marketplace
            </h2>
            <p
              className="text-body-large"
              style={{ color: '#6E6E73', maxWidth: '400px', marginBottom: '20px' }}
            >
              Encuentra tubos, catalizadores, silenciadores y todo lo que necesitas para tu sistema de escape.
            </p>
            <Link to="/marketplace" className="btn-text" style={{ fontSize: '21px' }}>
              Ver más
            </Link>
          </div>

          {/* Cotizaciones Tile — Dark */}
          <div
            className="animate-fade-in-up"
            style={{
              background: '#1D1D1F',
              borderRadius: '18px',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '60px 40px',
              animationDelay: '0.1s',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(0, 113, 227, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <FileText size={28} style={{ color: '#0071E3' }} />
            </div>
            <h2
              className="text-headline"
              style={{ color: '#F5F5F7', marginBottom: '12px' }}
            >
              Cotizaciones
            </h2>
            <p
              className="text-body-large"
              style={{ color: '#86868B', maxWidth: '400px', marginBottom: '20px' }}
            >
              Solicita presupuestos personalizados a talleres y fabricantes en minutos.
            </p>
            <Link to="/quotes" className="btn-text" style={{ fontSize: '21px' }}>
              Ver más
            </Link>
          </div>
        </div>
      </section>

      {/* ── ROLES SECTION ────────────────────────────────── */}
      <section className="section-gray">
        <div className="content-width" style={{ textAlign: 'center' }}>
          <h2
            className="text-headline"
            style={{ color: '#1D1D1F', marginBottom: '48px' }}
          >
            Diseñado para todos
          </h2>

          <div
            className="stagger-children home-roles-grid"
          >
            {/* Particulares */}
            <div className="card-apple" style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: '#F5F5F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <Car size={30} style={{ color: '#1D1D1F' }} />
              </div>
              <h3
                className="text-subheadline"
                style={{ color: '#1D1D1F', marginBottom: '12px' }}
              >
                Particulares
              </h3>
              <p className="text-body" style={{ color: '#6E6E73' }}>
                Compra repuestos de escape para tu vehículo y solicita servicios de instalación con facilidad.
              </p>
            </div>

            {/* Talleres */}
            <div className="card-apple" style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: '#F5F5F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <Wrench size={30} style={{ color: '#1D1D1F' }} />
              </div>
              <h3
                className="text-subheadline"
                style={{ color: '#1D1D1F', marginBottom: '12px' }}
              >
                Talleres
              </h3>
              <p className="text-body" style={{ color: '#6E6E73' }}>
                Recibe solicitudes de cotización, gestiona tus servicios y conecta con nuevos clientes.
              </p>
            </div>

            {/* Fabricantes */}
            <div className="card-apple" style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: '#F5F5F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <Factory size={30} style={{ color: '#1D1D1F' }} />
              </div>
              <h3
                className="text-subheadline"
                style={{ color: '#1D1D1F', marginBottom: '12px' }}
              >
                Fabricantes
              </h3>
              <p className="text-body" style={{ color: '#6E6E73' }}>
                Publica tus productos, vende materiales y amplía tu red de distribución a nivel nacional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────────── */}
      <section className="section-light">
        <div className="content-width" style={{ textAlign: 'center' }}>
          <h2
            className="text-headline animate-fade-in-up"
            style={{ color: '#1D1D1F', marginBottom: '12px' }}
          >
            Comienza ahora
          </h2>
          <p
            className="text-body-large animate-fade-in-up"
            style={{ color: '#6E6E73', marginBottom: '32px', animationDelay: '0.1s' }}
          >
            Únete a la comunidad de profesionales y entusiastas del escape.
          </p>
          <div
            className="animate-fade-in-up"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              animationDelay: '0.2s',
            }}
          >
            <Link to="/register" className="btn-pill btn-primary btn-lg">
              Registrarse
            </Link>
            <Link to="/login" className="btn-pill btn-secondary btn-lg">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function MvpTile({
  icon,
  title,
  body,
  to,
  accent,
}: {
  icon: React.ReactNode
  title: string
  body: string
  to: string
  accent: string
}) {
  return (
    <Link
      to={to}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #F2F2F7',
        borderRadius: 16,
        padding: 20,
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        const t = e.currentTarget
        t.style.transform = 'translateY(-2px)'
        t.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={(e) => {
        const t = e.currentTarget
        t.style.transform = 'translateY(0)'
        t.style.boxShadow = 'none'
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: `${accent}14`,
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1D1D1F', margin: 0 }}>{title}</h3>
      <p style={{ fontSize: 13, color: '#86868B', margin: 0, lineHeight: 1.5 }}>{body}</p>
      <span style={{ fontSize: 13, fontWeight: 500, color: accent, marginTop: 'auto' }}>
        Explorar →
      </span>
    </Link>
  )
}
