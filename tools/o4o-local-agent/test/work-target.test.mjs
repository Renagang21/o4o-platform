/**
 * Work Target Discovery & Activation V0 — agent 계층 테스트 (WO-O4O-WORK-TARGET-DISCOVERY-AND-ACTIVATION-V0 §59~§61)
 *
 * 의존성 0 — node:test + node:assert. 실 Chrome · 실 창은 CHECK 의 smoke 가 본다. 여기서는 bridge(확장) 와
 * 창 census/activate/launch 를 주입해 결정 규칙과 경계를 잠근다.
 *
 *   browser  1 alias→id(서버) · 2 existing tab found · 3 activated · 4 duplicate tab 0 · 5 absent · 6 registered open ·
 *            7 unregistered reject · 8 multiple tabs · 9 login = 사용자(대상 계층은 credential 을 모른다) · 10 no arbitrary URL
 *   windows  11 running found · 12 activated · 13 minimized restore · 14 duplicate launch 0 · 15 absent · 16 registered exe launch ·
 *            17 shortcut launch · 18 launch disallowed · 19 unknown exe reject · 20 launch failure→user · 21 login=사용자 · 22 no shell
 *   privacy  23 tab census 최소 · 24 local path 없음 · 25 installed-program census 없음 · 26 credential 없음
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const wt = await import('../src/work-target.mjs');
const handlers = await import('../src/handlers.mjs');
const control = await import('../src/windows-window-control.mjs');
const registry = await import('../src/windows-app-registry.mjs');

const read = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const codeOnly = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*(?:\/\/|#).*$/gm, '');

/** 확장 흉내 — 등재 site 탭 목록을 들고 discover/activate/open 에 답한다. 호출을 기록한다. */
function fakeBridge(tabs, { connected = true, openFails = false } = {}) {
  const calls = [];
  let nextId = 900;
  return {
    calls,
    tabs,
    isExtensionConnected: () => connected,
    async dispatch(type, payload) {
      calls.push({ type, payload });
      if (type === 'browser.target.discover') {
        const mine = tabs.filter((t) => t.siteId === payload.siteId);
        return { ok: true, message: { payload: { ok: true, siteId: payload.siteId, tabCount: mine.length, tabs: mine.map(({ siteId, ...t }) => t) } } };
      }
      if (type === 'browser.target.activate') {
        const t = tabs.find((x) => x.tabId === payload.tabId && x.siteId === payload.siteId);
        if (!t) return { ok: true, message: { payload: { ok: false, errorCode: 'DOM_TAB_NOT_FOUND' } } };
        return { ok: true, message: { payload: { ok: true, activated: true, path: t.path } } };
      }
      if (type === 'browser.target.open') {
        if (openFails) return { ok: true, message: { payload: { ok: false, errorCode: 'DOM_TAB_NOT_FOUND' } } };
        nextId += 1;
        tabs.push({ siteId: payload.siteId, tabId: nextId, active: true, path: '/', lastAccessed: Date.now() });
        return { ok: true, message: { payload: { ok: true, opened: true, tabId: nextId, path: '/' } } };
      }
      return { ok: false, errorCode: 'NATIVE_BRIDGE_BAD_MESSAGE' };
    },
  };
}

/** 창 census · activate · launch 흉내. */
function fakeDeps({ windows = [], launchResult = { launched: true }, appearAfterLaunch = null } = {}) {
  const calls = { activate: [], launch: [], census: 0 };
  let launched = false;
  return {
    calls,
    async censusWindows() {
      calls.census += 1;
      return launched && appearAfterLaunch ? [...windows, ...appearAfterLaunch] : windows;
    },
    async activateWindowHandle(hwnd) {
      calls.activate.push(hwnd);
      const w = [...windows, ...(appearAfterLaunch || [])].find((x) => x.hwnd === hwnd);
      return { activated: true, restored: w?.minimized === true };
    },
    async launchRegisteredApp(app) {
      calls.launch.push(app.appId);
      launched = launchResult.launched === true;
      return launchResult;
    },
    sleep: async () => {},
    now: (() => { let t = 0; return () => (t += 600); })(),
  };
}

const NOTEPAD = registry.findWindowsApp('windows.notepad');

// ─── browser ────────────────────────────────────────────────────────────────

