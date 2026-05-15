// Color schemes for the app
// Users can select their preferred theme in Settings

export const THEMES = {
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calm blues and teals',
    colors: {
      primary: '#0891B2',
      primaryLight: '#22D3EE',
      primaryDark: '#0E7490',
      secondary: '#6366F1',
      accent: '#14B8A6',

      background: '#F0F9FF',
      surface: '#FFFFFF',
      surfaceSecondary: '#E0F2FE',

      text: '#0C4A6E',
      textSecondary: '#64748B',
      textLight: '#94A3B8',
      textOnPrimary: '#FFFFFF',

      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',

      border: '#BAE6FD',
      shadow: '#0891B2',

      tabBar: '#FFFFFF',
      tabBarActive: '#0891B2',
      tabBarInactive: '#94A3B8',

      card: '#FFFFFF',
      cardBorder: '#E0F2FE',
    },
  },

  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Earthy greens and browns',
    colors: {
      primary: '#059669',
      primaryLight: '#34D399',
      primaryDark: '#047857',
      secondary: '#84CC16',
      accent: '#F59E0B',

      background: '#F0FDF4',
      surface: '#FFFFFF',
      surfaceSecondary: '#DCFCE7',

      text: '#14532D',
      textSecondary: '#4B5563',
      textLight: '#9CA3AF',
      textOnPrimary: '#FFFFFF',

      success: '#22C55E',
      warning: '#EAB308',
      error: '#DC2626',

      border: '#BBF7D0',
      shadow: '#059669',

      tabBar: '#FFFFFF',
      tabBarActive: '#059669',
      tabBarInactive: '#9CA3AF',

      card: '#FFFFFF',
      cardBorder: '#DCFCE7',
    },
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm oranges and corals',
    colors: {
      primary: '#EA580C',
      primaryLight: '#FB923C',
      primaryDark: '#C2410C',
      secondary: '#E11D48',
      accent: '#FBBF24',

      background: '#FFF7ED',
      surface: '#FFFFFF',
      surfaceSecondary: '#FFEDD5',

      text: '#7C2D12',
      textSecondary: '#57534E',
      textLight: '#A8A29E',
      textOnPrimary: '#FFFFFF',

      success: '#16A34A',
      warning: '#CA8A04',
      error: '#DC2626',

      border: '#FED7AA',
      shadow: '#EA580C',

      tabBar: '#FFFFFF',
      tabBarActive: '#EA580C',
      tabBarInactive: '#A8A29E',

      card: '#FFFFFF',
      cardBorder: '#FFEDD5',
    },
  },

  lavender: {
    id: 'lavender',
    name: 'Lavender',
    description: 'Soft purples and pinks',
    colors: {
      primary: '#7C3AED',
      primaryLight: '#A78BFA',
      primaryDark: '#6D28D9',
      secondary: '#EC4899',
      accent: '#8B5CF6',

      background: '#FAF5FF',
      surface: '#FFFFFF',
      surfaceSecondary: '#F3E8FF',

      text: '#4C1D95',
      textSecondary: '#6B7280',
      textLight: '#9CA3AF',
      textOnPrimary: '#FFFFFF',

      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',

      border: '#E9D5FF',
      shadow: '#7C3AED',

      tabBar: '#FFFFFF',
      tabBarActive: '#7C3AED',
      tabBarInactive: '#9CA3AF',

      card: '#FFFFFF',
      cardBorder: '#F3E8FF',
    },
  },

  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark mode with cyan accents',
    colors: {
      primary: '#06B6D4',
      primaryLight: '#22D3EE',
      primaryDark: '#0891B2',
      secondary: '#8B5CF6',
      accent: '#F472B6',

      background: '#0F172A',
      surface: '#1E293B',
      surfaceSecondary: '#334155',

      text: '#F1F5F9',
      textSecondary: '#CBD5E1',
      textLight: '#64748B',
      textOnPrimary: '#0F172A',

      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',

      border: '#334155',
      shadow: '#000000',

      tabBar: '#1E293B',
      tabBarActive: '#06B6D4',
      tabBarInactive: '#64748B',

      card: '#1E293B',
      cardBorder: '#334155',
    },
  },

  slate: {
    id: 'slate',
    name: 'Slate',
    description: 'Dark mode with blue accents',
    colors: {
      primary: '#3B82F6',
      primaryLight: '#60A5FA',
      primaryDark: '#2563EB',
      secondary: '#6366F1',
      accent: '#0EA5E9',

      background: '#18181B',
      surface: '#27272A',
      surfaceSecondary: '#3F3F46',

      text: '#FAFAFA',
      textSecondary: '#A1A1AA',
      textLight: '#71717A',
      textOnPrimary: '#FFFFFF',

      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',

      border: '#3F3F46',
      shadow: '#000000',

      tabBar: '#27272A',
      tabBarActive: '#3B82F6',
      tabBarInactive: '#71717A',

      card: '#27272A',
      cardBorder: '#3F3F46',
    },
  },
};

// Default theme
export const DEFAULT_THEME = 'ocean';

// Get theme by ID
export const getTheme = (themeId) => {
  return THEMES[themeId] || THEMES[DEFAULT_THEME];
};

// Get all themes as array (for picker)
export const getAllThemes = () => {
  return Object.values(THEMES);
};
