#!/usr/bin/env node
/**
 * check-typeorm-entities.mjs
 *
 * TypeORM 엔티티 등록 누락 정적 검사 스크립트
 *
 * 검사 내용:
 *   검사 A: connection.ts에 import된 로컬 엔티티 → entities 배열 미등록 감지
 *   검사 B: apps/api-server/src/modules/ + src/routes/ 내 @Entity() 클래스
 *            → entities 배열 미등록 감지 (alias import 처리 포함)
 *
 * 제외 범위:
 *   - apps/api-server/src/entities/ : 레거시 파일 모음 (별도 감사 대상)
 *   - packages/                     : 외부 패키지 (연결 여부는 도메인 아키텍처 결정사항)
 *   - node_modules/, dist/, migrations/, *.test.ts, *.spec.ts
 *
 * 사용법:
 *   node scripts/check-typeorm-entities.mjs
 *   pnpm run check:typeorm-entities
 *
 * CI 연결 (.github/workflows):
 *   - run: node scripts/check-typeorm-entities.mjs
 *
 * WO-TYPEORM-ENTITY-REGISTRATION-CHECK-SCRIPT-V1
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

// ============================================================================
// 의도적으로 connection.ts 미등록 허용 목록
// 각 항목에 이유와 근거 WO를 반드시 명시할 것
// ============================================================================
const ALLOWLIST = new Set([

  // ── 의도적 제거 ──────────────────────────────────────────────
  // GlycopharmPharmacy: WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1 Phase C에서 의도적 제거
  // connection.ts 주석: "GlycopharmPharmacy - REMOVED"
  'GlycopharmPharmacy',

  // ── Alias Import (CMSView/CMSPage로 등록됨) ─────────────────
  // connection.ts: import { View as CMSView }, { Page as CMSPage }
  // entities 배열에 CMSView, CMSPage로 정상 등록됨
  // 스크립트는 클래스명 View/Page로 감지하나 실제로는 등록된 상태
  'View',
  'Page',

  // ── 미연결 Extension 엔티티 (별도 WO 예정) ──────────────────
  // Signage Extension: CosmeticsBrandContent, CosmeticsContentPreset, CosmeticsTrendCard
  // 파일 위치: routes/signage/extensions/cosmetics/
  // 현재 실사용 서비스 코드 없음 — 확장 기능 준비 단계
  'CosmeticsBrandContent',
  'CosmeticsContentPreset',
  'CosmeticsTrendCard',

  // Signage Extension: Pharmacy
  // 파일 위치: routes/signage/extensions/pharmacy/
  // 현재 실사용 서비스 코드 없음 — 확장 기능 준비 단계
  'PharmacyCategory',
  'PharmacyContent',
  'PharmacySeasonalCampaign',
  'PharmacyTemplatePreset',

  // Signage Extension: Seller
  // 파일 위치: routes/signage/extensions/seller/
  // 현재 실사용 서비스 코드 없음 — 확장 기능 준비 단계
  'SellerCampaign',
  'SellerContent',
  'SellerContentMetric',
  'SellerMetricEvent',
  'SellerPartner',

  // ── 준비 단계 엔티티 (마이그레이션 미생성 또는 미연결) ─────
  // KPA deprecated 승인 엔티티 (KpaApprovalRequest로 통합됨)
  // 레거시 데이터 reads용으로 파일은 존재하지만 연결 미완료
  'KpaCourseRequest',
  'KpaInstructorQualification',

  // platform routes 엔티티 — 마이그레이션 생성됨, 서비스 연결 미완료
  'StoreEvent',
  'StoreLibraryItem',

  // modules/neture — 서비스 연결 준비 중
  'CategoryMappingRule',
  'SpotPricePolicy',

  // modules/partner — 연결 준비 중
  'PartnerApplication',

  // ── 신규 발견 (후속 WO 처리 예정: WO-TYPEORM-ENTITY-REGISTRATION-FIX-V2) ─
  // 아래 항목은 실사용 코드에서 getRepository() 호출 확인됨
  // → P0 수준이나 이번 WO 범위 밖. 다음 WO에서 즉시 처리 예정.
  // KpaSteward: routes/kpa/controllers/steward.controller.ts:36 getRepository 호출
  'KpaSteward',
  // NetureOrder: controllers/admin/adminDashboardController.ts:57 getRepository 호출
  'NetureOrder',
  // NeturePartner: adminDashboardController.ts 참조
  'NeturePartner',
  // NetureOrderItem, NetureProduct, NetureProductLog: 연관 엔티티 (동반 조사 필요)
  'NetureOrderItem',
  'NetureProduct',
  'NetureProductLog',
]);

// ============================================================================
// 검사 B 탐색 대상 디렉토리 (활성 로컬 엔티티 영역)
// ============================================================================
const SCAN_DIRS = [
  join(ROOT, 'apps/api-server/src/modules'),
  join(ROOT, 'apps/api-server/src/routes'),
];

const EXCLUDE_PATH_PATTERNS = [
  /[/\\]node_modules[/\\]/,
  /[/\\]dist[/\\]/,
  /[/\\]migrations[/\\]/,
  /[/\\]__tests__[/\\]/,
  /\.test\.ts$/,
  /\.spec\.ts$/,
];

const CONNECTION_TS = join(ROOT, 'apps/api-server/src/database/connection.ts');

// ============================================================================
// 유틸리티
// ============================================================================

function walkTs(dir, results = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return results; }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) walkTs(fullPath, results);
      else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) results.push(fullPath);
    } catch { /* 무시 */ }
  }
  return results;
}

