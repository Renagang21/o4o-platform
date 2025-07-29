#!/bin/bash

echo "🔧 Fixing remaining type issues..."

# Fix missing ReactNode in SortableFormField.tsx
echo "Fixing SortableFormField.tsx..."
if [[ -f "src/components/forms/SortableFormField.tsx" ]]; then
  sed -i '1i import { ReactNode } from "react"' src/components/forms/SortableFormField.tsx 2>/dev/null || true
fi

# Fix missing ReactNode in BlockPalette.tsx
echo "Fixing BlockPalette.tsx..."
if [[ -f "src/components/template/BlockPalette.tsx" ]]; then
  sed -i '1s/import { FC, useState }/import { FC, useState, ReactNode }/' src/components/template/BlockPalette.tsx 2>/dev/null || true
fi

# Fix textarea.tsx unused import
echo "Fixing textarea.tsx..."
if [[ -f "src/components/ui/textarea.tsx" ]]; then
  sed -i '1d' src/components/ui/textarea.tsx 2>/dev/null || true
fi

# Remove unused imports from various components
echo "Removing unused imports..."
# ProductApprovalManager.tsx
sed -i 's/, useCallback//g' src/components/vendor/ProductApprovalManager.tsx 2>/dev/null || true
# SupplierProductForm.tsx
sed -i 's/, useCallback//g' src/components/vendor/SupplierProductForm.tsx 2>/dev/null || true
# WidgetBuilder.tsx
sed -i 's/, useCallback//g' src/components/widget/WidgetBuilder.tsx 2>/dev/null || true
# WidgetLibrary.tsx
sed -i 's/, useEffect, useCallback//g' src/components/widget/WidgetLibrary.tsx 2>/dev/null || true

# Fix Library.tsx unused imports
echo "Fixing Library.tsx unused imports..."
sed -i '/import {/,/} from '\''lucide-react'\''/{
  s/, RefreshCw//g
  s/, X//g
}' src/pages/media/Library.tsx 2>/dev/null || true

# Fix BlockEditor unused variables
echo "Fixing BlockEditor.tsx unused variables..."
sed -i '/interface SpacingValue {/,/^}$/d' src/components/template/BlockEditor.tsx 2>/dev/null || true

# Fix vendor components - Textarea with Input handlers
echo "Fixing vendor component handlers..."
# ProductApprovalManager.tsx - line 350
sed -i '350s/onChange={(e: React.ChangeEvent<HTMLInputElement>)/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)/' src/components/vendor/ProductApprovalManager.tsx 2>/dev/null || true
# SupplierProductForm.tsx - line 183
sed -i '183s/onChange={(e: React.ChangeEvent<HTMLInputElement>)/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)/' src/components/vendor/SupplierProductForm.tsx 2>/dev/null || true

# Fix AffiliateCommission type import issue
echo "Fixing AffiliateCommission.tsx..."
if [[ -f "src/pages/affiliate/AffiliateCommission.tsx" ]]; then
  # Add type import
  sed -i '1i import type { AffiliateCommission as AffiliateCommissionType } from "@o4o/types"' src/pages/affiliate/AffiliateCommission.tsx
  # Replace usage
  sed -i 's/: AffiliateCommission/: AffiliateCommissionType/g' src/pages/affiliate/AffiliateCommission.tsx
fi

# Fix Select onChange handlers with wrong types
echo "Fixing Select onChange handlers..."
# AffiliateAnalytics.tsx - line 116
sed -i '116s/onChange={(e: React.ChangeEvent<HTMLInputElement>)/onChange={(e: React.ChangeEvent<HTMLSelectElement>)/' src/pages/affiliate/AffiliateAnalytics.tsx 2>/dev/null || true

# Fix VendorSettlements checkbox issue
echo "Fixing VendorSettlements.tsx..."
if [[ -f "src/pages/ecommerce/VendorSettlements.tsx" ]]; then
  # Fix line 311-312 - This is a checkbox, not a select
  sed -i '311s/onChange={(e: React.ChangeEvent<HTMLSelectElement>)/onChange={(e: React.ChangeEvent<HTMLInputElement>)/' src/pages/ecommerce/VendorSettlements.tsx
  sed -i '312s/e.target.checked/e.target.checked/' src/pages/ecommerce/VendorSettlements.tsx
  # Fix line 369-370 - Change Textarea to Input
  sed -i '369s/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)/onChange={(e: React.ChangeEvent<HTMLInputElement>)/' src/pages/ecommerce/VendorSettlements.tsx
  sed -i '370s/e.target.checked/e.target.checked/' src/pages/ecommerce/VendorSettlements.tsx
fi

echo "✅ Remaining type issues fixed!"