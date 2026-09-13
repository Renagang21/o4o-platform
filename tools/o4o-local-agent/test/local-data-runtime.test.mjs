/**
 * Local Data Runtime V1 — 런타임 동작 테스트 (WO-O4O-LOCAL-DATA-RUNTIME-AND-SCHEMA-EVOLUTION-V1 §50~§57)
 *
 * 의존성 0 — node:test + node:assert + node:sqlite(내장). 실행: node --test tools/o4o-local-agent/test/
 *
 * 각 항목은 격리된 임시 O4O_AGENT_HOME(fixture DB)을 쓴다(§50) — 실제 매장 PC 의 local.db 를 건드리지 않는다.
 *
 *   migration chain   empty → latest · v1(V0) DB → latest(백업 + 기존 행 유지) · already latest → no-op ·
 *                     unknown future → reject · migration failure → 롤백 + 코드 · chain 정합(중복·빈틈·이름 불일치)
 *   backup            생성 · 목록 · 원 DB 독립 · 보존 N · 복원(pre-restore 스냅샷)
 *   import            valid · extra columns · missing optional · missing required · malformed · empty · 5,000행 · key upsert
 *   export            rows · header · escaping · UTF-8 한글 · empty dataset · columns 부분집합
 *   concurrency/crash 동시 요청 · 미커밋 트랜잭션 뒤 재기동
 *   CLI · health      data 명령 · /health localData 요약 · handler 코드
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const db = await import('../src/local-db.mjs');
const bk = await import('../src/local-db-backup.mjs');
const cli = await import('../src/local-data-cli.mjs');
const handlers = await import('../src/handlers.mjs');
const server = await import('../src/local-server.mjs');

let home;
beforeEach(() => {
  db.closeLocalDb();
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'o4o-ldr-'));
  process.env.O4O_AGENT_HOME = home;
});
afterEach(() => {
  db.closeLocalDb();
  try { fs.rmSync(home, { recursive: true, force: true }); } catch { /* best-effort */ }
});

const dbFile = () => path.join(home, 'local.db');
const boot = (extra = {}) => db.bootstrapLocalDb({ backup: (h, reason) => bk.createBackup(h, reason), ...extra });
const withBackup = { backup: (h, reason) => bk.createBackup(h, reason) };

/** V0 시점의 DB(migration 1 만) 를 만든다 — 실제 V0 코드가 만들던 형상. */
function makeV0Fixture() {
  const h = new DatabaseSync(dbFile());
  h.exec('PRAGMA journal_mode = WAL');
  db.MIGRATIONS[0].up(h);
  h.prepare('INSERT INTO local_schema_migrations(version, name, applied_at) VALUES(1, ?, ?)').run('core_v0', '2026-09-01T00:00:00.000Z');
  h.prepare("INSERT INTO local_meta(key, value, updated_at) VALUES('local_db_id', 'fixture-id-0001', ?)").run('2026-09-01T00:00:00.000Z');
  h.prepare("INSERT INTO local_settings(key, value, updated_at) VALUES('locale', 'ko', ?)").run('2026-09-01T00:00:00.000Z');
  h.prepare("INSERT INTO local_work_state(key, value, updated_at) VALUES('last_task', '재고확인', ?)").run('2026-09-01T00:00:00.000Z');
  h.close();
}

const CSV = '품목명,바코드,단가,비고\r\n타이레놀정500mg,8806400000001,3500,메모\r\n"게보린정, 10정",8806400000002,2900,"따옴표""포함"\r\n한글상품,8806400000003,1000,\r\n';
const MAP = { 품목명: 'item_name', 바코드: 'barcode', 단가: 'unit_price' };
const REQ = { csvText: CSV, dataset: 'product_list', columnMapping: MAP, requiredFields: ['item_name', 'barcode'], keyField: 'barcode' };

// ─── migration chain (§51·§52) ───────────────────────────────────────────────

