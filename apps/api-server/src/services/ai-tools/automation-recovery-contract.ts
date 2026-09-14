/**
 * Automation Failure Escalation & User-Guided Recovery V0 — 실패 분류 · 에스컬레이션 판단 · 복구 결과 계약 (순수)
 *
 * WO-O4O-AUTOMATION-FAILURE-ESCALATION-AND-USER-GUIDED-RECOVERY-V0 §4·§7·§8·§11·§12·§16·§27·§37·§46·§60·§64·§67
 * 상위 원칙: docs/baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md — "실패는 종료가 아니라 다음 판단을 위한 정보다."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것 — 브라우저·Windows 자동화 공통의 **실패→복구 계층**의 형상과 규칙 (§4·§10)
 *
 *   실행(관찰·계획·행동)은 work-agent-runtime.ts 가 한다. 이 파일은 그 위에 얹는 판단만 정한다:
 *
 *   ① 분류    실패를 taxonomy 로 나눈다(§7). 코드가 아니라 "왜 못 했는가" 로.
 *   ② 판단    같은 행동을 무작정 반복하지 않고, 더 강한 추론(strong model)으로 올릴지,
 *             사용자에게 넘길지, 그냥 다시 시도할지 결정한다(§11·§16·§46).
 *   ③ 복구결과 무엇으로 복구됐는지(또는 안 됐는지) 기록한다(§27).
 *   ④ 개선후보 복구가 필요했던 국면을 workflow 개선 후보로 신호한다(§22) — 자동 승격은 안 한다(§5).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 복구는 안전을 낮추지 않는다 (§8·§37·§64)
 *
 *   credential · commit · payment · security · risk 국면은 **에스컬레이션 대상이 아니다** — 사용자에게 넘긴다.
 *   strong model 로 올려도 권한·위험 등급·capability·tool 어휘는 그대로다. 복구 planner 는 shell·credential·
 *   commit 에 닿지 않는다. 사용자가 직접 준 힌트(source=user)는 신뢰 입력이지만 그 역시 권한·위험을 바꾸지 못한다(§65).
 */

// ─── ① 실패 taxonomy (§7) ─────────────────────────────────────────────────────

/**
 * 실패 종류. "어느 오류 코드인가" 가 아니라 "무엇이 막혔는가" 로 나눈다 — 같은 판단을 받을 실패끼리 묶는다.
 * 코드→class 매핑은 `classifyFailure`. 새 오류 코드가 생겨도 이 목록은 안정적이어야 한다.
 */
export const AUTOMATION_FAILURE_CLASSES = Object.freeze([
  /** 어디서/무엇으로 할 일인지 자체를 못 정했다(등재 대상 미해석). */
  'DISCOVERY_FAILURE',
  /** 대상(탭·창)을 못 찾거나 준비/활성화하지 못했다. */
  'TARGET_FAILURE',
  /** 화면을 관찰하지 못했다(content script 무응답 · UIA 미노출 · stale). */
  'OBSERVATION_FAILURE',
  /** planner 가 다음 행동을 내지 못했다(호출 실패 · 무효 제안 반복). */
  'PLANNING_FAILURE',
  /** 행동은 발행됐으나 대상 요소가 없거나 그 동작을 지원하지 않았다. */
  'ACTION_FAILURE',
  /** 행동은 되는데 목적에 다가가지 못한다(같은 관찰/행동 반복). */
  'NO_PROGRESS',
  /** 결과가 여럿이거나 대상 동일성이 흔들려 사람 판단이 필요하다. */
  'AMBIGUOUS_STATE',
  /** O4O 가 구조적으로 다룰 수 없는 UI(등재 밖 이동 · 미노출 목록 · 키 의미 미상). */
  'UNSUPPORTED_UI',
  /** 사용자가 지금 그 화면을 쓰고 있다(키/마우스 활동 · 일시정지). */
  'USER_INTERFERENCE',
  /** 로그인·인증·결제·주문확정·삭제·게시·권한 — 사람이 직접 하는 국면(에스컬레이션 금지 §8). */
  'RISK_BLOCKED',
  /** 대상 밖에서 화면이 바뀌었다(다른 창이 앞으로 · 제출 전 창 변경). */
  'EXTERNAL_CHANGE',
] as const);
export type AutomationFailureClass = (typeof AUTOMATION_FAILURE_CLASSES)[number];

