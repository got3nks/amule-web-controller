/**
 * ActiveDownloadsWidget Component
 *
 * Displays active downloads with progress bars and category colors
 * Memoized to prevent unnecessary re-renders
 */

import React from 'https://esm.sh/react@18.2.0';
import { getCategoryColorStyle, getProgressColor } from '../../utils/colors.js';
import { formatSpeed } from '../../utils/formatters.js';
import { useTheme } from '../../contexts/ThemeContext.js';

const { createElement: h, useMemo } = React;

/**
 * ActiveDownloadsWidget component
 * @param {array} downloads - Array of download items
 * @param {array} categories - Array of categories
 * @param {number} maxItems - Maximum number of items to display
 * @param {boolean} compact - Use compact height for mobile (default: false)
 * @param {boolean} loading - Show loading placeholder (default: false)
 */
const ActiveDownloadsWidget = ({ downloads = [], categories = [], maxItems = 10, compact = false, loading = false }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Filter and sort active downloads
  const activeDownloads = useMemo(() => {
    return downloads
      .filter(d => (d.speed || 0) > 0)
      .sort((a, b) => (b.speed || 0) - (a.speed || 0))
      .slice(0, maxItems);
  }, [downloads, maxItems]);

  return h('div', {
    className: compact
      ? 'flex flex-col'
      : 'bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 flex flex-col',
    style: { height: compact ? '140px' : '300px' }
  },
    h('h3', {
      className: `font-semibold text-gray-700 dark:text-gray-300 ${compact ? 'text-xs mb-1' : 'text-sm mb-2'}`
    }, 'Active Downloads'),
    h('div', {
      className: 'flex-1 overflow-y-auto space-y-2'
    },
      loading
        ? h('div', { className: 'flex items-center justify-center h-full' },
            h('div', { className: 'loader' })
          )
        : activeDownloads.length === 0
        ? h('p', {
            className: 'text-sm text-gray-500 dark:text-gray-400 text-center py-4'
          }, 'No active downloads')
        : activeDownloads.map((download, idx) => {
            // Find category and get color style
            const category = categories.find(cat => cat.id === download.category);
            const categoryStyle = getCategoryColorStyle(category, download.category === 0);

            // Ensure progress is a number
            const progress = Number(download.progress) || 0;

            // Compact mode: simplified view (filename + speed only, like ActiveUploadsWidget)
            if (compact) {
              return h('div', {
                key: download.fileHash || idx,
                className: 'p-2 rounded bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 flex items-center justify-between gap-2',
                style: categoryStyle || {}
              },
                // Filename (truncated)
                h('div', {
                  className: 'text-xs font-medium text-gray-800 dark:text-gray-200 truncate flex-1',
                  title: download.fileName
                }, download.fileName),

                // Speed
                h('div', {
                  className: 'text-xs text-blue-600 dark:text-blue-400 font-mono whitespace-nowrap'
                }, formatSpeed(download.speed || 0))
              );
            }

            // Desktop mode: full view with progress bar
            return h('div', {
              key: download.fileHash || idx,
              className: 'p-2 rounded bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600',
              style: categoryStyle || {}
            },
              // Filename (truncated)
              h('div', {
                className: 'text-xs font-medium text-gray-800 dark:text-gray-200 truncate mb-1',
                title: download.fileName
              }, download.fileName),

              // Progress bar
              h('div', {
                className: 'w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-1 relative'
              },
                h('div', {
                  className: `h-full rounded-full ${getProgressColor(progress)}`,
                  style: { width: `${progress}%` }
                }),
                h('span', {
                  className: 'absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-900 dark:text-white',
                  style: {
                    WebkitTextStroke: isDark ? '0.5px black' : '0.5px white',
                    textShadow: isDark ? '0 0 1px black, 0 0 1px black' : '0 0 1px white, 0 0 1px white',
                    paintOrder: 'stroke fill'
                  }
                }, `${progress.toFixed(2)}%`)
              ),

              // Speed
              h('div', {
                className: 'text-xs text-blue-600 dark:text-blue-400 font-mono'
              }, formatSpeed(download.speed || 0))
            );
          })
    )
  );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(ActiveDownloadsWidget);
