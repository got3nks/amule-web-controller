/**
 * useTableState Hook
 *
 * Combines filtering, sorting, and pagination for table views
 * Reduces boilerplate across DownloadsView, UploadsView, SharedView, etc.
 */

import { useMemo, useCallback } from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../contexts/AppStateContext.js';
import { useTextFilter } from './useTextFilter.js';
import { sortFiles, calculatePagination } from '../utils/index.js';

/**
 * Combined table state hook for filtering, sorting, and pagination
 * @param {Object} options - Configuration options
 * @param {Array} options.data - Array of items to display
 * @param {string} options.viewKey - Unique key for this view (e.g., 'uploads', 'downloads')
 * @param {string|null} options.filterField - Field to filter by (null to disable text filtering)
 * @param {Object} options.defaultSort - Default sort config { sortBy, sortDirection }
 * @param {boolean} options.useFileNameAsSecondary - Use fileName as secondary sort when primary values are equal
 * @returns {Object} Table state and handlers
 */
export const useTableState = ({
  data = [],
  viewKey,
  filterField = null,
  defaultSort = { sortBy: 'fileName', sortDirection: 'asc' },
  useFileNameAsSecondary = false
}) => {
  // Get shared state from context
  const {
    appPage,
    appPageSize,
    appSortConfig,
    setAppPage,
    setAppPageSize,
    setAppSortConfig
  } = useAppState();

  // Reset page when filter changes
  const handleFilterChange = useCallback(() => setAppPage(0), [setAppPage]);

  // Text filter
  const {
    filteredItems,
    filterText,
    setFilterText,
    clearFilter
  } = useTextFilter(data, filterField, { onFilterChange: handleFilterChange });

  // Get sort config for this view (with default fallback)
  const sortConfig = appSortConfig[viewKey] || defaultSort;

  // Sort change handler
  const handleSortChange = useCallback((newSortBy, newSortDirection) => {
    setAppSortConfig(prev => ({
      ...prev,
      [viewKey]: { sortBy: newSortBy, sortDirection: newSortDirection }
    }));
  }, [viewKey, setAppSortConfig]);

  // Memoized sorted data
  const sortedData = useMemo(() =>
    sortFiles(filteredItems, sortConfig.sortBy, sortConfig.sortDirection, useFileNameAsSecondary),
    [filteredItems, sortConfig.sortBy, sortConfig.sortDirection, useFileNameAsSecondary]
  );

  // Pagination
  const { pagesCount, paginatedData } = calculatePagination(
    sortedData,
    appPage,
    appPageSize
  );

  return {
    // Data
    filteredData: filteredItems,
    sortedData,
    paginatedData,
    totalCount: filteredItems.length,

    // Filter state (only relevant when filterField is provided)
    hasTextFilter: !!filterField,
    filterText,
    setFilterText,
    clearFilter,

    // Sort state
    sortConfig,
    onSortChange: handleSortChange,

    // Pagination state
    page: appPage,
    pageSize: appPageSize,
    pagesCount,
    onPageChange: setAppPage,
    onPageSizeChange: setAppPageSize
  };
};