test('empty → latest: 디렉터리·DB 생성 · schema v2 · 백업 불필요(new DB 는 pending 이 전부라 pre-migration 없이 시작하지 않는다)', () => {
  assert.equal(fs.existsSync(dbFile()), false);
  const s = boot();
  assert.equal(s.ready, true);
  assert.equal(s.schemaVersion, db.SCHEMA_VERSION);
  assert.deepEqual(s.appliedNow, [1, 2]);
  assert.equal(fs.existsSync(dbFile()), true);
  const h = db.localDbHealth({ backupSummary: bk.backupSummary });
  assert.equal(h.migrationStatus, 'current');
  assert.equal(h.pendingMigrations, 0);
  assert.equal(h.integrityStatus, 'ok');
  assert.equal(h.tableCount, 9);
});

test('v1(V0) DB → latest: pre-migration 백업 뒤 migration 2 만 적용 · 기존 meta/settings/work_state 행 유지', () => {
  makeV0Fixture();
  const s = boot();
  assert.equal(s.ready, true);
  assert.deepEqual(s.appliedNow, [2]);
  assert.equal(s.backupStatus, 'created');
  const backups = bk.listBackups();
  assert.equal(backups.length, 1);
  assert.equal(backups[0].reason, 'pre-migration');
  // 기존 데이터 보존(§52)
  assert.equal(db.LocalMetaRepository.get('local_db_id'), 'fixture-id-0001');
  assert.equal(db.LocalSettingsRepository.get('locale'), 'ko');
  const ws = db.openLocalDb().prepare("SELECT value FROM local_work_state WHERE key='last_task'").get();
  assert.equal(ws.value, '재고확인');
  assert.equal(db.LocalMetaRepository.get('schema_version'), '2');
  // 백업은 migration 이전 상태(v1)다
  const b = new DatabaseSync(path.join(home, 'backups', backups[0].id), { readOnly: true });
  assert.equal(b.prepare('SELECT MAX(version) AS v FROM local_schema_migrations').get().v, 1);
  assert.equal(b.prepare("SELECT 1 AS ok FROM sqlite_master WHERE name='local_datasets'").get(), undefined);
  b.close();
});

test('already latest → no-op: 재기동해도 migration 행·백업이 늘지 않는다', () => {
  boot();
  db.closeLocalDb();
  const s = boot();
  assert.equal(s.ready, true);
  assert.deepEqual(s.appliedNow, []);
  assert.equal(s.backupStatus, 'not_needed');
  assert.equal(bk.listBackups().length, 0);
  assert.equal(db.openLocalDb().prepare('SELECT COUNT(*) AS n FROM local_schema_migrations').get().n, 2);
});

test('unknown future version → SCHEMA_TOO_NEW 로 멈춘다 · 내리지 않는다 · 데이터 축 호출은 그 코드로 거절', async () => {
  boot();
  db.openLocalDb().prepare("INSERT INTO local_schema_migrations(version, name, applied_at) VALUES(9, 'future_v9', ?)").run('2030-01-01T00:00:00.000Z');
  db.closeLocalDb();
  const s = boot();
  assert.equal(s.ready, false);
  assert.equal(s.errorCode, 'LOCAL_DB_SCHEMA_TOO_NEW');
  assert.equal(s.schemaVersion, 9);
  // 파일은 그대로 — 행이 지워지지 않았다
  const raw = new DatabaseSync(dbFile(), { readOnly: true });
  assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM local_schema_migrations').get().n, 3);
  raw.close();
  assert.throws(() => db.LocalMetaRepository.get('schema_version'), (e) => e.code === 'LOCAL_DB_SCHEMA_TOO_NEW');
  const r = await handlers.runAction('local.data.get_meta', {}, { key: 'schema_version' });
  assert.equal(r.status, 'failed');
  assert.equal(r.errorCode, 'LOCAL_DB_SCHEMA_TOO_NEW');
  const hh = await handlers.runAction('local.data.health', {}, undefined);
  assert.equal(hh.status, 'failed');
  assert.equal(hh.errorCode, 'LOCAL_DB_SCHEMA_TOO_NEW');
  assert.equal(hh.data.migrationStatus, 'too_new');
});

