#!/bin/bash
set -e

APP_DIR="/opt/apps/vt"
cd "$APP_DIR"

echo "==> Deploying VT..."

echo "[1/4] Pulling latest changes..."
git pull origin main || { echo "ERROR: git pull failed"; exit 1; }

echo "[2/4] Installing dependencies..."
npm install || { echo "ERROR: npm install failed"; exit 1; }

echo "[3/4] Running database migrations..."
npm run migrate || { echo "ERROR: migrations failed"; exit 1; }

mkdir -p "$APP_DIR/logs"

echo "[4/4] Restarting PM2 services..."
pm2 delete vt 2>/dev/null || true
pm2 start "$APP_DIR/ecosystem.config.cjs" || { echo "ERROR: PM2 start failed"; exit 1; }
pm2 save || { echo "ERROR: PM2 save failed"; exit 1; }

echo "==> Deployment complete!"
