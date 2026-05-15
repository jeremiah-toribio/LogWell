/**
 * Data Models for Logger App
 * Designed to be scalable for integration with Apple Health, Google Fit, and other sources
 */

// Data source types
export const DATA_SOURCES = {
  MANUAL: 'manual',           // Manually entered by user
  TIMER: 'timer',             // From in-app timer
  APPLE_HEALTH: 'apple_health',
  GOOGLE_FIT: 'google_fit',
  FITBIT: 'fitbit',
  WHOOP: 'whoop',
  OURA: 'oura',
  // Add more sources as needed
};

export const SYNC_STATUS = {
  LOCAL_ONLY: 'local_only',   // Not synced anywhere
  SYNCED: 'synced',           // Successfully synced
  PENDING: 'pending',         // Waiting to sync
  CONFLICT: 'conflict',       // Conflicting data from multiple sources
  ERROR: 'error',             // Sync error
};

/**
 * Sleep Log Structure
 *
 * Example:
 * {
 *   id: "1705287600000",
 *   dateRange: "01/05 + 01/06",
 *   sleepTime: "23:04",
 *   wakeTime: "06:09",
 *   totalHours: "7.08",
 *   source: "manual",
 *   externalId: null,
 *   metadata: {},
 *   createdAt: "2026-01-15T10:30:00.000Z",
 *   updatedAt: "2026-01-15T10:30:00.000Z",
 *   syncStatus: "local_only"
 * }
 */
