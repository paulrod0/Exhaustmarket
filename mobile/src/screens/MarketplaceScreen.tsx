import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Svg, {
  Path,
  Rect,
  Ellipse,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { useMarketplaceStore, MarketplaceListing } from '../stores/marketplaceStore';

export default function MarketplaceScreen() {
  const [step, setStep] = useState<'selector' | 'products' | 'detail'>('selector');
  const [vehicle, setVehicle] = useState({
    brand: 'Honda',
    model: 'Civic',
    engine: '2.0 VTEC',
  });
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);

  if (step === 'selector') {
    return <VehicleSelector onNext={() => setStep('products')} vehicle={vehicle} setVehicle={setVehicle} />;
  }

  if (step === 'detail' && selectedListing) {
    return (
      <ProductDetail
        listing={selectedListing}
        vehicle={vehicle}
        onBack={() => setStep('products')}
      />
    );
  }

  return (
    <ProductsList
      vehicle={vehicle}
      onSelectProduct={(listing) => {
        setSelectedListing(listing);
        setStep('detail');
      }}
      onChangeVehicle={() => setStep('selector')}
    />
  );
}

/* ─── Vehicle Selector ─────────────────────────────────────────────────── */

function VehicleSelector({ onNext, vehicle, setVehicle }: any) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Svg width="28" height="28" viewBox="0 0 100 100">
              <Path
                d="M30,20 Q30,35 45,45 Q55,50 55,60 Q55,70 45,75 Q30,82 30,95 M30,45 L70,45 M45,30 L70,30 Q75,30 75,35 Q75,40 70,40 L55,40 M55,60 L70,60 Q80,60 80,70 Q80,80 70,80 L45,80"
                stroke="#0071E3"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text style={styles.headerTitle}>ExhaustMarket</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Selecciona tu vehiculo</Text>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={vehicle.brand}
            onValueChange={(value) => setVehicle({ ...vehicle, brand: value })}
            style={styles.picker}
            dropdownIconColor="#86868B"
          >
            <Picker.Item label="Honda" value="Honda" />
            <Picker.Item label="BMW" value="BMW" />
            <Picker.Item label="Audi" value="Audi" />
            <Picker.Item label="Mercedes" value="Mercedes" />
            <Picker.Item label="Toyota" value="Toyota" />
            <Picker.Item label="Ford" value="Ford" />
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={vehicle.model}
            onValueChange={(value) => setVehicle({ ...vehicle, model: value })}
            style={styles.picker}
            dropdownIconColor="#86868B"
          >
            <Picker.Item label="Civic" value="Civic" />
            <Picker.Item label="Accord" value="Accord" />
            <Picker.Item label="CR-V" value="CR-V" />
            <Picker.Item label="HR-V" value="HR-V" />
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={vehicle.engine}
            onValueChange={(value) => setVehicle({ ...vehicle, engine: value })}
            style={styles.picker}
            dropdownIconColor="#86868B"
          >
            <Picker.Item label="2.0 VTEC" value="2.0 VTEC" />
            <Picker.Item label="1.5 Turbo" value="1.5 Turbo" />
            <Picker.Item label="2.4 i-VTEC" value="2.4 i-VTEC" />
          </Picker>
        </View>

        <TouchableOpacity onPress={onNext} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Buscar</Text>
        </TouchableOpacity>

        {/* Exhaust Diagram */}
        <View style={styles.diagramCard}>
          <Text style={styles.diagramTitle}>Diagrama OEM de Escape</Text>
          <Svg width="100%" height="200" viewBox="0 0 800 300">
            <Defs>
              <SvgLinearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#D2D2D7" />
                <Stop offset="50%" stopColor="#86868B" />
                <Stop offset="100%" stopColor="#D2D2D7" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse cx="150" cy="180" rx="50" ry="40" fill="#0071E3" opacity={0.3} />
            <Path d="M 200 180 L 280 150" stroke="#0071E3" strokeWidth="8" fill="none" opacity={0.4} />
            <Ellipse cx="320" cy="140" rx="60" ry="30" fill="url(#metalGrad)" />
            <Path d="M 380 140 L 460 140" stroke="#0071E3" strokeWidth="8" fill="none" opacity={0.4} />
            <Ellipse cx="510" cy="140" rx="70" ry="32" fill="url(#metalGrad)" />
            <Rect x="470" y="120" width="20" height="40" fill="#D2D2D7" opacity={0.4} />
            <Path d="M 580 140 L 640 155" stroke="#0071E3" strokeWidth="8" fill="none" opacity={0.4} />
            <Ellipse cx="680" cy="165" rx="55" ry="28" fill="url(#metalGrad)" />
            <Ellipse cx="680" cy="165" rx="40" ry="20" fill="#F5F5F7" opacity={0.5} />
            <Path d="M 640 200 L 680 220" stroke="#0071E3" strokeWidth="8" fill="none" opacity={0.4} />
            <Ellipse cx="710" cy="235" rx="50" ry="25" fill="url(#metalGrad)" />
            <Ellipse cx="710" cy="235" rx="35" ry="18" fill="#F5F5F7" opacity={0.5} />
            <Circle cx="588" cy="212" r="4" fill="#86868B" />
            <Circle cx="400" cy="212" r="4" fill="#86868B" />
            <Circle cx="260" cy="212" r="4" fill="#86868B" />
          </Svg>
        </View>

        <TouchableOpacity onPress={onNext} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Buscar piezas aftermarket</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Solicitar presupuesto personalizado</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/* ─── Products List ─────────────────────────────────────────────────────── */

