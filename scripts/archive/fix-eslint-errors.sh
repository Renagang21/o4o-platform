#!/bin/bash

echo "🔧 Fixing ESLint errors..."

# Fix no-useless-catch errors in affiliate.ts
echo "Fixing apps/admin-dashboard/src/api/affiliate.ts..."
sed -i 's/export async function getAffiliateStats(params: GetAffiliateStatsRequest) {$/export async function getAffiliateStats(params: GetAffiliateStatsRequest) {/g' apps/admin-dashboard/src/api/affiliate.ts
sed -i '/^  try {$/,/^  } catch (error: any) {$/{ /^  try {$/d; /^  } catch (error: any) {$/,/^    throw error;$/d; }' apps/admin-dashboard/src/api/affiliate.ts

# This is complex, let's do it manually for each function
cat > /tmp/fix_affiliate.js << 'EOF'
const fs = require('fs');
const content = fs.readFileSync('apps/admin-dashboard/src/api/affiliate.ts', 'utf8');

// Remove unnecessary try-catch blocks that just re-throw
const fixed = content.replace(/(\s+)try\s*{\n([\s\S]*?)\n\s*}\s*catch\s*\([^)]*\)\s*{\n\s*\/\/[^\n]*\n\s*throw\s+[^;]+;\n\s*}/g, 
  (match, indent, body) => {
    // Just return the body without try-catch
    return body;
  });

fs.writeFileSync('apps/admin-dashboard/src/api/affiliate.ts', fixed);
EOF

node /tmp/fix_affiliate.js

# Fix PageEditor.tsx
echo "Fixing apps/main-site/src/pages/PageEditor.tsx..."
cat > /tmp/fix_pageeditor.js << 'EOF'
const fs = require('fs');
const content = fs.readFileSync('apps/main-site/src/pages/PageEditor.tsx', 'utf8');

const fixed = content.replace(/(\s+)try\s*{\n([\s\S]*?)\n\s*}\s*catch\s*\([^)]*\)\s*{\n\s*throw\s+[^;]+;\n\s*}/g, 
  (match, indent, body) => {
    return body;
  });

fs.writeFileSync('apps/main-site/src/pages/PageEditor.tsx', fixed);
EOF

node /tmp/fix_pageeditor.js

# Fix pageSystem.ts
echo "Fixing apps/main-site/src/utils/pageSystem.ts..."
cat > /tmp/fix_pagesystem.js << 'EOF'
const fs = require('fs');
const content = fs.readFileSync('apps/main-site/src/utils/pageSystem.ts', 'utf8');

const fixed = content.replace(/(\s+)try\s*{\n([\s\S]*?)\n\s*}\s*catch\s*\([^)]*\)\s*{\n\s*throw\s+[^;]+;\n\s*}/g, 
  (match, indent, body) => {
    return body;
  });

fs.writeFileSync('apps/main-site/src/utils/pageSystem.ts', fixed);
EOF

node /tmp/fix_pagesystem.js

# Clean up temp files
rm -f /tmp/fix_*.js

echo "✅ ESLint errors fixed!"