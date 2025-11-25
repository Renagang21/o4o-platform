#!/usr/bin/env ts-node
/**
 * Shortcode Registry Consistency Verification
 * Phase P0-D: Ensures SSOT metadata and actual implementations are in sync
 *
 * Checks:
 * 1. SSOT metadata (packages/shortcodes/src/metadata.ts)
 * 2. Main-site shortcode components (apps/main-site/src/components/shortcodes)
 * 3. API Server shortcode registry (uses SSOT)
 * 4. Admin Dashboard shortcode registry (uses SSOT)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

interface VerificationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

const result: VerificationResult = {
  success: true,
  errors: [],
  warnings: [],
  info: []
};

/**
 * Get shortcode names from SSOT metadata
 */
function getSSOTShortcodes(): Set<string> {
  const metadataPath = path.resolve(__dirname, '../packages/shortcodes/src/metadata.ts');

  if (!fs.existsSync(metadataPath)) {
    result.errors.push(`❌ SSOT metadata file not found: ${metadataPath}`);
    return new Set();
  }

  const content = fs.readFileSync(metadataPath, 'utf-8');

  // Extract shortcode names from metadata array
  const shortcodeNames = new Set<string>();
  const nameRegex = /name:\s*['"]([^'"]+)['"]/g;
  let match;

  while ((match = nameRegex.exec(content)) !== null) {
    shortcodeNames.add(match[1]);
  }

  result.info.push(`📋 Found ${shortcodeNames.size} shortcodes in SSOT metadata`);
  return shortcodeNames;
}

/**
 * Get implemented shortcode components from main-site
 */
