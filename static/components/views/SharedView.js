/**
 * SharedView Component
 *
 * Displays shared files list with upload statistics
 * Uses contexts directly for all data and actions
 */

import React from 'https://esm.sh/react@18.2.0';
import { Icon, Table, MobileCardView, PaginationControls, FilterInput, ContextMenu, useContextMenu, MoreButton, MobileOptionsPopover, ExpandableSearch, Button, IconButton } from '../common/index.js';
import { formatBytes, copyToClipboard } from '../../utils/index.js';
import { useStaticData } from '../../contexts/StaticDataContext.js';
import { useDataFetch } from '../../contexts/DataFetchContext.js';
import { useTableState, useSelectionMode, useDynamicFontSize } from '../../hooks/index.js';
import { SharedFileInfoModal } from '../modals/index.js';

const { createElement: h, useEffect, useState, useCallback } = React;

/**
 * Shared files view component - now uses contexts directly
 */
const SharedView = () => {
  // Get data from contexts
  const { dataShared, dataLoaded } = useStaticData();
  const { fetchShared, refreshSharedFiles } = useDataFetch();

  // Dynamic font size hook for responsive filename sizing
  const getDynamicFontSize = useDynamicFontSize();

  // Fetch shared files on mount
  useEffect(() => {
    fetchShared();
  }, [fetchShared]);

  // Use table state hook for filtering, sorting, and pagination
  const {
    filteredData: shared,
    sortedData: sortedShared,
    paginatedData,
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
    data: dataShared,
    viewKey: 'shared',
    filterField: 'fileName',
    defaultSort: { sortBy: 'fileName', sortDirection: 'asc' },
    useFileNameAsSecondary: true
  });

  // Track which file's ED2K link was recently copied
  const [copiedHash, setCopiedHash] = useState(null);

  // Info modal state
  const [infoModalFile, setInfoModalFile] = useState(null);

  // Context menu
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();

  // Selection mode
  const {
    selectionMode,
    selectedFiles,
    selectedCount,
    toggleSelectionMode,
    toggleFileSelection,
    clearAllSelections
  } = useSelectionMode();
  const [exportCopied, setExportCopied] = useState(false);

  // Batch export ED2K links
  const handleBatchExport = useCallback(async () => {
    const selectedShared = dataShared.filter(f => selectedFiles.has(f.fileHash));
    const links = selectedShared
      .map(f => f.raw?.EC_TAG_PARTFILE_ED2K_LINK)
      .filter(link => link)
      .join('\n');

    if (links) {
      const success = await copyToClipboard(links);
      if (success) {
        setExportCopied(true);
        setTimeout(() => setExportCopied(false), 2000);
      }
    }
  }, [dataShared, selectedFiles]);

  // Copy ED2K link to clipboard
  const handleCopyEd2kLink = useCallback(async (item) => {
    const ed2kLink = item.raw?.EC_TAG_PARTFILE_ED2K_LINK;
    if (ed2kLink) {
      const success = await copyToClipboard(ed2kLink);
      if (success) {
        setCopiedHash(item.fileHash);
        setTimeout(() => setCopiedHash(null), 2000);
      }
    }
  }, []);

  // Refresh handler
  const onRefresh = fetchShared;
  const onReloadSharedFiles = refreshSharedFiles;

  // Get context menu items for a file
  const getContextMenuItems = useCallback((item) => {
    if (!item) return [];
    const hasEd2kLink = !!item.raw?.EC_TAG_PARTFILE_ED2K_LINK;
    const isCopied = copiedHash === item.fileHash;

    return [
      {
        label: 'File Info',
        icon: 'info',
        iconColor: 'text-blue-600 dark:text-blue-400',
        onClick: () => {
          setInfoModalFile(item);
          closeContextMenu();
        }
      },
      { divider: true },
      {
        label: isCopied ? 'Copied!' : 'Export ED2K Link',
        icon: isCopied ? 'check' : 'share',
        iconColor: isCopied ? 'text-green-600 dark:text-green-400' : 'text-cyan-600 dark:text-cyan-400',
        disabled: !hasEd2kLink,
        onClick: () => {
          handleCopyEd2kLink(item);
          closeContextMenu();
        }
      }
    ];
  }, [copiedHash, handleCopyEd2kLink, closeContextMenu]);

  // Handle right-click on table row
  const handleRowContextMenu = useCallback((e, item) => {
    openContextMenu(e, item);
  }, [openContextMenu]);

  const columns = [
    {
      label: 'File Name',
      key: 'fileName',
      sortable: true,
      width: 'auto',
      render: (item) =>
        h('div', {
          className: 'font-medium break-words whitespace-normal',
          style: { wordBreak: 'break-all', overflowWrap: 'anywhere' }
        }, item.fileName)
    },
    {
      label: 'Size',
      key: 'fileSize',
      sortable: true,
      width: '100px',
      render: (item) => formatBytes(item.fileSize)
    },
    {
      label: 'Total Upload',
      key: 'transferredTotal',
      sortable: true,
      width: '140px',
      render: (item) => formatBytes(item.transferredTotal) + ` (${item.acceptedCountTotal})`
    },
    {
      label: 'Session Upload',
      key: 'transferred',
      sortable: true,
      width: '140px',
      render: (item) => formatBytes(item.transferred) + ` (${item.acceptedCount})`
    }
  ];

  return h('div', { className: 'space-y-2 sm:space-y-3' },
    // Mobile/tablet header with title + compact controls
    h('div', { className: 'flex lg:hidden items-center gap-2 pl-1' },
      h('h2', { className: 'text-base font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap' }, `Shared Files (${shared.length})`),
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
          }),
          h(IconButton, {
            key: 'select',
            variant: selectionMode ? 'danger' : 'secondary',
            icon: selectionMode ? 'x' : 'check',
            iconSize: 18,
            onClick: toggleSelectionMode,
            title: selectionMode ? 'Exit Selection Mode' : 'Select Files'
          }),
          h(Button, {
            key: 'reload',
            variant: 'success',
            onClick: onReloadSharedFiles,
            disabled: !dataLoaded.shared,
            icon: dataLoaded.shared ? 'folderSync' : null,
            title: 'Reload Files'
          }, dataLoaded.shared ? 'Reload' : h('span', { className: 'flex items-center gap-2' }, h('div', { className: 'loader' }), 'Loading...'))
        ]
      })
    ),
    // Desktop header
    h('div', { className: 'hidden lg:flex justify-between items-center gap-3 pl-2' },
      h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, `Shared Files (${shared.length})`),
      h('div', { className: 'flex gap-2' },
        h(FilterInput, {
          value: filterText,
          onChange: setFilterText,
          onClear: clearFilter,
          placeholder: 'Filter by file name...',
          className: 'w-56'
        }),
        h(Button, {
          variant: 'primary',
          onClick: onRefresh,
          disabled: !dataLoaded.shared,
          icon: dataLoaded.shared ? 'refresh' : null
        }, dataLoaded.shared ? 'Refresh' : h('span', { className: 'flex items-center gap-2' }, h('div', { className: 'loader' }), 'Loading...')),
        h(Button, {
          variant: 'success',
          onClick: onReloadSharedFiles,
          disabled: !dataLoaded.shared,
          icon: dataLoaded.shared ? 'folderSync' : null
        }, dataLoaded.shared ? 'Reload Files' : h('span', { className: 'flex items-center gap-2' }, h('div', { className: 'loader' }), 'Loading...')),
        h(Button, {
          variant: selectionMode ? 'danger' : 'purple',
          onClick: toggleSelectionMode,
          icon: selectionMode ? 'x' : 'check'
        }, selectionMode ? 'Exit Selection Mode' : 'Select Files')
      )
    ),

    shared.length === 0 ? h('div', { className: 'text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400' },
      !dataLoaded.shared ? 'Loading shared files...' : (filterText ? 'No shared files match the filter' : 'No shared files')
    ) : h('div', null,
      // Mobile card view
      h(MobileCardView, {
        data: paginatedData,
        columns,
        actions: null,
        options: {
          customRender: (item, idx) => {
            const isSelected = selectionMode && selectedFiles.has(item.fileHash);
            const selectedClass = isSelected ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600' : '';

            return h('div', {
              className: `p-3 rounded-lg ${isSelected ? selectedClass : `${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800/50'} border border-gray-200 dark:border-gray-700`}`
            },
              // Header with file name and context menu button
              h('div', { className: 'flex items-start gap-2 mb-2' },
                // Checkbox in selection mode
                selectionMode && h('input', {
                  type: 'checkbox',
                  checked: isSelected,
                  onChange: () => toggleFileSelection(item.fileHash),
                  className: 'w-5 h-5 mt-1 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer flex-shrink-0'
                }),
                h('div', {
                  className: 'flex-1 font-medium text-sm text-gray-900 dark:text-gray-100',
                  style: {
                    fontSize: getDynamicFontSize(item.fileName),
                    wordBreak: 'break-all',
                    overflowWrap: 'anywhere',
                    lineHeight: '1.4'
                  },
                  onClick: selectionMode ? () => toggleFileSelection(item.fileHash) : undefined
                },
                  item.fileName
                ),
                // Context menu button (hidden in selection mode)
                !selectionMode && h(MoreButton, {
                  onClick: (e) => openContextMenu(e, item, e.currentTarget)
                })
              ),
              // Size + Session Upload + Total Upload on one line with icons
              h('div', { className: 'flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 flex-wrap' },
                // Size with icon
                h(Icon, { name: 'harddrive', size: 12, className: 'text-gray-500 dark:text-gray-400' }),
                h('span', { className: 'text-gray-900 dark:text-gray-100' }, formatBytes(item.fileSize)),
                h('span', { className: 'text-gray-400' }, '·'),
                // Session upload with icon
                h(Icon, { name: 'upload', size: 12, className: 'text-gray-500 dark:text-gray-400' }),
                h('span', { className: 'text-gray-500 dark:text-gray-400' }, 'Session:'),
                h('span', { className: 'text-gray-900 dark:text-gray-100' }, formatBytes(item.transferred) + ` (${item.acceptedCount})`),
                h('span', { className: 'text-gray-400' }, '·'),
                // Total upload
                h('span', { className: 'text-gray-500 dark:text-gray-400' }, 'Total:'),
                h('span', { className: 'text-gray-900 dark:text-gray-100' }, formatBytes(item.transferredTotal) + ` (${item.acceptedCountTotal})`)
              )
            );
          }
        }
      }),
      // Mobile bulk action footer (only shown in selection mode on mobile) - before pagination
      selectionMode && h('div', { className: 'lg:hidden mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600' },
        h('div', { className: 'flex flex-wrap items-center justify-between gap-3' },
          h('div', { className: 'text-sm text-gray-700 dark:text-gray-300' },
            h('span', { className: 'font-semibold' }, `${selectedCount} file${selectedCount !== 1 ? 's' : ''} selected`),
            selectedCount > 0 && h('button', {
              onClick: clearAllSelections,
              className: 'ml-3 text-blue-600 dark:text-blue-400 hover:underline'
            }, 'Clear all')
          ),
          selectedCount > 0 && h('div', { className: 'flex flex-wrap gap-2' },
            h(Button, {
              variant: exportCopied ? 'success' : 'purple',
              onClick: handleBatchExport,
              disabled: exportCopied,
              icon: exportCopied ? 'check' : 'share',
              iconSize: 14
            }, exportCopied ? 'Copied!' : 'Export Links')
          )
        )
      ),
      // Mobile/tablet pagination
      h(PaginationControls, { page, onPageChange, pagesCount, pageSize, onPageSizeChange, options: { mobileOnly: true, breakpoint: 'lg' } }),
      // Desktop table view
      h('div', { className: 'hidden lg:block' },
        h(Table, {
          data: sortedShared,
          columns,
          actions: (item) => {
            // In selection mode, show checkbox
            if (selectionMode) {
              const isSelected = selectedFiles.has(item.fileHash);
              return h('div', { className: 'flex items-center justify-center' },
                h('input', {
                  type: 'checkbox',
                  checked: isSelected,
                  onChange: () => toggleFileSelection(item.fileHash),
                  className: 'w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer'
                })
              );
            }

            // Normal mode - show action buttons
            const hasEd2kLink = !!item.raw?.EC_TAG_PARTFILE_ED2K_LINK;
            const isCopied = copiedHash === item.fileHash;

            return h('div', { className: 'flex items-center gap-1.5' },
              // Info button
              h('button', {
                onClick: () => setInfoModalFile(item),
                className: 'px-2 py-1 sm:py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors',
                title: 'File Info'
              },
                h(Icon, {
                  name: 'info',
                  size: 14,
                  className: 'text-blue-600 dark:text-blue-400 block'
                }),
                h('span', { className: 'text-blue-600 dark:text-blue-400' }, 'Info')
              ),
              // Export ED2K button
              h('button', {
                onClick: () => handleCopyEd2kLink(item),
                disabled: !hasEd2kLink,
                className: `px-2 py-1 sm:py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-sm ${isCopied ? 'bg-green-100 dark:bg-green-900/30' : 'bg-cyan-100 dark:bg-cyan-900/30 hover:bg-cyan-200 dark:hover:bg-cyan-900/50'} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`,
                title: isCopied ? 'Copied!' : 'Export'
              },
                h(Icon, {
                  name: isCopied ? 'check' : 'share',
                  size: 14,
                  className: `${isCopied ? 'text-green-600 dark:text-green-400' : 'text-cyan-600 dark:text-cyan-400'} block`
                }),
                h('span', {
                  className: isCopied ? 'text-green-600 dark:text-green-400' : 'text-cyan-600 dark:text-cyan-400'
                }, isCopied ? 'Copied!' : 'Export')
              )
            );
          },
          currentSortBy: sortConfig.sortBy,
          currentSortDirection: sortConfig.sortDirection,
          onSortChange,
          page,
          onPageChange,
          pageSize,
          onPageSizeChange,
          getRowClassName: (item) => {
            // Highlight selected rows in selection mode
            if (selectionMode && selectedFiles.has(item.fileHash)) {
              return '!bg-purple-100 dark:!bg-purple-900/40 hover:!bg-purple-200 dark:hover:!bg-purple-900/60';
            }
            return '';
          },
          onRowContextMenu: selectionMode ? undefined : handleRowContextMenu,
          beforePagination: selectionMode ? h('div', { className: 'mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600' },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-3' },
              h('div', { className: 'text-sm text-gray-700 dark:text-gray-300' },
                h('span', { className: 'font-semibold' }, `${selectedCount} file${selectedCount !== 1 ? 's' : ''} selected`),
                selectedCount > 0 && h('button', {
                  onClick: clearAllSelections,
                  className: 'ml-3 text-blue-600 dark:text-blue-400 hover:underline'
                }, 'Clear all')
              ),
              selectedCount > 0 && h('div', { className: 'flex flex-wrap gap-2' },
                h(Button, {
                  variant: exportCopied ? 'success' : 'purple',
                  onClick: handleBatchExport,
                  disabled: exportCopied,
                  icon: exportCopied ? 'check' : 'share',
                  iconSize: 14
                }, exportCopied ? 'Copied!' : 'Export Links')
              )
            )
          ) : null
        })
      )
    ),

    // Context menu
    h(ContextMenu, {
      show: contextMenu.show,
      x: contextMenu.x,
      y: contextMenu.y,
      items: getContextMenuItems(contextMenu.item),
      onClose: closeContextMenu,
      anchorEl: contextMenu.anchorEl
    }),

    // Info modal
    h(SharedFileInfoModal, {
      show: !!infoModalFile,
      file: infoModalFile,
      onClose: () => setInfoModalFile(null)
    })
  );
};

export default SharedView;
