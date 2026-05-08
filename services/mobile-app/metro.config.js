const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// monorepo: watch workspace root so Metro can resolve @o4o/* packages
config.watchFolders = [workspaceRoot];

// monorepo: resolve from both local and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Enable package.json exports field (needed for ESM workspace packages like @o4o/types)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
