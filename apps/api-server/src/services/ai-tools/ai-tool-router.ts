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
  composeComputerAction,
  composeSiteAction,
  LOCAL_AGENT_ACTIONS,
  LOCAL_AGENT_ERROR,
  LOCAL_DATA_META_KEYS,
  LOCAL_DATA_SETTING_KEYS,
  pickSafeBrowserInfo,
  pickSafeComputerInfo,
  pickSafeDataInfo,
  pickSafeSystemInfo,
  pickSafeWindowInfo,
} from '../local-agent/local-agent-protocol.js';
import { textDenyReason } from '../local-agent/computer-use-contract.js';
import { windowsAppDisplayName, WINDOWS_APP_IDS } from '../local-agent/windows-app-registry.js';
import { browserSiteDisplayName, BROWSER_SITE_IDS } from '../local-agent/browser-site-registry.js';
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

// ─── Browser Control executors (WO-O4O-BROWSER-CONTROL-V0) ───────────────────

/**
 * 브라우저 축 tool 의 공통 왕복 — 창 축과 **같은 배관**을 쓴다(§43). 새 protocol 없음.
 *
 * 다른 점은 하나뿐이다: siteId 가 allowlist 에 등재된 action 문자열 안에 실려 간다.
 * **URL 은 어디에도 실리지 않는다.** 서버는 URL 을 모른 채 siteId 만 보내고, agent 가
 * 자기 등재부에서 URL 을 꺼낸다(§14·§44).
 */
async function executeBrowserSiteAction(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  tool: string,
  baseAction: string,
  siteId: string,
): Promise<ToolResult> {
  const displayName = browserSiteDisplayName(siteId);

  const resolution = await resolveTargetDevice(dataSource, ctx.userId);
  if (resolution.status !== 'ok') {
    const errorCode =
      resolution.status === 'none'
        ? LOCAL_AGENT_ERROR.NO_DEVICE
        : resolution.status === 'ambiguous'
          ? LOCAL_AGENT_ERROR.AMBIGUOUS
          : LOCAL_AGENT_ERROR.OFFLINE;
    return { ok: true, tool, data: { available: false, siteId, displayName, errorCode } };
  }

  const issued = await issueCommand(dataSource, {
    userId: ctx.userId,
    deviceId: resolution.device.id,
    action: composeSiteAction(baseAction, siteId),
    toolName: tool,
  });
  if (issued.ok === false) {
    return { ok: true, tool, data: { available: false, siteId, displayName, errorCode: issued.errorCode } };
  }

  const result = await awaitCommandResult(dataSource, issued.command.commandId);
  const safe = pickSafeBrowserInfo(result.data);

  // §47 안전 로그 — siteId · action · 성공 여부 · browserType · deviceId 까지만.
  // URL 은 registry 상수라도 기록하지 않는다(§47). 탭·cookie·프로필은 애초에 값 안에 없다.
  logger.info('local-agent browser command', {
    tool,
    siteId,
    status: result.status,
    errorCode: result.errorCode ?? null,
    browserType: safe.browserType ?? null,
    deviceId: resolution.device.id,
  });

  if (result.status !== 'success') {
    return {
      ok: true,
      tool,
      data: {
        available: false,
        siteId,
        displayName,
        errorCode: result.errorCode ?? LOCAL_AGENT_ERROR.EXECUTION_FAILED,
      },
    };
  }

  // displayName 은 서버 registry 값으로 덮어쓴다 — agent 주장을 그대로 읽어주지 않는다.
  return { ok: true, tool, data: { available: true, ...safe, siteId, displayName } };
}

/** 브라우저가 떠 있는가 (§13). 아무것도 열지 않는다. */
function executeGetSiteStatus(dataSource: DataSource, ctx: VerifiedToolContext, siteId: string) {
  return executeBrowserSiteAction(
    dataSource, ctx,
    AI_TOOL_NAMES.BROWSER_GET_SITE_STATUS,
    LOCAL_AGENT_ACTIONS.BROWSER_GET_SITE_STATUS,
    siteId,
  );
}

/**
 * 등재 사이트를 연다 (§14·§25). **한 요청에서 열기는 최대 1회**다 — 이 호출이 그 한 번이다.
 * 로그인은 하지 않는다. 열린 뒤의 로그인은 사용자가 사이트 안에서 직접 한다(§4·§18).
 */
function executeOpenSite(dataSource: DataSource, ctx: VerifiedToolContext, siteId: string) {
  return executeBrowserSiteAction(
    dataSource, ctx,
    AI_TOOL_NAMES.BROWSER_OPEN_SITE,
    LOCAL_AGENT_ACTIONS.BROWSER_OPEN_SITE,
    siteId,
  );
}

// ─── Local Data executors (WO-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1) ─────────

/**
 * 로컬 데이터 축 tool 의 공통 왕복 — 창·브라우저 축과 **같은 배관**을 쓴다(§7·§27). 새 protocol 없음.
 *
 * 다른 점: action 이 #appId·#siteId 접미사 없는 순수 base action 이고, `local.data.get_meta` ·
 * `local.data.set_setting` 은 **좁은 structured args**(`{ key }` · `{ key, value }`)를 함께 싣는다.
 * args 는 Computer Use 와 같은 일회성 채널(result_data)로 실려 claim 시 지워진다 — cloud DB
 * migration = 0 (§8). issueCommand 가 `validateLocalCommandArgs` 로 args 를 서버에서 한 번 더
 * 검사하고, agent 도 자기 쪽에서 재검사한다(§14·§15).
 *
 * 돌아온 데이터는 `pickSafeDataInfo` 를 **두 번** 통과한다 — service 저장 시 한 번, 여기서 프롬프트로
 * 보내기 전 한 번 더. agent 가 무엇을 실어 보내든 local.db 경로 · 임의 row · imported 원자료 ·
 * setting **값 원문** · credential 은 이 문을 지나지 못한다(§18·§19·§20).
 */
