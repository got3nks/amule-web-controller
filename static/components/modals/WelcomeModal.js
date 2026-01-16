/**
 * WelcomeModal Component
 *
 * Displays changelog for new version after an update.
 * User must click Continue to dismiss (cannot click outside to close).
 */

import React from 'https://esm.sh/react@18.2.0';
import { Icon, Portal, Button } from '../common/index.js';
import { parseMarkdownBold } from '../../utils/index.js';

const { createElement: h } = React;

/**
 * WelcomeModal component
 * @param {boolean} show - Whether to show the modal
 * @param {function} onContinue - Handler when user clicks Continue
 * @param {string} version - The new version number
 * @param {object} changelog - Changelog for the new version
 * @param {boolean} loading - Whether the continue action is in progress
 */
const WelcomeModal = ({ show, onContinue, version, changelog, loading = false }) => {
  if (!show) return null;

  const hasChanges = changelog && Object.keys(changelog).length > 0;

  return h(Portal, null,
    // Backdrop - NO onClick to close
    h('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-2 sm:p-4'
    },
      h('div', {
        className: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden',
        onClick: (e) => e.stopPropagation()
      },
        // Header
        h('div', { className: 'flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-600' },
          h(Icon, { name: 'zap', size: 24, className: 'text-white' }),
          h('div', null,
            h('h2', { className: 'text-lg font-semibold text-white' }, "What's New"),
            h('p', { className: 'text-sm text-blue-100' }, `Version ${version}`)
          )
        ),

        // Content
        h('div', { className: 'flex-1 overflow-y-auto p-4' },
          hasChanges
            ? h('div', { className: 'space-y-4' },
                Object.entries(changelog).map(([category, items]) =>
                  h('div', { key: category },
                    h('h3', { className: 'text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2' },
                      category === 'Added' && h(Icon, { name: 'plus', size: 16, className: 'text-green-500' }),
                      category === 'Fixed' && h(Icon, { name: 'check', size: 16, className: 'text-blue-500' }),
                      category === 'Changed' && h(Icon, { name: 'edit', size: 16, className: 'text-amber-500' }),
                      category === 'Removed' && h(Icon, { name: 'trash', size: 16, className: 'text-red-500' }),
                      category
                    ),
                    h('ul', { className: 'text-sm text-gray-600 dark:text-gray-400 space-y-1.5 pl-6' },
                      items.map((item, idx) =>
                        h('li', { key: idx, className: 'list-disc' }, parseMarkdownBold(item))
                      )
                    )
                  )
                )
              )
            : h('p', { className: 'text-gray-500 dark:text-gray-400 text-center py-4' },
                'This version includes various improvements and bug fixes.'
              )
        ),

        // Footer with Continue button
        h('div', { className: 'p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end' },
          h(Button, {
            variant: 'primary',
            onClick: onContinue,
            disabled: loading,
            className: 'px-6'
          },
            loading && h('div', { className: 'w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' }),
            loading ? 'Saving...' : 'Continue'
          )
        )
      )
    )
  );
};

export default WelcomeModal;
