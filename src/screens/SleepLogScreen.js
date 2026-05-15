import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { saveSleepLog } from '../services/storage';
import { calculateSleepDuration } from '../services/calculations';
import { formatDate, formatTime } from '../utils/dateHelpers';
import RatingPicker from '../components/RatingPicker';
import LabelPicker from '../components/LabelPicker';
import LimitBanner from '../components/LimitBanner';
import { useTheme } from '../theme/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import AchievementModal from '../components/AchievementModal';
import { checkSleepAchievements } from '../services/achievements';

export default function SleepLogScreen({ navigation }) {
  const { colors } = useTheme();
  const { isPremium, weeklyRecords, checkCanAddRecord, refreshPremiumStatus } = usePremium();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000));
  const [sleepTime, setSleepTime] = useState(new Date());
  const [wakeTime, setWakeTime] = useState(new Date());
  const [effectivenessRating, setEffectivenessRating] = useState('');
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showSleepTimePicker, setShowSleepTimePicker] = useState(false);
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [showAchievements, setShowAchievements] = useState(false);

  // Auto-populate end date when start date changes
  useEffect(() => {
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setEndDate(nextDay);
  }, [startDate]);

  const handleSave = async () => {
    // Check if user can add more records (premium check)
    const canAdd = await checkCanAddRecord();
    if (!canAdd) {
      return; // Paywall will be shown automatically
    }

    try {
      const dateRange = `${formatDate(startDate)} + ${formatDate(endDate)}`;
      const sleepTimeStr = formatTime(sleepTime);
      const wakeTimeStr = formatTime(wakeTime);

      const duration = calculateSleepDuration(sleepTimeStr, wakeTimeStr, dateRange);

      const sleepLog = {
        dateRange,
        sleepTime: sleepTimeStr,
        wakeTime: wakeTimeStr,
        totalHours: duration.totalHours,
        effectivenessRating: effectivenessRating ? parseInt(effectivenessRating) : null,
        label: selectedLabel ? { id: selectedLabel.id, name: selectedLabel.name, color: selectedLabel.color } : null,
        createdAt: new Date().toISOString(),
      };

      await saveSleepLog(sleepLog);
      await refreshPremiumStatus();

      const badges = await checkSleepAchievements(sleepLog);
      if (badges.length > 0) {
        setEarnedBadges(badges);
        setShowAchievements(true);
      } else {
        Alert.alert('Success', `Sleep log saved! Duration: ${duration.hours}h ${duration.minutes}m`);
      }

      setStartDate(new Date());
      setEndDate(new Date(Date.now() + 86400000));
      setSleepTime(new Date());
      setWakeTime(new Date());
      setEffectivenessRating('');
      setSelectedLabel(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to save sleep log');
      console.error(error);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <LimitBanner />

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Sleep Date Range</Text>
        {Platform.OS === 'ios' ? (
          <View style={styles.iosDateRangeRow}>
            <View style={[styles.iosPickerPill, { backgroundColor: colors.surface }]}>
              <DateTimePicker
                value={startDate}
                mode="date"
                display="compact"
                onChange={(event, date) => { if (date) setStartDate(date); }}
                accentColor={colors.primary}
                themeVariant={colors.background === '#0F172A' || colors.background === '#18181B' ? 'dark' : 'light'}
              />
            </View>
            <Text style={[styles.dateSeparator, { color: colors.textLight }]}>→</Text>
            <View style={[styles.iosPickerPill, { backgroundColor: colors.surface }]}>
              <DateTimePicker
                value={endDate}
                mode="date"
                display="compact"
                onChange={(event, date) => { if (date) setEndDate(date); }}
                accentColor={colors.primary}
                themeVariant={colors.background === '#0F172A' || colors.background === '#18181B' ? 'dark' : 'light'}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.dateRangeContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(startDate)}</Text>
            </TouchableOpacity>
            <Text style={[styles.dateSeparator, { color: colors.textLight }]}>→</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(endDate)}</Text>
            </TouchableOpacity>
          </View>
        )}
        {Platform.OS === 'android' && showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            onChange={(event, date) => {
              setShowStartDatePicker(false);
              if (date) setStartDate(date);
            }}
          />
        )}
        {Platform.OS === 'android' && showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            onChange={(event, date) => {
              setShowEndDatePicker(false);
              if (date) setEndDate(date);
            }}
          />
        )}
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeInputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary, textAlign: 'center' }]}>Sleep Time</Text>
          {Platform.OS === 'ios' ? (
            <View style={[styles.iosPickerPill, { backgroundColor: colors.surface }]}>
              <DateTimePicker
                value={sleepTime}
                mode="time"
                display="compact"
                onChange={(event, time) => { if (time) setSleepTime(time); }}
                accentColor={colors.primary}
                themeVariant={colors.background === '#0F172A' || colors.background === '#18181B' ? 'dark' : 'light'}
              />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowSleepTimePicker(true)}
              >
                <Text style={[styles.timeText, { color: colors.text }]}>{formatTime(sleepTime)}</Text>
              </TouchableOpacity>
              {showSleepTimePicker && (
                <DateTimePicker
                  value={sleepTime}
                  mode="time"
                  onChange={(event, time) => {
                    setShowSleepTimePicker(false);
                    if (time) setSleepTime(time);
                  }}
                />
              )}
            </>
          )}
        </View>

        <View style={styles.timeInputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary, textAlign: 'center' }]}>Wake Time</Text>
          {Platform.OS === 'ios' ? (
            <View style={[styles.iosPickerPill, { backgroundColor: colors.surface }]}>
              <DateTimePicker
                value={wakeTime}
                mode="time"
                display="compact"
                onChange={(event, time) => { if (time) setWakeTime(time); }}
                accentColor={colors.primary}
                themeVariant={colors.background === '#0F172A' || colors.background === '#18181B' ? 'dark' : 'light'}
              />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowWakeTimePicker(true)}
              >
                <Text style={[styles.timeText, { color: colors.text }]}>{formatTime(wakeTime)}</Text>
              </TouchableOpacity>
              {showWakeTimePicker && (
                <DateTimePicker
                  value={wakeTime}
                  mode="time"
                  onChange={(event, time) => {
                    setShowWakeTimePicker(false);
                    if (time) setWakeTime(time);
                  }}
                />
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Label <Text style={[styles.optionalText, { color: colors.textLight }]}>(Optional)</Text>
        </Text>
        <LabelPicker
          category="sleep"
          selectedLabel={selectedLabel}
          onSelectLabel={setSelectedLabel}
          placeholder="Add a label to categorize this sleep"
        />
      </View>

      <RatingPicker
        label="Sleep Quality (Optional)"
        value={effectivenessRating}
        onValueChange={setEffectivenessRating}
        placeholder="Rate your sleep quality"
      />

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave}>
        <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>Save Sleep Log</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
        onPress={() => navigation.navigate('SleepTimer')}
      >
        <Text style={[styles.buttonText, { color: colors.primary }]}>
          Use Timer Instead
        </Text>
      </TouchableOpacity>

      <AchievementModal
        visible={showAchievements}
        badges={earnedBadges}
        onClose={() => setShowAchievements(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  optionalText: {
    fontSize: 12,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 4,
  },
  dateInput: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dateSeparator: {
    fontSize: 18,
    color: '#999',
    paddingHorizontal: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeInputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  timeText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  iosDateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iosPickerPill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  limitBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  limitText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
