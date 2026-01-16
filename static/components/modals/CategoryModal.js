/**
 * CategoryModal Component
 *
 * Modal for creating and editing categories
 */

import React from 'https://esm.sh/react@18.2.0';
import { categoryColorToHex, hexToCategoryColor } from '../../utils/index.js';
import Portal from '../common/Portal.js';
import { Button, Input, Select } from '../common/index.js';

const { createElement: h } = React;

/**
 * Category create/edit modal
 * @param {boolean} show - Whether to show the modal
 * @param {string} mode - 'create' or 'edit'
 * @param {object} category - Category object (for edit mode)
 * @param {object} formData - Form data state
 * @param {function} onFormDataChange - Form data change handler
 * @param {function} onCreate - Create handler
 * @param {function} onUpdate - Update handler
 * @param {function} onClose - Close handler
 * @param {function} setError - Error setter function
 */
const CategoryModal = ({
  show,
  mode,
  category,
  formData,
  onFormDataChange,
  onCreate,
  onUpdate,
  onClose,
  setError
}) => {
  if (!show) return null;

  const isEdit = mode === 'edit';

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Category title is required');
      return;
    }

    if (isEdit) {
      onUpdate(
        category.id,
        formData.title,
        formData.path,
        formData.comment,
        formData.color,
        formData.priority
      );
    } else {
      onCreate(
        formData.title,
        formData.path,
        formData.comment,
        formData.color,
        formData.priority
      );
    }
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
      h('h3', { className: 'text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4' },
        isEdit ? 'Edit Category' : 'Create New Category'
      ),
      h('form', { onSubmit: handleSubmit, className: 'space-y-4' },
        // Title
        h('div', null,
          h('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' },
            'Title *'
          ),
          h(Input, {
            type: 'text',
            value: formData.title,
            onChange: (e) => onFormDataChange({ ...formData, title: e.target.value }),
            placeholder: 'e.g., Movies, Music, Software',
            className: 'w-full',
            required: true
          })
        ),

        // Download Path
        h('div', null,
          h('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' },
            'Download Path'
          ),
          h(Input, {
            type: 'text',
            value: formData.path,
            onChange: (e) => onFormDataChange({ ...formData, path: e.target.value }),
            placeholder: '/path/to/downloads (leave empty for default)',
            className: 'w-full font-mono'
          })
        ),

        // Comment
        h('div', null,
          h('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' },
            'Comment'
          ),
          h(Input, {
            type: 'text',
            value: formData.comment,
            onChange: (e) => onFormDataChange({ ...formData, comment: e.target.value }),
            placeholder: 'Optional description',
            className: 'w-full'
          })
        ),

        // Color
        h('div', null,
          h('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' },
            'Color'
          ),
          h('div', { className: 'flex gap-2' },
            h('input', {
              type: 'color',
              value: categoryColorToHex(formData.color),
              onChange: (e) => {
                onFormDataChange({ ...formData, color: hexToCategoryColor(e.target.value) });
              },
              className: 'w-16 h-9 sm:h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer'
            }),
            h(Input, {
              type: 'text',
              value: categoryColorToHex(formData.color).toUpperCase(),
              readOnly: true,
              className: 'flex-1 font-mono bg-gray-50 dark:bg-gray-700'
            })
          )
        ),

        // Priority
        h('div', null,
          h('label', { className: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' },
            'Priority'
          ),
          h(Select, {
            value: formData.priority,
            onChange: (e) => onFormDataChange({ ...formData, priority: parseInt(e.target.value) }),
            options: [
              { value: 0, label: 'Normal' },
              { value: 1, label: 'High' },
              { value: 2, label: 'Low' },
              { value: 3, label: 'Auto' }
            ],
            className: 'w-full'
          })
        ),

        // Buttons
        h('div', { className: 'flex gap-3 justify-end pt-4' },
          h(Button, {
            type: 'button',
            variant: 'secondary',
            onClick: onClose
          }, 'Cancel'),
          h(Button, {
            type: 'submit',
            variant: 'primary'
          }, isEdit ? 'Update Category' : 'Create Category')
        )
      )
    )
  ));
};

export default CategoryModal;
