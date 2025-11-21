# aMule Web Controller

A modern, real-time web interface for controlling aMule via the EC (External Connection) protocol. Built with Node.js, WebSockets, and React.

![aMule Web Controller](./docs/home-desktop.png)

## Features

- 🔍 **Real-time Search** - Search the ED2K/Kad network with live results
- 📥 **Download Management** - Monitor and control active downloads
- 📤 **Upload Monitoring** - Track active uploads and queue
- 📁 **Shared Files** - View and manage shared files
- 📊 **Statistics** - Detailed statistics with collapsible tree view
- 📋 **Logs** - Server info and application logs viewer
- 🌓 **Dark Mode** - Automatic theme switching
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- ⚡ **WebSocket Updates** - Real-time updates without polling

---

## 📋 Prerequisites

### For Docker Installation (Recommended):
- **Docker** 20.10 or higher
- **Docker Compose** 1.29 or higher (v2 recommended)
- **aMule daemon** (amuled) running with EC protocol enabled

### For Native Installation:
- **Node.js** 18 or higher
- **npm** 8 or higher (comes with Node.js)
- **git** (required for dependency installation)
- **aMule daemon** (amuled) running with EC protocol enabled

## 🚀 Installation

### 🐳 Docker Quick Start (Recommended)

#### Option 1: Pre-built Image from Docker Hub

1. **Pull the image**
```bash
docker pull g0t3nks/amule-web-controller:latest
```

2. **Create a `docker-compose.yml` file**
```yaml
version: '3.8'

services:
  amule-web:
    image: g0t3nks/amule-web-controller:latest
    container_name: amule-web-controller
    ports:
      - "${PORT:-4000}:${PORT:-4000}"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-4000}
      - AMULE_HOST=${AMULE_HOST:-host.docker.internal}
      - AMULE_PORT=${AMULE_PORT:-4712}
      - AMULE_PASSWORD=${AMULE_PASSWORD:-admin}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - ./logs:/usr/src/app/server/logs
    restart: unless-stopped
```

3. **Create a `.env` file** (optional, for easier configuration)
```env
PORT=4000
AMULE_HOST=host.docker.internal  # Use this for aMule running on host
AMULE_PORT=4712
AMULE_PASSWORD=your_ec_password
NODE_ENV=production
```

4. **Start the container**
```bash
docker-compose up -d
```

5. **Access the web interface**
Open your browser and navigate to `http://localhost:4000`

#### Option 2: Build from Source

1. **Clone the repository**
```bash
git clone https://github.com/got3nks/amule-web-controller.git
cd amule-web-controller
```

2. **Create environment file**
```bash
cp .env.example .env
```

Edit `.env` and configure your aMule connection:
```env
NODE_ENV=production
PORT=4000
AMULE_PORT=4712
AMULE_PASSWORD=your_ec_password
```

**Note:** You don't need to set `AMULE_HOST` as it's configured in docker-compose configuration files.

3. **Choose your deployment scenario**

**Scenario A:** aMule already running on your host machine
```bash
docker-compose -f docker-compose.standalone.yml up -d
```

**Scenario B:** Use the included aMule container (all-in-one setup)
```bash
docker-compose up -d
```

4. **Access the web interface**
Open your browser and navigate to `http://localhost:4000`

---

### 📦 Native Installation

1. **Clone the repository**
```bash
git clone https://github.com/got3nks/amule-web-controller.git
cd amule-web-controller
```

2. **Install server dependencies**
```bash
cd server
npm install
```