test('migration failure → 해당 migration 롤백 · MIGRATION_FAILED · 이전 버전과 데이터 유지 · 백업은 이미 있다', () => {
  makeV0Fixture();
  const broken = [
    db.MIGRATIONS[0],
    { version: 2, name: 'bad_v2', up(h) { h.exec('CREATE TABLE local_half (x)'); h.exec('CREATE TABLE local_meta (dup)'); } },
  ];
  const s = boot({ migrations: broken });
  assert.equal(s.ready, false);
  assert.equal(s.errorCode, 'LOCAL_DB_MIGRATION_FAILED');
  assert.equal(s.failedMigration, 2);
  assert.equal(s.schemaVersion, 1);
  assert.equal(s.backupStatus, 'created');
  const raw = new DatabaseSync(dbFile(), { readOnly: true });
  assert.equal(raw.prepare("SELECT 1 AS ok FROM sqlite_master WHERE name='local_half'").get(), undefined, '부분 적용이 남지 않는다');
  assert.equal(raw.prepare('SELECT MAX(version) AS v FROM local_schema_migrations').get().v, 1);
  assert.equal(raw.prepare("SELECT value FROM local_settings WHERE key='locale'").get().value, 'ko');
  raw.close();
  assert.equal(bk.listBackups().length, 1);
  // 코드가 고쳐져(정상 chain) 다시 시작하면 그대로 이어서 올라간다 — 재설치·삭제 없이
  db.closeLocalDb();
  const s2 = boot();
  assert.equal(s2.ready, true);
  assert.deepEqual(s2.appliedNow, [2]);
  assert.equal(db.LocalSettingsRepository.get('locale'), 'ko');
});

test('chain 정합: 중복 id · 빈틈 · 이름 불일치 · 적용 이력 빈틈은 시작에서 감지된다', () => {
  assert.deepEqual(db.validateMigrationChain([db.MIGRATIONS[0], { ...db.MIGRATIONS[1], version: 1 }]).reason, 'duplicate');
  assert.deepEqual(db.validateMigrationChain([db.MIGRATIONS[0], { ...db.MIGRATIONS[1], version: 3 }]).reason, 'gap');
  assert.equal(db.validateMigrationChain([]).ok, false);
  assert.equal(db.validateMigrationChain(db.MIGRATIONS).ok, true);
  // 이름이 다른 chain 의 DB
  boot();
  db.openLocalDb().prepare("UPDATE local_schema_migrations SET name='other_chain' WHERE version=2").run();
  db.closeLocalDb();
  const s = boot();
  assert.equal(s.ready, false);
  assert.equal(s.errorCode, 'LOCAL_DB_MIGRATION_FAILED');
  assert.equal(s.chainStatus, 'mismatch');
  // 적용 이력에 빈틈(부분 적용 흔적)
  db.openLocalDb; // no-op
  const raw = new DatabaseSync(dbFile());
  raw.prepare("UPDATE local_schema_migrations SET name='datasets_v1' WHERE version=2").run();
  raw.prepare('DELETE FROM local_schema_migrations WHERE version=1').run();
  raw.close();
  const s2 = boot();
  assert.equal(s2.ready, false);
  assert.equal(s2.chainStatus, 'gap');
});

test('backup 실패면 migration 을 하지 않는다 (BACKUP_FAILED · 옛 schema 그대로)', () => {
  makeV0Fixture();
  const s = db.bootstrapLocalDb({ backup: () => { throw new Error('disk full'); } });
  assert.equal(s.ready, false);
  assert.equal(s.errorCode, 'LOCAL_DB_BACKUP_FAILED');
  const raw = new DatabaseSync(dbFile(), { readOnly: true });
  assert.equal(raw.prepare('SELECT MAX(version) AS v FROM local_schema_migrations').get().v, 1);
  raw.close();
});

test('손상된 DB 파일 → INTEGRITY_FAILED · 자동 초기화/덮어쓰기 없음', () => {
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(dbFile(), 'this is not a sqlite file at all — 0123456789'.repeat(40));
  const s = boot();
  assert.equal(s.ready, false);
  assert.ok(['LOCAL_DB_INTEGRITY_FAILED', 'LOCAL_DB_NOT_READY'].includes(s.errorCode));
  assert.ok(fs.readFileSync(dbFile(), 'utf8').startsWith('this is not'), '파일이 그대로다');
});

// ─── backup (§53) ────────────────────────────────────────────────────────────

