/**
 * useDynamicFontSize Hook
 *
 * Provides a reactive version of getDynamicFontSize that updates when font size changes
 */

import { useCallback } from 'https://esm.sh/react@18.2.0';
import { useFontSize } from '../contexts/FontSizeContext.js';

/**
 * Hook that returns a memoized getDynamicFontSize function
 * Re-renders components when global font size changes
 * @returns {function} getDynamicFontSize function with current scale applied
 */
export const useDynamicFontSize = () => {
  const { fontSizeConfig } = useFontSize();
  const scale = fontSizeConfig.scale;

  return useCallback((filename) => {
    // Base sizes for different filename lengths
    let baseSize;
    if (!filename) {
      baseSize = 14;
    } else {
      const length = filename.length;
      if (length < 70) baseSize = 14;
      else if (length < 100) baseSize = 13;
      else if (length < 130) baseSize = 12;
      else baseSize = 11;
    }

    return `${Math.round(baseSize * scale)}px`;
  }, [scale]);
};