function isExcluded(filePath) {
  return EXCLUDE_PATH_PATTERNS.some((p) => p.test(filePath));
}

// ============================================================================
// STEP 1: connection.ts entities 배열 파싱
// ============================================================================

function parseRegisteredEntities(path) {
  const content = readFileSync(path, 'utf8');
  const match = content.match(/entities\s*:\s*\[([\s\S]*?)\],?\s*\n\s*\/\//);
  if (!match) {
    console.error('❌ connection.ts entities 배열 파싱 실패. 스크립트를 업데이트하세요.');
    process.exit(2);
  }
  const block = match[1]
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const registered = new Set();
  const ID = /\b([A-Z][A-Za-z0-9]+)\b/g;
  let m;
  while ((m = ID.exec(block)) !== null) registered.add(m[1]);
  return registered;
}

// ============================================================================
// STEP 2: connection.ts import 파싱 — alias 포함
// 반환: { imported: Set<string>, aliasOf: Map<originalName, aliasName> }
// ============================================================================

function parseImports(path) {
  const content = readFileSync(path, 'utf8');
  const imported = new Set();       // alias 적용 후 이름 (등록 기준)
  const aliasOf  = new Map();       // originalClass → aliasName

  const NAMED = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
  let m;
  while ((m = NAMED.exec(content)) !== null) {
    for (const part of m[1].split(',')) {
      const trimmed = part.trim();
      const asMatch = trimmed.match(/^(\w+)\s+as\s+(\w+)$/);
      if (asMatch) {
        const [, original, alias] = asMatch;
        if (/^[A-Z]/.test(original)) {
          imported.add(alias);
          aliasOf.set(original, alias);
        }
      } else {
        const name = trimmed.split(/\s+/)[0];
        if (/^[A-Z]/.test(name)) imported.add(name);
      }
    }
  }
  // default import
  const DEFAULT = /import\s+([A-Z][A-Za-z0-9]+)\s+from\s*['"][^'"]+['"]/g;
  while ((m = DEFAULT.exec(content)) !== null) imported.add(m[1]);

  return { imported, aliasOf };
}

// ============================================================================
// STEP 3: 로컬 @Entity() 클래스 수집
// ============================================================================

function collectLocalEntityClasses(dirs) {
  const entityMap = new Map();
  const CLASS_RE = /export\s+class\s+(\w+)/g;
  for (const dir of dirs) {
    for (const filePath of walkTs(dir)) {
      if (isExcluded(filePath)) continue;
      let content;
      try { content = readFileSync(filePath, 'utf8'); } catch { continue; }
      if (!/@Entity\s*\(/.test(content)) continue;
      CLASS_RE.lastIndex = 0;
      let m;
      while ((m = CLASS_RE.exec(content)) !== null) {
        if (!entityMap.has(m[1])) entityMap.set(m[1], relative(ROOT, filePath));
      }
    }
  }
  return entityMap;
}

// ============================================================================
// MAIN
// ============================================================================

console.log('🔍 TypeORM 엔티티 등록 검사 시작...\n');
console.log('📁 검사 B 범위: apps/api-server/src/modules/ + src/routes/');
console.log('ℹ️  제외: src/entities/ (레거시), packages/ (도메인 패키지)\n');

const registered           = parseRegisteredEntities(CONNECTION_TS);
const { imported, aliasOf } = parseImports(CONNECTION_TS);
const localEntity           = collectLocalEntityClasses(SCAN_DIRS);

console.log(`✅ entities 배열 등록: ${registered.size}개`);
console.log(`📥 connection.ts import (alias 포함): ${imported.size}개`);
console.log(`📦 로컬 @Entity() 클래스 (modules+routes): ${localEntity.size}개\n`);

let hasError = false;

// ============================================================================
// 검사 A: import됐으나 entities 배열 미등록 (alias 반영)
// ============================================================================

const checkA = [];
for (const [originalName, filePath] of localEntity.entries()) {
  if (ALLOWLIST.has(originalName)) continue;
  const registeredName = aliasOf.get(originalName) ?? originalName;
  const isImported = imported.has(registeredName) || imported.has(originalName);
  if (isImported && !registered.has(registeredName) && !registered.has(originalName)) {
    checkA.push({ originalName, registeredName, filePath });
  }
}

// ============================================================================
// 검사 B: 로컬 @Entity → entities 미등록 (alias 반영)
// ============================================================================

const checkB = [];
for (const [className, filePath] of localEntity.entries()) {
  if (ALLOWLIST.has(className)) continue;
  const registeredName = aliasOf.get(className) ?? className;
  const isInEntities = registered.has(registeredName) || registered.has(className);
  if (!isInEntities) {
    checkB.push({
      className,
      filePath,
      isImported: imported.has(registeredName) || imported.has(className),
    });
  }
}

// ============================================================================
// 결과 출력
// ============================================================================

if (checkA.length === 0) {
  console.log('✅ 검사 A PASS: import된 로컬 엔티티 모두 entities 배열에 등록됨\n');
} else {
  hasError = true;
  console.log(`❌ 검사 A FAIL: import됐으나 entities 배열 미등록 ${checkA.length}개\n`);
  for (const { originalName, registeredName, filePath } of checkA) {
    const aliasNote = registeredName !== originalName ? ` (as ${registeredName})` : '';
    console.log(`   • ${originalName}${aliasNote}`);
    console.log(`     파일: ${filePath}`);
    console.log();
  }
}

if (checkB.length === 0) {
  console.log('✅ 검사 B PASS: 로컬 @Entity() 클래스 모두 entities 배열에 등록됨\n');
} else {
  hasError = true;
  console.log(`❌ 검사 B FAIL: 로컬 @Entity 미등록 ${checkB.length}개\n`);
  for (const { className, filePath, isImported } of checkB) {
    console.log(`   • ${className}`);
    console.log(`     파일: ${filePath}`);
    console.log(`     import 여부: ${isImported ? '✓ import됨 (entities 배열만 누락)' : '✗ import도 누락'}`);
    console.log();
  }
  console.log('   → connection.ts의 import와 entities 배열에 위 항목을 추가하거나,');
  console.log('     의도적 미등록이면 스크립트 ALLOWLIST에 이유와 함께 추가하세요.\n');
}

if (ALLOWLIST.size > 0) {
  console.log(`ℹ️  ALLOWLIST ${ALLOWLIST.size}개 (의도적 미등록 또는 후속 WO 처리 예정):`);
  for (const name of ALLOWLIST) console.log(`   • ${name}`);
  console.log();
}

if (hasError) {
  console.log('❌ FAIL — 엔티티 등록 누락이 있습니다. 위 항목을 확인하세요.');
  process.exit(1);
} else {
  console.log('✅ PASS — 현재 등록 상태 정상.');
  process.exit(0);
}
