/**
 * O4O UIA Canonical Test Surface — 고정 회귀 smoke (WO-O4O-WINDOWS-UIA-CANONICAL-TEST-SURFACE-V0 §57·§58)
 *
 * 실제 Windows 에서 돈다(node:test 아님): `node tools/o4o-local-agent/test/smoke/test-surface-smoke.mjs`
 * 계측 창을 띄우고(이미 떠 있으면 재사용) 공통 자동화층을 고정 순서로 통과시킨 뒤 단계별로
 * PASS · BLOCKED_AS_EXPECTED · TAKEOVER_AS_EXPECTED · FINDING · FAIL 을 찍는다. FAIL 이 하나라도 있으면 exit 1.
 *
 * 실측 발견(§18): 이 PC 에서 WinForms(.NET) 컨트롤은 UIA-MSAA 브리지로 노출되는데, **첫 UIA 클라이언트(inspect)에는
 * 패턴(Value/Invoke/Toggle)이 보이지만 이후 별도 프로세스(각 action 은 새 PowerShell)에는 패턴 없는 프록시로 온다.**
 * 그래서 요소 값/기본동작(set_value·invoke) 은 이 창에서 구동되지 않는다(UIA_ACTION_NOT_SUPPORTED). 네이티브/HWND 기반
 * 앱(카카오톡 RichEdit · 메모장 Edit)은 영향 없다. 지속 UIA 클라이언트가 필요한 별도 WO 다(§19). 이 smoke 는 그 발견을
 * FINDING 으로 기록하고, **패턴 재해석이 필요 없는 안전 동작**(숨은 목록 좌표 클릭 차단 · 사용자 활동 · 대상 창 전환 · 재개)은
 * 창/좌표 수준에서 검증한다.
 *
 * 실행 중 키보드·마우스를 쓰지 마세요(안전층이 정상적으로 거절해 FAIL 로 보입니다). idle 상태에서 돌립니다.
 */

import { execFile } from 'node:child_process';

process.env.O4O_DEV_TARGETS = '1';
const [h, c, ts, sf] = await Promise.all([
  import('../../src/handlers.mjs'),
  import('../../src/windows-window-control.mjs'),
  import('../../src/windows-test-surface.mjs'),
  import('../../src/windows-automation-safety.mjs'),
]);
const APP = ts.TEST_SURFACE_TARGET.appId;
const act = (base, args) => h.runAction(`local.uia.${base}#${APP}`, {}, args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ps = (cmd) => new Promise((res) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true }, () => res()));
const results = [];
let failed = 0;
function record(step, verdict, detail = '') {
  if (verdict === 'FAIL') failed += 1;
  results.push({ step, verdict, detail });
  console.log(`${verdict.padEnd(20)} ${step}${detail ? ` — ${detail}` : ''}`);
}
const expectCode = (step, r, code, reason, kind = 'BLOCKED_AS_EXPECTED') => {
  const ok = r.status === 'failed' && r.errorCode === code && (!reason || r.data?.safety?.reason === reason);
  record(step, ok ? kind : 'FAIL', `${r.status} ${r.errorCode ?? ''} ${r.data?.safety ? JSON.stringify(r.data.safety) : ''}`.trim());
  return ok;
};
async function observe() {
  const r = await act('inspect', undefined);
  if (r.status !== 'success') throw new Error(`inspect failed: ${r.errorCode}`);
  const d = r.data;
  return { d, snap: d.snapshotId, find: (pred) => d.elements.find(pred), label: (p) => d.elements.find((e) => e.role === 'text' && e.name.startsWith(p))?.name ?? null, windows: d.windows };
}
const surfaceHwnd = async () => (await c.censusWindows()).find((w) => w.processName.toLowerCase() === 'powershell' && w.title.startsWith(ts.TEST_SURFACE_TITLE))?.hwnd;
// 최소화 + foreground 가 실제로 창을 떠났는지 확인(폴링). WinForms 최소화가 늦게 반영돼 verify 가 아직 foreground=대상으로 볼 수 있어서다.
const minimizeSurface = async () => {
  const hwnd = await surfaceHwnd();
  for (let i = 0; i < 4; i += 1) {
    await ps(`Add-Type -Name W -Namespace X -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n); [DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow();'; [X.W]::ShowWindow([IntPtr]${hwnd}, 6) | Out-Null; Start-Sleep -Milliseconds 800`);
    const fgIsTarget = c.matchWindows(await c.censusWindows(), ts.TEST_SURFACE_TARGET).some((w) => w.foreground);
    if (!fgIsTarget) return true;
  }
  return false;
};
const startJiggler = () => execFile('powershell.exe', ['-NoProfile', '-Command', "Add-Type -Name M -Namespace J -MemberDefinition '[DllImport(\"user32.dll\")] public static extern void mouse_event(uint f, int x, int y, uint d, IntPtr e);'; for ($i=0; $i -lt 28; $i++) { [J.M]::mouse_event(1, ($(if ($i % 2 -eq 0) { 3 } else { -3 })), 0, 0, [IntPtr]::Zero); Start-Sleep -Milliseconds 300 }"], { windowsHide: true }, () => {});

