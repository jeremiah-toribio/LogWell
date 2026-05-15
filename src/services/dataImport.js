import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { saveSleepLog, saveWorkoutLog, saveFocusLog } from './storage';
import { createSleepLog, createWorkoutLog, createFocusLog } from '../models/dataModels';

/**
 * Import data from JSON file
 */
export const importFromJSON = async () => {
  try {
    // Pick a file
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.type === 'cancel' || !result.uri) {
      return { success: false, cancelled: true };
    }

    // Read file content
    const content = await FileSystem.readAsStringAsync(result.uri);
    const data = JSON.parse(content);

    // Validate structure
    if (!data.dataTypes) {
      return {
        success: false,
        error: 'Invalid file format. Expected LogWell export file.',
      };
    }

    // Import each category
    const results = {
      sleep: 0,
      workout: 0,
      focus: 0,
      errors: [],
    };

    // Import sleep logs
    if (data.dataTypes.sleep && Array.isArray(data.dataTypes.sleep)) {
      for (const log of data.dataTypes.sleep) {
        try {
          await saveSleepLog(log);
          results.sleep++;
        } catch (error) {
          results.errors.push(`Sleep log: ${error.message}`);
        }
      }
    }

    // Import workout logs
    if (data.dataTypes.workout && Array.isArray(data.dataTypes.workout)) {
      for (const log of data.dataTypes.workout) {
        try {
          await saveWorkoutLog(log);
          results.workout++;
        } catch (error) {
          results.errors.push(`Workout log: ${error.message}`);
        }
      }
    }

    // Import focus logs (also check for legacy 'study' key)
    const focusData = data.dataTypes.focus || data.dataTypes.study;
    if (focusData && Array.isArray(focusData)) {
      for (const log of focusData) {
        try {
          // Map legacy 'topic' to 'label' if needed
          if (log.topic && !log.label) {
            log.label = log.topic;
          }
          await saveFocusLog(log);
          results.focus++;
        } catch (error) {
          results.errors.push(`Focus log: ${error.message}`);
        }
      }
    }

    return {
      success: true,
      results,
      message: `Imported ${results.sleep} sleep logs, ${results.workout} workouts, ${results.focus} focus sessions`,
    };
  } catch (error) {
    console.error('Import JSON error:', error);
    return {
      success: false,
      error: error.message || 'Failed to import file',
    };
  }
};

/**
 * Parse CSV content into array of objects
 */
const parseCSV = (content) => {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
};

/**
 * Import sleep data from CSV
 */
export const importSleepFromCSV = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/comma-separated-values',
      copyToCacheDirectory: true,
    });

    if (result.type === 'cancel' || !result.uri) {
      return { success: false, cancelled: true };
    }

    const content = await FileSystem.readAsStringAsync(result.uri);
    const rows = parseCSV(content);

    let imported = 0;
    const errors = [];

    for (const row of rows) {
      try {
        // Map CSV columns to sleep log format
        const sleepLog = createSleepLog({
          dateRange: row['Date Range'] || row.dateRange,
          sleepTime: row['Sleep Time'] || row.sleepTime,
          wakeTime: row['Wake Time'] || row.wakeTime,
          totalHours: parseFloat(row['Total Hours'] || row.totalHours || 0),
          effectivenessRating: row['Effectiveness Rating'] || row.effectivenessRating || null,
        });

        await saveSleepLog(sleepLog);
        imported++;
      } catch (error) {
        errors.push(`Row ${imported + 1}: ${error.message}`);
      }
    }

    return {
      success: true,
      imported,
      total: rows.length,
      errors,
      message: `Imported ${imported} of ${rows.length} sleep logs`,
    };
  } catch (error) {
    console.error('Import CSV error:', error);
    return {
      success: false,
      error: error.message || 'Failed to import CSV',
    };
  }
};

/**
 * Import workout data from CSV
 */
