import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSleepLogs, getWorkoutLogs, getFocusLogs } from '../services/storage';
import { calculateSleepStats, calculateWorkoutStats, calculateFocusStats } from '../services/calculations';
import { getSettings } from './SettingsScreen';
import { useTheme } from '../theme/ThemeContext';
import { getStreakBadges } from '../services/achievements';
import AchievementBadge from '../components/AchievementBadge';

export default function HomeScreen() {
  const { colors } = useTheme();
  const [sleepStats, setSleepStats] = useState({
    averageSleep: 0,
    totalNights: 0,
    longestSleep: 0,
    shortestSleep: 0
  });
  const [workoutStats, setWorkoutStats] = useState({
    totalWorkouts: 0,
    thisWeek: 0,
    thisMonth: 0,
    mostFrequentExercise: 'N/A'
  });
  const [focusStats, setFocusStats] = useState({
    totalSessions: 0,
    totalHours: 0,
    thisWeek: 0,
    thisMonth: 0,
    avgSessionLength: 0,
    totalPomodoros: 0,
    topLabel: 'N/A'
  });
  const [settings, setSettings] = useState({
    showSleepTab: true,
    showWorkoutTab: true,
    showFocusTab: true,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [streaks, setStreaks] = useState([]);

  const loadStats = async () => {
    try {
      const sleepLogs = await getSleepLogs();
      const workoutLogs = await getWorkoutLogs();
      const focusLogs = await getFocusLogs();
      const userSettings = await getSettings();
      const streakData = await getStreakBadges();

      setSleepStats(calculateSleepStats(sleepLogs));
      setWorkoutStats(calculateWorkoutStats(workoutLogs));
      setFocusStats(calculateFocusStats(focusLogs));
      setSettings(userSettings);
      setStreaks(streakData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>

      {streaks.length > 0 && (
        <View style={[styles.streakCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
          <Text style={[styles.streakTitle, { color: colors.text }]}>Hot Streak</Text>
          <Text style={[styles.streakSub, { color: colors.textSecondary }]}>You're on a roll this week</Text>
          <View style={styles.streakBadges}>
            {streaks.map((s, i) => (
              <View key={i} style={styles.streakBadgeRow}>
                <AchievementBadge badge={s} size="md" />
                <Text style={[styles.streakCount, { color: colors.textSecondary }]}>{s.count}x this week</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {settings.showSleepTab && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>😴 Sleep Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{sleepStats.averageSleep}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Average Sleep</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{sleepStats.totalNights}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Total Nights</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{sleepStats.longestSleep}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Longest Sleep</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{sleepStats.shortestSleep}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Shortest Sleep</Text>
            </View>
          </View>
        </View>
      )}

      {settings.showWorkoutTab && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>💪 Workout Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{workoutStats.totalWorkouts}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Total Workouts</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{workoutStats.thisWeek}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>This Week</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{workoutStats.thisMonth}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>This Month</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]} numberOfLines={2}>
                {workoutStats.mostFrequentExercise}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Top Exercise</Text>
            </View>
          </View>
        </View>
      )}

      {settings.showFocusTab && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>🎯 Focus Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{focusStats.totalSessions}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Total Sessions</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{focusStats.totalHours}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Total Time</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{focusStats.thisWeek}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>This Week</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{focusStats.totalPomodoros}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Total Pomodoros</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{focusStats.avgSessionLength}m</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Avg Session</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <Text style={[styles.statValue, { color: colors.primary }]} numberOfLines={2}>
                {focusStats.topLabel}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Top Activity</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#555',
  },
  streakCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  streakSub: {
    fontSize: 13,
    marginBottom: 12,
  },
  streakBadges: {
    gap: 8,
  },
  streakBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakCount: {
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
});
