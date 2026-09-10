/**
 * AI Capability / Tool Routing — 계약 (순수)
 *
 * WO-O4O-AI-CAPABILITY-TOOL-ROUTING-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것
 *
 *   capability  = 지금 이 사용자가 **도구를 쓸 자격**이 있는가
 *   tool        = 시스템이 가진 **실행 수단**
 *   routing     = 이 요청에서 **어떤 tool 이 자격을 통과하는가**
 *
 *   capability → tool 사용 자격 (이름이 곧 도구가 아니다)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 이것은 **새 권한 체계가 아니다**
 *
 *   아래 `AiCapability` 는 저장되지 않는다. DB 테이블도, grant 절차도, 관리 화면도 없다.
 *   **기존 인가 사실(session · service_memberships · role_assignments · store resolution)을
 *   서버가 그때그때 투영(projection)한 라벨**일 뿐이다. 권한을 새로 만들지 않으므로
 *   기존 SSOT 와 충돌하지 않는다.
 *
 *   같은 저장소에 이름이 비슷한 축이 둘 더 있다. **셋은 서로 다른 것이다:**
 *
 *   1. `@o4o/capabilities` (`StoreCapability`: TABLET / SIGNAGE / POP_PRINT …)
 *      = **매장 기능 등재부**. "이 매장이 태블릿 기능을 켰는가" — organization_id 로 저장되는
 *        매장 단위 entitlement 다. 사용자 권한이 아니다.
 *   2. `WorkScope.capabilities` (`navigate|read|draft` …)
 *      = 프런트 **서술용**. 그 계약이 "인가 판정에 쓰지 않는다" 고 명시돼 있고,
 *        클라이언트가 보내는 값이라 신뢰 대상이 아니다.
 *   3. `AiCapability` (이 파일)
 *      = **tool 사용 자격**. 서버가 세션에서 파생한다.
 *
 *   1번은 tool 의 *결과 데이터* 로 쓰이고(어떤 매장 기능이 켜져 있는지 알려주는 것),
 *   2번은 tool 판정에 **쓰지 않는다**. 판정에 쓰는 것은 3번뿐이다.
 */

import { isRegisteredWindowsApp } from '../local-agent/windows-app-registry.js';

// ─── Capability ──────────────────────────────────────────────────────────────

/**
 * V0 capability 집합 — **최소 2개만** 둔다(§7: 새 이름을 대량 생성하지 않는다).
 *
 * 둘 다 read-only 다. 쓰기·로컬·브라우저 capability 는 이번 범위에서 **정의하지 않는다** —
 * 이름만 미리 만들어 두면 "있으니 곧 열어도 된다" 는 압력이 생긴다(§22·§23).
 */
export const AiCapability = {
  /** 현재 작업 컨텍스트(업무 공간·서비스·매장 확정 여부) 조회. 인증만 되면 성립한다. */
  READ_ONLY_AI_CONTEXT: 'READ_ONLY_AI_CONTEXT',
  /** 현재 사용자의 **확정된** 매장 컨텍스트 조회. 매장이 resolved 일 때만 성립한다. */
  READ_ONLY_STORE_CONTEXT: 'READ_ONLY_STORE_CONTEXT',
  /**
   * 이 사용자의 Local Work Agent **연결 상태** 조회 (§19 `local.agent.status`).
   * 인증만 되면 성립한다 — 답이 "연결 안 됨" 일 수 있어야 §41 안내가 가능하다.
   */
  READ_ONLY_LOCAL_AGENT_STATUS: 'READ_ONLY_LOCAL_AGENT_STATUS',
  /**
   * 연결된 PC 의 **안전 시스템 정보** 조회 (§19 `local.system.info`).
   * agent 가 실제로 붙어 있을 때만 성립한다.
   */
  READ_ONLY_LOCAL_SYSTEM_INFO: 'READ_ONLY_LOCAL_SYSTEM_INFO',
  /**
   * 연결된 PC 에서 **등재된 프로그램이 실행 중인지** 조회
   * (WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 §22 `local.app.inspect`).
   *
   * read-only 다. 전체 process 목록도, 실행 파일 경로도 이 자격으로 얻을 수 없다 —
   * 얻을 수 있는 것은 "등재 앱이 실행 중인가 · 창이 몇 개인가" 뿐이다(§20·§21).
   */
  READ_ONLY_LOCAL_APP_INSPECT: 'READ_ONLY_LOCAL_APP_INSPECT',
  /**
   * 등재된 프로그램의 창을 **앞으로 가져오는** 자격 (§22 `local.window.activate`).
   *
   * ⚠️ V0 에서 **유일하게 read-only 가 아닌 capability** 다. 다만 그 효과는
   * "이미 열려 있는 창의 z-order 를 바꾼다" 하나뿐이고, 실행 · 종료 · 입력 · 캡처는
   * 애초에 구현되어 있지 않다(§25·§26·§27·§28).
   */
  LOCAL_WINDOW_ACTIVATE: 'LOCAL_WINDOW_ACTIVATE',
} as const;

