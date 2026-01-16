/**
 * ExpandableSearch Component
 *
 * Search icon that expands to show input field on mobile.
 * When expanded, hides sibling elements passed via `hiddenWhenExpanded` prop.
 * Elements in hiddenWhenExpanded are rendered AFTER the search button (to the right).
 */

import React from 'https://esm.sh/react@18.2.0';
import Icon from './Icon.js';
import { IconButton } from './FormControls.js';

const { createElement: h, useState, useRef, useEffect, Fragment } = React;

/**
 * ExpandableSearch component
 * @param {string} value - Current search value
 * @param {function} onChange - Value change handler
 * @param {function} onClear - Clear handler (optional)
 * @param {string} placeholder - Input placeholder
 * @param {ReactNode|ReactNode[]} hiddenWhenExpanded - Elements rendered AFTER search, hidden when expanded (e.g., buttons)
 */
const ExpandableSearch = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  hiddenWhenExpanded = null
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Close when clicking outside (only if empty)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        !value // Only collapse if empty
      ) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded, value]);

  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
    setIsExpanded(false);
  };

  // If has value, always show expanded
  const showExpanded = isExpanded || value;

  return h(Fragment, null,
    // Search input or button
    h('div', {
      ref: containerRef,
      className: showExpanded ? 'relative flex-[3] ml-2' : 'relative'
    },
      showExpanded
        ? h('div', { className: 'flex items-center gap-1' },
            h('div', { className: 'relative flex-1' },
              h(Icon, {
                name: 'search',
                size: 14,
                className: 'absolute left-2 top-1/2 -translate-y-1/2 text-gray-400'
              }),
              h('input', {
                ref: inputRef,
                type: 'text',
                value,
                onChange: (e) => onChange(e.target.value),
                placeholder,
                className: 'w-full pl-7 pr-2 py-1.5 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              })
            ),
            (value || isExpanded) && h(IconButton, {
              variant: 'secondary',
              icon: 'x',
              iconSize: 16,
              onClick: handleClear,
              title: 'Clear',
              className: 'w-8 h-8 sm:w-9 sm:h-9'
            })
          )
        : h(IconButton, {
            variant: 'secondary',
            icon: 'search',
            iconSize: 18,
            onClick: () => setIsExpanded(true),
            title: 'Search'
          })
    ),
    // Render siblings AFTER search (only when NOT expanded)
    !showExpanded && hiddenWhenExpanded
  );
};

export default ExpandableSearch;
