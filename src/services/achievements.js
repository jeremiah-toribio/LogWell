import AsyncStorage from '@react-native-async-storage/async-storage';

const ACHIEVEMENTS_KEY = '@achievements_data';

// ─── Badge definitions ────────────────────────────────────────────────────────

export const BADGES = {
  // Workout
  WORKOUT_ALL_TIME_PR:  { id: 'workout_all_time_pr',  label: 'Beast Mode',       icon: '🏆', desc: (m) => `New all-time PR on ${m?.exercise}!`,    category: 'workout' },
  WORKOUT_MONTHLY_HIGH: { id: 'workout_monthly_high', label: 'On Fire',           icon: '🔥', desc: (m) => `Monthly best on ${m?.exercise}!`,        category: 'workout' },
  WORKOUT_VOLUME_PR:    { id: 'workout_volume_pr',    label: 'Volume King',       icon: '💪', desc: ()  => 'Best session volume ever!',               category: 'workout' },
  WORKOUT_WEEK_STREAK:  { id: 'workout_week_streak',  label: 'Locked In',         icon: '⚡', desc: ()  => '3+ workouts this week!',                  category: 'workout' },
  WORKOUT_10:           { id: 'workout_10',           label: 'Getting After It',  icon: '🚀', desc: ()  => '10 workouts logged!',                     category: 'workout' },
  WORKOUT_25:           { id: 'workout_25',           label: 'No Days Off',       icon: '💯', desc: ()  => '25 workouts logged!',                     category: 'workout' },
  WORKOUT_50:           { id: 'workout_50',           label: 'Unstoppable',       icon: '🔥', desc: ()  => '50 workouts logged!',                     category: 'workout' },
  WORKOUT_100:          { id: 'workout_100',          label: 'Legend',            icon: '👑', desc: ()  => '100 workouts logged!',                    category: 'workout' },
  // Sleep
  SLEEP_DURATION_PR:    { id: 'sleep_duration_pr',    label: 'Best Rest Ever',    icon: '😴', desc: ()  => 'Longest sleep ever logged!',              category: 'sleep' },
  SLEEP_MONTHLY_HIGH:   { id: 'sleep_monthly_high',   label: 'Recharge Mode',     icon: '🌙', desc: ()  => 'Best sleep duration this month!',         category: 'sleep' },
  SLEEP_QUALITY_HIGH:   { id: 'sleep_quality_high',   label: 'Peak Recovery',     icon: '⭐', desc: ()  => 'Highest quality rating this month!',      category: 'sleep' },
  SLEEP_WEEK_STREAK:    { id: 'sleep_week_streak',    label: 'Sleep Master',      icon: '💤', desc: ()  => '5+ nights logged this week!',             category: 'sleep' },
  SLEEP_10:             { id: 'sleep_10',             label: 'Rest Warrior',      icon: '🌟', desc: ()  => '10 nights logged!',                       category: 'sleep' },
  SLEEP_25:             { id: 'sleep_25',             label: 'Recovery Pro',      icon: '⭐', desc: ()  => '25 nights logged!',                       category: 'sleep' },
  SLEEP_50:             { id: 'sleep_50',             label: 'Sleep Champion',    icon: '🏆', desc: ()  => '50 nights logged!',                       category: 'sleep' },
  // Focus
  FOCUS_SESSION_PR:     { id: 'focus_session_pr',     label: 'Deep Zone',         icon: '⚡', desc: ()  => 'Longest focus session ever!',             category: 'focus' },
  FOCUS_DAILY_VOLUME:   { id: 'focus_daily_volume',   label: 'Flow State',        icon: '🧠', desc: ()  => 'Most focus minutes in a single day!',     category: 'focus' },
  FOCUS_POMO_10:        { id: 'focus_pomo_10',        label: 'Locked In',         icon: '🍅', desc: ()  => '10 pomodoros completed!',                 category: 'focus' },
  FOCUS_POMO_25:        { id: 'focus_pomo_25',        label: 'Focus Machine',     icon: '⚡', desc: ()  => '25 pomodoros completed!',                 category: 'focus' },
  FOCUS_POMO_50:        { id: 'focus_pomo_50',        label: 'Unstoppable',       icon: '🔥', desc: ()  => '50 pomodoros completed!',                 category: 'focus' },
  FOCUS_POMO_100:       { id: 'focus_pomo_100',       label: 'Pomo Legend',       icon: '👑', desc: ()  => '100 pomodoros completed!',                category: 'focus' },
  FOCUS_WEEK_STREAK:    { id: 'focus_week_streak',    label: 'On a Roll',         icon: '🎯', desc: ()  => '5+ focus sessions this week!',            category: 'focus' },
  FOCUS_10:             { id: 'focus_10',             label: 'Getting Focused',   icon: '🚀', desc: ()  => '10 focus sessions logged!',               category: 'focus' },
  FOCUS_25:             { id: 'focus_25',             label: 'Focus Pro',         icon: '💯', desc: ()  => '25 focus sessions logged!',               category: 'focus' },
  FOCUS_50:             { id: 'focus_50',             label: 'Mind Like Water',   icon: '🧘', desc: ()  => '50 focus sessions logged!',               category: 'focus' },
};

