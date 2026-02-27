/**
 * rtorrent API Module
 * Handles rtorrent-specific API routes
 */

const BaseModule = require('../lib/BaseModule');
const logger = require('../lib/logger');

// Client registry - replaces direct singleton manager imports
const registry = require('../lib/ClientRegistry');

const log = logger.log.bind(logger);

class RtorrentAPI extends BaseModule {
  constructor() {
    super();
  }

  /**
   * Register API routes
   * @param {Express} app - Express application
   */
  registerRoutes(app) {
    // Get files for a torrent
    app.get('/api/rtorrent/files/:hash', async (req, res) => {
      try {
        const { hash } = req.params;
        const { instanceId } = req.query;

        const rtMgr = registry.get(instanceId);
        if (!rtMgr) {
          return res.status(503).json({ error: 'rtorrent not connected' });
        }

        const files = await rtMgr.getFiles(hash);
        res.json({ files });
      } catch (err) {
        log('Error fetching torrent files:', err.message);
        res.status(500).json({ error: err.message });
      }
    });
  }
}

module.exports = new RtorrentAPI();
