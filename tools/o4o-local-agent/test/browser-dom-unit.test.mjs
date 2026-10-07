/**
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-E-TASK-UNIT-DISPATCH-V1 — Execution Node 작업 단위 실행 검증 (node:test, 의존성 0)
 *
 *   U. browser-dom-unit: 인자 형상 · ref 묶음 · 재생(find_act) · 멈춤 조건(화면 바뀜 · 대상 없음/모호 · COMMIT ·
 *      자격 · 예상 이동 불일치 · 다른 사이트 · 예산 · 시간) · 입력 값 비노출
 *   H. handlers: run_unit 이 단발 DOM 검증 · bridge 경로만 쓴다 · 확장 미연결 · 형상 밖 인자는 실행되지 않는다
 *   S. 서버 사본 대조: 상수 · 멈춤 원인 · role 표가 서버 browser-dom-contract.ts 와 같다
 *
 * 확장은 가짜 bridge(페이지 모형)다. 실제 Chrome DOM 은 local smoke 가 본다.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DOM = path.join(HERE, '..', '..', '..', 'apps', 'api-server', 'src', 'services', 'local-agent', 'browser-dom-contract.ts');

const HOME = mkdtempSync(path.join(tmpdir(), 'o4o-dom-unit-test-'));
process.env.O4O_AGENT_HOME = HOME;
process.on('exit', () => {
  try {
    rmSync(HOME, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

const unit = await import('../src/browser-dom-unit.mjs');
const handlers = await import('../src/handlers.mjs');

const SITE = { siteId: 'o4o.neture', displayName: 'O4O 홈' };

// ── 페이지 모형(가짜 확장) ──────────────────────────────────────────────────────
//   pages[name] = { path, elements:[{elementRef, role, name, text?, riskLevel?, disabled?, to?, crossOrigin?, credential?}] }
//   click 의 to 가 있으면 이동(새 docId). 이동 직후 staleReads 번은 옛 문서를 돌려준다(실 health.kr 관측과 같은 모양).
function makeSite(pages, start, opts = {}) {
  let page = start;
  let doc = 1;
  let snap = 1;
  let stale = 0;
  let prevDoc = null;
  let cross = false;
  const calls = [];
  const docId = () => `d_doc${doc}`;
  const env = (type, payload) => ({ ok: true, message: { version: 1, requestId: 'r', type, payload } });
  const dispatch = async (type, payload) => {
    calls.push({ type, payload });
    const p = pages[page];
    if (type === 'browser.dom.get_context') {
      if (cross) return env(type, { ok: false, errorCode: 'DOM_CROSS_ORIGIN_BLOCKED' }); // 확장은 등재 사이트 밖을 오류로 알린다
      if (stale > 0) { stale -= 1; return env(type, { ok: true, siteId: SITE.siteId, path: '/old', docId: prevDoc, ready: true }); }
      return env(type, { ok: true, siteId: SITE.siteId, path: p.path, docId: docId(), ready: true });
    }
    if (type === 'browser.dom.inspect') {
      snap += 1;
      return env(type, { ok: true, snapshotId: `s_snap${snap}`, elements: p.elements, elementCount: p.elements.length });
    }
    if (type === 'browser.dom.find') {
      const q = payload.query;
      const norm = (v) => String(v ?? '').replace(/\s+/g, '').toLowerCase();
      const matches = p.elements.filter((e) => (!q.role || e.role === q.role)
        && (!q.name || norm(e.name).includes(norm(q.name)))
        && (!q.text || norm(e.text ?? e.name).includes(norm(q.text))));
      snap += 1;
      return env(type, { ok: true, snapshotId: `s_snap${snap}`, matches, matchCount: matches.length });
    }
    const el = p.elements.find((e) => e.elementRef === payload.elementRef);
    if (!el) return env(type, { ok: false, errorCode: 'DOM_ELEMENT_NOT_FOUND' });
    if (type === 'browser.dom.set_input') {
      if (el.credential) return env(type, { ok: false, errorCode: 'DOM_USER_ACTION_REQUIRED', userActionRequired: true });
      return env(type, { ok: true, hasValue: true, changed: false });
    }
    if (type === 'browser.dom.select_option') return env(type, { ok: true, changed: true });
    if (type === 'browser.dom.click') {
      if (el.riskLevel === 'COMMIT') return env(type, { ok: false, errorCode: 'DOM_ACTION_NOT_ALLOWED', riskLevel: 'COMMIT' });
      if (el.crossOrigin) { cross = true; return env(type, { ok: true, navigated: true, riskLevel: 'REVERSIBLE' }); }
      if (el.to) {
        prevDoc = docId();
        page = el.to;
        doc += 1;
        stale = opts.staleReads ?? 0;
        return env(type, { ok: true, navigated: true, riskLevel: 'REVERSIBLE' });
      }
      return env(type, { ok: true, navigated: false, changed: el.changes === true, riskLevel: 'REVERSIBLE' });
    }
    return { ok: false, errorCode: 'O4O_BRIDGE_UNKNOWN_TYPE' };
  };
  return { dispatch, calls, page: () => page };
}

const PAGES = {
  home: { path: '/', elements: [
    { elementRef: 'e_1', role: 'searchbox', name: '제품 검색' },
    { elementRef: 'e_2', role: 'button', name: '검색', to: 'results' },
    { elementRef: 'e_3', role: 'link', name: '공급자', to: 'supplier' },
    { elementRef: 'e_4', role: 'button', name: '전체 삭제', riskLevel: 'COMMIT' },
    { elementRef: 'e_5', role: 'textbox', name: '비밀번호', credential: true },
    { elementRef: 'e_6', role: 'link', name: '외부 이동', crossOrigin: true },
    { elementRef: 'e_7', role: 'button', name: '보기', changes: true },
  ] },
  results: { path: '/search', elements: [
    { elementRef: 'e_1', role: 'link', name: '게보린정' },
    { elementRef: 'e_2', role: 'link', name: '게보린 소프트', to: 'detail' },
    { elementRef: 'e_3', role: 'link', name: '게보린정 상세', to: 'detail' },
  ] },
  detail: { path: '/product/1', elements: [{ elementRef: 'e_1', role: 'heading', name: '게보린정' }] },
  supplier: { path: '/supplier', elements: [{ elementRef: 'e_1', role: 'button', name: '로그인' }] },
};

function fakeClock(start = 1_000_000) {
  let t = start;
  return { now: () => t, sleep: async (ms) => { t += ms; }, advance: (ms) => { t += ms; } };
}

/** handlers 를 거치는 단위 실행(가짜 bridge + 가짜 시계). */
async function runUnit(siteModel, args, { clock = fakeClock(), expiresAt } = {}) {
  const bridge = { isExtensionConnected: () => true, dispatch: siteModel.dispatch };
  const context = { bridge, unitClock: { now: clock.now, sleep: clock.sleep }, ...(expiresAt ? { commandExpiresAt: new Date(expiresAt).toISOString() } : {}) };
  return handlers.runAction(`local.browser.dom.run_unit#${SITE.siteId}`, context, args);
}
const base = { maxCommands: 20, maxDurationMs: 20000 };

