import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getSleepLogs,
  getWorkoutLogs,
  getFocusLogs,
  deleteSleepLog,
  deleteWorkoutLog,
  deleteFocusLog,
  updateSleepLog,
  updateWorkoutLog,
  updateFocusLog,
} from '../services/storage';
import { useTheme } from '../theme/ThemeContext';
import { formatDate, formatTime, formatHoursToHMM } from '../utils/dateHelpers';
import { calculateSleepDuration } from '../services/calculations';
import RatingPicker from '../components/RatingPicker';
import { getEarnedAchievements, getBadgesForLog } from '../services/achievements';
import AchievementBadge from '../components/AchievementBadge';

export default function ListViewScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('sleep');
  const [sleepLogs, setSleepLogs] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [focusLogs, setFocusLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [earnedAchievements, setEarnedAchievements] = useState([]);
  const [expandedWorkouts, setExpandedWorkouts] = useState({});
  const [expandedFocus, setExpandedFocus] = useState({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [editingExercises, setEditingExercises] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Sleep edit state
  const [sleepStartDate, setSleepStartDate] = useState(new Date());
  const [sleepTime, setSleepTime] = useState(new Date());
  const [wakeTime, setWakeTime] = useState(new Date());
  const [showSleepDatePicker, setShowSleepDatePicker] = useState(false);
  const [showSleepTimePicker, setShowSleepTimePicker] = useState(false);
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [isApproximateTime, setIsApproximateTime] = useState(false);

  const loadData = async () => {
    try {
      const sleep = await getSleepLogs();
      const workout = await getWorkoutLogs();
      const focus = await getFocusLogs();

      setSleepLogs(sleep.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setWorkoutLogs(workout.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setFocusLogs(focus.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      const earned = await getEarnedAchievements();
      setEarnedAchievements(earned);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleWorkoutExpanded = (id) => {
    setExpandedWorkouts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleFocusExpanded = (id) => {
    setExpandedFocus(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDelete = (type, id, displayName) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete this ${type} log${displayName ? ` (${displayName})` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'sleep') {
                await deleteSleepLog(id);
              } else if (type === 'workout') {
                await deleteWorkoutLog(id);
              } else if (type === 'focus') {
                await deleteFocusLog(id);
              }
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (type, log) => {
    setEditingType(type);
    setEditingLog({ ...log });

    if (type === 'sleep') {
      // Parse dateRange "MM/DD + MM/DD" to get start date
      const dateRangeParts = log.dateRange?.split(' + ') || [];
      const currentYear = new Date().getFullYear();
      if (dateRangeParts[0]) {
        const [month, day] = dateRangeParts[0].split('/');
        setSleepStartDate(new Date(currentYear, parseInt(month) - 1, parseInt(day)));
      } else {
        setSleepStartDate(new Date());
      }

      // Parse sleep and wake times "HH:MM"
      const sleepParts = log.sleepTime?.split(':') || ['22', '00'];
      const wakeParts = log.wakeTime?.split(':') || ['07', '00'];

      const sleepDate = new Date();
      sleepDate.setHours(parseInt(sleepParts[0]), parseInt(sleepParts[1]), 0);
      setSleepTime(sleepDate);

      const wakeDate = new Date();
      wakeDate.setHours(parseInt(wakeParts[0]), parseInt(wakeParts[1]), 0);
      setWakeTime(wakeDate);

      setIsApproximateTime(log.isApproximate || false);
    }

    if (type === 'workout' && log.exercises) {
      setEditingExercises(log.exercises.map(ex => {
        // Check if this exercise uses set mode (sets is an array)
        const isSetMode = Array.isArray(ex.sets);

        if (isSetMode) {
          return {
            name: ex.name || '',
            target: ex.target || '',
            trackSets: true,
            setDetails: ex.sets.map(set => ({
              weight: String(set.weight || ''),
              reps: String(set.reps || ''),
              notes: set.notes || '',
            })),
            // Simple mode fields (not used but needed for structure)
            weight: '',
            sets: '',
            reps: '',
            notes: ex.notes || '',
          };
        } else {
          return {
            name: ex.name || '',
            target: ex.target || '',
            trackSets: false,
            setDetails: [{ weight: '', reps: '', notes: '' }],
            weight: String(ex.weight || ''),
            sets: String(ex.sets || ''),
            reps: String(ex.reps || ''),
            notes: ex.notes || '',
          };
        }
      }));
    }
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (editingType === 'sleep') {
        // Calculate end date (next day from start date)
        const endDate = new Date(sleepStartDate);
        endDate.setDate(endDate.getDate() + 1);

        const dateRange = `${formatDate(sleepStartDate)} + ${formatDate(endDate)}`;
        const sleepTimeStr = formatTime(sleepTime);
        const wakeTimeStr = formatTime(wakeTime);

        const duration = calculateSleepDuration(sleepTimeStr, wakeTimeStr, dateRange);

        const updatedSleep = {
          ...editingLog,
          dateRange,
          sleepTime: sleepTimeStr,
          wakeTime: wakeTimeStr,
          totalHours: duration.totalHours,
          isApproximate: isApproximateTime,
        };
        await updateSleepLog(editingLog.id, updatedSleep);
      } else if (editingType === 'workout') {
        const validExercises = editingExercises.filter(ex => ex.name.trim() !== '');
        if (validExercises.length === 0) {
          Alert.alert('Error', 'Please add at least one exercise');
          return;
        }
        const updatedWorkout = {
          ...editingLog,
          exercises: validExercises.map(ex => {
            if (ex.trackSets) {
              // Set mode: save sets as array
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
              // Simple mode
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
        };
        await updateWorkoutLog(editingLog.id, updatedWorkout);
      } else if (editingType === 'focus') {
        await updateFocusLog(editingLog.id, editingLog);
      }
      closeEditModal();
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const createEmptyExercise = () => ({
    name: '',
    target: '',
    trackSets: false,
    setDetails: [{ weight: '', reps: '', notes: '' }],
    weight: '',
    sets: '',
    reps: '',
    notes: '',
  });

  const addEditingExercise = () => {
    setEditingExercises([...editingExercises, createEmptyExercise()]);
  };

  const removeEditingExercise = (index) => {
    const updated = editingExercises.filter((_, i) => i !== index);
    setEditingExercises(updated.length > 0 ? updated : [createEmptyExercise()]);
  };

  const updateEditingExercise = (index, field, value) => {
    const updated = [...editingExercises];
    updated[index][field] = value;
    setEditingExercises(updated);
  };

  const toggleEditingExerciseTrackSets = (index) => {
    const updated = [...editingExercises];
    updated[index].trackSets = !updated[index].trackSets;
    if (updated[index].trackSets && (!updated[index].setDetails || updated[index].setDetails.length === 0)) {
      updated[index].setDetails = [{ weight: '', reps: '', notes: '' }];
    }
    setEditingExercises(updated);
  };

  const addEditingSet = (exerciseIndex) => {
    const updated = [...editingExercises];
    updated[exerciseIndex].setDetails.push({ weight: '', reps: '', notes: '' });
    setEditingExercises(updated);
  };

  const removeEditingSet = (exerciseIndex, setIndex) => {
    const updated = [...editingExercises];
    if (updated[exerciseIndex].setDetails.length > 1) {
      updated[exerciseIndex].setDetails = updated[exerciseIndex].setDetails.filter((_, i) => i !== setIndex);
      setEditingExercises(updated);
    }
  };

  const updateEditingSet = (exerciseIndex, setIndex, field, value) => {
    const updated = [...editingExercises];
    updated[exerciseIndex].setDetails[setIndex][field] = value;
    setEditingExercises(updated);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingLog(null);
    setEditingType(null);
    setEditingExercises([]);
    setShowDatePicker(false);
    // Reset sleep edit state
    setShowSleepDatePicker(false);
    setShowSleepTimePicker(false);
    setShowWakeTimePicker(false);
    setIsApproximateTime(false);
  };

  const getEmoji = (rating) => {
    if (!rating) return null;
    const num = parseInt(rating);
    if (num <= 3) return '😔';
    if (num <= 6) return '😐';
    if (num <= 8) return '🙂';
    return '😄';
  };

  const renderSleepLog = (log, index) => {
    const logBadges = getBadgesForLog(earnedAchievements, log.createdAt);
    return (
      <View key={log.id || index} style={styles.logCard}>
        <View style={styles.logHeader}>
          <Text style={styles.logDate}>{log.dateRange}</Text>
          <View style={styles.headerRight}>
            {log.effectivenessRating && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{log.effectivenessRating}</Text>
                <Text style={styles.ratingEmoji}>{getEmoji(log.effectivenessRating)}</Text>
              </View>
            )}
            <Text style={styles.logDuration}>{log.totalHours}h</Text>
          </View>
        </View>
        <View style={styles.logDetails}>
          <Text style={styles.logDetailText}>Sleep: {log.sleepTime}</Text>
          <Text style={styles.logDetailText}>Wake: {log.wakeTime}</Text>
        </View>
        {logBadges.length > 0 && (
          <View style={styles.logBadgesRow}>
            {logBadges.map((b, i) => <AchievementBadge key={i} badge={b} size="sm" />)}
          </View>
        )}
      </View>
    );
  };

  const renderWorkoutLog = (log, index) => {
    const isExpanded = expandedWorkouts[log.id];
    const logBadges = getBadgesForLog(earnedAchievements, log.createdAt);

    return (
      <View
        key={log.id || index}
        style={[styles.logCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      >
        <TouchableOpacity
          onPress={() => toggleWorkoutExpanded(log.id)}
          activeOpacity={0.7}
        >
          <View style={styles.logHeader}>
            <View style={styles.dateBadgeRow}>
              <Text style={[styles.logDate, { color: colors.text }]}>
                {new Date(log.date).toLocaleDateString()}
              </Text>
              {logBadges.length > 0 && logBadges.map((b, i) => (
                <AchievementBadge key={i} badge={b} size="sm" />
              ))}
              {log.healthData?.linked && (
                <View style={[styles.healthBadge, { backgroundColor: '#FF3B3015' }]}>
                  <Text style={styles.healthBadgeIcon}>❤️</Text>
                </View>
              )}
            </View>
            <View style={styles.headerRight}>
              {log.effectivenessRating && (
                <View style={[styles.ratingBadge, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.ratingText, { color: colors.primary }]}>{log.effectivenessRating}</Text>
                  <Text style={styles.ratingEmoji}>{getEmoji(log.effectivenessRating)}</Text>
                </View>
              )}
              <Text style={[styles.exerciseCount, { color: colors.primary }]}>
                {log.exercises?.length || 0} exercises
              </Text>
              <Text style={[styles.chevron, { color: colors.textLight }]}>{isExpanded ? '▼' : '▶'}</Text>
            </View>
          </View>

          {isExpanded && (
            <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
              {log.healthData?.linked && (
                <View style={[styles.healthDataSection, { backgroundColor: '#FF3B3010', borderColor: '#FF3B3030' }]}>
                  <Text style={styles.healthDataTitle}>❤️ Apple Health Data</Text>
                  <View style={styles.healthDataGrid}>
                    {log.healthData.heartRate?.average && (
                      <View style={styles.healthDataItem}>
                        <Text style={[styles.healthDataValue, { color: '#FF3B30' }]}>
                          {log.healthData.heartRate.average}
                        </Text>
                        <Text style={[styles.healthDataLabel, { color: colors.textSecondary }]}>Avg HR</Text>
                      </View>
                    )}
                    {log.healthData.heartRate?.max && (
                      <View style={styles.healthDataItem}>
                        <Text style={[styles.healthDataValue, { color: '#FF3B30' }]}>
                          {log.healthData.heartRate.max}
                        </Text>
                        <Text style={[styles.healthDataLabel, { color: colors.textSecondary }]}>Max HR</Text>
                      </View>
                    )}
                    {log.healthData.calories?.active > 0 && (
                      <View style={styles.healthDataItem}>
                        <Text style={[styles.healthDataValue, { color: colors.warning }]}>
                          {log.healthData.calories.active}
                        </Text>
                        <Text style={[styles.healthDataLabel, { color: colors.textSecondary }]}>Calories</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
              {log.exercises?.map((exercise, idx) => (
                <View key={idx} style={[styles.exerciseCard, { backgroundColor: colors.surfaceSecondary }]}>
                  <View style={styles.exerciseHeader}>
                    <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name}</Text>
                    {exercise.target && (
                      <Text style={[styles.exerciseTarget, { color: colors.primary, backgroundColor: colors.primary + '20' }]}>{exercise.target}</Text>
                    )}
                  </View>
                  <View style={styles.exerciseStats}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>Sets</Text>
                      <Text style={[styles.statValue, { color: colors.text }]}>{exercise.sets}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>Reps</Text>
                      <Text style={[styles.statValue, { color: colors.text }]}>{exercise.reps}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>Weight</Text>
                      <Text style={[styles.statValue, { color: colors.text }]}>{exercise.weight}</Text>
                    </View>
                  </View>
                  {exercise.notes && (
                    <View style={[styles.notesContainer, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.notesLabel, { color: colors.textLight }]}>Notes:</Text>
                      <Text style={[styles.notesText, { color: colors.textSecondary }]}>{exercise.notes}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => handleEdit('workout', log)}
          >
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton, { backgroundColor: colors.error + '20' }]}
            onPress={() => handleDelete('workout', log.id, new Date(log.date).toLocaleDateString())}
          >
            <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFocusLog = (log, index) => {
    const isExpanded = expandedFocus[log.id];
    const logBadges = getBadgesForLog(earnedAchievements, log.createdAt);

    return (
      <View
        key={log.id || index}
        style={[styles.logCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      >
        <TouchableOpacity
          onPress={() => toggleFocusExpanded(log.id)}
          activeOpacity={0.7}
        >
          <View style={styles.logHeader}>
            <View style={styles.dateBadgeRow}>
              <Text style={[styles.logDate, { color: colors.text }]}>
                {new Date(log.date).toLocaleDateString()}
              </Text>
              {logBadges.length > 0 && logBadges.map((b, i) => (
                <AchievementBadge key={i} badge={b} size="sm" />
              ))}
            </View>
            <View style={styles.headerRight}>
              {log.effectivenessRating && (
                <View style={[styles.ratingBadge, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.ratingText, { color: colors.primary }]}>{log.effectivenessRating}</Text>
                  <Text style={styles.ratingEmoji}>{getEmoji(log.effectivenessRating)}</Text>
                </View>
              )}
              <Text style={[styles.focusDuration, { color: colors.secondary }]}>{Math.round(log.totalMinutes)}m</Text>
              <Text style={[styles.chevron, { color: colors.textLight }]}>{isExpanded ? '▼' : '▶'}</Text>
            </View>
          </View>
          <Text style={[styles.focusLabel, { color: colors.textSecondary }]}>
              {typeof log.label === 'object' && log.label?.name ? log.label.name : (log.label || log.topic || 'Focus Session')}
            </Text>

          {isExpanded && (
            <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
              <View style={[styles.focusDetails, { backgroundColor: colors.surfaceSecondary }]}>
                <View style={styles.focusDetailItem}>
                  <Text style={[styles.focusDetailLabel, { color: colors.textLight }]}>Total Time</Text>
                  <Text style={[styles.focusDetailValue, { color: colors.secondary }]}>{Math.round(log.totalMinutes)} min</Text>
                </View>
                <View style={styles.focusDetailItem}>
                  <Text style={[styles.focusDetailLabel, { color: colors.textLight }]}>Pomodoros</Text>
                  <Text style={[styles.focusDetailValue, { color: colors.secondary }]}>
                    {log.pomodoros?.filter(p => p.completed).length || 0}
                  </Text>
                </View>
                <View style={styles.focusDetailItem}>
                  <Text style={[styles.focusDetailLabel, { color: colors.textLight }]}>Length</Text>
                  <Text style={[styles.focusDetailValue, { color: colors.secondary }]}>{log.pomodoroLength}m</Text>
                </View>
              </View>

              {log.pomodoros && log.pomodoros.length > 0 && (
                <View style={styles.pomodorosSection}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Completed Pomodoros</Text>
                  {log.pomodoros.filter(p => p.completed).map((pomo, idx) => (
                    <View key={idx} style={[styles.pomodoroItem, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.pomodoroNumber, { color: colors.secondary }]}>#{idx + 1}</Text>
                      <Text style={[styles.pomodoroTime, { color: colors.textSecondary }]}>
                        {pomo.startTime} - {pomo.endTime} ({pomo.duration}m)
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => handleEdit('focus', log)}
          >
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton, { backgroundColor: colors.error + '20' }]}
            onPress={() => handleDelete('focus', log.id, typeof log.label === 'object' && log.label?.name ? log.label.name : (log.label || log.topic))}
          >
            <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>History</Text>

      <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sleep' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('sleep')}
        >
          <Text
            style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'sleep' && { color: colors.textOnPrimary }]}
          >
            Sleep
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'workout' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('workout')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'workout' && { color: colors.textOnPrimary },
            ]}
          >
            Workout
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'focus' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('focus')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'focus' && { color: colors.textOnPrimary },
            ]}
          >
            Focus
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {activeTab === 'sleep' && (
          sleepLogs.length > 0 ? (
            sleepLogs.map((log, index) => (
              <View key={log.id || index} style={[styles.logCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                <View style={styles.logHeader}>
                  <Text style={[styles.logDate, { color: colors.text }]}>{log.dateRange}</Text>
                  <View style={styles.headerRight}>
                    {log.effectivenessRating && (
                      <View style={[styles.ratingBadge, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[styles.ratingText, { color: colors.primary }]}>{log.effectivenessRating}</Text>
                        <Text style={styles.ratingEmoji}>{getEmoji(log.effectivenessRating)}</Text>
                      </View>
                    )}
                    <Text style={[styles.logDuration, { color: colors.primary }]}>{formatHoursToHMM(log.totalHours)}</Text>
                  </View>
                </View>
                <View style={styles.logDetails}>
                  <Text style={[styles.logDetailText, { color: colors.textSecondary }]}>Sleep: {log.sleepTime}</Text>
                  <Text style={[styles.logDetailText, { color: colors.textSecondary }]}>Wake: {log.wakeTime}</Text>
                  {log.isApproximate && (
                    <Text style={[styles.approximateBadge, { color: colors.warning }]}>~Approx</Text>
                  )}
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => handleEdit('sleep', log)}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton, { backgroundColor: colors.error + '20' }]}
                    onPress={() => handleDelete('sleep', log.id, log.dateRange)}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>No sleep logs yet</Text>
            </View>
          )
        )}
        {activeTab === 'workout' && (
          workoutLogs.length > 0 ? (
            workoutLogs.map(renderWorkoutLog)
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>No workout logs yet</Text>
            </View>
          )
        )}
        {activeTab === 'focus' && (
          focusLogs.length > 0 ? (
            focusLogs.map(renderFocusLog)
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>No focus logs yet</Text>
            </View>
          )
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit {editingType === 'sleep' ? 'Sleep' : editingType === 'workout' ? 'Workout' : 'Focus'} Log
              </Text>
              <TouchableOpacity onPress={closeEditModal}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {editingType === 'sleep' && editingLog && (
                <>
                  {/* Sleep Date - only first date editable, second auto-calculates */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sleep Date</Text>
                    {Platform.OS === 'ios' ? (
                      // iOS: Show inline date picker
                      <>
                        <View style={[styles.dateDisplayRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                          <Text style={[styles.dateDisplayText, { color: colors.text }]}>
                            {sleepStartDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </Text>
                          <Text style={[styles.dateRangeHint, { color: colors.textLight }]}>
                            → Wake: {new Date(sleepStartDate.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                        <DateTimePicker
                          value={sleepStartDate}
                          mode="date"
                          display="spinner"
                          onChange={(event, selectedDate) => {
                            if (selectedDate) {
                              setSleepStartDate(selectedDate);
                            }
                          }}
                          style={styles.iosDatePicker}
                        />
                      </>
                    ) : (
                      // Android: Tap to show picker
                      <>
                        <TouchableOpacity
                          style={[styles.datePickerButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                          onPress={() => setShowSleepDatePicker(true)}
                        >
                          <View>
                            <Text style={[styles.datePickerText, { color: colors.text }]}>
                              {sleepStartDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </Text>
                            <Text style={[styles.dateRangeHint, { color: colors.textLight }]}>
                              → Wake: {new Date(sleepStartDate.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </Text>
                          </View>
                          <Text style={[styles.datePickerIcon, { color: colors.primary }]}>📅</Text>
                        </TouchableOpacity>
                        {showSleepDatePicker && (
                          <DateTimePicker
                            value={sleepStartDate}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                              setShowSleepDatePicker(false);
                              if (event.type === 'set' && selectedDate) {
                                setSleepStartDate(selectedDate);
                              }
                            }}
                          />
                        )}
                      </>
                    )}
                  </View>

                  {/* Sleep and Wake Times */}
                  {Platform.OS === 'ios' ? (
                    // iOS: Show inline pickers (always visible)
                    <View style={styles.iosTimePickersContainer}>
                      <View style={styles.iosTimePickerGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sleep Time 🌙</Text>
                        <DateTimePicker
                          value={sleepTime}
                          mode="time"
                          display="spinner"
                          onChange={(event, selectedTime) => {
                            if (selectedTime) {
                              setSleepTime(selectedTime);
                            }
                          }}
                          style={styles.iosTimePicker}
                        />
                      </View>
                      <View style={styles.iosTimePickerGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Wake Time ☀️</Text>
                        <DateTimePicker
                          value={wakeTime}
                          mode="time"
                          display="spinner"
                          onChange={(event, selectedTime) => {
                            if (selectedTime) {
                              setWakeTime(selectedTime);
                            }
                          }}
                          style={styles.iosTimePicker}
                        />
                      </View>
                    </View>
                  ) : (
                    // Android: Tap to show pickers
                    <View style={styles.timeEditRow}>
                      <View style={styles.timeEditGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sleep Time</Text>
                        <TouchableOpacity
                          style={[styles.timePickerButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                          onPress={() => setShowSleepTimePicker(true)}
                        >
                          <Text style={[styles.timePickerText, { color: colors.text }]}>
                            {formatTime(sleepTime)}
                          </Text>
                          <Text style={styles.timePickerIcon}>🌙</Text>
                        </TouchableOpacity>
                        {showSleepTimePicker && (
                          <DateTimePicker
                            value={sleepTime}
                            mode="time"
                            display="default"
                            onChange={(event, selectedTime) => {
                              setShowSleepTimePicker(false);
                              if (event.type === 'set' && selectedTime) {
                                setSleepTime(selectedTime);
                              }
                            }}
                          />
                        )}
                      </View>

                      <View style={styles.timeEditGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Wake Time</Text>
                        <TouchableOpacity
                          style={[styles.timePickerButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                          onPress={() => setShowWakeTimePicker(true)}
                        >
                          <Text style={[styles.timePickerText, { color: colors.text }]}>
                            {formatTime(wakeTime)}
                          </Text>
                          <Text style={styles.timePickerIcon}>☀️</Text>
                        </TouchableOpacity>
                        {showWakeTimePicker && (
                          <DateTimePicker
                            value={wakeTime}
                            mode="time"
                            display="default"
                            onChange={(event, selectedTime) => {
                              setShowWakeTimePicker(false);
                              if (event.type === 'set' && selectedTime) {
                                setWakeTime(selectedTime);
                              }
                            }}
                          />
                        )}
                      </View>
                    </View>
                  )}

                  {/* Approximate Time Toggle for travelers */}
                  <View style={[styles.approximateRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <View style={styles.approximateInfo}>
                      <Text style={[styles.approximateLabel, { color: colors.text }]}>Approximate Time</Text>
                      <Text style={[styles.approximateHint, { color: colors.textLight }]}>
                        For travel or timezone changes
                      </Text>
                    </View>
                    <Switch
                      value={isApproximateTime}
                      onValueChange={setIsApproximateTime}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={isApproximateTime ? colors.primaryLight : '#f4f3f4'}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sleep Quality</Text>
                    <RatingPicker
                      value={editingLog.effectivenessRating}
                      onValueChange={(rating) => setEditingLog({ ...editingLog, effectivenessRating: rating })}
                    />
                  </View>
                </>
              )}

              {editingType === 'workout' && editingLog && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date</Text>
                    <TouchableOpacity
                      style={[styles.datePickerButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={[styles.datePickerText, { color: colors.text }]}>
                        {new Date(editingLog.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                      <Text style={[styles.datePickerIcon, { color: colors.primary }]}>📅</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={new Date(editingLog.date)}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedDate) => {
                          if (Platform.OS === 'android') {
                            setShowDatePicker(false);
                            if (event.type === 'set' && selectedDate) {
                              setEditingLog({ ...editingLog, date: selectedDate.toISOString() });
                            }
                          } else {
                            // iOS - keep open, update immediately
                            if (selectedDate) {
                              setEditingLog({ ...editingLog, date: selectedDate.toISOString() });
                            }
                          }
                        }}
                        themeVariant={colors.background === '#0F172A' || colors.background === '#18181B' ? 'dark' : 'light'}
                      />
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Effectiveness Rating</Text>
                    <RatingPicker
                      value={editingLog.effectivenessRating}
                      onValueChange={(rating) => setEditingLog({ ...editingLog, effectivenessRating: rating })}
                    />
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16, marginBottom: 12 }]}>
                    Exercises ({editingExercises.length})
                  </Text>

                  {editingExercises.map((exercise, index) => (
                    <View key={index} style={[styles.exerciseEditCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                      <View style={styles.exerciseEditHeader}>
                        <Text style={[styles.exerciseEditNumber, { color: colors.text }]}>Exercise {index + 1}</Text>
                        {editingExercises.length > 1 && (
                          <TouchableOpacity onPress={() => removeEditingExercise(index)}>
                            <Text style={[styles.removeExerciseButton, { color: colors.error }]}>Remove</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <TextInput
                        style={[styles.exerciseInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        placeholder="Exercise Name"
                        placeholderTextColor={colors.textLight}
                        value={exercise.name}
                        onChangeText={(text) => updateEditingExercise(index, 'name', text)}
                      />

                      <TextInput
                        style={[styles.exerciseInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        placeholder="Target Muscle (e.g., Chest, Legs)"
                        placeholderTextColor={colors.textLight}
                        value={exercise.target}
                        onChangeText={(text) => updateEditingExercise(index, 'target', text)}
                      />

                      {/* Track Sets Toggle */}
                      <View style={[styles.trackSetsToggle, { borderColor: colors.border }]}>
                        <View style={styles.trackSetsInfo}>
                          <Text style={[styles.trackSetsLabel, { color: colors.text }]}>Track individual sets</Text>
                        </View>
                        <Switch
                          value={exercise.trackSets}
                          onValueChange={() => toggleEditingExerciseTrackSets(index)}
                          trackColor={{ false: colors.border, true: colors.primary }}
                          thumbColor={exercise.trackSets ? colors.primaryLight || '#fff' : '#f4f3f4'}
                        />
                      </View>

                      {!exercise.trackSets ? (
                        /* Simple Mode */
                        <>
                          <View style={styles.exerciseRow}>
                            <TextInput
                              style={[styles.exerciseInput, styles.exerciseHalfInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                              placeholder="Weight"
                              placeholderTextColor={colors.textLight}
                              value={exercise.weight}
                              onChangeText={(text) => updateEditingExercise(index, 'weight', text)}
                            />
                            <TextInput
                              style={[styles.exerciseInput, styles.exerciseHalfInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                              placeholder="Sets"
                              placeholderTextColor={colors.textLight}
                              keyboardType="numeric"
                              value={exercise.sets}
                              onChangeText={(text) => updateEditingExercise(index, 'sets', text)}
                            />
                          </View>
                          <View style={styles.exerciseRow}>
                            <TextInput
                              style={[styles.exerciseInput, styles.exerciseHalfInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                              placeholder="Reps"
                              placeholderTextColor={colors.textLight}
                              keyboardType="numeric"
                              value={exercise.reps}
                              onChangeText={(text) => updateEditingExercise(index, 'reps', text)}
                            />
                            <TextInput
                              style={[styles.exerciseInput, styles.exerciseHalfInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                              placeholder="Notes"
                              placeholderTextColor={colors.textLight}
                              value={exercise.notes}
                              onChangeText={(text) => updateEditingExercise(index, 'notes', text)}
                            />
                          </View>
                        </>
                      ) : (
                        /* Set Mode */
                        <View style={styles.setsContainer}>
                          {exercise.setDetails && exercise.setDetails.map((set, setIndex) => (
                            <View key={setIndex} style={[styles.setRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                              <Text style={[styles.setNumber, { color: colors.primary }]}>{setIndex + 1}</Text>
                              <TextInput
                                style={[styles.setInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="Weight"
                                placeholderTextColor={colors.textLight}
                                value={set.weight}
                                onChangeText={(text) => updateEditingSet(index, setIndex, 'weight', text)}
                              />
                              <TextInput
                                style={[styles.setInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="Reps"
                                placeholderTextColor={colors.textLight}
                                keyboardType="numeric"
                                value={set.reps}
                                onChangeText={(text) => updateEditingSet(index, setIndex, 'reps', text)}
                              />
                              {exercise.setDetails.length > 1 && (
                                <TouchableOpacity onPress={() => removeEditingSet(index, setIndex)} style={styles.removeSetButton}>
                                  <Text style={[styles.removeSetText, { color: colors.error }]}>×</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                          <TouchableOpacity
                            style={[styles.addSetButton, { borderColor: colors.primary }]}
                            onPress={() => addEditingSet(index)}
                          >
                            <Text style={[styles.addSetText, { color: colors.primary }]}>+ Add Set</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[styles.addExerciseButton, { borderColor: colors.primary }]}
                    onPress={addEditingExercise}
                  >
                    <Text style={[styles.addExerciseButtonText, { color: colors.primary }]}>+ Add Exercise</Text>
                  </TouchableOpacity>
                </>
              )}

              {editingType === 'focus' && editingLog && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Label</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                      value={typeof editingLog.label === 'object' && editingLog.label?.name ? editingLog.label.name : (editingLog.label || editingLog.topic || '')}
                      onChangeText={(text) => setEditingLog({ ...editingLog, label: text })}
                      placeholder="e.g., Deep Work, Reading"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Total Minutes</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                      value={String(editingLog.totalMinutes || '')}
                      onChangeText={(text) => setEditingLog({ ...editingLog, totalMinutes: parseInt(text) || 0 })}
                      keyboardType="number-pad"
                      placeholder="e.g., 90"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Effectiveness Rating</Text>
                    <RatingPicker
                      value={editingLog.effectivenessRating}
                      onValueChange={(rating) => setEditingLog({ ...editingLog, effectivenessRating: rating })}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={closeEditModal}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    marginBottom: 16,
    color: '#333',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  logCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  logDuration: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  logDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logDetailText: {
    fontSize: 14,
    color: '#666',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  ratingEmoji: {
    fontSize: 14,
  },
  exerciseCount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  chevron: {
    fontSize: 10,
    color: '#999',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  exerciseCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  exerciseTarget: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  exerciseStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  notesContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  notesLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  focusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  focusDuration: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8E44AD',
  },
  focusDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  focusDetailItem: {
    alignItems: 'center',
  },
  focusDetailLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  focusDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8E44AD',
  },
  pomodorosSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  pomodoroItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    marginBottom: 4,
  },
  pomodoroNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E44AD',
  },
  pomodoroTime: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButton: {
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalClose: {
    fontSize: 24,
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  hintText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  datePickerText: {
    fontSize: 16,
  },
  datePickerIcon: {
    fontSize: 18,
  },
  exerciseEditCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  exerciseEditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseEditNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  removeExerciseButton: {
    fontSize: 13,
    fontWeight: '600',
  },
  exerciseInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  exerciseHalfInput: {
    flex: 1,
  },
  addExerciseButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  addExerciseButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateRangeHint: {
    fontSize: 12,
    marginTop: 4,
  },
  timeEditRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeEditGroup: {
    flex: 1,
  },
  timePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  timePickerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  timePickerIcon: {
    fontSize: 16,
  },
  iosTimePickersContainer: {
    marginBottom: 16,
  },
  iosTimePickerGroup: {
    marginBottom: 8,
  },
  iosTimePicker: {
    height: 120,
    marginTop: -8,
  },
  iosDatePicker: {
    height: 150,
    marginTop: 8,
  },
  dateDisplayRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  dateDisplayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  approximateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  approximateInfo: {
    flex: 1,
  },
  approximateLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  approximateHint: {
    fontSize: 12,
    marginTop: 2,
  },
  approximateBadge: {
    fontSize: 11,
    fontStyle: 'italic',
    marginLeft: 8,
  },
  dateBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  healthBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  healthBadgeIcon: {
    fontSize: 10,
  },
  healthDataSection: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  healthDataTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    color: '#FF3B30',
  },
  healthDataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  healthDataItem: {
    alignItems: 'center',
  },
  healthDataValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  healthDataLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  trackSetsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
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
  setsContainer: {
    marginTop: 4,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
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
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 14,
  },
  removeSetButton: {
    padding: 4,
  },
  removeSetText: {
    fontSize: 20,
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
});
