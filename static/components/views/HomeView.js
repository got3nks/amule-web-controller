/**
 * HomeView Component
 *
 * Main dashboard/home page with navigation and stats widgets
 * Manages its own dashboard state and data fetching
 */

import React from 'https://esm.sh/react@18.2.0';
import {
  DashboardChartWidget,
  ActiveDownloadsWidget,
  ActiveUploadsWidget,
  QuickSearchWidget,
  MobileSpeedWidget,
  Stats24hWidget
} from '../dashboard/index.js';
import { STATISTICS_REFRESH_INTERVAL } from '../../utils/index.js';
import { useAppState } from '../../contexts/AppStateContext.js';
import { useLiveData } from '../../contexts/LiveDataContext.js';
import { useStaticData } from '../../contexts/StaticDataContext.js';
import { useSearch } from '../../contexts/SearchContext.js';
import { useActions } from '../../contexts/ActionsContext.js';
import { useTheme } from '../../contexts/ThemeContext.js';

const { createElement: h, useState, useEffect, useRef, useCallback, lazy, Suspense } = React;

// Lazy load chart components for better initial page load performance
const SpeedChart = lazy(() => import('../common/SpeedChart.js'));
const TransferChart = lazy(() => import('../common/TransferChart.js'));

/**
 * Home view component - self-contained with its own dashboard state
 */
