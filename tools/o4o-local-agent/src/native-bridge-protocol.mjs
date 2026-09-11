/**
 * Native Bridge Protocol — Chrome Extension ↔ Native Host ↔ Local Agent 계약
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0 §27·§28·§29·§53·§54
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이 파일이 따로 있는가
 *
 * 이것은 **agent 쪽 계약 사본**이다. 같은 목록이 세 곳에 일부러 복제되어 있다:
 *   - 확장(`tools/o4o-chrome-extension/src/message-contract.js`)
 *   - native host / agent(이 파일)
 *   - 서버(`apps/api-server/src/services/local-agent/browser-bridge-protocol.ts`)
 * 삼중 allowlist 다. 한쪽이 (버그로든 변조로든) 목록에 없는 message type 을 보내도
 * 다른 쪽이 다시 거절한다. 세 목록이 어긋나면 테스트가 실패한다(파일을 함께 읽어 비교).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 만들지 않는가 (§29)
 *
 * 범용 free-form message bus 를 만들지 않는다. 아래 `NATIVE_BRIDGE_MESSAGE_TYPES`
 * 에 적힌 것만 통과한다. shell · powershell · exec · spawn · file.read · file.write ·
 * registry.write · 임의 URL 을 나르는 message type 은 **존재하지 않는다.** 확장을
 * agent 의 범용 원격제어 통로로 만들지 않는다.
 */

/** 프로토콜 버전. 확장·host·서버가 같은 값을 요구한다(§53). */
export const BRIDGE_PROTOCOL_VERSION = 1;

/**
 * 허용하는 message type 전부 (§27).
 *
 * BRIDGE-V0 의 넷 + BROWSER-DOM-CONTROL-V0 의 DOM 여덟. DOM type 은 **등재 site 탭의 elementRef**
 * 만 다루며 form submit · 결제 · 로그인 · 임의 JS 를 나르는 type 은 여전히 없다.
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
 * 봉투(envelope) 검증 (§28).
 *
 * 나머지 handler 가 신뢰할 수 있도록 여기서 모양을 강제한다:
 *   { version: 1, requestId: string, type: <allowlisted>, payload?: object }
 *
 * - version 이 다르면 VERSION_MISMATCH (§53).
 * - type 이 allowlist 에 없으면 BAD_MESSAGE — 실행하지 않는다(§29).
 * - payload 는 있으면 반드시 평범한 object. 배열·문자열·함수는 거절.
 *
 * @returns {{ok:true, message:{version:number,requestId:string,type:string,payload:object}} | {ok:false, errorCode:string}}
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
 * 준비 상태 계약 (§31·§35).
 *
 * browserAutomationReady 는 넷이 모두 true 일 때만 true 다. 하나라도 빠지면 자동화를
 * 시작하지 않는다(§36 — Computer Use 좌표 fallback 으로 우회하지 않는다).
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

/**
 * 준비되지 않았을 때 어느 단계에서 멈췄는지 정규화된 코드로 알려 준다(§35·§54).
 * 우선순위: Chrome → Extension 설치 → Agent 연결 → Extension 연결.
 */
export function readinessBlockReason(readiness) {
  if (!readiness.chromeInstalled) return NATIVE_BRIDGE_ERROR.CHROME_NOT_INSTALLED;
  if (!readiness.extensionInstalled) return NATIVE_BRIDGE_ERROR.EXTENSION_NOT_INSTALLED;
  if (!readiness.agentConnected) return NATIVE_BRIDGE_ERROR.AGENT_OFFLINE;
  if (!readiness.extensionConnected) return NATIVE_BRIDGE_ERROR.EXTENSION_NOT_CONNECTED;
  return null;
}