// ── U. 인자 형상 ───────────────────────────────────────────────────────────────

test('U1. 인자 형상: 단계 0..12 · op 혼합 금지 · 키 정확 · 자격 성격 텍스트 거절 · 예산/시간 범위', () => {
  const act = { op: 'act', kind: 'click', elementRef: 'e_2', snapshotId: 's_abcd' };
  const fa = { op: 'find_act', kind: 'click', query: { role: 'button', name: '검색' }, expectNavigated: true };
  assert.equal(unit.validateDomRunUnitArgs({ steps: [act], observe: true, ...base }).ok, true);
  assert.equal(unit.validateDomRunUnitArgs({ steps: [], observe: true, ...base }).ok, true);
  assert.equal(unit.validateDomRunUnitArgs({ steps: [], observe: false, ...base }).ok, false);
  assert.equal(unit.validateDomRunUnitArgs({ steps: [act, fa], observe: true, ...base }).ok, false);
  assert.equal(unit.validateDomRunUnitArgs({ steps: Array(13).fill(act), observe: true, ...base }).ok, false);
  assert.equal(unit.validateDomRunUnitArgs({ steps: [{ ...act, selector: '#x' }], observe: true, ...base }).ok, false);
  assert.equal(unit.validateDomRunUnitArgs({ steps: [act], observe: true, ...base, script: 'x' }).ok, false);
  assert.equal(unit.validateDomRunUnitArgs({ steps: [act], observe: true, maxCommands: 61, maxDurationMs: 1000 }).ok, false);
  assert.equal(unit.validateDomRunUnitArgs({ steps: [act], observe: true, maxCommands: 5, maxDurationMs: 30001 }).ok, false);
  assert.equal(unit.validateDomRunUnitArgs({ steps: [act], observe: true, ...base, docId: 'nope' }).ok, false);
  const input = (text) => ({ steps: [{ op: 'act', kind: 'set_input', elementRef: 'e_1', snapshotId: 's_abcd', text }], observe: true, ...base });
  assert.equal(unit.validateDomRunUnitArgs(input('게보린')).ok, true);
  assert.equal(unit.validateDomRunUnitArgs(input('password: hunter2')).ok, false);
  assert.equal(unit.validateDomRunUnitArgs(input('<script>')).ok, false);
  assert.equal(unit.validateDomRunUnitArgs(input('   ')).ok, false);
  assert.equal(unit.validateDomRunUnitArgs({ steps: [{ ...act, kind: 'set_input' }], observe: true, ...base }).ok, false);
});