async function executeLocalDataAction(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  tool: string,
  action: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const resolution = await resolveTargetDevice(dataSource, ctx.userId);
  if (resolution.status !== 'ok') {
    const errorCode =
      resolution.status === 'none'
        ? LOCAL_AGENT_ERROR.NO_DEVICE
        : resolution.status === 'ambiguous'
          ? LOCAL_AGENT_ERROR.AMBIGUOUS
          : LOCAL_AGENT_ERROR.OFFLINE;
    return { ok: true, tool, data: { available: false, errorCode } };
  }

  const issued = await issueCommand(dataSource, {
    userId: ctx.userId,
    deviceId: resolution.device.id,
    action,
    toolName: tool,
    args,
  });
  // strictNullChecks 가 꺼져 있어 `!issued.ok` 로는 union 이 좁혀지지 않는다.
  if (issued.ok === false) {
    return { ok: true, tool, data: { available: false, errorCode: issued.errorCode } };
  }

  const result = await awaitCommandResult(dataSource, issued.command.commandId);
  const safe = pickSafeDataInfo(result.data);

  // §20 안전 로그 — tool · action · 상태 · errorCode · deviceId 까지만. setting **값** · local.db
  // 경로 · imported 원자료 · credential 은 애초에 이 값 안에 없다(pickSafeDataInfo 화이트리스트).
  // key 는 allowlist 등재분이라 로그에 남겨도 민감하지 않다(값이 아니다).
  logger.info('local-agent data command', {
    tool,
    status: result.status,
    errorCode: result.errorCode ?? null,
    key: typeof safe.key === 'string' ? safe.key : null,
    deviceId: resolution.device.id,
  });

  if (result.status !== 'success') {
    return {
      ok: true,
      tool,
      data: { available: false, errorCode: result.errorCode ?? LOCAL_AGENT_ERROR.EXECUTION_FAILED },
    };
  }
  return { ok: true, tool, data: { available: true, ...safe } };
}

/** 로컬 데이터 저장소 상태 (§5·§19). 인자 없음. DB 경로는 돌려주지 않는다. */
function executeLocalDataHealth(dataSource: DataSource, ctx: VerifiedToolContext): Promise<ToolResult> {
  return executeLocalDataAction(
    dataSource, ctx,
    AI_TOOL_NAMES.DATA_LOCAL_HEALTH,
    LOCAL_AGENT_ACTIONS.DATA_HEALTH,
    {},
  );
}

/** allowlist 된 meta 키 하나 조회 (§5·§6). key 는 validateToolArguments 를 통과한 등재분이다. */
function executeLocalDataGetMeta(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  key: string,
): Promise<ToolResult> {
  return executeLocalDataAction(
    dataSource, ctx,
    AI_TOOL_NAMES.DATA_GET_LOCAL_META,
    LOCAL_AGENT_ACTIONS.DATA_GET_META,
    { key },
  );
}

/**
 * allowlist 된 setting 키에 검증된 값 저장 (§5·§6·§13). key·value 는 validateToolArguments 를
 * 통과한 값이고, issueCommand 가 같은 규칙으로 서버에서 한 번 더 검사한다. **명시적 요청일 때만**
 * 호출된다 — 선택 규칙이 쓰기 지시어를 요구한다(§13).
 */
function executeLocalDataSetSetting(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  key: string,
  value: unknown,
): Promise<ToolResult> {
  return executeLocalDataAction(
    dataSource, ctx,
    AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING,
    LOCAL_AGENT_ACTIONS.DATA_SET_SETTING,
    { key, value },
  );
}

// ─── Router ──────────────────────────────────────────────────────────────────

/**
 * tool 1개를 실행한다. **agent loop 없음** — 호출부가 최대 1회만 부른다(§20).
 *
 * 실행 직전 재검증 순서(§14): 등록부 확인 → capability 재확인 → 인자 검증 → executor.
 */
// ─── Computer Use executors (WO-O4O-COMPUTER-USE-V0 §7·§9·§30·§31) ────────────

/**
 * 화면 조작 tool 의 공통 왕복.
 *
 * 상호작용(click · type_text · key)은 **두 명령**으로 이뤄진다:
 *   1. `local.activate_window#targetId` — 대상 창을 앞으로 (§2 "창 탐색/활성화 → Computer Use").
 *      실행 중이 아니면 여기서 끝난다(§38 "메모장을 먼저 실행해 주세요").
 *   2. `local.computer.<action>#targetId` — agent 가 실행 직전·직후 foreground 를 다시 확인한다(§9).
 * inspect 는 읽기이므로 활성화하지 않는다 — "앞에 있는가" 를 그대로 보고한다.
 *
 * 한 요청당 명령은 최대 2개, 상호작용은 정확히 1개다(§31). 결과를 보고 다음 행동을 고르는
 * 루프는 없다 — 다음 행동은 사용자의 다음 문장이다(§30).
 */
