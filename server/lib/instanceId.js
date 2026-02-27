/**
 * Instance ID Utilities
 *
 * Single source of truth for generating, resolving, and validating
 * client instance identifiers. Instance IDs must be deterministic
 * (survive reboots without UUIDs) and safe for use as the prefix
 * in compound keys (instanceId:hash).
 *
 * Auto-generated format: {type}-{host}-{port}
 *   e.g. 'qbittorrent-192.168.1.100-8080', 'amule-amule-4712'
 *
 * Manual override: any string matching VALID_ID_PATTERN
 *   e.g. 'qbit-seedbox', 'my.remote.rtorrent'
 */

'use strict';

/**
 * Valid characters for instance IDs: letters, digits, hyphens, dots, underscores.
 * Colons are explicitly excluded (reserved for compound key separator).
 */
const VALID_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;

/**
 * Generate a deterministic instance ID from client config fields.
 *
 * Colons in the host (IPv6 addresses like '::1' or 'fe80::1') are replaced
 * with underscores since colons are reserved as the compound key separator.
 *
 * @param {string} type - Client type key (e.g. 'qbittorrent')
 * @param {string} host - Configured host/IP
 * @param {number|string} port - Configured port
 * @returns {string} Deterministic instance ID
 */
function generateId(type, host, port) {
  const safeHost = String(host).replace(/:/g, '_');
  return `${type}-${safeHost}-${port}`;
}

/**
 * Resolve the instance ID for a client config entry.
 * Uses manual id if set, otherwise generates a deterministic ID.
 *
 * @param {Object} entry - Client config entry with at least { type, host, port }
 * @param {string} [entry.id] - Optional manual ID override
 * @returns {string} Resolved instance ID
 */
function resolveId(entry) {
  return entry.id || generateId(entry.type, entry.host, entry.port);
}

/**
 * Validate an instance ID string.
 *
 * Rules:
 * - Must be a non-empty string
 * - Must match VALID_ID_PATTERN (letters, digits, hyphens, dots, underscores)
 * - Colons are excluded since they serve as the compound key separator
 *
 * @param {string} id - Instance ID to validate
 * @returns {{ valid: boolean, error?: string }}
 */
function validateId(id) {
  if (typeof id !== 'string' || id.length === 0) {
    return { valid: false, error: 'Instance ID must be a non-empty string' };
  }
  if (!VALID_ID_PATTERN.test(id)) {
    return { valid: false, error: `Instance ID "${id}" contains invalid characters (allowed: letters, digits, hyphens, dots, underscores)` };
  }
  return { valid: true };
}

module.exports = { generateId, resolveId, validateId, VALID_ID_PATTERN };
