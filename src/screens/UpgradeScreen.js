import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  isPremium,
  purchasePremium,
  restorePurchases,
  PREMIUM_PRICE,
  PREMIUM_FEATURE_LIST,
} from '../services/premium';

export default function UpgradeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [premium, setPremium] = useState(false);

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    const status = await isPremium();
    setPremium(status);
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const result = await purchasePremium();
      if (result.success) {
        setPremium(true);
        Alert.alert(
          '🎉 Welcome to Premium!',
          'You now have access to all premium features. Thank you for your support!',
          [{ text: 'Get Started', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.');
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
        setPremium(true);
        Alert.alert('Success', 'Your premium access has been restored!');
      } else {
        Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (premium) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumBadgeIcon}>👑</Text>
          <Text style={styles.premiumBadgeText}>Premium Active</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.thankYouTitle}>Thank You!</Text>
          <Text style={styles.thankYouText}>
            You have access to all premium features. We appreciate your support!
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Premium Features</Text>
          {PREMIUM_FEATURE_LIST.map((feature) => (
            <View key={feature.id} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureName}>{feature.name}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>👑</Text>
        <Text style={styles.headerTitle}>Upgrade to Premium</Text>
        <Text style={styles.headerSubtitle}>
          Unlock the full power of LogWell and take control of your data
        </Text>
      </View>

      <View style={styles.priceCard}>
        <Text style={styles.priceAmount}>{PREMIUM_PRICE}</Text>
        <Text style={styles.priceLabel}>One-time payment</Text>
        <Text style={styles.priceDescription}>Own it forever • No subscriptions</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What You Get</Text>
        {PREMIUM_FEATURE_LIST.map((feature) => (
          <View key={feature.id} style={styles.featureItem}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>{feature.name}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.benefits}>
        <Text style={styles.benefitsTitle}>Why Premium?</Text>
        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>🔒</Text>
          <Text style={styles.benefitText}>
            <Text style={styles.benefitBold}>Privacy First:</Text> All data stays on your device, even with premium features
          </Text>
        </View>
        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>💪</Text>
          <Text style={styles.benefitText}>
            <Text style={styles.benefitBold}>One-Time Payment:</Text> No subscriptions, no hidden fees, own it forever
          </Text>
        </View>
        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>🚀</Text>
          <Text style={styles.benefitText}>
            <Text style={styles.benefitBold}>Support Development:</Text> Help us build more amazing features
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.upgradeButton, loading && styles.upgradeButtonDisabled]}
        onPress={handlePurchase}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            <Text style={styles.upgradeButtonPrice}>{PREMIUM_PRICE}</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={loading}
      >
        <Text style={styles.restoreButtonText}>Restore Previous Purchase</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Payment will be charged to your Apple ID. Premium access applies to this device and can be synced via iCloud.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  priceCard: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 4,
  },
  priceDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 12,
    width: 40,
  },
  featureText: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: '#666',
  },
  checkmark: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  benefits: {
    margin: 16,
    marginTop: 0,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  benefitBold: {
    fontWeight: '600',
    color: '#333',
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    marginTop: 8,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  upgradeButtonDisabled: {
    backgroundColor: '#999',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  upgradeButtonPrice: {
    color: '#fff',
    fontSize: 14,
  },
  restoreButton: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    paddingTop: 0,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  premiumBadgeIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  premiumBadgeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  thankYouTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  thankYouText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});
