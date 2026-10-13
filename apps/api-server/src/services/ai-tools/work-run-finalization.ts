import type { DataSource } from 'typeorm';
import type { VerifiedToolContext } from './ai-tool-contract.js';
import type {
  WorkGoal,
  WorkGoalStatus,
  WorkAgentState,
  WorkStepRecord,
  ExecutionReport,
} from './work-agent-contract.js';
import type { WorkTargetRef } from './work-target-resolver.js';
import type { WorkflowRunSummary } from './work-agent-runtime.js';
import {
  WORK_RUN_STATUS,
  transitionWorkRun,
  type WorkRunStatus,
  type WorkRunCoordinationRow,
} from './work-run-coordination-service.js';
import {
  issueWorkRunSetStatus,
  issueWorkflowCandidateSave,
  issueWorkflowCandidateResult,
  issueWorkRunExperienceRecord,
  measureSegmentCommandTiming,
} from './work-run-executor.js';
import {
  buildWorkflowCandidate,
  type TrajectoryEntry,
} from './workflow-candidate.js';
import {
  buildExperienceSteps,
  buildStepFailures,
  experienceCount,
  experienceFailureClassOf,
  experienceLayerOf,
  experienceMs,
  experienceOutcomeOf,
  isRuntimeLayerCode,
  safeErrorCode,
  type ExperienceEndState,
  type ExperienceFailure,
  type ExperienceStepMeta,
} from './work-experience.js';
import logger from '../../utils/logger.js';

/** End-of-run recording only. No planning, observation or domain execution; raw inputs are never persisted here. */
interface RunPersistenceContext {
  dataSource: DataSource;
  ctx: VerifiedToolContext;
  goal: WorkGoal;
  deviceId: string | null;
  ledgerOwner: string | null;
}

interface WorkflowPersistenceContext extends RunPersistenceContext {
  targetRef: WorkTargetRef;
  siteId: string;
  workflow: WorkflowRunSummary;
  trajectory: TrajectoryEntry[];
  resumedRun: boolean;
  hasRecoveryHint: boolean;
  replayedCandidateId: string | null;
  replayDiverge: { code: string | null } | null;
  endedByRuntime: boolean;
}

interface ExperiencePersistenceContext extends RunPersistenceContext {
  state: WorkAgentState;
  resumeRow: WorkRunCoordinationRow | null;
  runCreated: boolean;
  targetRef: WorkTargetRef;
  siteId: string;
  surface: 'dom' | 'uia';
  stepMeta: WeakMap<WorkStepRecord, ExperienceStepMeta>;
  terminalErrorCode: string | null;
  inputMissing: boolean;
  visualFallback: boolean;
  replayDiverge: {
    cause:
      | 'budget'
      | 'find_failed'
      | 'locator_not_found'
      | 'validation_rejected'
      | 'step_failed'
      | 'expect_mismatch';
    code: string | null;
    stepSeq: number | null;
  } | null;
  resumedRun: boolean;
  plannerTakeover: boolean;
  aiCalls: number;
  aiMs: number;
  settleMs: number;
  retryCount: number;
}

/**
 * 종료 상태를 정본(Local SQLite, set_status) + 최소 coordination(Cloud, transition) 에 남긴다(§조건 1·2·4).
 * cloud→local write 만 한다 — local raw state 를 read-back 하지 않는다. best-effort: 실패해도 사용자 응답은 막지 않는다.
 */
export async function persistTerminalRun(
  input: RunPersistenceContext & { coordinationVersion: number | null },
  kind: WorkGoalStatus,
): Promise<number | null> {
  const { dataSource, ctx, goal, deviceId, ledgerOwner } = input;
  let { coordinationVersion } = input;

  if (!goal.runId) return coordinationVersion;
  const status: WorkRunStatus =
    kind === 'completed'
      ? WORK_RUN_STATUS.COMPLETED
      : kind === 'waiting_for_user'
        ? WORK_RUN_STATUS.WAITING_FOR_USER
        : WORK_RUN_STATUS.TAKEN_OVER; // taken_over · stopped 는 둘 다 재개 불가 종료.
  try {
    const row = await transitionWorkRun(dataSource, {
      runId: goal.runId,
      status,
      expectedVersion: coordinationVersion ?? undefined,
      deviceId: deviceId ?? undefined,
    });
    if (row) coordinationVersion = row.version;
    // Local SQLite 정본 갱신(사용자 PC). goal/질문 원문은 싣지 않는다 — 상태 enum 만.
    if (deviceId)
      await issueWorkRunSetStatus(
        dataSource,
        { userId: ctx.userId, deviceId, ownerKey: ledgerOwner },
        { runId: goal.runId, status },
      );
  } catch (e) {
    logger.warn('work-agent run terminal persist failed', {
      code: (e as { code?: string })?.code ?? null,
    });
  }
  return coordinationVersion;
}

/**
 * PHASE 2 — run 끝에서 Workflow 정본(Local SQLite)을 갱신한다. best-effort: 실패해도 사용자 응답은 막지 않는다.
 *   완료 + 새 run(재개·사용자 힌트 아님) → trajectory 를 Candidate 로 일반화해 저장(재생했으면 그 Candidate 성공 반영).
 *   그 밖에 재생을 했다면 → 재생 결과만 반영(완료로 이어진 전체 재생 = completed, 그 외 = diverged).
 */
