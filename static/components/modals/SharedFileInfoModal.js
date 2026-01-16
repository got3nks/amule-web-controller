/**
 * SharedFileInfoModal Component
 *
 * Modal for displaying detailed shared file information
 */

import React from 'https://esm.sh/react@18.2.0';
import { Icon, Portal, Button } from '../common/index.js';
import { formatBytes, copyToClipboard } from '../../utils/index.js';
import {
  formatFieldName,
  formatFieldValue,
  formatPriority,
  categorizeSharedFields
} from '../../utils/fieldFormatters.js';

const { createElement: h, useState } = React;

/**
 * Shared file info modal
 * @param {boolean} show - Whether to show the modal
 * @param {Object} file - Shared file object
 * @param {function} onClose - Close handler
 */
const SharedFileInfoModal = ({ show, file, onClose }) => {
  const [copyStatus, setCopyStatus] = useState('idle');
  const [expandedSections, setExpandedSections] = useState({
    'File Identification': true,
    'Upload Statistics': true,
    'Source Information': true
  });

  if (!show || !file) return null;

  const raw = file.raw || {};
  const ed2kLink = raw.EC_TAG_PARTFILE_ED2K_LINK;

  const handleCopyLink = async () => {
    if (!ed2kLink) return;

    const success = await copyToClipboard(ed2kLink);
    if (success) {
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } else {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const categorizedFields = categorizeSharedFields(raw);

  return h(Portal, null,
    h('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2 sm:p-4',
      onClick: onClose
    },
    h('div', {
      className: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden',
      onClick: (e) => e.stopPropagation()
    },
      // Header
      h('div', { className: 'flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700' },
        h('div', { className: 'flex items-center gap-2 sm:gap-3 min-w-0' },
          h('div', { className: 'flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center' },
            h(Icon, { name: 'upload', size: 18, className: 'text-green-600 dark:text-green-400 sm:hidden' }),
            h(Icon, { name: 'upload', size: 20, className: 'text-green-600 dark:text-green-400 hidden sm:block' })
          ),
          h('div', { className: 'min-w-0' },
            h('h2', {
              className: 'text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate',
              title: file.fileName
            }, 'Shared File Info'),
            h('p', {
              className: 'text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate',
              style: { maxWidth: '300px' },
              title: file.fileName
            }, file.fileName)
          )
        ),
        h('button', {
          onClick: onClose,
          className: 'p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0'
        },
          h(Icon, { name: 'x', size: 20, className: 'text-gray-500 dark:text-gray-400' })
        )
      ),

      // Content
      h('div', { className: 'flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4' },
        // ED2K Link section
        ed2kLink && h('div', { className: 'bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg p-3 sm:p-4 border border-cyan-200 dark:border-cyan-800' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('span', { className: 'text-xs sm:text-sm font-medium text-cyan-700 dark:text-cyan-300' }, 'ED2K Link'),
            h('button', {
              onClick: handleCopyLink,
              className: `px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                copyStatus === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : copyStatus === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-200 dark:hover:bg-cyan-900/50'
              }`
            },
              h(Icon, {
                name: copyStatus === 'success' ? 'check' : copyStatus === 'error' ? 'x' : 'share',
                size: 14
              }),
              copyStatus === 'success' ? 'Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy'
            )
          ),
          h('div', { className: 'w-full overflow-hidden rounded' },
            h('div', {
              className: 'bg-white dark:bg-gray-900 p-2 rounded text-xs font-mono text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-nowrap'
            }, ed2kLink)
          )
        ),

        // Quick stats
        h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3' },
          // File Size
          h('div', { className: 'bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 sm:p-3' },
            h('div', { className: 'text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1' }, 'Size'),
            h('div', { className: 'text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100' },
              formatBytes(file.fileSize)
            )
          ),
          // Upload Priority
          h('div', { className: 'bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 sm:p-3' },
            h('div', { className: 'text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1' }, 'Priority'),
            h('div', { className: 'text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100' },
              formatPriority(file.priority)
            )
          ),
          // Session Upload
          h('div', { className: 'bg-green-50 dark:bg-green-900/20 rounded-lg p-2 sm:p-3' },
            h('div', { className: 'text-xs text-green-600 dark:text-green-400 mb-0.5 sm:mb-1' }, 'Session Upload'),
            h('div', { className: 'text-sm sm:text-base font-semibold text-green-700 dark:text-green-300' },
              formatBytes(file.transferred)
            ),
            h('div', { className: 'text-xs text-green-600 dark:text-green-400' },
              `${file.acceptedCount} requests`
            )
          ),
          // Total Upload
          h('div', { className: 'bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 sm:p-3' },
            h('div', { className: 'text-xs text-blue-600 dark:text-blue-400 mb-0.5 sm:mb-1' }, 'Total Upload'),
            h('div', { className: 'text-sm sm:text-base font-semibold text-blue-700 dark:text-blue-300' },
              formatBytes(file.transferredTotal)
            ),
            h('div', { className: 'text-xs text-blue-600 dark:text-blue-400' },
              `${file.acceptedCountTotal} requests`
            )
          )
        ),

        // Categorized fields
        Object.entries(categorizedFields).map(([category, fields]) => {
          // Filter out null values
          const validFields = fields.filter(([key, value]) => {
            const formatted = formatFieldValue(key, value, { categories: [] });
            return formatted !== null;
          });

          if (validFields.length === 0) return null;

          const isExpanded = expandedSections[category];

          return h('div', {
            key: category,
            className: 'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'
          },
            h('button', {
              onClick: () => toggleSection(category),
              className: 'w-full flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
            },
              h('span', { className: 'text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300' }, category),
              h(Icon, {
                name: isExpanded ? 'chevronUp' : 'chevronDown',
                size: 16,
                className: 'text-gray-500 dark:text-gray-400'
              })
            ),
            isExpanded && h('div', { className: 'divide-y divide-gray-200 dark:divide-gray-700' },
              validFields.map(([key, value]) => {
                const formattedValue = formatFieldValue(key, value, { categories: [] });
                if (formattedValue === null) return null;

                return h('div', {
                  key: key,
                  className: 'p-2 sm:p-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3'
                },
                  h('span', { className: 'text-xs sm:text-sm text-gray-500 dark:text-gray-400 sm:w-48 flex-shrink-0' },
                    formatFieldName(key)
                  ),
                  h('span', { className: 'text-xs sm:text-sm text-gray-900 dark:text-gray-100 break-words flex-1' },
                    formattedValue
                  )
                );
              })
            )
          );
        })
      ),

      // Footer
      h('div', { className: 'p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end' },
        h(Button, {
          variant: 'secondary',
          onClick: onClose
        }, 'Close')
      )
    )
  ));
};

export default SharedFileInfoModal;
