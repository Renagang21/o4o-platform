/**
 * Automation Execution Layer — canonical contract (순수)
 *
 * WO-O4O-AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것 — **두 축을 분리한다** (§13·§14)
 *
 *   executionMode (ai-tool-contract.ts) = 실행이 **어디서** 일어나는가
 *                                          (server | local | browser)
 *   automationMethod (이 파일)          = 자동화를 **어떻게** 하는가
 *                                          (api | browser_dom | windows_uia | computer_use)
 *
 *   두 축은 곱집합이다. 예: `executionMode:'local' + automationMethod:'computer_use'` =
 *   "사용자 PC 에서(local) 화면 좌표로(computer_use) 실행". `executionMode:'local' +
 *   automationMethod:'api'` = "사용자 PC 에서 구조화된 명령으로 실행".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 최우선 원칙 — Deterministic First (§5·§6·§7)
 *
 *   가장 결정적인 수단 → 덜 결정적인 수단 → computer_use.
 *   computer_use 는 **기본 엔진이 아니라 universal fallback** 이다(§9). 구조화 수단이
 *   가능하면 그것을 쓰고, 불가능함이 확인됐을 때만(그리고 그 사유를 남길 때만) computer_use
 *   로 내려간다(§10·§16·§41).
 *
 *   이 파일은 **정책·계약·순수 함수만** 둔다. 실제 DOM/UIA 실행기는 후속 WO
 *   (BROWSER-DOM-CONTROL-V0 · WINDOWS-UI-AUTOMATION-V0)의 몫이다(§27·§28·§38). 지금은
 *   browser_dom · windows_uia 를 쓰는 tool 이 하나도 없다 — 축과 게이트만 미리 고정한다.
 */

// ─── Automation Method (HOW) ─────────────────────────────────────────────────

/**
 * 자동화 수단. executionMode(WHERE)와 **다른 축**이다(§13·§14).
 *
 *   - `api`          결정적 구조화 실행. 화면 좌표·비전을 쓰지 않는다.
 *                    (서버 컨텍스트 조회 · 구조화된 Local Agent 명령 · OS 창/셸 조작 ·
 *                     로컬 SQLite 조작이 전부 여기 속한다 — computer_use 가 아닌 모든 현행 tool.)
 *   - `browser_dom`  브라우저 안에서 등재 element 를 구조적으로 다룬다(확장/DOM). **후속 WO** — 현재 tool 0개.
 *   - `windows_uia`  Windows UI Automation control tree. **후속 WO** — 현재 tool 0개.
 *   - `computer_use` 스크린샷·좌표·키 입력 fallback. 가장 덜 결정적 — 항상 마지막(§5).
 *
 * `api` 는 W-스택의 W1(§6)/Windows 스택의 P1(§7)만이 아니라, 아직 browser_dom/windows_uia 로
 * 세분되지 않은 **모든 결정적 수단**을 담는 상위 라벨이다. 후속 WO 가 그중 일부를
 * browser_dom·windows_uia 로 승격시킨다(§30 반복 안정화 → 구조화 비중 증가).
 */
export type AutomationMethod = 'api' | 'browser_dom' | 'windows_uia' | 'computer_use';

/**
 * 선호 순서 — index 가 낮을수록 더 결정적이고 **우선**이다(§5·§6·§7).
 * `computer_use` 는 언제나 마지막이다. 이 배열 하나가 Web 스택과 Windows 스택 모두의
 * "structured first, computer_use last" 를 표현한다(§42 future extension: 새 구조화 수단은
 * computer_use **앞**에 끼운다).
 */
export const AUTOMATION_METHOD_PREFERENCE: readonly AutomationMethod[] = Object.freeze([
  'api',
  'browser_dom',
  'windows_uia',
  'computer_use',
]);

/** 두 수단 중 어느 쪽이 더 결정적(선호)인지. a 가 b 보다 앞서면 true. */
export function isMoreDeterministic(a: AutomationMethod, b: AutomationMethod): boolean {
  return AUTOMATION_METHOD_PREFERENCE.indexOf(a) < AUTOMATION_METHOD_PREFERENCE.indexOf(b);
}