export async function persistWorkflow(
  input: WorkflowPersistenceContext,
  kind: WorkGoalStatus,
): Promise<void> {
  const {
    dataSource,
    ctx,
    goal,
    deviceId,
    ledgerOwner,
    targetRef,
    siteId,
    workflow,
    trajectory,
    resumedRun,
    hasRecoveryHint,
    replayedCandidateId,
    replayDiverge,
    endedByRuntime,
  } = input;

  if (!goal.runId || !deviceId || targetRef.targetType === 'windows_app')
    return;
  const ledgerCtx = { userId: ctx.userId, deviceId, ownerKey: ledgerOwner };
  let saved = false;
  try {
    if (kind === 'completed' && trajectory.length > 0) {
      if (resumedRun || hasRecoveryHint) {
        workflow.candidate = 'skipped';
      } else {
        const built = buildWorkflowCandidate(goal.request, trajectory);
        // strictNullChecks off — 판별 union 의 negation narrowing 이 안 먹으므로 reason 은 좁은 캐스트로 읽는다.
        if (built.ok === false) {
          workflow.candidate =
            (built as { reason: string }).reason === 'empty'
              ? 'none'
              : 'not_generalizable';
        } else {
          const r = await issueWorkflowCandidateSave(dataSource, ledgerCtx, {
            runId: goal.runId,
            targetId: siteId,
            template: built.template,
            steps: built.steps,
            ...(replayedCandidateId ? { replayedCandidateId } : {}),
          });
          saved = r.status === 'success' && r.safe.saved === true;
          workflow.candidate = saved ? 'saved' : 'failed';
        }
      }
    }
    if (replayedCandidateId && !saved) {
      const outcome =
        kind === 'completed' && workflow.replay === 'completed'
          ? 'replay_completed'
          : 'replay_diverged';
      // D7 — 실행 환경(runtime) 실패는 Procedure 결함이 아니다. 재생 이탈 원인이 runtime 이거나, 이탈 없이 runtime 으로
      // 끝났으면 Candidate failure_count 에 넣지 않는다(WO-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1 §11).
      const runtimeOnly =
        outcome === 'replay_diverged' &&
        (replayDiverge
          ? isRuntimeLayerCode(replayDiverge.code)
          : endedByRuntime);
      if (!runtimeOnly)
        await issueWorkflowCandidateResult(dataSource, ledgerCtx, {
          candidateId: replayedCandidateId,
          outcome,
        });
    }
  } catch (e) {
    if (
      workflow.candidate === 'none' &&
      kind === 'completed' &&
      trajectory.length > 0
    )
      workflow.candidate = 'failed';
    logger.warn('work-agent workflow persist failed', {
      code: (e as { code?: string })?.code ?? null,
    });
  }
}

