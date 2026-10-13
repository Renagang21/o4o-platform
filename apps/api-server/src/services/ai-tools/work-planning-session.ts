/** Request-local Execution Planning. Proposal validation and the existing recovery contract remain authoritative. */
import logger from '../../utils/logger.js';
import {
  WORK_LOOP_LIMITS,
  sameWorkAction,
  validateWorkProposal,
  type WorkAgentState,
  type WorkStepRecord,
  type WorkObservation,
  type WorkProposal,
  type TakeoverReason,
  type WorkProgress,
  type ProposalRejectReason,
  type WorkSurface,
} from './work-agent-contract.js';
import {
  RECOVERY_ERROR,
  RECOVERY_LIMITS,
  classifyFailure,
  decideRecovery,
  isEscalatable,
  noteNotRecovered,
  noteRecovered,
  type ClassifyInput,
} from './automation-recovery-contract.js';
import {
  METHOD_DISCOVERY_MAX,
  type WorkPlanner,
  type PlannerInput,
} from './work-planner.js';
import type { ProposalAsk } from './work-assistance.js';
import type { ExperienceActor, ExperienceStepMeta } from './work-experience.js';
import type { WorkTaskSession } from './work-task-session.js';
import type {
  WorkObservationSession,
  WorkRunMeasurements,
} from './work-observation-session.js';
import type {
  WorkAgentRunResult,
  WorkflowRunSummary,
} from './work-agent-runtime.js';

// ── STRONG-FIRST-DISCOVERY-ROUTING-V1 A — 질문 이유 분리 ──
//   정보 부족 · 사용자 결정은 바로 묻는다/넘긴다. 방법 부족은 사용자에게 넘기기 전에 Discovery 가 현재 화면을 다시 보고 직접 찾는다.
//   credential · commit 은 이 분류 전에 별도 인계(never-escalate)로 끝나므로 여기 오지 않는다.
export type QuestionBasis =
  | 'information_missing'
  | 'method_missing'
  | 'user_decision';
const METHOD_ASK_KINDS: ReadonlySet<string> = new Set([
  'menu_location',
  'procedure_order',
  'manual_request',
]);
const INFORMATION_ASK_KINDS: ReadonlySet<string> = new Set([
  'value_confirmation',
  'target_confirmation',
]);

/**
 * 질문의 이유. 근거는 Planner 가 선언한 ask.kind 와 neededInput 뿐이다.
 * 이유를 알 수 없는 질문(ask 없음 · neededInput 없음)은 사용자 결정으로 본다 — AI 가 억지로 풀지 않는 쪽이 안전하다.
 */
export function classifyQuestionBasis(
  ask: ProposalAsk | null | undefined,
  neededInput?: string | null,
): QuestionBasis {
  if (ask && METHOD_ASK_KINDS.has(ask.kind)) return 'method_missing';
  if (ask && INFORMATION_ASK_KINDS.has(ask.kind)) return 'information_missing';
  if (!ask && neededInput) return 'information_missing';
  return 'user_decision';
}

// ── STRONG-FIRST-DISCOVERY-ROUTING-V1 B — Planner 역할(mode) routing ──
//   모델 교체가 아니다. 같은 모델이어도 Discovery 역할(strongPlanner 경로)과 Experienced execution 역할(normal planner 경로)을
//   국면으로 고른다. 새 업무 · 경험 없음 · 기존 방법 불일치 · Method Correction 직후는 Discovery. 검증된 방법이 있을 때만 Experienced.
export type PlannerMode = 'discovery' | 'experienced';
export function choosePlannerMode(s: {
  /** 이 Task × Target 의 verified Preferred 패턴이 있다. */
  hasVerifiedPreferred: boolean;
  /** 저장된 Workflow 재생이 어긋남 없이 끝났다. */
  replayCompleted: boolean;
  /** 이번 run 에 사용자 교정(Method Correction 포함)이 들어왔다. */
  correctionSeen: boolean;
  /** 기존 방법이 맞지 않았다(재생 이탈 · 방법 탐색 · 복구 escalation). */
  methodMismatch: boolean;
}): PlannerMode {
  if (s.correctionSeen || s.methodMismatch) return 'discovery';
  return s.hasVerifiedPreferred || s.replayCompleted
    ? 'experienced'
    : 'discovery';
}

