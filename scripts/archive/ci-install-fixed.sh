#!/bin/bash
# CI/CD 환경을 위한 설치 스크립트 (개선된 버전)

set -e

echo "🚀 Starting CI installation (fixed version)..."

# 환경 정리
cleanup_environment() {
  echo "🧹 Deep cleaning environment..."
  
  # NPM 캐시 완전 삭제
  npm cache clean --force 2>/dev/null || true
  rm -rf ~/.npm 2>/dev/null || true
  
  # Workspace node_modules 정리
  for dir in apps/* packages/*; do
    if [ -d "$dir/node_modules" ]; then
      echo "  Removing $dir/node_modules"
      rm -rf "$dir/node_modules"
    fi
  done
  
  # 루트 node_modules와 package-lock 삭제
  rm -rf node_modules package-lock.json
}

# NPM 레지스트리 설정
configure_npm() {
  echo "⚙️ Configuring npm..."
  npm config set registry https://registry.npmjs.org/
  npm config set fetch-retry-mintimeout 20000
  npm config set fetch-retry-maxtimeout 120000
  npm config set fetch-retries 5
  npm config set fetch-timeout 300000
  npm config set prefer-offline false
  npm config set audit false
  npm config set fund false
}

# 메인 설치 함수
install_dependencies() {
  local max_attempts=3
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt of $max_attempts..."
    
    # 각 시도마다 환경 정리
    if [ $attempt -gt 1 ]; then
      echo "Cleaning before retry..."
      cleanup_environment
      sleep 5
    fi
    
    # NPM 설정
    configure_npm
    
    # pnpm install 실행 (다양한 옵션 시도)
    if [ $attempt -eq 1 ]; then
      # 첫 번째 시도: 표준 설치
      pnpm install
    elif [ $attempt -eq 2 ]; then
      # 두 번째 시도: prefer-online 사용
      pnpm install --prefer-online
    else
      # 마지막 시도: frozen lockfile 없이
      pnpm install
    fi
    
    if [ $? -eq 0 ]; then
      echo "✅ pnpm install succeeded on attempt $attempt"
      
      # workspace node_modules 재정리 (설치 후)
      echo "🧹 Post-install cleanup of workspace node_modules..."
      for dir in apps/* packages/*; do
        if [ -d "$dir/node_modules" ]; then
          echo "  Removing $dir/node_modules"
          rm -rf "$dir/node_modules"
        fi
      done
      
      return 0
    fi
    
    attempt=$((attempt + 1))
  done
  
  echo "❌ pnpm install failed after $max_attempts attempts"
  return 1
}

# 메인 실행
cleanup_environment
install_dependencies

echo "✅ CI installation completed!"