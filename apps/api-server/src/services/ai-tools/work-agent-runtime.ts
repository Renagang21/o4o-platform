import { createWorkAgentExecutionState } from './work-agent-execution-state.js';
import { createWorkActionSession, type WorkActionSession } from './work-action-session.js';
import { createWorkTaskSession, type WorkTaskSession } from './work-task-session.js';
import { createWorkPlanningSession, type WorkPlanningSession } from './work-planning-session.js';
import { createWorkObservationSession, createWorkRunMeasurements, type WorkObservationSession } from './work-observation-session.js';
import { dispatchWorkProposal } from './work-proposal-dispatch.js';
import { createWorkReplay } from './work-replay.js';
import type { WorkDispatchContext } from './work-execution-types.js';
import { persistTerminalRun, persistWorkflow, recordExperience, buildWorkExecutionReport } from './work-run-finalization.js';
import type { WorkPlanner } from "./work-planner.js";
export { METHOD_DISCOVERY_MAX, type PlannerInput, type WorkPlanner, WORK_PLANNER_SYSTEM_PROMPT, describeExecutionIntent, buildPlannerUserPrompt, type PlannerTargetResolver, createPlannerTargetResolverForProvider, createLlmPlannerForProvider, createStrongLlmPlannerForProvider, OPENAI_CHAT_COMPLETIONS_URL, buildOpenAiVisionBody, openAiMessageText, createLlmPlanner, createStrongLlmPlanner } from "./work-planner.js";
/**
 * Goal-Driven Multimodal Work Agent — 세션 조율 · runtime loop · 렌더
 *
 * WO-O4O-GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0 §3·§7~§9·§11~§15·§17~§20·§22·§34~§36·§44~§46
 *
 *   User Goal → Observe → Plan → (Interpret needed input) → Act → Observe Result → Progress → Continue / Takeover / Stop
 *
 *   - 관찰 · 행동은 기존 DOM/UIA/computer executor를 쓴다. 관찰 세션은 내부 책임 분리이며 새 action/실행 수단이 아니다.
 *   - Planner(AI) 는 다음 행동 **하나**를 제안할 뿐이다. 계획 세션이 `validateWorkProposal`로 검증하고 Runtime이 실행한다(§9·§10).
 *   - 행동 성공 ≠ 목적 달성 — 행동 뒤에는 반드시 다시 관찰한다(§17).
 *   - 실행 상태/이미지는 요청 세션 안에서만 산다. 기존 coordination/최종 기록 서비스에 위임하며 automation_jobs/큐/스케줄러를 추가하지 않는다.
 *   - 이미지는 Planner 가 "현재 화면이 요구하는 입력" 을 정한 뒤 그 값을 뽑는 데만 쓴다(§11·§12). 전용 스키마가 없다.
 */

import type { DataSource } from 'typeorm';

import logger from '../../utils/logger.js';
import { AI_TOOL_NAMES, type VerifiedToolContext } from './ai-tool-contract.js';
import { LOCAL_AGENT_ERROR } from '../local-agent/local-agent-protocol.js';
import { resolveTargetDevice, type DeviceRow } from '../local-agent/local-agent-service.js';
import { nodeLedgerOwnerKey } from './node-ledger-owner.js';
import { isRegisteredBrowserSite } from '../local-agent/browser-site-registry.js';
import { resolveWorkTarget, type WorkTargetRef } from './work-target-resolver.js';
import { issueTargetPrepare, type WorkTargetOutcome } from './work-target-executor.js';

import { WORK_AGENT_ERROR, WORK_LOOP_LIMITS, buildWorkAgentUsageEvent, createWorkAgentState, isValidWorkGoalRequest, validateWorkImageInput, type TakeoverReason, type WorkAgentState, type WorkGoal, type WorkGoalStatus, type WorkProgress, type WorkStepRecord, type WorkSurface, type WorkProposal, type ExecutionIntent, type ExecutionReport, type CompletionJudge } from './work-agent-contract.js';
import { createCompletionEvidenceSession } from './work-completion-evidence.js';
import { sanitizeRecoveryHint } from './automation-recovery-contract.js';
// PHASE 1 — same-run resume. Cloud 는 최소 coordination(runId·소유자·device·status·version·만료)만 담는다(§조건 2).
// Local SQLite 가 정본이며, 이 runtime 은 cloud→local write 만 한다(read-back 없음 §조건 1·4).
import { WORK_RUN_STATUS, checkResumable, createWorkRun, isValidRunId, transitionWorkRun, type ResumeRejectReason, type WorkRunCoordinationRow } from './work-run-coordination-service.js';
import { issueWorkRunUpsert, issueWorkflowCandidateMatch } from './work-run-executor.js';
import { isRuntimeLayerCode, type ExperienceStepMeta } from './work-experience.js';
import { normalizeWorkflowText, replayPreflight, assessReplayValue, type TrajectoryEntry } from './workflow-candidate.js';

/**
 * QUESTION 성격의 인계 사유(§조건 5) — 사용자의 판단/답만 있으면 같은 logical run 으로 이어갈 수 있는 국면.
 * 이 사유로 끝나면 waiting_for_user 로 남겨 재개를 허용한다. 나머지 인계 사유는 모두 TAKEOVER(재개 불가).
 * never-escalate(credential_required·commit_required 등)는 여기 절대 넣지 않는다.
 */
const QUESTION_TAKEOVER_REASONS = new Set<TakeoverReason>(['user_judgment_required']);

export { classifyQuestionBasis, choosePlannerMode, type QuestionBasis, type PlannerMode } from './work-planning-session.js';

/** 재개 거부 사유 → 사용자 안내 한 줄. runId·원문·상태 enum 은 노출하지 않는다(§20). */
function resumeRejectMessage(reason: ResumeRejectReason): string {
  switch (reason) {
    case 'terminal': return '그 작업은 이미 종료되어 이어서 진행할 수 없습니다. 새로 요청해 주세요.';
    case 'expired': return '이어서 진행할 수 있는 시간이 지났습니다. 새로 요청해 주세요.';
    case 'not_waiting': return '그 작업은 지금 이어서 진행할 수 있는 상태가 아닙니다. 잠시 뒤 다시 시도해 주세요.';
    default: return '이어서 진행할 작업을 찾지 못했습니다. 새로 요청해 주세요.';
  }
}


