/**
 * SelectionCheckbox Component
 *
 * Reusable checkbox for table row selection mode.
 * Consistent styling across all views.
 */

import React from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

/**
 * SelectionCheckbox component
 * @param {boolean} checked - Whether the checkbox is checked
 * @param {function} onChange - Change handler
 * @param {boolean} disabled - Whether the checkbox is disabled (non-owned items)
 */
const SelectionCheckbox = ({ checked, onChange, disabled }) => {
  return h('div', {
    className: 'flex items-center justify-center',
    onClick: (e) => e.stopPropagation() // Prevent row click when clicking checkbox area
  },
    h('input', {
      type: 'checkbox',
      checked,
      onChange: disabled ? undefined : onChange,
      disabled,
      className: `w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`
    })
  );
};

export default SelectionCheckbox;
