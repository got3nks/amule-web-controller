/**
 * Network Utilities
 *
 * Common network-related helper functions
 */

/**
 * Convert IP from number to string (aMule sends IPs as little-endian integers)
 * @param {number|string} ip - IP as number or string
 * @returns {string|null} - IP string or null if invalid
 */
function ipToString(ip) {
  if (typeof ip === 'string') {
    return ip;
  }
  if (typeof ip === 'number' && ip > 0) {
    // Convert 32-bit little-endian integer to dotted quad
    return [
      ip & 0xFF,
      (ip >>> 8) & 0xFF,
      (ip >>> 16) & 0xFF,
      (ip >>> 24) & 0xFF
    ].join('.');
  }
  return null;
}

/**
 * Validate IP address format
 * @param {string} ip - IP to validate
 * @returns {boolean}
 */
function isValidIP(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

module.exports = {
  ipToString,
  isValidIP
};
