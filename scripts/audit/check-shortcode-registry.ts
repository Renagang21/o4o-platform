#!/usr/bin/env tsx
/**
 * Shortcode Registry Audit Script
 * Scans filesystem for shortcode components and compares with registered shortcodes
 *
 * Usage: npx tsx scripts/audit/check-shortcode-registry.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import naming utilities
import { toShortcodeName, fileNameToShortcodeName } from '../../packages/shortcodes/src/utils/shortcodeNaming.js';

interface ShortcodeFile {
  filePath: string;
  fileName: string;
  expectedName: string;
}

interface RegistryEntry {
  name: string;
  source: string;
}

interface NamingMismatch {
  file: string;
  expected: string;
  actual?: string;
  reason: string;
}

interface AuditReport {
  timestamp: string;
  foundComponents: ShortcodeFile[];
  registeredShortcodes: RegistryEntry[];
  missingInRegistry: ShortcodeFile[];
  danglingRegistryEntries: RegistryEntry[];
  namingMismatches: NamingMismatch[];
  summary: {
    totalFiles: number;
    totalRegistered: number;
    totalMissing: number;
    totalDangling: number;
    totalMismatches: number;
  };
}

/**
 * Recursively find files in a directory
 */
function findFilesRecursive(dir: string, pattern: RegExp, exclude: RegExp[]): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip excluded patterns
    if (exclude.some(regex => regex.test(filePath))) {
      continue;
    }

    if (stat.isDirectory()) {
      results.push(...findFilesRecursive(filePath, pattern, exclude));
    } else if (pattern.test(file)) {
      results.push(filePath);
    }
  }

  return results;
}

/**
 * Find all shortcode component files in the project
 */
function findShortcodeFiles(): ShortcodeFile[] {
  const projectRoot = path.join(__dirname, '../..');

  const searchDirs = [
    path.join(projectRoot, 'apps/main-site/src/components/shortcodes'),
    path.join(projectRoot, 'apps/admin-dashboard/src/components/shortcodes'),
    path.join(projectRoot, 'packages/shortcodes/src'),
  ];

  const pattern = /\.(ts|tsx)$/;
  const exclude = [
    /\.test\.(ts|tsx)$/,
    /\.spec\.(ts|tsx)$/,
    /__tests__/,
    /\/dist\//,
    /\/node_modules\//,
    /\/types\.ts$/,
    /\/utils\.ts$/,
    /\/helpers\.ts$/,
    /\/index\.ts$/,
    /\/provider\.tsx$/,
    /\/renderer\.ts$/,
    /\/parser\.ts$/,
    /\/registry\.ts$/,
    /\/ShortcodeRenderer\.tsx$/,
    /\/ShortcodeErrorBoundary\.tsx$/,
    /\/cache\.ts$/,
    /\/api-service\.ts$/,
    /\/components\.tsx$/,
    /\/meta-field\.tsx$/,
    /\/acf-field\.tsx$/,
    /\/cpt-field\.tsx$/,
    /\/cpt-list\.tsx$/,
    /\/metaApi\.ts$/,
    /\/PresetShortcode\.tsx$/,
    /\/TemplateRenderer\.ts$/,
    /\/helpers\//,
  ];

  const allFiles: ShortcodeFile[] = [];

  for (const dir of searchDirs) {
    const files = findFilesRecursive(dir, pattern, exclude);

    for (const filePath of files) {
      const fileName = path.basename(filePath);

      // Skip utility and helper files by name patterns
      if (
        fileName.includes('utils') ||
        fileName.includes('helpers') ||
        fileName.includes('types')
      ) {
        continue;
      }

      const expectedName = fileNameToShortcodeName(fileName);

      allFiles.push({
        filePath,
        fileName,
        expectedName,
      });
    }
  }

  return allFiles;
}

/**
 * Extract registered shortcode names from registration files
 */
