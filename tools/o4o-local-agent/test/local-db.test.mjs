/**
 * Local Data Runtime V0 — 런타임 동작 테스트 (WO-O4O-LOCAL-DATA-SQLITE-V0 §48)
 *
 * 의존성 0 — node:test + node:assert + node:sqlite(내장). 실행:
 *   node --test tools/o4o-local-agent/test/
 *
 * 실제 SQLite 를 도는 항목들(생성·재기동·마이그레이션·트랜잭션·파라미터 쿼리·설정·
 * import·export)을 여기서 검증한다. 정적 경계(임의 SQL/파일 tool 부재 등)는
 * api-server jest 의 local-agent-runtime.spec.ts 가 CI 에서 함께 본다(§49).
 *
 * 각 실행은 격리된 임시 O4O_AGENT_HOME 을 쓴다 — 실제 매장 PC 의 local.db 를 건드리지 않는다.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let tmpHome;
before(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'o4o-localdb-test-'));
  process.env.O4O_AGENT_HOME = tmpHome;
});
after(() => {
  try {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
});

const db = await import('../src/local-db.mjs');
const handlers = await import('../src/handlers.mjs');

test('1. DB 자동 생성 — 열면 local.db 파일과 핵심 테이블이 생긴다', () => {
  const h = db.localDbHealth();
  assert.equal(h.ok, true);
  assert.ok(fs.existsSync(path.join(tmpHome, 'local.db')));
  // local_ prefix 핵심 테이블(§10): meta·migrations·settings·mappings·imports·exports·work_state = 7
  assert.equal(h.tableCount, 7);
});

test('2. 재기동 — 닫았다 다시 열어도 local_db_id 가 유지된다', () => {
  const id1 = db.LocalMetaRepository.get('local_db_id');
  assert.match(id1, /^[0-9a-f-]{36}$/i);
  db.closeLocalDb();
  db.openLocalDb();
  const id2 = db.LocalMetaRepository.get('local_db_id');
  assert.equal(id2, id1);
});

test('3. 스키마 버전 — meta 와 health 가 일치한다', () => {
  const h = db.localDbHealth();
  assert.equal(h.schemaVersion, db.SCHEMA_VERSION);
  assert.equal(h.expectedSchemaVersion, db.SCHEMA_VERSION);
  assert.equal(h.migrationOk, true);
  assert.equal(Number(db.LocalMetaRepository.get('schema_version')), db.SCHEMA_VERSION);
});

test('4. 마이그레이션 적용 — local_schema_migrations 에 version 1 이 기록된다', () => {
  const handle = db.openLocalDb();
  const row = handle.prepare('SELECT version, name FROM local_schema_migrations WHERE version=1').get();
  assert.equal(row.version, 1);
  assert.equal(row.name, 'core_v0');
});

test('5. 마이그레이션 idempotency — 다시 열어도 마이그레이션 행이 늘지 않는다', () => {
  const handle = db.openLocalDb();
  const before = handle.prepare('SELECT COUNT(*) AS n FROM local_schema_migrations').get().n;
  db.closeLocalDb();
  db.openLocalDb();
  const after = db.openLocalDb().prepare('SELECT COUNT(*) AS n FROM local_schema_migrations').get().n;
  assert.equal(after, before);
});

test('6. 트랜잭션 롤백 — fn 이 던지면 변경이 남지 않는다', () => {
  db.LocalSettingsRepository.set('tx_probe', 'before');
  assert.throws(() =>
    db.withTransaction((handle) => {
      handle
        .prepare(
          'INSERT INTO local_settings(key,value,updated_at) VALUES(?,?,?) ' +
            'ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        )
        .run('tx_probe', 'after', new Date().toISOString());
      throw new Error('boom');
    }),
  );
  assert.equal(db.LocalSettingsRepository.get('tx_probe'), 'before');
});

test('7. 파라미터 쿼리 — 주입 시도 문자열이 리터럴로만 저장된다', () => {
  const evil = "x'); DROP TABLE local_settings; --";
  db.LocalSettingsRepository.set('inj_key', evil);
  assert.equal(db.LocalSettingsRepository.get('inj_key'), evil);
  // 테이블이 여전히 살아 있다 → 값이 SQL 로 실행되지 않았다.
  const h = db.localDbHealth();
  assert.equal(h.tableCount, 7);
});

test('9. 설정 쓰기/읽기 — set 한 값이 그대로 읽힌다', () => {
  db.LocalSettingsRepository.set('store_hint', '피앤디약국');
  assert.equal(db.LocalSettingsRepository.get('store_hint'), '피앤디약국');
});

test('10~12. CSV import — 매핑 적용·불필요 컬럼 폐기·부족 필드 감지', () => {
  // 47 필드 흉내: 필요한 2개 + 버릴 것들. 헤더는 실제 약국 Excel 을 모사한 합성 fixture.
  const csv = [
    '품목명,규격,재고수량,매입처,메모,사용안함1,사용안함2',
    '타이레놀정500mg,10정,120,대한약품,,zzz,qqq',
    '판콜에이,30ml,,종근당,,zzz,qqq',
  ].join('\n');
  const result = db.importCsv({
    csvText: csv,
    sourceType: 'pharmacy_excel',
    profileName: 'pnd_v0',
    columnMapping: { 품목명: 'item_name', 재고수량: 'stock_qty' },
    requiredFields: ['item_name', 'stock_qty'],
  });
  // 10. 매핑: 품목명→item_name
  assert.equal(result.importedRows[0].item_name, '타이레놀정500mg');
  assert.equal(result.rowCount, 2);
  // 11. 불필요 컬럼 폐기: 규격·매입처·메모·사용안함1·사용안함2 는 mapped 에 없다.
  assert.deepEqual(result.droppedColumns.sort(), ['규격', '매입처', '메모', '사용안함1', '사용안함2'].sort());
  assert.equal('규격' in result.importedRows[0], false);
  // 12. 부족 필드: 2행 stock_qty 가 비어 강제 완성하지 않고 missing 으로 돌려준다.
  assert.deepEqual(result.missingFields, ['stock_qty']);
});

test('12b. 매핑에 아예 없는 required 필드도 missing 으로 돌려준다 (억지 완성 안 함)', () => {
  const csv = 'a,b\n1,2';
  const result = db.importCsv({
    csvText: csv,
    sourceType: 't',
    profileName: 't',
    columnMapping: { a: 'item_name' },
    requiredFields: ['item_name', 'price'],
  });
  assert.deepEqual(result.missingFields, ['price']);
});

test('13. CSV export — 행을 CSV 로 만들고 콤마/따옴표를 escape 한다', () => {
  const csv = db.toCsv(
    [
      { item_name: '타이레놀', note: 'a,b' },
      { item_name: '판콜에이', note: '"q"' },
    ],
    ['item_name', 'note'],
  );
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'item_name,note');
  assert.equal(lines[1], '타이레놀,"a,b"');
  assert.equal(lines[2], '판콜에이,"""q"""');
  db.recordExport({ target: 'items', format: 'csv', rowCount: 2 });
});

// ─── runAction 경유 (agent tool 계약) ───────────────────────────────────────

test('runAction: local.data.health 성공', async () => {
  const r = await handlers.runAction('local.data.health', { deviceName: 'x' }, undefined);
  assert.equal(r.status, 'success');
  assert.equal(r.data.ok, true);
  // 경로 누출 금지 — 응답 어디에도 임시 홈 경로가 없다(§38).
  assert.equal(JSON.stringify(r).includes(tmpHome), false);
});

test('runAction: local.data.get_meta 는 key/value 만 돌려준다', async () => {
  const r = await handlers.runAction('local.data.get_meta', {}, undefined);
  assert.equal(r.status, 'success');
  const keys = r.data.meta.map((m) => m.key);
  assert.ok(keys.includes('local_db_id'));
  assert.ok(keys.includes('schema_version'));
});

test('runAction: local.data.set_setting 성공 (값 원문은 응답에 없음)', async () => {
  const r = await handlers.runAction('local.data.set_setting', {}, { key: 'ui.lang', value: 'ko' });
  assert.equal(r.status, 'success');
  assert.equal(r.data.key, 'ui.lang');
  assert.equal(r.data.saved, true);
  assert.equal('value' in r.data, false);
  assert.equal(db.LocalSettingsRepository.get('ui.lang'), 'ko');
});

test('8. runAction: 잘못된 set_setting 인자는 거부된다', async () => {
  const bad = await handlers.runAction('local.data.set_setting', {}, { key: 'bad key!', value: 'x' });
  assert.equal(bad.status, 'denied');
  assert.equal(bad.errorCode, 'LOCAL_DATA_INVALID_ARGS');
  const noArgs = await handlers.runAction('local.data.set_setting', {}, undefined);
  assert.equal(noArgs.status, 'denied');
});

test('14. runAction: 임의 SQL tool 은 존재하지 않는다 (denied)', async () => {
  const r = await handlers.runAction('local.sqlite.execute_sql', {}, { sql: 'SELECT 1' });
  assert.equal(r.status, 'denied');
  assert.equal(r.errorCode, 'DENIED_UNKNOWN_ACTION');
  // 등록 목록에도 execute_sql 류가 없다.
  const listed = handlers.listAllowedActions();
  assert.equal(listed.some((a) => /sql|exec|file|read/i.test(a)), false);
  assert.ok(listed.includes('local.data.health'));
});

test('local.data.* 는 #appId 형태를 허용하지 않는다', async () => {
  const r = await handlers.runAction('local.data.health#windows.notepad', {}, undefined);
  assert.equal(r.status, 'denied');
  assert.equal(r.errorCode, 'DENIED_UNKNOWN_ACTION');
});
