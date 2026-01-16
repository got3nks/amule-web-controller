/**
 * DataFetchContext
 *
 * Provides data fetching operations for all views
 * Centralizes all aMule data fetching logic
 */

import React, { createContext, useContext, useCallback, useMemo } from 'https://esm.sh/react@18.2.0';
import { useWebSocketConnection } from './WebSocketContext.js';
import { useLiveData } from './LiveDataContext.js';
import { useStaticData } from './StaticDataContext.js';

const { createElement: h } = React;

const DataFetchContext = createContext(null);

/**
 * DataFetchProvider - provides data fetching functions through context
 * @param {Object} props
 * @param {ReactNode} props.children - Child components
 */
export const DataFetchProvider = ({ children }) => {
  const { sendMessage } = useWebSocketConnection();
  const { resetDataLoaded: resetLiveDataLoaded } = useLiveData();
  const { resetDataLoaded: resetStaticDataLoaded } = useStaticData();

  const fetchDownloads = useCallback(async () => {
    resetLiveDataLoaded('downloads');
    sendMessage({ action: 'getDownloads' });
  }, [sendMessage, resetLiveDataLoaded]);

  const fetchPreviousSearchResults = useCallback(async () => {
    sendMessage({ action: 'getPreviousSearchResults' });
  }, [sendMessage]);

  const fetchShared = useCallback(async () => {
    resetStaticDataLoaded('shared');
    sendMessage({ action: 'getShared' });
  }, [sendMessage, resetStaticDataLoaded]);

  const refreshSharedFiles = useCallback(async () => {
    resetStaticDataLoaded('shared');
    sendMessage({ action: 'refreshSharedFiles' });
  }, [sendMessage, resetStaticDataLoaded]);

  const fetchStats = useCallback(() => {
    sendMessage({ action: 'getStats' });
  }, [sendMessage]);

  const fetchUploads = useCallback(() => {
    resetLiveDataLoaded('uploads');
    sendMessage({ action: 'getUploadingQueue' });
  }, [sendMessage, resetLiveDataLoaded]);

  const fetchLogs = useCallback(() => {
    resetStaticDataLoaded('logs');
    sendMessage({ action: 'getLog' });
  }, [sendMessage, resetStaticDataLoaded]);

  const fetchServerInfo = useCallback(() => {
    resetStaticDataLoaded('serverInfo');
    sendMessage({ action: 'getServerInfo' });
  }, [sendMessage, resetStaticDataLoaded]);

  const fetchStatsTree = useCallback(() => {
    sendMessage({ action: 'getStatsTree' });
  }, [sendMessage]);

  const fetchServers = useCallback(() => {
    resetStaticDataLoaded('servers');
    sendMessage({ action: 'getServersList' });
  }, [sendMessage, resetStaticDataLoaded]);

  const fetchCategories = useCallback(() => {
    resetStaticDataLoaded('categories');
    sendMessage({ action: 'getCategories' });
  }, [sendMessage, resetStaticDataLoaded]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({
    fetchDownloads,
    fetchPreviousSearchResults,
    fetchShared,
    refreshSharedFiles,
    fetchStats,
    fetchUploads,
    fetchLogs,
    fetchServerInfo,
    fetchStatsTree,
    fetchServers,
    fetchCategories
  }), [
    fetchDownloads, fetchPreviousSearchResults, fetchShared, refreshSharedFiles,
    fetchStats, fetchUploads, fetchLogs, fetchServerInfo, fetchStatsTree,
    fetchServers, fetchCategories
  ]);

  return h(DataFetchContext.Provider, { value }, children);
};

export const useDataFetch = () => {
  const context = useContext(DataFetchContext);
  if (!context) {
    throw new Error('useDataFetch must be used within DataFetchProvider');
  }
  return context;
};
