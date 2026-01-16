/**
 * SearchResultsList Component
 *
 * Shared component for displaying search results with mobile/desktop views
 */

import React from 'https://esm.sh/react@18.2.0';
import { Table, Icon, IconButton, Button } from './index.js';
import { formatBytes } from '../../utils/index.js';
import { useDynamicFontSize } from '../../hooks/index.js';

const { createElement: h, useCallback } = React;

/**
 * Column definitions for search results
 * Exported for MobileOptionsPopover in parent components (uses key, label, sortable)
 * Also used by Table internally (uses all properties including width, render)
 */
export const SEARCH_RESULTS_COLUMNS = [
  {
    key: 'fileName',
    label: 'File Name',
    sortable: true,
    width: 'auto',
    render: (item) =>
      h('div', {
        className: 'font-medium break-words whitespace-normal',
        style: { wordBreak: 'break-all', overflowWrap: 'anywhere' }
      }, item.fileName)
  },
  {
    key: 'fileSize',
    label: 'Size',
    sortable: true,
    width: '100px',
    render: (item) => formatBytes(item.fileSize)
  },
  {
    key: 'sourceCount',
    label: 'Sources',
    sortable: true,
    width: '120px',
    render: (item) => `${item.sourceCount} sources`
  }
];

/**
 * Search results list component
 * @param {Array} results - Search results array
 * @param {object} sortConfig - Current sort configuration
 * @param {function} onSortChange - Sort change handler
 * @param {Set} downloadedFiles - Set of downloaded file hashes
 * @param {function} onDownload - Download handler (receives fileHash)
 * @param {number} page - Current page number
 * @param {function} onPageChange - Page change handler
 * @param {number} pageSize - Items per page
 * @param {function} onPageSizeChange - Page size change handler (optional, enables page size selector)
 * @param {string} emptyMessage - Optional message to show when results are empty
 */
const SearchResultsList = ({
  results,
  sortConfig,
  onSortChange,
  downloadedFiles,
  onDownload,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange = null,
  emptyMessage = null
}) => {
  // Dynamic font size hook for responsive filename sizing
  const getDynamicFontSize = useDynamicFontSize();

  // Mobile card renderer
  const renderMobileCard = useCallback((item, idx) => {
    const isDownloaded = downloadedFiles.has(item.fileHash);
    return h('div', {
      className: `p-3 rounded-lg ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800/50'} border border-gray-200 dark:border-gray-700 flex items-start gap-3`
    },
      // Left side: File info
      h('div', { className: 'flex-1 min-w-0' },
        // File name
        h('div', {
          className: 'font-medium text-sm mb-1 text-gray-900 dark:text-gray-100',
          style: {
            fontSize: getDynamicFontSize(item.fileName),
            wordBreak: 'break-all',
            overflowWrap: 'anywhere',
            lineHeight: '1.4'
          }
        }, item.fileName),
        // Size and Sources on one line with icons
        h('div', { className: 'flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 flex-wrap' },
          h(Icon, { name: 'harddrive', size: 12, className: 'text-gray-500 dark:text-gray-400' }),
          h('span', { className: 'text-gray-900 dark:text-gray-100' }, formatBytes(item.fileSize)),
          h('span', { className: 'text-gray-400' }, '·'),
          h(Icon, { name: 'share', size: 12, className: 'text-gray-500 dark:text-gray-400' }),
          h('span', { className: 'text-gray-500 dark:text-gray-400' }, 'Sources:'),
          h('span', { className: 'text-gray-900 dark:text-gray-100' }, `${item.sourceCount}`)
        )
      ),
      // Right side: Download button (square)
      h(IconButton, {
        variant: isDownloaded ? 'secondary' : 'success',
        icon: isDownloaded ? 'check' : 'download',
        iconSize: 20,
        onClick: () => !isDownloaded && onDownload(item.fileHash),
        disabled: isDownloaded,
        title: isDownloaded ? 'Downloading' : 'Download',
        className: isDownloaded ? 'bg-gray-400 dark:bg-gray-600' : ''
      })
    );
  }, [getDynamicFontSize, downloadedFiles, onDownload]);

  // Desktop actions renderer
  const renderActions = useCallback((item) => {
    const isDownloaded = downloadedFiles.has(item.fileHash);
    return h(Button, {
      variant: isDownloaded ? 'secondary' : 'success',
      icon: isDownloaded ? 'check' : 'download',
      iconSize: 14,
      onClick: () => !isDownloaded && onDownload(item.fileHash),
      disabled: isDownloaded,
      className: isDownloaded ? 'bg-gray-400' : ''
    }, isDownloaded ? 'Downloading' : 'Download');
  }, [downloadedFiles, onDownload]);

  // Empty state
  if (results.length === 0 && emptyMessage) {
    return h('div', { className: 'text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400' }, emptyMessage);
  }

  return h(Table, {
    data: results,
    columns: SEARCH_RESULTS_COLUMNS,
    actions: renderActions,
    currentSortBy: sortConfig.sortBy,
    currentSortDirection: sortConfig.sortDirection,
    onSortChange,
    page,
    onPageChange,
    pageSize,
    onPageSizeChange,
    getRowKey: (item) => item.fileHash,
    breakpoint: 'lg',
    mobileCardRender: renderMobileCard
  });
};

export default SearchResultsList;