// ─── Runtime loop (§3·§17·§18·§34~§36) ──────────────────────────────────────

export interface WorkAgentRunInput {
  request: string;
  targetHint?: string;
  image?: unknown;
  /** 실패 인계 뒤 사용자가 다시 요청하며 준 복구 힌트(§64·§65). runtime 이 sanitize 한다. */
  recoveryHint?: string;
  /**
   * PHASE 1 — 같은 logical Work Run 을 이어가려는 재개 요청. 직전 QUESTION(waiting_for_user) 응답에서 돌려받은 runId 다.
   * 유효하면(소유자·미만료·waiting_for_user) 같은 runId 로 이어가고, 아니면 재개를 거부한다(§조건 5·검증 A·B·F).
   * 재개는 저장된 관찰을 되살리지 않는다 — 현재 화면을 새로 관찰하고 planner 를 re-prime 한다.
   */
  runId?: string;
  /** Personal Assistant Phase B — Assistant Planning 의 실행 지시. 없으면 종전 동작(지시 없이 실행). */
  intent?: ExecutionIntent;
  /**
   * Task Understanding — Execution 이 완료를 주장할 때(done · goal_sufficiently_advanced) Assistant 에 판정을 묻는 hook.
   * 있으면 완료는 Assistant 가 완료조건과 근거를 비교해 정하고, 없으면(직접 /work-agent/run) 종전 판정 그대로다.
   */
  judge?: CompletionJudge;
}

/** runWorkAgent 선택 의존성. strongPlanner 는 복구 계층의 "더 강한 추론" 경로(§11·§12) — 없으면 escalation 없이 기존대로 동작한다. */
export interface WorkAgentRunOptions {
  strongPlanner?: WorkPlanner;
}

export interface WorkAgentRunResult {
  ok: boolean;
  errorCode?: string;
  goal: WorkGoal;
  siteId: string | null;
  displayName: string;
  progress: WorkProgress;
  takeover: { reason: TakeoverReason; step: number } | null;
  neededInput: string | null;
  /**
   * PHASE 1 — 이 결과가 QUESTION(waiting_for_user)이라 같은 logical run 으로 이어갈 수 있는가. true 면 goal.runId 로 재개한다.
   * TAKEOVER(taken_over) · 완료 · 중지는 false — 자동 재개 대상이 아니다(§조건 5).
   */
  resumable: boolean;
  stepCount: number;
  aiPlanCount: number;
  path: string | null;
  history: WorkStepRecord[];
  /** 사용자에게 보여줄 문장(약 확정 · 페이지 텍스트 인용 없음). */
  message: string;
  /** WORK-TARGET-DISCOVERY-V0 §33·§54 — 대상 준비 결과(재사용/열림/사용자 요청). 조사 전이면 null. */
  target: WorkTargetOutcome | null;
  /** PHASE 2 — 이 run 의 Workflow 재생/저장 요약(enum · 개수만). 없으면 Workflow 경로를 타지 않은 run. */
  workflow?: WorkflowRunSummary;
  /**
   * Personal Assistant Phase A — planner 가 선언한 provisional Task type(TASK_KEY_RE 구조 키) 또는 null.
   * Assistant 가 Task 에 올리는 용도다(HTTP 응답에는 싣지 않는다). 원문 · 값이 아니다.
   */
  taskKey?: string | null;
  /**
   * Personal Assistant Phase B — 실행 결과의 주장 + 근거(enum · 불리언). Task 상태가 아니다 — Assistant 가 완료 계약으로 판정한다.
   * HTTP 응답에는 싣지 않는다.
   */
  report?: ExecutionReport;
}

/**
 * PHASE 2 Workflow 요약 — 결과·로그용 enum 과 개수만(단계 내용 · 템플릿 · 값 없음).
 *   replay: none(재생 없음) · completed(모든 단계 재생 후 AI 가 이어 확인) · diverged(중간에 어긋나 AI 가 이어받음)
 *   candidate: none(저장할 행동 없음) · saved · not_generalizable(입력값이 요청에서 오지 않음 등) · skipped(재개·사용자 힌트 run) · failed
 */
export interface WorkflowRunSummary {
  replay: 'none' | 'completed' | 'diverged';
  replayedSteps: number;
  candidate: 'none' | 'saved' | 'not_generalizable' | 'skipped' | 'failed';
}

/** 문장 또는 힌트에서 등재 site 를 정한다(V0 호환 — browser 대상만). 공통 해석은 `resolveWorkTarget`. */
export function resolveWorkSite(request: string, targetHint?: string): string | null {
  if (targetHint && !isRegisteredBrowserSite(targetHint)) return null;
  const t = resolveWorkTarget(request, targetHint);
  return t && t.targetType === 'browser_site' ? t.targetId : null;
}