test('U2. 대상 고르기: 정확히 하나 → 그것 · 정확 일치 없음+결과 하나 → 그것 · 모호 → null', () => {
  const m = [{ elementRef: 'e_1', role: 'link', name: '게보린정' }, { elementRef: 'e_2', role: 'link', name: '게보린 정' }];
  assert.equal(unit.pickUnitTarget({ name: '게보린정' }, m), null); // 공백 제거 뒤 둘 다 같다 → 모호
  assert.equal(unit.pickUnitTarget({ name: '게보린정' }, [m[0], { elementRef: 'e_3', role: 'link', name: '게보린정 상세' }]).elementRef, 'e_1');
  assert.equal(unit.pickUnitTarget({ name: '타이레놀' }, [m[0]]).elementRef, 'e_1');
  assert.equal(unit.pickUnitTarget({ name: '타이레놀' }, m), null);
  assert.equal(unit.pickUnitTarget({ text: '검색' }, [{ elementRef: 'e_9', role: 'button', name: '검색' }]).elementRef, 'e_9');
});

// ── ref 묶음(Fast Loop 배치) ─────────────────────────────────────────────────────

test('U3. ref 묶음: 입력 → 클릭(이동) → 새 문서 관찰까지 한 명령 안에서 · 입력 값은 결과에 없다', async () => {
  const site = makeSite(PAGES, 'home', { staleReads: 2 });
  const r = await runUnit(site, {
    steps: [
      { op: 'act', kind: 'set_input', elementRef: 'e_1', snapshotId: 's_snap1', text: '두통약 찾기' },
      { op: 'act', kind: 'click', elementRef: 'e_2', snapshotId: 's_snap1' },
    ],
    observe: true, docId: 'd_doc1', ...base,
  });
  assert.equal(r.status, 'success');
  assert.equal(r.data.stop, null);
  assert.deepEqual(r.data.reports.map((x) => [x.kind, x.status, x.navigated === true]), [['set_input', 'success', false], ['click', 'success', true]]);
  assert.equal(r.data.observation.path, '/search', '옛 문서를 새 관찰로 받지 않는다');
  assert.equal(r.data.observation.docId, 'd_doc2');
  assert.equal(r.data.observation.elements.length, 3);
  assert.equal(r.data.commandCount, 4); // 행동 2 + 관찰 2
  assert.equal(r.data.probeCount, 2); // 옛 문서 2회
  assert.equal(JSON.stringify(r.data).includes('두통약'), false, '입력 값이 결과에 실리지 않는다');
});