/**
 * ⚠️ 여기서 멈춘다 (§19·§22·§23·§24).
 *
 * `local.read` · `local.write` · `browser` · `desktop` capability 는 **정의하지 않는다.**
 * 위 두 개는 "연결됐는가" 와 "무슨 OS 인가" 뿐이고, 둘 다 파일·프로세스·화면에 닿지 않는다.
 * V0 가 증명하려는 것은 *능력의 범위* 가 아니라 *연결·인증·명령·허용목록·왕복* 이라는 배관이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 2026-09-10 · WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 에서 **창 축 2개가 추가됐다**
 *
 * `READ_ONLY_LOCAL_APP_INSPECT` · `LOCAL_WINDOW_ACTIVATE`.
 * 위 문단의 "파일·프로세스·화면에 닿지 않는다" 는 여전히 사실이다 — 새 두 자격으로
 * 얻을 수 있는 것은 **등재 앱의 실행 여부·창 개수**와 **그 창을 앞으로 가져오는 것**뿐이고,
 * 파일 접근 · 임의 프로세스 실행/종료 · 키보드/마우스 · 화면 캡처는 구현 자체가 없다.
 * `local.read` · `local.write` · `browser` · `desktop` 은 **여전히 정의하지 않는다.**
 */

export type AiCapabilityKey = (typeof AiCapability)[keyof typeof AiCapability];

// ─── 서버가 확정한 인가 사실 ─────────────────────────────────────────────────

/**
 * capability 파생의 **유일한 입력**. 전부 서버가 세션에서 만든 값이다.
 * 클라이언트가 보낸 workScope 는 여기에 들어오지 않는다(§5·§16).
 */
export interface VerifiedToolContext {
  /** 인증된 사용자 id (세션 유래). */
  userId: string;
  /** route 에서 파생된 업무 축. */
  workspace: string;
  /** 서버가 정규화한 canonical service_memberships.service_key. */
  serviceKey?: string;
  /** `resolveWorkScopeStore()` 결과. store 축이 아니면 undefined. */
  storeStatus?: 'resolved' | 'none' | 'ambiguous';
  /**
   * 확정된 조직 id. **resolved 일 때만** 채워진다.
   * 이 값은 executor 내부에서만 쓰고 프롬프트·응답에 싣지 않는다.
   */
  organizationId?: string;
  /**
   * 이 사용자의 Local Work Agent 연결 상태. **서버가 DB 에서 확정한다**(§14).
   *
   * 클라이언트나 agent 가 보낸 값이 아니다. `store` 축에서 클라이언트 serviceKey 를
   * 서버가 재확정하는 것과 같은 규칙이다. 축이 아니면 undefined.
   */
  localAgentStatus?: 'connected' | 'offline' | 'none' | 'ambiguous';
  /** 확정된 단일 device id. **connected 일 때만** 채워진다(§34). */
  localDeviceId?: string;
}

