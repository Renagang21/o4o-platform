/** Request-local Task structure and owner-scoped recall. Created only after target preparation and run claim.
 * No domain permissions or Assistant Task completion policy are defined here. */
import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';
import type { PlannerInput } from './work-planner.js';
import { nodeLedgerOwnerKey } from './node-ledger-owner.js';
import type {
  WorkAgentState,
  WorkGoalStatus,
  WorkProposal,
  WorkSurface,
  ExecutionIntent,
  ExecutionReport,
  WorkStepRecord,
} from './work-agent-contract.js';
import type { WorkRunCoordinationRow } from './work-run-coordination-service.js';
import {
  issueWorkRunContextSave,
  issueWorkRunContextRecall,
  issueWorkRunAssistanceRecord,
  issueExperienceRecall,
} from './work-run-executor.js';
import {
  deriveVerifiedPatterns,
  failedAlternativeOf,
  isPlainValueAnswer,
  mergeRecalledPatterns,
  pickRecalledContext,
  pickSafeExperienceRecall,
  stripLabels,
  strategyContains,
  verifyAlternative,
  type ProposalAsk,
  type ProposalUserInput,
  type RecalledPattern,
  type RunResumeFrame,
  type Strategy,
  type WorkAssistanceEvent,
} from './work-assistance.js';
import {
  experienceOutcomeOf,
  type ExperienceStepMeta,
} from './work-experience.js';
import {
  normalizeWorkflowText,
  validateReplaySteps,
  type ReplayStep,
  type WorkflowLocator,
} from './workflow-candidate.js';

/** Pure structural event projection. No goal text, node access, timing or permission decisions. */
function buildAssistanceEvent(
  ui: ProposalUserInput,
  input: {
    kind: WorkGoalStatus;
    outcome: ReturnType<typeof experienceOutcomeOf>;
    progressedSteps: number;
    locs: WorkflowLocator[];
    resumeFrame: PlannerInput['resumeFrame'];
    declaredAsk: ProposalAsk | null;
    declaredStage: string | null;
  },
): WorkAssistanceEvent {
  const {
    kind,
    outcome,
    progressedSteps,
    locs,
    resumeFrame,
    declaredAsk,
    declaredStage,
  } = input;
  const outcomeStatus = outcome?.status ?? null;
  const resolution: WorkAssistanceEvent['resolution'] =
    kind === 'completed'
      ? 'resolved'
      : progressedSteps > 0
        ? 'partially'
        : 'not_resolved';
  const isCorrection = ui.kind === 'correction' && !!ui.correctionType;
  // 방법(대안 · 경로)은 검증된 label 만 남긴다. 값 확인은 slot 키만.
  const checked =
    ui.providedKind === 'value'
      ? null
      : verifyAlternative(ui.alternative, outcomeStatus, locs);
  const validationResult: WorkAssistanceEvent['validation']['result'] = checked
    ? checked.result
    : outcomeStatus === 'SUCCESS' || outcomeStatus === 'PARTIAL_SUCCESS'
      ? 'verified'
      : outcomeStatus
        ? 'failed'
        : 'not_verified';
  const structured: WorkAssistanceEvent['structured'] =
    ui.providedKind === 'value'
      ? { slots: resumeFrame?.ask?.slots ?? declaredAsk?.slots ?? [] }
      : !isCorrection && checked?.strategy
        ? { strategy: checked.strategy }
        : null;
  const event: WorkAssistanceEvent = {
    kind: isCorrection ? 'correction' : 'assistance',
    stageKey: ui.stage ?? resumeFrame?.stageKey ?? declaredStage ?? null,
    askKind: ui.askKind,
    providedKind: ui.providedKind,
    structured,
    resolution,
    progressedSteps,
    reusability: ui.reusability,
    correction: isCorrection
      ? {
          type: ui.correctionType,
          reason: ui.reason,
          // 틀린 방법은 op 순서만 — Planner 가 적지 않았으면 질문 때 하던 방법(원래 업무 구조).
          wrong: stripLabels(ui.wrong ?? resumeFrame?.strategy ?? null),
          alternative: checked?.strategy ?? null,
        }
      : null,
    validation: {
      result: validationResult,
      evidence: outcome?.evidence ?? null,
    },
  };
  return event;
}

