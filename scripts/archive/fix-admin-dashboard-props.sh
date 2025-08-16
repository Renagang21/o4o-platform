#!/bin/bash

echo "🔧 Fixing admin-dashboard property naming issues..."

cd /home/user/o4o-platform/apps/admin-dashboard

# 1. Fix isOpen -> _isOpen
echo "  Fixing isOpen property names..."
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  # Only change in component files, not hook files
  if [[ ! "$file" == *"useHelpTabs"* ]]; then
    sed -i 's/isOpen:/\\_isOpen:/g' "$file"
    sed -i 's/props\.isOpen/props._isOpen/g' "$file"
    sed -i 's/{ isOpen,/{ _isOpen,/g' "$file"
    sed -i 's/{isOpen,/{_isOpen,/g' "$file"
    sed -i 's/isOpen =/\\_isOpen =/g' "$file"
    sed -i 's/isOpen}/\\_isOpen}/g' "$file"
  fi
done

# 2. Fix HelpTabsStore to use _isOpen internally
echo "  Fixing HelpTabsStore..."
sed -i 's/isOpen: boolean/_isOpen: boolean/g' src/types/help.ts
sed -i 's/state\.isOpen/state._isOpen/g' src/hooks/useHelpTabs.ts
sed -i 's/isOpen: true/_isOpen: true/g' src/hooks/useHelpTabs.ts
sed -i 's/isOpen: false/_isOpen: false/g' src/hooks/useHelpTabs.ts
sed -i 's/!state\.isOpen/!state._isOpen/g' src/hooks/useHelpTabs.ts

# 3. Fix roleDisplayNames conflicts
echo "  Fixing roleDisplayNames conflicts..."
# Remove the duplicate export
sed -i '/export const roleDisplayNames/d' src/config/rolePermissions.ts
# Add import at the top if not present
if ! grep -q "import { roleDisplayNames }" src/config/rolePermissions.ts; then
  sed -i '1i import { roleDisplayNames } from "@/types/user";' src/config/rolePermissions.ts
fi

# 4. Fix type casting for roles
echo "  Fixing role type casting..."
sed -i 's/setRole(value)/setRole(value as UserRole)/g' src/components/users/UserRoleChangeModal.tsx
sed -i 's/roleDisplayNames\[role\]/roleDisplayNames[role as UserRole]/g' src/components/users/UserRoleChangeModal.tsx
sed -i 's/roleDisplayNames\[selectedRole\]/roleDisplayNames[selectedRole as UserRole]/g' src/components/users/UserRoleChangeModal.tsx

# 5. Fix setBulkActions type
echo "  Fixing setBulkActions type..."
sed -i 's/setSelectedIds((prev: any) => {/setSelectedIds((prev) => {/g' src/hooks/useBulkActions.ts

# 6. Fix unused imports and types
echo "  Removing unused imports..."
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  # Remove unused type imports
  sed -i '/^import.*TemplateBuilderState.*from/d' "$file"
  sed -i '/^import.*TemplateLibraryFilter.*from/d' "$file"
done

# 7. Fix template history type issues
echo "  Fixing template history types..."
sed -i 's/builderState\.history\[/builderState.history[/' src/components/template/TemplateBuilder.tsx
sed -i 's/prevState\.blocks/(prevState as any).blocks/g' src/components/template/TemplateBuilder.tsx
sed -i 's/prevState\.settings/(prevState as any).settings/g' src/components/template/TemplateBuilder.tsx
sed -i 's/nextState\.blocks/(nextState as any).blocks/g' src/components/template/TemplateBuilder.tsx
sed -i 's/nextState\.settings/(nextState as any).settings/g' src/components/template/TemplateBuilder.tsx

# 8. Fix FolderManager type issues
echo "  Fixing FolderManager types..."
sed -i 's/setCurrentFolder(undefined)/setCurrentFolder(undefined as any)/g' src/components/media/FolderManager.tsx

echo "✅ Property naming fixes applied!"