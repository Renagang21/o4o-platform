/**
 * Local Work Agent — 로컬 데이터 런타임 (Local Data Runtime V1)
 *
 * WO-O4O-LOCAL-DATA-SQLITE-V0 (V0 · 접근 단일화 · 경로 자율 · 의존성 0)
 * WO-O4O-LOCAL-DATA-RUNTIME-AND-SCHEMA-EVOLUTION-V1 (V1 · bootstrap · 버전 · 무결성 · 백업 · import/export)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SQLite 접근을 한 곳으로 모은다 (V0 §27)
 *
 * 이 파일이 저장소 안에서 SQLite 를 여는 **유일한** 곳이다. 각 tool 이 DB 파일을
 * 제멋대로 열지 않는다 — 열기 · 마이그레이션 · 조회 · 트랜잭션 · 닫기가 전부 여기 있다.
 * 백업 파일의 목록·보존·복원(파일 시스템)은 `local-db-backup.mjs` 가 맡고, 이 모듈은
 * 스냅샷을 **DB 안에서**(`VACUUM INTO`) 만든다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 사용자가 하지 않는 것 (V1 §2)
 *
 *   SQLite 설치 · migration 실행 · schema version 관리 — 전부 agent 가 시작할 때 한다:
 *   DB 없음 → 만든다 · 있음 → 버전 확인 → 필요한 migration 만 순서대로(각각 트랜잭션,
 *   적용 전 백업) → 무결성 확인 → ready. 실패는 삼키지 않는다 — 코드로 남기고 데이터
 *   축을 닫는다(§17). 더 새로운 schema 는 내리지 않는다(§20).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 경로는 이 모듈이 스스로 정한다 (V0 §7·§19·§34)
 *
 * DB 파일은 `agentHome()/local.db` — credentials.json 옆이다. 이 모듈은 **서버가
 * 보낸 경로를 절대 받지 않는다.** import 함수도 파일 시스템을 뒤지지 않는다 — 이미
 * 파싱된 텍스트/행만 받는다. 따라서 `node:fs` 사용은 자기 홈 디렉터리 하나를
 * 만드는 것(mkdir)뿐이고, 임의 파일 접근 통로가 존재하지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 하지 않는 것 (V0 §31~§37 · V1 §5·§15·§40·§44)
 *
 * - cloud 업로드 · 원본 테이블 동기화 · 자동 복제: 없음. 이 파일에 http/fetch 가 없다.
 * - 임의 SQL 실행 tool: 없음. 서버·AI·사용자 입력이 SQL 문자열로 오는 통로가 없다 —
 *   migration 은 이 파일에 체크인된 코드뿐이다(§14·§15).
 * - credential/비밀번호/쿠키/토큰을 DB 정체성으로 쓰지 않는다 — local_db_id 는 무작위 UUID 다.
 * - 환자·처방·보험·주민번호 등 민감정보 스키마: 만들지 않는다(§44).
 * - 업무 테이블(상품·매출·공급자·주문 선호)을 미리 만들지 않는다(§42) — 실제 반복 업무가
 *   생길 때 migration 으로 additive 하게 키운다.
 */

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ─── 오류 계약 (V1 §58) ─────────────────────────────────────────────────────

export const LOCAL_DB_ERROR = Object.freeze({
  NOT_READY: 'LOCAL_DB_NOT_READY',
  MIGRATION_FAILED: 'LOCAL_DB_MIGRATION_FAILED',
  SCHEMA_TOO_NEW: 'LOCAL_DB_SCHEMA_TOO_NEW',
  INTEGRITY_FAILED: 'LOCAL_DB_INTEGRITY_FAILED',
  BACKUP_FAILED: 'LOCAL_DB_BACKUP_FAILED',
  IMPORT_INVALID: 'LOCAL_DB_IMPORT_INVALID',
  REQUIRED_FIELD_MISSING: 'LOCAL_DB_REQUIRED_FIELD_MISSING',
  EXPORT_FAILED: 'LOCAL_DB_EXPORT_FAILED',
});

/** 코드가 붙은 오류. 메시지는 로컬 콘솔용이고 밖(cloud)으로는 코드만 나간다(§59). */
export class LocalDbError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = 'LocalDbError';
    this.code = code;
  }
}

// ─── 경로 (V0 §7 · V1 §7) ───────────────────────────────────────────────────

/**
 * DB 파일이 사는 곳. credentials.mjs 와 **같은** 규칙을 쓴다 — 다만 이 모듈은
 * 자기 경로만 계산하고 서버 입력을 받지 않는다. 두 모듈 다 자기 파일 하나만 다룬다.
 */
export function agentHome() {
  if (process.env.O4O_AGENT_HOME) return process.env.O4O_AGENT_HOME;
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(base, 'o4o-local-agent');
}

function dbPath() {
  return path.join(agentHome(), 'local.db');
}

// ─── Migration chain (V0 §4·§13 · V1 §11~§14·§19) ───────────────────────────

/**
 * forward-only 마이그레이션. 각 항목은 `version` · `name` · `up(db)`.
 *   - 앞으로만 간다(내려가지 않는다). version 은 1 부터 빈틈없이 이어진다(startup 이 검사한다).
 *   - 각 migration 은 하나의 트랜잭션이다 — SQLite 는 DDL 도 트랜잭션 안에서 롤백된다(실측).
 *   - `IF NOT EXISTS` 로 idempotent — 같은 migration 을 다시 돌려도 안전.
 *   - 사용자가 SQL 을 직접 돌릴 일이 없다 — agent 가 시작 때 스스로 적용한다.
 *
 * 업무 테이블(주문·재고·상품·고객)을 여기서 대량 생성하지 않는다(V1 §42). 002 는 업무
 * 테이블이 아니라 **import/export 의 저장 기반**(dataset 단위 행 저장)이다 — 어떤 업무
 * 데이터를 담을지는 실제 필요가 생길 때 dataset 이름과 mapping 으로 정한다(§43).
 */
