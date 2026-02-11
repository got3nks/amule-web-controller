/**
 * StaticDataContext
 *
 * Manages less frequently changing data:
 * - Categories (changes on user action)
 * - Servers list (changes on user action)
 * - Logs (changes on user refresh)
 * - Server info (changes on user refresh)
 * - Stats tree (changes on user refresh)
 * - Downloaded files tracking
 *
 * Separated from LiveDataContext to prevent unnecessary re-renders
 * when frequently-changing data (stats, downloads, uploads, shared files) updates.
 */

import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

const StaticDataContext = createContext(null);

export const StaticDataProvider = ({ children }) => {
  // Static data state (changes less frequently)
  const [dataServers, setDataServers] = useState([]);
  const [dataCategories, setDataCategories] = useState([]);  // Unified categories (aMule + rtorrent)
  const [clientDefaultPaths, setClientDefaultPaths] = useState({ amule: null, rtorrent: null, qbittorrent: null });  // Default paths from clients
  const [clientsEnabled, setClientsEnabled] = useState({ amule: false, rtorrent: false, qbittorrent: false, prowlarr: false });  // Which clients are enabled in config (populated from backend)
  const [clientsConnected, setClientsConnected] = useState({ amule: false, rtorrent: false, qbittorrent: false });  // Which clients are currently connected
  const [knownTrackers, setKnownTrackers] = useState([]);  // Known trackers from rtorrent items
  const [historyTrackUsername, setHistoryTrackUsername] = useState(false);  // Whether to track username in history
  const [hasCategoryPathWarnings, setHasCategoryPathWarnings] = useState(false);  // Whether any category has path issues
  const [dataLogs, setDataLogs] = useState('');
  const [dataServerInfo, setDataServerInfo] = useState('');
  const [dataAppLogs, setDataAppLogs] = useState('');
  const [dataQbittorrentLogs, setDataQbittorrentLogs] = useState('');
  const [dataStatsTree, setDataStatsTree] = useState(null);
  const [dataDownloadedFiles, setDataDownloadedFiles] = useState(new Set());

  // Loaded flags for static data
  const [dataLoaded, setDataLoaded] = useState({
    servers: false,
    categories: false,
    logs: false,
    serverInfo: false,
    appLogs: false,
    qbittorrentLogs: false
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

  // ED2K links state (for servers view)
  const [dataServersEd2kLinks, setDataServersEd2kLinks] = useState('ed2k://|serverlist|http://upd.emule-security.org/server.met|/');

  // lastEd2kWasServerList - just a ref, no state needed (not used for rendering)
  const lastEd2kWasServerListRef = useRef(false);

  // Derived: check if multiple clients are connected (for showing ED2K/BT badges)
  // Show badges when aMule + any BitTorrent client, or when multiple BitTorrent clients
  const bothClientsConnected = useMemo(() => {
    const amule = clientsConnected.amule === true;
    const rtorrent = clientsConnected.rtorrent === true;
    const qbittorrent = clientsConnected.qbittorrent === true;
    const btCount = (rtorrent ? 1 : 0) + (qbittorrent ? 1 : 0);
    // Show badges if aMule + any BT client, or if multiple BT clients
    return (amule && btCount > 0) || btCount > 1;
  }, [clientsConnected.amule, clientsConnected.rtorrent, clientsConnected.qbittorrent]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    // State
    dataServers,
    dataCategories,
    clientDefaultPaths,
    clientsEnabled,
    clientsConnected,
    knownTrackers,
    historyTrackUsername,
    hasCategoryPathWarnings,

    // Derived
    bothClientsConnected,
    dataLogs,
    dataServerInfo,
    dataAppLogs,
    dataQbittorrentLogs,
    dataStatsTree,
    dataDownloadedFiles,
    dataServersEd2kLinks,
    dataLoaded,
    lastEd2kWasServerListRef,

    // Setters
    setDataServers,
    setDataCategories,
    setClientDefaultPaths,
    setClientsEnabled,
    setClientsConnected,
    setKnownTrackers,
    setHistoryTrackUsername,
    setHasCategoryPathWarnings,
    setDataLogs,
    setDataServerInfo,
    setDataAppLogs,
    setDataQbittorrentLogs,
    setDataStatsTree,
    setDataDownloadedFiles,
    setDataServersEd2kLinks,
    markDataLoaded,
    resetDataLoaded
  }), [
    dataServers, dataCategories, clientDefaultPaths, clientsEnabled, clientsConnected, knownTrackers,
    historyTrackUsername, hasCategoryPathWarnings, bothClientsConnected,
    dataLogs, dataServerInfo, dataAppLogs, dataQbittorrentLogs, dataStatsTree, dataDownloadedFiles, dataServersEd2kLinks,
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
