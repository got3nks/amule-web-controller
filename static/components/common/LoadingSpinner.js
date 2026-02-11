/**
 * LoadingSpinner Component
 *
 * Reusable loading indicator
 */

import React from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

/**
 * Loading spinner component
 * @param {string|number} size - Size: 'sm', 'md', 'lg' (default: 'md') or pixel value
 * @param {string} text - Optional loading text
 * @param {string} color - Spinner color: 'blue' (default), 'white' (for colored buttons)
 */
const LoadingSpinner = ({ size = 'md', text = '', color = 'blue' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4'
  };

  const colorClasses = {
    blue: 'border-blue-600 border-t-transparent',
    white: 'border-white border-t-transparent'
  };

  // Handle both string presets and numeric pixel values
  let spinnerClass, spinnerStyle;
  if (typeof size === 'number') {
    // Use inline styles for numeric sizes
    spinnerClass = 'border-2';
    spinnerStyle = { width: `${size}px`, height: `${size}px` };
  } else {
    // Use preset classes for string sizes
    spinnerClass = sizeClasses[size] || sizeClasses.md;
    spinnerStyle = {};
  }

  const colorClass = colorClasses[color] || colorClasses.blue;

  const spinnerElement = h('div', {
    className: `${spinnerClass} ${colorClass} rounded-full animate-spin`,
    style: spinnerStyle
  });

  // If no text, return just the spinner (for inline use in buttons)
  if (!text) {
    return spinnerElement;
  }

  // With text, wrap in a flex container
  return h('div', { className: 'flex flex-col items-center justify-center gap-2' },
    spinnerElement,
    h('p', { className: 'text-sm text-gray-600 dark:text-gray-400' }, text)
  );
};

export default LoadingSpinner;
