import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { showRewardedAd } from '../services/ads';

export default function AdRewardPrompt({ visible, onClose, onReward, onUpgrade }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleWatchAd = async () => {
    setLoading(true);
    try {
      const result = await showRewardedAd();
      if (result.rewarded) {
        Alert.alert(
          'Bonus Entry Earned!',
          'You earned a bonus entry. You can now save your record.',
          [{ text: 'OK', onPress: () => onReward?.(result.entries) }]
        );
      }
    } catch (error) {
      console.error('Error showing ad:', error);
      Alert.alert(
        'Ad Unavailable',
        'Unable to load ad right now. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    onUpgrade?.();
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
            <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>x</Text>
          </TouchableOpacity>

          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>Weekly Limit Reached</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              You've used all your free entries this week. Watch a short ad to earn a bonus entry!
            </Text>

            <TouchableOpacity
              style={[styles.watchAdButton, { backgroundColor: colors.primary }]}
              onPress={handleWatchAd}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.watchAdButtonText}>Watch Ad</Text>
                  <Text style={styles.watchAdReward}>+1 Entry</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.upgradeButton, { borderColor: colors.primary }]}
              onPress={handleUpgrade}
              disabled={loading}
            >
              <Text style={[styles.upgradeButtonText, { color: colors.primary }]}>Upgrade to Premium</Text>
              <Text style={[styles.upgradeSubtext, { color: colors.textSecondary }]}>Unlimited entries, no ads</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.laterButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.laterButtonText, { color: colors.textSecondary }]}>
                Maybe later
              </Text>
            </TouchableOpacity>
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
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  watchAdButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchAdButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  watchAdReward: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
  },
  upgradeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  laterButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 15,
  },
});
