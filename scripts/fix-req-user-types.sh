#!/bin/bash

# Fix req.user type errors in TypeScript files
echo "🔧 Fixing req.user type errors..."

cd /home/user/o4o-platform/apps/api-server

# Fix controller files
FILES=(
  "src/controllers/CrowdfundingController.ts"
  "src/controllers/operationsController.ts"
  "src/controllers/statusPageController.ts"
  "src/controllers/templatesController.ts"
  "src/controllers/vendor/vendorOrderController.ts"
  "src/controllers/vendor/vendorProductController.ts"
  "src/controllers/vendor/vendorStatsController.ts"
  "src/routes/linked-accounts.ts"
  "src/routes/vendor.ts"
  "src/middleware/authMiddleware.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Processing $file..."
    # Replace req.user?.id with req.user?.id as string
    sed -i 's/req\.user\.id/req.user?.id as string/g' "$file"
    sed -i 's/req\.user!\.id/req.user!.id as string/g' "$file"
    
    # Replace req.user.role with req.user.role as string
    sed -i 's/req\.user\.role/req.user?.role as string/g' "$file"
    sed -i 's/req\.user!\.role/req.user!.role as string/g' "$file"
    
    # Replace req.user.permissions with type assertion
    sed -i 's/req\.user\.permissions/req.user?.permissions as string[]/g' "$file"
    sed -i 's/req\.user!\.permissions/req.user!.permissions as string[]/g' "$file"
    
    # Fix specific patterns
    sed -i 's/req\.user\?\.businessInfo/req.user?.businessInfo/g' "$file"
    sed -i 's/req\.user\?\.name/req.user?.name/g' "$file"
    sed -i 's/req\.user\?\.email/req.user?.email/g' "$file"
    sed -i 's/req\.user\?\.betaUserId/req.user?.betaUserId/g' "$file"
    sed -i 's/req\.user\?\.domain/req.user?.domain/g' "$file"
  fi
done

echo "✅ Type fixes applied!"
echo "🔨 Running build again..."
npm run build