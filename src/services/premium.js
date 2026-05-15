import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';
import { getSleepLogs, getWorkoutLogs, getFocusLogs } from './storage';
import { getAdBonusEntries } from './ads';

// ─── RevenueCat config ────────────────────────────────────────────────────────
const REVENUE_CAT_API_KEY_IOS = Constants.expoConfig?.extra?.revenueCatKeyIos;
// const REVENUE_CAT_API_KEY_ANDROID = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';
const ENTITLEMENT_ID = 'premium';

// ─── AsyncStorage keys ────────────────────────────────────────────────────────
const PREMIUM_KEY = '@app_premium_status';
const SUBSCRIPTION_KEY = '@app_subscription_details';

// ─── Subscription plans (used for UI display) ────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  MONTHLY: {
    id: 'monthly',
    productId: 'com.logger.premium.monthly',
    price: '$4.99',
    priceValue: 4.99,
    period: 'month',
    description: 'Billed monthly',
  },
  YEARLY: {
    id: 'yearly',
    productId: 'com.logger.premium.yearly',
    price: '$44.99',
    priceValue: 44.99,
    period: 'year',
    description: 'Billed annually (save 25%)',
    savings: '~$15/year',
  },
};

// Legacy one-time price constant (kept for UpgradeScreen compatibility)
export const PREMIUM_PRICE = '$4.99';

// ─── Free tier limits ─────────────────────────────────────────────────────────
export const FREE_LIMITS = {
  RECORDS_PER_WEEK: 5,
};

// ─── Feature flags ────────────────────────────────────────────────────────────
export const PREMIUM_FEATURES = {
  UNLIMITED_RECORDS: 'unlimited_records',
  VISUALIZATIONS: 'visualizations',
  THEME_CUSTOMIZATION: 'theme_customization',
  IMPORT_EXPORT: 'import_export',
  APPLE_HEALTH: 'apple_health',
};

export const FREE_FEATURES = {
  CLOUD_SYNC: 'cloud_sync',
  BASIC_LOGGING: 'basic_logging',
};

// ─── Feature lists (for paywall UI) ──────────────────────────────────────────
export const PREMIUM_FEATURE_LIST = [
  {
    id: PREMIUM_FEATURES.UNLIMITED_RECORDS,
    name: 'Unlimited Records',
    description: 'Log as much as you want, no weekly limits',
    icon: '∞',
  },
  {
    id: PREMIUM_FEATURES.VISUALIZATIONS,
    name: 'Charts & Insights',
    description: 'Visualize your progress with detailed charts',
    icon: '📊',
  },
  {
    id: PREMIUM_FEATURES.APPLE_HEALTH,
    name: 'Apple Health',
    description: 'Sync with Apple Health app',
    icon: '❤️',
  },
  {
    id: PREMIUM_FEATURES.THEME_CUSTOMIZATION,
    name: 'Theme Customization',
    description: 'Personalize with 6 beautiful color themes',
    icon: '🎨',
  },
  {
    id: PREMIUM_FEATURES.IMPORT_EXPORT,
    name: 'Import & Export',
    description: 'Backup and transfer your data anytime',
    icon: '📤',
  },
];

export const FREE_FEATURE_LIST = [
  {
    id: FREE_FEATURES.CLOUD_SYNC,
    name: 'Cloud Sync',
    description: 'Your data synced across all devices',
    icon: '☁️',
  },
  {
    id: FREE_FEATURES.BASIC_LOGGING,
    name: 'Basic Logging',
    description: `Track sleep, workouts & focus (${FREE_LIMITS.RECORDS_PER_WEEK}/week)`,
    icon: '📝',
  },
];

// ─── RevenueCat initialization ────────────────────────────────────────────────

/**
 * Call once at app startup (in App.js useEffect).
 * Configures RevenueCat and syncs premium status to local cache.
 */
export const initRevenueCat = async () => {
  try {
    const apiKey =
      Platform.OS === 'ios' ? REVENUE_CAT_API_KEY_IOS : REVENUE_CAT_API_KEY_ANDROID;
    await Purchases.configure({ apiKey });
    // Sync entitlements into local cache so the rest of the app
    // can use fast AsyncStorage reads when offline.
    await syncPremiumFromRevenueCat();
  } catch (error) {
    console.error('RevenueCat init error:', error);
  }
};

