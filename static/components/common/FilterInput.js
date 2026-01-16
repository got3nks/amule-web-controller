/**
 * FilterInput Component
 *
 * Reusable text filter input with clear button
 * Used for filtering lists by filename or other text fields
 */

import React from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

/**
 * FilterInput component
 * @param {string} value - Current filter value
 * @param {function} onChange - Called when value changes
 * @param {function} onClear - Called when clear button clicked
 * @param {string} placeholder - Input placeholder text
 * @param {string} className - Additional container classes
 */
const FilterInput = ({
  value = '',
  onChange,
  onClear,
  placeholder = 'Filter by file name...',
  className = ''
}) => {
  return h('div', { className: `relative ${className}` },
    // Search icon
    h('svg', {
      className: 'absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    },
      h('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 2,
        d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
      })
    ),
    // Input field (text-base on mobile prevents iOS auto-zoom, text-sm on desktop)
    h('input', {
      type: 'text',
      value,
      onChange: (e) => onChange(e.target.value),
      placeholder,
      className: 'w-full h-9 sm:h-10 pl-8 pr-8 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
    }),
    // Clear button (only shown when there's text)
    value && h('button', {
      type: 'button',
      onClick: onClear,
      className: 'absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
      title: 'Clear filter'
    },
      h('svg', {
        className: 'w-4 h-4',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24'
      },
        h('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
          d: 'M6 18L18 6M6 6l12 12'
        })
      )
    )
  );
};

export default FilterInput;
