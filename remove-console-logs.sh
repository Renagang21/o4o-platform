#!/bin/bash

# Script to remove all console.log and console.error statements from production code

echo "🔍 Finding and removing console statements..."

# Function to remove console statements from a file
remove_console() {
  local file=$1
  echo "Processing: $file"
  
  # Replace console.log and console.error with comments
  sed -i 's/console\.log(.*);/\/\/ Log removed/g' "$file"
  sed -i 's/console\.error(.*);/\/\/ Error log removed/g' "$file"
  sed -i 's/console\.warn(.*);/\/\/ Warning log removed/g' "$file"
  sed -i 's/console\.info(.*);/\/\/ Info log removed/g' "$file"
  sed -i 's/console\.debug(.*);/\/\/ Debug log removed/g' "$file"
}

# Find all TypeScript/JavaScript files and remove console statements
find ./apps -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
  grep -v node_modules | \
  grep -v ".test." | \
  grep -v ".spec." | \
  while read file; do
    if grep -q "console\." "$file"; then
      remove_console "$file"
    fi
  done

echo "✅ Console statements removed successfully!"
echo "📊 Verification:"

# Verify remaining console statements
remaining=$(grep -r "console\." ./apps --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | \
  grep -v node_modules | \
  grep -v ".test." | \
  grep -v ".spec." | \
  grep -v "//" | \
  wc -l)

if [ "$remaining" -eq 0 ]; then
  echo "✅ No console statements found in production code!"
else
  echo "⚠️ Warning: $remaining console statements still remain"
  grep -r "console\." ./apps --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | \
    grep -v node_modules | \
    grep -v ".test." | \
    grep -v ".spec." | \
    grep -v "//" | \
    head -5
fi