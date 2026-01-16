/**
 * VersionBadge Component
 *
 * Displays current version in header
 * Clickable to open About modal
 * Shows update indicator when new version available
 */

import React from 'https://esm.sh/react@18.2.0';
import { useVersion } from '../../contexts/index.js';
import Icon from './Icon.js';
import Tooltip from './Tooltip.js';

const { createElement: h } = React;

/**
 * VersionBadge component
 * @param {function} onClick - Click handler to open About modal
 */
const VersionBadge = ({ onClick }) => {
  const { version, updateAvailable, loading } = useVersion();

  if (loading) {
    return h('span', {
      className: 'text-xs text-gray-400 dark:text-gray-500 px-2 py-0.5'
    }, '...');
  }

  return h(Tooltip, {
    content: updateAvailable ? 'Update available! Click for details' : 'About this app',
    position: 'bottom',
    showOnMobile: false
  },
    h('button', {
      onClick,
      className: `
        inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium
        transition-all duration-200 hover:scale-105
        ${updateAvailable
          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }
      `
    },
      h('span', null, `v${version}`),
      updateAvailable && h(Icon, {
        name: 'bell',
        size: 12,
        className: 'text-amber-600 dark:text-amber-400 animate-pulse'
      })
    )
  );
};

export default VersionBadge;
