/**
 * AI Tool Router — 실행 계층
 *
 * WO-O4O-AI-CAPABILITY-TOOL-ROUTING-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 실행 경계 (§10)
 *
 *   Gemini/OpenAI 는 **도구를 직접 실행하지 않는다.** provider 는 텍스트만 만든다.
 *   모든 실행은 이 라우터를 통과한다:
 *
 *     요청 → 서버 scope 재확정 → capability 파생 → eligibility → 인자 검증
 *          → executor(read-only) → 민감 필드 제거 → 프롬프트 컨텍스트
 *
 *   provider 가 DB·브라우저·로컬 PC 에 닿는 경로는 존재하지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * V0 는 provider-native function calling 을 쓰지 않는다 (§19-B)
 *
 *   `AIProvider.complete(systemPrompt, userPrompt, config)` 에는 tools 인자가 없고
 *   `AIProviderConfig` 에도 tools 필드가 없다. 즉 provider-native tool calling 을 하려면
 *   **F1 Frozen 인 `@o4o/ai-core` 의 provider 인터페이스를 구조 변경**해야 한다.
 *   §19 가 "과도한 변경이면 B 로 닫아도 된다" 고 했고 §20 이 agent loop 를 금지하므로,
 *   V0 는 **결정론적 사전 실행(deterministic pre-tool)** 으로 간다:
 *
 *     tool 을 최대 1회 서버에서 실행 → 결과를 컨텍스트로 주입 → LLM 1회 호출 → 텍스트 응답
 *
 *   tool 계약은 provider 중립이라(§11) 나중에 native function calling 을 붙일 때
 *   adapter 가 변환만 하면 된다.
 */

import type { DataSource } from 'typeorm';
import { getCapabilityLabel } from '@o4o/capabilities';
import logger from '../../utils/logger.js';
import {
  AI_TOOL_NAMES,
  assertToolAllowed,
  deriveAiCapabilities,
  resolveAvailableTools,
  validateToolArguments,
  type AiToolName,
  type ToolResult,
  type VerifiedToolContext,
} from './ai-tool-contract.js';
import {
  composeAppAction,
  LOCAL_AGENT_ACTIONS,
  LOCAL_AGENT_ERROR,
  pickSafeSystemInfo,
  pickSafeWindowInfo,
} from '../local-agent/local-agent-protocol.js';
import { windowsAppDisplayName, WINDOWS_APP_IDS } from '../local-agent/windows-app-registry.js';
import {
  awaitCommandResult,
  issueCommand,
  resolveTargetDevice,
} from '../local-agent/local-agent-service.js';

// ─── Executors (read-only) ───────────────────────────────────────────────────

/**
 * `workscope.get_context` — 현재 작업 컨텍스트.
 *
 * 식별자(userId·organizationId·storeId)를 **반환하지 않는다**. AI 가 사용자에게
 * 내부 UUID 를 그대로 뱉지 못하게 하는 기존 계약을 그대로 유지한다(§8·§16).
 */
function executeGetWorkScopeContext(ctx: VerifiedToolContext): ToolResult {
  return {
    ok: true,
    tool: AI_TOOL_NAMES.GET_WORK_SCOPE_CONTEXT,
    data: {
      workspace: ctx.workspace,
      serviceKey: ctx.serviceKey ?? null,
      storeResolved: ctx.storeStatus === 'resolved',
      storeStatus: ctx.storeStatus ?? null,
      capabilities: deriveAiCapabilities(ctx),
    },
  };
}

/**
 * `store.get_context` — 확정된 매장에서 **사용 가능한 기능 목록**.
 *
 * 기존 `store_capabilities`(매장 기능 등재부)를 read-only 로 읽어 라벨로 바꾼다.
 * 새 테이블·새 등재부를 만들지 않는다(§24).
 *
 * **반환하지 않는 것** — 사업자번호 · 주소 · 대표자 · 전화번호 · 조직명 · UUID,
 * 그리고 처방 · 환자 · 보험청구 · 개인정보 계열 일체(§8·§23).
 * 이 executor 는 애초에 그런 테이블을 조회하지 않는다.
 */
