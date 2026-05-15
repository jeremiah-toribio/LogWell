import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { saveSleepLog } from '../services/storage';
import { calculateSleepDuration } from '../services/calculations';
import { useTheme } from '../theme/ThemeContext';
import LabelPicker from '../components/LabelPicker';
import RatingPicker from '../components/RatingPicker';

export default function SleepTimerScreen({ navigation }) {
  const { colors } = useTheme();
  const [isTracking, setIsTracking] = useState(false);
  const [sleepStartTime, setSleepStartTime] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [editedSleepTime, setEditedSleepTime] = useState(new Date());
  const [editedWakeTime, setEditedWakeTime] = useState(new Date());
  const [showSleepTimePicker, setShowSleepTimePicker] = useState(false);
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [effectivenessRating, setEffectivenessRating] = useState('');

  const handleStartSleep = () => {
    const now = new Date();
    setSleepStartTime(now);
    setIsTracking(true);
    Alert.alert('Sleep Timer Started', 'Good night! Tap "Wake Up" when you wake up.');
  };

  const handleWakeUp = () => {
    const wakeUpTime = new Date();
    setEditedSleepTime(sleepStartTime);
    setEditedWakeTime(wakeUpTime);
    setShowValidationModal(true);
  };

  const handleSaveAfterValidation = async () => {
    try {
      const yesterday = new Date(editedSleepTime);
      const today = new Date(editedWakeTime);

      const startDateStr = `${String(yesterday.getMonth() + 1).padStart(2, '0')}/${String(yesterday.getDate()).padStart(2, '0')}`;
      const endDateStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
      const dateRange = `${startDateStr} + ${endDateStr}`;

      const sleepTimeStr = `${String(editedSleepTime.getHours()).padStart(2, '0')}:${String(editedSleepTime.getMinutes()).padStart(2, '0')}`;
      const wakeTimeStr = `${String(editedWakeTime.getHours()).padStart(2, '0')}:${String(editedWakeTime.getMinutes()).padStart(2, '0')}`;

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
      Alert.alert('Success', `Sleep log saved! Duration: ${duration.hours}h ${duration.minutes}m`);

      setShowValidationModal(false);
      setIsTracking(false);
      setSleepStartTime(null);
      setSelectedLabel(null);
      setEffectivenessRating('');
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error', 'Failed to save sleep log');
      console.error(error);
    }
  };

  const formatTimeDisplay = (date) => {
    if (!date) return '--:--';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatDateDisplay = (date) => {
    if (!date) return '--/--';
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {!isTracking ? (
        <View style={styles.centerContent}>
          <Text style={[styles.instruction, { color: colors.textSecondary }]}>
            Tap the button when you're going to sleep
          </Text>
          <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.success }]} onPress={handleStartSleep}>
            <Text style={styles.startButtonText}>Start Sleep</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.manualEntryButton, { borderColor: colors.primary }]}
            onPress={() => navigation.navigate('SleepLog')}
          >
            <Text style={[styles.manualEntryText, { color: colors.primary }]}>Manual Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.centerContent}>
          <Text style={[styles.trackingText, { color: colors.textSecondary }]}>Sleep tracking started at:</Text>
          <Text style={[styles.timeText, { color: colors.success }]}>{formatTimeDisplay(sleepStartTime)}</Text>
          <Text style={[styles.dateText, { color: colors.textLight }]}>{formatDateDisplay(sleepStartTime)}</Text>

          <TouchableOpacity style={[styles.wakeButton, { backgroundColor: colors.warning }]} onPress={handleWakeUp}>
            <Text style={styles.wakeButtonText}>Wake Up</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showValidationModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Save Sleep Log</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Sleep Time</Text>
                {Platform.OS === 'ios' ? (
                  <View style={[styles.iosPickerPill, { backgroundColor: colors.surfaceSecondary, alignSelf: 'center' }]}>
                    <DateTimePicker
                      value={editedSleepTime}
                      mode="time"
                      display="compact"
                      onChange={(event, time) => { if (time) setEditedSleepTime(time); }}
                      accentColor={colors.primary}
                      themeVariant={colors.background === '#0F172A' || colors.background === '#18181B' ? 'dark' : 'light'}
                    />
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                      onPress={() => setShowSleepTimePicker(true)}
                    >
                      <Text style={{ color: colors.text }}>{formatTimeDisplay(editedSleepTime)}</Text>
                    </TouchableOpacity>
                    {showSleepTimePicker && (
                      <DateTimePicker
                        value={editedSleepTime}
                        mode="time"
                        onChange={(event, time) => {
                          setShowSleepTimePicker(false);
                          if (time) setEditedSleepTime(time);
                        }}
                      />
                    )}
                  </>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Wake Time</Text>
                {Platform.OS === 'ios' ? (
                  <View style={[styles.iosPickerPill, { backgroundColor: colors.surfaceSecondary, alignSelf: 'center' }]}>
                    <DateTimePicker
                      value={editedWakeTime}
                      mode="time"
                      display="compact"
                      onChange={(event, time) => { if (time) setEditedWakeTime(time); }}
                      accentColor={colors.primary}
                      themeVariant={colors.background === '#0F172A' || colors.background === '#18181B' ? 'dark' : 'light'}
                    />
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                      onPress={() => setShowWakeTimePicker(true)}
                    >
                      <Text style={{ color: colors.text }}>{formatTimeDisplay(editedWakeTime)}</Text>
                    </TouchableOpacity>
                    {showWakeTimePicker && (
                      <DateTimePicker
                        value={editedWakeTime}
                        mode="time"
                        onChange={(event, time) => {
                          setShowWakeTimePicker(false);
                          if (time) setEditedWakeTime(time);
                        }}
                      />
                    )}
                  </>
                )}
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

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowValidationModal(false);
                    setSelectedLabel(null);
                    setEffectivenessRating('');
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveAfterValidation}
                >
                  <Text style={styles.confirmButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instruction: {
    fontSize: 18,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 48,
    paddingVertical: 24,
    borderRadius: 16,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  manualEntryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  manualEntryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  trackingText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 20,
    color: '#888',
    marginBottom: 48,
  },
  wakeButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 48,
    paddingVertical: 24,
    borderRadius: 16,
  },
  wakeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
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
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  iosPickerPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
