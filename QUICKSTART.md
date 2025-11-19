# Quick Start Guide

Get up and running with aMule Web Controller in under 5 minutes!

## 🚀 Fastest Setup (Docker)

### Prerequisites
- Docker and Docker Compose installed
- aMule with EC enabled (or use the included aMule container)

### Steps

1. **Clone and setup**
```bash
git clone https://github.com/got3nks/amule-web-controller.git
cd amule-web-controller
cp .env.example .env
```

2. **Configure (edit .env)**
```bash
# Use 'amule' if using docker-compose.yml with included aMule container
# Use 'host.docker.internal' to connect to aMule on your host machine (standalone mode)
# Use IP address or hostname for remote aMule instances
AMULE_HOST=host.docker.internal
AMULE_PORT=4712
AMULE_PASSWORD=your_password
```

3. **Start**
```bash
# if you have an aMule istance already running on your host
docker-compose -f docker-compose.standalone.yml up -d

# OR, if you want to use the included aMule container
docker-compose up -d
```

4. **Access**
Open http://localhost:4000

Done! 🎉

## 📝 Enable aMule EC

If you're running aMule separately, enable External Connections:

1. Open aMule → Preferences → Remote Controls
2. Check "Accept external connections"
3. Set a password
4. Note the port (default: 4712)

## 🔧 Native Setup (No Docker)

**Prerequisites:** Node.js 18+, npm, git

```bash
git clone https://github.com/got3nks/amule-web-controller.git
cd amule-web-controller

# Install server dependencies (requires git)
cd server && npm install && cd ..

# Build frontend
npm install && npm run build:css

# Set environment
export AMULE_HOST=127.0.0.1
export AMULE_PORT=4712
export AMULE_PASSWORD=your_password

# Start
node server/server.js
```

Access at http://localhost:4000

## ❓ Troubleshooting

**Git not found?**
```bash
# Ubuntu/Debian
sudo apt-get install git

# macOS
brew install git

# Windows: download from git-scm.com
```

**Can't connect to aMule?**
- Verify EC is enabled in aMule
- Check password matches
- Ensure port 4712 is accessible

**Page not loading?**
- Check `npm run build:css` completed
- Verify `static/output.css` exists

**WebSocket errors?**
- Check aMule is running
- Check logs: `docker-compose logs -f` or `tail -f logs/server.log`

## 📚 Next Steps

- Read the full [README.md](README.md)
