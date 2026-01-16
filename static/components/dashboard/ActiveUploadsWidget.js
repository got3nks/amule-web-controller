/**
 * ActiveUploadsWidget Component
 *
 * Displays active uploads with filename and speed
 */

import React from 'https://esm.sh/react@18.2.0';
import { formatSpeed } from '../../utils/formatters.js';

const { createElement: h, useMemo } = React;

/**
 * ActiveUploadsWidget component
 * @param {array} uploads - Array of upload items
 * @param {number} maxItems - Maximum number of items to display
 * @param {boolean} compact - Use compact height for mobile (default: false)
 * @param {boolean} loading - Show loading placeholder (default: false)
 */
const ActiveUploadsWidget = ({ uploads = [], maxItems = 10, compact = false, loading = false }) => {
  // Group by file name and sum speeds
  const groupedUploads = useMemo(() => {
    const groups = {};

    uploads
      .filter(u => u.EC_TAG_CLIENT_UP_SPEED > 0)
      .forEach(upload => {
        const fileName = upload.EC_TAG_PARTFILE_NAME || 'Unknown';
        if (!groups[fileName]) {
          groups[fileName] = {
            fileName,
            totalSpeed: 0,
            clientCount: 0
          };
        }
        groups[fileName].totalSpeed += upload.EC_TAG_CLIENT_UP_SPEED;
        groups[fileName].clientCount += 1;
      });

    return Object.values(groups)
      .sort((a, b) => b.totalSpeed - a.totalSpeed)
      .slice(0, maxItems);
  }, [uploads, maxItems]);

  return h('div', {
    className: compact
      ? 'flex flex-col'
      : 'bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 flex flex-col',
    style: { height: compact ? '140px' : '300px' }
  },
    h('h3', {
      className: `font-semibold text-gray-700 dark:text-gray-300 ${compact ? 'text-xs mb-1' : 'text-sm mb-2'}`
    }, 'Active Uploads'),
    h('div', {
      className: 'flex-1 overflow-y-auto space-y-2'
    },
      loading
        ? h('div', { className: 'flex items-center justify-center h-full' },
            h('div', { className: 'loader' })
          )
        : groupedUploads.length === 0
        ? h('p', {
            className: 'text-sm text-gray-500 dark:text-gray-400 text-center py-4'
          }, 'No active uploads')
        : groupedUploads.map((group, idx) => {
            return h('div', {
              key: group.fileName || idx,
              className: 'p-2 rounded bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 flex items-center justify-between gap-2'
            },
              // Filename (truncated) with client count
              h('div', {
                className: 'text-xs font-medium text-gray-800 dark:text-gray-200 truncate flex-1',
                title: group.fileName
              },
                group.fileName,
                group.clientCount > 1 && h('span', {
                  className: 'ml-1 text-gray-500 dark:text-gray-400'
                }, `(${group.clientCount})`)
              ),

              // Total speed
              h('div', {
                className: 'text-xs text-green-600 dark:text-green-400 font-mono whitespace-nowrap'
              }, formatSpeed(group.totalSpeed))
            );
          })
    )
  );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(ActiveUploadsWidget);
