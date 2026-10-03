/**
 * O4O Personal Assistant — 업무 요청의 Task 경계 (Phase A)
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1
 * 정본: `docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md` §2 · §3 · §4 · §18 단계 A
 *
 *   /api/ai/request → 기존 router → **Assistant → Task** → **Task → Execution** → 기존 performWorkAgentRun → runWorkAgent
 *
 * Assistant 는 DB entity 가 아니다. 인증 사용자 + 서버가 확정한 업무 문맥 + Task orchestration 으로 이루어진
 * 논리 계층이며, 사용자 한 명에 하나다(Assistant = f(userId)). 기억 · 선호는 단계 C(Legal Gate 이후) 의 일이다.
 *
 * 이 모듈이 하는 일
 *   1. Task 를 정한다 — 이어받기(runId 의 Task → 요청 taskId) 또는 새로 만들기(소유 판정 포함)
 *   2. 실행을 위임한다 — 기존 work-agent 본체를 그대로 호출(planner · runtime 무변경)
 *   3. 결과를 Task 로 올린다 — run 을 Task 에 붙이고(Task 1 : N run) 상태를 갱신
 *
 * 이 모듈이 하지 않는 일 (Phase B 이후)
 *   - 업무 판단(Assistant Planning)과 화면 조작 판단(Execution Planning)의 분리 · 완료 계약의 영속화
 *   - 요청 원문 · 대화 저장 (V2 §17 Gate 대상) — 원문은 실행 본체로만 흘러가고 Task 에는 닿지 않는다
 *
 * Task 저장이 실패해도 업무 실행은 막지 않는다 — Task 는 Phase A 에서 추적 기반이지 실행 권한의 근거가 아니다.
 * 그 경우 taskId 없이 기존 응답 그대로 돌려주고 로그만 남긴다(값 · 원문 없이).
 */

import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';
import {
  attachRunToTask,
  createAssistantTask,
  findTaskIdByRun,
  getAssistantTaskForRequester,
  isTaskId,
  isTerminalTaskStatus,
  updateAssistantTask,
  type AssistantTaskRow,
  type AssistantTaskStatus,
} from './assistant-task-store.js';
import { resolveTaskOwnership } from './task-ownership.js';

/** 기존 work-agent 본체의 응답(HTTP 직전 형태). `execution` 은 직렬화되지 않는 내부 요약이다. */
export interface WorkExecutionReply {
  status: number;
  body: Record<string, unknown>;
  execution?: { taskKey: string | null };
}

export type WorkExecutor = (userId: string, workBody: Record<string, unknown>) => Promise<WorkExecutionReply>;

export interface AssistantWorkInput {
  /** 인증 세션의 사용자. */
  userId: string;
  /** 실행 본체로 그대로 넘기는 요청(원문 포함). Task 에는 저장하지 않는다. */
  workBody: Record<string, unknown>;
  /** 클라이언트가 이어가려는 Task(선택). 요청자 본인 · 미종결일 때만 쓴다. */
  requestedTaskId?: unknown;
  /** 클라이언트 workScope — 축 힌트만 읽는다. */
  workScope?: unknown;
}

export interface AssistantTaskSummary {
  taskId: string;
  status: AssistantTaskStatus;
}

export interface AssistantWorkOutcome {
  reply: WorkExecutionReply;
  task: AssistantTaskSummary | null;
}

/**
 * 실행 결과 → Task 상태. run 이 열리지 않은 종료(기기 없음 · 재개 거부 · 대상 준비 실패 · 403)는
 * 사용자 조치 뒤 같은 Task 로 다시 할 수 있으므로 blocked(종결 아님)다.
 */
export function taskStatusFromWorkReply(reply: WorkExecutionReply): AssistantTaskStatus {
  if (reply.status === 403) return 'blocked';
  if (reply.status !== 200) return 'stopped';
  const data = (reply.body.data ?? {}) as Record<string, unknown>;
  if (typeof data.runId !== 'string' || data.runId.length === 0) return 'blocked';
  const goalStatus = (data.goal as Record<string, unknown> | undefined)?.status;
  switch (goalStatus) {
    case 'completed':
      return 'completed';
    case 'waiting_for_user':
      return 'waiting_for_user';
    case 'taken_over':
      return 'handed_over';
    default:
      return 'stopped';
  }
}

async function continueExistingTask(
  dataSource: DataSource,
  input: AssistantWorkInput,
): Promise<AssistantTaskRow | null> {
  const runId = typeof input.workBody.runId === 'string' ? input.workBody.runId : null;
  // 재개 요청은 run 이 속한 Task 가 우선이다(클라이언트가 보낸 taskId 보다).
  const candidateIds = [
    runId ? await findTaskIdByRun(dataSource, runId, input.userId) : null,
    isTaskId(input.requestedTaskId) ? input.requestedTaskId : null,
  ];
  for (const id of candidateIds) {
    if (!id) continue;
    const task = await getAssistantTaskForRequester(dataSource, id, input.userId);
    if (task && !isTerminalTaskStatus(task.status)) return task;
  }
  return null;
}

async function acquireTask(dataSource: DataSource, input: AssistantWorkInput): Promise<AssistantTaskRow> {
  const existing = await continueExistingTask(dataSource, input);
  if (existing) {
    const resumed = await updateAssistantTask(dataSource, {
      taskId: existing.taskId,
      requestedByUserId: input.userId,
      status: 'running',
    });
    return resumed ?? existing;
  }
  const ownership = await resolveTaskOwnership(dataSource, { userId: input.userId, workScope: input.workScope });
  return createAssistantTask(dataSource, { requestedByUserId: input.userId, ownership });
}

export async function runAssistantWorkTask(
  dataSource: DataSource,
  input: AssistantWorkInput,
  execute: WorkExecutor,
): Promise<AssistantWorkOutcome> {
  // ── Assistant → Task ──
  let task: AssistantTaskRow | null = null;
  try {
    task = await acquireTask(dataSource, input);
  } catch (err) {
    logger.warn('assistant task unavailable — work runs without task', {
      userId: input.userId,
      error: err instanceof Error ? err.name : 'unknown',
    });
  }

  // ── Task → Execution (기존 본체 그대로) ──
  const reply = await execute(input.userId, input.workBody);
  if (!task) return { reply, task: null };

  // ── Execution → Task ──
  const status = taskStatusFromWorkReply(reply);
  const data = (reply.body.data ?? {}) as Record<string, unknown>;
  const goal = (data.goal ?? {}) as Record<string, unknown>;
  const target = (data.target ?? {}) as Record<string, unknown>;
  try {
    if (typeof data.runId === 'string') {
      await attachRunToTask(dataSource, { taskId: task.taskId, runId: data.runId, userId: input.userId });
    }
    const updated = await updateAssistantTask(dataSource, {
      taskId: task.taskId,
      requestedByUserId: input.userId,
      status,
      targetKind: target.targetType,
      targetId: target.targetId ?? goal.siteId,
      taskTypeKey: reply.execution?.taskKey ?? null,
    });
    logger.info('assistant task updated', {
      taskId: task.taskId,
      ownershipScope: task.ownershipScope,
      status: updated?.status ?? status,
      runLinked: typeof data.runId === 'string',
    });
    return { reply, task: { taskId: task.taskId, status: updated?.status ?? status } };
  } catch (err) {
    logger.warn('assistant task update failed', {
      taskId: task.taskId,
      error: err instanceof Error ? err.name : 'unknown',
    });
    return { reply, task: { taskId: task.taskId, status: task.status } };
  }
}