export function isAutomationFailureClass(v: unknown): v is AutomationFailureClass {
  return typeof v === 'string' && (AUTOMATION_FAILURE_CLASSES as readonly string[]).includes(v);
}

/**
 * 에스컬레이션(더 강한 추론·재시도) 대상이 아닌 실패 종류(§8·§37). 이 종류는 **바로 사용자에게** 넘긴다 —
 * 더 센 모델을 붙여도 뚫으면 안 되는(credential/commit) 국면이거나, 자동으로 뚫을 수 없는(사용자 사용중·미지원 UI) 국면이다.
 */
export const NON_ESCALATABLE_CLASSES: readonly AutomationFailureClass[] = Object.freeze([
  'RISK_BLOCKED',
  'USER_INTERFERENCE',
  'UNSUPPORTED_UI',
  'AMBIGUOUS_STATE',
]);

export function isEscalatable(cls: AutomationFailureClass): boolean {
  return !NON_ESCALATABLE_CLASSES.includes(cls);
}

/**
 * 실패 코드/신호 → taxonomy(§7). 순수 함수. errorCode 는 LOCAL_AGENT_ERROR · WORK_AGENT_ERROR · WORK_TARGET_ERROR
 * 등 어느 표면 것이어도 된다(문자열로 받는다 — 이 파일이 그 모듈들을 import 하지 않는다). 부가 신호로 세분한다.
 */
export interface ClassifyInput {
  errorCode?: string | null;
  /** COMMIT 성격 요소에서의 거절인가(never-escalate). */
  riskCommit?: boolean;
  /** 무진전(같은 관찰/행동 반복)으로 부른 분류인가. */
  noProgress?: boolean;
  /** planner 예외/무효 제안인가. */
  plannerFault?: boolean;
}

export function classifyFailure(input: ClassifyInput): AutomationFailureClass {
  const code = String(input.errorCode ?? '');
  if (input.plannerFault) return 'PLANNING_FAILURE';
  if (input.noProgress) return 'NO_PROGRESS';

  // RISK_BLOCKED 를 가장 먼저 — 어떤 부가 신호보다 우선한다(§8).
  if (/USER_ACTION_REQUIRED|TEXT_DENIED|UIA_TEXT_DENIED|PERMISSION_REQUIRED/.test(code)) return 'RISK_BLOCKED';
  if (/ACTION_NOT_ALLOWED/.test(code)) return 'RISK_BLOCKED'; // COMMIT/게시/삭제 성격
  if (input.riskCommit) return 'RISK_BLOCKED';

  if (/WINDOWS_AUTOMATION_USER_ACTIVE|WINDOWS_AUTOMATION_PAUSED/.test(code)) return 'USER_INTERFERENCE';
  if (/CROSS_ORIGIN_BLOCKED|HIDDEN_CONTROL|KEY_UNKNOWN|VISION_UNCERTAIN|LAUNCH_NOT_ALLOWED|ACTION_NOT_SUPPORTED/.test(code)) return 'UNSUPPORTED_UI';
  if (/MULTIPLE_MATCHES|UIA_AMBIGUOUS|TARGET_UNCERTAIN/.test(code)) return 'AMBIGUOUS_STATE';
  if (/TARGET_CHANGED|SUBMIT_UNVERIFIED/.test(code)) return 'EXTERNAL_CHANGE';

  if (/UNRESOLVED|NOT_REGISTERED/.test(code)) return 'DISCOVERY_FAILURE';
  if (/TAB_NOT_FOUND|TARGET_NOT_FOUND|ACTIVATION_FAILED|LAUNCH_FAILED|TARGET_TIMEOUT|NOT_READY|SITE_NOT_READY|NOT_FOREGROUND|SITE_NOT_ALLOWED|EXTENSION_NOT_CONNECTED/.test(code)) return 'TARGET_FAILURE';
  if (/CONTENT_UNAVAILABLE|UIA_UNAVAILABLE|ELEMENT_STALE/.test(code)) return 'OBSERVATION_FAILURE';
  if (/PLANNER_FAILED/.test(code)) return 'PLANNING_FAILURE';
  if (/ELEMENT_NOT_FOUND|NO_PROGRESS/.test(code)) return code.includes('NO_PROGRESS') ? 'NO_PROGRESS' : 'ACTION_FAILURE';

  // 알 수 없는 실패는 재시도 여지가 있는 ACTION_FAILURE 로 본다(사용자 인계 전에 한 번 더 판단할 기회).
  return 'ACTION_FAILURE';
}

