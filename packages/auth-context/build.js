#!/usr/bin/env node
// Custom build script for auth-context to ensure dependencies are resolved

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🔨 Building @o4o/auth-context...');

// Clean previous build
const distPath = join(__dirname, 'dist');
if (existsSync(distPath)) {
  console.log('🧹 Cleaning previous build...');
  rmSync(distPath, { recursive: true, force: true });
}

// Clean TypeScript build info
const tsBuildInfo = join(__dirname, 'tsconfig.tsbuildinfo');
if (existsSync(tsBuildInfo)) {
  rmSync(tsBuildInfo, { force: true });
}

// Check if auth-client is built
const authClientDist = join(__dirname, '../auth-client/dist');
if (!existsSync(authClientDist)) {
  console.warn('⚠️  Warning: @o4o/auth-client dist not found');
  console.log('🔨 Building @o4o/auth-client first...');
  try {
    execSync('npm run build', {
      stdio: 'inherit',
      cwd: join(__dirname, '../auth-client')
    });
  } catch (e) {
    console.warn('⚠️  Could not build auth-client, continuing anyway...');
  }
}

// Check if types is built
const typesDist = join(__dirname, '../types/dist');
if (!existsSync(typesDist)) {
  console.warn('⚠️  Warning: @o4o/types dist not found');
  console.log('🔨 Building @o4o/types first...');
  try {
    execSync('npm run build', {
      stdio: 'inherit',
      cwd: join(__dirname, '../types')
    });
  } catch (e) {
    console.warn('⚠️  Could not build types, continuing anyway...');
  }
}

console.log('✅ Dependencies checked');

// Run TypeScript compiler with force flags
try {
  console.log('📦 Compiling TypeScript...');
  execSync('npx tsc --build --force', { 
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  // Try fallback build without references
  console.log('🔄 Trying fallback build without project references...');
  try {
    execSync('npx tsc --skipLibCheck --noEmitOnError false --noEmit false', {
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log('✅ Fallback build completed!');
  } catch (fallbackError) {
    console.error('❌ Fallback build also failed');
    process.exit(1);
  }
}