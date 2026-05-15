import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function RatingPicker({ label, value, onValueChange, placeholder }) {
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();

  const ratings = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const handleSelect = (rating) => {
    onValueChange(rating.toString());
    setModalVisible(false);
  };

  const getEmoji = (rating) => {
    const num = parseInt(rating);
    if (num <= 3) return '😔';
    if (num <= 6) return '😐';
    if (num <= 8) return '🙂';
    return '😄';
  };

  const renderLabel = (labelText) => {
    if (labelText && labelText.includes('(Optional)')) {
      const parts = labelText.split('(Optional)');
      return (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {parts[0]}
          <Text style={[styles.optionalText, { color: colors.textLight }]}>(Optional)</Text>
        </Text>
      );
    }
    return <Text style={[styles.label, { color: colors.textSecondary }]}>{labelText}</Text>;
  };

  return (
    <View style={styles.container}>
      {renderLabel(label)}
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          {value ? (
            <View style={styles.selectedValue}>
              <Text style={[styles.selectedNumber, { color: colors.primary }]}>{value}</Text>
              <Text style={styles.selectedEmoji}>{getEmoji(value)}</Text>
            </View>
          ) : (
            <Text style={[styles.placeholderText, { color: colors.textLight }]}>{placeholder || 'Tap to rate'}</Text>
          )}
        </View>
        <Text style={[styles.arrow, { color: colors.textLight }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>

            <View style={styles.gridContainer}>
              {ratings.map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    { backgroundColor: colors.surfaceSecondary },
                    value === rating.toString() && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => handleSelect(rating)}
                >
                  <Text
                    style={[
                      styles.ratingText,
                      { color: colors.text },
                      value === rating.toString() && { color: colors.textOnPrimary },
                    ]}
                  >
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {value && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  onValueChange('');
                  setModalVisible(false);
                }}
              >
                <Text style={[styles.clearButtonText, { color: colors.error }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  optionalText: {
    fontSize: 12,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  selector: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 54,
  },
  selectorContent: {
    flex: 1,
  },
  selectedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  selectedEmoji: {
    fontSize: 24,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  arrow: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  ratingButton: {
    width: 52,
    height: 52,
    backgroundColor: '#f5f5f5',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRatingButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  ratingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  selectedRatingText: {
    color: '#fff',
  },
  clearButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '600',
  },
});