/**
 * 인가 사실 → capability 투영.
 *
 * 규칙은 단순하다. 복잡해지면 그때가 "새 권한 체계" 가 되는 시점이다.
 *   - 인증됨                     → READ_ONLY_AI_CONTEXT
 *   - 매장이 **resolved**        → READ_ONLY_STORE_CONTEXT
 *     (`none` / `ambiguous` 는 부여하지 않는다 — ambiguous 에서 임의 매장을 고르지 않는
 *      직전 WO 계약을 그대로 승계한다.)
 */
export function deriveAiCapabilities(ctx: VerifiedToolContext): AiCapabilityKey[] {
  const caps: AiCapabilityKey[] = [];
  if (ctx.userId) caps.push(AiCapability.READ_ONLY_AI_CONTEXT);
  if (ctx.storeStatus === 'resolved' && ctx.organizationId) {
    caps.push(AiCapability.READ_ONLY_STORE_CONTEXT);
  }
  // 연결 상태 **조회** 자격은 인증만으로 성립한다. 그래야 "연결 안 됨" 이라는 정확한
  // 답을 돌려줄 수 있고, AI 가 없는 PC 데이터를 지어내지 않는다(§41).
  if (ctx.userId) caps.push(AiCapability.READ_ONLY_LOCAL_AGENT_STATUS);
  // PC 에 실제로 명령을 보내는 자격은 **connected + 단일 device 확정** 일 때만.
  // offline · none · ambiguous 는 부여하지 않는다 — 매장 ambiguous 를 다루는 방식과 같다.
  if (ctx.localAgentStatus === 'connected' && ctx.localDeviceId) {
    caps.push(AiCapability.READ_ONLY_LOCAL_SYSTEM_INFO);
    // 창 축도 같은 조건이다. 연결되지 않은 PC 의 창을 찾을 수도, 띄울 수도 없다.
    caps.push(AiCapability.READ_ONLY_LOCAL_APP_INSPECT);
    caps.push(AiCapability.LOCAL_WINDOW_ACTIVATE);
  }
  return caps;
}

// ─── Tool 정의 ───────────────────────────────────────────────────────────────

/**
 * 실행 위치.
 *
 * - `server` — API 서버 안에서 끝난다.
 * - `local`  — 사용자의 PC 에 있는 Local Work Agent 로 **왕복**한다
 *              (WO-O4O-LOCAL-WORK-AGENT-V0 에서 열렸다).
 * - `browser`— 아직 **닫혀 있다.** 등록된 tool 이 없고 아래 게이트도 통과시키지 않는다.
 *              브라우저 제어 · Computer Use 는 후속 WO 의 판단 대상이다(§24).
 */
export type ToolExecutionMode = 'server' | 'local' | 'browser';

/**
 * 실행이 허용된 mode. **registry 에 무엇이 등록돼 있든 이 집합이 최종 게이트다.**
 *
 * `browser` 가 빠져 있는 것이 핵심이다 — 누군가 실수로 browser tool 을 등록해도
 * eligibility 와 실행 판정 양쪽에서 탈락한다.
 */
const EXECUTABLE_MODES: readonly ToolExecutionMode[] = Object.freeze(['server', 'local']);

