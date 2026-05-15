// HealthKit Integration Service
// Uses @kingstinct/react-native-healthkit for Apple Health integration
// Will gracefully degrade when HealthKit is not available

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTHKIT_CONNECTED_KEY = '@healthkit_connected';

let HealthKit = null;
let healthKitAvailable = false;

// Try to import HealthKit - will fail gracefully if not installed
try {
  HealthKit = require('@kingstinct/react-native-healthkit');
  healthKitAvailable = Platform.OS === 'ios' && HealthKit != null;
} catch (e) {
  console.log('HealthKit not available - install @kingstinct/react-native-healthkit for full functionality');
}

// Initialize HealthKit and request permissions
export const initializeHealthKit = async () => {
  if (!healthKitAvailable) {
    return { available: false, message: 'HealthKit not available on this device' };
  }

  try {
    await HealthKit.requestAuthorization({
      toRead: [
        'HKWorkoutTypeIdentifier',
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierBasalEnergyBurned',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
      ],
      toShare: [],
    });
    return { available: true, message: 'HealthKit initialized' };
  } catch (error) {
    console.log('HealthKit init error:', error);
    throw error;
  }
};

// Check if HealthKit is available
export const isHealthKitAvailable = () => {
  return healthKitAvailable;
};

// Check if user has opted in to HealthKit connection
export const isHealthKitConnected = async () => {
  try {
    const value = await AsyncStorage.getItem(HEALTHKIT_CONNECTED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
};

// Connect to Apple Health - requests permissions and persists opt-in state
export const connectHealthKit = async () => {
  const result = await initializeHealthKit();
  if (result.available) {
    await AsyncStorage.setItem(HEALTHKIT_CONNECTED_KEY, 'true');
  }
  return result;
};

// Disconnect from Apple Health - clears persisted opt-in state (iOS permissions remain at OS level)
export const disconnectHealthKit = async () => {
  await AsyncStorage.removeItem(HEALTHKIT_CONNECTED_KEY);
};

// Get workouts from Apple Health within a date range
export const getHealthKitWorkouts = async (startDate, endDate) => {
  if (!healthKitAvailable) {
    return [];
  }

  try {
    const results = await HealthKit.queryWorkoutSamples({
      filter: {
        date: { startDate, endDate },
      },
      limit: 0,
    });

    // Transform to our format
    const workouts = results.map(workout => ({
      id: workout.uuid,
      sourceId: workout.source?.bundleIdentifier || '',
      sourceName: workout.source?.name || '',
      startDate: new Date(workout.startDate),
      endDate: new Date(workout.endDate),
      duration: workout.duration?.quantity
        ? workout.duration.quantity / 60
        : (new Date(workout.endDate) - new Date(workout.startDate)) / (1000 * 60),
      activityType: workout.workoutActivityType
        ? mapWorkoutType(workout.workoutActivityType)
        : 'Workout',
      calories: workout.totalEnergyBurned?.quantity || 0,
      distance: workout.totalDistance?.quantity || 0,
      metadata: workout.metadata || {},
    }));

    return workouts;
  } catch (error) {
    console.log('Error fetching workouts:', error);
    return [];
  }
};

// Get heart rate samples for a time range
export const getHeartRateData = async (startDate, endDate) => {
  if (!healthKitAvailable) {
    return { samples: [], average: null, max: null, min: null };
  }

  try {
    const results = await HealthKit.queryQuantitySamples(
      'HKQuantityTypeIdentifierHeartRate',
      {
        limit: 0,
        unit: 'count/min',
        filter: {
          date: { startDate, endDate },
        },
      }
    );

    if (!results || results.length === 0) {
      return { samples: [], average: null, max: null, min: null };
    }

    const heartRates = results.map(r => r.quantity);
    const average = Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length);
    const max = Math.max(...heartRates);
    const min = Math.min(...heartRates);

    return {
      samples: results,
      average,
      max,
      min,
    };
  } catch (error) {
    console.log('Error fetching heart rate:', error);
    return { samples: [], average: null, max: null, min: null };
  }
};

// Get calories burned for a time range
export const getCaloriesBurned = async (startDate, endDate) => {
  if (!healthKitAvailable) {
    return { active: 0, basal: 0, total: 0 };
  }

  try {
    const [activeResults, basalResults] = await Promise.all([
      HealthKit.queryQuantitySamples(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        {
          limit: 0,
          unit: 'kcal',
          filter: { date: { startDate, endDate } },
        }
      ),
      HealthKit.queryQuantitySamples(
        'HKQuantityTypeIdentifierBasalEnergyBurned',
        {
          limit: 0,
          unit: 'kcal',
          filter: { date: { startDate, endDate } },
        }
      ),
    ]);

    const active = Math.round(
      (activeResults || []).reduce((sum, r) => sum + (r.quantity || 0), 0)
    );
    const basal = Math.round(
      (basalResults || []).reduce((sum, r) => sum + (r.quantity || 0), 0)
    );

    return {
      active,
      basal,
      total: active + basal,
    };
  } catch (error) {
    console.log('Error fetching calories:', error);
    return { active: 0, basal: 0, total: 0 };
  }
};

// Get daily step counts aggregated by day
export const getDailyStepCounts = async (startDate, endDate) => {
  if (!healthKitAvailable) {
    return [];
  }

  try {
    const results = await HealthKit.queryStatisticsCollectionForQuantity(
      'HKQuantityTypeIdentifierStepCount',
      ['cumulativeSum'],
      startDate,
      { day: 1 },
      {
        filter: { date: { startDate, endDate } },
        unit: 'count',
      }
    );

    return (results || []).map(r => ({
      date: new Date(r.startDate),
      steps: r.sumQuantity?.quantity || 0,
    }));
  } catch (error) {
    console.log('Error fetching daily steps:', error);
    return [];
  }
};

// Get daily active calories aggregated by day
export const getDailyActiveCalories = async (startDate, endDate) => {
  if (!healthKitAvailable) {
    return [];
  }

  try {
    const results = await HealthKit.queryStatisticsCollectionForQuantity(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      ['cumulativeSum'],
      startDate,
      { day: 1 },
      {
        filter: { date: { startDate, endDate } },
        unit: 'kcal',
      }
    );

    return (results || []).map(r => ({
      date: new Date(r.startDate),
      calories: r.sumQuantity?.quantity || 0,
    }));
  } catch (error) {
    console.log('Error fetching daily calories:', error);
    return [];
  }
};

// Get daily heart rate averages aggregated by day
export const getDailyHeartRateAvg = async (startDate, endDate) => {
  if (!healthKitAvailable) {
    return [];
  }

  try {
    const results = await HealthKit.queryStatisticsCollectionForQuantity(
      'HKQuantityTypeIdentifierHeartRate',
      ['discreteAverage', 'discreteMax', 'discreteMin'],
      startDate,
      { day: 1 },
      {
        filter: { date: { startDate, endDate } },
        unit: 'count/min',
      }
    );

    return (results || []).map(r => ({
      date: new Date(r.startDate),
      avg: r.averageQuantity?.quantity || 0,
      max: r.maximumQuantity?.quantity || 0,
      min: r.minimumQuantity?.quantity || 0,
    }));
  } catch (error) {
    console.log('Error fetching daily heart rate:', error);
    return [];
  }
};

// Find potential matching workouts from HealthKit for a given date/time
export const findMatchingWorkouts = async (workoutDate, toleranceMinutes = 60) => {
  if (!healthKitAvailable) {
    return [];
  }

  const date = new Date(workoutDate);
  const startDate = new Date(date.getTime() - toleranceMinutes * 60 * 1000);
  const endDate = new Date(date.getTime() + toleranceMinutes * 60 * 1000);

  const healthWorkouts = await getHealthKitWorkouts(startDate, endDate);

  return healthWorkouts.map(workout => ({
    ...workout,
    matchScore: calculateMatchScore(date, workout.startDate),
  })).sort((a, b) => b.matchScore - a.matchScore);
};

// Calculate how well a HealthKit workout matches our logged time
const calculateMatchScore = (loggedDate, healthKitDate) => {
  const diffMinutes = Math.abs(loggedDate - healthKitDate) / (1000 * 60);
  // Score from 0-100, where 100 is exact match
  return Math.max(0, 100 - diffMinutes);
};

// Get enriched workout data (heart rate, calories) for a matched workout
export const getWorkoutHealthData = async (startDate, endDate) => {
  const [heartRate, calories] = await Promise.all([
    getHeartRateData(startDate, endDate),
    getCaloriesBurned(startDate, endDate),
  ]);

  return {
    heartRate,
    calories,
    hasHealthData: heartRate.average !== null || calories.total > 0,
  };
};

// Map Apple's workout type IDs to readable names
const mapWorkoutType = (activityType) => {
  // The new library uses string identifiers like 'HKWorkoutActivityTypeRunning'
  // or numeric IDs - handle both
  if (typeof activityType === 'string') {
    const match = activityType.match(/HKWorkoutActivityType(.+)/);
    if (match) {
      // Convert camelCase to space-separated words
      return match[1].replace(/([A-Z])/g, ' $1').trim();
    }
    return activityType;
  }

  const workoutTypes = {
    1: 'American Football',
    2: 'Archery',
    3: 'Australian Football',
    4: 'Badminton',
    5: 'Baseball',
    6: 'Basketball',
    7: 'Bowling',
    8: 'Boxing',
    9: 'Climbing',
    10: 'Cricket',
    11: 'Cross Training',
    12: 'Curling',
    13: 'Cycling',
    14: 'Dance',
    15: 'Dance Inspired Training',
    16: 'Elliptical',
    17: 'Equestrian Sports',
    18: 'Fencing',
    19: 'Fishing',
    20: 'Functional Strength Training',
    21: 'Golf',
    22: 'Gymnastics',
    23: 'Handball',
    24: 'Hiking',
    25: 'Hockey',
    26: 'Hunting',
    27: 'Lacrosse',
    28: 'Martial Arts',
    29: 'Mind and Body',
    30: 'Mixed Metabolic Cardio',
    31: 'Paddle Sports',
    32: 'Play',
    33: 'Preparation and Recovery',
    34: 'Racquetball',
    35: 'Rowing',
    36: 'Rugby',
    37: 'Running',
    38: 'Sailing',
    39: 'Skating Sports',
    40: 'Snow Sports',
    41: 'Soccer',
    42: 'Softball',
    43: 'Squash',
    44: 'Stair Climbing',
    45: 'Surfing Sports',
    46: 'Swimming',
    47: 'Table Tennis',
    48: 'Tennis',
    49: 'Track and Field',
    50: 'Traditional Strength Training',
    51: 'Volleyball',
    52: 'Walking',
    53: 'Water Fitness',
    54: 'Water Polo',
    55: 'Water Sports',
    56: 'Wrestling',
    57: 'Yoga',
    58: 'Barre',
    59: 'Core Training',
    60: 'Cross Country Skiing',
    61: 'Downhill Skiing',
    62: 'Flexibility',
    63: 'High Intensity Interval Training',
    64: 'Jump Rope',
    65: 'Kickboxing',
    66: 'Pilates',
    67: 'Snowboarding',
    68: 'Stairs',
    69: 'Step Training',
    70: 'Wheelchair Walk Pace',
    71: 'Wheelchair Run Pace',
    72: 'Tai Chi',
    73: 'Mixed Cardio',
    74: 'Hand Cycling',
    75: 'Disc Sports',
    76: 'Fitness Gaming',
    77: 'Cooldown',
    3000: 'Other',
  };
  return workoutTypes[activityType] || 'Workout';
};

// Format duration nicely
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default {
  initializeHealthKit,
  isHealthKitAvailable,
  isHealthKitConnected,
  connectHealthKit,
  disconnectHealthKit,
  getHealthKitWorkouts,
  getHeartRateData,
  getCaloriesBurned,
  getDailyStepCounts,
  getDailyActiveCalories,
  getDailyHeartRateAvg,
  findMatchingWorkouts,
  getWorkoutHealthData,
  formatDuration,
};
