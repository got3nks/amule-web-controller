// Import React from CDN
import React from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';

const { createElement: h } = React;

// Icons (simplified inline SVG)
const Icon = ({ name, size = 20, className = '' }) => {
  const icons = {
    search: '<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
    download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m14-7l-5 5m0 0l-5-5m5 5V3"/>',
    share: '<path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>',
    home: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
    refresh: '<path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>',
    trash: '<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M6 18L18 6M6 6l12 12"/>',
    chevronLeft: '<path d="M15 19l-7-7 7-7"/>',
    chevronRight: '<path d="M9 5l7 7-7 7"/>',
    chevronDown: '<path d="M19 9l-7 7-7-7"/>',
    chevronUp: '<path d="M5 15l7-7 7 7"/>',
    upload: '<path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4M17 8l-5-5m0 0L7 8m5-5v12"/>',
    sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
    moon: '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>',
    chartBar: '<path d="M3 3v18h18M7 16V9m4 7V6m4 10v-3m4 3V9"/>',
    fileText: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8m8 4H8m2-8H8"/>'
  };
  
  return h('svg', {
    className: `inline-block ${className}`,
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    viewBox: '0 0 24 24',
    dangerouslySetInnerHTML: { __html: icons[name] }
  });
};

const AmuleWebApp = () => {
  const [currentView, setCurrentView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('global');
  const [searchLocked, setSearchLocked] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [previousResults, setPreviousResults] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [shared, setShared] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState('');
  const [serverInfo, setServerInfo] = useState('');
  const [statsTree, setStatsTree] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [sortBy, setSortBy] = useState('sourceCount');
  const [sortDirection, setSortDirection] = useState('desc');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => {
    // Check device preference, default to dark
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      // Apply immediately
      const initialTheme = 'dark'; // Always default to dark
      const root = document.documentElement;
      const body = document.body;
      if (initialTheme === 'dark') {
        root.classList.add('dark');
        body.classList.add('dark');
        root.style.colorScheme = 'dark';
      }
      return initialTheme;
    }
    return 'dark';
  });
  
  const PAGE_SIZE_DESKTOP = 20,
        PAGE_SIZE_MOBILE = 10;
  // Dynamic page size based on screen width
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 ? PAGE_SIZE_DESKTOP : PAGE_SIZE_MOBILE;
    }
    return 10;
  });

  // WebSocket connection for real-time updates
  const [ws, setWs] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const reconnectRef = useRef({ timer: null, interval: 1000 });

  // Apply theme to document and body
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  // Update page size on window resize
  useEffect(() => {
    const handleResize = () => {
      const newPageSize = window.innerWidth >= 768 ? PAGE_SIZE_DESKTOP : PAGE_SIZE_MOBILE;
      setPageSize(newPageSize);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const websocket = new WebSocket(`${protocol}://${window.location.host}`);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      reconnectRef.current.interval = 1000;
      if (reconnectRef.current.timer) {
        clearTimeout(reconnectRef.current.timer);
        reconnectRef.current.timer = null;
      }
    };

    websocket.onclose = () => {
      console.warn('WebSocket disconnected, scheduling reconnect...');
      setWsConnected(false);
      scheduleReconnect();
    };

    websocket.onerror = (err) => {
      console.error('WebSocket error:', err);
      websocket.close(); // trigger onclose
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'downloads-update') {
        setDownloads(data.data);
      } else if (data.type === 'shared-update') {
        setShared(data.data);
      } else if (data.type === 'previous-search-results') {
        setPreviousResults(data.data || []);
      } else if (data.type === 'search-lock') {
        setSearchLocked(data.locked);
      } else if (data.type === 'stats-update') {
        setStats(data.data);
      } else if (data.type === 'uploads-update') {
        setUploads(data.data || []);
      } else if (data.type === 'log-update') {
        setLogs(data.data?.EC_TAG_STRING || '');
      } else if (data.type === 'server-info-update') {
        setServerInfo(data.data?.EC_TAG_STRING || '');
      } else if (data.type === 'stats-tree-update') {
        setStatsTree(data.data);
      }
    };

    setWs(websocket);
  };

  const scheduleReconnect = () => {
    if (!reconnectRef.current.timer) {
      reconnectRef.current.timer = setTimeout(() => {
        console.log('Attempting WebSocket reconnect...');
        reconnectRef.current.interval = Math.min(reconnectRef.current.interval * 2, 16000);
        reconnectRef.current.timer = null;
        connectWebSocket();
      }, reconnectRef.current.interval);
    }
  };

  useEffect(() => {
    connectWebSocket();

    // cleanup
    return () => {
      if (ws) ws.close();
      if (reconnectRef.current.timer) clearTimeout(reconnectRef.current.timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (wsConnected) {
      fetchStats();
    }
  }, [wsConnected]);

  useEffect(() => {
    if (currentView === 'downloads') {
      fetchDownloads();
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'search') {
      fetchPreviousSearchResults();
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'shared') {
      fetchShared();
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'uploads') {
      fetchUploads();
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'logs') {
      fetchLogs();
      fetchServerInfo();
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'statistics') {
      fetchStatsTree();
    }
  }, [currentView]);

  const sendWsMessage = (message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  const fetchDownloads = async () => {
    setLoading(true);
    sendWsMessage({ action: 'getDownloads' });
    setTimeout(() => setLoading(false), 1000);
  };

  const fetchPreviousSearchResults = async () => {
    sendWsMessage({ action: 'getPreviousSearchResults' });
  };

  const fetchShared = async () => {
    setLoading(true);
    sendWsMessage({ action: 'getShared' });
    setTimeout(() => setLoading(false), 1000);
  };

  const fetchStats = () => {
    sendWsMessage({ action: 'getStats' });
  };

  const fetchUploads = () => {
    setLoading(true);
    sendWsMessage({ action: 'getUploadingQueue' });
    setTimeout(() => setLoading(false), 1000);
  };

  const fetchLogs = () => {
    setLoading(true);
    sendWsMessage({ action: 'getLog' });
    setTimeout(() => setLoading(false), 1000);
  };

  const fetchServerInfo = () => {
    sendWsMessage({ action: 'getServerInfo' });
  };

  const fetchStatsTree = () => {
    setLoading(true);
    sendWsMessage({ action: 'getStatsTree' });
    setTimeout(() => setLoading(false), 1000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    
    sendWsMessage({
      action: 'search',
      query: searchQuery,
      type: searchType,
      extension: null
    });

    const handleSearchResponse = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'search-results') {
        if (!data.data || data.data.length === 0) {
          setError('No results found');
          setSearchResults([]);
        } else {
          setSearchResults(data.data);
          setCurrentView('search-results');
          setPage(0);
        }
        setLoading(false);
        ws.removeEventListener('message', handleSearchResponse);
      }
    };

    ws.addEventListener('message', handleSearchResponse);
  };

  const handleDownload = (fileHash) => {
    sendWsMessage({ action: 'download', fileHash });
    alert('Download started successfully');
  };

  const handleDelete = (fileHash, fileName) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;
    
    sendWsMessage({ action: 'delete', fileHash });
    alert('File deleted successfully');
    
    setTimeout(() => {
      if (currentView === 'downloads') fetchDownloads();
      if (currentView === 'shared') fetchShared();
    }, 500);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const kb = 1024;
    const mb = kb * 1024;
    const gb = mb * 1024;

    if (bytes >= gb) return (bytes / gb).toFixed(2) + ' GB';
    if (bytes >= mb) return (bytes / mb).toFixed(2) + ' MB';
    if (bytes >= kb) return (bytes / kb).toFixed(2) + ' KB';
    return bytes + ' B';
  };

  const formatSpeed = (speed) => {
    if (speed <= 0) return '-';
    const kb = 1024;
    const mb = kb * 1024;

    if (speed >= mb) return (speed / mb).toFixed(2) + ' MB/s';
    if (speed >= kb) return (speed / kb).toFixed(2) + ' KB/s';
    return speed + ' B/s';
  };

  const sortFiles = (files) => {
    return [...files].sort((a, b) => {
      let result = 0;

      if (sortBy === 'progress') result = (a.progress || 0) - (b.progress || 0);
      else if (sortBy === 'fileSize') result = a.fileSize - b.fileSize;
      else if (sortBy === 'sourceCount') result = (a.sourceCount || 0) - (b.sourceCount || 0);
      else if (sortBy === 'transferred') result = a.transferred - b.transferred;
      else if (sortBy === 'transferredTotal') result = a.transferredTotal - b.transferredTotal;
      else if (sortBy === 'EC_TAG_CLIENT_UP_SPEED') result = (a.EC_TAG_CLIENT_UP_SPEED || 0) - (b.EC_TAG_CLIENT_UP_SPEED || 0);
      else if (sortBy === 'EC_TAG_CLIENT_UPLOAD_SESSION') result = (a.EC_TAG_CLIENT_UPLOAD_SESSION || 0) - (b.EC_TAG_CLIENT_UPLOAD_SESSION || 0);
      else if (sortBy === 'EC_TAG_CLIENT_UPLOAD_TOTAL') result = (a.EC_TAG_CLIENT_UPLOAD_TOTAL || 0) - (b.EC_TAG_CLIENT_UPLOAD_TOTAL || 0);
      else if (sortBy === 'EC_TAG_CLIENT_NAME') result = (a.EC_TAG_CLIENT_NAME || '').localeCompare(b.EC_TAG_CLIENT_NAME || '');
      else if (sortBy === 'EC_TAG_PARTFILE_NAME') result = (a.EC_TAG_PARTFILE_NAME || '').localeCompare(b.EC_TAG_PARTFILE_NAME || '');
      else result = (a.fileName || '').localeCompare(b.fileName || '');

      return sortDirection === 'asc' ? result : -result;
    });
  };

  const getProgressColor = (percent) => {
    if (percent < 25) return 'bg-red-500';
    if (percent < 50) return 'bg-orange-500';
    if (percent < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const NavButton = ({ icon, label, view, active }) => {
    return h('button', {
      onClick: () => {
        setCurrentView(view);
        setPage(0);
        setMobileMenuOpen(false);
      },
      className: `flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all text-xs sm:text-sm ${
        active
          ? 'bg-blue-600 text-white shadow-lg'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`
    },
      h(Icon, { name: icon, size: 16 }),
      h('span', { className: 'font-medium' }, label)
    );
  };

  const renderFooter = () => {
    if (!stats) {
      return h('footer', { className: 'bg-gray-800 text-white py-4 text-center text-sm' },
        'Loading stats...'
      );
    }

    const connState = stats.EC_TAG_CONNSTATE || {};
    const server = connState.EC_TAG_SERVER || {};
    const ed2kConnected = server?.EC_TAG_SERVER_PING > 0;
    const clientId = connState.EC_TAG_CLIENT_ID;
    const isHighId = clientId && clientId > 16777216;
    
    const kadFirewalled = stats.EC_TAG_STATS_KAD_FIREWALLED_UDP === 1;
    const kadStatus = kadFirewalled ? 'Firewalled' : 'OK';
    
    const uploadSpeed = formatSpeed(stats.EC_TAG_STATS_UL_SPEED || 0);
    const downloadSpeed = formatSpeed(stats.EC_TAG_STATS_DL_SPEED || 0);

    return h('footer', { className: 'bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-1.5 px-2 sm:px-3 flex-none md:sticky md:bottom-0 z-40' },
      h('div', { className: 'mx-auto' },
        
        // Mobile view
        h('div', { className: 'md:hidden flex flex-col gap-1.5 text-xs' },

          h('div', { className: 'flex justify-between items-center' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'w-20 flex-shrink-0 font-semibold text-gray-300' }, 'ED2K:'),
              h('span', {
                className: `w-28 text-center px-2 py-0.5 rounded text-xs font-medium ${
                  ed2kConnected
                    ? (isHighId ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200')
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`
              }, ed2kConnected ? (isHighId ? '✓ High ID' : '⚠ Low ID') : '✗ Disconnected')
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'w-20 flex-shrink-0 font-semibold text-gray-300' }, 'Upload ↑'),
              h('span', { className: 'w-24 text-right text-green-400 font-mono' }, uploadSpeed)
            )
          ),
          h('div', { className: 'flex justify-between items-center' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'w-20 flex-shrink-0 font-semibold text-gray-300' }, 'KAD:'),
              h('span', {
                className: `w-28 text-center px-2 py-0.5 rounded text-xs font-medium ${
                  !kadFirewalled
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                }`
              }, kadStatus)
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'w-20 flex-shrink-0 font-semibold text-gray-300' }, 'Download ↓'),
              h('span', { className: 'w-24 text-right text-blue-400 font-mono' }, downloadSpeed)
            )
          )
        ),

        // Desktop view
        h('div', { className: 'hidden md:flex justify-between items-center text-xs' },
          h('div', { className: 'flex items-center gap-3' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'font-semibold text-gray-700 dark:text-gray-300' }, 'ED2K:'),
              h('span', { className: `px-2 py-1 rounded text-xs font-medium ${
                ed2kConnected
                  ? (isHighId ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200')
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`
                },
                ed2kConnected ? (isHighId ? '✓ High ID' : '⚠ Low ID') : '✗ Disconnected'
              ),
              ed2kConnected && server.EC_TAG_SERVER_NAME && h('span', { className: 'text-gray-600 dark:text-gray-400 text-xs' }, `(${server.EC_TAG_SERVER_NAME} - ${server.EC_TAG_SERVER_PING}ms)`)
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'font-semibold text-gray-700 dark:text-gray-300' }, 'KAD:'),
              h('span', { className: `px-2 py-1 rounded text-xs font-medium ${!kadFirewalled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'}` },
                kadStatus
              )
            )
          ),
          h('div', { className: 'flex items-center gap-3' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'font-semibold text-gray-700 dark:text-gray-300' }, 'Upload ↑'),
              h('span', { className: 'text-green-600 dark:text-green-400 font-mono font-semibold' }, uploadSpeed)
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'font-semibold text-gray-700 dark:text-gray-300' }, 'Download ↓'),
              h('span', { className: 'text-blue-600 dark:text-blue-400 font-mono font-semibold' }, downloadSpeed)
            )
          )
        )
      )
    );
  };

  const renderTable = (data, columns, actions) => {
    const sorted = sortFiles(data);
    const pagesCount = Math.ceil(sorted.length / pageSize);
    const start = page * pageSize;
    const paginatedData = sorted.slice(start, start + pageSize);

    return h('div', { className: 'space-y-2' },

      // Mobile sort control
      h('div', { className: 'md:hidden flex flex-wrap items-center justify-between gap-2' },
        h('div', { className: 'flex items-center gap-2 flex-1' },
          h('label', { className: 'text-sm font-medium text-gray-700 dark:text-gray-300' }, 'Sort by:'),
          h('select', {
            value: sortBy,
            onChange: (e) => setSortBy(e.target.value),
            className: 'flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
          },
            columns.filter(c => c.sortable !== false).map(col =>
              h('option', { key: col.key, value: col.key }, col.label)
            )
          )
        ),
        h('button', {
          onClick: () => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'),
          className: 'px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm flex items-center gap-1 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-95 transition-all'
        },
          sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'
        )
      ),

      // Mobile card view
      h('div', { className: 'block md:hidden space-y-2' },
        paginatedData.map((item, idx) =>
          h('div', {
            key: item.fileHash || item.EC_TAG_CLIENT_HASH || idx,
            className: `p-2 sm:p-3 rounded-lg ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800/50'} border border-gray-200 dark:border-gray-700`
          },
            h('div', { className: 'font-medium text-xs sm:text-sm mb-1.5 break-words text-gray-900 dark:text-gray-100' }, item.fileName || item.EC_TAG_PARTFILE_NAME || 'N/A'),
            h('div', { className: 'space-y-1 text-xs' },
              columns.map((col, cidx) => {
                if (col.key === 'fileName' || col.key === 'EC_TAG_PARTFILE_NAME') return null;
                return h('div', {
                  key: cidx,
                  className: 'flex justify-between items-center'
                },
                  h('span', { className: 'text-gray-600 dark:text-gray-400 font-medium' }, col.label + ':'),
                  h('span', { className: 'text-gray-900 dark:text-gray-100' },
                    col.render ? col.render(item) : item[col.key]
                  )
                );
              })
            ),
            actions && h('div', { className: 'flex gap-1.5 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700' },
              actions(item)
            )
          )
        )
      ),

      // Desktop table view
      h('div', { className: 'hidden md:block overflow-x-auto' },
        h('table', { className: 'w-full' },
          h('thead', null,
            h('tr', { className: 'border-b-2 border-gray-300 dark:border-gray-600' },
              columns.map((col, idx) =>
                h('th', {
                  key: idx,
                  className: 'text-left p-2 font-semibold text-xs sm:text-sm text-gray-700 dark:text-gray-300',
                  style: col.width && col.width !== 'auto' ? { width: col.width } : undefined
                },
                  col.sortable ? h('button', {
                    onClick: () => {
                      if (sortBy === col.key) {
                        // Toggle direction
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        // New column – default to descending
                        setSortBy(col.key);
                        setSortDirection('desc');
                      }
                      setPage(0);
                    },
                    className: `hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${sortBy === col.key ? 'text-blue-600 dark:text-blue-400' : ''}`
                  }, col.label +
                      (sortBy === col.key
                        ? sortDirection === 'asc' ? ' ↑' : ' ↓'
                        : '')
                      ) : col.label
                )
              ),
              actions && h('th', { className: 'text-left p-2 font-semibold text-xs sm:text-sm text-gray-700 dark:text-gray-300' }, 'Actions')
            )
          ),
          h('tbody', null,
            paginatedData.map((item, idx) =>
              h('tr', {
                key: item.fileHash || item.EC_TAG_CLIENT_HASH || idx,
                className: `
                  ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}
                  hover:bg-indigo-100 dark:hover:bg-indigo-700 transition-colors duration-200
                `
              },
                columns.map((col, cidx) =>
                  h('td', { 
                    key: cidx, 
                    className: 'p-2 text-xs sm:text-sm text-gray-900 dark:text-gray-100',
                    style: col.width && col.width !== 'auto' ? { width: col.width } : undefined
                  },
                    col.render ? col.render(item) : item[col.key]
                  )
                ),
                actions && h('td', { className: 'p-2' },
                  h('div', { className: 'flex gap-2' }, actions(item))
                )
              )
            )
          )
        )
      ),

      // Pagination
      pagesCount > 1 && h('div', { className: 'flex justify-center items-center gap-1.5 pt-3' },
        h('button', {
          onClick: () => setPage(Math.max(0, page - 1)),
          disabled: page === 0,
          className: 'p-1.5 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300'
        }, h(Icon, { name: 'chevronLeft', size: 16 })),
        h('span', { className: 'px-2 py-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300' },
          `Page ${page + 1} of ${pagesCount}`
        ),
        h('button', {
          onClick: () => setPage(Math.min(pagesCount - 1, page + 1)),
          disabled: page >= pagesCount - 1,
          className: 'p-1.5 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300'
        }, h(Icon, { name: 'chevronRight', size: 16 }))
      )
    );
  };

  const renderHome = () => {
    return h('div', { className: 'text-center py-4 sm:py-8 px-2 sm:px-4' },
      h('img', { 
        src: '/static/logo-brax.png', 
        alt: 'aMule', 
        className: 'w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 object-contain'
      }),
      h('h1', { className: 'text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 sm:mb-3' }, 'Welcome to aMule Controller'),
      h('p', { className: 'text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6' }, 'Select an option from the menu to get started'),
      h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 max-w-4xl mx-auto' },
        h('button', {
          onClick: () => setCurrentView('search'),
          className: 'p-2 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors active:scale-95 border border-blue-200 dark:border-blue-800'
        },
          h(Icon, { name: 'search', size: 20, className: 'mx-auto mb-1 text-blue-600 dark:text-blue-400 sm:w-6 sm:h-6' }),
          h('h3', { className: 'font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200' }, 'Search Files')
        ),
        h('button', {
          onClick: () => setCurrentView('downloads'),
          className: 'p-2 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors active:scale-95 border border-green-200 dark:border-green-800'
        },
          h(Icon, { name: 'download', size: 20, className: 'mx-auto mb-1 text-green-600 dark:text-green-400 sm:w-6 sm:h-6' }),
          h('h3', { className: 'font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200' }, 'Downloads')
        ),
        h('button', {
          onClick: () => setCurrentView('uploads'),
          className: 'p-2 sm:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors active:scale-95 border border-orange-200 dark:border-orange-800'
        },
          h(Icon, { name: 'upload', size: 20, className: 'mx-auto mb-1 text-orange-600 dark:text-orange-400 sm:w-6 sm:h-6' }),
          h('h3', { className: 'font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200' }, 'Uploads')
        ),
        h('button', {
          onClick: () => setCurrentView('shared'),
          className: 'p-2 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors active:scale-95 border border-purple-200 dark:border-purple-800'
        },
          h(Icon, { name: 'share', size: 20, className: 'mx-auto mb-1 text-purple-600 dark:text-purple-400 sm:w-6 sm:h-6' }),
          h('h3', { className: 'font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200' }, 'Shared Files')
        ),
        h('button', {
          onClick: () => setCurrentView('logs'),
          className: 'p-2 sm:p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors active:scale-95 border border-cyan-200 dark:border-cyan-800'
        },
          h(Icon, { name: 'fileText', size: 20, className: 'mx-auto mb-1 text-cyan-600 dark:text-cyan-400 sm:w-6 sm:h-6' }),
          h('h3', { className: 'font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200' }, 'Logs')
        ),
        h('button', {
          onClick: () => setCurrentView('statistics'),
          className: 'p-2 sm:p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors active:scale-95 border border-pink-200 dark:border-pink-800'
        },
          h(Icon, { name: 'chartBar', size: 20, className: 'mx-auto mb-1 text-pink-600 dark:text-pink-400 sm:w-6 sm:h-6' }),
          h('h3', { className: 'font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200' }, 'Statistics')
        )
      )
    );
  };

  const renderSearch = () => {
    const previousResultsColumns = [
      {
        label: 'File Name',
        key: 'fileName',
        sortable: true,
        width: 'auto', // Takes remaining space
        render: (item) =>
          h('div', {
            className: 'font-medium break-words whitespace-normal',
            style: { wordBreak: 'break-word', overflowWrap: 'anywhere' }
          }, item.fileName)
      },
      {
        label: 'Size',
        key: 'fileSize',
        sortable: true,
        width: '100px', // Fixed width for size column
        render: (item) => formatBytes(item.fileSize)
      },
      {
        label: 'Sources',
        key: 'sourceCount',
        sortable: true,
        width: '120px', // Fixed width for sources column
        render: (item) => `${item.sourceCount} sources`
      }
    ];

    return h('div', { className: 'space-y-2 sm:space-y-3' },
      h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, 'Search Files'),
      h('div', { className: 'space-y-2' },
        h('div', { className: 'grid grid-cols-3 gap-1.5' },
          [
            { value: 'global', label: '🌐 Global' },
            { value: 'local', label: '🗄️ Local' },
            { value: 'kad', label: '☁️ Kad' }
          ].map(type =>
            h('button', {
              key: type.value,
              onClick: () => setSearchType(type.value),
              className: `px-2 py-1.5 rounded text-xs sm:text-sm transition-all active:scale-95 ${
                searchType === type.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`
            }, type.label)
          )
        ),
        h('div', { className: 'flex flex-col sm:flex-row gap-2' },
          h('input', {
            type: 'text',
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            onKeyPress: (e) => e.key === 'Enter' && handleSearch(),
            placeholder: 'Enter search query...',
            className: 'flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
          }),
          h('button', {
            onClick: handleSearch,
            disabled: loading || searchLocked,
            className: 'px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 whitespace-nowrap'
          },
            loading ? h('span', { className: 'flex items-center justify-center gap-2' },
              h('div', { className: 'loader' }),
              'Searching...'
            ) : searchLocked ? 'Another search is running' : 'Search'
          )
        ),
        error && h('div', { className: 'p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-200 text-sm' }, error)
      ),
      // Previous Search Results Section
      previousResults.length > 0 && h('div', { className: 'space-y-2' },
        h('div', { className: 'flex items-center gap-3' },
          h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, 'Previous Search Results'),
          h('span', { className: 'text-sm text-gray-500 dark:text-gray-400' }, `(${previousResults.length} cached results)`)
        ),
        renderTable(previousResults, previousResultsColumns, (item) =>
          h('button', {
            onClick: () => handleDownload(item.fileHash),
            className: 'flex-1 px-2 py-1 text-xs sm:text-sm bg-green-600 text-white rounded hover:bg-green-700 text-sm transition-all active:scale-95'
          }, 'Download')
        )
      )
    );
  };

  const renderSearchResults = () => {
    const columns = [
      {
        label: 'File Name',
        key: 'fileName',
        sortable: true,
        width: 'auto',
        render: (item) =>
          h('div', {
            className: 'font-medium break-words whitespace-normal',
            style: { wordBreak: 'break-word', overflowWrap: 'anywhere' }
          }, item.fileName)
      },
      {
        label: 'Size',
        key: 'fileSize',
        sortable: true,
        width: '100px',
        render: (item) => formatBytes(item.fileSize)
      },
      {
        label: 'Sources',
        key: 'sourceCount',
        sortable: true,
        width: '120px',
        render: (item) => `${item.sourceCount} sources`
      }
    ];

    return h('div', { className: 'space-y-2 sm:space-y-3' },
      h('div', { className: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3' },
        h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, `Search Results (${searchResults.length})`),
        h('button', {
          onClick: () => setCurrentView('search'),
          className: 'px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors active:scale-95 text-sm sm:text-base w-full sm:w-auto text-gray-700 dark:text-gray-300'
        }, 'New Search')
      ),
      searchResults.length === 0 ? h('div', { className: 'text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400' }, 'No results found') :
        renderTable(searchResults, columns, (item) =>
          h('button', {
            onClick: () => handleDownload(item.fileHash),
            className: 'flex-1 px-2 py-1 text-xs sm:text-sm bg-green-600 text-white rounded hover:bg-green-700 text-sm transition-all active:scale-95'
          }, 'Download')
        )
    );
  };

  const renderDownloads = () => {
    const columns = [
      {
        label: 'File Name',
        key: 'fileName',
        sortable: true,
        width: 'auto',
        render: (item) =>
          h('div', {
            className: 'font-medium break-words whitespace-normal',
            style: { wordBreak: 'break-word', overflowWrap: 'anywhere' }
          }, item.fileName)
      },
      {
        label: 'Size',
        key: 'fileSize',
        sortable: true,
        width: '100px',
        render: (item) => formatBytes(item.fileSize)
      },
      {
        label: 'Progress',
        key: 'progress',
        sortable: true,
        width: '140px',
        render: (item) => h('div', { className: 'w-full min-w-[120px]' },
          h('div', { className: 'w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden' },
            h('div', {
              className: `h-full rounded-full transition-all duration-300 ${getProgressColor(item.progress)}`,
              style: { width: `${item.progress}%` }
            }),
            h('span', { className: 'absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-gray-100' },
              `${item.progress}%`
            )
          )
        )
      },
      {
        label: 'Sources',
        key: 'sourceCount',
        width: '80px',
        render: (item) => `${item.sourceCount}`
      },
      {
        label: 'Speed',
        key: 'speed',
        width: '100px',
        render: (item) => formatSpeed(item.speed)
      }
    ];

    return h('div', { className: 'space-y-2 sm:space-y-3' },
      h('div', { className: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3' },
        h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, `Current Downloads (${downloads.length})`),
        h('button', {
          onClick: fetchDownloads,
          disabled: loading,
          className: 'px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 text-sm sm:text-base w-full sm:w-auto'
        },
          loading ? h('span', { className: 'flex items-center justify-center gap-2' },
            h('div', { className: 'loader' }),
            'Loading...'
          ) : h('span', null,
            h(Icon, { name: 'refresh', size: 16, className: 'inline mr-1' }),
            'Refresh'
          )
        )
      ),
      downloads.length === 0 ? h('div', { className: 'text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400' },
        loading ? 'Loading downloads...' : 'No active downloads'
      ) : renderTable(downloads, columns, (item) =>
        h('button', {
          onClick: () => handleDelete(item.fileHash, item.fileName),
          className: 'flex-1 px-2 py-1 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700 text-sm transition-all active:scale-95'
        },
          h(Icon, { name: 'trash', size: 14, className: 'inline mr-1' }),
          'Delete'
        )
      )
    );
  };

  const renderShared = () => {
    const columns = [
      {
        label: 'File Name',
        key: 'fileName',
        sortable: true,
        width: 'auto',
        render: (item) =>
          h('div', {
            className: 'font-medium break-words whitespace-normal',
            style: { wordBreak: 'break-word', overflowWrap: 'anywhere' }
          }, item.fileName)
      },
      {
        label: 'Size',
        key: 'fileSize',
        sortable: true,
        width: '100px',
        render: (item) => formatBytes(item.fileSize)
      },
      {
        label: 'Total Upload',
        key: 'transferredTotal',
        sortable: true,
        width: '140px',
        render: (item) => formatBytes(item.transferredTotal)+` (${item.acceptedCountTotal})`
      },
      {
        label: 'Session Upload',
        key: 'transferred',
        sortable: true,
        width: '140px',
        render: (item) => formatBytes(item.transferred)+` (${item.acceptedCount})`
      }
    ];

    return h('div', { className: 'space-y-2 sm:space-y-3' },
      h('div', { className: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3' },
        h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, `Shared Files (${shared.length})`),
        h('button', {
          onClick: fetchShared,
          disabled: loading,
          className: 'px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 text-sm sm:text-base w-full sm:w-auto'
        },
          loading ? h('span', { className: 'flex items-center justify-center gap-2' },
            h('div', { className: 'loader' }),
            'Loading...'
          ) : h('span', null,
            h(Icon, { name: 'refresh', size: 16, className: 'inline mr-1' }),
            'Refresh'
          )
        )
      ),
      shared.length === 0 ? h('div', { className: 'text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400' },
        loading ? 'Loading shared files...' : 'No shared files'
      ) : renderTable(shared, columns, null)
    );
  };

  const renderUploads = () => {
    const ipToString = (ip) => {
      if (!ip) return 'N/A';
      return [
        (ip >>> 24) & 0xFF,
        (ip >>> 16) & 0xFF,
        (ip >>> 8) & 0xFF,
        ip & 0xFF
      ].join('.');
    };

    const getClientSoftware = (software) => {
      const softwareMap = {
        0: 'eMule',
        1: 'aMule',
        2: 'xMule',
        3: 'aMule',
        4: 'MLDonkey',
        5: 'Shareaza'
      };
      return softwareMap[software] || 'Unknown';
    };

    const columns = [
      {
        label: 'Client',
        key: 'EC_TAG_CLIENT_NAME',
        sortable: true,
        width: '140px',
        render: (item) =>
          h('div', { className: 'max-w-xs' },
            h('div', { className: 'font-medium text-sm' }, getClientSoftware(item.EC_TAG_CLIENT_SOFTWARE)),
            h('div', { className: 'text-xs text-gray-500 dark:text-gray-400' }, item.EC_TAG_CLIENT_SOFT_VER_STR || 'N/A')
          )
      },
      {
        label: 'File',
        key: 'EC_TAG_PARTFILE_NAME',
        sortable: true,
        width: 'auto',
        render: (item) =>
          h('div', {
            className: 'font-medium break-words whitespace-normal text-sm',
            style: { wordBreak: 'break-word', overflowWrap: 'anywhere' }
          }, item.EC_TAG_PARTFILE_NAME || 'Unknown')
      },
      {
        label: 'IP Address',
        key: 'EC_TAG_CLIENT_USER_IP',
        width: '130px',
        render: (item) => h('span', { className: 'font-mono text-xs' }, ipToString(item.EC_TAG_CLIENT_USER_IP))
      },
      {
        label: 'Upload Speed',
        key: 'EC_TAG_CLIENT_UP_SPEED',
        sortable: true,
        width: '110px',
        render: (item) => h('span', { className: 'font-mono text-sm text-green-600 dark:text-green-400' }, formatSpeed(item.EC_TAG_CLIENT_UP_SPEED || 0))
      },
      {
        label: 'Session',
        key: 'EC_TAG_CLIENT_UPLOAD_SESSION',
        sortable: true,
        width: '100px',
        render: (item) => formatBytes(item.EC_TAG_CLIENT_UPLOAD_SESSION || 0)
      },
      {
        label: 'Total',
        key: 'EC_TAG_CLIENT_UPLOAD_TOTAL',
        sortable: true,
        width: '100px',
        render: (item) => formatBytes(item.EC_TAG_CLIENT_UPLOAD_TOTAL || 0)
      }
    ];

    return h('div', { className: 'space-y-2 sm:space-y-3' },
      h('div', { className: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3' },
        h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, `Current Uploads (${uploads.length})`),
        h('button', {
          onClick: fetchUploads,
          disabled: loading,
          className: 'px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 text-sm sm:text-base w-full sm:w-auto'
        },
          loading ? h('span', { className: 'flex items-center justify-center gap-2' },
            h('div', { className: 'loader' }),
            'Loading...'
          ) : h('span', null,
            h(Icon, { name: 'refresh', size: 16, className: 'inline mr-1' }),
            'Refresh'
          )
        )
      ),
      uploads.length === 0 ? h('div', { className: 'text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400' },
        loading ? 'Loading uploads...' : 'No active uploads'
      ) : renderTable(uploads, columns, null)
    );
  };

  const renderLogs = () => {
    return h('div', { className: 'space-y-3 sm:space-y-4' },
      h('div', { className: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3' },
        h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, 'Logs & Server Info'),
        h('button', {
          onClick: () => {
            fetchLogs();
            fetchServerInfo();
          },
          disabled: loading,
          className: 'px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 text-sm sm:text-base w-full sm:w-auto'
        },
          loading ? h('span', { className: 'flex items-center justify-center gap-2' },
            h('div', { className: 'loader' }),
            'Loading...'
          ) : h('span', null,
            h(Icon, { name: 'refresh', size: 16, className: 'inline mr-1' }),
            'Refresh'
          )
        )
      ),
      
      // Server Info Section
      h('div', { className: 'bg-gray-50 dark:bg-gray-700 rounded-lg p-3' },
        h('h3', { className: 'text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2' }, 'Server Information'),
        h('div', {
          className: 'bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 p-3 max-h-48 overflow-y-auto',
          style: { fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
        },
          serverInfo || h('span', { className: 'text-gray-400 dark:text-gray-500 italic' }, 'No server info available')
        )
      ),
      
      // Logs Section
      h('div', { className: 'bg-gray-50 dark:bg-gray-700 rounded-lg p-3' },
        h('h3', { className: 'text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2' }, 'Application Logs'),
        h('div', {
          className: 'bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 p-3 max-h-96 overflow-y-auto',
          style: { fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
        },
          logs || h('span', { className: 'text-gray-400 dark:text-gray-500 italic' }, 'No logs available')
        )
      )
    );
  };

  const formatStatsValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object' && value._value !== undefined) {
      return value._value;
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  };

  const toggleNode = (nodeKey) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };

  const renderStatsNode = (node, level = 0, parentKey = '') => {
    if (!node) return null;
    
    const isArray = Array.isArray(node);
    const nodes = isArray ? node : [node];
    
    return nodes.map((item, idx) => {
      if (!item) return null;
      
      const label = item._value || '';
      const value = item.EC_TAG_STAT_NODE_VALUE;
      const children = item.EC_TAG_STATTREE_NODE;
      
      let displayText = label;
      
      // Format the label with the value
      if (value !== undefined && value !== null) {
        const formattedValue = formatStatsValue(value);
        
        // Handle multiple values (session vs total)
        if (typeof value === 'object' && value._value !== undefined && value.EC_TAG_STAT_NODE_VALUE !== undefined) {
          const sessionValue = value._value;
          const totalValue = formatStatsValue(value.EC_TAG_STAT_NODE_VALUE);
          displayText = label.replace(/%s|%i|%llu|%g|%.2f%%/g, () => `${sessionValue} (${totalValue})`);
        } else if (Array.isArray(value)) {
          // Replace format specifiers with array values
          let valueIndex = 0;
          displayText = label.replace(/%s|%i|%llu|%g|%.2f%%/g, () => value[valueIndex++] || '');
        } else {
          displayText = label.replace(/%s|%i|%llu|%g|%.2f%%/g, formattedValue);
        }
      }
      
      const hasChildren = children && (Array.isArray(children) ? children.length > 0 : true);
      const indent = level * 20;
      const nodeKey = `${parentKey}-${level}-${idx}`;
      const isExpanded = expandedNodes[nodeKey] !== false; // Default to expanded
      
      return h('div', { key: nodeKey, className: 'mb-1' },
        h('div', {
          className: `py-1 px-2 rounded text-sm flex items-center gap-2 ${
            hasChildren 
              ? 'font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer' 
              : 'text-gray-600 dark:text-gray-300'
          }`,
          style: { paddingLeft: `${indent + 8}px` },
          onClick: hasChildren ? () => toggleNode(nodeKey) : undefined
        },
          hasChildren && h(Icon, { 
            name: isExpanded ? 'chevronDown' : 'chevronRight', 
            size: 16, 
            className: 'flex-shrink-0' 
          }),
          h('span', { className: 'flex-1' }, displayText)
        ),
        hasChildren && isExpanded && h('div', null,
          renderStatsNode(children, level + 1, nodeKey)
        )
      );
    });
  };

  const renderStatistics = () => {
    const expandAll = () => {
      const allKeys = {};
      const collectKeys = (node, level = 0, parentKey = '') => {
        if (!node) return;
        const isArray = Array.isArray(node);
        const nodes = isArray ? node : [node];
        nodes.forEach((item, idx) => {
          if (!item) return;
          const children = item.EC_TAG_STATTREE_NODE;
          const hasChildren = children && (Array.isArray(children) ? children.length > 0 : true);
          if (hasChildren) {
            const nodeKey = `${parentKey}-${level}-${idx}`;
            allKeys[nodeKey] = true;
            collectKeys(children, level + 1, nodeKey);
          }
        });
      };
      if (statsTree && statsTree.EC_TAG_STATTREE_NODE) {
        collectKeys(statsTree.EC_TAG_STATTREE_NODE);
      }
      setExpandedNodes(allKeys);
    };

    const collapseAll = () => {
      setExpandedNodes({});
    };

    return h('div', { className: 'space-y-3 sm:space-y-4' },
      h('div', { className: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3' },
        h('h2', { className: 'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100' }, 'Statistics Tree'),
        h('div', { className: 'flex gap-2 w-full sm:w-auto' },
          h('button', {
            onClick: expandAll,
            className: 'flex-1 sm:flex-none px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-all active:scale-95 text-sm'
          }, 'Expand All'),
          h('button', {
            onClick: collapseAll,
            className: 'flex-1 sm:flex-none px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-all active:scale-95 text-sm'
          }, 'Collapse All'),
          h('button', {
            onClick: fetchStatsTree,
            disabled: loading,
            className: 'flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 text-sm'
          },
            loading ? h('span', { className: 'flex items-center justify-center gap-2' },
              h('div', { className: 'loader' }),
              'Loading...'
            ) : h('span', null,
              h(Icon, { name: 'refresh', size: 16, className: 'inline mr-1' }),
              'Refresh'
            )
          )
        )
      ),
      
      h('div', { className: 'bg-gray-50 dark:bg-gray-700 rounded-lg p-3 max-h-[calc(100vh-200px)] overflow-y-auto' },
        statsTree && statsTree.EC_TAG_STATTREE_NODE
          ? renderStatsNode(statsTree.EC_TAG_STATTREE_NODE)
          : h('div', { className: 'text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400' },
              loading ? 'Loading statistics...' : 'No statistics available'
            )
      )
    );
  };

  // Render app
  return h('div', { className: 'min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col' },

    // Overlay "Reconnecting"
    !wsConnected
      ? h('div', {
          className: 'absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 pointer-events-auto',
          style: { backdropFilter: 'blur(2px)' }
        },
          h('span', { className: 'text-white text-lg font-semibold' }, 'Reconnecting to server...')
        )
      : null,

    h('div', { className: `flex-1 ${wsConnected ? '' : 'pointer-events-none opacity-50'}` },
      
      // Header
      h('header', { className: 'bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700' },
        h('div', { className: 'mx-auto px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between' },
          h('div', { className: 'flex items-center gap-1.5 sm:gap-2' },
            h('img', { src: '/static/logo-brax.png', alt: 'aMule', className: 'w-6 h-6 sm:w-8 sm:h-8 object-contain' }),
            h('h1', { className: 'text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100' }, 'aMule Controller')
          ),
          h('div', { className: 'flex items-center gap-1' },
            h('button', {
              onClick: toggleTheme,
              className: 'p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors',
              title: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            }, h(Icon, { name: theme === 'dark' ? 'sun' : 'moon', size: 18, className: 'text-gray-600 dark:text-gray-300' })),
            h('button', {
              onClick: () => setMobileMenuOpen(!mobileMenuOpen),
              className: 'md:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
            }, h(Icon, { name: mobileMenuOpen ? 'x' : 'menu', size: 20, className: 'text-gray-600 dark:text-gray-300' }))
          )
        )
      ),

      // Main layout
      h('div', { className: 'mx-auto px-2 sm:px-3 py-2 sm:py-3 flex flex-col md:flex-row gap-2 sm:gap-3' },
        
        // Overlay menu mobile
        mobileMenuOpen && h('div', {
          className: 'fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden',
          onClick: () => setMobileMenuOpen(false)
        }),

        // Sidebar
        h('aside', {
          className: `fixed md:relative inset-y-0 left-0 z-50 md:z-0 w-56 md:w-56 bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg shadow-lg md:shadow transform transition-transform duration-300 ease-in-out border border-gray-200 dark:border-gray-700 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`
        },
          h('div', { className: 'space-y-1' },
            h(NavButton, { icon: 'home', label: 'Home', view: 'home', active: currentView === 'home' }),
            h(NavButton, { icon: 'search', label: 'Search', view: 'search', active: currentView === 'search' || currentView === 'search-results' }),
            h(NavButton, { icon: 'download', label: 'Downloads', view: 'downloads', active: currentView === 'downloads' }),
            h(NavButton, { icon: 'upload', label: 'Uploads', view: 'uploads', active: currentView === 'uploads' }),
            h(NavButton, { icon: 'share', label: 'Shared Files', view: 'shared', active: currentView === 'shared' }),
            h(NavButton, { icon: 'fileText', label: 'Logs', view: 'logs', active: currentView === 'logs' }),
            h(NavButton, { icon: 'chartBar', label: 'Statistics', view: 'statistics', active: currentView === 'statistics' })
          )
        ),

        // Main content
        h('main', { className: 'flex-1 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700' },
          currentView === 'home' && renderHome(),
          currentView === 'search' && renderSearch(),
          currentView === 'search-results' && renderSearchResults(),
          currentView === 'downloads' && renderDownloads(),
          currentView === 'uploads' && renderUploads(),
          currentView === 'shared' && renderShared(),
          currentView === 'logs' && renderLogs(),
          currentView === 'statistics' && renderStatistics()
        )
      )
    ),
    renderFooter()
  );

};

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(h(AmuleWebApp));