// ─── Internal: sync RC → AsyncStorage ────────────────────────────────────────

/**
 * Pulls the current entitlement state from RevenueCat and writes it
 * into AsyncStorage so offline checks stay accurate.
 */
export const syncPremiumFromRevenueCat = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    const isActive = entitlement !== undefined;

    if (isActive) {
      const plan = entitlement.productIdentifier?.includes('yearly') ? 'yearly' : 'monthly';
      await AsyncStorage.setItem(PREMIUM_KEY, 'true');
      await AsyncStorage.setItem(
        SUBSCRIPTION_KEY,
        JSON.stringify({
          plan,
          subscribedAt: entitlement.latestPurchaseDate,
          expiresAt: entitlement.expirationDate,
          autoRenew: entitlement.willRenew,
          rcProductId: entitlement.productIdentifier,
        })
      );
    } else {
      await AsyncStorage.setItem(PREMIUM_KEY, 'false');
      await AsyncStorage.removeItem(SUBSCRIPTION_KEY);
    }

    return isActive;
  } catch (error) {
    console.error('Error syncing from RevenueCat:', error);
    return null; // null = unknown (RC unavailable); caller falls back to cache
  }
};

// ─── Public: premium status ───────────────────────────────────────────────────

/**
 * Check if user has an active premium entitlement.
 * Uses RevenueCat as source of truth; falls back to AsyncStorage when offline.
 */
export const isPremium = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    // Keep local cache in sync
    await AsyncStorage.setItem(PREMIUM_KEY, isActive ? 'true' : 'false');
    return isActive;
  } catch (error) {
    // RevenueCat unavailable — use local cache
    const status = await AsyncStorage.getItem(PREMIUM_KEY);
    return status === 'true';
  }
};

/**
 * Get subscription details from local cache.
 */
export const getSubscriptionDetails = async () => {
  try {
    const data = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting subscription details:', error);
    return null;
  }
};

/**
 * Manually grant premium (used after a confirmed purchase or restore).
 * Prefer syncPremiumFromRevenueCat for real purchases — this is a helper.
 */
export const grantPremium = async (plan = 'monthly') => {
  try {
    const now = new Date();
    const expiresAt = new Date(now);
    if (plan === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }
    await AsyncStorage.setItem(PREMIUM_KEY, 'true');
    await AsyncStorage.setItem(
      SUBSCRIPTION_KEY,
      JSON.stringify({
        plan,
        subscribedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        autoRenew: true,
      })
    );
    return true;
  } catch (error) {
    console.error('Error granting premium:', error);
    return false;
  }
};

/**
 * Revoke premium locally (does NOT cancel the subscription — user must do
 * that via App Store Settings).
 */
export const revokePremium = async () => {
  try {
    await AsyncStorage.setItem(PREMIUM_KEY, 'false');
    await AsyncStorage.removeItem(SUBSCRIPTION_KEY);
    return true;
  } catch (error) {
    console.error('Error revoking premium:', error);
    return false;
  }
};

// ─── Purchase ─────────────────────────────────────────────────────────────────

/**
 * Purchase the selected plan via RevenueCat.
 * @param {string} planId - 'monthly' | 'yearly'
 */
export const purchasePremium = async (planId = 'monthly') => {
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;

    if (!offering) {
      return { success: false, error: 'No offerings available. Please try again later.' };
    }

    const packageType = planId === 'yearly' ? 'ANNUAL' : 'MONTHLY';

    const packageToPurchase =
      offering.availablePackages.find((p) => p.packageType === packageType) ||
      offering.availablePackages.find((p) =>
        p.identifier?.toLowerCase().includes(planId === 'yearly' ? 'annual' : 'monthly')
      ) ||
      offering.availablePackages.find((p) =>
        p.product?.productIdentifier?.toLowerCase().includes(planId === 'yearly' ? 'year' : 'month')
      );

    if (!packageToPurchase) {
      return { success: false, error: `${planId} package not found in current offering.` };
    }

    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    const isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    if (isActive) {
      await syncPremiumFromRevenueCat();
      return { success: true, plan: planId };
    }

    return { success: false, error: 'Purchase completed but entitlement not yet active.' };
  } catch (error) {
    if (!error.userCancelled) {
      console.error('Purchase error:', error);
    }
    return {
      success: false,
      error: error.userCancelled ? 'Purchase cancelled.' : error.message,
      userCancelled: error.userCancelled ?? false,
    };
  }
};

