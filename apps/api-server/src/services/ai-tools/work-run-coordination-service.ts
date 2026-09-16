/**
 * Work Run Coordination — same-run resume 조정 원장 서비스 (서버측 SSOT)
 *
 * WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1 (PHASE 1)
 * 근거 IR: IR-O4O-WEB-AUTOMATION-RESUME-AND-WORKFLOW-STORE-PREFLIGHT-V1 (옵션 B)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 서비스가 하는 일 / 하지 않는 일
 *
 *   한다  — logical Work Run 의 **조정 상태**(run_id · 소유자 · device · status · version ·
 *           만료)를 Cloud Postgres 에 최소한으로 기록·조회·전이한다. 다중 Cloud Run
 *           인스턴스에서 같은 runId 를 안전하게 재개하기 위한 유일한 durable 앵커다.
 *   안 한다 — goal 원문 · 질문/답변 원문 · DOM · screenshot · trajectory · workflow step ·
 *           환자/처방/약품 데이터 · file path · credential 을 저장하지 않는다. Local SQLite 의
 *           raw run state 를 read-back 하지 않는다. 이 서비스는 "작업 내용 저장소"가 아니다.
 *
 * raw SQL 로 접근한다(TypeORM entity 아님) — local_agent_* 서비스와 동일 패턴.
 */

import type { DataSource } from 'typeorm';

/** run 이 재개 가능하게 열려 있는 시간. 전이마다 갱신된다. */
export const WORK_RUN_TTL_MS = 30 * 60 * 1000;
/** 종료된(completed/taken_over/expired) row 를 얼마나 지난 뒤 물리 삭제할지. */
const TERMINAL_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * 조정 상태(§IR QUESTION↔TAKEOVER 분리).
 *   active           — 실행 중.
 *   waiting_for_user — QUESTION. logical run 유지 · 사용자가 답하면 같은 runId 재개.
 *   completed        — 목표 달성/정상 종료. 재개 대상 아님.
 *   taken_over       — TAKEOVER. automation 종료 · 사용자 직접 · 자동 resume 대상 아님.
 *   expired          — TTL 만료. 안전하게 재개 거부.
 */
export type WorkRunStatus = 'active' | 'waiting_for_user' | 'completed' | 'taken_over' | 'expired';

export const WORK_RUN_STATUS: Readonly<Record<string, WorkRunStatus>> = Object.freeze({
  ACTIVE: 'active',
  WAITING_FOR_USER: 'waiting_for_user',
  COMPLETED: 'completed',
  TAKEN_OVER: 'taken_over',
  EXPIRED: 'expired',
});

const NON_RESUMABLE: readonly WorkRunStatus[] = Object.freeze(['completed', 'taken_over', 'expired']);

export interface WorkRunCoordinationRow {
  runId: string;
  userId: string;
  deviceId: string | null;
  status: WorkRunStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/** 왜 재개할 수 없는지. runtime 이 사용자 안내 문장을 고를 때 쓴다(원문 노출 없음). */
export type ResumeRejectReason = 'not_found' | 'not_owner' | 'expired' | 'terminal' | 'not_waiting';

export type ResumeCheck =
  | { ok: true; row: WorkRunCoordinationRow }
  | { ok: false; reason: ResumeRejectReason };

const RUN_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidRunId(value: unknown): value is string {
  return typeof value === 'string' && RUN_ID_RE.test(value);
}

/**
 * TypeORM `query()` 는 UPDATE...RETURNING 을 `[rows, affected]` 로 돌려준다 —
 * row 배열이 아니다. 여기서 벗겨 낸다(local-agent-service.returnedRows 와 동일 규칙).
 */
function returnedRows(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return Array.isArray(raw[0])
    ? (raw[0] as Array<Record<string, unknown>>)
    : (raw as Array<Record<string, unknown>>);
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? '');
}

function mapRow(row: Record<string, unknown> | undefined): WorkRunCoordinationRow | null {
  if (!row) return null;
  return {
    runId: String(row.run_id),
    userId: String(row.user_id),
    deviceId: row.device_id == null ? null : String(row.device_id),
    status: String(row.status) as WorkRunStatus,
    version: Number(row.version),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    expiresAt: toIso(row.expires_at),
  };
}

/**
 * 새 logical Work Run 을 연다. runId 는 runtime 이 발급한다(이 함수는 저장만).
 * 이미 있으면(재개 요청이 새 run 을 만들려 할 때) 조용히 기존 row 를 돌려준다 —
 * runId 는 PK 이므로 중복 생성은 일어나지 않는다.
 */