/** computer_use 인가 — fallback 계층인지 한 곳에서 판정한다. */
export function isComputerUseMethod(method: AutomationMethod): boolean {
  return method === 'computer_use';
}

// ─── Action Risk (§18) ───────────────────────────────────────────────────────

/**
 * 자동화 action 의 위험 등급(§18). readOnly 하나로는 "되돌릴 수 있는 입력" 과
 * "결제·주문 확정" 을 구분할 수 없어서 별도 축으로 둔다.
 *
 *   - `READ`             조회. 상태를 바꾸지 않는다. (⇔ tool.readOnly === true)
 *   - `REVERSIBLE`       되돌릴 수 있는 낮은 영향 (창 활성화 · URL 열기 · 필터 입력 · 설정 저장).
 *   - `REVIEW_REQUIRED`  사람 확인이 필요한 업무 결정 (주문 후보 확정 · 공급처 변경 등).
 *   - `COMMIT`           결제 · 주문 최종 제출 · 게시 · 삭제 등 비가역/고위험(§18·§19).
 */
export type AutomationRiskLevel = 'READ' | 'REVERSIBLE' | 'REVIEW_REQUIRED' | 'COMMIT';

/** 위험도 오름차순. */
export const AUTOMATION_RISK_ORDER: readonly AutomationRiskLevel[] = Object.freeze([
  'READ',
  'REVERSIBLE',
  'REVIEW_REQUIRED',
  'COMMIT',
]);

/**
 * 이 위험 등급에서 **구조화 실패 시 자동으로 computer_use 로 내려가도 되는가**(§10·§17·§19).
 *
 * READ · REVERSIBLE 만 허용한다. REVIEW_REQUIRED · COMMIT 는 사람이 직접 하거나 명시적
 * 확인이 있어야 한다 — 결제·주문 확정·게시·삭제·로그인 단계에서 화면 자동화로 자동 진입하지
 * 않는다(§17 목록). "구현이 귀찮다" 는 이유로 computer_use 로 보내지 않는다(§10).
 */
export function computerUseFallbackAllowed(riskLevel: AutomationRiskLevel): boolean {
  return riskLevel === 'READ' || riskLevel === 'REVERSIBLE';
}

// ─── Fallback Reason (§16) ─────────────────────────────────────────────────────

/**
 * computer_use 로 내려간 **사유**. 구조화 실행이 왜 불가능했는지를 설명 가능해야 한다(§41).
 * 이 사유 없이는 computer_use fallback 이 성립하지 않는다.
 */
export const FALLBACK_REASON = {
  /** 이 작업에 쓸 구조화 수단(api/browser_dom/windows_uia) 자체가 아직 없다. */
  STRUCTURED_METHOD_NOT_AVAILABLE: 'STRUCTURED_METHOD_NOT_AVAILABLE',
  /** 구조화 대상(등재 site/app 등)을 찾지 못했다. */
  STRUCTURED_TARGET_NOT_FOUND: 'STRUCTURED_TARGET_NOT_FOUND',
  /** DOM element 를 찾지 못했다(browser_dom 실패). */
  DOM_ELEMENT_NOT_FOUND: 'DOM_ELEMENT_NOT_FOUND',
  /** UIA control 을 찾지 못했다(windows_uia 실패). */
  UIA_CONTROL_NOT_FOUND: 'UIA_CONTROL_NOT_FOUND',
  /** 접근성 트리를 쓸 수 없다(불완전/미노출). */
  ACCESSIBILITY_UNAVAILABLE: 'ACCESSIBILITY_UNAVAILABLE',
} as const;

export type FallbackReason = (typeof FALLBACK_REASON)[keyof typeof FALLBACK_REASON];

export function isFallbackReason(value: unknown): value is FallbackReason {
  return typeof value === 'string' && Object.values(FALLBACK_REASON).includes(value as FallbackReason);
}

// ─── resolveAutomationMethod (§39) ─────────────────────────────────────────────

