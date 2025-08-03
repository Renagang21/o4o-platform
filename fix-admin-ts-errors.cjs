#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix specific TypeScript errors in admin-dashboard
const fixes = [
  // Fix unused imports in edit.tsx
  {
    file: 'apps/admin-dashboard/src/blocks/cpt-acf-loop/edit.tsx',
    fixes: [
      {
        find: /interface PostType\s*{[\s\S]*?}\s*interface Post\s*{[\s\S]*?}\s*/g,
        replace: ''
      }
    ]
  },
  // Fix icon errors in edit.tsx
  {
    file: 'apps/admin-dashboard/src/blocks/cpt-acf-loop/edit.tsx',
    fixes: [
      {
        find: /icon:\s*icon(?![\w])/g,
        replace: 'icon: undefined'
      }
    ]
  },
  // Fix Component import in ContentTemplates.tsx
  {
    file: 'apps/admin-dashboard/src/components/editor/ContentTemplates.tsx',
    fixes: [
      {
        find: "import { Component, useState } from 'react'",
        replace: "import { useState } from 'react'"
      },
      {
        find: 'ComponentType',
        replace: 'React.ComponentType'
      }
    ]
  },
  // Fix save property errors
  {
    file: 'apps/admin-dashboard/src/blocks/ecommerce/product-card/save.tsx',
    fixes: [
      {
        find: 'export default productCardBlock.save',
        replace: 'export default productCardBlock.save || (() => null)'
      }
    ]
  },
  {
    file: 'apps/admin-dashboard/src/blocks/ecommerce/product-filter/save.tsx',
    fixes: [
      {
        find: 'export default productFilterBlock.save',
        replace: 'export default productFilterBlock.save || (() => null)'
      }
    ]
  },
  // Fix slider.tsx MouseEvent type errors
  {
    file: 'apps/admin-dashboard/src/components/ui/slider.tsx',
    fixes: [
      {
        find: /const handleMouseMove = \(e: MouseEvent\)/g,
        replace: 'const handleMouseMove = (e: globalThis.MouseEvent)'
      },
      {
        find: /const handleMouseUp = \(e: MouseEvent\)/g,
        replace: 'const handleMouseUp = (e: globalThis.MouseEvent)'
      }
    ]
  },
  // Fix utils.ts filter errors
  {
    file: 'apps/admin-dashboard/src/blocks/cpt-acf-loop/utils.ts',
    fixes: [
      {
        find: /.filter\(type => type\.viewable\)/g,
        replace: '.filter((type: any) => type.viewable)'
      }
    ]
  },
  // Fix Pagination ref type
  {
    file: 'apps/admin-dashboard/src/blocks/cpt-acf-loop/components/Pagination.tsx',
    fixes: [
      {
        find: 'const observerTarget = useRef<HTMLDivElement>(null);',
        replace: 'const observerTarget = useRef<HTMLDivElement | null>(null);'
      }
    ]
  },
  // Fix MediaLibrary type error
  {
    file: 'apps/admin-dashboard/src/components/media/MediaLibrary.tsx',
    fixes: [
      {
        find: "type: 'image',",
        replace: "type: 'image' as const,"
      }
    ]
  },
  // Fix FolderManager type errors
  {
    file: 'apps/admin-dashboard/src/components/media/FolderManager.tsx',
    fixes: [
      {
        find: /parentId: selectedFolder\s*\?\s*selectedFolder\.id\s*:\s*undefined,/g,
        replace: "parentId: selectedFolder?.id || '',"
      }
    ]
  },
  // Fix TemplateLibrary filter type
  {
    file: 'apps/admin-dashboard/src/components/template/TemplateLibrary.tsx',
    fixes: [
      {
        find: 'const [filters, setFilters] = useState({})',
        replace: 'const [filters, setFilters] = useState<{ category?: string; free?: boolean }>({})'
      }
    ]
  },
  // Fix UserRoleChangeModal type errors
  {
    file: 'apps/admin-dashboard/src/components/users/UserRoleChangeModal.tsx',
    fixes: [
      {
        find: 'setSelectedRole(e.target.value)',
        replace: 'setSelectedRole(e.target.value as UserRole)'
      },
      {
        find: /roleDescriptions\[selectedRole\]/g,
        replace: 'roleDescriptions[selectedRole as keyof typeof roleDescriptions]'
      }
    ]
  }
];

// Apply fixes
let totalFixed = 0;

fixes.forEach(({ file, fixes: fileFixes }) => {
  const filePath = file.startsWith('/') ? file : path.join('/home/user/o4o-platform', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  fileFixes.forEach(({ find, replace }) => {
    const before = content;
    if (typeof find === 'string') {
      content = content.replace(find, replace);
    } else {
      content = content.replace(find, replace);
    }
    if (before !== content) {
      changed = true;
      totalFixed++;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${file}`);
  }
});

console.log(`\nTotal fixes applied: ${totalFixed}`);