// ─── ② 에스컬레이션 tier · 판단 (§11·§12·§16·§46) ──────────────────────────────

/**
 * 복구 tier. **vendor·model 이름을 담지 않는다**(§12) — `strong_model` 은 "더 강한 추론 경로" 라는 개념이고,
 * 실제 어느 모델인지는 provider-runtime 이 정한다(같은 provider 의 더 강한 whitelisted 모델, 새 stack 없음).
 */
export const RECOVERY_TIERS = Object.freeze(['normal_retry', 'strong_model', 'user_assistance'] as const);
export type RecoveryTier = (typeof RECOVERY_TIERS)[number];

/**
 * tier 별 시도 상한(§16: 일반 시도 → strong 1~2회 → 사용자). loop 전체 예산(maxSteps·maxAiPlans)이 상위 상한이고,
 * 이 값은 "사용자에게 넘기기 전에 몇 번 더/얼마나 세게 시도하는가" 만 정한다.
 */
export const RECOVERY_LIMITS = Object.freeze({
  /** strong model 로 올리기 전, 일반 planner 로 재시도하는 최대 횟수. */
  normalRetryMax: 2,
  /** 사용자에게 넘기기 전, strong model 로 재시도하는 최대 횟수. */
  strongModelMax: 2,
});

export interface RecoveryState {
  /** 직전(진행 중) 실패 국면의 분류. 성공하면 null 로 되돌아간다. */
  activeClass: AutomationFailureClass | null;
  /** 마지막으로 분류된 실패 종류(성공해도 남는다 — 로그·표시용 §60). */
  lastClass: AutomationFailureClass | null;
  /** 이번 실패 국면에서 일반 planner 로 재시도한 횟수. */
  normalRetries: number;
  /** 이번 실패 국면에서 strong model 로 재시도한 횟수. */
  strongRetries: number;
  /** 현재 적용 중인 tier. */
  tier: RecoveryTier;
  /** 한 번이라도 strong model 로 올라간 적이 있는가(개선 후보 신호 §22). */
  escalatedToStrong: boolean;
  /** 최종 복구 결과(§27). 진행 중이면 null. */
  result: RecoveryResult | null;
}

export function createRecoveryState(): RecoveryState {
  return { activeClass: null, lastClass: null, normalRetries: 0, strongRetries: 0, tier: 'normal_retry', escalatedToStrong: false, result: null };
}

export interface RecoveryDecision {
  tier: RecoveryTier;
  /** 사용자에게 넘겨야 하는가(§16 소진 · §8 non-escalatable). */
  askUser: boolean;
  /** strong model 로 계획을 세워야 하는가(이번 tier 가 strong_model). */
  useStrongModel: boolean;
  failureClass: AutomationFailureClass;
}

/**
 * 실패를 하나 기록하고 다음 tier 를 정한다(§46 정책):
 *   - 에스컬레이션 대상 아님 → 바로 사용자.
 *   - 일반 재시도 예산 남음 → normal_retry.
 *   - 일반 소진 · strong 예산 남음 → strong_model.
 *   - 둘 다 소진 → 사용자.
 * 실패 국면이 바뀌면(다른 class) 카운터를 새로 센다 — "다른 이유로 막힌" 것은 새 국면이다.
 * 순수 함수: state 를 직접 바꾸고 결정도 돌려준다(runtime 에서 한 번만 호출).
 */
export function decideRecovery(state: RecoveryState, failureClass: AutomationFailureClass): RecoveryDecision {
  state.lastClass = failureClass;
  if (state.activeClass !== failureClass) {
    state.activeClass = failureClass;
    state.normalRetries = 0;
    state.strongRetries = 0;
    state.tier = 'normal_retry';
  }

  if (!isEscalatable(failureClass)) {
    state.tier = 'user_assistance';
    return { tier: 'user_assistance', askUser: true, useStrongModel: false, failureClass };
  }

  if (state.normalRetries < RECOVERY_LIMITS.normalRetryMax) {
    state.normalRetries += 1;
    state.tier = 'normal_retry';
    return { tier: 'normal_retry', askUser: false, useStrongModel: false, failureClass };
  }

  if (state.strongRetries < RECOVERY_LIMITS.strongModelMax) {
    state.strongRetries += 1;
    state.tier = 'strong_model';
    state.escalatedToStrong = true;
    return { tier: 'strong_model', askUser: false, useStrongModel: true, failureClass };
  }

  state.tier = 'user_assistance';
  return { tier: 'user_assistance', askUser: true, useStrongModel: false, failureClass };
}

