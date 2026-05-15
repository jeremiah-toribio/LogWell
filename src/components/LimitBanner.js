import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { showRewardedAd, getDailyAdStatus } from '../services/ads';

export default function LimitBanner() {
  const { colors } = useTheme();
  const { isPremium, weeklyRecords, refreshPremiumStatus } = usePremium();
  const [loading, setLoading] = useState(false);
  const [dailyAdStatus, setDailyAdStatus] = useState({ viewed: 0, remaining: 5, maxDaily: 5 });

  useEffect(() => {
    loadDailyAdStatus();
  }, []);

  const loadDailyAdStatus = async () => {
    const status = await getDailyAdStatus();
    setDailyAdStatus(status);
  };

  const handleWatchAd = async () => {
    if (dailyAdStatus.remaining <= 0) {
      Alert.alert(
        'Daily Limit Reached',
        'You\'ve watched all 5 ads for today. Come back tomorrow for more!',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const result = await showRewardedAd();
      if (result.rewarded) {
        await refreshPremiumStatus();
        await loadDailyAdStatus();
        Alert.alert(
          'Bonus Entry Earned!',
          'You earned a bonus entry. You can now save your record.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error showing ad:', error);
      if (error.message === 'Daily ad limit reached') {
        Alert.alert(
          'Daily Limit Reached',
          'You\'ve watched all 5 ads for today. Come back tomorrow for more!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Ad Unavailable',
          'Unable to load ad right now. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't show for premium users
  if (isPremium) {
    return null;
  }

  const isLimitReached = weeklyRecords.remaining <= 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      <View style={styles.statusRow}>
        <Text style={[styles.limitText, { color: colors.textSecondary }]}>
          {isLimitReached
            ? 'Weekly limit reached'
            : `${weeklyRecords.remaining} of ${weeklyRecords.limit} free logs remaining`}
        </Text>
      </View>

      {dailyAdStatus.remaining > 0 && (
        <TouchableOpacity
          style={[styles.adButton, { backgroundColor: colors.primary }]}
          onPress={handleWatchAd}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.adButtonText}>Watch Ad for +1 Entry</Text>
              <Text style={styles.adButtonSubtext}>
                {dailyAdStatus.remaining} of {dailyAdStatus.maxDaily} available today
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {dailyAdStatus.remaining <= 0 && (
        <View style={[styles.limitReachedBadge, { backgroundColor: colors.border }]}>
          <Text style={[styles.limitReachedText, { color: colors.textSecondary }]}>
            Daily ad limit reached - come back tomorrow!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  limitText: {
    fontSize: 13,
    fontWeight: '500',
  },
  adButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  adButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  adButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  limitReachedBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  limitReachedText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