test('U4. ref 묶음: 중간 클릭이 화면을 바꾸면 남은 ref 단계는 실행하지 않고 reobserve 로 멈춘다', async () => {
  const site = makeSite(PAGES, 'home');
  const r = await runUnit(site, {
    steps: [
      { op: 'act', kind: 'click', elementRef: 'e_7', snapshotId: 's_snap1' },
      { op: 'act', kind: 'set_input', elementRef: 'e_1', snapshotId: 's_snap1', text: '게보린' },
    ],
    observe: true, ...base,
  });
  assert.deepEqual(r.data.stop, { cause: 'reobserve', stepIndex: 0 });
  assert.equal(r.data.reports.length, 1);
  assert.equal(site.calls.filter((c) => c.type === 'browser.dom.set_input').length, 0);
  assert.equal(r.data.observation.path, '/');
});

test('U5. COMMIT 클릭은 확장이 막고 단위는 step_failed(오류 코드 · 위험 등급 동반)로 멈춘다 — 다음 단계 없음', async () => {
  const site = makeSite(PAGES, 'home');
  const r = await runUnit(site, {
    steps: [
      { op: 'act', kind: 'select_option', elementRef: 'e_4', snapshotId: 's_snap1', option: 'x' },
    ],
    observe: false, ...base,
  });
  // select_option 은 이 모형에서 성공(변경) — 마지막 단계라 멈춤 없음
  assert.equal(r.data.stop, null);
  const c = await runUnit(makeSite(PAGES, 'home'), {
    steps: [
      { op: 'act', kind: 'click', elementRef: 'e_4', snapshotId: 's_snap1' },
      { op: 'act', kind: 'click', elementRef: 'e_2', snapshotId: 's_snap1' },
    ],
    observe: true, ...base,
  });
  assert.equal(c.data.stop.cause, 'step_failed');
  assert.equal(c.data.stop.errorCode, 'DOM_ACTION_NOT_ALLOWED');
  assert.equal(c.data.reports[0].riskLevel, 'COMMIT');
  assert.equal(c.data.reports.length, 1);
});

test('U6. 자격 입력 칸은 확장이 거절(USER_ACTION_REQUIRED) — 단위는 멈추고 Assistant 에 돌려준다', async () => {
  const r = await runUnit(makeSite(PAGES, 'home'), {
    steps: [{ op: 'act', kind: 'set_input', elementRef: 'e_5', snapshotId: 's_snap1', text: '아무 값' }],
    observe: true, ...base,
  });
  assert.equal(r.data.stop.cause, 'step_failed');
  assert.equal(r.data.stop.errorCode, 'DOM_USER_ACTION_REQUIRED');
});

// ── 재생(find_act) ─────────────────────────────────────────────────────────────

test('U7. 재생: 찾기 → 고르기 → 행동 → (이동이면) 새 문서 대기 → 다음 찾기 — 중간 inspect 없이, 끝에 관찰 1회', async () => {
  const site = makeSite(PAGES, 'home', { staleReads: 1 });
  const r = await runUnit(site, {
    steps: [
      { op: 'find_act', kind: 'set_input', query: { role: 'searchbox', name: '제품 검색' }, expectNavigated: false, text: '게보린' },
      { op: 'find_act', kind: 'click', query: { role: 'button', name: '검색' }, expectNavigated: true },
      { op: 'find_act', kind: 'click', query: { role: 'link', name: '게보린정 상세' }, expectNavigated: true },
    ],
    observe: true, docId: 'd_doc1', ...base,
  });
  assert.equal(r.data.stop, null);
  assert.equal(r.data.reports.length, 3);
  assert.deepEqual(r.data.reports.map((x) => x.target.name), ['제품 검색', '검색', '게보린정 상세']);
  assert.equal(r.data.observation.path, '/product/1');
  assert.equal(site.calls.filter((c) => c.type === 'browser.dom.inspect').length, 1, '중간 inspect 없음');
  assert.equal(r.data.commandCount, 3 * 2 + 2);
});