// ─── ③ 복구 결과 (§27) ────────────────────────────────────────────────────────

export const RECOVERY_RESULTS = Object.freeze([
  'recovered_by_normal_retry',
  'recovered_by_strong_model',
  'recovered_by_user_hint',
  'recovered_by_user_action',
  'not_recovered',
] as const);
export type RecoveryResult = (typeof RECOVERY_RESULTS)[number];

/**
 * 실패 국면 뒤 행동이 성공했다 → 무엇으로 복구됐는지 기록한다. 사용자가 준 힌트가 이번 run 에 실려 있으면
 * 그 성공은 사용자 힌트 덕으로 본다(§27). state 를 정리(국면 종료)한다.
 */
export function noteRecovered(state: RecoveryState, opts: { userHintPresent?: boolean } = {}): RecoveryResult {
  const result: RecoveryResult = opts.userHintPresent
    ? 'recovered_by_user_hint'
    : state.escalatedToStrong || state.tier === 'strong_model'
      ? 'recovered_by_strong_model'
      : 'recovered_by_normal_retry';
  state.result = result;
  state.activeClass = null;
  state.normalRetries = 0;
  state.strongRetries = 0;
  state.tier = 'normal_retry';
  return result;
}

/** 사용자에게 넘기며 복구 실패로 마감한다(§27 not_recovered). */
export function noteNotRecovered(state: RecoveryState): RecoveryResult {
  state.result = 'not_recovered';
  return 'not_recovered';
}

/**
 * workflow 개선 후보 신호인가(§22). 복구가 필요했던(그리고 strong 까지 올라갔거나 사용자 도움이 필요했던) 국면은
 * "이 목적/사이트에서 자동화가 매끄럽지 않았다" 는 후보다. **자동 승격이 아니다** — 신호(boolean)만 남긴다(§5).
 */
export function isImprovementCandidate(state: RecoveryState): boolean {
  return state.escalatedToStrong || state.result === 'not_recovered' || state.result === 'recovered_by_user_hint' || state.result === 'recovered_by_user_action';
}

// ─── ④ 사용자 설명 (§17·§20 — 내부 용어 노출 금지) ──────────────────────────────

/**
 * 복구가 소진돼 사용자에게 넘길 때의 **구체적 설명 한 줄**. 실패 종류를 사용자 말로 풀어 "무엇이 막혔고 무엇을 하면
 * 되는지" 를 알린다. planner escalation · RuntimeId · UIA stale 같은 내부 용어는 쓰지 않는다.
 */
const RECOVERY_EXPLANATION: Record<AutomationFailureClass, string> = {
  DISCOVERY_FAILURE: '어느 사이트·프로그램에서 할 일인지 확정하지 못했습니다. 대상을 알려 주시면 이어서 진행합니다.',
  TARGET_FAILURE: '작업할 화면(탭·창)을 준비하지 못했습니다. 해당 화면을 열어 앞에 두신 뒤 다시 요청해 주세요.',
  OBSERVATION_FAILURE: '화면을 안정적으로 읽지 못했습니다. 화면을 새로 고치거나 잠시 뒤 다시 요청해 주세요.',
  PLANNING_FAILURE: '다음에 무엇을 할지 판단하지 못했습니다. 원하시는 바를 조금 더 구체적으로 알려 주시면 다시 시도합니다.',
  ACTION_FAILURE: '화면에서 필요한 항목을 찾지 못했습니다. 화면을 확인하시고 직접 이어서 진행해 주세요.',
  NO_PROGRESS: '여러 번 시도했지만 더 진행되지 않았습니다. 현재 화면에서 직접 이어서 진행해 주세요.',
  AMBIGUOUS_STATE: '결과가 여럿이라 어느 것인지 확신할 수 없습니다. 화면에서 직접 골라 주세요.',
  UNSUPPORTED_UI: 'O4O 가 다루지 못하는 화면입니다. 이 부분은 직접 진행해 주세요.',
  USER_INTERFERENCE: '작업 중 사용자의 입력이 감지되어 멈췄습니다. 화면을 확인하신 뒤 다시 요청해 주세요.',
  RISK_BLOCKED: '로그인·결제·주문 확정 같은 단계는 O4O 가 대신하지 않습니다. 직접 진행해 주세요.',
  EXTERNAL_CHANGE: '작업하던 화면이 바뀌어 멈췄습니다. 원래 화면을 다시 앞에 두신 뒤 요청해 주세요.',
};