export interface AiToolDefinition {
  /** 도구 이름. `{domain}.{action}` — 기존 ACTION_KEYS 의 점 표기 관행을 따른다. */
  name: string;
  /** 모델·로그에 쓰이는 한 줄 설명. */
  description: string;
  /** 이 tool 을 쓰려면 **전부** 필요한 capability. */
  requiredCapabilities: AiCapabilityKey[];
  executionMode: ToolExecutionMode;
  /** read-only 가 아니면 아래 `effect` 를 반드시 선언해야 실행 게이트를 통과한다. */
  readOnly: boolean;
  /**
   * read-only 가 아닌 tool 이 **일으킬 수 있는 부작용의 종류**
   * (WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 §13·§18·§19).
   *
   * "readOnly 가 아니면 무엇이든 해도 된다" 가 되지 않도록, 허용 효과를 이름으로 한정한다.
   * 아래 `ALLOWED_TOOL_EFFECTS` 에 없는 값은 실행되지 않는다.
   */
  effect?: ToolEffect;
  /**
   * 받는 인자의 형상. 생략하면 **인자 없음**이다(V0 기본).
   * `appId` 는 `{ appId }` 하나만 허용하며, 값은 Windows App Registry 등재분이어야 한다(§9).
   */
  argumentSchema?: 'none' | 'appId';
}

/**
 * 부작용 종류.
 *
 * `FOREGROUND_ACTIVATION` = 이미 열려 있는 창을 앞으로 가져온다(최소화면 복원 포함).
 * 그 이상은 없다 — 프로그램 실행 · 종료 · 키보드 · 마우스 · 화면 캡처는 정의조차 하지 않는다.
 * 이름이 없으면 등록할 수도 없다(§25·§26·§27·§28).
 */
export type ToolEffect = 'FOREGROUND_ACTIVATION';

/** 실행이 허용된 부작용. **registry 에 무엇이 적혀 있든 이 집합이 최종 게이트다.** */
const ALLOWED_TOOL_EFFECTS: readonly ToolEffect[] = Object.freeze(['FOREGROUND_ACTIVATION']);

/** read-only 이거나, 허용된 effect 를 선언한 tool 만 실행 후보가 된다. */
function hasAllowedEffect(tool: AiToolDefinition): boolean {
  if (tool.readOnly) return true;
  return tool.effect !== undefined && ALLOWED_TOOL_EFFECTS.includes(tool.effect);
}

export const AI_TOOL_NAMES = {
  GET_WORK_SCOPE_CONTEXT: 'workscope.get_context',
  GET_STORE_CONTEXT: 'store.get_context',
  GET_LOCAL_AGENT_STATUS: 'local.get_agent_status',
  GET_LOCAL_SYSTEM_INFO: 'local.get_system_info',
  FIND_APPLICATION: 'local.find_application',
  ACTIVATE_WINDOW: 'local.activate_window',
} as const;

export type AiToolName = (typeof AI_TOOL_NAMES)[keyof typeof AI_TOOL_NAMES];

/**
 * Tool Registry.
 *
 * 기본은 read-only 다. read-only 가 아닌 항목은 `ALLOWED_TOOL_EFFECTS` 에 있는
 * effect 를 반드시 선언해야 하며, V0 에서 그런 항목은 `local.activate_window` 하나뿐이다.
 *
 * local 두 개의 역할이 다르다는 점에 주의:
 *   - `local.get_agent_status` 는 **서버 DB 의 연결 상태만으로 답한다.** PC 로 명령이 가지 않는다.
 *     "연결됐나?" 를 묻자고 상대 PC 를 깨울 이유가 없고, 꺼져 있을 때 답할 수 있어야 한다.
 *   - `local.get_system_info` 만이 **실제 왕복**이다. V0 가 검증하려는 배관 전체
 *     (명령 발행 → 큐 → agent allowlist → 실행 → 결과 회수)를 이 하나가 통과한다.
 */
