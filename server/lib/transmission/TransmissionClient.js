/**
 * TransmissionClient - HTTP RPC client for Transmission
 *
 * Communicates with Transmission's RPC interface via HTTP POST.
 * Auth is HTTP Basic Auth + CSRF token (X-Transmission-Session-Id).
 * On 409 response, extracts new session ID and retries once.
 */

const logger = require('../logger');

/**
 * Default fields to request from torrent-get.
 */
const TORRENT_FIELDS = [
  'id', 'name', 'hashString', 'status', 'error', 'errorString',
  'downloadDir', 'totalSize', 'sizeWhenDone', 'leftUntilDone',
  'downloadedEver', 'uploadedEver', 'rateDownload', 'rateUpload',
  'uploadRatio', 'percentDone', 'metadataPercentComplete', 'eta',
  'activityDate', 'addedDate', 'doneDate', 'startDate',
  'peersConnected', 'labels', 'isPrivate', 'isFinished', 'isStalled',
  'comment', 'creator', 'dateCreated', 'bandwidthPriority',
  'pieceCount', 'pieceSize', 'trackers', 'files', 'fileStats'
];

class TransmissionClient {
  constructor(options = {}) {
    this.host = options.host || 'localhost';
    this.port = options.port || 9091;
    this.username = options.username || '';
    this.password = options.password || '';
    this.useSsl = options.useSsl || false;
    this.path = options.path || '/transmission/rpc';

    this.baseUrl = `${this.useSsl ? 'https' : 'http'}://${this.host}:${this.port}`;
    this.sessionId = null; // X-Transmission-Session-Id CSRF token
    this.connected = false;
    this._version = null;
  }

  // ============================================================================
  // RPC TRANSPORT
  // ============================================================================

