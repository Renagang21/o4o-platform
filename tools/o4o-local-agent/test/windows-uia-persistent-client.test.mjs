/**
 * 지속 UIA 호스트 · 클라이언트 — agent 실행층 잠금 (WO-O4O-WINDOWS-UIA-ELEMENT-IDENTITY-AND-PERSISTENT-CLIENT-V1 §54~§58)
 *
 * 의존성 0 — node:test + node:assert. 실 UIA · 실 호스트 프로세스는 CHECK 의 Windows smoke 가 본다(5개 필수 조건).
 * 여기서는 **소스 경계**(호스트 .ps1 금지 토큰 · 네이티브 recipe · 프로토콜 형상, 클라이언트 mjs 실행 은닉 · 오류 계약)와
 * **왕복 없이 결정되는 동작**(호스트가 없을 때 act 는 왕복 없이 GENERATION_MISMATCH 로 단락, 옛 ref 거부)을 잠근다.
 *
 * 주의: hostInspect() 는 실제 powershell 호스트를 띄우므로 여기서 부르지 않는다 — 그 왕복은 smoke 전용이다.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const client = await import('../src/windows-uia-client.mjs');

const read = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const codeOnly = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*(?:\/\/|#).*$/gm, '');

test('호스트 .ps1: UTF-8 BOM 으로 시작한다 (PowerShell 5.1 이 한글 주석을 ANSI 로 오독하지 않도록)', () => {
  const bytes = fs.readFileSync(new URL('../src/windows-uia-host.ps1', import.meta.url));
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
});

test('호스트 .ps1: 입력 주입 · 임의 실행 · 클립보드 API 0 — 동작은 UIA 패턴으로만 (Safety V1 우회 불가)', () => {
  const ps = codeOnly(read('windows-uia-host.ps1'));
  for (const forbidden of [
    'SendInput', 'mouse_event', 'keybd_event', 'PostMessage', 'SendMessage', // 입력/메시지 주입
    'Start-Process', 'Invoke-Expression', 'iex ', '-Command', 'cmd.exe', 'ShellExecute', 'Invoke-Item', // 임의 실행
    '$args', 'param(', // 외부 인자 표면
    'Get-Clipboard', 'Set-Clipboard', // 클립보드
  ]) {
    assert.ok(!ps.includes(forbidden), forbidden);
  }
});

test('호스트 .ps1: 네이티브 공급자 recipe 만 쓴다 — FindAll(pid)+ControlViewWalker, FromHandle·FindFirst(RuntimeId) 금지', () => {
  const ps = codeOnly(read('windows-uia-host.ps1'));
  // 네이티브 공급자가 붙는 유일한 조합(실측): RootElement.FindAll(Children, ProcessIdProperty) + ControlViewWalker.
  assert.ok(ps.includes('ProcessIdProperty'), 'pid 로 top-level 창을 건다');
  assert.ok(ps.includes('ControlViewWalker'), '트리 하강은 ControlViewWalker 로만');
  assert.ok(ps.includes('.FindAll('), 'top-level 은 FindAll(Children)');
  // MSAA 프록시를 부르는 두 경로는 없어야 한다.
  assert.ok(!ps.includes('FromHandle'), 'FromHandle 는 MSAA 프록시를 부른다');
  assert.ok(!ps.includes('FindFirst'), 'FindFirst(RuntimeId) 는 MSAA 프록시를 부른다');
});

test('호스트 .ps1: op 는 넷(ping|inspect|act|shutdown) · act.kind 는 둘(set_value|invoke) · 텍스트 500 · 대상 pid/창 이중 방어', () => {
  const ps = codeOnly(read('windows-uia-host.ps1'));
  // op 디스패치는 이 넷만.
  for (const op of ['ping', 'inspect', 'act', 'shutdown']) assert.ok(ps.includes(`'${op}'`), op);
  // act.kind 는 이 둘만 — 임의 동작 없음.
  assert.ok(ps.includes("$kind -ne 'set_value' -and $kind -ne 'invoke'"), 'kind 는 set_value|invoke 뿐');
  // 등록 대상 밖 금지: pid 실 process 이름 대조 + hwnd 는 attach pid 소유.
  assert.ok(ps.includes("reason = 'PROCESS_NOT_REGISTERED'"), 'pid 이름 대조(이중 방어)');
  assert.ok(ps.includes("$names -notcontains $proc.ProcessName.ToLowerInvariant()"));
  assert.ok(ps.includes('GetWindowThreadProcessId') && ps.includes("reason = 'WINDOW_NOT_TARGET'"), 'hwnd 는 attach pid 소유');
  // 텍스트 상한 500 · 제어문자 거부(값 규칙은 client 가 먼저 걸지만 호스트도 방어).
  assert.ok(ps.includes('$text.Length -gt 500'));
  // generation 불일치는 호스트에서도 거절(재기동 후 옛 ref).
  assert.ok(ps.includes("reason = 'GENERATION_MISMATCH'"));
  // 재식별은 identity 앵커(automationId·className·name·role)로만 — RuntimeId 로 다시 찾지 않는다.
  assert.ok(ps.includes('ReidentifyInWindow'), 'stale 시 앵커로 재식별');
});

test('클라이언트 mjs: child_process 는 windows-window-control 의 startUiaHost 뒤에 숨는다 · 네트워크/fs 0 · §51 오류 계약', () => {
  const mjs = codeOnly(read('windows-uia-client.mjs'));
  for (const forbidden of ['child_process', "'node:fs'", 'fetch(', 'http', 'process.argv', 'Start-Process']) {
    assert.ok(!mjs.includes(forbidden), forbidden);
  }
  assert.ok(mjs.includes("import { startUiaHost } from './windows-window-control.mjs'"), '실행 지점은 단일 import');
  for (const code of ['UIA_CLIENT_UNAVAILABLE', 'UIA_CLIENT_TIMEOUT', 'UIA_GENERATION_MISMATCH']) {
    assert.ok(mjs.includes(code), code);
  }
  // stdin/stdout JSON 한 줄 — 브로커/큐 없음(단순 IPC).
  assert.ok(mjs.includes('stdin.write') && mjs.includes("'\\n'"), '요청은 개행 종료 JSON 한 줄');
});

test('클라이언트: 호스트가 없으면 act 는 왕복 없이 UIA_GENERATION_MISMATCH 로 단락한다 (옛 ref 거부) · 호스트를 띄우지 않는다', async () => {
  // 선행 inspect 가 없으면(=이 프로세스가 갓 시작) 살아 있는 호스트가 없다. act 는 반드시 캐시된 핸들을 요구하므로 즉시 거절.
  assert.equal(client.currentGeneration(), null);
  const r = await client.hostAct({ generation: 'stale-gen-token', kind: 'set_value', rid: '1.2.3', hwnd: 42, text: 'x', identity: {} });
  assert.deepEqual(r, { ok: false, errorCode: 'UIA_GENERATION_MISMATCH' });
  // 단락 경로는 호스트를 띄우지 않는다(여전히 generation 없음).
  assert.equal(client.currentGeneration(), null);
});