test('2·3·4·23. 열린 탭이 있으면 그 탭을 활성화하고 새 탭을 열지 않는다 — 밖으로 나가는 것은 개수 · path · 상태뿐', async () => {
  const bridge = fakeBridge([{ siteId: 'healthkr', tabId: 11, active: false, path: '/searchDrug/search.asp', lastAccessed: 5, title: '약학정보원 - 검색' }]);
  const r = await wt.prepareTarget('healthkr', { bridge });
  assert.equal(r.state, 'ready');
  assert.equal(r.reusedExisting, true);
  assert.equal(r.openedByO4O, false);
  assert.equal(r.tabCount, 1);
  assert.equal(r.path, '/searchDrug/search.asp');
  assert.deepEqual(bridge.calls.map((c) => c.type), ['browser.target.discover', 'browser.target.activate']);
  assert.equal(bridge.tabs.length, 1, '중복 탭 0');
  const text = JSON.stringify(r);
  assert.ok(!text.includes('title') && !text.includes('https://') && !text.includes('tabId'));
});

test('5·6·10. 탭이 없으면 등재 canonical 로 하나 연다 — URL 은 payload 에 없다(확장 등재부 상수)', async () => {
  const bridge = fakeBridge([{ siteId: 'o4o.neture', tabId: 1, active: true, path: '/' }]);
  const r = await wt.prepareTarget('healthkr', { bridge });
  assert.equal(r.state, 'ready');
  assert.equal(r.openedByO4O, true);
  assert.equal(r.reusedExisting, false);
  const open = bridge.calls.find((c) => c.type === 'browser.target.open');
  assert.deepEqual(Object.keys(open.payload), ['siteId']);
  assert.ok(!JSON.stringify(bridge.calls).includes('http'));
  assert.equal(bridge.tabs.filter((t) => t.siteId === 'healthkr').length, 1);
});

test('8. 같은 site 탭이 여럿: active > 최근 사용 > 하나 > 못 고르면 사용자 선택(MULTIPLE_MATCHES) — 새 탭 0', async () => {
  assert.equal(wt.chooseSiteTab([{ tabId: 1, active: false, lastAccessed: 1 }, { tabId: 2, active: true, lastAccessed: 0 }]).tab.tabId, 2);
  assert.equal(wt.chooseSiteTab([{ tabId: 1, active: false, lastAccessed: 10 }, { tabId: 2, active: false, lastAccessed: 3 }]).tab.tabId, 1);
  assert.equal(wt.chooseSiteTab([{ tabId: 1, active: false, lastAccessed: 0 }, { tabId: 2, active: false, lastAccessed: 0 }]).tab, null);
  const bridge = fakeBridge([{ siteId: 'healthkr', tabId: 1, active: false, path: '/', lastAccessed: 0 }, { siteId: 'healthkr', tabId: 2, active: false, path: '/a', lastAccessed: 0 }]);
  const r = await wt.prepareTarget('healthkr', { bridge });
  assert.equal(r.state, 'waiting_for_user');
  assert.equal(r.errorCode, 'WORK_TARGET_MULTIPLE_MATCHES');
  assert.equal(r.reason, 'multiple_tabs');
  assert.equal(r.tabCount, 2);
  assert.ok(!bridge.calls.some((c) => c.type === 'browser.target.open'));
});

test('7·10. 등재 밖 targetId 는 아무것도 조사하지 않는다 · handler 도 거절 · URL 문자열은 target 이 될 수 없다', async () => {
  const bridge = fakeBridge([]);
  for (const bad of ['https://evil.example/', 'evil.site', 'javascript:alert(1)', 'C:\\Windows\\System32\\cmd.exe', '']) {
    const r = await wt.prepareTarget(bad, { bridge });
    assert.equal(r.state, 'failed');
    assert.equal(r.errorCode, 'WORK_TARGET_NOT_REGISTERED');
  }
  assert.equal(bridge.calls.length, 0);
  const denied = await handlers.runAction('local.target.prepare#evil.site', { bridge }, undefined);
  assert.deepEqual(denied, { status: 'denied', errorCode: 'WORK_TARGET_NOT_REGISTERED' });
  const withArgs = await handlers.runAction('local.target.prepare#healthkr', { bridge }, { url: 'https://x' });
  assert.equal(withArgs.status, 'denied');
  const noSuffix = await handlers.runAction('local.target.prepare', { bridge }, undefined);
  assert.equal(noSuffix.status, 'denied');
});

test('확장 미연결 · 권한 없음 · open 실패는 사용자에게 넘긴다(OS handler 로 임의로 열지 않는다)', async () => {
  const off = await wt.prepareTarget('healthkr', { bridge: fakeBridge([], { connected: false }) });
  assert.equal(off.state, 'waiting_for_user');
  assert.equal(off.reason, 'extension_not_connected');
  const noBridge = await wt.prepareTarget('healthkr', {});
  assert.equal(noBridge.state, 'waiting_for_user');
  const permBridge = fakeBridge([]);
  permBridge.dispatch = async () => ({ ok: true, message: { payload: { ok: false, errorCode: 'BROWSER_DOM_PERMISSION_REQUIRED' } } });
  const perm = await wt.prepareTarget('healthkr', { bridge: permBridge });
  assert.equal(perm.state, 'waiting_for_user');
  assert.equal(perm.reason, 'permission_required');
  const openFail = await wt.prepareTarget('healthkr', { bridge: fakeBridge([], { openFails: true }) });
  assert.equal(openFail.state, 'waiting_for_user');
  assert.equal(openFail.reason, 'open_failed');
});

