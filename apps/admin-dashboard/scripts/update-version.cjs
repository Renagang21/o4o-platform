#!/usr/bin/env node
/**
 * Update version.json with current timestamp before build
 * This ensures browsers will detect new versions and clear cache
 */

const fs = require('fs');
const path = require('path');

const versionFilePath = path.join(__dirname, '../public/version.json');

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
  fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
  console.log('✅ version.json updated:', version);
  console.log('   Build date:', buildDate);
} catch (error) {
  console.error('❌ Failed to update version.json:', error);
  process.exit(1);
}
