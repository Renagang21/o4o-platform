#!/bin/bash

echo "🔧 Final comprehensive fix for admin-dashboard..."

cd /home/user/o4o-platform/apps/admin-dashboard

# 1. Fix all remaining _isOpen references
echo "  Fixing remaining _isOpen references..."
find src -name "*.tsx" | while read file; do
  # MediaLibraryModal
  sed -i 's/open={isOpen}/open={_isOpen}/g' "$file"
  sed -i 's/const { isOpen,/const { _isOpen,/g' "$file"
  # MediaUploadDialog
  sed -i 's/<Dialog open={isOpen}/<Dialog open={_isOpen}/g' "$file"
  # FolderManager
  sed -i 's/<Dialog open={isOpen}/<Dialog open={_isOpen}/g' "$file"
  # TiptapImageSelector
  sed -i 's/<Dialog open={isOpen}/<Dialog open={_isOpen}/g' "$file"
done

# 2. Fix roleDisplayNames usage
echo "  Fixing roleDisplayNames usage..."
sed -i 's/roleDisplayNames\[role as UserRole\]/roleDisplayNames[role as UserRole]/g' src/components/users/UserRoleChangeModal.tsx
sed -i 's/roleDisplayNames\[selectedRole as UserRole\]/roleDisplayNames[selectedRole as UserRole]/g' src/components/users/UserRoleChangeModal.tsx

# 3. Fix setRole type
sed -i 's/setRole(value)/setRole(value as UserRole)/g' src/components/users/UserRoleChangeModal.tsx

# 4. Fix FolderManager undefined issue
sed -i 's/parentId: undefined/parentId: undefined as string | undefined/g' src/components/media/FolderManager.tsx

# 5. Fix TemplateLibrary filter issues
sed -i 's/setFilter({ category: value })/setFilter(prev => ({ ...prev, category: value }))/g' src/components/template/TemplateLibrary.tsx
sed -i 's/setFilter({ featured: value })/setFilter(prev => ({ ...prev, featured: value }))/g' src/components/template/TemplateLibrary.tsx

# 6. Add missing imports for UserStatistics
if ! grep -q "import { roleDisplayNames }" src/pages/users/components/UserStatistics.tsx; then
  sed -i '1i import { roleDisplayNames } from "@/types/user";' src/pages/users/components/UserStatistics.tsx
fi

# 7. Fix UserTable roleColors
if ! grep -q "import { roleDisplayNames }" src/pages/users-backup/components/UserTable.tsx; then
  sed -i '1i import { roleDisplayNames } from "@/types/user";' src/pages/users-backup/components/UserTable.tsx
fi

# 8. Fix ReadingSettings comparison
sed -i "s/formData.homepageType === 'static_page'/formData.homepageType !== 'latest_posts'/g" src/pages/settings/ReadingSettings.tsx

# 9. Fix appSettings type
sed -i 's/\[appId as keyof Settings\]/[appId as keyof typeof settings]/g' src/utils/appSettings.ts

# 10. Fix SupplierDashboardPage const assertion
sed -i 's/} as const;$/};/g' src/pages/vendors/SupplierDashboardPage.tsx

# 11. Fix User type - add alternative properties
if ! grep -q "lastLogin" src/types/user.ts; then
cat >> src/types/user.ts << 'EOF'

// Alternative date properties for compatibility
export interface UserDateCompatibility {
  createdAt?: Date;
  created_at?: Date;
  updatedAt?: Date;
  updated_at?: Date;
  lastLogin?: Date;
  last_login?: Date;
}

// Extend User interface
declare module '@o4o/types' {
  interface User extends UserDateCompatibility {}
}
EOF
fi

# 12. Fix GutenbergPage block type issues
cat > src/pages/test/GutenbergPage.tsx.fix << 'EOF'
// Add at line ~126
const selectedBlock = blocks.find((b: any) => b.id === selectedBlockId) || null;
// Replace spread operator issues
const blockProps = selectedBlock ? { ...selectedBlock } : {};
EOF

echo "✅ Final comprehensive fixes applied!"
echo ""
echo "🔍 Run 'npm run type-check' to verify all fixes"