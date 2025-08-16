#!/bin/bash

# Fix duplicate /v1/ in API paths
# authClient.api already has base URL with /api/v1/, so we need to remove the /v1/ prefix

echo "Fixing duplicate /v1/ in API paths..."

# Find all TypeScript files in admin-dashboard
find apps/admin-dashboard/src -name "*.ts" -o -name "*.tsx" | while read file; do
  # Check if file contains the pattern
  if grep -q "authClient\.api\.\(get\|post\|put\|delete\|patch\)('/v1/" "$file"; then
    echo "Fixing: $file"
    
    # Replace patterns like authClient.api.get('/v1/...' with authClient.api.get('/...'
    sed -i.bak "s/authClient\.api\.get('\/v1\//authClient.api.get('\//g" "$file"
    sed -i.bak "s/authClient\.api\.post('\/v1\//authClient.api.post('\//g" "$file"
    sed -i.bak "s/authClient\.api\.put('\/v1\//authClient.api.put('\//g" "$file"
    sed -i.bak "s/authClient\.api\.delete('\/v1\//authClient.api.delete('\//g" "$file"
    sed -i.bak "s/authClient\.api\.patch('\/v1\//authClient.api.patch('\//g" "$file"
    
    # Also handle template strings (backticks)
    sed -i.bak "s/authClient\.api\.get(\`\/v1\//authClient.api.get(\`\//g" "$file"
    sed -i.bak "s/authClient\.api\.post(\`\/v1\//authClient.api.post(\`\//g" "$file"
    sed -i.bak "s/authClient\.api\.put(\`\/v1\//authClient.api.put(\`\//g" "$file"
    sed -i.bak "s/authClient\.api\.delete(\`\/v1\//authClient.api.delete(\`\//g" "$file"
    sed -i.bak "s/authClient\.api\.patch(\`\/v1\//authClient.api.patch(\`\//g" "$file"
    
    # Remove backup files
    rm -f "${file}.bak"
  fi
done

echo "Fixed all duplicate /v1/ paths in admin-dashboard"