export const importWorkoutFromCSV = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/comma-separated-values',
      copyToCacheDirectory: true,
    });

    if (result.type === 'cancel' || !result.uri) {
      return { success: false, cancelled: true };
    }

    const content = await FileSystem.readAsStringAsync(result.uri);
    const rows = parseCSV(content);

    let imported = 0;
    const errors = [];

    // Group rows by date (for workouts with multiple exercises)
    const workoutsByDate = {};

    for (const row of rows) {
      const date = row.Date || row.date;
      if (!workoutsByDate[date]) {
        workoutsByDate[date] = {
          date: date,
          exercises: [],
          effectivenessRating: row['Effectiveness Rating'] || row.effectivenessRating || null,
        };
      }

      // Add exercise if it has a name
      if (row['Exercise Name'] || row.name) {
        workoutsByDate[date].exercises.push({
          name: row['Exercise Name'] || row.name,
          target: row['Muscle Group'] || row.target || '',
          sets: parseInt(row.Sets || row.sets || 0),
          reps: parseInt(row.Reps || row.reps || 0),
          weight: row.Weight || row.weight || '',
          notes: row.Notes || row.notes || '',
        });
      }
    }

    // Save each workout
    for (const workout of Object.values(workoutsByDate)) {
      try {
        await saveWorkoutLog(workout);
        imported++;
      } catch (error) {
        errors.push(`Workout on ${workout.date}: ${error.message}`);
      }
    }

    return {
      success: true,
      imported,
      total: Object.keys(workoutsByDate).length,
      errors,
      message: `Imported ${imported} workouts`,
    };
  } catch (error) {
    console.error('Import workout CSV error:', error);
    return {
      success: false,
      error: error.message || 'Failed to import CSV',
    };
  }
};

/**
 * Import focus data from CSV
 */
export const importFocusFromCSV = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/comma-separated-values',
      copyToCacheDirectory: true,
    });

    if (result.type === 'cancel' || !result.uri) {
      return { success: false, cancelled: true };
    }

    const content = await FileSystem.readAsStringAsync(result.uri);
    const rows = parseCSV(content);

    let imported = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const focusLog = createFocusLog({
          label: row.Label || row.label || row.Topic || row.topic,
          totalMinutes: parseInt(row['Total Minutes'] || row.totalMinutes || 0),
          pomodoroLength: parseInt(row['Pomodoro Length'] || row.pomodoroLength || 25),
          breakLength: parseInt(row['Break Length'] || row.breakLength || 5),
          effectivenessRating: row['Effectiveness Rating'] || row.effectivenessRating || null,
          pomodoros: [], // CSV doesn't contain detailed pomodoro data
        });

        // Set date if provided
        if (row.Date || row.date) {
          focusLog.date = row.Date || row.date;
        }

        await saveFocusLog(focusLog);
        imported++;
      } catch (error) {
        errors.push(`Row ${imported + 1}: ${error.message}`);
      }
    }

    return {
      success: true,
      imported,
      total: rows.length,
      errors,
      message: `Imported ${imported} of ${rows.length} focus sessions`,
    };
  } catch (error) {
    console.error('Import focus CSV error:', error);
    return {
      success: false,
      error: error.message || 'Failed to import CSV',
    };
  }
};

/**
 * Get preview of import file without saving
 */
export const previewImport = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/comma-separated-values'],
      copyToCacheDirectory: true,
    });

    if (result.type === 'cancel' || !result.uri) {
      return { success: false, cancelled: true };
    }

    const content = await FileSystem.readAsStringAsync(result.uri);
    const fileName = result.name;

    let preview = {
      fileName,
      fileType: fileName.endsWith('.json') ? 'JSON' : 'CSV',
      preview: {},
    };

    if (fileName.endsWith('.json')) {
      const data = JSON.parse(content);
      preview.preview = {
        sleepLogs: data.dataTypes?.sleep?.length || 0,
        workoutLogs: data.dataTypes?.workout?.length || 0,
        focusLogs: data.dataTypes?.focus?.length || data.dataTypes?.study?.length || 0,
        exportDate: data.exportDate || 'Unknown',
      };
    } else {
      const rows = parseCSV(content);
      preview.preview = {
        rows: rows.length,
        columns: Object.keys(rows[0] || {}),
        sampleRow: rows[0],
      };
    }

    return {
      success: true,
      preview,
    };
  } catch (error) {
    console.error('Preview error:', error);
    return {
      success: false,
      error: error.message || 'Failed to preview file',
    };
  }
};
