#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== CI Environment Diagnosis ===\n');

// Check Node version
console.log('Node Version:', process.version);
console.log('NPM Version:', execSync('npm --version').toString().trim());

// Check working directory
console.log('Current Working Directory:', process.cwd());

// Check if running in CI
console.log('CI Environment:', process.env.CI ? 'Yes' : 'No');
console.log('GitHub Actions:', process.env.GITHUB_ACTIONS ? 'Yes' : 'No');

// Check npm workspace setup
console.log('\n=== NPM Workspace Configuration ===');
try {
  const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('Workspaces:', rootPackage.workspaces);
} catch (e) {
  console.error('Failed to read root package.json:', e.message);
}

// Check symlinks
console.log('\n=== Checking Symlinks ===');
const checkSymlink = (packagePath, name) => {
  const nodeModulesPath = path.join(packagePath, 'node_modules', '@o4o');
  try {
    if (fs.existsSync(nodeModulesPath)) {
      const links = fs.readdirSync(nodeModulesPath);
      console.log(`${name} @o4o links:`, links);
      links.forEach(link => {
        const linkPath = path.join(nodeModulesPath, link);
        const stats = fs.lstatSync(linkPath);
        if (stats.isSymbolicLink()) {
          const target = fs.readlinkSync(linkPath);
          console.log(`  - ${link} -> ${target}`);
        }
      });
    } else {
      console.log(`${name}: No @o4o directory in node_modules`);
    }
  } catch (e) {
    console.error(`${name} error:`, e.message);
  }
};

checkSymlink('.', 'Root');
checkSymlink('./apps/api-server', 'API Server');
checkSymlink('./apps/main-site', 'Main Site');
checkSymlink('./apps/admin-dashboard', 'Admin Dashboard');

// Check if packages are built
console.log('\n=== Package Build Status ===');
const packages = ['types', 'utils', 'ui', 'auth-client', 'auth-context'];
packages.forEach(pkg => {
  // Use absolute path from original cwd or relative if already in subdirectory
  const packagesDir = process.cwd().includes('api-server') ? '../../packages' : './packages';
  const distPath = path.join(packagesDir, pkg, 'dist');
  const exists = fs.existsSync(distPath);
  console.log(`${pkg}/dist:`, exists ? 'EXISTS' : 'MISSING');
  if (exists) {
    const files = fs.readdirSync(distPath);
    console.log(`  Files: ${files.length} (${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''})`);
  }
});

// Check TypeScript resolution
console.log('\n=== TypeScript Resolution Test ===');
const originalCwd = process.cwd();
const apiServerPath = path.join(originalCwd, 'apps/api-server');
if (fs.existsSync(apiServerPath)) {
  process.chdir(apiServerPath);
} else {
  console.log('Already in api-server directory');
}

try {
  console.log('Running tsc --showConfig from api-server directory...');
  const tsConfig = execSync('npx tsc --showConfig', { encoding: 'utf8' });
  const config = JSON.parse(tsConfig);
  console.log('TypeScript baseUrl:', config.compilerOptions.baseUrl || 'not set');
  console.log('TypeScript paths:', config.compilerOptions.paths || 'not set');
} catch (e) {
  console.error('Failed to get TypeScript config:', e.message);
}

// Test module resolution
console.log('\n=== Module Resolution Test ===');
try {
  const testFile = `
const path = require('path');
const Module = require('module');

// Test resolving @o4o/types
try {
  const typesPath = Module._resolveFilename('@o4o/types', module);
  console.log('@o4o/types resolves to:', typesPath);
} catch (e) {
  console.error('@o4o/types resolution failed:', e.message);
}

// Test resolving @o4o/utils
try {
  const utilsPath = Module._resolveFilename('@o4o/utils', module);
  console.log('@o4o/utils resolves to:', utilsPath);
} catch (e) {
  console.error('@o4o/utils resolution failed:', e.message);
}
`;
  
  fs.writeFileSync('test-resolution.js', testFile);
  const result = execSync('node test-resolution.js', { encoding: 'utf8' });
  console.log(result);
  fs.unlinkSync('test-resolution.js');
} catch (e) {
  console.error('Module resolution test failed:', e.message);
}

console.log('\n=== Diagnosis Complete ===');