export const MIGRATIONS = Object.freeze([
  {
    version: 1,
    name: 'core_v0',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_meta (
          key        TEXT PRIMARY KEY,
          value      TEXT,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_schema_migrations (
          version    INTEGER PRIMARY KEY,
          name       TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_settings (
          key        TEXT PRIMARY KEY,
          value      TEXT,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_mappings (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          source_type    TEXT NOT NULL,
          profile_name   TEXT NOT NULL,
          column_mapping TEXT NOT NULL,
          version        INTEGER NOT NULL DEFAULT 1,
          created_at     TEXT NOT NULL,
          updated_at     TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_imports (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          source_type     TEXT NOT NULL,
          profile_name    TEXT NOT NULL,
          row_count       INTEGER NOT NULL DEFAULT 0,
          dropped_columns TEXT,
          missing_fields  TEXT,
          created_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_exports (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          target     TEXT NOT NULL,
          format     TEXT NOT NULL,
          row_count  INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_work_state (
          key        TEXT PRIMARY KEY,
          value      TEXT,
          updated_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 2,
    name: 'datasets_v1',
    up(db) {
      // import 로 들어온 행의 저장 기반(V1 §31~§39). dataset 하나 = 이름 · 필드 목록 · (선택) 키 필드.
      // 행은 매핑된 필드만 JSON 으로 담는다(§32 — 원본 열 전부를 저장하지 않는다).
      // key_field 가 있으면 같은 키의 재-import 는 덮어쓴다(§36 — dataset 별 키 전략).
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_datasets (
          name       TEXT PRIMARY KEY,
          key_field  TEXT,
          fields     TEXT NOT NULL,
          row_count  INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_dataset_rows (
          dataset     TEXT NOT NULL REFERENCES local_datasets(name) ON DELETE CASCADE,
          row_key     TEXT NOT NULL,
          data        TEXT NOT NULL,
          imported_at TEXT NOT NULL,
          PRIMARY KEY (dataset, row_key)
        );
      `);
    },
  },
  {
    version: 3,
    name: 'work_runs_v1',
    up(db) {
      // WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1 (PHASE 1)
      // same-run resume 의 **정본 원장**. logical Work Run 하나 = 한 row.
      //   run_id        — runtime 이 발급한 logical run 식별자(cloud coordination 과 동일 값).
      //   status        — active | waiting_for_user | completed | taken_over | expired.
      //   target_id     — 등재 대상(browser_site/windows_app) 식별자. 없으면 NULL.
      //   goal_summary  — semantic 목표 요약(사용자가 입력한 업무 문장, 짧게). 이것은 사용자 PC 의
      //                   자기 데이터이므로 정본으로 담는다.
      //   note          — 재개용 semantic 메모(예: 마지막 질문 요지). 짧은 텍스트만.
      // 저장 금지(§검증 D · 조건 6): 이미지 · screenshot · raw DOM 전문 · credential/token ·
      //   개인정보/환자정보 · 화면 전체 텍스트 dump. 이 테이블에 그런 컬럼은 없다.
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_work_runs (
          run_id       TEXT PRIMARY KEY,
          status       TEXT NOT NULL DEFAULT 'active',
          target_id    TEXT,
          goal_summary TEXT,
          note         TEXT,
          created_at   TEXT NOT NULL,
          updated_at   TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_local_work_runs_status
          ON local_work_runs (status);
      `);
    },
  },
]);

/** DB 스키마 버전 = 체크인된 마지막 migration 의 version(§11). 따로 손으로 올리지 않는다. */
export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/**
 * migration 목록 자체의 정합성(§19) — 중복 id · 빈틈 · 1 부터 시작 · 이름 형식.
 * startup 마다 검사한다. 코드 실수를 사용자 PC 에서 migration 으로 굳히지 않기 위해서다.
 */
export function validateMigrationChain(migrations) {
  const list = Array.isArray(migrations) ? migrations : [];
  if (list.length === 0) return { ok: false, reason: 'empty' };
  for (let i = 0; i < list.length; i += 1) {
    const m = list[i];
    if (!m || !Number.isInteger(m.version) || typeof m.name !== 'string' || typeof m.up !== 'function') {
      return { ok: false, reason: 'malformed', version: m?.version };
    }
    if (!/^[a-z0-9_]{1,64}$/.test(m.name)) return { ok: false, reason: 'bad_name', version: m.version };
    if (m.version !== i + 1) {
      const dup = list.some((o, j) => j !== i && o?.version === m.version);
      return { ok: false, reason: dup ? 'duplicate' : 'gap', version: m.version };
    }
  }
  return { ok: true, latest: list[list.length - 1].version };
}

function nowIso() {
  return new Date().toISOString();
}

// ─── Bootstrap (V1 §8·§9·§16~§20·§28) ───────────────────────────────────────

let cachedDb = null;

/**
 * 마지막 bootstrap 결과. `ready:false` 면 데이터 축이 닫혀 있다 — repository 는
 * `LOCAL_DB_NOT_READY`(또는 원인 코드)를 던진다. 경로는 담지 않는다(§29·§30).
 */
let runtimeState = { ready: false, errorCode: LOCAL_DB_ERROR.NOT_READY, schemaVersion: 0, expectedSchemaVersion: SCHEMA_VERSION };

export function getLocalDbState() {
  return { ...runtimeState };
}

/** 적용된 migration 행. 아직 테이블이 없으면 빈 배열. */
function appliedMigrations(db) {
  const has = db
    .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='local_schema_migrations'")
    .get();
  if (!has) return [];
  return db.prepare('SELECT version, name, applied_at FROM local_schema_migrations ORDER BY version').all();
}

/**
 * 적용된 migration 이력 vs 코드의 chain 을 대조한다(§19·§20).
 *   too_new    — 코드가 모르는 더 높은 version 이 적용돼 있다 → 내리지 않고 멈춘다
 *   mismatch   — 같은 version 인데 이름이 다르다(다른 chain 의 DB) → 멈춘다
 *   gap        — 적용 이력에 빈틈이 있다(부분 적용 흔적) → 멈춘다
 *   ok         — pending = 적용되지 않은 코드 migration 목록
 */
export function compareMigrationHistory(applied, migrations) {
  const known = new Map(migrations.map((m) => [m.version, m]));
  const maxKnown = migrations[migrations.length - 1]?.version ?? 0;
  let expected = 1;
  for (const row of applied) {
    const v = Number(row.version);
    if (v > maxKnown) return { status: 'too_new', version: v };
    if (v !== expected) return { status: 'gap', version: v };
    if (known.get(v)?.name !== row.name) return { status: 'mismatch', version: v };
    expected += 1;
  }
  return { status: 'ok', applied: expected - 1, pending: migrations.filter((m) => m.version >= expected) };
}

/**
 * DB 를 세운다(§8·§16). 이미 세워져 있으면 그 결과를 돌려준다.
 *
 *   directory → 열기 → PRAGMA → quick_check → 이력 대조 → (pending 있으면 백업 → 적용) → meta → ready
 *
 * 실패는 예외로 새지 않고 `state.errorCode` 로 남는다(§17). 이때 DB 는 닫힌 채 두고
 * repository 호출은 그 코드로 거절된다. 자동 복구·자동 덮어쓰기는 하지 않는다(§27).
 *
 * `options.migrations` 는 **테스트 fixture 전용**(§50·§51) — 운영 경로는 항상 체크인된 MIGRATIONS 다.
 * `options.backup(db, reason)` 은 migration 직전에 호출되는 스냅샷 함수(local-db-backup 이 준다).
 */
export function bootstrapLocalDb(options = {}) {
  if (cachedDb && runtimeState.ready) return getLocalDbState();
  const migrations = options.migrations ?? MIGRATIONS;
  const log = typeof options.log === 'function' ? options.log : () => {};
  const startedAt = Date.now();
  const fail = (errorCode, extra = {}) => {
    runtimeState = { ready: false, errorCode, schemaVersion: extra.schemaVersion ?? 0, expectedSchemaVersion: migrations[migrations.length - 1]?.version ?? 0, ...extra };
    log(`local data: ${errorCode}`);
    return getLocalDbState();
  };

  const chain = validateMigrationChain(migrations);
  if (!chain.ok) return fail(LOCAL_DB_ERROR.MIGRATION_FAILED, { chainStatus: chain.reason });

  let db;
  try {
    fs.mkdirSync(agentHome(), { recursive: true });
    db = new DatabaseSync(dbPath());
    // 안전한 설정만(§10). WAL(동시 읽기 안전) · FK 강제 · 잠금 대기.
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA busy_timeout = 5000');
  } catch {
    try { db?.close(); } catch { /* ignore */ }
    return fail(LOCAL_DB_ERROR.NOT_READY);
  }

  // 무결성(§28) — startup 1회. 매 요청마다 돌리지 않는다.
  let integrity = 'ok';
  try {
    const row = db.prepare('PRAGMA quick_check').get();
    integrity = String(row?.quick_check ?? 'unknown') === 'ok' ? 'ok' : 'failed';
  } catch {
    integrity = 'failed';
  }
  if (integrity !== 'ok') {
    db.close();
    return fail(LOCAL_DB_ERROR.INTEGRITY_FAILED, { integrityStatus: 'failed' });
  }

  const applied = appliedMigrations(db);
  const cmp = compareMigrationHistory(applied, migrations);
  const currentVersion = applied.length ? Number(applied[applied.length - 1].version) : 0;
  if (cmp.status === 'too_new') {
    db.close();
    return fail(LOCAL_DB_ERROR.SCHEMA_TOO_NEW, { schemaVersion: currentVersion, integrityStatus: 'ok', chainStatus: 'too_new' });
  }
  if (cmp.status !== 'ok') {
    db.close();
    return fail(LOCAL_DB_ERROR.MIGRATION_FAILED, { schemaVersion: currentVersion, integrityStatus: 'ok', chainStatus: cmp.status });
  }

  let backupStatus = 'not_needed';
  if (cmp.pending.length > 0) {
    // migration 전 백업(§21·§23·§76). 백업이 안 되면 migration 을 하지 않는다 — 옛 schema 로도 읽기는 되니 멈추는 쪽이 안전.
    // 방금 만든 빈 DB(적용 이력 0)는 지킬 데이터가 없으므로 백업하지 않는다.
    if (applied.length === 0) {
      backupStatus = 'not_needed';
    } else if (typeof options.backup === 'function') {
      try {
        options.backup(db, 'pre-migration');
        backupStatus = 'created';
      } catch {
        db.close();
        return fail(LOCAL_DB_ERROR.BACKUP_FAILED, { schemaVersion: currentVersion, integrityStatus: 'ok', chainStatus: 'ok', pendingMigrations: cmp.pending.length });
      }
    } else {
      backupStatus = 'skipped';
    }
    for (const m of cmp.pending) {
      db.exec('BEGIN');
      try {
        m.up(db);
        db.prepare('INSERT INTO local_schema_migrations(version, name, applied_at) VALUES(?, ?, ?)').run(m.version, m.name, nowIso());
        db.exec('COMMIT');
        log(`local data: migration ${m.version}_${m.name} applied`);
      } catch {
        try { db.exec('ROLLBACK'); } catch { /* ignore */ }
        const appliedNow = appliedMigrations(db);
        db.close();
        return fail(LOCAL_DB_ERROR.MIGRATION_FAILED, {
          schemaVersion: appliedNow.length ? Number(appliedNow[appliedNow.length - 1].version) : 0,
          integrityStatus: 'ok', chainStatus: 'ok', failedMigration: m.version, backupStatus,
        });
      }
    }
  }

  seedMeta(db);
  cachedDb = db;
  runtimeState = {
    ready: true, errorCode: null,
    schemaVersion: migrations[migrations.length - 1].version, expectedSchemaVersion: migrations[migrations.length - 1].version,
    migrationsApplied: applied.length + cmp.pending.length, appliedNow: cmp.pending.map((m) => m.version),
    integrityStatus: 'ok', chainStatus: 'ok', backupStatus, durationMs: Date.now() - startedAt,
  };
  return getLocalDbState();
}

/**
 * DB 핸들 — bootstrap 이 성공했을 때만. 아직 세우지 않았으면 기본 chain 으로 세운다(테스트·V0 호환).
 * bootstrap 이 실패한 상태면 그 코드로 던진다(§17·§58) — "조용히 새 DB" 는 없다.
 */
export function openLocalDb() {
  if (cachedDb && runtimeState.ready) return cachedDb;
  if (!cachedDb) bootstrapLocalDb();
  if (!runtimeState.ready) throw new LocalDbError(runtimeState.errorCode ?? LOCAL_DB_ERROR.NOT_READY);
  return cachedDb;
}

/** local_meta 정체성 값 초기화 — 최초 1회만. 민감정보는 넣지 않는다. */
function seedMeta(db) {
  const set = (key, value) =>
    db
      .prepare(
        'INSERT INTO local_meta(key, value, updated_at) VALUES(?, ?, ?) ' +
          'ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',
      )
      .run(key, value, nowIso());
  const existing = db.prepare('SELECT value FROM local_meta WHERE key=?').get('local_db_id');
  if (!existing) {
    set('local_db_id', randomUUID());
    set('created_at', nowIso());
  }
  const latest = db.prepare('SELECT MAX(version) AS v FROM local_schema_migrations').get();
  set('schema_version', String(Number(latest?.v ?? 0)));
  set('updated_at', nowIso());
}

/** 닫는다 — 재기동 검증 · 복원 전에. 다음 openLocalDb/bootstrap 이 다시 세운다. */
export function closeLocalDb() {
  if (cachedDb) {
    try { cachedDb.close(); } catch { /* ignore */ }
    cachedDb = null;
  }
  runtimeState = { ready: false, errorCode: LOCAL_DB_ERROR.NOT_READY, schemaVersion: runtimeState.schemaVersion ?? 0, expectedSchemaVersion: SCHEMA_VERSION };
}

/**
 * 트랜잭션으로 감싼다. fn 안에서 던지면 ROLLBACK, 정상 종료면 COMMIT. 반환값은 fn 의 반환값.
 */
export function withTransaction(fn) {
  const db = openLocalDb();
  db.exec('BEGIN');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * 열린 DB 의 일관된 스냅샷을 `destinationPath` 에 만든다(§22). `VACUUM INTO` 는 WAL 상태에서도
 * 트랜잭션 일관성이 있는 사본을 쓴다(실측) — 파일을 단순 복사하는 것과 다르다.
 * 목적지 경로는 local-db-backup 이 자기 backups 디렉터리 안에서만 정한다.
 */
export function snapshotInto(db, destinationPath) {
  db.prepare('VACUUM INTO ?').run(String(destinationPath));
}

// ─── Repository — 고정 쿼리를 감싼 최소 메서드. 임의 SQL 통로 없음 ───────────

/** local_meta 읽기. key/value 만. */
export const LocalMetaRepository = {
  get(key) {
    const row = openLocalDb().prepare('SELECT value FROM local_meta WHERE key=?').get(String(key));
    return row ? row.value : null;
  },
  all() {
    return openLocalDb().prepare('SELECT key, value FROM local_meta ORDER BY key').all();
  },
};

/** local_settings 읽기/쓰기. 값은 문자열로만 저장한다. */
export const LocalSettingsRepository = {
  get(key) {
    const row = openLocalDb().prepare('SELECT value FROM local_settings WHERE key=?').get(String(key));
    return row ? row.value : null;
  },
  set(key, value) {
    const k = String(key);
    const v = value == null ? null : String(value);
    openLocalDb()
      .prepare(
        'INSERT INTO local_settings(key, value, updated_at) VALUES(?, ?, ?) ' +
          'ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',
      )
      .run(k, v, nowIso());
    return { key: k, value: v };
  },
  all() {
    return openLocalDb().prepare('SELECT key, value FROM local_settings ORDER BY key').all();
  },
};

/** import 이력 기록 — 최소 필드. 원본 파일은 저장하지 않는다. */
export const LocalImportRepository = {
  record({ sourceType, profileName, rowCount, droppedColumns, missingFields }) {
    openLocalDb()
      .prepare(
        'INSERT INTO local_imports(source_type, profile_name, row_count, dropped_columns, missing_fields, created_at) ' +
          'VALUES(?, ?, ?, ?, ?, ?)',
      )
      .run(
        String(sourceType),
        String(profileName),
        Number(rowCount) || 0,
        droppedColumns ? JSON.stringify(droppedColumns) : null,
        missingFields ? JSON.stringify(missingFields) : null,
        nowIso(),
      );
  },
  recent(limit = 20) {
    return openLocalDb()
      .prepare(
        'SELECT id, source_type, profile_name, row_count, dropped_columns, missing_fields, created_at ' +
          'FROM local_imports ORDER BY id DESC LIMIT ?',
      )
      .all(Number(limit) || 20);
  },
};

/** import mapping 프로파일. 최소한 — 자동 추론을 과하게 만들지 않는다. */
export const LocalMappingRepository = {
  save({ sourceType, profileName, columnMapping }) {
    openLocalDb()
      .prepare(
        'INSERT INTO local_mappings(source_type, profile_name, column_mapping, version, created_at, updated_at) ' +
          'VALUES(?, ?, ?, 1, ?, ?)',
      )
      .run(String(sourceType), String(profileName), JSON.stringify(columnMapping ?? {}), nowIso(), nowIso());
  },
};

/** dataset 단위 행 저장(V1 §31~§39). 이름은 규칙 안의 식별자만 — 테이블 이름이 아니라 행의 라벨이다. */
export const DATASET_NAME_RE = /^[a-z][a-z0-9_]{0,63}$/;
export const FIELD_NAME_RE = /^[a-z][a-z0-9_]{0,63}$/;

export const LocalDatasetRepository = {
  get(name) {
    const row = openLocalDb().prepare('SELECT name, key_field, fields, row_count, created_at, updated_at FROM local_datasets WHERE name=?').get(String(name));
    return row ? { ...row, fields: JSON.parse(row.fields) } : null;
  },
  list() {
    return openLocalDb().prepare('SELECT name, key_field, fields, row_count, updated_at FROM local_datasets ORDER BY name').all()
      .map((r) => ({ ...r, fields: JSON.parse(r.fields) }));
  },
  rows(name, limit = 100000) {
    return openLocalDb()
      .prepare('SELECT row_key, data FROM local_dataset_rows WHERE dataset=? ORDER BY rowid LIMIT ?')
      .all(String(name), Number(limit) || 100000)
      .map((r) => ({ rowKey: r.row_key, ...JSON.parse(r.data) }));
  },
};

/** same-run resume 정본 원장(PHASE 1). 고정 쿼리만 — 임의 SQL 통로 없음. */
export const WORK_RUN_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const WORK_RUN_STATUSES = Object.freeze(['active', 'waiting_for_user', 'completed', 'taken_over', 'expired']);
/** semantic 요약 필드는 짧게만 담는다 — 화면 dump·raw 데이터 유입 방지(§검증 D). */
const WORK_RUN_TEXT_CAP = 500;

function clampWorkRunText(value) {
  if (value == null) return null;
  const s = String(value);
  return s.length > WORK_RUN_TEXT_CAP ? s.slice(0, WORK_RUN_TEXT_CAP) : s;
}

export const LocalWorkRunRepository = {
  /** logical run 생성/갱신(idempotent). 재개 요청이 같은 runId 로 다시 와도 안전하다. */
  upsert({ runId, status, targetId, goalSummary, note }) {
    const id = String(runId);
    const st = WORK_RUN_STATUSES.includes(status) ? status : 'active';
    const now = nowIso();
    openLocalDb()
      .prepare(
        'INSERT INTO local_work_runs(run_id, status, target_id, goal_summary, note, created_at, updated_at) ' +
          'VALUES(?, ?, ?, ?, ?, ?, ?) ' +
          'ON CONFLICT(run_id) DO UPDATE SET ' +
          'status=excluded.status, ' +
          'target_id=COALESCE(excluded.target_id, local_work_runs.target_id), ' +
          'goal_summary=COALESCE(excluded.goal_summary, local_work_runs.goal_summary), ' +
          'note=excluded.note, ' +
          'updated_at=excluded.updated_at',
      )
      .run(
        id,
        st,
        targetId == null ? null : String(targetId),
        clampWorkRunText(goalSummary),
        clampWorkRunText(note),
        now,
        now,
      );
    return { runId: id, status: st };
  },
  /** 상태만 전이한다(note 는 넘긴 경우에만 덮어쓴다). 종료 상태(completed/taken_over/expired)로도 사용. */
  setStatus(runId, status, note) {
    const st = WORK_RUN_STATUSES.includes(status) ? status : null;
    if (!st) return { ok: false };
    const hasNote = note !== undefined;
    openLocalDb()
      .prepare(
        hasNote
          ? 'UPDATE local_work_runs SET status=?, note=?, updated_at=? WHERE run_id=?'
          : 'UPDATE local_work_runs SET status=?, updated_at=? WHERE run_id=?',
      )
      .run(...(hasNote ? [st, clampWorkRunText(note), nowIso(), String(runId)] : [st, nowIso(), String(runId)]));
    return { ok: true, runId: String(runId), status: st };
  },
  /** agent 내부 진단용 조회. cloud 로 read-back 하지 않는다(§조건 4). */
  get(runId) {
    return openLocalDb()
      .prepare('SELECT run_id, status, target_id, goal_summary, note, created_at, updated_at FROM local_work_runs WHERE run_id=?')
      .get(String(runId)) || null;
  },
};

// ─── CSV parse/map (순수 함수 · 파일 시스템 없음) ───────────────────────────

/**
 * CSV 텍스트를 행 배열로 파싱한다 — 순수 함수, 파일 시스템을 건드리지 않는다.
 * 첫 줄을 헤더로 본다. 따옴표(`"..."`), 따옴표 안 콤마·개행·이스케이프(`""`)를 지원한다.
 * 헤더와 칸 수가 다른 행은 `malformedRows` 로 센다(빈 칸 채움·잘라내기로 억지 정렬하지 않는다 §35).
 * 반환: `{ header, rows, malformedRows }`.
 */
export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, ''); // BOM 제거
  const records = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      record.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      field = '';
      record = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  const nonEmpty = records.filter((r) => !(r.length === 1 && r[0] === ''));
  if (nonEmpty.length === 0) return { header: [], rows: [], malformedRows: 0 };
  const header = nonEmpty[0].map((h) => h.trim());
  let malformedRows = 0;
  const rows = [];
  for (const cells of nonEmpty.slice(1)) {
    if (cells.length !== header.length) {
      malformedRows += 1;
      continue;
    }
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = cells[idx] ?? '';
    });
    rows.push(obj);
  }
  return { header, rows, malformedRows };
}

/**
 * 파싱된 행을 니드 기반으로 정리한다(§32·§35) — 순수 함수, DB 를 건드리지 않는다.
 *
 * `columnMapping`: `{ 원본컬럼: 대상필드 }`. 매핑에 없는 원본 컬럼은 **버린다**.
 * `requiredFields` 중 매핑 결과에서 값이 비어 있는 것은 `missingFields` 로 모은다 — 억지로 채우지 않는다.
 */
export function mapImportRows(rows, columnMapping, requiredFields = []) {
  const mapping = columnMapping ?? {};
  const sourceCols = rows.length > 0 ? Object.keys(rows[0]) : [];
  const droppedColumns = sourceCols.filter((c) => !(c in mapping));
  const mapped = rows.map((row) => {
    const out = {};
    for (const [src, dest] of Object.entries(mapping)) {
      out[dest] = row[src] ?? '';
    }
    return out;
  });
  const missingSet = new Set();
  for (const field of requiredFields) {
    const mappedToField = Object.values(mapping).includes(field);
    if (!mappedToField) {
      missingSet.add(field);
      continue;
    }
    const anyEmpty = mapped.some((r) => r[field] == null || String(r[field]).trim() === '');
    if (mapped.length === 0 || anyEmpty) missingSet.add(field);
  }
  return { mapped, droppedColumns, missingFields: [...missingSet] };
}

// ─── Import (V1 §31~§36) ────────────────────────────────────────────────────

export const IMPORT_MAX_ROWS = 200_000;
export const IMPORT_MAX_TEXT_LENGTH = 64 * 1024 * 1024;

/** import 요청의 형상 검사 — dataset · mapping · key/required 필드 이름 규칙. 실패는 IMPORT_INVALID. */
function validateImportRequest({ csvText, dataset, columnMapping, requiredFields, keyField }) {
  if (typeof csvText !== 'string') throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'csvText must be text');
  if (csvText.length > IMPORT_MAX_TEXT_LENGTH) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'csv too large');
  if (typeof dataset !== 'string' || !DATASET_NAME_RE.test(dataset)) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'bad dataset name');
  if (!columnMapping || typeof columnMapping !== 'object' || Array.isArray(columnMapping) || Object.keys(columnMapping).length === 0) {
    throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'columnMapping required');
  }
  for (const [src, dest] of Object.entries(columnMapping)) {
    if (typeof src !== 'string' || src.trim() === '' || typeof dest !== 'string' || !FIELD_NAME_RE.test(dest)) {
      throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'bad mapping entry');
    }
  }
  const fields = [...new Set(Object.values(columnMapping))];
  const required = Array.isArray(requiredFields) ? requiredFields : [];
  for (const f of required) if (typeof f !== 'string' || !FIELD_NAME_RE.test(f)) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'bad required field');
  if (keyField != null && (typeof keyField !== 'string' || !fields.includes(keyField))) {
    throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'keyField must be a mapped field');
  }
  return { fields, required };
}

