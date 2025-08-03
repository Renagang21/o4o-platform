const { execSync } = require('child_process');
const { copyFileSync, mkdirSync, rmSync } = require('fs');
const { join } = require('path');

console.log('Building @o4o/forum-types...');

// Clean dist directory
try {
  rmSync('./dist', { recursive: true, force: true });
} catch (e) {}

// Create dist directory
mkdirSync('./dist', { recursive: true });

// Run TypeScript compiler with specific config
const tscConfig = {
  compilerOptions: {
    outDir: "./dist",
    declaration: true,
    declarationMap: true,
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    moduleResolution: "node",
    noEmit: false,
    isolatedModules: false,
    noResolve: false
  },
  include: ["src/**/*"],
  exclude: ["node_modules", "dist"]
};

// Write temporary tsconfig
const fs = require('fs');
fs.writeFileSync('./tsconfig.build.json', JSON.stringify(tscConfig, null, 2));

try {
  // Run tsc with the temporary config
  execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });
  
  // Copy package.json to dist
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  delete packageJson.scripts;
  delete packageJson.devDependencies;
  fs.writeFileSync('./dist/package.json', JSON.stringify(packageJson, null, 2));
  
  console.log('Build complete!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
} finally {
  // Clean up temporary tsconfig
  try {
    fs.unlinkSync('./tsconfig.build.json');
  } catch (e) {}
}