/**
 * FileRenameModal Component
 *
 * Simple modal for renaming a file (download or shared).
 * Only shown for clients with the renameFile capability.
 */

import React from 'https://esm.sh/react@18.2.0';
import Portal from '../common/Portal.js';
import { Button } from '../common/index.js';

const { createElement: h, useState, useEffect, useRef } = React;

const FileRenameModal = ({
  show,
  fileHash,
  fileName,
  instanceId,
  onSubmit,
  onClose
}) => {
  const [newName, setNewName] = useState('');
  const inputRef = useRef(null);

  // Initialize with current name (without extension for safety)
  useEffect(() => {
    if (show && fileName) {
      setNewName(fileName);
      // Focus and select filename (without extension) after render
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const dotIndex = fileName.lastIndexOf('.');
          if (dotIndex > 0) {
            inputRef.current.setSelectionRange(0, dotIndex);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [show, fileName]);

  if (!show) return null;

  const trimmed = newName.trim();
  const isValid = trimmed.length > 0 && trimmed !== fileName;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(fileHash, trimmed, instanceId);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return h(Portal, null,
    h('div', {
      className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
      onClick: (e) => { if (e.target === e.currentTarget) onClose(); },
      onKeyDown: handleKeyDown
    },
      h('div', {
        className: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg'
      },
        // Header
        h('div', { className: 'px-4 py-3 border-b border-gray-200 dark:border-gray-700' },
          h('h3', { className: 'text-base font-semibold text-gray-900 dark:text-gray-100' }, 'Rename File')
        ),

        // Body
        h('form', { onSubmit: handleSubmit, className: 'px-4 py-4' },
          h('label', { className: 'block text-sm text-gray-600 dark:text-gray-400 mb-1' }, 'New name'),
          h('input', {
            ref: inputRef,
            type: 'text',
            value: newName,
            onChange: (e) => setNewName(e.target.value),
            className: 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
            placeholder: 'Enter new file name',
            spellCheck: false,
            autoComplete: 'off'
          }),

          // Buttons
          h('div', { className: 'flex justify-end gap-2 mt-4' },
            h(Button, { variant: 'secondary', onClick: onClose, type: 'button' }, 'Cancel'),
            h(Button, { variant: 'primary', type: 'submit', disabled: !isValid }, 'Rename')
          )
        )
      )
    )
  );
};

export default FileRenameModal;
