#!/bin/bash

# Fix unused React imports in admin-dashboard
# This script removes unnecessary React imports that were added by the previous script

echo "🔧 Fixing unused React imports in admin-dashboard..."

# Function to check if a file uses any React APIs
check_react_usage() {
    local file="$1"
    
    # Check for actual React API usage
    if grep -qE "useState|useEffect|useCallback|useMemo|useRef|Fragment|FC|Component|ReactNode|ReactElement" "$file"; then
        return 0  # File uses React APIs
    fi
    return 1  # File doesn't use React APIs
}

# Function to update imports based on actual usage
update_imports() {
    local file="$1"
    local temp_file="${file}.tmp"
    
    # Get the current import line
    local import_line=$(grep -E "^import.*from ['\"]react['\"]" "$file" | head -1)
    
    if [[ -z "$import_line" ]]; then
        return  # No React import found
    fi
    
    # Check what's actually used in the file
    local needed_imports=""
    
    # Hooks
    grep -q "\buseState\b" "$file" && needed_imports="${needed_imports}useState, "
    grep -q "\buseEffect\b" "$file" && needed_imports="${needed_imports}useEffect, "
    grep -q "\buseCallback\b" "$file" && needed_imports="${needed_imports}useCallback, "
    grep -q "\buseMemo\b" "$file" && needed_imports="${needed_imports}useMemo, "
    grep -q "\buseRef\b" "$file" && needed_imports="${needed_imports}useRef, "
    grep -q "\buseContext\b" "$file" && needed_imports="${needed_imports}useContext, "
    grep -q "\buseReducer\b" "$file" && needed_imports="${needed_imports}useReducer, "
    grep -q "\buseLayoutEffect\b" "$file" && needed_imports="${needed_imports}useLayoutEffect, "
    
    # Components and types
    grep -q "\bFC\b" "$file" && needed_imports="${needed_imports}FC, "
    grep -q "\bComponent\b" "$file" && needed_imports="${needed_imports}Component, "
    grep -q "\bPureComponent\b" "$file" && needed_imports="${needed_imports}PureComponent, "
    grep -q "\bFragment\b" "$file" && needed_imports="${needed_imports}Fragment, "
    grep -q "\bStrictMode\b" "$file" && needed_imports="${needed_imports}StrictMode, "
    grep -q "\bSuspense\b" "$file" && needed_imports="${needed_imports}Suspense, "
    grep -q "\blazy\b" "$file" && needed_imports="${needed_imports}lazy, "
    grep -q "\bmemo\b" "$file" && needed_imports="${needed_imports}memo, "
    grep -q "\bforwardRef\b" "$file" && needed_imports="${needed_imports}forwardRef, "
    grep -q "\bcreateContext\b" "$file" && needed_imports="${needed_imports}createContext, "
    grep -q "\bcloneElement\b" "$file" && needed_imports="${needed_imports}cloneElement, "
    grep -q "\bcreateElement\b" "$file" && needed_imports="${needed_imports}createElement, "
    grep -q "\bisValidElement\b" "$file" && needed_imports="${needed_imports}isValidElement, "
    grep -q "\bReactNode\b" "$file" && needed_imports="${needed_imports}ReactNode, "
    grep -q "\bReactElement\b" "$file" && needed_imports="${needed_imports}ReactElement, "
    grep -q "\bComponentPropsWithoutRef\b" "$file" && needed_imports="${needed_imports}ComponentPropsWithoutRef, "
    grep -q "\bChangeEvent\b" "$file" && needed_imports="${needed_imports}ChangeEvent, "
    
    # Remove trailing comma and space
    needed_imports="${needed_imports%, }"
    
    if [[ -z "$needed_imports" ]]; then
        # No React APIs used, remove the import
        grep -v "^import.*from ['\"]react['\"]" "$file" > "$temp_file"
        mv "$temp_file" "$file"
        echo "✅ Removed unused React import from: $file"
    else
        # Update the import with only what's needed
        sed -i "s|^import.*from ['\"]react['\"].*|import { $needed_imports } from 'react';|" "$file"
        echo "✅ Updated React imports in: $file"
    fi
}

# Find all TypeScript files in admin-dashboard
echo "📂 Processing admin-dashboard files..."
files=$(find apps/admin-dashboard/src -type f \( -name "*.tsx" -o -name "*.ts" \) ! -path "*/node_modules/*")

for file in $files; do
    update_imports "$file"
done

# Also fix the other apps that have issues
echo "📂 Processing other apps..."

# Fix specific files mentioned in the errors
other_files=(
    "apps/crowdfunding/src/components/project/ProjectProgress.tsx"
    "apps/crowdfunding/src/main.tsx"
    "apps/digital-signage/src/main.tsx"
    "apps/digital-signage/src/pages/SignageDetail.tsx"
    "apps/ecommerce/src/components/auth/VendorRoute.tsx"
    "apps/ecommerce/src/components/cart/CartItem.tsx"
    "apps/ecommerce/src/components/cart/CartSummary.tsx"
    "apps/ecommerce/src/components/common/PriceDisplay.tsx"
    "apps/ecommerce/src/components/common/StockStatus.tsx"
    "apps/ecommerce/src/components/order/OrderItem.tsx"
    "apps/ecommerce/src/components/product/ProductCard.tsx"
    "apps/ecommerce/src/components/product/ProductFilters.tsx"
    "apps/ecommerce/src/components/product/ProductGrid.tsx"
    "apps/ecommerce/src/components/review/ProductReviewSection.tsx"
    "apps/ecommerce/src/components/review/ReviewForm.tsx"
    "apps/ecommerce/src/components/review/ReviewItem.tsx"
    "apps/ecommerce/src/components/review/ReviewRating.tsx"
    "apps/ecommerce/src/components/shortcodes/OrderSummary.tsx"
    "apps/ecommerce/src/components/shortcodes/ProductGrid.tsx"
    "apps/ecommerce/src/components/shortcodes/ProductSummary.tsx"
    "apps/ecommerce/src/components/shortcodes/RelatedProducts.tsx"
    "apps/ecommerce/src/main.tsx"
    "apps/ecommerce/src/pages/admin/ReviewManagement.tsx"
    "apps/ecommerce/src/pages/products/ProductDetail.tsx"
    "apps/ecommerce/src/pages/shop/SupplierShop.tsx"
    "apps/ecommerce/src/pages/supplier/SupplierStoreSettings.tsx"
    "apps/forum/src/main.tsx"
    "apps/main-site/src/TestApp.tsx"
    "apps/main-site/src/main.tsx"
    "apps/main-site/src/main-test.tsx"
)

for file in "${other_files[@]}"; do
    if [[ -f "$file" ]]; then
        update_imports "$file"
    fi
done

# Process all main-site components
echo "📂 Processing main-site components..."
main_site_files=$(find apps/main-site/src/components -type f \( -name "*.tsx" -o -name "*.ts" \) ! -path "*/node_modules/*")
for file in $main_site_files; do
    update_imports "$file"
done

# Process all main-site pages
echo "📂 Processing main-site pages..."
main_site_pages=$(find apps/main-site/src/pages -type f \( -name "*.tsx" -o -name "*.ts" \) ! -path "*/node_modules/*")
for file in $main_site_pages; do
    update_imports "$file"
done

# Process utils
echo "📂 Processing main-site utils..."
main_site_utils=$(find apps/main-site/src/utils -type f \( -name "*.tsx" -o -name "*.ts" \) ! -path "*/node_modules/*")
for file in $main_site_utils; do
    update_imports "$file"
done

echo "✨ React import fixes complete!"