import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getSleepLogs, getWorkoutLogs, getFocusLogs } from './storage';

/**
 * Export all user data to a JSON file
 * This meets Apple's data portability requirements
 */
export const exportAllData = async () => {
  try {
    // Gather all data
    const sleepLogs = await getSleepLogs();
    const workoutLogs = await getWorkoutLogs();
    const focusLogs = await getFocusLogs();

    const exportData = {
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0',
      dataTypes: {
        sleep: sleepLogs,
        workout: workoutLogs,
        focus: focusLogs,
      },
      summary: {
        totalSleepLogs: sleepLogs.length,
        totalWorkoutLogs: workoutLogs.length,
        totalFocusLogs: focusLogs.length,
      },
    };

    // Create JSON file
    const fileName = `logwell_data_export_${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(exportData, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    // Share the file
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Your LogWell Data',
        UTI: 'public.json',
      });
    }

    return { success: true, fileUri };
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};

/**
 * Export data in CSV format for specific log type
 */
export const exportToCSV = async (logType) => {
  try {
    let logs = [];
    let headers = '';
    let rows = '';

    switch (logType) {
      case 'sleep':
        logs = await getSleepLogs();
        headers = 'Date Range,Sleep Time,Wake Time,Total Hours,Effectiveness Rating,Created At\n';
        rows = logs.map(log =>
          `"${log.dateRange}","${log.sleepTime}","${log.wakeTime}",${log.totalHours},${log.effectivenessRating || ''},${log.createdAt}`
        ).join('\n');
        break;

      case 'workout':
        logs = await getWorkoutLogs();
        headers = 'Date,Total Exercises,Effectiveness Rating,Created At\n';
        rows = logs.map(log =>
          `"${log.date}",${log.exercises?.length || 0},${log.effectivenessRating || ''},${log.createdAt}`
        ).join('\n');
        break;

      case 'focus':
        logs = await getFocusLogs();
        headers = 'Date,Label,Total Minutes,Pomodoros,Effectiveness Rating,Created At\n';
        rows = logs.map(log =>
          `"${log.date}","${log.label || log.topic}",${log.totalMinutes},${log.pomodoros?.filter(p => p.completed).length || 0},${log.effectivenessRating || ''},${log.createdAt}`
        ).join('\n');
        break;

      default:
        throw new Error('Invalid log type');
    }

    const csvContent = headers + rows;
    const fileName = `${logType}_export_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Export ${logType} Data`,
      });
    }

    return { success: true, fileUri };
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw new Error('Failed to export CSV');
  }
};