interface WorkPlanningSessionInput {
  state: WorkAgentState;
  planner: WorkPlanner;
  strongPlanner?: WorkPlanner;
  taskSession: Pick<
    WorkTaskSession,
    | 'hasPreferredPattern'
    | 'hasCorrection'
    | 'plannerFields'
    | 'forbiddenValues'
    | 'acceptDeclarations'
    | 'needsPatternRecall'
    | 'recallDeclaredPatterns'
    | 'hasPatterns'
    | 'avoidedStage'
    | 'clearAsk'
  >;
  observationSession: Pick<
    WorkObservationSession,
    | 'budgetLeft'
    | 'observe'
    | 'isVisualFallback'
    | 'plannerImage'
    | 'sameObservationRun'
    | 'resetSameObservationRun'
    | 'restoreSameObservationRun'
  >;
  measurements: WorkRunMeasurements;
  workflow: WorkflowRunSummary;
  surface: WorkSurface;
  stepMeta: WeakMap<WorkStepRecord, ExperienceStepMeta>;
  request: Pick<
    PlannerInput,
    'image' | 'siteDisplayName' | 'recoveryHint' | 'intent'
  >;
  readFeedback(): { lastRead: string | null; lastSafetyReason: string };
  isReplaying(): boolean;
  onNeededInput(value: string): void;
  onPlannerTakeover(): void;
  finish(): Promise<WorkAgentRunResult>;
  takeover(
    reason: TakeoverReason,
    progress: WorkProgress,
  ): Promise<WorkAgentRunResult>;
  stuckEnd(
    reason: TakeoverReason,
    progress: WorkProgress,
  ): Promise<WorkAgentRunResult>;
  observeFailed(result: { errorCode?: string }): Promise<WorkAgentRunResult>;
  enterVisualFallback(): Promise<{ ok: boolean; errorCode?: string }>;
}

