import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSleepLog, createWorkoutLog, createFocusLog, validateSleepLog, validateWorkoutLog, validateFocusLog } from '../models/dataModels';

const SLEEP_LOGS_KEY = '@sleep_logs';
const WORKOUT_LOGS_KEY = '@workout_logs';
const FOCUS_LOGS_KEY = '@focus_logs';

export const saveSleepLog = async (sleepLogData) => {
  try {
    // Use the model to create properly structured data
    const sleepLog = createSleepLog(sleepLogData);
    validateSleepLog(sleepLog);

    const existingLogs = await getSleepLogs();
    const updatedLogs = [...existingLogs, sleepLog];
    await AsyncStorage.setItem(SLEEP_LOGS_KEY, JSON.stringify(updatedLogs));
    return updatedLogs;
  } catch (error) {
    console.error('Error saving sleep log:', error);
    throw error;
  }
};

export const getSleepLogs = async () => {
  try {
    const logs = await AsyncStorage.getItem(SLEEP_LOGS_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Error getting sleep logs:', error);
    return [];
  }
};

export const deleteSleepLog = async (id) => {
  try {
    const existingLogs = await getSleepLogs();
    const updatedLogs = existingLogs.filter(log => log.id !== id);
    await AsyncStorage.setItem(SLEEP_LOGS_KEY, JSON.stringify(updatedLogs));
    return updatedLogs;
  } catch (error) {
    console.error('Error deleting sleep log:', error);
    throw error;
  }
};

export const updateSleepLog = async (id, updates) => {
  try {
    const existingLogs = await getSleepLogs();
    const updatedLogs = existingLogs.map(log => {
      if (log.id === id) {
        return { ...log, ...updates, updatedAt: new Date().toISOString() };
      }
      return log;
    });
    await AsyncStorage.setItem(SLEEP_LOGS_KEY, JSON.stringify(updatedLogs));
    return updatedLogs;
  } catch (error) {
    console.error('Error updating sleep log:', error);
    throw error;
  }
};

export const saveWorkoutLog = async (workoutLogData) => {
  try {
    // Use the model to create properly structured data
    const workoutLog = createWorkoutLog(workoutLogData);
    validateWorkoutLog(workoutLog);

    const existingLogs = await getWorkoutLogs();
    const updatedLogs = [...existingLogs, workoutLog];
    await AsyncStorage.setItem(WORKOUT_LOGS_KEY, JSON.stringify(updatedLogs));
    return updatedLogs;
  } catch (error) {
    console.error('Error saving workout log:', error);
    throw error;
  }
};

export const getWorkoutLogs = async () => {
  try {
    const logs = await AsyncStorage.getItem(WORKOUT_LOGS_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Error getting workout logs:', error);
    return [];
  }
};

export const deleteWorkoutLog = async (id) => {
  try {
    const existingLogs = await getWorkoutLogs();
    const updatedLogs = existingLogs.filter(log => log.id !== id);
    await AsyncStorage.setItem(WORKOUT_LOGS_KEY, JSON.stringify(updatedLogs));
    return updatedLogs;
  } catch (error) {
    console.error('Error deleting workout log:', error);
    throw error;
  }
};

export const updateWorkoutLog = async (id, updates) => {
  try {
    const existingLogs = await getWorkoutLogs();
    const updatedLogs = existingLogs.map(log => {
      if (log.id === id) {
        return { ...log, ...updates, updatedAt: new Date().toISOString() };
      }
      return log;
    });
    await AsyncStorage.setItem(WORKOUT_LOGS_KEY, JSON.stringify(updatedLogs));
    return updatedLogs;
  } catch (error) {
    console.error('Error updating workout log:', error);
    throw error;
  }
};

export const saveFocusLog = async (focusLogData) => {
  try {
    // Use the model to create properly structured data
    const focusLog = createFocusLog(focusLogData);
    validateFocusLog(focusLog);

    const existingLogs = await getFocusLogs();
    const updatedLogs = [...existingLogs, focusLog];
    await AsyncStorage.setItem(FOCUS_LOGS_KEY, JSON.stringify(updatedLogs));
    return updatedLogs;
  } catch (error) {
    console.error('Error saving focus log:', error);
    throw error;
  }
};

export const getFocusLogs = async () => {
  try {
    const logs = await AsyncStorage.getItem(FOCUS_LOGS_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Error getting focus logs:', error);
    return [];
  }
};

export const deleteFocusLog = async (id) => {
  try {
    const existingLogs = await getFocusLogs();
    const updatedLogs = existingLogs.filter(log => log.id !== id);
    await AsyncStorage.setItem(FOCUS_LOGS_KEY, JSON.stringify(updatedLogs));
    return updatedLogs;
  } catch (error) {
    console.error('Error deleting focus log:', error);
    throw error;
  }
};

export const updateFocusLog = async (id, updates) => {
  try {
    const existingLogs = await getFocusLogs();
    const updatedLogs = existingLogs.map(log => {
      if (log.id === id) {
        return { ...log, ...updates, updatedAt: new Date().toISOString() };
      }
      return log;
    });
    await AsyncStorage.setItem(FOCUS_LOGS_KEY, JSON.stringify(updatedLogs));
    return updatedLogs;
  } catch (error) {
    console.error('Error updating focus log:', error);
    throw error;
  }
};

const REST_TIMER_KEY = '@rest_timers';

export const saveRestTimerSession = async (durationSeconds) => {
  try {
    const existing = await getRestTimerSessions();
    const updated = [...existing, { duration: durationSeconds, timestamp: new Date().toISOString() }];
    await AsyncStorage.setItem(REST_TIMER_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving rest timer:', error);
  }
};

export const getRestTimerSessions = async () => {
  try {
    const data = await AsyncStorage.getItem(REST_TIMER_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};

export const getAverageRestTime = async () => {
  try {
    const sessions = await getRestTimerSessions();
    if (sessions.length === 0) return null;
    const total = sessions.reduce((sum, s) => sum + s.duration, 0);
    return Math.round(total / sessions.length);
  } catch (error) {
    return null;
  }
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([SLEEP_LOGS_KEY, WORKOUT_LOGS_KEY, FOCUS_LOGS_KEY, REST_TIMER_KEY]);
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
};
