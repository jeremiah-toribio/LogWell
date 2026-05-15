import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Vibration,
  Animated,
  Keyboard,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { saveRestTimerSession } from '../services/storage';

const PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '1:30', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
];

export default function RestTimerModal({ visible, onClose }) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customMins, setCustomMins] = useState('');
  const [customSecs, setCustomSecs] = useState('');
  const intervalRef = useRef(null);

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 22,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 400,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset all state after close animation completes
        clearInterval(intervalRef.current);
        setSelected(null);
        setTimeLeft(0);
        setIsRunning(false);
        setIsDone(false);
        setShowCustom(false);
        setCustomMins('');
        setCustomSecs('');
      });
    }
  }, [visible]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            setIsDone(true);
            Vibration.vibrate([0, 400, 200, 400, 200, 400]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const selectPreset = (seconds) => {
    clearInterval(intervalRef.current);
    setSelected(seconds);
    setTimeLeft(seconds);
    setIsRunning(false);
    setIsDone(false);
    setShowCustom(false);
    setCustomMins('');
    setCustomSecs('');
    Keyboard.dismiss();
  };

  const applyCustom = () => {
    const mins = parseInt(customMins) || 0;
    const secs = parseInt(customSecs) || 0;
    const total = mins * 60 + secs;
    if (total <= 0) return;
    clearInterval(intervalRef.current);
    setSelected(total);
    setTimeLeft(total);
    setIsRunning(false);
    setIsDone(false);
    Keyboard.dismiss();
  };

  const handleStart = async () => {
    if (!selected || isRunning) return;
    await saveRestTimerSession(selected);
    setIsDone(false);
    setIsRunning(true);
  };

  const handleStop = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
  };

  const handleReset = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsDone(false);
    setTimeLeft(selected || 0);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isCustomSelected = selected !== null && !PRESETS.some(p => p.seconds === selected);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Overlay fades in independently — no slide */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={styles.overlayTap} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet slides up independently */}
      <Animated.View
        style={[
          styles.sheetWrapper,
          { transform: [{ translateY: sheetTranslateY }] },
        ]}
      >
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Rest Timer</Text>
            <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
              <Text style={[styles.doneBtnText, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Preset chips + Custom */}
          <View style={styles.presets}>
            {PRESETS.map(p => (
              <TouchableOpacity
                key={p.seconds}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
                  selected === p.seconds && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
                ]}
                onPress={() => selectPreset(p.seconds)}
              >
                <Text style={[
                  styles.chipText,
                  { color: selected === p.seconds ? colors.primary : colors.textSecondary },
                ]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
                (showCustom || isCustomSelected) && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
              ]}
              onPress={() => setShowCustom(v => !v)}
            >
              <Text style={[
                styles.chipText,
                { color: (showCustom || isCustomSelected) ? colors.primary : colors.textSecondary },
              ]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {/* Custom input row */}
          {showCustom && (
            <View style={[styles.customRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <TextInput
                style={[styles.customInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="min"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                value={customMins}
                onChangeText={setCustomMins}
                maxLength={2}
              />
              <Text style={[styles.customColon, { color: colors.textSecondary }]}>:</Text>
              <TextInput
                style={[styles.customInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="sec"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                value={customSecs}
                onChangeText={setCustomSecs}
                maxLength={2}
              />
              <TouchableOpacity
                style={[styles.customSetBtn, { backgroundColor: colors.primary }]}
                onPress={applyCustom}
              >
                <Text style={styles.customSetBtnText}>Set</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <View style={[styles.countdownRing, { borderColor: isDone ? colors.success : isRunning ? colors.primary : colors.border }]}>
              <Text style={[
                styles.countdown,
                { color: isDone ? colors.success : selected ? colors.text : colors.textLight },
              ]}>
                {isDone ? 'Done!' : formatTime(timeLeft)}
              </Text>
              {isDone && (
                <Text style={[styles.doneLabel, { color: colors.success }]}>Rest complete</Text>
              )}
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={handleReset}
              disabled={!selected}
            >
              <Text style={[styles.controlBtnText, { color: selected ? colors.text : colors.textLight }]}>
                Reset
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlBtn,
                styles.primaryBtn,
                { backgroundColor: isRunning ? colors.error : colors.primary },
                !selected && styles.disabledBtn,
              ]}
              onPress={isRunning ? handleStop : handleStart}
              disabled={!selected}
            >
              <Text style={[styles.controlBtnText, { color: '#fff' }]}>
                {isRunning ? 'Stop' : isDone ? 'Again' : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayTap: {
    flex: 1,
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  doneBtn: {
    padding: 4,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  customInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '300',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  customColon: {
    fontSize: 22,
    fontWeight: '300',
  },
  customSetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  customSetBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  countdownRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdown: {
    fontSize: 42,
    fontWeight: '200',
    letterSpacing: 2,
  },
  doneLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryBtn: {
    borderWidth: 0,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  controlBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
