/**
 * WebSocketContext
 *
 * Manages WebSocket connection and message handling
 * Routes incoming messages to appropriate context setters
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'https://esm.sh/react@18.2.0';
import { ERROR_DISPLAY_DURATION } from '../utils/index.js';
import { useAppState } from './AppStateContext.js';
import { useLiveData } from './LiveDataContext.js';
import { useStaticData } from './StaticDataContext.js';
import { useSearch } from './SearchContext.js';
import { useAuth } from './AuthContext.js';

const { createElement: h } = React;

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const handleMessageRef = useRef(null);

  // Get auth state
  const { authEnabled, isAuthenticated } = useAuth();

  // Get setters from other contexts
  const {
    setAppCurrentView,
    setAppPage,
    setAppError
  } = useAppState();

  // Get setters from LiveDataContext (frequently changing)
  const {
    setDataStats,
    setDataDownloads,
    setDataUploads,
    markDataLoaded: markLiveDataLoaded,
    resetDataLoaded: resetLiveDataLoaded
  } = useLiveData();

  // Get setters from StaticDataContext (less frequently changing)
  const {
    setDataShared,
    setDataServers,
    setDataCategories,
    setDataLogs,
    setDataServerInfo,
    setDataStatsTree,
    setDataDownloadsEd2kLinks,
    setDataServersEd2kLinks,
    markDataLoaded: markStaticDataLoaded,
    resetDataLoaded: resetStaticDataLoaded,
    lastEd2kWasServerListRef
  } = useStaticData();

  const {
    setSearchPreviousResults,
    setSearchLocked,
    setSearchResults,
    setSearchNoResultsError
  } = useSearch();

  // Send message through WebSocket
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((data) => {
    // Only process messages if authenticated or auth is disabled
    if (authEnabled && !isAuthenticated) {
      return;
    }

    const messageHandlers = {
      // Batch update - single message with multiple data types (reduces re-renders)
      'batch-update': () => {
        const batch = data.data;
        if (!batch) return;

        // Update all available data in one handler call
        // React 18 batches these setState calls within the same event
        if (batch.stats !== undefined) {
          setDataStats(batch.stats);
        }
        if (batch.categories !== undefined) {
          // Only update if categories actually changed (prevents unnecessary re-renders)
          // Categories are pushed every 5s but rarely change
          setDataCategories(prev => {
            const newCats = batch.categories || [];
            // Quick check: same length and same IDs = no change
            if (prev.length === newCats.length &&
                prev.every((cat, i) => cat.id === newCats[i]?.id && cat.title === newCats[i]?.title)) {
              return prev; // Keep same reference
            }
            return newCats;
          });
          markStaticDataLoaded('categories');
        }
        if (batch.downloads !== undefined) {
          setDataDownloads(batch.downloads);
          markLiveDataLoaded('downloads');
        }
        if (batch.uploads !== undefined) {
          setDataUploads(batch.uploads || []);
          markLiveDataLoaded('uploads');
        }
      },
      'downloads-update': () => {
        setDataDownloads(data.data);
        markLiveDataLoaded('downloads');
      },
      'shared-update': () => {
        setDataShared(data.data);
        markStaticDataLoaded('shared');
      },
      'previous-search-results': () => setSearchPreviousResults(data.data || []),
      'search-lock': () => setSearchLocked(data.locked),
      'search-results': () => {
        if (!data.data || data.data.length === 0) {
          setSearchNoResultsError();
        } else {
          setSearchResults(data.data);
          setAppCurrentView('search-results');
          setAppPage(0);
        }
      },
      'download-started': () => {},
      'stats-update': () => setDataStats(data.data),
      'uploads-update': () => {
        setDataUploads(data.data || []);
        markLiveDataLoaded('uploads');
      },
      'servers-update': () => {
        setDataServers(data.data?.EC_TAG_SERVER || []);
        markStaticDataLoaded('servers');
      },
      'server-action': () => {
        // Refresh servers list after server action
        resetStaticDataLoaded('servers');
        sendMessage({ action: 'getServersList' });
      },
      'log-update': () => {
        setDataLogs(data.data?.EC_TAG_STRING || '');
        markStaticDataLoaded('logs');
      },
      'server-info-update': () => {
        setDataServerInfo(data.data?.EC_TAG_STRING || '');
        markStaticDataLoaded('serverInfo');
      },
      'stats-tree-update': () => {
        setDataStatsTree(data.data);
      },
      'categories-update': () => {
        setDataCategories(data.data || []);
        markStaticDataLoaded('categories');
      },
      'ed2k-added': () => {
        const results = Array.isArray(data.results) ? data.results : [];
        const successCount = results.filter(r => r && r.success).length;
        const failureCount = results.length - successCount;
        // Use ref to get current value (avoids stale closure)
        const wasServerList = lastEd2kWasServerListRef.current;

        if (failureCount === 0) {
          if (wasServerList) {
            setDataServersEd2kLinks("");
          } else {
            setDataDownloadsEd2kLinks("");
          }
        } else {
          setAppError(`Added ${successCount}, failed ${failureCount}`);
          setTimeout(() => setAppError(""), ERROR_DISPLAY_DURATION);
        }

        if (wasServerList) {
          setTimeout(() => {
            resetStaticDataLoaded('servers');
            sendMessage({ action: 'getServersList' });
          }, 500);
          // Reset flag
          lastEd2kWasServerListRef.current = false;
        } else {
          setTimeout(() => {
            resetLiveDataLoaded('downloads');
            sendMessage({ action: 'getDownloads' });
          }, 100);
        }
      },
      'error': () => {
        setAppError(data.message || 'An error occurred');
        setTimeout(() => setAppError(''), ERROR_DISPLAY_DURATION);
      }
    };

    const handler = messageHandlers[data.type];
    if (handler) {
      handler();
    }
  }, [
    authEnabled, isAuthenticated, sendMessage,
    setAppCurrentView, setAppPage, setAppError,
    // Live data setters
    setDataStats, setDataDownloads, setDataUploads,
    markLiveDataLoaded, resetLiveDataLoaded,
    // Static data setters
    setDataShared, setDataServers, setDataCategories, setDataLogs, setDataServerInfo,
    setDataStatsTree, setDataDownloadsEd2kLinks, setDataServersEd2kLinks,
    markStaticDataLoaded, resetStaticDataLoaded,
    // Search setters
    setSearchPreviousResults, setSearchLocked, setSearchResults, setSearchNoResultsError
  ]); // lastEd2kWasServerListRef accessed via ref, no dep needed

  // Keep ref updated with latest handler (avoids stale closures in WebSocket)
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);

        // Attempt to reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 2000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        wsRef.current?.close();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Use ref to always call latest handler (avoids stale closure)
          handleMessageRef.current?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, []); // No dependencies - connect only runs once

  // Initialize WebSocket connection on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]); // connect is stable (no deps)

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({
    wsConnected,
    sendMessage
  }), [wsConnected, sendMessage]);

  return h(WebSocketContext.Provider, { value }, children);
};

export const useWebSocketConnection = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketConnection must be used within WebSocketProvider');
  }
  return context;
};
