/**
 * Work Target Discovery & Activation V0 — agent 쪽 공통 계층
 *
 * WO-O4O-WORK-TARGET-DISCOVERY-AND-ACTIVATION-V0 §2·§3·§8~§33·§38·§46~§51·§55~§57
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 한 가지 질문에 답한다 — "이 일을 **어디서** 시작하는가, 그곳은 준비됐는가"
 *
 *   이미 열려 있는 작업환경 재사용 → 구조적으로 열 수 있으면 실행 → 그래도 안 되면 사용자 요청(§2)
 *
 *   browser_site  확장에 묻는다(등재 site 탭 요약) → 탭 하나 고르기(§10) → 그 탭 활성화(§12) →
 *                 없으면 등재 canonical URL 로 하나 연다(§13·§14). 확장이 없으면 여기서 멈춘다 — 탭을 볼 수
 *                 없는데 OS handler 로 열면 중복 탭이 생길 수 있어 V0 는 사용자에게 넘긴다.
 *   windows_app   창 census → 등재 process 이름으로 매칭(§16·§17) → 창 활성화(최소화 복원, §20) →
 *                 없으면 등재 launch metadata 로만 실행(§26·§27) → 창이 뜰 때까지 기다린 뒤 활성화(§28) →
 *                 launch 불가/실패면 사용자 요청(§30).
 *
 * 밖으로 나가는 것(§46·§48): targetId · type · displayName · state · 재사용/열림 여부 · 개수 · path(browser).
 * 창 제목 · 전체 URL · 실행 경로 · 설치 프로그램 목록 · 사용자명은 나가지 않는다. 창 제목/URL 은 여기서도
 * 매칭에만 쓰고 명령을 뽑아내지 않는다(§49 — untrusted).
 *
 * 하지 않는 것: 임의 URL · 임의 exe · 셸 · 로그인 · credential · 다른 탭/창 닫기(§56·§57) · Computer Use 자동 fallback(§38).
 */

import { findBrowserSite } from './browser-site-registry.mjs';
import { findWindowsApp } from './windows-app-registry.mjs';
import { censusWindows, matchWindows, activateWindowHandle, launchRegisteredApp } from './windows-window-control.mjs';

export const TARGET_TYPES = Object.freeze(['browser_site', 'windows_app']);

export const TARGET_STATES = Object.freeze(['not_found', 'found', 'active', 'opening', 'waiting_for_user', 'ready', 'failed']);

export const WORK_TARGET_ERROR = Object.freeze({
  NOT_RESOLVED: 'WORK_TARGET_NOT_RESOLVED',
  NOT_REGISTERED: 'WORK_TARGET_NOT_REGISTERED',
  NOT_FOUND: 'WORK_TARGET_NOT_FOUND',
  MULTIPLE_MATCHES: 'WORK_TARGET_MULTIPLE_MATCHES',
  ACTIVATION_FAILED: 'WORK_TARGET_ACTIVATION_FAILED',
  LAUNCH_NOT_ALLOWED: 'WORK_TARGET_LAUNCH_NOT_ALLOWED',
  LAUNCH_FAILED: 'WORK_TARGET_LAUNCH_FAILED',
  USER_ACTION_REQUIRED: 'WORK_TARGET_USER_ACTION_REQUIRED',
  NOT_READY: 'WORK_TARGET_NOT_READY',
  TIMEOUT: 'WORK_TARGET_TIMEOUT',
});

const LAUNCH_WAIT_MS = 8000;
const LAUNCH_POLL_MS = 500;

/** targetId → 등재 정의. browser site 와 windows app 은 id 공간이 겹치지 않는다(`healthkr` vs `windows.*`). */
export function resolveRegisteredTarget(targetId) {
  const site = findBrowserSite(targetId);
  if (site) return { targetType: 'browser_site', targetId: site.siteId, displayName: site.displayName, site };
  const app = findWindowsApp(targetId);
  if (app) return { targetType: 'windows_app', targetId: app.appId, displayName: app.displayName, app };
  return null;
}

function result(base, state, extra = {}) {
  return {
    targetId: base.targetId,
    targetType: base.targetType,
    displayName: base.displayName,
    state,
    reusedExisting: false,
    openedByO4O: false,
    userActionRequired: state === 'waiting_for_user',
    ...extra,
  };
}

