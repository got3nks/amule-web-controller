/**
 * TestButton Component
 *
 * Button for testing configuration with loading state
 */

import React from 'https://esm.sh/react@18.2.0';
import { LoadingSpinner, Button } from '../common/index.js';

const { createElement: h } = React;

/**
 * TestButton component
 * @param {function} onClick - Click handler
 * @param {boolean} loading - Loading state
 * @param {boolean} disabled - Disabled state
 * @param {string} children - Button text
 */
const TestButton = ({ onClick, loading = false, disabled = false, children = 'Test' }) => {
  return h(Button, {
    type: 'button',
    variant: 'primary',
    onClick,
    disabled: disabled || loading
  },
    loading && h(LoadingSpinner, { size: 16, color: 'white' }),
    children
  );
};

export default TestButton;
