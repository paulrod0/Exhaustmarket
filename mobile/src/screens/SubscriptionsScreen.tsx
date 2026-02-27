import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export default function SubscriptionsScreen() {
  const { profile } = useAuthStore()
  const [tiers, setTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    fetchTiers()
  }, [])

  const fetchTiers = async () => {
    try {
      const { data } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('active', true)
        .order('price_monthly', { ascending: true })

      setTiers(data || [])
    } catch (error) {
      console.error('Error fetching tiers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = (tierName: string) => {
    Alert.alert(
      'Configurar Stripe',
      'Para suscribirte, necesitas configurar Stripe.\n\nVisita: https://bolt.new/setup/stripe',
      [{ text: 'OK' }]
    )
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando planes...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Elige tu Plan</Text>
        <Text style={styles.subtitle}>
          Tu plan actual: <Text style={styles.currentPlan}>{profile?.user_type}</Text>
        </Text>
      </View>

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
              Anual (17%)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.plans}>
        {tiers.map((tier) => {
          const price = billingCycle === 'monthly' ? tier.price_monthly : tier.price_yearly
          const isPremium = tier.name === 'premium'
          const isCurrentPlan = profile?.user_type === tier.name

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
                {price === 0 ? 'Gratis' : `\u20AC${price.toFixed(2)}`}
                {price > 0 && (
                  <Text style={styles.planPeriod}>
                    /{billingCycle === 'monthly' ? 'mes' : 'ano'}
                  </Text>
                )}
              </Text>

              <View style={styles.featuresList}>
                {(tier.features as string[]).map((feature: string, index: number) => (
                  <View key={index} style={styles.featureItem}>
                    <Text style={styles.featureCheck}>{'\u2713'}</Text>
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
                onPress={() => handleSubscribe(tier.name)}
                disabled={isCurrentPlan}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.subscribeButtonText,
                    isCurrentPlan && styles.subscribeButtonTextDisabled,
                  ]}
                >
                  {isCurrentPlan ? 'Plan Actual' : 'Suscribirse'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingText: {
    color: '#86868B',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
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
    paddingHorizontal: 24,
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 980,
    alignItems: 'center',
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
})
