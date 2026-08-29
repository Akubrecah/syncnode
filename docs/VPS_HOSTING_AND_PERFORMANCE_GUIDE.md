# Syncnode VPS Hosting & High-Performance Optimization Guide

This guide provides instructions for deploying Syncnode to any VPS (DigitalOcean, Hetzner, AWS EC2, Linode, Vultr, Contabo) with maximum speed, low resource footprint, real-time WebSocket capabilities, and Google OAuth support.

---

## 🏗️ Architecture Overview

Syncnode uses an asynchronous, lightweight architecture:
- **Core Backend**: FastAPI running on Python 3.12 with `uvloop` and `httptools` for microsecond latency.
- **Ledger & Memory**: Ultra-fast in-memory ledger with MongoDB persistence.
- **Real-Time Streaming**: High-concurrency WebSocket event broadcaster (`/ws`) for instant balance mutations, orderbook depth, and trade execution updates.
- **Frontend SPA**: React 18 with Vite, pre-compiled into compressed static chunks (`dist/`) served with aggressive caching headers and gzip compression.

---

## 🚀 Option 1: 1-Click Automated Setup (Ubuntu/Debian)

Run the included automated setup script directly on your VPS:

```bash
# Clone repository
git clone https://github.com/your-repo/syncnode.git /opt/syncnode
cd /opt/syncnode

# Run 1-click deployment script
chmod +x deploy/setup_vps.sh
./deploy/setup_vps.sh
```

The script automatically:
1. Installs Node 20 LTS, Python 3.12 venv, and build dependencies.
2. Compiles and optimizes the React Vite frontend bundle.
3. Configures system kernel limits for high-concurrency WebSockets.
4. Registers and starts the `syncnode` systemd service.
5. Configures Nginx with gzip compression, WebSocket `/ws` reverse proxy, and static file caching.

---

## 🐳 Option 2: Docker / Docker Compose Deployment

If you prefer containerized deployment:

```bash
# Start with Docker Compose
docker compose up -d --build

# View real-time logs
docker compose logs -f
```

---

## 🔐 Google OAuth Configuration

To enable **Sign in with Google** across the client terminal and signup page:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add your VPS domain / IP to **Authorized JavaScript origins**:
   - `https://yourdomain.com`
   - `http://localhost:3000` (for local development)
4. Add your Client ID to your environment or `apps/web/.env`:
   ```bash
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```
5. Rebuild the frontend:
   ```bash
   cd apps/web && npm run build
   ```

Syncnode automatically handles the ID token verification, creates the user account, initializes the double-entry ledger wallets, and returns JWT session tokens.

---

## ⚡ Performance Tuning & Speed Optimizations

### 1. Nginx Microsecond Caching & Gzip
The configuration at `deploy/nginx/syncnode.conf` includes:
- **Gzip Level 6 Compression**: Shrinks JS bundles down to ~80kB.
- **Immutable Static Asset Headers**: `Cache-Control: public, max-age=31536000, immutable` for all versioned chunks in `/assets/`.
- **WebSocket Keepalive**: `proxy_read_timeout 86400s` prevents connection drops.

### 2. SSL / HTTPS Setup with Certbot
Secure your domain with free Let's Encrypt certificates:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. Server Management Commands
- **Check Status**: `sudo systemctl status syncnode`
- **Restart Backend**: `sudo systemctl restart syncnode`
- **View Live Logs**: `journalctl -u syncnode -f`
- **Reload Nginx**: `sudo systemctl reload nginx`