test('backup: 생성 · 목록 · 원 DB 와 독립 · 보존 N · restore(pre-restore 스냅샷)', () => {
  boot();
  db.LocalSettingsRepository.set('locale', 'ja');
  const b1 = bk.createBackup(db.openLocalDb(), 'manual');
  assert.match(b1.id, /^local-\d{8}T\d{6}-manual\.db$/);
  assert.ok(b1.bytes > 0);
  // 백업 뒤 원 DB 를 바꿔도 백업은 그대로(독립)
  db.LocalSettingsRepository.set('locale', 'en');
  const snap = new DatabaseSync(path.join(home, 'backups', b1.id), { readOnly: true });
  assert.equal(snap.prepare("SELECT value FROM local_settings WHERE key='locale'").get().value, 'ja');
  snap.close();
  // 보존: KEEP 개만
  for (let i = 0; i < bk.BACKUP_KEEP + 2; i += 1) bk.createBackup(db.openLocalDb(), 'manual');
  assert.equal(bk.listBackups().length, bk.BACKUP_KEEP);
  assert.equal(bk.backupSummary().count, bk.BACKUP_KEEP);
  // restore: id 규칙 밖 거절
  assert.throws(() => bk.restoreBackup('../local.db'), (e) => e.code === 'LOCAL_DB_BACKUP_FAILED');
  assert.throws(() => bk.restoreBackup('local-20260101T000000-manual.db'), (e) => e.code === 'LOCAL_DB_BACKUP_FAILED');
  // b1 은 보존에서 밀려났으니 최신 것으로 복원 — 직전 상태가 pre-restore 로 남는다
  const latest = bk.listBackups()[0].id;
  db.LocalSettingsRepository.set('locale', 'zh');
  db.closeLocalDb();
  const r = bk.restoreBackup(latest, { openForSnapshot: (f) => new DatabaseSync(f) });
  assert.equal(r.restored, latest);
  assert.match(r.preRestore, /-pre-restore\.db$/);
  const s = boot();
  assert.equal(s.ready, true);
  assert.equal(db.LocalSettingsRepository.get('locale'), 'en');
  // -wal/-shm 이 복원 전 것으로 남지 않는다
  const pre = new DatabaseSync(path.join(home, 'backups', r.preRestore), { readOnly: true });
  assert.equal(pre.prepare("SELECT value FROM local_settings WHERE key='locale'").get().value, 'zh');
  pre.close();
});

// ─── import (§54) ────────────────────────────────────────────────────────────

test('import preview: 행 수 · 인식 열 · 사용 필드 · 버릴 열 · 부족 필수 · 형식 불량 행 · 키 통계 — DB 미변경', () => {
  boot();
  const p = db.previewImport(REQ);
  assert.equal(p.ok, true);
  assert.equal(p.rowCount, 3);
  assert.deepEqual(p.recognizedColumns, ['품목명', '바코드', '단가', '비고']);
  assert.deepEqual(p.usedFields, ['item_name', 'barcode', 'unit_price']);
  assert.deepEqual(p.droppedColumns, ['비고']);
  assert.equal(p.malformedRows, 0);
  assert.equal(p.duplicateKeys, 0);
  assert.equal(db.LocalDatasetRepository.get('product_list'), null);
  // 필수 필드가 원본에 없으면 missing — 추측하지 않는다(§35)
  const m = db.previewImport({ ...REQ, columnMapping: { 품목명: 'item_name', 재고: 'stock' }, requiredFields: ['stock'], keyField: undefined });
  assert.equal(m.ok, false);
  assert.deepEqual(m.unknownSourceColumns, ['재고']);
  assert.ok(m.missingFields.includes('stock'));
  assert.throws(() => db.applyImport({ ...REQ, columnMapping: { 품목명: 'item_name', 재고: 'stock' }, requiredFields: ['stock'], keyField: undefined }), (e) => e.code === 'LOCAL_DB_REQUIRED_FIELD_MISSING');
  // 형식 불량(칸 수 불일치) 행은 세고 건너뛴다 · 빈 파일 · 헤더만 · 잘못된 이름
  const bad = db.previewImport({ ...REQ, csvText: CSV + 'A,B\r\n' });
  assert.equal(bad.malformedRows, 1);
  assert.equal(bad.rowCount, 3);
  assert.throws(() => db.previewImport({ ...REQ, csvText: '' }), (e) => e.code === 'LOCAL_DB_IMPORT_INVALID');
  const headerOnly = db.previewImport({ ...REQ, csvText: '품목명,바코드,단가\r\n' });
  assert.equal(headerOnly.rowCount, 0);
  assert.equal(headerOnly.ok, false);
  assert.throws(() => db.previewImport({ ...REQ, dataset: 'Drop Table' }), (e) => e.code === 'LOCAL_DB_IMPORT_INVALID');
  assert.throws(() => db.previewImport({ ...REQ, columnMapping: { 품목명: 'item-name' } }), (e) => e.code === 'LOCAL_DB_IMPORT_INVALID');
  assert.throws(() => db.previewImport({ ...REQ, keyField: 'nope' }), (e) => e.code === 'LOCAL_DB_IMPORT_INVALID');
});

