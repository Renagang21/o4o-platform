/**
 * Service Worker — 확장 조정자 (§10·§11·§31·§35·§37·§38·§39·§40·§41·§42·§43)
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0
 *
 * MV3 background service worker. 세 가지만 한다:
 *   1. Side Panel 열기 (action 클릭 → §11)
 *   2. 준비 상태 계산 (native bridge handshake + 로컬 사실 → §31·§35)
 *   3. 화면 모드 전이 (chrome.windows.* 로만, 임의 실행파일 인자 아님 → §38·§41·§42·§43)
 *
 * 하지 않는 것(§46·§47): DOM 검색·클릭·입력·form submit **을 service worker 가 직접 하지 않는다.**
 * AI 는 확장과 직접 말하지 않는다(§9) — 확장은 agent 를 통해서만.
 *
 * WO-O4O-BROWSER-DOM-CONTROL-V0 §36 — service worker 의 역할이 하나 늘었다: **message routing.**
 *   agent → native host → (port) → 여기 → 등재 site 탭의 content script → 결과 → 되돌림.
 *   여기서 하는 검증은 "이 요청이 가리키는 siteId 의 탭이 있는가 · 그 origin 에 host permission 이
 *   있는가" 뿐이다. DOM 내용 판단 · risk 결정 · credential 처리는 하지 않는다(§35·§36).
 *   native port 는 **상시 연결**로 둔다 — Chrome 116+ 는 native messaging port 가 열려 있는 동안
 *   service worker 를 살려 둔다(manifest minimum_chrome_version=116). 끊기면 백오프로 다시 붙는다.
 *
 * 로그 규칙(§55): URL query·페이지 내용·DOM·쿠키·토큰·form 값을 로그에 남기지 않는다.
 * 아래 log() 는 안전 필드(status·errorCode·workspaceMode·siteId?)만 받는다.
 */

import { NATIVE_BRIDGE_ERROR, computeReadiness, readinessBlockReason } from './message-contract.js';
import { siteIdForUrl, findBrowserSite } from './site-registry.js';
import { transitionWorkspaceMode, initialWorkspaceState, DEFAULT_WORKSPACE_MODE } from './workspace-mode.js';
import { NativeBridgeClient } from './native-bridge-client.js';

const bridge = new NativeBridgeClient({
  onRequest: (message) => serveDomRequest(message),
  onStateChange: (connected) => {
    log({ status: 'native_port', connected });
    if (!connected) scheduleReconnect();
  },
});

// ── DOM 요청 라우팅 (BROWSER-DOM-CONTROL-V0 §8·§36·§44) ─────────────────────

/** 재연결 백오프. 확장이 살아 있는 동안 agent 가 켜지면 자연히 다시 붙는다. */
let reconnectTimer = null;
let reconnectDelay = 2000;
function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    const r = bridge.connect();
    if (r.ok) {
      reconnectDelay = 2000;
      // 재연결 직후 hello 를 보내 host 가 "확장 살아 있음" 을 relay 에 알리게 한다.
      bridge.hello({ extensionVersion: chrome.runtime.getManifest().version, browserVersion: navigator.userAgent });
    } else {
      reconnectDelay = Math.min(reconnectDelay * 2, 60000);
      scheduleReconnect();
    }
  }, reconnectDelay);
}

/**
 * siteId → 대상 탭 하나. 규칙:
 *   1. 현재 창의 active tab 이 그 site 면 그 탭.
 *   2. 아니면 그 site 의 탭이 **정확히 하나**일 때 그 탭.
 *   3. 없거나 여러 개면 DOM_TAB_NOT_FOUND — 임의로 고르지 않는다.
 * URL 은 siteId 판정에만 쓰고 밖으로 내보내지 않는다(§55).
 */
async function resolveSiteTab(siteId) {
  const site = findBrowserSite(siteId);
  if (!site) return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.DOM_SITE_NOT_ALLOWED };
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (active && active.url && siteIdForUrl(active.url) === siteId) return { ok: true, tab: active, active: true };
  const all = await chrome.tabs.query({});
  const candidates = all.filter((t) => t.url && siteIdForUrl(t.url) === siteId);
  if (candidates.length === 1) return { ok: true, tab: candidates[0], active: false };
  return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.DOM_TAB_NOT_FOUND };
}

/** §44: 그 origin 에 host permission 이 있는가. 없으면 사용자 승인이 필요하다. */
async function hasSitePermission(siteId) {
  const site = findBrowserSite(siteId);
  if (!site) return false;
  try {
    return await chrome.permissions.contains({ origins: site.allowedOrigins.map((o) => `${o}/*`) });
  } catch {
    return false;
  }
}

