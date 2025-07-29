#!/bin/bash

echo "Fixing all remaining type issues in admin-dashboard..."

# Fix all affiliate components
sed -i '1s/^.*import.*FC.*react.*/import { FC } from '\''react'\'';/' apps/admin-dashboard/src/components/affiliate/*.tsx

# Fix all editor components
sed -i '1s/^.*import.*FC.*react.*/import { FC } from '\''react'\'';/' apps/admin-dashboard/src/components/editor/*.tsx

# Fix all forms components
sed -i '1s/^.*import.*FC.*react.*/import { FC } from '\''react'\'';/' apps/admin-dashboard/src/components/forms/*.tsx

# Fix all template components
sed -i '1s/^.*import.*FC.*react.*/import { FC } from '\''react'\'';/' apps/admin-dashboard/src/components/template/*.tsx

# Fix all vendor components
sed -i '1s/^.*import.*FC.*react.*/import { FC } from '\''react'\'';/' apps/admin-dashboard/src/components/vendor/*.tsx

# Fix all widget components
sed -i '1s/^.*import.*FC.*react.*/import { FC } from '\''react'\'';/' apps/admin-dashboard/src/components/widget/*.tsx

# Fix all pages components
find apps/admin-dashboard/src/pages -name "*.tsx" -type f | while read file; do
  if ! grep -q "import.*{.*FC.*}" "$file" && grep -q ": FC" "$file"; then
    # Check if there's already a react import
    if grep -q "^import.*from ['\"]react['\"]" "$file"; then
      # Add FC to existing import
      sed -i '0,/^import.*from ['"'"'"]react['"'"'"]/s/import \(.*\) from ['"'"'"]react['"'"'"]/import \1, { FC } from '"'"'react'"'"'/' "$file"
    else
      # Add new import at the beginning
      sed -i '1s/^/import { FC } from '"'"'react'"'"';\n/' "$file"
    fi
  fi
done

# Fix MediaDetails.tsx specific issues
sed -i 's/React\.//' apps/admin-dashboard/src/components/media/MediaDetails.tsx

# Fix template/BlockEditor.tsx SpacingControl type
cat >> apps/admin-dashboard/src/components/template/BlockEditor.tsx << 'EOF'

interface SpacingValue {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}
EOF

# Fix specific type annotation issues
# Fix VideoCopyButton size/variant in ShareButtons
sed -i 's/"sm"/"sm" as const/g' apps/admin-dashboard/src/components/common/ShareButtons.tsx
sed -i 's/"icon"/"icon" as const/g' apps/admin-dashboard/src/components/common/ShareButtons.tsx
sed -i 's/"outline"/"outline" as const/g' apps/admin-dashboard/src/components/common/ShareButtons.tsx
sed -i 's/"ghost"/"ghost" as const/g' apps/admin-dashboard/src/components/common/ShareButtons.tsx

# Fix AtAGlance component data type
sed -i '/const.*data.*=.*{}/s/{}/{ posts: 0, pages: 0, comments: 0, users: 0, products: 0, orders: 0 }/' apps/admin-dashboard/src/pages/dashboard/components/AtAGlance.tsx

# Fix ActivityFeed never type
sed -i 's/Property.*type.*does not exist on type.*never/any/g' apps/admin-dashboard/src/pages/dashboard/components/ActivityFeed/index.tsx

echo "Type fixes complete!"