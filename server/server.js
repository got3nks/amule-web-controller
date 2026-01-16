/**
 * Main Server File
 * Orchestrates all modules and starts server
 */

// ============================================================================
// DEPENDENCIES
// ============================================================================

// Express and HTTP
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const SQLiteStore = require('better-sqlite3-session-store')(session);

// Application modules
const config = require('./modules/config');
const configAPI = require('./modules/configAPI');
const authManager = require('./modules/authManager');
const authAPI = require('./modules/authAPI');
const amuleManager = require('./modules/amuleManager');
const geoIPManager = require('./modules/geoIPManager');
const arrManager = require('./modules/arrManager');
const metricsAPI = require('./modules/metricsAPI');
const historyAPI = require('./modules/historyAPI');
const torznabAPI = require('./modules/torznabAPI');
const qbittorrentAPI = require('./modules/qbittorrentAPI');
const webSocketHandlers = require('./modules/webSocketHandlers');
const autoRefreshManager = require('./modules/autoRefreshManager');
const basicRoutes = require('./modules/basicRoutes');
const versionAPI = require('./modules/versionAPI');

// Middleware
const requireAuth = require('./middleware/auth');

// Utilities
const MetricsDB = require('./database');
const HashStore = require('./lib/qbittorrent/hashStore');
const DownloadHistory = require('./lib/downloadHistory');
const HostnameResolver = require('./lib/hostnameResolver');
const logger = require('./lib/logger');

// ============================================================================
// LOGGING SETUP
// ============================================================================

// Initialize centralized logger
const logDir = config.getLogDir();
logger.init(logDir);

// Create bound log function for local use
const log = logger.log.bind(logger);

// ============================================================================
// EXPRESS & WEBSOCKET SETUP
// ============================================================================

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Express middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware (will be configured after config loading)
let sessionMiddleware = null;

// --- WebSocket broadcast setup ---
const createBroadcaster = (wss) => (msg) => {
    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(msg));
    });
};
const broadcastFn = createBroadcaster(wss);

// ============================================================================
// DATABASE & STORE INITIALIZATION
// ============================================================================

const dbPath = config.getMetricsDbPath();
const metricsDB = new MetricsDB(dbPath);

const hashDbPath = config.getHashDbPath();
const hashStore = new HashStore(hashDbPath);

// Download history database
const historyDbPath = config.getHistoryDbPath();
const downloadHistory = new DownloadHistory(historyDbPath);

// Hostname resolver for peer IPs
const hostnameResolver = new HostnameResolver({
  ttl: 60 * 60 * 1000,        // 1 hour cache TTL
  failedTtl: 10 * 60 * 1000,  // 10 minutes for failed lookups
  maxCacheSize: 5000,         // Max cached entries
  timeout: 3000               // 3 second DNS timeout
});

// ============================================================================
// MODULE DEPENDENCY INJECTION
// ============================================================================

// Common dependencies object - modules pick what they need via inject()
const deps = {
  amuleManager,
  authManager,
  geoIPManager,
  hostnameResolver,
  metricsDB,
  downloadHistoryDB: downloadHistory,
  configManager: config,
  hashStore,
  wss,
  broadcast: broadcastFn
};

// Inject dependencies into each module (each module only uses what it needs)
metricsAPI.inject(deps);
autoRefreshManager.inject(deps);
historyAPI.inject(deps);
amuleManager.inject(deps);
qbittorrentAPI.inject(deps);
authAPI.inject(deps);
webSocketHandlers.inject(deps);
configAPI.inject(deps);
basicRoutes.inject(deps);
arrManager.inject(deps);
torznabAPI.inject(deps);

// ============================================================================
// ROUTE REGISTRATION (ORDER MATTERS!)
// ============================================================================

// --- Public routes (no authentication required) ---

// Basic public routes (request logging, static files, /login page)
basicRoutes.registerPublicRoutes(app);

// Unprotected API routes (for external integrations)
torznabAPI.registerRoutes(app);       // Torznab indexer API
qbittorrentAPI.registerRoutes(app);   // qBittorrent API
versionAPI.registerRoutes(app);       // Version info API (public)

// --- Session middleware ---
// Apply session middleware (needed for auth API and protected routes)
app.use((req, res, next) => {
  if (sessionMiddleware) {
    sessionMiddleware(req, res, next);
  } else {
    // Session not yet initialized - allow through (first run mode)
    next();
  }
});

// --- Auth API routes ---
// These routes need session but not requireAuth (handles their own auth)
authAPI.registerRoutes(app);

// --- Authentication middleware ---
// Apply to all subsequent routes (protects web UI and internal APIs)
app.use(requireAuth);

// --- Protected routes ---
basicRoutes.registerRoutes(app);    // Protected basic routes (home, health)
configAPI.registerRoutes(app);      // Configuration management API
metricsAPI.registerRoutes(app);     // Metrics API
historyAPI.registerRoutes(app);     // Download history API
versionAPI.registerProtectedRoutes(app); // Version seen tracking (protected)

