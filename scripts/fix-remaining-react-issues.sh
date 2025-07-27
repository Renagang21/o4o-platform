#!/bin/bash

# Fix remaining React import issues after the initial cleanup

echo "🔧 Fixing remaining React import issues..."

# Function to fix files that use React global
fix_react_global() {
    local file="$1"
    
    # Check if file uses React. prefix
    if grep -q "React\." "$file"; then
        # Check if React is imported
        if ! grep -q "^import.*React.*from 'react'" "$file"; then
            # Add React import at the beginning
            sed -i "1s/^/import React from 'react';\n/" "$file"
            echo "✅ Added React import to: $file"
        fi
    fi
}

# Function to fix missing type imports
fix_missing_types() {
    local file="$1"
    
    # Check for ErrorInfo usage
    if grep -q "ErrorInfo" "$file" && ! grep -q "import.*ErrorInfo.*from 'react'" "$file"; then
        # Add ErrorInfo to existing React import or create new one
        if grep -q "^import.*from 'react'" "$file"; then
            sed -i "s/from 'react';/ ErrorInfo } from 'react';/" "$file"
            sed -i "s/{ /{ ErrorInfo, /" "$file"
        else
            sed -i "1s/^/import { ErrorInfo } from 'react';\n/" "$file"
        fi
        echo "✅ Added ErrorInfo import to: $file"
    fi
    
    # Check for ComponentType usage
    if grep -q "ComponentType" "$file" && ! grep -q "import.*ComponentType.*from 'react'" "$file"; then
        # Add ComponentType to existing React import or create new one
        if grep -q "^import.*from 'react'" "$file"; then
            sed -i "s/from 'react';/ ComponentType } from 'react';/" "$file"
            sed -i "s/{ /{ ComponentType, /" "$file"
        else
            sed -i "1s/^/import { ComponentType } from 'react';\n/" "$file"
        fi
        echo "✅ Added ComponentType import to: $file"
    fi
}

# Function to remove completely unused imports from the imports line
remove_unused_from_line() {
    local file="$1"
    local import_line=$(grep -E "^import.*from 'react'" "$file" | head -1)
    
    if [[ -z "$import_line" ]]; then
        return
    fi
    
    # Extract the imports between { }
    local imports=$(echo "$import_line" | sed -n 's/.*{ \(.*\) }.*/\1/p')
    if [[ -z "$imports" ]]; then
        return
    fi
    
    # Split imports into array
    IFS=', ' read -ra IMPORT_ARRAY <<< "$imports"
    
    local needed_imports=""
    
    for import in "${IMPORT_ARRAY[@]}"; do
        # Skip empty entries
        if [[ -z "$import" ]]; then
            continue
        fi
        
        # Check if this import is actually used (excluding the import line itself)
        if grep -v "^import" "$file" | grep -q "\b$import\b"; then
            if [[ -n "$needed_imports" ]]; then
                needed_imports="$needed_imports, $import"
            else
                needed_imports="$import"
            fi
        fi
    done
    
    if [[ -z "$needed_imports" ]]; then
        # No imports needed, remove the line
        sed -i "/^import.*from 'react'/d" "$file"
        echo "✅ Removed unused React import from: $file"
    else
        # Update the import line with only needed imports
        sed -i "s/^import.*from 'react'.*/import { $needed_imports } from 'react';/" "$file"
        echo "✅ Cleaned React imports in: $file"
    fi
}

# Fix specific files with React global usage
echo "📂 Fixing React global usage..."
fix_react_global "apps/admin-dashboard/src/components/DraggableWidget.tsx"
fix_react_global "apps/admin-dashboard/src/components/layout/AdminSidebar.tsx"
fix_react_global "apps/admin-dashboard/src/components/media/MediaLibrary.tsx"
fix_react_global "apps/admin-dashboard/src/components/template/TemplateBuilder.tsx"
fix_react_global "apps/admin-dashboard/src/pages/content/ACFFieldGroupForm.tsx"
fix_react_global "apps/admin-dashboard/src/pages/content/PostForm.tsx"
fix_react_global "apps/admin-dashboard/src/pages/ecommerce/ProductForm.tsx"

# Fix missing type imports
echo "📂 Fixing missing type imports..."
fix_missing_types "apps/admin-dashboard/src/components/ErrorBoundary.tsx"
fix_missing_types "apps/admin-dashboard/src/components/acf/FieldTypeSelector.tsx"

# Clean up specific files with many unused imports
echo "📂 Cleaning up files with unused imports..."

# Files that don't use any React imports
files_with_no_react=(
    "apps/admin-dashboard/src/hooks/useCurrentPath.ts"
    "apps/admin-dashboard/src/lib/url-utils.ts"
    "apps/admin-dashboard/src/pages/users-backup/PendingUsers.tsx"
    "apps/admin-dashboard/src/pages/users-backup/Roles.tsx"
    "apps/admin-dashboard/src/pages/users-backup/UserDetail.tsx"
    "apps/admin-dashboard/src/pages/users-backup/Users.tsx"
    "apps/admin-dashboard/src/pages/users-backup/components/UserFilters.tsx"
    "apps/admin-dashboard/src/pages/users-backup/components/UserTable.tsx"
)

for file in "${files_with_no_react[@]}"; do
    if [[ -f "$file" ]]; then
        # Remove any React import line
        sed -i "/^import.*from 'react'/d" "$file"
        echo "✅ Removed React imports from: $file"
    fi
done

# Now clean up all files to remove unused imports from the import line
echo "📂 Final cleanup of unused imports..."
files=$(find apps/admin-dashboard/src -type f \( -name "*.tsx" -o -name "*.ts" \) ! -path "*/node_modules/*")

for file in $files; do
    remove_unused_from_line "$file"
done

echo "✨ React import fixes complete!"