#!/usr/bin/env ts-node
/**
 * CPT (Custom Post Type) Registry Consistency Verification
 * Phase P0-D: Ensures CPT schemas and configurations are in sync
 *
 * Checks:
 * 1. CPT schemas in apps/api-server/src/schemas/*.schema.ts
 * 2. CPT registrations in apps/api-server/src/init/cpt.init.ts
 * 3. CPT definitions in configuration files (DEFAULT_CPTS, etc.)
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
 * Get CPT names from schema files
 */
async function getSchemaFiles(): Promise<Set<string>> {
  const schemasDir = path.resolve(__dirname, '../apps/api-server/src/schemas');

  if (!fs.existsSync(schemasDir)) {
    result.errors.push(`❌ Schemas directory not found: ${schemasDir}`);
    return new Set();
  }

  // Find all .schema.ts files
  const files = await glob('*.schema.ts', { cwd: schemasDir });

  const cptNames = new Set<string>();

  for (const file of files) {
    const filePath = path.join(schemasDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Skip non-CPT schema files (e.g., JSON Schema definitions)
    // CPT schemas should have CPTSchema type and registry.register usage
    if (!content.includes('CPTSchema') && !content.includes('FieldDefinition')) {
      continue; // Not a CPT schema file
    }

    // Extract CPT name from schema export
    // Example: export const dsProductSchema: CPTSchema = { name: 'ds_product', ...
    const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);

    if (nameMatch) {
      cptNames.add(nameMatch[1]);
    } else {
      // Try to infer from filename (e.g., ds_product.schema.ts -> ds_product)
      const cptName = file.replace('.schema.ts', '');
      // Only add if it looks like it could be a CPT schema (has export const ...Schema)
      if (content.match(/export const \w+Schema/)) {
        cptNames.add(cptName);
      }
    }
  }

  result.info.push(`📋 Found ${cptNames.size} CPT schema files`);
  return cptNames;
}

/**
 * Get registered CPTs from cpt.init.ts
 */
function getRegisteredCPTs(): Set<string> {
  const initPath = path.resolve(__dirname, '../apps/api-server/src/init/cpt.init.ts');

  if (!fs.existsSync(initPath)) {
    result.warnings.push(`⚠️  CPT init file not found: ${initPath}`);
    return new Set();
  }

  const content = fs.readFileSync(initPath, 'utf-8');
  const cptNames = new Set<string>();

  // Extract schema imports
  // Example: import { dsProductSchema } from '../schemas/ds_product.schema.js';
  const importRegex = /import\s+{\s*(\w+Schema)\s*}\s+from\s+['"]\.\.\/schemas\/([^'"]+)\.schema\.js['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const schemaName = match[1]; // dsProductSchema
    const fileName = match[2]; // ds_product

    // Convert schema name to CPT name
    // dsProductSchema -> ds_product (use filename as more reliable)
    cptNames.add(fileName);
  }

  // Also check the schemas array
  const schemasArrayMatch = content.match(/const schemas = \[([\s\S]*?)\];/);
  if (schemasArrayMatch) {
    const schemasContent = schemasArrayMatch[1];
    const schemaVarRegex = /(\w+Schema)/g;
    let schemaMatch;

    while ((schemaMatch = schemaVarRegex.exec(schemasContent)) !== null) {
      // Convert ProductsSchema -> products, DsProductSchema -> ds_product
      const schemaVar = schemaMatch[1];
      const cptName = schemaVar
        .replace(/Schema$/, '')
        .replace(/([A-Z])/g, (match, p1, offset) => offset > 0 ? '_' + p1.toLowerCase() : p1.toLowerCase());

      cptNames.add(cptName);
    }
  }

  result.info.push(`📦 Found ${cptNames.size} CPTs registered in cpt.init.ts`);
  return cptNames;
}

/**
 * Get CPT definitions from config files
 */