test('U8. 재생: 대상이 모호하면 행동하지 않고 locator_not_found', async () => {
  const site = makeSite(PAGES, 'results');
  const r = await runUnit(site, {
    steps: [{ op: 'find_act', kind: 'click', query: { role: 'link', name: '게보린' }, expectNavigated: true }],
    observe: true, ...base,
  });
  assert.deepEqual(r.data.stop, { cause: 'locator_not_found', stepIndex: 0 });
  assert.equal(r.data.reports.length, 0);
  assert.equal(site.calls.filter((c) => c.type === 'browser.dom.click').length, 0);
  assert.equal(r.data.observation.path, '/search', '멈춘 화면을 관찰해 돌려준다');
});

test('U9. 재생: COMMIT 대상 · role 부적합은 확장에 보내기 전에 validation_rejected', async () => {
  const site = makeSite(PAGES, 'home');
  const r = await runUnit(site, {
    steps: [{ op: 'find_act', kind: 'click', query: { role: 'button', name: '전체 삭제' }, expectNavigated: false }],
    observe: false, ...base,
  });
  assert.equal(r.data.stop.cause, 'validation_rejected');
  assert.equal(site.calls.filter((c) => c.type === 'browser.dom.click').length, 0);
  const role = await runUnit(makeSite(PAGES, 'home'), {
    steps: [{ op: 'find_act', kind: 'set_input', query: { name: '검색' }, expectNavigated: false, text: '게보린' }],
    observe: false, ...base,
  });
  // '제품 검색'(searchbox) 과 '검색'(button) — 정확 일치는 button 하나 → role 부적합
  assert.equal(role.data.stop.cause, 'validation_rejected');
});

test('U10. 재생: 저장 때 이동했던 단계가 이동하지 않으면 expect_mismatch — 다음 단계 없음', async () => {
  const site = makeSite(PAGES, 'home');
  const r = await runUnit(site, {
    steps: [
      { op: 'find_act', kind: 'click', query: { role: 'button', name: '보기' }, expectNavigated: true },
      { op: 'find_act', kind: 'click', query: { role: 'button', name: '검색' }, expectNavigated: true },
    ],
    observe: true, ...base,
  });
  assert.deepEqual(r.data.stop, { cause: 'expect_mismatch', stepIndex: 0 });
  assert.equal(r.data.reports.length, 1);
});

test('U11. 다른 사이트로 넘어가면 cross_origin 으로 멈추고 그 화면을 관찰하지 않는다', async () => {
  const site = makeSite(PAGES, 'home');
  const r = await runUnit(site, {
    steps: [
      { op: 'find_act', kind: 'click', query: { role: 'link', name: '외부 이동' }, expectNavigated: true },
      { op: 'find_act', kind: 'click', query: { role: 'button', name: '검색' }, expectNavigated: true },
    ],
    observe: true, docId: 'd_doc1', ...base,
  });
  assert.equal(r.data.stop.cause, 'cross_origin');
  assert.equal(r.data.observation, undefined);
  assert.equal(site.calls.filter((c) => c.type === 'browser.dom.inspect').length, 0);
});

test('U12. 예산: 다음 단계 + 최종 관찰을 담을 수 없으면 그 단계 전에 budget 으로 멈춘다(관찰은 남긴다)', async () => {
  const site = makeSite(PAGES, 'home');
  const r = await runUnit(site, {
    steps: [
      { op: 'find_act', kind: 'set_input', query: { role: 'searchbox' }, expectNavigated: false, text: '게보린' },
      { op: 'find_act', kind: 'click', query: { role: 'button', name: '검색' }, expectNavigated: true },
    ],
    observe: true, maxCommands: 5, maxDurationMs: 20000,
  });
  assert.deepEqual(r.data.stop, { cause: 'budget', stepIndex: 1 });
  assert.equal(r.data.reports.length, 1);
  assert.ok(r.data.observation);
  assert.ok(r.data.commandCount <= 5);
});

