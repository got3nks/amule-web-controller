/**
 * DownloadInfoModal Component
 *
 * Modal for displaying detailed download information
 */

import React from 'https://esm.sh/react@18.2.0';
import { Icon, SegmentsBar, Portal, Button } from '../common/index.js';
import { formatBytes, copyToClipboard } from '../../utils/index.js';
import {
  formatFieldName,
  formatFieldValue,
  categorizeDownloadFields
} from '../../utils/fieldFormatters.js';

const { createElement: h, useState } = React;

/**
 * Download info modal
 * @param {boolean} show - Whether to show the modal
 * @param {object} download - Download object with raw data (initially opened download)
 * @param {Array} downloads - All downloads array (for live updates)
 * @param {Array} categories - Categories list
 * @param {function} onClose - Close handler
 */
const DownloadInfoModal = ({
  show,
  download,
  downloads = [],
  categories = [],
  onClose
}) => {
  const [copyStatus, setCopyStatus] = useState('idle');
  const [expandedSections, setExpandedSections] = useState({
    'File Identification': true,
    'Source Information': true,
    'Timing & Activity': false,
    'Priority & Category': false,
    'Download State & Progress': false,
    'Upload Statistics': false,
    'Data Integrity & Optimization': false
  });

  if (!show || !download) return null;

  // Get live download data if available, otherwise use the initial download
  const liveDownload = downloads.find(d => d.fileHash === download.fileHash) || download;
  const raw = liveDownload.raw || {};
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

  // Use the shared categorization function
  const categorizedFields = categorizeDownloadFields(raw);

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
          h('div', { className: 'flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center' },
            h(Icon, { name: 'download', size: 18, className: 'text-blue-600 dark:text-blue-400 sm:hidden' }),
            h(Icon, { name: 'download', size: 20, className: 'text-blue-600 dark:text-blue-400 hidden sm:block' })
          ),
          h('div', { className: 'min-w-0' },
            h('h2', {
              className: 'text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate',
              title: liveDownload.fileName
            }, 'Download Details'),
            h('p', {
              className: 'text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate',
              style: { maxWidth: '300px' },
              title: liveDownload.fileName
            }, liveDownload.fileName)
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

        // Segments Bar section
        h('div', { className: 'bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700' },
          h('div', { className: 'text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2' }, 'Segments'),
          h('div', { className: 'w-full overflow-hidden rounded' },
            h(SegmentsBar, {
              fileSize: parseInt(liveDownload.fileSize),
              fileSizeDownloaded: parseInt(liveDownload.fileSizeDownloaded),
              partStatus: liveDownload.partStatus,
              gapStatus: liveDownload.gapStatus,
              reqStatus: liveDownload.reqStatus,
              sourceCount: parseInt(liveDownload.sourceCount),
              width: 800,
              height: 24
            })
          ),
          h('div', { className: 'flex justify-between items-center mt-2 text-xs text-gray-600 dark:text-gray-400' },
            h('span', null, `${liveDownload.progress}% complete`),
            h('span', null, `${formatBytes(liveDownload.fileSizeDownloaded)} / ${formatBytes(liveDownload.fileSize)}`)
          )
        ),

        // Categorized fields with collapsible sections
        Object.entries(categorizedFields).map(([category, fields]) => {
          // Filter out null values
          const validFields = fields.filter(([key, value]) => {
            const formatted = formatFieldValue(key, value, { categories });
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
                const formattedValue = formatFieldValue(key, value, { categories });
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

export default DownloadInfoModal;
