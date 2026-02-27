/**
 * Unified Item Builder
 *
 * Assembles a single unified items array from the separate downloads, shared,
 * and uploads arrays produced by the normalization pipeline.
 *
 * Each item represents a single file/torrent identified by its hash. View
 * membership (downloads, shared, uploads) is expressed as boolean flags and
 * nested data rather than separate arrays.
 */

const clientMeta = require('./clientMeta');
const { itemKey } = require('./itemKey');

// ============================================================================
// STATUS MAPPING
// ============================================================================

/**
 * Resolve the unified status string from a normalized item
 */
function resolveStatus(item) {
  const clientType = item.clientType;
  const field = clientMeta.get(clientType).statusField;
  const map = clientMeta.getStatusMap(clientType);
  return map[item[field]] || 'active';
}

// ============================================================================
// MAGNET LINK GENERATION (server-side, mirrors frontend's formatters.js)
// ============================================================================

function generateMagnetLink(item) {
  const hash = item.hash;
  if (!hash) return null;
  const name = item.name;
  let link = `magnet:?xt=urn:btih:${hash}`;
  if (name) link += `&dn=${encodeURIComponent(name)}`;
  const trackers = item.trackers || [];
  for (const tracker of trackers) {
    link += `&tr=${encodeURIComponent(tracker)}`;
  }
  return link;
}

// ============================================================================
// BASE ITEM FACTORY
// ============================================================================

// Fields common to all clients
const COMMON_DEFAULTS = {
  downloading: false,
  shared: false,
  complete: false,
  seeding: false,
  size: 0,
  sizeDownloaded: 0,
  progress: 0,
  downloadSpeed: 0,
  uploadSpeed: 0,
  status: 'active',
  category: 'Default',
  categoryId: null,
  sources: { total: 0, connected: 0, seeders: 0, a4af: 0, notCurrent: 0 },
  activeUploads: [],
  uploadTotal: 0,
  ratio: 0,
  eta: null,  // ETA in seconds (null = complete or no speed, calculated server-side)
  peersDetailed: [],
  instanceId: null,
  raw: {}
};

/**
 * Create a blank unified item with all fields initialized to defaults.
 * Only includes fields relevant to the given client.
 */
function createBaseItem(hash, client) {
  const defaults = clientMeta.getDefaults(client);
  return {
    hash,
    name: '',
    client,
    networkType: clientMeta.getNetworkType(client),
    ...COMMON_DEFAULTS,
    // Deep-copy mutable common fields to avoid shared-reference bugs
    sources: { ...COMMON_DEFAULTS.sources },
    activeUploads: [],
    peersDetailed: [],
    raw: {},
    ...defaults,
    // Deep-copy mutable array fields from defaults
    ...(defaults.trackers ? { trackers: [], trackersDetailed: [] } : {})
  };
}

// ============================================================================
// MERGE FUNCTIONS — apply client data onto a unified item
// ============================================================================

/**
 * Apply download data (from the normalized downloads array) onto a unified item
 */
