#!/bin/bash
# CI/CD 환경을 위한 설치 스크립트

set -e

echo "🚀 Starting CI installation..."

# 재시도 함수
retry_npm_install() {
  local max_attempts=3
  local attempt=1
  local wait_time=5
  
  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt of $max_attempts..."
    
    # npm 설정 (타임아웃 증가, 재시도 설정)
    npm config set fetch-retry-mintimeout 20000
    npm config set fetch-retry-maxtimeout 120000
    npm config set fetch-retries 3
    npm config set registry https://registry.npmjs.org/
    
    # npm ci 실행
    if npm ci --legacy-peer-deps --no-audit --no-fund --prefer-offline --fetch-timeout=60000; then
      echo "✅ npm install succeeded on attempt $attempt"
      return 0
    fi
    
    # 실패 시 대기 후 재시도
    if [ $attempt -lt $max_attempts ]; then
      echo "⚠️ npm install failed on attempt $attempt. Retrying in $wait_time seconds..."
      sleep $wait_time
      wait_time=$((wait_time * 2))  # 지수 백오프
      
      # 캐시 정리 (마지막 시도 전)
      if [ $attempt -eq $((max_attempts - 1)) ]; then
        echo "Clearing npm cache before final attempt..."
        npm cache clean --force || true
      fi
    fi
    
    attempt=$((attempt + 1))
  done
  
  echo "❌ npm install failed after $max_attempts attempts"
  return 1
}

# 설치 실행
retry_npm_install

echo "✅ CI installation completed!"
