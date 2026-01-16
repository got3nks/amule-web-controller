/**
 * FontSizeContext
 *
 * Provides global font size control (small/medium/large) to the entire app
 * Applies CSS custom properties for base sizes and form elements
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

const FontSizeContext = createContext(null);

// Font size configurations
const FONT_SIZE_CONFIG = {
  small: {
    base: '13px',
    scale: 0.9,
    formScale: 0.9,
    label: 'Small'
  },
  medium: {
    base: '14px',
    scale: 1.0,
    formScale: 1.0,
    label: 'Medium'
  },
  large: {
    base: '16px',
    scale: 1.15,
    formScale: 1.1,
    label: 'Large'
  }
};

export const FONT_SIZES = Object.keys(FONT_SIZE_CONFIG);

export const FontSizeProvider = ({ children }) => {
  const [fontSize, setFontSize] = useState(() => {
    // Try to load from localStorage, default to medium
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('amule-font-size');
        if (saved && FONT_SIZE_CONFIG[saved]) {
          return saved;
        }
      } catch (err) {
        console.error('Failed to load font size from localStorage:', err);
      }
    }
    return 'medium';
  });

  // Apply font size CSS custom properties to document
  useEffect(() => {
    const root = document.documentElement;
    const config = FONT_SIZE_CONFIG[fontSize];

    // Set CSS custom properties
    root.style.setProperty('--font-size-base', config.base);
    root.style.setProperty('--font-size-scale', config.scale.toString());
    root.style.setProperty('--font-size-form-scale', config.formScale.toString());

    // Apply base font size class to body for Tailwind
    document.body.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
    document.body.classList.add(`text-size-${fontSize}`);

    // Save to localStorage
    try {
      localStorage.setItem('amule-font-size', fontSize);
    } catch (err) {
      console.error('Failed to save font size to localStorage:', err);
    }
  }, [fontSize]);

  // Cycle through font sizes: small -> medium -> large -> small
  const cycleFontSize = useCallback(() => {
    setFontSize(prev => {
      const sizes = FONT_SIZES;
      const currentIndex = sizes.indexOf(prev);
      const nextIndex = (currentIndex + 1) % sizes.length;
      return sizes[nextIndex];
    });
  }, []);

  // Set specific font size
  const setFontSizeValue = useCallback((size) => {
    if (FONT_SIZE_CONFIG[size]) {
      setFontSize(size);
    }
  }, []);

  // Get current configuration
  const fontSizeConfig = useMemo(() => FONT_SIZE_CONFIG[fontSize], [fontSize]);

  // Memoize context value
  const value = useMemo(() => ({
    fontSize,
    fontSizeConfig,
    cycleFontSize,
    setFontSize: setFontSizeValue,
    FONT_SIZES,
    getScaledSize: (baseSize) => {
      const scale = fontSizeConfig.scale;
      const numericSize = parseInt(baseSize, 10);
      return `${Math.round(numericSize * scale)}px`;
    }
  }), [fontSize, fontSizeConfig, cycleFontSize, setFontSizeValue]);

  return h(FontSizeContext.Provider, { value }, children);
};

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within FontSizeProvider');
  }
  return context;
};
