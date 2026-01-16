/**
 * Header Component
 *
 * Displays the app logo, title, theme toggle, and font size control
 */

import React from 'https://esm.sh/react@18.2.0';
import { Icon, Tooltip, VersionBadge } from '../common/index.js';
import { useFontSize } from '../../contexts/FontSizeContext.js';

const { createElement: h } = React;

/**
 * Header component
 * @param {string} theme - Current theme (dark/light)
 * @param {function} onToggleTheme - Theme toggle handler
 * @param {boolean} isLandscape - Is device in landscape mode
 * @param {function} onNavigateHome - Navigate to home handler
 * @param {function} onOpenAbout - Open about modal handler
 * @param {boolean} authEnabled - Whether authentication is enabled
 * @param {function} onLogout - Logout handler
 */
const Header = ({ theme, onToggleTheme, isLandscape, onNavigateHome, onOpenAbout, authEnabled = false, onLogout }) => {
  const { fontSize, fontSizeConfig, cycleFontSize } = useFontSize();

  return h('header', { className: 'bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700' },
    h('div', { className: 'mx-auto px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between' },
      h('div', { className: 'flex items-center gap-1.5 sm:gap-3' },
        h('img', { src: '/static/logo-brax.png', alt: 'aMule', className: 'w-6 h-6 sm:w-10 sm:h-10 object-contain' }),
        h('h1', { className: 'font-bold text-gray-800 dark:text-gray-100', style: { fontSize: '16px' } }, 'aMule Controller'),
        // Version badge
        onOpenAbout && h(VersionBadge, { onClick: onOpenAbout })
      ),
      h('div', { className: 'flex items-center gap-1' },
        // Logout button (only show if authentication is enabled)
        authEnabled && onLogout && h(Tooltip, {
                content: 'Logout',
                position: 'left',
                showOnMobile: false
            },
            h('button', {
                onClick: onLogout,
                className: 'p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
            }, h(Icon, { name: 'logOut', size: 18, className: 'text-gray-600 dark:text-gray-300' }))
        ),
        // Font size toggle button
        h(Tooltip, {
          content: `Font size: ${fontSizeConfig.label}`,
          position: 'left',
          showOnMobile: false
        },
          h('button', {
            onClick: cycleFontSize,
            className: 'p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center min-w-[30px]'
          },
            h('span', {
              className: `font-bold text-gray-600 dark:text-gray-300 ${fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm'}`
            }, 'Aa')
          )
        ),
        // Theme toggle button
        h(Tooltip, {
          content: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
          position: 'left',
          showOnMobile: false
        },
          h('button', {
            onClick: onToggleTheme,
            className: 'p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
          }, h(Icon, { name: theme === 'dark' ? 'sun' : 'moon', size: 18, className: 'text-gray-600 dark:text-gray-300' }))
        ),
        // Show home button only in landscape mode (mobile portrait uses bottom nav)
        isLandscape && h(Tooltip, {
          content: 'Go to Home',
          position: 'left',
          showOnMobile: false
        },
          h('button', {
            onClick: onNavigateHome,
            className: 'p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
          }, h(Icon, { name: 'home', size: 20, className: 'text-gray-600 dark:text-gray-300' }))
        )
      )
    )
  );
};

// Memoize to prevent re-renders when parent context changes but props don't
export default React.memo(Header);
