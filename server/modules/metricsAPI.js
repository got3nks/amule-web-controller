/**
 * Metrics API Module
 * Handles historical metrics endpoints
 */

const BaseModule = require('../lib/BaseModule');
const timeRange = require('../lib/timeRange');
const response = require('../lib/responseFormatter');
const { validateTimeRange } = require('../middleware/validateRequest');

class MetricsAPI extends BaseModule {
  constructor() {
    super();
  }

  // GET /api/metrics/history
  getHistory(req, res) {
    try {
      const { range = '24h' } = req.query;
      // Range is pre-validated by middleware, parseTimeRange won't return null
      const { startTime, endTime, bucketSize } = timeRange.parseTimeRange(range);

      const metrics = this.metricsDB.getAggregatedMetrics(startTime, endTime, bucketSize);
      res.json({
        range,
        data: metrics.map(m => ({
          timestamp: m.bucket,
          uploadSpeed: Math.round(m.avg_upload_speed || 0),
          downloadSpeed: Math.round(m.avg_download_speed || 0),
          uploadedDelta: m.uploaded_delta || 0,
          downloadedDelta: m.downloaded_delta || 0
        }))
      });
    } catch (err) {
      this.log('⚠️  Error fetching metrics:', err);
      response.serverError(res, 'Failed to fetch metrics');
    }
  }

  // GET /api/metrics/speed-history
  getSpeedHistory(req, res) {
    try {
      const { range = '24h' } = req.query;
      // Range is pre-validated by middleware
      const { startTime, endTime, speedBucketSize } = timeRange.parseTimeRange(range);

      // Use speed-specific bucket size (finer granularity for speed charts)
      const metrics = this.metricsDB.getAggregatedMetrics(startTime, endTime, speedBucketSize);
      res.json({
        range,
        data: metrics.map(m => ({
          timestamp: m.bucket,
          uploadSpeed: Math.round(m.avg_upload_speed || 0),
          downloadSpeed: Math.round(m.avg_download_speed || 0)
        }))
      });
    } catch (err) {
      this.log('⚠️  Error fetching speed metrics:', err);
      response.serverError(res, 'Failed to fetch speed metrics');
    }
  }

  // GET /api/metrics/stats
  getStats(req, res) {
    try {
      const { range = '24h' } = req.query;
      // Range is pre-validated by middleware
      const { startTime, endTime } = timeRange.parseTimeRange(range);

      // Get first and last records to calculate total transferred
      const firstMetric = this.metricsDB.getFirstMetric(startTime, endTime);
      const lastMetric = this.metricsDB.getLastMetric(startTime, endTime);

      if (!firstMetric || !lastMetric) {
        return res.json({
          range,
          totalUploaded: 0,
          totalDownloaded: 0,
          avgUploadSpeed: 0,
          avgDownloadSpeed: 0,
          peakUploadSpeed: 0,
          peakDownloadSpeed: 0
        });
      }

      // Calculate totals from first and last records
      const totalUploaded = lastMetric.total_uploaded - firstMetric.total_uploaded;
      const totalDownloaded = lastMetric.total_downloaded - firstMetric.total_downloaded;

      // Calculate true average speeds: total bytes / time period in seconds
      const timeRangeSeconds = (lastMetric.timestamp - firstMetric.timestamp) / 1000;
      const avgUploadSpeed = timeRangeSeconds > 0 ? totalUploaded / timeRangeSeconds : 0;
      const avgDownloadSpeed = timeRangeSeconds > 0 ? totalDownloaded / timeRangeSeconds : 0;

      // Get peak speeds from raw data (not from aggregated buckets)
      const peaks = this.metricsDB.getPeakSpeeds(startTime, endTime);
      const peakUploadSpeed = peaks.peakUploadSpeed;
      const peakDownloadSpeed = peaks.peakDownloadSpeed;

      res.json({
        range,
        totalUploaded,
        totalDownloaded,
        avgUploadSpeed: Math.round(avgUploadSpeed),
        avgDownloadSpeed: Math.round(avgDownloadSpeed),
        peakUploadSpeed: Math.round(peakUploadSpeed),
        peakDownloadSpeed: Math.round(peakDownloadSpeed)
      });
    } catch (err) {
      this.log('⚠️  Error fetching stats:', err);
      response.serverError(res, 'Failed to fetch stats');
    }
  }

  // Register all metrics routes
  registerRoutes(app) {
    // All metrics routes use validateTimeRange middleware for ?range= parameter
    app.get('/api/metrics/history', validateTimeRange, (req, res) => this.getHistory(req, res));
    app.get('/api/metrics/speed-history', validateTimeRange, (req, res) => this.getSpeedHistory(req, res));
    app.get('/api/metrics/stats', validateTimeRange, (req, res) => this.getStats(req, res));
  }
}

module.exports = new MetricsAPI();