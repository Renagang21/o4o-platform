#!/usr/bin/env node

import { mkdir, copyFile, writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function build() {
  console.log('Building @o4o/crowdfunding-types...');
  
  // Create dist directory
  await mkdir(join(__dirname, 'dist'), { recursive: true });
  
  // Copy TypeScript files as .d.ts files (since this is a types-only package)
  const files = ['index.ts', 'project.ts', 'reward.ts', 'backer.ts', 'campaign.ts'];
  
  for (const file of files) {
    const content = await readFile(join(__dirname, 'src', file), 'utf-8');
    // Change extension to .d.ts
    const dtsFile = file.replace('.ts', '.d.ts');
    await writeFile(
      join(__dirname, 'dist', dtsFile),
      content
    );
    
    // Also copy as .ts for compatibility
    await copyFile(
      join(__dirname, 'src', file),
      join(__dirname, 'dist', file)
    );
  }
  
  // Create package.json for dist
  const pkgJson = {
    name: '@o4o/crowdfunding-types',
    version: '1.0.0',
    types: './index.d.ts',
    main: './index.js',
    dependencies: {
      '@o4o/types': 'file:../../types'
    }
  };
  
  // Create a simple index.js that exports the types
  const indexJs = `// This is a types-only package
export {};
`;
  
  await writeFile(
    join(__dirname, 'dist', 'index.js'),
    indexJs
  );
  
  await writeFile(
    join(__dirname, 'dist', 'package.json'),
    JSON.stringify(pkgJson, null, 2)
  );
  
  console.log('Build complete!');
}

build().catch(console.error);