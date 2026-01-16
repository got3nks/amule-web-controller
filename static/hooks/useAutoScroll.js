/**
 * useAutoScroll Hook
 *
 * Automatically scrolls elements to bottom when their content updates
 * Useful for logs, chat windows, etc.
 */

import { useEffect } from 'https://esm.sh/react@18.2.0';

/**
 * Auto-scrolls elements to bottom when content changes
 * @param {Object} params - Hook parameters
 * @param {Object} params.refs - Object containing refs to scroll
 * @param {Array} params.dependencies - Array of values that trigger scroll when they change
 * @param {boolean} params.isActive - Whether auto-scroll should be active
 */
export const useAutoScroll = ({ refs, dependencies, isActive }) => {
  useEffect(() => {
    if (!isActive) return;

    // Scroll all provided refs to bottom
    Object.values(refs).forEach(ref => {
      if (ref?.current) {
        ref.current.scrollTop = ref.current.scrollHeight;
      }
    });
  }, [...dependencies, isActive]);
};
