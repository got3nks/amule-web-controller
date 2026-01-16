/**
 * useScrollToTop Hook
 *
 * Scrolls to top when dependency changes
 * iOS-compatible with requestAnimationFrame fallback
 */

import { useEffect } from 'https://esm.sh/react@18.2.0';

/**
 * Scroll to top when dependency changes
 * @param {any} dependency - Value to watch for changes
 */
export const useScrollToTop = (dependency) => {
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Immediate scroll
    scrollToTop();

    // Deferred scroll for iOS Safari
    requestAnimationFrame(scrollToTop);
  }, [dependency]);
};
