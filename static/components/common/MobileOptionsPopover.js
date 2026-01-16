/**
 * MobileOptionsPopover Component
 *
 * Compact popover for mobile table options (sort + optional filters)
 */

import React from 'https://esm.sh/react@18.2.0';
import Icon from './Icon.js';
import { IconButton, Select } from './FormControls.js';

const { createElement: h, useState, useRef, useEffect } = React;

/**
 * MobileOptionsPopover component
 * @param {Array} columns - Column definitions for sorting
 * @param {string} sortBy - Current sort column
 * @param {string} sortDirection - Current sort direction ('asc'/'desc')
 * @param {function} onSortChange - Sort change handler (sortBy, sortDirection)
 * @param {Array} categories - Optional categories for filter
 * @param {number} filterCategoryId - Current category filter ID
 * @param {function} onFilterCategoryChange - Category filter change handler
 * @param {Array} statusOptions - Optional status filter options [{value, label}]
 * @param {string} statusFilter - Current status filter value
 * @param {function} onStatusFilterChange - Status filter change handler
 */
const MobileOptionsPopover = ({
  columns,
  sortBy,
  sortDirection,
  onSortChange,
  categories = null,
  filterCategoryId = 0,
  onFilterCategoryChange = null,
  statusOptions = null,
  statusFilter = '',
  onStatusFilterChange = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const sortableColumns = columns.filter(col => col.sortable);
  const hasFilters = categories || statusOptions;

  // Check if any filter is active
  const hasActiveFilter = (categories && filterCategoryId !== 0) || (statusOptions && statusFilter !== '' && statusFilter !== 'all');

  return h('div', { className: 'relative' },
    // Trigger button
    h('button', {
      ref: buttonRef,
      onClick: () => setIsOpen(!isOpen),
      className: `h-9 sm:h-10 w-9 sm:w-10 rounded-lg transition-all flex items-center justify-center ${isOpen ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`,
      title: 'Sort & Filter Options'
    },
      h('div', { className: 'relative' },
        h(Icon, { name: 'settings', size: 18 }),
        // Active filter indicator
        hasActiveFilter && h('div', {
          className: 'absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full'
        })
      )
    ),

    // Popover
    isOpen && h('div', {
      ref: popoverRef,
      className: 'absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[200px] animate-fadeIn'
    },
      // Sort section
      h('div', { className: 'space-y-2' },
        h('label', { className: 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide' }, 'Sort by'),
        h('div', { className: 'flex gap-2' },
          h(Select, {
            value: sortBy,
            onChange: (e) => onSortChange(e.target.value, sortDirection),
            options: sortableColumns.map(col => ({ value: col.key, label: col.label })),
            className: 'flex-1'
          }),
          h(IconButton, {
            variant: 'secondary',
            icon: sortDirection === 'asc' ? 'arrowUp' : 'arrowDown',
            iconSize: 16,
            onClick: () => onSortChange(sortBy, sortDirection === 'asc' ? 'desc' : 'asc'),
            title: sortDirection === 'asc' ? 'Ascending' : 'Descending',
            className: 'border border-gray-300 dark:border-gray-600'
          })
        )
      ),

      // Category filter section (optional)
      categories && onFilterCategoryChange && h('div', { className: 'mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2' },
        h('label', { className: 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide' }, 'Category'),
        h(Select, {
          value: filterCategoryId,
          onChange: (e) => onFilterCategoryChange(parseInt(e.target.value)),
          options: [
            { value: 0, label: 'Default (all)' },
            ...categories.filter(cat => cat.id !== 0).map(cat => ({ value: cat.id, label: cat.title }))
          ],
          className: 'w-full'
        })
      ),

      // Status filter section (optional)
      statusOptions && onStatusFilterChange && h('div', { className: 'mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2' },
        h('label', { className: 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide' }, 'Status'),
        h(Select, {
          value: statusFilter,
          onChange: (e) => onStatusFilterChange(e.target.value),
          options: statusOptions.map(opt => ({ value: opt.value, label: opt.label })),
          className: 'w-full'
        })
      )
    )
  );
};

export default MobileOptionsPopover;
