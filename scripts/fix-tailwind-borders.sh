#!/bin/bash

# Fix Tailwind border utility class issues

echo "Fixing Tailwind border utility classes..."

# Fix triple border classes
find . -name "*.tsx" -o -name "*.css" | xargs sed -i 's/border border border-wp-border-secondary/border border-neutral-300/g'
find . -name "*.tsx" -o -name "*.css" | xargs sed -i 's/border border border-wp-border-primary/border border-neutral-200/g'

# Fix double border classes
find . -name "*.tsx" -o -name "*.css" | xargs sed -i 's/border border-wp-border-secondary/border border-neutral-300/g'
find . -name "*.tsx" -o -name "*.css" | xargs sed -i 's/border border-wp-border-primary/border border-neutral-200/g'

# Fix hover border classes
find . -name "*.tsx" -o -name "*.css" | xargs sed -i 's/hover:border border-wp-border-secondary/hover:border-neutral-300/g'
find . -name "*.tsx" -o -name "*.css" | xargs sed -i 's/hover:border-wp-border-secondary/hover:border-neutral-300/g'

# Fix single border-wp-border-* classes in CSS files
find . -name "*.css" | xargs sed -i 's/@apply border-wp-border-secondary/@apply border-neutral-300/g'
find . -name "*.css" | xargs sed -i 's/@apply border-wp-border-primary/@apply border-neutral-200/g'

# Fix single border-wp-border-* classes in TSX files
find . -name "*.tsx" | xargs sed -i 's/border-wp-border-secondary/border-neutral-300/g'
find . -name "*.tsx" | xargs sed -i 's/border-wp-border-primary/border-neutral-200/g'

echo "Border utility classes fixed!"