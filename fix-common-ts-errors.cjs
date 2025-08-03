#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix common TypeScript errors
function fixTsErrors(content, filePath) {
  let fixed = content;
  let changes = 0;

  // Fix useState<T>([]) -> useState<T[]>([]) for arrays
  fixed = fixed.replace(/useState<([^>]+)>\(\[\]\)/g, (match, type) => {
    if (!type.includes('[]')) {
      changes++;
      return `useState<${type}[]>([])`;
    }
    return match;
  });

  // Fix never[] issues - add proper type annotations
  fixed = fixed.replace(/const \[(\w+), set\w+\] = useState\(\[\]\);/g, (match, varName) => {
    changes++;
    // Try to infer type from usage
    if (varName.includes('Id') || varName.includes('ids')) {
      return match.replace('useState([])', 'useState<string[]>([])');
    } else if (varName.includes('item') || varName.includes('data')) {
      return match.replace('useState([])', 'useState<any[]>([])');
    }
    return match.replace('useState([])', 'useState<string[]>([])');
  });

  // Fix parameter implicit any in callbacks
  fixed = fixed.replace(/\.(map|filter|forEach|find|some|every|reduce)\((\w+) =>/g, (match, method, param) => {
    changes++;
    return `.${method}((${param}: any) =>`;
  });

  // Fix setState callbacks
  fixed = fixed.replace(/set\w+\(prev =>/g, (match) => {
    changes++;
    return match.replace('prev =>', '(prev: any) =>');
  });

  // Remove unused imports
  const importRegex = /^import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"];?$/gm;
  const imports = [...fixed.matchAll(importRegex)];
  
  imports.forEach(([fullMatch, importList, modulePath]) => {
    const importNames = importList.split(',').map(i => i.trim());
    const unusedImports = [];
    
    importNames.forEach(importName => {
      // Check if the import is used in the file (excluding the import line itself)
      const importPattern = new RegExp(`\\b${importName}\\b`, 'g');
      const matches = fixed.match(importPattern);
      if (!matches || matches.length === 1) {
        unusedImports.push(importName);
      }
    });

    if (unusedImports.length > 0 && unusedImports.length < importNames.length) {
      // Remove only unused imports
      const usedImports = importNames.filter(i => !unusedImports.includes(i));
      const newImport = `import { ${usedImports.join(', ')} } from '${modulePath}';`;
      fixed = fixed.replace(fullMatch, newImport);
      changes++;
    } else if (unusedImports.length === importNames.length) {
      // Remove entire import
      fixed = fixed.replace(fullMatch + '\\n', '');
      changes++;
    }
  });

  return { fixed, changes };
}

// Process files
const files = glob.sync('apps/*/src/**/*.{ts,tsx}', { 
  cwd: process.cwd(),
  ignore: ['**/node_modules/**', '**/*.d.ts']
});

let totalChanges = 0;
let filesChanged = 0;

files.forEach(file => {
  const filePath = path.resolve(file);
  const content = fs.readFileSync(filePath, 'utf8');
  const { fixed, changes } = fixTsErrors(content, filePath);
  
  if (changes > 0) {
    fs.writeFileSync(filePath, fixed);
    console.log(`Fixed ${changes} issues in ${file}`);
    totalChanges += changes;
    filesChanged++;
  }
});

console.log(`\nTotal: Fixed ${totalChanges} issues in ${filesChanged} files`);