// ─── Key helpers ──────────────────────────────────────────────────────────────

const getWeekKey = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday start
  return `${d.getFullYear()}-W${String(Math.ceil((d - new Date(d.getFullYear(), 0, 1)) / 604800000)).padStart(2, '0')}`;
};

const getMonthKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getDayKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const defaultData = () => ({
  prs: {
    workout: { exercises: {}, totalCount: 0, weeklyCount: {}, sessionVolumeRecord: 0 },
    sleep:   { maxDuration: 0, maxQuality: 0, monthlyMaxDuration: {}, monthlyMaxQuality: {}, totalCount: 0, weeklyCount: {} },
    focus:   { maxSessionDuration: 0, maxDailyVolume: 0, totalPomodoros: 0, totalCount: 0, weeklyCount: {}, dailyVolume: {} },
  },
  earned: [],
});

const loadData = async () => {
  try {
    const raw = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    // Ensure all keys exist for backward compatibility
    const def = defaultData();
    return {
      prs: {
        workout: { ...def.prs.workout, ...parsed.prs?.workout },
        sleep:   { ...def.prs.sleep,   ...parsed.prs?.sleep },
        focus:   { ...def.prs.focus,   ...parsed.prs?.focus },
      },
      earned: parsed.earned || [],
    };
  } catch {
    return defaultData();
  }
};

const saveData = async (data) => {
  await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(data));
};

// ─── Weight parser ────────────────────────────────────────────────────────────

const parseWeight = (w) => {
  if (!w || w === 'BW') return 0;
  const n = parseFloat(w);
  return isNaN(n) ? 0 : n;
};

// ─── Workout achievements ─────────────────────────────────────────────────────

