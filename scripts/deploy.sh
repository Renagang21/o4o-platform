#!/bin/bash
# Quick deployment script for microservices

echo "🚀 Microservices Deployment Script"
echo "=================================="

# Check if running on API server
if [[ $(hostname) == *"api"* ]] || [[ $(hostname) == *"server"* ]]; then
    echo "✅ Running on API server"
    SERVER_TYPE="api"
else
    echo "✅ Running on Web server"  
    SERVER_TYPE="web"
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install Python if not present
if ! command -v python3.11 &> /dev/null; then
    echo "🐍 Installing Python 3.11..."
    sudo apt-get update
    sudo apt-get install -y python3.11 python3.11-pip python3.11-venv
fi

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    echo "⚙️ Installing PM2..."
    sudo npm install -g pm2
fi

echo "✅ Environment setup complete!"

if [[ $SERVER_TYPE == "api" ]]; then
    echo "🏗️ Setting up API services..."
    # API server specific setup will be added here
else
    echo "🌐 Setting up Web server..."
    # Web server specific setup will be added here
fi

echo "🎉 Deployment script ready!"
