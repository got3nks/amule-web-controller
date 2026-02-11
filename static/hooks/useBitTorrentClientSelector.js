/**
 * useBitTorrentClientSelector Hook
 *
 * Provides state and helpers for selecting which BitTorrent client to use
 * when adding downloads (magnet links, torrent files, search results).
 *
 * Only shows selection UI when 2+ BitTorrent clients are connected.
 * Automatically selects the only available client when just one is connected.
 */

import { useState, useMemo, useCallback } from 'https://esm.sh/react@18.2.0';
import { useClientFilter } from '../contexts/ClientFilterContext.js';
import { CLIENT_NAMES } from '../utils/constants.js';

/**
 * Hook for BitTorrent client selection
 * @returns {Object} Client selection state and helpers
 */
export function useBitTorrentClientSelector() {
  const { rtorrentConnected, qbittorrentConnected } = useClientFilter();

  // Build list of connected BitTorrent clients
  const connectedClients = useMemo(() => {
    const clients = [];
    if (rtorrentConnected) {
      clients.push({
        id: 'rtorrent',
        name: CLIENT_NAMES.rtorrent.name,
        shortName: CLIENT_NAMES.rtorrent.shortName
      });
    }
    if (qbittorrentConnected) {
      clients.push({
        id: 'qbittorrent',
        name: CLIENT_NAMES.qbittorrent.name,
        shortName: CLIENT_NAMES.qbittorrent.shortName
      });
    }
    return clients;
  }, [rtorrentConnected, qbittorrentConnected]);

  // Whether any BitTorrent client is available
  const hasBitTorrentClient = connectedClients.length > 0;

  // Whether to show client selector (2+ clients connected)
  const showClientSelector = connectedClients.length >= 2;

  // Selected client - default to first available, or null if none
  const [selectedClientId, setSelectedClientId] = useState(() => {
    if (rtorrentConnected) return 'rtorrent';
    if (qbittorrentConnected) return 'qbittorrent';
    return null;
  });

  // Auto-update selection if selected client disconnects
  const effectiveClientId = useMemo(() => {
    // If selected client is still connected, use it
    if (selectedClientId === 'rtorrent' && rtorrentConnected) return 'rtorrent';
    if (selectedClientId === 'qbittorrent' && qbittorrentConnected) return 'qbittorrent';
    // Otherwise, fall back to first available
    if (rtorrentConnected) return 'rtorrent';
    if (qbittorrentConnected) return 'qbittorrent';
    return null;
  }, [selectedClientId, rtorrentConnected, qbittorrentConnected]);

  // Get the selected client object
  const selectedClient = useMemo(() => {
    return connectedClients.find(c => c.id === effectiveClientId) || null;
  }, [connectedClients, effectiveClientId]);

  // Handler to change selected client
  const selectClient = useCallback((clientId) => {
    setSelectedClientId(clientId);
  }, []);

  return {
    // List of connected BitTorrent clients
    connectedClients,
    // Whether any BitTorrent client is available
    hasBitTorrentClient,
    // Whether to show client selector UI (2+ clients)
    showClientSelector,
    // Currently selected client ID
    selectedClientId: effectiveClientId,
    // Currently selected client object (with name, etc.)
    selectedClient,
    // Function to change selection
    selectClient,
    // Individual connection status (for backward compatibility)
    rtorrentConnected,
    qbittorrentConnected
  };
}

export default useBitTorrentClientSelector;
