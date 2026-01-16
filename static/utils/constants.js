/**
 * Application Constants
 *
 * Configuration values and constants used throughout the application
 */

// Pagination
export const PAGE_SIZE_DESKTOP = 20;
export const PAGE_SIZE_MOBILE = 10;

// Breakpoints (match Tailwind defaults)
export const BREAKPOINT_MD = 768; // px

// Refresh intervals (milliseconds)
export const AUTO_REFRESH_INTERVAL = 3000;        // Main data refresh
export const LOGS_REFRESH_INTERVAL = 5000;        // Logs refresh
export const STATISTICS_REFRESH_INTERVAL = 15000;  // Statistics refresh

// WebSocket reconnection
export const WS_INITIAL_RECONNECT_DELAY = 1000;   // ms
export const WS_MAX_RECONNECT_DELAY = 16000;      // ms

// Error display duration
export const ERROR_DISPLAY_DURATION = 4000;       // ms

// Default category ID
export const DEFAULT_CATEGORY_ID = 0;

// Search types
export const SEARCH_TYPES = {
  GLOBAL: 'global',
  LOCAL: 'local',
  KAD: 'kad'
};

// Sort directions
export const SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc'
};

// View names
export const VIEWS = {
  HOME: 'home',
  SEARCH: 'search',
  SEARCH_RESULTS: 'search-results',
  DOWNLOADS: 'downloads',
  UPLOADS: 'uploads',
  SHARED: 'shared',
  SERVERS: 'servers',
  CATEGORIES: 'categories',
  STATISTICS: 'statistics',
  LOGS: 'logs'
};

// Priority values
export const PRIORITIES = {
  NORMAL: 0,
  HIGH: 1,
  LOW: 2,
  AUTO: 3
};

// Priority labels
export const PRIORITY_LABELS = {
  [PRIORITIES.NORMAL]: 'Normal',
  [PRIORITIES.HIGH]: 'High',
  [PRIORITIES.LOW]: 'Low',
  [PRIORITIES.AUTO]: 'Auto'
};

// Download status codes
export const DOWNLOAD_STATUS = {
  DOWNLOADING: 0,
  PAUSED: 7
};

// UI Timeouts (milliseconds)
export const UI_TIMEOUTS = {
  COPY_FEEDBACK: 2000,           // "Copied!" feedback display
  SEARCH_DEBOUNCE: 300,          // Search input debounce
  FETCH_DELAY_SHORT: 100,        // Short delay before fetch (downloads)
  FETCH_DELAY_MEDIUM: 500,       // Medium delay before fetch (servers)
  SETUP_COMPLETION: 1000,        // Setup wizard completion delay
  MOBILE_TOUCH_HOVER: 2000,      // Mobile hover simulation on touch
  DASHBOARD_CACHE: 30000         // Dashboard data cache duration
};

// Widget settings
export const WIDGET_SETTINGS = {
  MAX_ITEMS: 50                  // Max items in dashboard widgets
};

// Progress bar dimensions (pixels)
export const PROGRESS_BAR = {
  DESKTOP_WIDTH: 280,
  MOBILE_WIDTH: 400,
  HEIGHT: 20
};

// Icon sizes (pixels)
export const ICON_SIZES = {
  SMALL: 12,
  MEDIUM: 14,
  LARGE: 16
};

// Client software types (for uploads view)
export const CLIENT_SOFTWARE = {
  EMULE: 0,
  AMULE: 1,
  XMULE: 2,
  AMULE_ALT: 3,
  MLDONKEY: 4,
  SHAREAZA: 5
};

// Client software labels
export const CLIENT_SOFTWARE_LABELS = {
  [CLIENT_SOFTWARE.EMULE]: 'eMule',
  [CLIENT_SOFTWARE.AMULE]: 'aMule',
  [CLIENT_SOFTWARE.XMULE]: 'xMule',
  [CLIENT_SOFTWARE.AMULE_ALT]: 'aMule',
  [CLIENT_SOFTWARE.MLDONKEY]: 'MLDonkey',
  [CLIENT_SOFTWARE.SHAREAZA]: 'Shareaza'
};