async function executeGetStoreContext(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
): Promise<ToolResult> {
  const tool = AI_TOOL_NAMES.GET_STORE_CONTEXT;
  // capability 판정에서 이미 걸러지지만, executor 도 스스로 방어한다.
  if (ctx.storeStatus !== 'resolved' || !ctx.organizationId) {
    return { ok: false, tool, reason: 'CAPABILITY_MISSING' };
  }

  const rows = (await dataSource.query(
    `SELECT capability_key, enabled
       FROM store_capabilities
      WHERE organization_id = $1
      ORDER BY capability_key ASC`,
    [ctx.organizationId],
  )) as Array<{ capability_key: string; enabled: boolean }>;

  const enabled = rows.filter((r) => r.enabled).map((r) => getCapabilityLabel(r.capability_key));

  return {
    ok: true,
    tool,
    data: {
      storeResolved: true,
      serviceKey: ctx.serviceKey ?? null,
      // 라벨만 담는다(내부 key 대신). 사용자에게 그대로 읽어줘도 안전한 형태다.
      enabledFeatures: enabled,
      enabledFeatureCount: enabled.length,
    },
  };
}

// ─── Local Work Agent executors (WO-O4O-LOCAL-WORK-AGENT-V0) ────────────────

/**
 * Tool 1 — 연결 상태 (§20).
 *
 * **PC 로 명령이 가지 않는다.** 답은 전부 서버가 이미 알고 있는 것(등록 여부 · 마지막
 * heartbeat)이다. 꺼져 있는 PC 를 깨워서 "너 켜져 있니" 를 물을 이유가 없고,
 * 꺼져 있을 때도 정확히 답할 수 있어야 §41 안내가 성립한다.
 */
async function executeGetLocalAgentStatus(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
): Promise<ToolResult> {
  const tool = AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS;
  const resolution = await resolveTargetDevice(dataSource, ctx.userId);

  if (resolution.status === 'none') {
    return { ok: true, tool, data: { connected: false, reason: 'NO_DEVICE' } };
  }
  if (resolution.status === 'ambiguous') {
    return {
      ok: true,
      tool,
      data: { connected: false, reason: 'AMBIGUOUS', deviceCount: resolution.count },
    };
  }
  // deviceId 는 담지 않는다. 사용자에게 읽어줄 이유가 없는 내부 식별자다
  // (직전 WO 에서 organizationId 를 프롬프트에 싣지 않은 것과 같은 규칙).
  return {
    ok: true,
    tool,
    data: {
      connected: resolution.status === 'ok',
      reason: resolution.status === 'ok' ? null : 'OFFLINE',
      deviceName: resolution.device.deviceName,
      platform: resolution.device.platform,
      agentVersion: resolution.device.agentVersion,
      lastSeenAt: resolution.device.lastSeenAt,
    },
  };
}

/**
 * Tool 2 — 안전 시스템 정보 (§21). **V0 의 유일한 실제 왕복이다.**
 *
 *   명령 발행 → 큐 → agent long-poll → agent allowlist → 실행 → 결과 제출 → 회수
 *
 * 되돌아오는 데이터는 `pickSafeSystemInfo` 를 두 번 통과한다 — 서버가 결과를 저장할 때
 * 한 번(service), 여기서 프롬프트로 보내기 전에 한 번 더. agent 가 무엇을 실어 보내든
 * username · 경로 · IP · MAC · 프로세스 목록은 이 문을 지나지 못한다.
 */
async function executeGetLocalSystemInfo(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
): Promise<ToolResult> {
  const tool = AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO;

  // capability 단계에서 connected 를 이미 확인했지만, 실행 직전 상태를 다시 읽는다.
  // 그 사이에 agent 가 꺼졌을 수 있다.
  const resolution = await resolveTargetDevice(dataSource, ctx.userId);
  if (resolution.status === 'none') {
    return { ok: true, tool, data: { available: false, errorCode: LOCAL_AGENT_ERROR.NO_DEVICE } };
  }
  if (resolution.status === 'ambiguous') {
    return { ok: true, tool, data: { available: false, errorCode: LOCAL_AGENT_ERROR.AMBIGUOUS } };
  }
  if (resolution.status === 'offline') {
    return { ok: true, tool, data: { available: false, errorCode: LOCAL_AGENT_ERROR.OFFLINE } };
  }

  const issued = await issueCommand(dataSource, {
    userId: ctx.userId,
    deviceId: resolution.device.id,
    action: LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
    toolName: tool,
  });
  // `=== false` 로 쓴다 — 이 패키지는 strictNullChecks 가 꺼져 있어
  // `!issued.ok` 로는 union 이 좁혀지지 않는다.
  if (issued.ok === false) {
    return { ok: true, tool, data: { available: false, errorCode: issued.errorCode } };
  }

  const result = await awaitCommandResult(dataSource, issued.command.commandId);
  if (result.status !== 'success') {
    logger.info('local-agent command not successful', {
      tool,
      status: result.status,
      errorCode: result.errorCode,
    });
    return {
      ok: true,
      tool,
      data: {
        available: false,
        errorCode: result.errorCode ?? LOCAL_AGENT_ERROR.EXECUTION_FAILED,
      },
    };
  }

  return {
    ok: true,
    tool,
    data: { available: true, systemInfo: pickSafeSystemInfo(result.data) },
  };
}