export const AI_TOOL_REGISTRY: readonly AiToolDefinition[] = Object.freeze([
  {
    name: AI_TOOL_NAMES.GET_WORK_SCOPE_CONTEXT,
    description: '현재 사용자의 업무 공간·서비스·매장 확정 여부를 조회한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_AI_CONTEXT],
    executionMode: 'server',
    readOnly: true,
  },
  {
    name: AI_TOOL_NAMES.GET_STORE_CONTEXT,
    description: '현재 사용자의 확정된 매장에서 사용 가능한 기능 목록을 조회한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_STORE_CONTEXT],
    executionMode: 'server',
    readOnly: true,
  },
  {
    name: AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS,
    description: '이 사용자의 PC 에 설치된 Local Work Agent 의 연결 상태를 조회한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_LOCAL_AGENT_STATUS],
    executionMode: 'server',
    readOnly: true,
  },
  {
    name: AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
    description: '연결된 PC 의 운영체제 이름·버전·아키텍처 등 기본 정보를 조회한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_LOCAL_SYSTEM_INFO],
    executionMode: 'local',
    readOnly: true,
  },
  {
    name: AI_TOOL_NAMES.FIND_APPLICATION,
    description: '등재된 Windows 프로그램이 지금 실행 중인지 확인한다.',
    requiredCapabilities: [AiCapability.READ_ONLY_LOCAL_APP_INSPECT],
    executionMode: 'local',
    readOnly: true,
    argumentSchema: 'appId',
  },
  {
    name: AI_TOOL_NAMES.ACTIVATE_WINDOW,
    description: '등재된 Windows 프로그램의 창을 앞으로 가져온다.',
    requiredCapabilities: [AiCapability.LOCAL_WINDOW_ACTIVATE],
    executionMode: 'local',
    // V0 registry 에서 **유일하게** read-only 가 아닌 항목이다.
    readOnly: false,
    effect: 'FOREGROUND_ACTIVATION',
    argumentSchema: 'appId',
  },
]);

export function findToolDefinition(name: string): AiToolDefinition | undefined {
  return AI_TOOL_REGISTRY.find((t) => t.name === name);
}

// ─── Eligibility ─────────────────────────────────────────────────────────────

/**
 * 이 컨텍스트에서 자격을 통과하는 tool 목록.
 *
 * **모델에게는 이 목록만 보여준다.** 자격 없는 tool 은 애초에 노출하지 않는다.
 * 다만 노출 차단만으로 끝내지 않는다 — 실행 직전에 `assertToolAllowed()` 로 다시 막는다
 * (§13: 가능하면 둘 다 적용).
 */
export function resolveAvailableTools(ctx: VerifiedToolContext): AiToolDefinition[] {
  const caps = new Set<string>(deriveAiCapabilities(ctx));
  return AI_TOOL_REGISTRY.filter((tool) => {
    // 안전장치: 등록부에 실행 불가 mode 나 쓰기 도구가 섞여 들어와도 후보가 되지 않는다.
    if (!EXECUTABLE_MODES.includes(tool.executionMode) || !hasAllowedEffect(tool)) return false;
    return tool.requiredCapabilities.every((c) => caps.has(c));
  });
}

export type ToolDenyReason =
  | 'UNKNOWN_TOOL'
  | 'CAPABILITY_MISSING'
  | 'NOT_READ_ONLY'
  | 'EXECUTION_MODE_NOT_ALLOWED'
  | 'INVALID_ARGUMENTS';

/**
 * 판정 결과.
 *
 * discriminated union 이 아니라 **평평한 형상**이다. api-server 는 `strictNullChecks: false`
 * 라 union 판별 narrowing 이 동작하지 않는다(호출부에서 `.reason` 접근이 컴파일 오류가 된다).
 * 저장소 설정에 맞춰 optional field 로 둔다.
 */
export interface ToolAuthorization {
  allowed: boolean;
  /** allowed 일 때만 채워진다. */
  tool?: AiToolDefinition;
  /** allowed 가 false 일 때만 채워진다. */
  reason?: ToolDenyReason;
}

/**
 * 실행 직전 최종 판정 (§14).
 *
 * 모델이 이름을 만들어냈다는 이유로 실행하지 않는다. 등록부에 없으면 `UNKNOWN_TOOL`,
 * capability 가 모자라면 `CAPABILITY_MISSING` 이다.
 */