// ============================================================================
// WEBSOCKET SETUP
// ============================================================================

wss.on('connection', (ws, req) => {
  webSocketHandlers.handleConnection(ws, req);
});

// ============================================================================
// SERVICE INITIALIZATION
// ============================================================================

/**
 * Initialize session middleware with authentication support
 */
function initializeSessionMiddleware() {
  const sessionDB = authManager.getSessionDB();
  const sessionSecret = config.getSessionSecret();

  sessionMiddleware = session({
    store: new SQLiteStore({
      client: sessionDB,
      expired: {
        clear: true,
        intervalMs: 900000 // 15 minutes
      }
    }),
    secret: sessionSecret || 'fallback-secret-key',
    name: 'amule.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,     // Allow cookies over HTTP (for Docker/development)
      sameSite: 'lax',   // Less restrictive than 'strict', but still secure
      maxAge: null       // Set dynamically in login based on rememberMe
    }
  });

  log('🔐 Session middleware initialized');
}

/**
 * Initialize all application services
 * Called after first-run configuration or on normal startup
 */
async function initializeServices() {
  log('🚀 Initializing services...');

  // Initialize session and authentication
  initializeSessionMiddleware();
  authManager.start();

  // Initialize GeoIP database
  await geoIPManager.initGeoIP();

  // Start watching GeoIP files after a short delay (prevents initial reload)
  setTimeout(() => {
    geoIPManager.watchGeoIPFiles();
  }, 5000);

  // Start aMule connection with auto-reconnect (non-blocking)
  // Connection happens in background - server starts immediately
  amuleManager.startConnection();

  // Start auto-refresh loop for stats/downloads/uploads
  autoRefreshManager.start();

  // Schedule automatic searches for Sonarr/Radarr
  arrManager.scheduleAutomaticSearches();

  log('✅ All services initialized successfully');
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Initialize configuration and start server
 */
async function startServer() {
  // Load configuration from file or environment variables
  log('⚙️  Loading configuration...');
  await config.loadConfig();

  // Pass initializeServices to configAPI so it can initialize after first-run setup
  configAPI.setInitializeServices(initializeServices);

  // Check if this is the first run (no config file exists)
  const isFirstRun = await config.isFirstRun();

  // Track connections for graceful shutdown
  const connections = new Set();
  server.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
  });

  if (isFirstRun) {
    // FIRST RUN MODE
    log('🎯 First run detected - setup wizard required');
    log('⚠️  Services will NOT be initialized until configuration is complete');
    log('📝 Please access the web interface to complete the setup');

    // If auth is enabled via env vars, we need session middleware for login
    if (config.getAuthEnabled()) {
      log('🔐 Auth enabled via environment - initializing session middleware');
      initializeSessionMiddleware();
      authManager.start();
    }

    // In first-run mode, only start HTTP server and WebSocket
    // Don't initialize aMule, GeoIP, or Arr services until configured
    server.listen(config.PORT, () => {
      log(`🚀 aMule Web Controller running on http://localhost:${config.PORT}`);
      log(`📊 WebSocket server ready`);
      log(`⚙️  SETUP MODE - Complete configuration via web interface`);
    });
  } else {
    // NORMAL STARTUP
    log('✅ Configuration loaded successfully');

    // Initialize all services
    await initializeServices();

    // Start HTTP server
    server.listen(config.PORT, () => {
      log(`🚀 aMule Web Controller running on http://localhost:${config.PORT}`);
      log(`📊 WebSocket server ready`);
      log(`🔌 aMule connection: ${config.AMULE_HOST}:${config.AMULE_PORT}`);
    });
  }

  // ============================================================================
  // GRACEFUL SHUTDOWN
  // ============================================================================

  ['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, () => {
      log(`${signal} received, shutting down gracefully...`);

      // Destroy all active connections
      connections.forEach((conn) => conn.destroy());

      // Close HTTP server
      server.close(() => {
        log('HTTP server closed');

        // Stop background tasks
        authManager.stop();
        autoRefreshManager.stop();

        // Shutdown aMule connection
        amuleManager.shutdown().then(() => {
          log('aMule connection closed');

          // Close databases
          metricsDB.close();
          log('Metrics database closed');

          hashStore.close();
          log('Hash store closed');

          downloadHistory.close();
          log('Download history closed');

          // Close GeoIP
          geoIPManager.shutdown().then(() => {
            log('GeoIP manager closed');
            log('✅ Graceful shutdown complete');

            // Close logger last
            logger.close();
            process.exit(0);
          });
        });
      });
    });
  });
}

// ============================================================================
// ENTRY POINT
// ============================================================================

startServer().catch(err => {
  log('❌ Failed to start server:', err);
  process.exit(1);
});
