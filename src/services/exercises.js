import AsyncStorage from '@react-native-async-storage/async-storage';

const EXERCISES_KEY = '@exercises';

// Get all exercises (user created only)
export const getExercises = async () => {
  try {
    const stored = await AsyncStorage.getItem(EXERCISES_KEY);
    const userExercises = stored ? JSON.parse(stored) : [];
    return userExercises.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting exercises:', error);
    return [];
  }
};

// Add a new exercise
export const addExercise = async (name, target = '') => {
  try {
    const exercises = await getExercises();

    // Check if already exists
    const exists = exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      return exists;
    }

    const newExercise = {
      id: `exercise-${Date.now()}`,
      name: name.trim(),
      target: target.trim(),
    };

    exercises.push(newExercise);
    await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises));

    return newExercise;
  } catch (error) {
    console.error('Error adding exercise:', error);
    throw error;
  }
};

// Search exercises by name
export const searchExercises = async (query) => {
  const exercises = await getExercises();
  if (!query || query.trim() === '') {
    return exercises;
  }

  const lowerQuery = query.toLowerCase();
  return exercises.filter(ex =>
    ex.name.toLowerCase().includes(lowerQuery) ||
    ex.target.toLowerCase().includes(lowerQuery)
  );
};

// Get exercise stats from workout logs
export const getExerciseStats = (workoutLogs, exerciseName) => {
  if (!exerciseName || !workoutLogs || workoutLogs.length === 0) {
    return null;
  }

  const lowerName = exerciseName.toLowerCase().trim();
  const allWeightedSets = []; // Sets with valid weight data
  let totalSetsCount = 0; // Count ALL sets regardless of weight
  let totalReps = 0;
  let workoutCount = 0;
  const workoutDates = [];

  workoutLogs.forEach(workout => {
    if (!workout.exercises || !Array.isArray(workout.exercises)) return;

    let foundInWorkout = false;
    workout.exercises.forEach(ex => {
      if (!ex.name) return;

      const exName = ex.name.toLowerCase().trim();
      if (exName !== lowerName) return;

      foundInWorkout = true;

      // Determine if this is set mode by checking if 'sets' is an array of objects
      // Set mode: sets = [{weight: "135", reps: 10}, ...]
      // Simple mode: sets = 3 (number), weight = "135", reps = 10
      const setsValue = ex.sets;
      const isSetMode = Array.isArray(setsValue) && setsValue.length > 0;

      if (isSetMode) {
        // SET MODE: Iterate through each set object in the array
        setsValue.forEach(set => {
          if (!set || typeof set !== 'object') return;

          totalSetsCount++; // Count every set

          // Extract weight - handle string or number
          let weight = null;
          const weightVal = set.weight;
          if (weightVal !== undefined && weightVal !== null && weightVal !== '' && weightVal !== 'BW') {
            weight = parseFloat(String(weightVal));
          }

          // Extract reps - handle both number and string
          const repsVal = set.reps;
          const reps = typeof repsVal === 'number' ? repsVal : (parseInt(repsVal) || 0);
          totalReps += reps;

          // Only add to weighted sets if we have valid weight
          if (weight !== null && !isNaN(weight) && weight > 0) {
            allWeightedSets.push({ weight, reps, date: workout.date });
          }
        });
      } else {
        // SIMPLE MODE: weight/sets/reps are direct properties on the exercise
        // Note: Don't use || 1 fallback - if sets is 0 or missing, count as 0
        const numSets = parseInt(setsValue) || 0;
        const reps = parseInt(ex.reps) || 0;

        // Only count if we actually have sets
        if (numSets > 0) {
          totalSetsCount += numSets;
          totalReps += numSets * reps;

          // Extract weight
          let weight = null;
          if (ex.weight !== undefined && ex.weight !== null && ex.weight !== '' && ex.weight !== 'BW') {
            weight = parseFloat(String(ex.weight));
          }

          // Add weighted sets if we have valid weight
          if (weight !== null && !isNaN(weight) && weight > 0) {
            for (let i = 0; i < numSets; i++) {
              allWeightedSets.push({ weight, reps, date: workout.date });
            }
          }
        }
      }
    });

    if (foundInWorkout) {
      workoutCount++;
      workoutDates.push(workout.date);
    }
  });

  // If exercise was never found in any workout
  if (workoutCount === 0) {
    return {
      exerciseName,
      hasWeightData: false,
      totalWorkouts: 0,
      totalSets: 0,
      totalReps: 0,
    };
  }

  // If no weighted sets found, still return set/rep counts
  if (allWeightedSets.length === 0) {
    return {
      exerciseName,
      hasWeightData: false,
      totalWorkouts: workoutCount,
      totalSets: totalSetsCount,
      totalReps,
    };
  }

  // Calculate weight statistics
  const weights = allWeightedSets.map(s => s.weight);
  const maxWeight = Math.max(...weights);
  const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;

  // Get max weight with reps (for 1RM context)
  const maxSet = allWeightedSets.reduce((max, set) =>
    set.weight > max.weight ? set : max
  , allWeightedSets[0]);

  // Recent trend (last 5 workouts vs previous 5)
  const sortedByDate = [...allWeightedSets].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sortedByDate.slice(0, Math.min(5, Math.floor(sortedByDate.length / 2)));
  const older = sortedByDate.slice(Math.floor(sortedByDate.length / 2));

  let trend = null;
  if (recent.length > 0 && older.length > 0) {
    const recentAvg = recent.reduce((sum, s) => sum + s.weight, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.weight, 0) / older.length;
    trend = ((recentAvg - olderAvg) / olderAvg * 100).toFixed(0);
  }

  // Weight progression over time for chart
  const progressionData = [];
  const dateMap = {};
  allWeightedSets.forEach(set => {
    const dateKey = new Date(set.date).toDateString();
    if (!dateMap[dateKey] || set.weight > dateMap[dateKey].weight) {
      dateMap[dateKey] = { date: new Date(set.date), weight: set.weight };
    }
  });

  Object.values(dateMap)
    .sort((a, b) => a.date - b.date)
    .forEach(d => progressionData.push(d));

  return {
    exerciseName,
    hasWeightData: true,
    maxWeight,
    avgWeight: Math.round(avgWeight * 10) / 10,
    maxSet,
    totalSets: totalSetsCount, // Total sets including bodyweight
    weightedSets: allWeightedSets.length, // Sets with weight data
    totalReps,
    totalWorkouts: workoutCount,
    trend,
    progressionData,
  };
};

export default {
  getExercises,
  addExercise,
  searchExercises,
  getExerciseStats,
};