function applyDownloadData(item, download) {
  item.name = download.name || item.name;
  item.size = download.size || item.size;
  item.sizeDownloaded = download.downloaded || item.sizeDownloaded;
  item.progress = download.progress ?? (item.size > 0 ? Math.round((item.sizeDownloaded / item.size) * 100) : 0);
  item.downloadSpeed = download.speed || item.downloadSpeed;
  item.downloading = item.progress < 100;
  item.complete = item.progress >= 100;
  item.status = resolveStatus(download);

  // ETA calculation (in seconds)
  // null = complete or no speed (stalled)
  if (item.complete) {
    item.eta = null;
  } else if (item.downloadSpeed > 0) {
    const remainingBytes = item.size - item.sizeDownloaded;
    item.eta = remainingBytes > 0 ? remainingBytes / item.downloadSpeed : null;
  } else {
    item.eta = null;
  }

  if (clientMeta.isEd2k(download.clientType)) {
    // Organization
    item.categoryId = download.category ?? item.categoryId;
    item.category = download.categoryName || item.category;

    // Sources
    item.sources = {
      total: download.sourceCount || 0,
      connected: download.sourceCountXfer || 0,
      seeders: 0,
      a4af: download.sourceCountA4AF || 0,
      notCurrent: download.sourceCountNotCurrent || 0
    };

    // Priority
    item.downloadPriority = download.priority ?? item.downloadPriority;

    // Visualization
    item.partStatus = download.partStatus || item.partStatus;
    item.gapStatus = download.gapStatus || item.gapStatus;
    item.reqStatus = download.reqStatus || item.reqStatus;
    item.lastSeenComplete = download.lastSeenComplete || item.lastSeenComplete;

    // Links
    item.ed2kLink = download.ed2kLink || item.ed2kLink;
  } else if (clientMeta.isBittorrent(download.clientType)) {
    // BitTorrent clients (rtorrent, qbittorrent) — all items are always shared/seeding
    item.shared = true;

    // Determine seeding status from clientMeta
    const seedingStatuses = clientMeta.get(download.clientType).seedingStatuses;
    item.seeding = seedingStatuses ? seedingStatuses.includes(download.statusText) : false;

    // Map label/category to unified category name (empty/none -> Default)
    const label = download.label || download.category;
    item.category = (!label || label === '(none)') ? 'Default' : label;
    item.uploadSpeed = download.uploadSpeed || item.uploadSpeed;

    // Sources
    const peers = download.peers || {};
    item.sources = {
      total: peers.total || 0,
      connected: peers.connected || 0,
      seeders: peers.seeders || 0,
      a4af: 0
    };

    // Tracker
    item.tracker = download.trackerDomain || item.tracker;
    item.trackers = download.trackers || item.trackers;
    item.trackersDetailed = download.trackersDetailed || item.trackersDetailed;
    item.message = download.message || item.message;

    // Transfer stats
    item.uploadTotal = download.uploadTotal || item.uploadTotal;
    item.ratio = download.ratio || item.ratio;

    // Client-specific fields
    item.downloadPriority = download.priority ?? item.downloadPriority;
    item.directory = download.directory || item.directory;
    item.multiFile = download.isMultiFile || item.multiFile;
    item.peersDetailed = download.peersDetailed || item.peersDetailed;

    // Links
    item.magnetLink = generateMagnetLink(download);

    // Timestamps - use startedTime (when torrent was first started)
    // Treat 0 as null (0 = epoch time 1970, not a real timestamp)
    item.addedAt = download.startedTime && download.startedTime > 0 ? download.startedTime : null;
  }

  // Raw data — preserve the full original object for detail modals
  item.raw = download.raw || download;
}

/**
 * Apply shared file data (from the normalized sharedFiles array) onto a unified item
 * Merges — does not overwrite download data that may already be present
 */
function applySharedData(item, sharedFile) {
  item.shared = true;
  item.name = item.name || sharedFile.name || '';
  item.size = item.size || sharedFile.size || 0;

  // Upload speed from aggregated aMule uploads or rtorrent stats
  if (sharedFile.uploadSpeed > 0) {
    item.uploadSpeed = sharedFile.uploadSpeed;
  }

  if (clientMeta.isEd2k(sharedFile.clientType)) {
    // aMule shared files are completed downloads - mark them as such
    // (unless already set by applyDownloadData for files still downloading)
    if (!item.downloading) {
      item.progress = 100;
      item.complete = true;
      item.seeding = true;
      item.sizeDownloaded = item.size;
    }
    // Organization — shared file may have path-derived category
    // Only update category if item doesn't already have one (from download data)
    // or if shared file has a non-default category (path-based match)
    if (sharedFile.category !== undefined && (item.categoryId == null || sharedFile.category > 0)) {
      item.categoryId = sharedFile.category;
      item.category = sharedFile.categoryName || item.category;
    }

    // Transfer stats (from aMule shared file metadata)
    item.uploadTotal = sharedFile.transferredTotal || item.uploadTotal;
    item.uploadSession = sharedFile.transferred ?? item.uploadSession;
    item.requestsAccepted = sharedFile.acceptedCount ?? item.requestsAccepted;
    item.requestsAcceptedTotal = sharedFile.acceptedCountTotal ?? item.requestsAcceptedTotal;

    // Ratio (aMule doesn't provide one — calculate from uploadTotal / size)
    if (item.size > 0 && item.uploadTotal > 0) {
      item.ratio = item.uploadTotal / item.size;
    }

    // Upload priority
    item.uploadPriority = sharedFile.priority ?? item.uploadPriority;

    // Links
    item.ed2kLink = sharedFile.ed2kLink || item.ed2kLink;

    // Store file path for aMule shared files (needed for delete permission checks)
    if (sharedFile.path) {
      item.filePath = sharedFile.path;
    }

    // Raw data: merge shared file's EC_TAG fields into item.raw
    // For files that are both downloading and shared, this adds KNOWNFILE fields
    // (upload stats, upload priority) alongside the existing PARTFILE fields
    // (download stats, download priority), so the info modal has the complete picture.
    if (Object.keys(item.raw).length === 0) {
      // No download raw data — use shared file as base
      item.raw = sharedFile;
    } else {
      // Download raw data exists — merge in missing EC_TAG keys from shared
      // (aMule normalizer spreads raw EC_TAG fields onto the normalized object)
      for (const [key, value] of Object.entries(sharedFile)) {
        if (key.startsWith('EC_TAG_') && !(key in item.raw)) {
          item.raw[key] = value;
        }
      }
    }
  }
  // For rtorrent, shared data was already applied via applyDownloadData
  // (rtorrent items are always shared — the downloads array IS the shared array)
}

