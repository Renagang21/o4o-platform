/**
 * Windows Automation Safety & Takeover V1 — agent 안전층
 *
 * WO-O4O-WINDOWS-AUTOMATION-SAFETY-AND-TAKEOVER-V1 §2·§5~§32·§37~§43·§49·§56·§58
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 한 문장
 *
 *   구조적으로 확인 가능한 것만 실행한다 — 불확실한 대상은 고르지 않고, 제출 전 대상을 다시 확인하고,
 *   사용자 입력이 섞이면 멈추고, 위험하면 사용자에게 넘긴다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 위치 (§5·§47)
 *
 *   Planner → Runtime 검증(서버) → **여기(agent Safety gate)** → windows-uia.ps1 실행 → 재관찰
 *   모든 Windows 입력 action(set_value · invoke · key · click · activate) 은 실행 직전에 `runSafetyGate` 를 지난다.
 *   gate 는 `verify` probe(입력을 만들지 않음) 결과 + 등재 앱 profile + snapshot 으로 판정한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 판정 (§7~§8·§13~§21·§25~§27·§40~§42)
 *
 *   USER_ACTIVE         최근 사용자 키/마우스 활동(우리 주입 제외) → 짧게 멈추고 재검사(§8·§11·§12) → 계속 활동이면 인계
 *   TARGET_CHANGED      foreground 가 대상 창(또는 같은 process)이 아니다 · 대상 창이 사라졌다 · 창 수가 바뀌었다(새 modal)
 *   TARGET_UNCERTAIN    대상 창 제목이 snapshot 때와 다르다(같은 handle 인데 내용이 바뀜 — 대화방 전환 등)
 *   UIA_AMBIGUOUS       요소를 다시 찾지 못했다(stale)
 *   HIDDEN_CONTROL      항목이 노출되지 않는 목록(list/listitem)에 좌표 클릭 — 눈감고 고르는 클릭 금지(§25~§27)
 *   SUBMIT_UNVERIFIED   제출 키인데 대상 재검증(창 · 요소 · 제목)이 하나라도 실패
 *   KEY_UNKNOWN         앱 profile 이 없거나 그 키의 의미를 모르는데 제출/위험 성격 키(§20·§21) · profile 이 riskyKeys 로 둔 키
 *   PAUSED              사용자 활동으로 멈춘 상태(재개는 다음 관찰부터 — §38·§39)
 *
 *   키 내용 · 마우스 위치 이력 · 창 전체 텍스트 · 스크린샷은 수집하지 않는다(§10·§53). 전역 입력 차단 · 훅 · 드라이버는 없다(§37).
 *   risk 는 기존 READ/REVERSIBLE/REVIEW_REQUIRED/COMMIT 을 낮추지 않는다(§56).
 */

export const SAFETY_ERROR = Object.freeze({
  USER_ACTIVE: 'WINDOWS_AUTOMATION_USER_ACTIVE',
  TARGET_CHANGED: 'WINDOWS_AUTOMATION_TARGET_CHANGED',
  TARGET_UNCERTAIN: 'WINDOWS_AUTOMATION_TARGET_UNCERTAIN',
  UIA_AMBIGUOUS: 'WINDOWS_AUTOMATION_UIA_AMBIGUOUS',
  HIDDEN_CONTROL: 'WINDOWS_AUTOMATION_HIDDEN_CONTROL',
  SUBMIT_UNVERIFIED: 'WINDOWS_AUTOMATION_SUBMIT_UNVERIFIED',
  KEY_UNKNOWN: 'WINDOWS_AUTOMATION_KEY_UNKNOWN',
  VISION_UNCERTAIN: 'WINDOWS_AUTOMATION_VISION_UNCERTAIN',
  PAUSED: 'WINDOWS_AUTOMATION_PAUSED',
});

/** 제출 성격으로 취급하는 키(profile 에 submitKeys 로 등재된 것만 실제 제출로 본다). */
export const SUBMIT_CLASS_KEYS = Object.freeze(['ENTER', 'CTRL+ENTER']);

/** 사용자 활동 판정 창 · 일시정지 재검사 횟수/간격(§8·§12). 실측: 타이핑 중 idle 은 수십~수백 ms, 손을 뗀 뒤 1.2 s 면 안정. */
export const SAFETY_LIMITS = Object.freeze({ userIdleMinMs: 1200, pauseRetries: 2, pauseWaitMs: 1500 });

