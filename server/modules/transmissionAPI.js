/**
 * Transmission API Module
 * Handles Transmission-specific API routes
 */

const BaseModule = require('../lib/BaseModule');
const logger = require('../lib/logger');

// Client registry - replaces direct singleton manager imports
const registry = require('../lib/ClientRegistry');

const log = logger.log.bind(logger);

class TransmissionAPI extends BaseModule {
  constructor() {
    super();
  }

  /**
   * Register API routes
   * @param {Express} app - Express application
   */
  registerRoutes(app) {
    // Get files for a torrent
    app.get('/api/transmission/files/:hash', async (req, res) => {
      try {
        const { hash } = req.params;
        const { instanceId } = req.query;

        const mgr = registry.get(instanceId);
        if (!mgr) {
          return res.status(503).json({ error: 'Transmission not connected' });
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

module.exports = new TransmissionAPI();