async function executeComputerAction(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
  tool: string,
  baseAction: string,
  targetId: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const displayName = windowsAppDisplayName(targetId);
  const fail = (errorCode: string, extra: Record<string, unknown> = {}): ToolResult => ({
    ok: true,
    tool,
    data: { available: false, targetId, displayName, errorCode, ...extra },
  });

  const resolution = await resolveTargetDevice(dataSource, ctx.userId);
  if (resolution.status !== 'ok') {
    return fail(
      resolution.status === 'none'
        ? LOCAL_AGENT_ERROR.NO_DEVICE
        : resolution.status === 'ambiguous'
          ? LOCAL_AGENT_ERROR.AMBIGUOUS
          : LOCAL_AGENT_ERROR.OFFLINE,
    );
  }
  const deviceId = resolution.device.id;

  if (baseAction !== LOCAL_AGENT_ACTIONS.COMPUTER_INSPECT) {
    const activate = await issueCommand(dataSource, {
      userId: ctx.userId,
      deviceId,
      action: composeAppAction(LOCAL_AGENT_ACTIONS.ACTIVATE_WINDOW, targetId),
      toolName: tool,
    });
    if (activate.ok === false) return fail(activate.errorCode);
    const activated = await awaitCommandResult(dataSource, activate.command.commandId);
    const win = pickSafeWindowInfo(activated.data);
    logger.info('local-agent computer command', {
      tool,
      targetId,
      step: 'activate',
      status: activated.status,
      errorCode: activated.errorCode ?? null,
      windowCount: win.windowCount ?? null,
      deviceId,
    });
    if (activated.status !== 'success' || win.activated !== true) {
      return fail(activated.errorCode ?? LOCAL_AGENT_ERROR.WINDOW_ACTIVATION_FAILED, {
        windowCount: win.windowCount ?? 0,
      });
    }
  }

  const issued = await issueCommand(dataSource, {
    userId: ctx.userId,
    deviceId,
    action: composeComputerAction(baseAction, targetId),
    toolName: tool,
    args,
  });
  if (issued.ok === false) return fail(issued.errorCode);

  const result = await awaitCommandResult(dataSource, issued.command.commandId);
  const safe = pickSafeComputerInfo(result.data);

  // §43 안전 로그 — deviceId · targetId · tool · 상태 · 코드 · 시각만. 입력한 텍스트 · 좌표 ·
  // 창 제목 · 이미지는 이 값 안에 애초에 없다(pickSafeComputerInfo 화이트리스트).
  logger.info('local-agent computer command', {
    tool,
    targetId,
    step: 'action',
    status: result.status,
    errorCode: result.errorCode ?? null,
    deviceId,
  });

  if (result.status !== 'success') {
    return fail(result.errorCode ?? LOCAL_AGENT_ERROR.EXECUTION_FAILED, safe);
  }
  return { ok: true, tool, data: { available: true, targetId, displayName, ...safe } };
}

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
    // siteId 도 `validateToolArguments` 에서 등재부와 대조를 끝낸 값이다(BROWSER-CONTROL-V0 §10).
    case AI_TOOL_NAMES.BROWSER_GET_SITE_STATUS:
      return executeGetSiteStatus(dataSource, ctx, String((args as { siteId: string }).siteId));
    case AI_TOOL_NAMES.BROWSER_OPEN_SITE:
      return executeOpenSite(dataSource, ctx, String((args as { siteId: string }).siteId));
    // 화면 조작 (COMPUTER-USE-V0): targetId · 좌표 · 텍스트 · 키는 `validateToolArguments` 를
    // 통과한 값이고, issueCommand 가 같은 규칙으로 한 번 더 검사한다(§25).
    case AI_TOOL_NAMES.COMPUTER_INSPECT:
    case AI_TOOL_NAMES.COMPUTER_CLICK:
    case AI_TOOL_NAMES.COMPUTER_TYPE_TEXT:
    case AI_TOOL_NAMES.COMPUTER_KEY: {
      const { targetId, ...rest } = args as { targetId: string } & Record<string, unknown>;
      const base =
        name === AI_TOOL_NAMES.COMPUTER_INSPECT
          ? LOCAL_AGENT_ACTIONS.COMPUTER_INSPECT
          : name === AI_TOOL_NAMES.COMPUTER_CLICK
            ? LOCAL_AGENT_ACTIONS.COMPUTER_CLICK
            : name === AI_TOOL_NAMES.COMPUTER_TYPE_TEXT
              ? LOCAL_AGENT_ACTIONS.COMPUTER_TYPE_TEXT
              : LOCAL_AGENT_ACTIONS.COMPUTER_KEY;
      return executeComputerAction(dataSource, ctx, name, base, String(targetId), rest);
    }
    // 로컬 데이터 (LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1): key·value 는 validateToolArguments 를
    // 통과한 값이고, issueCommand 가 같은 규칙(validateLocalCommandArgs)으로 한 번 더 검사한다(§14).
    case AI_TOOL_NAMES.DATA_LOCAL_HEALTH:
      return executeLocalDataHealth(dataSource, ctx);
    case AI_TOOL_NAMES.DATA_GET_LOCAL_META:
      return executeLocalDataGetMeta(dataSource, ctx, String((args as { key: string }).key));
    case AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING: {
      const a = args as { key: string; value: unknown };
      return executeLocalDataSetSetting(dataSource, ctx, String(a.key), a.value);
    }
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
 * 등재 사이트 이름 → siteId (BROWSER-CONTROL-V0 §29·§30).
 *
 * 창 축과 같은 규칙이다: 사용자가 말한 사이트 이름을 등재부와 대조해 siteId 를 고른다.
 * **URL 이 siteId 가 되는 경로는 존재하지 않는다** — "https://... 열어줘" 라고 해도
 * 그 문자열은 어디로도 흐르지 않고, 등재 이름이 없으면 null 이다(§10·§29).
 * 한글은 정규식이 아닌 `\uXXXX` 문자열로 둔다(위 esbuild 주석).
 */
const SITE_INTENT_KEYWORDS: readonly {
  siteId: string;
  ko: readonly string[];
  en: readonly RegExp[];
}[] = [
  {
    siteId: 'o4o.neture',
    ko: [
      '\uB124\uB69C\uB808', // 네뚜레
      'O4O\uD648', // O4O홈 (공백 제거 후)
    ],
    en: [/\bneture\b/i, /\bo4o\s*home\b/i],
  },
];

/** 문장에서 등재 사이트를 찾는다. 여러 개가 걸리면 **고르지 않는다**(임의 선택 금지). */
export function detectRegisteredSite(message: string): string | null {
  const compact = message.replace(/\s+/g, '');
  const hits = SITE_INTENT_KEYWORDS.filter(
    (s) => s.ko.some((k) => compact.includes(k)) || s.en.some((re) => re.test(message)),
  ).map((s) => s.siteId);
  const unique = [...new Set(hits)].filter((id) => BROWSER_SITE_IDS.includes(id));
  return unique.length === 1 ? unique[0] : null;
}

/**
 * "열어줘 / 접속 / 이동" 류의 **열기** 지시어 (§30). 없으면 상태 조회로만 간다.
 * 기본값이 조회인 것이 중요하다 — "네뚜레 열려 있어?" 에 브라우저가 튀어나오면 안 된다.
 */
const OPEN_INTENT_KEYWORDS_KO: readonly string[] = [
  '\uC5F4\uC5B4', // 열어
  '\uC811\uC18D', // 접속
  '\uC774\uB3D9', // 이동
  '\uB744\uC6CC', // 띄워
  '\uCF1C', // 켜
];
const OPEN_INTENT_PATTERNS_EN: readonly RegExp[] = [/\bopen\b/i, /\bgo\s+to\b/i, /\bnavigate\b/i, /\blaunch\b/i];

export function asksForSiteOpen(message: string): boolean {
  const compact = message.replace(/\s+/g, '');
  if (OPEN_INTENT_KEYWORDS_KO.some((k) => compact.includes(k))) return true;
  return OPEN_INTENT_PATTERNS_EN.some((re) => re.test(message));
}

/**
 * 로그인 지시어 (§31·§32). **로그인 automation 은 없다.** 이 판정은 tool 을 바꾸지 않는다 —
 * 열기까지만 수행하고, 프롬프트에 "로그인은 직접 하라" 안내를 넣기 위한 신호일 뿐이다.
 */
const LOGIN_INTENT_KEYWORDS_KO: readonly string[] = ['\uB85C\uADF8\uC778']; // 로그인
const LOGIN_INTENT_PATTERNS_EN: readonly RegExp[] = [/\blog\s*in\b/i, /\bsign\s*in\b/i];

