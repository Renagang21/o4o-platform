#!/bin/bash

# Force deployment script for admin dashboard
# This ensures the latest build is deployed to production

echo "🚀 Force deploying admin dashboard..."

# 1. Clean old build
echo "1. Cleaning old build files..."
cd apps/admin-dashboard
rm -rf dist

# 2. Build production
echo "2. Building for production..."
npm run build

# 3. Create deployment marker
echo "3. Creating deployment timestamp..."
echo "Deployment: $(date)" > dist/deployment.txt
echo "Commit: $(git rev-parse HEAD)" >> dist/deployment.txt

# 4. Clear CDN cache (if using Cloudflare)
# Uncomment if you have CF_ZONE_ID and CF_API_TOKEN
# curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
#      -H "Authorization: Bearer $CF_API_TOKEN" \
#      -H "Content-Type: application/json" \
#      --data '{"purge_everything":true}'

echo "✅ Build complete. Files ready in dist/ folder"
echo ""
echo "To see changes on admin.neture.co.kr:"
echo "1. Clear browser cache (Ctrl+Shift+R)"
echo "2. Try incognito/private mode"
echo "3. Check Console for errors"
echo ""
echo "Build info:"
ls -lah dist/ | head -10