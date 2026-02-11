/**
 * StatsWidget Component
 *
 * Displays statistics in a grid of stat cards for a configurable time range
 * Can optionally show/hide peak speeds
 * Shows per-client breakdown when both clients are active
 */

import React from 'https://esm.sh/react@18.2.0';
import { StatCard } from '../common/index.js';
import { formatSpeed, formatBytes } from '../../utils/index.js';
import { useClientFilter } from '../../contexts/ClientFilterContext.js';
import { useLiveData } from '../../contexts/LiveDataContext.js';
import ClientIcon from '../common/ClientIcon.js';

const { createElement: h } = React;

/**
 * Loading placeholder for stat card
 * @param {boolean} compact - Use compact styling for mobile
 */
const StatCardSkeleton = ({ compact = false }) => {
  return h('div', {
    className: `bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse ${compact ? 'p-2' : 'p-3'}`
  },
    h('div', { className: `bg-gray-200 dark:bg-gray-700 rounded ${compact ? 'h-3 w-20 mb-1' : 'h-4 w-24 mb-2'}` }),
    h('div', { className: `bg-gray-200 dark:bg-gray-700 rounded ${compact ? 'h-5 w-16' : 'h-8 w-32'}` })
  );
};

/**
 * Helper component for displaying per-client breakdown values
 * Desktop (xl+): icon value · icon value (inline with dot separator)
 * Tablet/Mobile (<xl): icon value (two lines)
 * Compact mode: always two lines with smaller text
 * Shows aMule vs BitTorrent (aggregated rtorrent + qbittorrent)
 */
const ClientBreakdownValue = ({ amuleValue, bittorrentValue, showClientIcons, showAmule, showBittorrent, compact = false, formatter = (v) => v }) => {
  if (!showClientIcons) {
    // Only one client configured - show plain value
    return h('span', null, formatter(amuleValue + bittorrentValue));
  }

  // Compact mode (mobile dashboard): always two lines with smaller text
  if (compact) {
    return h('div', { className: 'flex flex-col gap-0.5 text-xs' },
      showAmule && h('span', { key: 'amule', className: 'flex items-center gap-1' },
        h(ClientIcon, { clientType: 'amule', size: 12 }),
        h('span', null, formatter(amuleValue))
      ),
      showBittorrent && h('span', { key: 'bittorrent', className: 'flex items-center gap-1' },
        h(ClientIcon, { clientType: 'bittorrent', size: 12 }),
        h('span', null, formatter(bittorrentValue))
      )
    );
  }

  // Non-compact: render both layouts and use responsive classes to toggle
  // Two rows layout (shown below xl)
  const twoRowsLayout = h('div', { className: 'flex flex-col gap-0.5 xl:hidden' },
    showAmule && h('span', { key: 'amule', className: 'flex items-center gap-1' },
      h(ClientIcon, { clientType: 'amule', size: 14 }),
      h('span', null, formatter(amuleValue))
    ),
    showBittorrent && h('span', { key: 'bittorrent', className: 'flex items-center gap-1' },
      h(ClientIcon, { clientType: 'bittorrent', size: 14 }),
      h('span', null, formatter(bittorrentValue))
    )
  );

  // Inline layout with dot separator (shown at xl+)
  const inlineParts = [];
  if (showAmule) {
    inlineParts.push(
      h('span', { key: 'amule', className: 'flex items-center gap-1' },
        h(ClientIcon, { clientType: 'amule', size: 14 }),
        h('span', null, formatter(amuleValue))
      )
    );
  }
  if (showAmule && showBittorrent) {
    inlineParts.push(h('span', { key: 'dot', className: 'text-gray-400 mx-1' }, '·'));
  }
  if (showBittorrent) {
    inlineParts.push(
      h('span', { key: 'bittorrent', className: 'flex items-center gap-1' },
        h(ClientIcon, { clientType: 'bittorrent', size: 14 }),
        h('span', null, formatter(bittorrentValue))
      )
    );
  }
  const inlineLayout = h('span', { className: 'hidden xl:flex items-center gap-1 flex-wrap' }, inlineParts);

  return h(React.Fragment, null, twoRowsLayout, inlineLayout);
};

/**
 * Helper component for compact mode combined stats (total · avg speed per client)
 * Shows: icon total · avg (one line per client if both connected, or single line if one client)
 * Shows aMule vs BitTorrent (aggregated rtorrent + qbittorrent)
 */
