#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix specific TypeScript errors in digital-signage app
const fixes = [
  {
    file: '/home/user/o4o-platform/apps/digital-signage/src/pages/ContentSearchManager.tsx',
    fixes: [
      // Remove unused interface
      { from: /interface SearchOptions[\s\S]*?\n}/g, to: '' }
    ]
  },
  {
    file: '/home/user/o4o-platform/apps/digital-signage/src/pages/EnhancedSignageDashboard.tsx',
    fixes: [
      // Remove unused interface
      { from: /interface SignageContent[\s\S]*?\n}/g, to: '' }
    ]
  },
  {
    file: '/home/user/o4o-platform/apps/digital-signage/src/pages/SignageContent.tsx',
    fixes: [
      // Remove unused interface
      { from: /interface ContentFilters[\s\S]*?\n}/g, to: '' },
      // Add types to map parameters
      { from: /\.map\(\(tag, index\) =>/g, to: '.map((tag: string, index: number) =>' }
    ]
  },
  {
    file: '/home/user/o4o-platform/apps/digital-signage/src/pages/SignageEditor.tsx',
    fixes: [
      // Fix schedule.days type
      { from: /days: \[\]/g, to: 'days: [] as string[]' },
      // Fix content.id reference
      { from: /\{content\.id \?/g, to: '{(content as any).id ?' },
      { from: /`\/signage\/\$\{content\.id\}\/display`/g, to: '`/signage/${(content as any).id || "new"}/display`' }
    ]
  }
];

let totalFixed = 0;

fixes.forEach(({ file, fixes: fileFixes }) => {
  try {
    if (!fs.existsSync(file)) {
      console.log(`⏭️  File not found: ${file}`);
      return;
    }

    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    fileFixes.forEach(({ from, to }) => {
      const newContent = content.replace(from, to);
      if (newContent !== content) {
        content = newContent;
        changed = true;
        totalFixed++;
      }
    });

    if (changed) {
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed ${file}`);
    }
  } catch (err) {
    console.error(`❌ Error processing ${file}:`, err.message);
  }
});

console.log(`\nTotal fixes applied: ${totalFixed}`);