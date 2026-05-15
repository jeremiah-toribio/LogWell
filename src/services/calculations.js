// Format decimal hours (e.g., 7.50) to H:MM format (e.g., 7:30)
const formatHoursToHMM = (decimalHours) => {
  const hours = Math.floor(parseFloat(decimalHours) || 0);
  const minutes = Math.round((parseFloat(decimalHours) % 1) * 60);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
};

export const calculateSleepDuration = (sleepTime, wakeTime, dateRange) => {
  try {
    const [startDate, endDate] = dateRange.split(' + ').map(d => d.trim());

    // Parse time strings (HH:MM format)
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);
    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);

    // Parse date strings (MM/DD format)
    const [startMonth, startDay] = startDate.split('/').map(Number);
    const [endMonth, endDay] = endDate.split('/').map(Number);

    const currentYear = new Date().getFullYear();

    // Create proper Date objects
    const sleepDateTime = new Date(currentYear, startMonth - 1, startDay, sleepHour, sleepMin);
    const wakeDateTime = new Date(currentYear, endMonth - 1, endDay, wakeHour, wakeMin);

    // Handle year boundary (sleeping Dec 31, waking Jan 1)
    if (wakeDateTime < sleepDateTime) {
      wakeDateTime.setFullYear(currentYear + 1);
    }

    const durationMs = wakeDateTime - sleepDateTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, totalHours: (durationMs / (1000 * 60 * 60)).toFixed(2) };
  } catch (error) {
    console.error('Error calculating sleep duration:', error);
    return { hours: 0, minutes: 0, totalHours: '0.00' };
  }
};

export const calculateSleepStats = (sleepLogs) => {
  if (!sleepLogs || sleepLogs.length === 0) {
    return {
      averageSleep: 0,
      totalNights: 0,
      longestSleep: 0,
      shortestSleep: 0
    };
  }

  const totalHours = sleepLogs.reduce((sum, log) => {
    return sum + parseFloat(log.totalHours || 0);
  }, 0);

  const sleepDurations = sleepLogs
    .map(log => parseFloat(log.totalHours || 0))
    .filter(duration => duration > 0);

  return {
    averageSleep: formatHoursToHMM(totalHours / sleepLogs.length),
    totalNights: sleepLogs.length,
    longestSleep: sleepDurations.length > 0 ? formatHoursToHMM(Math.max(...sleepDurations)) : '0:00',
    shortestSleep: sleepDurations.length > 0 ? formatHoursToHMM(Math.min(...sleepDurations)) : '0:00'
  };
};

export const calculateWorkoutStats = (workoutLogs) => {
  if (!workoutLogs || workoutLogs.length === 0) {
    return {
      totalWorkouts: 0,
      thisWeek: 0,
      thisMonth: 0,
      mostFrequentExercise: 'N/A'
    };
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const workoutsThisWeek = workoutLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= oneWeekAgo;
  }).length;

  const workoutsThisMonth = workoutLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= oneMonthAgo;
  }).length;

  const exerciseFrequency = {};
  workoutLogs.forEach(workout => {
    if (workout.exercises && Array.isArray(workout.exercises)) {
      workout.exercises.forEach(exercise => {
        const name = exercise.name || 'Unknown';
        exerciseFrequency[name] = (exerciseFrequency[name] || 0) + 1;
      });
    }
  });

  const mostFrequentExercise = Object.keys(exerciseFrequency).length > 0
    ? Object.keys(exerciseFrequency).reduce((a, b) =>
        exerciseFrequency[a] > exerciseFrequency[b] ? a : b
      )
    : 'N/A';

  return {
    totalWorkouts: workoutLogs.length,
    thisWeek: workoutsThisWeek,
    thisMonth: workoutsThisMonth,
    mostFrequentExercise
  };
};

export const getWorkoutsByMuscleGroup = (workoutLogs) => {
  const muscleGroupData = {};

  workoutLogs.forEach(workout => {
    if (workout.exercises && Array.isArray(workout.exercises)) {
      workout.exercises.forEach(exercise => {
        const target = exercise.target || 'General';
        muscleGroupData[target] = (muscleGroupData[target] || 0) +
          (exercise.sets || 0) * (exercise.reps || 0);
      });
    }
  });

  return muscleGroupData;
};

