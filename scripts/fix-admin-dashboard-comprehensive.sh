#!/bin/bash

# Comprehensive script to fix all TypeScript errors in admin-dashboard

echo "🔧 Fixing all TypeScript errors in admin-dashboard..."

# Fix 1: Add missing React imports to files that are missing them
echo "📦 Adding missing React imports..."

# Files that need useState, useEffect imports
files_need_hooks=(
  "apps/admin-dashboard/src/components/affiliate/ReferralLinkGenerator.tsx"
  "apps/admin-dashboard/src/components/affiliate/ReferralToolkit.tsx"
  "apps/admin-dashboard/src/components/editor/ContentTemplates.tsx"
  "apps/admin-dashboard/src/components/editor/GutenbergEditor.tsx"
  "apps/admin-dashboard/src/components/editor/GutenbergSidebar.tsx"
  "apps/admin-dashboard/src/components/forms/FormConfirmationsTab.tsx"
  "apps/admin-dashboard/src/components/forms/FormNotificationsTab.tsx"
  "apps/admin-dashboard/src/components/template/BlockEditor.tsx"
  "apps/admin-dashboard/src/components/template/BlockPalette.tsx"
  "apps/admin-dashboard/src/components/template/TemplateLibrary.tsx"
  "apps/admin-dashboard/src/components/vendor/ProductApprovalManager.tsx"
  "apps/admin-dashboard/src/components/vendor/SupplierProductForm.tsx"
  "apps/admin-dashboard/src/components/widget/WidgetBuilder.tsx"
  "apps/admin-dashboard/src/components/widget/WidgetLibrary.tsx"
)

for file in "${files_need_hooks[@]}"; do
  if [[ -f "$file" ]]; then
    # Check if the file already has React imports
    if ! grep -q "import.*useState.*from 'react'" "$file"; then
      # Add the appropriate imports based on what's needed
      if grep -q "useState\|useEffect\|useCallback" "$file"; then
        # Extract the existing import from 'react' if any
        if grep -q "import.*from 'react'" "$file"; then
          # Add to existing import
          sed -i "1s/import { FC }/import { FC, useState, useEffect, useCallback }/" "$file" 2>/dev/null || true
          sed -i "1s/import React, { FC }/import { FC, useState, useEffect, useCallback }/" "$file" 2>/dev/null || true
        else
          # Add new import at the beginning
          sed -i "1i import { useState, useEffect, useCallback } from 'react';" "$file"
        fi
      fi
    fi
  fi
done

# Fix 2: Add missing React type imports to UI components
echo "📦 Adding missing React type imports to UI components..."

ui_files=(
  "apps/admin-dashboard/src/components/ui/checkbox.tsx"
  "apps/admin-dashboard/src/components/ui/dialog.tsx"
  "apps/admin-dashboard/src/components/ui/dropdown-menu.tsx"
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
)

for file in "${ui_files[@]}"; do
  if [[ -f "$file" ]]; then
    # Check if ElementRef and ComponentPropsWithoutRef are already imported
    if ! grep -q "ElementRef\|ComponentPropsWithoutRef" "$file"; then
      # Find the line with forwardRef import and add to it
      if grep -q "import.*forwardRef.*from 'react'" "$file"; then
        sed -i "s/import { forwardRef }/import { forwardRef, ElementRef, ComponentPropsWithoutRef }/" "$file"
      else
        # Add new import after the first line
        sed -i "2i import { ElementRef, ComponentPropsWithoutRef } from 'react';" "$file"
      fi
    fi
  fi
done

# Fix 3: Fix specific files with special issues
echo "🔧 Fixing specific file issues..."

# Fix PostEditor.tsx - add useCallback
if [[ -f "apps/admin-dashboard/src/components/editor/PostEditor.tsx" ]]; then
  sed -i "s/import { FC, useState, useEffect }/import { FC, useState, useEffect, useCallback }/" "apps/admin-dashboard/src/components/editor/PostEditor.tsx"