async function getImplementedShortcodes(): Promise<Set<string>> {
  const shortcodesDir = path.resolve(__dirname, '../apps/main-site/src/components/shortcodes');

  if (!fs.existsSync(shortcodesDir)) {
    result.warnings.push(`⚠️  Main-site shortcodes directory not found: ${shortcodesDir}`);
    return new Set();
  }

  // Find all .tsx files in shortcodes directory
  const files = await glob('**/*.tsx', { cwd: shortcodesDir });

  const implementedShortcodes = new Set<string>();

  for (const file of files) {
    const filePath = path.join(shortcodesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Look for shortcode name patterns:
    // 1. export const ProductShortcode = ... (component name)
    // 2. registerShortcode('product', ...) (explicit registration)

    const componentMatch = content.match(/export\s+(?:const|function)\s+(\w+Shortcode)/);
    const registerMatch = content.match(/registerShortcode\(['"]([^'"]+)['"]/);

    if (registerMatch) {
      implementedShortcodes.add(registerMatch[1]);
    } else if (componentMatch) {
      // Convert ProductShortcode -> product (snake_case convention)
      const name = componentMatch[1]
        .replace(/Shortcode$/, '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
      implementedShortcodes.add(name);
    }
  }

  result.info.push(`📦 Found ${implementedShortcodes.size} implemented shortcode components`);
  return implementedShortcodes;
}

/**
 * Get shortcodes used in API Server (should be using SSOT now)
 */
function getAPIServerShortcodes(): Set<string> {
  const servicePath = path.resolve(__dirname, '../apps/api-server/src/services/shortcode-registry.service.ts');

  if (!fs.existsSync(servicePath)) {
    result.warnings.push(`⚠️  API Server shortcode service not found: ${servicePath}`);
    return new Set();
  }

  const content = fs.readFileSync(servicePath, 'utf-8');

  // Check if it's using SSOT (Phase P0-B)
  if (content.includes('from \'@o4o/shortcodes\'') && content.includes('shortcodeMetadata')) {
    result.info.push(`✅ API Server is using SSOT metadata (@o4o/shortcodes)`);
    return new Set(); // No need to extract, it's using SSOT
  } else {
    result.warnings.push(`⚠️  API Server may not be using SSOT metadata properly`);
    return new Set();
  }
}

/**
 * Get shortcodes used in Admin Dashboard (should be using SSOT now)
 */
function getAdminShortcodes(): Set<string> {
  const registryPath = path.resolve(__dirname, '../apps/admin-dashboard/src/services/ai/shortcode-registry.ts');

  if (!fs.existsSync(registryPath)) {
    result.warnings.push(`⚠️  Admin Dashboard shortcode registry not found: ${registryPath}`);
    return new Set();
  }

  const content = fs.readFileSync(registryPath, 'utf-8');

  // Check if it's using SSOT (Phase P0-B)
  if (content.includes('from \'@o4o/shortcodes\'') && content.includes('shortcodeMetadata')) {
    result.info.push(`✅ Admin Dashboard is using SSOT metadata (@o4o/shortcodes)`);
    return new Set(); // No need to extract, it's using SSOT
  } else {
    result.warnings.push(`⚠️  Admin Dashboard may not be using SSOT metadata properly`);
    return new Set();
  }
}

/**
 * Compare sets and find inconsistencies
 */
function compareShortcodes(ssot: Set<string>, implemented: Set<string>) {
  // Check for shortcodes in SSOT but not implemented
  const missingImplementations: string[] = [];
  for (const name of ssot) {
    if (!implemented.has(name)) {
      missingImplementations.push(name);
    }
  }

  // Check for implementations not in SSOT
  const extraImplementations: string[] = [];
  for (const name of implemented) {
    if (!ssot.has(name)) {
      extraImplementations.push(name);
    }
  }

  if (missingImplementations.length > 0) {
    result.errors.push(
      `❌ Shortcodes in SSOT but NOT implemented:\n   ${missingImplementations.join(', ')}`
    );
    result.success = false;
  }

  if (extraImplementations.length > 0) {
    result.warnings.push(
      `⚠️  Shortcodes implemented but NOT in SSOT:\n   ${extraImplementations.join(', ')}`
    );
  }

  if (missingImplementations.length === 0 && extraImplementations.length === 0) {
    result.info.push(`✅ All SSOT shortcodes have implementations`);
    result.info.push(`✅ All implementations are in SSOT`);
  }
}

/**
 * Print verification results
 */
function printResults() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║   Shortcode Registry Consistency Verification (P0-D)  ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Info messages
  if (result.info.length > 0) {
    result.info.forEach(msg => console.log(`${colors.blue}${msg}${colors.reset}`));
    console.log();
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log(`${colors.yellow}⚠️  WARNINGS:${colors.reset}`);
    result.warnings.forEach(msg => console.log(`${colors.yellow}${msg}${colors.reset}`));
    console.log();
  }

  // Errors
  if (result.errors.length > 0) {
    console.log(`${colors.red}❌ ERRORS:${colors.reset}`);
    result.errors.forEach(msg => console.log(`${colors.red}${msg}${colors.reset}`));
    console.log();
  }

  // Final result
  if (result.success) {
    console.log(`${colors.green}✅ VERIFICATION PASSED${colors.reset}\n`);
  } else {
    console.log(`${colors.red}❌ VERIFICATION FAILED${colors.reset}\n`);
    console.log(`${colors.red}Please fix the errors above to ensure registry consistency.${colors.reset}\n`);
  }
}

/**
 * Main verification function
 */
async function verify() {
  console.log('Starting shortcode registry verification...\n');

  // 1. Get SSOT shortcodes
  const ssotShortcodes = getSSOTShortcodes();

  // 2. Get implemented shortcodes
  const implementedShortcodes = await getImplementedShortcodes();

  // 3. Check API Server
  getAPIServerShortcodes();

  // 4. Check Admin Dashboard
  getAdminShortcodes();

  // 5. Compare SSOT vs implementations
  if (ssotShortcodes.size > 0 && implementedShortcodes.size > 0) {
    compareShortcodes(ssotShortcodes, implementedShortcodes);
  }

  // Print results
  printResults();

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run verification
verify().catch((error) => {
  console.error(`${colors.red}Fatal error during verification:${colors.reset}`, error);
  process.exit(1);
});
