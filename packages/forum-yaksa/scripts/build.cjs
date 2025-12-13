/**
 * Cross-platform build script for forum-yaksa
 * Works on both Windows and Linux/macOS
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

// Clean dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Create dist directories
const dirs = [
  'dist',
  'dist/backend',
  'dist/backend/entities',
  'dist/backend/services'
];

dirs.forEach(dir => {
  const fullPath = path.join(rootDir, dir);
  fs.mkdirSync(fullPath, { recursive: true });
});

// Copy files helper
function copyIfExists(srcPattern, destDir) {
  const srcDirectory = path.dirname(srcPattern);
  const pattern = path.basename(srcPattern);

  if (!fs.existsSync(srcDirectory)) {
    return;
  }

  const files = fs.readdirSync(srcDirectory);
  const extensions = ['.js', '.d.ts', '.js.map', '.d.ts.map'];

  files.forEach(file => {
    const isMatch = extensions.some(ext => file.endsWith(ext));
    if (isMatch) {
      const srcPath = path.join(srcDirectory, file);
      const destPath = path.join(destDir, file);
      try {
        fs.copyFileSync(srcPath, destPath);
        console.log(`  Copied: ${file}`);
      } catch (e) {
        // Ignore errors
      }
    }
  });
}

console.log('Building forum-yaksa...');

// Copy root src files
console.log('Copying root files...');
copyIfExists(path.join(srcDir, '*'), distDir);

// Copy backend/entities
console.log('Copying backend/entities...');
copyIfExists(path.join(srcDir, 'backend', 'entities', '*'), path.join(distDir, 'backend', 'entities'));

// Copy backend/services
console.log('Copying backend/services...');
copyIfExists(path.join(srcDir, 'backend', 'services', '*'), path.join(distDir, 'backend', 'services'));

// Create index.js if it doesn't exist (re-export from manifest)
const indexPath = path.join(distDir, 'index.js');
if (!fs.existsSync(indexPath)) {
  const indexContent = `// Auto-generated index
export * from './manifest.js';
`;
  fs.writeFileSync(indexPath, indexContent);
  console.log('  Created: index.js');
}

// Create index.d.ts if it doesn't exist
const indexDtsPath = path.join(distDir, 'index.d.ts');
if (!fs.existsSync(indexDtsPath)) {
  const indexDtsContent = `// Auto-generated type definitions
export * from './manifest';
`;
  fs.writeFileSync(indexDtsPath, indexDtsContent);
  console.log('  Created: index.d.ts');
}

console.log('Build completed!');
