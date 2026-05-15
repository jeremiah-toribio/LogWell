import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, DEFAULT_THEME, getTheme } from './colors';

const THEME_STORAGE_KEY = '@app_theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && THEMES[savedTheme]) {
        setThemeId(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (newThemeId) => {
    try {
      if (THEMES[newThemeId]) {
        setThemeId(newThemeId);
        await AsyncStorage.setItem(THEME_STORAGE_KEY, newThemeId);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = getTheme(themeId);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeId,
        setTheme,
        colors: theme.colors,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme in components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export for convenience
export { THEMES, getAllThemes } from './colors';