export async function runWorkAgent(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  input: WorkAgentRunInput,
  planner: WorkPlanner,
  options: WorkAgentRunOptions = {},
): Promise<WorkAgentRunResult> {
  const tool = AI_TOOL_NAMES.WORK_AGENT_PERFORM;
  const goal: WorkGoal = { goalId: `g_${Date.now().toString(36)}`, request: String(input.request ?? '').trim(), status: 'active' };
  const imageCheck = validateWorkImageInput(input.image);
  const finishNoState = (errorCode: string, message: string, progress: WorkProgress = 'failed'): WorkAgentRunResult => ({
    ok: false, errorCode, goal: { ...goal, status: progress === 'needs_user' ? 'waiting_for_user' : 'stopped' }, siteId: null, displayName: '해당 사이트',
    progress, takeover: null, neededInput: null, resumable: false, stepCount: 0, aiPlanCount: 0, path: null, history: [], message, target: null,
  });
  if (!isValidWorkGoalRequest(goal.request)) return finishNoState(WORK_AGENT_ERROR.GOAL_INVALID, '무엇을 하려는지 한 문장으로 알려 주세요.', 'needs_user');
  if (!imageCheck.ok) return finishNoState(WORK_AGENT_ERROR.IMAGE_INVALID, 'JPEG · PNG · WebP 이미지만 첨부할 수 있습니다(최대 10MB).', 'needs_user');
  // WORK-TARGET-DISCOVERY-V0 §6·§34 — 어디서 할 일인지(등재 사이트 또는 등재 프로그램)를 먼저 정한다. 못 정하면 묻는다.
  // 재개(runId)는 짧은 답변 문장에서 대상을 다시 찾지 않는다 — 원래 run 의 대상(targetHint 로 상속)만 쓴다
  // (WO-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1 §2-B). 상속할 대상이 없으면 이어갈 수 없으므로 재개를 거부한다.
  const resuming = input.runId !== undefined;
  const targetRef: WorkTargetRef | null = resuming ? resolveWorkTarget('', input.targetHint) : resolveWorkTarget(goal.request, input.targetHint);
  if (!targetRef && resuming) return finishNoState(WORK_AGENT_ERROR.RESUME_REJECTED, '이어갈 작업의 대상을 확인하지 못했습니다. 처음 요청부터 다시 입력해 주세요.', 'needs_user');
  if (!targetRef) return finishNoState(WORK_AGENT_ERROR.SITE_UNRESOLVED, '어느 사이트나 프로그램에서 할 일인지 알려 주세요(예: 약학정보원에서 …).', 'needs_user');
  const siteId = targetRef.targetId;
  if (input.targetHint) goal.targetHint = siteId;

  const displayName = targetRef.displayName;
  let targetOutcome: WorkTargetOutcome | null = null;
  const state: WorkAgentState = createWorkAgentState(goal, siteId);
  const executionState = createWorkAgentExecutionState(state);
  const image = imageCheck.image;
  const inputMode: 'text' | 'text+image' = image ? 'text+image' : 'text';
  let lastRead: string | null = null;
  let deviceId: string | null = null;
  /** Phase D — 이번 run 의 Execution Node(capability 포함). 노드 원장을 소유 주체로 나눌 수 있는지 판단에 쓴다. */
  let executionNode: DeviceRow | null = null;
  /**
   * Phase D — 노드 원장 소유 주체 키. 노드가 소유 주체 원장(local.db v8)을 보고했을 때만 값이 있고, 그때 노드 원장의
   * 읽기 · 쓰기가 이 소유 주체 안으로 한정된다. 값이 없으면(업데이트 전 에이전트 — 모르는 인자를 거절한다) 예전 동작 그대로다:
   * 그 노드 원장은 소유 주체를 구분하지 못한다(V2 §23 — 에이전트 업데이트로 해소). 기능을 끄지 않는다(회귀 금지).
   */
  let ledgerOwner: string | null = null;
  let neededInput: string | null = null;
  const recoveryHint = sanitizeRecoveryHint(input.recoveryHint) ?? undefined;
  const sessions: { task?: WorkTaskSession; planning?: WorkPlanningSession } = {};
  // PHASE 1 — QUESTION↔TAKEOVER 분리 · 재개 원장(§조건 5). QUESTION 은 waiting_for_user(같은 runId 재개 가능),
  // TAKEOVER 는 taken_over(자동 재개 대상 아님). 계획 세션이 복구 소진의 끝을 질문/인계로 구분한다.
  let terminalKind: 'question' | 'takeover' | null = null;
  let runCreated = false;
  let coordinationVersion: number | null = null;
  // PHASE 2 — Workflow Candidate. trajectory 는 요청 메모리 전용(성공 DOM 행동의 semantic 형상 + 템플릿용 값).
  // 값은 Candidate 템플릿을 만들 때만 쓰고 저장하지 않는다. 재생은 새 run(재개·힌트·이미지 없음)의 DOM 표면에서만.
  const trajectory: TrajectoryEntry[] = [];
  const workflow: WorkflowRunSummary = { replay: 'none', replayedSteps: 0, candidate: 'none' };
  let replayedCandidateId: string | null = null;
  let resumedRun = false;
  // ── Local Experience 최소 저장(WO-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1) — 요청 메모리 전용 계측. ──
  //   단계 부가정보(행위자 · semantic locator · 소요)는 history 기록과 짝으로만 둔다. 값 · 화면 글 · 관찰은 담지 않는다.
  const stepMeta = new WeakMap<WorkStepRecord, ExperienceStepMeta>();
  const measurements = createWorkRunMeasurements();
  // Task Understanding — 완료 근거 대조용 "이번 run 에서 실제 본 화면 글" · 조건별 근거 · 판정(메모리 전용 · 로그 · 저장 금지).
  const completionEvidence = createCompletionEvidenceSession();
  const runT0 = Date.now();
  let replaying = false;
  // Phase E — 작업 단위 dispatch(V2 §11-2). measurements.roundTrips 는 서버↔노드 명령 왕복 수(단발 · 단위 모두 1), measurements.unitDispatches 는 그중 단위 수.
  // 관찰 세션은 형상 거절/전송 실패 뒤 이번 run의 단위 경로를 끄며 같은 단위를 다시 보내지 않는다.
  /** 종료(인계) 직전 실패의 오류 코드 — 근거가 있는 곳에서만 정한다. */
  let terminalErrorCode: string | null = null;
  /** 인계를 Planner 가 제안했는가(Outcome 근거 = agent_inferred). */
  let plannerTakeover = false;
  /** 재생 전 의미 검증이 요청 값 부족으로 멈췄는가(layer=input_missing). */
  let inputMissing = false;
  /** 재생 이탈 원인(있으면). code 는 명령 오류 코드일 때만. */
  let replayDiverge: { cause: 'budget' | 'find_failed' | 'locator_not_found' | 'validation_rejected' | 'step_failed' | 'expect_mismatch'; code: string | null; stepSeq: number | null } | null = null;
  /** 실패 종료가 실행 환경(runtime) 층인가 — Candidate 실패 통계에서 뺀다(D7 · §11). */
  const endedByRuntime = (): boolean =>
    isRuntimeLayerCode(terminalErrorCode) || state.takeover?.reason === 'site_not_ready';

  const finish = async (): Promise<WorkAgentRunResult> => {
    // goal.status ← 진행/종료 종류. QUESTION=waiting_for_user, TAKEOVER=taken_over, 완료=completed, 그 밖 중지=stopped.
    // run 이 열리기 전(대상 준비 실패 등)에는 종전대로 progress 기준으로만 매핑한다 — QUESTION/TAKEOVER 구분은 logical run 이 있어야 의미가 있다.
    const kind: WorkGoalStatus =
      state.progress === 'completed' ? 'completed'
      : runCreated && terminalKind === 'question' ? 'waiting_for_user'
      : runCreated && terminalKind === 'takeover' ? 'taken_over'
      : runCreated && state.takeover ? 'taken_over'
      : state.progress === 'needs_user' ? 'waiting_for_user'
      : 'stopped';
    goal.status = kind;
    // QUESTION 만 같은 logical run 으로 이어갈 수 있다 — run 이 실제로 열렸을 때만(runId 존재).
    const resumable = kind === 'waiting_for_user' && !!goal.runId;
    if (runCreated && goal.runId) coordinationVersion = await persistTerminalRun({ dataSource, ctx, goal, deviceId, ledgerOwner, coordinationVersion }, kind);
    if (runCreated && goal.runId) await persistWorkflow({ dataSource, ctx, goal, deviceId, ledgerOwner, targetRef, siteId, workflow, trajectory, resumedRun, hasRecoveryHint: !!recoveryHint, replayedCandidateId, replayDiverge, endedByRuntime: endedByRuntime() }, kind);
    if (surfaceReady) await recordExperience({ dataSource, ctx, goal, deviceId, ledgerOwner, state, resumeRow, runCreated, targetRef, siteId, surface, stepMeta, terminalErrorCode, inputMissing, visualFallback: observationBinding.current?.isVisualFallback() ?? false, replayDiverge, resumedRun, plannerTakeover, aiCalls: measurements.aiCalls, aiMs: measurements.aiMs, settleMs: measurements.settleMs, retryCount: measurements.retryCount }, kind);
    // Phase 2 — 질문으로 멈추면 원래 업무 구조를 남기고, 도움 · 교정은 구조로 남긴다(Experience 기록 뒤 — 같은 run 행).
    if (runCreated && goal.runId && kind === 'waiting_for_user') await sessions.task?.saveRunContext();
    if (runCreated && goal.runId) await sessions.task?.recordAssistance(kind, plannerTakeover);
    // §22·§23 usage signal — 허용 키만. goal 원문 · 관찰 · 입력값 · 이미지는 실리지 않는다. 복구 신호는 §60 화이트리스트만.
    logger.info('work-agent run', buildWorkAgentUsageEvent(state, inputMode, new Date(), sessions.planning?.recoveryStatus() ?? null));
    // Phase E — 왕복 수만(내용 없음). 단위 경로 이전/이후 비교의 운영 근거.
    if (surface === 'dom' && measurements.roundTrips > 0) {
      logger.info('work-agent dispatch', { roundTrips: measurements.roundTrips, unitDispatches: measurements.unitDispatches, stepCount: state.stepCount, taskUnit: executionNode?.capabilities?.taskUnit === true });
    }
    // PHASE 2 — 재생/저장 결과는 enum · 개수만(AI 계획 횟수 감소 측정용). 단계 내용 · 템플릿 · 값은 싣지 않는다.
    if (workflow.replay !== 'none' || workflow.candidate !== 'none') {
      logger.info('work-agent workflow', { ...workflow, aiPlanCount: state.aiPlanCount, goalStatus: kind });
    }
    return {
      ok: state.progress === 'completed' || state.progress === 'needs_user' || state.progress === 'progress',
      goal, siteId, displayName, progress: state.progress, takeover: state.takeover, neededInput, resumable,
      stepCount: state.stepCount, aiPlanCount: state.aiPlanCount, path: state.observation?.path ?? null, history: state.history,
      message: renderWorkAgentMessage(state, displayName, neededInput, targetOutcome, resumable),
      target: targetOutcome,
      workflow: { ...workflow },
      taskKey: sessions.task?.taskKey() ?? null,
      report: buildWorkExecutionReport(state, {
        kind, runCreated, workflow, plannerMode: sessions.planning?.mode() ?? 'discovery',
        taskKey: sessions.task?.taskKey() ?? null,
        memory: runCreated ? sessions.task?.memoryReport(kind, targetRef.targetType) : undefined,
        evidence: completionEvidence.evidence(),
        verdict: completionEvidence.verdict(),
        metrics: { aiCalls: measurements.aiCalls, aiMs: measurements.aiMs, roundTrips: measurements.roundTrips, stepCount: state.stepCount, totalMs: Date.now() - runT0 },
      }),
    };
  };
  /** QUESTION — AI 가 막혀 사용자 판단/답이 필요하다. logical run 유지 · 답하면 같은 runId 로 재개(§조건 5·검증 A). */
  const question = (reason: TakeoverReason): Promise<WorkAgentRunResult> => {
    terminalKind = 'question';
    state.takeover = { reason, step: state.stepCount };
    state.progress = 'needs_user';
    return finish();
  };
  /**
   * TAKEOVER — automation 종료(자동 재개 대상 아님 §조건 5). 단, 사용자 판단만 필요한 질문 성격(user_judgment_required)은
   * QUESTION 으로 돌린다 — 그 경우 답하면 같은 runId 로 이어간다. never-escalate(credential·commit 등)는 여기 그대로 인계다.
   */
  const takeover = (reason: TakeoverReason, progress: WorkProgress): Promise<WorkAgentRunResult> => {
    // Automation still stops at COMMIT. A verified Assistant contract may await the user's own completion.
    if (reason === 'commit_required' && input.judge && input.intent?.understanding?.commitBoundary) {
      sessions.task?.setAsk({ kind: 'success_confirmation', slots: [] });
      neededInput = '최종 저장·제출·확정은 직접 진행해 주세요. 요청한 결과까지 완료되면 알려 주세요.';
      return question(reason);
    }
    if (QUESTION_TAKEOVER_REASONS.has(reason)) return question(reason);
    if (terminalKind === null) terminalKind = 'takeover';
    state.takeover = { reason, step: state.stepCount };
    state.progress = progress;
    return finish();
  };
  /** 복구 소진 뒤 끝맺음 — escalatable 하고 사용자 답으로 이어질 국면이면 QUESTION, 아니면 TAKEOVER(§조건 5). */
  const stuckEnd = (reason: TakeoverReason, progress: WorkProgress): Promise<WorkAgentRunResult> =>
    sessions.planning?.giveupKind() === 'question' ? question(reason) : takeover(reason, progress);
  /** 행동 뒤 재관찰 실패의 인계 사유 — 예산 소진은 loop_limit, 그 밖(탭 없음 · 등재 밖 이동 등)은 site_not_ready. */
  const observeFailed = (o: { errorCode?: string }): Promise<WorkAgentRunResult> => {
    terminalErrorCode = o.errorCode ?? null;
    return o.errorCode === WORK_AGENT_ERROR.LOOP_LIMIT ? takeover('loop_limit', 'no_progress') : takeover('site_not_ready', 'needs_user');
  };
  /** 명령 오류 코드가 근거인 인계 — 코드를 Experience 실패 이벤트에 남긴다. */
  const takeoverWith = (code: string | undefined, reason: TakeoverReason, progress: WorkProgress): Promise<WorkAgentRunResult> => {
    terminalErrorCode = code ?? null;
    return takeover(reason, progress);
  };

  // WINDOWS-UI-AUTOMATION-V0 — 표면 선택. windows_app 은 UIA(같은 Planner 어휘 · 같은 검증 · 다른 실행층).
  const surface: WorkSurface = targetRef.targetType === 'windows_app' ? 'uia' : 'dom';
  // Experience 기록은 기기 · 재개 검증을 지나 대상 준비에 들어간 뒤부터만(그 전 종료는 기록할 run 이 없다).
  let surfaceReady = false;
  const observationBinding: { current?: WorkObservationSession } = {};
  let resumeRow: WorkRunCoordinationRow | null = null;

  // ── PHASE 1 same-run resume(§조건 5·검증 A·B·F) — 재개 요청 runId 를 먼저 읽기 전용으로 검증한다(claim 은 대상 준비 뒤).
  //    유효하지 않은(종료·만료·비소유·비대기) runId 는 여기서 즉시 거부한다 — 대상 준비 비용을 쓰기 전에.
  //    Phase D: 노드 선택보다 먼저 한다 — 이 run 이 마지막으로 질문한 노드를 우선 고르기 위해서다.
  if (input.runId !== undefined) {
    if (!isValidRunId(input.runId)) return finishNoState(WORK_AGENT_ERROR.RESUME_REJECTED, resumeRejectMessage('not_found'), 'needs_user');
    const check = await checkResumable(dataSource, { runId: input.runId, userId: ctx.userId });
    // strictNullChecks off — 판별 union 의 negation narrowing 이 안 먹으므로 positive 분기 + 좁은 캐스트로 reason 을 읽는다(ref).
    if (check.ok) {
      resumeRow = check.row;
    } else {
      const reason = (check as { reason: ResumeRejectReason }).reason;
      return finishNoState(WORK_AGENT_ERROR.RESUME_REJECTED, resumeRejectMessage(reason), 'needs_user');
    }
  }

  // ── Phase D — Execution Node 선택(V2 §11-1). 여러 노드가 online 이어도 멈추지 않고 Assistant 가 고른다:
  //    대상에 필요한 capability → 우선 노드(이 run 이 마지막으로 질문한 노드 · Assistant 가 준 같은 Task 의 이전 노드) → 최근 heartbeat.
  const preferNodes = [resumeRow?.deviceId, ...(input.intent?.node?.preferredDeviceIds ?? [])].filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
  const resolution = await resolveTargetDevice(dataSource, ctx.userId, {
    need: surface === 'uia' ? 'windows_uia' : 'browser',
    prefer: preferNodes,
  });
  if (resolution.status !== 'ok') {
    state.progress = 'needs_user';
    state.takeover = { reason: 'site_not_ready', step: 0 };
    const r = await finish();
    r.errorCode = resolution.status === 'none' ? LOCAL_AGENT_ERROR.NO_DEVICE : LOCAL_AGENT_ERROR.OFFLINE;
    return r;
  }
  deviceId = resolution.device.id;
  executionNode = resolution.device;
  // 소유 주체 키: Assistant 가 Task 소유로 정한 값. Task 없이 온 실행(직접 endpoint 등)은 요청자 개인 업무로 본다.
  ledgerOwner = executionNode.capabilities?.ownerScopedLedger === true
    ? (input.intent?.node?.ownerKey ?? nodeLedgerOwnerKey('USER', ctx.userId))
    : null;
  if (resolution.onlineCount > 1) logger.info('work-agent node selected', { reason: resolution.reason, onlineCount: resolution.onlineCount });

  // ── Target Discovery / Activation (§3·§34·§35) — 관찰 · Planner 전에 대상을 준비한다. 행동 예산을 쓰지 않는다.
  //    이미 열려 있으면 그 탭/창을 앞으로, 없으면 등재 방법으로 열고, 그래도 안 되면 사용자에게 넘긴다. 준비되지 않은 대상에
  //    DOM inspect 를 반복하지 않는다.
  targetOutcome = await issueTargetPrepare(dataSource, ctx, deviceId, tool, targetRef);
  if (targetOutcome.state !== 'ready') {
    // 사용자 요청(열어 주세요 · 로그인 · 여러 탭 중 선택) 또는 준비 실패 — 둘 다 loop 를 시작하지 않는다.
    // 아직 run 을 열지 않았다(runCreated=false) — 재개 요청이면 coordination row 는 waiting_for_user 로 그대로 남아 재시도 가능.
    surfaceReady = true;
    const r = await takeoverWith(targetOutcome.errorCode ?? WORK_AGENT_ERROR.SITE_NOT_READY, 'site_not_ready', 'needs_user');
    r.errorCode = targetOutcome.errorCode ?? WORK_AGENT_ERROR.SITE_NOT_READY;
    return r;
  }

  // ── PHASE 1 same-run resume — 대상이 준비된 지금 logical run 을 확정한다(§조건 5 우선순위 1·4). ──
  //    재개면 같은 runId 를 claim(active 로 전이, optimistic version), 새 작업이면 goalId 를 runId 로 승격해 새 run 을 연다.
  //    저장된 관찰을 되살리지 않는다 — 아래 loop 가 현재 화면을 새로 관찰하고 planner 를 re-prime 한다.
  if (resumeRow) {
    goal.runId = resumeRow.runId;
    const claimed = await transitionWorkRun(dataSource, {
      runId: resumeRow.runId, status: WORK_RUN_STATUS.ACTIVE, expectedVersion: resumeRow.version, deviceId,
    });
    if (!claimed) {
      // 읽은 뒤 다른 인스턴스가 먼저 claim/전이했다(version 불일치) — 안전하게 재개를 거부한다(검증 E).
      return finishNoState(WORK_AGENT_ERROR.RESUME_REJECTED, resumeRejectMessage('not_waiting'), 'needs_user');
    }
    coordinationVersion = claimed.version;
    runCreated = true;
    resumedRun = true;
  } else {
    goal.runId = goal.goalId; // 새 logical run — goalId 가 곧 runId 앵커.
    const created = await createWorkRun(dataSource, { runId: goal.runId, userId: ctx.userId, deviceId });
    coordinationVersion = created?.version ?? 1;
    runCreated = true;
  }
  surfaceReady = true;
  // Record structural run state. v9 nodes keep the replay request only in bounded process memory; older nodes receive no request summary.
  await issueWorkRunUpsert(dataSource, { userId: ctx.userId, deviceId, ownerKey: ledgerOwner }, {
    // 재개 답변(짧은 답)으로 원래 목표 요약을 덮지 않는다.
    runId: goal.runId, status: 'active', targetId: siteId, goalSummary: !resumedRun && executionNode.capabilities?.pharmacyData === true ? goal.request.slice(0, 200) : undefined,
  });

  // Bind Task recall only after owner/node verification and successful run claim.
  const taskSession = createWorkTaskSession({ dataSource, ledgerCtx: { userId: ctx.userId, deviceId, ownerKey: ledgerOwner }, state, siteId, surface, stepMeta, resumedRun, resumeRow, intent: input.intent });
  sessions.task = taskSession;
  await taskSession.initialize();

  // Bind the observation session only after node ownership, target preparation and run claim have passed.
  const observationSession = createWorkObservationSession({
    executionState, dataSource, ctx, deviceId: deviceId as string, executionNode: executionNode as DeviceRow, tool, siteId, surface, state, measurements });
  observationBinding.current = observationSession;
  const { budgetLeft, overTime, dom, unitCapable, runUnit, applyDomObservation, unitObserveError, reobserve, observe } = observationSession;
  const actionBinding: { current?: WorkActionSession } = {};
  const enterVisualFallback = () => actionBinding.current!.enterVisualFallback();

  const planningSession = createWorkPlanningSession({
    executionState,
    state, planner, strongPlanner: options.strongPlanner, taskSession, observationSession, measurements, workflow, surface, stepMeta,
    request: { image, siteDisplayName: displayName, recoveryHint, intent: input.intent },
    readFeedback: () => ({ lastRead, lastSafetyReason: actionBinding.current?.safetyReason() ?? '' }), isReplaying: () => replaying,
    onNeededInput: (value) => { neededInput = value; }, onPlannerTakeover: () => { plannerTakeover = true; },
    finish, takeover, stuckEnd, observeFailed, enterVisualFallback,
    completion: input.judge ? { judge: input.judge, evidence: completionEvidence } : undefined,
  });
  sessions.planning = planningSession;
  const { currentActor, refreshPlannerMode, recover, planNextProposal, acceptProposal } = planningSession;

  // ── 행동 실행(단발·Fast Loop 배치 공용) — act-only 종류 하나를 실행하고 다음 지시만 돌려준다. 재관찰은 호출자가 한다. ──
  //   uia 표면: set_input·click·key → local.uia.*, visual_* → local.computer.*(시각 모드 전용).  dom 표면: set_input·select_option·click → local.dom.*.
  //   지시: takeover(인계) · observe(화면 바뀜/오류 → 한 번 재관찰) · continue(재관찰 없이 다음) · reject(실행 안 함, 무효 제안).

  /**
   * `pre` — Phase E 단위 경로: 노드가 이미 실행한 행동의 결과. 명령을 다시 보내지 않고 같은 기록 · 같은 오류 해석 · 같은 지시를 만든다
   * (단발 경로와 history · trajectory · Experience 가 같은 모양이 되게). 예산은 단발과 같이 행동 1.
   */
  const actionSession = createWorkActionSession({
    executionState, state, surface, observationSession, stepMeta, trajectory, currentActor, setRejectReason: planningSession.setRejectReason });
  actionBinding.current = actionSession;
  const execActOnce = actionSession.execute;

  const first = await observe();
  if (!first.ok) {
    state.progress = 'needs_user';
    state.takeover = { reason: first.errorCode === LOCAL_AGENT_ERROR.DOM_CROSS_ORIGIN_BLOCKED ? 'unsupported_control' : 'site_not_ready', step: state.stepCount };
    terminalErrorCode = first.errorCode ?? WORK_AGENT_ERROR.SITE_NOT_READY;
    const r = await finish();
    r.errorCode = first.errorCode ?? WORK_AGENT_ERROR.SITE_NOT_READY;
    return r;
  }

  // ── PHASE 2 결정론적 재생(IR §8 재생 규칙) — 같은 대상의 같은 형태 요청이면 저장된 Workflow 를 먼저 빠르게 재생한다. ──
  //   Local 이 템플릿을 대조해 이번 요청의 값을 채운 semantic 단계만 돌려준다. 각 단계는 **현재 화면에서** locator(role·name|text)로
  //   다시 찾고(find · 유일할 때만), 같은 제안 검증(validateWorkProposal)과 같은 실행 경로(execActOnce · 안전 경계 그대로)를 거친다.
  //   찾지 못함 · 모호함 · 검증 거절 · 실패 · 예상 변화(이동) 불일치면 즉시 멈추고 AI loop 가 현재 화면에서 이어받는다(self-healing).
  //   완료 판단은 재생이 하지 않는다 — 재생 뒤에도 loop 의 Planner 가 확인한다(보통 계획 1회). 맹목 재생 금지.
  /** 결정적 재생 본체 — 인계로 끝나면 그 결과를, 아니면 null(loop 의 Planner 가 이어받는다). */
  const runReplay = createWorkReplay({
    state,
    surface,
    get lastActRecord() {
      return actionSession.lastRecord();
    },
    budgetLeft,
    overTime,
    observe,
    reobserve,
    observeFailed,
    takeover,
    takeoverWith,
    dom,
    unitCapable,
    runUnit,
    execActOnce,
    applyDomObservation,
    unitObserveError,
    workflow,
    get replaying() {
      return replaying;
    },
    set replaying(value) {
      replaying = value;
    },
    get replayDiverge() {
      return replayDiverge;
    },
    set replayDiverge(value) {
      replayDiverge = value;
    },
  });

  if (surface === 'dom' && !resumedRun && !recoveryHint && !image) {
    let match: Awaited<ReturnType<typeof issueWorkflowCandidateMatch>> | null = null;
    try {
      match = await issueWorkflowCandidateMatch(dataSource, { userId: ctx.userId, deviceId, ownerKey: ledgerOwner ? nodeLedgerOwnerKey('USER', ctx.userId) : null }, {
        targetId: siteId, request: normalizeWorkflowText(goal.request).slice(0, 500),
      });
    } catch (e) {
      logger.warn('work-agent workflow match failed', { code: (e as { code?: string })?.code ?? null });
    }
    // 재생 전 의미 검증(FIX-V1 §2-A) — 템플릿 일치만으로 실행하지 않는다. 요청 값이 대상을 스스로 정하지 못하면(모호)
    // 입력 · 클릭 전에 QUESTION 으로 멈춘다. 재생을 시도하지 않았으므로 Candidate 통계에는 넣지 않는다(replayedCandidateId 미설정).
    if (match?.candidateId && match.steps && replayPreflight(goal.request, match.steps) === 'ambiguous') {
      logger.info('work-agent workflow preflight', { result: 'ambiguous', aiPlanCount: state.aiPlanCount });
      // Phase 2 — 막힌 자리(Candidate · 단계 번호)만 남긴다. 재개 답이 값이면 그 자리만 채워 결정적으로 잇는다.
      const req = normalizeWorkflowText(goal.request);
      const idx = match.steps.findIndex((s) => s.value !== undefined && (s.actionKind === 'set_input' || req.includes(s.value)) && assessReplayValue(s.value) === 'ambiguous');
      if (idx >= 0 && idx <= 63) taskSession.rememberReplayQuestion({ candidateId: match.candidateId, stepIndex: idx });
      neededInput = '무엇을 찾거나 입력할지 구체적인 이름이나 번호로 알려 주세요.';
      inputMissing = true;
      return question('user_judgment_required');
    }
    if (match?.candidateId && match.steps) {
      replayedCandidateId = match.candidateId;
      const r = await runReplay(match.steps);
      if (r) return r;
    }
  } else if (surface === 'dom' && resumedRun && taskSession.resumeReplay()) {
    const resumeReplay = taskSession.resumeReplay()!;
    // Phase 2 — 재개 답(값)으로 막혔던 자리만 채운 재생. 같은 검증 · 실행 경로. Candidate 통계에는 넣지 않는다
    // (replayedCandidateId 미설정 — Phase 1 재개 run 의 Candidate 계약 유지). 완료 판단은 이어서 loop 의 Planner 가 한다.
    logger.info('work-agent resume replay', { steps: resumeReplay.steps.length });
    const r = await runReplay(resumeReplay.steps);
    if (r) return r;
  }

  // ── loop ──────────────────────────────────────────────────────────────────
  // B — 새 업무 · 경험 없음 · 재생 불일치 · 교정 직후는 Discovery 역할로 시작한다. 검증 경험이 있으면 Experienced.

  const dispatchContext: WorkDispatchContext = {
    state,
    surface,
    get lastActRecord() {
      return actionSession.lastRecord();
    },
    budgetLeft,
    overTime,
    observe,
    reobserve,
    observeFailed,
    takeover,
    takeoverWith,
    dom,
    unitCapable,
    runUnit,
    execActOnce,
    applyDomObservation,
    unitObserveError,
    stepMeta,
    currentActor,
    get lastRead() {
      return lastRead;
    },
    set lastRead(value) {
      lastRead = value;
    },
    get lastRejectReason() {
      return planningSession.rejectReason();
    },
    set lastRejectReason(value) {
      planningSession.setRejectReason(value);
    },
    completionEvidence,
  };
  refreshPlannerMode('start');
  while (true) {
    if (overTime() || budgetLeft() < 1) return takeover('loop_limit', 'no_progress');
    if (state.aiPlanCount >= WORK_LOOP_LIMITS.maxAiPlans) return takeover('loop_limit', 'no_progress');
    // 같은 관찰이 반복됐다(무진전) — 무작정 다시 계획하지 말고 복구 판단(§36·§16). strong 이 있으면 한 번 더 세게, 없으면 인계.
    if (observationSession.sameObservationRun() >= WORK_LOOP_LIMITS.maxSameObservation) {
      if (recover({ noProgress: true }, { normalSpent: true }) === 'giveup') return stuckEnd('no_progress', 'no_progress');
    }
    const planned = await planNextProposal();
    if (!planned) continue;
    if (planned.result) return planned.result;
    const proposal = planned.proposal as WorkProposal;
    const accepted = await acceptProposal(proposal);
    if (accepted === 'continue') continue;
    if (accepted) return accepted;

    const dispatched = await dispatchWorkProposal(dispatchContext, proposal);
    if (dispatched) return dispatched;
  }
}

