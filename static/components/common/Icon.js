/**
 * Icon Component
 *
 * Renders inline SVG icons using Feather icon paths
 */

import React from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

/**
 * Icon component
 * @param {string} name - Icon name
 * @param {number} size - Icon size in pixels (default: 20)
 * @param {string} className - Additional CSS classes
 */
const Icon = ({ name, size = 20, className = '' }) => {
  // Stroke-based icons (viewBox 0 0 24 24)
  const icons = {
    search: '<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
    download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m14-7l-5 5m0 0l-5-5m5 5V3"/>',
    share: '<path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>',
    home: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
    refresh: '<path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>',
    trash: '<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M6 18L18 6M6 6l12 12"/>',
    chevronLeft: '<path d="M15 19l-7-7 7-7"/>',
    chevronRight: '<path d="M9 5l7 7-7 7"/>',
    chevronDown: '<path d="M19 9l-7 7-7-7"/>',
    chevronUp: '<path d="M5 15l7-7 7 7"/>',
    chevronFirst: '<path d="M11 19l-7-7 7-7m8 0l-7 7 7 7"/>',
    chevronLast: '<path d="M13 5l7 7-7 7m-8 0l7-7-7-7"/>',
    upload: '<path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4M17 8l-5-5m0 0L7 8m5-5v12"/>',
    sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
    moon: '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>',
    chartBar: '<path d="M3 3v18h18M7 16V9m4 7V6m4 10v-3m4 3V9"/>',
    fileText: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8m8 4H8m2-8H8"/>',
    server: '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
    harddrive: '<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>',
    plugConnect: '<path d="M12 2v4m0 0a4 4 0 014 4v4m-4-8a4 4 0 00-4 4v4m8 4v4m-8-4v4m4-4a4 4 0 01-4 4m4-4a4 4 0 004 4"/>',
    disconnect: '<path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    power: '<path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>',
    cloud: '<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>',
    folder: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
    folderSync: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><path d="M16 14a3 3 0 00-3-3m0 6a3 3 0 003-3m-3-3a3 3 0 00-3 3m6 0a3 3 0 01-3 3m0-6v.01M13 17v.01"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    edit: '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    alertTriangle: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    trendingUp: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
    warning: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    logOut: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
    moreVertical: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
    moreHorizontal: '<circle cx="12" cy="12" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
    bell: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
    github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>',
    externalLink: '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    history: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    arrowDown: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    arrowUp: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
    mapPin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>',
    user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  };

  // Fill-based icons (viewBox 0 0 512 512)
  const fillIcons = {
    docker: '<path d="M507,211.16c-1.42-1.19-14.25-10.94-41.79-10.94a132.55,132.55,0,0,0-21.61,1.9c-5.22-36.4-35.38-54-36.57-55l-7.36-4.28-4.75,6.9a101.65,101.65,0,0,0-13.06,30.45c-5,20.7-1.9,40.2,8.55,56.85-12.59,7.14-33,8.8-37.28,9H15.94A15.93,15.93,0,0,0,0,262.07,241.25,241.25,0,0,0,14.75,348.9C26.39,379.35,43.72,402,66,415.74,91.22,431.2,132.3,440,178.6,440a344.23,344.23,0,0,0,62.45-5.71,257.44,257.44,0,0,0,81.69-29.73,223.55,223.55,0,0,0,55.57-45.67c26.83-30.21,42.74-64,54.38-94h4.75c29.21,0,47.26-11.66,57.23-21.65a63.31,63.31,0,0,0,15.2-22.36l2.14-6.18Z"/><path d="M47.29,236.37H92.4a4,4,0,0,0,4-4V191.89a4,4,0,0,0-4-4H47.29a4,4,0,0,0-4,4v40.44a4.16,4.16,0,0,0,4,4"/><path d="M109.5,236.37h45.12a4,4,0,0,0,4-4V191.89a4,4,0,0,0-4-4H109.5a4,4,0,0,0-4,4v40.44a4.16,4.16,0,0,0,4,4"/><path d="M172.9,236.37H218a4,4,0,0,0,4-4V191.89a4,4,0,0,0-4-4H172.9a4,4,0,0,0-4,4v40.44a3.87,3.87,0,0,0,4,4"/><path d="M235.36,236.37h45.12a4,4,0,0,0,4-4V191.89a4,4,0,0,0-4-4H235.36a4,4,0,0,0-4,4v40.44a4,4,0,0,0,4,4"/><path d="M109.5,178.57h45.12a4.16,4.16,0,0,0,4-4V134.09a4,4,0,0,0-4-4H109.5a4,4,0,0,0-4,4v40.44a4.34,4.34,0,0,0,4,4"/><path d="M172.9,178.57H218a4.16,4.16,0,0,0,4-4V134.09a4,4,0,0,0-4-4H172.9a4,4,0,0,0-4,4v40.44a4,4,0,0,0,4,4"/><path d="M235.36,178.57h45.12a4.16,4.16,0,0,0,4-4V134.09a4.16,4.16,0,0,0-4-4H235.36a4,4,0,0,0-4,4v40.44a4.16,4.16,0,0,0,4,4"/><path d="M235.36,120.53h45.12a4,4,0,0,0,4-4V76a4.16,4.16,0,0,0-4-4H235.36a4,4,0,0,0-4,4v40.44a4.17,4.17,0,0,0,4,4"/><path d="M298.28,236.37H343.4a4,4,0,0,0,4-4V191.89a4,4,0,0,0-4-4H298.28a4,4,0,0,0-4,4v40.44a4.16,4.16,0,0,0,4,4"/>'
  };

  // Check if it's a fill-based icon
  if (fillIcons[name]) {
    return h('svg', {
      className: `inline-block ${className}`,
      width: size,
      height: size,
      fill: 'currentColor',
      viewBox: '0 0 512 512',
      dangerouslySetInnerHTML: { __html: fillIcons[name] }
    });
  }

  return h('svg', {
    className: `inline-block ${className}`,
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    viewBox: '0 0 24 24',
    dangerouslySetInnerHTML: { __html: icons[name] }
  });
};

export default Icon;