/** 이번 segment의 enum·정수·locator·오류 코드만 기록한다. 원문·입력값·관찰·이미지는 저장하지 않는다. */
export async function recordExperience(
  input: ExperiencePersistenceContext,
  kind: WorkGoalStatus,
): Promise<void> {
  const {
    dataSource,
    ctx,
    goal,
    deviceId,
    ledgerOwner,
    state,
    resumeRow,
    runCreated,
    targetRef,
    siteId,
    surface,
    stepMeta,
    terminalErrorCode,
    inputMissing,
    visualFallback,
    replayDiverge,
    resumedRun,
    plannerTakeover,
    aiCalls,
    aiMs,
    settleMs,
    retryCount,
  } = input;

  if (!deviceId) return; // 기기를 못 정했으면 쓸 곳이 없다(한계).
  const runId = goal.runId ?? resumeRow?.runId ?? goal.goalId;
  try {
    const end = kind as Exclude<WorkGoalStatus, 'active'>; // finish 는 active 를 내지 않는다.
    const endState: ExperienceEndState = runCreated
      ? end
      : resumeRow
        ? 'resume_failed'
        : end === 'waiting_for_user'
          ? 'taken_over'
          : end;
    const reason = state.takeover?.reason ?? null;
    const steps = buildExperienceSteps(surface, state.history, (r) =>
      stepMeta.get(r),
    );
    const failures: ExperienceFailure[] = buildStepFailures(steps);
    // 종료 실패 이벤트 — 인계 · 질문 · 중지로 끝났을 때. 복구가 소진됐으면 그 tier/결과를 함께 싣는다.
    if (endState !== 'completed' && (reason || terminalErrorCode)) {
      const code = safeErrorCode(terminalErrorCode);
      const notRecovered = state.recovery.result === 'not_recovered';
      failures.push({
        stepSeq: null,
        stage: null,
        layer: experienceLayerOf(reason, code, { inputMissing }),
        failureClass: experienceFailureClassOf(reason, code),
        errorCode: code,
        method:
          surface === 'uia'
            ? visualFallback
              ? 'computer_use'
              : 'windows_uia'
            : 'browser_dom',
        recoveryTier: notRecovered ? state.recovery.tier : null,
        recoveryResult: notRecovered ? 'not_recovered' : null,
        uiChangeSuspected: false,
      });
    }
    // 복구 국면 뒤 완료 — 무엇으로 복구됐는지(§27).
    if (
      endState === 'completed' &&
      state.recovery.result &&
      state.recovery.result !== 'not_recovered'
    ) {
      failures.push({
        stepSeq: null,
        stage: null,
        layer: null,
        failureClass: state.recovery.lastClass,
        errorCode: null,
        method: surface === 'uia' ? 'windows_uia' : 'browser_dom',
        recoveryTier: state.recovery.escalatedToStrong
          ? 'strong_model'
          : 'normal_retry',
        recoveryResult: state.recovery.result,
        uiChangeSuspected: false,
      });
    }
    // 재생 이탈 — 저장된 절차가 현재 화면에서 맞지 않았다. runtime 코드면 runtime 층, 아니면 층은 모른다(null).
    // AI 가 이어받아 완료했는데 locator/기대 변화가 어긋났다면 화면 변경을 의심만 한다(확정 아님).
    if (replayDiverge && replayDiverge.cause !== 'budget') {
      const code = safeErrorCode(replayDiverge.code);
      const runtime = isRuntimeLayerCode(code);
      failures.push({
        stepSeq:
          replayDiverge.stepSeq !== null &&
          replayDiverge.stepSeq <= steps.length
            ? replayDiverge.stepSeq
            : null,
        stage:
          replayDiverge.cause === 'find_failed' ||
          replayDiverge.cause === 'locator_not_found'
            ? 'read'
            : null,
        layer: runtime ? 'runtime' : null,
        failureClass: code
          ? experienceFailureClassOf(null, code)
          : replayDiverge.cause === 'expect_mismatch'
            ? 'EXTERNAL_CHANGE'
            : 'TARGET_FAILURE',
        errorCode: code,
        method: 'browser_dom',
        recoveryTier: null,
        recoveryResult:
          endState === 'completed' ? 'recovered_by_normal_retry' : null,
        uiChangeSuspected:
          !runtime &&
          endState === 'completed' &&
          (replayDiverge.cause === 'locator_not_found' ||
            replayDiverge.cause === 'expect_mismatch'),
      });
    }
    const endedAt = new Date();
    const timing = await measureSegmentCommandTiming(
      dataSource,
      { userId: ctx.userId, deviceId, ownerKey: ledgerOwner },
      { from: new Date(state.startedAt), to: endedAt },
    );
    const actionCount = steps.filter(
      (x) => x.stage === 'input' || x.stage === 'activate',
    ).length;
    await issueWorkRunExperienceRecord(
      dataSource,
      { userId: ctx.userId, deviceId, ownerKey: ledgerOwner },
      {
        runId,
        segment: {
          startedAt: new Date(state.startedAt).toISOString(),
          endedAt: endedAt.toISOString(),
          endState,
          resumed: resumedRun,
        },
        target: {
          targetId: siteId,
          targetKind:
            targetRef.targetType === 'windows_app'
              ? 'windows_app'
              : 'browser_site',
        },
        outcome: experienceOutcomeOf({
          endState,
          reason,
          plannerProposed: plannerTakeover,
        }),
        metric: {
          totalMs: experienceMs(endedAt.getTime() - state.startedAt),
          aiMs: aiCalls ? experienceMs(aiMs) : null,
          aiCalls: experienceCount(aiCalls),
          commandWaitMs: experienceMs(timing.commandWaitMs),
          executionMs: experienceMs(timing.executionMs),
          settleMs: experienceMs(settleMs),
          actionCount: experienceCount(actionCount),
          stepCount: experienceCount(state.stepCount),
          retryCount: experienceCount(retryCount),
        },
        steps,
        failures: failures.slice(0, 20),
      },
    );
  } catch (e) {
    logger.warn('work-agent experience record failed', {
      code: (e as { code?: string })?.code ?? null,
    });
  }
}

/** Honest execution evidence only. Assistant owns the separate Task completion contract. */
export function buildWorkExecutionReport(
  state: WorkAgentState,
  input: {
    kind: WorkGoalStatus;
    runCreated: boolean;
    workflow: WorkflowRunSummary;
    plannerMode: ExecutionReport['plannerMode'];
    taskKey: string | null;
    memory?: ExecutionReport['memory'];
  },
): ExecutionReport {
  const { kind, runCreated, workflow, plannerMode, taskKey, memory } = input;
  return {
    claim:
      kind === 'completed'
        ? 'execution_complete'
        : kind === 'waiting_for_user'
          ? 'needs_user'
          : kind === 'taken_over'
            ? 'handed_over'
            : runCreated
              ? 'stopped'
              : 'not_started',
    runOpened: runCreated,
    resultObserved: state.history.some(
      (h) =>
        h.status === 'success' &&
        (h.navigated === true ||
          h.action.kind === 'read_text' ||
          h.action.kind === 'read_table'),
    ),
    replayVerified: workflow.replay === 'completed',
    plannerMode,
    taskTypeProposal: taskKey,
    memory,
  };
}
