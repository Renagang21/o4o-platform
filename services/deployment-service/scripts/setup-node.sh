#!/bin/bash
# Setup Node.js and pnpm on Amazon Linux 2023

set -e

echo "==================================="
echo "Installing Node.js and pnpm"
echo "==================================="

# Update system
echo "[1/5] Updating system packages..."
sudo dnf update -y

# Install Node.js 20.x (LTS)
echo "[2/5] Installing Node.js 20.x..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
echo "Node.js version: $node_version"
echo "npm version: $npm_version"

# Install pnpm globally
echo "[3/5] Installing pnpm..."
sudo npm install -g pnpm

# Verify pnpm installation
pnpm_version=$(pnpm --version)
echo "pnpm version: $pnpm_version"

# Install PM2 globally
echo "[4/5] Installing PM2..."
sudo npm install -g pm2

# Configure PM2 to start on boot
echo "[5/5] Configuring PM2 startup..."
pm2 startup systemd -u $USER --hp /home/$USER
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

echo "==================================="
echo "Node.js setup completed!"
echo "==================================="
