/**
 * StatsWidget Component
 *
 * Displays statistics in a grid of stat cards for a configurable time range
 * Can optionally show/hide peak speeds
 * Shows per-network-type breakdown when both network types are active
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
 * Helper component for displaying per-network-type breakdown values
 * Desktop (xl+): icon value · icon value (inline with dot separator)
 * Tablet/Mobile (<xl): icon value (two lines)
 * Compact mode: always two lines with smaller text
 * Shows ED2K vs BitTorrent (aggregated rtorrent + qbittorrent)
 */
const ClientBreakdownValue = ({ ed2kValue, bittorrentValue, showClientIcons, showEd2k, showBittorrent, compact = false, formatter = (v) => v }) => {
  if (!showClientIcons) {
    // Only one client configured - show plain value
    return h('span', null, formatter(ed2kValue + bittorrentValue));
  }

  // Compact mode (mobile dashboard): always two lines with smaller text
  if (compact) {
    return h('div', { className: 'flex flex-col gap-0.5 text-xs' },
      showEd2k && h('span', { key: 'ed2k', className: 'flex items-center gap-1' },
        h(ClientIcon, { clientType: 'ed2k', size: 12 }),
        h('span', null, formatter(ed2kValue))
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
    showEd2k && h('span', { key: 'ed2k', className: 'flex items-center gap-1' },
      h(ClientIcon, { clientType: 'ed2k', size: 14 }),
      h('span', null, formatter(ed2kValue))
    ),
    showBittorrent && h('span', { key: 'bittorrent', className: 'flex items-center gap-1' },
      h(ClientIcon, { clientType: 'bittorrent', size: 14 }),
      h('span', null, formatter(bittorrentValue))
    )
  );

  // Inline layout with dot separator (shown at xl+)
  const inlineParts = [];
  if (showEd2k) {
    inlineParts.push(
      h('span', { key: 'ed2k', className: 'flex items-center gap-1' },
        h(ClientIcon, { clientType: 'ed2k', size: 14 }),
        h('span', null, formatter(ed2kValue))
      )
    );
  }
  if (showEd2k && showBittorrent) {
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
 * Shows: icon total · avg (one line per network if both connected, or single line if one)
 * Shows ED2K vs BitTorrent (aggregated rtorrent + qbittorrent)
 */
const CompactCombinedValue = ({ ed2kTotal, bittorrentTotal, ed2kAvg, bittorrentAvg, showClientIcons, showEd2k, showBittorrent }) => {
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
    const total = (showEd2k ? ed2kTotal : 0) + (showBittorrent ? bittorrentTotal : 0);
    const avg = (showEd2k ? ed2kAvg : 0) + (showBittorrent ? bittorrentAvg : 0);
    return h('span', { className: 'flex items-center gap-1' },
      h('span', null, formatBytes(total)),
      h('span', { className: 'text-gray-400' }, '·'),
      h('span', null, formatSpeed(avg))
    );
  }

  // Both clients - show one line per client
  return h('div', { className: 'flex flex-col gap-0.5 text-xs' },
    showEd2k && renderClientLine('ed2k', ed2kTotal, ed2kAvg),
    showBittorrent && renderClientLine('bittorrent', bittorrentTotal, bittorrentAvg)
  );
};

/**
 * StatsWidget component
 * @param {object} stats - Historical stats object with totals and speeds (includes ed2k/bittorrent sub-objects)
 * @param {boolean} showPeakSpeeds - Whether to show peak speed cards (default: true)
 * @param {boolean} compact - Use compact layout for mobile (default: false)
 * @param {string} timeRange - Time range label to display (default: '24h')
 */
const StatsWidget = ({ stats, showPeakSpeeds = true, compact = false, timeRange = '24h' }) => {
  const { isEd2kEnabled, isBittorrentEnabled, ed2kConnected, bittorrentConnected } = useClientFilter();
  const { dataStats: liveStats } = useLiveData();

  // Show client icons if both network types are connected (regardless of user filter)
  // bittorrentConnected = rtorrent OR qbittorrent
  const showClientIcons = ed2kConnected && bittorrentConnected;

  // Which clients to show (isXEnabled includes connection check)
  const showEd2k = isEd2kEnabled;
  const showBittorrent = isBittorrentEnabled;

  // Show loading skeleton if either data source is missing:
  // - stats: historical data from API
  // - liveStats: WebSocket data needed for client connection status
  const isLoading = !stats || !liveStats;

  // Get per-network-type stats (with fallbacks)
  const ed2kStats = stats?.ed2k || { totalUploaded: 0, totalDownloaded: 0, avgUploadSpeed: 0, avgDownloadSpeed: 0, peakUploadSpeed: 0, peakDownloadSpeed: 0 };
  const btStats = stats?.bittorrent || { totalUploaded: 0, totalDownloaded: 0, avgUploadSpeed: 0, avgDownloadSpeed: 0, peakUploadSpeed: 0, peakDownloadSpeed: 0 };

  // Calculate displayed values based on filter
  const getFilteredValue = (ed2kVal, btVal) => {
    let total = 0;
    if (showEd2k) total += ed2kVal;
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
                ed2kTotal: ed2kStats.totalDownloaded,
                bittorrentTotal: btStats.totalDownloaded,
                ed2kAvg: ed2kStats.avgDownloadSpeed,
                bittorrentAvg: btStats.avgDownloadSpeed,
                showClientIcons,
                showEd2k,
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
                ed2kTotal: ed2kStats.totalUploaded,
                bittorrentTotal: btStats.totalUploaded,
                ed2kAvg: ed2kStats.avgUploadSpeed,
                bittorrentAvg: btStats.avgUploadSpeed,
                showClientIcons,
                showEd2k,
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
                ed2kValue: ed2kStats.totalUploaded,
                bittorrentValue: btStats.totalUploaded,
                showClientIcons,
                showEd2k,
                showBittorrent,
                formatter: formatBytes
              })
            : formatBytes(getFilteredValue(ed2kStats.totalUploaded, btStats.totalUploaded)),
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
                ed2kValue: ed2kStats.avgUploadSpeed,
                bittorrentValue: btStats.avgUploadSpeed,
                showClientIcons,
                showEd2k,
                showBittorrent,
                formatter: formatSpeed
              })
            : formatSpeed(getFilteredValue(ed2kStats.avgUploadSpeed, btStats.avgUploadSpeed)),
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
                ed2kValue: ed2kStats.peakUploadSpeed,
                bittorrentValue: btStats.peakUploadSpeed,
                showClientIcons,
                showEd2k,
                showBittorrent,
                formatter: formatSpeed
              })
            : formatSpeed(getFilteredValue(ed2kStats.peakUploadSpeed, btStats.peakUploadSpeed)),
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
                ed2kValue: ed2kStats.totalDownloaded,
                bittorrentValue: btStats.totalDownloaded,
                showClientIcons,
                showEd2k,
                showBittorrent,
                formatter: formatBytes
              })
            : formatBytes(getFilteredValue(ed2kStats.totalDownloaded, btStats.totalDownloaded)),
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
                ed2kValue: ed2kStats.avgDownloadSpeed,
                bittorrentValue: btStats.avgDownloadSpeed,
                showClientIcons,
                showEd2k,
                showBittorrent,
                formatter: formatSpeed
              })
            : formatSpeed(getFilteredValue(ed2kStats.avgDownloadSpeed, btStats.avgDownloadSpeed)),
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
                ed2kValue: ed2kStats.peakDownloadSpeed,
                bittorrentValue: btStats.peakDownloadSpeed,
                showClientIcons,
                showEd2k,
                showBittorrent,
                formatter: formatSpeed
              })
            : formatSpeed(getFilteredValue(ed2kStats.peakDownloadSpeed, btStats.peakDownloadSpeed)),
          icon: 'zap',
          iconColor: 'text-blue-600 dark:text-blue-400'
        })
      : h(StatCardSkeleton))
  );
};

export default StatsWidget;