// ─── Restore ──────────────────────────────────────────────────────────────────

/**
 * Restore previous purchases via RevenueCat.
 */
export const restorePurchases = async () => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    if (isActive) {
      await syncPremiumFromRevenueCat();
    }

    return { success: true, hasPremium: isActive };
  } catch (error) {
    console.error('Restore error:', error);
    return { success: false, error: error.message };
  }
};

// ─── Weekly record limits ─────────────────────────────────────────────────────

const getWeekStart = () => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

export const getWeeklyRecordCount = async () => {
  try {
    const weekStart = getWeekStart();
    const [sleepLogs, workoutLogs, focusLogs] = await Promise.all([
      getSleepLogs(),
      getWorkoutLogs(),
      getFocusLogs(),
    ]);

    const countThisWeek = (logs) =>
      logs.filter((log) => new Date(log.createdAt) >= weekStart).length;

    const sleepCount = countThisWeek(sleepLogs);
    const workoutCount = countThisWeek(workoutLogs);
    const focusCount = countThisWeek(focusLogs);

    return {
      total: sleepCount + workoutCount + focusCount,
      sleep: sleepCount,
      workout: workoutCount,
      focus: focusCount,
      limit: FREE_LIMITS.RECORDS_PER_WEEK,
      remaining: Math.max(
        0,
        FREE_LIMITS.RECORDS_PER_WEEK - (sleepCount + workoutCount + focusCount)
      ),
    };
  } catch (error) {
    console.error('Error getting weekly record count:', error);
    return {
      total: 0,
      sleep: 0,
      workout: 0,
      focus: 0,
      limit: FREE_LIMITS.RECORDS_PER_WEEK,
      remaining: FREE_LIMITS.RECORDS_PER_WEEK,
    };
  }
};

export const canAddRecord = async () => {
  try {
    const premium = await isPremium();
    if (premium) return { allowed: true, isPremium: true };

    const weeklyCount = await getWeeklyRecordCount();
    const adBonus = await getAdBonusEntries();
    const totalAllowed = FREE_LIMITS.RECORDS_PER_WEEK + adBonus;

    return {
      allowed: weeklyCount.total < totalAllowed,
      isPremium: false,
      recordsUsed: weeklyCount.total,
      recordsRemaining: Math.max(0, totalAllowed - weeklyCount.total),
      limit: totalAllowed,
      baseLimit: FREE_LIMITS.RECORDS_PER_WEEK,
      adBonusEntries: adBonus,
      canWatchAd: true,
    };
  } catch (error) {
    console.error('Error checking if can add record:', error);
    return { allowed: true, isPremium: false };
  }
};

// ─── Feature access ───────────────────────────────────────────────────────────

export const hasFeature = async (featureId) => {
  if (Object.values(FREE_FEATURES).includes(featureId)) return true;
  return await isPremium();
};

// ─── Full status (for PremiumContext) ─────────────────────────────────────────

export const getPremiumStatus = async () => {
  try {
    const premium = await isPremium();
    const subscription = await getSubscriptionDetails();
    const weeklyCount = await getWeeklyRecordCount();
    const adBonus = await getAdBonusEntries();
    const totalAllowed = FREE_LIMITS.RECORDS_PER_WEEK + adBonus;

    return {
      isPremium: premium,
      subscription,
      weeklyRecords: {
        ...weeklyCount,
        limit: totalAllowed,
        remaining: Math.max(0, totalAllowed - weeklyCount.total),
      },
      adBonusEntries: adBonus,
      canAddRecord: premium || weeklyCount.total < totalAllowed,
    };
  } catch (error) {
    console.error('Error getting premium status:', error);
    return {
      isPremium: false,
      subscription: null,
      weeklyRecords: {
        total: 0,
        limit: FREE_LIMITS.RECORDS_PER_WEEK,
        remaining: FREE_LIMITS.RECORDS_PER_WEEK,
      },
      adBonusEntries: 0,
      canAddRecord: true,
    };
  }
};
