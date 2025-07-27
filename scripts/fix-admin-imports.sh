#!/bin/bash

# Fix InlineEdit.tsx
echo "Fixing InlineEdit.tsx..."
sed -i '1s/^/import { FC } from '\''react'\'';\n/' apps/admin-dashboard/src/components/InlineEdit.tsx

# Fix ScreenOptions.tsx
echo "Fixing ScreenOptions.tsx..."
sed -i '1s/^/import { FC } from '\''react'\'';\n/' apps/admin-dashboard/src/components/ScreenOptions.tsx

# Fix ShortcodeReference.tsx
echo "Fixing ShortcodeReference.tsx..."
if ! grep -q "import.*{.*FC.*}" apps/admin-dashboard/src/components/ShortcodeReference.tsx; then
  sed -i '/^import.*from.*react/s/import { \(.*\) } from '\''react'\''/import { \1, FC } from '\''react'\''/' apps/admin-dashboard/src/components/ShortcodeReference.tsx
fi

# Fix UserForm.tsx - add FC and useState
echo "Fixing UserForm.tsx..."
sed -i '1d' apps/admin-dashboard/src/components/users/UserForm.tsx  # Remove unused React import
sed -i '1s/^/import { FC, useState } from '\''react'\'';\n/' apps/admin-dashboard/src/components/users/UserForm.tsx

# Fix MediaLibrary.tsx - Remove React reference
echo "Fixing MediaLibrary.tsx..."
sed -i 's/React\.Fragment/Fragment/g' apps/admin-dashboard/src/components/media/MediaLibrary.tsx
sed -i 's/React\.//' apps/admin-dashboard/src/components/media/MediaLibrary.tsx
sed -i '/^import.*from.*react/s/import { \(.*\) } from '\''react'\''/import { \1, Fragment } from '\''react'\''/' apps/admin-dashboard/src/components/media/MediaLibrary.tsx

# Fix ThemeContext.tsx
echo "Fixing ThemeContext.tsx..."
sed -i '/^import.*from.*react/s/import { \(.*\) } from '\''react'\''/import { \1, FC } from '\''react'\''/' apps/admin-dashboard/src/contexts/ThemeContext.tsx

# Fix UI components unused imports
echo "Fixing UI components unused imports..."
files=(
  "apps/admin-dashboard/src/components/ui/alert.tsx"
  "apps/admin-dashboard/src/components/ui/badge.tsx"
  "apps/admin-dashboard/src/components/ui/button.tsx"
  "apps/admin-dashboard/src/components/ui/card.tsx"
  "apps/admin-dashboard/src/components/ui/checkbox.tsx"
  "apps/admin-dashboard/src/components/ui/dialog.tsx"
  "apps/admin-dashboard/src/components/ui/dropdown-menu.tsx"
  "apps/admin-dashboard/src/components/ui/input.tsx"
  "apps/admin-dashboard/src/components/ui/label.tsx"
  "apps/admin-dashboard/src/components/ui/popover.tsx"
  "apps/admin-dashboard/src/components/ui/progress.tsx"
  "apps/admin-dashboard/src/components/ui/radio-group.tsx"
  "apps/admin-dashboard/src/components/ui/scroll-area.tsx"
  "apps/admin-dashboard/src/components/ui/select.tsx"
  "apps/admin-dashboard/src/components/ui/separator.tsx"
  "apps/admin-dashboard/src/components/ui/slider.tsx"
  "apps/admin-dashboard/src/components/ui/switch.tsx"
  "apps/admin-dashboard/src/components/ui/table.tsx"
  "apps/admin-dashboard/src/components/ui/tabs.tsx"
  "apps/admin-dashboard/src/components/ui/textarea.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Remove unused imports
    sed -i '/LabelHTMLAttributes.*is declared but.*never read/d' "$file"
    sed -i 's/, LabelHTMLAttributes//g' "$file"
    sed -i 's/LabelHTMLAttributes, //g' "$file"
    sed -i 's/, ElementRef.*is declared but.*never read//g' "$file"
    sed -i 's/ElementRef.*is declared but.*never read, //g' "$file"
    sed -i 's/, ComponentPropsWithoutRef.*is declared but.*never read//g' "$file"
    sed -i 's/ComponentPropsWithoutRef.*is declared but.*never read, //g' "$file"
  fi
done

echo "Import fixes complete!"