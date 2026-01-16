/**
 * Stats24hWidget Component
 *
 * Displays last 24 hours statistics in a grid of stat cards
 * Can optionally show/hide peak speeds
 */

import React from 'https://esm.sh/react@18.2.0';
import { StatCard } from '../common/index.js';
import { formatSpeed, formatBytes } from '../../utils/index.js';

const { createElement: h } = React;

/**
 * Loading placeholder for stat card
 */
const StatCardSkeleton = () => {
  return h('div', {
    className: 'bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-pulse'
  },
    h('div', { className: 'h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2' }),
    h('div', { className: 'h-8 bg-gray-200 dark:bg-gray-700 rounded w-32' })
  );
};

/**
 * Stats24hWidget component
 * @param {object} stats - Historical stats object with totals and speeds
 * @param {boolean} showPeakSpeeds - Whether to show peak speed cards (default: true)
 * @param {boolean} compact - Use compact layout for mobile (default: false)
 */
const Stats24hWidget = ({ stats, showPeakSpeeds = true, compact = false }) => {
  // Grid class based on whether we show peak speeds
  // With peaks: 6 cards (3 columns on desktop)
  // Without peaks: 4 cards (2 columns on mobile, 4 on desktop)
  const gridClass = compact
    ? 'grid grid-cols-2 gap-2'
    : showPeakSpeeds
      ? 'grid grid-cols-2 sm:grid-cols-3 gap-3'
      : 'grid grid-cols-2 sm:grid-cols-4 gap-3';

  return h('div', { className: gridClass },
    // Total Uploaded
    stats
      ? h(StatCard, {
          label: compact ? 'Uploaded (24h)' : 'Total Uploaded (24h)',
          value: formatBytes(stats.totalUploaded),
          icon: 'upload',
          iconColor: 'text-green-600 dark:text-green-400',
          compact
        })
      : h(StatCardSkeleton),

    // Avg Upload Speed
    stats
      ? h(StatCard, {
          label: compact ? 'Avg Up (24h)' : 'Avg Upload Speed (24h)',
          value: formatSpeed(stats.avgUploadSpeed),
          icon: 'trendingUp',
          iconColor: 'text-green-600 dark:text-green-400',
          compact
        })
      : h(StatCardSkeleton),

    // Peak Upload Speed (optional)
    showPeakSpeeds && (stats
      ? h(StatCard, {
          label: 'Peak Upload Speed (24h)',
          value: formatSpeed(stats.peakUploadSpeed),
          icon: 'zap',
          iconColor: 'text-green-600 dark:text-green-400',
          compact
        })
      : h(StatCardSkeleton)),

    // Total Downloaded
    stats
      ? h(StatCard, {
          label: compact ? 'Downloaded (24h)' : 'Total Downloaded (24h)',
          value: formatBytes(stats.totalDownloaded),
          icon: 'download',
          iconColor: 'text-blue-600 dark:text-blue-400',
          compact
        })
      : h(StatCardSkeleton),

    // Avg Download Speed
    stats
      ? h(StatCard, {
          label: compact ? 'Avg Down (24h)' : 'Avg Download Speed (24h)',
          value: formatSpeed(stats.avgDownloadSpeed),
          icon: 'trendingUp',
          iconColor: 'text-blue-600 dark:text-blue-400',
          compact
        })
      : h(StatCardSkeleton),

    // Peak Download Speed (optional)
    showPeakSpeeds && (stats
      ? h(StatCard, {
          label: 'Peak Download Speed (24h)',
          value: formatSpeed(stats.peakDownloadSpeed),
          icon: 'zap',
          iconColor: 'text-blue-600 dark:text-blue-400',
          compact
        })
      : h(StatCardSkeleton))
  );
};

export default Stats24hWidget;
