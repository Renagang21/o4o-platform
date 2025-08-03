#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of specific fixes needed based on our analysis
const fixes = [
  {
    file: '/home/user/o4o-platform/apps/admin-dashboard/src/components/users/UserRoleChangeModal.tsx',
    fix: (content) => {
      // Remove duplicate UserRole import
      return content.replace(
        /import { UserRole } from '@o4o\/types';\nimport { Shield, X, Check, Users, AlertTriangle } from 'lucide-react';\nimport { User, UserRole, ROLE_LABELS } from '\.\.\/\.\.\/types\/user';/,
        `import { Shield, X, Check, Users, AlertTriangle } from 'lucide-react';\nimport { User, UserRole, ROLE_LABELS } from '../../types/user';`
      );
    }
  },
  {
    file: '/home/user/o4o-platform/apps/admin-dashboard/src/blocks/cpt-acf-loop/components/TaxonomyFilter.tsx',
    fix: (content) => {
      // Fix availableTaxonomies state type
      return content.replace(
        /const \[availableTaxonomies, setAvailableTaxonomies\] = useState<string\[\]>\(\[\]\);/,
        'const [availableTaxonomies, setAvailableTaxonomies] = useState<Taxonomy[]>([]);'
      );
    }
  },
  {
    file: '/home/user/o4o-platform/apps/admin-dashboard/src/blocks/cpt-acf-loop/components/ACFFieldSelector.tsx',
    fix: (content) => {
      // Fix availableFields state type
      return content.replace(
        /const \[availableFields, setAvailableFields\] = useState<string\[\]>\(\[\]\);/,
        'const [availableFields, setAvailableFields] = useState<ACFField[]>([]);'
      );
    }
  },
  {
    file: '/home/user/o4o-platform/apps/digital-signage/src/pages/SignageContent.tsx',
    fix: (content) => {
      // Fix contents state type
      return content.replace(
        /const \[contents, setContents\] = useState<any\[\]>\(\[\]\);/,
        'const [contents, setContents] = useState<Content[]>([]);'
      );
    }
  }
];

let totalFixed = 0;

fixes.forEach(({ file, fix }) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const fixed = fix(content);
    
    if (fixed !== content) {
      fs.writeFileSync(file, fixed);
      console.log(`✅ Fixed ${file}`);
      totalFixed++;
    } else {
      console.log(`⏭️  No changes needed for ${file}`);
    }
  } catch (err) {
    console.error(`❌ Error processing ${file}:`, err.message);
  }
});

console.log(`\nTotal files fixed: ${totalFixed}`);