function ProductsList({
  vehicle,
  onSelectProduct,
  onChangeVehicle,
}: {
  vehicle: any;
  onSelectProduct: (listing: MarketplaceListing) => void;
  onChangeVehicle: () => void;
}) {
  const { listings, loading, fetchAllListings, setFilters, filters } = useMarketplaceStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAllListings();
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    setFilters({ ...filters, search: text });
    fetchAllListings();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Svg width="28" height="28" viewBox="0 0 100 100">
              <Path
                d="M30,20 Q30,35 45,45 Q55,50 55,60 Q55,70 45,75 Q30,82 30,95 M30,45 L70,45 M45,30 L70,30 Q75,30 75,35 Q75,40 70,40 L55,40 M55,60 L70,60 Q80,60 80,70 Q80,80 70,80 L45,80"
                stroke="#0071E3"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text style={styles.headerTitle}>ExhaustMarket</Text>
        </View>
        <TouchableOpacity onPress={onChangeVehicle}>
          <Text style={styles.vehicleInfo}>
            {vehicle.brand} {vehicle.model} · {vehicle.engine} ›
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar piezas o servicios..."
            placeholderTextColor="#86868B"
            value={search}
            onChangeText={handleSearch}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0071E3" />
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔧</Text>
            <Text style={styles.emptyText}>No hay productos disponibles</Text>
            <Text style={styles.emptySubtext}>Prueba con otra busqueda</Text>
          </View>
        ) : (
          listings.map((listing) => (
            <TouchableOpacity
              key={listing.id}
              style={styles.productCard}
              onPress={() => onSelectProduct(listing)}
              activeOpacity={0.7}
            >
              <View style={styles.productImage}>
                <Svg width="100" height="60" viewBox="0 0 200 100">
                  <Ellipse cx="50" cy="50" rx="35" ry="20" fill="#0071E3" opacity={0.35} />
                  <Ellipse cx="150" cy="50" rx="40" ry="22" fill="#0071E3" opacity={0.45} />
                  <Rect x="85" y="38" width="65" height="24" fill="#F5F5F7" opacity={0.7} />
                  <Ellipse cx="150" cy="50" rx="30" ry="16" fill="#E5E5EA" opacity={0.5} />
                </Svg>
              </View>

              <View style={styles.productInfo}>
                <Text style={styles.productName}>{listing.name}</Text>
                <Text style={styles.productBrand}>
                  {listing.seller_company || listing.seller_name}
                </Text>

                <View style={styles.badges}>
                  <View
                    style={[
                      styles.badge,
                      listing.type === 'service' ? styles.badgeBlue : styles.badgeGreen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        listing.type === 'service' ? styles.badgeTextBlue : styles.badgeTextGreen,
                      ]}
                    >
                      {listing.type === 'product' ? 'Producto' : 'Servicio'}
                    </Text>
                  </View>
                </View>

                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>€ {listing.price}</Text>
                  <View style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>Ver detalles ›</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.customQuoteCard}>
          <Text style={styles.customQuoteTitle}>¿No encontraste lo que buscas?</Text>
          <TouchableOpacity style={styles.customQuoteButton}>
            <Text style={styles.customQuoteButtonText}>Solicitar presupuesto</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

/* ─── Product Detail ────────────────────────────────────────────────────── */

function ProductDetail({
  listing,
  vehicle,
  onBack,
}: {
  listing: MarketplaceListing;
  vehicle: any;
  onBack: () => void;
}) {
  const categoryLabels: Record<string, string> = {
    exhaust_parts: 'Piezas de Escape',
    exhaust_service: 'Servicio de Escape',
    manifold: 'Colector',
    catalytic: 'Catalizador',
    muffler: 'Silenciador',
    pipe: 'Tubo',
    other: 'Otro',
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with back button */}
      <View style={styles.detailHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Detalle</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Product Image */}
      <View style={styles.detailImageContainer}>
        <Svg width="100%" height="180" viewBox="0 0 400 180">
          <Defs>
            <SvgLinearGradient id="detailGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#D2D2D7" />
              <Stop offset="50%" stopColor="#86868B" />
              <Stop offset="100%" stopColor="#D2D2D7" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx="80" cy="90" rx="55" ry="35" fill="#0071E3" opacity={0.3} />
          <Path d="M 135 90 L 180 70" stroke="#0071E3" strokeWidth="10" fill="none" opacity={0.4} />
          <Ellipse cx="220" cy="70" rx="65" ry="30" fill="url(#detailGrad)" />
          <Path d="M 285 70 L 330 75" stroke="#0071E3" strokeWidth="10" fill="none" opacity={0.4} />
          <Ellipse cx="360" cy="85" rx="55" ry="28" fill="url(#detailGrad)" />
          <Ellipse cx="360" cy="85" rx="38" ry="18" fill="#F5F5F7" opacity={0.6} />
        </Svg>
      </View>

      <View style={styles.detailContent}>
        {/* Title & type badge */}
        <View style={styles.detailTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailName}>{listing.name}</Text>
            <Text style={styles.detailSeller}>
              {listing.seller_company || listing.seller_name}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              listing.type === 'service' ? styles.badgeBlue : styles.badgeGreen,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                listing.type === 'service' ? styles.badgeTextBlue : styles.badgeTextGreen,
              ]}
            >
              {listing.type === 'product' ? 'Producto' : 'Servicio'}
            </Text>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Precio</Text>
          <Text style={styles.detailPrice}>€ {listing.price}</Text>
          {listing.stock !== undefined && (
            <Text style={styles.stockText}>
              {listing.stock > 0 ? `${listing.stock} en stock` : 'Sin stock'}
            </Text>
          )}
        </View>

        {/* Description */}
        {listing.description ? (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Descripcion</Text>
            <Text style={styles.detailDescription}>{listing.description}</Text>
          </View>
        ) : null}

        {/* Specifications */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Especificaciones</Text>
          <View style={styles.specTable}>
            <SpecRow label="Categoria" value={categoryLabels[listing.category] || listing.category} />
            <SpecRow label="Tipo" value={listing.type === 'product' ? 'Producto Fisico' : 'Servicio'} />
            <SpecRow label="Vendedor" value={listing.seller_company || listing.seller_name} isLast />
          </View>
        </View>

        {/* Compatibility */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Compatibilidad</Text>
          <View style={styles.compatCard}>
            <Text style={styles.compatVehicle}>
              ✅  {vehicle.brand} {vehicle.model} · {vehicle.engine}
            </Text>
            <Text style={styles.compatNote}>
              Basado en tu seleccion de vehiculo. Confirma con el vendedor antes de comprar.
            </Text>
          </View>
        </View>

        {/* CTA Buttons */}
        <TouchableOpacity style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>
            {listing.type === 'product' ? 'Comprar ahora' : 'Reservar servicio'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryCtaButton}>
          <Text style={styles.secondaryCtaButtonText}>Solicitar cotizacion</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

function SpecRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.specRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.3,
  },
  vehicleInfo: {
    color: '#0071E3',
    fontSize: 14,
    marginTop: 10,
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D2D2D7',
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#1D1D1F',
  },
  primaryButton: {
    backgroundColor: '#0071E3',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 980,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 17,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 980,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0071E3',
    marginBottom: 40,
  },
  outlineButtonText: {
    color: '#0071E3',
    fontWeight: '600',
    fontSize: 17,
  },
  diagramCard: {
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
  },
  diagramTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 10,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#1D1D1F',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 17,
    color: '#1D1D1F',
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#86868B',
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  productImage: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  productInfo: {
    gap: 8,
  },
  productName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  productBrand: {
    fontSize: 15,
    color: '#0071E3',
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 980,
  },
  badgeGreen: {
    backgroundColor: '#E8F8ED',
  },
  badgeBlue: {
    backgroundColor: '#E8F0FF',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextGreen: {
    color: '#34C759',
  },
  badgeTextBlue: {
    color: '#0071E3',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  viewButton: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 980,
  },
  viewButtonText: {
    color: '#0071E3',
    fontWeight: '600',
    fontSize: 15,
  },
  customQuoteCard: {
    backgroundColor: '#F5F5F7',
    padding: 28,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  customQuoteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 16,
    textAlign: 'center',
  },
  customQuoteButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 980,
  },
  customQuoteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 17,
  },
  // Detail view
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    color: '#0071E3',
    fontSize: 17,
    fontWeight: '500',
  },
  detailHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  detailImageContainer: {
    backgroundColor: '#F5F5F7',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  detailContent: {
    paddingHorizontal: 20,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  detailName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  detailSeller: {
    fontSize: 15,
    color: '#0071E3',
    fontWeight: '600',
  },
  priceCard: {
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6E6E73',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.5,
  },
  stockText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
    marginTop: 4,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  detailDescription: {
    fontSize: 15,
    color: '#6E6E73',
    lineHeight: 22,
  },
  specTable: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D2D2D7',
  },
  specLabel: {
    fontSize: 15,
    color: '#6E6E73',
    fontWeight: '400',
  },
  specValue: {
    fontSize: 15,
    color: '#1D1D1F',
    fontWeight: '500',
  },
  compatCard: {
    backgroundColor: '#E8F8ED',
    borderRadius: 14,
    padding: 16,
  },
  compatVehicle: {
    fontSize: 15,
    color: '#1D1D1F',
    fontWeight: '600',
    marginBottom: 6,
  },
  compatNote: {
    fontSize: 13,
    color: '#6E6E73',
    lineHeight: 18,
  },
  ctaButton: {
    backgroundColor: '#0071E3',
    paddingVertical: 16,
    borderRadius: 980,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryCtaButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 980,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0071E3',
  },
  secondaryCtaButtonText: {
    color: '#0071E3',
    fontSize: 17,
    fontWeight: '600',
  },
});