const CompactCombinedValue = ({ amuleTotal, bittorrentTotal, amuleAvg, bittorrentAvg, showClientIcons, showAmule, showBittorrent }) => {
  const renderClientLine = (clientType, total, avg) => (
    h('span', { className: 'flex items-center gap-1' },
      showClientIcons && h(ClientIcon, { clientType, size: 12 }),
      h('span', null, formatBytes(total)),
      h('span', { className: 'text-gray-400' }, '·'),
      h('span', null, formatSpeed(avg))
    )
  );

  if (!showClientIcons) {
    // Single client - show combined values inline
    const total = (showAmule ? amuleTotal : 0) + (showBittorrent ? bittorrentTotal : 0);
    const avg = (showAmule ? amuleAvg : 0) + (showBittorrent ? bittorrentAvg : 0);
    return h('span', { className: 'flex items-center gap-1' },
      h('span', null, formatBytes(total)),
      h('span', { className: 'text-gray-400' }, '·'),
      h('span', null, formatSpeed(avg))
    );
  }

  // Both clients - show one line per client
  return h('div', { className: 'flex flex-col gap-0.5 text-xs' },
    showAmule && renderClientLine('amule', amuleTotal, amuleAvg),
    showBittorrent && renderClientLine('bittorrent', bittorrentTotal, bittorrentAvg)
  );
};

/**
 * StatsWidget component
 * @param {object} stats - Historical stats object with totals and speeds (includes amule/rtorrent sub-objects)
 * @param {boolean} showPeakSpeeds - Whether to show peak speed cards (default: true)
 * @param {boolean} compact - Use compact layout for mobile (default: false)
 * @param {string} timeRange - Time range label to display (default: '24h')
 */
