/**
 * StatisticsView Component
 *
 * Displays historical statistics with charts and statistics tree
 * Uses contexts directly for all data and actions
 */

import React from 'https://esm.sh/react@18.2.0';
import { StatsTree, Icon, Button } from '../common/index.js';
import { formatBytes, formatSpeed } from '../../utils/index.js';
import { useAppState } from '../../contexts/AppStateContext.js';
import { useStaticData } from '../../contexts/StaticDataContext.js';
import { useDataFetch } from '../../contexts/DataFetchContext.js';
import { useTheme } from '../../contexts/ThemeContext.js';

const { createElement: h, useCallback, useEffect, lazy, Suspense } = React;

// Lazy load chart components for better initial page load performance
const SpeedChart = lazy(() => import('../common/SpeedChart.js'));
const TransferChart = lazy(() => import('../common/TransferChart.js'));

/**
 * Statistics view component - now uses contexts directly
 */
const StatisticsView = () => {
  // Get data from contexts
  const { appStatsState, setAppStatsState, setAppError } = useAppState();
  const { dataStatsTree } = useStaticData();
  const { fetchStatsTree } = useDataFetch();
  const { theme } = useTheme();

  // Defer chart rendering until after initial paint
  const [shouldRenderCharts, setShouldRenderCharts] = React.useState(false);
  React.useEffect(() => {
    // Use requestIdleCallback for better performance, fallback to setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => setShouldRenderCharts(true));
    } else {
      setTimeout(() => setShouldRenderCharts(true), 0);
    }
  }, []);

  // Aliases for readability
  const loadingHistory = appStatsState.loadingHistory;
  const historicalRange = appStatsState.historicalRange;
  const historicalStats = appStatsState.historicalStats;
  const historicalData = appStatsState.historicalData;
  const speedData = appStatsState.speedData;
  const statsTree = dataStatsTree;

  // Fetch historical data for statistics
  const fetchHistoricalData = useCallback(async (range, showLoading = true) => {
    if (showLoading) setAppStatsState(prev => ({ ...prev, loadingHistory: true }));
    try {
      const [speedRes, historyRes, statsRes] = await Promise.all([
        fetch(`/api/metrics/speed-history?range=${range}`),
        fetch(`/api/metrics/history?range=${range}`),
        fetch(`/api/metrics/stats?range=${range}`)
      ]);

      const speedHistoryData = await speedRes.json();
      const historyData = await historyRes.json();
      const statsData = await statsRes.json();

      setAppStatsState({
        speedData: speedHistoryData,
        historicalData: historyData,
        historicalStats: statsData,
        historicalRange: range,
        loadingHistory: false
      });
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setAppError('Failed to load historical data');
      if (showLoading) setAppStatsState(prev => ({ ...prev, loadingHistory: false }));
    }
  }, [setAppStatsState, setAppError]);

  // Local handlers
  const onFetchHistoricalData = fetchHistoricalData;

  // Fetch initial data on mount
  useEffect(() => {
    fetchStatsTree();
    fetchHistoricalData(historicalRange, true);

    // Set up auto-refresh intervals
    const STATISTICS_REFRESH_INTERVAL = 30000; // 30 seconds
    const statsTreeInterval = setInterval(fetchStatsTree, STATISTICS_REFRESH_INTERVAL);
    const historicalDataInterval = setInterval(() => {
      fetchHistoricalData(historicalRange, false);
    }, STATISTICS_REFRESH_INTERVAL);

    return () => {
      clearInterval(statsTreeInterval);
      clearInterval(historicalDataInterval);
    };
  }, [fetchStatsTree, fetchHistoricalData, historicalRange]);

  return h('div', { className: 'space-y-2 sm:space-y-3' },
    // Header
    h('div', { className: 'flex justify-between items-center gap-2 pl-1 lg:pl-2' },
      h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, 'Historical Statistics'),
      h('div', { className: 'flex gap-2' },
        ['24h', '7d', '30d'].map(range =>
          h(Button, {
            key: range,
            variant: historicalRange === range ? 'primary' : 'secondary',
            onClick: () => onFetchHistoricalData(range, false),
            disabled: loadingHistory
          }, range.toUpperCase())
        )
      )
    ),

    // Summary Statistics Cards - Upload stats first, then Download stats
    historicalStats && h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' },
      // Upload Statistics
      h('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700' },
        h('div', { className: 'flex items-center gap-2 mb-1' },
          h(Icon, { name: 'upload', size: 16, className: 'text-green-600 dark:text-green-400' }),
          h('div', { className: 'text-xs text-gray-500 dark:text-gray-400' }, 'Total Uploaded')
        ),
        h('div', { className: 'text-lg font-bold text-green-600 dark:text-green-400' },
          formatBytes(historicalStats.totalUploaded)
        )
      ),
      h('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700' },
        h('div', { className: 'flex items-center gap-2 mb-1' },
          h(Icon, { name: 'trendingUp', size: 16, className: 'text-green-600 dark:text-green-400' }),
          h('div', { className: 'text-xs text-gray-500 dark:text-gray-400' }, 'Avg Upload Speed')
        ),
        h('div', { className: 'text-lg font-bold text-green-600 dark:text-green-400' },
          formatSpeed(historicalStats.avgUploadSpeed)
        )
      ),
      h('div', { className: 'hidden sm:block bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700' },
        h('div', { className: 'flex items-center gap-2 mb-1' },
          h(Icon, { name: 'zap', size: 16, className: 'text-green-600 dark:text-green-400' }),
          h('div', { className: 'text-xs text-gray-500 dark:text-gray-400' }, 'Peak Upload Speed')
        ),
        h('div', { className: 'text-lg font-bold text-green-600 dark:text-green-400' },
          formatSpeed(historicalStats.peakUploadSpeed)
        )
      ),
      // Download Statistics
      h('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700' },
        h('div', { className: 'flex items-center gap-2 mb-1' },
          h(Icon, { name: 'download', size: 16, className: 'text-blue-600 dark:text-blue-400' }),
          h('div', { className: 'text-xs text-gray-500 dark:text-gray-400' }, 'Total Downloaded')
        ),
        h('div', { className: 'text-lg font-bold text-blue-600 dark:text-blue-400' },
          formatBytes(historicalStats.totalDownloaded)
        )
      ),
      h('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700' },
        h('div', { className: 'flex items-center gap-2 mb-1' },
          h(Icon, { name: 'trendingUp', size: 16, className: 'text-blue-600 dark:text-blue-400' }),
          h('div', { className: 'text-xs text-gray-500 dark:text-gray-400' }, 'Avg Download Speed')
        ),
        h('div', { className: 'text-lg font-bold text-blue-600 dark:text-blue-400' },
          formatSpeed(historicalStats.avgDownloadSpeed)
        )
      ),
      h('div', { className: 'hidden sm:block bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700' },
        h('div', { className: 'flex items-center gap-2 mb-1' },
          h(Icon, { name: 'zap', size: 16, className: 'text-blue-600 dark:text-blue-400' }),
          h('div', { className: 'text-xs text-gray-500 dark:text-gray-400' }, 'Peak Download Speed')
        ),
        h('div', { className: 'text-lg font-bold text-blue-600 dark:text-blue-400' },
          formatSpeed(historicalStats.peakDownloadSpeed)
        )
      )
    ),

    // Speed Chart
    !loadingHistory && h('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700' },
      h('h3', { className: 'text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300' }, 'Speed Over Time'),
      h('div', { className: 'w-full', style: { height: '300px' } },
        shouldRenderCharts
          ? h(Suspense, {
              fallback: h('div', {
                className: 'h-full flex items-center justify-center'
              },
                h('div', { className: 'loader' })
              )
            },
              h(SpeedChart, { speedData, theme, historicalRange })
            )
          : h('div', {
              className: 'h-full flex items-center justify-center'
            },
              h('div', { className: 'loader' })
            )
      )
    ),

    // Data Transferred Chart
    !loadingHistory && h('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700' },
      h('h3', { className: 'text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300' }, 'Data Transferred Over Time'),
      h('div', { className: 'w-full', style: { height: '300px' } },
        shouldRenderCharts
          ? h(Suspense, {
              fallback: h('div', {
                className: 'h-full flex items-center justify-center'
              },
                h('div', { className: 'loader' })
              )
            },
              h(TransferChart, { historicalData, theme, historicalRange })
            )
          : h('div', {
              className: 'h-full flex items-center justify-center'
            },
              h('div', { className: 'loader' })
            )
      )
    ),

    // Loading state
    loadingHistory && h('div', { className: 'flex flex-col items-center justify-center py-6' },
      h('div', { className: 'loader' }),
      h('p', { className: 'text-sm text-gray-500 dark:text-gray-400 mt-2' }, 'Loading historical data...')
    ),

    // Statistics Tree (original content) - auto-refreshes every 5 seconds
    h(StatsTree, { statsTree, loading: statsTree === null })
  );
};

export default StatisticsView;
