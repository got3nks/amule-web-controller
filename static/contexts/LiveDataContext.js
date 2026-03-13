/**
 * LiveDataContext
 *
 * Manages frequently changing data (updates every few seconds):
 * - Stats (speeds, connection status)
 * - Downloads queue
 * - Uploads queue
 * - Shared files (pushed via WebSocket)
 *
 * Separated from StaticDataContext to prevent unnecessary re-renders
 * of components that only need rarely-changing data like categories.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

/** Build compound key for item lookup */
const makeKey = (item) => item.instanceId ? `${item.instanceId}:${item.hash}` : item.hash;

/** Apply peer-level delta to an existing peers array */
const applyPeersDelta = (prevPeers, peersDelta) => {
  const peerMap = new Map();
  for (const p of prevPeers) peerMap.set(p.id, p);

  if (peersDelta.removed) {
    for (const id of peersDelta.removed) peerMap.delete(id);
  }
  if (peersDelta.added) {
    for (const p of peersDelta.added) peerMap.set(p.id, p);
  }
  if (peersDelta.changed) {
    for (const patch of peersDelta.changed) {
      const existing = peerMap.get(patch.id);
      if (existing) peerMap.set(patch.id, { ...existing, ...patch });
    }
  }
  return Array.from(peerMap.values());
};

const LiveDataContext = createContext(null);

export const LiveDataProvider = ({ children }) => {
  // Live data state (changes frequently)
  const [dataStats, setDataStats] = useState(null);

  // Unified items array (replaces separate downloads/shared/uploads)
  const [dataItems, setDataItems] = useState([]);
  // Map-backed authoritative store for delta application
  const dataItemsMapRef = useRef(new Map());

  // History data (fetched from /api/history/all, refreshes every 5 seconds)
  const [dataHistory, setDataHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Loaded flags for live data
  const [dataLoaded, setDataLoaded] = useState({
    items: false,
    history: false
  });

  // Replace all items (full snapshot) — rebuilds the Map
  const setDataItemsFull = useCallback((items) => {
    const map = dataItemsMapRef.current;
    map.clear();
    for (const item of items) {
      map.set(makeKey(item), item);
    }
    setDataItems(items);
  }, []);

  // Apply incremental delta to the items Map
  const applyDelta = useCallback((delta) => {
    const map = dataItemsMapRef.current;

    // Remove items
    if (delta.removed) {
      for (const key of delta.removed) {
        map.delete(key);
      }
    }

    // Add new items
    if (delta.added) {
      for (const item of delta.added) {
        map.set(makeKey(item), item);
      }
    }

    // Merge changed fields into existing items
    if (delta.changed) {
      for (const patch of delta.changed) {
        const key = makeKey(patch);
        const existing = map.get(key);
        if (existing) {
          // Peer-level delta: patch.peers is { added, removed, changed } instead of full array
          if (patch.peers && !Array.isArray(patch.peers)) {
            const mergedPeers = applyPeersDelta(existing.peers || [], patch.peers);
            map.set(key, { ...existing, ...patch, peers: mergedPeers });
          } else {
            map.set(key, { ...existing, ...patch });
          }
        }
        // If item not found (shouldn't happen), skip — will recover on next full snapshot
      }
    }

    // Derive new array from Map values
    setDataItems(Array.from(map.values()));
  }, []);

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

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    // State
    dataStats,
    dataItems,
    dataHistory,
    historyLoading,
    dataLoaded,

    // Setters
    setDataStats,
    setDataItems,
    setDataItemsFull,
    applyDelta,
    setDataHistory,
    setHistoryLoading,
    markDataLoaded,
    resetDataLoaded
  }), [dataStats, dataItems, dataHistory, historyLoading, dataLoaded, setDataItemsFull, applyDelta, markDataLoaded, resetDataLoaded]);

  return h(LiveDataContext.Provider, { value }, children);
};

export const useLiveData = () => {
  const context = useContext(LiveDataContext);
  if (!context) {
    throw new Error('useLiveData must be used within LiveDataProvider');
  }
  return context;
};
