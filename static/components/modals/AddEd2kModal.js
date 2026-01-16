/**
 * AddEd2kModal Component
 *
 * Modal for adding ED2K download links
 */

import React from 'https://esm.sh/react@18.2.0';
import Portal from '../common/Portal.js';
import { Button, Select, Textarea } from '../common/index.js';

const { createElement: h } = React;

/**
 * Add ED2K links modal
 * @param {boolean} show - Whether to show the modal
 * @param {string} ed2kLinks - Current ED2K links value
 * @param {function} onEd2kLinksChange - Handler for links text change
 * @param {number} selectedCategoryId - Selected category ID for new downloads
 * @param {function} onSelectedCategoryChange - Handler for category selection change
 * @param {Array} categories - List of available categories
 * @param {function} onSubmit - Submit handler
 * @param {function} onClose - Close handler
 */
const AddEd2kModal = ({
  show,
  ed2kLinks,
  onEd2kLinksChange,
  selectedCategoryId,
  onSelectedCategoryChange,
  categories,
  onSubmit,
  onClose
}) => {
  if (!show) return null;

  const handleSubmit = () => {
    onSubmit();
    onClose();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const normalizedText = pastedText.replace(/ /g, '%20');

    const target = e.target;
    const { selectionStart, selectionEnd } = target;

    const newValue =
      target.value.slice(0, selectionStart) +
      normalizedText +
      target.value.slice(selectionEnd);

    onEd2kLinksChange(newValue);

    requestAnimationFrame(() => {
      const pos = selectionStart + normalizedText.length;
      target.setSelectionRange(pos, pos);
    });
  };

  return h(Portal, null,
    h('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4',
      onClick: onClose
    },
      h('div', {
        className: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6',
        onClick: (e) => e.stopPropagation()
      },
        h('h3', { className: 'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4' },
          'Add ED2K Download'
        ),
        h('div', { className: 'space-y-4' },
          // ED2K links textarea
          h('div', null,
            h('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' },
              'ED2K Links'
            ),
            h(Textarea, {
              value: ed2kLinks,
              onChange: (e) => onEd2kLinksChange(e.target.value),
              onPaste: handlePaste,
              placeholder: 'ed2k://|file|... (multiple links can be pasted, one per line)',
              rows: 4,
              className: 'resize-y',
              autoFocus: true
            })
          ),
          // Category selector
          h('div', null,
            h('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' },
              'Download to Category'
            ),
            h(Select, {
              value: selectedCategoryId,
              onChange: (e) => onSelectedCategoryChange(parseInt(e.target.value)),
              options: [
                { value: 0, label: 'Default (all)' },
                ...categories.filter(cat => cat.id !== 0).map(cat => ({ value: cat.id, label: cat.title }))
              ],
              className: 'w-full'
            })
          )
        ),
        // Action buttons
        h('div', { className: 'flex gap-3 justify-end mt-6' },
          h(Button, {
            variant: 'secondary',
            onClick: onClose
          }, 'Cancel'),
          h(Button, {
            variant: 'success',
            onClick: handleSubmit,
            disabled: !ed2kLinks.trim()
          }, 'Add Download')
        )
      )
    )
  );
};

export default AddEd2kModal;
