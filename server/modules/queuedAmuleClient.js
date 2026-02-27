/**
 * QueuedAmuleClient - Wrapper class for amule-ec-node that automatically manages request queuing
 * This eliminates the need to manually call enqueueAmuleCall throughout the codebase
 */

const AmuleClient = require('amule-ec-node');
const logger = require('../lib/logger');

class QueuedAmuleClient {
  constructor(host, port, password, options = {}) {
    this.client = new AmuleClient(host, port, password, options);
    this.requestQueue = Promise.resolve();
    this.pendingRequests = 0;
    this.connectionLost = false;
    this.errorHandler = null;

    // Cache for EC_TAG_PARTFILE_SOURCE_NAMES data (keyed by file hash)
    this.sourceNamesCache = new Map();

    // Add error handling for the underlying protocol to prevent crashes
    this.setupErrorHandlers();

    // Create a proxy to handle all method calls automatically
    return new Proxy(this, {
      get(target, prop) {
        // Handle our own methods
        if (prop in target && typeof target[prop] === 'function') {
          return target[prop].bind(target);
        }

        // Handle client methods with special handling
        if (target.client && typeof target.client[prop] === 'function') {
          return (...args) => {
            if (prop === 'getDownloadQueue') {
              return target.getDownloadQueueWithCache(...args);
            }
            return target.queueRequest(() => target.client[prop](...args), prop);
          };
        }

        // Handle properties
        return target.client ? target.client[prop] : undefined;
      }
    });
  }

  /**
   * Setup error handlers to prevent unhandled errors from crashing the server
   */
  setupErrorHandlers() {
    try {
      // Access the underlying ECProtocol session if available
      // AmuleClient uses 'session' not 'protocol'
      if (this.client && this.client.session) {
        const session = this.client.session;

        // Add error event listener
        if (session.socket) {
          session.socket.on('error', (err) => {
            logger.error('[QueuedAmuleClient] Socket error:', err.message);
            this.connectionLost = true;
            if (this.errorHandler) {
              this.errorHandler(err);
            }
          });

          session.socket.on('close', () => {
            this.connectionLost = true;
          });
        }
      }
    } catch (err) {
      // Ignore setup errors - this is defensive programming
      logger.warn('[QueuedAmuleClient] Could not setup error handlers:', err.message);
    }
  }

  /**
   * Set external error handler
   */
  onError(handler) {
    this.errorHandler = handler;
  }

  // Internal queue management
  queueRequest(fn, methodName) {
    const previous = this.requestQueue;
    this.pendingRequests++;

    const current = previous
      .then(() => fn())
      .catch(err => {
        logger.warn(`QueuedAmuleClient request failed (${methodName}):`, err.message);
        return null;
      })
      .finally(() => {
        this.pendingRequests--;
      });

    this.requestQueue = current.then(() => {}, () => {});
    return current;
  }

  // Connection methods - NOT queued as they establish the connection itself
  async connect() {
    try {
      this.connectionLost = false;
      const result = await this.client.connect();
      // Setup error handlers after successful connection
      this.setupErrorHandlers();
      return result;
    } catch (err) {
      this.connectionLost = true;
      throw err;
    }
  }

  async disconnect() {
    try {
      if (this.client && typeof this.client.close === 'function') {
        // AmuleClient uses close() not disconnect()
        return await this.client.close();
      }
    } catch (err) {
      // Ignore disconnect errors
      logger.warn('[QueuedAmuleClient] Disconnect error:', err.message);
    }
  }

  /**
   * Wrapper for getDownloadQueue that caches EC_TAG_PARTFILE_SOURCE_NAMES data
   * aMule sends incremental updates with _value as index. We need to merge updates.
   * This method maintains a complete cache and merges incremental changes.
   */
  async getDownloadQueueWithCache(...args) {
    return this.queueRequest(async () => {
      const result = await this.client.getDownloadQueue(...args);

      if (!result || !Array.isArray(result)) {
        return result;
      }

      // Process each file in the download queue
      result.forEach(file => {
        const fileHash = file?.raw?.EC_TAG_PARTFILE_HASH;
        if (!fileHash) return;

        const newSourceNames = file.raw?.EC_TAG_PARTFILE_SOURCE_NAMES;

        if (newSourceNames) {
          // Get existing cached data
          const cached = this.sourceNamesCache.get(fileHash);

          // Merge new data with cached data
          const merged = this.mergeSourceNames(cached, newSourceNames);

          // Update cache and file data
          this.sourceNamesCache.set(fileHash, merged);
          file.raw.EC_TAG_PARTFILE_SOURCE_NAMES = merged;
        } else if (this.sourceNamesCache.has(fileHash)) {
          // No SOURCE_NAMES in response, restore from cache
          file.raw.EC_TAG_PARTFILE_SOURCE_NAMES = this.sourceNamesCache.get(fileHash);
        }
      });

      return result;
    }, 'getDownloadQueue');
  }

  /**
   * Merge SOURCE_NAMES data based on _value index
   * @param {Object} cached - Cached SOURCE_NAMES structure
   * @param {Object} incoming - New SOURCE_NAMES data from aMule
   * @returns {Object} Merged SOURCE_NAMES structure
   */
  mergeSourceNames(cached, incoming) {
    // Extract the inner data
    const cachedInner = cached?.EC_TAG_PARTFILE_SOURCE_NAMES;
    const incomingInner = incoming?.EC_TAG_PARTFILE_SOURCE_NAMES;

    if (!incomingInner) {
      return cached || incoming;
    }

    // Convert to arrays for processing
    const cachedArray = Array.isArray(cachedInner) ? cachedInner : (cachedInner ? [cachedInner] : []);
    const incomingArray = Array.isArray(incomingInner) ? incomingInner : [incomingInner];

    // Create a map of cached items by _value
    const mergedMap = new Map();
    cachedArray.forEach(item => {
      if (item._value !== undefined) {
        mergedMap.set(item._value, item);
      }
    });

    // Merge incoming items
    incomingArray.forEach(item => {
      if (item._value !== undefined) {
        const existing = mergedMap.get(item._value);
        if (existing) {
          // Update existing entry - merge properties
          mergedMap.set(item._value, { ...existing, ...item });
        } else {
          // Add new entry
          mergedMap.set(item._value, item);
        }
      }
    });

    // Convert back to array and sort by _value
    const mergedArray = Array.from(mergedMap.values()).sort((a, b) => a._value - b._value);

    // Return in the same structure format
    return {
      EC_TAG_PARTFILE_SOURCE_NAMES: mergedArray.length === 1 ? mergedArray[0] : mergedArray
    };
  }

  // Status methods - not queued as they're synchronous checks
  isConnected() {
    // AmuleClient doesn't have isConnected() method
    // Check if session exists and socket is not destroyed
    if (!this.client || !this.client.session) {
      return false;
    }
    return this.client.session.socket && !this.client.session.socket.destroyed;
  }

  getQueueStatus() {
    return {
      pendingRequests: this.pendingRequests,
      queueLength: this.pendingRequests
    };
  }

}

module.exports = QueuedAmuleClient;