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
 * Phase C (WO-O4O-PERSONAL-ASSISTANT-PHASE-C-MEMORY-EXPERIENCE-CONTINUITY-V1) — Assistant Memory
 *   Task → **Assistant Memory(assistant-memory.ts · 실행 노드 무관)** → Assistant Planning(knownTaskTypes) → Execution
 *   기억 종류 · 소유 · 배치는 memory-ownership.ts 레지스트리가 정한다.
 *
 * Cloud Continuity (WO-O4O-PERSONAL-ASSISTANT-MEMORY-CLOUD-CONTINUITY-V1)
 *   Assistant Memory 가 소유 주체의 검증 방법 · 재개 구조까지 돌려주고(→ ExecutionIntent.memory), 실행 뒤에는
 *   ExecutionReport.memory(구조만)를 소유 주체 기억에 반영한다(rememberExecution). 실행 노드가 바뀌어도 이어진다.
 *
 * Task Understanding & Completion (WO-O4O-PERSONAL-ASSISTANT-TASK-UNDERSTANDING-AND-COMPLETION-V1)
 *   Task → **업무 이해(assistant-understanding.ts — 목표 · 완료조건 · 빠진 정보)** → Assistant Planning → Execution
 *   → Execution 이 "완료"를 주장하면 **Assistant 판정기(judge)** 가 조건 ↔ 근거를 비교(complete · continue · ask)
 *   → 질문 대기 중 사용자의 "됐어요" 는 사용자 완료 선언으로 Task 를 닫는다(실행 호출 없음).
 *   이해는 메모리에서만 산다(로그 · DB 없음 — §17). 계측은 `assistant task completion` 로그 한 줄(수치 · enum 만).
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
  recentTaskNodeIds,
  updateAssistantTask,
  type AssistantTaskRow,
  type AssistantTaskStatus,
} from './assistant-task-store.js';
import { resolveTaskOwnership } from './task-ownership.js';
import { judgeTaskStatus, planAssistantTask, type AssistantPlan } from './assistant-planning.js';
import { EMPTY_ASSISTANT_MEMORY, recallAssistantMemory, rememberExecution } from './assistant-memory.js';
import { memoryOwnerOf, purgeEndedRunFrames } from './procedural-memory-store.js';
import type { CompletionJudge, ExecutionIntent, ExecutionReport, TaskUnderstanding } from '../ai-tools/work-agent-contract.js';
import {
  cacheUnderstanding,
  cachedUnderstanding,
  resumeFallbackUnderstanding,
  createCompletionJudge,
  enforceCommitBoundary,
  enforceImageConfirmation,
  fallbackUnderstanding,
  forgetUnderstanding,
  isCompletionDeclaration,
  newJudgeCounters,
  type CompletionVerifier,
  type TaskUnderstander,
} from './assistant-understanding.js';
import { checkResumable, transitionWorkRun, WORK_RUN_STATUS } from '../ai-tools/work-run-coordination-service.js';
import { issueWorkRunSetStatus } from '../ai-tools/work-run-executor.js';
import { resolveWorkTarget } from '../ai-tools/work-target-resolver.js';
import { nodeLedgerOwnerKey } from '../ai-tools/node-ledger-owner.js';

/**
 * 이번 Task 의 대상 — 기억을 대상별로 찾기 위한 구조 식별자만 쓴다(원문은 메모리에서만 읽고 버린다).
 * 재개는 짧은 답변 문장에서 대상을 다시 찾지 않는다(runtime 과 같은 규칙) — Task 에 기록된 대상 · 힌트만 쓴다.
 */
export function resolveTaskTarget(task: AssistantTaskRow, workBody: Record<string, unknown>, resuming: boolean): string | null {
  const hint = typeof workBody.targetHint === 'string' && workBody.targetHint.length > 0 ? workBody.targetHint : undefined;
  if (resuming) return task.targetId ?? (hint ? resolveWorkTarget('', hint)?.targetId ?? null : null);
  return resolveWorkTarget(String(workBody.request ?? ''), hint)?.targetId ?? task.targetId ?? null;
}

/** 기존 work-agent 본체의 응답(HTTP 직전 형태). `execution` 은 직렬화되지 않는 내부 요약이다. */
export interface WorkExecutionReply {
  status: number;
  body: Record<string, unknown>;
  execution?: { taskKey: string | null; report?: ExecutionReport };
}