function findRegisteredShortcodes(): RegistryEntry[] {
  const projectRoot = path.join(__dirname, '../..');
  const registrations: RegistryEntry[] = [];

  // Check main-site shortcode definitions
  const mainSiteShortcodesDir = path.join(
    projectRoot,
    'apps/main-site/src/components/shortcodes'
  );

  const indexFiles = findFilesRecursive(
    mainSiteShortcodesDir,
    /index\.ts$/,
    []
  );

  for (const indexFile of indexFiles) {
    const content = fs.readFileSync(indexFile, 'utf-8');

    // Extract from export array pattern: export const xxxShortcodes = [...]
    const arrayExportPattern = /export const (\w+Shortcodes)\s*=\s*\[([^\]]+)\]/gs;
    const matches = content.matchAll(arrayExportPattern);

    for (const match of matches) {
      const arrayName = match[1];
      const arrayContent = match[2];

      // Extract shortcode variable names
      const shortcodeNames = arrayContent.match(/\w+Shortcode/g) || [];

      for (const varName of shortcodeNames) {
        // Convert variable name to shortcode name
        const shortcodeName = toShortcodeName(varName);
        registrations.push({
          name: shortcodeName,
          source: `${path.relative(projectRoot, indexFile)} (${arrayName})`,
        });
      }
    }
  }

  // Check packages/shortcodes registration files
  const packagesShortcodesDir = path.join(
    projectRoot,
    'packages/shortcodes/src'
  );

  const packageIndexFiles = findFilesRecursive(
    packagesShortcodesDir,
    /index\.ts$/,
    []
  );

  for (const indexFile of packageIndexFiles) {
    const content = fs.readFileSync(indexFile, 'utf-8');

    // Extract from registerShortcode({ name: 'xxx' }) pattern
    const registerPattern = /registerShortcode\s*\(\s*\{\s*name:\s*['"]([^'"]+)['"]/g;
    const matches = content.matchAll(registerPattern);

    for (const match of matches) {
      const shortcodeName = match[1];
      registrations.push({
        name: shortcodeName,
        source: path.relative(projectRoot, indexFile),
      });
    }
  }

  // Check admin-dashboard AI registry
  const aiRegistryPath = path.join(
    projectRoot,
    'apps/admin-dashboard/src/services/ai/shortcode-registry.ts'
  );

  if (fs.existsSync(aiRegistryPath)) {
    const content = fs.readFileSync(aiRegistryPath, 'utf-8');

    // Extract object keys from registry objects
    const registryPattern = /export const \w+Shortcodes:\s*Record<string,\s*ShortcodeConfig>\s*=\s*\{([^}]+)\}/gs;
    const matches = content.matchAll(registryPattern);

    for (const match of matches) {
      const objectContent = match[1];

      // Extract keys (shortcode names)
      const keyPattern = /['"]([^'"]+)['"]\s*:/g;
      const keyMatches = objectContent.matchAll(keyPattern);

      for (const keyMatch of keyMatches) {
        const shortcodeName = keyMatch[1];
        registrations.push({
          name: shortcodeName,
          source: 'apps/admin-dashboard/src/services/ai/shortcode-registry.ts',
        });
      }
    }
  }

  return registrations;
}

/**
 * Compare found files with registered shortcodes
 */
function analyzeRegistry(
  files: ShortcodeFile[],
  registered: RegistryEntry[]
): {
  missing: ShortcodeFile[];
  dangling: RegistryEntry[];
  mismatches: NamingMismatch[];
} {
  const registeredNames = new Set(registered.map(r => r.name));
  const fileNames = new Map(files.map(f => [f.expectedName, f]));

  const missing: ShortcodeFile[] = [];
  const dangling: RegistryEntry[] = [];
  const mismatches: NamingMismatch[] = [];

  // Find missing registrations
  for (const file of files) {
    if (!registeredNames.has(file.expectedName)) {
      missing.push(file);
    }
  }

  // Find dangling registrations
  for (const reg of registered) {
    if (!fileNames.has(reg.name)) {
      dangling.push(reg);
    }
  }

  return { missing, dangling, mismatches };
}

/**
 * Generate audit report
 */
function generateReport(): AuditReport {
  console.log('🔍 Scanning shortcode files...');
  const files = findShortcodeFiles();
  console.log(`   Found ${files.length} shortcode component files`);

  console.log('📋 Extracting registered shortcodes...');
  const registered = findRegisteredShortcodes();
  console.log(`   Found ${registered.length} registered shortcodes`);

  console.log('🔬 Analyzing registry...');
  const { missing, dangling, mismatches } = analyzeRegistry(files, registered);

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    foundComponents: files,
    registeredShortcodes: registered,
    missingInRegistry: missing,
    danglingRegistryEntries: dangling,
    namingMismatches: mismatches,
    summary: {
      totalFiles: files.length,
      totalRegistered: registered.length,
      totalMissing: missing.length,
      totalDangling: dangling.length,
      totalMismatches: mismatches.length,
    },
  };

  return report;
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('═══════════════════════════════════════════════');
    console.log('  Shortcode Registry Integrity Check');
    console.log('═══════════════════════════════════════════════\n');

    const report = generateReport();

    // Save report to JSON
    const reportPath = path.join(__dirname, 'shortcode-registry-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Report saved to: ${reportPath}`);

    // Print summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════');
    console.log(`Total component files:     ${report.summary.totalFiles}`);
    console.log(`Total registered:          ${report.summary.totalRegistered}`);
    console.log(`Missing in registry:       ${report.summary.totalMissing}`);
    console.log(`Dangling registry entries: ${report.summary.totalDangling}`);
    console.log(`Naming mismatches:         ${report.summary.totalMismatches}`);

    // Print missing registrations
    if (report.missingInRegistry.length > 0) {
      console.log('\n⚠️  Missing Registrations:');
      for (const file of report.missingInRegistry) {
        console.log(`   - ${file.fileName} → ${file.expectedName}`);
      }
    }

    // Print dangling entries
    if (report.danglingRegistryEntries.length > 0) {
      console.log('\n⚠️  Dangling Registry Entries (no file found):');
      for (const entry of report.danglingRegistryEntries) {
        console.log(`   - ${entry.name} (from ${entry.source})`);
      }
    }

    console.log('\n═══════════════════════════════════════════════\n');

    // Exit with error if issues found
    if (report.summary.totalMissing > 0 || report.summary.totalDangling > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during audit:', error);
    process.exit(1);
  }
}

// Run if executed directly
main();

export { generateReport };
