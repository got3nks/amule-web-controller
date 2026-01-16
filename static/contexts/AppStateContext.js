/**
 * AppStateContext
 *
 * Manages UI-level application state:
 * - Current view and navigation
 * - Page state (for pagination)
 * - Page size (items per page)
 * - Error state
 * - Sort configuration
 * - Statistics view state
 *
 * Note: Loading states are managed per-data-type in DataContext (dataLoaded)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'https://esm.sh/react@18.2.0';
import { PAGE_SIZE_DESKTOP, PAGE_SIZE_MOBILE, BREAKPOINT_MD } from '../utils/index.js';

const { createElement: h } = React;

const AppStateContext = createContext(null);

/**
 * Get appropriate default page size based on viewport width
 * @returns {number} Page size (desktop or mobile)
 */
const getDefaultPageSize = () => {
  if (typeof window === 'undefined') return PAGE_SIZE_DESKTOP;
  return window.innerWidth >= BREAKPOINT_MD ? PAGE_SIZE_DESKTOP : PAGE_SIZE_MOBILE;
};

/**
 * Scroll to top helper (iOS-compatible)
 */
const scrollToTop = () => {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

export const AppStateProvider = ({ children }) => {
  // Navigation state
  const [appCurrentView, setAppCurrentViewRaw] = useState('home');
  const [appPage, setAppPage] = useState(0);

  // Page size state with localStorage persistence
  // Falls back to responsive default (mobile vs desktop) if not saved
  const [appPageSize, setAppPageSize] = useState(() => {
    try {
      const saved = localStorage.getItem('amule-page-size');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load page size from localStorage:', err);
    }
    return getDefaultPageSize();
  });

  // UI state
  const [appError, setAppError] = useState('');

  // Historical/Statistics state
  const [appStatsState, setAppStatsState] = useState({
    historicalData: null,
    speedData: null,
    historicalRange: '24h',
    historicalStats: null,
    loadingHistory: false
  });

  // Sort configuration state with localStorage persistence
  const [appSortConfig, setAppSortConfig] = useState(() => {
    const defaultConfig = {
      'search': { sortBy: 'sourceCount', sortDirection: 'desc' },
      'search-results': { sortBy: 'sourceCount', sortDirection: 'desc' },
      'downloads': { sortBy: 'speed', sortDirection: 'desc' },
      'uploads': { sortBy: 'EC_TAG_CLIENT_UP_SPEED', sortDirection: 'desc' },
      'shared': { sortBy: 'transferred', sortDirection: 'desc' },
      'servers': { sortBy: 'EC_TAG_SERVER_FILES', sortDirection: 'desc' }
    };

    try {
      const saved = localStorage.getItem('amule-sort-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultConfig, ...parsed };
      }
    } catch (err) {
      console.error('Failed to load sort config from localStorage:', err);
    }

    return defaultConfig;
  });

  // Wrapped setAppCurrentView that scrolls to top first
  const setAppCurrentView = useCallback((view) => {
    scrollToTop();
    setAppCurrentViewRaw(view);
  }, []);

  // Navigation handler
  const handleAppNavigate = useCallback((view) => {
    scrollToTop();
    setAppCurrentViewRaw(view);
    setAppPage(0);
  }, []);

  // Persist sort configuration to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('amule-sort-config', JSON.stringify(appSortConfig));
    } catch (err) {
      console.error('Failed to save sort config to localStorage:', err);
    }
  }, [appSortConfig]);

  // Persist page size to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('amule-page-size', String(appPageSize));
    } catch (err) {
      console.error('Failed to save page size to localStorage:', err);
    }
  }, [appPageSize]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({
    // State
    appCurrentView,
    appPage,
    appPageSize,
    appError,
    appStatsState,
    appSortConfig,

    // Setters
    setAppCurrentView,
    setAppPage,
    setAppPageSize,
    setAppError,
    setAppStatsState,
    setAppSortConfig,

    // Handlers
    handleAppNavigate
  }), [
    appCurrentView, appPage, appPageSize, appError, appStatsState, appSortConfig,
    setAppCurrentView, handleAppNavigate
    // Note: React useState setters are stable and don't need to be in deps
  ]);

  return h(AppStateContext.Provider, { value }, children);
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};
