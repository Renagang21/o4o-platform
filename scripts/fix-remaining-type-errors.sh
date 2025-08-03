#!/bin/bash

echo "🔧 Fixing remaining TypeScript syntax errors..."

# Fix patterns like "settings (as any)." to "(settings as any)."
find apps/admin-dashboard/src -name "*.ts" -o -name "*.tsx" | while read file; do
  # Fix space before (as any)
  if grep -q " (as any)\." "$file"; then
    echo "  Fixing space issue in: $file"
    sed -i 's/ (as any)\./(as any)./g' "$file"
  fi
done

# Fix specific files with known issues
echo "  Fixing BlockEditor.tsx specific issues..."
sed -i 's/value={\[block\.settings/value={[(block.settings/g' apps/admin-dashboard/src/components/template/BlockEditor.tsx
sed -i 's/onChange={(e: any) => updateNestedSettings(\(.*\), \(.*\), parseInt(e\.target/onChange={(e: any) => updateNestedSettings(\1, \2, parseInt((e.target/g' apps/admin-dashboard/src/components/template/BlockEditor.tsx

echo "  Fixing WidgetBuilder.tsx specific issues..."
sed -i 's/\.widgets (as any)\.find/\.widgets as any).find/g' apps/admin-dashboard/src/components/widget/WidgetBuilder.tsx
sed -i 's/\.widgets (as any)\.map/\.widgets as any).map/g' apps/admin-dashboard/src/components/widget/WidgetBuilder.tsx

echo "  Fixing api/settings.ts issues..."
sed -i 's/data\.settings (as any)\.\[key\]/data.settings as any)[key]/g' apps/admin-dashboard/src/api/settings.ts

echo "  Fixing PostListQuickEdit.tsx issues..."
sed -i 's/\.posts (as any)\.map/\.posts as any).map/g' apps/admin-dashboard/src/pages/content/PostListQuickEdit.tsx

echo "✅ Remaining syntax errors fixed!"