/**
 * SearchResultsSection Component
 *
 * Shared component for displaying search results with header controls
 * Used by both SearchView (cached results) and SearchResultsView (live results)
 */

import React from 'https://esm.sh/react@18.2.0';
import { SearchResultsList, SEARCH_RESULTS_COLUMNS, FilterInput, MobileOptionsPopover, ExpandableSearch, Select } from './index.js';
import { useAppState } from '../../contexts/AppStateContext.js';
import { useStaticData } from '../../contexts/StaticDataContext.js';
import { useSearch } from '../../contexts/SearchContext.js';
import { useActions } from '../../contexts/ActionsContext.js';
import { useTextFilter } from '../../hooks/index.js';

const { createElement: h, useCallback } = React;

/**
 * SearchResultsSection component
 * @param {string} title - Desktop title (e.g. "Search Results", "Previous Search Results")
 * @param {string} mobileTitle - Mobile title (e.g. "Results")
 * @param {Array} results - Results array to display
 * @param {string} sortConfigKey - Key for sort config (e.g. 'search', 'search-results')
 * @param {ReactNode} extraMobileButtons - Additional buttons for mobile header
 * @param {ReactNode} extraDesktopButtons - Additional buttons for desktop header
 * @param {string} emptyMessage - Message when no results
 * @param {string} filterEmptyMessage - Message when filter has no matches
 */
const SearchResultsSection = ({
  title = 'Search Results',
  mobileTitle = 'Search Results',
  results,
  sortConfigKey = 'search',
  extraMobileButtons = null,
  extraDesktopButtons = null,
  emptyMessage = 'No results found',
  filterEmptyMessage = 'No results match the filter'
}) => {
  // Get data from contexts
  const { appPage, appPageSize, appSortConfig, setAppPage, setAppPageSize, setAppSortConfig } = useAppState();
  const { dataDownloadedFiles, dataCategories } = useStaticData();
  const { searchDownloadCategoryId, setSearchDownloadCategoryId } = useSearch();
  const actions = useActions();

  // Reset page handler for filter changes
  const handleFilterChange = useCallback(() => setAppPage(0), [setAppPage]);

  // Text filter for results
  const { filteredItems: filteredResults, filterText, setFilterText, clearFilter } = useTextFilter(results, 'fileName', { onFilterChange: handleFilterChange });

  // Sort change handler
  const handleSortChange = useCallback((newSortBy, newSortDirection) => {
    setAppSortConfig(prev => ({
      ...prev,
      [sortConfigKey]: { sortBy: newSortBy, sortDirection: newSortDirection }
    }));
  }, [sortConfigKey, setAppSortConfig]);

  const sortConfig = appSortConfig[sortConfigKey] || { sortBy: 'fileName', sortDirection: 'asc' };

  return h('div', null,
    // Mobile header with inline controls
    h('div', { className: 'flex lg:hidden items-center gap-2 mb-2 pl-1' },
      h('h2', { className: 'text-base font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap' }, mobileTitle),
      h('span', { className: 'text-sm text-gray-500 dark:text-gray-400' }, `(${filteredResults.length})`),
      h('div', { className: 'flex-1' }),
      results.length > 0 && h(ExpandableSearch, {
        value: filterText,
        onChange: setFilterText,
        onClear: clearFilter,
        placeholder: 'Filter...',
        hiddenWhenExpanded: [
          h(MobileOptionsPopover, {
            key: 'options',
            columns: SEARCH_RESULTS_COLUMNS,
            sortBy: sortConfig.sortBy,
            sortDirection: sortConfig.sortDirection,
            onSortChange: handleSortChange,
            categories: dataCategories,
            filterCategoryId: searchDownloadCategoryId,
            onFilterCategoryChange: setSearchDownloadCategoryId
          }),
          extraMobileButtons
        ]
      }),
      results.length === 0 && extraMobileButtons
    ),

    // Desktop header
    h('div', { className: 'hidden lg:flex items-center justify-between gap-2 mb-2 pl-2' },
      h('div', { className: 'flex items-center gap-3' },
        h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, title),
        h('span', { className: 'text-sm text-gray-500 dark:text-gray-400' }, `(${filteredResults.length})`)
      ),
      h('div', { className: 'flex items-center gap-2' },
        results.length > 0 && h('label', { className: 'text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap' }, 'Download to:'),
        results.length > 0 && h(Select, {
          value: searchDownloadCategoryId,
          onChange: (e) => setSearchDownloadCategoryId(parseInt(e.target.value)),
          options: [
            { value: 0, label: 'Default (all)' },
            ...dataCategories.filter(cat => cat.id !== 0).map(cat => ({ value: cat.id, label: cat.title }))
          ],
          title: 'Select category for downloads'
        }),
        results.length > 0 && h(FilterInput, {
          value: filterText,
          onChange: setFilterText,
          onClear: clearFilter,
          placeholder: 'Filter by file name...',
          className: 'w-56'
        }),
        extraDesktopButtons
      )
    ),

    // Search results list
    h(SearchResultsList, {
      results: filteredResults,
      sortConfig,
      onSortChange: handleSortChange,
      downloadedFiles: dataDownloadedFiles,
      onDownload: (fileHash) => actions.search.download(fileHash, searchDownloadCategoryId),
      page: appPage,
      onPageChange: setAppPage,
      pageSize: appPageSize,
      onPageSizeChange: setAppPageSize,
      emptyMessage: filterText ? filterEmptyMessage : emptyMessage
    })
  );
};

export default SearchResultsSection;