// ─── Windows App / Window executors (WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0) ──

/**
 * 창 축 tool 의 공통 왕복.
 *
 * `local.get_system_info` 와 같은 배관을 그대로 쓴다 — 새 protocol 을 만들지 않는다(§32).
 * 다른 점은 하나뿐이다: appId 가 **allowlist 에 등재된 action 문자열 안에** 실려 간다
 * (`local.find_application#windows.notepad`). 명령 envelope 에 자유 인자 칸이 없기 때문이고,
 * 그래서 "허용되지 않은 대상" 은 애초에 표현될 수 없다(§9·§10·§38).
 *
 * 돌아온 데이터는 `pickSafeWindowInfo` 를 **두 번** 통과한다 — 서버가 결과를 저장할 때
 * 한 번(service), 프롬프트로 보내기 전에 여기서 한 번 더. agent 가 무엇을 실어 보내든
 * 창 제목 · PID · 창 핸들 · 실행 파일 경로는 이 문을 지나지 못한다(§20·§21).
 */
async function executeWindowsAppAction(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  tool: string,
  baseAction: string,
  appId: string,
): Promise<ToolResult> {
  const displayName = windowsAppDisplayName(appId);

  const resolution = await resolveTargetDevice(dataSource, ctx.userId);
  if (resolution.status !== 'ok') {
    const errorCode =
      resolution.status === 'none'
        ? LOCAL_AGENT_ERROR.NO_DEVICE
        : resolution.status === 'ambiguous'
          ? LOCAL_AGENT_ERROR.AMBIGUOUS
          : LOCAL_AGENT_ERROR.OFFLINE;
    return { ok: true, tool, data: { available: false, appId, displayName, errorCode } };
  }

  const issued = await issueCommand(dataSource, {
    userId: ctx.userId,
    deviceId: resolution.device.id,
    action: composeAppAction(baseAction, appId),
    toolName: tool,
  });
  // strictNullChecks 가 꺼져 있어 `!issued.ok` 로는 union 이 좁혀지지 않는다.
  if (issued.ok === false) {
    return { ok: true, tool, data: { available: false, appId, displayName, errorCode: issued.errorCode } };
  }

  const result = await awaitCommandResult(dataSource, issued.command.commandId);
  const safe = pickSafeWindowInfo(result.data);

  // §39 안전 로그 — appId · action · 성공 여부 · 창 개수 · deviceId 까지만 남긴다.
  // 창 제목 · command line · 실행 파일 경로 · 사용자 경로는 애초에 이 값 안에 없다.
  logger.info('local-agent window command', {
    tool,
    appId,
    status: result.status,
    errorCode: result.errorCode ?? null,
    windowCount: safe.windowCount ?? null,
    deviceId: resolution.device.id,
  });

  if (result.status !== 'success') {
    return {
      ok: true,
      tool,
      data: {
        available: false,
        appId,
        displayName,
        errorCode: result.errorCode ?? LOCAL_AGENT_ERROR.EXECUTION_FAILED,
        windowCount: safe.windowCount ?? 0,
      },
    };
  }

  return { ok: true, tool, data: { available: true, appId, displayName, ...safe } };
}

/** Tool 3 — 등재 앱이 실행 중인가 (§12). 창을 건드리지 않는다. */
function executeFindApplication(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  appId: string,
): Promise<ToolResult> {
  return executeWindowsAppAction(
    dataSource,
    ctx,
    AI_TOOL_NAMES.FIND_APPLICATION,
    LOCAL_AGENT_ACTIONS.FIND_APPLICATION,
    appId,
  );
}

/**
 * Tool 4 — 등재 앱의 창을 앞으로 (§13·§19).
 *
 * 한 요청에서 이 executor 는 **최대 1회** 불린다 — 호출부가 tool 을 1개만 고르고(§20),
 * agent 도 창이 정확히 1개일 때만 전환한다(§16). 즉 foreground 전환은 요청당 최대 1회다.
 */
