/**
 * EnableToggle Component
 *
 * Toggle switch for enabling/disabling features.
 * ToggleSwitch is the standalone switch element (used in cards).
 * EnableToggle wraps it with a label/description row (used in forms).
 */

import React from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

/**
 * Standalone toggle switch (no label)
 * @param {boolean} enabled - Enabled state
 * @param {function} onChange - Change handler (receives new boolean)
 * @param {boolean} disabled - Whether the toggle is disabled
 * @param {string} color - Active color: 'green' (default) or 'blue'
 */
const ToggleSwitch = ({ enabled, onChange, disabled = false, color = 'green' }) => {
  return h('button', {
    type: 'button',
    onClick: () => !disabled && onChange(!enabled),
    disabled,
    className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors
      ${enabled ? (color === 'blue' ? 'bg-blue-600' : 'bg-green-500') : 'bg-gray-200 dark:bg-gray-700'}
      ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`,
    role: 'switch',
    'aria-checked': enabled
  },
    h('span', {
      className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform
        ${enabled ? 'translate-x-6' : 'translate-x-1'}`
    })
  );
};

/**
 * Toggle with label and optional description
 * @param {boolean} enabled - Enabled state
 * @param {function} onChange - Change handler
 * @param {string} label - Toggle label
 * @param {string} description - Toggle description
 * @param {boolean} disabled - Whether the toggle is disabled
 * @param {string} color - Active color: 'green' (default) or 'blue'
 */
const EnableToggle = ({ enabled, onChange, label, description, disabled = false, color = 'green' }) => {
  return h('div', {
    className: `flex items-center justify-between py-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`,
    onClick: () => !disabled && onChange(!enabled)
  },
    h('div', { className: 'flex-1' },
      h('label', { className: `block text-sm font-medium text-gray-700 dark:text-gray-300 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}` }, label),
      description && h('p', { className: 'text-sm text-gray-500 dark:text-gray-400 mt-0.5' }, description)
    ),
    h(ToggleSwitch, { enabled, onChange, disabled, color })
  );
};

export { ToggleSwitch };
export default EnableToggle;
