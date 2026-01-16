/**
 * BaseModule - Base class for server modules with dependency injection
 *
 * Provides common dependency injection setters to reduce boilerplate across modules.
 * All modules can extend this class to automatically get standard setters.
 */
const logger = require('./logger');

class BaseModule {
  constructor() {
    // Use centralized logger singleton
    this.log = logger.log.bind(logger);
    this.broadcast = null;
    this.amuleManager = null;
    this.authManager = null;
    this.geoIPManager = null;
    this.hostnameResolver = null;
    this.metricsDB = null;
    this.downloadHistoryDB = null;
    this.wss = null;
  }

  /**
   * Set broadcast function
   * @param {Function} broadcastFn - WebSocket broadcast function
   */
  setBroadcast(broadcastFn) {
    this.broadcast = broadcastFn;
  }

  /**
   * Set aMule manager instance
   * @param {Object} amuleManager - aMule manager instance
   */
  setAmuleManager(amuleManager) {
    this.amuleManager = amuleManager;
  }

  /**
   * Set auth manager instance
   * @param {Object} authManager - Auth manager instance
   */
  setAuthManager(authManager) {
    this.authManager = authManager;
  }

  /**
   * Set GeoIP manager instance
   * @param {Object} geoIPManager - GeoIP manager instance
   */
  setGeoIPManager(geoIPManager) {
    this.geoIPManager = geoIPManager;
  }

  /**
   * Set hostname resolver instance
   * @param {Object} hostnameResolver - HostnameResolver instance
   */
  setHostnameResolver(hostnameResolver) {
    this.hostnameResolver = hostnameResolver;
  }

  /**
   * Set metrics database instance
   * @param {Object} db - Metrics database instance
   */
  setMetricsDB(db) {
    this.metricsDB = db;
  }

  /**
   * Set download history database instance
   * @param {Object} db - Download history database instance
   */
  setDownloadHistoryDB(db) {
    this.downloadHistoryDB = db;
  }

  /**
   * Set WebSocket server instance
   * @param {Object} wss - WebSocket server instance
   */
  setWebSocketServer(wss) {
    this.wss = wss;
  }

  /**
   * Set config manager instance
   * @param {Object} configManager - Config manager instance
   */
  setConfigManager(configManager) {
    this.configManager = configManager;
  }

  /**
   * Set hash store instance
   * @param {Object} hashStore - Hash store instance
   */
  setHashStore(hashStore) {
    this.hashStore = hashStore;
  }

  /**
   * Inject multiple dependencies at once
   * Only sets dependencies that exist in the provided object and have a matching setter
   * @param {Object} deps - Object containing dependencies to inject
   * @example
   * module.inject({ amuleManager, metricsDB, broadcast });
   */
  inject(deps) {
    const setterMap = {
      broadcast: 'setBroadcast',
      amuleManager: 'setAmuleManager',
      authManager: 'setAuthManager',
      geoIPManager: 'setGeoIPManager',
      hostnameResolver: 'setHostnameResolver',
      metricsDB: 'setMetricsDB',
      downloadHistoryDB: 'setDownloadHistoryDB',
      wss: 'setWebSocketServer',
      configManager: 'setConfigManager',
      hashStore: 'setHashStore'
    };

    for (const [key, setter] of Object.entries(setterMap)) {
      if (deps[key] !== undefined && typeof this[setter] === 'function') {
        this[setter](deps[key]);
      }
    }
  }

  /**
   * Normalize and enrich uploads data structure
   * aMule can return uploads as array, single object, or null
   * This method normalizes to an array and enriches with GeoIP and hostname data
   * @param {*} uploadsData - Raw uploads data from aMule
   * @returns {Array} Normalized and enriched uploads array
   */
  normalizeAndEnrichUploads(uploadsData) {
    if (!uploadsData) {
      return [];
    }

    // Extract EC_TAG_CLIENT if present
    let uploads = uploadsData.EC_TAG_CLIENT || uploadsData;

    // Normalize to array
    if (Array.isArray(uploads)) {
      // Already an array, keep as is
    } else if (uploads && typeof uploads === 'object') {
      uploads = [uploads];
    } else {
      uploads = [];
    }

    if (uploads.length === 0) {
      return uploads;
    }

    // Enrich with GeoIP data if geoIPManager is available
    if (this.geoIPManager) {
      uploads = this.geoIPManager.enrichUploadsWithGeo(uploads);
    }

    // Enrich with hostnames if hostnameResolver is available
    if (this.hostnameResolver) {
      uploads = this.hostnameResolver.enrichUploadsWithHostnames(uploads);
    }

    return uploads;
  }
}

module.exports = BaseModule;
