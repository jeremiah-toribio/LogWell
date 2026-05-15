import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { saveFocusLog } from '../services/storage';
import RatingPicker from '../components/RatingPicker';
import LabelPicker from '../components/LabelPicker';
import LimitBanner from '../components/LimitBanner';
import { useTheme } from '../theme/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import AchievementModal from '../components/AchievementModal';
import { checkFocusAchievements } from '../services/achievements';

export default function FocusLogScreen({ navigation }) {
  const { colors } = useTheme();
  const { isPremium, weeklyRecords, checkCanAddRecord, refreshPremiumStatus } = usePremium();
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [pomodoroLength, setPomodoroLength] = useState('25');
  const [breakLength, setBreakLength] = useState('5');
  const [effectivenessRating, setEffectivenessRating] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [completedPomodoros, setCompletedPomodoros] = useState([]);
  const [currentPomodoroStart, setCurrentPomodoroStart] = useState(null);
  const [currentPomodoroElapsed, setCurrentPomodoroElapsed] = useState(0);
  const intervalRef = useRef(null);

  // Multi-bout mode state
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [isMultiBoutMode, setIsMultiBoutMode] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [bouts, setBouts] = useState([]);
  const [currentBoutStart, setCurrentBoutStart] = useState(null);
  const [sessionStart, setSessionStart] = useState(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (isMultiBoutMode) {
          // Count UP for multi-bout mode
          setElapsedTime(prev => prev + 1);
        } else {
          // Count DOWN for pomodoro mode, also track elapsed
          setTimeRemaining(prev => {
            if (prev <= 1) {
              handleTimerComplete();
              return 0;
            }
            return prev - 1;
          });
          if (!isBreak) {
            setCurrentPomodoroElapsed(prev => prev + 1);
          }
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isMultiBoutMode, isBreak]);

  const handleTimerComplete = () => {
    setIsRunning(false);

    if (!isBreak) {
      // Pomodoro completed
      const endTime = new Date();
      const startTime = currentPomodoroStart || new Date(endTime.getTime() - parseInt(pomodoroLength) * 60 * 1000);
      const targetDuration = parseInt(pomodoroLength);

      const newPomodoro = {
        duration: targetDuration,
        actualSeconds: targetDuration * 60,
        completed: true,
        partial: false,
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
      };

      setCompletedPomodoros([...completedPomodoros, newPomodoro]);
      setCurrentPomodoroElapsed(0);
      Alert.alert('Pomodoro Complete!', 'Time for a break.');

      // Start break
      setIsBreak(true);
      setTimeRemaining(parseInt(breakLength) * 60);
    } else {
      // Break completed
      Alert.alert('Break Complete!', 'Ready for another pomodoro?');
      setIsBreak(false);
      setTimeRemaining(parseInt(pomodoroLength) * 60);
    }
  };

  const handleEndEarly = () => {
    if (currentPomodoroElapsed < 60) {
      Alert.alert('Too Short', 'Focus for at least 1 minute to record a session.');
      return;
    }

    Alert.alert(
      'End Session Early?',
      `Record ${formatDuration(currentPomodoroElapsed)} of focus time?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End & Record',
          onPress: () => {
            setIsRunning(false);
            const endTime = new Date();
            const startTime = currentPomodoroStart || new Date(endTime.getTime() - currentPomodoroElapsed * 1000);

            const newPomodoro = {
              duration: Math.round(currentPomodoroElapsed / 60),
              actualSeconds: currentPomodoroElapsed,
              completed: false,
              partial: true,
              startTime: formatTime(startTime),
              endTime: formatTime(endTime),
            };

            setCompletedPomodoros([...completedPomodoros, newPomodoro]);
            setCurrentPomodoroElapsed(0);
            setTimeRemaining(parseInt(pomodoroLength) * 60);
            setCurrentPomodoroStart(null);
          }
        }
      ]
    );
  };

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatTimeDisplay = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Multi-bout handlers
  const handleStartMultiBout = () => {
    if (!selectedLabel) {
      Alert.alert('Missing Label', 'Please select a label for your focus session');
      return;
    }
    const now = new Date();
    setSessionStart(now);
    setCurrentBoutStart(now);
    setElapsedTime(0);
    setBouts([]);
    setIsRunning(true);
  };

  const handleRecordBout = () => {
    if (!currentBoutStart) return;

    const now = new Date();
    const boutDuration = Math.round((now - currentBoutStart) / 1000);

    const newBout = {
      id: Date.now().toString(),
      startTime: formatTime(currentBoutStart),
      endTime: formatTime(now),
      duration: boutDuration,
      splitTime: elapsedTime, // Total elapsed at this point
    };

    setBouts([...bouts, newBout]);
    setCurrentBoutStart(now); // Start next bout immediately
  };

  const handleStopMultiBout = () => {
    setIsRunning(false);

    // Record the bout when stopping
    if (currentBoutStart) {
      const now = new Date();
      const boutDuration = Math.round((now - currentBoutStart) / 1000);

      if (boutDuration > 0) {
        const newBout = {
          id: Date.now().toString(),
          startTime: formatTime(currentBoutStart),
          endTime: formatTime(now),
          duration: boutDuration,
          splitTime: elapsedTime,
        };
        setBouts(prev => [...prev, newBout]);
      }
    }
  };

  const handleSaveMultiBoutSession = async () => {
    // Check if user can add more records (premium check)
    const canAdd = await checkCanAddRecord();
    if (!canAdd) {
      return; // Paywall will be shown automatically
    }

    if (bouts.length === 0) {
      Alert.alert('No Bouts', 'Record at least one bout before saving');
      return;
    }

    try {
      const totalSeconds = bouts.reduce((sum, b) => sum + b.duration, 0);
      const totalMinutes = Math.round(totalSeconds / 60);

      await saveFocusLog({
        label: selectedLabel ? { id: selectedLabel.id, name: selectedLabel.name, color: selectedLabel.color } : null,
        totalMinutes: totalMinutes || 1, // At least 1 minute
        isMultiBout: true,
        bouts: bouts,
        boutCount: bouts.length,
        effectivenessRating: effectivenessRating ? parseInt(effectivenessRating) : null,
      });

      await refreshPremiumStatus();
      const savedLog = { totalMinutes: totalMinutes || 1, isMultiBout: true, bouts, createdAt: new Date().toISOString() };
      const badges = await checkFocusAchievements(savedLog);
      if (badges.length > 0) {
        setEarnedBadges(badges);
        setShowAchievements(true);
      } else {
        Alert.alert('Success', `Focus session saved!\n${bouts.length} bout${bouts.length !== 1 ? 's' : ''} recorded\nTotal: ${formatDuration(totalSeconds)}`);
      }

      // Reset
      resetMultiBoutSession();
    } catch (error) {
      Alert.alert('Error', 'Failed to save focus session');
      console.error(error);
    }
  };

  const resetMultiBoutSession = () => {
    setSelectedLabel(null);
    setBouts([]);
    setElapsedTime(0);
    setCurrentBoutStart(null);
    setSessionStart(null);
    setIsRunning(false);
    setEffectivenessRating('');
  };

  // Calculate total time from completed pomodoros
  const getTotalTime = () => {
    const completedSeconds = completedPomodoros.reduce((sum, p) => sum + (p.actualSeconds || p.duration * 60), 0);
    const currentSeconds = isRunning && !isBreak ? currentPomodoroElapsed : 0;
    return completedSeconds + currentSeconds;
  };

  const getCompletedCount = () => {
    return completedPomodoros.filter(p => p.completed).length;
  };

  const getPartialCount = () => {
    return completedPomodoros.filter(p => p.partial).length;
  };

  // Pomodoro handlers
  const handleStart = () => {
    if (!selectedLabel) {
      Alert.alert('Missing Label', 'Please select a label for your focus session');
      return;
    }
    setCurrentPomodoroStart(new Date());
    setCurrentPomodoroElapsed(0);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleResume = () => {
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeRemaining(parseInt(pomodoroLength) * 60);
    setCurrentPomodoroStart(null);
    setCurrentPomodoroElapsed(0);
  };

  const handleSaveSession = async () => {
    // Check if user can add more records (premium check)
    const canAdd = await checkCanAddRecord();
    if (!canAdd) {
      return; // Paywall will be shown automatically
    }

    if (completedPomodoros.length === 0) {
      Alert.alert('No Data', 'Complete at least one pomodoro before saving');
      return;
    }

    try {
      const totalMinutes = completedPomodoros.reduce((sum, p) => sum + p.duration, 0);

      await saveFocusLog({
        label: selectedLabel ? { id: selectedLabel.id, name: selectedLabel.name, color: selectedLabel.color } : null,
        totalMinutes,
        pomodoros: completedPomodoros,
        pomodoroLength: parseInt(pomodoroLength),
        breakLength: parseInt(breakLength),
        effectivenessRating: effectivenessRating ? parseInt(effectivenessRating) : null,
      });

      await refreshPremiumStatus();
      const savedLog = { totalMinutes, pomodoros: completedPomodoros, createdAt: new Date().toISOString() };
      const badges = await checkFocusAchievements(savedLog);
      if (badges.length > 0) {
        setEarnedBadges(badges);
        setShowAchievements(true);
      } else {
        Alert.alert('Success', `Focus session saved!\n${completedPomodoros.length} pomodoros completed`);
      }

      // Reset
      setSelectedLabel(null);
      setCompletedPomodoros([]);
      setTimeRemaining(parseInt(pomodoroLength) * 60);
      setIsBreak(false);
      setIsRunning(false);
      setEffectivenessRating('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save focus session');
      console.error(error);
    }
  };

  const handleModeSwitch = (value) => {
    if (isRunning) {
      Alert.alert('Timer Running', 'Please stop the timer before switching modes');
      return;
    }
    setIsMultiBoutMode(value);
    // Reset both modes
    handleReset();
    resetMultiBoutSession();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <LimitBanner />

      {/* Mode Toggle */}
      <View style={[styles.modeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.modeInfo}>
          <Text style={[styles.modeLabel, { color: colors.text }]}>
            {isMultiBoutMode ? 'Multi-Bout Mode' : 'Pomodoro Mode'}
          </Text>
          <Text style={[styles.modeHint, { color: colors.textLight }]}>
            {isMultiBoutMode
              ? 'Stopwatch with split times'
              : 'Timed focus intervals with breaks'}
          </Text>
        </View>
        <Switch
          value={isMultiBoutMode}
          onValueChange={handleModeSwitch}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={isMultiBoutMode ? colors.primaryLight : '#f4f3f4'}
          disabled={isRunning}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>What are you focusing on?</Text>
        <LabelPicker
          category="focus"
          selectedLabel={selectedLabel}
          onSelectLabel={setSelectedLabel}
          placeholder="Select or create a label for this session"
        />
      </View>

      {/* Pomodoro Settings - only show in pomodoro mode */}
      {!isMultiBoutMode && (
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Focus (min)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="25"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              value={pomodoroLength}
              onChangeText={(val) => {
                setPomodoroLength(val);
                if (!isRunning && !isBreak) {
                  setTimeRemaining((parseInt(val) || 25) * 60);
                }
              }}
              editable={!isRunning}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Break (min)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="5"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              value={breakLength}
              onChangeText={setBreakLength}
              editable={!isRunning}
            />
          </View>
        </View>
      )}

      <RatingPicker
        label="Focus Quality (Optional)"
        value={effectivenessRating}
        onValueChange={setEffectivenessRating}
        placeholder="Rate your focus/effectiveness"
      />

      {/* Timer Display */}
      <View style={[styles.timerContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        {isMultiBoutMode ? (
          <>
            <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
              {isRunning ? 'Session Running' : bouts.length > 0 ? 'Session Paused' : 'Ready'}
            </Text>
            <Text style={[styles.timerDisplay, { color: colors.primary }]}>
              {formatTimeDisplay(elapsedTime)}
            </Text>
            {bouts.length > 0 && (
              <Text style={[styles.boutCount, { color: colors.success }]}>
                {bouts.length} bout{bouts.length !== 1 ? 's' : ''} recorded
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
              {isBreak ? 'Break Time' : 'Focus Time'}
            </Text>
            <Text style={[styles.timerDisplay, { color: isBreak ? colors.success : colors.primary }]}>
              {formatTimeDisplay(timeRemaining)}
            </Text>
            {!isBreak && isRunning && currentPomodoroElapsed > 0 && (
              <Text style={[styles.elapsedTime, { color: colors.textSecondary }]}>
                {formatDuration(currentPomodoroElapsed)} elapsed
              </Text>
            )}
            {(completedPomodoros.length > 0 || currentPomodoroElapsed > 0) && (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {formatTimeDisplay(getTotalTime())}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textLight }]}>Total Time</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {getCompletedCount()}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textLight }]}>Complete</Text>
                </View>
                {getPartialCount() > 0 && (
                  <>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.warning }]}>
                        {getPartialCount()}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>Partial</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </>
        )}
      </View>

      {/* Control Buttons */}
      {isMultiBoutMode ? (
        <View style={styles.buttonContainer}>
          {!isRunning ? (
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.success }]}
              onPress={bouts.length > 0 ? () => { setCurrentBoutStart(new Date()); setIsRunning(true); } : handleStartMultiBout}
            >
              <Text style={styles.startButtonText}>{bouts.length > 0 ? 'Resume' : 'Start'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: colors.error, flex: 1 }]}
              onPress={handleStopMultiBout}
            >
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          {!isRunning ? (
            currentPomodoroElapsed > 0 ? (
              <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.success }]} onPress={handleResume}>
                <Text style={styles.startButtonText}>Resume</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.success }]} onPress={handleStart}>
                <Text style={styles.startButtonText}>Start</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity style={[styles.pauseButton, { backgroundColor: colors.warning }]} onPress={handlePause}>
              <Text style={styles.pauseButtonText}>Pause</Text>
            </TouchableOpacity>
          )}

          {!isBreak && currentPomodoroElapsed > 0 && (
            <TouchableOpacity
              style={[styles.endEarlyButton, { backgroundColor: colors.primary }]}
              onPress={handleEndEarly}
            >
              <Text style={styles.endEarlyButtonText}>End Early</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.resetButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleReset}>
            <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recorded Bouts (Multi-bout mode) */}
      {isMultiBoutMode && bouts.length > 0 && (
        <>
          <View style={styles.completedSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recorded Bouts</Text>
            {bouts.map((bout, index) => (
              <View key={bout.id} style={[styles.boutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.boutHeader}>
                  <Text style={[styles.boutNumber, { color: colors.primary }]}>Bout {index + 1}</Text>
                  <Text style={[styles.boutDuration, { color: colors.text }]}>{formatDuration(bout.duration)}</Text>
                </View>
                <View style={styles.boutDetails}>
                  <Text style={[styles.boutTime, { color: colors.textSecondary }]}>
                    {bout.startTime} → {bout.endTime}
                  </Text>
                  <Text style={[styles.boutSplit, { color: colors.textLight }]}>
                    Split: {formatTimeDisplay(bout.splitTime)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {!isRunning && (
            <View style={styles.saveActions}>
              <TouchableOpacity
                style={[styles.discardButton, { borderColor: colors.error }]}
                onPress={() => {
                  Alert.alert('Discard Session?', 'All recorded bouts will be lost.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: resetMultiBoutSession }
                  ]);
                }}
              >
                <Text style={[styles.discardButtonText, { color: colors.error }]}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveSessionButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveMultiBoutSession}
              >
                <Text style={[styles.saveButtonText, { color: colors.textOnPrimary }]}>Save Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Completed Pomodoros (Pomodoro mode) */}
      {!isMultiBoutMode && completedPomodoros.length > 0 && (
        <>
          <View style={styles.completedSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Session Progress</Text>
            {completedPomodoros.map((pomo, index) => (
              <View key={index} style={[styles.pomodoroCard, { backgroundColor: colors.card, borderLeftColor: pomo.partial ? colors.warning : colors.success, borderLeftWidth: 3 }]}>
                <View style={styles.pomodoroCardHeader}>
                  <Text style={[styles.pomodoroNumber, { color: pomo.partial ? colors.warning : colors.success }]}>
                    #{index + 1} {pomo.partial ? '(Partial)' : ''}
                  </Text>
                  <Text style={[styles.pomodoroDuration, { color: colors.text }]}>
                    {formatDuration(pomo.actualSeconds || pomo.duration * 60)}
                  </Text>
                </View>
                <Text style={[styles.pomodoroTime, { color: colors.textSecondary }]}>
                  {pomo.startTime} - {pomo.endTime}
                </Text>
              </View>
            ))}
          </View>

          {!isRunning && (
            <View style={styles.saveActions}>
              <TouchableOpacity
                style={[styles.discardButton, { borderColor: colors.error }]}
                onPress={() => {
                  Alert.alert('Discard Session?', 'All completed pomodoros will be lost.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => {
                      setCompletedPomodoros([]);
                      setTimeRemaining(parseInt(pomodoroLength) * 60);
                      setIsBreak(false);
                      setEffectivenessRating('');
                    }}
                  ]);
                }}
              >
                <Text style={[styles.discardButtonText, { color: colors.error }]}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveSessionButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveSession}
              >
                <Text style={[styles.saveButtonText, { color: colors.textOnPrimary }]}>Save Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <AchievementModal
        visible={showAchievements}
        badges={earnedBadges}
        onClose={() => setShowAchievements(false)}
      />
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  modeToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  modeHint: {
    fontSize: 12,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  input: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfInput: {
    width: '48%',
  },
  timerContainer: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerLabel: {
    fontSize: 18,
    color: '#666',
    marginBottom: 12,
  },
  timerDisplay: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#007AFF',
    fontVariant: ['tabular-nums'],
  },
  pomodoroCount: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 12,
    fontWeight: '600',
  },
  elapsedTime: {
    fontSize: 14,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },
  boutCount: {
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  startButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pauseButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  splitButton: {
    flex: 2,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  splitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stopButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  endEarlyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  endEarlyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
  },
  completedSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#555',
  },
  pomodoroCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  pomodoroCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pomodoroNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  pomodoroDuration: {
    fontSize: 16,
    fontWeight: '600',
  },
  pomodoroTime: {
    fontSize: 13,
    color: '#666',
  },
  boutCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  boutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  boutNumber: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  boutDuration: {
    fontSize: 16,
    fontWeight: '600',
  },
  boutDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  boutTime: {
    fontSize: 13,
  },
  boutSplit: {
    fontSize: 12,
  },
  saveActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  discardButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  discardButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveSessionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  limitBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  limitText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
