/**
 * Local Work Agent — 로컬 데이터 런타임 (Local Data Runtime V0)
 *
 * WO-O4O-LOCAL-DATA-SQLITE-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SQLite 접근을 한 곳으로 모은다 (§27)
 *
 * 이 파일이 저장소 안에서 SQLite 를 여는 **유일한** 곳이다. 각 tool 이 DB 파일을
 * 제멋대로 열지 않는다 — 열기 · 마이그레이션 · 조회 · 트랜잭션 · 닫기가 전부 여기 있다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 경로는 이 모듈이 스스로 정한다 (§7·§19·§34)
 *
 * DB 파일은 `agentHome()/local.db` — credentials.json 옆이다. 이 모듈은 **서버가
 * 보낸 경로를 절대 받지 않는다.** import 함수도 파일 시스템을 뒤지지 않는다 — 이미
 * 파싱된 행(rows)만 받는다(§18·§19). 따라서 `node:fs` 사용은 자기 홈 디렉터리
 * 하나를 만드는 것(mkdir)뿐이고, 임의 파일 접근 통로가 존재하지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 의존성 0 (§6)
 *
 * SQLite 는 Node 22 에 내장된 `node:sqlite` 다. 외부 패키지를 쓰지 않는다.
 * (Node 는 import 시 `ExperimentalWarning` 을 한 줄 낸다 — 동작에는 영향 없음.)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 하지 않는 것 (§31~§37)
 *
 * - cloud 업로드 · 원본 테이블 동기화 · 자동 복제: 없음. 이 파일에 http/fetch 가 없다.
 * - 임의 SQL 실행 tool: 없음. 밖으로 나가는 것은 고정 쿼리를 감싼 repository 메서드뿐이다.
 * - credential/비밀번호/쿠키/토큰을 DB 정체성으로 쓰지 않는다 — local_db_id 는 무작위 UUID 다(§9).
 * - 환자·처방·보험·주민번호 등 민감정보 스키마: 만들지 않는다(§33).
 */

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/** DB 스키마 버전 — migration 을 추가할 때마다 올린다(§4). */
export const SCHEMA_VERSION = 1;

/**
 * DB 파일이 사는 곳. credentials.mjs 와 **같은** 규칙을 쓴다(§7) — 다만 이 모듈은
 * 자기 경로만 계산하고 서버 입력을 받지 않는다. 두 모듈 다 자기 파일 하나만 다룬다.
 */
function agentHome() {
  if (process.env.O4O_AGENT_HOME) return process.env.O4O_AGENT_HOME;
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(base, 'o4o-local-agent');
}

function dbPath() {
  return path.join(agentHome(), 'local.db');
}

/**
 * forward-only 마이그레이션 (§4·§13).
 *
 * 각 항목은 `version` · `name` · `up(db)`. 규칙:
 *   - 앞으로만 간다(내려가지 않는다).
 *   - `CREATE TABLE IF NOT EXISTS` 로 idempotent — 같은 마이그레이션을 다시 돌려도 안전.
 *   - 사용자가 SQL 을 직접 돌릴 일이 없다 — agent 가 시작 때 스스로 적용한다.
 *
 * 업무 테이블(주문·재고·상품·고객)을 여기서 대량 생성하지 않는다(§14). 핵심 테이블만
 * 만들고, 실제 업무가 붙을 때 migration 002+ 로 additive 하게 키운다.
 */
const MIGRATIONS = [
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
];

function nowIso() {
  return new Date().toISOString();
}

let cachedDb = null;

/**
 * DB 를 연다 — 없으면 만들고, 있으면 그대로 쓴다(§4). 안전한 PRAGMA 만 건다(§29).
 * 그 다음 필요한 마이그레이션을 순서대로 적용한다. 이미 열려 있으면 캐시를 돌려준다.
 */
