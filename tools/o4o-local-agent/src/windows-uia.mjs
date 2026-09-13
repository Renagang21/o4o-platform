/**
 * Windows UI Automation V0 — agent 실행층 (WO-O4O-WINDOWS-UI-AUTOMATION-V0)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇인가
 *
 *   등재 앱(Target Discovery 로 준비된 창)의 UI 를 **구조적으로**(UIA 트리) 읽고, 그 안의 요소 하나에
 *   값 입력 · 기본 동작 · 키 1회 · 창 안 좌표 클릭을 수행한다. 브라우저 DOM 축과 같은 계약(elementRef +
 *   snapshotId · role · name · riskLevel)이라 Goal-Driven Work Agent 가 같은 Planner 어휘로 다룬다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 경계
 *
 *   - 대상은 등재 appId 의 process 뿐(census → pid). 임의 창 · 임의 pid · HWND 지정은 표현할 수 없다.
 *   - 요소 RuntimeId · 창 핸들 · 창 제목 원문은 **이 프로세스 메모리의 snapshot 에만** 있다. 서버·AI 는 `e_n` 만 본다.
 *   - 텍스트 · 키는 computer-use-limits 의 같은 규칙(길이 · 제어문자 · credential 성격 금지 · ENTER/TAB/ESC)을 지난다.
 *   - 로그인 · 비밀번호 · 인증 · 파일 대화상자 창(제목 표식)에는 어떤 입력도 넣지 않는다(USER_ACTION_REQUIRED).
 *   - COMMIT 성격 이름(결제 · 삭제 · 송금 …)의 요소는 invoke 하지 않는다(DOM 과 같은 목록).
 *   - 실행은 windows-window-control.mjs 의 단일 execFile 지점 → windows-uia.ps1 하나.
 */

import { censusWindows, matchWindows, runUiaScript } from './windows-window-control.mjs';
import { textDenyReason, isUserActionTitle, COMPUTER_ALLOWED_KEYS, isValidNormalizedCoordinate } from './computer-use-limits.mjs';
import { runSafetyGate, markAutomationActive, SAFETY_ERROR } from './windows-automation-safety.mjs';

/** UIA 키 허용 목록 = computer-use 의 셋 + CTRL+ENTER(여러 줄 입력창 제출 관례). 다른 수식키 조합 · 단축키는 없다. */
export const UIA_ALLOWED_KEYS = Object.freeze([...COMPUTER_ALLOWED_KEYS, 'CTRL+ENTER']);

export const UIA_ELEMENT_REF_RE = /^e_[1-9][0-9]{0,3}$/;
export const UIA_SNAPSHOT_ID_RE = /^s_[a-z0-9]{4,32}$/;
export const UIA_MAX_ELEMENTS = 150;
const SNAPSHOT_KEEP = 5;
const NAME_MAX = 80;

/** DOM 과 같은 COMMIT 판정 목록(content-script.js 의 사본). 이름에 이 말이 있으면 자동 invoke 하지 않는다. */
export const UIA_COMMIT_KEYWORDS_KO = Object.freeze(['결제', '주문확정', '주문하기', '주문완료', '구매', '결제하기', '삭제', '탈퇴', '게시', '발행', '송금', '이체', '승인', '확정']);
export const UIA_COMMIT_KEYWORDS_EN = Object.freeze(['pay', 'payment', 'checkout', 'place order', 'purchase', 'buy now', 'delete', 'remove account', 'publish', 'confirm order', 'submit order', 'transfer', 'approve']);

