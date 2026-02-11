/**
 * Footer Component
 *
 * Displays connection status, upload/download speeds, and network statistics
 */

import React from 'https://esm.sh/react@18.2.0';
import { formatSpeed, formatBytes, CLIENT_NAMES } from '../../utils/index.js';
import { getED2KStatus, getKADStatus, getRtorrentStatus, getQbittorrentStatus, getStatusBadgeClass, getStatusIcon } from '../../utils/networkStatus.js';
import { useVersion } from '../../contexts/index.js';
import { useLiveData } from '../../contexts/LiveDataContext.js';
import { useClientFilter } from '../../contexts/ClientFilterContext.js';
import Icon from '../common/Icon.js';
import Tooltip from '../common/Tooltip.js';
import ClientIcon from '../common/ClientIcon.js';

const { createElement: h } = React;

/**
 * Footer component
 * Uses useLiveData directly to avoid re-rendering parent (AppContent)
 * @param {string} currentView - Current view name
 * @param {function} onOpenAbout - Open about modal handler
 */
const Footer = ({ currentView, onOpenAbout }) => {
  const { dataStats: stats } = useLiveData();
  const { updateAvailable, latestVersion } = useVersion();
  const { amuleConnected, rtorrentConnected, qbittorrentConnected, bittorrentConnected } = useClientFilter();

  if (!stats) {
    return h('footer', { className: 'bg-gray-800 text-white py-4 text-center text-sm' },
      'Loading stats...'
    );
  }

  // Get network status using shared helpers
  const ed2k = getED2KStatus(stats);
  const kad = getKADStatus(stats);
  const rtStatus = getRtorrentStatus(stats);
  const qbStatus = getQbittorrentStatus(stats);

  // Get speeds from each client (ensure numeric values)
  const amuleUploadSpeed = Number(stats.EC_TAG_STATS_UL_SPEED) || 0;
  const amuleDownloadSpeed = Number(stats.EC_TAG_STATS_DL_SPEED) || 0;
  const rtorrentUploadSpeed = Number(stats.rtorrent?.uploadSpeed) || 0;
  const rtorrentDownloadSpeed = Number(stats.rtorrent?.downloadSpeed) || 0;
  const qbittorrentUploadSpeed = Number(stats.qbittorrent?.uploadSpeed) || 0;
  const qbittorrentDownloadSpeed = Number(stats.qbittorrent?.downloadSpeed) || 0;

  // Sum speeds from all connected clients (regardless of user filter)
  const totalUploadSpeed =
    (amuleConnected ? amuleUploadSpeed : 0) +
    (rtorrentConnected ? rtorrentUploadSpeed : 0) +
    (qbittorrentConnected ? qbittorrentUploadSpeed : 0);
  const totalDownloadSpeed =
    (amuleConnected ? amuleDownloadSpeed : 0) +
    (rtorrentConnected ? rtorrentDownloadSpeed : 0) +
    (qbittorrentConnected ? qbittorrentDownloadSpeed : 0);

  // Show tooltip breakdown when multiple clients are connected
  const connectedClientCount = [amuleConnected, rtorrentConnected, qbittorrentConnected].filter(Boolean).length;
  const showSpeedTooltip = connectedClientCount >= 2;

  // Footer is hidden on mobile (replaced by MobileNavFooter)
  return h('footer', {
    className: 'hidden md:block bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-1.5 px-2 lg:px-3 flex-none sticky bottom-0 z-40'
  },
    h('div', { className: 'mx-auto' },
      // Desktop view only
      h('div', { className: 'flex justify-between items-center text-xs' },
        // Left: Connection status (conditional based on active clients)
        h('div', { className: 'flex items-center gap-1.5 lg:gap-3' },
          // aMule: ED2K and KAD status
          amuleConnected && h(React.Fragment, null,
            h('div', { className: 'flex items-center gap-1.5' },
              h('span', { className: 'font-semibold text-gray-700 dark:text-gray-300' }, 'ED2K:'),
              h('span', { className: `px-1.5 py-0.5 lg:px-2 lg:py-1 rounded text-xs font-medium ${getStatusBadgeClass(ed2k.status)}` },
                `${getStatusIcon(ed2k.status)} ${ed2k.text}`
              ),
              ed2k.connected && ed2k.serverName && h('span', { className: 'hidden xl:inline text-gray-600 dark:text-gray-400 text-xs' }, `(${ed2k.serverName} - ${ed2k.serverPing}ms)`)
            ),
            h('div', { className: 'flex items-center gap-1.5' },
              h('span', { className: 'font-semibold text-gray-700 dark:text-gray-300' }, 'KAD:'),
              h('span', { className: `px-1.5 py-0.5 lg:px-2 lg:py-1 rounded text-xs font-medium ${getStatusBadgeClass(kad.status)}` },
                `${getStatusIcon(kad.status)} ${kad.text}`
              )
            )
          ),
          // Divider between aMule and BitTorrent status
          amuleConnected && bittorrentConnected && h('div', { className: 'w-px h-4 bg-gray-300 dark:bg-gray-600' }),
          // rTorrent status (shown when rTorrent is connected)
          rtorrentConnected && h('div', { className: 'flex items-center gap-1.5' },
            h('span', { className: 'font-semibold text-gray-700 dark:text-gray-300' },
              h('span', { className: 'lg:hidden' }, `${CLIENT_NAMES.rtorrent.shortName}:`),
              h('span', { className: 'hidden lg:inline' }, `${CLIENT_NAMES.rtorrent.name}:`)
            ),
            rtStatus.listenPort
              ? h(Tooltip, { content: `Port ${rtStatus.listenPort}`, position: 'top' },
                  h('span', { className: `px-1.5 py-0.5 lg:px-2 lg:py-1 rounded text-xs font-medium cursor-help ${getStatusBadgeClass(rtStatus.status)}` },
                    `${getStatusIcon(rtStatus.status)} ${rtStatus.text}`
                  )
                )
              : h('span', { className: `px-1.5 py-0.5 lg:px-2 lg:py-1 rounded text-xs font-medium ${getStatusBadgeClass(rtStatus.status)}` },
                  `${getStatusIcon(rtStatus.status)} ${rtStatus.text}`
                )
          ),
          // qBittorrent status (shown when qBittorrent is connected)
          qbittorrentConnected && h('div', { className: 'flex items-center gap-1.5' },
            h('span', { className: 'font-semibold text-gray-700 dark:text-gray-300' },
              h('span', { className: 'lg:hidden' }, `${CLIENT_NAMES.qbittorrent.shortName}:`),
              h('span', { className: 'hidden lg:inline' }, `${CLIENT_NAMES.qbittorrent.name}:`)
            ),
            qbStatus.listenPort
              ? h(Tooltip, { content: `Port ${qbStatus.listenPort}`, position: 'top' },
                  h('span', { className: `px-1.5 py-0.5 lg:px-2 lg:py-1 rounded text-xs font-medium cursor-help ${getStatusBadgeClass(qbStatus.status)}` },
                    `${getStatusIcon(qbStatus.status)} ${qbStatus.text}`
                  )
                )
              : h('span', { className: `px-1.5 py-0.5 lg:px-2 lg:py-1 rounded text-xs font-medium ${getStatusBadgeClass(qbStatus.status)}` },
                  `${getStatusIcon(qbStatus.status)} ${qbStatus.text}`
                )
          )
        ),
        // Right: System indicators + Speeds
        h('div', { className: 'flex items-center gap-1.5 lg:gap-3' },
          // Update available indicator
          updateAvailable && onOpenAbout && h(Tooltip, {
            content: `Version ${latestVersion} is available`,
            position: 'top'
          },
            h('button', {
              onClick: onOpenAbout,
              className: 'flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors cursor-pointer'
            },
              h(Icon, { name: 'bell', size: 14, className: 'animate-pulse' }),
              h('span', { className: 'hidden lg:inline font-medium' }, 'Update')
            )
          ),
          // Divider after update indicator
          updateAvailable && onOpenAbout && h('div', { className: 'w-px h-4 bg-gray-300 dark:bg-gray-600' }),
          // Disk Space Indicator
          stats.diskSpace && h(Tooltip, {
            content: h('div', { className: 'space-y-1 text-right' },
              h('div', { className: 'font-semibold mb-1' }, 'Disk Usage'),
              h('div', {}, `Total: ${formatBytes(stats.diskSpace.total)}`),
              h('div', {}, `Used: ${formatBytes(stats.diskSpace.used)}`),
              h('div', {}, `Free: ${formatBytes(stats.diskSpace.free)}`),
              h('div', {}, `Usage: ${stats.diskSpace.percentUsed}%`)
            ),
            position: 'top'
          },
            h('div', { className: 'flex items-center gap-1 lg:gap-2 cursor-help' },
              h(Icon, { name: 'harddrive', size: 16, className: 'text-gray-600 dark:text-gray-400' }),
              h('div', { className: 'relative w-16 xl:w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden' },
                h('div', {
                  className: `h-full transition-all ${
                    stats.diskSpace.percentUsed >= 85
                      ? 'bg-red-500'
                      : stats.diskSpace.percentUsed >= 65
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`,
                  style: { width: `${stats.diskSpace.percentUsed}%` }
                }),
                h('span', {
                  className: 'absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-800 dark:text-white',
                  style: { textShadow: '0 0 1px rgba(0,0,0,0.3)' }
                },
                  `${stats.diskSpace.percentUsed}%`
                )
              )
            )
          ),
          // CPU Usage Indicator
          stats.cpuUsage && h('div', { className: 'flex items-center gap-1 lg:gap-2' },
            h(Icon, { name: 'cpu', size: 16, className: 'text-gray-600 dark:text-gray-400' }),
            h('div', { className: 'relative w-16 xl:w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden' },
              h('div', {
                className: `h-full transition-all ${
                  stats.cpuUsage.percent >= 85
                    ? 'bg-red-500'
                    : stats.cpuUsage.percent >= 65
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`,
                style: { width: `${stats.cpuUsage.percent}%` }
              }),
              h('span', {
                className: 'absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-800 dark:text-white',
                style: { textShadow: '0 0 1px rgba(0,0,0,0.3)' }
              },
                `${stats.cpuUsage.percent}%`
              )
            )
          ),
          // Vertical divider (only show if disk or CPU indicators are visible)
          (stats.diskSpace || stats.cpuUsage) && h('div', { className: 'w-px h-4 bg-gray-300 dark:bg-gray-600' }),
          // Upload speed - with tooltip only if multiple clients connected
          showSpeedTooltip
            ? h(Tooltip, {
                content: h('div', { className: 'space-y-1' },
                  h('div', { className: 'font-semibold mb-1' }, 'Upload Speed'),
                  amuleConnected && h('div', { className: 'flex items-center gap-2' },
                    h(ClientIcon, { clientType: 'amule', size: 14 }),
                    h('span', null, formatSpeed(amuleUploadSpeed))
                  ),
                  rtorrentConnected && h('div', { className: 'flex items-center gap-2' },
                    h(ClientIcon, { clientType: 'rtorrent', size: 14 }),
                    h('span', null, formatSpeed(rtorrentUploadSpeed))
                  ),
                  qbittorrentConnected && h('div', { className: 'flex items-center gap-2' },
                    h(ClientIcon, { clientType: 'qbittorrent', size: 14 }),
                    h('span', null, formatSpeed(qbittorrentUploadSpeed))
                  )
                ),
                position: 'top'
              },
                h('div', { className: 'flex items-center gap-1 lg:gap-2 cursor-help' },
                  h('span', { className: 'font-semibold text-gray-700 dark:text-gray-300' },
                    h('span', { className: 'hidden lg:inline' }, 'Upload '),
                    '↑'
                  ),
                  h('span', { className: 'text-green-600 dark:text-green-400 font-mono font-semibold' }, formatSpeed(totalUploadSpeed))
                )
              )
            : h('div', { className: 'flex items-center gap-1 lg:gap-2' },
                h('span', { className: 'font-semibold text-gray-700 dark:text-gray-300' },
                  h('span', { className: 'hidden lg:inline' }, 'Upload '),
                  '↑'
                ),
                h('span', { className: 'text-green-600 dark:text-green-400 font-mono font-semibold' }, formatSpeed(totalUploadSpeed))
              ),
          // Download speed - with tooltip only if multiple clients connected
          showSpeedTooltip
            ? h(Tooltip, {
                content: h('div', { className: 'space-y-1' },
                  h('div', { className: 'font-semibold mb-1' }, 'Download Speed'),
                  amuleConnected && h('div', { className: 'flex items-center gap-2' },
                    h(ClientIcon, { clientType: 'amule', size: 14 }),
                    h('span', null, formatSpeed(amuleDownloadSpeed))
                  ),
                  rtorrentConnected && h('div', { className: 'flex items-center gap-2' },
                    h(ClientIcon, { clientType: 'rtorrent', size: 14 }),
                    h('span', null, formatSpeed(rtorrentDownloadSpeed))
                  ),
                  qbittorrentConnected && h('div', { className: 'flex items-center gap-2' },
                    h(ClientIcon, { clientType: 'qbittorrent', size: 14 }),
                    h('span', null, formatSpeed(qbittorrentDownloadSpeed))
                  )
                ),
                position: 'top'
              },
                h('div', { className: 'flex items-center gap-1 lg:gap-2 cursor-help' },
                  h('span', { className: 'font-semibold text-gray-700 dark:text-gray-300' },
                    h('span', { className: 'hidden lg:inline' }, 'Download '),
                    '↓'
                  ),
                  h('span', { className: 'text-blue-600 dark:text-blue-400 font-mono font-semibold' }, formatSpeed(totalDownloadSpeed))
                )
              )
            : h('div', { className: 'flex items-center gap-1 lg:gap-2' },
                h('span', { className: 'font-semibold text-gray-700 dark:text-gray-300' },
                  h('span', { className: 'hidden lg:inline' }, 'Download '),
                  '↓'
                ),
                h('span', { className: 'text-blue-600 dark:text-blue-400 font-mono font-semibold' }, formatSpeed(totalDownloadSpeed))
              )
        )
      )
    )
  );
};

// Memoize to prevent re-renders when parent context changes but props don't
export default React.memo(Footer);
