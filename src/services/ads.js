import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestTrackingPermissionsAsync,
  getTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

const AD_BONUS_KEY = '@ad_bonus_entries';
const DAILY_AD_COUNT_KEY = '@daily_ad_count';
const ATT_REQUESTED_KEY = '@att_requested';

// Maximum ads per day
const MAX_DAILY_ADS = 5;

// Production ad unit ID
const AD_UNIT_PRODUCTION = 'ca-app-pub-3080964120098415/2947627614';

// Lazy load AdMob — the native module may not be available in dev client builds
let _admob = null;
const getAdmob = () => {
  if (!_admob) {
    try {
      _admob = require('react-native-google-mobile-ads');
    } catch (e) {
      return null;
    }
  }
  return _admob;
};

const getAdUnit = () => {
  const admob = getAdmob();
  if (!admob) return AD_UNIT_PRODUCTION;
  return __DEV__ ? admob.TestIds.REWARDED : AD_UNIT_PRODUCTION;
};

// Entries earned per ad view
const AD_REWARD_ENTRIES = 1;

let rewardedAd = null;
let trackingAllowed = false;

/**
 * Request App Tracking Transparency permission (iOS 14.5+)
 * Should be called before showing any ads
 */
export const requestTrackingPermission = async () => {
  if (Platform.OS !== 'ios') {
    trackingAllowed = true;
    return { granted: true };
  }

  try {
    const alreadyRequested = await AsyncStorage.getItem(ATT_REQUESTED_KEY);

    if (alreadyRequested) {
      const { status } = await getTrackingPermissionsAsync();
      trackingAllowed = status === 'granted';
      return { granted: trackingAllowed, status };
    }

    const { status } = await requestTrackingPermissionsAsync();
    await AsyncStorage.setItem(ATT_REQUESTED_KEY, 'true');
    trackingAllowed = status === 'granted';

    return { granted: trackingAllowed, status };
  } catch (error) {
    console.error('Error requesting tracking permission:', error);
    return { granted: false, error };
  }
};

/**
 * Get current tracking permission status without prompting
 */
export const getTrackingStatus = async () => {
  if (Platform.OS !== 'ios') {
    return { granted: true, status: 'granted' };
  }

  try {
    const { status } = await getTrackingPermissionsAsync();
    trackingAllowed = status === 'granted';
    return { granted: trackingAllowed, status };
  } catch (error) {
    console.error('Error getting tracking status:', error);
    return { granted: false, status: 'undetermined' };
  }
};

/**
 * Initialize ads - request ATT permission
 * Call this once when the app starts
 */
export const initializeAds = async () => {
  try {
    // Request ATT permission on iOS
    await requestTrackingPermission();

    // Note: GDPR consent (AdsConsent) can be added here when @iabtcf/core
    // compatibility with React Native is resolved. For now, non-personalized
    // ads are shown to users who don't grant tracking permission.

    return { success: true, trackingAllowed };
  } catch (error) {
    console.error('Error initializing ads:', error);
    return { success: false, error };
  }
};

/**
 * Get the start of the current week (Sunday) - matches premium.js logic
 */
const getWeekStart = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

/**
 * Get the start of today
 */
const getTodayStart = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

/**
 * Check if a timestamp is in the current week
 */
const isCurrentWeek = (timestamp) => {
  const weekStart = getWeekStart();
  const date = new Date(timestamp);
  return date >= weekStart;
};

/**
 * Check if a timestamp is today
 */
const isToday = (timestamp) => {
  const todayStart = getTodayStart();
  const date = new Date(timestamp);
  return date >= todayStart;
};

/**
 * Get daily ad view count and remaining
 */
export const getDailyAdStatus = async () => {
  try {
    const stored = await AsyncStorage.getItem(DAILY_AD_COUNT_KEY);
    if (!stored) {
      return { viewed: 0, remaining: MAX_DAILY_ADS, maxDaily: MAX_DAILY_ADS };
    }

    const { count, date } = JSON.parse(stored);

    // Reset if it's a new day
    if (!isToday(date)) {
      await AsyncStorage.removeItem(DAILY_AD_COUNT_KEY);
      return { viewed: 0, remaining: MAX_DAILY_ADS, maxDaily: MAX_DAILY_ADS };
    }

    return {
      viewed: count || 0,
      remaining: Math.max(0, MAX_DAILY_ADS - (count || 0)),
      maxDaily: MAX_DAILY_ADS,
    };
  } catch (error) {
    console.error('Error getting daily ad status:', error);
    return { viewed: 0, remaining: MAX_DAILY_ADS, maxDaily: MAX_DAILY_ADS };
  }
};

