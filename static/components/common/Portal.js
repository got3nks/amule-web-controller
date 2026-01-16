/**
 * Portal Component
 *
 * Renders children into a DOM node outside the parent component hierarchy
 * Useful for modals, tooltips, and context menus that need to escape
 * overflow:hidden containers or flex layout constraints
 */

import React from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0';

const { useEffect, useState } = React;

/**
 * Portal component - renders children at document.body level
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render in portal
 * @param {string} props.containerId - Optional container ID (default: 'portal-root')
 */
const Portal = ({ children, containerId = 'portal-root' }) => {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    // Try to find existing container
    let portalContainer = document.getElementById(containerId);

    // Create container if it doesn't exist
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = containerId;
      document.body.appendChild(portalContainer);
    }

    setContainer(portalContainer);

    // Cleanup: remove container if empty (optional - keeps DOM clean)
    return () => {
      if (portalContainer && portalContainer.childNodes.length === 0) {
        // Don't remove - other portals might use it
      }
    };
  }, [containerId]);

  // Don't render until container is ready
  if (!container) return null;

  return ReactDOM.createPortal(children, container);
};

export default Portal;
