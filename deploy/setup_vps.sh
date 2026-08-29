#!/usr/bin/env bash
# ==============================================================================
# Syncnode Automated VPS Setup & Performance Optimization Script
# Compatible with Ubuntu 22.04 / 24.04 LTS & Debian 12
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 Initializing Syncnode High-Performance VPS Setup"
echo "=========================================================="

# 1. Update OS packages
echo "📦 Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git nginx certbot python3-certbot-nginx build-essential python3-pip python3-venv

# 2. Install Node.js 20 LTS (if not present)
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 3. Setup Python Virtual Environment
echo "🐍 Setting up Python virtual environment..."
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# 4. Build Vite Frontend Bundle
echo "⚡ Building high-speed optimized React client bundle..."
cd apps/web
npm ci
npm run build
cd ../..

# 5. Configure System Limits for High Concurrency WebSockets
echo "🔧 Optimizing kernel limits for WebSocket connections..."
sudo sysctl -w fs.file-max=2097152
sudo sysctl -w net.core.somaxconn=65535

# 6. Setup Systemd Service
echo "⚙️ Installing Syncnode Systemd Service..."
sudo cp deploy/systemd/syncnode.service /etc/systemd/system/syncnode.service
# Update working directory to current path
CURRENT_DIR=$(pwd)
sudo sed -i "s|/opt/syncnode|$CURRENT_DIR|g" /etc/systemd/system/syncnode.service
sudo sed -i "s|User=ubuntu|User=$USER|g" /etc/systemd/system/syncnode.service

sudo systemctl daemon-reload
sudo systemctl enable syncnode
sudo systemctl restart syncnode

# 7. Setup Nginx Reverse Proxy
echo "🌐 Configuring Nginx reverse proxy..."
sudo cp deploy/nginx/syncnode.conf /etc/nginx/sites-available/syncnode.conf
sudo ln -sf /etc/nginx/sites-available/syncnode.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "=========================================================="
echo "✅ Syncnode VPS Setup Completed Successfully!"
echo "Server is running on port 4000 and proxied via Nginx."
echo "Check status with: sudo systemctl status syncnode"
echo "View logs with:   journalctl -u syncnode -f"
echo "=========================================================="
