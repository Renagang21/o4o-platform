#!/bin/bash
# Quick Start Script for Local Testing
# Simulates production deployment locally

set -e

echo "🚀 O4O Platform Quick Start (Local Testing)"
echo "=========================================="

# Change to project directory
cd /home/sohae21/Coding/o4o-platform

# Create logs directory
mkdir -p logs

# Check if serve is installed
if ! command -v serve &> /dev/null; then
    echo "📦 Installing serve..."
    npm install -g serve
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Build the admin dashboard
echo "🏗️ Building admin dashboard..."
npm run build:admin

# Stop any existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 kill || true

# Start services
echo "🚀 Starting services..."
pm2 start deployment/pm2/ecosystem.config.js

# Show status
echo ""
echo "✅ Services started!"
echo ""
pm2 status
echo ""
echo "📊 View logs with: pm2 logs"
echo "🌐 Admin Dashboard: http://localhost:3001"
echo "🔧 API Server: http://localhost:4000"
echo ""
echo "🛑 To stop: pm2 stop all"
echo "🔄 To restart: pm2 restart all"