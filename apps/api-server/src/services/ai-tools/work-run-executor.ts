/**
 * Work Run local ledger executor — runtime → local agent `local.data.work_run_*` 발행 (PHASE 1)
 *
 * WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1
 *
 * runtime 이 logical Work Run 의 정본 상태를 **사용자 PC 의 Local SQLite** 에 기록하는 유일한 경로다.
 * 발행은 browser-dom-executor 와 동일한 issueCommand → awaitCommandResult → pickSafeResultData 왕복이며,
 * cloud 로 되돌아오는 것은 runId 반향 · 상태 enum · saved 플래그뿐이다(goal/note 원문은 통과하지 않는다).
 *
 * 이 executor 는 **cloud → local write** 만 한다. local run 내용을 cloud 로 read-back 하는 경로는 없다(§조건 4).
 * 단 하나의 예외는 PHASE 2 `candidate_match` 다 — 재생에 필요한 semantic 단계(이번 요청의 값을 채운 것)만 돌려받는다(IR §9-3).
 */

import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';
import { LOCAL_AGENT_ACTIONS, pickSafeResultData } from '../local-agent/local-agent-protocol.js';
import { awaitCommandResult, issueCommand } from '../local-agent/local-agent-service.js';
import type { WorkRunStatus } from './work-run-coordination-service.js';
import type { ReplayStep, WorkflowStep } from './workflow-candidate.js';
import type { DataWorkRunExperienceRecordArgs } from './work-experience.js';
import type { DataWorkRunAssistanceRecordArgs, DataWorkRunContextSaveArgs } from './work-assistance.js';

const WORK_RUN_TOOL = 'work.run.ledger';

export interface WorkRunLedgerResult {
  status: string;
  errorCode?: string;
  safe: Record<string, unknown>;
}

async function issue(
  dataSource: DataSource,
  userId: string,
  deviceId: string,
  action: string,
  args: Record<string, unknown>,
): Promise<WorkRunLedgerResult> {
  const startedAt = Date.now();
  const issued = await issueCommand(dataSource, { userId, deviceId, action, toolName: WORK_RUN_TOOL, args });
  if (issued.ok === false) {
    return { status: 'denied', errorCode: issued.errorCode, safe: {} };
  }
  const result = await awaitCommandResult(dataSource, issued.command.commandId);
  const safe = pickSafeResultData(action, result.data);
  logger.info('local-agent work run ledger command', {
    tool: WORK_RUN_TOOL,
    action,
    runStatus: typeof safe.runStatus === 'string' ? safe.runStatus : null,
    status: result.status,
    errorCode: result.errorCode ?? null,
    durationMs: Date.now() - startedAt,
    deviceId,
  });
  return { status: result.status, errorCode: result.errorCode, safe };
}

/**
 * 원장 명령 문맥. ownerKey 는 Phase D 노드 원장 소유 주체 키 — 노드가 소유 주체 원장(local.db v8)을 지원할 때만
 * runtime 이 채운다. 이전 에이전트는 모르는 인자를 받으면 명령 전체를 거절하므로 그때는 비워 둔다.
 */
export interface LedgerCtx {
  userId: string;
  deviceId: string;
  ownerKey?: string | null;
}

/** 소유 주체 키를 받는 원장 명령(upsert · candidate save/match · assistance record · experience recall)에만 싣는다. */
function withLedgerOwner(args: Record<string, unknown>, ctx: LedgerCtx): Record<string, unknown> {
  if (ctx.ownerKey) args.ownerKey = ctx.ownerKey;
  return args;
}

/** logical run 생성/갱신(active/waiting_for_user). semantic 목표·대상·메모만 담는다. */
export async function issueWorkRunUpsert(
  dataSource: DataSource,
  ctx: LedgerCtx,
  input: { runId: string; status: 'active' | 'waiting_for_user'; targetId?: string; goalSummary?: string; note?: string },
): Promise<WorkRunLedgerResult> {
  const args: Record<string, unknown> = { runId: input.runId, status: input.status };
  if (input.targetId !== undefined) args.targetId = input.targetId;
  if (input.goalSummary !== undefined) args.goalSummary = input.goalSummary;
  if (input.note !== undefined) args.note = input.note;
  withLedgerOwner(args, ctx);
  return issue(dataSource, ctx.userId, ctx.deviceId, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_UPSERT, args);
}