  /**
   * Make an RPC call to Transmission.
   * Handles CSRF token (409) and Basic Auth (401).
   * @param {string} method - RPC method name (e.g. 'torrent-get')
   * @param {Object} args - RPC arguments object
   * @param {Object} options - { timeout, retryCsrf }
   * @returns {Promise<Object>} RPC arguments from response
   */
  async _call(method, args = {}, { timeout = 30000, retryCsrf = true } = {}) {
    const body = JSON.stringify({
      method,
      arguments: args
    });

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Basic Auth
    if (this.username || this.password) {
      const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // CSRF token
    if (this.sessionId) {
      headers['X-Transmission-Session-Id'] = this.sessionId;
    }

    let response;
    try {
      response = await fetch(`${this.baseUrl}${this.path}`, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(timeout)
      });
    } catch (err) {
      if (err.name === 'AbortError' || err.message.includes('timeout')) {
        throw new Error(`Connection timeout to ${this.host}:${this.port}`);
      }
      throw err;
    }

    // Handle CSRF token refresh — 409 means we need a new session ID
    if (response.status === 409) {
      const newSessionId = response.headers.get('x-transmission-session-id');
      if (newSessionId && retryCsrf) {
        this.sessionId = newSessionId;
        return this._call(method, args, { timeout, retryCsrf: false });
      }
      throw new Error('CSRF token refresh failed: no session ID in 409 response');
    }

    // Handle auth failure
    if (response.status === 401) {
      throw new Error(`Authentication failed for ${this.host}:${this.port}`);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const json = await response.json();

    if (json.result !== 'success') {
      throw new Error(`RPC error in ${method}: ${json.result}`);
    }

    return json.arguments || {};
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Login to Transmission — validates auth and caches version + session ID.
   * @returns {Promise<boolean>} True if login successful
   */
  async login() {
    try {
      const session = await this._call('session-get');
      this._version = session.version || 'unknown';
      this.connected = true;
      return true;
    } catch (err) {
      this.connected = false;
      throw err;
    }
  }

  /**
   * Test connection to Transmission.
   * @returns {Promise<{success: boolean, version?: string, error?: string}>}
   */
  async testConnection() {
    try {
      await this.login();
      return {
        success: true,
        version: this._version
      };
    } catch (err) {
      this.connected = false;
      return {
        success: false,
        error: err.cause ? `${err.message} (${err.cause.code || err.cause.message})` : (err.message || 'Connection failed')
      };
    }
  }

  /**
   * Disconnect — clear local state (no server-side session to destroy).
   */
  async disconnect() {
    this.sessionId = null;
    this.connected = false;
    this._version = null;
  }

  /**
   * Check if connected.
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }

  // ============================================================================
  // DATA RETRIEVAL
  // ============================================================================

  /**
   * Get all torrents.
   * @param {Array<string>} fields - Fields to request (defaults to TORRENT_FIELDS)
   * @returns {Promise<{torrents: Array}>}
   */
  async getTorrents(fields) {
    const result = await this._call('torrent-get', {
      fields: fields || TORRENT_FIELDS
    });
    return { torrents: result.torrents || [] };
  }

  /**
   * Get detailed info for specific torrent(s).
   * @param {Array} ids - Torrent IDs (numeric or hashString)
   * @param {Array<string>} extraFields - Additional fields beyond TORRENT_FIELDS
   * @returns {Promise<Object|null>} First matching torrent, or null
   */
  async getTorrentDetails(ids, extraFields = []) {
    const allFields = [...new Set([...TORRENT_FIELDS, ...extraFields])];
    const result = await this._call('torrent-get', {
      ids: Array.isArray(ids) ? ids : [ids],
      fields: allFields
    });
    const torrents = result.torrents || [];
    return torrents[0] || null;
  }

  /**
   * Get full session configuration.
   * @returns {Promise<Object>} Session config
   */
  async getSession() {
    return await this._call('session-get');
  }

  /**
   * Test if the peer port is reachable from the outside.
   * @returns {Promise<boolean>} True if port is open
   */
  async portTest() {
    const result = await this._call('port-test');
    return result['port-is-open'] === true;
  }

  /**
   * Get session statistics (speeds, totals, active count).
   * @returns {Promise<Object>} Session stats
   */
  async getSessionStats() {
    return await this._call('session-stats');
  }

  // ============================================================================
  // TORRENT CONTROL
  // ============================================================================

  /**
   * Start one or more torrents.
   * @param {Array} ids - Torrent IDs
   */
  async startTorrents(ids) {
    await this._call('torrent-start', { ids: Array.isArray(ids) ? ids : [ids] });
  }

  /**
   * Stop one or more torrents.
   * @param {Array} ids - Torrent IDs
   */
  async stopTorrents(ids) {
    await this._call('torrent-stop', { ids: Array.isArray(ids) ? ids : [ids] });
  }

  /**
   * Remove one or more torrents.
   * @param {Array} ids - Torrent IDs
   * @param {boolean} deleteData - Whether to delete local data
   */
  async removeTorrent(ids, deleteData = false) {
    await this._call('torrent-remove', {
      ids: Array.isArray(ids) ? ids : [ids],
      'delete-local-data': deleteData
    });
  }

  /**
   * Verify one or more torrents.
   * @param {Array} ids - Torrent IDs
   */
  async verifyTorrents(ids) {
    await this._call('torrent-verify', { ids: Array.isArray(ids) ? ids : [ids] });
  }

  /**
   * Reannounce one or more torrents.
   * @param {Array} ids - Torrent IDs
   */
  async reannounceTorrents(ids) {
    await this._call('torrent-reannounce', { ids: Array.isArray(ids) ? ids : [ids] });
  }

  /**
   * Set properties on one or more torrents (labels, priority, limits, etc.).
   * @param {Array} ids - Torrent IDs
   * @param {Object} settings - Settings to apply
   */
  async setTorrents(ids, settings) {
    await this._call('torrent-set', {
      ids: Array.isArray(ids) ? ids : [ids],
      ...settings
    });
  }

  /**
   * Move torrent data to a new location.
   * @param {Array} ids - Torrent IDs
   * @param {string} location - New directory path
   * @param {boolean} move - Whether to move existing data (true) or just set new location (false)
   */
  async moveTorrents(ids, location, move = true) {
    await this._call('torrent-set-location', {
      ids: Array.isArray(ids) ? ids : [ids],
      location,
      move
    });
  }

  // ============================================================================
  // ADD DOWNLOADS
  // ============================================================================

  /**
   * Add a torrent.
   * @param {Object} args - { filename (URL/magnet), metainfo (base64), download-dir, labels, paused }
   * @returns {Promise<Object>} { torrent-added } or { torrent-duplicate }
   */
  async addTorrent(args) {
    return await this._call('torrent-add', args);
  }
}

// Export class and fields constant
TransmissionClient.TORRENT_FIELDS = TORRENT_FIELDS;
module.exports = TransmissionClient;
