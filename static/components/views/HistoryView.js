/**
 * HistoryView Component
 *
 * Displays download history with status tracking
 * Shows all downloads that have been started, with their current status
 */

import React from 'https://esm.sh/react@18.2.0';
import { Icon, Table, LoadingSpinner, AlertBox, FilterInput, DeleteModal, MobileOptionsPopover, ExpandableSearch, Button, Select, IconButton } from '../common/index.js';
import { formatBytes, formatDateTime } from '../../utils/index.js';
import { useAppState } from '../../contexts/AppStateContext.js';
import { useDynamicFontSize } from '../../hooks/index.js';

const { createElement: h, useState, useEffect, useMemo, useCallback } = React;

/**
 * Status badge colors and labels
 */
const STATUS_CONFIG = {
  downloading: {
    label: 'Downloading',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-800 dark:text-blue-300',
    icon: 'arrowDown'
  },
  completed: {
    label: 'Completed',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-800 dark:text-green-300',
    icon: 'check'
  },
  missing: {
    label: 'Missing',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-800 dark:text-yellow-300',
    icon: 'alertTriangle'
  },
  deleted: {
    label: 'Deleted',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-800 dark:text-red-300',
    icon: 'trash'
  }
};

/**
 * Status Badge Component
 */
const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.missing;

  return h('span', {
    className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`
  },
    h(Icon, { name: config.icon, size: 12 }),
    config.label
  );
};

/**
 * History View Component
 */
const HistoryView = () => {
  // Shared pagination and sort state from context
  const { appPageSize, setAppPageSize, appSortConfig, setAppSortConfig } = useAppState();

  // Dynamic font size hook for responsive filename sizing
  const getDynamicFontSize = useDynamicFontSize();

  // Get sort config for this view (with default fallback)
  const sortConfig = appSortConfig['history'] || { sortBy: 'started_at', sortDirection: 'desc' };
  const sortBy = sortConfig.sortBy;
  const sortDir = sortConfig.sortDirection;

  // State
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [trackUsername, setTrackUsername] = useState(false);

  // Use shared page size
  const pageSize = appPageSize;
  const onPageSizeChange = setAppPageSize;

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filter text state
  const [filterText, setFilterText] = useState('');

  // Debounced search term for API calls
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filterText);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterText]);

  /**
   * Fetch history data from API
   */
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
        sortBy,
        sortDir
      });

      // Add search filter if present
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/history?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }

      const data = await response.json();
      setHistory(data.entries || []);
      setTotal(data.total || 0);
      setTrackUsername(data.trackUsername || false);
    } catch (err) {
      setError(err.message);
      setHistory([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortDir, debouncedSearch, statusFilter]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Reset page when filters or pageSize change
  useEffect(() => {
    setPage(0);
  }, [pageSize, debouncedSearch, statusFilter]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/history/${itemToDelete.hash}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh the list
        fetchHistory();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete entry');
      }
    } catch (err) {
      setError('Failed to delete entry: ' + err.message);
    } finally {
      setDeleting(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, fetchHistory]);

  // Table columns definition - conditionally include username column
  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: 'filename',
        label: 'File Name',
        sortable: true,
        width: 'auto',
        render: (item) => h('div', { className: 'break-all' },
          item.filename || 'Unknown'
        )
      },
      {
        key: 'size',
        label: 'Size',
        sortable: true,
        width: '100px',
        render: (item) => item.size ? formatBytes(item.size) : '-'
      },
      {
        key: 'status',
        label: 'Status',
        sortable: false,
        width: '120px',
        render: (item) => h(StatusBadge, { status: item.status })
      },
      {
        key: 'started_at',
        label: 'Started',
        sortable: true,
        width: '160px',
        render: (item) => item.started_at ? formatDateTime(item.started_at) : '-'
      },
      {
        key: 'completed_at',
        label: 'Completed',
        sortable: true,
        width: '160px',
        render: (item) => item.completed_at ? formatDateTime(item.completed_at) : '-'
      }
    ];

    // Only include username column if tracking is enabled
    if (trackUsername) {
      baseColumns.push({
        key: 'username',
        label: 'User',
        sortable: true,
        width: '100px',
        render: (item) => item.username || '-'
      });
    }

    return baseColumns;
  }, [trackUsername]);

  // Actions renderer for Table component
  const renderActions = useCallback((item) => {
    return h(IconButton, {
      variant: 'secondary',
      icon: 'trash',
      iconSize: 16,
      onClick: (e) => {
        e.stopPropagation();
        setItemToDelete(item);
      },
      title: 'Delete from history',
      className: 'w-8 h-8 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500'
    });
  }, []);

  // Mobile card renderer for Table component
  const renderMobileCard = useCallback((item, idx) => {
    return h('div', {
      className: `p-2 sm:p-3 rounded-lg ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800/50'} border border-gray-200 dark:border-gray-700`
    },
      // Header row with filename and delete button
      h('div', { className: 'flex justify-between items-start gap-2 mb-1.5' },
        h('span', {
          className: 'font-medium text-gray-900 dark:text-gray-100 flex-1',
          style: {
            fontSize: getDynamicFontSize(item.filename || 'Unknown'),
            wordBreak: 'break-all',
            overflowWrap: 'anywhere'
          }
        }, item.filename || 'Unknown'),
        h(IconButton, {
          variant: 'secondary',
          icon: 'trash',
          iconSize: 16,
          onClick: () => setItemToDelete(item),
          title: 'Delete from history',
          className: '!w-7 !h-7 !p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500'
        })
      ),

      // Details
      h('div', { className: 'space-y-1 text-xs' },
        // Status + Size + User on same line
        h('div', { className: 'flex items-center gap-2 text-gray-700 dark:text-gray-300 flex-wrap' },
          h(StatusBadge, { status: item.status }),
          item.size && h('span', { className: 'flex items-center gap-1 text-gray-900 dark:text-gray-100' },
            h(Icon, { name: 'harddrive', size: 12, className: 'text-gray-500 dark:text-gray-400' }),
            formatBytes(item.size)
          ),
          // User with icon (only show if tracking is enabled)
          trackUsername && item.username && h('span', { className: 'flex items-center gap-1' },
            h(Icon, { name: 'user', size: 12, className: 'text-gray-500 dark:text-gray-400' }),
            h('span', { className: 'text-gray-900 dark:text-gray-100' }, item.username)
          )
        ),
        // Started
        h('div', { className: 'text-gray-700 dark:text-gray-300' },
          h('span', { className: 'font-medium text-gray-600 dark:text-gray-400' }, 'Started: '),
          h('span', { className: 'text-gray-900 dark:text-gray-100' }, item.started_at ? formatDateTime(item.started_at) : '-')
        ),
        // Completed
        item.completed_at && h('div', { className: 'text-gray-700 dark:text-gray-300' },
          h('span', { className: 'font-medium text-gray-600 dark:text-gray-400' }, 'Completed: '),
          h('span', { className: 'text-gray-900 dark:text-gray-100' }, formatDateTime(item.completed_at))
        )
      )
    );
  }, [getDynamicFontSize, trackUsername]);

  // Status filter options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'downloading', label: 'Downloading' },
    { value: 'completed', label: 'Completed' },
    { value: 'missing', label: 'Missing' },
    { value: 'deleted', label: 'Deleted' }
  ];

  // Error state
  if (error) {
    return h('div', { className: 'p-4' },
      h(AlertBox, { type: 'error' },
        h('p', { className: 'font-medium' }, 'Error loading history'),
        h('p', { className: 'text-sm mt-1' }, error),
        h(Button, {
          variant: 'danger',
          onClick: fetchHistory,
          className: 'mt-2'
        }, 'Retry')
      )
    );
  }

  // Columns for MobileOptionsPopover (need sortable columns)
  const sortableColumns = [
    { key: 'filename', label: 'File Name', sortable: true },
    { key: 'size', label: 'Size', sortable: true },
    { key: 'started_at', label: 'Started', sortable: true },
    { key: 'completed_at', label: 'Completed', sortable: true }
  ];

  return h('div', { className: 'space-y-2 sm:space-y-3' },
    // Mobile header with title + compact controls
    h('div', { className: 'flex lg:hidden items-center gap-2 pl-1' },
      h('h2', { className: 'text-base font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap' }, `Download History (${total})`),
      h('div', { className: 'flex-1' }),
      h(ExpandableSearch, {
        value: filterText,
        onChange: setFilterText,
        placeholder: 'Filter...',
        hiddenWhenExpanded: [
          h(MobileOptionsPopover, {
            key: 'options',
            columns: sortableColumns,
            sortBy,
            sortDirection: sortDir,
            onSortChange: (newSortBy, newSortDir) => {
              setAppSortConfig(prev => ({
                ...prev,
                'history': { sortBy: newSortBy, sortDirection: newSortDir }
              }));
              setPage(0);
            },
            statusOptions,
            statusFilter,
            onStatusFilterChange: setStatusFilter
          }),
          h(IconButton, {
            key: 'refresh',
            variant: 'secondary',
            icon: 'refresh',
            iconSize: 18,
            onClick: fetchHistory,
            disabled: loading,
            title: 'Refresh',
            className: loading ? '[&_svg]:animate-spin' : ''
          })
        ]
      })
    ),

    // Desktop header
    h('div', { className: 'hidden lg:flex justify-between items-center gap-3 pl-2' },
      h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, `Download History (${total})`),
      h('div', { className: 'flex gap-2' },
        h(FilterInput, {
          value: filterText,
          onChange: setFilterText,
          placeholder: 'Filter...',
          className: 'w-56'
        }),
        h(Select, {
          value: statusFilter,
          onChange: (e) => setStatusFilter(e.target.value),
          options: statusOptions
        }),
        h(Button, {
          variant: 'primary',
          onClick: fetchHistory,
          disabled: loading,
          icon: 'refresh',
          className: loading ? '[&_svg]:animate-spin' : ''
        }, 'Refresh')
      )
    ),

    // Loading state
    loading && h('div', { className: 'flex justify-center py-8' },
      h(LoadingSpinner, { message: 'Loading history...' })
    ),

    // Content
    !loading && (
      history.length === 0
        ? h('div', { className: 'text-center py-12' },
            h(Icon, { name: 'history', size: 48, className: 'mx-auto text-gray-400 mb-4' }),
            h('p', { className: 'text-gray-500 dark:text-gray-400' },
              'No download history yet'
            )
          )
        : h(Table, {
            data: history,
            columns,
            actions: renderActions,
            currentSortBy: sortBy,
            currentSortDirection: sortDir,
            onSortChange: (newSortBy, newSortDir) => {
              setAppSortConfig(prev => ({
                ...prev,
                'history': { sortBy: newSortBy, sortDirection: newSortDir }
              }));
              setPage(0);
            },
            page,
            onPageChange: setPage,
            pageSize,
            onPageSizeChange,
            serverSide: true,
            totalCount: total,
            getRowKey: (item) => item.hash,
            breakpoint: 'lg',
            mobileCardRender: renderMobileCard
          })
    ),

    // Delete confirmation modal
    h(DeleteModal, {
      show: !!itemToDelete,
      onCancel: () => setItemToDelete(null),
      onConfirm: handleDelete,
      title: 'Delete History Entry',
      message: `Are you sure you want to delete "${itemToDelete?.filename}" from history?`
    })
  );
};

export default HistoryView;
