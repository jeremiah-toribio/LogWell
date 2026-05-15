import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getExercises, addExercise, searchExercises } from '../services/exercises';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ExercisePicker({
  selectedExercise,
  onSelectExercise,
  placeholder = 'Select exercise',
  onTargetChange,
}) {
  const { colors } = useTheme();
  const [exercises, setExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    if (showPicker) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showPicker]);

  useEffect(() => {
    filterExercises();
  }, [searchQuery, exercises]);

  const loadExercises = async () => {
    const allExercises = await getExercises();
    setExercises(allExercises);
    setFilteredExercises(allExercises);
  };

  const filterExercises = async () => {
    if (!searchQuery.trim()) {
      setFilteredExercises(exercises);
    } else {
      const filtered = await searchExercises(searchQuery);
      setFilteredExercises(filtered);
    }
  };

  const closePicker = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowPicker(false);
      setSearchQuery('');
    });
  };

  const handleSelectExercise = (exercise) => {
    onSelectExercise(exercise.name);
    if (onTargetChange && exercise.target) {
      onTargetChange(exercise.target);
    }
    closePicker();
  };

  const handleCreateExercise = async () => {
    if (!searchQuery.trim()) return;

    try {
      const newExercise = await addExercise(searchQuery.trim());
      await loadExercises();
      handleSelectExercise(newExercise);
    } catch (error) {
      console.error('Error creating exercise:', error);
    }
  };

  const showCreateOption = searchQuery.trim() &&
    !filteredExercises.some(e => e.name.toLowerCase() === searchQuery.toLowerCase());

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          {
            backgroundColor: colors.surface,
            borderColor: selectedExercise ? colors.primary : colors.border,
          },
        ]}
        onPress={() => setShowPicker(true)}
      >
        <Text
          style={[
            styles.pickerButtonText,
            { color: selectedExercise ? colors.text : colors.textLight },
          ]}
          numberOfLines={1}
        >
          {selectedExercise || placeholder}
        </Text>
        <Text style={[styles.chevron, { color: colors.textLight }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        animationType="none"
        transparent={true}
        onRequestClose={closePicker}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Animated.View
            style={[styles.overlayBackground, { opacity: fadeAnim }]}
          >
            <TouchableWithoutFeedback onPress={closePicker}>
              <View style={styles.overlayTouchable} />
            </TouchableWithoutFeedback>
          </Animated.View>

          <Animated.View
            style={[
              styles.pickerContainer,
              { backgroundColor: colors.surface },
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Exercise</Text>
              <TouchableOpacity onPress={closePicker}>
                <Text style={[styles.doneButton, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search or add exercise..."
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="words"
                autoFocus={false}
                blurOnSubmit={true}
                returnKeyType="done"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={[styles.clearButton, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={styles.exerciseList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {showCreateOption && (
                <TouchableOpacity
                  style={[styles.createOption, { borderColor: colors.primary }]}
                  onPress={handleCreateExercise}
                >
                  <Text style={[styles.createOptionText, { color: colors.primary }]}>
                    + Add "{searchQuery.trim()}"
                  </Text>
                </TouchableOpacity>
              )}

              {filteredExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.exerciseOption,
                    {
                      backgroundColor:
                        selectedExercise === exercise.name
                          ? colors.primary + '15'
                          : 'transparent',
                      borderColor:
                        selectedExercise === exercise.name
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                  onPress={() => handleSelectExercise(exercise)}
                >
                  <View style={styles.exerciseInfo}>
                    <Text style={[styles.exerciseName, { color: colors.text }]}>
                      {exercise.name}
                    </Text>
                    {exercise.target ? (
                      <Text style={[styles.exerciseTarget, { color: colors.textSecondary }]}>
                        {exercise.target}
                      </Text>
                    ) : null}
                  </View>
                  {selectedExercise === exercise.name && (
                    <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}

              {filteredExercises.length === 0 && !showCreateOption && (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No exercises found
                  </Text>
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  pickerButtonText: {
    fontSize: 15,
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  pickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearButton: {
    fontSize: 16,
    padding: 4,
  },
  exerciseList: {
    paddingHorizontal: 16,
  },
  createOption: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 12,
  },
  createOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  exerciseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
  },
  exerciseTarget: {
    fontSize: 13,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