/**
 * import 미리보기(§34) — DB 를 쓰지 않는다. 행 수 · 인식된 열 · 쓸 필드 · 버릴 열 · 부족 필수 필드 ·
 * 형식 불량 행 수를 돌려준다. 같은 검사를 apply 도 지나므로 preview 가 ok 면 apply 도 같은 판정이다.
 */
export function previewImport(request) {
  const { fields, required } = validateImportRequest(request);
  const { header, rows, malformedRows } = parseCsv(request.csvText);
  if (header.length === 0) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'empty csv');
  if (rows.length > IMPORT_MAX_ROWS) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'too many rows');
  const unknownSource = Object.keys(request.columnMapping).filter((c) => !header.includes(c));
  const { mapped, droppedColumns, missingFields } = mapImportRows(rows, request.columnMapping, required);
  const keyField = request.keyField ?? null;
  let duplicateKeys = 0;
  let emptyKeys = 0;
  if (keyField) {
    const seen = new Set();
    for (const r of mapped) {
      const k = String(r[keyField] ?? '').trim();
      if (k === '') { emptyKeys += 1; continue; }
      if (seen.has(k)) duplicateKeys += 1;
      seen.add(k);
    }
  }
  const existing = LocalDatasetRepository.get(request.dataset);
  return {
    dataset: request.dataset,
    rowCount: mapped.length,
    recognizedColumns: header,
    usedFields: fields,
    droppedColumns,
    unknownSourceColumns: unknownSource,
    missingFields: [...new Set([...missingFields, ...(unknownSource.length ? required.filter((f) => unknownSource.some((c) => request.columnMapping[c] === f)) : [])])],
    malformedRows,
    keyField,
    duplicateKeys,
    emptyKeys,
    existingRows: existing ? Number(existing.row_count) : 0,
    ok: missingFields.length === 0 && unknownSource.length === 0 && emptyKeys === 0 && mapped.length > 0,
  };
}

