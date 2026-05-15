import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CATEGORY_COLORS = {
  workout: '#F97316',
  sleep:   '#8B5CF6',
  focus:   '#0891B2',
};

export default function AchievementBadge({ badge, size = 'sm' }) {
  const color = CATEGORY_COLORS[badge.category] || '#6366F1';
  const isSmall = size === 'sm';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: color + '18', borderColor: color + '50' },
      isSmall ? styles.badgeSm : styles.badgeMd,
    ]}>
      <Text style={isSmall ? styles.iconSm : styles.iconMd}>{badge.icon}</Text>
      <Text style={[styles.label, { color }, isSmall ? styles.labelSm : styles.labelMd]}>
        {badge.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  badgeSm: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeMd: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  iconSm: { fontSize: 11 },
  iconMd: { fontSize: 16 },
  labelSm: { fontSize: 11, fontWeight: '600' },
  labelMd: { fontSize: 13, fontWeight: '700' },
});
