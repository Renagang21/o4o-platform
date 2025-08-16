#!/bin/bash

echo "🔧 Fixing interface syntax errors..."

cd /home/user/o4o-platform/apps/admin-dashboard

# Fix interface definitions with escaped _isOpen
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  # Fix interface property definitions
  sed -i 's/_\\_isOpen:/_isOpen:/g' "$file"
  sed -i 's/\\_isOpen:/_isOpen:/g' "$file"
  sed -i 's/\\_isOpen}/_isOpen}/g' "$file"
  sed -i 's/{ \\_isOpen,/{ _isOpen,/g' "$file"
  sed -i 's/{\\_isOpen,/{_isOpen,/g' "$file"
  sed -i 's/\\_isOpen =/{ _isOpen =/g' "$file"
  
  # Fix template literal references
  sed -i 's/\${\\/_isOpen}/\${_isOpen}/g' "$file"
  sed -i 's/{\\/_isOpen}/{_isOpen}/g' "$file"
done

echo "✅ Interface syntax errors fixed!"