function executeActivateWindow(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  appId: string,
): Promise<ToolResult> {
  return executeWindowsAppAction(
    dataSource,
    ctx,
    AI_TOOL_NAMES.ACTIVATE_WINDOW,
    LOCAL_AGENT_ACTIONS.ACTIVATE_WINDOW,
    appId,
  );
}

// ─── Router ──────────────────────────────────────────────────────────────────

/**
 * tool 1개를 실행한다. **agent loop 없음** — 호출부가 최대 1회만 부른다(§20).
 *
 * 실행 직전 재검증 순서(§14): 등록부 확인 → capability 재확인 → 인자 검증 → executor.
 */
export async function executeAiTool(
  dataSource: DataSource,
  name: string,
  args: unknown,
  ctx: VerifiedToolContext,
): Promise<ToolResult> {
  const auth = assertToolAllowed(name, ctx);
  if (!auth.allowed) {
    logger.info('ai-tool denied', { tool: name, reason: auth.reason, workspace: ctx.workspace });
    return { ok: false, tool: name, reason: auth.reason };
  }

  const argCheck = validateToolArguments(args, auth.tool);
  if (!argCheck.ok) {
    logger.info('ai-tool denied', { tool: name, reason: argCheck.reason, workspace: ctx.workspace });
    return { ok: false, tool: name, reason: argCheck.reason ?? 'INVALID_ARGUMENTS' };
  }

  switch (name as AiToolName) {
    case AI_TOOL_NAMES.GET_WORK_SCOPE_CONTEXT:
      return executeGetWorkScopeContext(ctx);
    case AI_TOOL_NAMES.GET_STORE_CONTEXT:
      return executeGetStoreContext(dataSource, ctx);
    case AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS:
      return executeGetLocalAgentStatus(dataSource, ctx);
    case AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO:
      return executeGetLocalSystemInfo(dataSource, ctx);
    // appId 는 위 `validateToolArguments` 에서 등재부와 대조를 끝낸 값이다.
    case AI_TOOL_NAMES.FIND_APPLICATION:
      return executeFindApplication(dataSource, ctx, String((args as { appId: string }).appId));
    case AI_TOOL_NAMES.ACTIVATE_WINDOW:
      return executeActivateWindow(dataSource, ctx, String((args as { appId: string }).appId));
    default:
      // 등록부에는 있으나 executor 가 없는 경우 — 열려 있는 척하지 않는다.
      return { ok: false, tool: name, reason: 'UNKNOWN_TOOL' };
  }
}

// ─── Deterministic selection (§12) ───────────────────────────────────────────

/**
 * "내 매장 기준으로 …" 류의 매장 지시어.
 *
 * V0 는 모델이 tool 을 자유 선택하게 하지 않는다. 이 목록에 걸리고 **자격도 통과할 때만**
 * 매장 컨텍스트를 붙인다. 자격이 없으면 tool 을 고르지 않고 그대로 텍스트 응답으로 간다.
 *
 * ⚠️ 한글을 **정규식 리터럴에 직접 쓰지 않는다.**
 *
 * 2026-09-09 프로덕션 실측: 같은 코드에서 영어 패턴(`my store`)은 매칭됐는데
 * 한글 패턴(`/내\s*매장/`)은 매칭되지 않았다. 로컬 jest(.ts 직접 실행)에서는 둘 다 통과한다.
 * 차이는 번들링뿐이다 — esbuild 기본 `charset: 'ascii'` 는 **문자열 리터럴**의 비-ASCII 를
 * `\uXXXX` 로 이스케이프하지만 **정규식 리터럴**은 그렇게 하지 못한다.
 * (같은 배포에서 한글 *문자열*(`renderToolContext` 출력)은 모델까지 정상 전달됐다.)
 *
 * 그래서 키워드를 `\uXXXX` 이스케이프로 두어 **소스를 순수 ASCII 로** 만든다.
 * 공백 변형("내 매장" / "내매장" / "내  매장")은 비교 전에 공백을 제거해 흡수한다.
 */
const STORE_INTENT_KEYWORDS_KO: readonly string[] = [
  '\uB0B4\uB9E4\uC7A5', // 내매장
  '\uC6B0\uB9AC\uB9E4\uC7A5', // 우리매장
  '\uB0B4\uC57D\uAD6D', // 내약국
  '\uC6B0\uB9AC\uC57D\uAD6D', // 우리약국
];