/**
 * import 적용(§31·§36) — preview 와 같은 검사 뒤 하나의 트랜잭션으로 저장한다.
 * 필수 필드가 비면 `REQUIRED_FIELD_MISSING` 으로 거절하고 아무것도 쓰지 않는다(§35).
 * keyField 가 있으면 같은 키는 덮어쓴다(upsert), 없으면 이번 import 순번이 키다(중복 방지 없음 — §36).
 * mode: 'merge'(기본) | 'replace'(dataset 의 기존 행을 지우고 넣는다).
 */
export function applyImport(request) {
  const preview = previewImport(request);
  if (preview.missingFields.length > 0 || preview.unknownSourceColumns.length > 0) {
    throw new LocalDbError(LOCAL_DB_ERROR.REQUIRED_FIELD_MISSING, `missing: ${preview.missingFields.join(',')}`);
  }
  if (preview.emptyKeys > 0) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'empty key values');
  if (preview.rowCount === 0) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'no rows');
  const { rows } = parseCsv(request.csvText);
  const { mapped } = mapImportRows(rows, request.columnMapping, []);
  const mode = request.mode === 'replace' ? 'replace' : 'merge';
  const keyField = preview.keyField;
  const ts = nowIso();
  const importId = ts.replace(/[-:.TZ]/g, '').slice(0, 17);

  const result = withTransaction((db) => {
    const existing = db.prepare('SELECT name, key_field, fields FROM local_datasets WHERE name=?').get(request.dataset);
    if (!existing) {
      db.prepare('INSERT INTO local_datasets(name, key_field, fields, row_count, created_at, updated_at) VALUES(?, ?, ?, 0, ?, ?)')
        .run(request.dataset, keyField, JSON.stringify(preview.usedFields), ts, ts);
    } else {
      const merged = [...new Set([...JSON.parse(existing.fields), ...preview.usedFields])];
      db.prepare('UPDATE local_datasets SET key_field=?, fields=?, updated_at=? WHERE name=?')
        .run(keyField ?? existing.key_field ?? null, JSON.stringify(merged), ts, request.dataset);
    }
    if (mode === 'replace') db.prepare('DELETE FROM local_dataset_rows WHERE dataset=?').run(request.dataset);
    const upsert = db.prepare(
      'INSERT INTO local_dataset_rows(dataset, row_key, data, imported_at) VALUES(?, ?, ?, ?) ' +
        'ON CONFLICT(dataset, row_key) DO UPDATE SET data=excluded.data, imported_at=excluded.imported_at',
    );
    let inserted = 0;
    let updated = 0;
    mapped.forEach((r, i) => {
      const key = keyField ? String(r[keyField]).trim() : `${importId}_${String(i + 1).padStart(7, '0')}`;
      const exists = keyField ? db.prepare('SELECT 1 AS ok FROM local_dataset_rows WHERE dataset=? AND row_key=?').get(request.dataset, key) : null;
      upsert.run(request.dataset, key, JSON.stringify(r), ts);
      if (exists) updated += 1; else inserted += 1;
    });
    const count = db.prepare('SELECT COUNT(*) AS n FROM local_dataset_rows WHERE dataset=?').get(request.dataset);
    db.prepare('UPDATE local_datasets SET row_count=?, updated_at=? WHERE name=?').run(Number(count?.n ?? 0), ts, request.dataset);
    db.prepare(
      'INSERT INTO local_imports(source_type, profile_name, row_count, dropped_columns, missing_fields, created_at) VALUES(?, ?, ?, ?, ?, ?)',
    ).run('csv', request.dataset, mapped.length, JSON.stringify(preview.droppedColumns), null, ts);
    return { inserted, updated, totalRows: Number(count?.n ?? 0) };
  });
  return { dataset: request.dataset, mode, rowCount: mapped.length, ...result, droppedColumns: preview.droppedColumns, malformedRows: preview.malformedRows };
}

