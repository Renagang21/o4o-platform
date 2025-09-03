#!/bin/bash

# CI Install Script - Fixed Version
# Handles dependency installation for CI/CD pipeline

set -e  # Exit on error

echo "🚀 Starting CI dependency installation..."

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    exit 1
fi

# Detect package manager
if [ -f "pnpm-lock.yaml" ]; then
    echo "📦 Using pnpm for installation"
    
    # Install pnpm if not available
    if ! command -v pnpm &> /dev/null; then
        echo "📥 Installing pnpm..."
        npm install -g pnpm
    fi
    
    # Install dependencies with frozen lockfile
    pnpm install --frozen-lockfile
    
elif [ -f "package-lock.json" ]; then
    echo "📦 Using npm ci for installation"
    npm ci
    
elif [ -f "yarn.lock" ]; then
    echo "📦 Using yarn for installation"
    
    # Install yarn if not available
    if ! command -v yarn &> /dev/null; then
        echo "📥 Installing yarn..."
        npm install -g yarn
    fi
    
    yarn install --frozen-lockfile
    
else
    echo "📦 Using npm install (no lock file found)"
    npm install
fi

echo "✅ Dependencies installed successfully!"

# Display Node and npm versions
echo "📊 Environment Info:"
node --version
npm --version

exit 0