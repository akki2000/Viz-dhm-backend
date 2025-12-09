#!/bin/bash

# GCP VM Setup Script for Photo Booth Backend
# Run this script on your GCP VM instance after connecting via SSH

set -e

echo "🚀 Starting GCP VM setup for Photo Booth Backend..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
echo "✅ Node.js installed: $NODE_VERSION"

# Install Redis
echo "📦 Installing Redis..."
sudo apt-get install -y redis-server

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is running"
else
    echo "❌ Redis failed to start"
    exit 1
fi

# Install Git
echo "📦 Installing Git..."
sudo apt-get install -y git

# Install PM2
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create application directory structure
echo "📁 Creating directories..."
mkdir -p ~/Viz-dhm-backend/assets/backgrounds/stadium
mkdir -p ~/Viz-dhm-backend/assets/backgrounds/captains
mkdir -p ~/Viz-dhm-backend/uploads/raw
mkdir -p ~/Viz-dhm-backend/uploads/foregrounds
mkdir -p ~/Viz-dhm-backend/uploads/outputs

echo ""
echo "✅ Basic setup complete!"
echo ""
echo "Next steps:"
echo "1. Clone your repository: git clone <your-repo-url> ~/Viz-dhm-backend"
echo "2. Or upload your code to ~/Viz-dhm-backend"
echo "3. Create .env file with your configuration"
echo "4. Run: npm install && npm run build"
echo "5. Start with PM2: pm2 start dist/server.js --name photo-booth-api"
echo "6. Start worker: pm2 start dist/workers/photoProcessing.worker.js --name photo-booth-worker"
echo "7. Save PM2: pm2 save && pm2 startup"
echo ""