// ─── PHASE 2 — Workflow Candidate (IR §8·§9-2·§9-3) ─────────────────────────
//   save: 성공 run 의 값 없는 semantic 단계 + 요청 템플릿을 Local 에 저장(cloud→local write).
//   match: Local 이 템플릿을 대조해 이번 요청의 값을 채운 재생 단계만 돌려준다 — 과거 요청 문장·템플릿·통계는 돌아오지 않는다
//          (pickSafeWorkflowMatchInfo). IR §9-3 이 허용한 "재생용 조회" 이며 원문 read-back 이 아니다.
//   result: 재생 결과 enum 만.

/** 성공 run → Candidate 저장. */
export async function issueWorkflowCandidateSave(
  dataSource: DataSource,
  ctx: LedgerCtx,
  input: { runId: string; targetId: string; template: string; steps: WorkflowStep[]; replayedCandidateId?: string },
): Promise<WorkRunLedgerResult> {
  const args: Record<string, unknown> = { runId: input.runId, targetId: input.targetId, template: input.template, steps: input.steps };
  if (input.replayedCandidateId !== undefined) args.replayedCandidateId = input.replayedCandidateId;
  withLedgerOwner(args, ctx);
  return issue(dataSource, ctx.userId, ctx.deviceId, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_SAVE, args);
}

/** 이번 요청과 맞는 Candidate 대조(Local). matched 면 재생 단계(값 채움)를 돌려준다. */
export async function issueWorkflowCandidateMatch(
  dataSource: DataSource,
  ctx: LedgerCtx,
  input: { targetId: string; request: string },
): Promise<{ status: string; errorCode?: string; candidateId: string | null; steps: ReplayStep[] | null }> {
  const r = await issue(dataSource, ctx.userId, ctx.deviceId, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_MATCH, withLedgerOwner({
    targetId: input.targetId, request: input.request,
  }, ctx));
  if (r.status !== 'success' || r.safe.matched !== true) return { status: r.status, errorCode: r.errorCode, candidateId: null, steps: null };
  return { status: r.status, candidateId: String(r.safe.candidateId), steps: r.safe.steps as ReplayStep[] };
}

/** 재생 결과 반영(성공/어긋남). */
export async function issueWorkflowCandidateResult(
  dataSource: DataSource,
  ctx: LedgerCtx,
  input: { candidateId: string; outcome: 'replay_completed' | 'replay_diverged' },
): Promise<WorkRunLedgerResult> {
  return issue(dataSource, ctx.userId, ctx.deviceId, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_RESULT, {
    candidateId: input.candidateId, outcome: input.outcome,
  });
}

/** logical run 상태 전이(complete/expire/taken_over/active/waiting_for_user). */
export async function issueWorkRunSetStatus(
  dataSource: DataSource,
  ctx: LedgerCtx,
  input: { runId: string; status: WorkRunStatus; note?: string },
): Promise<WorkRunLedgerResult> {
  const args: Record<string, unknown> = { runId: input.runId, status: input.status };
  if (input.note !== undefined) args.note = input.note;
  return issue(dataSource, ctx.userId, ctx.deviceId, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_SET_STATUS, args);
}

// ─── Local Experience 최소 저장 (WO-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1) ──────
//   run segment 1개의 구조화 Experience 를 Local 에 쓴다(write only). 결과는 저장 확인(saved)만 돌아온다 — read-back 없음.

/** segment Experience 기록. args 는 work-experience 형상(enum · 정수 · semantic locator). */
export async function issueWorkRunExperienceRecord(
  dataSource: DataSource,
  ctx: LedgerCtx,
  args: DataWorkRunExperienceRecordArgs,
): Promise<WorkRunLedgerResult> {
  return issue(dataSource, ctx.userId, ctx.deviceId, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_EXPERIENCE_RECORD, args as unknown as Record<string, unknown>);
}

