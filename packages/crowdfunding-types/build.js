#!/usr/bin/env node

import { mkdir, copyFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function build() {
  console.log('Building @o4o/crowdfunding-types...');
  
  // Create dist directory
  await mkdir(join(__dirname, 'dist'), { recursive: true });
  
  // Copy TypeScript files as-is (since this is a types-only package)
  const files = ['index.ts', 'project.ts', 'reward.ts', 'backer.ts', 'campaign.ts'];
  
  for (const file of files) {
    await copyFile(
      join(__dirname, 'src', file),
      join(__dirname, 'dist', file)
    );
  }
  
  // Create package.json for dist
  const pkgJson = {
    name: '@o4o/crowdfunding-types',
    version: '1.0.0',
    types: './index.ts',
    dependencies: {
      '@o4o/types': 'file:../../types'
    }
  };
  
  await writeFile(
    join(__dirname, 'dist', 'package.json'),
    JSON.stringify(pkgJson, null, 2)
  );
  
  console.log('Build complete!');
}

build().catch(console.error);