interface WorkTaskSessionInput {
  dataSource: DataSource;
  ledgerCtx: Parameters<typeof issueExperienceRecall>[1];
  state: WorkAgentState;
  siteId: string;
  surface: WorkSurface;
  stepMeta: WeakMap<WorkStepRecord, ExperienceStepMeta>;
  resumedRun: boolean;
  resumeRow: WorkRunCoordinationRow | null;
  intent?: ExecutionIntent;
}

export function createWorkTaskSession(input: WorkTaskSessionInput) {
  const {
    dataSource,
    ledgerCtx,
    state,
    siteId,
    surface,
    stepMeta,
    resumedRun,
    resumeRow,
    intent,
  } = input;
  const goal = state.goal;
  const { deviceId, ownerKey: ledgerOwner } = ledgerCtx;
  const ctx = { userId: ledgerCtx.userId };
  /**
   * P3 — 개인 교정 · 선호 · 회피(assistance)와 그것에서 나온 방법 패턴은 **요청자 개인** 원장에 둔다
   * (WO-O4O-PERSONAL-ASSISTANT-TASK-UNDERSTANDING-AND-COMPLETION-V1). 조직 Task 여도 한 사람의 Correction/Preferred/Avoid 가
   * 조직 전체 실행 규칙이 되지 않는다. run · 경험 · 후보 · 업무 키 목록은 Task 소유 원장 그대로다. 개인 Task 면 두 키가 같다.
   */
  const personalLedgerOwner = ledgerOwner ? nodeLedgerOwnerKey('USER', ctx.userId) : null;
  /** 재개 시 Local 이 돌려준 원래 업무 구조. */
  let resumeFrame: PlannerInput['resumeFrame'] = null;
  /** 재개 답변이 막힌 재생 자리를 채워 결정적으로 이어간 경우의 재생 단계. */
  let resumeReplay: { candidateId: string; steps: ReplayStep[] } | null = null;
  /** 이 대상에서 확인된 업무 키 · 선언된 업무의 검증 패턴. */
  let knownTaskKeys: string[] = [];
  let patterns: RecalledPattern[] = [];
  let patternsRecalledFor: string | null = null;
  /** Planner 가 선언한 최신 구조. */
  let declaredTask: string | null = null;
  let declaredStage: string | null = null;
  let declaredStrategy: Strategy | null = null;
  let declaredAsk: ProposalAsk | null = null;
  /** Planner 가 분류한 사용자 입력(재개 답변 · 요청 안 방법 지시) — 첫 분류를 쓴다. */
  let userInput: ProposalUserInput | null = null;
  /** 재생 전 의미 검증이 멈춘 자리 — 재개 답이 값이면 그 자리만 채워 결정적으로 잇는다. */
  let questionReplay: { candidateId: string; stepIndex: number } | null = null;
  /** Cloud Continuity — 이번 segment 의 구조화 도움 · 교정 이벤트(노드에 보낸 것과 같은 값). 검증 방법 파생의 근거. */
  let lastAssistanceEvent: WorkAssistanceEvent | null = null;
  /** 지금 멈춘 자리의 원래 업무 구조 — 노드 저장과 Cloud 재개 구조(M5)가 같은 값을 쓴다. 방법은 label 없이. */
  const currentRunFrame = (): RunResumeFrame => ({
    taskKey: declaredTask ?? resumeFrame?.taskKey ?? null,
    stageKey: declaredStage ?? resumeFrame?.stageKey ?? null,
    ask:
      declaredAsk ??
      (questionReplay ? { kind: 'value_confirmation', slots: [] } : null),
    strategy: stripLabels(declaredStrategy),
  });
  const saveRunContext = async (): Promise<void> => {
    if (!deviceId || !goal.runId) return;
    try {
      await issueWorkRunContextSave(
        dataSource,
        { userId: ctx.userId, deviceId, ownerKey: ledgerOwner },
        {
          runId: goal.runId,
          targetId: siteId,
          ...currentRunFrame(),
          replay: questionReplay,
        },
      );
    } catch (e) {
      logger.warn('work-agent run context save failed', {
        code: (e as { code?: string })?.code ?? null,
      });
    }
  };

  /** 이번 segment 에서 실제로 성공한 클릭 · 선택 단계의 semantic locator — 대안 방법 검증의 근거(D5). */
  const successfulLocators = (): WorkflowLocator[] =>
    state.history
      .filter(
        (r) =>
          r.status === 'success' &&
          (r.action.kind === 'click' || r.action.kind === 'select_option'),
      )
      .map((r) => stepMeta.get(r)?.locator ?? null)
      .filter((l): l is WorkflowLocator => !!l);

  /**
   * Phase 2 — 사용자 도움 · 교정을 구조로 Local 에 남긴다(write only · best-effort). 답변 원문 · slot 값 · 화면 글은 없다.
   *   재개 segment 는 항상 하나 남긴다(분류가 없으면 값/확인으로 보수 분류). 새 run 은 요청 안 방법 지시를 분류했을 때만.
   *   교정의 대안은 실제 성공한 단계와 맞을 때만 verified — Local 은 verified + reusable 일 때만 Preferred/Avoid 를 만든다.
   */
  const recordAssistance = async (
    kind: WorkGoalStatus,
    plannerTakeover: boolean,
  ): Promise<void> => {
    if (!deviceId || !goal.runId) return;
    let ui = userInput;
    if (!ui && resumedRun) {
      const plain = isPlainValueAnswer(goal.request);
      ui = {
        kind: 'assistance',
        askKind: resumeFrame?.ask?.kind ?? 'value_confirmation',
        providedKind: plain ? 'value' : 'confirmation',
        correctionType: null,
        stage: null,
        reason: null,
        wrong: null,
        alternative: null,
        reusability: plain ? 'per_run_value' : 'not_reusable',
      };
    }
    if (!ui) return;
    try {
      const end = kind as Exclude<WorkGoalStatus, 'active'>;
      const outcome = experienceOutcomeOf({
        endState: end,
        reason: state.takeover?.reason ?? null,
        plannerProposed: plannerTakeover,
      });
      const progressedSteps = Math.min(
        1000,
        state.history.filter(
          (r) => r.status === 'success' && r.action.kind !== 'inspect',
        ).length,
      );
      const event = buildAssistanceEvent(ui, {
        kind,
        outcome,
        progressedSteps,
        locs: successfulLocators(),
        resumeFrame,
        declaredAsk,
        declaredStage,
      });
      if (event.kind === 'correction')
        state.userCorrectionCount = (state.userCorrectionCount ?? 0) + 1;
      lastAssistanceEvent = event;
      const r = await issueWorkRunAssistanceRecord(
        dataSource,
        { userId: ctx.userId, deviceId, ownerKey: personalLedgerOwner },
        {
          runId: goal.runId,
          targetId: siteId,
          taskKey: declaredTask ?? resumeFrame?.taskKey ?? null,
          event,
        },
      );
      logger.info('work-agent assistance', {
        kind: event.kind,
        askKind: event.askKind,
        providedKind: event.providedKind,
        correctionType: event.correction?.type ?? null,
        validation: event.validation.result,
        reusability: event.reusability,
        status: r.status,
        patternCount: r.safe?.patternCount ?? null,
      });
    } catch (e) {
      logger.warn('work-agent assistance record failed', {
        code: (e as { code?: string })?.code ?? null,
      });
    }
  };

  /** 업무 키 목록(taskKey 없음) 또는 그 업무의 검증 패턴. 실패해도 계속한다. */
  /** Cloud Continuity — Assistant Memory 가 넘긴 같은 소유 주체의 검증 방법 중 이 업무 키의 것. */
  const cloudPatternsFor = (taskKey: string): RecalledPattern[] =>
    (intent?.memory?.patterns ?? [])
      .filter((p) => p.taskKey === taskKey)
      .map((p) => ({
        stageKey: p.stageKey,
        polarity: p.polarity,
        strategy: p.strategy,
        verifiedCount: p.verifiedCount,
      }));
  const recallExperience = async (taskKey: string | null): Promise<void> => {
    let nodePatterns: RecalledPattern[] = [];
    // Phase D — 소유 주체 원장 노드면 ledgerCtx.ownerKey 로 이 소유 주체의 기억만 돌아온다.
    try {
      // 업무 키 목록은 Task 소유 원장, 그 업무의 방법 패턴(개인 교정에서 나온다)은 요청자 개인 원장(P3).
      const recallCtx = taskKey === null ? ledgerCtx : { ...ledgerCtx, ownerKey: personalLedgerOwner };
      const r = await issueExperienceRecall(dataSource, recallCtx, {
        targetId: siteId,
        taskKey,
      });
      if (r.status === 'success') {
        const safe = pickSafeExperienceRecall(r.safe);
        if (taskKey === null) knownTaskKeys = safe.taskKeys ?? [];
        else nodePatterns = safe.patterns ?? [];
      }
    } catch (e) {
      logger.warn('work-agent experience recall failed', {
        code: (e as { code?: string })?.code ?? null,
      });
    }
    // 소유 주체 Cloud 기억 + 노드 원장(그 노드). Cloud 가 앞선다(Phase D) — 노드가 비어도, 노드에 오래된 기억이 있어도
    // 모든 노드의 검증으로 갱신되는 Cloud 쪽을 따른다. 현재 화면으로 다시 검증하며 쓴다(P3).
    if (taskKey !== null) {
      const cloud = cloudPatternsFor(taskKey);
      patterns = mergeRecalledPatterns(nodePatterns, cloud);
      patternsRecalledFor = taskKey;
      if (cloud.length)
        logger.info('work-agent patterns', {
          node: nodePatterns.length,
          cloud: cloud.length,
          merged: patterns.length,
        });
    }
  };
  /** 방법 label 에 들어가면 안 되는 이번 run 의 값 — 재개 답 + 지금까지 입력한 글. */
  const forbiddenValues = (): string[] => {
    const out: string[] = resumedRun ? [goal.request] : [];
    for (const r of state.history)
      if (r.action.kind === 'set_input' && typeof r.action.text === 'string')
        out.push(r.action.text);
    return out.slice(-20);
  };

  const acceptDeclarations = (proposal: WorkProposal): boolean => {
    if (proposal.task) declaredTask = proposal.task;
    if (proposal.stage) declaredStage = proposal.stage;
    if (proposal.strategy) declaredStrategy = proposal.strategy;
    if (proposal.ask) declaredAsk = proposal.ask;
    if (proposal.userInput && !userInput) {
      userInput = proposal.userInput;
      return userInput.kind === 'correction';
    }
    return false;
  };
  const avoidedStage = (
    proposal: WorkProposal,
  ): { stage: string | null } | null => {
    if (
      !proposal.strategy ||
      proposal.action.kind === 'done' ||
      proposal.action.kind === 'takeover'
    )
      return null;
    const stage = proposal.stage ?? declaredStage;
    const hit = patterns.some(
      (p) =>
        p.polarity === 'avoid' &&
        (!stage || p.stageKey === stage) &&
        strategyContains(proposal.strategy as Strategy, p.strategy),
    );
    return hit ? { stage } : null;
  };
  const taskKey = (): string | null =>
    declaredTask ?? resumeFrame?.taskKey ?? null;
  const memoryReport = (
    kind: WorkGoalStatus,
    targetKind: 'browser_site' | 'windows_app',
  ): ExecutionReport['memory'] => ({
    targetId: siteId,
    targetKind,
    taskKey: taskKey(),
    verifiedPatterns: deriveVerifiedPatterns(taskKey(), lastAssistanceEvent),
    failedAlternative: failedAlternativeOf(taskKey(), lastAssistanceEvent),
    resumeFrame:
      kind === 'waiting_for_user' && goal.runId ? currentRunFrame() : null,
  });
  return {
    initialize: async (): Promise<void> => {
      // Phase D — 노드 원장의 재개 구조는 그 노드가 이 run 의 **마지막 질문**을 받은 노드일 때만 최신이다.
      //   A 에서 질문 → B 에서 이어 더 진행 · 다시 질문 → A 로 돌아오면, A 의 원장에는 첫 질문 시점의 구조가 남아 있다.
      //   마지막으로 질문한 노드(resumeRow.deviceId)가 지금 노드가 아니면 노드 구조 · 재생 단계를 쓰지 않고 Cloud 구조를 쓴다.
      const lastAskedOnThisNode =
        !resumeRow?.deviceId || resumeRow.deviceId === deviceId;
      if (resumedRun && !lastAskedOnThisNode)
        logger.info('work-agent resume frame', { source: 'skip_stale_node' });
      if (resumedRun && lastAskedOnThisNode) {
        try {
          // 답이 "값 하나" 면 막혔던 재생 자리만 채워 달라고 한다(Local 은 그 값을 저장하지 않는다).
          const answer = normalizeWorkflowText(goal.request);
          const slotValue =
            isPlainValueAnswer(answer) &&
            answer.length <= 200 &&
            !/[<>{}]/.test(answer)
              ? answer
              : null;
          const r = await issueWorkRunContextRecall(dataSource, ledgerCtx, {
            runId: goal.runId,
            targetId: siteId,
            slotValue,
          });
          const c = r.status === 'success' ? pickRecalledContext(r.safe) : null;
          if (c?.found) {
            resumeFrame = {
              taskKey: c.taskKey,
              stageKey: c.stageKey,
              ask: c.ask,
              strategy: c.strategy,
            };
            const steps = c.candidateId ? validateReplaySteps(c.steps) : null;
            if (c.candidateId && steps && surface === 'dom')
              resumeReplay = { candidateId: c.candidateId, steps };
          }
        } catch (e) {
          logger.warn('work-agent context recall failed', {
            code: (e as { code?: string })?.code ?? null,
          });
        }
      }
      if (resumedRun) {
        // Cloud Continuity — 이 노드 원장의 구조를 쓰지 않았으면(다른 노드에서 질문했던 run · 오래된 노드 구조) Assistant Memory 의
        // 재개 구조를 쓴다. 재생 단계(Workflow Candidate)는 노드 원장에만 있다 — 그때는 결정적 재생 없이 현재 화면으로 이어간다.
        const cloudFrame = intent?.memory?.resumeFrame ?? null;
        if (!resumeFrame && cloudFrame) {
          resumeFrame = {
            taskKey: cloudFrame.taskKey,
            stageKey: cloudFrame.stageKey,
            ask: cloudFrame.ask,
            strategy: cloudFrame.strategy,
          };
          logger.info('work-agent resume frame', {
            source: 'assistant_memory',
          });
        }
      }
      await recallExperience(null);
      // Phase B — 같은 Task 를 이어가면 Assistant 가 이전 run 의 업무 키를 준다. 경험 조회 키를 맞출 뿐 절차를 정하지 않는다.
      const hintKey = intent?.taskTypeHint ?? null;
      // Phase C — Assistant Memory(Cloud)가 아는 같은 소유 주체 · 같은 대상의 업무 유형. 이 노드의 Local 원장이 비어 있어도(새 PC)
      // 같은 업무를 같은 키로 이어간다. 노드가 아는 키가 앞, Cloud 기억은 뒤에 붙인다(중복 제거). 절차를 정하지 않는다.
      for (const k of intent?.knownTaskTypes ?? [])
        if (!knownTaskKeys.includes(k)) knownTaskKeys = [...knownTaskKeys, k];
      if (hintKey && !knownTaskKeys.includes(hintKey))
        knownTaskKeys = [hintKey, ...knownTaskKeys];
      if (resumeFrame?.taskKey) await recallExperience(resumeFrame.taskKey);
    },
    acceptDeclarations,
    needsPatternRecall: (): boolean =>
      !!declaredTask && patternsRecalledFor !== declaredTask,
    recallDeclaredPatterns: async (): Promise<void> => {
      if (declaredTask) await recallExperience(declaredTask);
    },
    hasPatterns: (): boolean => patterns.length > 0,
    hasPreferredPattern: (): boolean =>
      patterns.some((p) => p.polarity === 'preferred'),
    hasCorrection: (): boolean => userInput?.kind === 'correction',
    avoidedStage,
    clearAsk: (): void => {
      declaredAsk = null;
    },
    /** Assistant 판정이 사용자 확인을 묻기로 했을 때 — 재개 구조(M5)에 그 질문 종류를 남긴다. */
    setAsk: (ask: ProposalAsk): void => {
      declaredAsk = ask;
    },
    plannerFields: (): Pick<
      PlannerInput,
      'userAnswer' | 'resumeFrame' | 'knownTaskKeys' | 'patterns'
    > => ({
      ...(resumedRun ? { userAnswer: goal.request, resumeFrame } : {}),
      ...(knownTaskKeys.length ? { knownTaskKeys } : {}),
      ...(patterns.length ? { patterns } : {}),
    }),
    forbiddenValues,
    resumeReplay: () => resumeReplay,
    rememberReplayQuestion: (value: {
      candidateId: string;
      stepIndex: number;
    }): void => {
      questionReplay = value;
    },
    taskKey,
    saveRunContext,
    recordAssistance,
    memoryReport,
  };
}
export type WorkTaskSession = ReturnType<typeof createWorkTaskSession>;
