#!/bin/bash

# CI/CD Installation Script
# This script handles dependency installation for CI/CD pipeline
# Optimized for GitHub Actions environment

set -e  # Exit on error

echo "========================================="
echo "🚀 CI/CD Installation Script"
echo "========================================="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"
echo ""

# Check if we're in CI environment
if [ "$CI" = "true" ]; then
    echo "✅ Running in CI environment"
else
    echo "⚠️  Warning: Not running in CI environment"
fi

# Clean install with retries for CI stability
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo ""
    echo "📦 Installing dependencies (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
    
    if pnpm install --frozen-lockfile ; then
        echo "✅ Dependencies installed successfully"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "⚠️  Installation failed, retrying in 5 seconds..."
            sleep 5
            # Clear npm cache on retry
            npm cache clean --force 2>/dev/null || true
        else
            echo "❌ Installation failed after $MAX_RETRIES attempts"
            
            # Fallback to pnpm install if ci fails
            echo "🔄 Attempting fallback with pnpm install..."
            if pnpm install ; then
                echo "✅ Dependencies installed with fallback method"
                break
            else
                echo "❌ All installation attempts failed"
                exit 1
            fi
        fi
    fi
done

# Verify installation
echo ""
echo "🔍 Verifying installation..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules directory not found"
    exit 1
fi

# Check key packages
REQUIRED_PACKAGES=(
    "typescript"
    "vite"
    "react"
    "axios"
)

MISSING_PACKAGES=()
for package in "${REQUIRED_PACKAGES[@]}"; do
    if [ ! -d "node_modules/$package" ]; then
        MISSING_PACKAGES+=("$package")
    fi
done

if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    echo "❌ Missing required packages: ${MISSING_PACKAGES[*]}"
    echo "Attempting to install missing packages..."
    pnpm install "${MISSING_PACKAGES[@]}" 
fi

# Build packages if needed (for monorepo)
if [ -f "scripts/dev.sh" ]; then
    echo ""
    echo "🔨 Building packages..."
    bash scripts/dev.sh build:packages || {
        echo "⚠️  Package build failed, but continuing..."
    }
fi

echo ""
echo "========================================="
echo "✅ CI Installation Complete"
echo "========================================="
echo ""

# List workspace info for debugging
echo "📋 Workspace Information:"
npm ls --depth=0 2>/dev/null | head -20 || true

exit 0