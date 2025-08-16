#!/bin/bash

echo "🔧 Complete fix for admin-dashboard..."

cd /home/user/o4o-platform/apps/admin-dashboard

# 1. Fix all _isOpen usage consistently
echo "  Fixing _isOpen usage..."
# MiniCart
sed -i 's/if (!isOpen)/if (!_isOpen)/g' src/components/ecommerce/MiniCart.tsx
sed -i 's/isOpen\?/\_isOpen\?/g' src/components/ecommerce/MiniCart.tsx
sed -i 's/show={isOpen}/show={_isOpen}/g' src/components/ecommerce/MiniCart.tsx

# MediaLibraryModal
sed -i 's/if (!isOpen)/if (!_isOpen)/g' src/components/media/MediaLibraryModal.tsx
sed -i 's/return isOpen/return _isOpen/g' src/components/media/MediaLibraryModal.tsx

# GutenbergEditor
sed -i 's/isOpen: isMediaLibraryOpen/_isOpen: isMediaLibraryOpen/g' src/components/editor/GutenbergEditor.tsx

# 2. Fix User type duplicate properties
echo "  Fixing User type..."
cat > src/types/user.ts.new << 'EOF'
import { User as BaseUser } from '@o4o/types';

export interface User extends BaseUser {
  lastLogin?: Date;
  last_login?: Date;
}

export type UserRole = 'admin' | 'business' | 'affiliate' | 'customer';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  business: '사업자', 
  affiliate: '제휴사',
  customer: '고객'
};

export const roleDisplayNames: Record<UserRole, string> = {
  admin: '관리자',
  business: '사업자',
  affiliate: '제휴사',
  customer: '고객'
};
EOF
mv src/types/user.ts.new src/types/user.ts

# 3. Fix role imports
echo "  Fixing role imports..."
sed -i 's/import { roleDisplayNames }/@\/config\/rolePermissions";/import { roleDisplayNames } from "@\/types\/user";/g' src/config/rolePermissions.ts

# 4. Fix appSettings
echo "  Fixing appSettings..."
sed -i 's/\[appId as keyof typeof settings\]/[String(appId) as keyof typeof settings]/g' src/utils/appSettings.ts

# 5. Fix TemplateLibrary
echo "  Fixing TemplateLibrary..."
sed -i 's/setFilter({ category: value })/setFilter((prev: any) => ({ ...prev, category: value }))/g' src/components/template/TemplateLibrary.tsx
sed -i 's/setFilter({ featured: value })/setFilter((prev: any) => ({ ...prev, featured: value }))/g' src/components/template/TemplateLibrary.tsx

# 6. Remove unused imports/types
echo "  Removing unused imports..."
sed -i '/^import.*TemplateBuilderState.*from/d' src/components/template/TemplateBuilder.tsx
sed -i '/^import.*TemplateLibraryFilter.*from/d' src/components/template/TemplateLibrary.tsx
sed -i '/^import.*Page.*from.*@\/api\/contentApi/d' src/pages/settings/ReadingSettings.tsx
sed -i '/^import.*ApprovalLogItem.*from/d' src/pages/users/UserDetail.tsx

# 7. Fix ReadingSettings
echo "  Fixing ReadingSettings..."
sed -i "s/homepageType === 'static_page'/homepageType !== 'latest_posts'/g" src/pages/settings/ReadingSettings.tsx
sed -i 's/showSummary: formData\.showSummary/showSummary: formData.showSummary as "full" | "excerpt"/g' src/pages/settings/ReadingSettings.tsx

# 8. Fix Menu types
echo "  Fixing Menu types..."
sed -i 's/type: values\.type/type: values.type as MenuItemType/g' src/pages/menus/MenuBuilder.tsx

# 9. Export roleDisplayNames from rolePermissions
echo "  Exporting roleDisplayNames..."
echo "" >> src/config/rolePermissions.ts
echo "export { roleDisplayNames } from '@/types/user';" >> src/config/rolePermissions.ts

echo "✅ Complete fix applied!"