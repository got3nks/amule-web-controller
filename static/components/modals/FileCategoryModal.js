/**
 * FileCategoryModal Component
 *
 * Modal for changing a file's category assignment
 */

import React from 'https://esm.sh/react@18.2.0';
import Portal from '../common/Portal.js';
import { Button, Select } from '../common/index.js';

const { createElement: h } = React;

/**
 * File category change modal
 * @param {boolean} show - Whether to show the modal
 * @param {string|Array} fileHash - File hash or array of file hashes (for batch)
 * @param {string} fileName - File name to display (for single file)
 * @param {number} fileCount - Number of files (for batch operations)
 * @param {number} currentCategoryId - Current category ID
 * @param {Array} categories - List of available categories
 * @param {number} selectedCategoryId - Currently selected category ID
 * @param {function} onSelectedCategoryChange - Handler for category selection change
 * @param {function} onSubmit - Submit handler (fileHash/hashes, categoryId)
 * @param {function} onClose - Close handler
 */
const FileCategoryModal = ({
  show,
  fileHash,
  fileName,
  fileCount,
  currentCategoryId,
  categories,
  selectedCategoryId,
  onSelectedCategoryChange,
  onSubmit,
  onClose
}) => {
  if (!show) return null;

  const isBatch = Array.isArray(fileHash) || fileCount > 1;

  const handleSubmit = () => {
    onSubmit(fileHash, selectedCategoryId);
  };

  return h(Portal, null,
    h('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4',
      onClick: onClose
    },
      h('div', {
        className: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6',
        onClick: (e) => e.stopPropagation()
      },
      h('h3', { className: 'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2' },
        'Change Category'
      ),
      h('p', { className: 'text-sm text-gray-600 dark:text-gray-400 mb-4 break-words' },
        isBatch
          ? `Change category for ${fileCount || (Array.isArray(fileHash) ? fileHash.length : 1)} selected file${(fileCount || (Array.isArray(fileHash) ? fileHash.length : 1)) !== 1 ? 's' : ''}`
          : fileName
      ),
      h(Select, {
        value: selectedCategoryId,
        onChange: (e) => onSelectedCategoryChange(parseInt(e.target.value)),
        options: [
          { value: 0, label: 'Default (all)' },
          ...categories.filter(cat => cat.id !== 0).map(cat => ({ value: cat.id, label: cat.title }))
        ],
        className: 'w-full mb-4'
      }),
      h('div', { className: 'flex gap-3 justify-end' },
        h(Button, {
          variant: 'secondary',
          onClick: onClose
        }, 'Cancel'),
        h(Button, {
          variant: 'primary',
          onClick: handleSubmit
        }, 'Change Category')
      )
    )
  ));
};

export default FileCategoryModal;