export type AutomationResolutionBlock =
  /** 어떤 수단도 쓸 수 없다(구조화도 computer_use 도 불가). */
  | 'NO_METHOD_AVAILABLE'
  /** computer_use 로 내려가려는데 fallbackReason 이 없다(§41). */
  | 'FALLBACK_REASON_REQUIRED'
  /** 위험 등급이 자동 computer_use fallback 을 허용하지 않는다 — 사람이 해야 한다(§17·§19). */
  | 'HUMAN_REQUIRED';

/**
 * 이 작업에 쓸 수단 결정(§39). 순수 함수 — 실행하지 않는다.
 *
 * 규칙:
 *   1. 선호 순서대로 **구조화 수단**(computer_use 이전)이 available 이면 그것을 쓴다.
 *   2. computer_use 만 남았으면:
 *      - fallbackReason 이 없으면 막는다(FALLBACK_REASON_REQUIRED, §41).
 *      - 위험 등급이 허용하지 않으면 막는다(HUMAN_REQUIRED, §17·§19).
 *      - 둘 다 통과해야 computer_use 를 쓴다.
 *   3. 아무 수단도 available 이 아니면 막는다(NO_METHOD_AVAILABLE).
 *
 * 반환은 평평한 형상이다(api-server strictNullChecks:false — union 판별 narrowing 미동작).
 */
export interface AutomationResolutionInput {
  /** 이 작업에 실제로 쓸 수 있는 수단들. V0 에서 browser_dom/windows_uia 는 아직 비어 있다. */
  availableMethods: readonly AutomationMethod[];
  /** 이 action 의 위험 등급. */
  riskLevel: AutomationRiskLevel;
  /** computer_use 로 내려갈 때의 사유(§16). 구조화가 available 이면 무시된다. */
  fallbackReason?: FallbackReason;
}

export interface AutomationResolution {
  /** 결정된 수단. blocked 이면 undefined. */
  method?: AutomationMethod;
  /** method === 'computer_use' 일 때만 채워진다. */
  fallbackReason?: FallbackReason;
  /** 결정 실패 시 true. */
  blocked?: boolean;
  /** blocked 일 때만 채워진다. */
  blockReason?: AutomationResolutionBlock;
}

export function resolveAutomationMethod(input: AutomationResolutionInput): AutomationResolution {
  const avail = new Set<AutomationMethod>(input.availableMethods);

  // 1. 구조화 수단 우선(선호 순서). computer_use 는 여기서 고르지 않는다(§5).
  for (const method of AUTOMATION_METHOD_PREFERENCE) {
    if (method === 'computer_use') break;
    if (avail.has(method)) return { method };
  }

  // 2. computer_use 만 남았다.
  if (!avail.has('computer_use')) {
    return { blocked: true, blockReason: 'NO_METHOD_AVAILABLE' };
  }
  if (!input.fallbackReason) {
    return { blocked: true, blockReason: 'FALLBACK_REASON_REQUIRED' };
  }
  if (!computerUseFallbackAllowed(input.riskLevel)) {
    return { blocked: true, blockReason: 'HUMAN_REQUIRED' };
  }
  return { method: 'computer_use', fallbackReason: input.fallbackReason };
}

// ─── Prompt Injection Boundary (§32·§33) ───────────────────────────────────────

/**
 * 콘텐츠 출처(§33). 웹페이지·로컬 앱 화면에서 읽은 것은 **명령 권한이 없다**(§32) —
 * 거기 "이전 지시를 무시하라" 가 적혀 있어도 O4O system/tool 정책으로 해석하지 않는다.
 */
export type ContentProvenance = 'user' | 'system' | 'webpage' | 'local_app_ui';

/** 명령 권한을 가진 출처(§33). user·system 만. */
export const AUTHORITATIVE_PROVENANCE: readonly ContentProvenance[] = Object.freeze(['user', 'system']);

/**
 * 이 출처의 내용을 **명령으로** 실행해도 되는가(§32·§33).
 * webpage · local_app_ui 는 항상 false — UNTRUSTED CONTENT 로 취급한다.
 */
export function isCommandAuthoritative(source: ContentProvenance): boolean {
  return AUTHORITATIVE_PROVENANCE.includes(source);
}
