/**
 * Deluge API Module
 * Handles Deluge-specific API routes
 */

const BaseModule = require('../lib/BaseModule');
const logger = require('../lib/logger');

// Client registry - replaces direct singleton manager imports
const registry = require('../lib/ClientRegistry');

const log = logger.log.bind(logger);

class DelugeAPI extends BaseModule {
  constructor() {
    super();
  }

  /**
   * Register API routes
   * @param {Express} app - Express application
   */
  registerRoutes(app) {
    // Get files for a torrent
    app.get('/api/deluge/files/:hash', async (req, res) => {
      try {
        const { hash } = req.params;
        const { instanceId } = req.query;

        const mgr = registry.get(instanceId);
        if (!mgr) {
          return res.status(503).json({ error: 'Deluge not connected' });
        }

        const files = await mgr.getFiles(hash);
        res.json({ files });
      } catch (err) {
        log('Error fetching torrent files:', err.message);
        res.status(500).json({ error: err.message });
      }
    });
  }
}

module.exports = new DelugeAPI();
