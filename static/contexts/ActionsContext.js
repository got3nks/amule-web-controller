/**
 * ActionsContext
 *
 * Provides all WebSocket action handlers to the app
 * Handles all WebSocket message sending and action handlers
 */

import React, { createContext, useContext } from 'https://esm.sh/react@18.2.0';
import { useAppState } from './AppStateContext.js';
import { useSearch } from './SearchContext.js';
import { useStaticData } from './StaticDataContext.js';
import { useWebSocketConnection } from './WebSocketContext.js';
import { extractEd2kLinks, ERROR_DISPLAY_DURATION } from '../utils/index.js';

const { createElement: h } = React;

const ActionsContext = createContext(null);

/**
 * Internal hook for WebSocket actions
 * Uses WebSocketContext directly instead of requiring sendMessage prop
 * @returns {Object} Action handlers
 */
const useWebSocketActions = () => {
  // Get state from contexts
  const { setAppError } = useAppState();
  const { sendMessage } = useWebSocketConnection();
  const {
    searchQuery,
    searchType,
    searchDownloadCategoryId,
    clearSearchError,
    setSearchPreviousResults
  } = useSearch();
  const { setDataDownloadedFiles, lastEd2kWasServerListRef } = useStaticData();

  // ============================================================================
  // CATEGORY MANAGEMENT
  // ============================================================================

  const handleCreateCategory = (title, path, comment, color, priority) => {
    sendMessage({
      action: 'createCategory',
      title,
      path,
      comment,
      color,
      priority
    });
  };

  const handleUpdateCategory = (categoryId, title, path, comment, color, priority) => {
    sendMessage({
      action: 'updateCategory',
      categoryId,
      title,
      path,
      comment,
      color,
      priority
    });
  };

  const handleDeleteCategory = (categoryId) => {
    if (categoryId === 0) {
      setAppError('Cannot delete default category');
      return;
    }

    sendMessage({
      action: 'deleteCategory',
      categoryId
    });
  };

  const handleSetFileCategory = (fileHash, categoryId) => {
    if (Array.isArray(fileHash)) {
      fileHash.forEach(hash => {
        sendMessage({
          action: 'setFileCategory',
          fileHash: hash,
          categoryId
        });
      });
    } else {
      sendMessage({
        action: 'setFileCategory',
        fileHash,
        categoryId
      });
    }
  };

  // ============================================================================
  // SERVER MANAGEMENT
  // ============================================================================

  const handleServerAction = (ipPort, action) => {
    const [ip, port] = ipPort.split(':');
    sendMessage({
      action: 'serverDoAction',
      ip,
      port: parseInt(port),
      serverAction: action
    });
  };

  const handleServerRemove = (ipPort) => {
    const [ip, port] = ipPort.split(':');
    sendMessage({
      action: 'serverDoAction',
      ip,
      port: parseInt(port),
      serverAction: 'remove'
    });
  };

  // ============================================================================
  // SEARCH AND DOWNLOAD
  // ============================================================================

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    clearSearchError();
    setSearchPreviousResults([]); // Clear previous results when starting new search

    sendMessage({
      action: 'search',
      query: searchQuery,
      type: searchType,
      extension: null
    });
  };

  const handleDownload = (fileHash, categoryId = null) => {
    const downloadCategoryId = categoryId !== null ? categoryId : searchDownloadCategoryId;
    sendMessage({ action: 'download', fileHash, categoryId: downloadCategoryId });
    setDataDownloadedFiles(prev => new Set(prev).add(fileHash));
  };

  const handleAddEd2kLinks = (input, categoryId = 0, isServerList = false) => {
    const links = extractEd2kLinks(input);

    if (links.length === 0) {
      setAppError('No valid ED2K links found');
      setTimeout(() => setAppError(""), ERROR_DISPLAY_DURATION);
      return;
    }

    // Track whether this was a server list addition (for response handling)
    lastEd2kWasServerListRef.current = isServerList;
    sendMessage({ action: "addEd2kLinks", links, categoryId });
  };

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  const handlePauseDownload = (fileHash) => {
    sendMessage({ action: 'pauseDownload', fileHash });
  };

  const handleResumeDownload = (fileHash) => {
    sendMessage({ action: 'resumeDownload', fileHash });
  };

  const handleBatchPause = (fileHashes) => {
    fileHashes.forEach(fileHash => {
      sendMessage({ action: 'pauseDownload', fileHash });
    });
  };

  const handleBatchResume = (fileHashes) => {
    fileHashes.forEach(fileHash => {
      sendMessage({ action: 'resumeDownload', fileHash });
    });
  };

  const handleDeleteFile = (fileHash) => {
    sendMessage({ action: 'delete', fileHash });
  };

  const handleBatchDeleteFiles = (fileHashes) => {
    const hashes = Array.isArray(fileHashes) ? fileHashes : [fileHashes];
    hashes.forEach(fileHash => {
      sendMessage({ action: 'delete', fileHash });
    });
  };

  return {
    categories: {
      create: handleCreateCategory,
      update: handleUpdateCategory,
      delete: handleDeleteCategory,
      setFileCategory: handleSetFileCategory
    },
    servers: {
      action: handleServerAction,
      remove: handleServerRemove
    },
    search: {
      perform: handleSearch,
      download: handleDownload,
      addEd2kLinks: handleAddEd2kLinks
    },
    files: {
      pause: handlePauseDownload,
      resume: handleResumeDownload,
      deleteFile: handleDeleteFile
    },
    batch: {
      pause: handleBatchPause,
      resume: handleBatchResume,
      deleteFiles: handleBatchDeleteFiles
    }
  };
};

export const ActionsProvider = ({ children }) => {
  // Create actions using internal hook (uses WebSocketContext internally)
  const actions = useWebSocketActions();

  return h(ActionsContext.Provider, { value: actions }, children);
};

export const useActions = () => {
  const context = useContext(ActionsContext);
  if (!context) {
    throw new Error('useActions must be used within ActionsProvider');
  }
  return context;
};
