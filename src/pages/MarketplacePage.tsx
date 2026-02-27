import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Star,
  Wrench,
  Check,
  Tag,
  Package,
  Truck,
  Shield,
  ArrowLeft,
  X,
} from 'lucide-react';
import { useMarketplaceStore } from '../stores/marketplaceStore';

export default function MarketplacePage() {
  const [step, setStep] = useState<'selector' | 'products' | 'detail'>('selector');
  const [selectedVehicle, setSelectedVehicle] = useState({
    brand: 'Honda',
    model: 'Civic',
    engine: '2.0 VTEC',
  });
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  if (step === 'selector') {
    return (
      <VehicleSelector
        onNext={() => setStep('products')}
        vehicle={selectedVehicle}
        setVehicle={setSelectedVehicle}
      />
    );
  }

  if (step === 'detail') {
    return (
      <ProductDetail
        onBack={() => setStep('products')}
        vehicle={selectedVehicle}
        listingId={selectedListingId}
      />
    );
  }

  return (
    <ProductsList
      onSelectProduct={(id: string) => {
        setSelectedListingId(id);
        setStep('detail');
      }}
      vehicle={selectedVehicle}
      onChangeVehicle={() => setStep('selector')}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   VEHICLE SELECTOR
   ───────────────────────────────────────────────────────────── */

function VehicleSelector({
  onNext,
  vehicle,
  setVehicle,
}: {
  onNext: () => void;
  vehicle: any;
  setVehicle: any;
}) {
  return (
    <div style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', paddingTop: 60, paddingBottom: 40 }}>
        <div className="content-width-wide" style={{ textAlign: 'center' }}>
          <h1 className="text-headline" style={{ color: '#1D1D1F' }}>
            Marketplace
          </h1>
          <p
            className="text-body-large"
            style={{ color: '#6E6E73', marginTop: 12 }}
          >
            Encuentra los mejores repuestos para tu vehiculo
          </p>
        </div>
      </div>

      {/* Vehicle Selectors */}
      <div className="content-width" style={{ paddingBottom: 48 }}>
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 240 }}>
            <select
              value={vehicle.brand}
              onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })}
              className="input-apple"
              style={{ appearance: 'none', paddingRight: 40, cursor: 'pointer' }}
            >
              <option>Honda</option>
              <option>BMW</option>
              <option>Audi</option>
              <option>Mercedes</option>
            </select>
            <ChevronDown
              size={16}
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6E6E73',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 240 }}>
            <select
              value={vehicle.model}
              onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
              className="input-apple"
              style={{ appearance: 'none', paddingRight: 40, cursor: 'pointer' }}
            >
              <option>Civic</option>
              <option>Accord</option>
              <option>CR-V</option>
            </select>
            <ChevronDown
              size={16}
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6E6E73',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 240 }}>
            <select
              value={vehicle.engine}
              onChange={(e) => setVehicle({ ...vehicle, engine: e.target.value })}
              className="input-apple"
              style={{ appearance: 'none', paddingRight: 40, cursor: 'pointer' }}
            >
              <option>2.0 VTEC</option>
              <option>1.5 Turbo</option>
              <option>2.4 i-VTEC</option>
            </select>
            <ChevronDown
              size={16}
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6E6E73',
                pointerEvents: 'none',
              }}
            />
          </div>

          <button
            onClick={onNext}
            className="btn-pill btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            Buscar
            <ChevronRight size={18} style={{ marginLeft: 4 }} />
          </button>
        </div>
      </div>

      {/* Exhaust Diagram */}
      <div style={{ background: '#F5F5F7', padding: '60px 0' }}>
        <div className="content-width">
          <div className="card-flat" style={{ padding: 40 }}>
            <h3
              className="text-subheadline"
              style={{ color: '#1D1D1F', textAlign: 'center', marginBottom: 32 }}
            >
              Diagrama de Escape OEM
            </h3>

            <div style={{ position: 'relative' }}>
              <svg viewBox="0 0 800 300" style={{ width: '100%', height: 'auto' }}>
                <defs>
                  <filter id="shadow">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
                  </filter>
                  <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#C7C7CC" />
                    <stop offset="50%" stopColor="#AEAEB2" />
                    <stop offset="100%" stopColor="#C7C7CC" />
                  </linearGradient>
                  <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0071E3" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#0071E3" stopOpacity="0.2" />
                  </linearGradient>
                </defs>

                <ellipse cx="150" cy="180" rx="50" ry="40" fill="#0071E3" opacity="0.25" filter="url(#shadow)" />
                <path d="M 200 180 L 280 150" stroke="#0071E3" strokeWidth="8" fill="none" opacity="0.35" />
                <ellipse cx="320" cy="140" rx="60" ry="30" fill="url(#metalGrad)" filter="url(#shadow)" />
                <path d="M 380 140 L 460 140" stroke="#0071E3" strokeWidth="8" fill="none" opacity="0.35" />
                <ellipse cx="510" cy="140" rx="70" ry="32" fill="url(#metalGrad)" filter="url(#shadow)" />
                <rect x="470" y="120" width="20" height="40" fill="#AEAEB2" opacity="0.6" />
                <path d="M 580 140 L 640 155" stroke="#0071E3" strokeWidth="8" fill="none" opacity="0.35" />
                <ellipse cx="680" cy="165" rx="55" ry="28" fill="url(#metalGrad)" filter="url(#shadow)" />
                <ellipse cx="680" cy="165" rx="40" ry="20" fill="#0071E3" opacity="0.1" />
                <path d="M 640 200 L 680 220" stroke="#0071E3" strokeWidth="8" fill="none" opacity="0.35" />
                <ellipse cx="710" cy="235" rx="50" ry="25" fill="url(#metalGrad)" filter="url(#shadow)" />
                <ellipse cx="710" cy="235" rx="35" ry="18" fill="#0071E3" opacity="0.1" />
                <circle cx="588" cy="212" r="4" fill="#0071E3" />
                <line x1="588" y1="212" x2="640" y2="198" stroke="#0071E3" strokeWidth="2" />
                <circle cx="400" cy="212" r="4" fill="#0071E3" />
                <line x1="400" y1="212" x2="460" y2="140" stroke="#0071E3" strokeWidth="2" />
                <circle cx="260" cy="212" r="4" fill="#0071E3" />
                <line x1="260" y1="212" x2="280" y2="150" stroke="#0071E3" strokeWidth="2" />
              </svg>

              <div
                className="badge badge-blue"
                style={{ position: 'absolute', top: 8, left: '10%' }}
              >
                MANIFOLD
              </div>
              <div
                className="badge badge-blue"
                style={{ position: 'absolute', top: '35%', left: '35%' }}
              >
                CATALYTIC CONVERTER
              </div>
              <div
                className="badge badge-blue"
                style={{ position: 'absolute', top: '10%', right: '20%' }}
              >
                RESONATOR
              </div>
              <div
                className="badge badge-blue"
                style={{ position: 'absolute', bottom: '25%', right: '18%' }}
              >
                PIPE
              </div>
              <div
                className="badge badge-blue"
                style={{ position: 'absolute', bottom: '5%', right: '8%' }}
              >
                MUFFLER
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="content-width" style={{ padding: '48px 22px', maxWidth: 600 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={onNext}
            className="btn-pill btn-primary btn-lg"
            style={{ width: '100%', gap: 10, fontSize: 17 }}
          >
            <Search size={20} />
            Buscar Repuestos
            <ChevronRight size={20} />
          </button>

          <button
            className="btn-pill btn-secondary btn-lg"
            style={{ width: '100%', gap: 10, fontSize: 17 }}
          >
            <Tag size={20} />
            Solicitar Presupuesto
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PRODUCTS LIST
   ───────────────────────────────────────────────────────────── */

function ProductsList({
  onSelectProduct,
  vehicle: _vehicle,
  onChangeVehicle,
}: {
  onSelectProduct: (id: string) => void;
  vehicle: any;
  onChangeVehicle: () => void;
}) {
  const { listings, loading, error, fetchAllListings, filters, setFilters } =
    useMarketplaceStore();

  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [categoryFilter, setCategoryFilter] = useState(filters.category || '');
  const [brandFilter, setBrandFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    fetchAllListings();
  }, [fetchAllListings]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ ...filters, search: searchInput || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Re-fetch when filters change
  useEffect(() => {
    fetchAllListings();
  }, [filters, fetchAllListings]);

  // Derived categories and brands
  const categories = useMemo(() => {
    const cats = new Set(listings.map((l) => l.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [listings]);

  const brands = useMemo(() => {
    const bs = new Set(
      listings.map((l) => l.seller_company || l.seller_name).filter(Boolean)
    );
    return Array.from(bs).sort();
  }, [listings]);

  // Apply local category/brand/sort filters
  const filteredListings = useMemo(() => {
    let result = [...listings];
    if (categoryFilter) {
      result = result.filter((l) => l.category === categoryFilter);
    }
    if (brandFilter) {
      result = result.filter(
        (l) => (l.seller_company || l.seller_name) === brandFilter
      );
    }
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return result;
  }, [listings, categoryFilter, brandFilter, sortBy]);

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', paddingTop: 60, paddingBottom: 32 }}>
        <div className="content-width-wide" style={{ textAlign: 'center' }}>
          <h1 className="text-headline" style={{ color: '#1D1D1F' }}>
            Marketplace
          </h1>
          <p
            className="text-body-large"
            style={{ color: '#6E6E73', marginTop: 12 }}
          >
            Encuentra los mejores repuestos
          </p>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: '1px solid #D2D2D7',
        }}
      >
        <div className="content-width-wide">
          {/* Desktop filter row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              flexWrap: 'wrap',
            }}
          >
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 360 }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#86868B',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Buscar repuestos..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input-apple"
                style={{ paddingLeft: 42, fontSize: 15 }}
              />
            </div>

            {/* Category dropdown */}
            <div style={{ position: 'relative', flex: '0 1 180px' }}>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-apple"
                style={{
                  appearance: 'none',
                  paddingRight: 36,
                  cursor: 'pointer',
                  fontSize: 15,
                  color: categoryFilter ? '#1D1D1F' : '#86868B',
                }}
              >
                <option value="">Categoria</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#86868B',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* Brand dropdown */}
            <div style={{ position: 'relative', flex: '0 1 180px' }}>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="input-apple"
                style={{
                  appearance: 'none',
                  paddingRight: 36,
                  cursor: 'pointer',
                  fontSize: 15,
                  color: brandFilter ? '#1D1D1F' : '#86868B',
                }}
              >
                <option value="">Marca</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#86868B',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* Sort dropdown - pushed right */}
            <div style={{ position: 'relative', flex: '0 1 180px', marginLeft: 'auto' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input-apple"
                style={{
                  appearance: 'none',
                  paddingRight: 36,
                  cursor: 'pointer',
                  fontSize: 15,
                }}
              >
                <option value="newest">Mas recientes</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#86868B',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* Mobile toggle (hidden on desktop via inline media approach) */}
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="btn-pill btn-sm btn-secondary"
              style={{
                display: 'none',
                gap: 6,
              }}
              id="mobile-filter-toggle"
            >
              Filtros
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Active filters strip */}
      {(categoryFilter || brandFilter || searchInput) && (
        <div className="content-width-wide" style={{ paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {searchInput && (
              <span
                className="badge badge-gray"
                style={{ cursor: 'pointer', gap: 4, display: 'inline-flex', alignItems: 'center' }}
                onClick={() => setSearchInput('')}
              >
                Busqueda: {searchInput}
                <X size={12} />
              </span>
            )}
            {categoryFilter && (
              <span
                className="badge badge-blue"
                style={{ cursor: 'pointer', gap: 4, display: 'inline-flex', alignItems: 'center' }}
                onClick={() => setCategoryFilter('')}
              >
                {categoryFilter}
                <X size={12} />
              </span>
            )}
            {brandFilter && (
              <span
                className="badge badge-blue"
                style={{ cursor: 'pointer', gap: 4, display: 'inline-flex', alignItems: 'center' }}
                onClick={() => setBrandFilter('')}
              >
                {brandFilter}
                <X size={12} />
              </span>
            )}
            <button
              onClick={() => {
                setSearchInput('');
                setCategoryFilter('');
                setBrandFilter('');
                setSortBy('newest');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0066CC',
                fontSize: 14,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Limpiar todo
            </button>
          </div>
        </div>
      )}

      {/* Results count + vehicle info */}
      <div className="content-width-wide" style={{ padding: '20px 22px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={16} style={{ color: '#6E6E73' }} />
            <span style={{ color: '#6E6E73', fontSize: 14 }}>
              {filteredListings.length} resultado{filteredListings.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onChangeVehicle}
            className="btn-pill btn-sm btn-secondary"
          >
            Cambiar vehiculo
          </button>
        </div>
      </div>

      {/* Product Grid */}
      <div className="content-width-wide" style={{ padding: '24px 22px 60px' }}>
        {error && (
          <div
            style={{
              background: 'rgba(255,59,48,0.06)',
              color: '#FF3B30',
              padding: '16px 20px',
              borderRadius: 12,
              textAlign: 'center',
              marginBottom: 24,
              fontSize: 15,
              border: '1px solid rgba(255,59,48,0.15)',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 0',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                border: '3px solid #D2D2D7',
                borderTopColor: '#0071E3',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: 16,
              }}
            />
            <p style={{ color: '#6E6E73', fontSize: 17, fontWeight: 500 }}>
              Cargando productos...
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredListings.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 0',
            }}
          >
            <Package size={48} style={{ color: '#D2D2D7', marginBottom: 16 }} />
            <p style={{ color: '#1D1D1F', fontSize: 21, fontWeight: 600 }}>
              No hay productos disponibles
            </p>
            <p style={{ color: '#6E6E73', fontSize: 15, marginTop: 8 }}>
              Vuelve a intentarlo mas tarde
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }}
            className="marketplace-grid"
          >
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="card-apple"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectProduct(listing.id)}
              >
                {/* Image area */}
                <div
                  style={{
                    background: '#F5F5F7',
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {listing.images && listing.images.length > 0 ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <svg viewBox="0 0 200 100" style={{ width: '60%', opacity: 0.35 }}>
                      <ellipse cx="50" cy="50" rx="35" ry="20" fill="#8E8E93" />
                      <ellipse cx="150" cy="50" rx="40" ry="22" fill="#8E8E93" />
                      <rect x="85" y="38" width="65" height="24" fill="#8E8E93" />
                      <ellipse cx="150" cy="50" rx="30" ry="16" fill="#C7C7CC" />
                    </svg>
                  )}
                </div>

                {/* Card content */}
                <div style={{ padding: '16px 20px 20px' }}>
                  {/* Type badge */}
                  <span className={`badge ${listing.type === 'product' ? 'badge-blue' : 'badge-green'}`}>
                    {listing.type === 'product' ? 'Producto' : 'Servicio'}
                  </span>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      color: '#1D1D1F',
                      marginTop: 10,
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {listing.name}
                  </h3>

                  {/* Brand / Category */}
                  <p
                    style={{
                      fontSize: 14,
                      color: '#6E6E73',
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {listing.seller_company || listing.seller_name}
                    {listing.category ? ` · ${listing.category}` : ''}
                  </p>

                  {/* Price */}
                  <p
                    style={{
                      fontSize: 21,
                      fontWeight: 600,
                      color: '#1D1D1F',
                      marginTop: 12,
                    }}
                  >
                    {'\u20AC'}{listing.price.toFixed(2)}
                  </p>

                  {/* Stock info */}
                  {listing.type === 'product' && listing.stock !== undefined && (
                    <span
                      className="badge badge-green"
                      style={{ marginTop: 8, display: 'inline-flex' }}
                    >
                      <Check size={10} style={{ marginRight: 4 }} />
                      Stock: {listing.stock}
                    </span>
                  )}

                  {/* Link */}
                  <p
                    style={{
                      fontSize: 15,
                      color: '#0066CC',
                      marginTop: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Ver detalles ›
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom Quote CTA */}
        <div
          style={{
            background: '#F5F5F7',
            borderRadius: 18,
            padding: '48px 32px',
            textAlign: 'center',
            marginTop: 48,
          }}
        >
          <h3 style={{ fontSize: 28, fontWeight: 600, color: '#1D1D1F', marginBottom: 8 }}>
            No encuentras lo que buscas?
          </h3>
          <p style={{ fontSize: 17, color: '#6E6E73', marginBottom: 24 }}>
            Solicita una cotizacion personalizada y lo encontramos por ti
          </p>
          <button className="btn-pill btn-primary" style={{ gap: 8 }}>
            <Tag size={18} />
            Solicitar Cotizacion
          </button>
        </div>
      </div>

      {/* Responsive grid styles */}
      <style>{`
        .marketplace-grid {
          grid-template-columns: repeat(4, 1fr) !important;
        }
        @media (max-width: 1068px) {
          .marketplace-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 735px) {
          .marketplace-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PRODUCT DETAIL
   ───────────────────────────────────────────────────────────── */

function ProductDetail({
  onBack,
  vehicle: _vehicle,
  listingId,
}: {
  onBack: () => void;
  vehicle: any;
  listingId: string | null;
}) {
  const { listings } = useMarketplaceStore();
  const listing = listings.find((l) => l.id === listingId);

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      {/* Back link */}
      <div className="content-width-wide" style={{ paddingTop: 24, paddingBottom: 8 }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: '#0066CC',
            fontSize: 15,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          Volver a resultados
        </button>
      </div>

      {/* Main content */}
      <div className="content-width-wide" style={{ padding: '24px 22px 80px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 48,
            alignItems: 'start',
          }}
          className="detail-layout"
        >
          {/* Image column */}
          <div>
            <div
              style={{
                background: '#F5F5F7',
                borderRadius: 18,
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {listing?.images && listing.images.length > 0 ? (
                <img
                  src={listing.images[0]}
                  alt={listing.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <svg viewBox="0 0 300 200" style={{ width: '70%', opacity: 0.3 }}>
                  <ellipse cx="80" cy="100" rx="60" ry="35" fill="#8E8E93" />
                  <ellipse cx="220" cy="100" rx="65" ry="38" fill="#8E8E93" />
                  <rect x="140" y="75" width="80" height="50" fill="#8E8E93" />
                  <ellipse cx="220" cy="100" rx="50" ry="28" fill="#C7C7CC" />
                  <ellipse cx="220" cy="100" rx="35" ry="20" fill="#E5E5EA" />
                </svg>
              )}
            </div>

            {/* Thumbnail row */}
            {listing?.images && listing.images.length > 1 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
                {listing.images.slice(0, 4).map((img, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#F5F5F7',
                      borderRadius: 10,
                      aspectRatio: '1',
                      overflow: 'hidden',
                      border: i === 0 ? '2px solid #0071E3' : '1px solid #D2D2D7',
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={img}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      background: '#F5F5F7',
                      borderRadius: 10,
                      aspectRatio: '1',
                      border: '1px solid #D2D2D7',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info column */}
          <div>
            {/* Type badge */}
            <span className={`badge ${listing?.type === 'product' ? 'badge-blue' : 'badge-green'}`}>
              {listing?.type === 'product' ? 'Producto' : 'Servicio'}
            </span>

            <h1
              style={{
                fontSize: 32,
                fontWeight: 600,
                color: '#1D1D1F',
                lineHeight: 1.12,
                marginTop: 12,
                letterSpacing: '-0.003em',
              }}
            >
              {listing?.name || 'RS3 Performance Exhaust — Akrapovic'}
            </h1>

            <p style={{ fontSize: 17, color: '#0066CC', marginTop: 8, fontWeight: 500 }}>
              {listing?.seller_company || listing?.seller_name || 'Akrapovic'}
            </p>

            {/* Rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 16 }}>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill="#FF9500"
                  color="#FF9500"
                />
              ))}
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', marginLeft: 4 }}>
                5.0
              </span>
              <span style={{ fontSize: 14, color: '#6E6E73' }}>(622 reviews)</span>
            </div>

            {/* Price */}
            <p
              style={{
                fontSize: 36,
                fontWeight: 600,
                color: '#1D1D1F',
                marginTop: 24,
                letterSpacing: '-0.005em',
              }}
            >
              {'\u20AC'}{listing?.price?.toFixed(2) || '1,150.00'}
            </p>
            <p style={{ fontSize: 14, color: '#6E6E73', marginTop: 2 }}>
              IVA incluido · desde {'\u20AC'}58/mes
            </p>

            {/* Availability */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20 }}>
              <span className="badge badge-green" style={{ gap: 4 }}>
                <Check size={12} />
                En stock
              </span>
              <span style={{ fontSize: 14, color: '#6E6E73', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Truck size={14} />
                Entrega: 5-9 dias
              </span>
            </div>

            {/* Description */}
            {listing?.description && (
              <p style={{ fontSize: 15, color: '#6E6E73', marginTop: 20, lineHeight: 1.55 }}>
                {listing.description}
              </p>
            )}

            {/* Action buttons */}
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn-pill btn-primary btn-lg"
                style={{ width: '100%', fontSize: 17, gap: 8 }}
              >
                Solicitar Cotizacion
                <ChevronRight size={18} />
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-pill btn-secondary"
                  style={{ flex: 1, fontSize: 15 }}
                >
                  Comprar y Enviar
                </button>
                <button
                  className="btn-pill btn-secondary"
                  style={{ flex: 1, fontSize: 15, gap: 6 }}
                >
                  <Wrench size={16} />
                  Comprar + Instalacion
                </button>
              </div>
            </div>

            {/* Specs */}
            <div
              style={{
                borderTop: '1px solid #D2D2D7',
                marginTop: 32,
                paddingTop: 24,
              }}
            >
              <h3
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  color: '#1D1D1F',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Shield size={18} style={{ color: '#0071E3' }} />
                Especificaciones
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px 24px',
                  fontSize: 15,
                }}
              >
                {[
                  ['Material', 'Stainless Steel'],
                  ['Diametro tubo', '90 mm'],
                  ['Peso', '8.2 kg'],
                  ['Homologacion', 'Street Legal'],
                  ['Nivel sonido', 'Sport'],
                  ['Ganancia potencia', '+8 HP'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#6E6E73' }}>{label}:</span>
                    <span style={{ color: '#1D1D1F', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compatibility */}
            <div
              style={{
                borderTop: '1px solid #D2D2D7',
                marginTop: 24,
                paddingTop: 24,
              }}
            >
              <h3
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  color: '#1D1D1F',
                  marginBottom: 16,
                }}
              >
                Compatibilidad
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Audi RS3 (2020-2023) - 2.5 TFSI',
                  'Audi TT RS (2020-2023) - 2.5 TFSI',
                ].map((compat) => (
                  <div
                    key={compat}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 15,
                      color: '#34C759',
                    }}
                  >
                    <Check size={16} />
                    <span>{compat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive detail layout */}
      <style>{`
        .detail-layout {
          grid-template-columns: 1fr 1fr !important;
        }
        @media (max-width: 735px) {
          .detail-layout {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
