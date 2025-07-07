#!/bin/bash
# Fix remaining TypeScript errors - Final Phase

echo "=== Fixing Remaining TypeScript Errors - Final Phase ==="
echo ""

cd ~/projects/o4o-platform/apps/api-server

# 1. Fix User entity in controllers - Import User entity
echo "1. Adding User import to userController..."
sed -i '1a\import { User } from '"'"'../entities/User'"'"';' src/controllers/userController.ts

# 2. Fix adminController enum usage
echo "2. Fixing adminController enum references..."
# Check if UserStatus is imported in adminController
if ! grep -q "import.*UserStatus" src/controllers/adminController.ts; then
  sed -i '1a\import { UserStatus } from '"'"'../types/auth'"'"';' src/controllers/adminController.ts
fi

# 3. Fix AuthService role type in getDefaultPermissions
echo "3. Fixing getDefaultPermissions parameter type..."
sed -i 's/private getDefaultPermissions(role: UserRole)/private getDefaultPermissions(role: UserRole | string)/g' src/services/AuthService.ts

# 4. Fix permissions object keys
echo "4. Updating permissions object to use enum values..."
# This requires a more complex replacement in AuthService
cat > /tmp/fix_permissions.py << 'EOF'
import re

with open('src/services/AuthService.ts', 'r') as f:
    content = f.read()

# Replace the permissions object
old_permissions = """    const permissions = {
      customer: ['read:products', 'create:orders', 'read:own_orders'],
      seller: ['read:products', 'create:products', 'update:own_products', 'read:own_orders', 'read:analytics'],
      supplier: ['create:products', 'update:own_products', 'read:inventory', 'manage:inventory'],
      manager: ['read:all', 'manage:store', 'read:analytics'],
      admin: ['*'] // 모든 권한
    };"""

new_permissions = """    const permissions: Record<string, string[]> = {
      [UserRole.CUSTOMER]: ['read:products', 'create:orders', 'read:own_orders'],
      [UserRole.SELLER]: ['read:products', 'create:products', 'update:own_products', 'read:own_orders', 'read:analytics'],
      [UserRole.SUPPLIER]: ['create:products', 'update:own_products', 'read:inventory', 'manage:inventory'],
      [UserRole.MANAGER]: ['read:all', 'manage:store', 'read:analytics'],
      [UserRole.ADMIN]: ['*'], // 모든 권한
      // Legacy mappings
      'customer': ['read:products', 'create:orders', 'read:own_orders'],
      'seller': ['read:products', 'create:products', 'update:own_products', 'read:own_orders', 'read:analytics'],
      'supplier': ['create:products', 'update:own_products', 'read:inventory', 'manage:inventory'],
      'manager': ['read:all', 'manage:store', 'read:analytics'],
      'admin': ['*']
    };"""

content = content.replace(old_permissions, new_permissions)

with open('src/services/AuthService.ts', 'w') as f:
    f.write(content)
EOF

python3 /tmp/fix_permissions.py

# 5. Fix betaUserController realtimeFeedbackService
echo "5. Fixing betaUserController import..."
sed -i 's/import { realtimeFeedbackService } from '"'"'..\/main'"'"';/import { realtimeFeedbackService } from '"'"'..\/services\/realtimeFeedbackService'"'"';/g' src/controllers/betaUserController.ts

# 6. Fix PricingResult type
echo "6. Searching for PricingResult interface to add enabled property..."
# Find where PricingResult is defined
find src -name "*.ts" -exec grep -l "interface PricingResult" {} \; | head -1 | xargs -I {} echo "Found PricingResult in: {}"

# 7. Fix test-analytics import
echo "7. Fixing test-analytics import..."
sed -i 's/import { initializeDatabase }/import { AppDataSource }/g' src/test-analytics.ts
sed -i 's/initializeDatabase()/AppDataSource.initialize()/g' src/test-analytics.ts

# 8. Fix SignageService import in GracefulDegradationService
echo "8. Checking SignageService import..."
if grep -q "signageService" src/services/GracefulDegradationService.ts; then
  # Check if it's trying to import instance instead of class
  sed -i 's/import { signageService }/import { SignageService }/g' src/services/GracefulDegradationService.ts
fi

echo ""
echo "=== Final Fixes Applied ==="
echo "Running final type check..."

npm run type-check 2>&1 | tee /tmp/final-errors.log | grep "error TS" | wc -l | xargs echo "Remaining errors:"

# Show first few remaining errors for analysis
echo ""
echo "Sample of remaining errors:"
grep "error TS" /tmp/final-errors.log | head -5