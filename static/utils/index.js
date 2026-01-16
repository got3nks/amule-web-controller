/**
 * Utilities Index
 *
 * Central export point for all utility modules
 */

// Formatters
export {
  formatBytes,
  formatSpeed,
  formatStatsValue,
  formatDateTime,
  formatLastSeenComplete,
  getTimeBasedColor,
  ipToString
} from './formatters.js';

// Validators
export {
  extractEd2kLinks,
  isValidEd2kLink
} from './validators.js';

// Colors
export {
  getProgressColor,
  getCategoryColorStyle,
  categoryColorToHex,
  hexToCategoryColor
} from './colors.js';

// Sorting
export {
  sortFiles,
  getNextSortDirection,
  createSortConfig
} from './sorting.js';

// Constants
export {
  PAGE_SIZE_DESKTOP,
  PAGE_SIZE_MOBILE,
  BREAKPOINT_MD,
  AUTO_REFRESH_INTERVAL,
  LOGS_REFRESH_INTERVAL,
  STATISTICS_REFRESH_INTERVAL,
  WS_INITIAL_RECONNECT_DELAY,
  WS_MAX_RECONNECT_DELAY,
  ERROR_DISPLAY_DURATION,
  DEFAULT_CATEGORY_ID,
  SEARCH_TYPES,
  SORT_DIRECTIONS,
  VIEWS,
  PRIORITIES,
  PRIORITY_LABELS,
  DOWNLOAD_STATUS,
  UI_TIMEOUTS,
  WIDGET_SETTINGS,
  PROGRESS_BAR,
  ICON_SIZES,
  CLIENT_SOFTWARE,
  CLIENT_SOFTWARE_LABELS
} from './constants.js';

// Pagination
export {
  calculatePagination,
  generatePageOptions,
  shouldShowPagination,
  getNavigationBounds
} from './pagination.js';

// Chart Loader
export {
  loadChartJs,
  isChartJsLoaded
} from './chartLoader.js';

// Clipboard
export {
  copyToClipboard
} from './clipboard.js';

// Markdown
export {
  parseMarkdownBold
} from './markdown.js';

// Network Status
export {
  getED2KStatus,
  getKADStatus,
  getStatusDotClass,
  getStatusBadgeClass,
  getStatusIcon
} from './networkStatus.js';
