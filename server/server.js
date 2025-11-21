const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const AmuleClient = require('amule-ec-node');

// Configuration
const PORT = process.env.PORT || 4000;
const AMULE_HOST = process.env.AMULE_HOST || '127.0.0.1';
const AMULE_PORT = process.env.AMULE_PORT || 4712;
const AMULE_PASSWORD = process.env.AMULE_PASSWORD || 'admin';

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Create a write stream for the log file
const logFile = path.join(logDir, 'server.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Logging helper
function log(...args) {
  const timestamp = new Date().toISOString();
  const message = args.map(String).join(' ');
  logStream.write(`[${timestamp}] ${message}\n`);
  console.log(`[${timestamp}]`, ...args);
}

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
const appRoot = path.resolve(process.cwd());
app.use(express.static(appRoot));
app.use('/static', express.static(path.join(appRoot, 'static')));
app.get('/', (req, res) => res.sendFile(path.join(appRoot, 'static', 'index.html')));

// aMule client
let amuleClient = null;
let reconnectInterval = null;
let searchInProgress = false;
let requestQueue = Promise.resolve(); // Sequential request queue

// Queue helper
function queueRequest(fn) {
  const previous = requestQueue;
  const current = previous.then(fn).catch(err => {
    console.warn('Queued request failed:', err.message);
    return null;
  });
  requestQueue = current.then(() => {}, () => {});
  return current;
}

function enqueueAmuleCall(fn) {
  return queueRequest(() => fn());
}

// Broadcast to all clients
function broadcast(msg) {
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(msg));
  });
}

// Initialize aMule client
async function initAmuleClient() {
  try {
    amuleClient = new AmuleClient(AMULE_HOST, AMULE_PORT, AMULE_PASSWORD);
    await amuleClient.connect();
    log('✅ Connected to aMule successfully');
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
    return true;
  } catch (err) {
    log('❌ Failed to connect to aMule:', err.message);
    amuleClient = null;
    return false;
  }
}

// Start connection and auto-reconnect
async function startAmuleConnection() {
  const connected = await initAmuleClient();
  if (!connected && !reconnectInterval) {
    log('🔄 Will retry connection every 10 seconds...');
    reconnectInterval = setInterval(async () => {
      log('🔄 Attempting to reconnect to aMule...');
      await initAmuleClient();
    }, 10000);
  }
}

startAmuleConnection();

