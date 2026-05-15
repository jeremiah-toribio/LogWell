import React, { useState, useEffect } from 'react';
import { Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import SleepLogScreen from './src/screens/SleepLogScreen';
import SleepTimerScreen from './src/screens/SleepTimerScreen';
import WorkoutLogScreen from './src/screens/WorkoutLogScreen';
import FocusLogScreen from './src/screens/FocusLogScreen';
import ListViewScreen from './src/screens/ListViewScreen';
import VisualizationsScreen from './src/screens/VisualizationsScreen';
import SettingsScreen, { getSettings } from './src/screens/SettingsScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import UpgradeScreen from './src/screens/UpgradeScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { PremiumProvider, usePremium } from './src/context/PremiumContext';
import Paywall from './src/components/Paywall';
import AdRewardPrompt from './src/components/AdRewardPrompt';
import { initializeAds } from './src/services/ads';
import { initRevenueCat, syncPremiumFromRevenueCat } from './src/services/premium';
import Purchases from 'react-native-purchases';
import { isHealthKitAvailable, connectHealthKit } from './src/services/healthKit';

const BottomTab = createBottomTabNavigator();
const TopTab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

function SleepStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="SleepLog"
        component={SleepLogScreen}
      />
      <Stack.Screen
        name="SleepTimer"
        component={SleepTimerScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTitle: '',
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.navigate('SleepLog')} style={{ paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 22, opacity: 0.4 }}>😴</Text>
            </TouchableOpacity>
          ),
        })}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ title: 'Privacy Policy' }}
      />
      <Stack.Screen
        name="Upgrade"
        component={UpgradeScreen}
        options={{ title: 'Upgrade to Premium' }}
      />
    </Stack.Navigator>
  );
}

function LogTabs({ settings }) {
  const { colors } = useTheme();

  // Ensure at least one tab is always visible
  const hasAnyTab = settings.showSleepTab || settings.showWorkoutTab || settings.showFocusTab;

  return (
    <TopTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600', textTransform: 'none' },
        tabBarStyle: { backgroundColor: colors.surface },
        tabBarIndicatorStyle: { backgroundColor: colors.primary, height: 3 },
      }}
    >
      {(settings.showSleepTab || !hasAnyTab) && (
        <TopTab.Screen
          name="SleepTab"
          component={SleepStack}
          options={{ title: '😴 Sleep' }}
        />
      )}
      {settings.showWorkoutTab && (
        <TopTab.Screen
          name="WorkoutTab"
          component={WorkoutLogScreen}
          options={{ title: '💪 Workout' }}
        />
      )}
      {settings.showFocusTab && (
        <TopTab.Screen
          name="FocusTab"
          component={FocusLogScreen}
          options={{ title: '🎯 Focus' }}
        />
      )}
    </TopTab.Navigator>
  );
}

function AppNavigator() {
  const [settings, setSettings] = useState({
    showSleepTab: true,
    showWorkoutTab: true,
    showFocusTab: true,
    showChartsTab: true,
    showHistoryTab: true,
  });
  const { colors } = useTheme();

  useEffect(() => {
    loadSettings();

    // Listen for settings changes
    const interval = setInterval(loadSettings, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    const newSettings = await getSettings();
    setSettings(newSettings);
  };

  return (
    <NavigationContainer>
      <BottomTab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShown: false,
        }}
      >
        <BottomTab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            headerShown: true,
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
          }}
        />
        <BottomTab.Screen
          name="Log"
          options={{
            tabBarLabel: 'Log',
            headerShown: true,
            headerTitle: 'Log Activity',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>✏️</Text>,
          }}
        >
          {() => <LogTabs settings={settings} />}
        </BottomTab.Screen>
        {settings.showChartsTab && (
          <BottomTab.Screen
            name="Charts"
            component={VisualizationsScreen}
            options={{
              tabBarLabel: 'Charts',
              headerShown: true,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📊</Text>,
            }}
          />
        )}
        {settings.showHistoryTab && (
          <BottomTab.Screen
            name="History"
            component={ListViewScreen}
            options={{
              tabBarLabel: 'History',
              headerShown: true,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📋</Text>,
            }}
          />
        )}
        <BottomTab.Screen
          name="Settings"
          component={SettingsStack}
          options={{
            tabBarLabel: 'Settings',
            headerShown: false,
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⚙️</Text>,
          }}
        />
      </BottomTab.Navigator>
    </NavigationContainer>
  );
}

function AppWithPaywall() {
  const {
    paywallVisible,
    hidePaywall,
    paywallContext,
    refreshPremiumStatus,
    adPromptVisible,
    hideAdPrompt,
    handleAdReward,
    showPaywall,
    isPremium,
  } = usePremium();

  useEffect(() => {
    // Initialize RevenueCat on app launch
    initRevenueCat();

    // Keep premium status in sync whenever RC gets new info
    // (handles renewals, cancellations, purchases outside the app)
    const listener = Purchases.addCustomerInfoUpdateListener(async () => {
      await syncPremiumFromRevenueCat();
      refreshPremiumStatus();
    });

    return () => listener.remove();
  }, []);

  useEffect(() => {
    // Initialize ads (ATT + GDPR consent) only for non-premium users
    if (!isPremium) {
      initializeAds();
    }
  }, [isPremium]);

  const handleUpgradeFromAdPrompt = () => {
    hideAdPrompt();
    showPaywall('record_limit');
  };

  const handleSubscribed = () => {
    refreshPremiumStatus();
    if (Platform.OS === 'ios' && isHealthKitAvailable()) {
      setTimeout(() => {
        Alert.alert(
          'Connect Apple Health?',
          'Enrich your workouts with heart rate, calories, and more from Apple Health.',
          [
            {
              text: 'Not Now',
              style: 'cancel',
            },
            {
              text: 'Connect',
              onPress: async () => {
                try {
                  await connectHealthKit();
                  Alert.alert('Connected', 'Apple Health has been connected successfully.');
                } catch (error) {
                  Alert.alert('Connection Failed', 'You can connect Apple Health later from Settings.');
                }
              },
            },
          ]
        );
      }, 500);
    }
  };

  return (
    <>
      <AppNavigator />
      <Paywall
        visible={paywallVisible}
        onClose={hidePaywall}
        onSubscribed={handleSubscribed}
        context={paywallContext}
      />
      <AdRewardPrompt
        visible={adPromptVisible}
        onClose={hideAdPrompt}
        onReward={handleAdReward}
        onUpgrade={handleUpgradeFromAdPrompt}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <PremiumProvider>
        <AppWithPaywall />
      </PremiumProvider>
    </ThemeProvider>
  );
}