export const checkWorkoutAchievements = async (workoutLog) => {
  const data = await loadData();
  const prs = data.prs.workout;
  const earned = [];
  const now = new Date(workoutLog.createdAt || new Date());
  const weekKey = getWeekKey(now);
  const monthKey = getMonthKey(now);

  // Count
  prs.totalCount = (prs.totalCount || 0) + 1;
  prs.weeklyCount[weekKey] = (prs.weeklyCount[weekKey] || 0) + 1;

  // Milestones
  const milestones = [
    [10, BADGES.WORKOUT_10], [25, BADGES.WORKOUT_25],
    [50, BADGES.WORKOUT_50], [100, BADGES.WORKOUT_100],
  ];
  for (const [n, badge] of milestones) {
    if (prs.totalCount === n) earned.push(badge);
  }

  // Weekly streak
  if (prs.weeklyCount[weekKey] >= 3) earned.push(BADGES.WORKOUT_WEEK_STREAK);

  // Per-exercise PRs + session volume
  let sessionVolume = 0;
  const exercises = workoutLog.exercises || [];

  for (const ex of exercises) {
    if (!ex.name) continue;
    if (!prs.exercises[ex.name]) prs.exercises[ex.name] = { maxWeight: 0, monthlyMax: {}, maxVolume: 0 };
    const stored = prs.exercises[ex.name];

    let exMaxWeight = 0;
    let exVolume = 0;

    if (ex.trackSets && ex.sets?.length) {
      for (const s of ex.sets) {
        const w = parseWeight(s.weight);
        const r = parseInt(s.reps) || 0;
        if (w > exMaxWeight) exMaxWeight = w;
        exVolume += w * r;
      }
    } else {
      exMaxWeight = parseWeight(ex.weight);
      exVolume = exMaxWeight * (parseInt(ex.sets) || 0) * (parseInt(ex.reps) || 0);
    }

    sessionVolume += exVolume;

    if (exMaxWeight > 0) {
      // All-time PR
      if (exMaxWeight > stored.maxWeight) {
        stored.maxWeight = exMaxWeight;
        earned.push({ ...BADGES.WORKOUT_ALL_TIME_PR, meta: { exercise: ex.name, weight: exMaxWeight } });
      }
      // Monthly high
      const prevMonthly = stored.monthlyMax[monthKey] || 0;
      if (exMaxWeight > prevMonthly) {
        stored.monthlyMax[monthKey] = exMaxWeight;
        if (exMaxWeight <= (stored.maxWeight || 0)) {
          // Only show monthly high if it's not already an all-time PR
          earned.push({ ...BADGES.WORKOUT_MONTHLY_HIGH, meta: { exercise: ex.name, weight: exMaxWeight } });
        }
      }
    }
  }

  // Session volume PR
  if (sessionVolume > 0 && sessionVolume > (prs.sessionVolumeRecord || 0)) {
    prs.sessionVolumeRecord = sessionVolume;
    earned.push(BADGES.WORKOUT_VOLUME_PR);
  }

  // Deduplicate (in case multiple exercises hit all-time PR, just show one of each badge type)
  const seen = new Set();
  const deduped = earned.filter(b => {
    const key = b.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Store earned
  const logCreatedAt = workoutLog.createdAt || new Date().toISOString();
  for (const badge of deduped) {
    data.earned.push({
      id: badge.id,
      label: badge.label,
      icon: badge.icon,
      desc: typeof badge.desc === 'function' ? badge.desc(badge.meta) : badge.desc,
      category: badge.category,
      earnedAt: new Date().toISOString(),
      logCreatedAt,
    });
  }

  await saveData(data);
  return deduped.map(b => ({
    ...b,
    desc: typeof b.desc === 'function' ? b.desc(b.meta) : b.desc,
  }));
};

// ─── Sleep achievements ───────────────────────────────────────────────────────

export const checkSleepAchievements = async (sleepLog) => {
  const data = await loadData();
  const prs = data.prs.sleep;
  const earned = [];
  const now = new Date(sleepLog.createdAt || new Date());
  const weekKey = getWeekKey(now);
  const monthKey = getMonthKey(now);

  const duration = parseFloat(sleepLog.totalHours) || 0;
  const quality = parseInt(sleepLog.effectivenessRating) || 0;

  prs.totalCount = (prs.totalCount || 0) + 1;
  prs.weeklyCount[weekKey] = (prs.weeklyCount[weekKey] || 0) + 1;

  // Milestones
  const milestones = [
    [10, BADGES.SLEEP_10], [25, BADGES.SLEEP_25], [50, BADGES.SLEEP_50],
  ];
  for (const [n, badge] of milestones) {
    if (prs.totalCount === n) earned.push(badge);
  }

  // Weekly streak
  if (prs.weeklyCount[weekKey] >= 5) earned.push(BADGES.SLEEP_WEEK_STREAK);

  // Duration PR
  if (duration > (prs.maxDuration || 0)) {
    prs.maxDuration = duration;
    earned.push(BADGES.SLEEP_DURATION_PR);
  }

  // Monthly duration high
  const prevMonthlyDur = prs.monthlyMaxDuration[monthKey] || 0;
  if (duration > prevMonthlyDur) {
    prs.monthlyMaxDuration[monthKey] = duration;
    if (duration <= (prs.maxDuration || 0)) {
      earned.push(BADGES.SLEEP_MONTHLY_HIGH);
    }
  }

  // Monthly quality high
  if (quality > 0) {
    const prevMonthlyQ = prs.monthlyMaxQuality[monthKey] || 0;
    if (quality > prevMonthlyQ) {
      prs.monthlyMaxQuality[monthKey] = quality;
      earned.push(BADGES.SLEEP_QUALITY_HIGH);
    }
  }

  const seen = new Set();
  const deduped = earned.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });

  const logCreatedAt = sleepLog.createdAt || new Date().toISOString();
  for (const badge of deduped) {
    data.earned.push({
      id: badge.id, label: badge.label, icon: badge.icon,
      desc: typeof badge.desc === 'function' ? badge.desc() : badge.desc,
      category: badge.category, earnedAt: new Date().toISOString(), logCreatedAt,
    });
  }

  await saveData(data);
  return deduped.map(b => ({ ...b, desc: typeof b.desc === 'function' ? b.desc() : b.desc }));
};

