/**
 * StaticDataContext
 *
 * Manages less frequently changing data:
 * - Categories (changes on user action)
 * - Shared files (changes on user refresh)
 * - Servers list (changes on user action)
 * - Logs (changes on user refresh)
 * - Server info (changes on user refresh)
 * - Stats tree (changes on user refresh)
 * - Downloaded files tracking
 * - ED2K links state
 *
 * Separated from LiveDataContext to prevent unnecessary re-renders
 * when frequently-changing data (stats, downloads, uploads) updates.
 */

import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

const StaticDataContext = createContext(null);

export const StaticDataProvider = ({ children }) => {
  // Static data state (changes less frequently)
  const [dataShared, setDataShared] = useState([]);
  const [dataServers, setDataServers] = useState([]);
  const [dataCategories, setDataCategories] = useState([]);
  const [dataLogs, setDataLogs] = useState('');
  const [dataServerInfo, setDataServerInfo] = useState('');
  const [dataStatsTree, setDataStatsTree] = useState(null);
  const [dataDownloadedFiles, setDataDownloadedFiles] = useState(new Set());

  // Loaded flags for static data
  const [dataLoaded, setDataLoaded] = useState({
    shared: false,
    servers: false,
    categories: false,
    logs: false,
    serverInfo: false
  });

  // Helper to mark a data type as loaded
  const markDataLoaded = useCallback((dataType) => {
    setDataLoaded(prev => {
      if (prev[dataType] === true) return prev; // No change needed
      return { ...prev, [dataType]: true };
    });
  }, []);

  // Helper to reset a data type's loaded state
  const resetDataLoaded = useCallback((dataType) => {
    setDataLoaded(prev => {
      if (prev[dataType] === false) return prev; // No change needed
      return { ...prev, [dataType]: false };
    });
  }, []);

  // ED2K links state
  const [dataDownloadsEd2kLinks, setDataDownloadsEd2kLinks] = useState('');
  const [dataServersEd2kLinks, setDataServersEd2kLinks] = useState('ed2k://|serverlist|http://upd.emule-security.org/server.met|/');

  // lastEd2kWasServerList - just a ref, no state needed (not used for rendering)
  const lastEd2kWasServerListRef = useRef(false);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    // State
    dataShared,
    dataServers,
    dataCategories,
    dataLogs,
    dataServerInfo,
    dataStatsTree,
    dataDownloadedFiles,
    dataDownloadsEd2kLinks,
    dataServersEd2kLinks,
    dataLoaded,
    lastEd2kWasServerListRef,

    // Setters
    setDataShared,
    setDataServers,
    setDataCategories,
    setDataLogs,
    setDataServerInfo,
    setDataStatsTree,
    setDataDownloadedFiles,
    setDataDownloadsEd2kLinks,
    setDataServersEd2kLinks,
    markDataLoaded,
    resetDataLoaded
  }), [
    dataShared, dataServers, dataCategories, dataLogs, dataServerInfo,
    dataStatsTree, dataDownloadedFiles, dataDownloadsEd2kLinks, dataServersEd2kLinks,
    dataLoaded, markDataLoaded, resetDataLoaded
  ]);

  return h(StaticDataContext.Provider, { value }, children);
};

export const useStaticData = () => {
  const context = useContext(StaticDataContext);
  if (!context) {
    throw new Error('useStaticData must be used within StaticDataProvider');
  }
  return context;
};