/**
 * Increment daily ad count
 */
const incrementDailyAdCount = async () => {
  try {
    const status = await getDailyAdStatus();
    await AsyncStorage.setItem(
      DAILY_AD_COUNT_KEY,
      JSON.stringify({
        count: status.viewed + 1,
        date: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error('Error incrementing daily ad count:', error);
  }
};

/**
 * Check if user can watch more ads today
 */
export const canWatchAd = async () => {
  const status = await getDailyAdStatus();
  return status.remaining > 0;
};

/**
 * Load a rewarded ad
 */
export const loadRewardedAd = () => {
  const admob = getAdmob();
  if (!admob) return null;
  const ad = admob.RewardedAd.createForAdRequest(getAdUnit(), {
    requestNonPersonalizedAdsOnly: !trackingAllowed,
  });

  rewardedAd = ad;
  ad.load();
  return ad;
};

/**
 * Show a rewarded ad and return the result
 */
export const showRewardedAd = async () => {
  // Check daily limit first
  const canWatch = await canWatchAd();
  if (!canWatch) {
    throw new Error('Daily ad limit reached');
  }

  return new Promise((resolve, reject) => {
    const admob = getAdmob();
    if (!admob) {
      resolve({ rewarded: false, entries: 0 });
      return;
    }
    const ad = admob.RewardedAd.createForAdRequest(getAdUnit(), {
      requestNonPersonalizedAdsOnly: !trackingAllowed,
    });

    const unsubscribeLoaded = ad.addAdEventListener(admob.RewardedAdEventType.LOADED, () => {
      ad.show();
    });

    const unsubscribeEarned = ad.addAdEventListener(
      admob.RewardedAdEventType.EARNED_REWARD,
      async (reward) => {
        await addAdBonusEntries(AD_REWARD_ENTRIES);
        await incrementDailyAdCount();

        unsubscribeLoaded();
        unsubscribeEarned();

        resolve({
          rewarded: true,
          entries: AD_REWARD_ENTRIES,
          reward,
        });
      }
    );

    ad.addAdEventListener('closed', () => {
      unsubscribeLoaded();
      unsubscribeEarned();
    });

    ad.addAdEventListener('error', (error) => {
      unsubscribeLoaded();
      unsubscribeEarned();
      reject(error);
    });

    ad.load();
  });
};

/**
 * Get the current ad bonus entries for this week
 */
export const getAdBonusEntries = async () => {
  try {
    const stored = await AsyncStorage.getItem(AD_BONUS_KEY);
    if (!stored) return 0;

    const { count, weekStart } = JSON.parse(stored);

    // Reset if it's a new week
    if (!isCurrentWeek(weekStart)) {
      await resetWeeklyAdBonus();
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting ad bonus entries:', error);
    return 0;
  }
};

/**
 * Add ad bonus entries
 */
export const addAdBonusEntries = async (count) => {
  try {
    const currentCount = await getAdBonusEntries();
    const weekStart = getWeekStart().toISOString();

    await AsyncStorage.setItem(
      AD_BONUS_KEY,
      JSON.stringify({
        count: currentCount + count,
        weekStart,
      })
    );

    return currentCount + count;
  } catch (error) {
    console.error('Error adding ad bonus entries:', error);
    return 0;
  }
};

/**
 * Reset weekly ad bonus (called on week reset)
 */
export const resetWeeklyAdBonus = async () => {
  try {
    await AsyncStorage.removeItem(AD_BONUS_KEY);
  } catch (error) {
    console.error('Error resetting ad bonus:', error);
  }
};

/**
 * Preload ad for faster display
 */
export const preloadAds = () => {
  try {
    loadRewardedAd();
  } catch (error) {
    console.error('Error preloading ad:', error);
  }
};
