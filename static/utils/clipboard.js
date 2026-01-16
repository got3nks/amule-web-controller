/**
 * Clipboard Utilities
 *
 * Cross-browser clipboard operations with fallback for HTTP/LAN hosts
 */

/**
 * Copy text to clipboard with fallback for non-HTTPS environments
 * @param {string} text - Text to copy to clipboard
 * @returns {Promise<boolean>} - True if copy succeeded, false otherwise
 */
export const copyToClipboard = async (text) => {
  if (!text) return false;

  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for HTTP / LAN hosts
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';

    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};
