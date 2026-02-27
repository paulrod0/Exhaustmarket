import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SubscriptionTier {
  id: string
  name: string
  price_monthly: number
  price_yearly: number
  features: string[]
  active: boolean
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function SubscriptionsScreen() {
  const { profile, fetchProfile } = useAuthStore()
  const [tiers, setTiers] = useState<SubscriptionTier[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribingId, setSubscribingId] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    fetchTiers()
  }, [])

  const fetchTiers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('active', true)
        .order('price_monthly', { ascending: true })

      if (error) throw error
      setTiers((data as SubscriptionTier[]) ?? [])
    } catch (error) {
      console.error('Error fetching tiers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Stripe Checkout ──────────────────────────────────────────────────────

  const handleSubscribe = useCallback(
    async (tier: SubscriptionTier) => {
      if (tier.price_monthly === 0) {
        Alert.alert('Plan Gratuito', 'Ya tienes acceso al plan Standard de forma gratuita.')
        return
      }

      try {
        setSubscribingId(tier.id)

        // Get current Supabase session JWT
        const {
          data: { session },
          error: sessionErr,
        } = await supabase.auth.getSession()
        if (sessionErr || !session) throw new Error('No hay sesión activa. Inicia sesión.')

        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
        const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

        // Call Edge Function to create Stripe Checkout Session
        const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tier_id: tier.id, billing_cycle: billingCycle }),
        })

        const json = await res.json()
        if (!res.ok || json.error) {
          throw new Error(json.error ?? 'Error al crear la sesión de pago')
        }

        // Open Stripe Checkout in an in-app browser
        // openBrowserAsync resolves when the user closes the browser
        await WebBrowser.openBrowserAsync(json.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
          showTitle: false,
        })

        // Refresh profile — if webhook was fast, user_type will already be updated
        await fetchProfile()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error inesperado'
        Alert.alert('Error al suscribirse', message)
      } finally {
        setSubscribingId(null)
      }
    },
    [billingCycle, fetchProfile],
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0071E3" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Elige tu Plan</Text>
        <Text style={styles.subtitle}>
          Plan actual:{' '}
          <Text style={styles.currentPlan}>{profile?.user_type ?? '—'}</Text>
        </Text>
      </View>

      {/* Billing cycle toggle */}
      <View style={styles.billingToggle}>
        <View style={styles.billingToggleInner}>
          <TouchableOpacity
            style={[styles.toggleButton, billingCycle === 'monthly' && styles.toggleButtonActive]}
            onPress={() => setBillingCycle('monthly')}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>
              Mensual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, billingCycle === 'yearly' && styles.toggleButtonActive]}
            onPress={() => setBillingCycle('yearly')}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, billingCycle === 'yearly' && styles.toggleTextActive]}>
              Anual&nbsp;(−17%)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Plan cards */}
      <View style={styles.plans}>
        {tiers.map((tier) => {
          const price =
            billingCycle === 'monthly' ? tier.price_monthly : tier.price_yearly
          const isPremium = tier.name === 'premium'
          const isCurrentPlan = profile?.user_type === tier.name
          const isLoading = subscribingId === tier.id

          return (
            <View
              key={tier.id}
              style={[styles.planCard, isPremium && styles.planCardPremium]}
            >
              {isPremium && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Recomendado</Text>
                </View>
              )}

              <Text style={styles.planName}>{tier.name}</Text>

              <Text style={styles.planPrice}>
                {price === 0 ? (
                  'Gratis'
                ) : (
                  <>
                    {`€${Number(price).toFixed(2)}`}
                    <Text style={styles.planPeriod}>
                      {billingCycle === 'monthly' ? '/mes' : '/año'}
                    </Text>
                  </>
                )}
              </Text>

              <View style={styles.featuresList}>
                {(tier.features as string[]).map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Text style={styles.featureCheck}>✓</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.subscribeButton,
                  isCurrentPlan && styles.subscribeButtonDisabled,
                  isPremium && !isCurrentPlan && styles.subscribeButtonPremium,
                ]}
                onPress={() => handleSubscribe(tier)}
                disabled={isCurrentPlan || !!subscribingId}
                activeOpacity={0.75}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.subscribeButtonText,
                      isCurrentPlan && styles.subscribeButtonTextDisabled,
                    ]}
                  >
                    {isCurrentPlan ? 'Plan Actual' : 'Suscribirse'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )
        })}
      </View>

      {/* Footer note */}
      <Text style={styles.footerNote}>
        Los pagos son procesados de forma segura por Stripe.{'\n'}
        Cancela en cualquier momento.
      </Text>
    </ScrollView>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6E6E73',
  },
  currentPlan: {
    color: '#0071E3',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  billingToggle: {
    paddingHorizontal: 24,
    marginBottom: 28,
    alignItems: 'center',
  },
  billingToggleInner: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 980,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 980,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    color: '#86868B',
    fontSize: 15,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#1D1D1F',
  },
  plans: {
    paddingHorizontal: 20,
    gap: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  planCardPremium: {
    borderColor: '#0071E3',
    borderWidth: 2,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#0071E3',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 980,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
    textTransform: 'capitalize',
    letterSpacing: -0.3,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 24,
    letterSpacing: -1,
  },
  planPeriod: {
    fontSize: 16,
    color: '#86868B',
    fontWeight: '400',
  },
  featuresList: {
    marginBottom: 24,
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureCheck: {
    color: '#34C759',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  featureText: {
    flex: 1,
    color: '#6E6E73',
    fontSize: 15,
    lineHeight: 22,
  },
  subscribeButton: {
    backgroundColor: '#0071E3',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 980,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  subscribeButtonPremium: {
    backgroundColor: '#0071E3',
  },
  subscribeButtonDisabled: {
    backgroundColor: '#F5F5F7',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  subscribeButtonTextDisabled: {
    color: '#86868B',
  },
  footerNote: {
    marginTop: 28,
    marginHorizontal: 24,
    textAlign: 'center',
    color: '#AEAEB2',
    fontSize: 13,
    lineHeight: 20,
  },
})