export function assertToolAllowed(name: string, ctx: VerifiedToolContext): ToolAuthorization {
  const tool = findToolDefinition(name);
  if (!tool) return { allowed: false, reason: 'UNKNOWN_TOOL' };
  // read-only 가 아니면서 허용 effect 도 선언하지 않은 tool 은 여기서 끝난다.
  if (!hasAllowedEffect(tool)) return { allowed: false, reason: 'NOT_READ_ONLY' };
  if (!EXECUTABLE_MODES.includes(tool.executionMode)) {
    return { allowed: false, reason: 'EXECUTION_MODE_NOT_ALLOWED' };
  }
  const caps = new Set<string>(deriveAiCapabilities(ctx));
  const ok = tool.requiredCapabilities.every((c) => caps.has(c));
  return ok ? { allowed: true, tool } : { allowed: false, reason: 'CAPABILITY_MISSING' };
}

// ─── Arguments ───────────────────────────────────────────────────────────────

/**
 * 기본은 **인자 없음**이다(§15).
 *
 * 의도적이다. `get_store_context({ storeId })` 처럼 식별자를 모델/클라이언트가 넘기게 하면
 * 그 값을 신뢰하는 순간 권한 우회가 된다. 대신 서버가 세션에서 매장을 확정한다.
 * 따라서 기본 스키마에서 유효한 인자는 **빈 객체뿐**이며, 그 외는 전부 거부한다.
 *
 * 예외는 창 축 tool 하나뿐이다(WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 §9).
 * 그 tool 도 자유 식별자를 받는 것이 아니라 **등재부에 있는 appId 만** 받는다 —
 * 즉 모델이 넘긴 값을 신뢰하는 것이 아니라 서버가 가진 목록과 대조해 통과시킨다.
 */
export function validateToolArguments(
  args: unknown,
  tool?: AiToolDefinition,
): { ok: boolean; reason?: ToolDenyReason } {
  const schema = tool?.argumentSchema ?? 'none';

  if (schema === 'appId') {
    // 창 축 tool 은 **정확히 `{ appId }` 하나**만 받는다 (§9).
    // 값은 모델이 만든 문자열이므로 그대로 믿지 않고 등재부와 대조한다.
    // processName · exe 경로 · 창 핸들을 넘길 통로는 형상 자체에 없다.
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return { ok: false, reason: 'INVALID_ARGUMENTS' };
    }
    const keys = Object.keys(args as Record<string, unknown>);
    if (keys.length !== 1 || keys[0] !== 'appId') {
      return { ok: false, reason: 'INVALID_ARGUMENTS' };
    }
    const appId = (args as Record<string, unknown>).appId;
    if (typeof appId !== 'string' || !isRegisteredWindowsApp(appId)) {
      // 등재되지 않은 프로그램은 여기서 끝난다 — 명령이 발행되지 않는다(§10).
      return { ok: false, reason: 'INVALID_ARGUMENTS' };
    }
    return { ok: true };
  }

  if (args === undefined || args === null) return { ok: true };
  if (typeof args !== 'object' || Array.isArray(args)) {
    return { ok: false, reason: 'INVALID_ARGUMENTS' };
  }
  if (Object.keys(args as Record<string, unknown>).length > 0) {
    // storeId·organizationId 같은 것을 넘기려는 시도를 여기서 끊는다.
    return { ok: false, reason: 'INVALID_ARGUMENTS' };
  }
  return { ok: true };
}

// ─── 결과 ────────────────────────────────────────────────────────────────────

/**
 * provider-neutral 결과 형상 (§17). provider 별 tool schema 로 변환하는 것은 adapter 몫이다.
 * 위 `ToolAuthorization` 과 같은 이유로 union 이 아닌 평평한 형상이다.
 */
export interface ToolResult {
  ok: boolean;
  tool: string;
  /** ok 일 때만 채워진다. 민감 필드는 executor 단계에서 이미 제거된 상태다. */
  data?: Record<string, unknown>;
  /** ok 가 false 일 때만 채워진다. */
  reason?: ToolDenyReason;
}
