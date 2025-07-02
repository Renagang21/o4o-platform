#!/usr/bin/env node

/**
 * Folder Structure Migration Script
 * Phase 2 Stage 1-1: services -> apps, shared -> packages
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Migration mapping
const pathMigrationMap = {
  '@shared/components/ui': '@o4o/ui',
  '@shared/components/admin': '@o4o/ui/admin', 
  '@shared/components/editor': '@o4o/ui/editor',
  '@shared/components/dropshipping': '@o4o/ui/dropshipping',
  '@shared/components/healthcare': '@o4o/ui/healthcare',
  '@shared/components/theme': '@o4o/ui/theme',
  '@shared/components': '@o4o/ui',
  '@shared/lib': '@o4o/lib',
  '@shared/types': '@o4o/types',
  '@shared/hooks': '@o4o/hooks',
  '@shared': '@o4o/ui',
  '@o4o/shared': '@o4o/ui'
};

// Step 1: Rename folders
function renameFolders() {
  console.log('📁 Step 1: Renaming folders...');
  
  try {
    // Rename services to apps
    if (fs.existsSync('services')) {
      fs.renameSync('services', 'apps');
      console.log('✅ Renamed services -> apps');
    }
    
    // Rename shared to packages
    if (fs.existsSync('shared')) {
      fs.renameSync('shared', 'packages');
      console.log('✅ Renamed shared -> packages');
    }
    
    // Create new package structure
    const packagesDir = 'packages';
    const newStructure = ['ui', 'lib', 'types', 'config', 'tsconfig'];
    
    newStructure.forEach(dir => {
      const dirPath = path.join(packagesDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created ${dirPath}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error renaming folders:', error);
    process.exit(1);
  }
}

// Step 2: Move files to new structure
function restructurePackages() {
  console.log('\n📦 Step 2: Restructuring packages...');
  
  try {
    // Move components to packages/ui
    if (fs.existsSync('packages/components')) {
      const componentsPath = 'packages/components';
      const uiPath = 'packages/ui';
      
      // Move all component folders
      const componentDirs = fs.readdirSync(componentsPath);
      componentDirs.forEach(dir => {
        const srcPath = path.join(componentsPath, dir);
        const destPath = path.join(uiPath, dir);
        
        if (fs.statSync(srcPath).isDirectory()) {
          fs.renameSync(srcPath, destPath);
          console.log(`✅ Moved ${dir} to ui package`);
        }
      });
    }
    
    // Move lib files
    if (fs.existsSync('packages/lib')) {
      console.log('✅ lib package already exists');
    }
    
    // Move types
    if (fs.existsSync('packages/types')) {
      console.log('✅ types package already exists');
    }
    
  } catch (error) {
    console.error('❌ Error restructuring packages:', error);
    process.exit(1);
  }
}

// Step 3: Update package.json files
function updatePackageJsonFiles() {
  console.log('\n📝 Step 3: Updating package.json files...');
  
  try {
    // Update root package.json
    const rootPackageJsonPath = 'package.json';
    const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
    
    if (rootPackageJson.workspaces) {
      rootPackageJson.workspaces = rootPackageJson.workspaces.map(workspace => 
        workspace.replace('services/', 'apps/').replace('shared', 'packages/*')
      );
      
      fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));
      console.log('✅ Updated root package.json workspaces');
    }
    
    // Update app package.json files
    const appsDir = 'apps';
    if (fs.existsSync(appsDir)) {
      const apps = fs.readdirSync(appsDir).filter(dir => 
        fs.statSync(path.join(appsDir, dir)).isDirectory()
      );
      
      apps.forEach(app => {
        const packageJsonPath = path.join(appsDir, app, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          
          // Update dependencies
          if (packageJson.dependencies) {
            if (packageJson.dependencies['@o4o/shared']) {
              delete packageJson.dependencies['@o4o/shared'];
              packageJson.dependencies['@o4o/ui'] = 'workspace:*';
              packageJson.dependencies['@o4o/lib'] = 'workspace:*';
              packageJson.dependencies['@o4o/types'] = 'workspace:*';
            }
          }
          
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
          console.log(`✅ Updated ${app}/package.json`);
        }
      });
    }
    
    // Create package.json for new packages
    const packages = [
      { name: '@o4o/ui', path: 'packages/ui' },
      { name: '@o4o/lib', path: 'packages/lib' },
      { name: '@o4o/types', path: 'packages/types' },
      { name: '@o4o/config', path: 'packages/config' },
      { name: '@o4o/tsconfig', path: 'packages/tsconfig' }
    ];
    
    packages.forEach(({ name, path: pkgPath }) => {
      const packageJsonPath = path.join(pkgPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        const packageJson = {
          name,
          version: '1.0.0',
          main: 'index.js',
          types: 'index.d.ts',
          dependencies: {},
          peerDependencies: {
            react: '^19.1.0',
            'react-dom': '^19.1.0'
          }
        };
        
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log(`✅ Created ${name}/package.json`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating package.json files:', error);
    process.exit(1);
  }
}

// Step 4: Update import paths in all TypeScript/JavaScript files
function updateImportPaths() {
  console.log('\n🔄 Step 4: Updating import paths...');
  
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  let filesUpdated = 0;
  
  function processFile(filePath) {
    const ext = path.extname(filePath);
    if (!extensions.includes(ext)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Update import paths
    Object.entries(pathMigrationMap).forEach(([oldPath, newPath]) => {
      const importRegex = new RegExp(`from ['"]${oldPath}`, 'g');
      const importRegex2 = new RegExp(`import\\(['"]${oldPath}`, 'g');
      
      if (content.match(importRegex) || content.match(importRegex2)) {
        content = content.replace(importRegex, `from '${newPath}`);
        content = content.replace(importRegex2, `import('${newPath}`);
        hasChanges = true;
      }
    });
    
    // Update relative imports from apps to packages
    if (filePath.includes('/apps/')) {
      const relativeImportRegex = /from ['"]\.\.\/\.\.\/shared\//g;
      if (content.match(relativeImportRegex)) {
        content = content.replace(relativeImportRegex, "from '@o4o/ui/");
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      filesUpdated++;
    }
  }
  
  function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules') && !file.startsWith('.')) {
        processDirectory(filePath);
      } else if (stat.isFile()) {
        processFile(filePath);
      }
    });
  }
  
  // Process all apps
  if (fs.existsSync('apps')) {
    processDirectory('apps');
  }
  
  console.log(`✅ Updated import paths in ${filesUpdated} files`);
}

// Step 5: Update TypeScript configs
function updateTsConfigs() {
  console.log('\n⚙️ Step 5: Updating TypeScript configs...');
  
  try {
    // Update root tsconfig
    const rootTsConfigPath = 'tsconfig.json';
    if (fs.existsSync(rootTsConfigPath)) {
      const tsConfig = JSON.parse(fs.readFileSync(rootTsConfigPath, 'utf8'));
      
      if (tsConfig.compilerOptions && tsConfig.compilerOptions.paths) {
        // Update paths
        const newPaths = {};
        Object.entries(tsConfig.compilerOptions.paths).forEach(([key, value]) => {
          if (key.includes('@shared')) {
            const newKey = key.replace('@shared', '@o4o/ui');
            newPaths[newKey] = value.map(v => v.replace('shared/', 'packages/ui/'));
          } else {
            newPaths[key] = value;
          }
        });
        
        // Add new package paths
        newPaths['@o4o/ui/*'] = ['packages/ui/*'];
        newPaths['@o4o/lib/*'] = ['packages/lib/*'];
        newPaths['@o4o/types/*'] = ['packages/types/*'];
        newPaths['@o4o/config/*'] = ['packages/config/*'];
        
        tsConfig.compilerOptions.paths = newPaths;
        
        fs.writeFileSync(rootTsConfigPath, JSON.stringify(tsConfig, null, 2));
        console.log('✅ Updated root tsconfig.json');
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating TypeScript configs:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting folder structure migration...\n');
  
  // Check if we're in the right directory
  if (!fs.existsSync('package.json') || !fs.existsSync('services')) {
    console.error('❌ Please run this script from the project root directory');
    process.exit(1);
  }
  
  // Create backup
  console.log('💾 Creating backup...');
  execSync('git add -A && git commit -m "backup: before folder structure migration" || true');
  
  // Execute migration steps
  renameFolders();
  restructurePackages();
  updatePackageJsonFiles();
  updateImportPaths();
  updateTsConfigs();
  
  console.log('\n✅ Migration completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Run "npm install" to update dependencies');
  console.log('2. Test each app with "npm run build"');
  console.log('3. Commit changes if everything works');
}

// Run the migration
main().catch(console.error);