test('import apply: 매핑 필드만 저장 · 재-import 는 key 로 upsert(중복 없음) · replace 모드 · 이력 기록 · 원본 열 미저장', () => {
  boot();
  const a = db.applyImport(REQ);
  assert.deepEqual([a.rowCount, a.inserted, a.updated, a.totalRows], [3, 3, 0, 3]);
  const rows = db.LocalDatasetRepository.rows('product_list');
  assert.equal(rows.length, 3);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['barcode', 'item_name', 'rowKey', 'unit_price']);
  assert.equal(rows[1].item_name, '게보린정, 10정');
  assert.equal(rows[0].rowKey, '8806400000001');
  assert.ok(!JSON.stringify(rows).includes('메모'), '버린 열(비고)은 저장되지 않는다');
  // 같은 파일 두 번 → 중복 없음(§36)
  const b = db.applyImport({ ...REQ, csvText: CSV.replace('3500', '3600') });
  assert.deepEqual([b.inserted, b.updated, b.totalRows], [0, 3, 3]);
  assert.equal(db.LocalDatasetRepository.rows('product_list')[0].unit_price, '3600');
  // replace
  const c = db.applyImport({ ...REQ, csvText: '품목명,바코드,단가\r\n하나,1,1\r\n', mode: 'replace' });
  assert.equal(c.totalRows, 1);
  assert.equal(db.LocalDatasetRepository.get('product_list').row_count, 1);
  assert.equal(db.LocalImportRepository.recent(10).length, 3);
  // key 없이 → 순번 키(중복 방지 없음 — 문서화된 V1 한계)
  db.applyImport({ ...REQ, dataset: 'plain', keyField: undefined, requiredFields: [] });
  db.applyImport({ ...REQ, dataset: 'plain', keyField: undefined, requiredFields: [] });
  assert.equal(db.LocalDatasetRepository.get('plain').row_count, 6);
});

test('import 5,000행 fixture · 트랜잭션 원자성(실패 시 0행)', () => {
  boot();
  const lines = ['품목명,바코드,단가'];
  for (let i = 0; i < 5000; i += 1) lines.push(`상품${i},880${String(i).padStart(10, '0')},${i}`);
  const t0 = Date.now();
  const a = db.applyImport({ ...REQ, csvText: lines.join('\n') });
  assert.equal(a.totalRows, 5000);
  assert.ok(Date.now() - t0 < 10_000);
  // 빈 키가 섞이면 통째로 거절 — 부분 저장 없음
  assert.throws(() => db.applyImport({ ...REQ, dataset: 'atomic', requiredFields: [], csvText: '품목명,바코드,단가\r\nA,1,1\r\nB,,2\r\n' }), (e) => e.code === 'LOCAL_DB_IMPORT_INVALID');
  assert.throws(() => db.applyImport({ ...REQ, dataset: 'atomic', csvText: '품목명,바코드,단가\r\nA,1,1\r\nB,,2\r\n' }), (e) => e.code === 'LOCAL_DB_REQUIRED_FIELD_MISSING');
  assert.equal(db.LocalDatasetRepository.get('atomic'), null);
});

// ─── export (§55) ────────────────────────────────────────────────────────────

