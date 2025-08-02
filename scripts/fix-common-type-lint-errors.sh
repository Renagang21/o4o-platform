#!/bin/bash
# Fix common TypeScript and ESLint errors

echo "🔧 Fixing common TypeScript and ESLint errors..."
echo "============================================="

# 1. Remove React namespace imports (React 17+)
echo "1. Removing React namespace imports..."
find . -name "*.tsx" -o -name "*.ts" | grep -E "(apps|packages)" | grep -v node_modules | while read file; do
  if grep -q "^import React" "$file"; then
    # Replace import React, { ... } from 'react' with import { ... } from 'react'
    sed -i.bak 's/^import React, {/import {/g' "$file"
    # Remove standalone import React from 'react'
    sed -i.bak '/^import React from .react.;$/d' "$file"
    echo "  ✓ Fixed: $file"
  fi
done

# 2. Fix any type usage
echo ""
echo "2. Fixing 'any' type usage..."
find . -name "*.ts" -o -name "*.tsx" | grep -E "(apps|packages)" | grep -v node_modules | while read file; do
  # Replace catch (error: any) with catch (error)
  if grep -q "catch (error: any)" "$file"; then
    sed -i.bak 's/catch (error: any)/catch (error)/g' "$file"
    echo "  ✓ Fixed catch blocks in: $file"
  fi
done

# 3. Remove console.log statements (except in test files)
echo ""
echo "3. Removing console.log statements..."
find . -name "*.ts" -o -name "*.tsx" | grep -E "(apps|packages)" | grep -v node_modules | grep -v test | while read file; do
  if grep -q "console\.log" "$file"; then
    # Comment out console.log statements
    sed -i.bak 's/^\([[:space:]]*\)console\.log/\1\/\/ console.log/g' "$file"
    echo "  ✓ Commented console.log in: $file"
  fi
done

# 4. Fix Function type usage
echo ""
echo "4. Fixing generic Function type..."
find . -name "*.ts" -o -name "*.tsx" | grep -E "(apps|packages)" | grep -v node_modules | while read file; do
  if grep -q ": Function" "$file"; then
    # This needs manual review, just report it
    echo "  ⚠️  Function type found in: $file (needs manual review)"
  fi
done

# 5. Clean up backup files
echo ""
echo "5. Cleaning up backup files..."
find . -name "*.bak" -delete

echo ""
echo "✅ Common TypeScript and ESLint errors fixed!"
echo ""
echo "Next steps:"
echo "1. Review Function type usages manually"
echo "2. Run 'npm run type-check' to verify"
echo "3. Run 'npm run lint' to check for remaining issues"