/**
 * 같은 site 탭이 여럿일 때 하나를 고른다(§10): active > 최근 사용(lastAccessed 가 유일한 최대) > 정확히 하나 > 못 고름.
 * entryPoint 근접 path 는 V0 에서 쓰지 않는다(등재 site 의 entry 가 "/" 하나라 변별력이 없다).
 */
export function chooseSiteTab(tabs) {
  const list = Array.isArray(tabs) ? tabs.filter((t) => t && Number.isInteger(t.tabId)) : [];
  if (list.length === 0) return { tab: null, reason: 'none' };
  const active = list.find((t) => t.active === true);
  if (active) return { tab: active, reason: 'active' };
  if (list.length === 1) return { tab: list[0], reason: 'single' };
  const sorted = [...list].sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  if ((sorted[0].lastAccessed || 0) > (sorted[1].lastAccessed || 0)) return { tab: sorted[0], reason: 'recent' };
  return { tab: null, reason: 'ambiguous' };
}

/** 같은 앱 창이 여럿일 때(§10 준용): 정확히 하나 > 최소화되지 않은 창이 하나 > 못 고름. */
export function chooseAppWindow(windows) {
  const list = Array.isArray(windows) ? windows : [];
  if (list.length === 0) return { window: null, reason: 'none' };
  if (list.length === 1) return { window: list[0], reason: 'single' };
  const visible = list.filter((w) => w.minimized !== true);
  if (visible.length === 1) return { window: visible[0], reason: 'visible' };
  return { window: null, reason: 'ambiguous' };
}

async function prepareBrowserTarget(base, bridge) {
  const siteId = base.targetId;
  if (!bridge || typeof bridge.isExtensionConnected !== 'function' || !bridge.isExtensionConnected()) {
    // 탭을 볼 수 없다. OS handler 로 열면 중복 탭이 생길 수 있어 V0 는 여기서 사용자에게 넘긴다(§9 우선).
    return result(base, 'waiting_for_user', { errorCode: WORK_TARGET_ERROR.NOT_READY, reason: 'extension_not_connected' });
  }
  const discovered = await bridge.dispatch('browser.target.discover', { siteId });
  if (!discovered.ok) {
    return result(base, 'failed', { errorCode: WORK_TARGET_ERROR.NOT_READY, reason: normalizeBridgeReason(discovered.errorCode) });
  }
  const payload = discovered.message?.payload ?? {};
  if (payload.ok === false) {
    const reason = normalizeBridgeReason(payload.errorCode);
    // 권한 없음 · 등재 밖은 사용자/운영 몫.
    return result(base, 'waiting_for_user', { errorCode: WORK_TARGET_ERROR.NOT_READY, reason });
  }
  const tabCount = Number.isInteger(payload.tabCount) ? payload.tabCount : 0;
  if (tabCount > 0) {
    const pick = chooseSiteTab(payload.tabs);
    if (!pick.tab) {
      return result(base, 'waiting_for_user', { errorCode: WORK_TARGET_ERROR.MULTIPLE_MATCHES, reason: 'multiple_tabs', tabCount });
    }
    const activated = await bridge.dispatch('browser.target.activate', { siteId, tabId: pick.tab.tabId });
    const ap = activated.ok ? activated.message?.payload ?? {} : {};
    if (!activated.ok || ap.ok === false || ap.activated !== true) {
      return result(base, 'found', { errorCode: WORK_TARGET_ERROR.ACTIVATION_FAILED, reason: 'activate_failed', tabCount });
    }
    return result(base, 'ready', { reusedExisting: true, tabCount, path: typeof ap.path === 'string' ? ap.path : pick.tab.path ?? '/', selection: pick.reason });
  }
  // 열려 있지 않다 → 등재 canonical URL 로 하나 연다(§13). URL 은 확장 등재부 상수이고 여기서는 넘기지 않는다.
  const opened = await bridge.dispatch('browser.target.open', { siteId }, 12000);
  const op = opened.ok ? opened.message?.payload ?? {} : {};
  if (!opened.ok || op.ok === false || op.opened !== true) {
    return result(base, 'waiting_for_user', { errorCode: WORK_TARGET_ERROR.ACTIVATION_FAILED, reason: 'open_failed', tabCount: 0 });
  }
  return result(base, 'ready', { openedByO4O: true, tabCount: 1, path: typeof op.path === 'string' ? op.path : '/' });
}

