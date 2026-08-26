#!/usr/bin/env ts-node
/**
 * Shortcode Registry Consistency Verification
 * Phase P0-D: Ensures SSOT metadata and actual implementations are in sync
 *
 * Checks:
 * 1. SSOT metadata (packages/shortcodes/src/metadata.ts)
 * 2. API Server shortcode registry (uses SSOT)
 * 3. Admin Dashboard shortcode registry (uses SSOT)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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
 * WO-O4O-MAIN-SITE-RESIDUAL-DEPENDENCY-AND-DEAD-SCRIPT-CLEANUP-V1:
 *   `apps/main-site/src/components/shortcodes` 를 스캔하던
 *   `getImplementedShortcodes()` 와 그 결과를 쓰던 `compareShortcodes()` 를 제거했다.
 *
 *   해당 디렉터리는 NextGen ViewRenderer 축과 함께 은퇴했고
 *   (WO-O4O-MAIN-SITE-NEXTGEN-VIEWRENDERER-DOMAIN-CENSUS-AND-RETIREMENT-V1),
 *   그 뒤로 이 경로 검사는 항상 빈 집합을 돌려주어 비교 자체가 건너뛰어졌다.
 *   즉 제거 전에도 **실행되지 않던 코드**다.
 *
 *   은퇴 경로를 다른 살아 있는 디렉터리로 억지로 재연결하지 않는다.
 *   이 스크립트의 활성 검증(SSOT metadata · Admin Dashboard SSOT 사용 여부)은
 *   그대로 유지된다.
 */

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

  // 1. Get SSOT shortcodes (파일 존재 · 개수를 result 에 기록한다)
  getSSOTShortcodes();

  // 2. Check API Server
  getAPIServerShortcodes();

  // 3. Check Admin Dashboard
  getAdminShortcodes();

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