export function asksForLogin(message: string): boolean {
  const compact = message.replace(/\s+/g, '');
  if (LOGIN_INTENT_KEYWORDS_KO.some((k) => compact.includes(k))) return true;
  return LOGIN_INTENT_PATTERNS_EN.some((re) => re.test(message));
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

// ─── Computer Use intents (WO-O4O-COMPUTER-USE-V0 §38) ───────────────────────

/**
 * 입력할 텍스트를 사용자 문장에서 **그대로** 꺼낸다. AI 가 지어내지 않는다(§25·§32).
 *
 *   1) 따옴표 안: '…' "…" ‘…’ “…” 「…」
 *   2) "…라고 써/입력/적어/쳐" — "라고" 앞의 구절
 *
 * 둘 다 없으면 null 이다. 그때는 실행하지 않고 "무엇을 입력할지" 를 되묻는다(§32).
 * 한글은 정규식 리터럴에 두지 않는다(위 esbuild 주석) — `new RegExp` 로 조립한다.
 */
const QUOTE_PAIRS: readonly [string, string][] = [
  ['"', '"'],
  ["'", "'"],
  ['\u201C', '\u201D'], // “ ”
  ['\u2018', '\u2019'], // ‘ ’
  ['\u300C', '\u300D'], // 「 」
];
const RAGO_RE = new RegExp(
  '(\\S.*?)\\s*' +
    '\uB77C\uACE0' + // 라고
    '\\s*(?:\uC368|\uC4F0|\uC785\uB825|\uC801|\uCCD0|\uCE58|\uD0C0\uC774\uD551)', // 써|쓰|입력|적|쳐|치|타이핑
);

export function extractTypeText(message: string): string | null {
  for (const [open, close] of QUOTE_PAIRS) {
    const start = message.indexOf(open);
    if (start < 0) continue;
    const end = message.indexOf(close, start + 1);
    if (end < 0) continue;
    const inner = message.slice(start + 1, end).trim();
    if (inner.length > 0) return inner;
  }
  const m = RAGO_RE.exec(message);
  if (m && m[1]) {
    // "메모장에 테스트라고 써줘" — 앱 이름과 조사가 앞에 붙어 있으면 떼어낸다.
    const cleaned = m[1]
      .replace(
        // "메모장에" · "메모장에다" · "계산기에서" — 등재 앱 이름 + 조사 까지 떼어낸다
        new RegExp('^.*?(?:\uBA54\uBAA8\uC7A5|\uACC4\uC0B0\uAE30)(?:\uC5D0\uB2E4|\uC5D0\uC11C|\uC5D0)?\\s*'),
        '',
      )
      .trim();
    if (cleaned.length > 0) return cleaned;
  }
  return null;
}

const TYPE_INTENT_KEYWORDS_KO: readonly string[] = [
  '\uC368', // 써
  '\uC4F0\uACE0', // 쓰고 ("테스트 쓰고 엔터" — 텍스트까지만)
  '\uC785\uB825', // 입력
  '\uC801\uC5B4', // 적어
  '\uD0C0\uC774\uD551', // 타이핑
  '\uCCD0', // 쳐
];
const TYPE_INTENT_PATTERNS_EN: readonly RegExp[] = [/\btype\b/i, /\bwrite\b/i, /\benter\s+text\b/i];

export function asksForTyping(message: string): boolean {
  const compact = message.replace(/\s+/g, '');
  if (TYPE_INTENT_KEYWORDS_KO.some((k) => compact.includes(k))) return true;
  return TYPE_INTENT_PATTERNS_EN.some((re) => re.test(message));
}

/** 허용키 3개만 이름을 가진다. "F5" · "Ctrl+S" · "윈도우키" 는 여기 없으므로 null 이다(§19·§20). */
const KEY_INTENT: readonly { key: string; ko: readonly string[]; en: readonly RegExp[] }[] = [
  { key: 'ENTER', ko: ['\uC5D4\uD130', '\uC904\uBC14\uAFC8'], en: [/\benter\b(?!\s+text)/i, /\breturn\s+key\b/i] }, // 엔터 · 줄바꿈
  { key: 'TAB', ko: ['\uD0ED\uD0A4', '\uD0ED\uC744', '\uD0ED\uB20C'], en: [/\btab\b/i] }, // 탭키 · 탭을 · 탭눌
  { key: 'ESC', ko: ['\uC774\uC2A4\uCF00\uC774\uD504'], en: [/\besc(?:ape)?\b/i] }, // 이스케이프
];

export function detectAllowedKey(message: string): string | null {
  const compact = message.replace(/\s+/g, '');
  const hits = KEY_INTENT.filter(
    (k) => k.ko.some((w) => compact.includes(w)) || k.en.some((re) => re.test(message)),
  ).map((k) => k.key);
  const unique = [...new Set(hits)];
  return unique.length === 1 ? unique[0] : null;
}

const CLICK_INTENT_KEYWORDS_KO: readonly string[] = ['\uD074\uB9AD']; // 클릭
const CLICK_INTENT_PATTERNS_EN: readonly RegExp[] = [/\bclick\b/i];

export function asksForClick(message: string): boolean {
  const compact = message.replace(/\s+/g, '');
  if (CLICK_INTENT_KEYWORDS_KO.some((k) => compact.includes(k))) return true;
  return CLICK_INTENT_PATTERNS_EN.some((re) => re.test(message));
}

const SCREEN_INTENT_KEYWORDS_KO: readonly string[] = [
  '\uD654\uBA74', // 화면
  '\uCEA1\uCC98', // 캡처
  '\uC2A4\uD06C\uB9B0\uC0F7', // 스크린샷
];
const SCREEN_INTENT_PATTERNS_EN: readonly RegExp[] = [/\bscreen\b/i, /\bcapture\b/i, /\bsnapshot\b/i];

export function asksForScreenInspect(message: string): boolean {
  const compact = message.replace(/\s+/g, '');
  if (SCREEN_INTENT_KEYWORDS_KO.some((k) => compact.includes(k))) return true;
  return SCREEN_INTENT_PATTERNS_EN.some((re) => re.test(message));
}

/**
 * V0 클릭 위치. 화면을 AI 에게 보여주는 경로가 아직 없어(§28 provider 독립 · ai-core F1 동결)
 * 좌표를 고를 근거가 사용자 문장뿐이다. 그래서 V0 는 **client 영역 중앙 한 점**만 클릭한다 —
 * 메모장 같은 단일 편집 영역 앱에서 caret focus 를 주기에 충분하고(§35·§36 B), 그 밖의 위치는
 * 표현하지 않는다. AI 가 좌표를 지어내는 경로는 없다(§25).
 */
export const COMPUTER_DEFAULT_CLICK = Object.freeze({ x: 0.5, y: 0.5 });

/**
 * 화면 조작 요청인데 실행할 수 없는 이유 (§32 "불확실하면 실행하지 않고 안내 후 중지").
 * 라우트가 이 값을 프롬프트 사실로 넘겨 모델이 되묻게 한다. tool 은 선택되지 않는다.
 */
export type ComputerRequestGap = 'TEXT_MISSING' | 'TEXT_DENIED' | 'LOGIN_REQUEST';

export function computerRequestGap(message: string): ComputerRequestGap | null {
  if (!detectRegisteredApp(message)) return null;
  if (asksForLogin(message)) return 'LOGIN_REQUEST';
  if (!asksForTyping(message)) return null;
  const text = extractTypeText(message);
  if (text === null) return 'TEXT_MISSING';
  return textDenyReason(text) ? 'TEXT_DENIED' : null;
}

// ─── Local Data intents (WO-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1 §13) ────────

/**
 * "로컬 데이터 / 데이터 저장소" 류의 로컬 데이터 도메인 지시어.
 *
 * 위 매장·로컬·앱 키워드와 **같은 이유로** 한글을 정규식 리터럴에 두지 않는다(esbuild ascii 함정).
 * 이 표에 걸려야만 데이터 축 tool 을 고려한다 — 걸리지 않으면 데이터 tool 은 선택되지 않는다.
 */
const DATA_INTENT_KEYWORDS_KO: readonly string[] = [
  '로컬데이터', // 로컬데이터
  '데이터저장소', // 데이터저장소
  '로컬디비', // 로컬디비
];
/** ASCII 전용이라 번들 영향이 없다. */
const DATA_INTENT_PATTERNS_EN: readonly RegExp[] = [
  /local\s+data/i,
  /local\s+(?:db|database)/i,
  /data\s+store/i,
];

export function looksLikeLocalDataRequest(message: string): boolean {
  const compact = message.replace(/\s+/g, '');
  if (DATA_INTENT_KEYWORDS_KO.some((k) => compact.includes(k))) return true;
  return DATA_INTENT_PATTERNS_EN.some((re) => re.test(message));
}

/** 저장·변경 지시어. 없으면 데이터 축은 **조회(health/meta)로만** 간다 — 쓰기는 명시 요청뿐(§13). */
const DATA_WRITE_KEYWORDS_KO: readonly string[] = [
  '설정', // 설정
  '변경', // 변경
  '바꿔', // 바꿔
  '저장', // 저장
  '지정', // 지정
];
const DATA_WRITE_PATTERNS_EN: readonly RegExp[] = [/\bset\b/i, /\bchange\b/i, /\bsave\b/i, /\bupdate\b/i];

export function asksForDataWrite(message: string): boolean {
  // '데이터저장소'(data storage)는 조회 의도의 명사인데 '저장'(save)을 부분 문자열로 품는다.
  // 그 명사를 먼저 지워서 "저장소 상태 확인"이 쓰기로 오분류돼 조회가 막히는 일을 없앤다.
  const compact = message.replace(/\s+/g, '').replace(/저장소/g, '');
  if (DATA_WRITE_KEYWORDS_KO.some((k) => compact.includes(k))) return true;
  return DATA_WRITE_PATTERNS_EN.some((re) => re.test(message));
}

/** 스키마 버전 등 meta 조회 지시어 → 등재 meta 키. 표에 없으면 null(임의 키 없음, §6). */
const META_INTENT: readonly { key: string; ko: readonly string[]; en: readonly RegExp[] }[] = [
  {
    key: 'schema_version',
    ko: ['스키마', '버전'], // 스키마 · 버전
    en: [/schema\s*version/i, /\bschema\b/i],
  },
];

export function detectDataMetaKey(message: string): string | null {
  const compact = message.replace(/\s+/g, '');
  const hits = META_INTENT.filter(
    (m) => m.ko.some((k) => compact.includes(k)) || m.en.some((re) => re.test(message)),
  ).map((m) => m.key);
  const unique = [...new Set(hits)].filter((k) => LOCAL_DATA_META_KEYS.includes(k));
  return unique.length === 1 ? unique[0] : null;
}

/**
 * 명시적 설정 쓰기 → `{ key, value }`. **좁은 표에 있는 것만** 잡는다(§10·§11):
 *   - locale                  ← 한국어/영어/중국어/일본어 (언어 설정)
 *   - preferred_export_format ← CSV (내보내기 형식)
 * selected_source_profile 처럼 자유 식별자 값은 자연어에서 안전하게 뽑을 수 없어 여기서
 * 고르지 않는다 — 그 키는 tool 을 직접 호출하는 경로(테스트·후속 UI)로만 설정된다.
 * 여러 개가 동시에 걸리면 **고르지 않는다**(임의 선택 금지).
 */
const SETTING_INTENT: readonly {
  key: string;
  value: string;
  ko: readonly string[];
  en: readonly RegExp[];
}[] = [
  { key: 'locale', value: 'ko', ko: ['한국어', '한글'], en: [/\bkorean\b/i] }, // 한국어 · 한글
  { key: 'locale', value: 'en', ko: ['영어'], en: [/\benglish\b/i] }, // 영어
  { key: 'locale', value: 'zh', ko: ['중국어'], en: [/\bchinese\b/i] }, // 중국어
  { key: 'locale', value: 'ja', ko: ['일본어'], en: [/\bjapanese\b/i] }, // 일본어
  {
    key: 'preferred_export_format',
    value: 'csv',
    ko: ['내보내기', '형식'], // 내보내기 · 형식
    en: [/export\s*format/i],
  },
];

export function detectDataSetting(message: string): { key: string; value: string } | null {
  const compact = message.replace(/\s+/g, '');
  const csv = /\bcsv\b/i.test(message);
  const hits = SETTING_INTENT.filter((s) => {
    if (s.value === 'csv') {
      // 내보내기 형식은 CSV 라는 값 자체가 문장에 있어야 확정한다.
      return csv && (s.ko.some((k) => compact.includes(k)) || s.en.some((re) => re.test(message)));
    }
    return s.ko.some((k) => compact.includes(k)) || s.en.some((re) => re.test(message));
  });
  const unique = [...new Map(hits.map((h) => [`${h.key}:${h.value}`, h])).values()].filter((h) =>
    LOCAL_DATA_SETTING_KEYS.includes(h.key),
  );
  if (unique.length !== 1) return null;
  return { key: unique[0].key, value: unique[0].value };
}

/**
 * 데이터 축에서 실행할 tool 을 고른다. 순서 = 명시적 쓰기 → meta 조회 → health.
 *
 * 자격은 available 로 이미 필터된다(set_setting 은 LOCAL_DATA_SETTING_WRITE 가 있어야 후보).
 * 쓰기는 **쓰기 지시어 + 확정 가능한 {key,value}** 둘 다 있어야만 선택한다(§13).
 */
function selectDataToolInvocation(
  message: string,
  available: Set<string>,
): AiToolInvocation | null {
  if (asksForDataWrite(message)) {
    const setting = detectDataSetting(message);
    if (setting && available.has(AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING)) {
      return { tool: AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING, args: setting };
    }
    // 쓰기를 원했지만 어떤 값인지 확정할 수 없으면 **조회로 흘려보내지 않고** 멈춘다 —
    // 임의 설정을 저장하지 않는다. 안내는 모델이 한다.
    return null;
  }
  const metaKey = detectDataMetaKey(message);
  if (metaKey && available.has(AI_TOOL_NAMES.DATA_GET_LOCAL_META)) {
    return { tool: AI_TOOL_NAMES.DATA_GET_LOCAL_META, args: { key: metaKey } };
  }
  if (available.has(AI_TOOL_NAMES.DATA_LOCAL_HEALTH)) {
    return { tool: AI_TOOL_NAMES.DATA_LOCAL_HEALTH, args: {} };
  }
  return null;
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

/**
 * 서버가 local device 를 조회해야 하는 요청인가.
 *
 * 라우트는 **모든** home-chat 요청마다 device 테이블을 읽지 않는다(§20 정신: 필요한
 * 때만 본다). 그 판단을 라우트가 자기 나름으로 하면 라우터의 선택 규칙과 어긋난다 —
 * 실제로 창 축이 그렇게 어긋났다. "메모장 열려 있어?" 에는 로컬 지시어("내 PC")가
 * 없어서 device 를 조회하지 않았고, 그 결과 창 축 capability 가 비어 tool 이 하나도
 * 고려되지 않았다. **선택 규칙과 같은 판정을 여기서 한 번에 준다.**
 */
export function needsLocalDeviceResolution(message: string): boolean {
  return (
    looksLikeLocalScopedRequest(message) ||
    detectRegisteredApp(message) !== null ||
    // BROWSER-CONTROL-V0: 사이트 축도 PC 가 있어야 성립한다.
    detectRegisteredSite(message) !== null ||
    // LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1: 데이터 축도 연결된 PC 의 local.db 가 있어야 성립한다.
    looksLikeLocalDataRequest(message)
  );
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

  // 사이트 축 (BROWSER-CONTROL-V0 §29·§30). 창 축과 동시에 걸리면 **고르지 않는다** —
  // "메모장이랑 네뚜레 열어줘" 를 한쪽만 임의로 실행하지 않는다.
  const siteId = detectRegisteredSite(message);
  const appIdEarly = detectRegisteredApp(message);
  if (siteId && appIdEarly) return null;
  if (siteId) {
    // 로그인 요청(§31)도 여기로 온다 — 열기까지만 수행한다. 로그인 tool 은 존재하지 않는다(§32).
    if (asksForSiteOpen(message) || asksForLogin(message)) {
      if (available.has(AI_TOOL_NAMES.BROWSER_OPEN_SITE)) {
        return { tool: AI_TOOL_NAMES.BROWSER_OPEN_SITE, args: { siteId } };
      }
      return null;
    }
    if (available.has(AI_TOOL_NAMES.BROWSER_GET_SITE_STATUS)) {
      return { tool: AI_TOOL_NAMES.BROWSER_GET_SITE_STATUS, args: { siteId } };
    }
    return null;
  }

  // 창 축이 먼저다. "메모장 열려 있어?" 는 로컬 축 키워드("내 PC")가 없어도 성립해야 한다(§37).
  const appId = detectRegisteredApp(message);
  if (appId) {
    // 화면 조작 축 (COMPUTER-USE-V0 §38). 순서 = 텍스트 → 키 → 클릭 → 화면 확인.
    // 한 문장에 여럿이 있어도 **하나만** 고른다(§31) — "테스트 쓰고 엔터" 는 텍스트까지다.
    // 로그인 요청은 화면 조작 tool 을 고르지 않는다(§17 "로그인 단계에서는 type_text 금지" · §34).
    if (!asksForLogin(message)) {
      if (asksForTyping(message)) {
        const text = extractTypeText(message);
        // 텍스트가 없거나 금지 내용이면 실행하지 않는다 — computerRequestGap 이 사유를 준다(§32).
        if (text === null || textDenyReason(text) !== null) return null;
        if (available.has(AI_TOOL_NAMES.COMPUTER_TYPE_TEXT)) {
          return { tool: AI_TOOL_NAMES.COMPUTER_TYPE_TEXT, args: { targetId: appId, text } };
        }
        return null;
      }
      const key = detectAllowedKey(message);
      if (key && available.has(AI_TOOL_NAMES.COMPUTER_KEY)) {
        return { tool: AI_TOOL_NAMES.COMPUTER_KEY, args: { targetId: appId, key } };
      }
      if (asksForClick(message) && available.has(AI_TOOL_NAMES.COMPUTER_CLICK)) {
        return {
          tool: AI_TOOL_NAMES.COMPUTER_CLICK,
          args: { targetId: appId, ...COMPUTER_DEFAULT_CLICK },
        };
      }
      if (asksForScreenInspect(message) && available.has(AI_TOOL_NAMES.COMPUTER_INSPECT)) {
        return { tool: AI_TOOL_NAMES.COMPUTER_INSPECT, args: { targetId: appId } };
      }
    }
    if (asksForWindowActivation(message) && available.has(AI_TOOL_NAMES.ACTIVATE_WINDOW)) {
      return { tool: AI_TOOL_NAMES.ACTIVATE_WINDOW, args: { appId } };
    }
    if (available.has(AI_TOOL_NAMES.FIND_APPLICATION)) {
      return { tool: AI_TOOL_NAMES.FIND_APPLICATION, args: { appId } };
    }
    // 자격이 없으면 창 축 대신 다른 tool 로 흘러가지 않는다 — 그대로 텍스트 응답이다.
    return null;
  }

  // 로컬 데이터 축 (LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1 §13). 앱·사이트 축이 아니고
  // "로컬 데이터/데이터 저장소" 지시어에 걸릴 때만. 데이터 키워드는 앱 이름과 겹치지 않는다.
  if (looksLikeLocalDataRequest(message)) {
    const dataInvocation = selectDataToolInvocation(message, available);
    if (dataInvocation) return dataInvocation;
    // 데이터 요청인데 자격이 없으면 다른 축으로 새지 않는다 — 그대로 텍스트 응답이다.
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
  if (result.tool === AI_TOOL_NAMES.BROWSER_GET_SITE_STATUS) {
    return renderSiteStatus(result.data);
  }
  if (result.tool === AI_TOOL_NAMES.BROWSER_OPEN_SITE) {
    return renderOpenSite(result.data);
  }
  if (
    result.tool === AI_TOOL_NAMES.COMPUTER_INSPECT ||
    result.tool === AI_TOOL_NAMES.COMPUTER_CLICK ||
    result.tool === AI_TOOL_NAMES.COMPUTER_TYPE_TEXT ||
    result.tool === AI_TOOL_NAMES.COMPUTER_KEY
  ) {
    return renderComputerAction(result.tool, result.data);
  }
  if (result.tool === AI_TOOL_NAMES.DATA_LOCAL_HEALTH) {
    return renderDataHealth(result.data);
  }
  if (result.tool === AI_TOOL_NAMES.DATA_GET_LOCAL_META) {
    return renderDataGetMeta(result.data);
  }
  if (result.tool === AI_TOOL_NAMES.DATA_SET_LOCAL_SETTING) {
    return renderDataSetSetting(result.data);
  }
  return null;
}

// ─── Local Data renderers (WO-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1 §19) ──────

const DATA_HEADER = '## 로컬 데이터 상태\n';

/** 데이터 축 공통 실패 문장. local.db 경로 · 값은 애초에 data 안에 없다. */
function renderDataFailure(data: Record<string, unknown>): string {
  const code = String(data.errorCode ?? '');
  if (code === LOCAL_AGENT_ERROR.AMBIGUOUS) {
    return DATA_HEADER + '- 연결된 PC가 여러 대여서 어느 PC인지 확정할 수 없습니다.';
  }
  if (code === LOCAL_AGENT_ERROR.TIMEOUT) {
    return DATA_HEADER + '- 이 PC의 에이전트가 제한 시간 안에 응답하지 않았습니다.';
  }
  if (code === LOCAL_AGENT_ERROR.DATA_DB_NOT_AVAILABLE) {
    return DATA_HEADER + '- 이 PC의 로컬 데이터 저장소를 사용할 수 없습니다.';
  }
  if (code === LOCAL_AGENT_ERROR.DATA_KEY_NOT_ALLOWED) {
    return DATA_HEADER + '- 요청한 항목은 조회·저장이 허용되지 않은 키입니다.';
  }
  if (code === LOCAL_AGENT_ERROR.DATA_INVALID_ARGUMENT) {
    return DATA_HEADER + '- 요청 값이 허용 범위를 벗어나 저장하지 않았습니다.';
  }
  if (code === LOCAL_AGENT_ERROR.DATA_WRITE_FAILED) {
    return DATA_HEADER + '- 로컬 데이터 저장소에 값을 저장하지 못했습니다.';
  }
  return (
    DATA_HEADER +
    '- 현재 이 PC의 Local Work Agent가 연결되어 있지 않아 로컬 데이터를 확인할 수 없습니다.\n' +
    '- 추측해서 답하지 마세요.'
  );
}

function renderDataHealth(data: Record<string, unknown>): string {
  if (data.available !== true) return renderDataFailure(data);
  const ok = data.ok === true;
  const ver = typeof data.schemaVersion === 'number' ? ` 스키마 버전 ${data.schemaVersion}.` : '';
  const status =
    data.migrationStatus === 'current'
      ? ' 스키마가 최신입니다.'
      : data.migrationStatus === 'behind'
        ? ' 스키마 갱신이 필요합니다.'
        : data.migrationStatus === 'failed'
          ? ' 스키마 갱신에 실패했습니다.'
          : '';
  return (
    DATA_HEADER +
    (ok
      ? `- 로컬 데이터 저장소가 정상입니다.${ver}${status}`
      : `- 로컬 데이터 저장소에 문제가 있습니다.${ver}${status}`)
  );
}

function renderDataGetMeta(data: Record<string, unknown>): string {
  if (data.available !== true) return renderDataFailure(data);
  const key = typeof data.key === 'string' ? data.key : null;
  if (!key) return DATA_HEADER + '- 요청한 항목의 값을 찾지 못했습니다.';
  const value = typeof data.value === 'string' ? data.value : null;
  if (value === null) return DATA_HEADER + `- 항목 "${key}" 은(는) 아직 값이 없습니다.`;
  return DATA_HEADER + `- ${key}: ${value}`;
}

function renderDataSetSetting(data: Record<string, unknown>): string {
  if (data.available !== true || data.saved !== true) return renderDataFailure(data);
  const key = typeof data.key === 'string' ? data.key : '요청한 설정';
  // 값 원문은 프롬프트에 싣지 않는다(§19) — "저장했다" 는 사실과 키만 말한다.
  return DATA_HEADER + `- 설정 "${key}" 을(를) 저장했습니다.`;
}

// ─── Computer Use renderers (WO-O4O-COMPUTER-USE-V0 §38·§41·§42·§45) ────────

const COMPUTER_HEADER = '## 화면 조작 상태\n';

/** 화면 조작 실패 문장. 창 축 실패(미실행 · 창 다수 · 연결 없음)는 창 축 문장을 그대로 쓴다. */
function renderComputerFailure(data: Record<string, unknown>, displayName: string): string {
  const code = String(data.errorCode ?? '');
  if (code === LOCAL_AGENT_ERROR.COMPUTER_TARGET_NOT_FOUND) return renderNotRunning(displayName);
  if (code === LOCAL_AGENT_ERROR.COMPUTER_TARGET_LOST) {
    return (
      COMPUTER_HEADER +
      `- ${displayName} 창이 앞에 있지 않아 입력을 보내지 않았습니다. 다른 창이 앞에 있습니다.\n` +
      '- 사용자에게 해당 창을 앞으로 가져온 뒤 다시 요청해 달라고 안내하세요.'
    );
  }
  if (code === LOCAL_AGENT_ERROR.COMPUTER_OUT_OF_BOUNDS) {
    return COMPUTER_HEADER + '- 지정한 위치가 창 영역 밖이어서 클릭하지 않았습니다.';
  }
  if (code === LOCAL_AGENT_ERROR.COMPUTER_USER_ACTION_REQUIRED) {
    return (
      COMPUTER_HEADER +
      '- 로그인 창 · 파일 대화상자 · 팝업처럼 사용자가 직접 처리해야 하는 화면이 앞에 있어 실행을 멈췄습니다.\n' +
      '- O4O 는 로그인 · 비밀번호 · 저장 · 확인 버튼을 대신 누르지 않습니다. 사용자에게 직접 처리해 달라고 안내하세요.'
    );
  }
  if (code === LOCAL_AGENT_ERROR.COMPUTER_UNSUPPORTED_ACTION) {
    return COMPUTER_HEADER + '- 요청한 입력은 허용 범위(왼쪽 클릭 · 짧은 텍스트 · ENTER/TAB/ESC) 밖이어서 실행하지 않았습니다.';
  }
  if (code === LOCAL_AGENT_ERROR.COMPUTER_INPUT_FAILED) {
    return COMPUTER_HEADER + `- ${displayName} 창에 입력을 보내지 못했습니다. 사용자가 직접 확인해야 합니다.`;
  }
  return (
    renderWindowFailure(data, displayName) ??
    COMPUTER_HEADER +
      '- 현재 이 PC의 Local Work Agent가 연결되어 있지 않아 화면을 조작할 수 없습니다.\n' +
      '- 추측해서 답하지 마세요.'
  );
}

function renderComputerAction(tool: string, data: Record<string, unknown>): string {
  const displayName = String(data.displayName ?? '해당 프로그램');
  if (data.available !== true) return renderComputerFailure(data, displayName);

  if (tool === AI_TOOL_NAMES.COMPUTER_INSPECT) {
    if (data.found !== true) return renderNotRunning(displayName);
    const fg = data.foreground === true ? '앞에 있습니다' : '앞에 있지 않습니다 (다른 창이 앞에 있음)';
    const size =
      typeof data.clientWidth === 'number' && typeof data.clientHeight === 'number'
        ? ` 창 내부 크기 ${data.clientWidth}×${data.clientHeight}.`
        : '';
    const snap = data.snapshotAvailable === true ? ' 화면 확인 가능.' : ' 화면 확인 불가(앞에 있을 때만 가능).';
    return COMPUTER_HEADER + `- ${displayName} 창이 ${fg}.${size}${snap}`;
  }
  if (tool === AI_TOOL_NAMES.COMPUTER_CLICK) {
    if (data.clicked !== true) return renderComputerFailure(data, displayName);
    return COMPUTER_HEADER + `- ${displayName} 창 안 지정 위치를 클릭했습니다.`;
  }
  if (tool === AI_TOOL_NAMES.COMPUTER_TYPE_TEXT) {
    if (data.typed !== true) return renderComputerFailure(data, displayName);
    const n = Number(data.typedLength ?? 0);
    return COMPUTER_HEADER + `- ${displayName} 창에 요청한 텍스트(${n}자)를 입력했습니다.`;
  }
  if (data.keyPressed !== true) return renderComputerFailure(data, displayName);
  return COMPUTER_HEADER + `- ${displayName} 창에 ${String(data.key ?? '')} 키를 눌렀습니다.`;
}

// ─── Browser Control renderers (WO-O4O-BROWSER-CONTROL-V0 §17·§18·§19·§45) ──

const BROWSER_TYPE_LABEL: Record<string, string> = { chrome: 'Chrome', edge: 'Edge' };

function renderBrowserFailure(data: Record<string, unknown>, displayName: string): string | null {
  const code = String(data.errorCode ?? '');
  if (code === LOCAL_AGENT_ERROR.SITE_NOT_REGISTERED) {
    return '## 사이트 상태\n- 이 사이트는 O4O 가 열 수 있도록 등록되어 있지 않습니다.';
  }
  if (code === LOCAL_AGENT_ERROR.BROWSER_OPEN_FAILED) {
    return `## 사이트 상태\n- ${displayName} 을(를) 여는 데 실패했습니다. 사용자가 직접 브라우저에서 열어야 할 수 있습니다.`;
  }
  if (code === LOCAL_AGENT_ERROR.BROWSER_NOT_AVAILABLE) {
    return '## 사이트 상태\n- 이 PC 에서는 브라우저를 열 수 없습니다.';
  }
  if (code === LOCAL_AGENT_ERROR.AMBIGUOUS) {
    return '## 사이트 상태\n- 연결된 PC가 여러 대여서 어느 PC인지 확정할 수 없습니다.';
  }
  if (code === LOCAL_AGENT_ERROR.TIMEOUT) {
    return '## 사이트 상태\n- 이 PC의 에이전트가 제한 시간 안에 응답하지 않았습니다.';
  }
  return null;
}

/**
 * 브라우저 실행 여부만 말한다. **사이트가 열려 있는지는 말하지 않는다** — V0 는 탭을
 * 열거하지 않으므로 알 수 없고, 추측해서 "열려 있다" 고 하면 안 된다(§13).
 */
function renderSiteStatus(data: Record<string, unknown>): string {
  const displayName = String(data.displayName ?? '해당 사이트');
  if (data.available !== true) {
    return (
      renderBrowserFailure(data, displayName) ??
      '## 사이트 상태\n' +
        '- 현재 이 PC의 Local Work Agent가 연결되어 있지 않아 확인할 수 없습니다.\n' +
        '- 추측해서 답하지 마세요.'
    );
  }
  const running = data.browserRunning === true;
  const type = BROWSER_TYPE_LABEL[String(data.browserType ?? '')] ?? '브라우저';
  return (
    '## 사이트 상태\n' +
    (running ? `- ${type} 브라우저가 실행 중입니다.\n` : '- 지원 브라우저가 실행 중이 아닙니다.\n') +
    `- ${displayName} 이(가) 지금 열려 있는지는 확인하지 않습니다(탭을 조회하지 않습니다). ` +
    '열려 있다고 단정하지 마세요.'
  );
}

/**
 * 사이트를 열었다는 **사실**과, 로그인은 사용자가 직접 한다는 **안내**를 함께 준다(§19·§31).
 * 로그인 여부는 판정하지 않는다(§6). "[로그인 완료]" 버튼 안내가 V0 의 완료 신호다(§5).
 */
function renderOpenSite(data: Record<string, unknown>): string {
  const displayName = String(data.displayName ?? '해당 사이트');
  if (data.available !== true || data.opened !== true) {
    return (
      renderBrowserFailure(data, displayName) ??
      '## 사이트 상태\n' +
        '- 현재 이 PC의 Local Work Agent가 연결되어 있지 않아 사이트를 열 수 없습니다.\n' +
        '- 추측해서 답하지 마세요.'
    );
  }
  const type = BROWSER_TYPE_LABEL[String(data.browserType ?? '')] ?? '기본 브라우저';
  const wasRunning = data.browserWasRunning === true;
  const activated = data.activated === true;
  return (
    '## 사이트 상태\n' +
    `- ${displayName} 을(를) ${type} 에서 열었습니다.` +
    (wasRunning ? ' (실행 중이던 브라우저에 새 탭으로 열렸습니다)' : ' (브라우저를 새로 실행했습니다)') +
    (activated ? ' 브라우저 창을 앞으로 가져왔습니다.' : '') +
    '\n- 로그인이 필요하면 사용자가 사이트에서 **직접** 로그인해야 합니다. O4O 는 로그인을 대신하지 않습니다.\n' +
    '- 로그인 여부는 확인하지 않습니다. 사용자가 로그인을 마쳤거나 이미 로그인 상태라면 ' +
    '"[로그인 완료]" 버튼을 누르도록 안내하세요.'
  );
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
