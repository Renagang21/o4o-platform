/**
 * Windows Automation Safety & Takeover V1 — agent 안전층 테스트 (WO-O4O-WINDOWS-AUTOMATION-SAFETY-AND-TAKEOVER-V1 §60~§65)
 *
 * 의존성 0 — node:test + node:assert. probe(verify) 와 sleep 을 주입해 판정 규칙 · 일시정지/재검사 · 인계 코드를 잠근다.
 *
 *   user activity  1 no recent input → allow · 2 recent activity → pause · 3 pause 뒤 재검사(재개) · 4 키 내용 미수집
 *   target         5 expected foreground → allow · 6 다른 창 → reject · 7 process 바뀜 → reject · 8 stale ref → reject · 9 최소화/복원 뒤 재검증
 *   submit         10 검증된 대상 제출 → allow(risk 정책 그대로) · 11 대상 불확실 → reject · 12 키 의미 미상 → reject · 13 잘못된 profile → reject
 *   UIA hidden     14 노출 행 → structured · 15 hidden rows blind click → reject · 16 ambiguous → takeover
 *   computer use   17~19 는 서버 spec(vision 경로 없음 — 코드 예약)
 *   takeover       20 user_active · 21 target_changed · 22 hidden_control · 23 submit_not_verified · 24 resume 뒤 재검증
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sf = await import('../src/windows-automation-safety.mjs');
const registry = await import('../src/windows-app-registry.mjs');

const KAKAO = registry.findWindowsApp('windows.kakaotalk');
const NOTEPAD = registry.findWindowsApp('windows.notepad');
const NOPROFILE = { appId: 'windows.calculator', processNames: ['Calculator'] };

const okProbe = (over = {}) => ({ ok: true, idleMs: 5000, sinceInjectMs: 999999, userBusy: false, foregroundHwnd: 100, foregroundPid: 7, foregroundIsTarget: true, foregroundSameProcess: true, targetVisible: true, targetTitle: '홍길동', elementOk: true, windowCount: 2, ...over });
const ctx = (over = {}) => ({ action: 'key', key: 'ENTER', app: KAKAO, entry: { role: 'textbox', hwnd: 100, rid: '42.1.7', name: 'RichEdit Control' }, snapshotTitle: '홍길동', snapshotWindowCount: 2, ...over });
const gate = (probes, c, limits = { pauseWaitMs: 0 }) => {
  let i = 0;
  const seen = [];
  return sf.runSafetyGate(c, { probe: async () => { const p = probes[Math.min(i, probes.length - 1)]; i += 1; return p; }, sleep: async (ms) => { seen.push(ms); }, limits }).then((d) => ({ ...d, probes: i, sleeps: seen }));
};

test('1·5·10. 최근 입력 없음 + foreground 대상 + 요소 재해석 OK + 제목 일치 → 제출 허용(risk 재분류 없음)', async () => {
  const d = await gate([okProbe()], ctx());
  assert.equal(d.allow, true);
  assert.equal(d.code, null);
  assert.equal(d.retries, 0);
  assert.equal(sf.getSafetyState().status, 'running');
});

test('2·3·20. 최근 사용자 활동 → 일시정지 · 재검사 · 잠잠해지면 재개 / 계속이면 USER_ACTIVE 인계', async () => {
  const resumed = await gate([okProbe({ userBusy: true, idleMs: 200 }), okProbe()], ctx());
  assert.equal(resumed.allow, true);
  assert.equal(resumed.retries, 1);
  assert.equal(resumed.probes, 2);
  const stuck = await gate([okProbe({ userBusy: true, idleMs: 100 })], ctx());
  assert.equal(stuck.allow, false);
  assert.equal(stuck.code, 'WINDOWS_AUTOMATION_USER_ACTIVE');
  assert.equal(stuck.paused, true);
  assert.equal(stuck.retries, sf.SAFETY_LIMITS.pauseRetries);
  assert.equal(sf.getSafetyState().status, 'waiting_for_user');
  assert.equal(sf.getSafetyState().pauseReason, 'user_active');
});

test('4·10(키 내용). 판정 입력에 키 내용 · 마우스 좌표 이력 · 창 텍스트 필드가 없고 소스에도 수집 코드가 없다', () => {
  const probeKeys = Object.keys(okProbe()).sort();
  for (const forbidden of ['keys', 'typed', 'text', 'chars', 'cursorHistory', 'screenshot']) assert.ok(!probeKeys.includes(forbidden));
  const src = fs.readFileSync(new URL('../src/windows-automation-safety.mjs', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of ['GetAsyncKeyState', 'SetWindowsHookEx', 'RegisterRawInputDevices', 'keylog', 'BlockInput', 'child_process', "'node:fs'", 'fetch(']) assert.ok(!src.includes(forbidden), forbidden);
  const ps = fs.readFileSync(new URL('../src/windows-uia.ps1', import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
  for (const forbidden of ['GetAsyncKeyState', 'SetWindowsHookEx', 'RegisterRawInputDevices', 'BlockInput', 'GetKeyboardState']) assert.ok(!ps.includes(forbidden), forbidden);
  assert.ok(ps.includes('GetLastInputInfo'), '활동 유무만(GetLastInputInfo)');
});

test('6·7·21. 다른 창(같은 process) · 다른 프로그램 foreground → TARGET_CHANGED · 대상 창 사라짐 · 새 창(modal) 등장', () => {
  assert.equal(sf.judge(okProbe({ foregroundIsTarget: false, foregroundSameProcess: true }), ctx()).reason, 'other_window_same_process');
  assert.equal(sf.judge(okProbe({ foregroundIsTarget: false, foregroundSameProcess: false }), ctx()).code, 'WINDOWS_AUTOMATION_TARGET_CHANGED');
  assert.equal(sf.judge(okProbe({ targetVisible: false }), ctx()).reason, 'target_window_gone');
  assert.equal(sf.judge(okProbe({ windowCount: 3 }), ctx()).reason, 'unexpected_window');
  // activate(창을 앞으로) 는 foreground 조건을 요구하지 않는다 — 그것이 목적이다
  assert.equal(sf.judge(okProbe({ foregroundIsTarget: false }), ctx({ action: 'activate', entry: { role: 'window', hwnd: 100, rid: '1', name: '홍길동' } })).allow, true);
});

test('8·11·16. 요소 stale → UIA_AMBIGUOUS · 제목 바뀜 → TARGET_UNCERTAIN · probe 실패 → TARGET_UNCERTAIN', () => {
  assert.equal(sf.judge(okProbe({ elementOk: false }), ctx()).code, 'WINDOWS_AUTOMATION_UIA_AMBIGUOUS');
  assert.equal(sf.judge(okProbe({ targetTitle: '다른방' }), ctx()).code, 'WINDOWS_AUTOMATION_TARGET_UNCERTAIN');
  assert.equal(sf.judge(null, ctx()).reason, 'probe_failed');
});

test('9·24. 최소화/복원 · 인계 뒤 재개는 새 probe 로 다시 판정한다(이전 판정을 신뢰하지 않는다)', async () => {
  const blocked = await gate([okProbe({ targetVisible: false })], ctx());
  assert.equal(blocked.allow, false);
  const resumed = await gate([okProbe()], ctx());
  assert.equal(resumed.allow, true);
  assert.equal(sf.getSafetyState().status, 'running');
  assert.equal(sf.getSafetyState().paused, false);
});

test('12·13·19. 키 의미: profile 없음 → 제출/취소 키 금지 · riskyKeys(ESC) 금지 · 줄바꿈/TAB 허용 · notepad ENTER 는 줄바꿈(제출 아님)', () => {
  assert.equal(sf.judge(okProbe(), ctx({ app: NOPROFILE })).code, 'WINDOWS_AUTOMATION_KEY_UNKNOWN');
  assert.equal(sf.judge(okProbe(), ctx({ app: NOPROFILE, key: 'ESC' })).code, 'WINDOWS_AUTOMATION_KEY_UNKNOWN');
  assert.equal(sf.judge(okProbe(), ctx({ app: NOPROFILE, key: 'TAB' })).allow, true);
  assert.equal(sf.judge(okProbe(), ctx({ key: 'ESC' })).reason, 'risky_key');
  assert.equal(sf.judge(okProbe(), ctx({ key: 'CTRL+ENTER' })).allow, true);
  assert.deepEqual(sf.classifyKey(KAKAO, 'ENTER'), { kind: 'submit', risky: false, known: true });
  assert.deepEqual(sf.classifyKey(NOTEPAD, 'ENTER'), { kind: 'newline', risky: false, known: true });
  assert.equal(sf.judge(okProbe(), ctx({ app: NOTEPAD, key: 'ENTER', entry: { role: 'textbox', hwnd: 100, rid: '', name: '' } })).allow, true, '줄바꿈 키는 요소 재검증 없이도 허용');
});

test('11·23. 제출 직전 재검증: 요소 없이 보내는 제출 · 제목 없는 창 → SUBMIT_UNVERIFIED', () => {
  assert.equal(sf.judge(okProbe({ elementOk: null }), ctx({ entry: { role: 'textbox', hwnd: 100, rid: '', name: '' } })).code, 'WINDOWS_AUTOMATION_SUBMIT_UNVERIFIED');
  assert.equal(sf.judge(okProbe({ targetTitle: null }), ctx({ snapshotTitle: undefined })).code, 'WINDOWS_AUTOMATION_SUBMIT_UNVERIFIED');
});

test('14·15·22. 노출된 항목 invoke 는 통과 · 항목 미노출 목록(list/listitem)에 좌표 클릭 → HIDDEN_CONTROL · pane 좌표 클릭은 통과', () => {
  assert.equal(sf.judge(okProbe(), ctx({ action: 'invoke', entry: { role: 'listitem', hwnd: 100, rid: '5', name: '항목' } })).allow, true);
  assert.equal(sf.judge(okProbe(), ctx({ action: 'click', coords: true, entry: { role: 'list', hwnd: 100, rid: '5', name: 'ContactListCtrl' } })).code, 'WINDOWS_AUTOMATION_HIDDEN_CONTROL');
  assert.equal(sf.judge(okProbe(), ctx({ action: 'click', coords: true, entry: { role: 'listitem', hwnd: 100, rid: '5', name: '' } })).reason, 'blind_list_click');
  assert.equal(sf.judge(okProbe(), ctx({ action: 'click', coords: true, entry: { role: 'pane', hwnd: 100, rid: '5', name: '' } })).allow, true);
});

test('§6·§35. 상태: 관찰 뒤 running · 60 s 지나면 idle 로 보고 · 요약에 창 제목/핸들 없음', () => {
  sf.markAutomationActive('windows.kakaotalk', 'w_1');
  const s = sf.getSafetyState();
  assert.equal(s.active, true);
  assert.equal(s.status, 'running');
  const summary = sf.automationSummary();
  assert.deepEqual(Object.keys(summary).sort(), ['active', 'pauseReason', 'paused', 'since', 'status', 'targetId']);
  assert.ok(!JSON.stringify(summary).includes('hwnd') && !JSON.stringify(summary).includes('title'));
  sf.markAutomationIdle();
  assert.equal(sf.getSafetyState().active, false);
});

test('registry: 카카오톡 · 메모장 profile 이 서버 사본과 같은 값이다(실측 기준)', () => {
  assert.deepEqual([...KAKAO.interactionProfile.submitKeys], ['ENTER']);
  assert.deepEqual([...KAKAO.interactionProfile.newlineKeys], ['CTRL+ENTER']);
  assert.deepEqual([...KAKAO.interactionProfile.riskyKeys], ['ESC']);
  assert.deepEqual([...KAKAO.uiaVisibilityHints.hidden], ['list_rows', 'message_list', 'send_button']);
  assert.deepEqual([...NOTEPAD.interactionProfile.submitKeys], []);
  assert.equal(registry.findWindowsApp('windows.calculator').interactionProfile, undefined);
});
