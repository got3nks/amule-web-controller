/**
 * DeltaEngine - Compute incremental diffs between broadcast cycles
 *
 * Maintains the previous items snapshot and computes added/removed/changed
 * deltas for each broadcast cycle. Reduces WebSocket payload by 80-95%
 * for steady-state updates where most items are unchanged.
 *
 * Field comparison: primitives use strict ===, objects/arrays use JSON.stringify.
 * The `raw` and `trackersDetailed` fields are excluded (stripped in Phase 0).
 */

'use strict';

const { itemKey } = require('./itemKey');

class DeltaEngine {
  constructor() {
    /** @type {Map<string, Object>} Previous items keyed by compound key */
    this._previousItems = new Map();
    /** @type {number} Monotonic sequence number */
    this._seq = 0;
    /** @type {Object|null} Previous categories/clientDefaultPaths/hasPathWarnings */
    this._previousMeta = null;
  }

  /**
   * Compute delta between current and previous items
   * @param {Array<Object>} currentItems - Current broadcast items
   * @returns {{ seq: number, added: Array, removed: Array<string>, changed: Array }}
   */
  computeDelta(currentItems) {
    const currentMap = new Map();
    for (const item of currentItems) {
      const key = itemKey(item.instanceId, item.hash);
      currentMap.set(key, item);
    }

    const added = [];
    const removed = [];
    const changed = [];

    // Detect added and changed items
    for (const [key, item] of currentMap) {
      const prev = this._previousItems.get(key);
      if (!prev) {
        added.push(item);
      } else {
        const diff = this._diffItem(prev, item);
        if (diff) {
          // Include key fields so frontend can identify the item
          diff.hash = item.hash;
          diff.instanceId = item.instanceId;
          changed.push(diff);
        }
      }
    }

    // Detect removed items
    for (const key of this._previousItems.keys()) {
      if (!currentMap.has(key)) {
        removed.push(key);
      }
    }

    // Update previous state
    this._previousItems = currentMap;
    this._seq++;

    return { seq: this._seq, added, removed, changed };
  }

  /**
   * Compare metadata fields and return only changed ones
   * @param {{ categories?: Array, clientDefaultPaths?: Object, hasPathWarnings?: boolean }} meta
   * @returns {{ categories?: Array, clientDefaultPaths?: Object, hasPathWarnings?: boolean }|null}
   */
  computeMetaDelta(meta) {
    const result = {};
    let hasChanges = false;

    if (!this._previousMeta) {
      this._previousMeta = meta;
      return meta; // First cycle — send everything
    }

    if (meta.categories !== undefined) {
      if (JSON.stringify(meta.categories) !== JSON.stringify(this._previousMeta.categories)) {
        result.categories = meta.categories;
        hasChanges = true;
      }
    }
    if (meta.clientDefaultPaths !== undefined) {
      if (JSON.stringify(meta.clientDefaultPaths) !== JSON.stringify(this._previousMeta.clientDefaultPaths)) {
        result.clientDefaultPaths = meta.clientDefaultPaths;
        hasChanges = true;
      }
    }
    if (meta.hasPathWarnings !== undefined) {
      if (meta.hasPathWarnings !== this._previousMeta.hasPathWarnings) {
        result.hasPathWarnings = meta.hasPathWarnings;
        hasChanges = true;
      }
    }

    this._previousMeta = meta;
    return hasChanges ? result : null;
  }

  /**
   * Check if delta should fall back to full snapshot
   * (when more than 50% of items changed — e.g. client reconnect)
   * @param {{ added: Array, changed: Array }} delta
   * @param {number} totalItems - Total current item count
   * @returns {boolean}
   */
  shouldFallback(delta, totalItems) {
    if (totalItems === 0) return false;
    return (delta.added.length + delta.changed.length) > totalItems * 0.5;
  }

  /**
   * Get current sequence number
   * @returns {number}
   */
  getSeq() {
    return this._seq;
  }

  /**
   * Reset all state (e.g. when all clients disconnect)
   */
  reset() {
    this._previousItems.clear();
    this._seq = 0;
    this._previousMeta = null;
  }

  /**
   * Diff two items, returning only changed fields (or null if identical)
   * @param {Object} prev - Previous item
   * @param {Object} curr - Current item
   * @returns {Object|null} Object with changed fields, or null
   */
  _diffItem(prev, curr) {
    let diff = null;

    // Get all keys from both objects
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

    for (const key of allKeys) {
      // Skip identity fields (always included in diff header)
      if (key === 'hash' || key === 'instanceId') continue;

      const pVal = prev[key];
      const cVal = curr[key];

      // Peer-level delta: diff individual peers instead of re-sending entire array
      if (key === 'peers') {
        const peersDelta = this._diffPeers(pVal || [], cVal || []);
        if (peersDelta) {
          if (!diff) diff = {};
          diff.peers = peersDelta;
        }
        continue;
      }

      if (!this._valuesEqual(pVal, cVal)) {
        if (!diff) diff = {};
        diff[key] = cVal;
      }
    }

    return diff;
  }

  /**
   * Compute peer-level delta between two peers arrays
   * @param {Array} prevPeers
   * @param {Array} currPeers
   * @returns {{ added?: Array, removed?: Array<string>, changed?: Array }|null}
   */
  _diffPeers(prevPeers, currPeers) {
    const prevMap = new Map();
    for (const p of prevPeers) prevMap.set(p.id, p);

    const currMap = new Map();
    for (const p of currPeers) currMap.set(p.id, p);

    const added = [];
    const removed = [];
    const changed = [];

    // Detect added and changed peers
    for (const [id, peer] of currMap) {
      const prev = prevMap.get(id);
      if (!prev) {
        added.push(peer);
      } else {
        // Diff individual peer fields (skip id — it's the key)
        let peerDiff = null;
        for (const field of Object.keys(peer)) {
          if (field === 'id') continue;
          if (!this._valuesEqual(prev[field], peer[field])) {
            if (!peerDiff) peerDiff = {};
            peerDiff[field] = peer[field];
          }
        }
        // Check for removed fields
        for (const field of Object.keys(prev)) {
          if (field === 'id') continue;
          if (!(field in peer)) {
            if (!peerDiff) peerDiff = {};
            peerDiff[field] = undefined;
          }
        }
        if (peerDiff) {
          peerDiff.id = id;
          changed.push(peerDiff);
        }
      }
    }

    // Detect removed peers
    for (const id of prevMap.keys()) {
      if (!currMap.has(id)) {
        removed.push(id);
      }
    }

    if (added.length === 0 && removed.length === 0 && changed.length === 0) {
      return null; // No changes
    }

    const delta = {};
    if (added.length > 0) delta.added = added;
    if (removed.length > 0) delta.removed = removed;
    if (changed.length > 0) delta.changed = changed;
    return delta;
  }

  /**
   * Compare two values for equality
   * @param {*} a
   * @param {*} b
   * @returns {boolean}
   */
  _valuesEqual(a, b) {
    if (a === b) return true;
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    // Both are objects/arrays — use JSON comparison
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    return false;
  }
}

module.exports = DeltaEngine;
