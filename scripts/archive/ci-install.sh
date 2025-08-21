#!/bin/bash
# CI/CD 환경을 위한 설치 스크립트

set -e

echo "🚀 Starting CI installation..."

# npm ci를 사용하여 lock 파일 기반으로 정확한 버전 설치
npm ci --legacy-peer-deps --no-audit --no-fund

echo "✅ CI installation completed!"