const StatsWidget = ({ stats, showPeakSpeeds = true, compact = false, timeRange = '24h' }) => {
  const { isAmuleEnabled, isBittorrentEnabled, amuleConnected, bittorrentConnected } = useClientFilter();
  const { dataStats: liveStats } = useLiveData();

  // Show client icons if both network types are connected (regardless of user filter)
  // bittorrentConnected = rtorrent OR qbittorrent
  const showClientIcons = amuleConnected && bittorrentConnected;

  // Which clients to show (isXEnabled includes connection check)
  const showAmule = isAmuleEnabled;
  const showBittorrent = isBittorrentEnabled;

  // Show loading skeleton if either data source is missing:
  // - stats: historical data from API
  // - liveStats: WebSocket data needed for client connection status
  const isLoading = !stats || !liveStats;

  // Get per-client stats (with fallbacks)
  // Use combined 'bittorrent' stats (rtorrent + qbittorrent) for the BitTorrent category
  const amuleStats = stats?.amule || { totalUploaded: 0, totalDownloaded: 0, avgUploadSpeed: 0, avgDownloadSpeed: 0, peakUploadSpeed: 0, peakDownloadSpeed: 0 };
  const btStats = stats?.bittorrent || { totalUploaded: 0, totalDownloaded: 0, avgUploadSpeed: 0, avgDownloadSpeed: 0, peakUploadSpeed: 0, peakDownloadSpeed: 0 };

  // Calculate displayed values based on filter
  const getFilteredValue = (amuleVal, btVal) => {
    let total = 0;
    if (showAmule) total += amuleVal;
    if (showBittorrent) total += btVal;
    return total;
  };

  // Compact mode: 2 combined cards (Downloaded, Uploaded)
  if (compact) {
    return h('div', { className: 'grid grid-cols-2 gap-2' },
        // Downloaded card (total · avg speed)
        !isLoading
          ? h(StatCard, {
              label: `Downloaded · Avg (${timeRange})`,
              value: h(CompactCombinedValue, {
                amuleTotal: amuleStats.totalDownloaded,
                bittorrentTotal: btStats.totalDownloaded,
                amuleAvg: amuleStats.avgDownloadSpeed,
                bittorrentAvg: btStats.avgDownloadSpeed,
                showClientIcons,
                showAmule,
                showBittorrent
              }),
              icon: 'download',
              iconColor: 'text-blue-600 dark:text-blue-400',
              compact
            })
          : h(StatCardSkeleton, { compact }),

        // Uploaded card (total · avg speed)
        !isLoading
          ? h(StatCard, {
              label: `Uploaded · Avg (${timeRange})`,
              value: h(CompactCombinedValue, {
                amuleTotal: amuleStats.totalUploaded,
                bittorrentTotal: btStats.totalUploaded,
                amuleAvg: amuleStats.avgUploadSpeed,
                bittorrentAvg: btStats.avgUploadSpeed,
                showClientIcons,
                showAmule,
                showBittorrent
              }),
              icon: 'upload',
              iconColor: 'text-green-600 dark:text-green-400',
              compact
            })
          : h(StatCardSkeleton, { compact })
    );
  }

  // Desktop mode: full grid with separate cards
  const gridClass = showPeakSpeeds
    ? 'grid grid-cols-2 sm:grid-cols-3 gap-3'
    : 'grid grid-cols-2 sm:grid-cols-4 gap-3';

  return h('div', { className: gridClass },
    // Total Uploaded
    !isLoading
      ? h(StatCard, {
          label: `Total Uploaded (${timeRange})`,
          value: showClientIcons
            ? h(ClientBreakdownValue, {
                amuleValue: amuleStats.totalUploaded,
                bittorrentValue: btStats.totalUploaded,
                showClientIcons,
                showAmule,
                showBittorrent,
                formatter: formatBytes
              })
            : formatBytes(getFilteredValue(amuleStats.totalUploaded, btStats.totalUploaded)),
          icon: 'upload',
          iconColor: 'text-green-600 dark:text-green-400'
        })
      : h(StatCardSkeleton),

    // Avg Upload Speed
    !isLoading
      ? h(StatCard, {
          label: `Avg Upload Speed (${timeRange})`,
          value: showClientIcons
            ? h(ClientBreakdownValue, {
                amuleValue: amuleStats.avgUploadSpeed,
                bittorrentValue: btStats.avgUploadSpeed,
                showClientIcons,
                showAmule,
                showBittorrent,
                formatter: formatSpeed
              })
            : formatSpeed(getFilteredValue(amuleStats.avgUploadSpeed, btStats.avgUploadSpeed)),
          icon: 'trendingUp',
          iconColor: 'text-green-600 dark:text-green-400'
        })
      : h(StatCardSkeleton),

    // Peak Upload Speed (optional)
    showPeakSpeeds && (!isLoading
      ? h(StatCard, {
          label: `Peak Upload Speed (${timeRange})`,
          value: showClientIcons
            ? h(ClientBreakdownValue, {
                amuleValue: amuleStats.peakUploadSpeed,
                bittorrentValue: btStats.peakUploadSpeed,
                showClientIcons,
                showAmule,
                showBittorrent,
                formatter: formatSpeed
              })
            : formatSpeed(getFilteredValue(amuleStats.peakUploadSpeed, btStats.peakUploadSpeed)),
          icon: 'zap',
          iconColor: 'text-green-600 dark:text-green-400'
        })
      : h(StatCardSkeleton)),

    // Total Downloaded
    !isLoading
      ? h(StatCard, {
          label: `Total Downloaded (${timeRange})`,
          value: showClientIcons
            ? h(ClientBreakdownValue, {
                amuleValue: amuleStats.totalDownloaded,
                bittorrentValue: btStats.totalDownloaded,
                showClientIcons,
                showAmule,
                showBittorrent,
                formatter: formatBytes
              })
            : formatBytes(getFilteredValue(amuleStats.totalDownloaded, btStats.totalDownloaded)),
          icon: 'download',
          iconColor: 'text-blue-600 dark:text-blue-400'
        })
      : h(StatCardSkeleton),

    // Avg Download Speed
    !isLoading
      ? h(StatCard, {
          label: `Avg Download Speed (${timeRange})`,
          value: showClientIcons
            ? h(ClientBreakdownValue, {
                amuleValue: amuleStats.avgDownloadSpeed,
                bittorrentValue: btStats.avgDownloadSpeed,
                showClientIcons,
                showAmule,
                showBittorrent,
                formatter: formatSpeed
              })
            : formatSpeed(getFilteredValue(amuleStats.avgDownloadSpeed, btStats.avgDownloadSpeed)),
          icon: 'trendingUp',
          iconColor: 'text-blue-600 dark:text-blue-400'
        })
      : h(StatCardSkeleton),

    // Peak Download Speed (optional)
    showPeakSpeeds && (!isLoading
      ? h(StatCard, {
          label: `Peak Download Speed (${timeRange})`,
          value: showClientIcons
            ? h(ClientBreakdownValue, {
                amuleValue: amuleStats.peakDownloadSpeed,
                bittorrentValue: btStats.peakDownloadSpeed,
                showClientIcons,
                showAmule,
                showBittorrent,
                formatter: formatSpeed
              })
            : formatSpeed(getFilteredValue(amuleStats.peakDownloadSpeed, btStats.peakDownloadSpeed)),
          icon: 'zap',
          iconColor: 'text-blue-600 dark:text-blue-400'
        })
      : h(StatCardSkeleton))
  );
};

export default StatsWidget;
