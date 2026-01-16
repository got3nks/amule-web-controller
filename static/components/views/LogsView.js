/**
 * LogsView Component
 *
 * Displays application logs and server information
 * Uses contexts directly for all data and actions
 */

import React from 'https://esm.sh/react@18.2.0';
import { Icon, Button } from '../common/index.js';
import { LOGS_REFRESH_INTERVAL } from '../../utils/index.js';
import { useStaticData } from '../../contexts/StaticDataContext.js';
import { useDataFetch } from '../../contexts/DataFetchContext.js';
import { useFontSize } from '../../contexts/FontSizeContext.js';

const { createElement: h, useRef, useEffect } = React;

/**
 * Logs view component - now uses contexts directly
 */
const LogsView = () => {
  // Get data from contexts
  const { dataLogs, dataServerInfo, dataLoaded } = useStaticData();
  const { fetchLogs, fetchServerInfo } = useDataFetch();
  const { fontSize } = useFontSize();

  // Refs for auto-scrolling
  const logsRef = useRef(null);
  const serverInfoRef = useRef(null);

  // Aliases for readability
  const logs = dataLogs;
  const serverInfo = dataServerInfo;

  // Fetch logs and server info on mount with auto-refresh
  useEffect(() => {
    fetchLogs();
    fetchServerInfo();

    const intervalId = setInterval(() => {
      fetchLogs();
      fetchServerInfo();
    }, LOGS_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchLogs, fetchServerInfo]);

  // Refresh both logs and server info
  const onRefresh = () => {
    fetchLogs();
    fetchServerInfo();
  };

  // Auto-scroll to bottom when new logs arrive, loading completes, or font size changes
  useEffect(() => {
    if (logsRef.current && dataLoaded.logs) {
      // Small delay to allow DOM to re-render with new font size
      const timeoutId = setTimeout(() => {
        if (logsRef.current) {
          logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [logs, dataLoaded.logs, fontSize]);

  useEffect(() => {
    if (serverInfoRef.current && dataLoaded.serverInfo) {
      // Small delay to allow DOM to re-render with new font size
      const timeoutId = setTimeout(() => {
        if (serverInfoRef.current) {
          serverInfoRef.current.scrollTop = serverInfoRef.current.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [serverInfo, dataLoaded.serverInfo, fontSize]);

  return h('div', { className: 'space-y-2 sm:space-y-3' },
    h('div', { className: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pl-1 sm:pl-2' },
      // Page title hidden on mobile (view is clear from sidebar/nav selection)
      h('h2', { className: 'hidden sm:block text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, 'Logs & Server Info'),
      h(Button, {
        variant: 'primary',
        onClick: onRefresh,
        disabled: !dataLoaded.logs,
        icon: dataLoaded.logs ? 'refresh' : null,
        className: 'hidden sm:flex'
      }, dataLoaded.logs ? 'Refresh' : h('span', { className: 'flex items-center gap-2' }, h('div', { className: 'loader' }), 'Loading...'))
    ),

    // Server Info Section
    h('div', { className: 'bg-gray-50 dark:bg-gray-700 rounded-lg p-3' },
      h('h3', { className: 'text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2' }, 'Server Information'),
      h('div', {
        ref: serverInfoRef,
        className: 'bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 p-3 max-h-48 overflow-y-auto log-text'
      },
        // Only show loading on first load; once we have server info, keep showing it during refresh
        (!dataLoaded.serverInfo && !serverInfo)
          ? h('span', { className: 'text-gray-400 dark:text-gray-500 italic' }, 'Loading server info...')
          : (serverInfo || h('span', { className: 'text-gray-400 dark:text-gray-500 italic' }, 'No server info available'))
      )
    ),

    // Logs Section
    h('div', { className: 'bg-gray-50 dark:bg-gray-700 rounded-lg p-3' },
      h('h3', { className: 'text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2' }, 'Application Logs'),
      h('div', {
        ref: logsRef,
        className: 'bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 p-3 max-h-96 overflow-y-auto log-text'
      },
        // Only show loading on first load; once we have logs, keep showing them during refresh
        (!dataLoaded.logs && !logs)
          ? h('span', { className: 'text-gray-400 dark:text-gray-500 italic' }, 'Loading logs...')
          : (logs || h('span', { className: 'text-gray-400 dark:text-gray-500 italic' }, 'No logs available'))
      )
    )
  );
};

export default LogsView;