/** ASCII 전용이라 번들 영향이 없다. */
const STORE_INTENT_PATTERNS_EN: readonly RegExp[] = [/my\s+store/i, /our\s+store/i, /my\s+pharmacy/i];

export function looksLikeStoreScopedRequest(message: string): boolean {
  const compact = message.replace(/\s+/g, '');
  if (STORE_INTENT_KEYWORDS_KO.some((k) => compact.includes(k))) return true;
  return STORE_INTENT_PATTERNS_EN.some((re) => re.test(message));
}

/**
 * "내 PC 는 …" 류의 로컬 지시어.
 *
 * 위 매장 키워드와 **같은 이유로** 한글을 정규식 리터럴에 쓰지 않는다. 그 결함
 * (한글 정규식이 번들 후 매칭 실패)은 프로덕션에서 실제로 관측됐고, 여기서 되풀이하면
 * "로컬 도구가 조용히 동작하지 않는" 형태로 똑같이 재현될 것이다.
 */
const LOCAL_INTENT_KEYWORDS_KO: readonly string[] = [
  '\uB0B4PC', // 내PC
  '\uC774PC', // 이PC
  '\uC81CPC', // 제PC
  '\uB0B4\uCEF4\uD4E8\uD130', // 내컴퓨터
  '\uC774\uCEF4\uD4E8\uD130', // 이컴퓨터
  '\uB0B4\uB178\uD2B8\uBD81', // 내노트북
  '\uB85C\uCEEC\uC5D0\uC774\uC804\uD2B8', // 로컬에이전트
];

/** ASCII 전용이라 번들 영향이 없다. */
const LOCAL_INTENT_PATTERNS_EN: readonly RegExp[] = [
  /my\s+pc\b/i,
  /this\s+pc\b/i,
  /my\s+computer\b/i,
  /local\s+agent\b/i,
];

export function looksLikeLocalScopedRequest(message: string): boolean {
  const compact = message.replace(/\s+/g, '').toUpperCase();
  if (LOCAL_INTENT_KEYWORDS_KO.some((k) => compact.includes(k.toUpperCase()))) return true;
  return LOCAL_INTENT_PATTERNS_EN.some((re) => re.test(message));
}

/** 시스템 정보를 **명시적으로** 물었을 때만 왕복한다. ASCII 이스케이프 규칙은 위와 같다. */
const SYSTEM_INFO_KEYWORDS_KO: readonly string[] = [
  '\uC6B4\uC601\uCCB4\uC81C', // 운영체제
  '\uC708\uB3C4\uC6B0', // 윈도우
  '\uC0AC\uC591', // 사양
  '\uBC84\uC804', // 버전
];
const SYSTEM_INFO_PATTERNS_EN: readonly RegExp[] = [
  /\bos\b/i,
  /\bwindows\b/i,
  /system\s+info/i,
  /\bversion\b/i,
];

function asksForSystemInfo(message: string): boolean {
  const compact = message.replace(/\s+/g, '');
  if (SYSTEM_INFO_KEYWORDS_KO.some((k) => compact.includes(k))) return true;
  return SYSTEM_INFO_PATTERNS_EN.some((re) => re.test(message));
}

/**
 * 등재 앱을 가리키는 말 → appId (§9·§10).
 *
 * ⚠️ 위 매장·로컬 키워드와 **같은 이유로** 한글을 정규식 리터럴에 쓰지 않는다.
 * 2026-09-09 프로덕션 실측(한글 정규식이 번들 후 매칭 실패)이 여기서 되풀이되면
 * "창 도구가 조용히 동작하지 않는" 형태로 똑같이 재현된다.
 *
 * 이 표에 없는 프로그램은 **이름을 말해도 tool 이 선택되지 않는다.** 모델이 만들어낸
 * 프로그램 이름이 appId 가 되는 경로는 존재하지 않는다.
 */
const APP_INTENT_KEYWORDS: readonly {
  appId: string;
  ko: readonly string[];
  en: readonly RegExp[];
}[] = [
  {
    appId: 'windows.notepad',
    ko: ['\uBA54\uBAA8\uC7A5'], // 메모장
    en: [/\bnotepad\b/i],
  },
  {
    appId: 'windows.calculator',
    ko: ['\uACC4\uC0B0\uAE30'], // 계산기
    en: [/\bcalculator\b/i],
  },
];