/**
 * V0 호환 — 파싱·매핑·이력만(행 저장 없음). V1 의 저장은 `applyImport` 가 한다.
 * 파일 경로를 받지 않는다 — 파일 선택·읽기는 이 모듈 밖(사용자 선택 기반)에서 한다.
 */
export function importCsv({ csvText, sourceType, profileName, columnMapping, requiredFields = [] }) {
  const { header, rows } = parseCsv(csvText);
  const { mapped, droppedColumns, missingFields } = mapImportRows(rows, columnMapping, requiredFields);
  LocalImportRepository.record({ sourceType, profileName, rowCount: mapped.length, droppedColumns, missingFields });
  return { header, importedRows: mapped, rowCount: mapped.length, droppedColumns, missingFields };
}

// ─── Export (V1 §37~§39) ────────────────────────────────────────────────────

/**
 * 행 배열을 CSV 문자열로 만든다 — 순수 함수. `columns` 를 주면 그 순서/집합으로, 없으면 첫 행의 키로.
 * 콤마·따옴표·개행이 든 값은 따옴표로 감싸고 `"` 는 `""` 로. 줄바꿈은 CRLF(Excel 호환).
 */
export function toCsv(rows, columns) {
  const list = Array.isArray(rows) ? rows : [];
  const cols = columns ?? (list.length > 0 ? Object.keys(list[0]) : []);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [cols.map(esc).join(',')];
  for (const row of list) lines.push(cols.map((c) => esc(row[c])).join(','));
  return lines.join('\r\n');
}

