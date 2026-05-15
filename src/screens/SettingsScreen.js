import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportAllData, exportToCSV } from '../services/dataExport';
import { importFromJSON, importSleepFromCSV, importWorkoutFromCSV, importFocusFromCSV } from '../services/dataImport';
import { SUBSCRIPTION_PLANS, grantPremium, revokePremium } from '../services/premium';
import { useTheme, getAllThemes } from '../theme/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { getAllLabels, addLabel, deleteLabel, LABEL_COLORS } from '../services/labels';
import { isHealthKitAvailable, isHealthKitConnected, connectHealthKit, disconnectHealthKit } from '../services/healthKit';

const SETTINGS_KEY = '@app_settings';

const defaultSettings = {
  showSleepTab: true,
  showWorkoutTab: true,
  showFocusTab: true,
  showChartsTab: true,
  showHistoryTab: true,
};

export default function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(defaultSettings);
  const { theme, themeId, setTheme, colors } = useTheme();
  const { isPremium, showPaywall, refreshPremiumStatus } = usePremium();
  const themes = getAllThemes();

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    appearance: true,
    tabs: false,
    labels: false,
    appleHealth: false,
    export: false,
    import: false,
    data: false,
  });

  // Apple Health state
  const [healthKitConnected, setHealthKitConnected] = useState(false);
  const [healthKitLoading, setHealthKitLoading] = useState(false);

  // Labels state
  const [labels, setLabels] = useState({ sleep: [], workout: [], focus: [] });
  const [showAddLabelModal, setShowAddLabelModal] = useState(false);
  const [newLabelCategory, setNewLabelCategory] = useState('sleep');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].color);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    loadSettings();
    loadLabels();
    loadHealthKitStatus();
  }, []);

  const loadLabels = async () => {
    const allLabels = await getAllLabels();
    setLabels(allLabels);
  };

  const loadHealthKitStatus = async () => {
    if (Platform.OS === 'ios' && isHealthKitAvailable()) {
      const connected = await isHealthKitConnected();
      setHealthKitConnected(connected);
    }
  };

  const handleConnectAppleHealth = async () => {
    if (!isPremium) {
      showPaywall('apple_health');
      return;
    }
    setHealthKitLoading(true);
    try {
      await connectHealthKit();
      setHealthKitConnected(true);
      Alert.alert('Connected', 'Apple Health has been connected successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to connect Apple Health. Please try again.');
    } finally {
      setHealthKitLoading(false);
    }
  };

  const handleDisconnectAppleHealth = () => {
    Alert.alert(
      'Disconnect Apple Health',
      'This will stop syncing data with Apple Health. You can reconnect anytime. To fully revoke permissions, go to iOS Settings > Health > Data Access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnectHealthKit();
            setHealthKitConnected(false);
          },
        },
      ]
    );
  };

  const handleAddLabel = async () => {
    if (!newLabelName.trim()) {
      Alert.alert('Error', 'Please enter a label name');
      return;
    }

    try {
      await addLabel(newLabelCategory, {
        name: newLabelName.trim(),
        color: newLabelColor,
      });
      await loadLabels();
      setNewLabelName('');
      setNewLabelColor(LABEL_COLORS[0].color);
      setShowAddLabelModal(false);
      Alert.alert('Success', 'Label created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create label');
    }
  };

  const handleDeleteLabel = async (category, labelId) => {
    Alert.alert(
      'Delete Label',
      'Are you sure you want to delete this label?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLabel(category, labelId);
              await loadLabels();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete label');
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      refreshPremiumStatus();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };

    // Ensure at least one tab is visible
    const visibleTabs = Object.values(newSettings).filter(v => v === true).length;
    if (visibleTabs === 0) {
      Alert.alert('Warning', 'You must keep at least one tab visible');
      return;
    }

    saveSettings(newSettings);
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => saveSettings(defaultSettings),
        },
      ]
    );
  };

  const handleExportAllData = async () => {
    if (!isPremium) {
      showPaywall('export');
      return;
    }
    try {
      await exportAllData();
      Alert.alert('Success', 'Your data has been exported successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };

  const handleExportCSV = () => {
    if (!isPremium) {
      showPaywall('export');
      return;
    }
    Alert.alert(
      'Export CSV',
      'Choose which data to export:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sleep Data',
          onPress: async () => {
            try {
              await exportToCSV('sleep');
              Alert.alert('Success', 'Sleep data exported');
            } catch (error) {
              Alert.alert('Error', 'Failed to export sleep data');
            }
          },
        },
        {
          text: 'Workout Data',
          onPress: async () => {
            try {
              await exportToCSV('workout');
              Alert.alert('Success', 'Workout data exported');
            } catch (error) {
              Alert.alert('Error', 'Failed to export workout data');
            }
          },
        },
        {
          text: 'Focus Data',
          onPress: async () => {
            try {
              await exportToCSV('focus');
              Alert.alert('Success', 'Focus data exported');
            } catch (error) {
              Alert.alert('Error', 'Failed to export focus data');
            }
          },
        },
      ]
    );
  };

  const handleImportJSON = async () => {
    if (!isPremium) {
      showPaywall('import');
      return;
    }
    try {
      const result = await importFromJSON();

      if (result.cancelled) {
        return;
      }

      if (result.success) {
        let message = result.message;
        if (result.results?.errors?.length > 0) {
          message += `\n\nWarnings: ${result.results.errors.length} items had errors`;
        }
        Alert.alert('Import Complete', message);
      } else {
        Alert.alert('Import Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import data');
    }
  };

  const handleImportCSV = () => {
    if (!isPremium) {
      showPaywall('import');
      return;
    }
    Alert.alert(
      'Import CSV',
      'Choose which type of data to import:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sleep Data',
          onPress: async () => {
            try {
              const result = await importSleepFromCSV();
              if (result.cancelled) return;

              if (result.success) {
                Alert.alert('Import Complete', result.message);
              } else {
                Alert.alert('Import Failed', result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to import sleep data');
            }
          },
        },
        {
          text: 'Workout Data',
          onPress: async () => {
            try {
              const result = await importWorkoutFromCSV();
              if (result.cancelled) return;

              if (result.success) {
                Alert.alert('Import Complete', result.message);
              } else {
                Alert.alert('Import Failed', result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to import workout data');
            }
          },
        },
        {
          text: 'Focus Data',
          onPress: async () => {
            try {
              const result = await importFocusFromCSV();
              if (result.cancelled) return;

              if (result.success) {
                Alert.alert('Import Complete', result.message);
              } else {
                Alert.alert('Import Failed', result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to import focus data');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      {!isPremium ? (
        <TouchableOpacity
          style={[styles.premiumBanner, { backgroundColor: colors.secondary }]}
          onPress={() => showPaywall()}
        >
          <View style={styles.premiumBannerContent}>
            <Text style={styles.premiumBannerIcon}>👑</Text>
            <View style={styles.premiumBannerText}>
              <Text style={styles.premiumBannerTitle}>Upgrade to Premium</Text>
              <Text style={styles.premiumBannerSubtitle}>
                Unlimited logs, charts, themes & more from {SUBSCRIPTION_PLANS.MONTHLY.price}/mo
              </Text>
            </View>
            <Text style={styles.premiumBannerChevron}>›</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.premiumActiveBanner, { backgroundColor: colors.success + '20' }]}>
          <Text style={styles.premiumActiveIcon}>👑</Text>
          <Text style={[styles.premiumActiveText, { color: colors.success }]}>Premium Active</Text>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => toggleSection('appearance')} activeOpacity={0.7}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
              {!isPremium && (
                <View style={[styles.premiumBadge, { backgroundColor: colors.warning + '20' }]}>
                  <Text style={[styles.premiumBadgeText, { color: colors.warning }]}>Premium</Text>
                </View>
              )}
            </View>
            <Text style={[styles.chevron, { color: colors.textLight }]}>
              {expandedSections.appearance ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.appearance && (
          <>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              {isPremium ? 'Choose your color theme' : 'Upgrade to unlock all themes'}
            </Text>

            <View style={styles.themeGrid}>
              {themes.map((t) => {
                const isLocked = !isPremium && t.id !== 'ocean';
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: t.colors.surface,
                        borderColor: themeId === t.id ? t.colors.primary : t.colors.border,
                        borderWidth: themeId === t.id ? 3 : 1,
                        opacity: isLocked ? 0.6 : 1,
                      },
                    ]}
                    onPress={() => {
                      if (isLocked) {
                        showPaywall('theme');
                      } else {
                        setTheme(t.id);
                      }
                    }}
                  >
                    <View style={styles.themePreview}>
                      <View style={[styles.themeColorDot, { backgroundColor: t.colors.primary }]} />
                      <View style={[styles.themeColorDot, { backgroundColor: t.colors.secondary }]} />
                      <View style={[styles.themeColorDot, { backgroundColor: t.colors.accent }]} />
                    </View>
                    <Text style={[styles.themeName, { color: t.colors.text }]}>{t.name}</Text>
                    {themeId === t.id && (
                      <View style={[styles.themeCheck, { backgroundColor: t.colors.primary }]}>
                        <Text style={styles.themeCheckText}>✓</Text>
                      </View>
                    )}
                    {isLocked && (
                      <View style={styles.themeLock}>
                        <Text style={styles.themeLockIcon}>🔒</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => toggleSection('tabs')} activeOpacity={0.7}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Visible Tabs</Text>
            <Text style={[styles.chevron, { color: colors.textLight }]}>
              {expandedSections.tabs ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.tabs && (
          <>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Choose which tabs appear in your navigation bar
            </Text>

            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLabel}>
                <Text style={styles.settingIcon}>😴</Text>
                <Text style={[styles.settingText, { color: colors.text }]}>Sleep Tracker</Text>
              </View>
              <Switch
                value={settings.showSleepTab}
                onValueChange={() => toggleSetting('showSleepTab')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLabel}>
                <Text style={styles.settingIcon}>💪</Text>
                <Text style={[styles.settingText, { color: colors.text }]}>Workout Logger</Text>
              </View>
              <Switch
                value={settings.showWorkoutTab}
                onValueChange={() => toggleSetting('showWorkoutTab')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLabel}>
                <Text style={styles.settingIcon}>🎯</Text>
                <Text style={[styles.settingText, { color: colors.text }]}>Focus Timer</Text>
              </View>
              <Switch
                value={settings.showFocusTab}
                onValueChange={() => toggleSetting('showFocusTab')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLabel}>
                <Text style={styles.settingIcon}>📊</Text>
                <Text style={[styles.settingText, { color: colors.text }]}>Charts & Stats</Text>
              </View>
              <Switch
                value={settings.showChartsTab}
                onValueChange={() => toggleSetting('showChartsTab')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLabel}>
                <Text style={styles.settingIcon}>📋</Text>
                <Text style={[styles.settingText, { color: colors.text }]}>History View</Text>
              </View>
              <Switch
                value={settings.showHistoryTab}
                onValueChange={() => toggleSetting('showHistoryTab')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </>
        )}
      </View>

      {/* Labels Management Section */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => toggleSection('labels')} activeOpacity={0.7}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Labels</Text>
            <Text style={[styles.chevron, { color: colors.textLight }]}>
              {expandedSections.labels ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.labels && (
          <>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Manage labels for categorizing your entries
            </Text>

            {/* Sleep Labels */}
            <View style={styles.labelCategory}>
              <Text style={[styles.labelCategoryTitle, { color: colors.text }]}>Sleep Labels</Text>
              <View style={styles.labelList}>
                {labels.sleep.map((label) => (
                  <View key={label.id} style={[styles.labelItem, { backgroundColor: label.color + '20', borderColor: label.color }]}>
                    <View style={[styles.labelDot, { backgroundColor: label.color }]} />
                    <Text style={[styles.labelName, { color: colors.text }]}>{label.name}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteLabel('sleep', label.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={[styles.labelDelete, { color: colors.error }]}>x</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Workout Labels */}
            <View style={styles.labelCategory}>
              <Text style={[styles.labelCategoryTitle, { color: colors.text }]}>Workout Labels</Text>
              <View style={styles.labelList}>
                {labels.workout.map((label) => (
                  <View key={label.id} style={[styles.labelItem, { backgroundColor: label.color + '20', borderColor: label.color }]}>
                    <View style={[styles.labelDot, { backgroundColor: label.color }]} />
                    <Text style={[styles.labelName, { color: colors.text }]}>{label.name}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteLabel('workout', label.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={[styles.labelDelete, { color: colors.error }]}>x</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Focus Labels */}
            <View style={styles.labelCategory}>
              <Text style={[styles.labelCategoryTitle, { color: colors.text }]}>Focus Labels</Text>
              <View style={styles.labelList}>
                {labels.focus.map((label) => (
                  <View key={label.id} style={[styles.labelItem, { backgroundColor: label.color + '20', borderColor: label.color }]}>
                    <View style={[styles.labelDot, { backgroundColor: label.color }]} />
                    <Text style={[styles.labelName, { color: colors.text }]}>{label.name}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteLabel('focus', label.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={[styles.labelDelete, { color: colors.error }]}>x</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.addLabelButton, { borderColor: colors.primary }]}
              onPress={() => setShowAddLabelModal(true)}
            >
              <Text style={[styles.addLabelButtonText, { color: colors.primary }]}>+ Add Custom Label</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Apple Health Section - iOS only */}
      {Platform.OS === 'ios' && isHealthKitAvailable() && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => toggleSection('appleHealth')} activeOpacity={0.7}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Apple Health</Text>
                {!isPremium && (
                  <View style={[styles.premiumBadge, { backgroundColor: colors.warning + '20' }]}>
                    <Text style={[styles.premiumBadgeText, { color: colors.warning }]}>Premium</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.chevron, { color: colors.textLight }]}>
                {expandedSections.appleHealth ? '▼' : '▶'}
              </Text>
            </View>
          </TouchableOpacity>

          {expandedSections.appleHealth && (
            <>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                {isPremium
                  ? 'Sync workout data with Apple Health for heart rate, calories, and more.'
                  : 'Upgrade to sync workout data with Apple Health.'}
              </Text>

              <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                <View style={styles.settingLabel}>
                  <Text style={styles.settingIcon}>❤️</Text>
                  <Text style={[styles.settingText, { color: colors.text }]}>Connection Status</Text>
                </View>
                <Text style={{ color: healthKitConnected ? colors.success : colors.textLight, fontWeight: '600', fontSize: 14 }}>
                  {healthKitConnected ? 'Connected' : 'Not Connected'}
                </Text>
              </View>

              {healthKitLoading ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : healthKitConnected ? (
                <TouchableOpacity
                  style={[styles.exportButton, styles.exportButtonSecondary, { borderColor: colors.error, backgroundColor: colors.surface }]}
                  onPress={handleDisconnectAppleHealth}
                >
                  <Text style={[styles.exportButtonText, { color: colors.error }]}>Disconnect</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.exportButton, { backgroundColor: isPremium ? colors.primary : colors.textLight }]}
                  onPress={handleConnectAppleHealth}
                >
                  <Text style={[styles.exportButtonText, { color: colors.textOnPrimary }]}>
                    {!isPremium && '🔒 '}Connect Apple Health
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy & Data</Text>

        <TouchableOpacity
          style={[styles.privacyButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation.navigate('Privacy')}
        >
          <Text style={[styles.privacyButtonText, { color: colors.primary }]}>View Privacy Policy</Text>
          <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => toggleSection('export')} activeOpacity={0.7}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Export Your Data</Text>
              {!isPremium && (
                <View style={[styles.premiumBadge, { backgroundColor: colors.warning + '20' }]}>
                  <Text style={[styles.premiumBadgeText, { color: colors.warning }]}>Premium</Text>
                </View>
              )}
            </View>
            <Text style={[styles.chevron, { color: colors.textLight }]}>
              {expandedSections.export ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.export && (
          <>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              {isPremium ? 'Download your data for backup or transfer' : 'Upgrade to export your data'}
            </Text>

            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: isPremium ? colors.primary : colors.textLight }]}
              onPress={handleExportAllData}
            >
              <Text style={[styles.exportButtonText, { color: colors.textOnPrimary }]}>
                {!isPremium && '🔒 '}Export All Data (JSON)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonSecondary, { borderColor: isPremium ? colors.primary : colors.textLight, backgroundColor: colors.surface }]}
              onPress={handleExportCSV}
            >
              <Text style={[styles.exportButtonText, { color: isPremium ? colors.primary : colors.textLight }]}>
                {!isPremium && '🔒 '}Export to CSV
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => toggleSection('import')} activeOpacity={0.7}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Import Data</Text>
              {!isPremium && (
                <View style={[styles.premiumBadge, { backgroundColor: colors.warning + '20' }]}>
                  <Text style={[styles.premiumBadgeText, { color: colors.warning }]}>Premium</Text>
                </View>
              )}
            </View>
            <Text style={[styles.chevron, { color: colors.textLight }]}>
              {expandedSections.import ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.import && (
          <>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              {isPremium ? 'Restore from backup or import from other apps' : 'Upgrade to import your data'}
            </Text>

            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: isPremium ? colors.primary : colors.textLight }]}
              onPress={handleImportJSON}
            >
              <Text style={[styles.exportButtonText, { color: colors.textOnPrimary }]}>
                {!isPremium && '🔒 '}Import from JSON
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonSecondary, { borderColor: isPremium ? colors.primary : colors.textLight, backgroundColor: colors.surface }]}
              onPress={handleImportCSV}
            >
              <Text style={[styles.exportButtonText, { color: isPremium ? colors.primary : colors.textLight }]}>
                {!isPremium && '🔒 '}Import from CSV
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => toggleSection('data')} activeOpacity={0.7}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>
            <Text style={[styles.chevron, { color: colors.textLight }]}>
              {expandedSections.data ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>

        {expandedSections.data && (
          <>
            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: colors.error }]}
              onPress={() => {
                Alert.alert(
                  'Clear All Data',
                  'This will permanently delete all your sleep, workout, and focus logs. This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete All',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const { clearAllData } = require('../services/storage');
                          await clearAllData();
                          Alert.alert('Success', 'All data has been cleared');
                        } catch (error) {
                          Alert.alert('Error', 'Failed to clear data');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.dangerButtonText}>Clear All Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.error, marginTop: 10 }]}
              onPress={() => {
                Alert.alert(
                  'Reset Awards',
                  'This will permanently wipe all your earned badges and personal records. Your logs will not be affected, but you will need to earn every award again from scratch.\n\nThis cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset Awards',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const { resetAchievements } = require('../services/achievements');
                          await resetAchievements();
                          Alert.alert('Done', 'Your awards have been reset. Time to earn them back.');
                        } catch (error) {
                          Alert.alert('Error', 'Failed to reset awards');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={[styles.dangerButtonText, { color: colors.error }]}>Reset Awards</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <TouchableOpacity style={[styles.resetButton, { borderColor: colors.primary, backgroundColor: colors.surface }]} onPress={resetToDefaults}>
          <Text style={[styles.resetButtonText, { color: colors.primary }]}>Reset Settings to Default</Text>
        </TouchableOpacity>
      </View>

      {/* DEV ONLY - Remove before production */}
      {__DEV__ && (
        <View style={[styles.section, styles.devSection, { backgroundColor: colors.error + '10', borderColor: colors.error }]}>
          <Text style={[styles.sectionTitle, { color: colors.error }]}>Developer Tools</Text>
          <Text style={[styles.sectionDescription, { color: colors.error }]}>
            This section is only visible in development
          </Text>

          <View style={styles.devButtons}>
            <TouchableOpacity
              style={[styles.devButton, { backgroundColor: colors.success }]}
              onPress={async () => {
                await grantPremium('monthly');
                refreshPremiumStatus();
                Alert.alert('Premium Granted', 'Monthly subscription activated');
              }}
            >
              <Text style={styles.devButtonText}>Grant Premium</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.devButton, { backgroundColor: colors.error }]}
              onPress={async () => {
                await revokePremium();
                refreshPremiumStatus();
                Alert.alert('Premium Revoked', 'Back to free tier');
              }}
            >
              <Text style={styles.devButtonText}>Revoke Premium</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>LogWell v1.0</Text>
        <Text style={[styles.footerSubtext, { color: colors.textLight }]}>Track • Analyze • Improve</Text>
      </View>

      {/* Add Label Modal */}
      <Modal
        visible={showAddLabelModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAddLabelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Label</Text>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.categoryPicker}>
              {['sleep', 'workout', 'focus'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    {
                      backgroundColor: newLabelCategory === cat ? colors.primary : colors.surfaceSecondary,
                      borderColor: newLabelCategory === cat ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setNewLabelCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      { color: newLabelCategory === cat ? '#fff' : colors.text },
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Label Name</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Enter label name"
              placeholderTextColor={colors.textLight}
              value={newLabelName}
              onChangeText={setNewLabelName}
            />

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Color</Text>
            <View style={styles.colorPicker}>
              {LABEL_COLORS.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c.color },
                    newLabelColor === c.color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewLabelColor(c.color)}
                >
                  {newLabelColor === c.color && (
                    <Text style={styles.colorCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setNewLabelName('');
                  setNewLabelColor(LABEL_COLORS[0].color);
                  setShowAddLabelModal(false);
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateButton, { backgroundColor: colors.primary }]}
                onPress={handleAddLabel}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Export function to get current settings
export const getSettings = async () => {
  try {
    const saved = await AsyncStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 32,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#999',
  },
  privacyButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  privacyButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '300',
  },
  exportButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  exportButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  exportButtonSecondaryText: {
    color: '#007AFF',
  },
  premiumBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#667eea',
  },
  premiumBannerIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  premiumBannerText: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  premiumBannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  premiumBannerChevron: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
  premiumActiveBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumActiveIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  premiumActiveText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  themeOption: {
    width: '47%',
    padding: 12,
    borderRadius: 12,
    position: 'relative',
  },
  themePreview: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  themeColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  themeDesc: {
    fontSize: 11,
  },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCheckText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  themeLock: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  themeLockIcon: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    fontSize: 12,
  },
  premiumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  devSection: {
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  devButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  devButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  devButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Labels styles
  labelCategory: {
    marginBottom: 16,
  },
  labelCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  labelList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  labelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  labelName: {
    fontSize: 13,
  },
  labelDelete: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  addLabelButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 8,
  },
  addLabelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  categoryPicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryOption: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  colorCheckmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalCreateButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