test('export: rows · header · escaping · UTF-8 한글 · empty dataset · columns 부분집합 · 모르는 dataset', () => {
  boot();
  db.applyImport(REQ);
  const r = db.exportDataset({ dataset: 'product_list' });
  assert.equal(r.rowCount, 3);
  const lines = r.csv.split('\r\n');
  assert.equal(lines[0], 'item_name,barcode,unit_price');
  assert.equal(lines[2], '"게보린정, 10정",8806400000002,2900');
  assert.equal(lines[3], '한글상품,8806400000003,1000');
  assert.equal(Buffer.from(r.csv, 'utf8').toString('utf8'), r.csv);
  const sub = db.exportDataset({ dataset: 'product_list', columns: ['barcode'] });
  assert.equal(sub.csv.split('\r\n')[0], 'barcode');
  assert.throws(() => db.exportDataset({ dataset: 'product_list', columns: ['rowKey'] }), (e) => e.code === 'LOCAL_DB_EXPORT_FAILED');
  assert.throws(() => db.exportDataset({ dataset: 'nothing_here' }), (e) => e.code === 'LOCAL_DB_EXPORT_FAILED');
  // 빈 dataset → 헤더만
  db.applyImport({ ...REQ, dataset: 'tmp', csvText: '품목명,바코드,단가\r\nX,1,1\r\n' });
  db.openLocalDb().prepare("DELETE FROM local_dataset_rows WHERE dataset='tmp'").run();
  const e = db.exportDataset({ dataset: 'tmp' });
  assert.equal(e.rowCount, 0);
  assert.equal(e.csv, 'item_name,barcode,unit_price');
  assert.equal(db.openLocalDb().prepare('SELECT COUNT(*) AS n FROM local_exports').get().n, 3);
});

// ─── concurrency · crash (§56·§57) ───────────────────────────────────────────

test('동시 요청: handler 50개 병렬 set_setting/health 가 busy 없이 끝난다', async () => {
  boot();
  const jobs = [];
  for (let i = 0; i < 50; i += 1) {
    jobs.push(handlers.runAction('local.data.set_setting', {}, { key: 'locale', value: i % 2 ? 'ko' : 'en' }));
    jobs.push(handlers.runAction('local.data.health', {}, undefined));
  }
  const results = await Promise.all(jobs);
  assert.ok(results.every((r) => r.status === 'success'), JSON.stringify(results.find((r) => r.status !== 'success')));
});

test('crash 모사: 커밋되지 않은 트랜잭션은 재기동 뒤 남지 않고 quick_check ok', () => {
  boot();
  db.LocalSettingsRepository.set('locale', 'ko');
  const h = db.openLocalDb();
  h.exec('BEGIN');
  h.prepare("INSERT INTO local_settings(key, value, updated_at) VALUES('ghost', 'x', 'now')").run();
  // 프로세스가 죽은 것처럼 커밋 없이 핸들만 버린다
  db.closeLocalDb();
  const s = boot();
  assert.equal(s.ready, true);
  assert.equal(s.integrityStatus, 'ok');
  assert.equal(db.LocalSettingsRepository.get('ghost'), null);
  assert.equal(db.LocalSettingsRepository.get('locale'), 'ko');
});

// ─── CLI · health · handler (§29·§58·§64) ────────────────────────────────────

