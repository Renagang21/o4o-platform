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

# Ensure pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📥 Installing pnpm..."
    npm install -g pnpm@latest
fi

# Use pnpm for installation
echo "📦 Using pnpm for installation"

if [ -f "pnpm-lock.yaml" ]; then
    # Install dependencies with frozen lockfile
    pnpm install --frozen-lockfile
else
    echo "⚠️  Warning: pnpm-lock.yaml not found, generating it..."
    pnpm install
fi

echo "✅ Dependencies installed successfully!"

# Display environment info
echo "📊 Environment Info:"
node --version
pnpm --version

exit 0