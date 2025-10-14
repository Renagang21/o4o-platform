#!/usr/bin/env node
/**
 * Update version.json and index.html title with current version before build
 * This ensures browsers will detect new versions and clear cache
 */

const fs = require('fs');
const path = require('path');

// Read package.json to get the semantic version
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const appVersion = packageJson.version;

const versionFilePath = path.join(__dirname, '../public/version.json');
const indexHtmlPath = path.join(__dirname, '../index.html');

// Generate version string from current timestamp
const now = new Date();
const version = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
const buildDate = now.toISOString();

const versionData = {
  version,
  buildDate,
  environment: process.env.NODE_ENV || 'production',
  timestamp: now.getTime()
};

try {
  // Update version.json
  fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
  console.log('✅ version.json updated:', version);
  console.log('   Build date:', buildDate);

  // Update index.html title with package.json version
  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  const titleRegex = /<title>O4O Admin Dashboard v[\d.]+<\/title>/;
  const newTitle = `<title>O4O Admin Dashboard v${appVersion}</title>`;

  if (titleRegex.test(indexHtml)) {
    indexHtml = indexHtml.replace(titleRegex, newTitle);
    fs.writeFileSync(indexHtmlPath, indexHtml, 'utf-8');
    console.log('✅ index.html title updated to v' + appVersion);
  } else {
    console.warn('⚠️  Could not find title tag in index.html');
  }
} catch (error) {
  console.error('❌ Failed to update files:', error);
  process.exit(1);
}
