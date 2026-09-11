/**
 * Native Bridge Protocol — 확장(Extension) 쪽 계약 사본
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0 §27·§28·§29·§53·§54
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 삼중 allowlist 의 세 번째 사본
 *
 * 같은 계약이 세 곳에 일부러 복제되어 있다:
 *   - 확장(이 파일)                         ← 여기
 *   - native host / agent(`tools/o4o-local-agent/src/native-bridge-protocol.mjs`)
 *   - 서버(`apps/api-server/src/services/local-agent/browser-bridge-protocol.ts`)
 *
 * 확장은 TS 서버 모듈도 agent 의 .mjs 도 import 할 수 없다(MV3 번들 · 분리된 런타임).
 * 그래서 값을 손으로 복제하고, 테스트(`test/native-bridge.test.mjs`)가 세 사본이
 * **글자 그대로 일치**하는지 교차 확인한다. 하나가 어긋나면 테스트가 깨진다.
 *
 * 순수 상수 + 순수 함수만 둔다. chrome.* API 를 여기서 부르지 않는다 —
 * node:test 가 이 파일을 그대로 import 할 수 있어야 한다(§58).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 만들지 않는가 (§29)
 *
 * 범용 free-form message bus 가 아니다. 아래 네 type 만 통과한다. shell · powershell ·
 * exec · spawn · file.read · file.write · registry.write · 임의 URL 을 나르는 type 은
 * **존재하지 않는다.** 확장을 agent 의 범용 원격제어 통로로 만들지 않는다.
 */

/** 프로토콜 버전. 확장·host·서버가 같은 값을 요구한다(§53). */
export const BRIDGE_PROTOCOL_VERSION = 1;

/**
 * 허용하는 message type 전부 (§27). BRIDGE-V0 의 넷 + BROWSER-DOM-CONTROL-V0 의 DOM 여덟.
 * DOM type 은 등재 site 탭의 elementRef 만 다룬다 — form submit · 결제 · 로그인 · 임의 JS type 은 없다.
 */
export const NATIVE_BRIDGE_MESSAGE_TYPES = Object.freeze([
  'extension.hello', // 확장→host 최초 handshake (§30)
  'extension.status', // 준비/연결 상태 조회 (§31)
  'browser.get_context', // 현재 active tab · 등재 site 여부 (§37)
  'workspace.set_mode', // split/focus 화면 모드 설정 (§12·§15)
  // ── Browser DOM Control V0 (WO-O4O-BROWSER-DOM-CONTROL-V0 §38) — agent→host→확장 방향.
  //    payload 는 elementRef · snapshotId · 구조화 조건 · 짧은 텍스트뿐이다. selector · JS 칸은 없다(§13·§16).
  'browser.dom.get_context',
  'browser.dom.inspect',
  'browser.dom.find',
  'browser.dom.read_text',
  'browser.dom.set_input',
  'browser.dom.select_option',
  'browser.dom.click',
  'browser.dom.read_table',
]);

/** agent → 확장 방향으로만 흐르는 type(DOM 축). 확장이 host 로 **요청**할 수 있는 type 이 아니다. */
export const BRIDGE_DOM_MESSAGE_TYPES = Object.freeze(
  NATIVE_BRIDGE_MESSAGE_TYPES.filter((t) => t.startsWith('browser.dom.')),
);
export function isDomBridgeMessageType(type) {
  return BRIDGE_DOM_MESSAGE_TYPES.includes(type);
}

/** 화면 모드 (§15). 이번 V0 은 둘뿐. dual 은 future contract 로만 열어 둔다(§16). */
export const WORKSPACE_MODES = Object.freeze(['split', 'focus']);

/** 정규화된 오류 코드 (§54). */
export const NATIVE_BRIDGE_ERROR = Object.freeze({
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
});

export function isAllowedBridgeMessageType(type) {
  return NATIVE_BRIDGE_MESSAGE_TYPES.includes(type);
}

export function isSupportedWorkspaceMode(mode) {
  return WORKSPACE_MODES.includes(mode);
}

/**
 * 봉투(envelope) 검증 (§28). agent 쪽 native-bridge-protocol.mjs 와 동일 규칙:
 *   { version: 1, requestId: string(1-128), type: <allowlisted>, payload?: object }
 * 확장도 host 로 보내기 전에·host 응답을 받은 뒤 이 검증을 통과시킨다(양방향).
 *
 * @returns {{ok:true, message:object} | {ok:false, errorCode:string}}
 */
export function validateBridgeMessage(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.BAD_MESSAGE };
  }
  if (raw.version !== BRIDGE_PROTOCOL_VERSION) {
    return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.VERSION_MISMATCH };
  }
  if (typeof raw.requestId !== 'string' || raw.requestId.length < 1 || raw.requestId.length > 128) {
    return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.BAD_MESSAGE };
  }
  if (typeof raw.type !== 'string' || !isAllowedBridgeMessageType(raw.type)) {
    return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.BAD_MESSAGE };
  }
  let payload = raw.payload;
  if (payload === undefined) payload = {};
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.BAD_MESSAGE };
  }
  return { ok: true, message: { version: raw.version, requestId: raw.requestId, type: raw.type, payload } };
}

/**
 * 확장이 host 로 보낼 봉투를 만든다. type 을 여기서도 다시 검사한다(발신 측 방어).
 * @returns {{ok:true, message:object} | {ok:false, errorCode:string}}
 */
export function buildBridgeMessage(type, payload, requestId) {
  const envelope = {
    version: BRIDGE_PROTOCOL_VERSION,
    requestId: typeof requestId === 'string' && requestId.length > 0 ? requestId : newRequestId(),
    type,
    payload: payload === undefined ? {} : payload,
  };
  return validateBridgeMessage(envelope);
}

/** requestId 생성. crypto.randomUUID 우선, 없으면 시간+난수 fallback. */
export function newRequestId() {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // fallthrough
  }
  return `req-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/**
 * 준비 상태 계약 (§31·§35). agent 쪽과 동일. 넷이 모두 true 일 때만
 * browserAutomationReady 가 true.
 */
export function computeReadiness({ chromeInstalled, extensionInstalled, extensionConnected, agentConnected }) {
  const chrome = Boolean(chromeInstalled);
  const installed = Boolean(extensionInstalled);
  const connected = Boolean(extensionConnected);
  const agent = Boolean(agentConnected);
  return Object.freeze({
    chromeInstalled: chrome,
    extensionInstalled: installed,
    extensionConnected: connected,
    agentConnected: agent,
    browserAutomationReady: chrome && installed && connected && agent,
  });
}

/** 우선순위: Chrome → Extension 설치 → Agent 연결 → Extension 연결 (§35·§54). */
export function readinessBlockReason(readiness) {
  if (!readiness.chromeInstalled) return NATIVE_BRIDGE_ERROR.CHROME_NOT_INSTALLED;
  if (!readiness.extensionInstalled) return NATIVE_BRIDGE_ERROR.EXTENSION_NOT_INSTALLED;
  if (!readiness.agentConnected) return NATIVE_BRIDGE_ERROR.AGENT_OFFLINE;
  if (!readiness.extensionConnected) return NATIVE_BRIDGE_ERROR.EXTENSION_NOT_CONNECTED;
  return null;
}