export function createWorkPlanningSession(input: WorkPlanningSessionInput) {
  const {
    state,
    planner,
    strongPlanner,
    taskSession,
    observationSession,
    measurements,
    workflow,
    surface,
    stepMeta,
    readFeedback,
    isReplaying,
    onNeededInput,
    onPlannerTakeover,
    finish,
    takeover,
    stuckEnd,
    observeFailed,
    enterVisualFallback,
  } = input;
  const {
    image,
    siteDisplayName: displayName,
    recoveryHint,
    intent,
  } = input.request;
  const goal = state.goal;
  let plannerMode: PlannerMode = 'discovery';
  let activePlanner: WorkPlanner = strongPlanner ?? planner;
  let methodDiscoveryAttempts = 0;
  let methodDiscovery: PlannerInput['methodDiscovery'] = undefined;
  let recoveryStatus: string | null = null;
  let recoveryGiveupKind: 'question' | 'takeover' = 'takeover';
  let repeatedActionRun = 0;
  let lastRejectReason: ProposalRejectReason | undefined;
  const currentActor = (): ExperienceActor =>
    isReplaying()
      ? 'deterministic'
      : strongPlanner && activePlanner === strongPlanner
        ? 'ai_strong'
        : 'ai_normal';
  /** B — 경험 근거로 planner 역할을 다시 정한다. 시작 시와 바뀔 때만 enum 로그를 남긴다. */
  const refreshPlannerMode = (
    why:
      | 'start'
      | 'patterns'
      | 'correction'
      | 'method_discovery'
      | 'escalation',
  ): void => {
    const next = choosePlannerMode({
      hasVerifiedPreferred: taskSession.hasPreferredPattern(),
      replayCompleted: workflow.replay === 'completed',
      correctionSeen: taskSession.hasCorrection(),
      methodMismatch:
        workflow.replay === 'diverged' ||
        methodDiscoveryAttempts > 0 ||
        state.recovery.escalatedToStrong,
    });
    const nextPlanner =
      next === 'discovery' && strongPlanner ? strongPlanner : planner;
    if (
      why !== 'start' &&
      next === plannerMode &&
      nextPlanner === activePlanner
    )
      return; // 시작 역할은 늘 남긴다(실 PC 확인용).
    plannerMode = next;
    activePlanner = nextPlanner;
    logger.info('work-agent planner mode', {
      mode: next,
      why,
      aiPlanCount: state.aiPlanCount,
    });
  };
  // ── 실패→복구 계층 (WO-O4O-AUTOMATION-FAILURE-ESCALATION §4·§11·§16·§22·§27·§67) ──
  //   실패를 무작정 반복하지 않는다. 분류(classify) → 판단(decideRecovery): 더 강한 추론(strong)으로 올릴지,
  //   그냥 다시 시도할지, 사용자에게 넘길지. credential/commit/unsupported 는 이 경로를 타지 않는다 —
  //   위의 즉시 takeover 가 먼저 잡는다(§8 never-escalate). strongPlanner 가 없으면 escalation 없이 기존 동작 그대로다.
  //
  //   normalSpent=true 는 "이미 정상 재시도(loop 의 반복 상한 · invalidProposals 예산)를 소진했다" 는 뜻 —
  //   국면을 strong 부터 판단하게 한다(§16). throw 경로는 false 로 정상 tier 진행(정상 재시도 → strong).
  const recover = (
    input2: ClassifyInput,
    opts: { normalSpent?: boolean } = {},
  ): 'retry' | 'giveup' => {
    const cls = classifyFailure(input2);
    if (opts.normalSpent) {
      state.recovery.activeClass = cls;
      state.recovery.lastClass = cls;
      state.recovery.normalRetries = RECOVERY_LIMITS.normalRetryMax;
    }
    const decision = decideRecovery(state.recovery, cls);
    if (decision.useStrongModel && strongPlanner) {
      activePlanner = strongPlanner;
      if (plannerMode !== 'discovery')
        logger.info('work-agent planner mode', {
          mode: 'discovery',
          why: 'escalation',
          aiPlanCount: state.aiPlanCount,
        });
      plannerMode = 'discovery'; // 막힘 → Discovery 역할로 되돌린다(B). 기록 actor 도 ai_strong.
      recoveryStatus = RECOVERY_ERROR.ESCALATED;
      state.invalidProposals = 0;
      observationSession.resetSameObservationRun();
      repeatedActionRun = 0;
      measurements.retryCount += 1;
      return 'retry';
    }
    if (!decision.askUser && !opts.normalSpent && strongPlanner) {
      measurements.retryCount += 1;
      return 'retry';
    } // normal_retry(throw 경로) — strong 이 있을 때만 재시도 이득.
    noteNotRecovered(state.recovery);
    recoveryStatus = decision.useStrongModel
      ? RECOVERY_ERROR.PROVIDER_UNAVAILABLE
      : RECOVERY_ERROR.USER_HELP_REQUIRED;
    // 복구 소진의 끝: escalatable 하고 사용자에게 넘기는 국면이면 QUESTION(답하면 같은 run 재개), 아니면 TAKEOVER(§조건 5).
    // non-escalatable(RISK_BLOCKED·USER_INTERFERENCE·UNSUPPORTED_UI·AMBIGUOUS_STATE) · provider 불가는 항상 TAKEOVER.
    recoveryGiveupKind =
      decision.askUser && isEscalatable(cls) ? 'question' : 'takeover';
    return 'giveup';
  };
  /** 복구 국면 뒤 성공(완료) — 무엇으로 복구됐는지 기록한다(§27). 힌트가 실려 있으면 그 덕으로 본다. */
  const markRecovered = () => {
    if (
      state.recovery.escalatedToStrong ||
      state.recovery.activeClass ||
      recoveryHint
    ) {
      noteRecovered(state.recovery, { userHintPresent: !!recoveryHint });
      recoveryStatus = null; // 복구 성공 — 진행(ESCALATED) 신호 해제.
    }
  };

  /** One planning attempt, validation and recovery. null retries the existing loop. */
  const planNextProposal = async (): Promise<{
    proposal?: WorkProposal;
    result?: WorkAgentRunResult;
  } | null> => {
    // Read current execution feedback at the call boundary, including after awaits.
    const { lastRead, lastSafetyReason } = readFeedback();
    // Plan (§8)
    let raw: unknown;
    state.aiPlanCount += 1;
    const planT0 = Date.now();
    measurements.aiCalls += 1;
    try {
      raw = await activePlanner.plan({
        goal,
        siteDisplayName: displayName,
        observation: state.observation as WorkObservation,
        history: state.history,
        lastRead,
        image:
          observationSession.isVisualFallback() &&
          observationSession.plannerImage()
            ? observationSession.plannerImage()
            : image,
        lastRejectReason,
        lastSafetyReason: lastSafetyReason || undefined,
        recoveryHint,
        stepsLeft: observationSession.budgetLeft(),
        ...taskSession.plannerFields(),
        ...(methodDiscovery ? { methodDiscovery } : {}),
        ...(intent ? { intent: intent } : {}),
      });
      methodDiscovery = undefined;
      measurements.aiMs += Date.now() - planT0;
    } catch {
      measurements.aiMs += Date.now() - planT0;
      // planner 호출 실패(PLANNING_FAILURE) — 정상 재시도 → strong → 사용자(§16). strong 없으면 기존대로 즉시 인계.
      if (recover({ plannerFault: true }) === 'giveup')
        return { result: await takeover('planner_unavailable', 'failed') };
      return null;
    }
    const checked = validateWorkProposal(raw, state.observation, {
      forbiddenValues: taskSession.forbiddenValues(),
    });
    if (!checked.ok || !checked.proposal) {
      state.invalidProposals += 1;
      lastRejectReason = checked.reason;
      const rejected: WorkStepRecord = {
        step: state.stepCount,
        action: { kind: 'inspect' },
        status: 'rejected',
        rejectReason: checked.reason,
      };
      state.history.push(rejected);
      stepMeta.set(rejected, {
        actor: currentActor(),
        locator: null,
        durationMs: null,
      });
      if (state.invalidProposals >= WORK_LOOP_LIMITS.maxInvalidProposals) {
        // 정상 planner 가 계속 무효 제안 — 정상 재시도 소진으로 보고 strong 부터 판단(§16). strong 없으면 기존대로 인계.
        if (recover({ plannerFault: true }, { normalSpent: true }) === 'giveup')
          return { result: await takeover('planner_unavailable', 'failed') };
      }
      return null;
    }
    return { proposal: checked.proposal };
  };
  /** Accept task/experience declarations and control decisions before any action dispatch. */
  const acceptProposal = async (
    proposal: WorkProposal,
  ): Promise<WorkAgentRunResult | 'continue' | null> => {
    // ── Phase 2 — 선언된 구조를 받아 둔다(요청 메모리). 사용자 입력 분류는 첫 것을 쓴다. ──
    if (taskSession.acceptDeclarations(proposal))
      refreshPlannerMode('correction');
    // 처음 선언된 업무면 그 Task × Target 의 검증 패턴을 한 번 읽고, 있으면 이 제안은 실행하지 않고 패턴을 보여 주며 다시 계획한다.
    if (taskSession.needsPatternRecall()) {
      await taskSession.recallDeclaredPatterns();
      refreshPlannerMode('patterns');
      if (taskSession.hasPatterns()) {
        lastRejectReason = undefined;
        return 'continue';
      }
    }
    // 검증된 Avoid 와 같은 방법(같은 단계)은 실행하지 않는다 — 사용자가 교정하고 실제로 대안이 성공한 방법을 되풀이하지 않는다.
    const avoid = taskSession.avoidedStage(proposal);
    if (avoid) {
      state.invalidProposals += 1;
      lastRejectReason = 'AVOID_PATTERN';
      const rejected: WorkStepRecord = {
        step: state.stepCount,
        action: { kind: 'inspect' },
        status: 'rejected',
        rejectReason: 'AVOID_PATTERN',
      };
      state.history.push(rejected);
      stepMeta.set(rejected, {
        actor: currentActor(),
        locator: null,
        durationMs: null,
      });
      logger.info('work-agent avoid pattern', {
        stage: avoid.stage ?? null,
        aiPlanCount: state.aiPlanCount,
      });
      if (state.invalidProposals >= WORK_LOOP_LIMITS.maxInvalidProposals) {
        if (recover({ plannerFault: true }, { normalSpent: true }) === 'giveup')
          return takeover('planner_unavailable', 'failed');
      }
      return 'continue';
    }
    lastRejectReason = undefined;
    // A — 사용자에게 묻기 전에 질문 이유를 나눈다. 방법 부족(menu_location · procedure_order · manual_request)이면
    // 바로 넘기지 않고 Discovery 역할로 현재 화면을 다시 관찰해 스스로 찾게 한다(상한 METHOD_DISCOVERY_MAX).
    // 정보 부족(값 · 대상) · 사용자 결정 · 인증 · 고위험은 이 경로를 타지 않는다.
    const asksUser =
      (proposal.action.kind === 'takeover' &&
        proposal.action.reason === 'user_judgment_required') ||
      (proposal.assessment === 'needs_user' &&
        proposal.action.kind !== 'takeover' &&
        proposal.action.kind !== 'done');
    if (
      asksUser &&
      classifyQuestionBasis(proposal.ask, proposal.neededInput) ===
        'method_missing' &&
      methodDiscoveryAttempts < METHOD_DISCOVERY_MAX &&
      observationSession.budgetLeft() > 1
    ) {
      methodDiscoveryAttempts += 1;
      refreshPlannerMode('method_discovery');
      taskSession.clearAsk();
      const keepRun = observationSession.sameObservationRun(); // 다시 보기는 무진전으로 세지 않는다.
      const o = await observationSession.observe();
      observationSession.restoreSameObservationRun(keepRun);
      if (!o.ok) return observeFailed(o);
      methodDiscovery = {
        attempt: methodDiscoveryAttempts,
        askKind: proposal.ask?.kind ?? 'unknown',
      };
      logger.info('work-agent method discovery', {
        attempt: methodDiscoveryAttempts,
        askKind: methodDiscovery.askKind,
        aiPlanCount: state.aiPlanCount,
      });
      return 'continue';
    }
    if (proposal.neededInput) onNeededInput(proposal.neededInput);
    state.plannedAction = proposal.action;
    // Loop control actions — takeover 를 먼저 본다. Planner 가 assessment=completed 와 takeover 를 함께 내면
    // 인계 사유(goal_sufficiently_advanced 등)를 기록으로 남기는 쪽이 맞다(실 smoke 에서 관측).
    if (proposal.action.kind === 'takeover') {
      const reason = proposal.action.reason as TakeoverReason;
      // §4 — unsupported_control 은 바로 인계하지 않는다. uia 표면에서 아직 시각 모드가 아니면 화면을 캡처해
      // AI 가 실제 화면을 보고 이어서 판단하게 한다. 캡처가 되면 다시 계획(continue), 안 되면 원래대로 인계.
      if (
        reason === 'unsupported_control' &&
        surface === 'uia' &&
        !observationSession.isVisualFallback()
      ) {
        const v = await enterVisualFallback();
        if (v.ok) {
          lastRejectReason = undefined;
          return 'continue';
        }
      }
      if (reason === 'goal_sufficiently_advanced') markRecovered();
      onPlannerTakeover();
      return takeover(
        reason,
        reason === 'goal_sufficiently_advanced' ? 'completed' : 'needs_user',
      );
    }
    if (
      proposal.action.kind === 'done' ||
      proposal.assessment === 'completed'
    ) {
      state.progress = 'completed';
      markRecovered();
      return finish();
    }
    if (proposal.assessment === 'needs_user') {
      onPlannerTakeover();
      return takeover('user_judgment_required', 'needs_user');
    }
    // 반복 행동 감지(§36) — 같은 행동을 무작정 반복하지 않는다. 복구 판단: strong 이 있으면 다른 계획을 세우게 하고, 없으면 인계.
    if (sameWorkAction(state.lastResult?.action, proposal.action)) {
      repeatedActionRun += 1;
      if (repeatedActionRun >= WORK_LOOP_LIMITS.maxRepeatedAction) {
        if (recover({ noProgress: true }, { normalSpent: true }) === 'giveup')
          return stuckEnd('no_progress', 'no_progress');
        return 'continue';
      }
    } else repeatedActionRun = 0;
    return null;
  };
  return {
    planNextProposal,
    acceptProposal,
    currentActor,
    refreshPlannerMode,
    recover,
    markRecovered,
    mode: (): PlannerMode => plannerMode,
    recoveryStatus: (): string | null => recoveryStatus,
    giveupKind: () => recoveryGiveupKind,
    rejectReason: (): ProposalRejectReason | undefined => lastRejectReason,
    setRejectReason: (value: ProposalRejectReason | undefined): void => {
      lastRejectReason = value;
    },
  };
}
export type WorkPlanningSession = ReturnType<typeof createWorkPlanningSession>;
