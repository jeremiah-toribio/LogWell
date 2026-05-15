import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated, ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const CATEGORY_COLORS = {
  workout: '#F97316',
  sleep:   '#8B5CF6',
  focus:   '#0891B2',
};

export default function AchievementModal({ visible, badges = [], onClose }) {
  const { colors } = useTheme();
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(500)).current;
  const badgeAnims = useRef(badges.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      // Reset badge anims if badges changed
      badgeAnims.forEach(a => a.setValue(0));

      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(sheetAnim, { toValue: 0, damping: 20, stiffness: 180, useNativeDriver: true }),
      ]).start(() => {
        // Stagger badge pop-ins
        Animated.stagger(80, badgeAnims.map(a =>
          Animated.spring(a, { toValue: 1, damping: 12, stiffness: 200, useNativeDriver: true })
        )).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(sheetAnim, { toValue: 500, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!badges.length) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheetWrapper, { transform: [{ translateY: sheetAnim }] }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.headline, { color: colors.text }]}>You crushed it!</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {badges.length === 1 ? 'You earned a badge' : `You earned ${badges.length} badges`}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.badgeList}>
            {badges.map((badge, i) => {
              const anim = badgeAnims[i] || new Animated.Value(1);
              const color = CATEGORY_COLORS[badge.category] || colors.primary;
              return (
                <Animated.View
                  key={`${badge.id}-${i}`}
                  style={[
                    styles.badgeRow,
                    {
                      backgroundColor: color + '14',
                      borderColor: color + '40',
                      transform: [
                        { scale: anim },
                        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                      ],
                      opacity: anim,
                    },
                  ]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  </View>
                  <View style={styles.badgeText}>
                    <Text style={[styles.badgeLabel, { color }]}>{badge.label}</Text>
                    <Text style={[styles.badgeDesc, { color: colors.textSecondary }]}>{badge.desc}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.closeBtnText, { color: colors.textOnPrimary }]}>Keep Going!</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 12,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  badgeList: {
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeText: {
    flex: 1,
  },
  badgeLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  badgeDesc: {
    fontSize: 13,
  },
  closeBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
