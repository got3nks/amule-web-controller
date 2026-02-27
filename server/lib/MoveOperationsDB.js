/**
 * MoveOperationsDB - SQLite database for tracking file move operations
 *
 * Tracks move operations for download client files when changing categories.
 * Supports both rtorrent and aMule clients.
 * Stores progress, status, and error information for recovery on restart.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// Status values:
// - pending: queued for processing
// - moving: actively copying files
// - verifying: copy complete, verifying sizes
// - completed: move finished successfully
// - failed: move failed with error

class MoveOperationsDB {
  constructor(dbPath) {
    try {
      // Ensure database directory exists
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        logger.log(`Creating database directory: ${dbDir}`);
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Verify directory is writable
      fs.accessSync(dbDir, fs.constants.W_OK);

      // Create database
      this.db = new Database(dbPath, { fileMustExist: false });
      this.db.pragma('journal_mode = WAL');
      this.initSchema();

      logger.log(`📦 Move operations database initialized: ${dbPath}`);
    } catch (error) {
      logger.error(`Failed to initialize move operations database at ${dbPath}:`, error);
      throw new Error(`Move operations DB initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize database schema
   */
  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS move_operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        instance_id TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        client_type TEXT DEFAULT 'rtorrent',
        source_path TEXT NOT NULL,
        dest_path TEXT NOT NULL,
        remote_source_path TEXT,
        remote_dest_path TEXT,
        total_size INTEGER NOT NULL,
        bytes_moved INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        is_multi_file INTEGER DEFAULT 0,
        files_total INTEGER DEFAULT 1,
        files_moved INTEGER DEFAULT 0,
        current_file TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(hash, instance_id)
      );
    `);

    // Migrations for existing databases (column additions — silently skip if already present)
    const migrations = [
      'ALTER TABLE move_operations ADD COLUMN remote_source_path TEXT',
      'ALTER TABLE move_operations ADD COLUMN remote_dest_path TEXT',
      "ALTER TABLE move_operations ADD COLUMN client_type TEXT DEFAULT 'rtorrent'",
      'ALTER TABLE move_operations ADD COLUMN category_name TEXT'
    ];

    for (const sql of migrations) {
      try {
        this.db.exec(sql);
      } catch (e) {
        // Column already exists
      }
    }

    // Migration: add instance_id column (requires table rebuild for UNIQUE constraint change)
    // Must run before index creation since old tables lack the instance_id column
    this._migrateAddInstanceId();

    // Create indexes after all migrations have run
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_move_ops_hash ON move_operations(hash);
      CREATE INDEX IF NOT EXISTS idx_move_ops_status ON move_operations(status);
      CREATE INDEX IF NOT EXISTS idx_move_ops_instance ON move_operations(instance_id);
    `);
  }

  /**
   * Migrate existing table to add instance_id with compound UNIQUE(hash, instance_id).
   * SQLite can't ALTER UNIQUE constraints, so we rebuild the table.
   * @private
   */
  _migrateAddInstanceId() {
    // Check if instance_id column already exists
    const columns = this.db.pragma('table_info(move_operations)');
    if (columns.some(c => c.name === 'instance_id')) {
      return; // Already migrated
    }

    logger.log('📦 Migrating move_operations: adding instance_id column...');

    this.db.exec(`
      CREATE TABLE move_operations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        instance_id TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        client_type TEXT DEFAULT 'rtorrent',
        source_path TEXT NOT NULL,
        dest_path TEXT NOT NULL,
        remote_source_path TEXT,
        remote_dest_path TEXT,
        total_size INTEGER NOT NULL,
        bytes_moved INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        is_multi_file INTEGER DEFAULT 0,
        files_total INTEGER DEFAULT 1,
        files_moved INTEGER DEFAULT 0,
        current_file TEXT,
        category_name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(hash, instance_id)
      );

      INSERT INTO move_operations_new (
        id, hash, instance_id, name, client_type, source_path, dest_path,
        remote_source_path, remote_dest_path, total_size, bytes_moved, status,
        error_message, is_multi_file, files_total, files_moved, current_file,
        category_name, created_at, updated_at
      )
      SELECT
        id, hash, '', name, client_type, source_path, dest_path,
        remote_source_path, remote_dest_path, total_size, bytes_moved, status,
        error_message, is_multi_file, files_total, files_moved, current_file,
        category_name, created_at, updated_at
      FROM move_operations;

      DROP TABLE move_operations;
      ALTER TABLE move_operations_new RENAME TO move_operations;

      CREATE INDEX IF NOT EXISTS idx_move_ops_hash ON move_operations(hash);
      CREATE INDEX IF NOT EXISTS idx_move_ops_status ON move_operations(status);
      CREATE INDEX IF NOT EXISTS idx_move_ops_instance ON move_operations(instance_id);
    `);

    logger.log('📦 Migration complete: move_operations now has instance_id');
  }

  /**
   * Add a new move operation
   * @param {Object} operation - Operation details
   * @param {string} operation.hash - Download hash
   * @param {string} operation.name - Download name
   * @param {string} operation.clientType - Client type ('rtorrent' or 'amule')
   * @param {string} operation.sourcePath - Source directory/file path (local/translated)
   * @param {string} operation.destPath - Destination directory/file path (local/translated)
   * @param {string} operation.remoteSourcePath - Remote source path (as client sees it)
   * @param {string} operation.remoteDestPath - Remote dest path (for client directory update)
   * @param {number} operation.totalSize - Total size in bytes
   * @param {boolean} operation.isMultiFile - Whether this is a multi-file download (always false for aMule)
   * @param {string} operation.categoryName - Category name (for setting priority after move)
   * @returns {Object} Created operation record
   */
  addOperation({ hash, name, instanceId = '', clientType = 'rtorrent', sourcePath, destPath, remoteSourcePath, remoteDestPath, totalSize, isMultiFile = false, categoryName = null }) {
    const now = new Date().toISOString();
    const iid = instanceId || '';

    // Delete any existing operation for this hash+instance (in case of retry)
    this.db.prepare('DELETE FROM move_operations WHERE hash = ? AND instance_id = ?').run(hash.toLowerCase(), iid);

    const stmt = this.db.prepare(`
      INSERT INTO move_operations (
        hash, instance_id, name, client_type, source_path, dest_path, remote_source_path, remote_dest_path,
        total_size, is_multi_file, files_total, category_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      hash.toLowerCase(),
      iid,
      name,
      clientType,
      sourcePath,
      destPath,
      remoteSourcePath || sourcePath,  // Fallback to local path if not provided
      remoteDestPath || destPath,
      totalSize,
      isMultiFile ? 1 : 0,
      isMultiFile ? 0 : 1, // files_total set later for multi-file
      categoryName,
      now,
      now
    );

    logger.log(`📦 Move operation queued: ${name} (${clientType}:${hash})`);

    return this.getByHash(hash, iid);
  }

  /**
   * Update progress for an operation
   * @param {string} hash - Torrent hash
   * @param {string} instanceId - Client instance identifier
   * @param {number} bytesMoved - Total bytes moved so far
   */
  updateProgress(hash, instanceId, bytesMoved) {
    const stmt = this.db.prepare(`
      UPDATE move_operations
      SET bytes_moved = ?, updated_at = ?
      WHERE hash = ? AND instance_id = ?
    `);
    stmt.run(bytesMoved, new Date().toISOString(), hash.toLowerCase(), instanceId);
  }

  /**
   * Update status for an operation
   * @param {string} hash - Torrent hash
   * @param {string} instanceId - Client instance identifier
   * @param {string} status - New status
   * @param {string} [errorMessage] - Error message (for failed status)
   */
  updateStatus(hash, instanceId, status, errorMessage = null) {
    const stmt = this.db.prepare(`
      UPDATE move_operations
      SET status = ?, error_message = ?, updated_at = ?
      WHERE hash = ? AND instance_id = ?
    `);
    stmt.run(status, errorMessage, new Date().toISOString(), hash.toLowerCase(), instanceId);

    if (status === 'failed') {
      logger.warn(`📦 Move operation failed: ${hash} - ${errorMessage}`);
    } else if (status === 'completed') {
      logger.log(`📦 Move operation completed: ${hash}`);
    }
  }

  /**
   * Update multiple fields for an operation
   * @param {string} hash - Torrent hash
   * @param {string} instanceId - Client instance identifier
   * @param {Object} updates - Fields to update
   */
  update(hash, instanceId, updates) {
    const allowedFields = [
      'bytes_moved', 'status', 'error_message', 'files_total',
      'files_moved', 'current_file'
    ];

    const setClauses = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) return;

    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(hash.toLowerCase());
    values.push(instanceId);

    const stmt = this.db.prepare(`
      UPDATE move_operations
      SET ${setClauses.join(', ')}
      WHERE hash = ? AND instance_id = ?
    `);
    stmt.run(...values);
  }

  /**
   * Get operation by hash and instance ID
   * @param {string} hash - Torrent hash
   * @param {string} instanceId - Client instance identifier
   * @returns {Object|null} Operation record or null
   */
  getByHash(hash, instanceId) {
    const stmt = this.db.prepare('SELECT * FROM move_operations WHERE hash = ? AND instance_id = ?');
    const row = stmt.get(hash.toLowerCase(), instanceId);
    return row ? this._rowToObject(row) : null;
  }

  /**
   * Get all active operations (not completed or failed)
   * @returns {Array} Array of active operation records
   */
  getActive() {
    const stmt = this.db.prepare(`
      SELECT * FROM move_operations
      WHERE status IN ('pending', 'moving', 'verifying')
      ORDER BY created_at ASC
    `);
    return stmt.all().map(row => this._rowToObject(row));
  }

  /**
   * Get all operations with a specific status
   * @param {string} status - Status to filter by
   * @returns {Array} Array of operation records
   */
  getByStatus(status) {
    const stmt = this.db.prepare('SELECT * FROM move_operations WHERE status = ?');
    return stmt.all(status).map(row => this._rowToObject(row));
  }

  /**
   * Remove completed operations older than specified duration
   * @param {number} maxAgeMs - Maximum age in milliseconds (default: 1 hour)
   * @returns {number} Number of records cleaned up
   */
  cleanup(maxAgeMs = 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

    const stmt = this.db.prepare(`
      DELETE FROM move_operations
      WHERE status = 'completed' AND updated_at < ?
    `);

    const result = stmt.run(cutoff);

    if (result.changes > 0) {
      logger.log(`📦 Cleaned up ${result.changes} completed move operations`);
    }

    return result.changes;
  }

  /**
   * Convert database row to camelCase object
   * @param {Object} row - Database row
   * @returns {Object} Converted object
   * @private
   */
  _rowToObject(row) {
    return {
      id: row.id,
      hash: row.hash,
      instanceId: row.instance_id || null,
      name: row.name,
      clientType: row.client_type || 'rtorrent',
      sourcePath: row.source_path,
      destPath: row.dest_path,
      remoteSourcePath: row.remote_source_path,
      remoteDestPath: row.remote_dest_path,
      totalSize: row.total_size,
      bytesMoved: row.bytes_moved,
      status: row.status,
      errorMessage: row.error_message,
      isMultiFile: row.is_multi_file === 1,
      categoryName: row.category_name || null,
      filesTotal: row.files_total,
      filesMoved: row.files_moved,
      currentFile: row.current_file,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
    logger.log('📦 Move operations database closed');
  }
}

module.exports = MoveOperationsDB;
