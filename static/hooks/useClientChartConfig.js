/**
 * useClientChartConfig Hook
 *
 * Provides client connection state and chart display configuration
 * Used by HomeView and StatisticsView to determine which charts to show
 *
 * Charts display by network type:
 * - aMule (ED2K/Kademlia)
 * - BitTorrent (rtorrent + qBittorrent combined)
 */

import React from 'https://esm.sh/react@18.2.0';
import { useClientFilter } from '../contexts/ClientFilterContext.js';
import { useLiveData } from '../contexts/LiveDataContext.js';

const { useState, useEffect } = React;

/**
 * Hook that computes chart display configuration based on client connection
 * state and filter settings
 *
 * @returns {object} Chart configuration object with:
 *   - amuleConnected: boolean - whether aMule client is connected
 *   - bittorrentConnected: boolean - whether any BitTorrent client is connected
 *   - showBothCharts: boolean - show side-by-side charts for both network types
 *   - showSingleClient: boolean - show single network type charts (full width)
 *   - singleClientType: 'amule' | 'bittorrent' - which network to show when single
 *   - singleClientName: 'aMule' | 'BitTorrent' - display name for single network
 *   - shouldRenderCharts: boolean - deferred rendering state for performance
 */
export const useClientChartConfig = () => {
  const { isAmuleEnabled, isBittorrentEnabled, amuleConnected, bittorrentConnected } = useClientFilter();
  const { dataStats } = useLiveData();

  // Check if we're still waiting for WebSocket data
  const isLoading = !dataStats;

  // Determine chart display mode (isXEnabled includes connection check)
  const showBothCharts = isAmuleEnabled && isBittorrentEnabled;
  const showSingleAmule = isAmuleEnabled && !isBittorrentEnabled;
  const showSingleBittorrent = isBittorrentEnabled && !isAmuleEnabled;
  const showSingleClient = showSingleAmule || showSingleBittorrent;
  // Use 'bittorrent' for charts (aggregates rtorrent + qbittorrent)
  const singleClientType = showSingleAmule ? 'amule' : 'bittorrent';
  const singleClientName = showSingleAmule ? 'aMule' : 'BitTorrent';

  // Defer chart rendering until after initial paint for better performance
  const [shouldRenderCharts, setShouldRenderCharts] = useState(false);
  useEffect(() => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => setShouldRenderCharts(true));
    } else {
      setTimeout(() => setShouldRenderCharts(true), 0);
    }
  }, []);

  return {
    isLoading,
    amuleConnected,
    bittorrentConnected,
    isAmuleEnabled,
    isBittorrentEnabled,
    showBothCharts,
    showSingleClient,
    singleClientType,
    singleClientName,
    shouldRenderCharts
  };
};
