/**
 * Auto-refresh Module
 * Handles periodic data updates and broadcasting
 * Also handles download completion detection for history tracking
 */

const config = require('./config');
const BaseModule = require('../lib/BaseModule');
const { getDiskSpace } = require('../lib/diskSpace');
const { getCpuUsage } = require('../lib/cpuUsage');

class AutoRefreshManager extends BaseModule {
  constructor() {
    super();
    this.refreshInterval = null;
    this.cleanupTimeout = null;
  }

  // Auto-refresh loop
  async autoRefreshLoop() {
    if (!this.amuleManager || !this.amuleManager.isConnected()) {
      this.refreshInterval = setTimeout(() => this.autoRefreshLoop(), config.AUTO_REFRESH_INTERVAL);
      return;
    }

    try {
      // Get stats and store metrics
      const stats = await this.amuleManager.getClient().getStats();
      if (stats) {
        // Store metrics in database
        try {
          const uploadSpeed = stats.EC_TAG_STATS_UL_SPEED || 0;
          const downloadSpeed = stats.EC_TAG_STATS_DL_SPEED || 0;

          // aMule provides cumulative totals (lifetime stats)
          const totalUploaded = stats.EC_TAG_STATS_TOTAL_SENT_BYTES || null;
          const totalDownloaded = stats.EC_TAG_STATS_TOTAL_RECEIVED_BYTES || null;

          this.metricsDB.insertMetric(uploadSpeed, downloadSpeed, totalUploaded, totalDownloaded);
        } catch (err) {
          this.log('⚠️  Error saving metrics:', err.message);
        }
      }

      // Only update if there is at least one client connected
      if(this.wss.clients.size > 0) {
          // Build batch update object - only include successful fetches
          const batchUpdate = {};

          // Add disk space and CPU usage information to stats
          if (stats) {
            try {
              const dataDir = config.DATA_DIR || './server/data';
              stats.diskSpace = await getDiskSpace(dataDir);
            } catch (err) {
              this.log('⚠️  Error getting disk space:', err.message);
            }
            try {
              stats.cpuUsage = await getCpuUsage();
            } catch (err) {
              this.log('⚠️  Error getting CPU usage:', err.message);
            }
            batchUpdate.stats = stats;
          }

          // Get categories
          try {
            const categories = await this.amuleManager.getClient().getCategories();
            if (categories) batchUpdate.categories = categories;
          } catch (err) {
            this.log('⚠️  Error fetching categories:', err.message);
          }

          // Get downloads
          let downloads = null;
          try {
            downloads = await this.amuleManager.getClient().getDownloadQueue();
            if (downloads) batchUpdate.downloads = downloads;
          } catch (err) {
            this.log('⚠️  Error fetching downloads:', err.message);
          }

          // Get shared files (needed for history completion detection)
          let sharedFiles = null;
          try {
            sharedFiles = await this.amuleManager.getClient().getSharedFiles();
          } catch (err) {
            this.log('⚠️  Error fetching shared files:', err.message);
          }

          // Check for download completions (history tracking)
          if (downloads || sharedFiles) {
            await this.checkDownloadCompletions(downloads, sharedFiles);
          }

          // Get uploads with GeoIP enrichment
          try {
            const uploadsData = await this.amuleManager.getClient().getUploadingQueue();
            const enrichedUploads = this.normalizeAndEnrichUploads(uploadsData);
            if (enrichedUploads) batchUpdate.uploads = enrichedUploads;
          } catch (err) {
            this.log('⚠️  Error fetching uploads:', err.message);
          }

          // Send single batch update (only if we have data)
          if (Object.keys(batchUpdate).length > 0) {
            this.broadcast({ type: 'batch-update', data: batchUpdate });
          }
      }

    } catch (err) {
      // Client disconnected during stats fetch - will retry on next interval
      this.log('⚠️  Could not fetch stats:', err.message);
    } finally {
      this.refreshInterval = setTimeout(() => this.autoRefreshLoop(), config.AUTO_REFRESH_INTERVAL);
    }
  }

  // Start auto-refresh and scheduled cleanup
  start() {
    this.autoRefreshLoop();
    this.scheduleCleanup();
  }

  // Stop auto-refresh and cleanup
  stop() {
    if (this.refreshInterval) {
      clearTimeout(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
  }

  /**
   * Check for download completions and update history
   * Compares pending downloads in history DB with current aMule state
   * @param {Array} currentDownloads - Current downloads from aMule
   * @param {Array} sharedFiles - Current shared files from aMule
   */
  async checkDownloadCompletions(currentDownloads, sharedFiles) {
    if (!this.downloadHistoryDB || !config.getConfig()?.history?.enabled) {
      return;
    }

    try {
      // Get all pending downloads from history (started but not completed/deleted)
      const pendingDownloads = this.downloadHistoryDB.getPendingDownloads();

      if (pendingDownloads.length === 0) {
        return;
      }

      // Create sets for fast lookup
      // Use top-level fileHash property which is already a formatted string
      const downloadHashes = new Set(
        (currentDownloads || []).map(d => d.fileHash?.toLowerCase()).filter(Boolean)
      );
      const sharedHashes = new Set(
        (sharedFiles || []).map(f => f.fileHash?.toLowerCase()).filter(Boolean)
      );

      // Check each pending download
      for (const entry of pendingDownloads) {
        const hash = entry.hash.toLowerCase();

        if (sharedHashes.has(hash)) {
          // File is now in shared files - download completed!
          this.downloadHistoryDB.markCompleted(hash);
        }
        // Note: If not in downloads and not in shared, it stays as "pending"
        // The API will compute this as "missing" status when queried
      }
    } catch (err) {
      this.log('⚠️  Error checking download completions:', err.message);
    }
  }

  /**
   * Schedule daily cleanup at configured hour (default 3 AM)
   * Handles both metrics DB and download history cleanup
   */
  scheduleCleanup() {
    const now = new Date();
    const nextCleanup = new Date(now);
    nextCleanup.setHours(config.CLEANUP_HOUR, 0, 0, 0);

    // If cleanup time has passed today, schedule for tomorrow
    if (nextCleanup <= now) {
      nextCleanup.setDate(nextCleanup.getDate() + 1);
    }

    const msUntilCleanup = nextCleanup - now;

    this.cleanupTimeout = setTimeout(() => {
      this.runCleanup();
      this.scheduleCleanup(); // Schedule next cleanup
    }, msUntilCleanup);

    this.log(`⏰ Scheduled next cleanup at ${nextCleanup.toISOString()}`);
  }

  /**
   * Run cleanup for all databases (metrics and history)
   */
  runCleanup() {
    // Cleanup metrics DB
    if (this.metricsDB) {
      try {
        const deleted = this.metricsDB.cleanupOldData(config.CLEANUP_DAYS);
        this.log(`🧹 Cleaned up ${deleted} old metrics records (older than ${config.CLEANUP_DAYS} days)`);
      } catch (err) {
        this.log('⚠️  Error cleaning up metrics:', err.message);
      }
    }

    // Cleanup download history
    if (this.downloadHistoryDB) {
      try {
        const retentionDays = config.getConfig()?.history?.retentionDays || 0;
        if (retentionDays > 0) {
          const deleted = this.downloadHistoryDB.cleanup(retentionDays);
          if (deleted > 0) {
            this.log(`🧹 Cleaned up ${deleted} old history entries (older than ${retentionDays} days)`);
          }
        }
      } catch (err) {
        this.log('⚠️  Error cleaning up history:', err.message);
      }
    }
  }
}

module.exports = new AutoRefreshManager();