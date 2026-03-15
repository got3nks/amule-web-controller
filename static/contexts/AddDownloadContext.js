/**
 * AddDownloadContext
 *
 * Lightweight context for opening/closing the Add Download modal from any view.
 * Supports pre-loading .torrent files (e.g. from global drag-and-drop).
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

const AddDownloadContext = createContext(null);

export const AddDownloadProvider = ({ children }) => {
  const [show, setShow] = useState(false);
  const [initialFiles, setInitialFiles] = useState([]);

  const openAddDownloadModal = useCallback((files = []) => {
    setInitialFiles(files);
    setShow(true);
  }, []);

  const closeAddDownloadModal = useCallback(() => {
    setShow(false);
    setInitialFiles([]);
  }, []);

  const value = useMemo(() => ({
    show,
    initialFiles,
    openAddDownloadModal,
    closeAddDownloadModal
  }), [show, initialFiles, openAddDownloadModal, closeAddDownloadModal]);

  return h(AddDownloadContext.Provider, { value }, children);
};

export const useAddDownload = () => {
  const context = useContext(AddDownloadContext);
  if (!context) {
    throw new Error('useAddDownload must be used within AddDownloadProvider');
  }
  return context;
};