/** 문장에서 등재 앱을 찾는다. 여러 개가 걸리면 **고르지 않는다** — 임의 선택 금지(§16 정신). */
export function detectRegisteredApp(message: string): string | null {
  const compact = message.replace(/\s+/g, '');
  const hits = APP_INTENT_KEYWORDS.filter(
    (a) => a.ko.some((k) => compact.includes(k)) || a.en.some((re) => re.test(message)),
  ).map((a) => a.appId);
  const unique = [...new Set(hits)].filter((id) => WINDOWS_APP_IDS.includes(id));
  return unique.length === 1 ? unique[0] : null;
}

/**
 * "앞으로 가져와" 류의 **활성화** 지시어. 없으면 조회(find)로만 간다.
 *
 * 기본값이 조회인 것이 중요하다. "메모장 열려 있어?" 라고 물었을 뿐인데 창이 튀어나와
 * 사용자의 입력을 가로채면 안 된다(§19).
 */
const ACTIVATE_INTENT_KEYWORDS_KO: readonly string[] = [
  '\uC55E\uC73C\uB85C', // 앞으로
  '\uC55E\uC5D0', // 앞에
  '\uD65C\uC131\uD654', // 활성화
  '\uB744\uC6CC', // 띄워
  '\uD3EC\uCEE4\uC2A4', // 포커스
  '\uC804\uD658', // 전환
];
const ACTIVATE_INTENT_PATTERNS_EN: readonly RegExp[] = [
  /bring\s+.*front/i,
  /\bfocus\b/i,
  /\bactivate\b/i,
  /foreground/i,
];

export function asksForWindowActivation(message: string): boolean {
  const compact = message.replace(/\s+/g, '');
  if (ACTIVATE_INTENT_KEYWORDS_KO.some((k) => compact.includes(k))) return true;
  return ACTIVATE_INTENT_PATTERNS_EN.some((re) => re.test(message));
}

/**
 * 이번 요청에서 실행할 tool 을 **결정론적으로** 고른다. 없으면 null.
 *
 * 자격 없는 tool 은 후보에 들어오지 않는다(`resolveAvailableTools`).
 * 여전히 **요청당 최대 1개** 다 — agent loop 는 없다(§20).
 *
 * 로컬 축의 순서가 중요하다. "내 PC 의 운영체제" 처럼 시스템 정보를 명시적으로 물었을
 * 때만 왕복하고, 그 밖의 로컬 언급은 연결 상태 조회로 보낸다. 사용자가 "내 PC 연결됐어?"
 * 라고 물었을 뿐인데 PC 를 깨워 정보를 캐는 일이 없도록 하기 위해서다.
 */
export function selectToolForRequest(message: string, ctx: VerifiedToolContext): AiToolName | null {
  const invocation = selectToolInvocationForRequest(message, ctx);
  return invocation ? invocation.tool : null;
}

/** 고른 tool 과 그 인자. 인자를 받지 않는 tool 은 `args` 가 빈 객체다. */
export interface AiToolInvocation {
  tool: AiToolName;
  args: Record<string, unknown>;
}

/**
 * `selectToolForRequest` 의 인자 포함 버전.
 *
 * 창 축 tool 은 appId 를 받으므로 이름만으로는 실행할 수 없다. **appId 는 모델이
 * 만들어내는 값이 아니라** 이 함수가 등재부(`WINDOWS_APP_IDS`)에서 고른 값이고,
 * 실행 직전 `validateToolArguments` 가 등재부와 다시 대조한다(§9).
 */
export function selectToolInvocationForRequest(
  message: string,
  ctx: VerifiedToolContext,
): AiToolInvocation | null {
  const available = new Set(resolveAvailableTools(ctx).map((t) => t.name));

  // 창 축이 먼저다. "메모장 열려 있어?" 는 로컬 축 키워드("내 PC")가 없어도 성립해야 한다(§37).
  const appId = detectRegisteredApp(message);
  if (appId) {
    if (asksForWindowActivation(message) && available.has(AI_TOOL_NAMES.ACTIVATE_WINDOW)) {
      return { tool: AI_TOOL_NAMES.ACTIVATE_WINDOW, args: { appId } };
    }
    if (available.has(AI_TOOL_NAMES.FIND_APPLICATION)) {
      return { tool: AI_TOOL_NAMES.FIND_APPLICATION, args: { appId } };
    }
    // 자격이 없으면 창 축 대신 다른 tool 로 흘러가지 않는다 — 그대로 텍스트 응답이다.
    return null;
  }

  if (looksLikeStoreScopedRequest(message) && available.has(AI_TOOL_NAMES.GET_STORE_CONTEXT)) {
    return { tool: AI_TOOL_NAMES.GET_STORE_CONTEXT, args: {} };
  }
  if (looksLikeLocalScopedRequest(message)) {
    if (asksForSystemInfo(message) && available.has(AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO)) {
      return { tool: AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO, args: {} };
    }
    if (available.has(AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS)) {
      return { tool: AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS, args: {} };
    }
  }
  return null;
}

