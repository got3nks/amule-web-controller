/**
 * Chart.js Dynamic Loader
 *
 * Loads Chart.js library dynamically only when needed
 * Prevents blocking the initial page load
 */

let chartJsPromise = null;
let chartJsLoaded = false;

/**
 * Load Chart.js dynamically from CDN
 * @returns {Promise<void>}
 */
export const loadChartJs = () => {
  // If already loaded, return immediately
  if (chartJsLoaded && window.Chart) {
    return Promise.resolve();
  }

  // If currently loading, return existing promise
  if (chartJsPromise) {
    return chartJsPromise;
  }

  // Start loading
  chartJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    script.async = true;

    script.onload = () => {
      chartJsLoaded = true;
      resolve();
    };

    script.onerror = (error) => {
      console.error('Failed to load Chart.js:', error);
      chartJsPromise = null; // Reset so we can retry
      reject(new Error('Failed to load Chart.js'));
    };

    document.head.appendChild(script);
  });

  return chartJsPromise;
};

/**
 * Check if Chart.js is loaded
 * @returns {boolean}
 */
export const isChartJsLoaded = () => {
  return chartJsLoaded && !!window.Chart;
};
