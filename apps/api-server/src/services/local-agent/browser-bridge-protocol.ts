/**
 * Native Bridge Protocol — 서버 쪽 계약 사본 (readiness gate + error 정규화)
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0 §27·§28·§31·§35·§53·§54
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 삼중 allowlist 의 세 번째(서버) 사본
 *
 * 같은 계약이 세 곳에 복제되어 있다:
 *   - 확장(`tools/o4o-chrome-extension/src/message-contract.js`)
 *   - native host / agent(`tools/o4o-local-agent/src/native-bridge-protocol.mjs`)
 *   - 서버(이 파일)
 * 세 사본의 message type·error code·workspace mode 값이 어긋나면 테스트가 깨진다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 WO 에서 서버가 하는 일은 좁다 (§46·§47·§48)
 *
 * 이번 V0 은 **브라우저 DOM 실행을 하지 않는다.** 따라서 서버는:
 *   - 새 라우트를 만들지 않는다.
 *   - `browser` executionMode 를 켜지 않는다(EXECUTABLE_MODES 에 넣지 않는다).
 *   - 실행 가능한 browser AI tool 을 등록하지 않는다.
 *
 * 서버가 두는 것은 **계약 자체**뿐이다: 준비 상태 판정(§31·§35)과 오류 코드 정규화(§54),
 * 그리고 확장·agent 사본과의 교차 확인 기준. DOM executor·라우팅은 후속
 * WO-O4O-BROWSER-DOM-CONTROL-V0 에서 이 계약 위에 올린다.
 */

/** 프로토콜 버전. 확장·host·서버가 같은 값을 요구한다(§53). */
export const BRIDGE_PROTOCOL_VERSION = 1 as const;

/** V0 에서 허용하는 message type 전부(§27). agent·확장 사본과 글자 그대로 같다. */
export const NATIVE_BRIDGE_MESSAGE_TYPES = Object.freeze([
  'extension.hello',
  'extension.status',
  'browser.get_context',
  'workspace.set_mode',
  // ── Browser DOM Control V0 (WO-O4O-BROWSER-DOM-CONTROL-V0 §38) — agent→host→확장 방향.
  'browser.dom.get_context',
  'browser.dom.inspect',
  'browser.dom.find',
  'browser.dom.read_text',
  'browser.dom.set_input',
  'browser.dom.select_option',
  'browser.dom.click',
  'browser.dom.read_table',
] as const);

export type NativeBridgeMessageType = (typeof NATIVE_BRIDGE_MESSAGE_TYPES)[number];

/** 화면 모드(§15). V0 은 둘뿐. */
export const WORKSPACE_MODES = Object.freeze(['split', 'focus'] as const);
export type WorkspaceMode = (typeof WORKSPACE_MODES)[number];

/** 정규화된 오류 코드(§54). */
export const BROWSER_BRIDGE_ERROR = Object.freeze({
  CHROME_NOT_INSTALLED: 'CHROME_NOT_INSTALLED',
  EXTENSION_NOT_INSTALLED: 'O4O_EXTENSION_NOT_INSTALLED',
  EXTENSION_NOT_CONNECTED: 'O4O_EXTENSION_NOT_CONNECTED',
  AGENT_OFFLINE: 'LOCAL_AGENT_OFFLINE',
  BRIDGE_NOT_AVAILABLE: 'NATIVE_BRIDGE_NOT_AVAILABLE',
  VERSION_MISMATCH: 'NATIVE_BRIDGE_VERSION_MISMATCH',
  SITE_NOT_ALLOWED: 'BROWSER_SITE_NOT_ALLOWED',
  WORKSPACE_MODE_UNSUPPORTED: 'WORKSPACE_MODE_UNSUPPORTED',
  BAD_MESSAGE: 'NATIVE_BRIDGE_BAD_MESSAGE',
  // ── Browser DOM Control V0 (§29·§44) ──
  DOM_SITE_NOT_ALLOWED: 'DOM_SITE_NOT_ALLOWED',
  DOM_TAB_NOT_FOUND: 'DOM_TAB_NOT_FOUND',
  DOM_ELEMENT_NOT_FOUND: 'DOM_ELEMENT_NOT_FOUND',
  DOM_ELEMENT_STALE: 'DOM_ELEMENT_STALE',
  DOM_ACTION_NOT_ALLOWED: 'DOM_ACTION_NOT_ALLOWED',
  DOM_CROSS_ORIGIN_BLOCKED: 'DOM_CROSS_ORIGIN_BLOCKED',
  DOM_USER_ACTION_REQUIRED: 'DOM_USER_ACTION_REQUIRED',
  DOM_CONTENT_UNAVAILABLE: 'DOM_CONTENT_UNAVAILABLE',
  DOM_PERMISSION_REQUIRED: 'BROWSER_DOM_PERMISSION_REQUIRED',
} as const);

