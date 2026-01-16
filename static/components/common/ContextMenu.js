/**
 * ContextMenu Component
 *
 * A reusable context menu with smart positioning
 * Supports right-click and button-triggered modes
 */

import React from 'https://esm.sh/react@18.2.0';
import Icon from './Icon.js';
import Portal from './Portal.js';

const { createElement: h, useEffect, useRef, useState, useCallback } = React;

/**
 * ContextMenu component
 * @param {boolean} show - Whether the menu is visible
 * @param {number} x - X position for the menu
 * @param {number} y - Y position for the menu
 * @param {Array} items - Menu items array [{label, icon, iconColor, onClick, disabled}]
 * @param {function} onClose - Callback when menu should close
 * @param {HTMLElement} anchorEl - Optional anchor element for smart positioning (for button-triggered mode)
 */
const ContextMenu = ({ show, x, y, items, onClose, anchorEl }) => {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ x, y, expandUp: false });

  // Calculate position and determine if menu should expand upward
  useEffect(() => {
    if (!show) return;

    const updatePosition = () => {
      const menuHeight = menuRef.current?.offsetHeight || 200;
      const menuWidth = menuRef.current?.offsetWidth || 180;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const padding = 8;

      let newX = x;
      let newY = y;
      let expandUp = false;

      // Check if menu would overflow bottom
      if (y + menuHeight + padding > viewportHeight) {
        expandUp = true;
        // If we have an anchor element, position above it
        if (anchorEl) {
          const rect = anchorEl.getBoundingClientRect();
          newY = rect.top - menuHeight - 2;
        } else {
          newY = y - menuHeight;
        }
      }

      // Check if menu would overflow right
      if (x + menuWidth + padding > viewportWidth) {
        newX = x - menuWidth;
      }

      // Ensure menu doesn't go off-screen on left or top
      if (newX < padding) newX = padding;
      if (newY < padding) newY = padding;

      setPosition({ x: newX, y: newY, expandUp });
    };

    // Initial positioning
    updatePosition();

    // Use RAF for smoother positioning after render
    requestAnimationFrame(updatePosition);
  }, [show, x, y, anchorEl]);

  // Handle click outside
  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [show, onClose]);

  if (!show) return null;

  return h(Portal, null,
    h('div', {
      ref: menuRef,
      className: 'fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] animate-fadeIn',
      style: {
        left: position.x,
        top: position.y,
        transformOrigin: position.expandUp ? 'bottom' : 'top'
      }
    },
    items.filter(item => !item.hidden).map((item, idx) => {
      if (item.divider) {
        return h('div', {
          key: `divider-${idx}`,
          className: 'border-t border-gray-200 dark:border-gray-700 my-1'
        });
      }

      return h('button', {
        key: idx,
        onClick: (e) => {
          e.stopPropagation();
          if (!item.disabled) {
            item.onClick();
            onClose();
          }
        },
        disabled: item.disabled,
        className: `w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
          item.disabled
            ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        } transition-colors`
      },
        item.icon && h(Icon, {
          name: item.icon,
          size: 16,
          className: item.iconColor || 'text-gray-500 dark:text-gray-400'
        }),
        h('span', null, item.label)
      );
    })
  ));
};

/**
 * Hook to manage context menu state
 * @returns {Object} Context menu state and handlers
 */
export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    item: null,
    anchorEl: null
  });

  const openContextMenu = useCallback((e, item, anchorEl = null) => {
    e.preventDefault();
    e.stopPropagation();

    let x, y;

    if (anchorEl) {
      // Button-triggered mode: position relative to the anchor element
      const rect = anchorEl.getBoundingClientRect();
      x = rect.left;
      y = rect.bottom;
    } else {
      // Right-click mode: use mouse/touch position
      x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    }

    setContextMenu({
      show: true,
      x,
      y,
      item,
      anchorEl
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, show: false }));
  }, []);

  return { contextMenu, openContextMenu, closeContextMenu };
};

/**
 * More button component (three dots) for triggering context menu
 * @param {function} onClick - Click handler
 * @param {string} className - Additional CSS classes
 */
export const MoreButton = ({ onClick, className = '' }) => {
  return h('button', {
    onClick,
    className: `p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center ${className}`,
    title: 'More options'
  },
    h(Icon, { name: 'moreVertical', size: 16, className: 'text-gray-600 dark:text-gray-400 block' })
  );
};

export default ContextMenu;