// ─── automation active state (§6·§11) ───────────────────────────────────────
/** "진행 중" 으로 보는 창 — 마지막 UIA 동작 뒤 이 시간이 지나면 idle 로 본다(서버 run 종료 신호가 agent 에 오지 않으므로). */
export const AUTOMATION_ACTIVE_WINDOW_MS = 60_000;
let state = { active: false, status: 'idle', targetId: null, targetWindowRef: null, startedAt: null, lastActionAt: 0, paused: false, pauseReason: null, lastDecision: null };

export function getSafetyState() {
  const stale = state.active && Date.now() - state.lastActionAt > AUTOMATION_ACTIVE_WINDOW_MS;
  return stale ? { ...state, active: false, status: 'idle', paused: false, pauseReason: null } : { ...state };
}
/** /health 용 요약(§35·§51) — 준비 여부 · 상태 · 대상 appId · 멈춘 사유뿐. 창 제목 · 핸들 · 좌표는 없다. */
export function automationSummary() {
  const s = getSafetyState();
  return { active: s.active, status: s.status, targetId: s.targetId, paused: s.paused, pauseReason: s.pauseReason, since: s.active ? s.startedAt : null };
}
/** 관찰(inspect)이 성공하면 "이 앱에서 자동화 진행 중" 이 된다. 인계·완료는 서버 runtime 몫이라 여기서는 마지막 판정만 남긴다. */
export function markAutomationActive(targetId, targetWindowRef) {
  const fresh = !state.active || state.targetId !== targetId || Date.now() - state.lastActionAt > AUTOMATION_ACTIVE_WINDOW_MS;
  state = { ...state, active: true, status: 'running', targetId, targetWindowRef: targetWindowRef ?? null, startedAt: fresh ? new Date().toISOString() : state.startedAt, lastActionAt: Date.now(), paused: false, pauseReason: null };
}
export function markAutomationIdle() {
  state = { active: false, status: 'idle', targetId: null, targetWindowRef: null, startedAt: null, paused: false, pauseReason: null, lastDecision: state.lastDecision };
}
function markPaused(reason) {
  state = { ...state, status: 'paused_user_active', paused: true, pauseReason: reason };
}
function markWaiting(reason) {
  state = { ...state, status: 'waiting_for_user', paused: true, pauseReason: reason };
}
function decided(decision) {
  state = { ...state, lastDecision: decision, lastActionAt: Date.now() };
  return decision;
}

// ─── 순수 판정 함수(테스트 가능) ────────────────────────────────────────────

/** 앱 profile 로 키 의미를 판정한다(§18~§21). 반환: { kind: 'submit'|'newline'|'cancel'|'plain', risky, known }. */
export function classifyKey(app, key) {
  const profile = app?.interactionProfile ?? null;
  if (!profile) {
    // profile 이 없으면 제출 성격 키는 의미를 모른다 → 실행 금지(§21). 그 밖(TAB) 은 plain.
    return { kind: SUBMIT_CLASS_KEYS.includes(key) ? 'submit' : key === 'ESC' ? 'cancel' : 'plain', risky: SUBMIT_CLASS_KEYS.includes(key) || key === 'ESC', known: false };
  }
  const has = (list) => Array.isArray(list) && list.includes(key);
  const risky = has(profile.riskyKeys);
  if (has(profile.submitKeys)) return { kind: 'submit', risky, known: true };
  if (has(profile.newlineKeys)) return { kind: 'newline', risky, known: true };
  if (has(profile.cancelKeys)) return { kind: 'cancel', risky, known: true };
  // profile 은 있는데 이 키가 없다 — 제출 성격이면 모른다고 본다.
  return { kind: 'plain', risky: risky || SUBMIT_CLASS_KEYS.includes(key), known: !SUBMIT_CLASS_KEYS.includes(key) };
}

/**
 * probe(verify) 결과 + 문맥으로 하나의 판정을 낸다(§13~§16·§40~§42). 순수 함수.
 *   ctx: { action, key?, coords?, entry{role,hwnd,rid,name}, snapshotTitle, snapshotWindowCount, app }
 */
