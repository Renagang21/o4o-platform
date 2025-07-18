#!/usr/bin/env node
// Custom build script for auth-context to ensure dependencies are resolved

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🔨 Building @o4o/auth-context...');

// Check if auth-client is built
const authClientDist = join(__dirname, '../auth-client/dist');
if (!existsSync(authClientDist)) {
  console.error('❌ Error: @o4o/auth-client must be built first!');
  console.log('   Run: npm run build:auth-client');
  process.exit(1);
}

// Check if types is built
const typesDist = join(__dirname, '../types/dist');
if (!existsSync(typesDist)) {
  console.error('❌ Error: @o4o/types must be built first!');
  console.log('   Run: npm run build:types');
  process.exit(1);
}

console.log('✅ Dependencies verified');

// Run TypeScript compiler
try {
  console.log('📦 Compiling TypeScript...');
  execSync('tsc', { 
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}