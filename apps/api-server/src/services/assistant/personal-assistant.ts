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
 * Phase B (WO-O4O-PERSONAL-ASSISTANT-PHASE-B-PLANNING-SEPARATION-V1) — Assistant Planning ≠ Execution Planning
 *   Assistant → Task → **Assistant Planning(assistant-planning.ts) → ExecutionIntent** → Execution(planner 는 화면 행동만)
 *   → **ExecutionReport(주장 + 근거)** → Assistant 가 완료 계약으로 Task 상태 판정
 *   Execution 의 `done` 은 실행 결과의 주장일 뿐 Task 완료가 아니다.
 *
 * 이 모듈이 하지 않는 일
 *   - 완료 계약의 영속화 · Knowledge / Shared Candidate 배선(후속 단계)
 *   - 요청 원문 · 대화 저장 (V2 §17 Gate 대상) — 원문은 실행 본체로만 흘러가고 Task · 실행 지시에는 닿지 않는다
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
import { judgeTaskStatus, planAssistantTask, type AssistantPlan } from './assistant-planning.js';
import type { ExecutionIntent, ExecutionReport } from '../ai-tools/work-agent-contract.js';

/** 기존 work-agent 본체의 응답(HTTP 직전 형태). `execution` 은 직렬화되지 않는 내부 요약이다. */
export interface WorkExecutionReply {
  status: number;
  body: Record<string, unknown>;
  execution?: { taskKey: string | null; report?: ExecutionReport };
}

/** 실행 위임 — Assistant 가 정한 실행 지시(intent)를 함께 넘긴다. */
export type WorkExecutor = (
  userId: string,
  workBody: Record<string, unknown>,
  intent?: ExecutionIntent,
) => Promise<WorkExecutionReply>;

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
  /** 이번 실행에 쓴 Assistant Planning 결과(로그 · 테스트용 — 응답에 싣지 않는다). */
  plan: AssistantPlan;
}

/** Task 상태 — 실행 보고가 있으면 Assistant 가 완료 계약으로 판정하고, 없으면(403 · 400 등 실행 전 종료) 응답으로 정한다. */
export function taskStatusFor(plan: AssistantPlan, reply: WorkExecutionReply): AssistantTaskStatus {
  const report = reply.execution?.report;
  if (reply.status === 200 && report) return judgeTaskStatus(plan.intent.completion, report);
  return taskStatusFromWorkReply(reply);
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

  // ── Assistant Planning — 이번 Task 의 수행 방향(구조만 · 원문 없음) ──
  const plan = planAssistantTask({
    taskId: task?.taskId ?? null,
    resuming: typeof input.workBody.runId === 'string' && input.workBody.runId.length > 0,
    priorTaskTypeKey: task?.taskTypeKey ?? null,
    userMethodHint: typeof input.workBody.recoveryHint === 'string' && input.workBody.recoveryHint.trim().length > 0,
    // 자기 Experience 는 아직 실행 노드에 있다(V2 §9-4). 노드가 있으면 Execution 이 현재 화면과 함께 읽는다.
    nodeExperienceReachable: true,
  });
  logger.info('assistant plan', {
    taskId: plan.intent.taskId,
    reason: plan.reason,
    startMode: plan.intent.startMode,
    taskTypeHint: plan.intent.taskTypeHint !== null,
  });

  // ── Task → Execution (실행 지시와 함께 위임 · 화면 판단은 Execution 이 한다) ──
  const reply = await execute(input.userId, input.workBody, plan.intent);
  if (!task) return { reply, task: null, plan };

  // ── Execution → Task (Assistant 가 완료 계약으로 판정) ──
  const status = taskStatusFor(plan, reply);
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
      taskTypeKey: reply.execution?.report?.taskTypeProposal ?? reply.execution?.taskKey ?? null,
    });
    const report = reply.execution?.report;
    logger.info('assistant task updated', {
      taskId: task.taskId,
      ownershipScope: task.ownershipScope,
      status: updated?.status ?? status,
      runLinked: typeof data.runId === 'string',
      executionClaim: report?.claim ?? null,
      resultObserved: report ? report.resultObserved || report.replayVerified : null,
    });
    return { reply, task: { taskId: task.taskId, status: updated?.status ?? status }, plan };
  } catch (err) {
    logger.warn('assistant task update failed', {
      taskId: task.taskId,
      error: err instanceof Error ? err.name : 'unknown',
    });
    return { reply, task: { taskId: task.taskId, status: task.status }, plan };
  }
}
