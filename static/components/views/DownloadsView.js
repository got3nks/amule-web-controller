/**
 * DownloadsView Component
 *
 * Displays current downloads with progress, categorization, and ED2K link input
 * Manages its own modals: fileCategoryModal, downloadInfoModal
 * Uses contexts directly for all data and actions
 */

import React from 'https://esm.sh/react@18.2.0';
import { Icon, Table, Tooltip, MobileCardView, PaginationControls, SegmentsBar, DeleteModal, FilterInput, ContextMenu, useContextMenu, MoreButton, MobileOptionsPopover, ExpandableSearch, Button, Select, IconButton } from '../common/index.js';
import { formatBytes, formatSpeed, getProgressColor, getCategoryColorStyle, formatDateTime, formatLastSeenComplete, getTimeBasedColor, copyToClipboard } from '../../utils/index.js';
import { DOWNLOAD_STATUS } from '../../utils/constants.js';
import { useModal, useTableState, useSelectionMode, useDynamicFontSize } from '../../hooks/index.js';
import { useLiveData } from '../../contexts/LiveDataContext.js';
import { useStaticData } from '../../contexts/StaticDataContext.js';
import { useDataFetch } from '../../contexts/DataFetchContext.js';
import { useActions } from '../../contexts/ActionsContext.js';
import { useTheme } from '../../contexts/ThemeContext.js';
import FileCategoryModal from '../modals/FileCategoryModal.js';
import DownloadInfoModal from '../modals/DownloadInfoModal.js';
import AddEd2kModal from '../modals/AddEd2kModal.js';

const { createElement: h, useMemo, useState, useCallback } = React;

// Progress bar constants
const PROGRESS_BAR_CONFIG = {
  desktop: { width: 280, strokeWidth: '1px', showSize: false, touchEnabled: false },
  mobile: { width: 400, strokeWidth: '0.5px', showSize: true, touchEnabled: true }
};

/**
 * Unified Progress Bar Cell Component
 * Shows simple progress bar normally, segmented bar on hover/touch
 * @param {Object} props
 * @param {Object} props.item - Download item with progress data
 * @param {string} props.theme - 'dark' or 'light'
 * @param {string} props.variant - 'desktop' or 'mobile'
 */
const ProgressBarCell = ({ item, theme, variant = 'desktop' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isDark = theme === 'dark';
  const config = PROGRESS_BAR_CONFIG[variant];

  const containerProps = {
    className: variant === 'mobile' ? 'w-full mb-2' : 'w-full min-w-[160px]',
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false)
  };

  // Add touch handlers for mobile
  if (config.touchEnabled) {
    containerProps.onTouchStart = () => setIsHovered(true);
    containerProps.onTouchEnd = () => setTimeout(() => setIsHovered(false), 2000);
  }

  // Progress label text
  const progressLabel = config.showSize
    ? `${item.progress}% (${formatBytes(item.fileSizeDownloaded)} / ${formatBytes(item.fileSize)})`
    : `${item.progress}%`;

  return h('div', containerProps,
    h('div', { className: 'w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 relative overflow-hidden' },
      // Show segmented bar on hover/touch, simple bar otherwise
      isHovered
        ? h(SegmentsBar, {
            fileSize: parseInt(item.fileSize),
            fileSizeDownloaded: parseInt(item.fileSizeDownloaded),
            partStatus: item.partStatus,
            gapStatus: item.gapStatus,
            reqStatus: item.reqStatus,
            sourceCount: parseInt(item.sourceCount),
            width: config.width,
            height: 20
          })
        : h('div', {
            className: `h-full rounded-full transition-all duration-300 ${getProgressColor(item.progress)}`,
            style: { width: `${item.progress}%` }
          }),
      // Progress text overlay with outline
      h('span', {
        className: `absolute inset-0 flex items-center justify-center font-bold text-gray-900 dark:text-white pointer-events-none ${variant === 'mobile' ? 'text-xs sm:text-sm' : 'text-xs'}`,
        style: {
          WebkitTextStroke: isDark ? `${config.strokeWidth} black` : `${config.strokeWidth} white`,
          textShadow: isDark ? '0 0 1px black, 0 0 1px black' : '0 0 1px white, 0 0 1px white',
          paintOrder: 'stroke fill'
        }
      },
        progressLabel
      )
    )
  );
};

