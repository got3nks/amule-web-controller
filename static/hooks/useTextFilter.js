/**
 * useTextFilter Hook
 *
 * Provides text filtering functionality for lists
 * Filters items by a specified field using case-insensitive matching
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'https://esm.sh/react@18.2.0';

/**
 * Normalize text by removing accents/diacritical marks
 * e.g., "café" -> "cafe", "naïve" -> "naive"
 */
const normalizeText = (text) => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

/**
 * Filter items by text field
 * @param {Array} items - Array of items to filter
 * @param {string} field - Field name to filter by (e.g., 'fileName')
 * @param {Object} options - Optional configuration
 * @param {function} options.onFilterChange - Callback when filter text changes (useful for resetting page)
 * @returns {Object} { filteredItems, filterText, setFilterText, clearFilter }
 */
export const useTextFilter = (items = [], field = 'fileName', options = {}) => {
  const { onFilterChange } = options;
  const [filterText, setFilterTextState] = useState('');
  const isFirstRender = useRef(true);

  // Wrap setFilterText to call onFilterChange callback
  const setFilterText = useCallback((newValue) => {
    setFilterTextState(newValue);
  }, []);

  // Call onFilterChange when filterText changes (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (onFilterChange) {
      onFilterChange(filterText);
    }
  }, [filterText, onFilterChange]);

  const filteredItems = useMemo(() => {
    // If no field specified or no filter text, return items unchanged
    if (!field || !filterText.trim()) {
      return items;
    }
    const searchTerm = normalizeText(filterText.trim());
    return items.filter(item => {
      const value = item[field];
      if (typeof value === 'string') {
        return normalizeText(value).includes(searchTerm);
      }
      return false;
    });
  }, [items, field, filterText]);

  const clearFilter = useCallback(() => setFilterTextState(''), []);

  return {
    filteredItems,
    filterText,
    setFilterText,
    clearFilter
  };
};
