import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Svg, { Path, Rect, Ellipse, Circle, G, Line } from 'react-native-svg';

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Svg width="48" height="48" viewBox="0 0 100 100">
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
          <Text style={styles.title}>ExhaustMarket</Text>
          <Text style={styles.subtitle}>Tu marketplace de escapes</Text>
        </View>

        {/* Role Cards */}
        <View style={styles.cards}>
          {/* PARTICULAR Card */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register', { type: 'customer' })}
            activeOpacity={0.7}
          >
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Svg width="80" height="60" viewBox="0 0 200 120">
                  <Rect x="20" y="45" width="160" height="60" rx="8" fill="#0071E3" opacity={0.5} />
                  <Rect x="30" y="55" width="40" height="30" rx="2" fill="#0071E3" opacity={0.25} />
                  <Rect x="130" y="55" width="40" height="30" rx="2" fill="#0071E3" opacity={0.25} />
                  <Ellipse cx="60" cy="105" rx="20" ry="20" fill="#86868B" opacity={0.3} />
                  <Ellipse cx="60" cy="105" rx="12" ry="12" fill="#E5E5EA" />
                  <Ellipse cx="140" cy="105" rx="20" ry="20" fill="#86868B" opacity={0.3} />
                  <Ellipse cx="140" cy="105" rx="12" ry="12" fill="#E5E5EA" />
                  <Path d="M 20 45 L 30 30 L 80 30 L 90 45 Z" fill="#0071E3" opacity={0.35} />
                  <Circle cx="170" cy="70" r="8" fill="#FF9500" opacity={0.3} />
                </Svg>
              </View>
              <Text style={styles.cardTitle}>Particular</Text>
              <Text style={styles.cardDescription}>Encuentra piezas y talleres para tu vehiculo</Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => navigation.navigate('Register', { type: 'customer' })}
              >
                <Text style={styles.ctaButtonText}>Registrarse</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* TALLER Card */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register', { type: 'workshop' })}
            activeOpacity={0.7}
          >
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Svg width="80" height="60" viewBox="0 0 200 160">
                  <Rect x="75" y="80" width="50" height="60" rx="25" fill="#0071E3" opacity={0.35} />
                  <Circle cx="100" cy="60" r="28" fill="#0071E3" opacity={0.5} />
                  <Circle cx="100" cy="60" r="22" fill="#F5F5F7" />
                  <Ellipse cx="92" cy="58" rx="4" ry="6" fill="#6E6E73" />
                  <Ellipse cx="108" cy="58" rx="4" ry="6" fill="#6E6E73" />
                  <Path d="M 90 68 Q 100 72, 110 68" stroke="#6E6E73" strokeWidth="2" fill="none" />
                  <Rect x="70" y="90" width="60" height="45" rx="5" fill="#0071E3" opacity={0.35} />
                  <Path d="M 55 105 L 70 95 L 70 115 Z" fill="#0071E3" opacity={0.2} />
                  <Path d="M 145 105 L 130 95 L 130 115 Z" fill="#0071E3" opacity={0.2} />
                  <G transform="translate(115, 85)">
                    <Circle cx="0" cy="0" r="3" fill="#FF9500" />
                    <Line x1="-8" y1="-8" x2="8" y2="8" stroke="#FF9500" strokeWidth="2" />
                    <Line x1="8" y1="-8" x2="-8" y2="8" stroke="#FF9500" strokeWidth="2" />
                  </G>
                </Svg>
              </View>
              <Text style={styles.cardTitle}>Taller</Text>
              <Text style={styles.cardDescription}>Gestiona servicios y recibe solicitudes de clientes</Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => navigation.navigate('Register', { type: 'workshop' })}
              >
                <Text style={styles.ctaButtonText}>Registrarse</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* FABRICANTE Card */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register', { type: 'manufacturer' })}
            activeOpacity={0.7}
          >
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Svg width="80" height="60" viewBox="0 0 200 160">
                  <Rect x="70" y="80" width="14" height="60" rx="7" fill="#0071E3" opacity={0.35} />
                  <Rect x="116" y="80" width="14" height="60" rx="7" fill="#0071E3" opacity={0.35} />
                  <Ellipse cx="100" cy="75" rx="45" ry="18" fill="#0071E3" opacity={0.5} />
                  <Ellipse cx="100" cy="75" rx="38" ry="14" fill="#F5F5F7" />
                  <Rect x="62" y="50" width="76" height="25" rx="3" fill="#0071E3" opacity={0.35} />
                  <Circle cx="100" cy="40" r="12" fill="#0071E3" opacity={0.3} />
                  <Rect x="75" y="60" width="10" height="15" rx="1" fill="#0071E3" opacity={0.2} />
                  <Rect x="90" y="60" width="10" height="15" rx="1" fill="#0071E3" opacity={0.2} />
                  <Rect x="105" y="60" width="10" height="15" rx="1" fill="#0071E3" opacity={0.2} />
                  <Rect x="120" y="60" width="10" height="15" rx="1" fill="#0071E3" opacity={0.2} />
                </Svg>
              </View>
              <Text style={styles.cardTitle}>Fabricante</Text>
              <Text style={styles.cardDescription}>Publica productos y conecta con talleres</Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => navigation.navigate('Register', { type: 'manufacturer' })}
              >
                <Text style={styles.ctaButtonText}>Registrarse</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Ya tienes cuenta?  </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Inicia sesion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#F5F5F7',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6E6E73',
    marginTop: 6,
    fontWeight: '400',
  },
  cards: {
    width: '100%',
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 15,
    color: '#6E6E73',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  ctaButton: {
    backgroundColor: '#0071E3',
    borderRadius: 980,
    paddingHorizontal: 32,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 17,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#6E6E73',
    fontSize: 15,
    fontWeight: '400',
  },
  footerLink: {
    color: '#0071E3',
    fontSize: 15,
    fontWeight: '600',
  },
});