// ─── 렌더 (§20·§21) ─────────────────────────────────────────────────────────

const TAKEOVER_LINE: Record<TakeoverReason, string> = {
  user_active: '자동화 중 사용자의 키보드·마우스 입력이 감지되어 멈췄습니다. 현재 화면을 확인한 뒤 다시 요청해 주세요.',
  target_changed: '작업 중이던 창이 앞에 있지 않아(다른 창/프로그램이 앞으로 옴) 멈췄습니다. 그 창을 다시 앞에 두고 요청해 주세요.',
  target_identity_uncertain: '작업 창의 내용이 관찰 때와 달라져 대상을 확신할 수 없어 멈췄습니다. 화면을 확인하고 직접 진행해 주세요.',
  uia_target_ambiguous: '화면 요소를 다시 찾지 못해 멈췄습니다. 화면을 확인하고 직접 진행해 주세요.',
  uia_hidden_control: '이 프로그램의 목록 항목을 O4O 가 구조적으로 확인할 수 없어 항목 선택은 직접 해 주세요. 선택한 뒤 다시 요청하면 이어서 진행합니다.',
  submit_not_verified: '전송·제출 직전에 대상 창을 확인할 수 없어 보내지 않았습니다. 화면을 확인하고 직접 보내 주세요.',
  key_semantics_unknown: '이 프로그램에서 그 키가 무엇을 하는지 등록되어 있지 않아 누르지 않았습니다. 직접 진행해 주세요.',
  vision_uncertain: '화면 판독의 확신이 낮아 멈췄습니다. 직접 확인해 주세요.',
  unexpected_window: '예상하지 못한 창(대화상자)이 떠서 멈췄습니다. 그 창을 처리한 뒤 다시 요청해 주세요.',
  goal_sufficiently_advanced: '목적에 충분히 가까운 화면까지 왔습니다. Chrome 의 그 화면에서 이어서 진행하세요.',
  user_judgment_required: '사용자의 판단이 필요한 지점입니다. Chrome 화면에서 직접 확인해 주세요.',
  ambiguous_result: '결과가 여럿이거나 모호합니다. Chrome 화면에서 직접 고르세요.',
  unsupported_control: 'O4O 가 다루지 못하는 화면 요소(또는 등록 밖 이동)라 여기서 멈췄습니다.',
  review_required: '검토가 필요한 단계라 멈췄습니다.',
  commit_required: '결제·주문 확정·삭제 같은 단계는 O4O 가 대신 누르지 않습니다. 직접 진행하세요.',
  credential_required: '로그인·비밀번호·인증 단계는 사용자가 직접 합니다. 로그인 뒤 다시 요청하세요.',
  site_not_ready: '사이트 탭이 준비되지 않았습니다. Chrome 에 해당 사이트 탭을 열어 두고 다시 요청하세요.',
  no_progress: '더 진행되지 않아 멈췄습니다. 현재 화면에서 직접 이어서 하세요.',
  loop_limit: '이번 요청의 행동 한도에 닿아 멈췄습니다. 현재 화면에서 직접 이어서 하세요.',
  planner_unavailable: '다음 행동을 정하지 못해 멈췄습니다. 현재 화면에서 직접 이어서 하세요.',
};

