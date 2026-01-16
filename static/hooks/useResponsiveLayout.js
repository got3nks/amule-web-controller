/**
 * useResponsiveLayout Hook
 *
 * Manages responsive layout state (landscape mode and mobile detection)
 * Note: Page size is now managed by AppStateContext with user selection
 */

import { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import { BREAKPOINT_MD } from '../utils/index.js';

/**
 * Check if device is in landscape mode (mobile device rotated)
 * @returns {boolean} True if in landscape on mobile device
 */
const checkIsLandscape = () => {
  if (typeof window === 'undefined') return false;

  return window.matchMedia("(orientation: landscape)").matches &&
         window.matchMedia("(max-device-width: 600px)").matches;
};

/**
 * Check if viewport is mobile size
 * @returns {boolean} True if viewport width is below tablet breakpoint
 */
const checkIsMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < BREAKPOINT_MD;
};

/**
 * Custom hook for responsive layout management
 * @returns {Object} Layout state
 * @returns {boolean} returns.isLandscape - Whether device is in landscape mode
 * @returns {boolean} returns.isMobile - Whether viewport is mobile size (< 768px)
 */
export const useResponsiveLayout = () => {
  const [isLandscape, setIsLandscape] = useState(checkIsLandscape);
  const [isMobile, setIsMobile] = useState(checkIsMobile);

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(checkIsLandscape());
      setIsMobile(checkIsMobile());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isLandscape,
    isMobile
  };
};
