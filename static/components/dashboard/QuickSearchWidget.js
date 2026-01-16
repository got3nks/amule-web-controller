/**
 * QuickSearchWidget Component
 *
 * Quick search form for dashboard with type selector and search input
 */

import React from 'https://esm.sh/react@18.2.0';
import { Icon, Button, Input } from '../common/index.js';

const { createElement: h } = React;

/**
 * QuickSearchWidget component
 * @param {string} searchType - Current search type ('global', 'local', 'kad')
 * @param {function} onSearchTypeChange - Search type change handler
 * @param {string} searchQuery - Current search query
 * @param {function} onSearchQueryChange - Search query change handler
 * @param {function} onSearch - Search submit handler
 * @param {boolean} searchLocked - Whether search is in progress
 * @param {boolean} noBorder - Whether to hide the outer border/padding (default: false)
 */
const QuickSearchWidget = ({
  searchType,
  onSearchTypeChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  searchLocked,
  noBorder = false
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!searchLocked && searchQuery.trim()) {
      onSearch();
    }
  };

  const searchTypes = [
    { value: 'global', label: 'Global', emoji: '🌐' },
    { value: 'local', label: 'Local', emoji: '🗄️' },
    { value: 'kad', label: 'Kad', emoji: '☁️' }
  ];

  return h('div', {
    className: noBorder ? '' : 'bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700'
  },
    h('form', {
      onSubmit: handleSubmit,
      className: 'flex flex-col gap-2'
    },
      // Row 1: Search type selector (full width)
      h('div', {
        className: 'flex gap-1'
      },
        ...searchTypes.map(type =>
          h(Button, {
            key: type.value,
            type: 'button',
            variant: searchType === type.value ? 'primary' : 'secondary',
            onClick: () => onSearchTypeChange(type.value),
            disabled: searchLocked,
            className: 'flex-1 justify-center'
          },
            `${type.emoji} ${type.label}`
          )
        )
      ),

      // Row 2: Search input + button
      h('div', { className: 'flex gap-2' },
        h(Input, {
          type: 'text',
          value: searchQuery,
          onChange: (e) => onSearchQueryChange(e.target.value),
          placeholder: 'Enter search query...',
          disabled: searchLocked,
          className: 'flex-1 min-w-0'
        }),

        // Search button
        h(Button, {
          type: 'submit',
          variant: 'primary',
          disabled: searchLocked || !searchQuery.trim(),
          className: 'whitespace-nowrap'
        },
          searchLocked
            ? h('div', { className: 'loader' })
            : h(Icon, { name: 'search', size: 16 }),
          h('span', {}, searchLocked ? 'Searching...' : 'Search')
        )
      )
    )
  );
};

export default QuickSearchWidget;