/**
 * agent → 확장 DOM 요청 하나를 처리한다. 응답 payload 를 돌려준다(봉투 조립은 client 가 한다).
 * content script 가 없으면(확장 설치 전 열린 탭 등) DOM_CONTENT_UNAVAILABLE — executeScript 로
 * 주입하지 않는다(scripting 권한 · 임의 JS 경로를 만들지 않는다, §16).
 */
async function serveDomRequest(message) {
  const payload = message.payload || {};
  const siteId = typeof payload.siteId === 'string' ? payload.siteId : null;
  if (!siteId) return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.DOM_SITE_NOT_ALLOWED };
  if (!(await hasSitePermission(siteId))) {
    log({ status: 'dom_denied', errorCode: NATIVE_BRIDGE_ERROR.DOM_PERMISSION_REQUIRED, siteId });
    return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.DOM_PERMISSION_REQUIRED };
  }
  const resolved = await resolveSiteTab(siteId);
  if (!resolved.ok) {
    log({ status: 'dom_denied', errorCode: resolved.errorCode, siteId });
    return { ok: false, errorCode: resolved.errorCode };
  }
  const action = message.type.replace(/^browser[.]dom[.]/, '');
  let reply;
  try {
    reply = await chrome.tabs.sendMessage(resolved.tab.id, { action: `dom.${action}`, payload });
  } catch {
    log({ status: 'dom_failed', errorCode: NATIVE_BRIDGE_ERROR.DOM_CONTENT_UNAVAILABLE, siteId });
    return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.DOM_CONTENT_UNAVAILABLE };
  }
  if (!reply || typeof reply !== 'object') {
    return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.DOM_CONTENT_UNAVAILABLE };
  }
  // 안전 로그: action · siteId · 성공 여부 · 코드 · riskLevel 만. 텍스트 · 요소 목록은 남기지 않는다(§51).
  log({
    status: reply.ok === false ? 'dom_failed' : 'dom_ok',
    action,
    siteId,
    errorCode: reply.ok === false ? reply.errorCode : null,
    riskLevel: typeof reply.riskLevel === 'string' ? reply.riskLevel : null,
  });
  return { ...reply, active: resolved.active };
}

// 화면 모드 상태는 확장 런타임 메모리에만 둔다(§57 — 영속 선호 불요).
// workState 는 자리표시자다. 이번 V0 은 실제 작업 상태 기계를 만들지 않지만(§14),
// 모드 전이가 workState 를 보존한다는 계약은 지금 배선해 둔다.
let workspaceState = initialWorkspaceState(null);
// O4O 작업 창(§38·§40) 재사용을 위한 windowId 기억. 없으면 새로 만든다.
let o4oWindowId = null;

function log(fields) {
  // 안전 필드만. 값 자체(URL·form·token)는 절대 넣지 않는다(§55).
  try {
    console.log('[o4o-bridge]', JSON.stringify(fields));
  } catch {
    // 직렬화 실패는 무시
  }
}

// ── 1. Side Panel (§11) ──────────────────────────────────────────────────────
try {
  chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });
} catch {
  // 일부 버전은 미지원 — action.onClicked fallback 사용
}
chrome.action?.onClicked?.addListener(async (tab) => {
  try {
    await chrome.sidePanel?.open?.({ windowId: tab.windowId });
  } catch {
    // 열기 실패는 무시(패널 동작 미지원 환경)
  }
});

// ── 2. 준비 상태 (§31·§35) ────────────────────────────────────────────────────
async function computeCurrentReadiness() {
  // 확장이 실행 중이라는 사실 자체가 extensionInstalled=true·chromeInstalled=true 다
  // (우리는 Chrome 안에서 돌고 있다). extensionConnected·agentConnected 는 handshake 로만 확정.
  let extensionConnected = false;
  let agentConnected = false;
  let handshakeError = null;

  const version = chrome.runtime.getManifest().version;
  const hello = await bridge.hello({ extensionVersion: version, browserVersion: navigator.userAgent });
  if (hello.ok === true) {
    extensionConnected = true;
    // host 는 agent 자격증명 보유 여부만 알린다(민감정보 없음, §30).
    agentConnected = Boolean(hello.message.payload?.agentConnected);
  } else {
    handshakeError = hello.errorCode;
  }

  const readiness = computeReadiness({
    chromeInstalled: true,
    extensionInstalled: true,
    extensionConnected,
    agentConnected,
  });
  const blockedBy = readinessBlockReason(readiness) || handshakeError;
  log({ status: 'readiness', browserAutomationReady: readiness.browserAutomationReady, errorCode: blockedBy || null });
  return { readiness, blockedBy: readiness.browserAutomationReady ? null : blockedBy };
}

