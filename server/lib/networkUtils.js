/**
 * Network Utilities
 *
 * Common network-related helper functions
 */

const clientMeta = require('./clientMeta');

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

/**
 * aMule client software labels
 * Maps numeric client ID to human-readable name
 */
const CLIENT_SOFTWARE_LABELS = {
  0: 'aMule',
  1: 'eMule',
  2: 'eMule Compat',
  3: 'xMule',
  4: 'lMule',
  5: 'aMule',
  6: 'Shareaza',
  7: 'Old MLDonkey',
  8: 'Old MLDonkey',
  9: 'Old MLDonkey',
  10: 'MLDonkey',
  0xff: 'Unknown'
};

/**
 * Get client software name from upload/peer entry
 * @param {Object} item - Upload or peer item with EC_TAG_CLIENT_SOFTWARE
 * @returns {string} Client software name with version if available
 */
function getClientSoftwareName(item) {
  // For rtorrent, use the client string directly
  if (clientMeta.isBittorrent(item.clientType) || item.EC_TAG_CLIENT_SOFTWARE === -1) {
    return item.EC_TAG_CLIENT_SOFT_VER_STR || 'Unknown';
  }
  const baseName = CLIENT_SOFTWARE_LABELS[item.EC_TAG_CLIENT_SOFTWARE] || 'Unknown';
  const version = item.EC_TAG_CLIENT_SOFT_VER_STR;
  return version && version !== 'Unknown' ? `${baseName} ${version}` : baseName;
}

module.exports = {
  isValidIP,
  CLIENT_SOFTWARE_LABELS,
  getClientSoftwareName
};