export const UIA_ROLES = Object.freeze(['window', 'pane', 'textbox', 'document', 'button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'listitem', 'list', 'combobox', 'text', 'image', 'custom']);
const CLICKABLE_ROLES = Object.freeze(['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'listitem']);
const POINTER_ROLES = Object.freeze(['window', 'pane', 'list', 'listitem', 'custom', 'image', 'document', 'text']);

export function riskLevelForName(name) {
  const compact = String(name ?? '').replace(/\s+/g, '');
  const lower = String(name ?? '').toLowerCase();
  if (UIA_COMMIT_KEYWORDS_KO.some((k) => compact.includes(k))) return 'COMMIT';
  if (UIA_COMMIT_KEYWORDS_EN.some((k) => new RegExp(`\\b${k.replace(/\s+/g, '\\s+')}\\b`).test(lower))) return 'COMMIT';
  return 'REVERSIBLE';
}

// ─── snapshot 저장소(프로세스 메모리) ────────────────────────────────────────
const snapshots = new Map(); // snapshotId → { appId, pid, elements: Map<e_n, entry>, windows }

function newSnapshotId() {
  return 's_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function remember(snapshot) {
  snapshots.set(snapshot.id, snapshot);
  while (snapshots.size > SNAPSHOT_KEEP) snapshots.delete(snapshots.keys().next().value);
}
/** 테스트용 — 저장된 snapshot 을 비운다. */
export function clearUiaSnapshots() {
  snapshots.clear();
}

async function resolvePid(app) {
  const windows = matchWindows(await censusWindows(), app);
  if (windows.length === 0) return null;
  return windows[0].pid;
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const exactKeys = (o, keys) => Object.keys(o).sort().join(',') === [...keys].sort().join(',');

// ─── inspect ─────────────────────────────────────────────────────────────────

/**
 * 앱의 보이는 top-level 창 전부의 UIA 트리를 읽어 snapshot 을 만든다. 돌려주는 요소는 DOM 계약과 같은 형상이다.
 * 창 제목 · 요소 이름은 UI 라벨이라 Planner 에 간다(UNTRUSTED). RuntimeId · hwnd · rect 는 snapshot 에만 남는다.
 */
export async function uiaInspect(app) {
  const pid = await resolvePid(app);
  if (pid === null) return { status: 'failed', errorCode: 'WINDOWS_APP_NOT_RUNNING', data: { appId: app.appId, displayName: app.displayName } };
  const raw = await runUiaScript({ O4O_UIA_ACTION: 'inspect', O4O_UIA_PID: String(pid), O4O_UIA_PROCESS_NAMES: (app.processNames || []).join(',') });
  if (!raw || raw.ok !== true || !Array.isArray(raw.elements)) {
    return { status: 'failed', errorCode: raw?.reason === 'PROCESS_NOT_FOUND' ? 'WINDOWS_APP_NOT_RUNNING' : 'UIA_UNAVAILABLE', data: { appId: app.appId, displayName: app.displayName } };
  }
  const snapshot = { id: newSnapshotId(), appId: app.appId, pid, elements: new Map(), windows: [] };
  const elements = [];
  let n = 0;
  const windowUserAction = new Map();
  const windowRefByHwnd = new Map();
  for (const w of Array.isArray(raw.windows) ? raw.windows : []) {
    const title = String(w.title ?? '');
    windowUserAction.set(Number(w.hwnd), isUserActionTitle(title));
    windowRefByHwnd.set(Number(w.hwnd), `w_${windowRefByHwnd.size + 1}`);
    snapshot.windows.push({ hwnd: Number(w.hwnd), title, foreground: w.foreground === true, minimized: w.minimized === true, rect: Array.isArray(w.rect) ? w.rect : null });
  }
  for (const e of raw.elements.slice(0, UIA_MAX_ELEMENTS)) {
    n += 1;
    const elementRef = `e_${n}`;
    const role = UIA_ROLES.includes(e.role) ? e.role : 'custom';
    const name = String(e.name ?? '').slice(0, NAME_MAX);
    const hwnd = Number(e.hwnd);
    const userAction = windowUserAction.get(hwnd) === true;
    const riskLevel = role === 'window' || role === 'pane' || role === 'list' || role === 'text' || role === 'image' ? 'READ' : riskLevelForName(name);
    snapshot.elements.set(elementRef, { hwnd, rid: String(e.rid ?? ''), role, name, rect: Array.isArray(e.rect) ? e.rect : null, userAction, patterns: Array.isArray(e.patterns) ? e.patterns : [] });
    const out = { elementRef, role, name, riskLevel, disabled: e.enabled === false, offscreen: e.offscreen === true, focused: e.focused === true, windowRef: windowRefByHwnd.get(hwnd) ?? 'w_0' };
    if (typeof e.value === 'string' && e.value.length > 0) { out.text = e.value.slice(0, NAME_MAX); out.hasValue = true; }
    if (Array.isArray(e.patterns) && e.patterns.includes('value')) out.editable = true;
    if (userAction) out.userAction = true;
    if (Array.isArray(e.rect) && e.rect.length === 4) out.size = [e.rect[2], e.rect[3]];
    elements.push(out);
  }
  remember(snapshot);
  const windowsOut = snapshot.windows.map((w, i) => ({ windowRef: `w_${i + 1}`, title: w.title.slice(0, 60), foreground: w.foreground, minimized: w.minimized, userAction: isUserActionTitle(w.title) }));
  // SAFETY-V1 §6: 관찰이 성공하면 이 앱에서 자동화 진행 중이다(창 ref 만 — 제목·핸들은 상태에 넣지 않는다).
  markAutomationActive(app.appId, windowsOut.find((w) => w.foreground)?.windowRef ?? windowsOut[0]?.windowRef ?? null);
  return {
    status: 'success',
    data: { appId: app.appId, displayName: app.displayName, snapshotId: snapshot.id, windows: windowsOut, elements, elementCount: elements.length, truncated: raw.truncated === true },
  };
}

// ─── 요소 동작 ───────────────────────────────────────────────────────────────

function lookup(args) {
  if (!isPlainObject(args)) return { ok: false, errorCode: 'UIA_INVALID_ARGUMENT' };
  if (!UIA_SNAPSHOT_ID_RE.test(String(args.snapshotId)) || !UIA_ELEMENT_REF_RE.test(String(args.elementRef))) return { ok: false, errorCode: 'UIA_INVALID_ARGUMENT' };
  const snapshot = snapshots.get(args.snapshotId);
  if (!snapshot) return { ok: false, errorCode: 'UIA_ELEMENT_STALE' };
  const entry = snapshot.elements.get(args.elementRef);
  if (!entry) return { ok: false, errorCode: 'UIA_ELEMENT_NOT_FOUND' };
  if (entry.userAction) return { ok: false, errorCode: 'UIA_USER_ACTION_REQUIRED' };
  return { ok: true, snapshot, entry };
}

/**
 * SAFETY-V1 §5·§47 — 입력 action 직전 안전 게이트. verify probe(입력 없음)로 사용자 활동 · foreground · 대상 창/요소 · 제출 재검증을 판정한다.
 * 거절이면 `{ status:'failed', errorCode: WINDOWS_AUTOMATION_*, data.safety }` 를 돌려주고 스크립트 action 은 부르지 않는다.
 */
async function safetyGate(app, snapshot, entry, ctx) {
  const win = snapshot.windows.find((w) => w.hwnd === entry.hwnd);
  const probe = () => runUiaScript({ O4O_UIA_ACTION: 'verify', O4O_UIA_PID: String(snapshot.pid), O4O_UIA_PROCESS_NAMES: (app.processNames || []).join(','), O4O_UIA_HWND: String(entry.hwnd), ...(entry.rid ? { O4O_UIA_RID: entry.rid } : {}) });
  const decision = await runSafetyGate(
    { ...ctx, app, entry: { role: entry.role, hwnd: entry.hwnd, rid: entry.rid, name: entry.name }, snapshotTitle: win ? win.title.slice(0, 60) : undefined, snapshotWindowCount: snapshot.windows.length },
    { probe, sleep: (ms) => new Promise((r) => setTimeout(r, ms)) },
  );
  if (decision.allow) return null;
  return { status: 'failed', errorCode: decision.code, data: { appId: app.appId, elementRef: ctx.elementRef, safety: { reason: decision.reason, paused: decision.paused === true, retries: decision.retries ?? 0 } } };
}

function envBase(app, snapshot, entry) {
  return { O4O_UIA_PID: String(snapshot.pid), O4O_UIA_PROCESS_NAMES: (app.processNames || []).join(','), O4O_UIA_HWND: String(entry.hwnd), O4O_UIA_RID: entry.rid };
}

function mapScriptFailure(raw) {
  const reason = raw?.reason;
  if (reason === 'ELEMENT_STALE') return 'UIA_ELEMENT_STALE';
  if (reason === 'ELEMENT_DISABLED' || reason === 'NOT_EDITABLE' || reason === 'READ_ONLY' || reason === 'NOT_INVOKABLE') return 'UIA_ACTION_NOT_SUPPORTED';
  if (reason === 'TARGET_NOT_FOREGROUND' || reason === 'WINDOW_NOT_VISIBLE') return 'UIA_TARGET_NOT_FOREGROUND';
  if (reason === 'USER_ACTIVE') return SAFETY_ERROR.USER_ACTIVE;
  if (reason === 'PROCESS_NOT_FOUND' || reason === 'WINDOW_NOT_TARGET') return 'WINDOWS_APP_NOT_RUNNING';
  return 'UIA_UNAVAILABLE';
}

/** `{ elementRef, snapshotId, text }` — Value pattern 이 있는 요소(textbox)에만. 값 원문은 응답에 짧게(80자)만. */
export async function uiaSetValue(app, args) {
  if (!isPlainObject(args) || !exactKeys(args, ['elementRef', 'snapshotId', 'text'])) return { status: 'denied', errorCode: 'UIA_INVALID_ARGUMENT' };
  const deny = textDenyReason(args.text);
  if (deny) return { status: 'denied', errorCode: deny === 'DENIED_CONTENT' ? 'UIA_TEXT_DENIED' : 'UIA_INVALID_ARGUMENT' };
  const r = lookup(args);
  if (!r.ok) return { status: r.errorCode === 'UIA_USER_ACTION_REQUIRED' ? 'failed' : 'denied', errorCode: r.errorCode, data: { appId: app.appId } };
  if (r.entry.role !== 'textbox') return { status: 'denied', errorCode: 'UIA_ACTION_NOT_SUPPORTED', data: { appId: app.appId, elementRef: args.elementRef, role: r.entry.role } };
  const blocked = await safetyGate(app, r.snapshot, r.entry, { action: 'set_value', elementRef: args.elementRef });
  if (blocked) return blocked;
  const raw = await runUiaScript({ ...envBase(app, r.snapshot, r.entry), O4O_UIA_ACTION: 'set_value', O4O_UIA_TEXT: args.text });
  if (!raw || raw.ok !== true) return { status: 'failed', errorCode: mapScriptFailure(raw), data: { appId: app.appId, elementRef: args.elementRef } };
  return { status: 'success', data: { appId: app.appId, elementRef: args.elementRef, role: r.entry.role, riskLevel: 'REVERSIBLE', executed: true, verified: raw.verified === true, hasValue: raw.hasValue === true, via: raw.via === 'edit_message' ? 'edit_message' : 'setvalue' } };
}

/** `{ elementRef, snapshotId }` — button/link/checkbox/radio/tab/menuitem/listitem 의 기본 동작. COMMIT 이름은 실행하지 않는다. */
export async function uiaInvoke(app, args) {
  if (!isPlainObject(args) || !exactKeys(args, ['elementRef', 'snapshotId'])) return { status: 'denied', errorCode: 'UIA_INVALID_ARGUMENT' };
  const r = lookup(args);
  if (!r.ok) return { status: r.errorCode === 'UIA_USER_ACTION_REQUIRED' ? 'failed' : 'denied', errorCode: r.errorCode, data: { appId: app.appId } };
  if (r.entry.role === 'window') {
    // 창 요소의 기본 동작 = 그 창을 앞으로. 같은 앱이 창을 여럿(메인 + 대화창) 띄웠을 때 Planner 가 작업 창을 고르는 구조적 방법.
    const blockedA = await safetyGate(app, r.snapshot, r.entry, { action: 'activate', elementRef: args.elementRef });
    if (blockedA) return blockedA;
    const rawA = await runUiaScript({ ...envBase(app, r.snapshot, r.entry), O4O_UIA_ACTION: 'activate' });
    if (!rawA || rawA.ok !== true) return { status: 'failed', errorCode: mapScriptFailure(rawA), data: { appId: app.appId, elementRef: args.elementRef } };
    return { status: 'success', data: { appId: app.appId, elementRef: args.elementRef, role: 'window', riskLevel: 'READ', executed: true } };
  }
  if (!CLICKABLE_ROLES.includes(r.entry.role)) return { status: 'denied', errorCode: 'UIA_ACTION_NOT_SUPPORTED', data: { appId: app.appId, elementRef: args.elementRef, role: r.entry.role } };
  if (riskLevelForName(r.entry.name) === 'COMMIT') return { status: 'failed', errorCode: 'UIA_ACTION_NOT_ALLOWED', data: { appId: app.appId, elementRef: args.elementRef, role: r.entry.role, riskLevel: 'COMMIT' } };
  const blocked = await safetyGate(app, r.snapshot, r.entry, { action: 'invoke', elementRef: args.elementRef });
  if (blocked) return blocked;
  const raw = await runUiaScript({ ...envBase(app, r.snapshot, r.entry), O4O_UIA_ACTION: 'invoke' });
  if (!raw || raw.ok !== true) return { status: 'failed', errorCode: mapScriptFailure(raw), data: { appId: app.appId, elementRef: args.elementRef } };
  return { status: 'success', data: { appId: app.appId, elementRef: args.elementRef, role: r.entry.role, riskLevel: 'REVERSIBLE', executed: true } };
}

/** `{ key, snapshotId, elementRef? }` — ENTER/TAB/ESC 1회. elementRef 가 있으면 그 요소에 focus 를 준 뒤 보낸다(입력창에서 ENTER = 제출). */
export async function uiaKey(app, args) {
  if (!isPlainObject(args) || !(exactKeys(args, ['key', 'snapshotId']) || exactKeys(args, ['key', 'snapshotId', 'elementRef']))) return { status: 'denied', errorCode: 'UIA_INVALID_ARGUMENT' };
  if (!UIA_ALLOWED_KEYS.includes(args.key)) return { status: 'denied', errorCode: 'UIA_INVALID_ARGUMENT' };
  let snapshot;
  let entry = null;
  if (args.elementRef !== undefined) {
    const r = lookup(args);
    if (!r.ok) return { status: r.errorCode === 'UIA_USER_ACTION_REQUIRED' ? 'failed' : 'denied', errorCode: r.errorCode, data: { appId: app.appId } };
    snapshot = r.snapshot;
    entry = r.entry;
  } else {
    if (!UIA_SNAPSHOT_ID_RE.test(String(args.snapshotId))) return { status: 'denied', errorCode: 'UIA_INVALID_ARGUMENT' };
    snapshot = snapshots.get(args.snapshotId);
    if (!snapshot) return { status: 'denied', errorCode: 'UIA_ELEMENT_STALE', data: { appId: app.appId } };
    // 요소 없이 키만 보낼 때는 foreground 창(snapshot 기준)이 대상이다.
    const fg = snapshot.windows.find((w) => w.foreground) ?? snapshot.windows[0];
    if (!fg) return { status: 'failed', errorCode: 'WINDOWS_APP_NOT_RUNNING', data: { appId: app.appId } };
    if (isUserActionTitle(fg.title)) return { status: 'failed', errorCode: 'UIA_USER_ACTION_REQUIRED', data: { appId: app.appId } };
    entry = { hwnd: fg.hwnd, rid: '' };
  }
  const blocked = await safetyGate(app, snapshot, entry, { action: 'key', key: args.key, elementRef: args.elementRef });
  if (blocked) return blocked;
  const env = { O4O_UIA_PID: String(snapshot.pid), O4O_UIA_PROCESS_NAMES: (app.processNames || []).join(','), O4O_UIA_HWND: String(entry.hwnd), O4O_UIA_ACTION: 'key', O4O_UIA_KEY: args.key };
  if (entry.rid) env.O4O_UIA_RID = entry.rid;
  const raw = await runUiaScript(env);
  if (!raw || raw.ok !== true) return { status: 'failed', errorCode: mapScriptFailure(raw), data: { appId: app.appId } };
  const data = { appId: app.appId, key: args.key, riskLevel: 'REVERSIBLE', executed: true, foregroundStill: raw.foregroundStill === true, via: raw.via === 'message' ? 'message' : 'input' };
  if (args.elementRef !== undefined) {
    data.elementRef = args.elementRef;
    // 제출 뒤 입력창은 비거나 **placeholder 문구**("메시지 입력" 등)로 바뀐다 — 보낸 텍스트가 더 이상 값에 없으면 비운 것으로 본다.
    const before = typeof raw.valueBefore === 'string' ? raw.valueBefore.trim() : '';
    const after = typeof raw.valueAfter === 'string' ? raw.valueAfter.trim() : '';
    data.valueCleared = before.length > 0 && !after.includes(before);
    data.hasValue = after.length > 0 && after.includes(before);
  }
  return { status: 'success', data };
}

/** `{ elementRef, snapshotId, x, y, clicks? }` — 요소(창 · 목록 · pane …) 안의 정규화 좌표를 클릭한다. UIA 가 항목을 노출하지 않는 커스텀 목록의 fallback. */
export async function uiaClick(app, args) {
  if (!isPlainObject(args) || !(exactKeys(args, ['elementRef', 'snapshotId', 'x', 'y']) || exactKeys(args, ['elementRef', 'snapshotId', 'x', 'y', 'clicks']))) return { status: 'denied', errorCode: 'UIA_INVALID_ARGUMENT' };
  if (!isValidNormalizedCoordinate(args.x) || !isValidNormalizedCoordinate(args.y)) return { status: 'denied', errorCode: 'UIA_INVALID_ARGUMENT' };
  const clicks = args.clicks === undefined ? 1 : args.clicks;
  if (clicks !== 1 && clicks !== 2) return { status: 'denied', errorCode: 'UIA_INVALID_ARGUMENT' };
  const r = lookup(args);
  if (!r.ok) return { status: r.errorCode === 'UIA_USER_ACTION_REQUIRED' ? 'failed' : 'denied', errorCode: r.errorCode, data: { appId: app.appId } };
  if (!POINTER_ROLES.includes(r.entry.role) || !Array.isArray(r.entry.rect)) return { status: 'denied', errorCode: 'UIA_ACTION_NOT_SUPPORTED', data: { appId: app.appId, elementRef: args.elementRef, role: r.entry.role } };
  if (riskLevelForName(r.entry.name) === 'COMMIT') return { status: 'failed', errorCode: 'UIA_ACTION_NOT_ALLOWED', data: { appId: app.appId, elementRef: args.elementRef, role: r.entry.role, riskLevel: 'COMMIT' } };
  // 요소 rect 안의 좌표 → 창 client 정규화 좌표(스크립트가 창 기준으로 클릭한다).
  const win = r.snapshot.windows.find((w) => w.hwnd === r.entry.hwnd);
  if (!win || !Array.isArray(win.rect)) return { status: 'failed', errorCode: 'UIA_UNAVAILABLE', data: { appId: app.appId } };
  const [ex, ey, ew, eh] = r.entry.rect;
  const [wx, wy, ww, wh] = win.rect;
  if (ew <= 0 || eh <= 0 || ww <= 0 || wh <= 0) return { status: 'failed', errorCode: 'UIA_ACTION_NOT_SUPPORTED', data: { appId: app.appId } };
  // UIA rect 는 창 바깥 프레임 기준이라 client 원점과 몇 픽셀 어긋날 수 있다 — 상단 프레임을 스크립트가 아니라 여기서 보정하지 않고,
  // 창 rect 자체를 기준으로 정규화한다(오차 = 프레임 두께, 목록 행 높이보다 작다).
  const nx = Math.min(1, Math.max(0, (ex + ew * args.x - wx) / ww));
  const ny = Math.min(1, Math.max(0, (ey + eh * args.y - wy) / wh));
  const fmt = (v) => v.toFixed(6).replace(/0+$/, '').replace(/\.$/, '.0');
  const blocked = await safetyGate(app, r.snapshot, r.entry, { action: 'click', coords: true, elementRef: args.elementRef });
  if (blocked) return blocked;
  const raw = await runUiaScript({ O4O_UIA_PID: String(r.snapshot.pid), O4O_UIA_PROCESS_NAMES: (app.processNames || []).join(','), O4O_UIA_HWND: String(r.entry.hwnd), O4O_UIA_ACTION: 'click', O4O_UIA_X: fmt(nx), O4O_UIA_Y: fmt(ny), O4O_UIA_CLICKS: String(clicks) });
  if (!raw || raw.ok !== true) return { status: 'failed', errorCode: mapScriptFailure(raw), data: { appId: app.appId, elementRef: args.elementRef } };
  return { status: 'success', data: { appId: app.appId, elementRef: args.elementRef, role: r.entry.role, riskLevel: 'REVERSIBLE', executed: true, clicks } };
}