/**
 * Build an activeUploads peer entry from a normalized upload record.
 * Both aMule and rtorrent uploads are already normalized to the same
 * clean field names by normalizeAmuleUpload / normalizeRtorrentPeer,
 * so a single builder handles both clients.
 */
function buildUploadPeer(upload) {
  return {
    id: upload.id || '',
    address: upload.address || '',
    port: upload.port || 0,
    software: upload.software || 'Unknown',
    softwareId: upload.softwareId ?? null,
    uploadRate: upload.uploadRate || 0,
    downloadRate: upload.downloadRate || 0,
    uploadTotal: upload.uploadTotal || 0,
    uploadSession: upload.uploadSession ?? null,
    completedPercent: upload.completedPercent ?? null,
    isEncrypted: upload.isEncrypted || false,
    isIncoming: upload.isIncoming || false,
    geoData: upload.geoData || null,
    hostname: upload.hostname || null
  };
}

// ============================================================================
// MAIN ASSEMBLY FUNCTION
// ============================================================================

/**
 * Assemble unified items from the separate data arrays.
 *
 * Takes the already-normalized downloads, sharedFiles, and uploads arrays
 * (as produced by the existing DataFetchService pipeline) and merges them
 * into a single items array keyed by file hash.
 *
 * @param {Array} downloads      - Normalized downloads (aMule + rtorrent)
 * @param {Array} sharedFiles    - Normalized shared files (aMule + rtorrent)
 * @param {Array} uploads        - Normalized upload entries (aMule + rtorrent)
 * @param {Object} categoryManager - Optional CategoryManager instance for name resolution
 * @returns {Array} Array of unified item objects
 */
function assembleUnifiedItems(downloads, sharedFiles, uploads, categoryManager = null) {
  const itemsByHash = new Map();

  // Helper: get or create an item by compound key (instanceId:hash)
  const getOrCreate = (hash, client, instanceId) => {
    if (!hash) return null;
    const key = itemKey(instanceId, hash);
    if (!itemsByHash.has(key)) {
      const item = createBaseItem(hash.toLowerCase(), client);
      item.instanceId = instanceId || null;
      itemsByHash.set(key, item);
    }
    return itemsByHash.get(key);
  };

  // ── Step 1: Process downloads ──────────────────────────────────────────
  for (const download of (downloads || [])) {
    const item = getOrCreate(download.hash, download.clientType, download.instanceId);
    if (item) applyDownloadData(item, download);
  }

  // ── Step 2: Process shared files ───────────────────────────────────────
  for (const shared of (sharedFiles || [])) {
    const item = getOrCreate(shared.hash, shared.clientType, shared.instanceId);
    if (item) applySharedData(item, shared);
  }

  // ── Step 3: Process uploads → add to items' activeUploads ──────────────
  // Both BitTorrent and aMule uploads carry a hash linking to the parent item:
  //   - BitTorrent: upload.downloadHash (always present)
  //   - aMule: upload.sharedFileHash (enriched by DataFetchService from shared files)
  for (const upload of (uploads || [])) {
    const hash = upload.downloadHash || upload.sharedFileHash;
    if (!hash) continue;

    const itemMapKey = itemKey(upload.instanceId, hash);
    if (itemsByHash.has(itemMapKey)) {
      const item = itemsByHash.get(itemMapKey);
      item.activeUploads.push(buildUploadPeer(upload));
    }
  }

  return Array.from(itemsByHash.values());
}

module.exports = { assembleUnifiedItems };