/**
 * Format source count display with detailed breakdown
 * @param {Object} item - Download item with source counts
 * @returns {string} Formatted source display
 */
const formatSourceDisplay = (item) => {
  const {
    sourceCount = 0,
    sourceCountNotCurrent = 0,
    sourceCountXfer = 0,
    sourceCountA4AF = 0
  } = item;

  let display = '';

  // Main source count display
  if (sourceCountNotCurrent !== 0) {
    const current = sourceCount - sourceCountNotCurrent;
    display = `${current}/${sourceCount}`;
  } else {
    display = `${sourceCount}`;
  }

  // Active transfers
  display += ` (${sourceCountXfer})`;

  // A4AF sources (Asked For Another File)
  if (sourceCountA4AF !== 0) {
    display += ` +${sourceCountA4AF}`;
  }

  return display;
};

/**
 * Downloads view component - now uses contexts directly
 */
const DownloadsView = () => {
  // Get data from contexts
  const { dataDownloads, dataLoaded: liveDataLoaded } = useLiveData();
  const { dataCategories, dataDownloadsEd2kLinks, setDataDownloadsEd2kLinks } = useStaticData();
  const dataLoaded = { downloads: liveDataLoaded.downloads };
  const { fetchDownloads } = useDataFetch();
  const actions = useActions();
  const { theme } = useTheme();

  // Dynamic font size hook for responsive filename sizing
  const getDynamicFontSize = useDynamicFontSize();

  // Local state (was in CategoryContext, but only used by this view)
  const [categorySelectedId, setCategorySelectedId] = useState(0); // Category for new ED2K downloads
  const [categoryFilterId, setCategoryFilterId] = useState(0); // Category filter for displayed downloads

  // Apply category filter first, then pass to useTableState for text filtering/sorting/pagination
  const categoryFilteredDownloads = useMemo(() => {
    return categoryFilterId === 0
      ? dataDownloads
      : dataDownloads.filter(download => (download.category || 0) === categoryFilterId);
  }, [dataDownloads, categoryFilterId]);

  // Use table state hook for text filtering, sorting, and pagination
  const {
    filteredData: filteredDownloads,
    sortedData: sortedFilteredDownloads,
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
    data: categoryFilteredDownloads,
    viewKey: 'downloads',
    filterField: 'fileName',
    defaultSort: { sortBy: 'fileName', sortDirection: 'asc' },
    useFileNameAsSecondary: true
  });

  // Aliases for readability
  const downloads = dataDownloads;
  const categories = dataCategories;
  const ed2kLinks = dataDownloadsEd2kLinks;
  const filterCategoryId = categoryFilterId;
  const selectedCategoryId = categorySelectedId;
  const allDownloads = dataDownloads; // for modal

  // Modal state management
  const { modal: fileCategoryModal, open: openFileCategoryModal, close: closeFileCategoryModal, update: updateFileCategoryModal } = useModal({
    fileHash: null,
    fileName: '',
    fileCount: 0,
    currentCategoryId: 0,
    selectedCategoryId: 0
  });

  const { modal: downloadInfoModal, open: openDownloadInfoModal, close: closeDownloadInfoModal } = useModal({
    download: null
  });

  const { modal: deleteModal, open: openDeleteModal, close: closeDeleteModal } = useModal({
    fileHash: null,
    fileName: '',
    isBatch: false,
    itemCount: 0,
    onBatchDeleteSuccess: null
  });

  const { modal: addEd2kModal, open: openAddEd2kModal, close: closeAddEd2kModal } = useModal({});

  // Selection mode
  const {
    selectionMode,
    selectedFiles,
    selectedCount,
    toggleSelectionMode,
    toggleFileSelection,
    clearAllSelections,
    getSelectedHashes
  } = useSelectionMode();
  const [exportCopied, setExportCopied] = useState(false);

  // Context menu
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();

  // Local handlers
  const onEd2kLinksChange = setDataDownloadsEd2kLinks;
  const onSelectedCategoryIdChange = setCategorySelectedId;
  const onFilterCategoryChange = setCategoryFilterId;
  const onPauseDownload = actions.files.pause;
  const onResumeDownload = actions.files.resume;
  const onAddEd2kLinks = actions.search.addEd2kLinks;
  const onBatchPause = actions.batch.pause;
  const onBatchResume = actions.batch.resume;

  // Delete modal handlers
  const handleDeleteClick = useCallback((fileHash, fileName) => {
    openDeleteModal({ fileHash, fileName, isBatch: false });
  }, [openDeleteModal]);

  const handleBatchDeleteClick = useCallback((fileHashes, onSuccess) => {
    openDeleteModal({
      fileHash: fileHashes,
      fileName: null,
      isBatch: true,
      itemCount: fileHashes.length,
      onBatchDeleteSuccess: onSuccess
    });
  }, [openDeleteModal]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteModal.isBatch) {
      const fileHashes = Array.isArray(deleteModal.fileHash) ? deleteModal.fileHash : [deleteModal.fileHash];
      fileHashes.forEach(fileHash => {
        actions.files.deleteFile(fileHash);
      });
      if (deleteModal.onBatchDeleteSuccess) {
        deleteModal.onBatchDeleteSuccess();
      }
    } else {
      actions.files.deleteFile(deleteModal.fileHash);
    }
    closeDeleteModal();
    setTimeout(() => fetchDownloads(), 100);
  }, [deleteModal, actions.files, closeDeleteModal, fetchDownloads]);

  // Modal handlers
  const handleSetFileCategory = (fileHash, fileName, currentCategoryId) => {
    openFileCategoryModal({
      fileHash,
      fileName,
      fileCount: 0,
      currentCategoryId,
      selectedCategoryId: currentCategoryId
    });
  };

  const handleShowInfo = (download) => {
    openDownloadInfoModal({ download });
  };

  const handleBatchSetCategory = (fileHashes) => {
    openFileCategoryModal({
      fileHash: fileHashes,
      fileName: '',
      fileCount: fileHashes.length,
      currentCategoryId: 0,
      selectedCategoryId: 0
    });
  };

  const handleFileCategorySubmit = (fileHash, categoryId) => {
    actions.categories.setFileCategory(fileHash, categoryId);
    closeFileCategoryModal();
  };

  // Bulk operations
  const handleBatchPause = () => {
    onBatchPause(getSelectedHashes());
  };

  const handleBatchResume = () => {
    onBatchResume(getSelectedHashes());
  };

  const handleBatchDelete = () => {
    handleBatchDeleteClick(getSelectedHashes(), clearAllSelections);
  };

  const handleBatchSetCategoryClick = () => {
    handleBatchSetCategory(getSelectedHashes());
  };

  const handleBatchExport = async () => {
    const selectedDownloads = downloads.filter(d => selectedFiles.has(d.fileHash));
    const ed2kLinks = selectedDownloads
      .map(d => d.raw?.EC_TAG_PARTFILE_ED2K_LINK)
      .filter(link => link)
      .join('\n');

    if (ed2kLinks) {
      const success = await copyToClipboard(ed2kLinks);
      if (success) {
        setExportCopied(true);
        setTimeout(() => setExportCopied(false), 2000);
      }
    }
  };

  // Copy ED2K link to clipboard
  const handleCopyEd2kLink = useCallback(async (item) => {
    const ed2kLink = item.raw?.EC_TAG_PARTFILE_ED2K_LINK;
    if (ed2kLink) {
      await copyToClipboard(ed2kLink);
    }
  }, []);

  // Generate context menu items for an item
  const getContextMenuItems = useCallback((item) => {
    if (!item) return [];
    const isPaused = item.status === DOWNLOAD_STATUS.PAUSED;
    const hasEd2kLink = !!item.raw?.EC_TAG_PARTFILE_ED2K_LINK;
    return [
      {
        label: 'Download Details',
        icon: 'info',
        iconColor: 'text-blue-600 dark:text-blue-400',
        onClick: () => handleShowInfo(item)
      },
      {
        label: 'Change Category',
        icon: 'folder',
        iconColor: 'text-orange-600 dark:text-orange-400',
        onClick: () => handleSetFileCategory(item.fileHash, item.fileName, item.category || 0)
      },
      {
        label: isPaused ? 'Resume' : 'Pause',
        icon: isPaused ? 'play' : 'pause',
        iconColor: isPaused ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400',
        onClick: () => isPaused ? onResumeDownload(item.fileHash) : onPauseDownload(item.fileHash)
      },
      {
        label: 'Export ED2K Link',
        icon: 'share',
        iconColor: 'text-cyan-600 dark:text-cyan-400',
        onClick: () => handleCopyEd2kLink(item),
        disabled: !hasEd2kLink
      },
      { divider: true },
      {
        label: 'Delete',
        icon: 'trash',
        iconColor: 'text-red-600 dark:text-red-400',
        onClick: () => handleDeleteClick(item.fileHash, item.fileName)
      }
    ];
  }, [handleShowInfo, handleSetFileCategory, onResumeDownload, onPauseDownload, handleCopyEd2kLink, handleDeleteClick]);

  // Handle right-click context menu for table rows
  const handleRowContextMenu = useCallback((e, item) => {
    if (selectionMode) return; // Disable context menu in selection mode
    openContextMenu(e, item);
  }, [selectionMode, openContextMenu]);

  // Handle mobile more button click
  const handleMoreButtonClick = useCallback((e, item, buttonRef) => {
    openContextMenu(e, item, buttonRef);
  }, [openContextMenu]);

  const columns = [
    {
      label: 'File Name',
      key: 'fileName',
      sortable: true,
      width: 'auto',
      render: (item) => {
        const isPaused = item.status === DOWNLOAD_STATUS.PAUSED;
        return h('div', {
          className: 'flex items-center gap-2 font-medium break-words whitespace-normal',
          style: { wordBreak: 'break-word', overflowWrap: 'anywhere' }
        },
          h('div', { className: 'flex-shrink-0' },
            h(Icon, {
              name: isPaused ? 'pause' : 'download',
              size: 16,
              className: isPaused ? 'text-orange-500 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'
            })
          ),
          h('span', null, item.fileName)
        );
      }
    },
    {
      label: 'Progress',
      key: 'progress',
      sortable: true,
      width: '180px',
      render: (item) => {
        // Create a component to manage hover state
        return h(ProgressBarCell, { item, theme });
      }
    },
    {
      label: 'Size',
      key: 'fileSize',
      sortable: true,
      width: '100px',
      render: (item) => formatBytes(item.fileSize)
    },
    {
      label: 'Sources',
      key: 'sourceCount',
      sortable: true,
      width: '120px',
      render: (item) => {
        const sourceText = formatSourceDisplay(item);
        const colorClass = getTimeBasedColor(item.lastSeenComplete);
        const formattedLastSeen = formatLastSeenComplete(item.lastSeenComplete);

        // Tooltip shows only last seen complete
        const tooltipContent = h('div', null,
          h('div', { className: 'font-semibold' }, 'Last seen complete:'),
          h('div', null, formattedLastSeen)
        );

        return h(Tooltip, {
          content: tooltipContent,
          position: 'top'
        },
          h('span', {
            className: `${colorClass} cursor-help font-mono text-sm`
          }, sourceText)
        );
      }
    },
    {
      label: 'Speed',
      key: 'speed',
      sortable: true,
      width: '100px',
      render: (item) => h('span', { className: 'font-mono text-blue-600 dark:text-blue-400' }, formatSpeed(item.speed))
    },
    {
      label: 'Category',
      key: 'category',
      sortable: true,
      width: '140px',
      render: (item) => {
        const catId = item.category || 0;
        const cat = categories.find(c => c.id === catId);
        const categoryName = catId === 0 ? 'Default (all)' : (cat?.title || 'Unknown');
        const categoryColor = cat?.color || 0xCCCCCC;

        return h('button', {
          onClick: () => handleSetFileCategory(item.fileHash, item.fileName, catId),
          title: 'Click to change category',
          className: 'text-sm px-2 py-1 rounded flex items-center gap-1 hover:opacity-80 transition-opacity'
        },
          h('div', {
            className: 'w-3 h-3 rounded border border-gray-300 dark:border-gray-600',
            style: { backgroundColor: `#${categoryColor.toString(16).padStart(6, '0')}` }
          }),
          h('span', null, categoryName)
        );
      }
    }
  ];

  return h('div', { className: 'space-y-2 sm:space-y-3' },
    // Mobile/tablet header with title + compact controls
    h('div', { className: 'flex xl:hidden items-center gap-2 pl-1' },
      h('h2', { className: 'text-base font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap' }, `Downloads (${filteredDownloads.length})`),
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
            onSortChange,
            categories,
            filterCategoryId,
            onFilterCategoryChange
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
            key: 'add',
            variant: 'success',
            onClick: openAddEd2kModal,
            icon: 'plus',
            title: 'Add ED2K Link'
          }, 'Add')
        ]
      })
    ),
    // Desktop header
    h('div', { className: 'hidden xl:flex justify-between items-center gap-3 pl-2' },
      h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, `Downloads (${filteredDownloads.length})`),
      h('div', { className: 'flex gap-2' },
        h(FilterInput, {
          value: filterText,
          onChange: setFilterText,
          onClear: clearFilter,
          placeholder: 'Filter by file name...',
          className: 'w-56'
        }),
        h(Select, {
          value: filterCategoryId,
          onChange: (e) => onFilterCategoryChange(parseInt(e.target.value)),
          options: [
            { value: 0, label: 'Default (all)' },
            ...categories.filter(cat => cat.id !== 0).map(cat => ({ value: cat.id, label: cat.title }))
          ]
        }),
        h(Button, {
          variant: selectionMode ? 'danger' : 'purple',
          onClick: toggleSelectionMode,
          icon: selectionMode ? 'x' : 'check'
        }, selectionMode ? 'Exit Selection Mode' : 'Select Files'),
        h(Button, {
          variant: 'success',
          onClick: openAddEd2kModal,
          icon: 'plus'
        }, 'Add')
      )
    ),

    filteredDownloads.length === 0 ? h('div', { className: 'text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400' },
      !dataLoaded.downloads ? 'Loading downloads...' : (filterText ? 'No downloads match the filter' : (filterCategoryId === 0 ? 'No active downloads' : 'No downloads in this category'))
    ) : h('div', null,
      // Mobile/tablet card view (MobileCardView handles visibility via xl:hidden)
      h(MobileCardView, {
          data: paginatedData,
          columns,
          options: {
            breakpoint: 'xl',
            customRender: (item, idx) => {
              const catId = item.category || 0;
              const cat = categories.find(c => c.id === catId);
              const isDefault = catId === 0;
              const categoryColorStyle = getCategoryColorStyle(cat, isDefault);

              // Highlight if selected in selection mode
              const isSelected = selectionMode && selectedFiles.has(item.fileHash);
              const selectedClass = isSelected ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600' : '';

              return h('div', {
                className: `p-3 rounded-lg ${isSelected ? selectedClass : `${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800/50'} border border-gray-200 dark:border-gray-700`} relative overflow-hidden`,
                style: categoryColorStyle || {}
              },
                // Header with file name, folder and delete buttons
                h('div', { className: 'flex items-start gap-2 mb-2' },
                  // Checkbox in selection mode
                  selectionMode && h('input', {
                    type: 'checkbox',
                    checked: isSelected,
                    onChange: () => toggleFileSelection(item.fileHash),
                    className: 'w-5 h-5 mt-1 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer flex-shrink-0'
                  }),
                  h('div', {
                    className: 'flex-1 flex items-start gap-1.5 font-medium text-gray-900 dark:text-gray-100 min-w-0',
                    onClick: selectionMode ? () => toggleFileSelection(item.fileHash) : undefined
                  },
                    // Pause icon (only shown when paused)
                    item.status === DOWNLOAD_STATUS.PAUSED && h(Icon, {
                      name: 'pause',
                      size: 14,
                      className: 'flex-shrink-0 text-orange-500 dark:text-orange-400 mt-[3px]'
                    }),
                    h('span', {
                      style: {
                        fontSize: getDynamicFontSize(item.fileName),
                        wordBreak: 'break-all',
                        overflowWrap: 'anywhere',
                        hyphens: 'auto',
                        lineHeight: '1.4'
                      }
                    }, item.fileName)
                  ),
                  // More button (hidden in selection mode) - opens context menu
                  !selectionMode && h(MoreButton, {
                    onClick: (e) => handleMoreButtonClick(e, item, e.currentTarget),
                    className: 'flex-shrink-0'
                  })
                ),
                // Progress bar with size info inside - use ProgressBarCell for hover effect
                h(ProgressBarCell, { item, theme, variant: 'mobile' }),
                // Sources and Speed in one line with icons
                h('div', { className: 'flex justify-between text-xs text-gray-700 dark:text-gray-300' },
                  h('div', { className: 'flex items-center gap-1' },
                    h(Icon, { name: 'share', size: 12, className: 'text-gray-500 dark:text-gray-400 flex-shrink-0' }),
                    h('span', { className: 'text-gray-500 dark:text-gray-400' }, 'Sources:'),
                    (() => {
                      const sourceText = formatSourceDisplay(item);
                      const colorClass = getTimeBasedColor(item.lastSeenComplete);
                      const formattedLastSeen = formatLastSeenComplete(item.lastSeenComplete);

                      // Tooltip shows only last seen complete
                      const tooltipContent = h('div', null,
                          h('div', { className: 'font-semibold' }, 'Last seen complete:'),
                          h('div', null, formattedLastSeen)
                      );

                      return h(Tooltip, {
                        content: tooltipContent,
                        position: 'right'
                      },
                        h('span', {
                          className: `${colorClass} cursor-help font-mono`
                        }, sourceText)
                      );
                    })()
                  ),
                  // Only show speed if > 0
                  item.speed > 0 && h('div', { className: 'flex items-center gap-1' },
                    h(Icon, { name: 'download', size: 12, className: 'text-blue-600 dark:text-blue-400 flex-shrink-0' }),
                    h('span', { className: 'font-mono text-blue-600 dark:text-blue-400' }, formatSpeed(item.speed))
                  )
                )
              );
            }
          }
      }),
      // Mobile bulk action footer (only shown in selection mode on mobile) - before pagination
      selectionMode && h('div', { className: 'xl:hidden mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600' },
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
              variant: 'warning',
              onClick: handleBatchPause,
              icon: 'pause',
              iconSize: 14
            }, 'Pause'),
            h(Button, {
              variant: 'success',
              onClick: handleBatchResume,
              icon: 'play',
              iconSize: 14
            }, 'Resume'),
            h(Button, {
              variant: 'orange',
              onClick: handleBatchSetCategoryClick,
              icon: 'folder',
              iconSize: 14
            }, 'Category'),
            h(Button, {
              variant: exportCopied ? 'success' : 'purple',
              onClick: handleBatchExport,
              disabled: exportCopied,
              icon: exportCopied ? 'check' : 'share',
              iconSize: 14
            }, exportCopied ? 'Copied!' : 'Export'),
            h(Button, {
              variant: 'danger',
              onClick: handleBatchDelete,
              icon: 'trash',
              iconSize: 14
            }, 'Delete')
          )
        )
      ),
      // Mobile/tablet pagination (hidden on xl+ where table is shown)
      h(PaginationControls, { page, onPageChange, pagesCount, pageSize, onPageSizeChange, options: { mobileOnly: true, breakpoint: 'xl' } }),
      // Desktop table view (xl and up)
      h('div', { className: 'hidden xl:block overflow-x-auto overflow-y-visible' },
        h(Table, {
          data: sortedFilteredDownloads,
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
            const isPaused = item.status === DOWNLOAD_STATUS.PAUSED;

            return h('div', { className: 'flex gap-1' },
              // Info button
              h('button', {
                onClick: () => handleShowInfo(item),
                className: 'p-1.5 rounded bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors',
                title: 'View detailed information'
              },
                h(Icon, { name: 'info', size: 14, className: 'text-blue-600 dark:text-blue-400' })
              ),
              // Pause/Resume button
              h('button', {
                onClick: () => isPaused ? onResumeDownload(item.fileHash) : onPauseDownload(item.fileHash),
                className: `p-1.5 rounded ${isPaused ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50' : 'bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'} transition-colors`,
                title: isPaused ? 'Resume download' : 'Pause download'
              },
                h(Icon, {
                  name: isPaused ? 'play' : 'pause',
                  size: 14,
                  className: isPaused ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                })
              ),
              // Delete button
              h('button', {
                onClick: () => handleDeleteClick(item.fileHash, item.fileName),
                className: 'p-1.5 rounded bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors',
                title: 'Delete download'
              },
                h(Icon, { name: 'trash', size: 14, className: 'text-red-600 dark:text-red-400' })
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
          onRowContextMenu: handleRowContextMenu,
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
                  variant: 'warning',
                  onClick: handleBatchPause,
                  icon: 'pause',
                  iconSize: 14
                }, 'Pause'),
                h(Button, {
                  variant: 'success',
                  onClick: handleBatchResume,
                  icon: 'play',
                  iconSize: 14
                }, 'Resume'),
                h(Button, {
                  variant: 'orange',
                  onClick: handleBatchSetCategoryClick,
                  icon: 'folder',
                  iconSize: 14
                }, 'Edit Category'),
                h(Button, {
                  variant: exportCopied ? 'success' : 'purple',
                  onClick: handleBatchExport,
                  disabled: exportCopied,
                  icon: exportCopied ? 'check' : 'share',
                  iconSize: 14
                }, exportCopied ? 'Copied!' : 'Export Links'),
                h(Button, {
                  variant: 'danger',
                  onClick: handleBatchDelete,
                  icon: 'trash',
                  iconSize: 14
                }, 'Delete')
              )
            )
          ) : null
        })
      )
    ),

    // Modals
    h(FileCategoryModal, {
      show: fileCategoryModal.show,
      fileHash: fileCategoryModal.fileHash,
      fileName: fileCategoryModal.fileName,
      fileCount: fileCategoryModal.fileCount,
      currentCategoryId: fileCategoryModal.currentCategoryId,
      categories,
      selectedCategoryId: fileCategoryModal.selectedCategoryId,
      onSelectedCategoryChange: (categoryId) => updateFileCategoryModal({ selectedCategoryId: categoryId }),
      onSubmit: handleFileCategorySubmit,
      onClose: closeFileCategoryModal
    }),

    h(DownloadInfoModal, {
      show: downloadInfoModal.show,
      download: downloadInfoModal.download,
      downloads: allDownloads,
      categories,
      onClose: closeDownloadInfoModal
    }),

    h(DeleteModal, {
      show: deleteModal.show,
      itemName: deleteModal.fileName,
      itemCount: deleteModal.itemCount,
      isBatch: deleteModal.isBatch,
      itemType: 'File',
      confirmLabel: 'Delete',
      onConfirm: handleConfirmDelete,
      onCancel: closeDeleteModal
    }),

    h(AddEd2kModal, {
      show: addEd2kModal.show,
      ed2kLinks,
      onEd2kLinksChange,
      selectedCategoryId,
      onSelectedCategoryChange: onSelectedCategoryIdChange,
      categories,
      onSubmit: () => onAddEd2kLinks(ed2kLinks, selectedCategoryId, false),
      onClose: closeAddEd2kModal
    }),

    // Context menu for downloads
    h(ContextMenu, {
      show: contextMenu.show,
      x: contextMenu.x,
      y: contextMenu.y,
      items: getContextMenuItems(contextMenu.item),
      onClose: closeContextMenu,
      anchorEl: contextMenu.anchorEl
    })
  );
};

export default DownloadsView;