// ── 3. 현재 컨텍스트 (§37) ────────────────────────────────────────────────────
async function getActiveContext() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) return { ok: true, context: { hasActiveTab: false, siteId: null, isRegisteredSite: false } };
  const siteId = tab.url ? siteIdForUrl(tab.url) : null;
  // URL 자체는 반환·로그하지 않는다(§55). siteId(등재 식별자)만 노출한다.
  return {
    ok: true,
    context: {
      hasActiveTab: true,
      tabId: tab.id,
      windowId: tab.windowId,
      siteId,
      isRegisteredSite: siteId !== null,
    },
  };
}

// ── 4. 화면 모드 전이 (§38·§40·§41·§42·§43) ──────────────────────────────────
async function ensureO4oWindow() {
  // §40: 기존 O4O 작업 창이 있으면 재사용, 없으면 chrome.windows.create() 로 만든다.
  // 임의 실행파일 인자가 아니라 브라우저 창 생성 API 만 쓴다(§38).
  if (o4oWindowId !== null) {
    try {
      const w = await chrome.windows.get(o4oWindowId);
      if (w) return o4oWindowId;
    } catch {
      o4oWindowId = null; // 닫혔음 — 다시 만든다
    }
  }
  const created = await chrome.windows.create({ url: 'https://neture.co.kr/', focused: true });
  o4oWindowId = created.id;
  return o4oWindowId;
}

async function applyWorkspaceMode(nextMode) {
  const result = transitionWorkspaceMode(workspaceState, nextMode);
  if (result.ok === false) {
    log({ status: 'workspace_mode_denied', errorCode: result.errorCode });
    return { ok: false, errorCode: result.errorCode };
  }
  // §14·§43: workState 보존 — transition 이 실어 준 그대로 새 상태로 채택한다.
  workspaceState = result.state;

  try {
    const winId = await ensureO4oWindow();
    if (nextMode === 'focus') {
      // §42 작업 화면 크게 보기 — 대상 창을 최대화.
      await chrome.windows.update(winId, { state: 'maximized', focused: true });
    } else {
      // §41 함께 보기 — 최대화 해제(normal)해 나란히 배치 가능한 상태로.
      await chrome.windows.update(winId, { state: 'normal', focused: true });
    }
  } catch {
    // 창 조작 실패는 모드 상태를 되돌리지 않는다 — 상태는 이미 채택됨(§14 work state 보존).
    log({ status: 'workspace_window_update_failed', workspaceMode: nextMode });
  }
  log({ status: 'workspace_mode_set', workspaceMode: nextMode, changed: result.changed });
  return { ok: true, mode: workspaceState.mode, changed: result.changed };
}

// ── 메시지 라우팅 (Side Panel ↔ Service Worker) ──────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg.action !== 'string') {
    sendResponse({ ok: false, errorCode: NATIVE_BRIDGE_ERROR.BAD_MESSAGE });
    return false;
  }
  (async () => {
    switch (msg.action) {
      case 'ui.getReadiness':
        sendResponse(await computeCurrentReadiness());
        break;
      case 'ui.getContext':
        sendResponse(await getActiveContext());
        break;
      case 'ui.setWorkspaceMode':
        sendResponse(await applyWorkspaceMode(msg.mode));
        break;
      case 'ui.getWorkspaceMode':
        sendResponse({ ok: true, mode: workspaceState.mode });
        break;
      default:
        // allowlist 밖 action 은 실행하지 않는다(§29).
        sendResponse({ ok: false, errorCode: NATIVE_BRIDGE_ERROR.BAD_MESSAGE });
    }
  })();
  return true; // async sendResponse
});

log({ status: 'service_worker_started', workspaceMode: DEFAULT_WORKSPACE_MODE });

// §37: 시작하자마자 native host 에 붙어 둔다(agent 가 relay 를 열어 두었으면 DOM 축이 곧바로 열린다).
// 실패해도 조용히 백오프 — 확장은 agent 없이도 준비 상태 표시만은 계속 한다.
(() => {
  const r = bridge.connect();
  if (r.ok) {
    bridge.hello({ extensionVersion: chrome.runtime.getManifest().version, browserVersion: navigator.userAgent });
  } else {
    scheduleReconnect();
  }
})();