/** 대상 준비 결과 한 줄(§54). 사용자가 확인할 수 있는 사실만 — 경로 · 탭 제목 · 실행 경로는 없다. */
export function renderTargetLine(t: WorkTargetOutcome | null): string {
  if (!t) return '';
  const unit = t.targetType === 'browser_site' ? '탭' : '창';
  if (t.state === 'ready') {
    if (t.reusedExisting) return t.targetType === 'browser_site' ? `${t.displayName} 탭이 이미 열려 있어 그 탭을 사용합니다.` : `${t.displayName} 창을 찾아 앞으로 가져왔습니다.`;
    if (t.openedByO4O) return t.targetType === 'browser_site' ? `${t.displayName} 탭이 없어 새로 열었습니다.` : `${t.displayName}이(가) 실행되어 있지 않아 실행했습니다.`;
    return `${t.displayName} 준비됨.`;
  }
  if (t.reason === 'multiple_tabs' || t.reason === 'multiple_windows') return `${t.displayName} ${unit}이 여러 개라 하나를 정하지 못했습니다. 사용할 ${unit}을 앞으로 가져온 뒤 다시 요청하세요.`;
  if (t.reason === 'extension_not_connected') return `${t.displayName} 탭을 확인하려면 이 PC 의 O4O Chrome 확장이 연결되어 있어야 합니다.`;
  if (t.reason === 'permission_required') return `${t.displayName} 사이트 권한을 Chrome 확장에서 허용한 뒤 다시 요청하세요.`;
  if (t.targetType === 'windows_app') return `${t.displayName}이(가) 실행되어 있지 않고 O4O 가 열 수 없습니다. 프로그램을 실행해 주세요. 로그인이 필요하면 로그인까지 완료해 주세요.`;
  return `${t.displayName} 탭을 준비하지 못했습니다. Chrome 에서 ${t.displayName}을(를) 열어 둔 뒤 다시 요청하세요.`;
}