let launched = null;
const before = await h.runAction(`local.target.prepare#${APP}`, {}, undefined);
if (before.data?.state === 'ready') {
  record('launch', 'PASS', '이미 떠 있는 계측 창 재사용');
} else {
  record('discover(not running) → launch_not_allowed(등재 실행 경로 없음)', before.data?.state === 'waiting_for_user' && before.data?.reason === 'launch_not_allowed' ? 'PASS' : 'FAIL', JSON.stringify({ state: before.data?.state, reason: before.data?.reason }));
  launched = c.launchTestSurface();
  let ready = false;
  for (let i = 0; i < 20 && !ready; i += 1) { await sleep(500); ready = c.matchWindows(await c.censusWindows(), ts.TEST_SURFACE_TARGET).length > 0; }
  record('launch(test-surface CLI 경로)', ready ? 'PASS' : 'FAIL', `pid ${launched.pid}`);
  if (!ready) { console.log('계측 창이 뜨지 않아 중단'); process.exit(1); }
}
try {
  // ── discover · activate ──────────────────────────────────────────────────
  const prep = await h.runAction(`local.target.prepare#${APP}`, {}, undefined);
  record('discover → activate', prep.status === 'success' && prep.data.state === 'ready' ? 'PASS' : 'FAIL', JSON.stringify({ state: prep.data?.state, reused: prep.data?.reusedExisting, windows: prep.data?.windowCount }));

  // ── inspect: 노출 지도(§6·§30) — 이 창의 핵심 가치. 모든 컨트롤 role · custom rows 미노출 ─
  const o = await observe();
  const has = (name, role) => o.d.elements.some((e) => e.name === name && (!role || e.role === role));
  const items = o.d.elements.filter((e) => e.role === 'listitem' && ['Alpha', 'Bravo', 'Charlie'].includes(e.name));
  const custom = o.find((e) => e.role === 'list' && e.name === 'CustomRows');
  const rows = o.d.elements.filter((e) => /^Row [123]$/.test(e.name));
  record('inspect: textbox · button · list(+items 3) · checkbox · combobox · tab · submit', has('TextInput', 'textbox') && has('Action', 'button') && has('ExposedList', 'list') && items.length === 3 && has('Option', 'checkbox') && has('ChoiceCombo', 'combobox') && has('Tab B', 'tab') && has('전송', 'button') ? 'PASS' : 'FAIL', `elements ${o.d.elementCount}`);
  record('inspect: CustomRows = list 컨테이너 노출 · 행 자식 0(카카오톡 목록 재현)', custom && rows.length === 0 ? 'PASS' : 'FAIL', `rows ${rows.length}`);
  // 노출 패턴(첫 클라이언트에는 보인다): textbox=value, button=invoke, checkbox=toggle, listitem=select
  const pats = (n) => (o.find((e) => e.name === n)?.editable ? 'value' : '') || '';
  record('inspect: 첫 클라이언트에는 패턴 노출(textbox=value)', o.find((e) => e.name === 'TextInput')?.editable === true ? 'PASS' : 'FAIL', `TextInput editable=${o.find((e) => e.name === 'TextInput')?.editable}`);

  // ── FINDING(§18): WinForms 요소 값/기본동작은 별도 action 프로세스에서 패턴이 사라져 구동되지 않는다 ─
  const tb = o.find((e) => e.role === 'textbox' && e.name === 'TextInput');
  const sv = await act('set_value', { elementRef: tb.elementRef, snapshotId: o.snap, text: 'O4O TEST' });
  record('WinForms 요소 set_value(지속 UIA 클라이언트 필요 — §18·§19 후속 WO)', sv.status === 'failed' && sv.errorCode === 'UIA_ACTION_NOT_SUPPORTED' ? 'FINDING' : (sv.status === 'success' ? 'PASS(예상 밖 성공)' : 'FAIL'), `${sv.status} ${sv.errorCode ?? ''}`);

  // ── hidden custom rows: 좌표 클릭 차단(§11·§37 — 헤드라인 안전 동작, 패턴 불필요) ─
  const cr = o.find((e) => e.role === 'list' && e.name === 'CustomRows');
  expectCode('hidden custom row 좌표 클릭 차단', await act('click', { elementRef: cr.elementRef, snapshotId: o.snap, x: 0.5, y: 0.15 }), 'WINDOWS_AUTOMATION_HIDDEN_CONTROL', 'blind_list_click');
  const o2 = await observe();
  record('re-observe: Custom row 변화 없음(실행 0)', o2.label('Custom row:') === 'Custom row: (none)' ? 'PASS' : 'FAIL', o2.label('Custom row:'));

  // ── user activity: 창 수준 key(요소 패턴 불필요) — 사용자 활동 중 거절(§24) ─
  startJiggler();
  await sleep(700);
  const t0 = Date.now();
  expectCode('사용자 마우스 활동 중 창 key(TAB)', await act('key', { key: 'TAB', snapshotId: o2.snap }), 'WINDOWS_AUTOMATION_USER_ACTIVE', 'user_active', 'TAKEOVER_AS_EXPECTED');
  record('automation 상태 = waiting_for_user/user_active', sf.getSafetyState().status === 'waiting_for_user' && sf.getSafetyState().pauseReason === 'user_active' ? 'PASS' : 'FAIL', `${Date.now() - t0} ms`);
  await sleep(8500);

  // ── foreground change: 창 최소화(사용자가 떠남) 뒤 창 key → TARGET_CHANGED(§41) ─
  const o3 = await observe();
  const leftForeground = await minimizeSurface();
  if (!leftForeground) {
    record('창 최소화 뒤 창 key(TAB) — 최소화가 foreground 를 못 옮김', 'FINDING', 'foreground 안 바뀜(다른 창 없음) — 실 앱(카카오톡·메모장)에서 TARGET_CHANGED 검증됨');
  } else {
    expectCode('창 최소화 뒤 창 key(TAB)', await act('key', { key: 'TAB', snapshotId: o3.snap }), 'WINDOWS_AUTOMATION_TARGET_CHANGED', 'other_app_foreground');
  }

  // ── resume: re-discover → activate(복원) → 새 관찰(§44) ─
  const re = await h.runAction(`local.target.prepare#${APP}`, {}, undefined);
  record('resume: re-discover → activate(복원)', re.status === 'success' && re.data.state === 'ready' ? 'PASS' : 'FAIL', JSON.stringify({ state: re.data?.state, restored: re.data?.restored }));
  const o4 = await observe();
  record('resume: 옛 snapshot 폐기 후 새 관찰 성공', o4.d.snapshotId !== o3.snap && o4.windows.length >= 1 ? 'PASS' : 'FAIL', `snap ${o4.snap}`);
  record('automation 상태 = running(재개)', sf.getSafetyState().status === 'running' ? 'PASS' : 'FAIL', JSON.stringify(sf.automationSummary()));
} catch (e) {
  record('harness', 'FAIL', String(e?.message ?? e));
} finally {
  if (launched) { launched.stop(); await launched.exited; record('close(harness 가 띄운 창 종료)', 'PASS'); }
}
const counts = results.reduce((m, r) => ({ ...m, [r.verdict]: (m[r.verdict] ?? 0) + 1 }), {});
console.log('\n=== summary ===', JSON.stringify(counts));
process.exit(failed > 0 ? 1 : 0);
