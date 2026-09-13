/**
 * Windows UI Automation V0 — agent 실행층 테스트 (WO-O4O-WINDOWS-UI-AUTOMATION-V0)
 *
 * 의존성 0 — node:test + node:assert. 실 UIA · 실 카카오톡은 CHECK 의 smoke 가 본다. 여기서는 스크립트 실행(runUiaScript)과
 * 창 census 를 흉내 내어 snapshot · ref 규칙 · 인자/텍스트/키/좌표 경계 · COMMIT/USER_ACTION 거절 · 결과 형상을 잠근다.
 *
 * 흉내: windows-window-control.mjs 의 export 를 바꿔치기할 수 없어(ESM), handlers 대신 windows-uia.mjs 를 직접 부르되
 * runUiaScript/censusWindows 는 module mock 이 없으므로 **스크립트 출력 파서와 규칙**을 실제 함수 위에서 검증한다 — 실제 스크립트가
 * 도는 항목은 이 PC 의 등재 앱이 떠 있을 때만 의미가 있어 smoke 로 뺀다.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const uia = await import('../src/windows-uia.mjs');
const handlers = await import('../src/handlers.mjs');
const registry = await import('../src/windows-app-registry.mjs');

const read = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const codeOnly = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*(?:\/\/|#).*$/gm, '');

test('등재 · 별칭 · launch: 카카오톡이 서버와 같은 appId 로 등재되고 실행 경로는 agent 에만 있다', () => {
  const app = registry.findWindowsApp('windows.kakaotalk');
  assert.ok(app);
  assert.deepEqual([...app.processNames], ['KakaoTalk']);
  assert.ok(app.aliases.includes('카카오톡') && app.aliases.includes('카톡'));
  assert.equal(app.launchAllowed, true);
  assert.match(app.launch.path, /^[A-Za-z]:\\[^"'<>|?*\r\n\t]+\.exe$/);
  assert.ok(handlers.listAllowedActions().includes('local.uia.inspect'));
  assert.deepEqual(handlers.listAllowedActions().filter((a) => a.startsWith('local.uia.')).sort(), ['local.uia.click', 'local.uia.inspect', 'local.uia.invoke', 'local.uia.key', 'local.uia.set_value']);
});

test('handler 경계: 등재 밖 appId · #없음 · 인자 있는 inspect 는 거절(스크립트 0)', async () => {
  assert.deepEqual(await handlers.runAction('local.uia.inspect#evil.app', {}, undefined), { status: 'denied', errorCode: 'WINDOWS_APP_NOT_REGISTERED' });
  assert.deepEqual(await handlers.runAction('local.uia.inspect', {}, undefined), { status: 'denied', errorCode: 'WINDOWS_APP_NOT_REGISTERED' });
  const withArgs = await handlers.runAction('local.uia.inspect#windows.notepad', {}, { hwnd: 1 });
  assert.equal(withArgs.status, 'denied');
  assert.equal(withArgs.errorCode, 'UIA_INVALID_ARGUMENT');
});

test('요소 동작 인자 경계: 형상 · snapshot 규칙 · 텍스트 규칙 · 허용 키 · 좌표 · clicks — 어느 것도 스크립트에 닿지 않는다', async () => {
  const app = registry.findWindowsApp('windows.notepad');
  uia.clearUiaSnapshots();
  // snapshot 이 없으면 stale — 어떤 형상이 맞아도 실행되지 않는다.
  assert.deepEqual((await uia.uiaSetValue(app, { elementRef: 'e_1', snapshotId: 's_nope0001', text: 'x' })).errorCode, 'UIA_ELEMENT_STALE');
  assert.deepEqual((await uia.uiaInvoke(app, { elementRef: 'e_1', snapshotId: 's_nope0001' })).errorCode, 'UIA_ELEMENT_STALE');
  assert.deepEqual((await uia.uiaKey(app, { key: 'ENTER', snapshotId: 's_nope0001' })).errorCode, 'UIA_ELEMENT_STALE');
  assert.deepEqual((await uia.uiaClick(app, { elementRef: 'e_1', snapshotId: 's_nope0001', x: 0.5, y: 0.5 })).errorCode, 'UIA_ELEMENT_STALE');
  // 형상 밖 · 규칙 밖 → INVALID_ARGUMENT / TEXT_DENIED (stale 판정보다 먼저)
  for (const bad of [
    ['set_value', { elementRef: 'e_1', snapshotId: 's_nope0001', text: 'x', hwnd: 5 }],
    ['set_value', { elementRef: 'e_1', snapshotId: 's_nope0001', text: '' }],
    ['set_value', { elementRef: 'e_1', snapshotId: 's_nope0001', text: 'a\nb' }],
    ['set_value', { elementRef: 'e_1', snapshotId: 's_nope0001', text: 'x'.repeat(501) }],
    ['set_value', { elementRef: 'C:\\x.exe', snapshotId: 's_nope0001', text: 'x' }],
    ['key', { key: 'ALT+F4', snapshotId: 's_nope0001' }],
    ['key', { key: 'CTRL+V', snapshotId: 's_nope0001' }],
    ['key', { key: 'ENTER', snapshotId: 's_nope0001', vk: 13 }],
    ['click', { elementRef: 'e_1', snapshotId: 's_nope0001', x: 1.5, y: 0 }],
    ['click', { elementRef: 'e_1', snapshotId: 's_nope0001', x: 0.1, y: 0.1, clicks: 3 }],
    ['click', { elementRef: 'e_1', snapshotId: 's_nope0001', screenX: 10, screenY: 10 }],
    ['invoke', { elementRef: 'e_1' }],
  ]) {
    const fn = { set_value: uia.uiaSetValue, key: uia.uiaKey, click: uia.uiaClick, invoke: uia.uiaInvoke }[bad[0]];
    const r = await fn(app, bad[1]);
    assert.equal(r.status, 'denied', JSON.stringify(bad));
    assert.ok(['UIA_INVALID_ARGUMENT', 'UIA_TEXT_DENIED'].includes(r.errorCode), JSON.stringify([bad, r]));
  }
  const cred = await uia.uiaSetValue(app, { elementRef: 'e_1', snapshotId: 's_nope0001', text: '비밀번호 1234' });
  assert.equal(cred.errorCode, 'UIA_TEXT_DENIED');
  assert.deepEqual([...uia.UIA_ALLOWED_KEYS], ['ENTER', 'TAB', 'ESC', 'CTRL+ENTER']);
});

test('risk: COMMIT 이름 판정은 DOM 과 같은 목록 · 컨테이너 role 은 READ', () => {
  assert.equal(uia.riskLevelForName('삭제'), 'COMMIT');
  assert.equal(uia.riskLevelForName('송금하기'), 'COMMIT');
  assert.equal(uia.riskLevelForName('Delete message'), 'COMMIT');
  assert.equal(uia.riskLevelForName('전송'), 'REVERSIBLE'); // 전송 자체는 DOM 과 같이 REVERSIBLE — 제출 경계는 창 이름 규칙(서버)이 건다
  assert.equal(uia.riskLevelForName('검색'), 'REVERSIBLE');
});

test('경계(소스): uia.mjs 는 fs/child_process/네트워크 0 · 스크립트는 Start-Process/Invoke/-Command 0 · pid 는 등재 process 이름과 대조 · 키 4 · 텍스트 500', () => {
  const mjs = codeOnly(read('windows-uia.mjs'));
  for (const forbidden of ["'node:fs'", 'child_process', 'fetch(', 'http', 'process.argv']) assert.ok(!mjs.includes(forbidden), forbidden);
  assert.ok(mjs.includes('textDenyReason(args.text)'));
  assert.ok(mjs.includes("riskLevelForName(r.entry.name) === 'COMMIT'"));
  assert.ok(mjs.includes('entry.userAction'));
  const ps = codeOnly(read('windows-uia.ps1'));
  for (const forbidden of ['Start-Process', 'Invoke-Expression', 'iex ', '-Command', 'cmd.exe', '$args', 'param(', 'Get-Clipboard', 'Set-Clipboard', 'ShellExecute']) assert.ok(!ps.includes(forbidden), forbidden);
  assert.ok(ps.includes("'^(inspect|set_value|invoke|key|click|activate|verify)$'"));
  assert.ok(ps.includes("if ($action -eq 'verify')"), 'SAFETY-V1 probe(입력 없음)');
  assert.ok(ps.includes('GetLastInputInfo') && ps.includes('UserBusy'), '사용자 활동 중 입력 주입 금지');
  assert.ok(ps.includes('ReplaceAllText') && ps.includes('0x00C2'), 'Edit/RichEdit 는 편집 메시지(EM_REPLACESEL)');
  assert.ok(ps.includes("'^(ENTER|TAB|ESC|CTRL\\+ENTER)$'"));
  assert.ok(ps.includes('$allowedNames -notcontains $proc.ProcessName'));
  assert.ok(ps.includes('$text.Length -gt 500'));
  assert.ok(ps.includes('$SKIP_CLASS'), '임베디드 웹 콘텐츠는 내려가지 않는다');
  // execFile 지점은 여전히 windows-window-control 하나 · 스크립트 8개(UIA-CANONICAL-TEST-SURFACE-V0 의 계측 창 1개 포함)
  const control = codeOnly(read('windows-window-control.mjs'));
  const scripts = [...control.matchAll(/'([\w-]+\.ps1)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(scripts, ['windows-app-launch.ps1', 'windows-browser-open.ps1', 'windows-computer-input.ps1', 'windows-computer-inspect.ps1', 'windows-test-surface.ps1', 'windows-uia.ps1', 'windows-window-activate.ps1', 'windows-window-census.ps1']);
});
