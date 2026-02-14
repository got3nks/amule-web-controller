/**
 * Metrics API Module
 * Handles historical metrics endpoints
 */

const BaseModule = require('../lib/BaseModule');
const timeRange = require('../lib/timeRange');
const response = require('../lib/responseFormatter');

const VALID_RANGES = ['24h', '7d', '30d'];

class MetricsAPI extends BaseModule {
  constructor() {
    super();
  }

  /**
   * Format raw metrics to API response format
   * @private
   */
  _formatMetrics(metrics) {
    return metrics.map(m => ({
      timestamp: m.bucket,
      // Combined speeds (all clients)
      uploadSpeed: Math.round((m.avg_upload_speed || 0) + (m.avg_rt_upload_speed || 0) + (m.avg_qb_upload_speed || 0)),
      downloadSpeed: Math.round((m.avg_download_speed || 0) + (m.avg_rt_download_speed || 0) + (m.avg_qb_download_speed || 0)),
      // Per-client speeds
      amuleUploadSpeed: Math.round(m.avg_upload_speed || 0),
      amuleDownloadSpeed: Math.round(m.avg_download_speed || 0),
      rtorrentUploadSpeed: Math.round(m.avg_rt_upload_speed || 0),
      rtorrentDownloadSpeed: Math.round(m.avg_rt_download_speed || 0),
      qbittorrentUploadSpeed: Math.round(m.avg_qb_upload_speed || 0),
      qbittorrentDownloadSpeed: Math.round(m.avg_qb_download_speed || 0),
      // BitTorrent combined (rtorrent + qbittorrent)
      bittorrentUploadSpeed: Math.round((m.avg_rt_upload_speed || 0) + (m.avg_qb_upload_speed || 0)),
      bittorrentDownloadSpeed: Math.round((m.avg_rt_download_speed || 0) + (m.avg_qb_download_speed || 0)),
      // Combined deltas (all clients)
      uploadedDelta: (m.uploaded_delta || 0) + (m.rt_uploaded_delta || 0) + (m.qb_uploaded_delta || 0),
      downloadedDelta: (m.downloaded_delta || 0) + (m.rt_downloaded_delta || 0) + (m.qb_downloaded_delta || 0),
      // Per-client deltas
      amuleUploadedDelta: m.uploaded_delta || 0,
      amuleDownloadedDelta: m.downloaded_delta || 0,
      rtorrentUploadedDelta: m.rt_uploaded_delta || 0,
      rtorrentDownloadedDelta: m.rt_downloaded_delta || 0,
      qbittorrentUploadedDelta: m.qb_uploaded_delta || 0,
      qbittorrentDownloadedDelta: m.qb_downloaded_delta || 0,
      // BitTorrent combined deltas (rtorrent + qbittorrent)
      bittorrentUploadedDelta: (m.rt_uploaded_delta || 0) + (m.qb_uploaded_delta || 0),
      bittorrentDownloadedDelta: (m.rt_downloaded_delta || 0) + (m.qb_downloaded_delta || 0)
    }));
  }

  /**
   * Get metrics data for a given time range and bucket size
   * @private
   */
  _getMetricsData(range, startTime, endTime, bucketSize) {
    const metrics = this.metricsDB.getAggregatedMetrics(startTime, endTime, bucketSize);
    return { range, data: this._formatMetrics(metrics) };
  }