/** 이해 출처 — cached(같은 인스턴스 재개) · resume_fallback(다른 인스턴스 재개 · 사용자 확인 조건) · none(이해 없음). */
type UnderstandingSource = 'ai' | 'fallback' | 'cached' | 'frame' | 'resume_fallback' | 'none';

/** 실행 위임 — Assistant 가 정한 실행 지시(intent)와 완료 판정기(judge)를 함께 넘긴다. */
export type WorkExecutor = (
  userId: string,
  workBody: Record<string, unknown>,
  intent?: ExecutionIntent,
  judge?: CompletionJudge,
) => Promise<WorkExecutionReply>;

/** 업무 이해 · 완료 검증 주입점. 생략하면 결정적 기본 이해 · 의미 검증 없음(AI 호출 0). */
export interface AssistantUnderstandingDeps {
  understand?: TaskUnderstander | null;
  verify?: CompletionVerifier | null;
}

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

async function acquireTask(
  dataSource: DataSource,
  input: AssistantWorkInput,
): Promise<{ task: AssistantTaskRow; priorStatus: AssistantTaskStatus | null }> {
  const existing = await continueExistingTask(dataSource, input);
  if (existing) {
    const resumed = await updateAssistantTask(dataSource, {
      taskId: existing.taskId,
      requestedByUserId: input.userId,
      status: 'running',
    });
    return { task: resumed ?? existing, priorStatus: existing.status };
  }
  const ownership = await resolveTaskOwnership(dataSource, { userId: input.userId, workScope: input.workScope });
  return { task: await createAssistantTask(dataSource, { requestedByUserId: input.userId, ownership }), priorStatus: null };
}

/**
 * 사용자 완료 선언 — 질문 대기 중 run 에 사용자가 "됐어요" 라고 답했다. 실행을 다시 돌리지 않고
 * 그 run 을 완료로 닫고 Task 를 completed 로 판정한다(완료 계약 acceptsUserCompletion).
 * run 이 이미 종결 · 만료 · 남의 것이면 선언으로 닫지 않는다(null → 일반 재개 경로).
 * run 상태의 정본은 노드 Local SQLite 다 — 정상 종료(runtime persistTerminalRun)와 같이 그 run 을 실행한 노드에도 completed 를 남긴다
 * (상태 enum 만 · best-effort · 응답을 기다리게 하지 않는다).
 */
async function completeByUserDeclaration(
  dataSource: DataSource,
  input: AssistantWorkInput,
  task: AssistantTaskRow,
): Promise<WorkExecutionReply | null> {
  const runId = String(input.workBody.runId);
  const check = await checkResumable(dataSource, { runId, userId: input.userId });
  const row = check.ok ? check.row : null;
  if (!row) return null;
  const closed = await transitionWorkRun(dataSource, { runId, status: WORK_RUN_STATUS.COMPLETED, expectedVersion: row.version });
  if (!closed) return null;
  if (row.deviceId) {
    issueWorkRunSetStatus(dataSource, { userId: input.userId, deviceId: row.deviceId }, { runId, status: WORK_RUN_STATUS.COMPLETED })
      .catch((err) => logger.warn('assistant declared run local persist failed', { error: err instanceof Error ? err.name : 'unknown' }));
  }
  return {
    status: 200,
    body: {
      success: true,
      data: {
        goal: { goalId: null, status: 'completed', siteId: task.targetId ?? null, displayName: null },
        runId,
        resumable: false,
        progress: 'completed',
        takeover: null,
        neededInput: null,
        stepCount: 0,
        aiPlanCount: 0,
        path: null,
        history: [],
        message: '완료로 기록했습니다. 필요하면 새 요청으로 이어서 말씀해 주세요.',
        errorCode: null,
        target: null,
        workflow: null,
      },
    },
  };
}

/** 끝난(만료 포함) run 의 재개 구조 · 업무 이해 정리 주기 — 인스턴스마다 이 간격에 한 번(요청 경로 · best-effort). */
export const RUN_FRAME_PURGE_INTERVAL_MS = 5 * 60 * 1000;
let lastRunFramePurgeAt = 0;

/** 요청이 들어올 때 주기가 지났으면 끝난 run 의 frame 을 지운다. 실패 · 지연이 업무를 막지 않는다(기다리지 않음). */
export function maybePurgeEndedRunFrames(dataSource: DataSource, now = Date.now()): boolean {
  if (now - lastRunFramePurgeAt < RUN_FRAME_PURGE_INTERVAL_MS) return false;
  lastRunFramePurgeAt = now;
  purgeEndedRunFrames(dataSource).catch((err) => {
    logger.warn('assistant run frame purge failed', { error: err instanceof Error ? err.name : 'unknown' });
  });
  return true;
}