export function buildRecoveryExplanation(cls: AutomationFailureClass): string {
  return RECOVERY_EXPLANATION[cls] ?? RECOVERY_EXPLANATION.ACTION_FAILURE;
}

// ─── ⑤ 사용자 힌트 (§64·§65) ───────────────────────────────────────────────────

export const RECOVERY_HINT_MAX_LENGTH = 500;

/**
 * 사용자가 직접 준 복구 힌트. source=user 이므로 **신뢰 입력**이지만(§65), 권한·위험 등급을 바꾸는 문자열은 아니다 —
 * 그저 planner 에게 주는 추가 지시다. 길이·제어문자만 막고(주입 벡터 최소화), 내용 해석은 planner 검증 계약이 그대로 한다.
 */
export function sanitizeRecoveryHint(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (t.length === 0 || t.length > RECOVERY_HINT_MAX_LENGTH) return null;
  // 제어문자·개행 제거(프롬프트 구조 훼손 방지). 내용 자체는 UNTRUSTED 취급이 아니라 user-trusted 지만 형상만 조인다.
  for (let i = 0; i < t.length; i += 1) { const c = t.charCodeAt(i); if (c < 0x20 && c !== 0x0a && c !== 0x0d) return null; }
  return t.replace(/[\r\n]+/g, ' ').slice(0, RECOVERY_HINT_MAX_LENGTH);
}

// ─── ⑥ 오류 코드 (§67) ─────────────────────────────────────────────────────────

export const RECOVERY_ERROR = Object.freeze({
  /** 일반 복구가 소진돼 strong model 로 올렸다(진행 상태 신호 — 종료 아님). */
  ESCALATED: 'AUTOMATION_RECOVERY_ESCALATED',
  /** 복구가 소진돼 사용자 도움이 필요하다. */
  USER_HELP_REQUIRED: 'AUTOMATION_RECOVERY_USER_HELP_REQUIRED',
  /** 예산 안에서 복구하지 못하고 끝났다. */
  EXHAUSTED: 'AUTOMATION_RECOVERY_EXHAUSTED',
  /** strong model 경로(provider) 자체가 불가해 올리지 못했다 — 새 stack 을 만들지 않는다. */
  PROVIDER_UNAVAILABLE: 'AUTOMATION_RECOVERY_PROVIDER_UNAVAILABLE',
  /** 재개(re-observe) 자체가 실패했다. */
  RESUME_FAILED: 'AUTOMATION_RECOVERY_RESUME_FAILED',
} as const);

// ─── ⑦ 안전 로그 필드 (§60) ─────────────────────────────────────────────────────

/**
 * 로그에 실어도 되는 복구 신호 필드 — 이것뿐이다(§60). goal 원문 · 사용자 힌트 · 화면/채팅 내용 · 이미지 · credential 은
 * 칸이 없다. WorkAgentUsageEvent 가 이 키들을 확장으로 싣는다.
 */
export const RECOVERY_USAGE_KEYS: readonly string[] = Object.freeze([
  'failureClass', 'recoveryTier', 'recoveryMethod', 'recoveryAttempt', 'recoveryStatus', 'improvementCandidate',
]);

export interface RecoveryUsageFields {
  /** 마지막으로 분류된 실패 종류(없으면 null). */
  failureClass: AutomationFailureClass | null;
  /** 마지막으로 적용된 tier(없으면 null). */
  recoveryTier: RecoveryTier | null;
  /** 복구 결과(§27, 없으면 null). */
  recoveryMethod: RecoveryResult | null;
  /** 이번 국면의 총 복구 시도 횟수(normal + strong). */
  recoveryAttempt: number;
  /** 진행/종료 상태 신호(§67 코드 또는 null). */
  recoveryStatus: string | null;
  /** workflow 개선 후보 신호(§22). */
  improvementCandidate: boolean;
}

export function buildRecoveryUsageFields(state: RecoveryState, status: string | null): RecoveryUsageFields {
  return {
    failureClass: state.lastClass,
    recoveryTier: state.result || state.activeClass ? state.tier : null,
    recoveryMethod: state.result,
    recoveryAttempt: state.normalRetries + state.strongRetries,
    recoveryStatus: status,
    improvementCandidate: isImprovementCandidate(state),
  };
}
