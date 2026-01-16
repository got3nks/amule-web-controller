/**
 * Table Component
 *
 * Generic data table with sorting, pagination, and responsive mobile/desktop views
 */

import React from 'https://esm.sh/react@18.2.0';
import { sortFiles, calculatePagination } from '../../utils/index.js';
import { PaginationControls } from './PaginationControls.js';

const { createElement: h } = React;

/**
 * Reusable table component
 * @param {Array} data - Array of data to display
 * @param {Array} columns - Column definitions with label, key, sortable, width, render
 * @param {function|null} actions - Actions renderer function (receives item)
 * @param {string} currentSortBy - Current sort column key
 * @param {string} currentSortDirection - Current sort direction ('asc'/'desc')
 * @param {function} onSortChange - Sort change handler (sortBy, sortDirection)
 * @param {number} page - Current page number
 * @param {function} onPageChange - Page change handler
 * @param {number} pageSize - Items per page
 * @param {function} onPageSizeChange - Page size change handler (optional, enables page size selector)
 * @param {function|null} getRowClassName - Function to get additional className for each row (receives item, idx)
 * @param {function|null} onRowContextMenu - Handler for right-click context menu (receives event, item)
 * @param {React.ReactNode|null} beforePagination - Content to render between table and pagination
 * @param {boolean} serverSide - When true, skip internal sorting/pagination (data comes pre-sorted/paginated)
 * @param {number|null} totalCount - Total item count for server-side pagination
 * @param {function|null} getRowKey - Function to get unique key for each row (receives item, idx)
 * @param {string} breakpoint - Breakpoint for mobile/desktop switch ('sm', 'md', 'lg', 'xl'), default 'md'
 * @param {function|null} mobileCardRender - Custom mobile card renderer (receives item, idx), overrides default card view
 */
const Table = ({
  data,
  columns,
  actions = null,
  currentSortBy,
  currentSortDirection,
  onSortChange,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange = null,
  getRowClassName = null,
  onRowContextMenu = null,
  beforePagination = null,
  serverSide = false,
  totalCount = null,
  getRowKey = null,
  breakpoint = 'md',
  mobileCardRender = null
}) => {
  // Safety check: ensure data is an array
  if (!Array.isArray(data)) {
    console.error('Table: data is not an array', data);
    return h('div', { className: 'text-center py-6 text-xs sm:text-sm text-red-500 dark:text-red-400' },
      'Error: Invalid data format'
    );
  }

  // Server-side mode: data comes pre-sorted and pre-paginated
  // Client-side mode: sort and paginate locally
  let pagesCount, paginatedData;
  if (serverSide) {
    // Data is already sorted and paginated by server
    paginatedData = data;
    pagesCount = totalCount != null ? Math.ceil(totalCount / pageSize) : 1;
  } else {
    // Client-side sorting and pagination
    const result = calculatePagination(
      sortFiles(data, currentSortBy, currentSortDirection),
      page,
      pageSize
    );
    pagesCount = result.pagesCount;
    paginatedData = result.paginatedData;
  }

  // Helper to get unique row key
  const getKey = (item, idx) => {
    if (getRowKey) return getRowKey(item, idx);
    return item.fileHash || item.hash || item.EC_TAG_CLIENT_HASH || item._value || idx;
  };

  // Breakpoint-aware class names
  const mobileClass = `${breakpoint}:hidden`;
  const desktopClass = `hidden ${breakpoint}:block`;

  return h('div', { className: 'space-y-2' },

    // Mobile card view
    h('div', { className: `block ${mobileClass} space-y-2` },
      paginatedData.map((item, idx) => {
        // Use custom mobile card renderer if provided
        if (mobileCardRender) {
          return h('div', { key: getKey(item, idx) }, mobileCardRender(item, idx));
        }

        // Default mobile card rendering
        const title = item.EC_TAG_SERVER_NAME || item.fileName || item.EC_TAG_PARTFILE_NAME || 'N/A';
        const extraClassName = getRowClassName ? getRowClassName(item, idx) : '';
        return h('div', {
          key: getKey(item, idx),
          className: `p-2 sm:p-3 rounded-lg ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800/50'} border border-gray-200 dark:border-gray-700 ${extraClassName}`
        },
          h('div', {
            className: 'font-medium text-xs sm:text-sm mb-1.5 break-all text-gray-900 dark:text-gray-100'
          }, title),
          h('div', { className: 'space-y-1 text-xs' },
            columns.map((col, cidx) => {
              if (col.key === 'fileName' || col.key === 'EC_TAG_PARTFILE_NAME' || col.key === 'EC_TAG_SERVER_NAME') return null;
              return h('div', {
                key: cidx,
                className: 'text-gray-700 dark:text-gray-300'
              },
                col.key !== 'progress' && h('span', { className: 'font-medium text-gray-600 dark:text-gray-400' }, col.label + ': '),
                h('span', { className: 'text-gray-900 dark:text-gray-100' },
                  col.render ? col.render(item) : item[col.key]
                )
              );
            })
          ),
          actions && h('div', { className: 'flex gap-1.5 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 justify-center' },
            actions(item)
          )
        );
      })
    ),

    // Desktop table view
    h('div', { className: `${desktopClass} overflow-x-auto` },
      h('table', { className: 'w-full' },
        h('thead', null,
          h('tr', { className: 'border-b-2 border-gray-300 dark:border-gray-600' },
            columns.map((col, idx) =>
              h('th', {
                key: idx,
                className: 'text-left p-2 font-semibold text-xs sm:text-sm text-gray-700 dark:text-gray-300',
                style: col.width && col.width !== 'auto' ? { width: col.width } : undefined
              },
                col.sortable ? h('button', {
                  onClick: () => {
                    if (currentSortBy === col.key) {
                      // Toggle direction
                      onSortChange(col.key, currentSortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      // New column – default to descending
                      onSortChange(col.key, 'desc');
                    }
                    onPageChange(0);
                  },
                  className: `hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${currentSortBy === col.key ? 'text-blue-600 dark:text-blue-400' : ''}`
                }, col.label +
                    (currentSortBy === col.key
                      ? currentSortDirection === 'asc' ? ' ↑' : ' ↓'
                      : '')
                    ) : col.label
              )
            ),
            actions && h('th', { className: 'text-left p-2 font-semibold text-xs sm:text-sm text-gray-700 dark:text-gray-300' }, 'Actions')
          )
        ),
        h('tbody', null,
          paginatedData.map((item, idx) => {
            const extraClassName = getRowClassName ? getRowClassName(item, idx) : '';
            return h('tr', {
              key: getKey(item, idx),
              className: `
                ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}
                hover:bg-indigo-100 dark:hover:bg-indigo-700 transition-colors duration-200
                ${extraClassName}
              `,
              onContextMenu: onRowContextMenu ? (e) => onRowContextMenu(e, item) : undefined
            },
              columns.map((col, cidx) =>
                h('td', {
                  key: cidx,
                  className: 'p-2 text-xs sm:text-sm text-gray-900 dark:text-gray-100',
                  style: col.width && col.width !== 'auto' ? { width: col.width } : undefined
                },
                  col.render ? col.render(item) : item[col.key]
                )
              ),
              actions && h('td', { className: 'p-2' },
                h('div', { className: 'flex gap-2' }, actions(item))
              )
            );
          })
        )
      )
    ),

    // Before pagination content (e.g., bulk action footer)
    beforePagination,

    // Enhanced Pagination
    h(PaginationControls, {
      page,
      onPageChange,
      pagesCount,
      pageSize,
      onPageSizeChange,
      options: { showFirstLast: true, showPageSelector: true }
    })
  );
};

export default Table;