export type BrowserBridgeErrorCode = (typeof BROWSER_BRIDGE_ERROR)[keyof typeof BROWSER_BRIDGE_ERROR];

export function isAllowedBridgeMessageType(type: unknown): type is NativeBridgeMessageType {
  return typeof type === 'string' && (NATIVE_BRIDGE_MESSAGE_TYPES as readonly string[]).includes(type);
}

export function isSupportedWorkspaceMode(mode: unknown): mode is WorkspaceMode {
  return typeof mode === 'string' && (WORKSPACE_MODES as readonly string[]).includes(mode);
}

export interface BridgeMessage {
  version: number;
  requestId: string;
  type: NativeBridgeMessageType;
  payload: Record<string, unknown>;
}

export type ValidateBridgeResult =
  | { ok: true; message: BridgeMessage }
  | { ok: false; errorCode: BrowserBridgeErrorCode };

/**
 * 봉투 검증(§28). agent·확장 사본과 동일 규칙:
 *   { version: 1, requestId: string(1-128), type: <allowlisted>, payload?: object }
 */
export function validateBridgeMessage(raw: unknown): ValidateBridgeResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errorCode: BROWSER_BRIDGE_ERROR.BAD_MESSAGE };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== BRIDGE_PROTOCOL_VERSION) {
    return { ok: false, errorCode: BROWSER_BRIDGE_ERROR.VERSION_MISMATCH };
  }
  if (typeof obj.requestId !== 'string' || obj.requestId.length < 1 || obj.requestId.length > 128) {
    return { ok: false, errorCode: BROWSER_BRIDGE_ERROR.BAD_MESSAGE };
  }
  if (!isAllowedBridgeMessageType(obj.type)) {
    return { ok: false, errorCode: BROWSER_BRIDGE_ERROR.BAD_MESSAGE };
  }
  let payload = obj.payload;
  if (payload === undefined) payload = {};
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errorCode: BROWSER_BRIDGE_ERROR.BAD_MESSAGE };
  }
  return {
    ok: true,
    message: {
      version: obj.version as number,
      requestId: obj.requestId,
      type: obj.type,
      payload: payload as Record<string, unknown>,
    },
  };
}

export interface BrowserReadinessInput {
  chromeInstalled?: boolean;
  extensionInstalled?: boolean;
  extensionConnected?: boolean;
  agentConnected?: boolean;
}

export interface BrowserReadiness {
  chromeInstalled: boolean;
  extensionInstalled: boolean;
  extensionConnected: boolean;
  agentConnected: boolean;
  /** 넷이 모두 true 일 때만 true(§35). 하나라도 빠지면 자동화를 시작하지 않는다(§36). */
  browserAutomationReady: boolean;
}

export function computeReadiness(input: BrowserReadinessInput): BrowserReadiness {
  const chromeInstalled = Boolean(input.chromeInstalled);
  const extensionInstalled = Boolean(input.extensionInstalled);
  const extensionConnected = Boolean(input.extensionConnected);
  const agentConnected = Boolean(input.agentConnected);
  return Object.freeze({
    chromeInstalled,
    extensionInstalled,
    extensionConnected,
    agentConnected,
    browserAutomationReady: chromeInstalled && extensionInstalled && extensionConnected && agentConnected,
  });
}

/**
 * 준비되지 않았을 때 어느 단계에서 멈췄는지 정규화된 코드로 알려 준다(§35·§54).
 * 우선순위: Chrome → Extension 설치 → Agent 연결 → Extension 연결.
 * 준비되었으면 null.
 */
export function readinessBlockReason(readiness: BrowserReadiness): BrowserBridgeErrorCode | null {
  if (readiness.chromeInstalled === false) return BROWSER_BRIDGE_ERROR.CHROME_NOT_INSTALLED;
  if (readiness.extensionInstalled === false) return BROWSER_BRIDGE_ERROR.EXTENSION_NOT_INSTALLED;
  if (readiness.agentConnected === false) return BROWSER_BRIDGE_ERROR.AGENT_OFFLINE;
  if (readiness.extensionConnected === false) return BROWSER_BRIDGE_ERROR.EXTENSION_NOT_CONNECTED;
  return null;
}

/**
 * assertBrowserAutomationReady 게이트(§35). 준비되지 않았으면 정규화된 코드를 던진다.
 * DOM 실행 tool 이 없더라도, 후속 WO 가 이 게이트를 재사용하도록 지금 계약으로 둔다.
 */
export function assertBrowserAutomationReady(readiness: BrowserReadiness): void {
  const reason = readinessBlockReason(readiness);
  if (reason !== null) {
    const err = new Error(reason) as Error & { code: BrowserBridgeErrorCode };
    err.code = reason;
    throw err;
  }
}
