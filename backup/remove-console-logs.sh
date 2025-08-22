#!/bin/bash

# Script to remove all commented console.log statements from TypeScript and TypeScript React files

echo "🧹 Removing commented console.log statements from the codebase..."

# Counter for tracking changes
TOTAL_FILES=0
TOTAL_LINES=0

# Function to remove commented console.log lines from a file
remove_console_logs() {
    local file="$1"
    local temp_file="${file}.tmp"
    
    # Count lines to be removed (for reporting)
    local lines_removed=$(grep -c "^\s*//.*console\.log" "$file" 2>/dev/null || echo 0)
    
    if [ "$lines_removed" -gt 0 ]; then
        # Remove lines that are commented console.log statements
        # This handles various comment formats:
        # - Lines starting with // and containing console.log
        # - Lines with leading whitespace
        sed '/^\s*\/\/.*console\.log/d' "$file" > "$temp_file"
        
        # Replace original file with cleaned version
        mv "$temp_file" "$file"
        
        echo "  ✓ Cleaned $file (removed $lines_removed lines)"
        TOTAL_FILES=$((TOTAL_FILES + 1))
        TOTAL_LINES=$((TOTAL_LINES + lines_removed))
    fi
}

# Process all TypeScript and TypeScript React files in apps directory
echo "Processing files in apps directory..."

# Find all .ts and .tsx files, excluding node_modules and dist directories
find apps -type f \( -name "*.ts" -o -name "*.tsx" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/dist/*" \
    -not -path "*/.next/*" \
    -not -path "*/build/*" | while read -r file; do
    remove_console_logs "$file"
done

echo ""
echo "✨ Cleanup complete!"
echo "   Files modified: $TOTAL_FILES"
echo "   Lines removed: $TOTAL_LINES"

# Verify no console.log statements remain
echo ""
echo "🔍 Verifying cleanup..."

REMAINING=$(grep -r "console\.log" apps/ \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    --exclude-dir=.next \
    --exclude-dir=build 2>/dev/null | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    echo "✅ Success! No console.log statements found in the codebase."
else
    echo "⚠️  Warning: Found $REMAINING console.log statement(s) still remaining."
    echo "   Run the following command to see them:"
    echo "   grep -r 'console\.log' apps/ --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=dist"
fi