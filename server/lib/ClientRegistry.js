/**
 * Client Registry
 *
 * Runtime registry for all client manager instances. Provides lookup by
 * instanceId or clientType, filtering by connection state, and iteration.
 *
 * This is the runtime counterpart to clientMeta.js (static type config).
 * - clientMeta answers: "what type is this?" / "what can it do?"
 * - ClientRegistry answers: "give me the right manager" / "which managers are online?"
 *
 * Usage:
 *   const registry = require('./ClientRegistry');
 *   registry.register('qbit-local', 'qbittorrent', manager, { displayName: 'qBittorrent Local' });
 *   const mgr = registry.get('qbit-local');
 *   for (const mgr of registry.getConnected()) { ... }
 */

'use strict';

const clientMeta = require('./clientMeta');
const { validateId } = require('./instanceId');
const logger = require('./logger');

class ClientRegistry {
  constructor() {
    /** @type {Map<string, {manager: Object, clientType: string, displayName: string}>} */
    this._instances = new Map();
  }

  /**
   * Register a manager instance.
   * Attaches identity properties (instanceId, clientType, displayName) to the manager.
   *
   * @param {string} instanceId - Unique instance identifier (e.g. 'qbittorrent-localhost-8080')
   * @param {string} clientType - Client type key (must exist in clientMeta)
   * @param {Object} manager - Manager instance (AmuleManager, RtorrentManager, etc.)
   * @param {Object} [options]
   * @param {string} [options.displayName] - Human-readable label (defaults to clientMeta displayName)
   * @returns {Object} The registered manager
   * @throws {Error} If instanceId is already registered or clientType is unknown
   */
  register(instanceId, clientType, manager, { displayName } = {}) {
    const idValidation = validateId(instanceId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }
    if (this._instances.has(instanceId)) {
      throw new Error(`Instance "${instanceId}" is already registered`);
    }

    // Validate client type against clientMeta (throws on unknown)
    const meta = clientMeta.get(clientType);

    const resolvedDisplayName = displayName || meta.displayName;

    // Attach identity to the manager so consumers can inspect it
    manager.instanceId = instanceId;
    manager.clientType = clientType;
    manager.displayName = resolvedDisplayName;

    this._instances.set(instanceId, {
      manager,
      clientType,
      displayName: resolvedDisplayName
    });

    logger.log(`📋 Registry: registered "${instanceId}" (${clientType}) as "${resolvedDisplayName}"`);
    return manager;
  }

  /**
   * Unregister a manager instance.
   * Removes identity properties from the manager.
   *
   * @param {string} instanceId
   * @returns {boolean} True if the instance was found and removed
   */
  unregister(instanceId) {
    const entry = this._instances.get(instanceId);
    if (!entry) return false;

    // Clean up identity properties
    delete entry.manager.instanceId;
    delete entry.manager.clientType;
    delete entry.manager.displayName;

    this._instances.delete(instanceId);
    logger.log(`📋 Registry: unregistered "${instanceId}"`);
    return true;
  }

  /**
   * Get a manager by instance ID.
   * @param {string} instanceId
   * @returns {Object|null} Manager instance or null if not found
   */
  get(instanceId) {
    return this._instances.get(instanceId)?.manager || null;
  }

  /**
   * Get all managers of a given client type.
   * @param {string} clientType - e.g. 'qbittorrent'
   * @returns {Object[]} Array of manager instances
   */
  getByType(clientType) {
    const result = [];
    for (const entry of this._instances.values()) {
      if (entry.clientType === clientType) {
        result.push(entry.manager);
      }
    }
    return result;
  }

  /**
   * Get all registered managers.
   * @returns {Object[]} Array of manager instances
   */
  getAll() {
    return Array.from(this._instances.values()).map(e => e.manager);
  }

  /**
   * Get all registered instance IDs.
   * @returns {string[]}
   */
  getAllIds() {
    return Array.from(this._instances.keys());
  }

  /**
   * Get all connected managers (where manager.isConnected() returns true).
   * @returns {Object[]} Array of connected manager instances
   */
  getConnected() {
    const result = [];
    for (const entry of this._instances.values()) {
      if (typeof entry.manager.isConnected === 'function' && entry.manager.isConnected()) {
        result.push(entry.manager);
      }
    }
    return result;
  }

  /**
   * Get all enabled managers (where manager.isEnabled() returns true).
   * @returns {Object[]} Array of enabled manager instances
   */
  getEnabled() {
    const result = [];
    for (const entry of this._instances.values()) {
      if (typeof entry.manager.isEnabled === 'function' && entry.manager.isEnabled()) {
        result.push(entry.manager);
      }
    }
    return result;
  }

  /**
   * Iterate over all registered managers.
   * @param {Function} callback - Called with (manager, instanceId, clientType)
   */
  forEach(callback) {
    for (const [instanceId, entry] of this._instances) {
      callback(entry.manager, instanceId, entry.clientType);
    }
  }

  /**
   * Check if an instance ID is registered.
   * @param {string} instanceId
   * @returns {boolean}
   */
  has(instanceId) {
    return this._instances.has(instanceId);
  }

  /**
   * Get the number of registered instances.
   * @returns {number}
   */
  get size() {
    return this._instances.size;
  }

  /**
   * Remove all registered instances.
   * Useful for testing or full shutdown.
   */
  clear() {
    for (const [instanceId, entry] of this._instances) {
      delete entry.manager.instanceId;
      delete entry.manager.clientType;
      delete entry.manager.displayName;
    }
    this._instances.clear();
    logger.log('📋 Registry: cleared all instances');
  }
}

// Export singleton
module.exports = new ClientRegistry();
module.exports.ClientRegistry = ClientRegistry;
