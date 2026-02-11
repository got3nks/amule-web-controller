/**
 * ClientFilterContext
 *
 * Provides global client filter state (aMule vs BitTorrent clients)
 * Used by all views to filter data by client type
 * Persists to localStorage
 *
 * The filter operates on two categories:
 * - aMule (ED2K/Kademlia)
 * - BitTorrent (rtorrent and qBittorrent combined)
 *
 * The "enabled" state combines:
 * - User preference (UI toggle) - persisted to localStorage
 * - Connection status - whether any client in that category is connected
 *
 * A category is only considered "enabled" if both conditions are true.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'https://esm.sh/react@18.2.0';
import { useStaticData } from './StaticDataContext.js';

const { createElement: h } = React;

const ClientFilterContext = createContext(null);

const STORAGE_KEY = 'amule-client-filter';

export const ClientFilterProvider = ({ children }) => {
  // Get connection status from StaticDataContext
  const { clientsConnected } = useStaticData();
  const amuleConnected = clientsConnected?.amule === true;
  const rtorrentConnected = clientsConnected?.rtorrent === true;
  const qbittorrentConnected = clientsConnected?.qbittorrent === true;
  // Any BitTorrent client connected
  const bittorrentConnected = rtorrentConnected || qbittorrentConnected;

  // Client enabled state (user preference) - both enabled by default
  const [enabledClients, setEnabledClients] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Ensure at least one is enabled
          if (!parsed.amule && !parsed.rtorrent) {
            return { amule: true, rtorrent: true };
          }
          return {
            amule: parsed.amule !== false,
            rtorrent: parsed.rtorrent !== false
          };
        }
      } catch (err) {
        console.error('Failed to load client filter from localStorage:', err);
      }
    }
    return { amule: true, rtorrent: true };
  });

  // Persist to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledClients));
    } catch (err) {
      console.error('Failed to save client filter to localStorage:', err);
    }
  }, [enabledClients]);

  // Toggle a specific client - if it's the only one enabled, switch to the other
  const toggleClient = useCallback((client) => {
    setEnabledClients(prev => {
      const newState = { ...prev, [client]: !prev[client] };
      // If this would disable both, switch to the other one instead
      if (!newState.amule && !newState.rtorrent) {
        const otherClient = client === 'amule' ? 'rtorrent' : 'amule';
        return { [client]: false, [otherClient]: true };
      }
      return newState;
    });
  }, []);

  // Set a specific client's enabled state - if disabling the only one, switch to the other
  const setClientEnabled = useCallback((client, enabled) => {
    setEnabledClients(prev => {
      const newState = { ...prev, [client]: enabled };
      // If this would disable both, switch to the other one instead
      if (!newState.amule && !newState.rtorrent) {
        const otherClient = client === 'amule' ? 'rtorrent' : 'amule';
        return { [client]: false, [otherClient]: true };
      }
      return newState;
    });
  }, []);

  // Filter an array of items by enabled clients
  const filterByEnabledClients = useCallback((items) => {
    if (!Array.isArray(items)) return items;
    // If both categories enabled, return all
    if (enabledClients.amule && enabledClients.rtorrent) {
      return items;
    }
    return items.filter(item => {
      const clientType = item.client || 'amule'; // Default to amule if not specified
      // Both rtorrent and qbittorrent use the 'rtorrent' toggle (BitTorrent category)
      if (clientType === 'qbittorrent') {
        return enabledClients.rtorrent;
      }
      return enabledClients[clientType];
    });
  }, [enabledClients]);

  // Check if a specific client is enabled
  const isClientEnabled = useCallback((client) => {
    return enabledClients[client] === true;
  }, [enabledClients]);

  // Derived: is category actually enabled (user preference AND any client in category connected)
  const isAmuleEnabled = enabledClients.amule && amuleConnected;
  // BitTorrent category: user has BT toggle enabled AND any BT client is connected
  const isBittorrentEnabled = enabledClients.rtorrent && bittorrentConnected;

  // Memoize context value
  const value = useMemo(() => ({
    enabledClients,
    toggleClient,
    setClientEnabled,
    filterByEnabledClients,
    isClientEnabled,
    // Connection status (whether client is configured and connected)
    amuleConnected,
    rtorrentConnected,
    qbittorrentConnected,
    bittorrentConnected, // Any BitTorrent client
    // Convenience booleans: user preference AND connected
    isAmuleEnabled,
    isBittorrentEnabled,
    // Check if both are enabled (no filtering needed)
    allClientsEnabled: isAmuleEnabled && isBittorrentEnabled
  }), [enabledClients, toggleClient, setClientEnabled, filterByEnabledClients, isClientEnabled, amuleConnected, rtorrentConnected, qbittorrentConnected, bittorrentConnected, isAmuleEnabled, isBittorrentEnabled]);

  return h(ClientFilterContext.Provider, { value }, children);
};

export const useClientFilter = () => {
  const context = useContext(ClientFilterContext);
  if (!context) {
    throw new Error('useClientFilter must be used within ClientFilterProvider');
  }
  return context;
};
