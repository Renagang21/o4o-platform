#!/usr/bin/env ts-node
/**
 * Block Registry Consistency Verification
 * Phase P0-D: Ensures SSOT metadata and actual implementations are in sync
 *
 * Checks:
 * 1. SSOT metadata (packages/block-renderer/src/metadata.ts)
 * 2. Admin Dashboard block definitions (apps/admin-dashboard/src/blocks)
 * 3. API Server block registry (uses SSOT)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors
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
 * Get block names from SSOT metadata
 */
function getSSOTBlocks(): Set<string> {
  const metadataPath = path.resolve(__dirname, '../packages/block-renderer/src/metadata.ts');

  if (!fs.existsSync(metadataPath)) {
    result.errors.push(`❌ SSOT metadata file not found: ${metadataPath}`);
    return new Set();
  }

  const content = fs.readFileSync(metadataPath, 'utf-8');

  // Extract block names from metadata array
  const blockNames = new Set<string>();
  const nameRegex = /name:\s*['"]([^'"]+)['"]/g;
  let match;

  while ((match = nameRegex.exec(content)) !== null) {
    blockNames.add(match[1]);
  }

  result.info.push(`📋 Found ${blockNames.size} blocks in SSOT metadata`);
  return blockNames;
}

/**
 * Get implemented block components from admin-dashboard
 */
async function getImplementedBlocks(): Promise<Set<string>> {
  const blocksDir = path.resolve(__dirname, '../apps/admin-dashboard/src/components/editor/blocks');

  if (!fs.existsSync(blocksDir)) {
    result.warnings.push(`⚠️  Admin Dashboard blocks directory not found: ${blocksDir}`);
    return new Set();
  }

  // Find all .tsx files in blocks directory
  const files = await glob('**/*.tsx', { cwd: blocksDir });

  const implementedBlocks = new Set<string>();

  for (const file of files) {
    // Skip backup/old files
    if (file.includes('.old.') || file.includes('.backup.')) {
      continue;
    }

    const filePath = path.join(blocksDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Look for block name patterns:
    // 1. export const ParagraphBlock = ... (component name)
    // 2. name: 'o4o/paragraph' in block definition
    // 3. blockRegistry.register('o4o/paragraph', ...)

    const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
    const registerMatch = content.match(/blockRegistry\.register\(['"]([^'"]+)['"]/);

    if (nameMatch) {
      implementedBlocks.add(nameMatch[1]);
    } else if (registerMatch) {
      implementedBlocks.add(registerMatch[1]);
    } else {
      // Try to infer from filename (e.g., ParagraphBlock.tsx -> o4o/paragraph)
      const fileName = path.basename(file, '.tsx');
      if (fileName.endsWith('Block') && !fileName.includes('Settings') && !fileName.includes('Wrapper')) {
        const blockName = fileName
          .replace(/Block$/, '')
          .replace(/([A-Z])/g, (match, p1, offset) => offset > 0 ? '-' + p1.toLowerCase() : p1.toLowerCase());

        // Only add if it looks like an o4o block
        if (content.includes('o4o/')) {
          implementedBlocks.add(`o4o/${blockName}`);
        }
      }
    }
  }

  result.info.push(`📦 Found ${implementedBlocks.size} implemented block components`);
  return implementedBlocks;
}

/**
 * Get blocks from block registry
 */
async function getBlockRegistryBlocks(): Promise<Set<string>> {
  const registryPath = path.resolve(__dirname, '../apps/admin-dashboard/src/blocks/registry/BlockRegistry.ts');

  if (!fs.existsSync(registryPath)) {
    result.warnings.push(`⚠️  Admin Dashboard block registry not found: ${registryPath}`);
    return new Set();
  }

  const content = fs.readFileSync(registryPath, 'utf-8');
  const blockNames = new Set<string>();

  // Extract registered block names
  const registerRegex = /register\(['"]([^'"]+)['"]/g;
  let match;

  while ((match = registerRegex.exec(content)) !== null) {
    blockNames.add(match[1]);
  }

  result.info.push(`📋 Found ${blockNames.size} blocks in BlockRegistry`);
  return blockNames;
}

/**
 * Get blocks used in API Server (should be using SSOT now)
 */
function getAPIServerBlocks(): Set<string> {
  const servicePath = path.resolve(__dirname, '../apps/api-server/src/services/block-registry.service.ts');

  if (!fs.existsSync(servicePath)) {
    result.warnings.push(`⚠️  API Server block service not found: ${servicePath}`);
    return new Set();
  }

  const content = fs.readFileSync(servicePath, 'utf-8');

  // Check if it's using SSOT (Phase P0-C)
  if (content.includes('from \'@o4o/block-renderer\'') && content.includes('blockMetadata')) {
    result.info.push(`✅ API Server is using SSOT metadata (@o4o/block-renderer)`);
    return new Set(); // No need to extract, it's using SSOT
  } else {
    result.warnings.push(`⚠️  API Server may not be using SSOT metadata properly`);
    return new Set();
  }
}

/**
 * Compare sets and find inconsistencies
 */
function compareBlocks(ssot: Set<string>, implemented: Set<string>, registry: Set<string>) {
  // Check for blocks in SSOT but not implemented
  const missingImplementations: string[] = [];
  for (const name of ssot) {
    if (!implemented.has(name) && !registry.has(name)) {
      missingImplementations.push(name);
    }
  }

  // Check for implementations not in SSOT
  const extraImplementations: string[] = [];
  for (const name of implemented) {
    if (!ssot.has(name) && name.startsWith('o4o/')) {
      extraImplementations.push(name);
    }
  }

  if (missingImplementations.length > 0) {
    result.warnings.push(
      `⚠️  Blocks in SSOT but NOT implemented:\n   ${missingImplementations.join(', ')}\n   (This is OK if they're planned for future implementation)`
    );
  }

  if (extraImplementations.length > 0) {
    result.warnings.push(
      `⚠️  Blocks implemented but NOT in SSOT:\n   ${extraImplementations.join(', ')}\n   (Consider adding to SSOT metadata)`
    );
  }

  if (missingImplementations.length === 0 && extraImplementations.length === 0) {
    result.info.push(`✅ Block SSOT and implementations are in sync`);
  }
}

/**
 * Print verification results
 */
function printResults() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║      Block Registry Consistency Verification (P0-D)   ║${colors.reset}`);
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
  console.log('Starting block registry verification...\n');

  // 1. Get SSOT blocks
  const ssotBlocks = getSSOTBlocks();

  // 2. Get implemented blocks
  const implementedBlocks = await getImplementedBlocks();

  // 3. Get BlockRegistry blocks
  const registryBlocks = await getBlockRegistryBlocks();

  // 4. Check API Server
  getAPIServerBlocks();

  // 5. Compare SSOT vs implementations
  if (ssotBlocks.size > 0) {
    compareBlocks(ssotBlocks, implementedBlocks, registryBlocks);
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
