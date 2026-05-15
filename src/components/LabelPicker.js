import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getLabels, addLabel, LABEL_COLORS } from '../services/labels';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LabelPicker({
  category,
  selectedLabel,
  onSelectLabel,
  placeholder = 'Add label (optional)',
}) {
  const { colors } = useTheme();
  const [labels, setLabels] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState(LABEL_COLORS[0].color);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLabels();
  }, [category]);

  useEffect(() => {
    if (showPicker) {
      // Animate in
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

  const closePicker = () => {
    // Animate out
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
    });
  };

  const loadLabels = async () => {
    const categoryLabels = await getLabels(category);
    setLabels(categoryLabels);
  };

  const handleSelectLabel = (label) => {
    if (selectedLabel?.id === label.id) {
      // Deselect if already selected
      onSelectLabel(null);
    } else {
      onSelectLabel(label);
    }
    closePicker();
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      Alert.alert('Error', 'Please enter a label name');
      return;
    }

    try {
      const newLabel = await addLabel(category, {
        name: newLabelName.trim(),
        color: selectedColor,
      });

      await loadLabels();
      onSelectLabel(newLabel);
      setNewLabelName('');
      setSelectedColor(LABEL_COLORS[0].color);
      setShowCreateModal(false);
      setShowPicker(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create label');
    }
  };

  const selectedLabelData = labels.find(l => l.id === selectedLabel?.id);

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.labelButton,
          {
            backgroundColor: selectedLabelData
              ? selectedLabelData.color + '20'
              : colors.surfaceSecondary,
            borderColor: selectedLabelData ? selectedLabelData.color : colors.border,
          },
        ]}
        onPress={() => setShowPicker(true)}
      >
        {selectedLabelData ? (
          <View style={styles.selectedLabelContent}>
            <View style={[styles.labelDot, { backgroundColor: selectedLabelData.color }]} />
            <Text style={[styles.labelButtonText, { color: colors.text }]}>
              {selectedLabelData.name}
            </Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onSelectLabel(null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.clearButton, { color: colors.textSecondary }]}>x</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.placeholderText, { color: colors.textLight }]}>
            {placeholder}
          </Text>
        )}
      </TouchableOpacity>

      {/* Label Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="none"
        transparent={true}
        onRequestClose={closePicker}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.overlayBackground,
              { opacity: fadeAnim },
            ]}
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
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Label</Text>
              <TouchableOpacity onPress={closePicker}>
                <Text style={[styles.doneButton, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.labelList} showsVerticalScrollIndicator={false}>
              {labels.map((label) => (
                <TouchableOpacity
                  key={label.id}
                  style={[
                    styles.labelOption,
                    {
                      backgroundColor:
                        selectedLabel?.id === label.id ? label.color + '20' : 'transparent',
                      borderColor:
                        selectedLabel?.id === label.id ? label.color : colors.border,
                    },
                  ]}
                  onPress={() => handleSelectLabel(label)}
                >
                  <View style={[styles.labelDot, { backgroundColor: label.color }]} />
                  <Text style={[styles.labelOptionText, { color: colors.text }]}>
                    {label.name}
                  </Text>
                  {selectedLabel?.id === label.id && (
                    <Text style={[styles.checkmark, { color: label.color }]}>&#10003;</Text>
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.createButton, { borderColor: colors.primary }]}
                onPress={() => {
                  closePicker();
                  setTimeout(() => setShowCreateModal(true), 300);
                }}
              >
                <Text style={[styles.createButtonText, { color: colors.primary }]}>
                  + Create New Label
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Create Label Modal */}
      <Modal
        visible={showCreateModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.createModalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setShowCreateModal(false)}>
            <View style={styles.createModalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={[styles.createContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.createTitle, { color: colors.text }]}>Create New Label</Text>

            <TextInput
              style={[
                styles.labelInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Label name"
              placeholderTextColor={colors.textLight}
              value={newLabelName}
              onChangeText={setNewLabelName}
              autoFocus
            />

            <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>
              Choose a color
            </Text>
            <View style={styles.colorGrid}>
              {LABEL_COLORS.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c.color },
                    selectedColor === c.color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(c.color)}
                >
                  {selectedColor === c.color && (
                    <Text style={styles.colorCheckmark}>&#10003;</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.createActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setNewLabelName('');
                  setSelectedColor(LABEL_COLORS[0].color);
                  setShowCreateModal(false);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateLabel}
              >
                <Text style={styles.saveButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  labelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedLabelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  labelDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  labelButtonText: {
    fontSize: 15,
    flex: 1,
  },
  placeholderText: {
    fontSize: 15,
    textAlign: 'center',
    flex: 1,
  },
  clearButton: {
    fontSize: 18,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  createModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  createModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    maxHeight: '70%',
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
  labelList: {
    padding: 16,
  },
  labelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  labelOptionText: {
    fontSize: 16,
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  createContainer: {
    width: '90%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  createTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  labelInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  colorLabel: {
    fontSize: 14,
    marginBottom: 10,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  colorCheckmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  createActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
