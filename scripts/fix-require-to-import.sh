#!/bin/bash
# Fix require() usage to ES6 imports

echo "🔧 Fixing require() usage to ES6 imports..."
echo "=========================================="

# Find all files using require()
find . -name "*.ts" -o -name "*.tsx" | grep -E "(apps|packages)" | grep -v node_modules | while read file; do
  if grep -q "require(" "$file"; then
    echo "Processing: $file"
    
    # Replace const { x } = require('y') with import { x } from 'y'
    sed -i.bak "s/const { \(.*\) } = require('\(.*\)')/import { \1 } from '\2'/g" "$file"
    
    # Replace const x = require('y') with import x from 'y'
    sed -i.bak "s/const \([a-zA-Z_][a-zA-Z0-9_]*\) = require('\(.*\)')/import \1 from '\2'/g" "$file"
    
    # Special case for inline require like require('crypto').createHash
    sed -i.bak "s/require('crypto')\.createHash/crypto.createHash/g" "$file"
    
    # Add import crypto if needed
    if grep -q "crypto\.createHash" "$file" && ! grep -q "import.*crypto" "$file"; then
      sed -i.bak "1s/^/import * as crypto from 'crypto';\n/" "$file"
    fi
    
    echo "  ✓ Fixed: $file"
  fi
done

# Clean up backup files
find . -name "*.bak" -delete

echo ""
echo "✅ require() usage fixed!"