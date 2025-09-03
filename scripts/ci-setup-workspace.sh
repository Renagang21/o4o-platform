#!/bin/bash
# Setup pnpm workspace links for CI environment

set -e

echo "🔗 Setting up pnpm workspace links..."

# Ensure pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm@latest
fi

# Install dependencies with workspace linking
echo "📦 Installing dependencies with workspace linking..."
pnpm install --frozen-lockfile --prefer-offline || pnpm install --prefer-offline

# Verify workspace links
echo "🔍 Verifying workspace links..."

# Check if types package is linked
if [ -d "packages/types/node_modules" ]; then
    echo "⚠️ Found node_modules in packages/types, removing..."
    rm -rf packages/types/node_modules
fi

# Check if auth-client package is linked
if [ -d "packages/auth-client/node_modules" ]; then
    echo "⚠️ Found node_modules in packages/auth-client, removing..."
    rm -rf packages/auth-client/node_modules
fi

# Check if auth-context package is linked
if [ -d "packages/auth-context/node_modules" ]; then
    echo "⚠️ Found node_modules in packages/auth-context, removing..."
    rm -rf packages/auth-context/node_modules
fi

# Force rebuild workspace links
echo "🔄 Rebuilding workspace links..."
pnpm install --prefer-frozen-lockfile --prefer-offline || pnpm install --prefer-offline

echo "✅ Workspace links setup completed!"

# List workspace packages
echo "📦 Workspace packages:"
pnpm list --depth=0 --workspace-root