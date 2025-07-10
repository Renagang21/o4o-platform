// Manual build script to work around I/O errors
const fs = require('fs');
const path = require('path');

console.log('Starting manual build process...');

// Create dist directory structure
const dirs = [
  'dist',
  'dist/middleware',
  'dist/services',
  'dist/types'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Copy TypeScript files as JavaScript (simplified transpilation)
const files = [
  { src: 'src/index.ts', dest: 'dist/index.js' },
  { src: 'src/middleware/auth.ts', dest: 'dist/middleware/auth.js' },
  { src: 'src/middleware/index.ts', dest: 'dist/middleware/index.js' },
  { src: 'src/services/realtimeFeedbackService.ts', dest: 'dist/services/realtimeFeedbackService.js' },
  { src: 'src/types/auth.ts', dest: 'dist/types/auth.js' },
  { src: 'src/types/index.ts', dest: 'dist/types/index.js' }
];

let successCount = 0;
files.forEach(({ src, dest }) => {
  try {
    if (fs.existsSync(src)) {
      // For this workaround, we'll just copy the files
      // In a real scenario, you'd use the TypeScript compiler API
      const content = fs.readFileSync(src, 'utf8');
      
      // Basic transformation: remove type annotations (simplified)
      const jsContent = content
        .replace(/: \w+(\[\])?/g, '') // Remove simple type annotations
        .replace(/export interface.*?}/gs, '') // Remove interfaces
        .replace(/import.*?from\s+['"](.*?)['"]/g, "const $1 = require('$1')") // Convert imports
        .replace(/export\s+{/g, 'module.exports = {') // Convert exports
        .replace(/export\s+\*/g, 'module.exports ='); // Convert export *
      
      fs.writeFileSync(dest, jsContent);
      console.log(`✓ Processed: ${src} → ${dest}`);
      successCount++;
    } else {
      console.error(`✗ File not found: ${src}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${src}: ${error.message}`);
  }
});

console.log(`\nBuild complete: ${successCount}/${files.length} files processed successfully`);
console.log('\nNote: This is a workaround build. For production, proper TypeScript compilation is recommended.');