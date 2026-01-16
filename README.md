# aMule Web Controller

A modern, real-time web interface for controlling aMule via the EC (External Connection) protocol. Features Sonarr/Radarr integration (Torznab indexer + qBittorrent-compatible API) and GeoIP peer location display. Built with Node.js, WebSockets, and React.

![aMule Web Controller](./docs/screenshots/home-desktop.png)

## Features

- **Real-time Search** - Search the ED2K/Kad network with live results
- **Download Management** - Monitor and control downloads with pause/resume support
- **Category Management** - Organize downloads into categories with color coding
- **Upload Monitoring** - Track active uploads with GeoIP location display
- **Shared Files** - View and manage shared files
- **Historical Statistics** - Interactive charts for speed and transfer history (24h/7d/30d)
- **Sonarr/Radarr Integration** - Works as Torznab indexer and qBittorrent-compatible download client
- **Dark Mode** - Automatic theme switching based on system preference
- **Responsive Design** - Works on desktop, tablet, and mobile
- **WebSocket Updates** - Real-time updates without polling

---

## Quick Start (Docker)

**Prerequisites:** aMule running with External Connections (EC) enabled.

### 1. Pull the image

Available on [Docker Hub](https://hub.docker.com/r/g0t3nks/amule-web-controller).

```bash
docker pull g0t3nks/amule-web-controller:latest
```

### 2. Create directories

```bash
mkdir -p data logs
sudo chown -R 1000:1000 data logs
```

### 3. Create `docker-compose.yml`

```yaml
services:
  amule-web:
    image: g0t3nks/amule-web-controller:latest
    user: "1000:1000"
    container_name: amule-web-controller
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - ./logs:/usr/src/app/server/logs
      - ./data:/usr/src/app/server/data
    restart: unless-stopped
```

### 4. Start and configure

```bash
docker compose up -d
```

Open `http://localhost:4000` and follow the setup wizard:
- **aMule Host:** `host.docker.internal` (for aMule on host machine)
- **aMule Port:** `4712` (default EC port)
- **aMule Password:** Your EC password

> **All-in-One Setup:** If you need aMule in Docker too, see [docker-compose.all-in-one.yml](docker-compose.all-in-one.yml)

---

## Native Installation

```bash
# Clone repository
git clone https://github.com/got3nks/amule-web-controller.git
cd amule-web-controller

# Install and build
cd server && npm install && cd ..
npm install && npm run build

# Start server
node server/server.js
```

Open `http://localhost:4000` and complete the setup wizard.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Configuration Guide](./docs/CONFIGURATION.md) | Setup wizard, settings, environment variables |
| [GeoIP Setup](./docs/GEOIP.md) | Display peer locations with MaxMind databases |
| [Sonarr/Radarr Integration](./docs/INTEGRATIONS.md) | Complete guide for *arr applications setup |
| [API Reference](./docs/API.md) | REST API and WebSocket protocol |
| [Development Guide](./docs/DEVELOPMENT.md) | Building, project structure, contributing |

---

## Screenshots

<details>
<summary>Desktop Screenshots</summary>

![Home](./docs/screenshots/home-desktop.png)
![Downloads](./docs/screenshots/downloads-desktop.png)
![Search](./docs/screenshots/search-desktop.png)

</details>

<details>
<summary>Mobile Screenshots</summary>

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <img src="./docs/screenshots/home-mobile.jpg" height="400px" />
  <img src="./docs/screenshots/downloads-mobile.jpg" height="400px" />
  <img src="./docs/screenshots/search-mobile.jpg" height="400px" />
</div>

</details>

---

## Troubleshooting

**Can't connect to aMule?**
- Verify EC is enabled in aMule: Preferences → Remote Controls → External Connections
- Check the EC password is correct
- Ensure firewall allows port 4712

**Docker: Can't reach aMule on host?**
- Ensure `extra_hosts` is set in docker-compose.yml
- Use `host.docker.internal` as the aMule host

**Sonarr/Radarr can't find downloaded files?**
- Configure categories with correct download paths
- Set up Remote Path Mappings if using Docker
- See [Integration Guide](./docs/INTEGRATIONS.md) for details

**More help:** Check server logs or open an [issue](https://github.com/got3nks/amule-web-controller/issues).

---

## License

MIT License - see [LICENSE](LICENSE) for details.