This automatically installs the [amule-ec-node](https://github.com/got3nks/amule-ec-node) library from GitHub.

3. **Build frontend assets**
```bash
cd ..
npm install
npm run build:css
```

4. **Configure environment variables**

```bash
export AMULE_HOST=127.0.0.1
export AMULE_PORT=4712
export AMULE_PASSWORD=your_ec_password
export PORT=4000
export NODE_ENV=production
```

5. **Start the server**
```bash
node server/server.js
```

6. **Access the web interface**
Open your browser and navigate to `http://localhost:4000`

---

## ⚙️ Configuration

### aMule EC Setup

Before using this web controller, you must enable External Connections in aMule:

1. **Open aMule** (or amuled configuration)
2. **Navigate to Preferences** → **Remote Controls** → **External Connections**
3. **Enable "Accept external connections"**
4. **Set an EC password** (remember this for the web controller configuration)
5. **Note the EC port** (default: 4712)
6. **Optional:** Configure allowed IP addresses for security

### Environment Variables Reference

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `PORT` | `4000` | Web server listening port | No |
| `AMULE_HOST` | `127.0.0.1` | aMule daemon hostname or IP address | Yes |
| `AMULE_PORT` | `4712` | aMule EC protocol port | Yes |
| `AMULE_PASSWORD` | `admin` | aMule EC connection password | Yes |
| `NODE_ENV` | `development` | Node environment (`development` or `production`) | No |

### Docker Network Configuration

**Connecting to aMule on Host Machine:**
- Use `AMULE_HOST=host.docker.internal`
- Ensure the `extra_hosts` section is in your docker-compose.yml

**Connecting to aMule in Another Container:**
- Use the service name as hostname (e.g., `AMULE_HOST=amule`)
- Ensure both containers are on the same Docker network

---

## Development

### Frontend Development
```bash
# Watch and rebuild CSS on changes
npm run watch:css
```

### Server Development
```bash
cd server
npm run dev  # Uses nodemon for auto-restart
```

### Project Structure
```
.
├── server/
│   ├── server.js          # WebSocket server & Express app
│   └── package.json       # Server dependencies
├── static/
│   ├── app.js            # React frontend
│   ├── index.html        # HTML entry point
│   └── output.css        # Built Tailwind CSS
├── src/
│   └── input.css         # Tailwind source
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Docker Compose configuration
└── package.json          # Frontend build dependencies
```

## Dependencies

### Backend
- **[express](https://expressjs.com/)** - Web framework
- **[ws](https://github.com/websockets/ws)** - WebSocket server
- **[amule-ec-node](https://github.com/got3nks/amule-ec-node)** - aMule EC protocol implementation

### Frontend
- **React 18** - UI framework (loaded via CDN)
- **Tailwind CSS** - Utility-first CSS framework

## API / WebSocket Protocol

The server exposes a WebSocket endpoint for real-time communication:

### Client → Server Actions
```javascript
// Search
{ action: 'search', query: 'file name', type: 'global' }

// Get downloads
{ action: 'getDownloads' }

// Get uploads
{ action: 'getUploadingQueue' }

// Get shared files
{ action: 'getShared' }

// Get statistics
{ action: 'getStats' }
{ action: 'getStatsTree' }

// Get logs
{ action: 'getLog' }
{ action: 'getServerInfo' }

// Download file
{ action: 'download', fileHash: '...' }

// Delete file
{ action: 'delete', fileHash: '...' }
```

### Server → Client Messages
```javascript
// Search results
{ type: 'search-results', data: [...] }

// Downloads update
{ type: 'downloads-update', data: [...] }

// Stats update
{ type: 'stats-update', data: {...} }

// And more...
```

---

## Screenshots

![Home](./docs/home-desktop.png)
![Search](./docs/search-desktop.png)
![Downloads](./docs/downloads-desktop.png)
![Uploads](./docs/uploads-desktop.png)
![Shared-Files](./docs/shared-desktop.png)
![Servers](./docs/servers-desktop.png)
![Logs](./docs/logs-desktop.png)
![Statistics](./docs/statistics-desktop.png)

## Screenshots (Mobile)

<div style="display: flex; gap: 10px;">
  <img src="./docs/home-mobile.jpg" height="550px" />
  <img src="./docs/search-mobile.jpg" height="550px" />
  <img src="./docs/downloads-mobile.jpg" height="550px" />
  <img src="./docs/uploads-mobile.jpg" height="550px" />
  <img src="./docs/shared-mobile.jpg" height="550px" />
  <img src="./docs/servers-mobile.jpg" height="550px" />
  <img src="./docs/logs-mobile.jpg" height="550px" />
  <img src="./docs/statistics-mobile.jpg" height="550px" />
</div>

---

## Troubleshooting

### Git not found during npm install
If you see `npm error syscall spawn git` or `ENOENT git`, you need to install git:

**Ubuntu/Debian:**
```bash
sudo apt-get install git
```

**macOS:**
```bash
brew install git
```

**Windows:**
Download from https://git-scm.com/download/win

Then retry: `npm install`

### Can't connect to aMule
- Verify aMule EC is enabled and running
- Check the EC password is correct
- Ensure firewall allows connection to EC port
- Check aMule logs for connection attempts

### WebSocket disconnects frequently
- Check network stability
- Verify aMule daemon is running
- Check server logs in `logs/server.log`

### Frontend not loading
- Ensure CSS was built: `npm run build:css`
- Check browser console for errors
- Verify static files are served correctly

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
