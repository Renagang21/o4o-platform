/**
 * Windows UIA Canonical Test Surface — 격리 · 잠금 테스트 (WO-O4O-WINDOWS-UIA-CANONICAL-TEST-SURFACE-V0 §53)
 *
 * 의존성 0 — node:test + node:assert. 실제 창은 띄우지 않는다(실 Windows smoke 는 test/smoke/test-surface-smoke.mjs).
 *
 *   1 script exists · 2 test target registry(dev 게이트) · 3 launch only test target · 4 arbitrary script/path reject
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const codeOnly = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '').split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');

test('1. 계측 창 스크립트가 있고 WinForms 기본만 쓴다 — 외부 실행 · 셸 · 입력 hook · 파일/네트워크 0', () => {
  const ps = codeOnly(read('windows-test-surface.ps1'));
  assert.ok(ps.includes('Add-Type -AssemblyName System.Windows.Forms'));
  assert.ok(ps.includes('AccessibleRole]::List'), 'CustomRows 는 List 컨테이너로만 노출(행 자식 0)');
  assert.ok(ps.includes("$form.AcceptButton = $btnSubmit"), 'ENTER = 전송(외부 부작용 없음)');
  assert.ok(ps.includes("$TITLE + ' *'"), '제목 표식 옵션(§21)');
  for (const forbidden of ['Start-Process', 'Invoke-', 'iex', '-Command', '-EncodedCommand', 'Start-Job', 'cmd.exe', '& $', '& "', '$args', 'param(', '$env:',
    'Add-Type -TypeDefinition', 'DllImport', 'SetWindowsHookEx', 'GetAsyncKeyState', 'Set-Content', 'Out-File', 'Invoke-WebRequest', 'Net.', 'Clipboard', 'Get-Process']) {
    assert.ok(!ps.includes(forbidden), forbidden);
  }
});

test('2. 개발 대상은 O4O_DEV_TARGETS=1 인 프로세스에서만 존재한다 · production 등재부 목록에는 없다', async () => {
  const prev = process.env.O4O_DEV_TARGETS;
  delete process.env.O4O_DEV_TARGETS;
  const reg = await import('../src/windows-app-registry.mjs');
  const ts = await import('../src/windows-test-surface.mjs');
  assert.equal(reg.findWindowsApp(ts.TEST_SURFACE_TARGET.appId), undefined);
  assert.ok(!reg.listWindowsAppIds().includes(ts.TEST_SURFACE_TARGET.appId));
  process.env.O4O_DEV_TARGETS = '1';
  assert.equal(reg.findWindowsApp(ts.TEST_SURFACE_TARGET.appId), ts.TEST_SURFACE_TARGET);
  // 켜져 있어도 production 목록(서버와 동일해야 하는 목록)에는 들어가지 않는다.
  assert.ok(!reg.listWindowsAppIds().includes(ts.TEST_SURFACE_TARGET.appId));
  assert.ok(!read('windows-app-registry.mjs').includes("appId: 'windows.o4o-test-surface'"));
  if (prev === undefined) delete process.env.O4O_DEV_TARGETS; else process.env.O4O_DEV_TARGETS = prev;
  // 등재 값(§15·§25)
  assert.deepEqual([...ts.TEST_SURFACE_TARGET.interactionProfile.submitKeys], ['ENTER']);
  assert.deepEqual([...ts.TEST_SURFACE_TARGET.uiaVisibilityHints.hidden], ['custom_rows']);
  assert.deepEqual([...ts.TEST_SURFACE_TARGET.processNames], ['powershell']);
  assert.deepEqual([...ts.TEST_SURFACE_TARGET.windowTitlePatterns], ['o4o uia test surface']);
  assert.equal(ts.TEST_SURFACE_TARGET.devOnly, true);
});

test('3·4. 등재 실행 경로로는 계측 창을 시작할 수 없다(launchAllowed=false · .exe/.lnk 만) · 시작 함수는 상수 스크립트 하나 · argv 상수', async () => {
  const c = await import('../src/windows-window-control.mjs');
  const ts = await import('../src/windows-test-surface.mjs');
  assert.deepEqual(await c.launchRegisteredApp(ts.TEST_SURFACE_TARGET), { launched: false, reason: 'LAUNCH_NOT_ALLOWED' });
  assert.deepEqual(await c.launchRegisteredApp({ ...ts.TEST_SURFACE_TARGET, launchAllowed: true, launch: { kind: 'executable', path: 'C:\\x\\windows-test-surface.ps1' } }), { launched: false, reason: 'LAUNCH_NOT_ALLOWED' });
  const control = codeOnly(read('windows-window-control.mjs'));
  assert.ok(control.includes("path.join(HERE, 'windows-test-surface.ps1')"));
  assert.ok(control.includes("['-WindowStyle', 'Hidden', ...PS_FLAGS, TEST_SURFACE_SCRIPT]"), 'argv 상수 — 경로 · 인자를 밖에서 받지 않는다');
  assert.equal(c.launchTestSurface.length, 0, '인자 없음');
  // work-target 은 launchAllowed=false 면 사용자에게 넘긴다(launch_not_allowed) — 실행 시도 0. 게이트가 꺼져 있으면 등재 밖(NOT_REGISTERED).
  const wt = await import('../src/work-target.mjs');
  const deps = { censusWindows: async () => [], activateWindowHandle: async () => ({ activated: false }), launchRegisteredApp: async () => { throw new Error('must not launch'); }, now: () => 0, sleep: async () => {} };
  const prev = process.env.O4O_DEV_TARGETS;
  delete process.env.O4O_DEV_TARGETS;
  assert.equal((await wt.prepareTarget(ts.TEST_SURFACE_TARGET.appId, {}, deps)).errorCode, 'WORK_TARGET_NOT_REGISTERED');
  process.env.O4O_DEV_TARGETS = '1';
  const r = await wt.prepareTarget(ts.TEST_SURFACE_TARGET.appId, {}, deps);
  assert.equal(r.state, 'waiting_for_user');
  assert.equal(r.reason, 'launch_not_allowed');
  if (prev === undefined) delete process.env.O4O_DEV_TARGETS; else process.env.O4O_DEV_TARGETS = prev;
});
