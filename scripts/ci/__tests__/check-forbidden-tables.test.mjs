/**
 * scripts/check-forbidden-tables.mjs 회귀 테스트 (CLAUDE.md §4 · CHECKOUT-STABLE-DECLARATION-V2 §2).
 *
 * - 테이블 이름의 모든 선언 형식(문자열 · 객체 { name } · schema.table · 여러 줄)을 읽는지
 * - 허용 목록이 계약 근거가 있는 5개로 고정돼 있는지(추가하려면 이 테스트도 고쳐야 한다)
 * - *.entity.ts 가 아닌 엔티티 파일도 검사하고, 테스트 · .d.ts 는 제외하는지
 * - 위반 시 exit 1 과 현행 계약 문구를 출력하는지
 *
 * 의존성 · DB · 네트워크 0. 실행: node --test scripts/ci/__tests__/check-forbidden-tables.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALLOWED_TABLES, entityTableNames, isForbidden, scan } from '../../check-forbidden-tables.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'check-forbidden-tables.mjs');
const names = (src) => entityTableNames(src).map((t) => t.name);

test('문자열 · 객체 · schema.table · 여러 줄 선언을 모두 읽는다', () => {
  assert.deepEqual(names(`@Entity('a_orders')`), ['a_orders']);
  assert.deepEqual(names(`@Entity("b_payments")`), ['b_payments']);
  assert.deepEqual(names('@Entity(`c_orders`)'), ['c_orders']);
  assert.deepEqual(names(`@Entity('d_orders', { schema: 'x' })`), ['d_orders']);
  assert.deepEqual(names(`@Entity({ name: 'e_orders' })`), ['e_orders']);
  assert.deepEqual(names(`@Entity({ schema: 'neture', name: "f_payments" })`), ['f_payments']);
  assert.deepEqual(names(`@Entity({\n  schema: 'neture',\n  synchronize: false,\n  name: 'g_orders',\n})`), ['g_orders']);
  assert.deepEqual(names(`@Entity('neture.h_orders')`), ['h_orders']);
  assert.deepEqual(names(`@Entity( { name : 'i_orders' } )`), ['i_orders']);
});

test('이름이 없는 선언 · 다른 데코레이터는 읽지 않는다', () => {
  assert.deepEqual(names(`@Entity()\nexport class Order {}`), []);
  assert.deepEqual(names(`@ViewEntity({ name: 'v_orders' })`), []);
  assert.deepEqual(names(`@Entity(TABLE_NAME)`), []);
  // 객체 형식에서 name 을 찾다가 다음 데코레이터로 넘어가지 않는다
  assert.deepEqual(names(`@Entity({ schema: 'x' })\nclass A {}\n@Column({ name: 'z_orders' })`), []);
});

test('줄 번호를 정확히 돌려준다', () => {
  assert.equal(entityTableNames(`import x from 'y';\n\n@Entity({ name: 'q_orders' })`)[0].line, 3);
});

test('허용 목록은 계약 근거가 있는 5개뿐이다', () => {
  assert.deepEqual(
    [...ALLOWED_TABLES.keys()].sort(),
    ['checkout_orders', 'checkout_payments', 'neture_orders', 'neture_settlement_orders', 'o4o_payments'],
  );
  for (const [name, reason] of ALLOWED_TABLES) assert.ok(reason.length > 10, `${name} 근거가 비어 있음`);
});

test('허용 목록 밖의 *_orders · *_payments 는 위반이다', () => {
  for (const n of ['cosmetics_orders', 'tourism_orders', 'yaksa_orders', 'kpa_payments', 'store_orders']) {
    assert.equal(isForbidden(n), true, n);
  }
  for (const n of [...ALLOWED_TABLES.keys(), 'orders_audit', 'order_items', 'payment_events', 'checkout_order_items']) {
    assert.equal(isForbidden(n), false, n);
  }
});

function fixture(files) {
  const root = mkdtempSync(path.join(tmpdir(), 'forbidden-tables-'));
  for (const [rel, src] of Object.entries(files)) {
    mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
    writeFileSync(path.join(root, rel), src);
  }
  return root;
}

test('scan: *.entity.ts 가 아닌 엔티티도 잡고, 테스트 · .d.ts · dist 는 제외한다', async () => {
  const root = fixture({
    'apps/api-server/src/modules/x/entities/XOrder.ts': `@Entity({ name: 'x_orders' })\nexport class XOrder {}`,
    'apps/api-server/src/modules/y/y-payment.entity.ts': `@Entity('y_payments')`,
    'packages/z-core/src/entities/ok.entity.ts': `@Entity('checkout_orders')`,
    'apps/api-server/src/modules/x/__tests__/fixture.ts': `@Entity('t_orders')`,
    'apps/api-server/src/modules/x/x.spec.ts': `@Entity('s_orders')`,
    'packages/z-core/src/types.d.ts': `@Entity('d_orders')`,
    'packages/z-core/dist/x.entity.js': `@Entity('dist_orders')`,
  });
  try {
    const { files, violations } = await scan(root);
    assert.equal(files, 3);
    assert.deepEqual(violations.map((v) => `${v.file}:${v.line}:${v.name}`).sort(), [
      'apps/api-server/src/modules/x/entities/XOrder.ts:1:x_orders',
      'apps/api-server/src/modules/y/y-payment.entity.ts:1:y_payments',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI: 위반이면 exit 1 과 현행 계약 문구, 없으면 exit 0', () => {
  const bad = fixture({ 'apps/api-server/src/a.entity.ts': `@Entity({ name: 'shop_orders' })` });
  const good = fixture({ 'apps/api-server/src/a.entity.ts': `@Entity({ name: 'neture_orders' })` });
  try {
    const r1 = spawnSync(process.execPath, [SCRIPT, '--root', bad], { encoding: 'utf8' });
    assert.equal(r1.status, 1);
    assert.match(r1.stdout, /shop_orders/);
    assert.match(r1.stdout, /CLAUDE\.md §4 \(Order \/ Commerce Contract\)/);
    assert.match(r1.stdout, /checkoutService\.createOrder\(\)/);
    assert.doesNotMatch(r1.stdout, /E-commerce Core/);
    const r2 = spawnSync(process.execPath, [SCRIPT, '--root', good], { encoding: 'utf8' });
    assert.equal(r2.status, 0, r2.stdout);
  } finally {
    rmSync(bad, { recursive: true, force: true });
    rmSync(good, { recursive: true, force: true });
  }
});
