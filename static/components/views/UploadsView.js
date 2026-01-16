/**
 * UploadsView Component
 *
 * Displays current uploads with client information
 * Uses contexts directly for all data and actions
 */

import React from 'https://esm.sh/react@18.2.0';
import { Icon, Table, FlagIcon, FilterInput, Tooltip, MobileOptionsPopover, ExpandableSearch } from '../common/index.js';
import { formatBytes, formatSpeed, ipToString, CLIENT_SOFTWARE_LABELS } from '../../utils/index.js';
import { useLiveData } from '../../contexts/LiveDataContext.js';
import { useTableState, useDynamicFontSize } from '../../hooks/index.js';

const { createElement: h, useCallback } = React;

/**
 * Get client software name from ID
 */
const getClientSoftware = (software) => {
  return CLIENT_SOFTWARE_LABELS[software] || 'Unknown';
};

/**
 * Uploads view component - uses useTableState hook for table logic
 */
const UploadsView = () => {
  // Get data from context
  const { dataUploads, dataLoaded } = useLiveData();

  // Dynamic font size hook for responsive filename sizing
  const getDynamicFontSize = useDynamicFontSize();

  // Use table state hook for filtering, sorting, pagination
  const {
    filteredData: uploads,
    sortedData: sortedUploads,
    paginatedData,
    totalCount,
    filterText,
    setFilterText,
    clearFilter,
    sortConfig,
    onSortChange,
    page,
    pageSize,
    pagesCount,
    onPageChange,
    onPageSizeChange
  } = useTableState({
    data: dataUploads,
    viewKey: 'uploads',
    filterField: 'EC_TAG_PARTFILE_NAME',
    defaultSort: { sortBy: 'EC_TAG_PARTFILE_NAME', sortDirection: 'asc' }
  });

  const columns = [
    {
      label: 'File Name',
      key: 'EC_TAG_PARTFILE_NAME',
      sortable: true,
      width: 'auto',
      render: (item) =>
        h('div', {
          className: 'font-medium break-words whitespace-normal text-sm',
          style: { wordBreak: 'break-word', overflowWrap: 'anywhere' }
        }, item.EC_TAG_PARTFILE_NAME || 'Unknown')
    },
    {
      label: 'Upload Speed',
      key: 'EC_TAG_CLIENT_UP_SPEED',
      sortable: true,
      render: (item) => h('span', { className: 'font-mono text-sm text-green-600 dark:text-green-400 whitespace-nowrap' }, formatSpeed(item.EC_TAG_CLIENT_UP_SPEED || 0))
    },
    {
      label: 'Client',
      key: 'EC_TAG_CLIENT_NAME',
      sortable: true,
      render: (item) =>
        h('div', { className: 'space-y-1' }, [
          h('div', null,
            h('span', { className: 'font-medium text-sm align-baseline' }, getClientSoftware(item.EC_TAG_CLIENT_SOFTWARE)),
            (item.EC_TAG_CLIENT_SOFT_VER_STR && item.EC_TAG_CLIENT_SOFT_VER_STR !== 'Unknown') &&
              h('span', { className: 'text-xs text-gray-500 dark:text-gray-400 align-baseline ml-1' }, item.EC_TAG_CLIENT_SOFT_VER_STR)
          ),
          h('div', null,
            item.hostname
              ? h(Tooltip, { content: ipToString(item.EC_TAG_CLIENT_USER_IP), position: 'top' },
                  h('span', { className: 'font-mono text-xs cursor-help break-all' }, item.hostname)
                )
              : h('span', { className: 'font-mono text-xs break-all' }, ipToString(item.EC_TAG_CLIENT_USER_IP))
          ),
          (item.geoData?.countryCode || item.geoData?.city) && h('div', { className: 'flex items-center gap-1' },
            item.geoData?.countryCode ? h(FlagIcon, {
                countryCode: item.geoData.countryCode,
                size: 16,
                title: item.geoData.countryCode
            }) : null,
            item.geoData?.city ? h('span', { className: 'text-xs text-gray-500 dark:text-gray-400' }, `${item.geoData.city}`) : null
          )
        ])
    },
    {
      label: 'Session Upload',
      key: 'EC_TAG_CLIENT_UPLOAD_SESSION',
      sortable: true,
      render: (item) => h('span', { className: 'whitespace-nowrap' }, formatBytes(item.EC_TAG_CLIENT_UPLOAD_SESSION || 0))
    },
    {
      label: 'Total Upload',
      key: 'EC_TAG_CLIENT_UPLOAD_TOTAL',
      sortable: true,
      render: (item) => h('span', { className: 'whitespace-nowrap' }, formatBytes(item.EC_TAG_CLIENT_UPLOAD_TOTAL || 0))
    }
  ];

  // Mobile card renderer
  const renderMobileCard = useCallback((item, idx) => {
    const fileName = item.EC_TAG_PARTFILE_NAME || 'Unknown';
    const fileSize = item.EC_TAG_PARTFILE_SIZE_FULL;
    const hasGeoData = item.geoData?.countryCode || item.geoData?.city;

    return h('div', {
      className: `p-3 rounded-lg ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800/50'} border border-gray-200 dark:border-gray-700`
    },
      // File name with size
      h('div', {
        className: 'font-medium text-sm mb-2 text-gray-900 dark:text-gray-100',
        style: {
          fontSize: getDynamicFontSize(fileName),
          wordBreak: 'break-all',
          overflowWrap: 'anywhere',
          lineHeight: '1.4'
        }
      },
        fileSize ? `${fileName} (${formatBytes(fileSize)})` : fileName
      ),
      // Upload Speed + Client on same line
      h('div', { className: 'flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 mb-1' },
        h(Icon, { name: 'upload', size: 12, className: 'text-green-600 dark:text-green-400 flex-shrink-0' }),
        h('span', { className: 'font-mono text-green-600 dark:text-green-400' }, formatSpeed(item.EC_TAG_CLIENT_UP_SPEED || 0)),
        h('span', { className: 'text-gray-400' }, '·'),
        h('span', null, getClientSoftware(item.EC_TAG_CLIENT_SOFTWARE)),
        (item.EC_TAG_CLIENT_SOFT_VER_STR && item.EC_TAG_CLIENT_SOFT_VER_STR !== 'Unknown') && h('span', { className: 'text-gray-500 dark:text-gray-400' }, item.EC_TAG_CLIENT_SOFT_VER_STR)
      ),
      // IP/Hostname + GeoIP on same line
      h('div', { className: 'flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 mb-1' },
        h(Icon, { name: 'mapPin', size: 12, className: 'text-gray-500 dark:text-gray-400 flex-shrink-0' }),
        item.hostname
          ? h('span', { className: 'font-mono', title: ipToString(item.EC_TAG_CLIENT_USER_IP) }, item.hostname)
          : h('span', { className: 'font-mono' }, ipToString(item.EC_TAG_CLIENT_USER_IP)),
        hasGeoData && h('span', { className: 'text-gray-400' }, '·'),
        item.geoData?.countryCode && h(FlagIcon, {
          countryCode: item.geoData.countryCode,
          size: 14,
          title: item.geoData.countryCode
        }),
        item.geoData?.city && h('span', { className: 'text-gray-500 dark:text-gray-400' }, item.geoData.city)
      ),
      // Session / Total Upload - compact format with icon and short labels
      h('div', { className: 'flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300' },
        h(Icon, { name: 'upload', size: 12, className: 'text-gray-500 dark:text-gray-400 flex-shrink-0' }),
        h('span', { className: 'text-gray-500 dark:text-gray-400' }, 'Session:'),
        h('span', null, formatBytes(item.EC_TAG_CLIENT_UPLOAD_SESSION || 0)),
        h('span', { className: 'text-gray-400' }, '·'),
        h('span', { className: 'text-gray-500 dark:text-gray-400' }, 'Total:'),
        h('span', null, formatBytes(item.EC_TAG_CLIENT_UPLOAD_TOTAL || 0))
      )
    );
  }, [getDynamicFontSize]);

  return h('div', { className: 'space-y-2 sm:space-y-3' },
    // Mobile/tablet header with title + compact controls
    h('div', { className: 'flex lg:hidden items-center gap-2 pl-1' },
      h('h2', { className: 'text-base font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap' }, `Uploads (${uploads.length})`),
      h('div', { className: 'flex-1' }),
      h(ExpandableSearch, {
        value: filterText,
        onChange: setFilterText,
        onClear: clearFilter,
        placeholder: 'Filter...',
        hiddenWhenExpanded: [
          h(MobileOptionsPopover, {
            key: 'options',
            columns,
            sortBy: sortConfig.sortBy,
            sortDirection: sortConfig.sortDirection,
            onSortChange
          })
        ]
      })
    ),
    // Desktop header
    h('div', { className: 'hidden lg:flex justify-between items-center gap-3 pl-2' },
      h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, `Uploads (${uploads.length})`),
      h(FilterInput, {
        value: filterText,
        onChange: setFilterText,
        onClear: clearFilter,
        placeholder: 'Filter by file name...',
        className: 'w-56'
      })
    ),

    uploads.length === 0 ? h('div', { className: 'text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400' },
      !dataLoaded.uploads ? 'Loading uploads...' : (filterText ? 'No uploads match the filter' : 'No active uploads')
    ) : h(Table, {
      data: sortedUploads,
      columns,
      actions: null,
      currentSortBy: sortConfig.sortBy,
      currentSortDirection: sortConfig.sortDirection,
      onSortChange,
      page,
      onPageChange,
      pageSize,
      onPageSizeChange,
      getRowKey: (item) => item.EC_TAG_CLIENT_HASH,
      breakpoint: 'lg',
      mobileCardRender: renderMobileCard
    })
  );
};

export default UploadsView;