test('U13. 시간: 명령 만료(제출 여유 포함)가 지났으면 단계를 시작하지 않는다', async () => {
  const clock = fakeClock();
  const site = makeSite(PAGES, 'home');
  const r = await runUnit(site, {
    steps: [{ op: 'act', kind: 'click', elementRef: 'e_2', snapshotId: 's_snap1' }],
    observe: true, ...base,
  }, { clock, expiresAt: clock.now() + 2000 });
  assert.deepEqual(r.data.stop, { cause: 'time', stepIndex: 0 });
  assert.equal(site.calls.length, 0);
});

// ── H. handlers ───────────────────────────────────────────────────────────────

test('H1. run_unit: 확장 미연결이면 실행 없이 실패 · 형상 밖 인자는 denied · 미등재 사이트 denied', async () => {
  const args = { steps: [{ op: 'act', kind: 'click', elementRef: 'e_2', snapshotId: 's_snap1' }], observe: true, ...base };
  const off = await handlers.runAction(`local.browser.dom.run_unit#${SITE.siteId}`, { bridge: { isExtensionConnected: () => false } }, args);
  assert.equal(off.errorCode, 'O4O_EXTENSION_NOT_CONNECTED');
  const site = makeSite(PAGES, 'home');
  const bridge = { isExtensionConnected: () => true, dispatch: site.dispatch };
  const bad = await handlers.runAction(`local.browser.dom.run_unit#${SITE.siteId}`, { bridge }, { ...args, steps: [{ ...args.steps[0], js: 'x' }] });
  assert.equal(bad.status, 'denied');
  const unknown = await handlers.runAction('local.browser.dom.run_unit#not.registered', { bridge }, args);
  assert.equal(unknown.status, 'denied');
  assert.equal(site.calls.length, 0);
  assert.ok(handlers.listAllowedActions().includes('local.browser.dom.run_unit'));
  assert.equal(handlers.AGENT_VERSION, '0.3.0');
});

test('H2. run_unit 의 각 단계는 단발 action 과 같은 bridge type 으로만 나간다', async () => {
  const site = makeSite(PAGES, 'home');
  await runUnit(site, {
    steps: [
      { op: 'act', kind: 'set_input', elementRef: 'e_1', snapshotId: 's_snap1', text: '게보린' },
      { op: 'act', kind: 'click', elementRef: 'e_2', snapshotId: 's_snap1' },
    ],
    observe: true, ...base,
  });
  const allowed = new Set(['browser.dom.get_context', 'browser.dom.inspect', 'browser.dom.find', 'browser.dom.set_input', 'browser.dom.click', 'browser.dom.select_option']);
  for (const c of site.calls) assert.ok(allowed.has(c.type), c.type);
  assert.equal(site.calls.some((c) => c.type.includes('run_unit')), false, '단위가 단위를 부르지 않는다');
});

// ── S. 서버 사본 대조 ───────────────────────────────────────────────────────────

test('S1. 상수 · 멈춤 원인 · role 표가 서버 browser-dom-contract.ts 와 같다', () => {
  const src = readFileSync(SERVER_DOM, 'utf8');
  for (const name of ['DOM_UNIT_MAX_STEPS', 'DOM_UNIT_MAX_COMMANDS', 'DOM_UNIT_MAX_DURATION_MS', 'DOM_UNIT_COMMAND_TTL_MS',
    'DOM_UNIT_OBSERVE_ATTEMPTS', 'DOM_UNIT_OBSERVE_ATTEMPTS_AFTER_NAVIGATION', 'DOM_UNIT_SETTLE_MS']) {
    const m = src.match(new RegExp(`export const ${name} = (\\d+);`));
    assert.ok(m, name);
    assert.equal(Number(m[1]), unit[name], name);
  }
  const block = src.slice(src.indexOf('export const DOM_UNIT_STOP_CAUSES'));
  const causes = [...block.slice(0, block.indexOf(']);')).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual(causes, [...unit.DOM_UNIT_STOP_CAUSES]);
  for (const [kind, roles] of Object.entries(unit.DOM_UNIT_KIND_ROLES)) {
    const m = src.match(new RegExp(`${kind}: Object\\.freeze\\(\\[([^\\]]*)\\]\\)`));
    assert.ok(m, kind);
    assert.deepEqual([...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]), [...roles], kind);
  }
});