export function openLocalDb() {
  if (cachedDb) return cachedDb;
  fs.mkdirSync(agentHome(), { recursive: true });
  const db = new DatabaseSync(dbPath());
  // §29 — 안전한 설정만. WAL(동시 읽기 안전), FK 강제, 잠금 대기.
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  runMigrations(db);
  seedMeta(db);
  cachedDb = db;
  return db;
}

/** 적용된 최고 마이그레이션 버전. 아직 테이블이 없으면 0. */
function appliedVersion(db) {
  const has = db
    .prepare(
      "SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='local_schema_migrations'",
    )
    .get();
  if (!has) return 0;
  const row = db.prepare('SELECT MAX(version) AS v FROM local_schema_migrations').get();
  return Number(row?.v ?? 0);
}

/**
 * 필요한 마이그레이션만 순서대로, 각각 하나의 트랜잭션으로 적용한다(§13).
 * 실패하면 그 마이그레이션은 통째로 롤백되어 부분 적용이 남지 않는다.
 */
function runMigrations(db) {
  const from = appliedVersion(db);
  for (const m of MIGRATIONS) {
    if (m.version <= from) continue;
    db.exec('BEGIN');
    try {
      m.up(db);
      db.prepare(
        'INSERT INTO local_schema_migrations(version, name, applied_at) VALUES(?, ?, ?)',
      ).run(m.version, m.name, nowIso());
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

/** local_meta 정체성 값 초기화(§9·§11) — 최초 1회만. 민감정보는 넣지 않는다. */
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
  // schema_version · updated_at 은 열 때마다 현재값으로 맞춘다.
  set('schema_version', String(SCHEMA_VERSION));
  set('updated_at', nowIso());
}

/** 테스트/재기동 검증용 — 캐시를 비우고 닫는다. */
export function closeLocalDb() {
  if (cachedDb) {
    cachedDb.close();
    cachedDb = null;
  }
}

/**
 * 트랜잭션으로 감싼다(§27). fn 안에서 던지면 ROLLBACK, 정상 종료면 COMMIT.
 * 반환값은 fn 의 반환값.
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

// ─── Repository (§28) — 고정 쿼리를 감싼 최소 메서드. 임의 SQL 통로 없음 ──────────

/** local_meta 읽기 (§11). key/value 만. */
export const LocalMetaRepository = {
  get(key) {
    const row = openLocalDb().prepare('SELECT value FROM local_meta WHERE key=?').get(String(key));
    return row ? row.value : null;
  },
  all() {
    return openLocalDb().prepare('SELECT key, value FROM local_meta ORDER BY key').all();
  },
};

/** local_settings 읽기/쓰기 (§10·§35). 값은 문자열로만 저장한다. */
export const LocalSettingsRepository = {
  get(key) {
    const row = openLocalDb()
      .prepare('SELECT value FROM local_settings WHERE key=?')
      .get(String(key));
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

/** import 이력 기록 (§21) — 최소 필드. 원본 파일은 저장하지 않는다(§17). */
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

/** import mapping 프로파일 (§20·§21). 최소한 — 자동 추론을 과하게 만들지 않는다. */
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

// ─── CSV import/export (§18·§20·§22·§25) ────────────────────────────────────

/**
 * CSV 텍스트를 행 배열로 파싱한다 — 순수 함수, 파일 시스템을 건드리지 않는다.
 * 첫 줄을 헤더로 본다. 따옴표(`"..."`), 따옴표 안 콤마·이스케이프(`""`)를 지원한다.
 * 반환: `{ header: string[], rows: Array<Record<string,string>> }`.
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
  // 마지막 필드/레코드 (개행으로 끝나지 않은 경우)
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  const nonEmpty = records.filter((r) => !(r.length === 1 && r[0] === ''));
  if (nonEmpty.length === 0) return { header: [], rows: [] };
  const header = nonEmpty[0].map((h) => h.trim());
  const rows = nonEmpty.slice(1).map((cells) => {
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = cells[idx] ?? '';
    });
    return obj;
  });
  return { header, rows };
}

/**
 * 파싱된 행을 니드 기반으로 정리한다(§16·§20·§22) — 순수 함수, DB 를 건드리지 않는다.
 *
 * `columnMapping`: `{ 원본컬럼: 대상필드 }` (예: `{ '품목명': 'item_name' }`).
 * 매핑에 없는 원본 컬럼은 **버린다**(§16). `requiredFields` 중 매핑 결과에서 값이
 * 비어 있는 것은 `missingFields` 로 모은다 — 억지로 채우지 않는다(§22).
 *
 * 반환: `{ mapped, droppedColumns, missingFields }`.
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

/**
 * CSV import 한 건(§18) — 이미 파싱된 CSV 텍스트를 받아 정리하고 이력을 남긴다.
 * 파일 경로를 받지 않는다 — 파일 선택·읽기는 이 모듈 밖(사용자 선택 기반, §19)에서 한다.
 *
 * 부족 필드가 있으면 강제 완성하지 않고 `missingFields` 를 그대로 돌려준다(§22) —
 * 사용자에게 데이터를 한 번 더 요청할 수 있게.
 */
export function importCsv({ csvText, sourceType, profileName, columnMapping, requiredFields = [] }) {
  const { header, rows } = parseCsv(csvText);
  const { mapped, droppedColumns, missingFields } = mapImportRows(rows, columnMapping, requiredFields);
  LocalImportRepository.record({
    sourceType,
    profileName,
    rowCount: mapped.length,
    droppedColumns,
    missingFields,
  });
  return { header, importedRows: mapped, rowCount: mapped.length, droppedColumns, missingFields };
}

/**
 * 행 배열을 CSV 문자열로 만든다(§25) — export V0 는 CSV 부터. 순수 함수.
 * `columns` 를 주면 그 순서/집합으로, 없으면 첫 행의 키로.
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

/** export 이력 기록(§25) — 크기 지표만. 내보낸 내용은 저장하지 않는다. */
export function recordExport({ target, format, rowCount }) {
  openLocalDb()
    .prepare('INSERT INTO local_exports(target, format, row_count, created_at) VALUES(?, ?, ?, ?)')
    .run(String(target), String(format), Number(rowCount) || 0, nowIso());
}

// ─── Health (§38) ───────────────────────────────────────────────────────────

/**
 * 로컬 DB 상태 — 시작 때/요청 때 확인용(§38).
 *
 * **경로를 절대 담지 않는다** — dbPath() 는 `%LOCALAPPDATA%\Users\<username>\...` 을
 * 포함하므로 밖으로 나가면 사용자명이 샌다. 돌려주는 것은 불리언·숫자뿐이다.
 * 열기/마이그레이션이 실패하면 예외 대신 정규화된 코드를 담아 돌려준다.
 */
export function localDbHealth() {
  try {
    const db = openLocalDb();
    const schemaVersion = Number(LocalMetaRepository.get('schema_version') ?? 0);
    const migRow = db.prepare('SELECT MAX(version) AS v, COUNT(*) AS n FROM local_schema_migrations').get();
    const tableRow = db
      .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name LIKE 'local\\_%' ESCAPE '\\'")
      .get();
    const migrationOk = Number(migRow?.v ?? 0) === SCHEMA_VERSION;
    return {
      ok: true,
      available: true,
      schemaVersion,
      expectedSchemaVersion: SCHEMA_VERSION,
      migrationsApplied: Number(migRow?.n ?? 0),
      migrationOk,
      tableCount: Number(tableRow?.n ?? 0),
    };
  } catch (err) {
    const code = /migrat/i.test(String(err?.message)) ? 'LOCAL_DB_MIGRATION_FAILED' : 'LOCAL_DB_NOT_AVAILABLE';
    return { ok: false, available: false, errorCode: code };
  }
}
