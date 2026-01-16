/**
 * DownloadHistory - Persistent storage for download history tracking
 *
 * Tracks all downloads with their status (downloading, completed, missing, deleted)
 * to provide a history view even after files are moved or deleted.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

class DownloadHistory {
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

      logger.log(`📜 Download history initialized: ${dbPath}`);
    } catch (error) {
      logger.error(`Failed to initialize download history at ${dbPath}:`, error);
      throw new Error(`Download history initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize database schema
   */
  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS download_history (
        hash TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        size INTEGER,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        deleted_at TEXT,
        username TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_started_at ON download_history(started_at);
      CREATE INDEX IF NOT EXISTS idx_completed_at ON download_history(completed_at);
    `);
  }

  /**
   * Add a new download to history
   * @param {string} hash - ED2K hash
   * @param {string} filename - File name
   * @param {number} size - File size in bytes
   * @param {string} username - Optional username from proxy auth
   */
  addDownload(hash, filename, size, username = null) {
    const stmt = this.db.prepare(`
      INSERT INTO download_history (hash, filename, size, started_at, username)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(hash) DO UPDATE SET
        filename = excluded.filename,
        size = excluded.size,
        started_at = COALESCE(download_history.started_at, excluded.started_at),
        deleted_at = NULL
    `);

    stmt.run(
      hash.toLowerCase(),
      filename,
      size || null,
      new Date().toISOString(),
      username
    );

    logger.log(`📥 History: Added download - ${filename}`);
  }

  /**
   * Mark a download as completed
   * @param {string} hash - ED2K hash
   */
  markCompleted(hash) {
    const stmt = this.db.prepare(`
      UPDATE download_history
      SET completed_at = ?
      WHERE hash = ? AND completed_at IS NULL
    `);

    const result = stmt.run(new Date().toISOString(), hash.toLowerCase());

    if (result.changes > 0) {
      logger.log(`✅ History: Marked completed - ${hash}`);
    }
  }

  /**
   * Mark a download as deleted (soft delete)
   * @param {string} hash - ED2K hash
   */
  markDeleted(hash) {
    const stmt = this.db.prepare(`
      UPDATE download_history
      SET deleted_at = ?
      WHERE hash = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(new Date().toISOString(), hash.toLowerCase());

    if (result.changes > 0) {
      logger.log(`🗑️ History: Marked deleted - ${hash}`);
    }
  }

  /**
   * Remove entry from history permanently (hard delete)
   * @param {string} hash - ED2K hash
   * @returns {boolean} True if entry was deleted
   */
  removeEntry(hash) {
    const stmt = this.db.prepare('DELETE FROM download_history WHERE hash = ?');
    const result = stmt.run(hash.toLowerCase());

    if (result.changes > 0) {
      logger.log(`🗑️ History: Removed entry - ${hash}`);
      return true;
    }
    return false;
  }

  /**
   * Get all pending downloads (started but not completed or deleted)
   * Used for completion detection on startup/refresh
   * @returns {Array} Pending download entries
   */
  getPendingDownloads() {
    const stmt = this.db.prepare(`
      SELECT * FROM download_history
      WHERE completed_at IS NULL AND deleted_at IS NULL
    `);
    return stmt.all();
  }

  /**
   * Get history entry by hash
   * @param {string} hash - ED2K hash
   * @returns {object|null} History entry or null
   */
  getByHash(hash) {
    const stmt = this.db.prepare('SELECT * FROM download_history WHERE hash = ?');
    return stmt.get(hash.toLowerCase());
  }

  /**
   * Get all history entries with pagination and optional search
   * @param {number} limit - Max entries to return (0 = no limit)
   * @param {number} offset - Offset for pagination
   * @param {string} sortBy - Column to sort by
   * @param {string} sortDir - Sort direction (asc/desc)
   * @param {string} search - Optional search term for filename/hash
   * @returns {object} { entries, total }
   */
  getHistory(limit = 50, offset = 0, sortBy = 'started_at', sortDir = 'desc', search = '') {
    // Validate sort column to prevent SQL injection
    const validColumns = ['filename', 'size', 'started_at', 'completed_at', 'deleted_at', 'username'];
    const column = validColumns.includes(sortBy) ? sortBy : 'started_at';
    const direction = sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Build WHERE clause for search
    let whereClause = '';
    const params = [];

    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      whereClause = 'WHERE (LOWER(filename) LIKE ? OR LOWER(hash) LIKE ? OR LOWER(username) LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count with search filter
    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM download_history ${whereClause}`);
    const { total } = countStmt.get(...params);

    // Get entries with pagination
    let query = `
      SELECT * FROM download_history
      ${whereClause}
      ORDER BY ${column} ${direction}
    `;

    // Add LIMIT/OFFSET only if limit > 0
    if (limit > 0) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const stmt = this.db.prepare(query);
    const entries = stmt.all(...params);

    return { entries, total };
  }

  /**
   * Cleanup old entries based on retention policy
   * @param {number} retentionDays - Days to retain (0 = never delete)
   * @returns {number} Number of deleted records
   */
  cleanup(retentionDays) {
    if (retentionDays <= 0) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const stmt = this.db.prepare(`
      DELETE FROM download_history
      WHERE started_at < ?
    `);

    const result = stmt.run(cutoffDate.toISOString());

    if (result.changes > 0) {
      logger.log(`🧹 History: Cleaned up ${result.changes} old entries`);
    }

    return result.changes;
  }

  /**
   * Get statistics
   * @returns {object} History statistics
   */
  getStats() {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN completed_at IS NOT NULL AND deleted_at IS NULL THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted,
        SUM(CASE WHEN completed_at IS NULL AND deleted_at IS NULL THEN 1 ELSE 0 END) as pending
      FROM download_history
    `);
    return stmt.get();
  }

  /**
   * Close the database connection
   */
  close() {
    this.db.close();
  }
}

module.exports = DownloadHistory;
