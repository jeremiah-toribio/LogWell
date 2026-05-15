import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatDuration } from '../services/healthKit';

export default function HealthKitMatchModal({
  visible,
  onClose,
  matches,
  onSelectMatch,
  onSkip,
  loading,
}) {
  const { colors } = useTheme();

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Text style={styles.heartIcon}>❤️</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Apple Health Match Found
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We found workout data in Apple Health that matches your entry.
              Link them to add heart rate and calorie data.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Fetching health data...
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.matchList} showsVerticalScrollIndicator={false}>
              {matches.map((match, index) => (
                <TouchableOpacity
                  key={match.id || index}
                  style={[styles.matchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => onSelectMatch(match)}
                  activeOpacity={0.7}
                >
                  <View style={styles.matchHeader}>
                    <View style={[styles.activityBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.activityType, { color: colors.primary }]}>
                        {match.activityType}
                      </Text>
                    </View>
                    <Text style={[styles.matchScore, { color: colors.success }]}>
                      {Math.round(match.matchScore)}% match
                    </Text>
                  </View>

                  <View style={styles.matchDetails}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {formatDate(match.startDate)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Time</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {formatTime(match.startDate)} - {formatTime(match.endDate)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Duration</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {formatDuration(match.duration)}
                      </Text>
                    </View>
                    {match.calories > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Calories</Text>
                        <Text style={[styles.detailValue, { color: colors.warning }]}>
                          {Math.round(match.calories)} kcal
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.matchSource}>
                    <Text style={[styles.sourceText, { color: colors.textLight }]}>
                      from {match.sourceName || 'Apple Health'}
                    </Text>
                  </View>

                  <View style={[styles.linkButton, { backgroundColor: colors.primary }]}>
                    <Text style={styles.linkButtonText}>Link This Workout</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {matches.length === 0 && !loading && (
                <View style={styles.noMatches}>
                  <Text style={[styles.noMatchesText, { color: colors.textSecondary }]}>
                    No matching workouts found in Apple Health
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.skipButton, { borderColor: colors.border }]}
              onPress={onSkip}
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                Skip & Save Without Health Data
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 34,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B3020',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heartIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  matchList: {
    paddingHorizontal: 16,
    maxHeight: 400,
  },
  matchCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activityType: {
    fontSize: 13,
    fontWeight: '600',
  },
  matchScore: {
    fontSize: 13,
    fontWeight: '600',
  },
  matchDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  matchSource: {
    marginBottom: 12,
  },
  sourceText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  linkButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  noMatches: {
    padding: 32,
    alignItems: 'center',
  },
  noMatchesText: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    paddingTop: 8,
  },
  skipButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