const HomeView = () => {
  // Get data from contexts
  const { appCurrentView } = useAppState();
  const { dataStats, dataDownloads, dataUploads, dataLoaded } = useLiveData();
  const { dataCategories } = useStaticData();
  const { searchQuery, searchType, searchLocked, setSearchQuery, setSearchType } = useSearch();
  const actions = useActions();
  const { theme } = useTheme();

  // Local dashboard state (previously in AppStateContext)
  const [dashboardState, setDashboardState] = useState({
    speedData: null,
    historicalData: null,
    historicalStats: null,
    loading: false
  });

  // Cache ref for dashboard data
  const lastFetchTime = useRef(0);

  // Fetch dashboard data with caching
  const fetchDashboardData = useCallback(async (force = false) => {
    const now = Date.now();
    const CACHE_DURATION = 30000; // 30 seconds cache

    // Skip fetch if data is fresh (unless forced)
    if (!force && now - lastFetchTime.current < CACHE_DURATION) {
      return;
    }

    // Don't show loading spinner for background refreshes (only for first load)
    const isFirstLoad = lastFetchTime.current === 0;
    if (isFirstLoad) {
      setDashboardState(prev => ({ ...prev, loading: true }));
    }

    try {
      const [speedRes, historyRes, statsRes] = await Promise.all([
        fetch('/api/metrics/speed-history?range=24h'),
        fetch('/api/metrics/history?range=24h'),
        fetch('/api/metrics/stats?range=24h')
      ]);

      const speedData = await speedRes.json();
      const historicalData = await historyRes.json();
      const historicalStats = await statsRes.json();

      setDashboardState({
        speedData,
        historicalData,
        historicalStats,
        loading: false
      });

      lastFetchTime.current = now;
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setDashboardState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Auto-refresh dashboard data when view is active
  useEffect(() => {
    if (appCurrentView !== 'home') return;

    fetchDashboardData();

    const intervalId = setInterval(fetchDashboardData, STATISTICS_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [appCurrentView, fetchDashboardData]);

  // Defer chart rendering until after initial paint
  const [shouldRenderCharts, setShouldRenderCharts] = useState(false);
  useEffect(() => {
    // Use requestIdleCallback for better performance, fallback to setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => setShouldRenderCharts(true));
    } else {
      setTimeout(() => setShouldRenderCharts(true), 0);
    }
  }, []);

  // Aliases for readability
  const stats = dataStats;
  const downloads = dataDownloads;
  const uploads = dataUploads;
  const categories = dataCategories;
  const onSearchQueryChange = setSearchQuery;
  const onSearchTypeChange = setSearchType;
  const onSearch = actions.search.perform;

  return h('div', { className: 'flex-1 flex flex-col py-0 px-2 sm:px-4' },
    // Desktop: Dashboard layout (shown when sidebar is visible at md+)
    h('div', { className: 'hidden md:block' },
      // Dashboard grid
      h('div', { className: 'grid grid-cols-1 sm:grid-cols-6 gap-4 max-w-7xl mx-auto' },
        // Quick Search Widget - Full width at top
        h('div', { className: 'sm:col-span-6' },
          h(QuickSearchWidget, {
            searchType,
            onSearchTypeChange,
            searchQuery,
            onSearchQueryChange,
            onSearch,
            searchLocked
          })
        ),

        // Speed Chart (full width on sm, half width on md+)
        h('div', { className: 'sm:col-span-6 md:col-span-3' },
          h(DashboardChartWidget, {
            title: 'Speed Over Time (24h)',
            height: '200px'
          },
            shouldRenderCharts && dashboardState.speedData
              ? h(Suspense, {
                  fallback: h('div', {
                    className: 'h-full flex items-center justify-center'
                  },
                    h('div', { className: 'loader' })
                  )
                },
                  h(SpeedChart, {
                    speedData: dashboardState.speedData,
                    theme,
                    historicalRange: '24h'
                  })
                )
              : h('div', {
                  className: 'h-full flex items-center justify-center'
                },
                  h('div', { className: 'loader' })
                )
          )
        ),

        // Transfer Chart (full width on sm, half width on md+)
        h('div', { className: 'sm:col-span-6 md:col-span-3' },
          h(DashboardChartWidget, {
            title: 'Data Transferred (24h)',
            height: '200px'
          },
            shouldRenderCharts && dashboardState.historicalData
              ? h(Suspense, {
                  fallback: h('div', {
                    className: 'h-full flex items-center justify-center'
                  },
                    h('div', { className: 'loader' })
                  )
                },
                  h(TransferChart, {
                    historicalData: dashboardState.historicalData,
                    theme,
                    historicalRange: '24h'
                  })
                )
              : h('div', {
                  className: 'h-full flex items-center justify-center'
                },
                  h('div', { className: 'loader' })
                )
          )
        ),


        // 24h Stats Widget (full width)
        h('div', { className: 'sm:col-span-6' },
          h(Stats24hWidget, {
            stats: dashboardState.historicalStats,
            showPeakSpeeds: true
          })
        ),

        // Active Downloads Widget (half width)
        h('div', { className: 'sm:col-span-3' },
          h(ActiveDownloadsWidget, {
            downloads,
            categories,
            maxItems: 50,
            loading: !dataLoaded.downloads
          })
        ),

        // Active Uploads Widget (half width)
        h('div', { className: 'sm:col-span-3' },
          h(ActiveUploadsWidget, {
            uploads,
            maxItems: 50,
            loading: !dataLoaded.uploads
          })
        )
      )
    ),

    // Mobile: Dashboard widgets (similar to desktop but optimized for mobile)
    // Shown below md breakpoint where sidebar is hidden
    h('div', { className: 'md:hidden flex-1 flex flex-col px-1 overflow-y-auto' },
      // Inner wrapper with my-auto to center content vertically when container is larger
      h('div', { className: 'flex flex-col gap-3 my-auto' },
        // Speed chart with network status
        h(MobileSpeedWidget, {
          speedData: dashboardState.speedData,
          stats,
          theme
        }),

        // 24h Stats (compact, no peak speeds)
        h(Stats24hWidget, {
          stats: dashboardState.historicalStats,
          showPeakSpeeds: false,
          compact: true
        }),

        // Active Downloads
        h(ActiveDownloadsWidget, {
          downloads,
          categories,
          maxItems: 50,
          compact: true,
          loading: !dataLoaded.downloads
        }),

        // Active Uploads
        h(ActiveUploadsWidget, {
          uploads,
          maxItems: 50,
          compact: true,
          loading: !dataLoaded.uploads
        })
      )
    )
  );
};

// Note: React.memo doesn't help much here since we're using contexts
// Context changes will trigger re-renders regardless of props
// The solution is to optimize the context structure or split into smaller components
export default HomeView;