/** export 이력 기록 — 크기 지표만. 내보낸 내용은 저장하지 않는다. */
export function recordExport({ target, format, rowCount }) {
  openLocalDb()
    .prepare('INSERT INTO local_exports(target, format, row_count, created_at) VALUES(?, ?, ?, ?)')
    .run(String(target), String(format), Number(rowCount) || 0, nowIso());
}

/**
 * dataset 하나를 CSV 로 내보낸다(§37·§39). 전체 DB dump 가 아니다 — 이름을 댄 dataset 의 저장 필드만.
 * `columns` 로 부분 집합을 고를 수 있다(dataset 필드 밖 열은 거절). 빈 dataset 은 헤더만 나간다.
 */
export function exportDataset({ dataset, columns }) {
  if (typeof dataset !== 'string' || !DATASET_NAME_RE.test(dataset)) throw new LocalDbError(LOCAL_DB_ERROR.EXPORT_FAILED, 'bad dataset name');
  const meta = LocalDatasetRepository.get(dataset);
  if (!meta) throw new LocalDbError(LOCAL_DB_ERROR.EXPORT_FAILED, 'unknown dataset');
  let cols = meta.fields;
  if (columns != null) {
    if (!Array.isArray(columns) || columns.length === 0 || columns.some((c) => !meta.fields.includes(c))) {
      throw new LocalDbError(LOCAL_DB_ERROR.EXPORT_FAILED, 'columns outside dataset');
    }
    cols = columns;
  }
  const rows = LocalDatasetRepository.rows(dataset);
  const csv = toCsv(rows, cols);
  recordExport({ target: dataset, format: 'csv', rowCount: rows.length });
  return { dataset, format: 'csv', rowCount: rows.length, columns: cols, csv };
}