export function judge(probe, ctx) {
  if (!probe || probe.ok !== true) return { allow: false, code: SAFETY_ERROR.TARGET_UNCERTAIN, reason: 'probe_failed' };
  if (probe.targetVisible !== true) return { allow: false, code: SAFETY_ERROR.TARGET_CHANGED, reason: 'target_window_gone' };
  if (typeof ctx.snapshotWindowCount === 'number' && typeof probe.windowCount === 'number' && probe.windowCount > ctx.snapshotWindowCount) {
    return { allow: false, code: SAFETY_ERROR.TARGET_CHANGED, reason: 'unexpected_window' };
  }
  if (typeof ctx.snapshotTitle === 'string' && typeof probe.targetTitle === 'string' && probe.targetTitle !== ctx.snapshotTitle) {
    return { allow: false, code: SAFETY_ERROR.TARGET_UNCERTAIN, reason: 'title_changed' };
  }
  if (ctx.entry?.rid && probe.elementOk === false) return { allow: false, code: SAFETY_ERROR.UIA_AMBIGUOUS, reason: 'element_stale' };
  // foreground: 대상 창이어야 한다(§13). 같은 process 의 다른 창(대화창 vs 메인)도 "다른 창" 이다.
  // 예외: activate(창을 앞으로) 는 foreground 를 바꾸는 것이 목적이라 이 조건을 요구하지 않는다.
  if (ctx.action !== 'activate' && probe.foregroundIsTarget !== true) {
    return { allow: false, code: SAFETY_ERROR.TARGET_CHANGED, reason: probe.foregroundSameProcess ? 'other_window_same_process' : 'other_app_foreground' };
  }
  if (ctx.action === 'click' && ctx.coords && (ctx.entry?.role === 'list' || ctx.entry?.role === 'listitem')) {
    return { allow: false, code: SAFETY_ERROR.HIDDEN_CONTROL, reason: 'blind_list_click' };
  }
  if (ctx.action === 'key') {
    const k = classifyKey(ctx.app, ctx.key);
    if (!k.known && (k.kind === 'submit' || k.kind === 'cancel')) return { allow: false, code: SAFETY_ERROR.KEY_UNKNOWN, reason: 'key_semantics_unknown' };
    if (k.risky) return { allow: false, code: SAFETY_ERROR.KEY_UNKNOWN, reason: 'risky_key' };
    if (k.kind === 'submit') {
      // 제출 직전 재검증(§16): 요소 재해석 · 제목 일치 · foreground — 위에서 전부 통과했어야 한다. 요소 없이 보내는 제출은 검증 불가.
      if (!ctx.entry?.rid || probe.elementOk !== true) return { allow: false, code: SAFETY_ERROR.SUBMIT_UNVERIFIED, reason: 'submit_element_unverified' };
      if (typeof ctx.snapshotTitle !== 'string' || typeof probe.targetTitle !== 'string') return { allow: false, code: SAFETY_ERROR.SUBMIT_UNVERIFIED, reason: 'submit_title_unverified' };
    }
  }
  return { allow: true, code: null, reason: probe.userBusy ? 'user_idle_after_pause' : 'ok' };
}

/**
 * 안전 게이트 — 사용자 활동이면 짧게 멈추고(최대 pauseRetries 회) 다시 probe, 계속이면 USER_ACTIVE 로 인계.
 * `probe()` 는 verify 스크립트를 부르는 함수(주입), `sleep` 도 주입(테스트).
 */
export async function runSafetyGate(ctx, deps) {
  const limits = { ...SAFETY_LIMITS, ...(deps.limits ?? {}) };
  let probe = await deps.probe();
  let retries = 0;
  while (probe && probe.ok === true && probe.userBusy === true) {
    if (retries >= limits.pauseRetries) {
      markWaiting('user_active');
      return decided({ allow: false, code: SAFETY_ERROR.USER_ACTIVE, reason: 'user_active', paused: true, retries });
    }
    markPaused('user_active');
    retries += 1;
    await deps.sleep(limits.pauseWaitMs);
    probe = await deps.probe();
  }
  const decision = judge(probe, ctx);
  if (decision.allow) state = { ...state, status: 'running', paused: false, pauseReason: null };
  else markWaiting(decision.reason);
  return decided({ ...decision, paused: false, retries });
}
