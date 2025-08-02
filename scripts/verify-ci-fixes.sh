#!/bin/bash
# Comprehensive verification of CI/CD fixes

echo "🔍 CI/CD Fix Verification"
echo "========================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Track issues
ISSUES=0

# 1. Check package-lock.json
echo "1. Checking package-lock.json..."
if [ -f "package-lock.json" ]; then
  echo -e "${GREEN}✅ package-lock.json exists${NC}"
  LOCK_SIZE=$(stat -f%z "package-lock.json" 2>/dev/null || stat -c%s "package-lock.json" 2>/dev/null || echo "0")
  echo "   Size: $LOCK_SIZE bytes"
else
  echo -e "${RED}❌ package-lock.json missing${NC}"
  ISSUES=$((ISSUES + 1))
fi

# 2. Check for dist package.json files
echo ""
echo "2. Checking for problematic dist/package.json files..."
DIST_PKG_FILES=$(find . -path "*/dist/package.json" -type f 2>/dev/null)
if [ -z "$DIST_PKG_FILES" ]; then
  echo -e "${GREEN}✅ No dist/package.json files found${NC}"
else
  echo -e "${YELLOW}⚠️  Found dist/package.json files:${NC}"
  echo "$DIST_PKG_FILES"
  ISSUES=$((ISSUES + 1))
fi

# 3. Check TypeScript compilation
echo ""
echo "3. Checking TypeScript compilation..."
if npx tsc --version > /dev/null 2>&1; then
  echo -e "${GREEN}✅ TypeScript available${NC}"
  # Quick type check on wordpress.d.ts
  if npx tsc --noEmit apps/admin-dashboard/src/types/wordpress.d.ts 2>/dev/null; then
    echo -e "${GREEN}✅ wordpress.d.ts types valid${NC}"
  else
    echo -e "${YELLOW}⚠️  wordpress.d.ts has type issues${NC}"
    ISSUES=$((ISSUES + 1))
  fi
else
  echo -e "${RED}❌ TypeScript not available${NC}"
  ISSUES=$((ISSUES + 1))
fi

# 4. Check workflow files
echo ""
echo "4. Checking GitHub Actions workflows..."
WORKFLOWS_WITH_CACHE=$(grep -l "cache-dependency-path:" .github/workflows/*.yml 2>/dev/null | wc -l)
echo "   Workflows with cache-dependency-path: $WORKFLOWS_WITH_CACHE"
if [ "$WORKFLOWS_WITH_CACHE" -gt 10 ]; then
  echo -e "${GREEN}✅ Most workflows updated${NC}"
else
  echo -e "${YELLOW}⚠️  Some workflows may need updates${NC}"
fi

# 5. Check for npm install errors
echo ""
echo "5. Testing npm install..."
if npm install --dry-run --no-audit > /dev/null 2>&1; then
  echo -e "${GREEN}✅ npm install dry-run successful${NC}"
else
  echo -e "${RED}❌ npm install has issues${NC}"
  ISSUES=$((ISSUES + 1))
fi

# 6. Security check
echo ""
echo "6. Security status..."
if [ -f "package-lock.json" ]; then
  VULNS=$(npm audit --audit-level=moderate --json 2>/dev/null | jq '.metadata.vulnerabilities.moderate + .metadata.vulnerabilities.high + .metadata.vulnerabilities.critical' 2>/dev/null || echo "unknown")
  if [ "$VULNS" = "0" ]; then
    echo -e "${GREEN}✅ No moderate+ vulnerabilities${NC}"
  else
    echo -e "${YELLOW}⚠️  $VULNS moderate+ vulnerabilities${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Cannot run audit without package-lock.json${NC}"
fi

# Summary
echo ""
echo "======================================="
if [ "$ISSUES" -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
else
  echo -e "${RED}❌ Found $ISSUES issues that need attention${NC}"
fi

# Recommendations
if [ "$ISSUES" -gt 0 ]; then
  echo ""
  echo "Recommendations:"
  if [ ! -f "package-lock.json" ]; then
    echo "1. Generate package-lock.json using GitHub Actions"
  fi
  if [ -n "$DIST_PKG_FILES" ]; then
    echo "2. Remove dist/package.json files"
  fi
  echo "3. Run full CI/CD pipeline after fixes"
fi