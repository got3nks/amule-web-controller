# Transmission Integration

aMuTorrent connects to Transmission via its HTTP RPC API, allowing you to manage BitTorrent downloads.

> **Alternative:** aMuTorrent also supports [rTorrent](./RTORRENT.md), [qBittorrent](./QBITTORRENT.md), and [Deluge](./DELUGE.md). You can use multiple BitTorrent clients simultaneously.

## Requirements

- Transmission with RPC enabled (enabled by default in most setups)
- RPC endpoint accessible over HTTP/HTTPS from aMuTorrent

## Configuration

### Via Settings UI

1. Go to **Settings** in aMuTorrent
2. Expand the **BitTorrent Integration** section
3. Add a Transmission instance
4. Configure connection settings:
   - **Host**: Transmission RPC hostname (e.g., `localhost` or `transmission`)
   - **Port**: RPC port (default: `9091`)
   - **Path**: RPC endpoint path (default: `/transmission/rpc`)
   - **Username/Password**: If RPC authentication is enabled
   - **Use SSL**: Enable if RPC uses HTTPS

### Via Environment Variables

```bash
TRANSMISSION_ENABLED=true
TRANSMISSION_HOST=localhost
TRANSMISSION_PORT=9091
TRANSMISSION_PATH=/transmission/rpc
TRANSMISSION_USERNAME=user
TRANSMISSION_PASSWORD=pass
TRANSMISSION_USE_SSL=false
```

### Via config.json

```json
{
  "transmission": {
    "instances": [
      {
        "enabled": true,
        "host": "localhost",
        "port": 9091,
        "path": "/transmission/rpc",
        "username": "",
        "password": "",
        "useSsl": false
      }
    ]
  }
}
```

## Docker Compose Example

```yaml
services:
  transmission:
    image: linuxserver/transmission:latest
    container_name: transmission
    ports:
      - "127.0.0.1:9091:9091"  # RPC/WebUI (localhost only)
      - "51413:51413"           # BitTorrent
      - "51413:51413/udp"       # BitTorrent DHT
    volumes:
      - ./data/Transmission/config:/config
      - ./data/Transmission/downloads:/downloads
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Europe/Rome
      - USER=admin            # optional — RPC username
      - PASS=your_password    # optional — RPC password
    restart: unless-stopped

  amutorrent:
    image: g0t3nks/amutorrent:latest
    environment:
      - TRANSMISSION_ENABLED=true
      - TRANSMISSION_HOST=transmission
      - TRANSMISSION_PORT=9091
      - TRANSMISSION_PATH=/transmission/rpc
      - TRANSMISSION_USERNAME=admin          # must match USER above
      - TRANSMISSION_PASSWORD=your_password  # must match PASS above
    ports:
      - "4000:4000"
    restart: unless-stopped
```

## Features

### Labels (Categories)

Transmission uses labels for category support:

- Categories created in aMuTorrent are applied as Transmission labels
- Existing Transmission labels are imported on first connection
- Label changes are kept in sync

### Native File Operations

Transmission handles file moves and deletions natively via its RPC API:

- **File moves** use Transmission's `torrent-set-location` — no shared volume mount needed for moves
- **File deletion** uses Transmission's `torrent-remove` with `delete-local-data` — no shared volume mount needed for deletes

### Start/Stop

Transmission does not distinguish between "pause" and "stop" — both map to the same stopped state. The UI shows a single start/stop toggle.

## CSRF Protection

Transmission uses CSRF tokens (`X-Transmission-Session-Id` header) to protect its RPC endpoint. aMuTorrent handles this automatically — if a request returns a 409 status, the new session ID is extracted from the response and the request is retried.

If you see CSRF-related errors:
- This is usually transient and resolves on the next request
- Ensure no proxy is stripping the `X-Transmission-Session-Id` header

## Using Multiple BitTorrent Clients

You can run multiple BitTorrent clients simultaneously (rTorrent, qBittorrent, Deluge, Transmission), including multiple instances of the same client type. When multiple clients are connected:

- A **client selector** appears when adding downloads, letting you choose the target client
- The **ED2K/BT filter** in the header groups all BitTorrent clients together
- **Statistics** combine speeds and totals from all connected clients
- **Prowlarr** search results can be sent to any connected BitTorrent client
- Additional instances can be added through the **Settings** page

## Troubleshooting

### Connection Failed

- Verify Transmission is running and RPC is accessible
- Test with curl: `curl http://host:9091/transmission/rpc` (expect a 409 with a session ID header — this means RPC is working)
- Check firewall rules between containers/hosts
- Verify username/password if RPC authentication is enabled

### CSRF Token Errors

- Ensure no reverse proxy is stripping the `X-Transmission-Session-Id` header
- If using nginx, add: `proxy_pass_header X-Transmission-Session-Id;`
- aMuTorrent handles CSRF token refresh automatically

### Downloads Not Appearing

- Ensure Transmission integration is enabled in Settings
- Check aMuTorrent logs for connection errors
- Verify the RPC port (default: `9091`) and path (default: `/transmission/rpc`) are correct

### Permission Issues

- For file moves: Transmission handles moves natively, no extra permissions needed
- For volume mounts: ensure aMuTorrent and Transmission share the same UID/GID in Docker
