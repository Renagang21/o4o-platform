#!/bin/bash

echo "🔧 Fixing TypeScript errors in admin-dashboard..."

# Fix event handler type mismatches - remove explicit ChangeEvent<HTMLInputElement> typing
echo "📝 Fixing event handler type mismatches..."

# Fix AffiliateCommission.tsx
sed -i 's/(e: React\.ChangeEvent<HTMLInputElement>)/(e)/g' apps/admin-dashboard/src/pages/affiliate/AffiliateCommission.tsx

# Fix ForumPostForm.tsx
sed -i 's/(e: React\.ChangeEvent<HTMLInputElement>)/(e)/g' apps/admin-dashboard/src/pages/apps/forum/ForumPostForm.tsx

# Fix FeeManagement.tsx
sed -i 's/(e: React\.ChangeEvent<HTMLInputElement>)/(e)/g' apps/admin-dashboard/src/pages/ecommerce/FeeManagement.tsx

# Fix InventoryManagement.tsx
sed -i 's/(e: React\.ChangeEvent<HTMLInputElement>)/(e)/g' apps/admin-dashboard/src/pages/ecommerce/InventoryManagement.tsx

# Fix OrderStatusManagement.tsx
sed -i 's/(e: React\.ChangeEvent<HTMLInputElement>)/(e)/g' apps/admin-dashboard/src/pages/ecommerce/OrderStatusManagement.tsx

# Fix reduce function type annotations - remove AffiliateCommissionType
echo "📝 Fixing reduce function type annotations..."
sed -i 's/(sum: number, c: AffiliateCommissionType)/(sum: number, c)/g' apps/admin-dashboard/src/pages/affiliate/AffiliateCommission.tsx

# Fix ActivityFeed comparison error
echo "📝 Fixing ActivityFeed comparison error..."
# This needs a more specific fix - we'll handle it separately

echo "✅ Script execution complete!"