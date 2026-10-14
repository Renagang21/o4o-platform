/** Internal execution-phase contracts. They do not grant tool permission or define Task completion. */
import type {
  SafeDomElement,
  DomUnitStep,
} from '../local-agent/browser-dom-contract.js';
import type {
  WorkAgentRunResult,
  WorkflowRunSummary,
} from './work-agent-runtime.js';
import type {
  WorkAction,
  WorkAgentState,
  WorkProgress,
  WorkStepRecord,
  WorkSurface,
  TakeoverReason,
  ProposalRejectReason,
} from './work-agent-contract.js';
import type { ExperienceActor, ExperienceStepMeta } from './work-experience.js';
import type { CompletionEvidenceSession } from './work-completion-evidence.js';
export type UnitReport = {
  index: number;
  status: string;
  errorCode?: string;
  navigated?: boolean;
  changed?: boolean;
  riskLevel?: string;
  target?: SafeDomElement;
};
export type UnitStop = {
  cause: string;
  stepIndex?: number;
  errorCode?: string;
} | null;
export type UnitObservation = {
  path?: string;
  docId?: string;
  snapshotId?: string;
  elementCount?: number;
  elements?: SafeDomElement[];
};
export type UnitRun =
  | {
      kind: 'ran';
      reports: UnitReport[];
      stop: UnitStop;
      observation: UnitObservation | null;
      observeErrorCode: string | null;
    }
  | { kind: 'denied' }
  | { kind: 'lost'; errorCode?: string };
export type ActDirective =
  | { do: 'takeover'; reason: TakeoverReason; progress: WorkProgress }
  | { do: 'observe'; navigated: boolean }
  | { do: 'continue' }
  | { do: 'reject'; reason: ProposalRejectReason };
export type ReplayDivergence = {
  cause:
    | 'budget'
    | 'find_failed'
    | 'locator_not_found'
    | 'validation_rejected'
    | 'step_failed'
    | 'expect_mismatch';
  code: string | null;
  stepSeq: number | null;
};
export interface WorkExecutionContext {
  state: WorkAgentState;
  surface: WorkSurface;
  readonly lastActRecord: WorkStepRecord | null;
  budgetLeft(): number;
  overTime(): boolean;
  observe(): Promise<{ ok: boolean; errorCode?: string }>;
  reobserve(navigated: boolean): Promise<{ ok: boolean; errorCode?: string }>;
  observeFailed(result: { errorCode?: string }): Promise<WorkAgentRunResult>;
  takeover(
    reason: TakeoverReason,
    progress: WorkProgress,
  ): Promise<WorkAgentRunResult>;
  takeoverWith(
    code: string | undefined,
    reason: TakeoverReason,
    progress: WorkProgress,
  ): Promise<WorkAgentRunResult>;
  dom(
    action: string,
    args?: Record<string, unknown>,
  ): Promise<{
    status: string;
    errorCode?: string;
    safe: Record<string, unknown>;
  }>;
  unitCapable(): boolean;
  runUnit(
    steps: DomUnitStep[],
    options: { observe: boolean; afterNavigation?: boolean; reserve?: number },
  ): Promise<UnitRun>;
  execActOnce(
    action: WorkAction,
    snapshotId: string,
    pre?: { status: string; errorCode?: string; safe: Record<string, unknown> },
  ): Promise<ActDirective>;
  applyDomObservation(observation: UnitObservation, countSame?: boolean): void;
  unitObserveError(code: string | null): string;
}
export interface WorkDispatchContext extends WorkExecutionContext {
  lastRead: string | null;
  lastRejectReason: ProposalRejectReason | undefined;
  stepMeta: WeakMap<WorkStepRecord, ExperienceStepMeta>;
  currentActor(): ExperienceActor;
  /**
   * Task Understanding — 완료 근거 대조용 "이번 run 에서 실제 본 화면 글"(메모리 전용). 없으면 기록하지 않는다.
   * 요소는 입력 · 선택 칸의 값을 뺀 글만 남긴다(CompletionEvidenceSession).
   */
  completionEvidence?: Pick<CompletionEvidenceSession, 'noteSeen' | 'noteElements'>;
}
export interface WorkReplayContext extends WorkExecutionContext {
  workflow: WorkflowRunSummary;
  replaying: boolean;
  replayDiverge: ReplayDivergence | null;
}
