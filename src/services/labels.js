import AsyncStorage from '@react-native-async-storage/async-storage';

const LABELS_KEY = '@app_labels';
const HIDDEN_DEFAULTS_KEY = '@app_hidden_default_labels';

// Default labels for each category
export const DEFAULT_LABELS = {
  sleep: [
    { id: 'sleep_regular', name: 'Regular Night', color: '#5B8DEF' },
    { id: 'sleep_nap', name: 'Nap', color: '#9B59B6' },
    { id: 'sleep_late', name: 'Late Night', color: '#E74C3C' },
    { id: 'sleep_early', name: 'Early Night', color: '#2ECC71' },
  ],
  workout: [
    { id: 'workout_strength', name: 'Strength Training', color: '#E74C3C' },
    { id: 'workout_cardio', name: 'Cardio', color: '#3498DB' },
    { id: 'workout_hiit', name: 'HIIT', color: '#E67E22' },
    { id: 'workout_flexibility', name: 'Flexibility/Yoga', color: '#9B59B6' },
    { id: 'workout_sports', name: 'Sports', color: '#2ECC71' },
  ],
  focus: [
    { id: 'focus_work', name: 'Work', color: '#3498DB' },
    { id: 'focus_study', name: 'Study', color: '#9B59B6' },
    { id: 'focus_creative', name: 'Creative', color: '#E67E22' },
    { id: 'focus_personal', name: 'Personal Project', color: '#2ECC71' },
    { id: 'focus_reading', name: 'Reading', color: '#1ABC9C' },
  ],
};

/**
 * Check if a label is a default label
 */
export const isDefaultLabel = (labelId) => {
  for (const category of Object.keys(DEFAULT_LABELS)) {
    if (DEFAULT_LABELS[category].some(l => l.id === labelId)) {
      return true;
    }
  }
  return false;
};

/**
 * Get hidden default label IDs
 */
const getHiddenDefaults = async () => {
  try {
    const stored = await AsyncStorage.getItem(HIDDEN_DEFAULTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting hidden defaults:', error);
    return [];
  }
};

/**
 * Get all labels (defaults + user-created) for a category
 */
export const getLabels = async (category) => {
  try {
    const stored = await AsyncStorage.getItem(LABELS_KEY);
    const allLabels = stored ? JSON.parse(stored) : {};
    const hiddenDefaults = await getHiddenDefaults();

    const defaults = (DEFAULT_LABELS[category] || []).filter(
      label => !hiddenDefaults.includes(label.id)
    );
    const custom = allLabels[category] || [];

    // Combine defaults and custom, with custom ones at the end
    return [...defaults, ...custom];
  } catch (error) {
    console.error('Error getting labels:', error);
    return DEFAULT_LABELS[category] || [];
  }
};

/**
 * Get all labels for all categories
 */
export const getAllLabels = async () => {
  try {
    const stored = await AsyncStorage.getItem(LABELS_KEY);
    const customLabels = stored ? JSON.parse(stored) : {};
    const hiddenDefaults = await getHiddenDefaults();

    const filterDefaults = (defaults) =>
      defaults.filter(label => !hiddenDefaults.includes(label.id));

    return {
      sleep: [...filterDefaults(DEFAULT_LABELS.sleep), ...(customLabels.sleep || [])],
      workout: [...filterDefaults(DEFAULT_LABELS.workout), ...(customLabels.workout || [])],
      focus: [...filterDefaults(DEFAULT_LABELS.focus), ...(customLabels.focus || [])],
    };
  } catch (error) {
    console.error('Error getting all labels:', error);
    return DEFAULT_LABELS;
  }
};

/**
 * Get only custom (user-created) labels for a category
 */
export const getCustomLabels = async (category) => {
  try {
    const stored = await AsyncStorage.getItem(LABELS_KEY);
    const allLabels = stored ? JSON.parse(stored) : {};
    return allLabels[category] || [];
  } catch (error) {
    console.error('Error getting custom labels:', error);
    return [];
  }
};

/**
 * Add a new custom label
 */
export const addLabel = async (category, labelData) => {
  try {
    const stored = await AsyncStorage.getItem(LABELS_KEY);
    const allLabels = stored ? JSON.parse(stored) : {};

    const newLabel = {
      id: `${category}_custom_${Date.now()}`,
      name: labelData.name,
      color: labelData.color || getRandomColor(),
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    if (!allLabels[category]) {
      allLabels[category] = [];
    }

    allLabels[category].push(newLabel);
    await AsyncStorage.setItem(LABELS_KEY, JSON.stringify(allLabels));

    return newLabel;
  } catch (error) {
    console.error('Error adding label:', error);
    throw error;
  }
};

/**
 * Update an existing custom label
 */
export const updateLabel = async (category, labelId, updates) => {
  try {
    const stored = await AsyncStorage.getItem(LABELS_KEY);
    const allLabels = stored ? JSON.parse(stored) : {};

    if (!allLabels[category]) {
      throw new Error('Category not found');
    }

    const labelIndex = allLabels[category].findIndex(l => l.id === labelId);
    if (labelIndex === -1) {
      throw new Error('Label not found');
    }

    allLabels[category][labelIndex] = {
      ...allLabels[category][labelIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(LABELS_KEY, JSON.stringify(allLabels));
    return allLabels[category][labelIndex];
  } catch (error) {
    console.error('Error updating label:', error);
    throw error;
  }
};

/**
 * Delete a label (works for both custom and default labels)
 */
export const deleteLabel = async (category, labelId) => {
  try {
    // Check if it's a default label
    if (isDefaultLabel(labelId)) {
      // Hide the default label instead of deleting
      const hiddenDefaults = await getHiddenDefaults();
      if (!hiddenDefaults.includes(labelId)) {
        hiddenDefaults.push(labelId);
        await AsyncStorage.setItem(HIDDEN_DEFAULTS_KEY, JSON.stringify(hiddenDefaults));
      }
      return true;
    }

    // Delete custom label
    const stored = await AsyncStorage.getItem(LABELS_KEY);
    const allLabels = stored ? JSON.parse(stored) : {};

    if (!allLabels[category]) {
      return true;
    }

    allLabels[category] = allLabels[category].filter(l => l.id !== labelId);
    await AsyncStorage.setItem(LABELS_KEY, JSON.stringify(allLabels));

    return true;
  } catch (error) {
    console.error('Error deleting label:', error);
    throw error;
  }
};

/**
 * Get a random color for new labels
 */
const getRandomColor = () => {
  const colors = [
    '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#1ABC9C',
    '#3498DB', '#9B59B6', '#34495E', '#95A5A6', '#D35400',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Predefined color palette for label creation
 */
export const LABEL_COLORS = [
  { id: 'red', name: 'Red', color: '#E74C3C' },
  { id: 'orange', name: 'Orange', color: '#E67E22' },
  { id: 'yellow', name: 'Yellow', color: '#F1C40F' },
  { id: 'green', name: 'Green', color: '#2ECC71' },
  { id: 'teal', name: 'Teal', color: '#1ABC9C' },
  { id: 'blue', name: 'Blue', color: '#3498DB' },
  { id: 'purple', name: 'Purple', color: '#9B59B6' },
  { id: 'gray', name: 'Gray', color: '#95A5A6' },
  { id: 'pink', name: 'Pink', color: '#FF6B9D' },
  { id: 'indigo', name: 'Indigo', color: '#5B8DEF' },
];
