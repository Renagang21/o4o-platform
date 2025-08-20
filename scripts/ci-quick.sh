#!/bin/bash
# 빠른 CI 설치 - 최소한의 검증만 수행

echo "🚀 Quick CI installation (skip optional steps)..."

# npm ci with minimal options
npm ci \
  --legacy-peer-deps \
  --no-audit \
  --no-fund \
  --ignore-scripts \
  --loglevel=error \
  --maxsockets=10 \
  2>/dev/null || {
    echo "npm ci failed, trying npm install..."
    npm install \
      --legacy-peer-deps \
      --no-audit \
      --no-fund \
      --ignore-scripts \
      --loglevel=error
}

echo "✅ Quick installation completed!"