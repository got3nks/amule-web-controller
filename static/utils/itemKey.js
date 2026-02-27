/**
 * Compound key utilities for multi-instance item identification.
 *
 * Frontend mirror of server/lib/itemKey.js.
 * Combines instanceId + hash into a single string key for use in
 * Sets, Maps, and React keys where items must be globally unique
 * across client instances.
 *
 * Format: "instanceId:lowerhash" (e.g. "qbit-local-8080:abc123def...")
 * Fallback: bare lowercase hash when instanceId is null/undefined.
 */

/**
 * Build a compound key from instanceId and hash.
 * @param {string|null|undefined} instanceId
 * @param {string} hash
 * @returns {string} Compound key or bare hash
 */
export function itemKey(instanceId, hash) {
  const h = hash?.toLowerCase() || '';
  if (!instanceId) return h;
  return `${instanceId}:${h}`;
}

/**
 * Parse a compound key back into instanceId and hash.
 * @param {string} key - Compound key or bare hash
 * @returns {{ instanceId: string|null, hash: string }}
 */
export function parseItemKey(key) {
  if (!key) return { instanceId: null, hash: '' };
  const idx = key.indexOf(':');
  if (idx === -1) return { instanceId: null, hash: key };
  return { instanceId: key.slice(0, idx), hash: key.slice(idx + 1) };
}
