#!/bin/bash
# CI/CD 환경을 위한 설치 스크립트 (pnpm 버전)

set -e

echo "🚀 Starting CI installation (pnpm)..."

# GitHub Actions에서 pnpm이 이미 설치되어 있는지 확인
if command -v pnpm &> /dev/null; then
    echo "✅ pnpm is already installed: $(pnpm --version)"
else
    echo "📦 Installing pnpm..."
    npm install -g pnpm@latest
    echo "✅ pnpm installed: $(pnpm --version)"
fi

echo "Using pnpm $(pnpm --version)"

# Workspace node_modules 정리
echo "🧹 Cleaning workspace node_modules..."
for dir in apps/* packages/*; do
  if [ -d "$dir/node_modules" ]; then
    echo "  Removing $dir/node_modules"
    rm -rf "$dir/node_modules"
  fi
done

# pnpm 설치 함수
run_pnpm_install() {
  echo "⚡ Running pnpm install..."
  
  # CI 환경에서는 frozen-lockfile 사용
  if [ "$CI" = "true" ] && [ -f "pnpm-lock.yaml" ]; then
    echo "CI mode: using frozen-lockfile"
    pnpm install --frozen-lockfile --prefer-offline 
  else
    echo "⚠️  Running in fallback mode without pnpm-lock.yaml"
    pnpm install --prefer-offline 
  fi
  
  if [ $? -eq 0 ]; then
    echo "✅ pnpm install succeeded"
    
    # workspace node_modules 재정리 (설치 후)
    echo "🧹 Post-install cleanup of workspace node_modules..."
    for dir in apps/* packages/*; do
      if [ -d "$dir/node_modules" ]; then
        echo "  Removing $dir/node_modules"
        rm -rf "$dir/node_modules"
      fi
    done
    
    return 0
  else
    echo "❌ pnpm install failed"
    return 1
  fi
}

# 설치 실행
run_pnpm_install

echo "✅ CI installation completed!"
