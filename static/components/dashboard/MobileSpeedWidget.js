/**
 * MobileSpeedWidget Component
 *
 * Compact speed chart with current speeds and network status for mobile view
 * Shows 24h speed history with simplified data points for performance
 */

import React from 'https://esm.sh/react@18.2.0';
import { formatSpeed } from '../../utils/index.js';
import { loadChartJs } from '../../utils/chartLoader.js';
import { getED2KStatus, getKADStatus, getStatusDotClass } from '../../utils/networkStatus.js';

const { createElement: h, useEffect, useRef, useState } = React;

/**
 * Downsample data for mobile performance
 * 288 points = 1 data point every 5 minutes for 24 hours
 * @param {Array} data - Original data array
 * @param {number} targetPoints - Target number of data points
 * @returns {Array} Downsampled data
 */
const downsampleData = (data, targetPoints = 288) => {
  if (!data || data.length <= targetPoints) return data;

  const step = Math.ceil(data.length / targetPoints);
  const result = [];

  for (let i = 0; i < data.length; i += step) {
    // Take the max value in each bucket to preserve peaks
    const bucket = data.slice(i, Math.min(i + step, data.length));
    const maxUpload = Math.max(...bucket.map(d => d.uploadSpeed || 0));
    const maxDownload = Math.max(...bucket.map(d => d.downloadSpeed || 0));
    result.push({
      timestamp: bucket[Math.floor(bucket.length / 2)].timestamp,
      uploadSpeed: maxUpload,
      downloadSpeed: maxDownload
    });
  }

  return result;
};


/**
 * MobileSpeedWidget component
 * @param {object} speedData - Speed history data from API
 * @param {object} stats - Current stats from WebSocket
 * @param {string} theme - Current theme (dark/light)
 */
const MobileSpeedWidget = ({ speedData, stats, theme }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const chartInstance = useRef(null);
  const [chartReady, setChartReady] = useState(false);

  // Load Chart.js library on mount
  useEffect(() => {
    loadChartJs().then(() => {
      setChartReady(true);
    }).catch(err => {
      console.error('Failed to load Chart.js:', err);
    });
  }, []);

  // Create and update chart
  useEffect(() => {
    if (!chartReady || !canvasRef.current || !window.Chart || !speedData?.data) return;

    // Downsample data - 288 points max (1 per 5 mins for 24h)
    const sampledData = downsampleData(speedData.data, 288);

    const labels = sampledData.map(d => {
      const date = new Date(d.timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    });

    const uploadData = sampledData.map(d => d.uploadSpeed || 0);
    const downloadData = sampledData.map(d => d.downloadSpeed || 0);

    // If chart exists, update data and theme colors
    if (chartInstance.current) {
      chartInstance.current.data.labels = labels;
      chartInstance.current.data.datasets[0].data = uploadData;
      chartInstance.current.data.datasets[1].data = downloadData;
      // Update tooltip colors for theme
      const isDark = theme === 'dark';
      chartInstance.current.options.plugins.tooltip.backgroundColor = isDark ? '#1f2937' : '#ffffff';
      chartInstance.current.options.plugins.tooltip.titleColor = isDark ? '#e5e7eb' : '#1f2937';
      chartInstance.current.options.plugins.tooltip.bodyColor = isDark ? '#e5e7eb' : '#1f2937';
      chartInstance.current.options.plugins.tooltip.borderColor = isDark ? '#374151' : '#e5e7eb';
      chartInstance.current.update('none');
      return;
    }

    // Create new chart
    const ctx = canvasRef.current.getContext('2d');

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Upload',
            data: uploadData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderWidth: 1.5,
            tension: 0.3,
            fill: true,
            pointRadius: 0
          },
          {
            label: 'Download',
            data: downloadData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderWidth: 1.5,
            tension: 0.3,
            fill: true,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true,
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            titleColor: theme === 'dark' ? '#e5e7eb' : '#1f2937',
            bodyColor: theme === 'dark' ? '#e5e7eb' : '#1f2937',
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + formatSpeed(context.parsed.y);
              }
            }
          }
        },
        scales: {
          x: {
            display: false
          },
          y: {
            display: false,
            beginAtZero: true
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [chartReady, speedData, theme]);

  // Get network status using shared helpers
  const ed2k = getED2KStatus(stats);
  const kad = getKADStatus(stats);

  // Current speeds
  const uploadSpeed = stats?.EC_TAG_STATS_UL_SPEED || 0;
  const downloadSpeed = stats?.EC_TAG_STATS_DL_SPEED || 0;

  return h('div', {
    className: 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden'
  },
    // Chart container
    h('div', { className: 'relative', style: { height: '100px' } },
      // Chart - always render canvas for Chart.js
      h('div', {
        ref: containerRef,
        className: 'absolute inset-0',
        style: { padding: '8px' }
      },
        h('canvas', {
          ref: canvasRef,
          style: { width: '100%', height: '100%' }
        })
      ),
      // Loading overlay when no data
      !speedData?.data && h('div', {
        className: 'absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50'
      },
        h('div', { className: 'loader' })
      )
    ),
    // Status bar with network status and speeds
    h('div', { className: 'flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700' },
      // Network status (left side)
      h('div', { className: 'flex items-center gap-3' },
        // ED2K status
        h('div', { className: 'flex items-center gap-1.5' },
          h('div', { className: `w-2 h-2 rounded-full ${getStatusDotClass(ed2k.status)}` }),
          h('span', { className: 'text-xs font-medium text-gray-600 dark:text-gray-400' }, ed2k.label)
        ),
        // KAD status
        h('div', { className: 'flex items-center gap-1.5' },
          h('div', { className: `w-2 h-2 rounded-full ${getStatusDotClass(kad.status)}` }),
          h('span', { className: 'text-xs font-medium text-gray-600 dark:text-gray-400' }, kad.label)
        )
      ),
      // Current speeds (right side)
      h('div', { className: 'flex items-center gap-3' },
        h('span', { className: 'text-xs font-semibold text-green-600 dark:text-green-400' }, `↑ ${formatSpeed(uploadSpeed)}`),
        h('span', { className: 'text-xs font-semibold text-blue-600 dark:text-blue-400' }, `↓ ${formatSpeed(downloadSpeed)}`)
      )
    )
  );
};

export default MobileSpeedWidget;