  /**
   * Calculate stats from metrics in time range
   * @private
   */
  _getStatsData(range, startTime, endTime) {
    const firstMetric = this.metricsDB.getFirstMetric(startTime, endTime);
    const lastMetric = this.metricsDB.getLastMetric(startTime, endTime);

    if (!firstMetric || !lastMetric) {
      return null;
    }

    const timeRangeSeconds = (lastMetric.timestamp - firstMetric.timestamp) / 1000;

    // Calculate totals from first and last records
    const amuleTotalUploaded = (lastMetric.total_uploaded || 0) - (firstMetric.total_uploaded || 0);
    const amuleTotalDownloaded = (lastMetric.total_downloaded || 0) - (firstMetric.total_downloaded || 0);
    const amuleAvgUploadSpeed = timeRangeSeconds > 0 ? amuleTotalUploaded / timeRangeSeconds : 0;
    const amuleAvgDownloadSpeed = timeRangeSeconds > 0 ? amuleTotalDownloaded / timeRangeSeconds : 0;

    const rtTotalUploaded = (lastMetric.rt_total_uploaded || 0) - (firstMetric.rt_total_uploaded || 0);
    const rtTotalDownloaded = (lastMetric.rt_total_downloaded || 0) - (firstMetric.rt_total_downloaded || 0);
    const rtAvgUploadSpeed = timeRangeSeconds > 0 ? rtTotalUploaded / timeRangeSeconds : 0;
    const rtAvgDownloadSpeed = timeRangeSeconds > 0 ? rtTotalDownloaded / timeRangeSeconds : 0;

    const qbTotalUploaded = (lastMetric.qb_total_uploaded || 0) - (firstMetric.qb_total_uploaded || 0);
    const qbTotalDownloaded = (lastMetric.qb_total_downloaded || 0) - (firstMetric.qb_total_downloaded || 0);
    const qbAvgUploadSpeed = timeRangeSeconds > 0 ? qbTotalUploaded / timeRangeSeconds : 0;
    const qbAvgDownloadSpeed = timeRangeSeconds > 0 ? qbTotalDownloaded / timeRangeSeconds : 0;

    // BitTorrent combined (rtorrent + qbittorrent)
    const btTotalUploaded = rtTotalUploaded + qbTotalUploaded;
    const btTotalDownloaded = rtTotalDownloaded + qbTotalDownloaded;
    const btAvgUploadSpeed = rtAvgUploadSpeed + qbAvgUploadSpeed;
    const btAvgDownloadSpeed = rtAvgDownloadSpeed + qbAvgDownloadSpeed;

    const peaks = this.metricsDB.getPeakSpeeds(startTime, endTime);

    return {
      range,
      // Combined stats (all clients)
      totalUploaded: amuleTotalUploaded + btTotalUploaded,
      totalDownloaded: amuleTotalDownloaded + btTotalDownloaded,
      avgUploadSpeed: Math.round(amuleAvgUploadSpeed + btAvgUploadSpeed),
      avgDownloadSpeed: Math.round(amuleAvgDownloadSpeed + btAvgDownloadSpeed),
      peakUploadSpeed: Math.round(peaks.peakUploadSpeed),
      peakDownloadSpeed: Math.round(peaks.peakDownloadSpeed),
      // Per-client stats
      amule: {
        totalUploaded: amuleTotalUploaded,
        totalDownloaded: amuleTotalDownloaded,
        avgUploadSpeed: Math.round(amuleAvgUploadSpeed),
        avgDownloadSpeed: Math.round(amuleAvgDownloadSpeed),
        peakUploadSpeed: Math.round(peaks.amule?.peakUploadSpeed || 0),
        peakDownloadSpeed: Math.round(peaks.amule?.peakDownloadSpeed || 0)
      },
      rtorrent: {
        totalUploaded: rtTotalUploaded,
        totalDownloaded: rtTotalDownloaded,
        avgUploadSpeed: Math.round(rtAvgUploadSpeed),
        avgDownloadSpeed: Math.round(rtAvgDownloadSpeed),
        peakUploadSpeed: Math.round(peaks.rtorrent?.peakUploadSpeed || 0),
        peakDownloadSpeed: Math.round(peaks.rtorrent?.peakDownloadSpeed || 0)
      },
      qbittorrent: {
        totalUploaded: qbTotalUploaded,
        totalDownloaded: qbTotalDownloaded,
        avgUploadSpeed: Math.round(qbAvgUploadSpeed),
        avgDownloadSpeed: Math.round(qbAvgDownloadSpeed),
        peakUploadSpeed: Math.round(peaks.qbittorrent?.peakUploadSpeed || 0),
        peakDownloadSpeed: Math.round(peaks.qbittorrent?.peakDownloadSpeed || 0)
      },
      // BitTorrent combined (for charts)
      bittorrent: {
        totalUploaded: btTotalUploaded,
        totalDownloaded: btTotalDownloaded,
        avgUploadSpeed: Math.round(btAvgUploadSpeed),
        avgDownloadSpeed: Math.round(btAvgDownloadSpeed),
        peakUploadSpeed: Math.round(peaks.bittorrent?.peakUploadSpeed || 0),
        peakDownloadSpeed: Math.round(peaks.bittorrent?.peakDownloadSpeed || 0)
      }
    };
  }

  // GET /api/metrics/history - coarser granularity for data transfer charts
  getHistory(req, res) {
    try {
      const range = this._validateRange(req, res);
      if (!range) return;
      const { startTime, endTime, bucketSize } = timeRange.parseTimeRange(range);
      res.json(this._getMetricsData(range, startTime, endTime, bucketSize));
    } catch (err) {
      this.log('Error fetching metrics:', err);
      response.serverError(res, 'Failed to fetch metrics');
    }
  }

  // GET /api/metrics/speed-history - finer granularity for speed charts
  getSpeedHistory(req, res) {
    try {
      const range = this._validateRange(req, res);
      if (!range) return;
      const { startTime, endTime, speedBucketSize } = timeRange.parseTimeRange(range);
      res.json(this._getMetricsData(range, startTime, endTime, speedBucketSize));
    } catch (err) {
      this.log('Error fetching speed metrics:', err);
      response.serverError(res, 'Failed to fetch speed metrics');
    }
  }

  // GET /api/metrics/stats - aggregate statistics
  getStats(req, res) {
    try {
      const range = this._validateRange(req, res);
      if (!range) return;
      const { startTime, endTime } = timeRange.parseTimeRange(range);
      res.json(this._getStatsData(range, startTime, endTime));
    } catch (err) {
      this.log('Error fetching stats:', err);
      response.serverError(res, 'Failed to fetch stats');
    }
  }

  // GET /api/metrics/dashboard - combined endpoint for dashboard views
  getDashboard(req, res) {
    try {
      const range = this._validateRange(req, res);
      if (!range) return;
      const { startTime, endTime, bucketSize, speedBucketSize } = timeRange.parseTimeRange(range);

      res.json({
        speedData: this._getMetricsData(range, startTime, endTime, speedBucketSize),
        historicalData: this._getMetricsData(range, startTime, endTime, bucketSize),
        historicalStats: this._getStatsData(range, startTime, endTime)
      });
    } catch (err) {
      this.log('Error fetching dashboard metrics:', err);
      response.serverError(res, 'Failed to fetch dashboard metrics');
    }
  }

  // Validate range query parameter, return badRequest if invalid
  _validateRange(req, res) {
    const range = req.query.range || '24h';
    if (!VALID_RANGES.includes(range)) {
      response.badRequest(res, `range must be one of: ${VALID_RANGES.join(', ')}`);
      return null;
    }
    return range;
  }

  // Register all metrics routes
  registerRoutes(app) {
    app.get('/api/metrics/dashboard', (req, res) => this.getDashboard(req, res));
    app.get('/api/metrics/history', (req, res) => this.getHistory(req, res));
    app.get('/api/metrics/speed-history', (req, res) => this.getSpeedHistory(req, res));
    app.get('/api/metrics/stats', (req, res) => this.getStats(req, res));
  }
}

module.exports = new MetricsAPI();
