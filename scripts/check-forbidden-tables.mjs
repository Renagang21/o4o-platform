#!/usr/bin/env node

/**
 * Forbidden Table Check — 서비스별 독립 주문 · 결제 테이블 신설 차단
 *
 * 계약: CLAUDE.md §4 (Order / Commerce Contract) · docs/baseline/CHECKOUT-STABLE-DECLARATION-V2.md §2
 *   주문 생성은 checkoutService.createOrder() 단일 지점이고, 주문 정본은 checkout_orders 다.
 *   독립 `*_orders` · `*_payments` 테이블을 새로 만들지 않는다.
 *
 * 검사: apps/api-server/src · packages 의 .ts/.js 소스(테스트 · .d.ts · dist 제외) 중 @Entity 가 있는 파일에서
 *   TypeORM 테이블 이름을 읽는다(파일 이름이 *.entity.ts 가 아닌 엔티티도 포함).
 *   - @Entity('name') · @Entity("name") · @Entity(`name`) · @Entity('name', { … })
 *   - @Entity({ name: 'name', … })  — 객체 형식 (2026-11-09 추가)
 *   이름이 `_orders` 또는 `_payments` 로 끝나고 ALLOWED_TABLES 에 없으면 위반이다.
 *   @Entity() 처럼 이름을 주지 않은 엔티티는 클래스 이름 기반이라 이 검사 대상이 아니다.
 *
 * 허용 목록은 계약 근거가 있는 것만 둔다. 새 항목은 근거 문서와 함께 추가하고 회귀 테스트
 * (scripts/ci/__tests__/check-forbidden-tables.test.mjs)에 넣는다.
 *
 * 설치 없이 실행된다(node 내장 모듈만 사용) — CI 의 Code Quality Check 와 Draft light checks 에서 blocking.
 *
 *   node scripts/check-forbidden-tables.mjs [--root <repo root>]
 *
 * @since Phase 5-D (2026-01-11) · 객체 형식 · 허용 목록 · CI 연결 2026-11-09
 */

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEARCH_PATHS = ['apps/api-server/src', 'packages'];
// 파일 이름이 아니라 내용(@Entity)으로 대상을 고른다 — *.entity.ts 가 아닌 엔티티 파일도 많다(2026-11-09 기준 72개).
const FILE_PATTERN = /\.[cm]?[jt]sx?$/;
const SKIP_FILE = /\.d\.ts$|\.(spec|test)\.[cm]?[jt]sx?$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '__tests__', '__mocks__']);
const FORBIDDEN_SUFFIX = /_(orders|payments)$/;

/** 허용 테이블 — 이름 → 근거 */
export const ALLOWED_TABLES = new Map([
  ['checkout_orders', '주문 정본 (CHECKOUT-STABLE-DECLARATION-V2 §2)'],
  ['checkout_payments', 'checkout 결제 기록 (CHECKOUT-STABLE-DECLARATION-V2 §2)'],
  ['o4o_payments', 'PaymentCore 플랫폼 공통 결제 테이블 (CHECKOUT-STABLE-DECLARATION-V2 §2-2) — 통합 담당 결정 2026-11-09'],
  ['neture_settlement_orders', '정산-주문 연결 테이블(중복 정산 방지), 주문 원장 아님 — 통합 담당 결정 2026-11-09'],
  ['neture_orders', '공급자 fulfillment 파생 원장, 주문 정본 아님 (O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1 불변식 T1 · A2)'],
]);

/**
 * 소스에서 @Entity 테이블 이름을 모두 찾는다.
 * @param {string} content
 * @returns {{ name: string, line: number, text: string }[]}
 */
export function entityTableNames(content) {
  const out = [];
  const re = /@Entity\s*\(\s*(?:(['"`])([\w.]+)\1|\{[^@]{0,500}?\bname\s*:\s*(['"`])([\w.]+)\3)/g;
  let m;
  while ((m = re.exec(content))) {
    const raw = m[2] ?? m[4];
    const name = raw.includes('.') ? raw.split('.').pop() : raw; // schema.table
    const line = content.slice(0, m.index).split('\n').length;
    out.push({ name, line, text: m[0].replace(/\s+/g, ' ').slice(0, 100) });
  }
  return out;
}

/** @param {string} name */
export const isForbidden = (name) => FORBIDDEN_SUFFIX.test(name) && !ALLOWED_TABLES.has(name);

async function findFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results; // 디렉터리가 없으면 대상 0
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) results.push(...(await findFiles(full)));
    } else if (entry.isFile() && FILE_PATTERN.test(entry.name) && !SKIP_FILE.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * @param {string} root
 * @returns {Promise<{ files: number, violations: { file: string, line: number, name: string, text: string }[] }>}
 */
export async function scan(root) {
  const violations = [];
  let files = 0;
  for (const p of SEARCH_PATHS) {
    for (const file of await findFiles(join(root, p))) {
      const content = await readFile(file, 'utf8');
      if (!content.includes('@Entity')) continue;
      files++;
      for (const t of entityTableNames(content)) {
        if (isForbidden(t.name)) violations.push({ file: relative(root, file).split('\\').join('/'), ...t });
      }
    }
  }
  return { files, violations };
}

async function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--root');
  const root = i >= 0 && argv[i + 1] ? resolve(argv[i + 1]) : join(dirname(fileURLToPath(import.meta.url)), '..');

  const { files, violations } = await scan(root);
  console.log(`Forbidden table check — entity files ${files}`);
  console.log(`Allowed: ${[...ALLOWED_TABLES.keys()].join(', ')}`);

  if (violations.length === 0) {
    console.log('✅ 금지 테이블 패턴 없음');
    return 0;
  }
  console.log('');
  console.log(`❌ 금지 테이블 ${violations.length}건`);
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line}  ${v.name}  (${v.text})`);
  }
  console.log('');
  console.log('서비스별 독립 *_orders · *_payments 테이블은 만들지 않는다.');
  console.log('주문 생성은 checkoutService.createOrder() 단일 지점이고, 주문 정본은 checkout_orders 다.');
  console.log('See: CLAUDE.md §4 (Order / Commerce Contract) · docs/baseline/CHECKOUT-STABLE-DECLARATION-V2.md §2');
  console.log('계약상 근거가 있는 테이블이면 ALLOWED_TABLES 에 근거와 함께 추가한다(통합 담당 확인).');
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error('Script error:', error);
      process.exit(1);
    },
  );
}
