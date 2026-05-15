import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { saveWorkoutLog } from '../services/storage';
import { formatDate } from '../utils/dateHelpers';
import RatingPicker from '../components/RatingPicker';
import LabelPicker from '../components/LabelPicker';
import LimitBanner from '../components/LimitBanner';
import ExercisePicker from '../components/ExercisePicker';
import { useTheme } from '../theme/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import HealthKitMatchModal from '../components/HealthKitMatchModal';
import RestTimerModal from '../components/RestTimerModal';
import AchievementModal from '../components/AchievementModal';
import { checkWorkoutAchievements } from '../services/achievements';
import {
  isHealthKitAvailable,
  isHealthKitConnected,
  initializeHealthKit,
  findMatchingWorkouts,
  getWorkoutHealthData,
} from '../services/healthKit';

export default function WorkoutLogScreen({ navigation }) {
  const { colors } = useTheme();
  const { isPremium, weeklyRecords, checkCanAddRecord, refreshPremiumStatus } = usePremium();
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [effectivenessRating, setEffectivenessRating] = useState('');
  const [selectedLabel, setSelectedLabel] = useState(null);

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [showAchievements, setShowAchievements] = useState(false);

  // HealthKit integration state
  const [healthKitEnabled, setHealthKitEnabled] = useState(false);
  const [showHealthKitModal, setShowHealthKitModal] = useState(false);
  const [healthKitMatches, setHealthKitMatches] = useState([]);
  const [healthKitLoading, setHealthKitLoading] = useState(false);
  const [pendingWorkoutLog, setPendingWorkoutLog] = useState(null);

  // Initialize HealthKit on mount only if user has opted in
  useEffect(() => {
    const initHealth = async () => {
      if (Platform.OS === 'ios' && isHealthKitAvailable()) {
        const connected = await isHealthKitConnected();
        if (!connected) return;
        try {
          const result = await initializeHealthKit();
          setHealthKitEnabled(result.available);
        } catch (error) {
          console.log('HealthKit init failed:', error);
        }
      }
    };
    initHealth();
  }, []);

  const createEmptyExercise = () => ({
    name: '',
    target: '',
    weight: '',
    sets: '',
    reps: '',
    notes: '',
    trackSets: false,
    setDetails: [{ weight: '', reps: '', notes: '' }],
  });

  const [exercises, setExercises] = useState([createEmptyExercise()]);

  const addExercise = () => {
    setExercises([...exercises, createEmptyExercise()]);
  };

  const removeExercise = (index) => {
    const updated = exercises.filter((_, i) => i !== index);
    setExercises(updated.length > 0 ? updated : [createEmptyExercise()]);
  };

  const updateExercise = (index, field, value) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

  const toggleTrackSets = (index) => {
    const updated = [...exercises];
    updated[index].trackSets = !updated[index].trackSets;
    // Initialize with one set if enabling
    if (updated[index].trackSets && updated[index].setDetails.length === 0) {
      updated[index].setDetails = [{ weight: '', reps: '', notes: '' }];
    }
    setExercises(updated);
  };

  const addSet = (exerciseIndex) => {
    const updated = [...exercises];
    updated[exerciseIndex].setDetails.push({
      weight: '',
      reps: '',
      notes: ''
    });
    setExercises(updated);
  };

  const removeSet = (exerciseIndex, setIndex) => {
    const updated = [...exercises];
    if (updated[exerciseIndex].setDetails.length > 1) {
      updated[exerciseIndex].setDetails = updated[exerciseIndex].setDetails.filter((_, i) => i !== setIndex);
      setExercises(updated);
    }
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const updated = [...exercises];
    updated[exerciseIndex].setDetails[setIndex][field] = value;
    setExercises(updated);
  };

  // Build workout log object
  const buildWorkoutLog = () => {
    const validExercises = exercises.filter(ex => ex.name.trim() !== '');
    return {
      date: date.toISOString(),
      exercises: validExercises.map(ex => {
        if (ex.trackSets) {
          const validSets = ex.setDetails.filter(s => s.weight || s.reps);
          return {
            name: ex.name,
            target: ex.target || '',
            trackSets: true,
            sets: validSets.map(s => ({
              weight: s.weight || 'BW',
              reps: parseInt(s.reps) || 0,
              notes: s.notes || '',
            })),
          };
        } else {
          return {
            name: ex.name,
            target: ex.target || '',
            trackSets: false,
            weight: ex.weight || 'BW',
            sets: parseInt(ex.sets) || 0,
            reps: parseInt(ex.reps) || 0,
            notes: ex.notes || '',
          };
        }
      }),
      effectivenessRating: effectivenessRating ? parseInt(effectivenessRating) : null,
      label: selectedLabel ? { id: selectedLabel.id, name: selectedLabel.name, color: selectedLabel.color } : null,
      createdAt: new Date().toISOString(),
    };
  };

  // Save workout with optional health data
  const saveWorkout = async (workoutLog, healthData = null) => {
    try {
      const finalLog = {
        ...workoutLog,
        healthData: healthData ? {
          linked: true,
          heartRate: healthData.heartRate,
          calories: healthData.calories,
          linkedAt: new Date().toISOString(),
        } : null,
      };

      await saveWorkoutLog(finalLog);
      await refreshPremiumStatus();

      const badges = await checkWorkoutAchievements(finalLog);
      if (badges.length > 0) {
        setEarnedBadges(badges);
        setShowAchievements(true);
      } else {
        const healthMessage = healthData?.hasHealthData ? '\n\nApple Health data linked!' : '';
        Alert.alert('Success', `Workout log saved!${healthMessage}`);
      }

      // Reset form
      setExercises([createEmptyExercise()]);
      setDate(new Date());
      setEffectivenessRating('');
      setSelectedLabel(null);
      setPendingWorkoutLog(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout log');
      console.error(error);
    }
  };

  // Handle selecting a HealthKit match
  const handleSelectMatch = async (match) => {
    setHealthKitLoading(true);
    try {
      const healthData = await getWorkoutHealthData(match.startDate, match.endDate);
      setShowHealthKitModal(false);
      await saveWorkout(pendingWorkoutLog, healthData);
    } catch (error) {
      console.error('Error fetching health data:', error);
      setShowHealthKitModal(false);
      await saveWorkout(pendingWorkoutLog, null);
    }
    setHealthKitLoading(false);
  };

  // Handle skipping HealthKit matching
  const handleSkipHealthKit = async () => {
    setShowHealthKitModal(false);
    await saveWorkout(pendingWorkoutLog, null);
  };

  const handleSave = async () => {
    // Check if user can add more records (premium check)
    const canAdd = await checkCanAddRecord();
    if (!canAdd) {
      return; // Paywall will be shown automatically
    }

    const validExercises = exercises.filter(ex => ex.name.trim() !== '');

    if (validExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    const workoutLog = buildWorkoutLog();

    // Check for HealthKit matches if available
    if (healthKitEnabled && isPremium) {
      setHealthKitLoading(true);
      try {
        const matches = await findMatchingWorkouts(date, 120); // 2 hour tolerance
        if (matches.length > 0) {
          setPendingWorkoutLog(workoutLog);
          setHealthKitMatches(matches);
          setHealthKitLoading(false);
          setShowHealthKitModal(true);
          return;
        }
      } catch (error) {
        console.log('HealthKit match check failed:', error);
      }
      setHealthKitLoading(false);
    }

    // Save without health data
    await saveWorkout(workoutLog, null);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <LimitBanner />

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
        {Platform.OS === 'ios' ? (
          <View style={[styles.iosPickerPill, { backgroundColor: colors.surface }]}>
            <DateTimePicker
              value={date}
              mode="date"
              display="compact"
              onChange={(event, selectedDate) => { if (selectedDate) setDate(selectedDate); }}
              accentColor={colors.primary}
              themeVariant={colors.background === '#0F172A' || colors.background === '#18181B' ? 'dark' : 'light'}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: colors.text }}>{formatDate(date)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
          </>
        )}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Exercises</Text>
        <TouchableOpacity
          style={[styles.timerIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowRestTimer(true)}
        >
          <Text style={styles.timerIconText}>⏱</Text>
        </TouchableOpacity>
      </View>

      {exercises.map((exercise, index) => (
        <View key={index} style={[styles.exerciseCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <View style={styles.exerciseHeader}>
            <Text style={[styles.exerciseNumber, { color: colors.text }]}>Exercise {index + 1}</Text>
            {exercises.length > 1 && (
              <TouchableOpacity onPress={() => removeExercise(index)}>
                <Text style={[styles.removeButton, { color: colors.error }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <ExercisePicker
            selectedExercise={exercise.name}
            onSelectExercise={(name) => updateExercise(index, 'name', name)}
            onTargetChange={(target) => updateExercise(index, 'target', target)}
            placeholder="Select or add exercise"
          />

          <View style={{ height: 12 }} />

          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
            placeholder="Target (e.g., Chest, Legs)"
            placeholderTextColor={colors.textLight}
            value={exercise.target}
            onChangeText={(text) => updateExercise(index, 'target', text)}
          />

          {/* Track Sets Toggle */}
          <View style={[styles.trackSetsToggle, { borderColor: colors.border }]}>
            <View style={styles.trackSetsInfo}>
              <Text style={[styles.trackSetsLabel, { color: colors.text }]}>Track individual sets</Text>
              <Text style={[styles.trackSetsHint, { color: colors.textLight }]}>
                Log weight/reps per set
              </Text>
            </View>
            <Switch
              value={exercise.trackSets}
              onValueChange={() => toggleTrackSets(index)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={exercise.trackSets ? colors.primaryLight : '#f4f3f4'}
            />
          </View>

          {!exercise.trackSets ? (
            /* Simple Mode - Overall sets/reps */
            <>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                  placeholder="Weight (e.g., 135, BW)"
                  placeholderTextColor={colors.textLight}
                  value={exercise.weight}
                  onChangeText={(text) => updateExercise(index, 'weight', text)}
                />
                <TextInput
                  style={[styles.input, styles.halfInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                  placeholder="Sets"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={exercise.sets}
                  onChangeText={(text) => updateExercise(index, 'sets', text)}
                />
              </View>

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                  placeholder="Reps"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={exercise.reps}
                  onChangeText={(text) => updateExercise(index, 'reps', text)}
                />
                <TextInput
                  style={[styles.input, styles.halfInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                  placeholder="Notes (optional)"
                  placeholderTextColor={colors.textLight}
                  value={exercise.notes}
                  onChangeText={(text) => updateExercise(index, 'notes', text)}
                />
              </View>
            </>
          ) : (
            /* Detailed Mode - Per-set tracking */
            <View style={styles.setsContainer}>
              {exercise.setDetails.map((set, setIndex) => (
                <View key={setIndex} style={[styles.setRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.setNumber, { color: colors.primary }]}>{setIndex + 1}</Text>
                  <TextInput
                    style={[styles.setInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="Weight"
                    placeholderTextColor={colors.textLight}
                    value={set.weight}
                    onChangeText={(text) => updateSet(index, setIndex, 'weight', text)}
                  />
                  <TextInput
                    style={[styles.setInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="Reps"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={set.reps}
                    onChangeText={(text) => updateSet(index, setIndex, 'reps', text)}
                  />
                  <TextInput
                    style={[styles.setInput, styles.setNotesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="Notes"
                    placeholderTextColor={colors.textLight}
                    value={set.notes}
                    onChangeText={(text) => updateSet(index, setIndex, 'notes', text)}
                  />
                  {exercise.setDetails.length > 1 && (
                    <TouchableOpacity onPress={() => removeSet(index, setIndex)} style={styles.removeSetButton}>
                      <Text style={[styles.removeSetText, { color: colors.error }]}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addSetButton, { borderColor: colors.primary }]}
                onPress={() => addSet(index)}
              >
                <Text style={[styles.addSetText, { color: colors.primary }]}>+ Add Set</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.button, styles.addButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
        onPress={addExercise}
      >
        <Text style={[styles.addButtonText, { color: colors.primary }]}>+ Add Exercise</Text>
      </TouchableOpacity>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Label <Text style={[styles.optionalText, { color: colors.textLight }]}>(Optional)</Text>
        </Text>
        <LabelPicker
          category="workout"
          selectedLabel={selectedLabel}
          onSelectLabel={setSelectedLabel}
          placeholder="Add a label to categorize this workout"
        />
      </View>

      <RatingPicker
        label="Workout Quality (Optional)"
        value={effectivenessRating}
        onValueChange={setEffectivenessRating}
        placeholder="Rate workout effectiveness"
      />

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave}>
        <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>Save Workout</Text>
      </TouchableOpacity>

      {/* HealthKit integration banner */}
      {healthKitEnabled && isPremium && (
        <View style={[styles.healthKitBanner, { backgroundColor: colors.success + '15', borderColor: colors.success }]}>
          <Text style={styles.healthKitIcon}>❤️</Text>
          <Text style={[styles.healthKitText, { color: colors.success }]}>
            Apple Health integration active
          </Text>
        </View>
      )}

      <AchievementModal
        visible={showAchievements}
        badges={earnedBadges}
        onClose={() => setShowAchievements(false)}
      />

      {/* Rest Timer Modal */}
      <RestTimerModal
        visible={showRestTimer}
        onClose={() => setShowRestTimer(false)}
      />

      {/* HealthKit Match Modal */}
      <HealthKitMatchModal
        visible={showHealthKitModal}
        onClose={() => setShowHealthKitModal(false)}
        matches={healthKitMatches}
        onSelectMatch={handleSelectMatch}
        onSkip={handleSkipHealthKit}
        loading={healthKitLoading}
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
    marginBottom: 12,
  },
  iosPickerPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#555',
  },
  timerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerIconText: {
    fontSize: 18,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  removeButton: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  trackSetsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  trackSetsInfo: {
    flex: 1,
  },
  trackSetsLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  trackSetsHint: {
    fontSize: 11,
    marginTop: 2,
  },
  setsContainer: {
    marginTop: 4,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 20,
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 14,
  },
  setNotesInput: {
    flex: 1.5,
  },
  removeSetButton: {
    padding: 4,
  },
  removeSetText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  addSetButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 4,
  },
  addSetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
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
  healthKitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 32,
    gap: 8,
  },
  healthKitIcon: {
    fontSize: 16,
  },
  healthKitText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