test('handler: local.target.prepare#healthkr 는 인자 없이 대상 상태를 돌려준다(success/state)', async () => {
  const bridge = fakeBridge([{ siteId: 'healthkr', tabId: 5, active: true, path: '/' }]);
  const r = await handlers.runAction('local.target.prepare#healthkr', { bridge }, undefined);
  assert.equal(r.status, 'success');
  assert.equal(r.data.state, 'ready');
  assert.equal(r.data.reusedExisting, true);
  assert.ok(handlers.listAllowedActions().includes('local.target.prepare'));
});

// ─── windows ────────────────────────────────────────────────────────────────

test('11·12·14. 실행 중인 앱은 창을 찾아 활성화하고 새 프로세스를 시작하지 않는다', async () => {
  const deps = fakeDeps({ windows: [{ hwnd: 100, pid: 1, processName: 'notepad', title: '제목 없음 - 메모장', minimized: false }] });
  const r = await wt.prepareTarget('windows.notepad', {}, deps);
  assert.equal(r.state, 'ready');
  assert.equal(r.reusedExisting, true);
  assert.equal(r.windowCount, 1);
  assert.deepEqual(deps.calls.activate, [100]);
  assert.equal(deps.calls.launch.length, 0, 'duplicate launch 0');
  assert.ok(!JSON.stringify(r).includes('메모장 -') && !JSON.stringify(r).includes('hwnd'));
});

test('13. 최소화된 창은 복원 뒤 앞으로 — 여러 창이면 보이는 창 하나 > 못 고르면 사용자 선택', async () => {
  const deps = fakeDeps({ windows: [{ hwnd: 7, pid: 1, processName: 'notepad', title: 'a - 메모장', minimized: true }] });
  const r = await wt.prepareTarget('windows.notepad', {}, deps);
  assert.equal(r.state, 'ready');
  assert.equal(r.restored, true);
  assert.equal(wt.chooseAppWindow([{ hwnd: 1, minimized: true }, { hwnd: 2, minimized: false }]).window.hwnd, 2);
  assert.equal(wt.chooseAppWindow([{ hwnd: 1, minimized: false }, { hwnd: 2, minimized: false }]).window, null);
  const multi = fakeDeps({ windows: [{ hwnd: 1, pid: 1, processName: 'notepad', title: 'a - 메모장', minimized: false }, { hwnd: 2, pid: 2, processName: 'notepad', title: 'b - 메모장', minimized: false }] });
  const m = await wt.prepareTarget('windows.notepad', {}, multi);
  assert.equal(m.state, 'waiting_for_user');
  assert.equal(m.errorCode, 'WORK_TARGET_MULTIPLE_MATCHES');
  assert.equal(multi.calls.launch.length, 0);
});

test('15·16·28. 실행 중이 아니면 등재 실행 파일로 시작하고, 창이 나타난 뒤 활성화해야 ready 다', async () => {
  const deps = fakeDeps({ windows: [], appearAfterLaunch: [{ hwnd: 55, pid: 9, processName: 'notepad', title: '제목 없음 - 메모장', minimized: false }] });
  const r = await wt.prepareTarget('windows.notepad', {}, deps);
  assert.equal(r.state, 'ready');
  assert.equal(r.openedByO4O, true);
  assert.deepEqual(deps.calls.launch, ['windows.notepad']);
  assert.deepEqual(deps.calls.activate, [55]);
  assert.ok(deps.calls.census >= 2, '실행 뒤 창을 다시 찾는다');
});

test('18·15. launchAllowed=false(계산기) 는 실행하지 않고 사용자에게 넘긴다 — 프로세스 0', async () => {
  const deps = fakeDeps({ windows: [] });
  const r = await wt.prepareTarget('windows.calculator', {}, deps);
  assert.equal(r.state, 'waiting_for_user');
  assert.equal(r.errorCode, 'WORK_TARGET_USER_ACTION_REQUIRED');
  assert.equal(r.reason, 'launch_not_allowed');
  assert.equal(deps.calls.launch.length, 0);
  assert.equal(registry.findWindowsApp('windows.calculator').launchAllowed, false);
});