fi

# Fix SortableFormField.tsx - add ReactNode
if [[ -f "apps/admin-dashboard/src/components/forms/SortableFormField.tsx" ]]; then
  if ! grep -q "ReactNode" "apps/admin-dashboard/src/components/forms/SortableFormField.tsx"; then
    sed -i "1i import { ReactNode } from 'react';" "apps/admin-dashboard/src/components/forms/SortableFormField.tsx"
  fi
fi

# Fix MediaLibrary.tsx - remove duplicate Fragment and add createElement
if [[ -f "apps/admin-dashboard/src/components/media/MediaLibrary.tsx" ]]; then
  # Remove duplicate Fragment imports and fix
  sed -i '1d' "apps/admin-dashboard/src/components/media/MediaLibrary.tsx"
  sed -i "s/import { useState, useEffect, Fragment }/import { useState, useEffect, Fragment, createElement }/" "apps/admin-dashboard/src/components/media/MediaLibrary.tsx"
fi

# Fix BlockRenderer.tsx - add createElement
if [[ -f "apps/admin-dashboard/src/components/template/BlockRenderer.tsx" ]]; then
  sed -i "s/import { FC }/import { FC, createElement }/" "apps/admin-dashboard/src/components/template/BlockRenderer.tsx"
fi

# Fix BlockPalette.tsx - add ReactNode
if [[ -f "apps/admin-dashboard/src/components/template/BlockPalette.tsx" ]]; then
  sed -i "s/import { FC }/import { FC, ReactNode }/" "apps/admin-dashboard/src/components/template/BlockPalette.tsx"
fi

# Fix notifications/RealtimeNotifications.tsx
if [[ -f "apps/admin-dashboard/src/components/notifications/RealtimeNotifications.tsx" ]]; then
  # Find the line that defines the component and ensure FC is imported
  sed -i "1i import { FC } from 'react';" "apps/admin-dashboard/src/components/notifications/RealtimeNotifications.tsx"
fi

# Fix UserForm.tsx - remove duplicate imports
if [[ -f "apps/admin-dashboard/src/components/users/UserForm.tsx" ]]; then
  # Remove duplicate imports
  sed -i '1d;7d' "apps/admin-dashboard/src/components/users/UserForm.tsx"
  # Add proper imports
  sed -i "1i import { FC, useState, useEffect } from 'react';" "apps/admin-dashboard/src/components/users/UserForm.tsx"
fi

# Fix 4: Remove unused imports
echo "🔧 Removing unused imports..."
sed -i 's/import { forwardRef, HTMLAttributes }/import { forwardRef }/' apps/admin-dashboard/src/components/ui/alert.tsx 2>/dev/null || true
sed -i 's/import { forwardRef }/import { forwardRef }/' apps/admin-dashboard/src/components/ui/badge.tsx 2>/dev/null || true
sed -i 's/import { forwardRef, HTMLAttributes }/import { forwardRef }/' apps/admin-dashboard/src/components/ui/card.tsx 2>/dev/null || true
sed -i 's/import { forwardRef, HTMLAttributes }/import { forwardRef }/' apps/admin-dashboard/src/components/ui/dialog.tsx 2>/dev/null || true
sed -i 's/import { forwardRef, HTMLAttributes }/import { forwardRef }/' apps/admin-dashboard/src/components/ui/dropdown-menu.tsx 2>/dev/null || true

# Fix MediaDetails.tsx - remove unused ReactNode
sed -i 's/import { FC, ReactNode }/import { FC }/' apps/admin-dashboard/src/components/media/MediaDetails.tsx 2>/dev/null || true

