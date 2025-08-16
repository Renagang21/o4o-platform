#!/bin/bash

echo "🔧 Fixing API path issues across all apps..."
echo ""

# Fix admin-dashboard authClient calls with /v1/ prefix
echo "📦 Fixing admin-dashboard..."
# MenuList.tsx
sed -i "s|authClient.api.delete(\`/v1/menus/|authClient.api.delete(\`/menus/|g" apps/admin-dashboard/src/pages/menus/MenuList.tsx
sed -i "s|authClient.api.patch(\`/v1/menus/|authClient.api.patch(\`/menus/|g" apps/admin-dashboard/src/pages/menus/MenuList.tsx

# CrowdfundingProjectDetail.tsx
sed -i "s|authClient.api.get(\`/v1/crowdfunding-simple/|authClient.api.get(\`/crowdfunding-simple/|g" apps/admin-dashboard/src/pages/apps/CrowdfundingProjectDetail.tsx
sed -i "s|authClient.api.post(\`/v1/crowdfunding-simple/|authClient.api.post(\`/crowdfunding-simple/|g" apps/admin-dashboard/src/pages/apps/CrowdfundingProjectDetail.tsx

# Fix monitoring pages with /api/v1/ (these use apiClient, not authClient)
sed -i "s|apiClient.get('/api/v1/monitoring/|apiClient.get('/monitoring/|g" apps/admin-dashboard/src/pages/monitoring/SystemMonitoring.tsx

echo "✅ admin-dashboard fixed"
echo ""

# Summary
echo "📝 Summary of fixes:"
echo "  1. main-site: Removed /v1/ prefixes from authClient calls"
echo "  2. admin-dashboard: Removed /v1/ and /api/v1/ prefixes" 
echo "  3. All authClient calls now use relative paths"
echo ""
echo "⚠️  Note: authClient base URL already includes /api/v1/"
echo "    Package: packages/auth-client/src/client.ts"
echo "    Base URL: https://api.neture.co.kr/api/v1"