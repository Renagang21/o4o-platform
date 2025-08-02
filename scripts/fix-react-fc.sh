#!/bin/bash
# Fix React.FC type usage to FC

echo "🔧 Fixing React.FC type usage..."
echo "================================"

# Find all files using React.FC
find . -name "*.tsx" -o -name "*.ts" | grep -E "(apps|packages)" | grep -v node_modules | while read file; do
  if grep -q "React\.FC" "$file"; then
    # First check if FC is already imported
    if grep -q "import.*{.*FC.*}.*from 'react'" "$file"; then
      # FC is already imported, just replace React.FC with FC
      sed -i.bak 's/React\.FC/FC/g' "$file"
    else
      # Need to add FC to imports
      if grep -q "import.*{.*}.*from 'react'" "$file"; then
        # Add FC to existing import
        sed -i.bak "s/import {\(.*\)} from 'react'/import { FC,\1 } from 'react'/g" "$file"
        # Remove duplicate FC if it exists
        sed -i.bak 's/FC, FC/FC/g' "$file"
      else
        # No named imports from react, add new import
        sed -i.bak "1s/^/import { FC } from 'react';\n/" "$file"
      fi
      # Replace React.FC with FC
      sed -i.bak 's/React\.FC/FC/g' "$file"
    fi
    echo "  ✓ Fixed: $file"
  fi
done

# Clean up backup files
find . -name "*.bak" -delete

echo ""
echo "✅ React.FC type usage fixed!"