export const calculateFocusStats = (focusLogs) => {
  if (!focusLogs || focusLogs.length === 0) {
    return {
      totalSessions: 0,
      totalMinutes: 0,
      totalHours: 0,
      thisWeek: 0,
      thisMonth: 0,
      avgSessionLength: 0,
      totalPomodoros: 0,
      topLabel: 'N/A'
    };
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const sessionsThisWeek = focusLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= oneWeekAgo;
  }).length;

  const sessionsThisMonth = focusLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= oneMonthAgo;
  }).length;

  const totalMinutes = focusLogs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0);
  const totalPomodoros = focusLogs.reduce((sum, log) =>
    sum + (log.pomodoros ? log.pomodoros.filter(p => p.completed).length : 0), 0
  );

  const labelFrequency = {};
  focusLogs.forEach(log => {
    // Handle label as object {id, name, color} or string
    const labelName = typeof log.label === 'object' && log.label?.name
      ? log.label.name
      : (log.label || log.topic || 'Unknown');
    labelFrequency[labelName] = (labelFrequency[labelName] || 0) + (log.totalMinutes || 0);
  });

  const topLabel = Object.keys(labelFrequency).length > 0
    ? Object.keys(labelFrequency).reduce((a, b) =>
        labelFrequency[a] > labelFrequency[b] ? a : b
      )
    : 'N/A';

  return {
    totalSessions: focusLogs.length,
    totalMinutes,
    totalHours: formatHoursToHMM(totalMinutes / 60),
    thisWeek: sessionsThisWeek,
    thisMonth: sessionsThisMonth,
    avgSessionLength: focusLogs.length > 0 ? Math.round(totalMinutes / focusLogs.length) : 0,
    totalPomodoros,
    topLabel
  };
};

export const getFocusTimeByLabel = (focusLogs) => {
  const labelData = {};

  focusLogs.forEach(log => {
    // Handle label as object {id, name, color} or string
    const labelName = typeof log.label === 'object' && log.label?.name
      ? log.label.name
      : (log.label || log.topic || 'Unknown');
    labelData[labelName] = (labelData[labelName] || 0) + (log.totalMinutes || 0);
  });

  return labelData;
};

// Body region normalization map
const BODY_REGION_MAP = {
  Shoulders: ['shoulders', 'delts', 'deltoids', 'traps', 'trapezius'],
  Chest: ['chest', 'pecs', 'pectorals'],
  Back: ['back', 'lats', 'latissimus', 'upper back', 'lower back', 'rhomboids', 'rear delt'],
  Arms: ['arms', 'biceps', 'triceps', 'forearms', 'bicep', 'tricep'],
  Core: ['core', 'abs', 'abdominals', 'obliques', 'abdominal'],
  Legs: ['legs', 'quads', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'hip', 'hips', 'glute', 'calf', 'thighs', 'leg'],
};

export const getBodyPartFrequency = (workoutLogs) => {
  const counts = {};

  workoutLogs.forEach(workout => {
    if (!workout.exercises || !Array.isArray(workout.exercises)) return;
    workout.exercises.forEach(exercise => {
      const target = (exercise.target || '').trim().toLowerCase();
      if (!target) return;

      let matched = false;
      for (const [region, keywords] of Object.entries(BODY_REGION_MAP)) {
        if (keywords.some(k => target === k || target.includes(k))) {
          counts[region] = (counts[region] || 0) + 1;
          matched = true;
          break;
        }
      }
      if (!matched) {
        counts['General'] = (counts['General'] || 0) + 1;
      }
    });
  });

  // Remove General — it's excluded from the diagram
  delete counts['General'];

  const maxCount = Math.max(...Object.values(counts), 0);
  const result = {};
  for (const [region, count] of Object.entries(counts)) {
    result[region] = {
      count,
      percentage: maxCount > 0 ? count / maxCount : 0,
    };
  }
  return result;
};

// Calculate average rating by week
export const getAverageRatingByWeek = (logs, dateField = 'createdAt', weeksToShow = 4) => {
  const weeks = [];

  for (let i = weeksToShow - 1; i >= 0; i--) {
    const weekStart = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const logsInWeek = logs.filter(log => {
      const logDate = new Date(log[dateField]);
      return logDate >= weekStart && logDate < weekEnd && log.effectivenessRating;
    });

    const avgRating = logsInWeek.length > 0
      ? logsInWeek.reduce((sum, log) => sum + log.effectivenessRating, 0) / logsInWeek.length
      : 0;

    weeks.push({
      label: `W${weeksToShow - i}`,
      average: avgRating,
      count: logsInWeek.length
    });
  }

  return weeks;
};

// Calculate overall average rating
export const getOverallAverageRating = (logs) => {
  const logsWithRating = logs.filter(log => log.effectivenessRating);

  if (logsWithRating.length === 0) return null;

  const sum = logsWithRating.reduce((total, log) => total + log.effectivenessRating, 0);
  return (sum / logsWithRating.length).toFixed(1);
};