// WebSocket handler
wss.on('connection', (ws, req) => {
  const username = req.headers['remote-user'] || 'unknown';
  const nickname = req.headers['remote-name'] || 'unknown';
  const clientIp = req.socket.remoteAddress;

  function clientLog(...args) {
    const timestamp = new Date().toISOString();
    const logParts = [];
    const consoleParts = [];
    args.forEach(arg => {
      if (arg instanceof Error) {
        // Special handling for Error objects
        const errorString = `${arg.name}: ${arg.message}\n${arg.stack}`;
        consoleParts.push(errorString);
        logParts.push(`${arg.name}: ${arg.message}`);
      } else if (typeof arg === 'object' && arg !== null) {
        // Console: full object as JSON in one line
        try {
          consoleParts.push(JSON.stringify(arg));
        } catch {
          consoleParts.push('[Circular]');
        }
        // File: just indicate it's an object
        logParts.push('[Object]');
      } else {
        logParts.push(String(arg));
        consoleParts.push(String(arg));
      }
    });
    const logMessage = `[${timestamp} (${username}, ${nickname})] ${logParts.join(' ')}`;
    const consoleMessage = `[${timestamp} (${username}, ${nickname})] ${consoleParts.join(' ')}`;
    console.log(consoleMessage);
    logStream.write(logMessage + '\n');
  }

  clientLog(`New WebSocket connection from ${clientIp}`);
  ws.send(JSON.stringify({ type: 'connected', message: 'Connected to aMule Controller' }));
  ws.send(JSON.stringify({ type: 'search-lock', locked: searchInProgress }));

  ws.on('message', async message => {
    try {
      const data = JSON.parse(message);
      clientLog(`Received action: ${data.action}`, data);

      if (!amuleClient) await initAmuleClient();

      switch (data.action) {
        case 'search': await handleSearch(ws, data); break;
        case 'getPreviousSearchResults': await handleGetPreviousSearchResults(ws); break;
        case 'getDownloads': await handleGetDownloads(ws); break;
        case 'getShared': await handleGetShared(ws); break;
        case 'getServersList': await handleGetServersList(ws); break;
        case 'serverDoAction': await handleServerDoAction(ws, data); break;
        case 'getStats': await handleGetStats(ws); break;
        case 'getStatsTree': await handleGetStatsTree(ws); break;
        case 'getServerInfo': await handleGetServerInfo(ws); break;
        case 'getLog': await handleGetLog(ws); break;
        case 'getUploadingQueue': await handleGetUploads(ws); break;
        case 'download': await handleDownload(ws, data); break;
        case 'delete': await handleDelete(ws, data); break;
        case 'addEd2kLink': await handleAddEd2kLink(ws, data); break;
        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown action: ${data.action}` }));
      }
    } catch (err) {
      clientLog('Error processing message:', err);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => clientLog(`WebSocket connection closed from ${clientIp}`));
  ws.on('error', (err) => clientLog('WebSocket error:', err));

  // ---- Handler functions ----

  async function handleSearch(ws, data) {
    if (searchInProgress) {
      ws.send(JSON.stringify({ type: 'error', message: 'Another search is running' }));
      return;
    }
    searchInProgress = true;
    broadcast({ type: 'search-lock', locked: true });

    try {
      const result = await enqueueAmuleCall(() =>
        amuleClient.searchAndWaitResults(data.query, data.type, data.extension)
      );
      broadcast({ type: 'search-results', data: result.results || [] });
      clientLog(`Search completed: ${result.resultsLength || 0} results found`);
    } catch (err) {
      clientLog('Search error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Search failed: ' + err.message }));
    } finally {
      searchInProgress = false;
      broadcast({ type: 'search-lock', locked: false });
    }
  }

  async function handleGetPreviousSearchResults(ws) {
    try {
      const result = await enqueueAmuleCall(() => amuleClient.getSearchResults());
      ws.send(JSON.stringify({ type: 'previous-search-results', data: result.results || [] }));
      clientLog(`Previous search results fetched: ${result.resultsLength || 0} cached results`);
    } catch (err) {
      clientLog('Get previous search results error:', err);
      ws.send(JSON.stringify({ type: 'previous-search-results', data: [] }));
    }
  }

  async function handleGetDownloads(ws) {
    try {
      const downloads = await enqueueAmuleCall(() => amuleClient.getDownloadQueue());
      ws.send(JSON.stringify({ type: 'downloads-update', data: downloads }));
      clientLog(`Downloads fetched: ${downloads.length} files`);
    } catch (err) {
      clientLog('Get downloads error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch downloads: ' + err.message }));
    }
  }

  async function handleGetShared(ws) {
    try {
      const shared = await enqueueAmuleCall(() => amuleClient.getSharedFiles());
      ws.send(JSON.stringify({ type: 'shared-update', data: shared }));
      clientLog(`Shared files fetched: ${shared.length} files`);
    } catch (err) {
      clientLog('Get shared error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch shared files: ' + err.message }));
    }
  }

  async function handleGetServersList(ws) {
    try {
      const servers = await enqueueAmuleCall(() => amuleClient.getServerList());
      ws.send(JSON.stringify({ type: 'servers-update', data: servers }));
      clientLog('Servers list fetched successfully');
    } catch (err) {
      clientLog('Get servers list error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch servers list: ' + err.message }));
    }
  }

  async function handleServerDoAction(ws, data) {
    try {
      const { ip, port, serverAction } = data;
      if (!ip || !port || !serverAction) {
        throw new Error('Missing required parameters: ip, port, or serverAction');
      }

      let success;
      
      switch (serverAction) {
        case 'connect':
          success = await enqueueAmuleCall(() => amuleClient.connectServer(ip, port));
          break;
        case 'disconnect':
          success = await enqueueAmuleCall(() => amuleClient.disconnectServer(ip, port));
          break;
        case 'remove':
          success = await enqueueAmuleCall(() => amuleClient.removeServer(ip, port));
          break;
        default:
          throw new Error(`Unknown action: ${serverAction}`);
      }

      ws.send(JSON.stringify({ type: 'server-action', data: success }));
      clientLog(`Action ${serverAction} on server ${ip}:${port} ${success ? 'completed successfully' : 'failed'}`);
    } catch (err) {
      console.dir(err);
      clientLog('Server action error:', err);
      ws.send(JSON.stringify({ type: 'error', message: `Failed to perform action on server: ${err.message}` }));
    }
  }

  async function handleGetStats(ws) {
    try {
      const stats = await enqueueAmuleCall(() => amuleClient.getStats());
      ws.send(JSON.stringify({ type: 'stats-update', data: stats }));
      clientLog('Stats fetched successfully');
    } catch (err) {
      clientLog('Get stats error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch stats: ' + err.message }));
    }
  }

  async function handleGetStatsTree(ws) {
    try {
      const statsTree = await enqueueAmuleCall(() => amuleClient.getStatsTree());
      ws.send(JSON.stringify({ type: 'stats-tree-update', data: statsTree }));
      clientLog('Stats tree fetched successfully');
    } catch (err) {
      clientLog('Get stats tree error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch stats tree: ' + err.message }));
    }
  }

  async function handleGetServerInfo(ws) {
    try {
      const serverInfo = await enqueueAmuleCall(() => amuleClient.getServerInfo());
      ws.send(JSON.stringify({ type: 'server-info-update', data: serverInfo }));
      clientLog('Server info fetched successfully');
    } catch (err) {
      clientLog('Get server info error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch server info: ' + err.message }));
    }
  }

  async function handleGetLog(ws) {
    try {
      const log = await enqueueAmuleCall(() => amuleClient.getLog());
      ws.send(JSON.stringify({ type: 'log-update', data: log }));
      clientLog('Log fetched successfully');
    } catch (err) {
      clientLog('Get log error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch log: ' + err.message }));
    }
  }

  async function handleGetUploads(ws) {
    try {
      const uploadsData = await enqueueAmuleCall(() => amuleClient.getUploadingQueue());
      const uploads = (uploadsData?.EC_TAG_CLIENT) || [];
      ws.send(JSON.stringify({ type: 'uploads-update', data: uploads }));
      clientLog(`Uploads fetched: ${uploads.length} active uploads`);
    } catch (err) {
      clientLog('Get uploads error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch uploads: ' + err.message }));
    }
  }

  async function handleDownload(ws, data) {
    try {
      const success = await enqueueAmuleCall(() => amuleClient.downloadSearchResult(data.fileHash));
      ws.send(JSON.stringify({ type: 'download-started', success, fileHash: data.fileHash }));
      clientLog(`Download ${success ? 'started' : 'failed'} for: ${data.fileHash}`);
    } catch (err) {
      clientLog('Download error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to start download: ' + err.message }));
    }
  }

  async function handleDelete(ws, data) {
    try {
      const success = await enqueueAmuleCall(() => amuleClient.cancelDownload(data.fileHash));
      ws.send(JSON.stringify({ type: 'file-deleted', success, fileHash: data.fileHash }));
      clientLog(`File ${success ? 'deleted' : 'deletion failed'} for: ${data.fileHash}`);
    } catch (err) {
      clientLog('Delete error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to delete file: ' + err.message }));
    }
  }

  async function handleAddEd2kLink(ws, data) {
    try {
      const success = await enqueueAmuleCall(() => amuleClient.addEd2kLink(data.link));
      ws.send(JSON.stringify({ type: 'ed2k-added', success}));
      clientLog(`ED2K link ${data.link} ${success ? 'added' : 'failed to add'}`);
    } catch (err) {
      clientLog('AddEd2kLink error:', err);
      ws.send(JSON.stringify({ type: 'error', message: `Failed to add ED2K link ${data.link} with error: ${err.message}` }));
    }
  }
});

// ---- Auto-refresh intervals ----

function autoRefreshLoop() {
  if (!amuleClient || wss.clients.size === 0) {
    setTimeout(autoRefreshLoop, 3000);
    return;
  }

  enqueueAmuleCall(async () => {
    const stats = await amuleClient.getStats();
    if (stats) broadcast({ type: 'stats-update', data: stats });

    const downloads = await amuleClient.getDownloadQueue();
    if (downloads) broadcast({ type: 'downloads-update', data: downloads });

    const uploadsData = await amuleClient.getUploadingQueue();
    const uploads = uploadsData?.EC_TAG_CLIENT || [];
    broadcast({ type: 'uploads-update', data: uploads });
  }).finally(() => {
    setTimeout(autoRefreshLoop, 3000); // schedule next run after current finishes
  });
}

autoRefreshLoop();

// ---- Health check endpoint ----
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    amuleConnected: !!amuleClient,
    connections: wss.clients.size
  });
});

const connections = new Set();

server.on('connection', (conn) => {
  connections.add(conn);
  conn.on('close', () => connections.delete(conn));
});

// ---- Start server ----
server.listen(PORT, () => {
  log(`🚀 aMule Web Controller running on http://localhost:${PORT}`);
  log(`📊 WebSocket server ready`);
  log(`🔌 aMule connection: ${AMULE_HOST}:${AMULE_PORT}`);
});

// ---- Graceful shutdown ----
['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal, () => {
    log(`${signal} received, closing server...`);

    connections.forEach((conn) => conn.destroy());

    server.close(() => {
      log('Server closed');
      process.exit(0);
    });
  });
});
