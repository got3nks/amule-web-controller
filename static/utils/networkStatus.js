/**
 * Network Status Utilities
 *
 * CSS class and icon helpers for network status display.
 * Status parsing is done server-side (computeInstanceNetworkStatus in autoRefreshManager)
 * and shipped per-instance via combinedStats.instances[id].networkStatus.
 */

/**
 * Status types for network connections
 * @typedef {'green' | 'yellow' | 'red'} StatusColor
 */

/**
 * Get CSS class for status dot color
 * @param {StatusColor} status - Status color
 * @returns {string} Tailwind CSS class
 */
export const getStatusDotClass = (status) => {
  switch (status) {
    case 'green': return 'bg-green-500';
    case 'yellow': return 'bg-yellow-500';
    case 'red': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

/**
 * Get CSS classes for status badge
 * @param {StatusColor} status - Status color
 * @returns {string} Tailwind CSS classes for badge background and text
 */
export const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'green': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'yellow': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'red': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

/**
 * Get status icon prefix for display
 * @param {StatusColor} status - Status color
 * @returns {string} Unicode symbol
 */
export const getStatusIcon = (status) => {
  switch (status) {
    case 'green': return '✓';
    case 'yellow': return '⚠';
    case 'red': return '✗';
    default: return '•';
  }
};
