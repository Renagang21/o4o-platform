#!/bin/bash
# Script to build packages in the correct order with error handling

set -e

echo "🔨 Building packages in dependency order..."

# Build types first
echo "📦 Building @o4o/types..."
cd packages/types
npm run build
cd ../..
if [ ! -d "packages/types/dist" ]; then
  echo "❌ Failed to build @o4o/types"
  exit 1
fi

# Build utils (depends on types)
echo "📦 Building @o4o/utils..."
cd packages/utils
npm run build
cd ../..
if [ ! -d "packages/utils/dist" ]; then
  echo "❌ Failed to build @o4o/utils"
  exit 1
fi

# Build ui (depends on types and utils)
echo "📦 Building @o4o/ui..."
cd packages/ui
npm run build
cd ../..
if [ ! -d "packages/ui/dist" ]; then
  echo "❌ Failed to build @o4o/ui"
  exit 1
fi

# Build auth-client (depends on types)
echo "📦 Building @o4o/auth-client..."
cd packages/auth-client
npm run build
cd ../..
if [ ! -d "packages/auth-client/dist" ]; then
  echo "❌ Failed to build @o4o/auth-client"
  exit 1
fi

# Ensure auth-client is properly available before building auth-context
echo "🔗 Verifying auth-client availability..."
ls -la packages/auth-client/dist/

# Build auth-context (depends on auth-client and types)
echo "📦 Building @o4o/auth-context..."
cd packages/auth-context
# Ensure node_modules is properly linked
if [ ! -d "node_modules/@o4o/auth-client" ]; then
  echo "⚠️  auth-client not linked, installing dependencies..."
  npm install
fi
npm run build
cd ../..
if [ ! -d "packages/auth-context/dist" ]; then
  echo "❌ Failed to build @o4o/auth-context"
  exit 1
fi

echo "✅ All packages built successfully!"