// ─── Focus achievements ───────────────────────────────────────────────────────

export const checkFocusAchievements = async (focusLog) => {
  const data = await loadData();
  const prs = data.prs.focus;
  const earned = [];
  const now = new Date(focusLog.createdAt || new Date());
  const weekKey = getWeekKey(now);
  const dayKey = getDayKey(now);

  const sessionMinutes = parseInt(focusLog.totalMinutes) || 0;
  const sessionPomodoros = (focusLog.pomodoros?.length) || 0;

  prs.totalCount = (prs.totalCount || 0) + 1;
  prs.weeklyCount[weekKey] = (prs.weeklyCount[weekKey] || 0) + 1;
  prs.totalPomodoros = (prs.totalPomodoros || 0) + sessionPomodoros;
  prs.dailyVolume[dayKey] = (prs.dailyVolume[dayKey] || 0) + sessionMinutes;

  // Milestones
  const countMilestones = [
    [10, BADGES.FOCUS_10], [25, BADGES.FOCUS_25], [50, BADGES.FOCUS_50],
  ];
  for (const [n, badge] of countMilestones) {
    if (prs.totalCount === n) earned.push(badge);
  }

  // Pomodoro milestones
  const pomMilestones = [
    [10, BADGES.FOCUS_POMO_10], [25, BADGES.FOCUS_POMO_25],
    [50, BADGES.FOCUS_POMO_50], [100, BADGES.FOCUS_POMO_100],
  ];
  for (const [n, badge] of pomMilestones) {
    const prev = prs.totalPomodoros - sessionPomodoros;
    if (prev < n && prs.totalPomodoros >= n) earned.push(badge);
  }

  // Weekly streak
  if (prs.weeklyCount[weekKey] >= 5) earned.push(BADGES.FOCUS_WEEK_STREAK);

  // Session duration PR
  if (sessionMinutes > (prs.maxSessionDuration || 0)) {
    prs.maxSessionDuration = sessionMinutes;
    earned.push(BADGES.FOCUS_SESSION_PR);
  }

  // Daily volume PR
  const todayTotal = prs.dailyVolume[dayKey];
  if (todayTotal > (prs.maxDailyVolume || 0)) {
    prs.maxDailyVolume = todayTotal;
    earned.push(BADGES.FOCUS_DAILY_VOLUME);
  }

  const seen = new Set();
  const deduped = earned.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });

  const logCreatedAt = focusLog.createdAt || new Date().toISOString();
  for (const badge of deduped) {
    data.earned.push({
      id: badge.id, label: badge.label, icon: badge.icon,
      desc: typeof badge.desc === 'function' ? badge.desc() : badge.desc,
      category: badge.category, earnedAt: new Date().toISOString(), logCreatedAt,
    });
  }

  await saveData(data);
  return deduped.map(b => ({ ...b, desc: typeof b.desc === 'function' ? b.desc() : b.desc }));
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getEarnedAchievements = async () => {
  const data = await loadData();
  return data.earned;
};

export const resetAchievements = async () => {
  await saveData(defaultData());
};

export const getAchievementPRs = async () => {
  const data = await loadData();
  return data.prs;
};

export const getStreakBadges = async () => {
  const data = await loadData();
  const weekKey = getWeekKey();
  const streaks = [];

  if ((data.prs.workout.weeklyCount[weekKey] || 0) >= 3)
    streaks.push({ label: 'Workout Streak', icon: '⚡', count: data.prs.workout.weeklyCount[weekKey], category: 'workout' });
  if ((data.prs.sleep.weeklyCount[weekKey] || 0) >= 5)
    streaks.push({ label: 'Sleep Streak', icon: '💤', count: data.prs.sleep.weeklyCount[weekKey], category: 'sleep' });
  if ((data.prs.focus.weeklyCount[weekKey] || 0) >= 5)
    streaks.push({ label: 'Focus Streak', icon: '🎯', count: data.prs.focus.weeklyCount[weekKey], category: 'focus' });

  return streaks;
};

export const getBadgesForLog = (earned, logCreatedAt) => {
  if (!logCreatedAt) return [];
  return earned.filter(b => b.logCreatedAt === logCreatedAt);
};
