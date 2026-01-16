/**
 * SearchContext
 *
 * Provides search-related state to the app
 * Manages search query, type, results, and error states
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

const SearchContext = createContext(null);

/**
 * Internal hook for search state management
 * @returns {Object} Search state and update functions (flattened)
 */
const useSearchState = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('global');
  const [searchLocked, setSearchLocked] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPreviousResults, setSearchPreviousResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [searchDownloadCategoryId, setSearchDownloadCategoryId] = useState(0);

  // Clear error
  const clearSearchError = useCallback(() => {
    setSearchError('');
  }, []);

  // Set "no results" error and clear results
  const setSearchNoResultsError = useCallback(() => {
    setSearchResults([]);
    setSearchError('No results found');
  }, []);

  // Helper to set results and clear error at the same time
  const setSearchResultsWithClear = useCallback((results) => {
    setSearchResults(results);
    setSearchError('');
  }, []);

  // Memoize return value to prevent unnecessary re-renders of consumers
  return useMemo(() => ({
    // State
    searchQuery,
    searchType,
    searchLocked,
    searchResults,
    searchPreviousResults,
    searchError,
    searchDownloadCategoryId,

    // Setters
    setSearchQuery,
    setSearchType,
    setSearchLocked,
    setSearchResults: setSearchResultsWithClear,
    setSearchPreviousResults,
    setSearchError,
    setSearchDownloadCategoryId,
    clearSearchError,
    setSearchNoResultsError
  }), [
    searchQuery, searchType, searchLocked, searchResults, searchPreviousResults,
    searchError, searchDownloadCategoryId, setSearchResultsWithClear,
    clearSearchError, setSearchNoResultsError
    // Note: React useState setters are stable
  ]);
};

export const SearchProvider = ({ children }) => {
  const searchStateHook = useSearchState();

  return h(SearchContext.Provider, { value: searchStateHook }, children);
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
};
