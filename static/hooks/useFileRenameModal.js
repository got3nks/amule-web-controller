/**
 * useFileRenameModal Hook
 *
 * Manages FileRenameModal state and returns ready-to-render modal element.
 * Follows the same pattern as useFileInfoModal.
 */

import React, { useState, useCallback, useMemo } from 'https://esm.sh/react@18.2.0';
import FileRenameModal from '../components/modals/FileRenameModal.js';
import { useActions } from '../contexts/ActionsContext.js';

const { createElement: h } = React;

/**
 * Hook for managing FileRenameModal in views
 * @returns {Object} { openRenameModal, FileRenameElement }
 */
export const useFileRenameModal = () => {
  const [renameItem, setRenameItem] = useState(null);
  const { files } = useActions();

  const openRenameModal = useCallback((item) => {
    setRenameItem(item);
  }, []);

  const closeRenameModal = useCallback(() => {
    setRenameItem(null);
  }, []);

  const FileRenameElement = useMemo(() => {
    return h(FileRenameModal, {
      show: !!renameItem,
      fileHash: renameItem?.hash || null,
      fileName: renameItem?.name || '',
      instanceId: renameItem?.instanceId || null,
      onSubmit: files.renameFile,
      onClose: closeRenameModal
    });
  }, [renameItem, files.renameFile, closeRenameModal]);

  return {
    openRenameModal,
    FileRenameElement
  };
};

export default useFileRenameModal;