export function renderWorkAgentMessage(state: WorkAgentState, displayName: string, neededInput: string | null, target: WorkTargetOutcome | null = null, resumable = false): string {
  const actions = state.history.filter((h) => h.status === 'success' && !['inspect', 'find', 'read_text', 'read_table'].includes(h.action.kind)).length;
  const targetLine = renderTargetLine(target);
  // 대상 준비 단계에서 끝난 경우 — 행동 0 단계를 "수행했습니다" 로 말하지 않는다.
  if (target && target.state !== 'ready' && state.takeover?.reason === 'site_not_ready') {
    return `${targetLine} Chrome 의 현재 화면은 그대로 두었습니다.`.trim();
  }
  if (target && target.targetType === 'windows_app' && state.takeover?.reason === 'unsupported_control') {
    return `${targetLine} 프로그램 안의 작업은 아직 O4O 가 대신하지 않습니다 — 화면에서 직접 이어서 하세요.`;
  }
  const head = `${targetLine ? `${targetLine} ` : ''}${displayName} 에서 ${state.history.filter((h) => h.status === 'success').length}단계(입력·클릭 ${actions}회) 를 수행했습니다.`;
  const isApp = target?.targetType === 'windows_app';
  if (state.progress === 'completed' && !state.takeover) return `${head} 목적을 이룬 것으로 판단해 멈췄습니다. ${isApp ? '프로그램 화면에서' : 'Chrome 화면에서'} 결과를 확인하세요.`;
  if (state.takeover) {
    const line = TAKEOVER_LINE[state.takeover.reason];
    const screen = isApp ? '프로그램 화면은 그대로 두었습니다.' : 'Chrome 의 현재 화면은 그대로 두었습니다.';
    // QUESTION(재개 가능) — 답을 주면 같은 작업을 이어서 진행한다는 것을 알린다. TAKEOVER(재개 불가) 는 화면을 직접 이어받으라고 한다.
    if (resumable) {
      return `${head} ${line}${neededInput ? ` 필요한 정보: ${neededInput}` : ''} ${screen} 답을 주시면 같은 작업을 이어서 진행합니다.`;
    }
    return `${head} ${line}${neededInput ? ` 필요한 정보: ${neededInput}` : ''} ${screen}`;
  }
  return `${head} 현재 화면에서 이어서 진행하세요.`;
}
