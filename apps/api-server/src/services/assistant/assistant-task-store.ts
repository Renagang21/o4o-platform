/**
 * Assistant Task store — `assistant_tasks` (raw SQL · entity 없음)
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1
 * 정본: `docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md` §4 · §9 · §17
 *
 * Task = 사용자가 맡긴 업무 하나. run(`work_run_coordination`)은 그 Task 의 실행 시도이며 Task 1 : N run 이다.
 *
 * 불변식
 *   - **구조만 저장한다.** 요청 원문 · 답변 · slot 값 · 화면 text 를 받는 인자 자체가 없다.
 *     식별자 형식 필드(target · task type · serviceKey)는 형식을 통과한 값만 저장하고 나머지는 NULL 로 버린다.
 *   - **UUID 단독 조회 금지**(Boundary Guard Rule 1) — 모든 조회 · 갱신은 요청자(`requested_by_user_id`)를 함께 건다.
 *     run 연결도 run 의 `user_id` 를 함께 걸어 다른 사용자의 run 에 붙지 않는다.
 *   - 보존 기간은 정하지 않는다(PENDING_LEGAL_DATA_PROCESSING_GATE). purge 경로 없음.
 */

import type { DataSource } from 'typeorm';
import { TASK_KEY_RE } from '../ai-tools/work-assistance.js';

export type TaskOwnershipScope = 'USER' | 'ORGANIZATION';

export type AssistantTaskStatus =
  | 'running'
  | 'waiting_for_user'
  | 'blocked'
  | 'completed'
  | 'handed_over'
  | 'stopped';

/** 종결 상태 — 이 Task 에는 새 run 을 붙이지 않는다. blocked · waiting_for_user 는 종결이 아니다. */
export const TERMINAL_TASK_STATUSES: readonly AssistantTaskStatus[] = ['completed', 'handed_over', 'stopped'];

export const TASK_RETENTION_POLICY = 'PENDING_LEGAL_DATA_PROCESSING_GATE' as const;

export interface TaskOwnership {
  scope: TaskOwnershipScope;
  /** ORGANIZATION 일 때만 값이 있다. */
  organizationId: string | null;
  /** 서버가 membership 을 확인한 canonical serviceKey. 확인 못 하면 null. */
  serviceKey: string | null;
}

