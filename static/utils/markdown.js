/**
 * Markdown Utilities
 *
 * Simple markdown parsing helpers for UI components
 */

import React from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

/**
 * Parse markdown bold syntax (**text**) into React elements
 * @param {string} text - Text that may contain **bold** markers
 * @returns {Array} Array of strings and bold elements
 */
export const parseMarkdownBold = (text) => {
  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the bold text
    parts.push(h('strong', { key: match.index, className: 'font-semibold text-gray-800 dark:text-gray-200' }, match[1]));
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};
