#!/bin/bash

# Deployment script - run this after code changes
# Usage: ./scripts/deploy.sh

set -e

echo "🚀 Deploying Photo Booth Backend..."

# Navigate to project directory
cd "$(dirname "$0")/.."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Restart PM2 processes
echo "🔄 Restarting services..."
pm2 restart photo-booth-api || pm2 start dist/server.js --name photo-booth-api
pm2 restart photo-booth-worker || pm2 start dist/workers/photoProcessing.worker.js --name photo-booth-worker

# Save PM2 configuration
pm2 save

echo "✅ Deployment complete!"
echo ""
echo "Check status: pm2 status"
echo "View logs: pm2 logs"

