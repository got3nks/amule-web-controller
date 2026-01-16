/**
 * useModal Hook
 *
 * Manages modal state with open/close functionality
 */

import { useState, useCallback, useMemo } from 'https://esm.sh/react@18.2.0';

/**
 * Custom hook for modal state management
 * @param {object} initialState - Initial state for the modal (default fields)
 * @returns {object} { modal, open, close, update }
 */
export const useModal = (initialState) => {
  // Memoize the default state to prevent new references on every render
  const defaultState = useMemo(() => ({ show: false, ...initialState }), []);

  const [modal, setModal] = useState(defaultState);

  /**
   * Open the modal with optional data
   * @param {object} data - Data to merge into modal state
   */
  const open = useCallback((data = {}) => {
    setModal(prev => ({ ...defaultState, show: true, ...data }));
  }, [defaultState]);

  /**
   * Close the modal and reset to initial state
   */
  const close = useCallback(() => {
    setModal(defaultState);
  }, [defaultState]);

  /**
   * Update modal state without closing
   * @param {object} updates - Partial updates to merge
   */
  const update = useCallback((updates) => {
    setModal(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    modal,
    open,
    close,
    update
  };
};
