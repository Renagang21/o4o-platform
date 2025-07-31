#!/bin/bash

echo "🔧 Fixing all event handler type mismatches in admin-dashboard..."

# Find all files with the pattern and fix them
find apps/admin-dashboard/src -name "*.tsx" -type f -exec sed -i 's/(e: React\.ChangeEvent<HTMLInputElement>)/(e)/g' {} \;

echo "✅ Fixed all event handler type annotations!"

# Also remove the unused import if needed
echo "🔧 Removing unused AffiliateCommissionType import..."
sed -i '1s/^import.*AffiliateCommissionType.*$//' apps/admin-dashboard/src/pages/affiliate/AffiliateCommission.tsx

# Clean up any empty lines at the start of the file
sed -i '/./,$!d' apps/admin-dashboard/src/pages/affiliate/AffiliateCommission.tsx

echo "✅ All fixes complete!"