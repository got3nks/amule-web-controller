/**
 * ThemeContext
 *
 * Provides theme state (dark/light mode) to the entire app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Try to load from localStorage, default to dark
    if (typeof window !== 'undefined') {
      let initialTheme = 'dark';
      try {
        const saved = localStorage.getItem('amule-theme');
        if (saved === 'light' || saved === 'dark') {
          initialTheme = saved;
        }
      } catch (err) {
        console.error('Failed to load theme from localStorage:', err);
      }

      const root = document.documentElement;
      const body = document.body;
      if (initialTheme === 'dark') {
        root.classList.add('dark');
        body.classList.add('dark');
        root.style.colorScheme = 'dark';
      }
      return initialTheme;
    }
    return 'dark';
  });

  // Apply theme to document and body, and persist to localStorage
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Save to localStorage
    try {
      localStorage.setItem('amule-theme', theme);
    } catch (err) {
      console.error('Failed to save theme to localStorage:', err);
    }
  }, [theme]);

  // Memoize toggle function to prevent unnecessary re-renders of consumers
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  }, []);

  // Memoize context value to prevent re-renders when nothing changed
  const value = useMemo(() => ({
    theme,
    toggleTheme
  }), [theme, toggleTheme]);

  return h(ThemeContext.Provider, { value }, children);
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
