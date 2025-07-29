#!/bin/bash

echo "🔧 Fixing final TypeScript errors..."

# Fix 1: Remove more unused imports
echo "📦 Removing unused imports..."
sed -i 's/, useEffect, useCallback//g' apps/admin-dashboard/src/components/editor/GutenbergSidebar.tsx
sed -i 's/, useCallback//g' apps/admin-dashboard/src/components/editor/PluginSidebar.tsx
sed -i 's/, useCallback//g' apps/admin-dashboard/src/components/editor/blocks/SpectraBlocks.tsx
sed -i 's/, useCallback//g' apps/admin-dashboard/src/components/editor/blocks/WPForms.tsx
sed -i 's/, useCallback//g' apps/admin-dashboard/src/components/editor/blocks/RankMath.tsx
sed -i 's/, useEffect//g' apps/admin-dashboard/src/pages/crowdfunding/ProjectCreate.tsx
sed -i 's/, useCallback//g' apps/admin-dashboard/src/pages/ecommerce/VendorAnalytics.tsx
sed -i 's/, useCallback//g' apps/admin-dashboard/src/pages/ecommerce/VendorSettlements.tsx
sed -i 's/, useCallback//g' apps/admin-dashboard/src/pages/forum/ForumCreate.tsx
sed -i 's/, useCallback//g' apps/admin-dashboard/src/pages/forum/ForumList.tsx

# Fix 2: Fix VendorsCommission.tsx - Add correct import and fix types
echo "📦 Fixing VendorsCommission.tsx..."
# First check if the import is already there
if ! grep -q "import type { AffiliateCommission }" apps/admin-dashboard/src/pages/vendors/VendorsCommission.tsx; then
  # Add import at the beginning of the file
  sed -i '1i import type { AffiliateCommission } from '\''@o4o/types'\'';' apps/admin-dashboard/src/pages/vendors/VendorsCommission.tsx
fi

# Change CommissionData to AffiliateCommission in the state and functions
sed -i 's/useState<CommissionData\[\]>/useState<AffiliateCommission[]>/g' apps/admin-dashboard/src/pages/vendors/VendorsCommission.tsx
sed -i 's/.reduce((sum: number, c: AffiliateCommission)/.reduce((sum: number, c)/g' apps/admin-dashboard/src/pages/vendors/VendorsCommission.tsx

# Fix 3: Fix remaining Input components that have wrong types
echo "📦 Fixing remaining Input components..."
# GutenbergSidebar.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updatePostMeta('\''excerpt'\'', e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePostMeta('\''excerpt'\'', e.target.value)}/g' apps/admin-dashboard/src/components/editor/GutenbergSidebar.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleTagAdd(e)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTagAdd(e)}/g' apps/admin-dashboard/src/components/editor/GutenbergSidebar.tsx

# WPForms.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFieldName(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldName(e.target.value)}/g' apps/admin-dashboard/src/components/editor/blocks/WPForms.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFieldLabel(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldLabel(e.target.value)}/g' apps/admin-dashboard/src/components/editor/blocks/WPForms.tsx

# RankMath.tsx  
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSeoData({ ...seoData, title: e.target.value })}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeoData({ ...seoData, title: e.target.value })}/g' apps/admin-dashboard/src/components/editor/blocks/RankMath.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSeoData({ ...seoData, focusKeyword: e.target.value })}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeoData({ ...seoData, focusKeyword: e.target.value })}/g' apps/admin-dashboard/src/components/editor/blocks/RankMath.tsx

# Fix Select components
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFieldType(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFieldType(e.target.value)}/g' apps/admin-dashboard/src/components/editor/blocks/WPForms.tsx

# Fix 4: Fix PostEditor import issue
echo "📦 Fixing PostEditor imports..."
# Check if PostEditor exists in the imports
if ! grep -q "PostEditor" apps/admin-dashboard/src/components/editor/PostEditor.tsx 2>/dev/null; then
  echo "PostEditor file might be missing or have different structure"
fi

# Fix 5: Fix MediaLibrary and other page Input components
echo "📦 Fixing page component event handlers..."
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFieldSearch(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldSearch(e.target.value)}/g' apps/admin-dashboard/src/pages/content/MediaLibrary.tsx

# VendorAnalytics.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDateRange(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDateRange(e.target.value)}/g' apps/admin-dashboard/src/pages/ecommerce/VendorAnalytics.tsx

# ForumCreate.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, name: e.target.value })}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}/g' apps/admin-dashboard/src/pages/forum/ForumCreate.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, category: e.target.value })}/onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, category: e.target.value })}/g' apps/admin-dashboard/src/pages/forum/ForumCreate.tsx

# ForumList.tsx
sed -i 's/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSearchQuery(e.target.value)}/onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}/g' apps/admin-dashboard/src/pages/forum/ForumList.tsx

# Fix 6: Fix SortableFormField.tsx
echo "📦 Checking SortableFormField..."
if [[ -f "apps/admin-dashboard/src/components/SortableFormField.tsx" ]]; then
  # Remove unused imports
  sed -i 's/, useCallback//g' apps/admin-dashboard/src/components/SortableFormField.tsx
fi

echo "✅ Final TypeScript fixes complete!"