export interface AssistantTaskRow {
  taskId: string;
  requestedByUserId: string;
  ownershipScope: TaskOwnershipScope;
  organizationId: string | null;
  serviceKey: string | null;
  targetKind: string | null;
  targetId: string | null;
  taskTypeKey: string | null;
  status: AssistantTaskStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SERVICE_KEY_RE = /^[a-z][a-z0-9-]{0,63}$/;
const TARGET_KIND_RE = /^[a-z][a-z0-9_]{0,31}$/;
const TARGET_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
const RUN_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function isTaskId(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function isTerminalTaskStatus(status: AssistantTaskStatus): boolean {
  return TERMINAL_TASK_STATUSES.includes(status);
}

/** 형식을 통과한 식별자만 남긴다 — 자유 문자열(원문 · 값)이 식별자 칸으로 새지 않게. */
function identifierOrNull(v: unknown, re: RegExp): string | null {
  return typeof v === 'string' && re.test(v) ? v : null;
}

const SELECT_COLUMNS = `id, requested_by_user_id, ownership_scope, organization_id, service_key,
  target_kind, target_id, task_type_key, status, created_at, updated_at, completed_at`;

function mapRow(r: Record<string, unknown>): AssistantTaskRow {
  return {
    taskId: String(r.id),
    requestedByUserId: String(r.requested_by_user_id),
    ownershipScope: r.ownership_scope as TaskOwnershipScope,
    organizationId: (r.organization_id as string | null) ?? null,
    serviceKey: (r.service_key as string | null) ?? null,
    targetKind: (r.target_kind as string | null) ?? null,
    targetId: (r.target_id as string | null) ?? null,
    taskTypeKey: (r.task_type_key as string | null) ?? null,
    status: r.status as AssistantTaskStatus,
    createdAt: r.created_at as Date,
    updatedAt: r.updated_at as Date,
    completedAt: (r.completed_at as Date | null) ?? null,
  };
}

/** UPDATE … RETURNING 은 [rows, count] 로 오기도 한다(드라이버 형태 차이) — 행 배열만 꺼낸다. */
function returnedRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as Record<string, unknown>[];
  return Array.isArray(result) ? (result as Record<string, unknown>[]) : [];
}

export interface CreateAssistantTaskInput {
  requestedByUserId: string;
  ownership: TaskOwnership;
}

export async function createAssistantTask(
  dataSource: DataSource,
  input: CreateAssistantTaskInput,
): Promise<AssistantTaskRow> {
  const { ownership } = input;
  const organizationId = ownership.scope === 'ORGANIZATION' ? ownership.organizationId : null;
  const rows = returnedRows(
    await dataSource.query(
      `INSERT INTO assistant_tasks (requested_by_user_id, ownership_scope, organization_id, service_key, status)
       VALUES ($1, $2, $3, $4, 'running')
       RETURNING ${SELECT_COLUMNS}`,
      [input.requestedByUserId, ownership.scope, organizationId, identifierOrNull(ownership.serviceKey, SERVICE_KEY_RE)],
    ),
  );
  return mapRow(rows[0]);
}

/** 요청자 본인의 Task 만 돌려준다. 남의 taskId 는 존재하지 않는 것과 같다. */
export async function getAssistantTaskForRequester(
  dataSource: DataSource,
  taskId: string,
  requestedByUserId: string,
): Promise<AssistantTaskRow | null> {
  if (!isTaskId(taskId)) return null;
  const rows = returnedRows(
    await dataSource.query(
      `SELECT ${SELECT_COLUMNS} FROM assistant_tasks WHERE id = $1 AND requested_by_user_id = $2`,
      [taskId, requestedByUserId],
    ),
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

/** 이 사용자의 run 이 붙어 있는 Task id. run 이 없거나 남의 run 이거나 Phase A 이전 run 이면 null. */
export async function findTaskIdByRun(
  dataSource: DataSource,
  runId: string,
  userId: string,
): Promise<string | null> {
  if (!RUN_ID_RE.test(runId)) return null;
  const rows = returnedRows(
    await dataSource.query(`SELECT task_id FROM work_run_coordination WHERE run_id = $1 AND user_id = $2`, [runId, userId]),
  );
  const taskId = rows[0]?.task_id;
  return typeof taskId === 'string' ? taskId : null;
}

/**
 * Phase D — 이 Task 의 최근 run 이 실행된 노드(최신순 · 중복 제거 · 최대 limit). Assistant 가 노드 선택의 선호로 넘긴다
 * (같은 Task 를 이어가면 그 노드의 실행환경 · 노드 원장이 맞을 가능성이 높다). 강제가 아니다.
 * 요청자 조건(user_id)을 함께 건다 — 남의 run 노드는 나오지 않는다.
 */
export async function recentTaskNodeIds(
  dataSource: DataSource,
  taskId: string,
  userId: string,
  limit = 3,
): Promise<string[]> {
  if (!isTaskId(taskId)) return [];
  const rows = returnedRows(
    await dataSource.query(
      `SELECT device_id, MAX(updated_at) AS last_at
         FROM work_run_coordination
        WHERE task_id = $1 AND user_id = $2 AND device_id IS NOT NULL
        GROUP BY device_id
        ORDER BY last_at DESC
        LIMIT $3`,
      [taskId, userId, limit],
    ),
  );
  return rows.map((r) => r.device_id).filter((id): id is string => typeof id === 'string');
}

/**
 * run 을 Task 에 붙인다(Task 1 : N run). run 의 소유자가 같고, 아직 Task 가 없거나 같은 Task 일 때만.
 * 이미 다른 Task 에 붙은 run 은 옮기지 않는다. 붙었으면 true.
 */
export async function attachRunToTask(
  dataSource: DataSource,
  input: { taskId: string; runId: string; userId: string },
): Promise<boolean> {
  if (!isTaskId(input.taskId) || !RUN_ID_RE.test(input.runId)) return false;
  const rows = returnedRows(
    await dataSource.query(
      `UPDATE work_run_coordination
       SET task_id = $1
       WHERE run_id = $2 AND user_id = $3 AND (task_id IS NULL OR task_id = $1)
       RETURNING run_id`,
      [input.taskId, input.runId, input.userId],
    ),
  );
  return rows.length > 0;
}

export interface UpdateAssistantTaskInput {
  taskId: string;
  requestedByUserId: string;
  status: AssistantTaskStatus;
  targetKind?: unknown;
  targetId?: unknown;
  taskTypeKey?: unknown;
}

/**
 * 상태와 구조 식별자를 갱신한다. 식별자는 형식을 통과한 값만 덮어쓰고(아니면 기존 값 유지),
 * 종결 상태가 되면 completed_at 을 찍는다.
 */
export async function updateAssistantTask(
  dataSource: DataSource,
  input: UpdateAssistantTaskInput,
): Promise<AssistantTaskRow | null> {
  if (!isTaskId(input.taskId)) return null;
  const terminal = isTerminalTaskStatus(input.status);
  const rows = returnedRows(
    await dataSource.query(
      `UPDATE assistant_tasks
       SET status = $3,
           target_kind = COALESCE($4, target_kind),
           target_id = COALESCE($5, target_id),
           task_type_key = COALESCE($6, task_type_key),
           updated_at = now(),
           completed_at = CASE WHEN $7::boolean THEN now() ELSE NULL END
       WHERE id = $1 AND requested_by_user_id = $2
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.taskId,
        input.requestedByUserId,
        input.status,
        identifierOrNull(input.targetKind, TARGET_KIND_RE),
        identifierOrNull(input.targetId, TARGET_ID_RE),
        identifierOrNull(input.taskTypeKey, TASK_KEY_RE),
        terminal,
      ],
    ),
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
}