export async function createWorkRun(
  dataSource: DataSource,
  input: { runId: string; userId: string; deviceId?: string | null },
): Promise<WorkRunCoordinationRow | null> {
  if (!isValidRunId(input.runId) || !UUID_RE.test(input.userId)) return null;
  const deviceId = input.deviceId && UUID_RE.test(input.deviceId) ? input.deviceId : null;
  const rows = returnedRows(
    await dataSource.query(
      `INSERT INTO work_run_coordination (run_id, user_id, device_id, status, version, expires_at)
       VALUES ($1, $2, $3, 'active', 1, now() + ($4 || ' milliseconds')::interval)
       ON CONFLICT (run_id) DO NOTHING
       RETURNING run_id, user_id, device_id, status, version, created_at, updated_at, expires_at`,
      [input.runId, input.userId, deviceId, String(WORK_RUN_TTL_MS)],
    ),
  );
  if (rows.length > 0) return mapRow(rows[0]);
  // ON CONFLICT DO NOTHING → 이미 존재. 기존 row 를 돌려준다.
  return getWorkRun(dataSource, input.runId);
}

export async function getWorkRun(dataSource: DataSource, runId: string): Promise<WorkRunCoordinationRow | null> {
  if (!isValidRunId(runId)) return null;
  const rows = returnedRows(
    await dataSource.query(
      `SELECT run_id, user_id, device_id, status, version, created_at, updated_at, expires_at
       FROM work_run_coordination WHERE run_id = $1`,
      [runId],
    ),
  );
  return mapRow(rows[0]);
}

/**
 * 상태를 전이한다. optimistic concurrency — expectedVersion 을 넘기면 그 버전일 때만 쓴다
 * (다중 인스턴스 경쟁 시 한쪽만 이긴다). 비종료 상태로 갈 때는 만료 시각을 갱신한다.
 * 반환: 전이된 row(성공) 또는 null(runId 없음 · 버전 불일치 · 이미 종료).
 */
export async function transitionWorkRun(
  dataSource: DataSource,
  input: { runId: string; status: WorkRunStatus; expectedVersion?: number; deviceId?: string | null },
): Promise<WorkRunCoordinationRow | null> {
  if (!isValidRunId(input.runId)) return null;
  const terminal = NON_RESUMABLE.includes(input.status);
  // 종료 상태로 가면 만료 시각을 앞당기지 않는다(감사/조회 여지) — TTL cleanup 이 물리 삭제한다.
  const expiresClause = terminal ? 'expires_at' : `now() + ($3 || ' milliseconds')::interval`;
  const params: unknown[] = [input.runId, input.status];
  if (!terminal) params.push(String(WORK_RUN_TTL_MS));
  const versionIdx = params.length + 1;
  const deviceIdx = params.length + 2;
  params.push(input.expectedVersion ?? null);
  const deviceId = input.deviceId && UUID_RE.test(input.deviceId) ? input.deviceId : null;
  params.push(deviceId);
  const rows = returnedRows(
    await dataSource.query(
      `UPDATE work_run_coordination
       SET status = $2,
           version = version + 1,
           updated_at = now(),
           expires_at = ${expiresClause},
           device_id = COALESCE($${deviceIdx}, device_id)
       WHERE run_id = $1
         AND status NOT IN ('completed','taken_over','expired')
         AND ($${versionIdx}::int IS NULL OR version = $${versionIdx}::int)
       RETURNING run_id, user_id, device_id, status, version, created_at, updated_at, expires_at`,
      params,
    ),
  );
  return mapRow(rows[0]);
}

/**
 * 재개 가능한지 확정한다(§검증 A·E·F). 소유자 일치 + waiting_for_user + 미만료만 통과.
 * active(실행 중) 는 통과시키지 않는다 — 같은 run 을 두 곳에서 동시에 몰지 않는다.
 */
export async function checkResumable(
  dataSource: DataSource,
  input: { runId: string; userId: string },
): Promise<ResumeCheck> {
  const row = await getWorkRun(dataSource, input.runId);
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.userId !== input.userId) return { ok: false, reason: 'not_owner' };
  if (row.status === 'taken_over' || row.status === 'completed') return { ok: false, reason: 'terminal' };
  if (row.status === 'expired') return { ok: false, reason: 'expired' };
  if (new Date(row.expiresAt).getTime() <= Date.now()) return { ok: false, reason: 'expired' };
  if (row.status !== 'waiting_for_user') return { ok: false, reason: 'not_waiting' };
  return { ok: true, row };
}

/**
 * TTL cleanup(§검증 F). 만료된 active/waiting run 을 expired 로 넘기고, 오래된 종료 row 를
 * 물리 삭제한다. 배포/부팅 또는 run 시작 시점에 저비용으로 호출한다.
 * 반환: { expired, purged } 개수.
 */
export async function cleanupExpiredWorkRuns(dataSource: DataSource): Promise<{ expired: number; purged: number }> {
  const expiredRows = returnedRows(
    await dataSource.query(
      `UPDATE work_run_coordination
       SET status = 'expired', version = version + 1, updated_at = now()
       WHERE status IN ('active','waiting_for_user') AND expires_at <= now()
       RETURNING run_id`,
    ),
  );
  const purged = await dataSource.query(
    `DELETE FROM work_run_coordination
     WHERE status IN ('completed','taken_over','expired')
       AND updated_at < now() - ($1 || ' milliseconds')::interval`,
    [String(TERMINAL_RETENTION_MS)],
  );
  const purgedCount = Array.isArray(purged) && typeof purged[1] === 'number' ? purged[1] : 0;
  return { expired: expiredRows.length, purged: purgedCount };
}
