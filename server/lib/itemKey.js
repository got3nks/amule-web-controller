/**
 * Compound Key Utilities
 *
 * Helpers for building and parsing compound keys used to uniquely identify
 * items across multiple client instances.  Format: `instanceId:hash`.
 *
 * When instanceId is null/undefined the key falls back to the raw hash,
 * preserving backward compatibility with single-instance setups.
 *
 * The colon separator is safe because instanceId.js (VALID_ID_PATTERN)
 * explicitly excludes colons from valid instance IDs.
 */

'use strict';

/**
 * Build a compound Map key from an instance ID and a hash.
 *
 * @param {string|null} instanceId - Client instance identifier (may be null)
 * @param {string} hash            - File/torrent hash (will be lower-cased)
 * @returns {string} `instanceId:lowerhash` or just `lowerhash`
 */
function itemKey(instanceId, hash) {
  const h = hash.toLowerCase();
  return instanceId ? `${instanceId}:${h}` : h;
}

/**
 * Parse a compound key back into its parts.
 *
 * @param {string} key - Compound key produced by itemKey()
 * @returns {{ instanceId: string|null, hash: string }}
 */
function parseItemKey(key) {
  const idx = key.indexOf(':');
  if (idx === -1) return { instanceId: null, hash: key };
  return { instanceId: key.slice(0, idx), hash: key.slice(idx + 1) };
}

module.exports = { itemKey, parseItemKey };
