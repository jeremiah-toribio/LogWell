import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { getSleepLogs, getWorkoutLogs, getFocusLogs } from '../services/storage';
import { getWorkoutsByMuscleGroup, getFocusTimeByLabel, getAverageRatingByWeek, getBodyPartFrequency } from '../services/calculations';
import { formatHoursToHMM } from '../utils/dateHelpers';
import { getExercises, getExerciseStats } from '../services/exercises';
import ExercisePicker from '../components/ExercisePicker';
import BodyDiagram from '../components/BodyDiagram';
import { useTheme } from '../theme/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { getEarnedAchievements } from '../services/achievements';
import {
  isHealthKitAvailable,
  isHealthKitConnected,
  initializeHealthKit,
  getDailyStepCounts,
  getDailyActiveCalories,
  getDailyHeartRateAvg,
} from '../services/healthKit';

const screenWidth = Dimensions.get('window').width;

export default function VisualizationsScreen() {
  const { colors } = useTheme();
  const { isPremium, showPaywall } = usePremium();
  const [activeCategory, setActiveCategory] = useState('sleep');
  const [timeRange, setTimeRange] = useState('30');
  const [sleepLogs, setSleepLogs] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [focusLogs, setFocusLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [focusTimeInMinutes, setFocusTimeInMinutes] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseStats, setExerciseStats] = useState(null);
  const [workoutView, setWorkoutView] = useState('charts');
  const [healthKitEnabled, setHealthKitEnabled] = useState(false);
  const [healthKitLoading, setHealthKitLoading] = useState(false);
  const [dailySteps, setDailySteps] = useState([]);
  const [dailyCalories, setDailyCalories] = useState([]);
  const [dailyHeartRate, setDailyHeartRate] = useState([]);
  const [earnedAchievements, setEarnedAchievements] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Clear exercise stats to force recalculation with fresh data
      if (selectedExercise) {
        setExerciseStats(null);
      }
    }, [selectedExercise])
  );

  const loadData = async () => {
    try {
      const sleep = await getSleepLogs();
      const workout = await getWorkoutLogs();
      const focus = await getFocusLogs();
      const achievements = await getEarnedAchievements();
      setSleepLogs(sleep);
      setWorkoutLogs(workout);
      setFocusLogs(focus);
      setEarnedAchievements(achievements);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (activeCategory === 'workout' && workoutView === 'charts' && healthKitEnabled) {
      await loadHealthKitData();
    }
    setRefreshing(false);
  };

  // Filter workouts by time range for exercise stats
  const getFilteredWorkoutsForExercise = (workouts) => {
    if (timeRange === 'all') return workouts;
    const now = new Date();
    const daysAgo = new Date(now.getTime() - parseInt(timeRange) * 24 * 60 * 60 * 1000);
    return workouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate >= daysAgo;
    });
  };

  // Update exercise stats when selection, workout logs, or time range change
  useEffect(() => {
    if (selectedExercise && workoutLogs.length > 0) {
      const filteredWorkouts = getFilteredWorkoutsForExercise(workoutLogs);
      const stats = getExerciseStats(filteredWorkouts, selectedExercise);
      setExerciseStats(stats);
    } else {
      setExerciseStats(null);
    }
  }, [selectedExercise, workoutLogs, timeRange]);

  // HealthKit initialization (on mount)
  useEffect(() => {
    const initHK = async () => {
      if (Platform.OS === 'ios' && isHealthKitAvailable()) {
        const connected = await isHealthKitConnected();
        if (connected) {
          try {
            const result = await initializeHealthKit();
            setHealthKitEnabled(result.available);
          } catch {
            setHealthKitEnabled(false);
          }
        }
      }
    };
    initHK();
  }, []);

  // HealthKit data loading
  const loadHealthKitData = useCallback(async () => {
    if (!healthKitEnabled) return;

    setHealthKitLoading(true);
    try {
      const now = new Date();
      let daysBack;
      if (timeRange === '7') {
        daysBack = 7;
      } else if (timeRange === '30') {
        daysBack = 30;
      } else {
        daysBack = 90; // Cap "All" at 90 days
      }
      const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

      const [steps, calories, heartRate] = await Promise.all([
        getDailyStepCounts(startDate, now),
        getDailyActiveCalories(startDate, now),
        getDailyHeartRateAvg(startDate, now),
      ]);

      setDailySteps(steps);
      setDailyCalories(calories);
      setDailyHeartRate(heartRate);
    } catch (error) {
      console.log('Error loading HealthKit data:', error);
    } finally {
      setHealthKitLoading(false);
    }
  }, [healthKitEnabled, timeRange]);

  useEffect(() => {
    if (activeCategory === 'workout' && workoutView === 'charts' && healthKitEnabled) {
      loadHealthKitData();
    }
  }, [healthKitEnabled, timeRange, activeCategory, workoutView, loadHealthKitData]);

  const handleExerciseSelect = async (exerciseName) => {
    // Refresh workout data before calculating stats to ensure we have latest
    const freshWorkouts = await getWorkoutLogs();
    setWorkoutLogs(freshWorkouts);
    setSelectedExercise(exerciseName);
    // Calculate stats immediately with fresh data filtered by time range
    const filteredWorkouts = getFilteredWorkoutsForExercise(freshWorkouts);
    const stats = getExerciseStats(filteredWorkouts, exerciseName);
    setExerciseStats(stats);
  };

  const clearExerciseSelection = () => {
    setSelectedExercise(null);
    setExerciseStats(null);
  };

  const filterByTimeRange = (logs, dateField = 'createdAt') => {
    if (timeRange === 'all') return logs;
    const now = new Date();
    const daysAgo = new Date(now.getTime() - parseInt(timeRange) * 24 * 60 * 60 * 1000);
    return logs.filter(log => {
      const logDate = new Date(log[dateField]);
      return logDate >= daysAgo;
    });
  };

  // Calculate insights and stats
  const getSleepInsights = () => {
    const filtered = filterByTimeRange(sleepLogs);
    if (filtered.length === 0) return null;

    const durations = filtered.map(log => parseFloat(log.totalHours) || 0);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const best = Math.max(...durations);
    const worst = Math.min(...durations);

    // Calculate trend (compare first half to second half)
    const midpoint = Math.floor(filtered.length / 2);
    const firstHalf = durations.slice(0, midpoint);
    const secondHalf = durations.slice(midpoint);
    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
    const trend = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg * 100).toFixed(0) : 0;

    // Calculate streak (consecutive days with 7+ hours)
    let streak = 0;
    for (let i = filtered.length - 1; i >= 0; i--) {
      if (parseFloat(filtered[i].totalHours) >= 7) streak++;
      else break;
    }

    // Average quality rating
    const withRatings = filtered.filter(log => log.effectivenessRating);
    const avgRating = withRatings.length > 0
      ? (withRatings.reduce((sum, log) => sum + log.effectivenessRating, 0) / withRatings.length).toFixed(1)
      : null;

    return { avg: formatHoursToHMM(avg), best: formatHoursToHMM(best), worst: formatHoursToHMM(worst), trend, streak, avgRating, total: filtered.length };
  };

  const getWorkoutInsights = () => {
    const filtered = filterByTimeRange(workoutLogs, 'date');
    if (filtered.length === 0) return null;

    const now = new Date();
    const thisWeek = filtered.filter(log => {
      const logDate = new Date(log.date);
      return (now - logDate) / (1000 * 60 * 60 * 24) <= 7;
    }).length;

    // Calculate streak
    let streak = 0;
    const sortedByDate = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    let lastDate = new Date();
    for (const log of sortedByDate) {
      const logDate = new Date(log.date);
      const daysDiff = Math.floor((lastDate - logDate) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 2) {
        streak++;
        lastDate = logDate;
      } else break;
    }

    // Total volume
    let totalVolume = 0;
    filtered.forEach(workout => {
      if (workout.exercises) {
        workout.exercises.forEach(ex => {
          // Check actual data structure to determine mode
          const isSetMode = Array.isArray(ex.sets) && ex.sets.length > 0 && typeof ex.sets[0] === 'object';
          if (isSetMode) {
            ex.sets.forEach(set => {
              totalVolume += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
            });
          } else {
            totalVolume += (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 0) * (parseInt(ex.reps) || 0);
          }
        });
      }
    });

    // Average quality rating
    const withRatings = filtered.filter(log => log.effectivenessRating);
    const avgRating = withRatings.length > 0
      ? (withRatings.reduce((sum, log) => sum + log.effectivenessRating, 0) / withRatings.length).toFixed(1)
      : null;

    // Health data from linked workouts
    const withHealthData = filtered.filter(log => log.healthData?.linked);
    let avgHeartRate = null;
    let totalCalories = 0;

    if (withHealthData.length > 0) {
      const heartRates = withHealthData
        .filter(log => log.healthData?.heartRate?.average)
        .map(log => log.healthData.heartRate.average);
      if (heartRates.length > 0) {
        avgHeartRate = Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length);
      }

      totalCalories = withHealthData.reduce((sum, log) => {
        return sum + (log.healthData?.calories?.active || 0);
      }, 0);
    }

    return {
      total: filtered.length,
      thisWeek,
      streak,
      totalVolume: Math.round(totalVolume),
      avgRating,
      avgHeartRate,
      totalCalories: Math.round(totalCalories),
      linkedWorkouts: withHealthData.length,
    };
  };

  const getFocusInsights = () => {
    const filtered = filterByTimeRange(focusLogs, 'date');
    if (filtered.length === 0) return null;

    const totalMinutes = filtered.reduce((sum, log) => sum + (log.totalMinutes || 0), 0);
    const avgSession = totalMinutes / filtered.length;

    // Best session
    const bestSession = Math.max(...filtered.map(log => log.totalMinutes || 0));

    // Total bouts/pomodoros
    let totalBouts = 0;
    filtered.forEach(log => {
      if (log.isMultiBout && log.bouts) totalBouts += log.bouts.length;
      else if (log.pomodoros) totalBouts += log.pomodoros.filter(p => p.completed).length;
    });

    // Average quality rating
    const withRatings = filtered.filter(log => log.effectivenessRating);
    const avgRating = withRatings.length > 0
      ? (withRatings.reduce((sum, log) => sum + log.effectivenessRating, 0) / withRatings.length).toFixed(1)
      : null;

    return {
      totalHours: formatHoursToHMM(totalMinutes / 60),
      totalMinutes,
      avgSession: Math.round(avgSession),
      bestSession,
      totalBouts,
      sessions: filtered.length,
      avgRating
    };
  };

  // Helper to format date labels
  const formatDateLabel = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatShortDate = (date) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // Generate daily aggregated data for charts
  const getDailyData = (logs, dateField, valueExtractor, daysToShow) => {
    const dailyMap = {};
    const now = new Date();

    // Initialize all days with 0
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = date.toDateString();
      dailyMap[key] = { date, value: 0, count: 0 };
    }

    // Aggregate data by day
    logs.forEach(log => {
      const logDate = new Date(log[dateField]);
      const key = logDate.toDateString();
      if (dailyMap[key]) {
        dailyMap[key].value += valueExtractor(log);
        dailyMap[key].count += 1;
      }
    });

    return Object.values(dailyMap).sort((a, b) => a.date - b.date);
  };

  // Chart data functions
  const getSleepDurationChart = () => {
    const filtered = filterByTimeRange(sleepLogs);
    if (filtered.length === 0) return { labels: ['No Data'], datasets: [{ data: [0] }] };

    const daysToShow = timeRange === '7' ? 7 : timeRange === '30' ? 30 : 60;
    const dailyData = getDailyData(filtered, 'createdAt', log => parseFloat(log.totalHours) || 0, daysToShow);

    // Filter to only days with data for cleaner display
    const daysWithData = dailyData.filter(d => d.value > 0);
    if (daysWithData.length === 0) return { labels: ['No Data'], datasets: [{ data: [0] }] };

    // Show every nth label to avoid crowding
    const labelInterval = daysWithData.length > 10 ? Math.ceil(daysWithData.length / 7) : 1;

    return {
      labels: daysWithData.map((d, i) => i % labelInterval === 0 ? formatShortDate(d.date) : ''),
      datasets: [{ data: daysWithData.map(d => d.value) }],
    };
  };

  const getSleepQualityChart = () => {
    const filtered = filterByTimeRange(sleepLogs).filter(log => log.effectivenessRating);
    if (filtered.length === 0) return { labels: ['No Data'], datasets: [{ data: [0] }] };

    // Aggregate quality by day (average rating per day)
    const daysToShow = timeRange === '7' ? 7 : timeRange === '30' ? 30 : 60;
    const qualityMap = {};
    const now = new Date();

    filtered.forEach(log => {
      const logDate = new Date(log.createdAt);
      const key = logDate.toDateString();
      if (!qualityMap[key]) {
        qualityMap[key] = { date: logDate, total: 0, count: 0 };
      }
      qualityMap[key].total += log.effectivenessRating;
      qualityMap[key].count += 1;
    });

    const dailyQuality = Object.values(qualityMap)
      .map(d => ({ date: d.date, value: d.total / d.count }))
      .sort((a, b) => a.date - b.date)
      .slice(-daysToShow);

    if (dailyQuality.length === 0) return { labels: ['No Data'], datasets: [{ data: [0] }] };

    const labelInterval = dailyQuality.length > 10 ? Math.ceil(dailyQuality.length / 7) : 1;

    return {
      labels: dailyQuality.map((d, i) => i % labelInterval === 0 ? formatShortDate(d.date) : ''),
      datasets: [{ data: dailyQuality.map(d => d.value) }],
    };
  };

  const getWorkoutFrequencyChart = () => {
    const filtered = filterByTimeRange(workoutLogs, 'date');
    if (filtered.length === 0) return { labels: ['No Data'], datasets: [{ data: [0] }] };

    const daysToShow = timeRange === '7' ? 7 : timeRange === '30' ? 30 : 60;
    const dailyData = getDailyData(filtered, 'date', () => 1, daysToShow);

    // For 30-day, show data in 5-day segments; for 7-day show each day
    if (timeRange === '7') {
      return {
        labels: dailyData.map(d => formatShortDate(d.date)),
        datasets: [{ data: dailyData.map(d => d.count) }],
      };
    } else {
      // Group into segments for cleaner display
      const segmentSize = timeRange === '30' ? 5 : 10;
      const segments = [];
      for (let i = 0; i < dailyData.length; i += segmentSize) {
        const segment = dailyData.slice(i, i + segmentSize);
        const total = segment.reduce((sum, d) => sum + d.count, 0);
        const startDate = segment[0]?.date;
        segments.push({ date: startDate, value: total });
      }

      return {
        labels: segments.map(s => formatShortDate(s.date)),
        datasets: [{ data: segments.map(s => s.value) }],
      };
    }
  };

  // Volume over time chart
  const getVolumeChart = () => {
    const filtered = filterByTimeRange(workoutLogs, 'date');
    if (filtered.length === 0) return { labels: ['No Data'], datasets: [{ data: [0] }] };

    const daysToShow = timeRange === '7' ? 7 : timeRange === '30' ? 30 : 60;

    // Calculate volume per workout
    const volumeExtractor = (workout) => {
      let volume = 0;
      if (workout.exercises) {
        workout.exercises.forEach(ex => {
          // Check actual data structure to determine mode
          const isSetMode = Array.isArray(ex.sets) && ex.sets.length > 0 && typeof ex.sets[0] === 'object';
          if (isSetMode) {
            ex.sets.forEach(set => {
              volume += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
            });
          } else {
            volume += (parseFloat(ex.weight) || 0) * (parseInt(ex.sets) || 0) * (parseInt(ex.reps) || 0);
          }
        });
      }
      return volume;
    };

    const dailyData = getDailyData(filtered, 'date', volumeExtractor, daysToShow);
    const daysWithData = dailyData.filter(d => d.value > 0);

    if (daysWithData.length === 0) return { labels: ['No Data'], datasets: [{ data: [0] }] };

    const labelInterval = daysWithData.length > 10 ? Math.ceil(daysWithData.length / 7) : 1;

    return {
      labels: daysWithData.map((d, i) => i % labelInterval === 0 ? formatShortDate(d.date) : ''),
      datasets: [{ data: daysWithData.map(d => d.value > 1000 ? Math.round(d.value / 1000) : d.value) }],
      isInThousands: daysWithData.some(d => d.value > 1000),
    };
  };

  // Workout quality ratings over time
  const getWorkoutQualityChart = () => {
    const filtered = filterByTimeRange(workoutLogs, 'date').filter(log => log.effectivenessRating);
    if (filtered.length === 0) return null;

    const daysToShow = timeRange === '7' ? 7 : timeRange === '30' ? 30 : 60;
    const qualityMap = {};

    filtered.forEach(log => {
      const logDate = new Date(log.date);
      const key = logDate.toDateString();
      if (!qualityMap[key]) {
        qualityMap[key] = { date: logDate, total: 0, count: 0 };
      }
      qualityMap[key].total += log.effectivenessRating;
      qualityMap[key].count += 1;
    });

    const dailyQuality = Object.values(qualityMap)
      .map(d => ({ date: d.date, value: d.total / d.count }))
      .sort((a, b) => a.date - b.date)
      .slice(-daysToShow);

    if (dailyQuality.length === 0) return null;

    const labelInterval = dailyQuality.length > 10 ? Math.ceil(dailyQuality.length / 7) : 1;

    return {
      labels: dailyQuality.map((d, i) => i % labelInterval === 0 ? formatShortDate(d.date) : ''),
      datasets: [{ data: dailyQuality.map(d => d.value) }],
    };
  };

  // HealthKit chart data formatters
  const getStepsChartData = () => {
    const daysWithData = dailySteps.filter(d => d.steps > 0);
    if (daysWithData.length === 0) return null;
    const labelInterval = daysWithData.length > 10 ? Math.ceil(daysWithData.length / 7) : 1;
    return {
      labels: daysWithData.map((d, i) => i % labelInterval === 0 ? formatShortDate(d.date) : ''),
      datasets: [{ data: daysWithData.map(d => Math.round(d.steps)) }],
    };
  };

  const getCaloriesChartData = () => {
    const daysWithData = dailyCalories.filter(d => d.calories > 0);
    if (daysWithData.length === 0) return null;
    const labelInterval = daysWithData.length > 10 ? Math.ceil(daysWithData.length / 7) : 1;
    return {
      labels: daysWithData.map((d, i) => i % labelInterval === 0 ? formatShortDate(d.date) : ''),
      datasets: [{ data: daysWithData.map(d => Math.round(d.calories)) }],
    };
  };

  const getHeartRateChartData = () => {
    const daysWithData = dailyHeartRate.filter(d => d.avg > 0);
    if (daysWithData.length === 0) return null;
    const labelInterval = daysWithData.length > 10 ? Math.ceil(daysWithData.length / 7) : 1;
    return {
      labels: daysWithData.map((d, i) => i % labelInterval === 0 ? formatShortDate(d.date) : ''),
      datasets: [{ data: daysWithData.map(d => Math.round(d.avg)) }],
    };
  };

  const getFocusTimeChart = () => {
    const filtered = filterByTimeRange(focusLogs, 'date');
    if (filtered.length === 0) return { labels: ['No Data'], datasets: [{ data: [0] }] };

    const daysToShow = timeRange === '7' ? 7 : timeRange === '30' ? 30 : 60;
    const dailyData = getDailyData(filtered, 'date', log => (log.totalMinutes || 0) / 60, daysToShow);

    if (timeRange === '7') {
      return {
        labels: dailyData.map(d => formatShortDate(d.date)),
        datasets: [{ data: dailyData.map(d => d.value) }],
      };
    } else {
      // Group into segments
      const segmentSize = timeRange === '30' ? 5 : 10;
      const segments = [];
      for (let i = 0; i < dailyData.length; i += segmentSize) {
        const segment = dailyData.slice(i, i + segmentSize);
        const total = segment.reduce((sum, d) => sum + d.value, 0);
        const startDate = segment[0]?.date;
        segments.push({ date: startDate, value: total });
      }

      return {
        labels: segments.map(s => formatShortDate(s.date)),
        datasets: [{ data: segments.map(s => s.value) }],
      };
    }
  };

  const getFocusByLabelChart = () => {
    const filtered = filterByTimeRange(focusLogs, 'date');
    if (filtered.length === 0) return { labels: ['No Data'], datasets: [{ data: [0] }] };
    const labelData = getFocusTimeByLabel(filtered);
    const sortedEntries = Object.entries(labelData).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (sortedEntries.length === 0) return { labels: ['No Data'], datasets: [{ data: [0] }] };
    // Convert minutes to hours for display
    return {
      labels: sortedEntries.map(([name]) => name.slice(0, 10)),
      datasets: [{ data: sortedEntries.map(([, value]) => Math.round(value / 60 * 10) / 10) }],
    };
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 122, b: 255 };
  };

  const primaryRgb = hexToRgb(colors.primary);
  const successRgb = hexToRgb(colors.success);
  const warningRgb = hexToRgb(colors.warning);

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
    propsForBackgroundLines: { stroke: colors.border, strokeDasharray: '' },
    fillShadowGradient: colors.primary,
    fillShadowGradientOpacity: 0.2,
    paddingLeft: 15,
    paddingRight: 15,
  };

  const sleepInsights = getSleepInsights();
  const workoutInsights = getWorkoutInsights();
  const focusInsights = getFocusInsights();

  if (!isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.lockedContainer}>
          <View style={[styles.lockedCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.lockedIcon}>📊</Text>
            <Text style={[styles.lockedTitle, { color: colors.text }]}>Premium Analytics</Text>
            <Text style={[styles.lockedDescription, { color: colors.textSecondary }]}>
              Unlock powerful insights to understand your habits and track progress over time.
            </Text>
            <View style={styles.lockedFeatures}>
              <View style={styles.featureRow}>
                <Text style={styles.featureIcon}>📈</Text>
                <Text style={[styles.lockedFeature, { color: colors.text }]}>Trend analysis & insights</Text>
              </View>
              <View style={styles.featureRow}>
                <Text style={styles.featureIcon}>🔥</Text>
                <Text style={[styles.lockedFeature, { color: colors.text }]}>Streak tracking</Text>
              </View>
              <View style={styles.featureRow}>
                <Text style={styles.featureIcon}>⭐</Text>
                <Text style={[styles.lockedFeature, { color: colors.text }]}>Quality ratings over time</Text>
              </View>
              <View style={styles.featureRow}>
                <Text style={styles.featureIcon}>🎯</Text>
                <Text style={[styles.lockedFeature, { color: colors.text }]}>Personal records & bests</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.unlockButton, { backgroundColor: colors.primary }]}
              onPress={() => showPaywall('visualizations')}
            >
              <Text style={[styles.unlockButtonText, { color: colors.textOnPrimary }]}>Unlock Premium</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Category Selector */}
        <View style={[styles.categorySelector, { backgroundColor: colors.surface }]}>
          {['sleep', 'workout', 'focus', 'achievements'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryButton, activeCategory === cat && { backgroundColor: colors.primary }]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.categoryText, { color: colors.textSecondary }, activeCategory === cat && { color: colors.textOnPrimary }]}>
                {cat === 'sleep' ? '😴 Sleep' : cat === 'workout' ? '💪 Workout' : cat === 'focus' ? '🎯 Focus' : '🏅 Awards'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time Range Selector */}
        {activeCategory !== 'achievements' && <View style={styles.timeRangeSelector}>
          {[{ label: '7D', value: '7' }, { label: '30D', value: '30' }, { label: 'All', value: 'all' }].map((range) => (
            <TouchableOpacity
              key={range.value}
              style={[styles.timeButton, { backgroundColor: colors.surface, borderColor: colors.border },
                timeRange === range.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setTimeRange(range.value)}
            >
              <Text style={[styles.timeText, { color: colors.textSecondary }, timeRange === range.value && { color: colors.textOnPrimary }]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>}

        {/* Workout View Toggle */}
        {activeCategory === 'workout' && (
          <View style={styles.viewToggle}>
            {[{ label: 'Charts', value: 'charts' }, { label: 'Body Map', value: 'bodymap' }].map((view) => (
              <TouchableOpacity
                key={view.value}
                style={[styles.viewToggleButton, { backgroundColor: colors.surface, borderColor: colors.border },
                  workoutView === view.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setWorkoutView(view.value)}
              >
                <Text style={[styles.viewToggleText, { color: colors.textSecondary },
                  workoutView === view.value && { color: colors.textOnPrimary }]}>
                  {view.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sleep Section */}
        {activeCategory === 'sleep' && (
          <>
            {sleepInsights ? (
              <>
                {/* Insights Cards */}
                <View style={styles.insightsGrid}>
                  <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.insightValue, { color: colors.primary }]}>{sleepInsights.avg}</Text>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Avg Sleep</Text>
                  </View>
                  <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.insightValue, { color: colors.success }]}>{sleepInsights.best}</Text>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Best Night</Text>
                  </View>
                  <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                    <View style={styles.trendContainer}>
                      <Text style={[styles.insightValue, { color: sleepInsights.trend >= 0 ? colors.success : colors.error }]}>
                        {sleepInsights.trend >= 0 ? '+' : ''}{sleepInsights.trend}%
                      </Text>
                      <Text style={{ fontSize: 16 }}>{sleepInsights.trend >= 0 ? '📈' : '📉'}</Text>
                    </View>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Trend</Text>
                  </View>
                  {sleepInsights.streak > 0 && (
                    <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                      <View style={styles.streakContainer}>
                        <Text style={[styles.insightValue, { color: colors.warning }]}>{sleepInsights.streak}</Text>
                        <Text style={{ fontSize: 16 }}>🔥</Text>
                      </View>
                      <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>7h+ Streak</Text>
                    </View>
                  )}
                  {sleepInsights.avgRating && (
                    <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                      <View style={styles.ratingContainer}>
                        <Text style={[styles.insightValue, { color: colors.primary }]}>{sleepInsights.avgRating}</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>/10</Text>
                      </View>
                      <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Avg Quality</Text>
                    </View>
                  )}
                  <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.insightValue, { color: colors.textSecondary }]}>{sleepInsights.total}</Text>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Total Nights</Text>
                  </View>
                </View>

                <View style={styles.chartSection}>
                  <Text style={[styles.chartTitle, { color: colors.text }]}>Sleep Duration</Text>
                  <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                    {timeRange === '7' ? 'Last 7 nights' : timeRange === '30' ? 'Last 14 nights' : 'Recent nights'}
                  </Text>
                  <LineChart
                    data={getSleepDurationChart()}
                    width={screenWidth - 20}
                    height={200}
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chart}
                    withInnerLines={false}
                    withOuterLines={false}
                  />
                </View>

                {sleepLogs.some(log => log.effectivenessRating) && (
                  <View style={styles.chartSection}>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Sleep Quality</Text>
                    <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Rating trends over time</Text>
                    <LineChart
                      data={getSleepQualityChart()}
                      width={screenWidth - 20}
                      height={200}
                      chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(${successRgb.r}, ${successRgb.g}, ${successRgb.b}, ${opacity})`, fillShadowGradient: colors.success}}
                      bezier
                      style={styles.chart}
                      withInnerLines={false}
                      withOuterLines={false}
                    />
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                <Text style={styles.emptyIcon}>😴</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sleep Data Yet</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Start logging your sleep to see insights here</Text>
              </View>
            )}
          </>
        )}

        {/* Workout Section */}
        {activeCategory === 'workout' && (
          <>
            {workoutInsights ? (
              <>
                <View style={styles.insightsGrid}>
                  <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.insightValue, { color: colors.primary }]}>{workoutInsights.total}</Text>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Workouts</Text>
                  </View>
                  <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.insightValue, { color: colors.success }]}>{workoutInsights.thisWeek}</Text>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>This Week</Text>
                  </View>
                  {workoutInsights.streak > 0 && (
                    <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                      <View style={styles.streakContainer}>
                        <Text style={[styles.insightValue, { color: colors.warning }]}>{workoutInsights.streak}</Text>
                        <Text style={{ fontSize: 16 }}>🔥</Text>
                      </View>
                      <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Day Streak</Text>
                    </View>
                  )}
                  {workoutInsights.totalVolume > 0 && (
                    <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                      <Text style={[styles.insightValue, { color: colors.primary }]} numberOfLines={1}>
                        {workoutInsights.totalVolume > 1000 ? `${(workoutInsights.totalVolume / 1000).toFixed(1)}k` : workoutInsights.totalVolume}
                      </Text>
                      <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Total Volume</Text>
                    </View>
                  )}
                  {workoutInsights.avgRating && (
                    <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                      <View style={styles.ratingContainer}>
                        <Text style={[styles.insightValue, { color: colors.primary }]}>{workoutInsights.avgRating}</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>/10</Text>
                      </View>
                      <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Avg Quality</Text>
                    </View>
                  )}
                  {workoutInsights.avgHeartRate && (
                    <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                      <View style={styles.healthDataContainer}>
                        <Text style={{ fontSize: 14 }}>❤️</Text>
                        <Text style={[styles.insightValue, { color: '#FF3B30' }]}>{workoutInsights.avgHeartRate}</Text>
                      </View>
                      <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Avg Heart Rate</Text>
                    </View>
                  )}
                  {workoutInsights.totalCalories > 0 && (
                    <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                      <View style={styles.healthDataContainer}>
                        <Text style={{ fontSize: 14 }}>🔥</Text>
                        <Text style={[styles.insightValue, { color: colors.warning }]}>
                          {workoutInsights.totalCalories > 1000
                            ? `${(workoutInsights.totalCalories / 1000).toFixed(1)}k`
                            : workoutInsights.totalCalories}
                        </Text>
                      </View>
                      <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Calories Burned</Text>
                    </View>
                  )}
                </View>

                {workoutView === 'bodymap' ? (
                  <>
                    {(() => {
                      const filteredWorkouts = filterByTimeRange(workoutLogs, 'date');
                      const bodyData = getBodyPartFrequency(filteredWorkouts);
                      const hasData = Object.keys(bodyData).length > 0;
                      return hasData ? (
                        <View style={[styles.chartSection, { alignItems: 'center' }]}>
                          <Text style={[styles.chartTitle, { color: colors.text, alignSelf: 'flex-start' }]}>Body Part Focus</Text>
                          <Text style={[styles.chartSubtitle, { color: colors.textSecondary, alignSelf: 'flex-start' }]}>
                            Which muscles you've been training
                          </Text>
                          <BodyDiagram data={bodyData} colors={colors} />
                        </View>
                      ) : (
                        <View style={[styles.bodyMapHint, { backgroundColor: colors.card }]}>
                          <Text style={[styles.bodyMapHintText, { color: colors.textSecondary }]}>
                            Add a target muscle group to your exercises to see the body map light up.
                          </Text>
                        </View>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    {/* Apple Health Banner */}
                    {workoutInsights.linkedWorkouts > 0 && (
                      <View style={[styles.healthBanner, { backgroundColor: '#FF3B3010', borderColor: '#FF3B30' }]}>
                        <Text style={styles.healthBannerIcon}>❤️</Text>
                        <Text style={[styles.healthBannerText, { color: '#FF3B30' }]}>
                          {workoutInsights.linkedWorkouts} workout{workoutInsights.linkedWorkouts !== 1 ? 's' : ''} linked with Apple Health
                        </Text>
                      </View>
                    )}

                    <View style={styles.chartSection}>
                      <Text style={[styles.chartTitle, { color: colors.text }]}>Workout Activity</Text>
                      <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                        {timeRange === '7' ? 'Daily workouts' : 'Workouts per 5-day period'}
                      </Text>
                      <BarChart
                        data={getWorkoutFrequencyChart()}
                        width={screenWidth - 20}
                        height={200}
                        chartConfig={chartConfig}
                        style={styles.chart}
                        showValuesOnTopOfBars
                        withInnerLines={false}
                      />
                    </View>

                    {/* Exercise Analytics Section */}
                    <View style={[styles.exerciseAnalyticsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.chartTitle, { color: colors.text }]}>Exercise Analytics</Text>
                      <Text style={[styles.chartSubtitle, { color: colors.textSecondary, marginBottom: 12 }]}>
                        {selectedExercise
                          ? `${timeRange === '7' ? 'Last 7 days' : timeRange === '30' ? 'Last 30 days' : 'All time'}`
                          : 'Select an exercise to see your progress'}
                      </Text>

                      <View style={styles.exercisePickerRow}>
                        <View style={styles.exercisePickerWrapper}>
                          <ExercisePicker
                            selectedExercise={selectedExercise}
                            onSelectExercise={handleExerciseSelect}
                            placeholder="Search for an exercise..."
                          />
                        </View>
                        {selectedExercise && (
                          <TouchableOpacity
                            style={[styles.clearExerciseButton, { backgroundColor: colors.surfaceSecondary }]}
                            onPress={clearExerciseSelection}
                          >
                            <Text style={[styles.clearExerciseText, { color: colors.textSecondary }]}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {exerciseStats && (
                        <View style={styles.exerciseStatsContainer}>
                          {exerciseStats.hasWeightData ? (
                            <>
                              <View style={styles.exerciseStatsGrid}>
                                <View style={[styles.exerciseStatCard, { backgroundColor: colors.surfaceSecondary }]}>
                                  <Text style={[styles.exerciseStatValue, { color: colors.primary }]}>
                                    {exerciseStats.maxWeight}
                                  </Text>
                                  <Text style={[styles.exerciseStatLabel, { color: colors.textSecondary }]}>Max Weight</Text>
                                </View>
                                <View style={[styles.exerciseStatCard, { backgroundColor: colors.surfaceSecondary }]}>
                                  <Text style={[styles.exerciseStatValue, { color: colors.success }]}>
                                    {exerciseStats.avgWeight}
                                  </Text>
                                  <Text style={[styles.exerciseStatLabel, { color: colors.textSecondary }]}>Avg Weight</Text>
                                </View>
                                <View style={[styles.exerciseStatCard, { backgroundColor: colors.surfaceSecondary }]}>
                                  <Text style={[styles.exerciseStatValue, { color: colors.warning }]}>
                                    {exerciseStats.totalSets}
                                  </Text>
                                  <Text style={[styles.exerciseStatLabel, { color: colors.textSecondary }]}>Total Sets</Text>
                                </View>
                                <View style={[styles.exerciseStatCard, { backgroundColor: colors.surfaceSecondary }]}>
                                  <Text style={[styles.exerciseStatValue, { color: colors.text }]}>
                                    {exerciseStats.totalReps}
                                  </Text>
                                  <Text style={[styles.exerciseStatLabel, { color: colors.textSecondary }]}>Total Reps</Text>
                                </View>
                              </View>
                              <View style={[styles.workoutCountBadge, { backgroundColor: colors.surfaceSecondary }]}>
                                <Text style={[styles.workoutCountText, { color: colors.textSecondary }]}>
                                  Across {exerciseStats.totalWorkouts} workout{exerciseStats.totalWorkouts !== 1 ? 's' : ''}
                                </Text>
                              </View>

                              {exerciseStats.trend && (
                                <View style={[styles.trendBadge, {
                                  backgroundColor: parseInt(exerciseStats.trend) >= 0 ? colors.success + '15' : colors.error + '15',
                                  borderColor: parseInt(exerciseStats.trend) >= 0 ? colors.success : colors.error,
                                }]}>
                                  <Text style={[styles.trendText, {
                                    color: parseInt(exerciseStats.trend) >= 0 ? colors.success : colors.error
                                  }]}>
                                    {parseInt(exerciseStats.trend) >= 0 ? '↑' : '↓'} {Math.abs(exerciseStats.trend)}% weight trend
                                  </Text>
                                </View>
                              )}

                              {exerciseStats.progressionData && exerciseStats.progressionData.length > 1 && (
                                <View style={styles.progressionChart}>
                                  <Text style={[styles.progressionTitle, { color: colors.textSecondary }]}>
                                    Weight Progression
                                  </Text>
                                  <LineChart
                                    data={{
                                      labels: exerciseStats.progressionData.map((d, i) =>
                                        i % Math.ceil(exerciseStats.progressionData.length / 5) === 0
                                          ? `${new Date(d.date).getMonth() + 1}/${new Date(d.date).getDate()}`
                                          : ''
                                      ),
                                      datasets: [{ data: exerciseStats.progressionData.map(d => d.weight) }],
                                    }}
                                    width={screenWidth - 64}
                                    height={150}
                                    chartConfig={{
                                      ...chartConfig,
                                      color: (opacity = 1) => `rgba(${successRgb.r}, ${successRgb.g}, ${successRgb.b}, ${opacity})`,
                                    }}
                                    bezier
                                    style={styles.miniChart}
                                    withInnerLines={false}
                                    withOuterLines={false}
                                  />
                                </View>
                              )}
                            </>
                          ) : (
                            <View style={styles.noWeightData}>
                              <Text style={[styles.noWeightDataText, { color: colors.textSecondary }]}>
                                No weight data recorded for {exerciseStats.exerciseName}
                              </Text>
                              <View style={styles.noWeightStatsRow}>
                                <View style={[styles.noWeightStatItem, { backgroundColor: colors.surfaceSecondary }]}>
                                  <Text style={[styles.noWeightStatValue, { color: colors.primary }]}>
                                    {exerciseStats.totalWorkouts}
                                  </Text>
                                  <Text style={[styles.noWeightStatLabel, { color: colors.textLight }]}>Workouts</Text>
                                </View>
                                <View style={[styles.noWeightStatItem, { backgroundColor: colors.surfaceSecondary }]}>
                                  <Text style={[styles.noWeightStatValue, { color: colors.success }]}>
                                    {exerciseStats.totalSets}
                                  </Text>
                                  <Text style={[styles.noWeightStatLabel, { color: colors.textLight }]}>Sets</Text>
                                </View>
                                <View style={[styles.noWeightStatItem, { backgroundColor: colors.surfaceSecondary }]}>
                                  <Text style={[styles.noWeightStatValue, { color: colors.warning }]}>
                                    {exerciseStats.totalReps}
                                  </Text>
                                  <Text style={[styles.noWeightStatLabel, { color: colors.textLight }]}>Reps</Text>
                                </View>
                              </View>
                            </View>
                          )}
                        </View>
                      )}

                      {!selectedExercise && (
                        <View style={styles.selectExerciseHint}>
                          <Text style={[styles.selectExerciseHintText, { color: colors.textLight }]}>
                            👆 Select an exercise above to see detailed analytics
                          </Text>
                        </View>
                      )}
                    </View>

                    {getVolumeChart().datasets[0].data.some(v => v > 0) && (
                      <View style={styles.chartSection}>
                        <Text style={[styles.chartTitle, { color: colors.text }]}>Volume Trend</Text>
                        <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                          Total weight × reps {getVolumeChart().isInThousands ? '(in thousands)' : ''}
                        </Text>
                        <LineChart
                          data={getVolumeChart()}
                          width={screenWidth - 20}
                          height={200}
                          chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(${successRgb.r}, ${successRgb.g}, ${successRgb.b}, ${opacity})`, fillShadowGradient: colors.success}}
                          bezier
                          style={styles.chart}
                          withInnerLines={false}
                          withOuterLines={false}
                        />
                      </View>
                    )}

                    {getWorkoutQualityChart() && (
                      <View style={styles.chartSection}>
                        <Text style={[styles.chartTitle, { color: colors.text }]}>Workout Quality</Text>
                        <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Your ratings over time</Text>
                        <LineChart
                          data={getWorkoutQualityChart()}
                          width={screenWidth - 20}
                          height={200}
                          chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${opacity})`, fillShadowGradient: colors.primary}}
                          bezier
                          style={styles.chart}
                          withInnerLines={false}
                          withOuterLines={false}
                        />
                      </View>
                    )}

                    {/* Apple Health Data Section */}
                    {healthKitEnabled && (
                      <>
                        <View style={styles.healthKitSectionHeader}>
                          <Text style={styles.healthKitSectionIcon}>❤️</Text>
                          <View>
                            <Text style={[styles.healthKitSectionTitle, { color: colors.text }]}>Apple Health Data</Text>
                            <Text style={[styles.healthKitSectionNote, { color: colors.textSecondary }]}>Synced from Apple Health</Text>
                          </View>
                        </View>

                        {healthKitLoading && (
                          <View style={{ padding: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={colors.primary} />
                          </View>
                        )}

                        {!healthKitLoading && getStepsChartData() && (
                          <View style={styles.chartSection}>
                            <Text style={[styles.chartTitle, { color: colors.text }]}>Daily Steps</Text>
                            <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                              {timeRange === '7' ? 'Last 7 days' : timeRange === '30' ? 'Last 30 days' : 'Last 90 days'}
                            </Text>
                            <BarChart
                              data={getStepsChartData()}
                              width={screenWidth - 20}
                              height={200}
                              chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(${successRgb.r}, ${successRgb.g}, ${successRgb.b}, ${opacity})`, fillShadowGradient: colors.success}}
                              style={styles.chart}
                              showValuesOnTopOfBars
                              withInnerLines={false}
                            />
                          </View>
                        )}

                        {!healthKitLoading && getCaloriesChartData() && (
                          <View style={styles.chartSection}>
                            <Text style={[styles.chartTitle, { color: colors.text }]}>Daily Active Calories</Text>
                            <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                              {timeRange === '7' ? 'Last 7 days' : timeRange === '30' ? 'Last 30 days' : 'Last 90 days'}
                            </Text>
                            <BarChart
                              data={getCaloriesChartData()}
                              width={screenWidth - 20}
                              height={200}
                              chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(${warningRgb.r}, ${warningRgb.g}, ${warningRgb.b}, ${opacity})`, fillShadowGradient: colors.warning}}
                              style={styles.chart}
                              showValuesOnTopOfBars
                              withInnerLines={false}
                            />
                          </View>
                        )}

                        {!healthKitLoading && getHeartRateChartData() && (
                          <View style={styles.chartSection}>
                            <Text style={[styles.chartTitle, { color: colors.text }]}>Heart Rate Trend</Text>
                            <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Daily average BPM</Text>
                            <LineChart
                              data={getHeartRateChartData()}
                              width={screenWidth - 20}
                              height={200}
                              chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
                                fillShadowGradient: '#FF3B30',
                                propsForDots: { r: '4', strokeWidth: '2', stroke: '#FF3B30' },
                              }}
                              bezier
                              style={styles.chart}
                              withInnerLines={false}
                              withOuterLines={false}
                            />
                          </View>
                        )}

                        {!healthKitLoading && !getStepsChartData() && !getCaloriesChartData() && !getHeartRateChartData() && (
                          <View style={[styles.emptyState, { backgroundColor: colors.card, marginTop: 0 }]}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                              No Apple Health data available for this time range. Make sure Health data is being recorded on your device.
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                <Text style={styles.emptyIcon}>💪</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Workout Data Yet</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Start logging workouts to see insights here</Text>
              </View>
            )}
          </>
        )}

        {/* Focus Section */}
        {activeCategory === 'focus' && (
          <>
            {focusInsights ? (
              <>
                <View style={styles.insightsGrid}>
                  <TouchableOpacity
                    style={[styles.insightCard, { backgroundColor: colors.card }]}
                    onPress={() => setFocusTimeInMinutes(!focusTimeInMinutes)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.insightValue, { color: colors.primary }]}>
                      {focusTimeInMinutes ? `${focusInsights.totalMinutes}m` : focusInsights.totalHours}
                    </Text>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Total Focus</Text>
                    <Text style={[styles.tapHint, { color: colors.textLight }]}>tap to switch</Text>
                  </TouchableOpacity>
                  <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.insightValue, { color: colors.success }]}>{focusInsights.sessions}</Text>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Sessions</Text>
                  </View>
                  <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.insightValue, { color: colors.primary }]}>{focusInsights.avgSession}m</Text>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Avg Session</Text>
                  </View>
                  <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.insightValue, { color: colors.warning }]}>{focusInsights.bestSession}m</Text>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Best Session</Text>
                  </View>
                  {focusInsights.totalBouts > 0 && (
                    <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                      <Text style={[styles.insightValue, { color: colors.primary }]}>{focusInsights.totalBouts}</Text>
                      <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Total Bouts</Text>
                    </View>
                  )}
                  {focusInsights.avgRating && (
                    <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                      <View style={styles.ratingContainer}>
                        <Text style={[styles.insightValue, { color: colors.primary }]}>{focusInsights.avgRating}</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>/10</Text>
                      </View>
                      <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Avg Quality</Text>
                    </View>
                  )}
                </View>

                <View style={styles.chartSection}>
                  <Text style={[styles.chartTitle, { color: colors.text }]}>Focus Time</Text>
                  <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                    {timeRange === '7' ? 'Daily hours' : 'Hours per 5-day period'}
                  </Text>
                  <LineChart
                    data={getFocusTimeChart()}
                    width={screenWidth - 20}
                    height={200}
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chart}
                    withInnerLines={false}
                    withOuterLines={false}
                  />
                </View>

                <View style={styles.chartSection}>
                  <Text style={[styles.chartTitle, { color: colors.text }]}>Time by Activity</Text>
                  <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Hours per label</Text>
                  <BarChart
                    data={getFocusByLabelChart()}
                    width={screenWidth - 20}
                    height={200}
                    chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(${successRgb.r}, ${successRgb.g}, ${successRgb.b}, ${opacity})`}}
                    style={styles.chart}
                    showValuesOnTopOfBars
                    withInnerLines={false}
                  />
                </View>
              </>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                <Text style={styles.emptyIcon}>🎯</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Focus Data Yet</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Start logging focus sessions to see insights here</Text>
              </View>
            )}
          </>
        )}

        {activeCategory === 'achievements' && (() => {
          const categoryColors = { workout: '#FF8C00', sleep: '#8B5CF6', focus: '#06B6D4' };
          const byCategory = earnedAchievements.reduce((acc, badge) => {
            const cat = badge.category || 'workout';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(badge);
            return acc;
          }, {});
          const total = earnedAchievements.length;
          const workoutCount = (byCategory.workout || []).length;
          const sleepCount = (byCategory.sleep || []).length;
          const focusCount = (byCategory.focus || []).length;

          return (
            <>
              {/* Summary row */}
              <View style={styles.achieveSummaryRow}>
                <View style={[styles.achieveSummaryCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                  <Text style={[styles.achieveSummaryValue, { color: colors.primary }]}>{total}</Text>
                  <Text style={[styles.achieveSummaryLabel, { color: colors.textLight }]}>Total Earned</Text>
                </View>
                <View style={[styles.achieveSummaryCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                  <Text style={[styles.achieveSummaryValue, { color: '#FF8C00' }]}>{workoutCount}</Text>
                  <Text style={[styles.achieveSummaryLabel, { color: colors.textLight }]}>Workout</Text>
                </View>
                <View style={[styles.achieveSummaryCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                  <Text style={[styles.achieveSummaryValue, { color: '#8B5CF6' }]}>{sleepCount}</Text>
                  <Text style={[styles.achieveSummaryLabel, { color: colors.textLight }]}>Sleep</Text>
                </View>
                <View style={[styles.achieveSummaryCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                  <Text style={[styles.achieveSummaryValue, { color: '#06B6D4' }]}>{focusCount}</Text>
                  <Text style={[styles.achieveSummaryLabel, { color: colors.textLight }]}>Focus</Text>
                </View>
              </View>

              {total === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                  <Text style={styles.emptyIcon}>🏅</Text>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Badges Yet</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Log workouts, sleep, and focus sessions to earn your first badge</Text>
                </View>
              ) : (
                ['workout', 'sleep', 'focus'].map((cat) => {
                  const badges = byCategory[cat];
                  if (!badges || badges.length === 0) return null;
                  const catColor = categoryColors[cat];
                  const catLabel = cat === 'workout' ? '💪 Workout Badges' : cat === 'sleep' ? '😴 Sleep Badges' : '🎯 Focus Badges';
                  return (
                    <View key={cat} style={[styles.achieveCategorySection, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                      <View style={[styles.achieveCategoryHeader, { borderLeftColor: catColor }]}>
                        <Text style={[styles.achieveCategoryTitle, { color: colors.text }]}>{catLabel}</Text>
                        <View style={[styles.achieveCountPill, { backgroundColor: catColor + '22' }]}>
                          <Text style={[styles.achieveCountText, { color: catColor }]}>{badges.length}</Text>
                        </View>
                      </View>
                      {badges.map((badge, i) => (
                        <View key={i} style={[styles.achieveBadgeRow, i < badges.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                          <View style={[styles.achieveIconCircle, { backgroundColor: catColor + '22' }]}>
                            <Text style={styles.achieveIcon}>{badge.icon}</Text>
                          </View>
                          <View style={styles.achieveBadgeInfo}>
                            <Text style={[styles.achieveBadgeName, { color: colors.text }]}>{badge.label}</Text>
                            <Text style={[styles.achieveBadgeDesc, { color: colors.textSecondary }]}>{badge.desc}</Text>
                            {badge.earnedAt && (
                              <Text style={[styles.achieveBadgeDate, { color: colors.textLight }]}>
                                Earned {new Date(badge.earnedAt).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                          <View style={[styles.achieveEarnedDot, { backgroundColor: catColor }]} />
                        </View>
                      ))}
                    </View>
                  );
                })
              )}
            </>
          );
        })()}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categorySelector: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeRangeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    justifyContent: 'center',
    gap: 12,
  },
  timeButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  insightCard: {
    width: '30%',
    margin: '1.5%',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  insightValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  insightLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  tapHint: {
    fontSize: 9,
    marginTop: 2,
    fontStyle: 'italic',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  chartSection: {
    marginTop: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  chartSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
    marginLeft: -10,
  },
  chartWrapper: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  emptyState: {
    margin: 16,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockedCard: {
    width: '100%',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  lockedIcon: {
    fontSize: 72,
    marginBottom: 20,
  },
  lockedTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  lockedDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  lockedFeatures: {
    alignSelf: 'stretch',
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
  },
  lockedFeature: {
    fontSize: 15,
    fontWeight: '500',
  },
  unlockButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  unlockButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  healthDataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  healthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  healthBannerIcon: {
    fontSize: 14,
  },
  healthBannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  exerciseAnalyticsSection: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  exerciseStatsContainer: {
    marginTop: 16,
  },
  exerciseStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  exerciseStatCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  exerciseStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  exerciseStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  trendBadge: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressionChart: {
    marginTop: 16,
  },
  progressionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  miniChart: {
    borderRadius: 12,
    marginLeft: -16,
  },
  workoutCountBadge: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  workoutCountText: {
    fontSize: 13,
    fontWeight: '500',
  },
  noWeightData: {
    padding: 16,
    alignItems: 'center',
  },
  noWeightDataText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  noWeightStatsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  noWeightStatItem: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  noWeightStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  noWeightStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  selectExerciseHint: {
    padding: 20,
    alignItems: 'center',
  },
  selectExerciseHintText: {
    fontSize: 14,
    textAlign: 'center',
  },
  exercisePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exercisePickerWrapper: {
    flex: 1,
  },
  clearExerciseButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearExerciseText: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    justifyContent: 'center',
    gap: 12,
  },
  viewToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bodyMapHint: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  bodyMapHintText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  healthKitSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 4,
    gap: 10,
  },
  healthKitSectionIcon: {
    fontSize: 24,
  },
  healthKitSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  healthKitSectionNote: {
    fontSize: 12,
    marginTop: 1,
  },
  achieveSummaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  achieveSummaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  achieveSummaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  achieveSummaryLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  achieveCategorySection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  achieveCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 12,
  },
  achieveCategoryTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  achieveCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  achieveCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  achieveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  achieveIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achieveIcon: {
    fontSize: 20,
  },
  achieveBadgeInfo: {
    flex: 1,
  },
  achieveBadgeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  achieveBadgeDesc: {
    fontSize: 12,
  },
  achieveBadgeDate: {
    fontSize: 11,
    marginTop: 2,
  },
  achieveEarnedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
