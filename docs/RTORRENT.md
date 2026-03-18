# rTorrent Integration

aMuTorrent connects to rTorrent via XML-RPC, supporting three connection modes:

- **HTTP** — via an XML-RPC HTTP proxy (nginx, Apache, or ruTorrent)
- **SCGI (direct TCP)** — connect directly to rTorrent's SCGI port without a proxy
- **SCGI (Unix socket)** — connect directly to rTorrent's SCGI Unix domain socket

> **Alternative:** aMuTorrent also supports [qBittorrent](./QBITTORRENT.md), [Deluge](./DELUGE.md), and [Transmission](./TRANSMISSION.md). You can use multiple BitTorrent clients simultaneously.

## Requirements

- rTorrent with XML-RPC enabled
- For **HTTP mode**: a web server (nginx, lighttpd, or ruTorrent) to proxy SCGI to HTTP
- For **SCGI modes**: direct access to rTorrent's SCGI TCP port or Unix socket (no proxy needed)

## Connection Modes

### HTTP Mode (default)

Connects via an HTTP proxy that translates HTTP requests to rTorrent's SCGI protocol. This is the traditional setup used with ruTorrent or nginx.

### SCGI Mode (direct TCP)

Connects directly to rTorrent's SCGI TCP port, bypassing the need for an HTTP proxy. Requires rTorrent to be configured with `network.scgi.open_port`:

```
# In .rtorrent.rc
network.scgi.open_port = 127.0.0.1:5000
```

### SCGI Socket Mode

Connects directly to rTorrent's SCGI Unix domain socket. Requires rTorrent to be configured with `network.scgi.open_local`:

```
# In .rtorrent.rc
network.scgi.open_local = /path/to/rtorrent.sock
```

## Configuration

### Via Settings UI

1. Go to **Settings** in aMuTorrent
2. Expand the **BitTorrent Integration** section
3. Enable rTorrent integration
4. Select the **Connection Mode**:
   - **HTTP (XML-RPC proxy)**: Host, Port, Path, optional Username/Password, SSL
   - **SCGI (direct TCP)**: Host, Port
   - **SCGI (Unix socket)**: Socket Path

### Via Environment Variables

**HTTP mode (default):**
```bash
RTORRENT_ENABLED=true
RTORRENT_MODE=http
RTORRENT_HOST=localhost
RTORRENT_PORT=8000
RTORRENT_PATH=/RPC2
RTORRENT_USERNAME=user
RTORRENT_PASSWORD=pass
RTORRENT_USE_SSL=false
```

**SCGI direct TCP mode:**
```bash
RTORRENT_ENABLED=true
RTORRENT_MODE=scgi
RTORRENT_HOST=127.0.0.1
RTORRENT_PORT=5000
```

**SCGI Unix socket mode:**
```bash
RTORRENT_ENABLED=true
RTORRENT_MODE=scgi-socket
RTORRENT_SOCKET_PATH=/path/to/rtorrent.sock
```

### Via config.json

**HTTP mode:**
```json
{
  "clients": [{
    "type": "rtorrent",
    "enabled": true,
    "mode": "http",
    "host": "localhost",
    "port": 8000,
    "path": "/RPC2",
    "username": "",
    "password": "",
    "useSsl": false
  }]
}
```

**SCGI direct TCP:**
```json
{
  "clients": [{
    "type": "rtorrent",
    "enabled": true,
    "mode": "scgi",
    "host": "127.0.0.1",
    "port": 5000
  }]
}
```

**SCGI Unix socket:**
```json
{
  "clients": [{
    "type": "rtorrent",
    "enabled": true,
    "mode": "scgi-socket",
    "socketPath": "/path/to/rtorrent.sock"
  }]
}
```

## rTorrent Setup

### Using ruTorrent's XML-RPC (HTTP mode)

If you're running ruTorrent, XML-RPC is already exposed. Use HTTP mode with the same host/port as ruTorrent and path `/RPC2`.

### Direct SCGI Connection (no proxy needed)

Configure rTorrent to open an SCGI port or socket:

```
# TCP SCGI (in .rtorrent.rc)
network.scgi.open_port = 127.0.0.1:5000

# Or Unix socket (in .rtorrent.rc)
network.scgi.open_local = /tmp/rtorrent.sock
```

Then use SCGI or SCGI Socket mode in aMuTorrent — no nginx or web server required.

### Standalone rTorrent with nginx (HTTP mode)

Add to your nginx configuration:

```nginx
location /RPC2 {
    scgi_pass unix:/path/to/rtorrent.sock;
    include scgi_params;
}
```

Or for TCP:

```nginx
location /RPC2 {
    scgi_pass 127.0.0.1:5000;
    include scgi_params;
}
```

### Docker Compose Example

```yaml
services:
  rtorrent:
    image: crazymax/rtorrent-rutorrent:latest
    container_name: rtorrent
    ports:
      - "127.0.0.1:8000:8000"  # XML-RPC (localhost only)
      - "6881:6881"            # BitTorrent
      - "6881:6881/udp"        # BitTorrent DHT
      - "50000:50000"          # Incoming connections
    volumes:
      - ./data/rTorrent/config:/data
      - ./data/rTorrent/downloads:/downloads
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Europe/Rome
    restart: unless-stopped

  amutorrent:
    image: g0t3nks/amutorrent:latest
    environment:
      - RTORRENT_ENABLED=true
      - RTORRENT_HOST=rtorrent
      - RTORRENT_PORT=8000
      - RTORRENT_PATH=/RPC2
    volumes:
      # Download directories (optional): Required for moving/deleting files
      - ./data/rTorrent/downloads:/downloads
    ports:
      - "4000:4000"
    restart: unless-stopped
```

## Categories

Categories created in aMuTorrent map to rTorrent labels. When a category has a configured path:

1. New downloads with that category are saved to the category path
2. Existing downloads (active or completed) can be moved to their category path via the UI

## Using Multiple BitTorrent Clients

You can run multiple BitTorrent clients simultaneously (rTorrent, qBittorrent, Deluge, Transmission), including multiple instances of the same client type. When multiple clients are connected:

- A **client selector** appears when adding downloads, letting you choose the target client
- The **ED2K/BT filter** in the header groups all BitTorrent clients together
- **Statistics** combine speeds and totals from all connected clients
- **Prowlarr** search results can be sent to any connected BitTorrent client
- Additional instances can be added through the **Settings** page

## Troubleshooting

### Connection Failed

- Verify rTorrent is running and XML-RPC is accessible
- Test with curl: `curl http://host:port/RPC2`
- Check firewall rules between containers/hosts
- Verify username/password if authentication is enabled

### Downloads Not Appearing

- Ensure rTorrent integration is enabled in Settings
- Check the aMuTorrent logs for connection errors
- Verify the XML-RPC path is correct (usually `/RPC2`)

### Permission Issues

- Ensure aMuTorrent can write to download directories
- Check that rTorrent and aMuTorrent share the same UID/GID in Docker