export function __resetRunFramePurgeForTest(): void {
  lastRunFramePurgeAt = 0;
}

export async function runAssistantWorkTask(
  dataSource: DataSource,
  input: AssistantWorkInput,
  execute: WorkExecutor,
  deps: AssistantUnderstandingDeps = {},
): Promise<AssistantWorkOutcome> {
  const t0 = Date.now();
  maybePurgeEndedRunFrames(dataSource, t0);
  // ── Assistant → Task ──
  let task: AssistantTaskRow | null = null;
  let priorStatus: AssistantTaskStatus | null = null;
  try {
    ({ task, priorStatus } = await acquireTask(dataSource, input));
  } catch (err) {
    logger.warn('assistant task unavailable — work runs without task', {
      userId: input.userId,
      error: err instanceof Error ? err.name : 'unknown',
    });
  }

  // ── Assistant Memory (Phase C) — 실행 노드와 무관한 기억. Task 소유 주체 경계 안에서만 읽는다 ──
  const resuming = typeof input.workBody.runId === 'string' && input.workBody.runId.length > 0;
  const ownership = task ? { scope: task.ownershipScope, organizationId: task.organizationId, serviceKey: task.serviceKey } : null;
  const memory = task ? await recallAssistantMemory(dataSource, {
    userId: input.userId,
    ownership,
    targetId: resolveTaskTarget(task, input.workBody, resuming),
    runId: resuming ? String(input.workBody.runId) : null,
  }) : EMPTY_ASSISTANT_MEMORY;

  // ── 사용자 완료 선언 — 질문 대기 중 "됐어요" 는 실행 없이 Task 를 닫는다 ──
  if (task && resuming && priorStatus === 'waiting_for_user'
    && isCompletionDeclaration(input.workBody.request, memory.resumeFrame?.ask?.kind ?? null)) {
    try {
      const declared = await completeByUserDeclaration(dataSource, input, task);
      if (declared) {
        const updated = await updateAssistantTask(dataSource, { taskId: task.taskId, requestedByUserId: input.userId, status: 'completed' });
        await rememberExecution(dataSource, {
          userId: input.userId, taskId: task.taskId, ownership, runId: String(input.workBody.runId), taskStatus: 'completed', memory: undefined,
        });
        forgetUnderstanding(String(input.workBody.runId));
        logCompletion({
          taskId: task.taskId, outcome: updated?.status ?? 'completed', completedBy: 'user_declared', understandingSource: 'none',
          criteria: 0, criteriaMet: 0, counters: newJudgeCounters(), report: undefined, questions: 0, totalMs: Date.now() - t0,
        });
        const plan = planAssistantTask({
          taskId: task.taskId, resuming, priorTaskTypeKey: task.taskTypeKey ?? null, userMethodHint: false, nodeExperienceReachable: true,
        });
        return { reply: declared, task: { taskId: task.taskId, status: updated?.status ?? 'completed' }, plan };
      }
    } catch (err) {
      logger.warn('assistant completion declaration failed', { taskId: task.taskId, error: err instanceof Error ? err.name : 'unknown' });
    }
  }

  // ── 업무 이해(실행 전) — 새 요청이면 이번 요청에서 세우고, 재개면 같은 Task 의 이해를 이어 쓴다 ──
  const counters = newJudgeCounters();
  let understanding: TaskUnderstanding | null = null;
  let understandingSource: UnderstandingSource = 'none';
  if (resuming) {
    understanding = task ? cachedUnderstanding(String(input.workBody.runId)) : null;
    understandingSource = understanding ? 'cached' : 'none';
    // 이해를 세운 인스턴스가 아닌 곳에서 재개되면(캐시 없음) 질문 대기 run 의 재개 구조(M5)에 남긴 글 없는 구조(결과 형태 ·
    // 확정 경계)로 되살린다 — 원래 조건 글은 저장하지 않으므로 사용자 확인으로 닫고, 확정 업무는 확정 확인을 계속 요구한다.
    if (!understanding && task && memory.understanding) {
      understanding = memory.understanding;
      understandingSource = 'frame';
      cacheUnderstanding(String(input.workBody.runId), understanding);
    }
    // 그래도 없으면(이해 이전 저장분 · 만료 · 읽기 실패) 원래 조건을 알 수 없다 — 종전 결과 근거 규칙으로 조용히 닫지 않고
    // 사용자 확인 조건 하나로 판정한다(실행의 "끝났다" → 사용자 성공 확인). 원래 요청 원문은 재개에 오지 않고 저장하지 않는다(§17).
    if (!understanding && task) {
      understanding = resumeFallbackUnderstanding();
      understandingSource = 'resume_fallback';
      cacheUnderstanding(String(input.workBody.runId), understanding);
    }
  } else {
    const request = String(input.workBody.request ?? '');
    if (deps.understand) {
      const ut0 = Date.now();
      counters.aiCalls += 1;
      try {
        understanding = await deps.understand({
          request, targetHint: typeof input.workBody.targetHint === 'string' ? input.workBody.targetHint : null,
        });
      } catch (err) {
        logger.warn('assistant understanding failed', { error: err instanceof Error ? err.name : 'unknown' });
      } finally {
        counters.aiMs += Date.now() - ut0;
      }
    }
    if (!understanding) understanding = fallbackUnderstanding(request);
    // 확정 경계는 AI 출력에 맡기지 않는다 — 요청에 확정 의도가 있으면 경계를 켜고 사용자 확인 조건을 강제한다.
    understanding = enforceCommitBoundary(understanding, request);
    // 사진이 붙은 요청 — 이해는 사진을 보지 않으므로 사진 속 대상과 결과가 맞는지는 사용자 확인으로 닫는다.
    understanding = enforceImageConfirmation(understanding, input.workBody.image !== undefined && input.workBody.image !== null);
    understandingSource = understanding.source;
    // 캐시는 logical run 키 — run id 는 실행이 연 뒤에야 알 수 있으므로 실행 결과에서 건다(아래).
  }
  const judge = understanding ? createCompletionJudge(understanding, { verify: deps.verify ?? null, counters }) : undefined;

  // ── Assistant Planning — 이번 Task 의 수행 방향(구조만 · 원문 없음) ──
  const plan = planAssistantTask({
    taskId: task?.taskId ?? null,
    resuming,
    priorTaskTypeKey: task?.taskTypeKey ?? null,
    userMethodHint: typeof input.workBody.recoveryHint === 'string' && input.workBody.recoveryHint.trim().length > 0,
    // 노드 원장의 자기 Experience 는 Execution 이 그 노드에서 현재 화면과 함께 읽는다.
    nodeExperienceReachable: true,
    knownTaskTypes: memory.knownTaskTypes,
    memory: { patterns: memory.patterns, resumeFrame: memory.resumeFrame },
    understanding,
  });
  logger.info('assistant plan', {
    taskId: plan.intent.taskId,
    reason: plan.reason,
    startMode: plan.intent.startMode,
    taskTypeHint: plan.intent.taskTypeHint !== null,
    memoryTaskTypes: plan.intent.knownTaskTypes.length,
    memoryPatterns: memory.patterns.length,
    memoryResumeFrame: memory.resumeFrame !== null,
    memorySources: memory.sources.map((s) => `${s.kind}:${s.placement}:${s.readByAssistant ? 'read' : s.note ?? 'skip'}`),
    // 이해 · 조건 자체(원문 파생 글)는 싣지 않는다 — 출처 · 개수만.
    understandingSource,
    criteria: understanding?.criteria.length ?? 0,
    missing: understanding?.missing.length ?? 0,
  });

  // ── Phase D — Execution Node 조정(V2 §11-1). 노드는 Assistant 가 고르고, 노드 원장은 Task 소유 주체로 나눈다 ──
  //   ownerKey           Task 소유 주체(USER = 본인 · ORGANIZATION = 조직)의 불투명 키. Task 가 없으면 요청자 개인.
  //   preferredDeviceIds 같은 Task 의 최근 run 노드 — 강제가 아니다(online · capability 가 맞을 때만).
  const nodeOwner = memoryOwnerOf(input.userId, ownership ?? { scope: 'USER', organizationId: null, serviceKey: null });
  let preferredDeviceIds: string[] = [];
  if (task) {
    try {
      preferredDeviceIds = await recentTaskNodeIds(dataSource, task.taskId, input.userId);
    } catch (err) {
      logger.warn('assistant task nodes unavailable', { taskId: task.taskId, error: err instanceof Error ? err.name : 'unknown' });
    }
  }
  const intent: ExecutionIntent = {
    ...plan.intent,
    node: { ownerKey: nodeOwner ? nodeLedgerOwnerKey(nodeOwner.scope, nodeOwner.ownerId) : null, preferredDeviceIds },
  };

  // ── Task → Execution (실행 지시와 함께 위임 · 화면 판단은 Execution 이 한다) ──
  const reply = judge ? await execute(input.userId, input.workBody, intent, judge) : await execute(input.userId, input.workBody, intent);
  if (!task) return { reply, task: null, plan };

  // ── Execution → Task (Assistant 가 완료 계약으로 판정) ──
  const status = taskStatusFor(plan, reply);
  const data = (reply.body.data ?? {}) as Record<string, unknown>;
  const goal = (data.goal ?? {}) as Record<string, unknown>;
  const target = (data.target ?? {}) as Record<string, unknown>;
  // 재개용 이해 캐시는 Task 가 아니라 logical run 에 붙인다 — 같은 Task 의 다른 run 이 이 run 의 이해를 덮어쓰지 않게.
  const runKey = typeof data.runId === 'string' && data.runId.length > 0 ? data.runId : null;
  if (runKey && understanding) cacheUnderstanding(runKey, understanding);
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
    // Cloud Continuity — 실행이 남긴 기억 후보를 소유 주체 기억에 반영(실패해도 결과 불변).
    const remembered = await rememberExecution(dataSource, {
      userId: input.userId,
      taskId: task.taskId,
      ownership,
      runId: typeof data.runId === 'string' ? data.runId : null,
      taskStatus: updated?.status ?? status,
      memory: report?.memory,
      // 질문 대기면 업무 이해를 재개 구조와 함께 남긴다 — 답이 다른 인스턴스에 닿아도 원래 완료조건으로 판정한다.
      understanding,
      fallbackTargetId: typeof target.targetId === 'string' ? target.targetId : typeof goal.siteId === 'string' ? goal.siteId : null,
    });
    const finalStatus = updated?.status ?? status;
    if (isTerminalTaskStatus(finalStatus) && runKey) forgetUnderstanding(runKey);
    logCompletion({
      taskId: task.taskId,
      outcome: finalStatus,
      completedBy: finalStatus !== 'completed' ? null
        : plan.intent.completion.requires === 'criteria_evidence' && report?.verdict?.decision === 'complete' ? 'criteria' : 'legacy_result',
      understandingSource,
      criteria: understanding?.criteria.length ?? 0,
      criteriaMet: counters.lastMet,
      counters,
      report,
      questions: finalStatus === 'waiting_for_user' ? 1 : 0,
      totalMs: Date.now() - t0,
    });
    logger.info('assistant task updated', {
      taskId: task.taskId,
      ownershipScope: task.ownershipScope,
      status: updated?.status ?? status,
      runLinked: typeof data.runId === 'string',
      executionClaim: report?.claim ?? null,
      resultObserved: report ? report.resultObserved || report.replayVerified : null,
      memoryPatternsWritten: remembered.patternsWritten,
      memoryResumeFrame: remembered.frame,
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

/**
 * 업무 단위 계측 한 줄 — 총 시간 · AI 호출(Assistant 이해 · 판정 + Execution planner) · 실행 왕복 · 질문 · 완료/중단.
 * 수치와 enum 만 싣는다(목표 · 조건 · 인용 · 원문 없음). 별도 분석 플랫폼 없이 운영 로그 조회로 비교한다.
 */
function logCompletion(e: {
  taskId: string;
  outcome: AssistantTaskStatus;
  completedBy: 'criteria' | 'user_declared' | 'legacy_result' | null;
  understandingSource: UnderstandingSource;
  criteria: number;
  criteriaMet: number;
  counters: ReturnType<typeof newJudgeCounters>;
  report: ExecutionReport | undefined;
  questions: number;
  totalMs: number;
}): void {
  const m = e.report?.metrics;
  logger.info('assistant task completion', {
    taskId: e.taskId,
    outcome: e.outcome,
    completedBy: e.completedBy,
    understandingSource: e.understandingSource,
    criteria: e.criteria,
    criteriaMet: e.criteriaMet,
    verdict: e.report?.verdict?.decision ?? null,
    judgeCalls: e.counters.judgeCalls,
    continuations: e.counters.continuations,
    assistantAiCalls: e.counters.aiCalls,
    assistantAiMs: e.counters.aiMs,
    executionAiCalls: m?.aiCalls ?? null,
    executionAiMs: m?.aiMs ?? null,
    roundTrips: m?.roundTrips ?? null,
    stepCount: m?.stepCount ?? null,
    questions: e.questions,
    totalMs: e.totalMs,
  });
}
