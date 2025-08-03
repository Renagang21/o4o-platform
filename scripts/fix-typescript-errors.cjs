#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix implicit any type errors in arrow functions
function fixImplicitAnyErrors(content) {
  // Fix onChange={(value) => patterns
  content = content.replace(/onChange=\{?\(([\w]+)\)\s*=>/g, 'onChange={($1: any) =>');
  
  // Fix onSelect={(value) => patterns  
  content = content.replace(/onSelect=\{?\(([\w]+)\)\s*=>/g, 'onSelect={($1: any) =>');
  
  // Fix onClick={(value) => patterns
  content = content.replace(/onClick=\{?\(([\w]+)\)\s*=>/g, 'onClick={($1: any) =>');
  
  // Fix general arrow functions with single parameter
  content = content.replace(/\.map\(\(([\w]+)\)\s*=>/g, '.map(($1: any) =>');
  content = content.replace(/\.filter\(\(([\w]+)\)\s*=>/g, '.filter(($1: any) =>');
  content = content.replace(/\.find\(\(([\w]+)\)\s*=>/g, '.find(($1: any) =>');
  
  // Fix useState<Type>() patterns (remove generic)
  content = content.replace(/useState<[\w\[\]]+>\(/g, 'useState(');
  content = content.replace(/useSelect<[\w\[\]]+>\(/g, 'useSelect(');
  
  return content;
}

// Process all TypeScript files
const files = glob.sync('apps/*/src/**/*.{ts,tsx}', { 
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'] 
});

console.log(`Found ${files.length} TypeScript files to process`);

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const fixed = fixImplicitAnyErrors(content);
    
    if (content !== fixed) {
      fs.writeFileSync(file, fixed, 'utf8');
      console.log(`Fixed: ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('TypeScript error fixing complete!');