export const createSleepLog = ({
  dateRange,
  sleepTime,
  wakeTime,
  totalHours,
  effectivenessRating = null,
  label = null,
  source = DATA_SOURCES.MANUAL,
  externalId = null,
  metadata = {},
}) => ({
  id: Date.now().toString(),
  dateRange,
  sleepTime,
  wakeTime,
  totalHours,
  effectivenessRating: effectivenessRating ? parseInt(effectivenessRating) : null,
  label,
  source,
  externalId,
  metadata: {
    ...metadata,
    // Reserve space for future fields from Apple Health, etc.
    // deepSleepMinutes, remSleepMinutes, heartRate, etc.
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  syncStatus: SYNC_STATUS.LOCAL_ONLY,
});

/**
 * Workout Log Structure
 *
 * Example:
 * {
 *   id: "1705374000000",
 *   date: "2026-01-12T00:00:00.000Z",
 *   exercises: [...],
 *   source: "manual",
 *   externalId: null,
 *   metadata: {},
 *   createdAt: "2026-01-15T10:30:00.000Z",
 *   updatedAt: "2026-01-15T10:30:00.000Z",
 *   syncStatus: "local_only"
 * }
 */
export const createWorkoutLog = ({
  date,
  exercises = [],
  duration = null,
  effectivenessRating = null,
  label = null,
  source = DATA_SOURCES.MANUAL,
  externalId = null,
  metadata = {},
}) => ({
  id: Date.now().toString(),
  date: typeof date === 'string' ? date : date.toISOString(),
  exercises: exercises.map(createExercise),
  duration,
  effectivenessRating: effectivenessRating ? parseInt(effectivenessRating) : null,
  label,
  source,
  externalId,
  metadata: {
    ...metadata,
    // Reserve space for future fields
    // caloriesBurned, avgHeartRate, location, weather, etc.
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  syncStatus: SYNC_STATUS.LOCAL_ONLY,
});

/**
 * Exercise Structure (nested within Workout)
 *
 * Example:
 * {
 *   id: "1705374001000",
 *   name: "Bench Press",
 *   target: "Chest",
 *   weight: "135-245",
 *   sets: 4,
 *   reps: 6,
 *   notes: "Explosive"
 * }
 */
export const createExercise = (exerciseData) => {
  const {
    name,
    target = '',
    weight = 'BW',
    sets = 0,
    reps = 0,
    notes = '',
    trackSets = false,
    externalId = null,
  } = exerciseData;

  // Handle both set mode (sets is array of objects) and simple mode (sets is number)
  const isSetMode = Array.isArray(sets);

  const baseExercise = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name,
    target,
    notes,
    externalId,
  };

  if (isSetMode) {
    // Set mode: preserve the sets array with weight/reps per set
    return {
      ...baseExercise,
      trackSets: true,
      sets: sets, // Keep the array as-is
    };
  } else {
    // Simple mode: weight/sets/reps at exercise level
    return {
      ...baseExercise,
      trackSets: false,
      weight,
      sets: parseInt(sets) || 0,
      reps: parseInt(reps) || 0,
    };
  }
};

/**
 * Health Data Integration Schema
 * For storing metadata from external sources like Apple Health
 */
export const HEALTH_DATA_TYPES = {
  SLEEP: {
    TOTAL_DURATION: 'total_sleep_duration',
    DEEP_SLEEP: 'deep_sleep_duration',
    REM_SLEEP: 'rem_sleep_duration',
    LIGHT_SLEEP: 'light_sleep_duration',
    AWAKE_TIME: 'awake_duration',
    HEART_RATE: 'avg_heart_rate',
    RESPIRATORY_RATE: 'respiratory_rate',
    SLEEP_QUALITY: 'sleep_quality_score',
  },
  WORKOUT: {
    ACTIVITY_TYPE: 'activity_type',
    DURATION: 'duration_minutes',
    DISTANCE: 'distance_meters',
    CALORIES: 'calories_burned',
    AVG_HEART_RATE: 'avg_heart_rate',
    MAX_HEART_RATE: 'max_heart_rate',
    ELEVATION_GAIN: 'elevation_gain',
  },
};

/**
 * Helper function to merge data from external sources
 * Useful when importing from Apple Health, etc.
 */
export const mergeExternalData = (localLog, externalData, sourceType) => ({
  ...localLog,
  externalId: externalData.id || localLog.externalId,
  source: sourceType,
  metadata: {
    ...localLog.metadata,
    ...externalData,
    importedAt: new Date().toISOString(),
  },
  updatedAt: new Date().toISOString(),
  syncStatus: SYNC_STATUS.SYNCED,
});

/**
 * Validation helpers
 */
export const validateSleepLog = (sleepLog) => {
  if (!sleepLog.dateRange || !sleepLog.sleepTime || !sleepLog.wakeTime) {
    throw new Error('Sleep log must have dateRange, sleepTime, and wakeTime');
  }
  return true;
};

export const validateWorkoutLog = (workoutLog) => {
  if (!workoutLog.date || !workoutLog.exercises || workoutLog.exercises.length === 0) {
    throw new Error('Workout log must have date and at least one exercise');
  }
  return true;
};

/**
 * Focus Log Structure
 *
 * Example:
 * {
 *   id: "1705374000000",
 *   date: "2026-01-15T10:30:00.000Z",
 *   label: "Work project - API integration",
 *   totalMinutes: 125,
 *   pomodoros: [
 *     { duration: 25, completed: true, startTime: "10:00", endTime: "10:25" },
 *     { duration: 25, completed: true, startTime: "10:30", endTime: "10:55" },
 *     { duration: 25, completed: false, startTime: "11:00", endTime: null }
 *   ],
 *   pomodoroLength: 25,
 *   breakLength: 5,
 *   source: "timer",
 *   externalId: null,
 *   metadata: {},
 *   createdAt: "2026-01-15T10:30:00.000Z",
 *   updatedAt: "2026-01-15T10:30:00.000Z",
 *   syncStatus: "local_only"
 * }
 */
export const createFocusLog = ({
  label,
  totalMinutes = 0,
  pomodoros = [],
  pomodoroLength = 25,
  breakLength = 5,
  effectivenessRating = null,
  date = new Date(),
  source = DATA_SOURCES.TIMER,
  externalId = null,
  metadata = {},
}) => ({
  id: Date.now().toString(),
  date: typeof date === 'string' ? date : date.toISOString(),
  label,
  totalMinutes,
  pomodoros: pomodoros.map(createPomodoro),
  pomodoroLength,
  breakLength,
  effectivenessRating: effectivenessRating ? parseInt(effectivenessRating) : null,
  source,
  externalId,
  metadata: {
    ...metadata,
    // Reserve space for future fields
    // focusScore, distractionCount, environment, etc.
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  syncStatus: SYNC_STATUS.LOCAL_ONLY,
});

/**
 * Pomodoro Structure (nested within Focus Log)
 *
 * Example:
 * {
 *   id: "1705374001000",
 *   duration: 25,
 *   completed: true,
 *   startTime: "10:00",
 *   endTime: "10:25"
 * }
 */
export const createPomodoro = ({
  duration,
  completed = false,
  startTime = null,
  endTime = null,
}) => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  duration,
  completed,
  startTime,
  endTime,
});

export const validateFocusLog = (focusLog) => {
  if (!focusLog.label || !focusLog.date) {
    throw new Error('Focus log must have label and date');
  }
  return true;
};