test('CLI: status → backup → backups → import(preview/apply) → export → restore', async () => {
  const out = [];
  const print = (m) => out.push(String(m));
  assert.equal(await cli.runDataCommand(['status'], print), 0);
  const st = JSON.parse(out[0]);
  assert.equal(st.ready, true);
  assert.equal(st.schemaVersion, db.SCHEMA_VERSION);
  assert.equal(await cli.runDataCommand(['backup'], print), 0);
  assert.equal(await cli.runDataCommand(['backups'], print), 0);
  assert.equal(bk.listBackups().length, 1);
  const csvFile = path.join(home, 'user-provided.csv');
  fs.writeFileSync(csvFile, '﻿' + CSV, 'utf8');
  assert.equal(await cli.runDataCommand(['import', '--file', csvFile, '--dataset', 'product_list', '--map', '품목명=item_name,바코드=barcode,단가=unit_price', '--key', 'barcode', '--required', 'item_name,barcode', '--preview'], print), 0);
  assert.equal(db.LocalDatasetRepository.get('product_list'), null, 'preview 는 쓰지 않는다');
  assert.equal(await cli.runDataCommand(['import', '--file', csvFile, '--dataset', 'product_list', '--map', '품목명=item_name,바코드=barcode,단가=unit_price', '--key', 'barcode'], print), 0);
  assert.equal(db.LocalDatasetRepository.get('product_list').row_count, 3);
  const outFile = path.join(home, 'export.csv');
  assert.equal(await cli.runDataCommand(['export', '--dataset', 'product_list', '--out', outFile], print), 0);
  const exported = fs.readFileSync(outFile, 'utf8');
  assert.ok(exported.startsWith('﻿item_name,barcode,unit_price'));
  assert.ok(exported.includes('한글상품'));
  // 잘못된 필수 필드 → exit 3, 미적용
  assert.equal(await cli.runDataCommand(['import', '--file', csvFile, '--dataset', 'other', '--map', '품목명=item_name', '--required', 'stock'], print), 3);
  assert.equal(db.LocalDatasetRepository.get('other'), null);
  // restore → import 이전(백업 시점) 으로
  const id = bk.listBackups().find((b) => b.reason === 'manual').id;
  assert.equal(await cli.runDataCommand(['restore', id], print), 0);
  assert.equal(db.LocalDatasetRepository.get('product_list'), null);
  assert.ok(bk.listBackups().some((b) => b.reason === 'pre-restore'));
  // 출력에 행 데이터가 없다
  assert.ok(!out.join('\n').includes('8806400000001'));
  assert.ok(!out.join('\n').includes('타이레놀'));
});

test('health: handler 응답에 ready·schemaVersion·migrationStatus·integrityStatus·backupCount 가 있고 경로가 없다 · /health localData 요약', async () => {
  boot();
  bk.createBackup(db.openLocalDb(), 'manual');
  const r = await handlers.runAction('local.data.health', {}, undefined);
  assert.equal(r.status, 'success');
  assert.equal(r.data.ready, true);
  assert.equal(r.data.schemaVersion, db.SCHEMA_VERSION);
  assert.equal(r.data.migrationStatus, 'current');
  assert.equal(r.data.integrityStatus, 'ok');
  assert.equal(r.data.backupCount, 1);
  assert.match(r.data.lastBackupAt, /^\d{4}-\d{2}-\d{2}T/);
  const text = JSON.stringify(r.data);
  assert.ok(!text.includes(home) && !text.includes('local.db') && !text.includes('backups'));
  // local-server 의 /health 요약 — 서버를 띄우지 않고 함수 계약만(ONECLICK spec 이 endpoint 를 잠근다)
  const src = fs.readFileSync(new URL('../src/local-server.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes('localData: safeLocalDataSummary(localDataSummary)'));
  assert.ok(/^\s*const out = \{ ready: s\.ready === true, schemaVersion:/m.test(src));
  void server;
});

test('경계: local-db 에 파일 읽기·네트워크 없음 · backup 모듈은 자기 backups 디렉터리만 · handlers 는 CLI 모듈을 싣지 않는다 · 민감 스키마 0', () => {
  const read = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const ldb = read('local-db.mjs');
  for (const bad of ['readFileSync', 'readdirSync', 'fetch(', 'http', 'execute_sql', 'patient', 'prescription', 'insurance', 'password', 'cookie']) assert.ok(!ldb.includes(bad), bad);
  assert.equal((ldb.match(/new DatabaseSync\(/g) ?? []).length, 1);
  const bkp = read('local-db-backup.mjs');
  assert.ok(bkp.includes("path.join(agentHome(), 'backups')"));
  assert.ok(!bkp.includes('fetch(') && !bkp.includes('http'));
  assert.ok(!bkp.includes('process.argv'));
  const h = read('handlers.mjs');
  assert.ok(!h.includes('local-data-cli') && !h.includes("'node:fs'"));
  // migration 은 코드 상수뿐 — 문자열 SQL 을 밖에서 받는 통로가 없다
  assert.ok(!ldb.includes('JSON.parse(sql') && !ldb.includes('db.exec(args'));
});