function normalizeBridgeReason(code) {
  if (code === 'BROWSER_DOM_PERMISSION_REQUIRED') return 'permission_required';
  if (code === 'DOM_SITE_NOT_ALLOWED') return 'site_not_allowed';
  if (code === 'O4O_EXTENSION_NOT_CONNECTED') return 'extension_not_connected';
  return 'bridge_error';
}

async function prepareWindowsTarget(base, deps) {
  const app = base.app;
  const found = matchWindows(await deps.censusWindows(), app);
  if (found.length > 0) {
    const pick = chooseAppWindow(found);
    if (!pick.window) return result(base, 'waiting_for_user', { errorCode: WORK_TARGET_ERROR.MULTIPLE_MATCHES, reason: 'multiple_windows', windowCount: found.length });
    const act = await deps.activateWindowHandle(pick.window.hwnd);
    if (!act.activated) return result(base, 'found', { errorCode: WORK_TARGET_ERROR.ACTIVATION_FAILED, reason: 'activate_failed', windowCount: found.length });
    return result(base, 'ready', { reusedExisting: true, windowCount: found.length, restored: act.restored === true, selection: pick.reason });
  }
  // 실행 중이 아니다. 등재 launch 만(§26·§27) — 없거나 금지면 사용자에게(§30).
  if (app.launchAllowed !== true || !app.launch) {
    return result(base, 'waiting_for_user', { errorCode: WORK_TARGET_ERROR.USER_ACTION_REQUIRED, reason: app.launchAllowed === false ? 'launch_not_allowed' : 'no_launch_metadata', windowCount: 0 });
  }
  const launched = await deps.launchRegisteredApp(app);
  if (!launched.launched) {
    const errorCode = launched.reason === 'LAUNCH_NOT_ALLOWED' ? WORK_TARGET_ERROR.LAUNCH_NOT_ALLOWED : WORK_TARGET_ERROR.LAUNCH_FAILED;
    const reason = launched.reason === 'NOT_FOUND' ? 'launch_path_missing' : launched.reason === 'LAUNCH_NOT_ALLOWED' ? 'launch_not_allowed' : 'launch_failed';
    return result(base, 'waiting_for_user', { errorCode, reason, windowCount: 0 });
  }
  // 프로세스 시작 ≠ 준비(§28). 창이 나타날 때까지 기다린 뒤 활성화한다.
  const started = deps.now();
  while (deps.now() - started < LAUNCH_WAIT_MS) {
    await deps.sleep(LAUNCH_POLL_MS);
    const windows = matchWindows(await deps.censusWindows(), app);
    if (windows.length > 0) {
      const pick = chooseAppWindow(windows);
      const target = pick.window ?? windows[0];
      const act = await deps.activateWindowHandle(target.hwnd);
      if (!act.activated) return result(base, 'opening', { errorCode: WORK_TARGET_ERROR.ACTIVATION_FAILED, reason: 'activate_failed', openedByO4O: true, windowCount: windows.length });
      return result(base, 'ready', { openedByO4O: true, windowCount: windows.length });
    }
  }
  return result(base, 'waiting_for_user', { errorCode: WORK_TARGET_ERROR.TIMEOUT, reason: 'window_not_seen', openedByO4O: true, windowCount: 0 });
}

const DEFAULT_DEPS = Object.freeze({
  censusWindows,
  activateWindowHandle,
  launchRegisteredApp,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
});

/**
 * 대상 하나를 준비한다 — `TargetDiscoveryResult` 를 돌려준다(§33). 예외를 밖으로 던지지 않는다.
 * `deps` 는 테스트 주입용(census · activate · launch · sleep). 운영 경로는 기본값이다.
 */
export async function prepareTarget(targetId, { bridge } = {}, deps = DEFAULT_DEPS) {
  const base = resolveRegisteredTarget(targetId);
  if (!base) {
    return { targetId: String(targetId ?? ''), targetType: null, displayName: '해당 대상', state: 'failed', reusedExisting: false, openedByO4O: false, userActionRequired: false, errorCode: WORK_TARGET_ERROR.NOT_REGISTERED };
  }
  try {
    if (base.targetType === 'browser_site') return await prepareBrowserTarget(base, bridge);
    return await prepareWindowsTarget(base, { ...DEFAULT_DEPS, ...deps });
  } catch {
    return result(base, 'failed', { errorCode: WORK_TARGET_ERROR.NOT_READY, reason: 'internal_error' });
  }
}