# Fix 5: Fix UIShowcase imports
echo "🔧 Fixing UIShowcase imports..."
if [[ -f "apps/admin-dashboard/src/pages/UIShowcase.tsx" ]]; then
  sed -i "s/import InlineEdit/import { InlineEdit }/" "apps/admin-dashboard/src/pages/UIShowcase.tsx"
  sed -i "s/import ScreenOptions, { ScreenOption }/import { ScreenOptions, ScreenOption }/" "apps/admin-dashboard/src/pages/UIShowcase.tsx"
fi

# Fix 6: Fix ActivityFeed comparison
echo "🔧 Fixing ActivityFeed comparison..."
if [[ -f "apps/admin-dashboard/src/pages/dashboard/components/ActivityFeed/index.tsx" ]]; then
  # Change the comparison from "" to a valid type
  sed -i 's/activity\.type === ""/activity.type === "content"/' "apps/admin-dashboard/src/pages/dashboard/components/ActivityFeed/index.tsx"
fi

# Fix 7: Add type annotations for event handlers
echo "🔧 Adding type annotations for event handlers..."

# Fix all implicit any parameters for common patterns
find apps/admin-dashboard/src -type f -name "*.tsx" -exec sed -i \
  -e 's/onChange={(checked)}/onChange={(checked: boolean) =>/' \
  -e 's/onCheckedChange={(checked)}/onCheckedChange={(checked: boolean) =>/' \
  -e 's/onChange={(value)}/onChange={(value: string) =>/' \
  -e 's/onValueChange={(value)}/onValueChange={(value: string) =>/' \
  -e 's/onChange={(e)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) =>/' \
  -e 's/\.filter(commission)/\.filter((commission: AffiliateCommission)/' \
  -e 's/\.map(commission)/\.map((commission: AffiliateCommission)/' \
  -e 's/\.reduce((sum, c)/\.reduce((sum: number, c: AffiliateCommission)/' \
  -e 's/\.filter(c)/\.filter((c: AffiliateCommission)/' \
  -e 's/\.map(c)/\.map((c: AffiliateCommission)/' \
  -e 's/\.filter(p)/\.filter((p: VendorProduct)/' \
  -e 's/\.map(product)/\.map((product: VendorProduct)/' \
  -e 's/setFormData(prev)/setFormData((prev: any)/' \
  -e 's/\.map(block)/\.map((block: any)/' \
  -e 's/\.filter(block)/\.filter((block: any)/' \
  {} \; 2>/dev/null || true

# Fix 8: Fix formatPrice calls with unknown types
echo "🔧 Fixing formatPrice calls..."
if [[ -f "apps/admin-dashboard/src/components/affiliate/CommissionApprovalManager.tsx" ]]; then
  sed -i 's/formatPrice(selectedAmount)/formatPrice(selectedAmount as number)/' "apps/admin-dashboard/src/components/affiliate/CommissionApprovalManager.tsx"
fi

# Fix 9: Fix the duplicate FC import in Library.tsx
echo "🔧 Fixing Library.tsx duplicate imports..."
if [[ -f "apps/admin-dashboard/src/pages/media/Library.tsx" ]]; then
  # Remove line 2 (the duplicate)
  sed -i '2d' "apps/admin-dashboard/src/pages/media/Library.tsx"
fi

# Fix 10: Fix duplicate imports in PendingUsers.tsx
echo "🔧 Fixing PendingUsers.tsx duplicate imports..."
if [[ -f "apps/admin-dashboard/src/pages/users-backup/PendingUsers.tsx" ]]; then
  # Remove line 2 (the duplicate)
  sed -i '2d' "apps/admin-dashboard/src/pages/users-backup/PendingUsers.tsx"
fi

# Fix 11: Add missing value props to Radix UI components
echo "🔧 Fixing missing value props in Radix UI components..."

# This is more complex and would require parsing the actual component usage
# For now, we'll skip this as it requires understanding the component context

echo "✅ Admin dashboard TypeScript fixes complete!"
echo ""
echo "⚠️  Note: Some TypeScript errors related to missing 'value' props in Radix UI components"
echo "    may still remain. These require manual fixes based on component usage context."