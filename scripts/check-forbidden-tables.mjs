#!/usr/bin/env node

/**
 * Forbidden Table Check Script
 *
 * Phase 5-D: O4O 표준 주문 구조 강제 고정
 *
 * ## 목적
 * 금지된 테이블 패턴이 엔티티 파일에 존재하는지 검사합니다.
 *
 * ## 금지 패턴
 * - *_orders (checkout_orders 제외)
 * - *_payments (checkout_payments 제외)
 *
 * ## 사용법
 * ```bash
 * node scripts/check-forbidden-tables.mjs
 * ```
 *
 * ## CI 통합
 * ```yaml
 * - name: Check Forbidden Tables
 *   run: node scripts/check-forbidden-tables.mjs
 * ```
 *
 * @see CLAUDE.md §4 - E-commerce Core 규칙 (금지 테이블) · docs/baseline/E-COMMERCE-ORDER-CONTRACT.md
 * @since Phase 5-D (2026-01-11)
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // 검사 대상 디렉토리
  searchPaths: [
    'apps/api-server/src',
    'packages',
  ],

  // 검사할 파일 패턴
  filePatterns: [
    /\.entity\.ts$/,
    /\.entity\.js$/,
  ],

  // 금지된 테이블 패턴 (정규식)
  forbiddenPatterns: [
    // 서비스별 주문 테이블 (checkout_orders 제외)
    { pattern: /@Entity\s*\(\s*['"`](?!checkout_)(\w+)_orders['"`]\s*\)/, name: '*_orders' },
    // 서비스별 결제 테이블 (checkout_payments 제외)
    { pattern: /@Entity\s*\(\s*['"`](?!checkout_)(\w+)_payments['"`]\s*\)/, name: '*_payments' },
    // 특정 금지 테이블
    { pattern: /@Entity\s*\(\s*['"`]cosmetics_orders['"`]\s*\)/, name: 'cosmetics_orders' },
    { pattern: /@Entity\s*\(\s*['"`]tourism_orders['"`]\s*\)/, name: 'tourism_orders' },
    { pattern: /@Entity\s*\(\s*['"`]glycopharm_orders['"`]\s*\)/, name: 'glycopharm_orders' },
    { pattern: /@Entity\s*\(\s*['"`]yaksa_orders['"`]\s*\)/, name: 'yaksa_orders' },
    { pattern: /@Entity\s*\(\s*['"`]neture_orders['"`]\s*\)/, name: 'neture_orders' },
  ],

  // 허용된 테이블 (예외)
  allowedTables: [
    'checkout_orders',
    'checkout_payments',
  ],

  // 레거시 예외 (Phase 5 이전 코드, 향후 제거 예정)
  legacyExceptions: [
    // ecommerce-core (Phase 5 이전 레거시, checkout으로 대체됨)
    'packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts',
    'packages/ecommerce-core/src/entities/EcommercePayment.entity.ts',
    // pharmaceutical-core (GlycoPharm 레거시, Phase 5-A에서 차단됨)
    'packages/pharmaceutical-core/src/entities/PharmaOrder.entity.ts',
  ],
};

// ============================================================================
// Functions
// ============================================================================

/**
 * 디렉토리를 재귀적으로 탐색하여 파일 목록 반환
 */
async function findFiles(dir, patterns) {
  const results = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // node_modules, dist, .git 제외
        if (!['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
          results.push(...await findFiles(fullPath, patterns));
        }
      } else if (entry.isFile()) {
        // 패턴 매칭
        if (patterns.some(p => p.test(entry.name))) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    // 디렉토리가 없으면 무시
  }

  return results;
}

/**
 * 파일이 레거시 예외 목록에 있는지 확인
 */
function isLegacyException(filePath, projectRoot) {
  const relativePath = relative(projectRoot, filePath).replace(/\\/g, '/');
  return CONFIG.legacyExceptions.some(exception =>
    relativePath === exception || relativePath.endsWith(exception)
  );
}

/**
 * 파일에서 금지 패턴 검사
 */
async function checkFile(filePath, forbiddenPatterns, projectRoot) {
  const violations = [];

  // 레거시 예외 확인
  if (isLegacyException(filePath, projectRoot)) {
    return violations; // 레거시 파일은 검사 스킵
  }

  try {
    const content = await readFile(filePath, 'utf-8');

    for (const { pattern, name } of forbiddenPatterns) {
      const match = content.match(pattern);
      if (match) {
        // 라인 번호 찾기
        const lines = content.split('\n');
        let lineNumber = 0;
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            lineNumber = i + 1;
            break;
          }
        }

        violations.push({
          file: filePath,
          line: lineNumber,
          pattern: name,
          match: match[0].substring(0, 100),
        });
      }
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
  }

  return violations;
}

/**
 * 메인 함수
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 5-D: Forbidden Table Check');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const projectRoot = join(__dirname, '..');
  let allViolations = [];

  // 각 검사 경로 순회
  for (const searchPath of CONFIG.searchPaths) {
    const fullPath = join(projectRoot, searchPath);
    console.log(`Scanning: ${searchPath}`);

    const files = await findFiles(fullPath, CONFIG.filePatterns);
    console.log(`  Found ${files.length} entity files`);

    for (const file of files) {
      const violations = await checkFile(file, CONFIG.forbiddenPatterns, projectRoot);
      allViolations.push(...violations);
    }
  }

  // 레거시 예외 목록 출력
  if (CONFIG.legacyExceptions.length > 0) {
    console.log('⚠️  Legacy exceptions (not checked):');
    CONFIG.legacyExceptions.forEach(e => console.log(`   - ${e}`));
    console.log('');
  }

  console.log('');

  // 결과 출력
  if (allViolations.length === 0) {
    console.log('✅ No forbidden table patterns found!');
    console.log('');
    console.log('Allowed tables:');
    CONFIG.allowedTables.forEach(t => console.log(`  - ${t}`));
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(0);
  } else {
    console.log('❌ VIOLATIONS FOUND!');
    console.log('');
    console.log('The following forbidden table patterns were detected:');
    console.log('');

    for (const v of allViolations) {
      const relativePath = relative(projectRoot, v.file);
      console.log(`  📄 ${relativePath}:${v.line}`);
      console.log(`     Pattern: ${v.pattern}`);
      console.log(`     Match: ${v.match}`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('🚫 Phase 5-D Rule Violation');
    console.log('');
    console.log('Service-specific order/payment tables are FORBIDDEN.');
    console.log('All orders must go through E-commerce Core (checkout_orders).');
    console.log('');
    console.log('See: CLAUDE.md §4 - E-commerce Core 규칙 (금지 테이블)');
    console.log('See: docs/_platform/E-COMMERCE-ORDER-CONTRACT.md');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');

    process.exit(1);
  }
}

// 실행
main().catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});