function getConfigCPTs(): Set<string> {
  const configPaths = [
    path.resolve(__dirname, '../apps/api-server/src/config/cpt.config.ts'),
    path.resolve(__dirname, '../apps/api-server/src/config/default-cpts.ts'),
  ];

  const cptNames = new Set<string>();

  for (const configPath of configPaths) {
    if (!fs.existsSync(configPath)) {
      continue;
    }

    const content = fs.readFileSync(configPath, 'utf-8');

    // Look for CPT definitions in various formats
    // DEFAULT_CPTS = ['post', 'page', 'ds_product', ...]
    // DROPSHIPPING_CPT_DEFINITIONS = { ds_product: { ... }, ... }

    // Extract from arrays
    const arrayRegex = /(?:DEFAULT_CPTS|CPT_TYPES)\s*=\s*\[([\s\S]*?)\]/g;
    let arrayMatch;

    while ((arrayMatch = arrayRegex.exec(content)) !== null) {
      const arrayContent = arrayMatch[1];
      const cptRegex = /['"]([^'"]+)['"]/g;
      let cptMatch;

      while ((cptMatch = cptRegex.exec(arrayContent)) !== null) {
        cptNames.add(cptMatch[1]);
      }
    }

    // Extract from object keys
    const objectRegex = /(?:DROPSHIPPING_CPT_DEFINITIONS|CPT_DEFINITIONS)\s*=\s*{([\s\S]*?)}/g;
    let objectMatch;

    while ((objectMatch = objectRegex.exec(content)) !== null) {
      const objectContent = objectMatch[1];
      const keyRegex = /['"]?(\w+)['"]?\s*:/g;
      let keyMatch;

      while ((keyMatch = keyRegex.exec(objectContent)) !== null) {
        const key = keyMatch[1];
        if (key !== 'name' && key !== 'label') { // Skip property names
          cptNames.add(key);
        }
      }
    }
  }

  if (cptNames.size > 0) {
    result.info.push(`📋 Found ${cptNames.size} CPTs in config files`);
  }

  return cptNames;
}

/**
 * Compare sets and find inconsistencies
 */
function compareCPTs(schemas: Set<string>, registered: Set<string>, config: Set<string>) {
  // Check for schemas without registration
  const unregisteredSchemas: string[] = [];
  for (const name of schemas) {
    if (!registered.has(name)) {
      unregisteredSchemas.push(name);
    }
  }

  // Check for registrations without schemas
  const missingSchemas: string[] = [];
  for (const name of registered) {
    if (!schemas.has(name)) {
      missingSchemas.push(name);
    }
  }

  // Check for config CPTs without schemas
  const configWithoutSchemas: string[] = [];
  for (const name of config) {
    if (!schemas.has(name) && !['post', 'page', 'media'].includes(name)) {
      // Skip built-in WordPress types
      configWithoutSchemas.push(name);
    }
  }

  // Report errors
  if (missingSchemas.length > 0) {
    result.errors.push(
      `❌ CPTs registered but NO schema found:\n   ${missingSchemas.join(', ')}\n   Please create schema files for these CPTs`
    );
    result.success = false;
  }

  if (unregisteredSchemas.length > 0) {
    result.errors.push(
      `❌ CPT schemas exist but NOT registered in cpt.init.ts:\n   ${unregisteredSchemas.join(', ')}\n   Please register these schemas in cpt.init.ts`
    );
    result.success = false;
  }

  // Report warnings
  if (configWithoutSchemas.length > 0) {
    result.warnings.push(
      `⚠️  CPTs in config but NO schema:\n   ${configWithoutSchemas.join(', ')}\n   (This is OK for built-in types)`
    );
  }

  // Success case
  if (missingSchemas.length === 0 && unregisteredSchemas.length === 0) {
    result.info.push(`✅ All CPT schemas are properly registered`);
    result.info.push(`✅ All registered CPTs have schemas`);
  }
}

/**
 * Print verification results
 */
function printResults() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║      CPT Registry Consistency Verification (P0-D)     ║${colors.reset}`);
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
    console.log(`${colors.red}Please fix the errors above to ensure CPT registry consistency.${colors.reset}\n`);
  }
}

/**
 * Main verification function
 */
async function verify() {
  console.log('Starting CPT registry verification...\n');

  // 1. Get CPT schemas
  const schemaFiles = await getSchemaFiles();

  // 2. Get registered CPTs
  const registeredCPTs = getRegisteredCPTs();

  // 3. Get config CPTs
  const configCPTs = getConfigCPTs();

  // 4. Compare
  if (schemaFiles.size > 0 || registeredCPTs.size > 0) {
    compareCPTs(schemaFiles, registeredCPTs, configCPTs);
  } else {
    result.warnings.push('⚠️  No CPT schemas or registrations found');
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
