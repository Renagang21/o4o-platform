#!/bin/bash

# Remove console.log statements from frontend apps
# Excludes test files and keeps only necessary error logging

echo "🧹 Removing console.log statements from frontend apps..."

# Define apps to clean
APPS=("admin-dashboard" "main-site" "ecommerce" "crowdfunding" "forum" "digital-signage")

for APP in "${APPS[@]}"; do
  echo "📦 Processing $APP..."
  
  # Find all TypeScript/React files excluding tests
  FILES=$(find "apps/$APP/src" \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "*/test/*" \
    ! -path "*/__tests__/*" \
    ! -name "*.test.*" \
    ! -name "*.spec.*" \
    -type f 2>/dev/null)
  
  for FILE in $FILES; do
    if grep -q "console\." "$FILE"; then
      # Remove or comment out console statements
      sed -i.bak \
        -e "s/^\s*console\.log.*$/    \/\/ Removed console.log/g" \
        -e "s/^\s*console\.warn.*$/    \/\/ Removed console.warn/g" \
        -e "s/^\s*console\.error.*$/    \/\/ Error logging - use proper error handler/g" \
        -e "s/^\s*console\.info.*$/    \/\/ Removed console.info/g" \
        "$FILE"
      
      # Check if file was modified
      if ! diff -q "$FILE" "$FILE.bak" > /dev/null; then
        echo "  ✅ Cleaned: ${FILE#apps/$APP/}"
        rm "$FILE.bak"
      else
        rm "$FILE.bak"
      fi
    fi
  done
done

echo "✨ Console.log cleanup complete!"

# Show summary
echo ""
echo "📊 Summary:"
for APP in "${APPS[@]}"; do
  COUNT=$(grep -r "console\." "apps/$APP/src" --include="*.ts" --include="*.tsx" \
    --exclude-dir="test" --exclude-dir="__tests__" \
    --exclude="*.test.*" --exclude="*.spec.*" 2>/dev/null | wc -l)
  echo "  $APP: $COUNT console statements remaining"
done