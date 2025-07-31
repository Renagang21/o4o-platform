#!/bin/bash

# Update all workflow files to use port 8443

echo "Updating workflow files to use port 8443..."

# Update deploy-main-site.yml
sed -i 's|https://neture.co.kr/|https://neture.co.kr:8443/|g' .github/workflows/deploy-main-site.yml
sed -i 's|https://www.neture.co.kr/|https://www.neture.co.kr:8443/|g' .github/workflows/deploy-main-site.yml

# Update deploy-api-server-v2.yml
sed -i 's|https://api.neture.co.kr/api/|https://api.neture.co.kr:8443/api/|g' .github/workflows/deploy-api-server-v2.yml

# Update health-check.yml
sed -i 's|https://api.neture.co.kr/api/|https://api.neture.co.kr:8443/api/|g' .github/workflows/health-check.yml

# Update other workflow files
sed -i 's|https://api.neture.co.kr/api/|https://api.neture.co.kr:8443/api/|g' .github/workflows/api-server.yml
sed -i 's|https://api.neture.co.kr/api/|https://api.neture.co.kr:8443/api/|g' .github/workflows/main.yml

# Update environment variables in workflows
sed -i 's|VITE_API_BASE_URL=https://api.neture.co.kr/api|VITE_API_BASE_URL=https://api.neture.co.kr:8443/api|g' .github/workflows/deploy-admin-dashboard.yml
sed -i 's|VITE_MAIN_SITE_URL=https://neture.co.kr|VITE_MAIN_SITE_URL=https://neture.co.kr:8443|g' .github/workflows/deploy-admin-dashboard.yml
sed -i 's|VITE_ADMIN_URL=https://admin.neture.co.kr|VITE_ADMIN_URL=https://admin.neture.co.kr:8443|g' .github/workflows/deploy-admin-dashboard.yml

echo "✅ Workflow files updated!"