/**
 * tool 결과를 system prompt 에 덧붙일 문장으로 바꾼다.
 *
 * 구조체를 통째로 넘기지 않는다(§17) — 사람이 읽는 요약만 넣는다.
 */
export function renderToolContext(result: ToolResult): string | null {
  if (!result.ok || !result.data) return null;
  if (result.tool === AI_TOOL_NAMES.GET_STORE_CONTEXT) {
    const features = (result.data.enabledFeatures as string[] | undefined) ?? [];
    if (features.length === 0) {
      return '## 조회된 매장 정보\n- 현재 매장에서 활성화된 기능이 없습니다.';
    }
    return `## 조회된 매장 정보\n- 현재 매장에서 사용 가능한 기능: ${features.join(', ')}`;
  }
  if (result.tool === AI_TOOL_NAMES.GET_WORK_SCOPE_CONTEXT) {
    return `## 조회된 작업 컨텍스트\n- 업무 공간: ${String(result.data.workspace)}`;
  }
  if (result.tool === AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS) {
    return renderLocalAgentStatus(result.data);
  }
  if (result.tool === AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO) {
    return renderLocalSystemInfo(result.data);
  }
  if (result.tool === AI_TOOL_NAMES.FIND_APPLICATION) {
    return renderFindApplication(result.data);
  }
  if (result.tool === AI_TOOL_NAMES.ACTIVATE_WINDOW) {
    return renderActivateWindow(result.data);
  }
  return null;
}

/**
 * 한글 조사 선택 — 받침이 있으면 `이/은`, 없으면 `가/는`.
 *
 * 등재 앱 표시 이름이 늘어날 때마다 문장을 따로 쓰지 않기 위한 최소 처리다.
 * 한글이 아니면(예: 영문 이름) 받침 없는 쪽을 쓴다.
 */
