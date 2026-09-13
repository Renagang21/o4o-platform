/**
 * Local Work Agent — 로컬 DB 백업 · 보존 · 복원 (Local Data Runtime V1)
 *
 * WO-O4O-LOCAL-DATA-RUNTIME-AND-SCHEMA-EVOLUTION-V1 §21~§27
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 모듈이 파일 시스템을 쓰는 범위는 **자기 백업 디렉터리 하나**다
 *
 *   `agentHome()/backups/`  — local.db 옆. 목록(readdir) · 보존(unlink) · 복원(copy) 이
 *   전부 이 디렉터리 안의 `local-<시각>-<사유>.db` 파일만 대상으로 한다. 경로는 밖에서
 *   받지 않는다 — 복원은 **id**(파일명 규칙에 맞는 값)로만 고르고, id 는 정규식을 지나
 *   이 디렉터리에 join 된다. `..` · 절대 경로 · 다른 확장자는 규칙 밖이라 애초에 만들어지지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 백업 방식 (§22)
 *
 *   WAL 상태의 DB 파일을 단순 복사하면 -wal 에 있는 최근 쓰기가 빠질 수 있다. 그래서
 *   열린 핸들로 `VACUUM INTO`(local-db.snapshotInto) 를 써서 트랜잭션 일관성이 있는
 *   단일 파일 스냅샷을 만든다. 시점: migration 직전(자동) · 사용자 요청(CLI) — 매 startup 은 아니다(§23).
 *   보존: 최근 N개(§24). 어디에도 업로드하지 않는다(§25) — 이 파일에 네트워크 API 가 없다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 복원 (§26·§27)
 *
 *   자동 복원 엔진이 아니다. 사용자가 명시적으로(CLI) 고른 백업 id 로만, 그리고 복원 직전에
 *   현재 local.db 를 `pre-restore` 로 한 번 더 남긴 뒤 덮어쓴다 — 어떤 경로로도 데이터가
 *   조용히 사라지지 않는다. -wal/-shm 은 함께 치운다(옛 WAL 이 새 파일에 적용되면 손상).
 */

import fs from 'node:fs';
import path from 'node:path';
import { agentHome, snapshotInto, LOCAL_DB_ERROR, LocalDbError } from './local-db.mjs';

export const BACKUP_KEEP = 5;
const BACKUP_ID_RE = /^local-\d{8}T\d{6}(?:-\d{2})?-(pre-migration|manual|pre-restore)\.db$/;
const BACKUP_REASONS = Object.freeze(['pre-migration', 'manual', 'pre-restore']);

function backupsDir() {
  return path.join(agentHome(), 'backups');
}

function stamp(d = new Date()) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
}

/**
 * 열린 DB 의 스냅샷을 backups/ 에 만든다. 반환은 id 와 크기뿐(경로 없음).
 * 같은 초에 두 번 부르면 `-01`, `-02` … 순번을 붙인다. 보존 정리는 방금 만든 파일을 제외하고 한다.
 */
export function createBackup(db, reason = 'manual') {
  if (!BACKUP_REASONS.includes(reason)) throw new LocalDbError(LOCAL_DB_ERROR.BACKUP_FAILED, 'bad reason');
  try {
    fs.mkdirSync(backupsDir(), { recursive: true });
    const when = new Date();
    const base = `local-${stamp(when)}`;
    let id = `${base}-${reason}.db`;
    for (let seq = 1; fs.existsSync(path.join(backupsDir(), id)) && seq < 100; seq += 1) {
      id = `${base}-${String(seq).padStart(2, '0')}-${reason}.db`;
    }
    const target = path.join(backupsDir(), id);
    snapshotInto(db, target);
    const size = fs.statSync(target).size;
    const pruned = pruneBackups(BACKUP_KEEP, id);
    return { id, reason, bytes: size, createdAt: when.toISOString(), pruned };
  } catch (err) {
    if (err instanceof LocalDbError) throw err;
    throw new LocalDbError(LOCAL_DB_ERROR.BACKUP_FAILED, 'snapshot failed');
  }
}

/** 백업 목록(최신 먼저 — 파일 mtime 기준, 같으면 이름). id · 사유 · 크기 · 시각만 — 경로는 돌려주지 않는다. */
export function listBackups() {
  const dir = backupsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => BACKUP_ID_RE.test(f))
    .map((id) => {
      const st = fs.statSync(path.join(dir, id));
      const m = id.match(/^local-(\d{8}T\d{6})(?:-\d{2})?-(.+)\.db$/);
      const t = m[1];
      const createdAt = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T${t.slice(9, 11)}:${t.slice(11, 13)}:${t.slice(13, 15)}Z`;
      return { id, reason: m[2], bytes: st.size, createdAt, mtimeMs: st.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs || (a.id < b.id ? 1 : -1))
    .map(({ mtimeMs, ...rest }) => rest);
}

/** health 용 요약 — 개수와 최근 시각만. */
export function backupSummary() {
  const list = listBackups();
  return { count: list.length, lastAt: list[0]?.createdAt ?? null };
}

/** 최근 keep 개만 남긴다(§24). `protectId` 는 어떤 경우에도 지우지 않는다. 지운 id 목록을 돌려준다. */
export function pruneBackups(keep = BACKUP_KEEP, protectId = null) {
  const list = listBackups();
  const removed = [];
  for (const b of list.slice(Math.max(1, Number(keep) || BACKUP_KEEP))) {
    if (b.id === protectId) continue;
    fs.unlinkSync(path.join(backupsDir(), b.id));
    removed.push(b.id);
  }
  return removed;
}

/**
 * 백업 id 로 local.db 를 되돌린다(§26·§27). **DB 가 닫힌 상태**에서 부른다(CLI 가 보장).
 *   1. id 검증(규칙 밖은 거절) · 존재 확인
 *   2. 현재 local.db 가 있으면 `pre-restore` 스냅샷(열어서 VACUUM INTO — 열리지 않으면 파일 복사)
 *   3. local.db / -wal / -shm 교체
 * 되돌린 뒤의 검증(quick_check · migration)은 다음 bootstrap 이 한다.
 */
export function restoreBackup(id, { openForSnapshot } = {}) {
  if (typeof id !== 'string' || !BACKUP_ID_RE.test(id)) throw new LocalDbError(LOCAL_DB_ERROR.BACKUP_FAILED, 'bad backup id');
  const src = path.join(backupsDir(), id);
  if (!fs.existsSync(src)) throw new LocalDbError(LOCAL_DB_ERROR.BACKUP_FAILED, 'backup not found');
  const dbFile = path.join(agentHome(), 'local.db');
  let preRestore = null;
  if (fs.existsSync(dbFile)) {
    try {
      const handle = typeof openForSnapshot === 'function' ? openForSnapshot(dbFile) : null;
      if (handle) {
        preRestore = createBackup(handle, 'pre-restore').id;
        handle.close();
      } else {
        fs.mkdirSync(backupsDir(), { recursive: true });
        preRestore = `local-${stamp()}-pre-restore.db`;
        fs.copyFileSync(dbFile, path.join(backupsDir(), preRestore));
      }
    } catch {
      throw new LocalDbError(LOCAL_DB_ERROR.BACKUP_FAILED, 'pre-restore snapshot failed');
    }
  }
  for (const suffix of ['-wal', '-shm']) {
    const p = dbFile + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  fs.copyFileSync(src, dbFile);
  return { restored: id, preRestore };
}
