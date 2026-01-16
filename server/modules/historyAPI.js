/**
 * History API Module
 * Provides endpoints for download history management
 */

const BaseModule = require('../lib/BaseModule');
const config = require('./config');

class HistoryAPI extends BaseModule {
  /**
   * Register API routes
   * @param {Express} app - Express app instance
   */
  registerRoutes(app) {
    // Get history with computed status
    app.get('/api/history', async (req, res) => {
      try {
        if (!this.downloadHistoryDB) {
          return res.status(503).json({ error: 'History service not available' });
        }

        // Parse query parameters
        const limit = Math.min(parseInt(req.query.limit) || 50, 500);
        const offset = parseInt(req.query.offset) || 0;
        const sortBy = req.query.sortBy || 'started_at';
        const sortDir = req.query.sortDir || 'desc';
        const search = req.query.search || '';
        const statusFilter = req.query.status || '';

        // Get current aMule state for status computation
        let currentDownloads = [];
        let sharedFiles = [];

        if (this.amuleManager && this.amuleManager.isConnected()) {
          try {
            const client = this.amuleManager.getClient();
            [currentDownloads, sharedFiles] = await Promise.all([
              client.getDownloadQueue(),
              client.getSharedFiles()
            ]);
          } catch (err) {
            this.log('Warning: Could not fetch aMule state for history:', err.message);
          }
        }

        // Create lookup sets for fast status computation
        // Use top-level fileHash property which is already a formatted string
        const downloadHashes = new Set(
          (currentDownloads || []).map(d => d.fileHash?.toLowerCase()).filter(Boolean)
        );
        const sharedHashes = new Set(
          (sharedFiles || []).map(f => f.fileHash?.toLowerCase()).filter(Boolean)
        );

        // Helper to compute status for an entry
        const computeStatus = (entry) => {
          const hash = entry.hash.toLowerCase();
          if (entry.deleted_at) {
            return 'deleted';
          } else if (downloadHashes.has(hash)) {
            return 'downloading';
          } else if (sharedHashes.has(hash) || entry.completed_at) {
            // Update completed_at if not set but file is in shared
            if (!entry.completed_at && sharedHashes.has(hash)) {
              this.downloadHistoryDB.markCompleted(hash);
              entry.completed_at = new Date().toISOString();
            }
            return 'completed';
          }
          return 'missing';
        };

        let entries, total;

        if (statusFilter) {
          // When filtering by status, we need to fetch all matching entries,
          // compute status, filter, then paginate manually
          const allResults = this.downloadHistoryDB.getHistory(0, 0, sortBy, sortDir, search);

          // Compute status and filter
          const filteredEntries = allResults.entries
            .map(entry => ({ ...entry, status: computeStatus(entry) }))
            .filter(entry => entry.status === statusFilter);

          total = filteredEntries.length;
          entries = filteredEntries.slice(offset, offset + limit);
        } else {
          // No status filter - use database pagination directly
          const result = this.downloadHistoryDB.getHistory(limit, offset, sortBy, sortDir, search);
          entries = result.entries.map(entry => ({
            ...entry,
            status: computeStatus(entry)
          }));
          total = result.total;
        }

        // Check if username tracking is configured
        const historyConfig = config.getConfig()?.history || {};
        const trackUsername = !!historyConfig.usernameHeader;

        res.json({
          entries,
          total,
          limit,
          offset,
          trackUsername
        });
      } catch (err) {
        this.log('Error fetching history:', err.message);
        res.status(500).json({ error: 'Failed to fetch history' });
      }
    });

    // Get history statistics
    app.get('/api/history/stats', (req, res) => {
      try {
        if (!this.downloadHistoryDB) {
          return res.status(503).json({ error: 'History service not available' });
        }

        const stats = this.downloadHistoryDB.getStats();
        res.json(stats);
      } catch (err) {
        this.log('Error fetching history stats:', err.message);
        res.status(500).json({ error: 'Failed to fetch history stats' });
      }
    });

    // Get single history entry by hash
    app.get('/api/history/:hash', async (req, res) => {
      try {
        if (!this.downloadHistoryDB) {
          return res.status(503).json({ error: 'History service not available' });
        }

        const hash = req.params.hash.toLowerCase();
        const entry = this.downloadHistoryDB.getByHash(hash);

        if (!entry) {
          return res.status(404).json({ error: 'Entry not found' });
        }

        // Compute current status
        let status = 'missing';

        if (entry.deleted_at) {
          status = 'deleted';
        } else if (this.amuleManager && this.amuleManager.isConnected()) {
          try {
            const client = this.amuleManager.getClient();
            const [downloads, shared] = await Promise.all([
              client.getDownloadQueue(),
              client.getSharedFiles()
            ]);

            const inDownloads = (downloads || []).some(
              d => d.fileHash?.toLowerCase() === hash
            );
            const inShared = (shared || []).some(
              f => f.fileHash?.toLowerCase() === hash
            );

            if (inDownloads) {
              status = 'downloading';
            } else if (inShared || entry.completed_at) {
              status = 'completed';
            }
          } catch (err) {
            this.log('Warning: Could not determine status:', err.message);
          }
        } else if (entry.completed_at) {
          status = 'completed';
        }

        res.json({
          ...entry,
          status
        });
      } catch (err) {
        this.log('Error fetching history entry:', err.message);
        res.status(500).json({ error: 'Failed to fetch history entry' });
      }
    });

    // Delete a history entry permanently
    app.delete('/api/history/:hash', (req, res) => {
      try {
        if (!this.downloadHistoryDB) {
          return res.status(503).json({ error: 'History service not available' });
        }

        const hash = req.params.hash.toLowerCase();
        const deleted = this.downloadHistoryDB.removeEntry(hash);

        if (deleted) {
          res.json({ success: true, message: 'Entry deleted' });
        } else {
          res.status(404).json({ error: 'Entry not found' });
        }
      } catch (err) {
        this.log('Error deleting history entry:', err.message);
        res.status(500).json({ error: 'Failed to delete history entry' });
      }
    });

    // Manually trigger cleanup (admin operation)
    app.post('/api/history/cleanup', (req, res) => {
      try {
        if (!this.downloadHistoryDB) {
          return res.status(503).json({ error: 'History service not available' });
        }

        const retentionDays = parseInt(req.body.retentionDays);
        if (isNaN(retentionDays) || retentionDays < 1) {
          return res.status(400).json({ error: 'Invalid retentionDays (must be >= 1)' });
        }

        const deleted = this.downloadHistoryDB.cleanup(retentionDays);
        res.json({ deleted, message: `Cleaned up ${deleted} entries older than ${retentionDays} days` });
      } catch (err) {
        this.log('Error during cleanup:', err.message);
        res.status(500).json({ error: 'Cleanup failed' });
      }
    });

    this.log('📜 History API routes registered');
  }
}

module.exports = new HistoryAPI();