function withSubjectParticle(name: string, hasBatchim: string, noBatchim: string): string {
  const last = name.charCodeAt(name.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const batchim = isHangul && (last - 0xac00) % 28 !== 0;
  return `${name}${batchim ? hasBatchim : noBatchim}`;
}

/** 미실행 안내 (§14·§37). 오류 코드를 그대로 노출하지 않고 사용자 문장으로 바꾼다. */
function renderNotRunning(displayName: string): string {
  return (
    '## 프로그램 상태\n' +
    `- ${withSubjectParticle(displayName, '이', '가')} 실행되고 있지 않습니다.\n` +
    '- 사용자에게 "프로그램을 먼저 실행해 주세요" 라고 안내하세요. ' +
    'O4O 는 프로그램을 대신 실행하지 않습니다.'
  );
}

/**
 * 창 축 공통 실패 문장.
 *
 * 미실행 · 미등재 · 창 다수 · 연결 없음은 **서로 다른 상황**이라 문장을 나눈다.
 * 여기서 뭉뚱그리면 모델이 "실행해 주세요" 를 엉뚱한 상황에도 말하게 된다.
 */
function renderWindowFailure(data: Record<string, unknown>, displayName: string): string | null {
  const code = String(data.errorCode ?? '');
  if (code === LOCAL_AGENT_ERROR.APP_NOT_RUNNING) return renderNotRunning(displayName);
  if (code === LOCAL_AGENT_ERROR.APP_NOT_REGISTERED) {
    return '## 프로그램 상태\n- 이 프로그램은 O4O 가 다룰 수 있도록 등록되어 있지 않습니다.';
  }
  if (code === LOCAL_AGENT_ERROR.APP_WINDOW_AMBIGUOUS) {
    const count = Number(data.windowCount ?? 0);
    return (
      '## 프로그램 상태\n' +
      `- ${displayName} 창이 ${count}개 열려 있어 어느 창인지 확정할 수 없습니다.\n` +
      '- 어느 창을 사용할지 확인이 필요합니다. 임의로 한 창을 고르지 마세요.'
    );
  }
  if (code === LOCAL_AGENT_ERROR.WINDOW_ACTIVATION_FAILED) {
    return (
      '## 프로그램 상태\n' +
      `- ${displayName} 창을 앞으로 가져오지 못했습니다.\n` +
      '- 사용자가 직접 창을 선택해야 할 수 있습니다.'
    );
  }
  if (code === LOCAL_AGENT_ERROR.AMBIGUOUS) {
    return '## 프로그램 상태\n- 연결된 PC가 여러 대여서 어느 PC인지 확정할 수 없습니다.';
  }
  if (code === LOCAL_AGENT_ERROR.TIMEOUT) {
    return '## 프로그램 상태\n- 이 PC의 에이전트가 제한 시간 안에 응답하지 않았습니다.';
  }
  return null;
}

function renderFindApplication(data: Record<string, unknown>): string {
  const displayName = String(data.displayName ?? '해당 프로그램');
  if (data.available !== true) {
    return (
      renderWindowFailure(data, displayName) ??
      '## 프로그램 상태\n' +
        '- 현재 이 PC의 Local Work Agent가 연결되어 있지 않아 확인할 수 없습니다.\n' +
        '- 추측해서 답하지 마세요.'
    );
  }
  const count = Number(data.windowCount ?? 0);
  return `## 프로그램 상태\n- ${displayName} 실행 중입니다. (창 ${count}개)`;
}

function renderActivateWindow(data: Record<string, unknown>): string {
  const displayName = String(data.displayName ?? '해당 프로그램');
  if (data.available !== true || data.activated !== true) {
    return (
      renderWindowFailure(data, displayName) ??
      '## 프로그램 상태\n' +
        '- 현재 이 PC의 Local Work Agent가 연결되어 있지 않아 창을 활성화할 수 없습니다.\n' +
        '- 추측해서 답하지 마세요.'
    );
  }
  const restored = data.restored === true ? ' (최소화된 창을 복원했습니다)' : '';
  return `## 프로그램 상태\n- ${displayName} 창을 앞으로 가져왔습니다.${restored}`;
}

function renderLocalAgentStatus(data: Record<string, unknown>): string {
  const notConnected =
    '## 로컬 에이전트 상태\n- 현재 이 PC의 Local Work Agent가 연결되어 있지 않습니다.\n' +
    '- PC의 실제 상태·파일·프로그램 정보는 확인할 수 없습니다. 추측해서 답하지 마세요.';

  if (data.connected !== true) {
    if (data.reason === 'AMBIGUOUS') {
      return (
        '## 로컬 에이전트 상태\n' +
        '- 연결된 PC가 여러 대여서 어느 PC인지 확정할 수 없습니다.\n' +
        '- 어느 PC를 사용할지 확인이 필요합니다. 임의로 한 대를 고르지 마세요.'
      );
    }
    return notConnected;
  }

  const name = (data.deviceName as string) || '이 PC';
  return (
    '## 로컬 에이전트 상태\n' +
    `- 연결됨: ${name} (${String(data.platform)}, agent ${String(data.agentVersion)})`
  );
}

function renderLocalSystemInfo(data: Record<string, unknown>): string {
  if (data.available !== true) {
    const code = String(data.errorCode ?? '');
    // 오류 코드를 사용자에게 그대로 노출하지 않는다. 상황별 문장으로 바꾼다.
    if (code === LOCAL_AGENT_ERROR.AMBIGUOUS) {
      return '## 로컬 시스템 정보\n- 연결된 PC가 여러 대여서 어느 PC인지 확정할 수 없습니다.';
    }
    if (code === LOCAL_AGENT_ERROR.TIMEOUT) {
      return '## 로컬 시스템 정보\n- 이 PC의 에이전트가 제한 시간 안에 응답하지 않았습니다.';
    }
    return (
      '## 로컬 시스템 정보\n' +
      '- 현재 이 PC의 Local Work Agent가 연결되어 있지 않아 정보를 확인할 수 없습니다.\n' +
      '- 추측해서 답하지 마세요.'
    );
  }

  const info = (data.systemInfo as Record<string, string>) ?? {};
  const lines = [
    info.osName ? `- 운영체제: ${info.osName}` : null,
    info.osVersion ? `- 버전: ${info.osVersion}` : null,
    info.architecture ? `- 아키텍처: ${info.architecture}` : null,
    info.agentVersion ? `- 에이전트 버전: ${info.agentVersion}` : null,
  ].filter(Boolean);

  if (lines.length === 0) {
    return '## 로컬 시스템 정보\n- 조회된 정보가 없습니다.';
  }
  return `## 로컬 시스템 정보\n${lines.join('\n')}`;
}
