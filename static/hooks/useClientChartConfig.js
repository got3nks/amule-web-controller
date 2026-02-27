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
 *   - ed2kConnected: boolean - whether ED2K network client is connected
 *   - bittorrentConnected: boolean - whether any BitTorrent client is connected
 *   - isEd2kEnabled: boolean - whether ED2K network is enabled in filter
 *   - isBittorrentEnabled: boolean - whether BitTorrent is enabled in filter
 *   - showBothCharts: boolean - show side-by-side charts for both network types
 *   - showSingleClient: boolean - show single network type charts (full width)
 *   - singleNetworkType: 'ed2k' | 'bittorrent' - which network to show when single
 *   - singleNetworkName: 'aMule' | 'BitTorrent' - display name for single network
 *   - shouldRenderCharts: boolean - deferred rendering state for performance
 */
export const useClientChartConfig = () => {
  const { isEd2kEnabled, isBittorrentEnabled, ed2kConnected, bittorrentConnected } = useClientFilter();
  const { dataStats } = useLiveData();

  // Check if we're still waiting for WebSocket data
  const isLoading = !dataStats;

  // Determine chart display mode (isXEnabled includes connection check)
  const showBothCharts = isEd2kEnabled && isBittorrentEnabled;
  const showSingleAmule = isEd2kEnabled && !isBittorrentEnabled;
  const showSingleBittorrent = isBittorrentEnabled && !isEd2kEnabled;
  const showSingleClient = showSingleAmule || showSingleBittorrent;
  // Network type for chart data keys (e.g. 'ed2kUploadSpeed', 'bittorrentUploadSpeed')
  const singleNetworkType = showSingleAmule ? 'ed2k' : 'bittorrent';
  const singleNetworkName = showSingleAmule ? 'aMule' : 'BitTorrent';

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
    ed2kConnected,
    bittorrentConnected,
    isEd2kEnabled,
    isBittorrentEnabled,
    showBothCharts,
    showSingleClient,
    singleNetworkType,
    singleNetworkName,
    shouldRenderCharts
  };
};
