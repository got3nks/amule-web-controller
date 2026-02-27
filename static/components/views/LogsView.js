/**
 * LogsView Component
 *
 * Displays application logs and client-specific logs.
 * Client log sections are generated dynamically from the `logs` capability.
 * To add log support for a new client type, add an entry to CLIENT_LOG_SECTIONS.
 */

import React from 'https://esm.sh/react@18.2.0';

import { LOGS_REFRESH_INTERVAL } from '../../utils/index.js';
import { useStaticData } from '../../contexts/StaticDataContext.js';
import { useDataFetch } from '../../contexts/DataFetchContext.js';
import { useFontSize } from '../../contexts/FontSizeContext.js';

const { createElement: h, useRef, useEffect, useCallback, useState, useMemo } = React;

/**
 * Client log section configs keyed by client type.
 * Each type can define multiple sections (e.g. aMule has logs + server info).
 * Only types with connected instances having the `logs` capability are shown.
 */
const CLIENT_LOG_SECTIONS = {
  qbittorrent: [
    { key: 'qbittorrentLogs', title: 'qBittorrent Logs', dataKey: 'dataQbittorrentLogs', loadedKey: 'qbittorrentLogs', fetchKey: 'fetchQbittorrentLogs' }
  ],
  amule: [
    { key: 'logs', title: 'aMule Logs', dataKey: 'dataLogs', loadedKey: 'logs', fetchKey: 'fetchLogs' },
    { key: 'serverInfo', title: 'ED2K Server Info', dataKey: 'dataServerInfo', loadedKey: 'serverInfo', fetchKey: 'fetchServerInfo' }
  ]
};

/**
 * Reusable log section with auto-scroll behavior.
 * Manages its own scroll ref and tracks whether the user has scrolled away from bottom.
 */
const LogSection = ({ title, data, loaded, maxHeightClass, instances, hasMulti, selectedInstance, onInstanceChange, fontSize }) => {
  const ref = useRef(null);
  const userScrolledAway = useRef(false);

  const handleScroll = useCallback(() => {
    if (!ref.current) return;
    const el = ref.current;
    userScrolledAway.current = el.scrollHeight - el.scrollTop - el.clientHeight > 30;
  }, []);

  // Auto-scroll to bottom when new data arrives, unless user scrolled away
  useEffect(() => {
    if (ref.current && loaded && !userScrolledAway.current) {
      const timeoutId = setTimeout(() => {
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [data, loaded, fontSize]);

  return h('div', { className: 'bg-gray-50 dark:bg-gray-700 rounded-lg p-3' },
    h('h3', { className: 'text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2' },
      title,
      hasMulti && h('select', {
        value: selectedInstance || '',
        onChange: (e) => onInstanceChange(e.target.value),
        className: 'text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 font-normal'
      }, instances.map(inst => h('option', { key: inst.id, value: inst.id }, inst.name)))
    ),
    h('div', {
      ref,
      onScroll: handleScroll,
      className: `bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 p-3 ${maxHeightClass} overflow-y-auto log-text`
    },
      (!loaded && !data)
        ? h('span', { className: 'text-gray-400 dark:text-gray-500 italic' }, `Loading ${title.toLowerCase()}...`)
        : (data || h('span', { className: 'text-gray-400 dark:text-gray-500 italic' }, `No ${title.toLowerCase()} available`))
    )
  );
};

/**
 * Logs view component
 */
const LogsView = () => {
  const { dataLogs, dataServerInfo, dataAppLogs, dataQbittorrentLogs, dataLoaded, instances } = useStaticData();
  const { fetchLogs, fetchServerInfo, fetchAppLogs, fetchQbittorrentLogs } = useDataFetch();
  const { fontSize } = useFontSize();

  // Lookup tables for dynamic access by config keys
  const dataByKey = { dataLogs, dataServerInfo, dataQbittorrentLogs };
  const fetchByKey = useMemo(
    () => ({ fetchLogs, fetchServerInfo, fetchQbittorrentLogs }),
    [fetchLogs, fetchServerInfo, fetchQbittorrentLogs]
  );

  // Group connected log-capable instances by type (capability-driven)
  const logInstanceGroups = useMemo(() => {
    const groups = {};
    for (const [id, inst] of Object.entries(instances)) {
      if (!inst.connected || !inst.capabilities?.logs) continue;
      if (!groups[inst.type]) groups[inst.type] = [];
      groups[inst.type].push({ id, name: inst.name });
    }
    return groups;
  }, [instances]);

  const hasClientLogs = Object.keys(logInstanceGroups).length > 0;

  // Per-type selected instance state
  const [selectedInstances, setSelectedInstances] = useState({});
  const setSelectedInstance = useCallback((type, id) => {
    setSelectedInstances(prev => ({ ...prev, [type]: id }));
  }, []);

  // Compute effective instance per type (validates selection, falls back to first)
  const getEffectiveInstance = useCallback((type) => {
    const insts = logInstanceGroups[type] || [];
    const selected = selectedInstances[type];
    return (selected && insts.some(i => i.id === selected)) ? selected : insts[0]?.id || null;
  }, [logInstanceGroups, selectedInstances]);

  // Build active client sections from config + capabilities
  const activeSections = useMemo(() => {
    const sections = [];
    for (const [type, configs] of Object.entries(CLIENT_LOG_SECTIONS)) {
      const insts = logInstanceGroups[type];
      if (!insts?.length) continue;
      for (const config of configs) {
        sections.push({ ...config, type, instances: insts, hasMulti: insts.length > 1 });
      }
    }
    return sections;
  }, [logInstanceGroups]);

  // Fetch all logs on mount and auto-refresh
  // Re-runs when active sections or selected instances change
  useEffect(() => {
    const doFetch = () => {
      for (const section of activeSections) {
        const instanceId = getEffectiveInstance(section.type);
        fetchByKey[section.fetchKey]?.(instanceId);
      }
      fetchAppLogs();
    };
    doFetch();
    const intervalId = setInterval(doFetch, LOGS_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [activeSections, getEffectiveInstance, fetchByKey, fetchAppLogs]);

  return h('div', { className: 'space-y-2 sm:space-y-3 px-2 sm:px-0' },
    // App Logs (always shown, expands when no client logs exist)
    h(LogSection, {
      title: 'App Logs',
      data: dataAppLogs,
      loaded: dataLoaded.appLogs,
      maxHeightClass: hasClientLogs ? 'max-h-48 sm:max-h-96' : 'max-h-[calc(100vh-16rem)]',
      instances: [],
      hasMulti: false,
      fontSize
    }),

    // Client log sections (dynamic, capability-driven)
    ...activeSections.map(section =>
      h(LogSection, {
        key: section.key,
        title: section.title,
        data: dataByKey[section.dataKey],
        loaded: dataLoaded[section.loadedKey],
        maxHeightClass: 'max-h-48',
        instances: section.instances,
        hasMulti: section.hasMulti,
        selectedInstance: getEffectiveInstance(section.type),
        onInstanceChange: (id) => setSelectedInstance(section.type, id),
        fontSize
      })
    )
  );
};

export default LogsView;
