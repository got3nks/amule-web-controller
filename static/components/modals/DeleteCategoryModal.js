/**
 * DeleteCategoryModal Component
 *
 * Confirmation modal for deleting a category
 */

import React from 'https://esm.sh/react@18.2.0';
import { Icon, Portal, Button } from '../common/index.js';

const { createElement: h } = React;

/**
 * Delete category confirmation modal
 * @param {boolean} show - Whether to show the modal
 * @param {number} categoryId - Category ID to delete
 * @param {string} categoryName - Category name to display
 * @param {function} onConfirm - Confirm handler
 * @param {function} onClose - Close handler
 */
const DeleteCategoryModal = ({
  show,
  categoryId,
  categoryName,
  onConfirm,
  onClose
}) => {
  if (!show) return null;

  return h(Portal, null,
    h('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4',
      onClick: onClose
    },
      h('div', {
        className: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all',
        onClick: (e) => e.stopPropagation()
      },
      h('div', { className: 'flex items-center gap-3 mb-4' },
        h('div', { className: 'flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center' },
          h(Icon, { name: 'trash', size: 24, className: 'text-red-600 dark:text-red-400' })
        ),
        h('div', null,
          h('h3', { className: 'text-lg font-semibold text-gray-900 dark:text-gray-100' }, 'Delete Category'),
          h('p', { className: 'text-sm text-gray-500 dark:text-gray-400' }, 'This action cannot be undone')
        )
      ),
      h('p', { className: 'text-gray-700 dark:text-gray-300 mb-2' },
        'Are you sure you want to delete ',
        h('span', { className: 'font-semibold' }, `"${categoryName}"`),
        '?'
      ),
      h('p', { className: 'text-sm text-gray-600 dark:text-gray-400 mb-6' },
        'Files in this category will be moved to the default category.'
      ),
      h('div', { className: 'flex gap-3 justify-end' },
        h(Button, {
          variant: 'secondary',
          onClick: onClose
        }, 'Cancel'),
        h(Button, {
          variant: 'danger',
          icon: 'trash',
          onClick: onConfirm
        }, 'Delete Category')
      )
    )
  ));
};

export default DeleteCategoryModal;