// ─── Health (V0 §38 · V1 §29) ───────────────────────────────────────────────

/**
 * 로컬 DB 상태 — 시작 때/요청 때 확인용.
 *
 * **경로를 절대 담지 않는다** — dbPath() 는 사용자명을 포함하므로 밖으로 나가면 샌다.
 * 돌려주는 것은 불리언·숫자·짧은 상태 문자열뿐이다. 열기/마이그레이션이 실패했으면 예외 대신
 * 정규화된 코드를 담아 돌려준다. `backup` 요약은 local-db-backup 이 `options.backupSummary()` 로 준다.
 */
export function localDbHealth(options = {}) {
  const state = cachedDb && runtimeState.ready ? runtimeState : bootstrapLocalDb();
  const backup = typeof options.backupSummary === 'function' ? safeBackupSummary(options.backupSummary) : undefined;
  if (!state.ready) {
    return {
      ok: false, available: false, ready: false, errorCode: state.errorCode,
      schemaVersion: Number(state.schemaVersion ?? 0), expectedSchemaVersion: SCHEMA_VERSION,
      migrationStatus: state.errorCode === LOCAL_DB_ERROR.SCHEMA_TOO_NEW ? 'too_new' : 'failed',
      integrityStatus: state.integrityStatus ?? 'unknown',
      ...(backup ? { backupCount: backup.count, lastBackupAt: backup.lastAt } : {}),
    };
  }
  try {
    const db = cachedDb;
    const schemaVersion = Number(LocalMetaRepository.get('schema_version') ?? 0);
    const migRow = db.prepare('SELECT MAX(version) AS v, COUNT(*) AS n FROM local_schema_migrations').get();
    const tableRow = db
      .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name LIKE 'local\\_%' ESCAPE '\\'")
      .get();
    const latest = Number(migRow?.v ?? 0);
    const migrationOk = latest === SCHEMA_VERSION;
    return {
      ok: true,
      available: true,
      ready: true,
      schemaVersion,
      expectedSchemaVersion: SCHEMA_VERSION,
      latestMigration: latest,
      pendingMigrations: Math.max(0, SCHEMA_VERSION - latest),
      migrationsApplied: Number(migRow?.n ?? 0),
      migrationOk,
      migrationStatus: migrationOk ? 'current' : 'behind',
      integrityStatus: state.integrityStatus ?? 'ok',
      tableCount: Number(tableRow?.n ?? 0),
      ...(backup ? { backupCount: backup.count, lastBackupAt: backup.lastAt } : {}),
    };
  } catch (err) {
    return { ok: false, available: false, ready: false, errorCode: err?.code ?? LOCAL_DB_ERROR.NOT_READY };
  }
}

function safeBackupSummary(fn) {
  try {
    const s = fn();
    return { count: Number(s?.count ?? 0), lastAt: typeof s?.lastAt === 'string' ? s.lastAt : null };
  } catch {
    return { count: 0, lastAt: null };
  }
}