test('20. 실행 실패(경로 없음) · 창 미출현(timeout) 은 사용자 요청으로 끝난다', async () => {
  const missing = fakeDeps({ windows: [], launchResult: { launched: false, reason: 'NOT_FOUND' } });
  const r1 = await wt.prepareTarget('windows.notepad', {}, missing);
  assert.equal(r1.state, 'waiting_for_user');
  assert.equal(r1.errorCode, 'WORK_TARGET_LAUNCH_FAILED');
  assert.equal(r1.reason, 'launch_path_missing');
  const never = fakeDeps({ windows: [], launchResult: { launched: true }, appearAfterLaunch: [] });
  const r2 = await wt.prepareTarget('windows.notepad', {}, never);
  assert.equal(r2.state, 'waiting_for_user');
  assert.equal(r2.errorCode, 'WORK_TARGET_TIMEOUT');
  assert.equal(r2.openedByO4O, true);
});

test('19·22·27. launchRegisteredApp 은 등재 항목만 — 임의 경로 · 인자 · 셸 · 미허용 앱은 스크립트에 닿지 않는다', async () => {
  for (const app of [
    { appId: 'x', launchAllowed: true, launch: { kind: 'executable', path: 'cmd.exe' } },
    { appId: 'x', launchAllowed: true, launch: { kind: 'executable', path: 'C:\\Windows\\System32\\cmd.exe /c dir' } },
    { appId: 'x', launchAllowed: true, launch: { kind: 'executable', path: 'C:\\evil\\payload.bat' } },
    { appId: 'x', launchAllowed: true, launch: { kind: 'executable', path: 'C:\\a "b".exe' } },
    { appId: 'x', launchAllowed: true, launch: { kind: 'command', path: 'C:\\Windows\\System32\\notepad.exe' } },
    { appId: 'x', launchAllowed: false, launch: { kind: 'executable', path: 'C:\\Windows\\System32\\notepad.exe' } },
    { appId: 'x', launchAllowed: true },
  ]) {
    const r = await control.launchRegisteredApp(app);
    assert.deepEqual(r, { launched: false, reason: 'LAUNCH_NOT_ALLOWED' }, JSON.stringify(app));
  }
  const ps = codeOnly(read('windows-app-launch.ps1'));
  assert.equal((ps.match(/Start-Process/g) ?? []).length, 1);
  assert.ok(ps.includes('Start-Process -FilePath $raw -PassThru'));
  for (const forbidden of ['-ArgumentList', '-Verb', 'Invoke-', 'iex', '-Command', 'cmd.exe', '$args', 'param(']) assert.ok(!ps.includes(forbidden), forbidden);
  assert.ok(ps.includes("\\.(exe|lnk)$'"));
  assert.ok(ps.includes('$env:O4O_LAUNCH_PATH'));
  // 등재 launch 경로는 형식 규칙 안이다(테스트가 등재부를 검증한다).
  assert.match(NOTEPAD.launch.path, /^[A-Za-z]:\\[^"'<>|?*\r\n\t]+\.(exe|lnk)$/);
});

// ─── privacy · boundary ─────────────────────────────────────────────────────

test('24·25·26·49. work-target 은 fs · child_process · 네트워크 · credential 을 만지지 않고, 창 제목/URL 로 명령을 만들지 않는다', () => {
  const src = codeOnly(read('work-target.mjs'));
  for (const forbidden of ["'node:fs'", 'child_process', 'fetch(', 'http', 'credentials', 'password', 'cookie', 'Get-Process', 'Win32_Product', 'tasklist', 'readdir', 'Desktop']) {
    assert.ok(!src.includes(forbidden), forbidden);
  }
  // 창 제목은 matchWindows(등재 process 이름) 판정에만 쓰인다 — 제목 문자열을 반환값에 싣는 코드가 없다.
  assert.ok(!src.includes('title:') && !src.includes('.title'));
  // 확장 discover 응답에서 쓰는 필드는 tabId · active · lastAccessed · path 뿐(제목 · URL 없음).
  assert.ok(!src.includes('.url') && !src.includes('.title'));
  // 확장 쪽: 등재 site 탭만 고르고 요약 10개 · path 200자 상한, 제목은 요약에 없다.
  const sw = codeOnly(read('../../o4o-chrome-extension/src/service-worker.js'));
  assert.ok(sw.includes('TARGET_TAB_SUMMARY_MAX = 10'));
  assert.ok(sw.includes('siteIdForUrl(t.url) === siteId'));
  assert.ok(!/title:\s*t\.title/.test(sw));
  assert.ok(sw.includes('chrome.tabs.create({ url: site.url, active: true })'), 'open 은 등재부 상수 URL 만');
  assert.ok(!sw.includes('chrome.tabs.remove') && !sw.includes('chrome.tabs.move'), '다른 탭을 닫거나 옮기지 않는다');
});
