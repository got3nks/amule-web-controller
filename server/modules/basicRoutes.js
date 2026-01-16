/**
 * Basic Routes Module
 * Handles health check and static file serving
 */

const express = require('express');
const path = require('path');
const config = require('./config');
const BaseModule = require('../lib/BaseModule');
const { getClientIP } = require('../lib/authUtils');

class BasicRoutes extends BaseModule {
  constructor() {
    super();
  }

  // Health check endpoint
  healthCheck(req, res) {
    res.json({
      status: 'ok',
      amuleConnected: !!this.amuleManager?.isConnected(),
      connections: this.wss.clients.size,
      geoip: {
        cityLoaded: !!this.geoIPManager.cityReader,
        countryLoaded: !!this.geoIPManager.countryReader
      }
    });
  }

  // Request logging middleware
  requestLogger(req, res, next) {
    const userAgent = req.get('User-Agent') || 'Unknown';
    const clientIp = getClientIP(req);
    const geoData = this.geoIPManager.getGeoIPData(clientIp);
    const locationInfo = this.geoIPManager.formatLocationInfo(geoData);

    this.log(`[HTTP] ${req.method} ${req.url} from ${clientIp}${locationInfo} (${userAgent})`);

    if (Object.keys(req.query).length > 0) {
      this.log(`[HTTP] Query params: ${JSON.stringify(req.query)}`);
    }
    if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
      this.log(`[HTTP] Body params: ${JSON.stringify(req.body)}`);
    }
    next();
  }

  // Register public routes (before authentication)
  registerPublicRoutes(app) {
    // Request logging middleware
    app.use((req, res, next) => this.requestLogger(req, res, next));

    // Serve static files
    const appRoot = config.getAppRoot();
    app.use(express.static(appRoot));
    app.use('/static', express.static(path.join(appRoot, 'static')));

    // Health check (public)
    app.get('/health', (req, res) => this.healthCheck(req, res));

    // Login page (public)
    app.get('/login', (req, res) => {
      res.sendFile(path.join(appRoot, 'static', 'index.html'));
    });
  }

  // Register protected routes (after authentication)
  registerRoutes(app) {
    const appRoot = config.getAppRoot();

    // Home page (protected)
    app.get('/', (req, res) => {
      res.sendFile(path.join(appRoot, 'static', 'index.html'));
    });
  }
}

module.exports = new BasicRoutes();