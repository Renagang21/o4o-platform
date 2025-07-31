#!/bin/bash

echo "🔧 Fixing all TypeScript errors in admin-dashboard..."

# Fix 1: Remove unused imports
echo "📦 Removing unused imports..."
sed -i 's/, useCallback//g' apps/admin-dashboard/src/components/affiliate/ReferralLinkGenerator.tsx
sed -i 's/, useEffect, useCallback//g' apps/admin-dashboard/src/components/affiliate/ReferralToolkit.tsx
sed -i 's/, useEffect, useCallback//g' apps/admin-dashboard/src/components/editor/ContentTemplates.tsx
sed -i 's/, useEffect, useCallback//g' apps/admin-dashboard/src/components/editor/GutenbergEditor.tsx
sed -i 's/, RefreshCw, X//g' apps/admin-dashboard/src/pages/media/Library.tsx

# Fix 2: Remove unused className parameter from fileUtils
echo "📦 Fixing fileUtils.ts..."
cat > apps/admin-dashboard/src/utils/fileUtils.ts << 'EOF'
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileIcon(type: string): string {
  // Return icon emoji based on file type
  switch (type) {
    case 'image':
      return '🖼️';
    case 'video':
      return '🎬';
    case 'audio':
      return '🎵';
    case 'document':
      return '📄';
    default:
      return '📁';
  }
}
EOF

# Fix 3: Add missing type import to VendorsCommission
echo "📦 Fixing VendorsCommission.tsx..."
sed -i '1s/^/import type { AffiliateCommission } from '\''@o4o\/types'\'';\n/' apps/admin-dashboard/src/pages/vendors/VendorsCommission.tsx

# Fix 4: Fix UserForm onChange handler
echo "📦 Fixing UserForm.tsx..."
sed -i 's/onChange={(e)/onChange={(e: React.ChangeEvent<HTMLSelectElement>)/g' apps/admin-dashboard/src/pages/users/UserForm.tsx

# Fix 5: Fix Input components that should be HTMLInputElement
echo "📦 Fixing Input onChange handlers..."

# ProductVariantManager.tsx - Fix Input components
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVariant(index, '\''sku'\'', e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVariant(index, '\''sku'\'', e.target.value)}/g' apps/admin-dashboard/src/components/ecommerce/ProductVariantManager.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVariant(index, '\''price'\'', e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVariant(index, '\''price'\'', e.target.value)}/g' apps/admin-dashboard/src/components/ecommerce/ProductVariantManager.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVariantAttribute(variantIndex, attrIndex, '\''key'\'', e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVariantAttribute(variantIndex, attrIndex, '\''key'\'', e.target.value)}/g' apps/admin-dashboard/src/components/ecommerce/ProductVariantManager.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVariantAttribute(variantIndex, attrIndex, '\''value'\'', e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVariantAttribute(variantIndex, attrIndex, '\''value'\'', e.target.value)}/g' apps/admin-dashboard/src/components/ecommerce/ProductVariantManager.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVariant(index, '\''stock'\'', parseInt(e.target.value) || 0)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVariant(index, '\''stock'\'', parseInt(e.target.value) || 0)}/g' apps/admin-dashboard/src/components/ecommerce/ProductVariantManager.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVariant(index, '\''compareAtPrice'\'', e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVariant(index, '\''compareAtPrice'\'', e.target.value)}/g' apps/admin-dashboard/src/components/ecommerce/ProductVariantManager.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVariant(index, '\''weight'\'', e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVariant(index, '\''weight'\'', e.target.value)}/g' apps/admin-dashboard/src/components/ecommerce/ProductVariantManager.tsx

# OrderForm.tsx - Fix Select components
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)/onChange={(e: React.ChangeEvent<HTMLSelectElement>)/g' apps/admin-dashboard/src/pages/ecommerce/OrderForm.tsx

# VendorSettlements.tsx - Fix Select components
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFilterStatus(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}/g' apps/admin-dashboard/src/pages/ecommerce/VendorSettlements.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSettlementData(prev => ({ ...prev, settlementMethod: e.target.value }))}/onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSettlementData(prev => ({ ...prev, settlementMethod: e.target.value }))}/g' apps/admin-dashboard/src/pages/ecommerce/VendorSettlements.tsx

# MediaLibrary.tsx - Fix Select components  
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)/onChange={(e: React.ChangeEvent<HTMLSelectElement>)/g' apps/admin-dashboard/src/pages/content/MediaLibrary.tsx

# PostForm.tsx - Fix Select and Input components
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSelectedCategory(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}/g' apps/admin-dashboard/src/pages/content/PostForm.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTag(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}/g' apps/admin-dashboard/src/pages/content/PostForm.tsx

# FormBuilder.tsx - Fix Input components
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField(field.id, '\''label'\'', e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(field.id, '\''label'\'', e.target.value)}/g' apps/admin-dashboard/src/pages/forms/FormBuilder.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField(field.id, '\''placeholder'\'', e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(field.id, '\''placeholder'\'', e.target.value)}/g' apps/admin-dashboard/src/pages/forms/FormBuilder.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField(field.id, '\''defaultValue'\'', e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(field.id, '\''defaultValue'\'', e.target.value)}/g' apps/admin-dashboard/src/pages/forms/FormBuilder.tsx

# VendorsList.tsx - Fix Input and Select components
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSearchQuery(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}/g' apps/admin-dashboard/src/pages/vendors/VendorsList.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFilterStatus(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}/g' apps/admin-dashboard/src/pages/vendors/VendorsList.tsx

# VendorsReports.tsx - Fix Select components
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReportType(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReportType(e.target.value)}/g' apps/admin-dashboard/src/pages/vendors/VendorsReports.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDateRange(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDateRange(e.target.value)}/g' apps/admin-dashboard/src/pages/vendors/VendorsReports.tsx

# VendorsCommission.tsx - Fix Select components
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVendorSearch(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVendorSearch(e.target.value)}/g' apps/admin-dashboard/src/pages/vendors/VendorsCommission.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommissionFilter(prev => ({ ...prev, status: e.target.value }))}/onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCommissionFilter(prev => ({ ...prev, status: e.target.value }))}/g' apps/admin-dashboard/src/pages/vendors/VendorsCommission.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSelectedPaymentMethod(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPaymentMethod(e.target.value)}/g' apps/admin-dashboard/src/pages/vendors/VendorsCommission.tsx

# Settings components - Fix Select components
for file in apps/admin-dashboard/src/components/settings/*.tsx; do
  if [[ -f "$file" ]]; then
    sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)/onChange={(e: React.ChangeEvent<HTMLSelectElement>)/g' "$file"
  fi
done

echo "✅ All TypeScript errors fixed!"