import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  Factory,
  BookOpen,
  Users,
  CreditCard,
  ArrowRight,
  Plus,
  TrendingUp,
  Calendar,
  Loader2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Stats {
  schemas: number
  schemasActive: number
  schemasWithPhotos: number
  brands: number
  brandsActive: number
  articles: number
  articlesPublished: number
  users: number
  usersAdmin: number
  usersPremium: number
  subsActive: number
  mrr: number
  recentUsers: Array<{ id: string; full_name: string | null; email: string | null; created_at: string; user_type: string }>
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    ;(async () => {
      const [schemasRes, brandsRes, articlesRes, usersRes, subsRes, recentUsersRes] =
        await Promise.all([
          supabase.from('exhaust_schemas' as any).select('id, is_active, cover_url'),
          supabase.from('aftermarket_brands' as any).select('id, is_active'),
          supabase.from('articles' as any).select('id, is_published'),
          supabase.from('user_profiles' as any).select('id, user_type, is_admin'),
          supabase
            .from('user_subscriptions' as any)
            .select('status, billing_cycle, subscription_tiers(price_monthly, price_yearly)')
            .eq('status', 'active'),
          supabase
            .from('user_profiles' as any)
            .select('id, full_name, email, created_at, user_type')
            .order('created_at', { ascending: false })
            .limit(5),
        ])

      const schemas = (schemasRes.data ?? []) as Array<{ id: string; is_active: boolean; cover_url: string | null }>
      const brands = (brandsRes.data ?? []) as Array<{ id: string; is_active: boolean }>
      const articles = (articlesRes.data ?? []) as Array<{ id: string; is_published: boolean }>
      const users = (usersRes.data ?? []) as Array<{ id: string; user_type: string; is_admin: boolean }>
      const subs = (subsRes.data ?? []) as Array<any>
      const mrr = subs.reduce((sum, s) => {
        const t = s.subscription_tiers
        if (!t) return sum
        return sum + (s.billing_cycle === 'monthly' ? Number(t.price_monthly) : Number(t.price_yearly) / 12)
      }, 0)

      setStats({
        schemas: schemas.length,
        schemasActive: schemas.filter((s) => s.is_active).length,
        schemasWithPhotos: schemas.filter((s) => s.cover_url).length,
        brands: brands.length,
        brandsActive: brands.filter((b) => b.is_active).length,
        articles: articles.length,
        articlesPublished: articles.filter((a) => a.is_published).length,
        users: users.length,
        usersAdmin: users.filter((u) => u.is_admin).length,
        usersPremium: users.filter((u) => u.user_type === 'premium').length,
        subsActive: subs.length,
        mrr,
        recentUsers: (recentUsersRes.data ?? []) as any,
      })
    })()
  }, [])

  if (!stats) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#86868B' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#0071E3' }} />
        <style>{`@keyframes spin {from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1D1D1F', margin: 0, letterSpacing: '-0.02em' }}>
          Panel de administración
        </h1>
        <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0' }}>
          Vista general de todo el contenido y usuarios de ExhaustMarket.
        </p>
      </header>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard
          to="/admin/esquemas"
          label="Esquemas"
          value={stats.schemas}
          sub={`${stats.schemasActive} activos · ${stats.schemasWithPhotos} con fotos`}
          color="#0071E3"
          icon={<Layers size={18} />}
        />
        <StatCard
          to="/admin/marcas"
          label="Marcas aftermarket"
          value={stats.brands}
          sub={`${stats.brandsActive} visibles`}
          color="#34C759"
          icon={<Factory size={18} />}
        />
        <StatCard
          to="/admin/articulos"
          label="Artículos"
          value={stats.articles}
          sub={`${stats.articlesPublished} publicados`}
          color="#FF9500"
          icon={<BookOpen size={18} />}
        />
        <StatCard
          to="/admin/usuarios"
          label="Usuarios"
          value={stats.users}
          sub={`${stats.usersAdmin} admins · ${stats.usersPremium} premium`}
          color="#AF52DE"
          icon={<Users size={18} />}
        />
        <StatCard
          to="/admin/suscripciones"
          label="Suscripciones activas"
          value={stats.subsActive}
          sub={`${stats.mrr.toFixed(2)} € MRR estimado`}
          color="#FF2D55"
          icon={<CreditCard size={18} />}
        />
      </div>

      {/* Quick actions */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Acciones rápidas</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 10,
          }}
        >
          <QuickAction
            to="/admin/esquemas/nuevo"
            label="Añadir esquema"
            sub="Nuevo modelo de coche"
            icon={<Layers size={18} />}
            accent="#0071E3"
          />
          <QuickAction
            to="/admin/articulos/nuevo"
            label="Escribir artículo"
            sub="Guía, tutorial o review"
            icon={<BookOpen size={18} />}
            accent="#FF9500"
          />
          <QuickAction
            to="/admin/marcas/nuevo"
            label="Nueva marca"
            sub="Fabricante aftermarket"
            icon={<Factory size={18} />}
            accent="#34C759"
          />
        </div>
      </section>

      {/* Recent users */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={sectionTitleStyle}>Últimos usuarios registrados</h2>
          <Link to="/admin/usuarios" style={linkStyle}>
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>
        {stats.recentUsers.length === 0 ? (
          <p style={{ fontSize: 13, color: '#86868B' }}>Todavía no hay usuarios registrados.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.recentUsers.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: '#FAFAFA',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: '#E5E5EA',
                    color: '#86868B',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {(u.full_name ?? u.email ?? '?').slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>
                    {u.full_name || '(sin nombre)'}
                  </div>
                  <div style={{ fontSize: 11, color: '#86868B' }}>{u.email}</div>
                </div>
                <div style={{ fontSize: 10, color: '#86868B', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={10} />
                  {new Date(u.created_at).toLocaleDateString('es-ES')}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Hints */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          <TrendingUp size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: '#0071E3' }} />
          Siguientes pasos sugeridos
        </h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#1D1D1F', fontSize: 13, lineHeight: 1.7 }}>
          {stats.schemas > 0 && stats.schemasWithPhotos < stats.schemas && (
            <li>
              Te faltan fotos en <strong>{stats.schemas - stats.schemasWithPhotos} esquemas</strong>.
              Sube una imagen principal desde <Link to="/admin/esquemas" style={linkInlineStyle}>el listado</Link>.
            </li>
          )}
          {stats.articlesPublished < 6 && (
            <li>
              Publica más guías y tutoriales para atraer tráfico.{' '}
              <Link to="/admin/articulos/nuevo" style={linkInlineStyle}>Escribir nueva</Link>.
            </li>
          )}
          {stats.subsActive === 0 && (
            <li>
              Aún no hay suscripciones activas. Configura Stripe
              (ver <code style={{ fontFamily: 'monospace', fontSize: 12 }}>PAYMENTS.md</code>) y publica
              contenido premium para monetizar.
            </li>
          )}
          <li>
            Conecta esquemas con tutoriales: desde cualquier esquema, asocia la guía de instalación
            para que aparezca automáticamente en la ficha pública.
          </li>
        </ul>
      </section>
    </div>
  )
}

const sectionStyle: React.CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #E5E5EA',
  borderRadius: 14,
  padding: 18,
  marginBottom: 14,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#1D1D1F',
  margin: '0 0 12px',
}

const linkStyle: React.CSSProperties = {
  color: '#0071E3',
  textDecoration: 'none',
  fontSize: 12,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
}

const linkInlineStyle: React.CSSProperties = {
  color: '#0071E3',
  textDecoration: 'none',
}

function StatCard({
  to,
  label,
  value,
  sub,
  color,
  icon,
}: {
  to: string
  label: string
  value: string | number
  sub: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <Link
      to={to}
      style={{
        backgroundColor: 'white',
        border: '1px solid #E5E5EA',
        borderRadius: 14,
        padding: 16,
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        const t = e.currentTarget
        t.style.transform = 'translateY(-2px)'
        t.style.boxShadow = '0 4px 14px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={(e) => {
        const t = e.currentTarget
        t.style.transform = 'translateY(0)'
        t.style.boxShadow = 'none'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: '#86868B',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontWeight: 500,
        }}
      >
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#86868B' }}>{sub}</div>
    </Link>
  )
}

function QuickAction({
  to,
  label,
  sub,
  icon,
  accent,
}: {
  to: string
  label: string
  sub: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <Link
      to={to}
      style={{
        backgroundColor: 'white',
        border: `1.5px solid ${accent}30`,
        borderRadius: 12,
        padding: 14,
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accent + '08' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white' }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${accent}15`,
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#86868B' }}>{sub}</div>
      </div>
      <Plus size={14} style={{ color: accent, flexShrink: 0 }} />
    </Link>
  )
}
