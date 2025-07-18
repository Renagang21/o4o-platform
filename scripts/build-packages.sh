#!/bin/bash
# Script to build packages in the correct order with error handling

set -e

echo "🔨 Building packages in dependency order..."

# Build types first
echo "📦 Building @o4o/types..."
npm run build:types
if [ ! -d "packages/types/dist" ]; then
  echo "❌ Failed to build @o4o/types"
  exit 1
fi

# Build utils (depends on types)
echo "📦 Building @o4o/utils..."
npm run build:utils
if [ ! -d "packages/utils/dist" ]; then
  echo "❌ Failed to build @o4o/utils"
  exit 1
fi

# Build ui (depends on types and utils)
echo "📦 Building @o4o/ui..."
npm run build:ui
if [ ! -d "packages/ui/dist" ]; then
  echo "❌ Failed to build @o4o/ui"
  exit 1
fi

# Build auth-client (depends on types)
echo "📦 Building @o4o/auth-client..."
npm run build:auth-client
if [ ! -d "packages/auth-client/dist" ]; then
  echo "❌ Failed to build @o4o/auth-client"
  exit 1
fi

# Build auth-context (depends on auth-client and types)
echo "📦 Building @o4o/auth-context..."
npm run build:auth-context
if [ ! -d "packages/auth-context/dist" ]; then
  echo "❌ Failed to build @o4o/auth-context"
  exit 1
fi

echo "✅ All packages built successfully!"