// ─── User Assistance · Correction (WO-O4O-AUTOMATION-USER-ASSISTANCE-AND-CORRECTION-V1 · Phase 2) ──────
//   QUESTION 시점 원래 업무 구조 저장 · 재개 시 recall · 도움/교정 기록 · D1 질의형 recall(Task × Target).
//   read-back 은 구조(task · stage · ask · 방법)와 재생 단계뿐 — 원래 요청 문장 · 답변 원문은 돌아오지 않는다.

export async function issueWorkRunContextSave(
  dataSource: DataSource,
  ctx: LedgerCtx,
  args: DataWorkRunContextSaveArgs,
): Promise<WorkRunLedgerResult> {
  return issue(dataSource, ctx.userId, ctx.deviceId, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CONTEXT_SAVE, args as unknown as Record<string, unknown>);
}

/** slotValue 는 막힌 재생 단계를 채우는 데만 쓰인다(Local 미저장). */
export async function issueWorkRunContextRecall(
  dataSource: DataSource,
  ctx: LedgerCtx,
  input: { runId: string; targetId: string; slotValue: string | null },
): Promise<WorkRunLedgerResult> {
  return issue(dataSource, ctx.userId, ctx.deviceId, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CONTEXT_RECALL, {
    runId: input.runId, targetId: input.targetId, slotValue: input.slotValue,
  });
}

export async function issueWorkRunAssistanceRecord(
  dataSource: DataSource,
  ctx: LedgerCtx,
  args: DataWorkRunAssistanceRecordArgs,
): Promise<WorkRunLedgerResult> {
  return issue(dataSource, ctx.userId, ctx.deviceId, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_ASSISTANCE_RECORD, withLedgerOwner({ ...(args as unknown as Record<string, unknown>) }, ctx));
}

/** taskKey null → 대상의 업무 키 목록 · taskKey → 그 업무의 verified Preferred/Avoid. */
export async function issueExperienceRecall(
  dataSource: DataSource,
  ctx: LedgerCtx,
  input: { targetId: string; taskKey: string | null },
): Promise<WorkRunLedgerResult> {
  return issue(dataSource, ctx.userId, ctx.deviceId, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_EXPERIENCE_RECALL, withLedgerOwner({ targetId: input.targetId, taskKey: input.taskKey }, ctx));
}

/**
 * segment 동안 이 device 에 발행된 실행 명령(local.data.* 원장 명령 제외)의 시간 분해 — Cloud 자신의 명령 원장(local_agent_commands)
 * 타임스탬프만 쓴다(Local 을 읽지 않는다).
 *   commandWaitMs = Σ(delivered_at − issued_at)  — agent 가 명령을 가져가기까지(poll 대기)
 *   executionMs   = Σ(completed_at − delivered_at) — agent 가 받아 결과를 돌려주기까지(실행 + 결과 전송)
 * 근거가 없으면(조회 실패 · 시각 없음) null — 추정하지 않는다. 같은 device 의 동시 run 이 있으면 합산이 섞인다(한계).
 */
export async function measureSegmentCommandTiming(
  dataSource: DataSource,
  ctx: LedgerCtx,
  window: { from: Date; to: Date },
): Promise<{ commandWaitMs: number | null; executionMs: number | null }> {
  try {
    const rows = (await dataSource.query(
      `SELECT COUNT(*)::int AS n,
              SUM(EXTRACT(EPOCH FROM (delivered_at - issued_at)) * 1000) AS wait_ms,
              SUM(EXTRACT(EPOCH FROM (completed_at - delivered_at)) * 1000) AS exec_ms
         FROM local_agent_commands
        WHERE user_id = $1 AND device_id = $2 AND issued_at >= $3 AND issued_at <= $4
          AND action NOT LIKE 'local.data.%'
          AND delivered_at IS NOT NULL AND completed_at IS NOT NULL`,
      [ctx.userId, ctx.deviceId, window.from.toISOString(), window.to.toISOString()],
    )) as { n: number; wait_ms: string | number | null; exec_ms: string | number | null }[];
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row || !Number(row.n)) return { commandWaitMs: null, executionMs: null };
    const num = (v: string | number | null) => (v === null || v === undefined || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Math.round(Number(v)));
    return { commandWaitMs: num(row.wait_ms), executionMs: num(row.exec_ms) };
  } catch {
    return { commandWaitMs: null, executionMs: null };
  }
}
