import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import {
  SUBSCRIPTION_PLANS,
  PREMIUM_FEATURE_LIST,
  FREE_FEATURE_LIST,
  purchasePremium,
  restorePurchases,
} from '../services/premium';

export default function Paywall({ visible, onClose, onSubscribed, context }) {
  const { colors } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const result = await purchasePremium(selectedPlan);
      if (result.success) {
        Alert.alert(
          'Welcome to Premium!',
          'Thank you for subscribing. Enjoy unlimited access!',
          [{ text: 'OK', onPress: () => {
            onSubscribed?.();
            onClose();
          }}]
        );
      } else {
        Alert.alert('Error', result.error || 'Purchase failed. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await restorePurchases();
      if (result.success && result.hasPremium) {
        Alert.alert(
          'Purchase Restored',
          'Your premium subscription has been restored!',
          [{ text: 'OK', onPress: () => {
            onSubscribed?.();
            onClose();
          }}]
        );
      } else {
        Alert.alert('No Purchase Found', 'We couldn\'t find any previous purchases to restore.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getContextMessage = () => {
    switch (context) {
      case 'record_limit':
        return 'You\'ve reached your weekly limit of 5 records. Upgrade to log unlimited entries!';
      case 'visualizations':
        return 'Unlock charts and insights to visualize your progress over time.';
      case 'theme':
        return 'Personalize your app with beautiful color themes.';
      case 'export':
        return 'Export your data anytime for backup or analysis.';
      case 'import':
        return 'Import your data from a backup file.';
      case 'apple_health':
        return 'Connect Apple Health to automatically enrich your workouts with heart rate, calories, and more.';
      default:
        return 'Get the most out of your wellness journey with Premium.';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: colors.text }]}>Upgrade to Premium</Text>
            <Text style={[styles.contextMessage, { color: colors.textSecondary }]}>
              {getContextMessage()}
            </Text>

            {/* Premium Features */}
            <View style={styles.featuresSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Premium Features</Text>
              {PREMIUM_FEATURE_LIST.map((feature) => (
                <View key={feature.id} style={[styles.featureRow, { borderBottomColor: colors.border }]}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  <View style={styles.featureInfo}>
                    <Text style={[styles.featureName, { color: colors.text }]}>{feature.name}</Text>
                    <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{feature.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Free Features */}
            <View style={styles.featuresSection}>
              <Text style={[styles.sectionTitle, { color: colors.textLight }]}>Included Free</Text>
              {FREE_FEATURE_LIST.map((feature) => (
                <View key={feature.id} style={[styles.featureRowSmall]}>
                  <Text style={styles.featureIconSmall}>{feature.icon}</Text>
                  <Text style={[styles.featureNameSmall, { color: colors.textSecondary }]}>{feature.name}</Text>
                </View>
              ))}
            </View>

            {/* Plan Selection */}
            <View style={styles.plansSection}>
              <TouchableOpacity
                style={[
                  styles.planCard,
                  { borderColor: selectedPlan === 'yearly' ? colors.primary : colors.border },
                  selectedPlan === 'yearly' && { backgroundColor: colors.primary + '10' }
                ]}
                onPress={() => setSelectedPlan('yearly')}
              >
                {selectedPlan === 'yearly' && (
                  <View style={[styles.bestValueBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.bestValueText}>BEST VALUE</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: colors.text }]}>Yearly</Text>
                  <Text style={[styles.planPrice, { color: colors.primary }]}>
                    {SUBSCRIPTION_PLANS.YEARLY.price}
                  </Text>
                </View>
                <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>
                  {SUBSCRIPTION_PLANS.YEARLY.description}
                </Text>
                <Text style={[styles.planSavings, { color: colors.success }]}>
                  Save {SUBSCRIPTION_PLANS.YEARLY.savings}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.planCard,
                  { borderColor: selectedPlan === 'monthly' ? colors.primary : colors.border },
                  selectedPlan === 'monthly' && { backgroundColor: colors.primary + '10' }
                ]}
                onPress={() => setSelectedPlan('monthly')}
              >
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: colors.text }]}>Monthly</Text>
                  <Text style={[styles.planPrice, { color: colors.primary }]}>
                    {SUBSCRIPTION_PLANS.MONTHLY.price}
                  </Text>
                </View>
                <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>
                  {SUBSCRIPTION_PLANS.MONTHLY.description}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.subscribeButton, { backgroundColor: colors.primary }]}
              onPress={handlePurchase}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.subscribeButtonText}>
                  Subscribe - {selectedPlan === 'yearly' ? SUBSCRIPTION_PLANS.YEARLY.price : SUBSCRIPTION_PLANS.MONTHLY.price}/{selectedPlan === 'yearly' ? 'year' : 'month'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={loading}
            >
              <Text style={[styles.restoreButtonText, { color: colors.textSecondary }]}>
                Restore Purchase
              </Text>
            </TouchableOpacity>

            <Text style={[styles.termsText, { color: colors.textLight }]}>
              Subscription auto-renews. Cancel anytime in Settings.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 34,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
  },
  content: {
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  contextMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featuresSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 14,
    width: 32,
    textAlign: 'center',
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
  },
  featureRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  featureIconSmall: {
    fontSize: 16,
    marginRight: 10,
    width: 24,
    textAlign: 'center',
  },
  featureNameSmall: {
    fontSize: 14,
  },
  plansSection: {
    marginTop: 8,
    gap: 12,
  },
  planCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  bestValueText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  planPeriod: {
    fontSize: 13,
  },
  planSavings: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  actions: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  restoreButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 15,
  },
  termsText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
