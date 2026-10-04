/**
 * O4O Personal Assistant — Assistant Planning (Phase B)
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-B-PLANNING-SEPARATION-V1
 * 정본: `docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md` §2-1 (Assistant Planning ≠ Execution Planning) · §0-1 (P3) · §4-3
 *
 *   Assistant Planning (이 모듈)          Execution Planning (work-agent runtime 의 planner)
 *   ─────────────────────────────         ───────────────────────────────────────────
 *   무슨 Task 인가 · 이어가는가            지금 화면에서 다음 행동은 무엇인가
 *   어떤 근거로 방법을 고르는가            이 단계가 성공했는가
 *   어떤 역할로 시작하는가                 (근거가 어긋나면 Discovery 로 내려간다)
 *   끝났는가(완료 계약 판정)               실행 결과를 주장 + 근거로 보고한다
 *
 * 이 모듈은 Workflow 선택기가 아니다. `Task type → 고정 절차` 표가 없고, ExecutionIntent 에도 절차를 지정하는 칸이 없다.
 * 근거(자기 Experience · Knowledge · Shared Candidate · Discovery)는 모두 비구속이며, 결정적(Experienced) 실행을 허락할 수
 * 있는 근거는 그 사용자 · 매장 자신의 검증된 Experience 뿐이다(V2 §0-1 — 다른 사용자의 성공 경로를 강제하지 않는다).
 *
 * Task 의 소유 범위(USER / ORGANIZATION)는 업무 · 기억의 경계일 뿐 여기서 절차를 고르는 기준으로 쓰지 않는다(§0-1-6).
 *
 * 판단은 결정론이다(AI 호출 0) — 지금 Assistant 가 실행 전에 확실히 아는 것(이어받기 여부 · 이전 Task type · 사용자 힌트)만 쓴다.
 * 자기 Experience 의 실제 내용은 아직 실행 노드에 있으므로(V2 §9-4 · Gate 전) Execution 이 현재 화면과 함께 읽는다.
 * 요청 원문은 받지 않는다.
 */

import type {
  CompletionContract,
  ExecutionIntent,
  ExecutionReport,
  PlanningEvidence,
} from '../ai-tools/work-agent-contract.js';
import type { AssistantTaskStatus } from './assistant-task-store.js';

/** Assistant 가 실행 전에 아는 것 — 구조만(원문 · 값 없음). */
export interface AssistantPlanningInput {
  taskId: string | null;
  /** 같은 run 을 이어가는 재개 요청(runId 있음). */
  resuming: boolean;
  /** 이어받은 Task 에 이전 run 이 남긴 provisional Task type. */
  priorTaskTypeKey: string | null;
  /** 사용자가 방법 · 복구 힌트를 함께 줬다(교정 맥락). */
  userMethodHint: boolean;
  /** 이 요청이 실행 노드(Local Agent)를 쓸 수 있는가 — 노드에 있는 자기 Experience 를 Execution 이 읽을 수 있는가. */
  nodeExperienceReachable: boolean;
}

export interface AssistantPlan {
  intent: ExecutionIntent;
  /** 로그 · 테스트용 판단 이유(enum). */
  reason: 'resume_same_run' | 'continue_task' | 'user_method_hint' | 'new_task';
}

const COMPLETION: CompletionContract = Object.freeze({ requires: 'result_observed', acceptsUserCompletion: true }) as CompletionContract;

/**
 * 판단 근거의 자리(V2 §0-1-1 · §0-1-2). 순서는 가까운 근거부터이며 모두 비구속(binding:false)이다.
 *   own_experience   — 이 사용자 · 매장의 검증된 Experience. 결정적 실행을 허락할 수 있는 유일한 근거.
 *   knowledge        — Manual · 문서(미검증 주장). 아직 배선되지 않았다.
 *   shared_candidate — 다른 사용자에서 반복 검증된 방법. 추천 후보일 뿐 결정적 실행을 허락하지 않는다. 아직 배선되지 않았다.
 *   discovery        — 근거가 없거나 어긋나면 현재 화면에서 직접 찾는다.
 */
export function planningEvidence(nodeExperienceReachable: boolean): PlanningEvidence[] {
  return [
    { source: 'own_experience', available: nodeExperienceReachable, binding: false, mayAuthorizeExperienced: true },
    { source: 'knowledge', available: false, binding: false, mayAuthorizeExperienced: false },
    { source: 'shared_candidate', available: false, binding: false, mayAuthorizeExperienced: false },
    { source: 'discovery', available: true, binding: false, mayAuthorizeExperienced: false },
  ];
}

export function planAssistantTask(input: AssistantPlanningInput): AssistantPlan {
  const reason: AssistantPlan['reason'] = input.resuming
    ? 'resume_same_run'
    : input.userMethodHint
      ? 'user_method_hint'
      : input.priorTaskTypeKey
        ? 'continue_task'
        : 'new_task';
  return {
    reason,
    intent: {
      version: 1,
      taskId: input.taskId,
      // 재개는 원래 업무 구조로 이어간다. 그 밖에는 Discovery 로 시작하고, Execution 이 자기 검증 Experience 를 찾으면
      // 그때만 Experienced 로 올린다(근거가 실행 노드에 있기 때문 — 결정은 근거 규칙으로 고정돼 있다).
      startMode: input.resuming ? 'resume' : 'discovery',
      taskTypeHint: input.priorTaskTypeKey,
      evidence: planningEvidence(input.nodeExperienceReachable),
      completion: COMPLETION,
      approval: { commit: 'user_only', credential: 'user_only' },
    },
  };
}

/**
 * Task 상태 판정 — Execution 의 주장이 아니라 완료 계약과 실행 근거로 정한다(V2 §4-3).
 *   execution_complete + 결과 근거 있음 → completed
 *   execution_complete + 결과 근거 없음 → handed_over (화면은 사용자에게 넘어갔지만 업무 완료는 확인되지 않았다)
 *   needs_user → waiting_for_user · handed_over → handed_over · stopped → stopped
 *   not_started(run 이 열리지 않음) → blocked (사용자 조치 뒤 같은 Task 로 다시 할 수 있다)
 */
export function judgeTaskStatus(contract: CompletionContract, report: ExecutionReport): AssistantTaskStatus {
  switch (report.claim) {
    case 'execution_complete': {
      const evidenced = contract.requires === 'result_observed' && (report.resultObserved || report.replayVerified);
      return evidenced ? 'completed' : 'handed_over';
    }
    case 'needs_user':
      return 'waiting_for_user';
    case 'handed_over':
      return 'handed_over';
    case 'not_started':
      return 'blocked';
    default:
      return 'stopped';
  }
}
