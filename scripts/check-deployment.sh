#!/bin/bash

# Deployment Status Checker
# Checks if deployed version matches local build

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "=========================================="
echo "  O4O Platform Deployment Checker"
echo "=========================================="
echo ""

# Check Main Site
echo "🌐 Main Site (neture.co.kr)"
echo "----------------------------"
REMOTE_MAIN=$(curl -s https://neture.co.kr/version.json 2>/dev/null || echo "{}")
LOCAL_MAIN=$(cat apps/main-site/dist/version.json 2>/dev/null || echo "{}")

if [ "$REMOTE_MAIN" == "{}" ]; then
  print_error "Cannot fetch remote version"
else
  REMOTE_VERSION=$(echo "$REMOTE_MAIN" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
  echo "📦 Remote: $REMOTE_VERSION"
fi

if [ "$LOCAL_MAIN" == "{}" ]; then
  print_warning "Local build not found (run: pnpm run build:main-site)"
else
  LOCAL_VERSION=$(echo "$LOCAL_MAIN" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
  echo "💻 Local:  $LOCAL_VERSION"

  if [ "$REMOTE_VERSION" == "$LOCAL_VERSION" ]; then
    print_success "Versions match!"
  else
    print_warning "Versions differ"
  fi
fi

echo ""

# Check Admin Dashboard
echo "🖥️  Admin Dashboard (admin.neture.co.kr)"
echo "----------------------------"
REMOTE_ADMIN=$(curl -s https://admin.neture.co.kr/version.json 2>/dev/null || echo "{}")
LOCAL_ADMIN=$(cat apps/admin-dashboard/dist/version.json 2>/dev/null || echo "{}")

if [ "$REMOTE_ADMIN" == "{}" ]; then
  print_error "Cannot fetch remote version"
else
  REMOTE_VERSION=$(echo "$REMOTE_ADMIN" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
  REMOTE_DATE=$(echo "$REMOTE_ADMIN" | grep -o '"buildDate":"[^"]*"' | cut -d'"' -f4)
  echo "📦 Remote: $REMOTE_VERSION"
  echo "📅 Built:  $REMOTE_DATE"
fi

if [ "$LOCAL_ADMIN" == "{}" ]; then
  print_warning "Local build not found (run: pnpm run build:admin)"
else
  LOCAL_VERSION=$(echo "$LOCAL_ADMIN" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
  LOCAL_DATE=$(echo "$LOCAL_ADMIN" | grep -o '"buildDate":"[^"]*"' | cut -d'"' -f4)
  echo "💻 Local:  $LOCAL_VERSION"
  echo "📅 Built:  $LOCAL_DATE"

  if [ "$REMOTE_VERSION" == "$LOCAL_VERSION" ]; then
    print_success "Versions match!"
  else
    print_warning "Versions differ"
  fi
fi

echo ""

# Check API Server
echo "🔌 API Server (api.neture.co.kr)"
echo "----------------------------"
API_HEALTH=$(curl -s https://api.neture.co.kr/api/health 2>/dev/null || echo "{}")

if [ "$API_HEALTH" == "{}" ]; then
  print_error "Cannot reach API server"
else
  API_STATUS=$(echo "$API_HEALTH" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  if [ "$API_STATUS" == "ok" ]; then
    print_success "API server is healthy"
  else
    print_warning "API server status: $API_STATUS"
  fi
fi

echo ""
echo "=========================================="
echo ""

# Check GitHub Actions status
print_info "To check GitHub Actions:"
echo "  👉 https://github.com/Renagang21/o4o-platform/actions"
echo ""

# Show last commits
print_info "Last 3 commits:"
git log --oneline -3
echo ""
