/**
 * useItemActions Hook
 *
 * Consolidates common item actions (pause, resume, stop, copy link)
 * used across DownloadsView and SharedView.
 */

import React from 'https://esm.sh/react@18.2.0';
import { useActions } from '../contexts/ActionsContext.js';
import { copyToClipboard, getExportLink } from '../utils/index.js';

const { useState, useCallback } = React;

/**
 * @param {Object} options
 * @param {Array} options.dataArray - Array of items (downloads/shared files)
 * @param {Set} options.selectedFiles - Set of selected file hashes
 * @param {function} options.getSelectedHashes - Function to get array of selected hashes
 * @param {boolean} options.bittorrentOnly - If true, batch actions only affect BitTorrent items (rtorrent/qbittorrent) (default false)
 * @returns {Object} Action handlers and state
 */
export function useItemActions({
  dataArray,
  selectedFiles,
  getSelectedHashes,
  bittorrentOnly = false
}) {
  const actions = useActions();

  // Track which file's link was recently copied
  const [copiedHash, setCopiedHash] = useState(null);

  // ============================================================================
  // SINGLE ITEM ACTIONS
  // ============================================================================
  const handlePause = useCallback((fileHash, clientType = 'amule', fileName = null) => {
    // Use the actual client type passed from the item
    actions.files.pause(fileHash, clientType, fileName);
  }, [actions.files]);

  const handleResume = useCallback((fileHash, clientType = 'amule', fileName = null) => {
    // Use the actual client type passed from the item
    actions.files.resume(fileHash, clientType, fileName);
  }, [actions.files]);

  const handleStop = useCallback((fileHash, clientType = 'rtorrent', fileName = null) => {
    // Stop is for BitTorrent clients (rtorrent and qbittorrent)
    actions.files.stop(fileHash, clientType, fileName);
  }, [actions.files]);

  const handleCopyLink = useCallback(async (item) => {
    const link = getExportLink(item);
    if (link) {
      const success = await copyToClipboard(link);
      if (success) {
        setCopiedHash(item.hash);
        setTimeout(() => setCopiedHash(null), 2000);
      }
    }
  }, []);

  // ============================================================================
  // BATCH ACTIONS
  // ============================================================================
  const filterBittorrentHashes = useCallback((hashes) => {
    return hashes.filter(hash => {
      const item = dataArray.find(d => d.hash === hash);
      return item?.client === 'rtorrent' || item?.client === 'qbittorrent';
    });
  }, [dataArray]);

  const handleBatchPause = useCallback(() => {
    const hashes = bittorrentOnly
      ? filterBittorrentHashes(Array.from(selectedFiles))
      : getSelectedHashes();
    if (hashes.length > 0) {
      actions.files.pause(hashes, dataArray);
    }
  }, [actions.files, selectedFiles, getSelectedHashes, dataArray, bittorrentOnly, filterBittorrentHashes]);

  const handleBatchResume = useCallback(() => {
    const hashes = bittorrentOnly
      ? filterBittorrentHashes(Array.from(selectedFiles))
      : getSelectedHashes();
    if (hashes.length > 0) {
      actions.files.resume(hashes, dataArray);
    }
  }, [actions.files, selectedFiles, getSelectedHashes, dataArray, bittorrentOnly, filterBittorrentHashes]);

  const handleBatchStop = useCallback(() => {
    // Stop is for BitTorrent clients (rtorrent and qbittorrent)
    const bittorrentHashes = filterBittorrentHashes(getSelectedHashes());
    if (bittorrentHashes.length > 0) {
      actions.files.stop(bittorrentHashes, dataArray);
    }
  }, [actions.files, getSelectedHashes, dataArray, filterBittorrentHashes]);

  return {
    // State
    copiedHash,
    // Single item actions
    handlePause,
    handleResume,
    handleStop,
    handleCopyLink,
    // Batch actions
    handleBatchPause,
    handleBatchResume,
    handleBatchStop
  };
}

export default useItemActions;
