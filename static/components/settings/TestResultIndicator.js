/**
 * TestResultIndicator Component
 *
 * Shows test result with success/failure state and details
 */

import React from 'https://esm.sh/react@18.2.0';
import { AlertBox } from '../common/index.js';

const { createElement: h } = React;

/**
 * TestResultIndicator component
 * @param {object} result - Test result object
 * @param {string} label - Label for the test
 */
const TestResultIndicator = ({ result, label }) => {
  if (!result) return null;

  // Determine if this is a success
  // Priority: if success is explicitly false, it's not a success
  // Otherwise check for connected/reachable flags
  const isSuccess = result.success === false
    ? false
    : (result.success || result.connected || (result.reachable && result.authenticated));

  const hasWarning = result.warning && !result.error;

  // Determine AlertBox type based on state
  let type;
  if (isSuccess && !hasWarning) {
    type = 'success';
  } else if (isSuccess && hasWarning) {
    type = 'warning';
  } else {
    type = 'error';
  }

  return h(AlertBox, {
    type,
    className: 'mt-2'
  },
    h('div', {},
      h('p', { className: 'font-medium' }, label),
      result.version && h('p', {
        className: 'text-sm mt-1'
      }, `Version: ${result.version}`),
      result.message && h('p', {
        className: 'text-sm mt-1'
      }, result.message),
      result.warning && h('p', {
        className: 'text-sm mt-1'
      }, result.warning),
      result.error && h('p', {
        className: 'text-sm text-red-700 dark:text-red-400 mt-1'
      }, result.error),
      // Directory-specific results
      result.readable !== undefined && h('p', {
        className: 'text-sm text-gray-600 dark:text-gray-400 mt-1'
      }, `Readable: ${result.readable ? '✓' : '✗'}, Writable: ${result.writable ? '✓' : '✗'}`)
    )
  );
};

export default TestResultIndicator;
