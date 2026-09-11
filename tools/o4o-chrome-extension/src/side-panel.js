/**
 * Side Panel UI (§11·§31·§44·§62)
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0
 *
 * 최소 UI(§44): 3개 필수 조건 표시(§31) + 작업 화면 모드 선택(split/focus, §12).
 * 모든 판정은 service worker 가 하고, 여기서는 그 결과만 그린다. 확장 페이지 CSP 상
 * inline script 가 금지되므로 모든 로직은 이 모듈 파일에 둔다.
 *
 * 화면에 URL·페이지 내용·토큰을 표시하지 않는다(§55) — 등재 site 여부(siteId)만 안내한다.
 */

const $ = (id) => document.getElementById(id);

const ERROR_LABEL = {
  CHROME_NOT_INSTALLED: 'Google Chrome 이 필요합니다.',
  O4O_EXTENSION_NOT_INSTALLED: 'O4O 확장 설치가 필요합니다.',
  O4O_EXTENSION_NOT_CONNECTED: '확장이 에이전트에 연결되지 않았습니다.',
  LOCAL_AGENT_OFFLINE: 'O4O 작업 에이전트가 실행 중이 아닙니다.',
  NATIVE_BRIDGE_NOT_AVAILABLE: '네이티브 브리지를 찾을 수 없습니다. 에이전트 설치를 확인하세요.',
  NATIVE_BRIDGE_VERSION_MISMATCH: '브리지 버전이 일치하지 않습니다. 업데이트가 필요합니다.',
};

function setDot(id, value) {
  const el = $(id);
  el.classList.remove('ok', 'no');
  el.classList.add(value ? 'ok' : 'no');
}

function send(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (res) => resolve(res || { ok: false }));
    } catch {
      resolve({ ok: false });
    }
  });
}

async function refreshReadiness() {
  $('statusLine').className = 'status-line';
  $('statusLine').textContent = '준비 상태 확인 중…';

  const res = await send({ action: 'ui.getReadiness' });
  const r = (res && res.readiness) || {};
  setDot('dot-chrome', r.chromeInstalled);
  setDot('dot-ext', r.extensionInstalled && r.extensionConnected);
  setDot('dot-agent', r.agentConnected);

  const ready = Boolean(r.browserAutomationReady);
  const line = $('statusLine');
  if (ready) {
    line.className = 'status-line ready';
    line.textContent = '웹 자동화를 시작할 수 있습니다.';
  } else {
    line.className = 'status-line blocked';
    const code = res && res.blockedBy;
    line.textContent = (code && ERROR_LABEL[code]) || '아직 준비되지 않았습니다.';
  }
  setModeButtonsEnabled(ready);
  refreshContext();
}

async function refreshContext() {
  const res = await send({ action: 'ui.getContext' });
  const c = (res && res.context) || {};
  const hint = $('context-hint');
  if (!c.hasActiveTab) {
    hint.textContent = '';
  } else if (c.isRegisteredSite) {
    hint.textContent = `현재 탭: 등재된 O4O 사이트 (${c.siteId})`;
  } else {
    hint.textContent = '현재 탭은 O4O 등재 사이트가 아닙니다.';
  }
}

function setModeButtonsEnabled(enabled) {
  $('mode-split').disabled = !enabled;
  $('mode-focus').disabled = !enabled;
}

function reflectMode(mode) {
  $('mode-split').setAttribute('aria-pressed', String(mode === 'split'));
  $('mode-focus').setAttribute('aria-pressed', String(mode === 'focus'));
}

async function setMode(mode) {
  const res = await send({ action: 'ui.setWorkspaceMode', mode });
  if (res && res.ok) reflectMode(res.mode);
}

$('mode-split').addEventListener('click', () => setMode('split'));
$('mode-focus').addEventListener('click', () => setMode('focus'));
$('refresh').addEventListener('click', refreshReadiness);

(async () => {
  const cur = await send({ action: 'ui.getWorkspaceMode' });
  if (cur && cur.ok) reflectMode(cur.mode);
  refreshReadiness();
})();
