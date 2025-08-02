const fs = require('fs');
const path = require('path');

console.log('=== CI/CD Diagnostics ===');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Helper function to check if path exists using modern pattern
const pathExists = async (filePath) => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// Synchronous version for compatibility
const pathExistsSync = (filePath) => {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
};

// Check workspace structure
console.log('\n=== Workspace Structure ===');
const workspaces = ['apps', 'packages'];
workspaces.forEach(ws => {
  const wsPath = path.join(process.cwd(), ws);
  console.log(`${ws}:`, pathExistsSync(wsPath) ? '✓ exists' : '✗ missing');
});

console.log('\n=== Checking Symlinks ===');
const checkSymlink = (packagePath, name) => {
  const nodeModulesPath = path.join(packagePath, 'node_modules', '@o4o');
  try {
    if (pathExistsSync(nodeModulesPath)) {
      const links = fs.readdirSync(nodeModulesPath);
      console.log(`${name} @o4o links:`, links);
      links.forEach(link => {
        const linkPath = path.join(nodeModulesPath, link);
        const stats = fs.lstatSync(linkPath);
        console.log(`  - ${link}:`, stats.isSymbolicLink() ? 'symlink ✓' : 'not symlink ✗');
      });
    } else {
      console.log(`${name}: no @o4o directory`);
    }
  } catch (error) {
    console.log(`${name}: Error checking symlinks:`, error.message);
  }
};

// Check packages
console.log('\n=== Package Builds ===');
const packages = ['types', 'utils', 'ui', 'auth-client', 'auth-context'];
packages.forEach(pkg => {
  const pkgPath = path.join(process.cwd(), 'packages', pkg);
  const distPath = path.join(pkgPath, 'dist');
  const exists = pathExistsSync(distPath);
  console.log(`@o4o/${pkg}/dist:`, exists ? '✓ built' : '✗ not built');
});

// Check apps
console.log('\n=== App Dependencies ===');
const apps = ['api-server', 'main-site', 'admin-dashboard'];
apps.forEach(app => {
  const appPath = path.join(process.cwd(), 'apps', app);
  checkSymlink(appPath, app);
});

// API Server specific checks
const apiServerPath = path.join(process.cwd(), 'apps', 'api-server');
if (pathExistsSync(apiServerPath)) {
  console.log('\n=== API Server Details ===');
  const srcPath = path.join(apiServerPath, 'src');
  const mainPath = path.join(srcPath, 'main.ts');
  console.log('src directory:', pathExistsSync(srcPath) ? '✓' : '✗');
  console.log('main.ts:', pathExistsSync(mainPath) ? '✓' : '✗');
}

// Environment
console.log('\n=== Environment Variables ===');
const envVars = ['NODE_ENV', 'CI', 'GITHUB_ACTIONS'];
envVars.forEach(env => {
  console.log(`${env}:`, process.env[env] || 'not set');
});