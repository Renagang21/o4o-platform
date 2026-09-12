/**
 * WO-O4O-BROWSER-DOM-CONTROL-V0 — agent · native host · 확장 사본 검증 (node:test, 의존성 0)
 *
 *   A. bridge relay: 토큰 · 왕복 · 미연결 · 타임아웃 · allowlist 밖 type
 *   B. native host DOM routing: relay 요청 → stdout 봉투 / 확장 응답 → relay
 *   C. browser-dom-limits: 인자 형상 · credential 텍스트 · 결과 자르기 · COMMIT 분류
 *   D. handlers: DOM action 이 bridge 를 통해서만 실행되고, 확장 미연결/형상 밖/미등재는 실행되지 않는다
 *   E. 3 사본 대조: 한도 · COMMIT 표식 · error code 가 서버 · agent · content script 에서 같다
 *   F. content script 소스 잠금: selector 는 상수뿐 · eval/innerHTML/cookie 없음 · password 거절 경로 존재
 *
 * 실제 Chrome DOM 은 여기서 돌지 않는다 — 그것은 local smoke(CHECK §11)가 본다.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AGENT_SRC = path.join(HERE, '..', 'src');
const EXT_SRC = path.join(HERE, '..', '..', 'o4o-chrome-extension', 'src');
const SERVER_DOM = path.join(HERE, '..', '..', '..', 'apps', 'api-server', 'src', 'services', 'local-agent', 'browser-dom-contract.ts');

// agent home 을 임시 디렉터리로 — 실제 자격증명 · 세션 파일을 건드리지 않는다.
const HOME = mkdtempSync(path.join(tmpdir(), 'o4o-dom-test-'));
process.env.O4O_AGENT_HOME = HOME;

const relayMod = await import('../src/bridge-relay.mjs');
const limits = await import('../src/browser-dom-limits.mjs');
const host = await import('../src/native-host.mjs');
const handlers = await import('../src/handlers.mjs');

const read = (p) => readFileSync(p, 'utf8');
const readCode = (p) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 2000) => {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > ms) throw new Error('timeout waiting');
    await wait(10);
  }
};

process.on('exit', () => {
  try {
    rmSync(HOME, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

// ── A. bridge relay ───────────────────────────────────────────────────────────

test('A1. relay: 세션 파일(pipe+token)을 만들고, 올바른 토큰의 host 만 받아 DOM 봉투를 왕복시킨다', async () => {
  const relay = await relayMod.startBridgeRelay({ log: () => {} });
  try {
    const session = relayMod.loadBridgeSession();
    assert.ok(session && session.pipe && session.token, 'session file must exist');
    assert.equal(session.pipe, relay.pipe);
    assert.equal(relay.isExtensionConnected(), false);

    const received = [];
    const client = relayMod.connectBridgeRelay({
      extensionConnected: true,
      onRequest(message) {
        received.push(message);
        // 확장이 응답했다고 치고 되돌린다 — 같은 requestId · type.
        client.respond({ version: 1, requestId: message.requestId, type: message.type, payload: { ok: true, snapshotId: 's_abcd', elements: [] } });
      },
    });
    await until(() => relay.isExtensionConnected());

    const reply = await relay.dispatch('browser.dom.inspect', { siteId: 'o4o.neture' });
    assert.equal(reply.ok, true);
    assert.equal(reply.message.type, 'browser.dom.inspect');
    assert.deepEqual(reply.message.payload, { ok: true, snapshotId: 's_abcd', elements: [] });
    assert.equal(received.length, 1);
    assert.deepEqual(received[0].payload, { siteId: 'o4o.neture' });
    client.end();
    await until(() => !relay.isExtensionConnected());
  } finally {
    relay.close();
  }
  assert.equal(existsSync(relayMod.bridgeSessionPath()), false, 'close removes the session file');
});

test('A2. relay: 잘못된 토큰은 즉시 끊기고, host 가 없으면 O4O_EXTENSION_NOT_CONNECTED, 응답이 없으면 타임아웃', async () => {
  const relay = await relayMod.startBridgeRelay({ log: () => {} });
  try {
    // host 없음.
    const none = await relay.dispatch('browser.dom.inspect', { siteId: 'o4o.neture' });
    assert.deepEqual(none, { ok: false, errorCode: 'O4O_EXTENSION_NOT_CONNECTED' });

    // 잘못된 토큰 — 세션 파일을 바꿔치기해 붙어 본다.
    const net = await import('node:net');
    const session = relayMod.loadBridgeSession();
    const bad = net.createConnection(session.pipe);
    await new Promise((r) => bad.on('connect', r));
    bad.write(JSON.stringify({ kind: 'host.hello', token: 'wrong', extensionConnected: true }) + '\n');
    await new Promise((r) => bad.on('close', r));
    assert.equal(relay.isExtensionConnected(), false, 'wrong token must not become the current host');

    // 응답 없는 host → 타임아웃.
    const silent = relayMod.connectBridgeRelay({ extensionConnected: true, onRequest() {} });
    await until(() => relay.isExtensionConnected());
    const t = await relay.dispatch('browser.dom.click', { siteId: 'o4o.neture', elementRef: 'e_1', snapshotId: 's_abcd' }, 150);
    assert.deepEqual(t, { ok: false, errorCode: 'NATIVE_BRIDGE_NOT_AVAILABLE' });
    silent.end();
  } finally {
    relay.close();
  }
});

test('A3. relay: allowlist 밖 type 은 host 로 가지 않는다 (§29 · 범용 message bus 아님)', async () => {
  const relay = await relayMod.startBridgeRelay({ log: () => {} });
  try {
    const received = [];
    const client = relayMod.connectBridgeRelay({ extensionConnected: true, onRequest: (m) => received.push(m) });
    await until(() => relay.isExtensionConnected());
    for (const type of ['shell.exec', 'browser.dom.eval', 'browser.navigate', 'file.read']) {
      const r = await relay.dispatch(type, {});
      assert.equal(r.ok, false, type);
      assert.equal(r.errorCode, 'NATIVE_BRIDGE_BAD_MESSAGE', type);
    }
    await wait(30);
    assert.equal(received.length, 0);
    client.end();
  } finally {
    relay.close();
  }
});

test('A4. NDJSON framing round-trip incl. split chunks and junk lines', () => {
  const a = relayMod.encodeLine({ kind: 'x', n: 1 });
  const b = relayMod.encodeLine({ kind: 'y' });
  const { messages, rest } = relayMod.drainLines(a + 'not json\n' + b.slice(0, 3));
  assert.deepEqual(messages, [{ kind: 'x', n: 1 }, null]);
  assert.equal(rest, b.slice(0, 3));
  const more = relayMod.drainLines(rest + b.slice(3));
  assert.deepEqual(more.messages, [{ kind: 'y' }]);
  assert.equal(more.rest, '');
});

// ── B. native host routing ────────────────────────────────────────────────────

test('B1. host DOM routing: relay 요청을 기억했다가 같은 requestId·type 의 확장 응답만 relay 로 되돌린다', () => {
  const routing = host.createDomRouting();
  const req = { version: 1, requestId: 'r-1', type: 'browser.dom.find', payload: { siteId: 'o4o.neture', query: { text: '검색' } } };
  assert.deepEqual(routing.accept(req), req);
  assert.equal(routing.size(), 1);
  // 다른 requestId · 다른 type · 봉투 위반은 짝이 아니다.
  assert.equal(routing.match({ version: 1, requestId: 'r-2', type: 'browser.dom.find', payload: {} }), null);
  assert.equal(routing.match({ version: 1, requestId: 'r-1', type: 'browser.dom.click', payload: {} }), null);
  assert.equal(routing.match({ version: 2, requestId: 'r-1', type: 'browser.dom.find', payload: {} }), null);
  assert.equal(routing.size(), 1, 'a type-mismatched reply must not consume the entry');
  const ok = routing.match({ version: 1, requestId: 'r-1', type: 'browser.dom.find', payload: { ok: true, matches: [] } });
  assert.deepEqual(ok.payload, { ok: true, matches: [] });
  assert.equal(routing.size(), 0);
  // 소비된 뒤 재응답은 무시된다(replay 여지 0).
  assert.equal(routing.match({ version: 1, requestId: 'r-1', type: 'browser.dom.find', payload: {} }), null);
});

test('B2. host 는 여전히 child_process · fs 쓰기 · 임의 URL 을 갖지 않고, DOM payload 를 해석하지 않는다', () => {
  const src = readCode(path.join(AGENT_SRC, 'native-host.mjs'));
  for (const bad of ['child_process', 'writeFileSync', 'spawn', 'exec(', 'querySelector', 'http']) {
    assert.ok(!src.includes(bad), `native-host must not contain ${bad}`);
  }
  const relaySrc = readCode(path.join(AGENT_SRC, 'bridge-relay.mjs'));
  for (const bad of ['child_process', 'http.', 'listen(4', "'0.0.0.0'", 'querySelector']) {
    assert.ok(!relaySrc.includes(bad), `bridge-relay must not contain ${bad}`);
  }
  // named pipe / unix socket 만 — TCP 포트 없음.
  assert.ok(relaySrc.includes('\\\\\\\\.\\\\pipe\\\\'), 'windows named pipe path');
});

// ── C. browser-dom-limits ─────────────────────────────────────────────────────

test('C1. 인자 형상: elementRef/snapshotId 형식 · 구조화 조건 5키 · selector/JS 칸 없음', () => {
  assert.equal(limits.validateDomElementArgs({ elementRef: 'e_1', snapshotId: 's_abcd' }).ok, true);
  for (const bad of [
    { elementRef: '#x', snapshotId: 's_abcd' },
    { elementRef: 'e_1', snapshotId: 'x' },
    { elementRef: 'e_1', snapshotId: 's_abcd', selector: 'a' },
    { elementRef: 'e_0', snapshotId: 's_abcd' },
    {},
    null,
  ]) {
    assert.equal(limits.validateDomElementArgs(bad).ok, false);
  }
  assert.equal(limits.validateDomFindArgs({ query: { text: '검색', role: 'button' } }).ok, true);
  for (const bad of [{ query: { selector: 'a' } }, { query: { xpath: '//a' } }, { query: {} }, { query: { text: '<b>' } }, { query: { role: 'script' } }, { text: 'x' }]) {
    assert.equal(limits.validateDomFindArgs(bad).ok, false);
  }
  assert.equal(limits.validateDomReadTableArgs(undefined).ok, true);
  assert.equal(limits.validateDomReadTableArgs({}).ok, true);
  assert.equal(limits.validateDomReadTableArgs({ elementRef: 'e_2', snapshotId: 's_abcd' }).ok, true);
  assert.equal(limits.validateDomReadTableArgs({ selector: 'table' }).ok, false);
  assert.equal(limits.validateNoArgs({}).ok, true);
  assert.equal(limits.validateNoArgs({ url: 'https://x' }).ok, false);
});

test('C2. set_input 텍스트: 500자 · 제어문자 · credential/shell 문자열 거절 (Computer Use 규칙 재사용)', () => {
  const ok = (text) => limits.validateDomSetInputArgs({ elementRef: 'e_1', snapshotId: 's_abcd', text }).ok;
  assert.equal(ok('비타민'), true);
  assert.equal(ok('a'.repeat(500)), true);
  assert.equal(ok('a'.repeat(501)), false);
  assert.equal(ok('a\nb'), false);
  assert.equal(ok('비밀번호 1234'), false);
  assert.equal(ok('password: x'), false);
  assert.equal(ok('rm -rf /'), false);
  assert.equal(ok(''), false);
  assert.equal(limits.validateDomSelectOptionArgs({ elementRef: 'e_1', snapshotId: 's_abcd', option: '한국어' }).ok, true);
  assert.equal(limits.validateDomSelectOptionArgs({ elementRef: 'e_1', snapshotId: 's_abcd', option: '' }).ok, false);
});

test('C3. 결과 자르기: 배열 상한 · 문자열 상한 · 모르는 필드 폐기 · path 는 query 없이', () => {
  const big = {
    snapshotId: 's_abcd',
    elements: Array.from({ length: 200 }, (_, i) => ({ elementRef: `e_${i + 1}`, role: 'button', name: 'n'.repeat(500), outerHTML: '<b>', href: 'https://x' })),
    matches: Array.from({ length: 30 }, (_, i) => ({ elementRef: `e_${i + 1}`, role: 'link' })),
    rows: Array.from({ length: 300 }, () => Array.from({ length: 30 }, () => 'c'.repeat(200))),
    columns: Array(30).fill('h'),
    text: 't'.repeat(5000),
    path: '/store/products?token=abc',
    html: '<html>',
    cookies: 'a=b',
    rowCount: 300,
  };
  const t = limits.trimDomResult(big);
  assert.equal(t.elements.length, limits.DOM_INSPECT_MAX_ELEMENTS);
  assert.equal(t.elements[0].name.length, limits.DOM_ELEMENT_NAME_MAX);
  assert.equal('outerHTML' in t.elements[0], false);
  assert.equal('href' in t.elements[0], false);
  assert.equal(t.matches.length, limits.DOM_FIND_MAX_MATCHES);
  assert.equal(t.rows.length, limits.DOM_TABLE_MAX_ROWS);
  assert.equal(t.rows[0].length, limits.DOM_TABLE_MAX_COLUMNS);
  assert.equal(t.rows[0][0].length, limits.DOM_CELL_MAX_LENGTH);
  assert.equal(t.columns.length, limits.DOM_TABLE_MAX_COLUMNS);
  assert.equal(t.text.length, limits.DOM_TEXT_MAX_LENGTH);
  assert.equal(t.path, undefined, 'path with query must be dropped');
  assert.equal(t.rowCount, 300);
  assert.equal('html' in t, false);
  assert.equal('cookies' in t, false);
  assert.equal(limits.trimDomResult({ path: '/store/products' }).path, '/store/products');
});

test('C4. COMMIT 분류: 결제·주문확정·삭제 = COMMIT, 검색·필터·장바구니 = REVERSIBLE', () => {
  for (const l of ['결제', '주문 확정', '삭제', '구매하기', 'Checkout', 'place order', 'Delete']) assert.equal(limits.classifyDomClickRisk(l), 'COMMIT', l);
  for (const l of ['검색', '필터', '장바구니 담기', 'Search', 'Add to cart', '다음', '']) assert.equal(limits.classifyDomClickRisk(l), 'REVERSIBLE', l);
});

// ── D. handlers ───────────────────────────────────────────────────────────────

test('D1. handlers: DOM action 은 bridge 로만 가고, 확장 미연결이면 O4O_EXTENSION_NOT_CONNECTED', async () => {
  assert.equal(handlers.listAllowedActions().filter((a) => a.startsWith('local.browser.dom.')).length, 8);
  const noBridge = await handlers.runAction('local.browser.dom.inspect#o4o.neture', {}, {});
  assert.deepEqual(noBridge, { status: 'failed', errorCode: 'O4O_EXTENSION_NOT_CONNECTED', data: { siteId: 'o4o.neture', displayName: 'O4O 홈' } });

  const sent = [];
  const bridge = {
    isExtensionConnected: () => true,
    dispatch: async (type, payload) => {
      sent.push({ type, payload });
      return {
        ok: true,
        message: {
          version: 1,
          requestId: 'r',
          type,
          payload: { ok: true, snapshotId: 's_abcd', matches: [{ elementRef: 'e_3', role: 'button', name: '검색', html: '<b>' }], matchCount: 1 },
        },
      };
    },
  };
  const r = await handlers.runAction('local.browser.dom.find#o4o.neture', { bridge }, { query: { text: '검색' } });
  assert.equal(r.status, 'success');
  assert.deepEqual(sent, [{ type: 'browser.dom.find', payload: { siteId: 'o4o.neture', query: { text: '검색' } } }]);
  assert.deepEqual(r.data, {
    siteId: 'o4o.neture',
    displayName: 'O4O 홈',
    snapshotId: 's_abcd',
    matches: [{ elementRef: 'e_3', role: 'button', name: '검색' }],
    matchCount: 1,
  });
});

test('D2. handlers: 미등재 site · 형상 밖 인자 · selector 는 bridge 에 닿지 않는다', async () => {
  let calls = 0;
  const bridge = { isExtensionConnected: () => true, dispatch: async () => { calls += 1; return { ok: false }; } };
  assert.deepEqual(await handlers.runAction('local.browser.dom.click#evil.example', { bridge }, { elementRef: 'e_1', snapshotId: 's_abcd' }), {
    status: 'denied',
    errorCode: 'DOM_SITE_NOT_ALLOWED',
  });
  const bad = await handlers.runAction('local.browser.dom.click#o4o.neture', { bridge }, { selector: '#pay' });
  assert.equal(bad.status, 'denied');
  assert.equal(bad.errorCode, 'DOM_ACTION_NOT_ALLOWED');
  const badText = await handlers.runAction('local.browser.dom.set_input#o4o.neture', { bridge }, { elementRef: 'e_1', snapshotId: 's_abcd', text: '비밀번호 x' });
  assert.equal(badText.errorCode, 'DOM_ACTION_NOT_ALLOWED');
  const noSite = await handlers.runAction('local.browser.dom.inspect', { bridge }, {});
  assert.equal(noSite.status, 'denied');
  assert.equal(calls, 0);
});

test('D3. handlers: 확장의 실패 코드는 그대로, 응답이 너무 크면 CONTENT_UNAVAILABLE', async () => {
  const mk = (payload) => ({ isExtensionConnected: () => true, dispatch: async (type) => ({ ok: true, message: { version: 1, requestId: 'r', type, payload } }) });
  const fail = await handlers.runAction('local.browser.dom.click#o4o.neture', { bridge: mk({ ok: false, errorCode: 'DOM_ACTION_NOT_ALLOWED', riskLevel: 'COMMIT', role: 'button' }) }, { elementRef: 'e_1', snapshotId: 's_abcd' });
  assert.equal(fail.status, 'failed');
  assert.equal(fail.errorCode, 'DOM_ACTION_NOT_ALLOWED');
  assert.equal(fail.data.riskLevel, 'COMMIT');
  const junk = await handlers.runAction('local.browser.dom.click#o4o.neture', { bridge: mk({ ok: false, errorCode: 'bad code with spaces' }) }, { elementRef: 'e_1', snapshotId: 's_abcd' });
  assert.equal(junk.errorCode, 'DOM_CONTENT_UNAVAILABLE');
  // handler 소스: DOM 축은 net · child_process 를 import 하지 않는다 — bridge 는 context 로 주입된다.
  const src = readCode(path.join(AGENT_SRC, 'handlers.mjs'));
  assert.ok(!src.includes("from 'node:net'"));
  assert.ok(!src.includes('child_process'));
});

// ── E. 3 사본 대조 ────────────────────────────────────────────────────────────

test('E1. 서버 · agent · content script 의 한도 · COMMIT 표식 · error code 가 글자 그대로 같다', () => {
  const server = read(SERVER_DOM);
  const cs = read(path.join(EXT_SRC, 'content-script.js'));
  for (const [name, value] of [
    ['DOM_INSPECT_MAX_ELEMENTS', limits.DOM_INSPECT_MAX_ELEMENTS],
    ['DOM_FIND_MAX_MATCHES', limits.DOM_FIND_MAX_MATCHES],
    ['DOM_TEXT_MAX_LENGTH', limits.DOM_TEXT_MAX_LENGTH],
    ['DOM_INPUT_MAX_LENGTH', limits.DOM_INPUT_MAX_LENGTH],
    ['DOM_TABLE_MAX_ROWS', limits.DOM_TABLE_MAX_ROWS],
    ['DOM_TABLE_MAX_COLUMNS', limits.DOM_TABLE_MAX_COLUMNS],
    ['DOM_CELL_MAX_LENGTH', limits.DOM_CELL_MAX_LENGTH],
    ['DOM_ELEMENT_TEXT_MAX', limits.DOM_ELEMENT_TEXT_MAX],
    ['DOM_ELEMENT_NAME_MAX', limits.DOM_ELEMENT_NAME_MAX],
  ]) {
    assert.ok(server.includes(`${name} = ${value};`), `server ${name}`);
    assert.ok(cs.includes(`${name} = ${value};`), `content-script ${name}`);
  }
  for (const k of [...limits.DOM_COMMIT_KEYWORDS_KO, ...limits.DOM_COMMIT_KEYWORDS_EN]) {
    assert.ok(server.includes(`'${k}'`), `server commit keyword ${k}`);
    assert.ok(cs.includes(`'${k}'`), `content-script commit keyword ${k}`);
  }
  for (const code of ['DOM_SITE_NOT_ALLOWED', 'DOM_TAB_NOT_FOUND', 'DOM_ELEMENT_NOT_FOUND', 'DOM_ELEMENT_STALE', 'DOM_ACTION_NOT_ALLOWED', 'DOM_CROSS_ORIGIN_BLOCKED', 'DOM_USER_ACTION_REQUIRED', 'DOM_CONTENT_UNAVAILABLE', 'BROWSER_DOM_PERMISSION_REQUIRED']) {
    assert.ok(server.includes(`'${code}'`), `server ${code}`);
    assert.ok(read(path.join(AGENT_SRC, 'native-bridge-protocol.mjs')).includes(`'${code}'`), `agent proto ${code}`);
    assert.ok(read(path.join(EXT_SRC, 'message-contract.js')).includes(`'${code}'`), `ext contract ${code}`);
  }
  // ref 형식도 같다.
  assert.ok(server.includes('/^e_[1-9][0-9]{0,3}$/'));
  assert.equal(String(limits.DOM_ELEMENT_REF_RE), '/^e_[1-9][0-9]{0,3}$/');
});

// ── F. content script 소스 잠금 ───────────────────────────────────────────────

test('F1. content script: querySelector 인자는 상수/리터럴뿐 · eval/new Function/document.evaluate 없음 (§16)', () => {
  const src = readCode(path.join(EXT_SRC, 'content-script.js'));
  const calls = src.match(/querySelector(?:All)?\(([^)]*)\)/g) ?? [];
  assert.ok(calls.length > 0);
  for (const call of calls) {
    const arg = call.replace(/^querySelector(?:All)?\(/, '').replace(/\)$/, '').trim();
    assert.match(arg, /^('[^']*'|CANDIDATE_SELECTOR|TABLE_SELECTOR|PASSWORD_IN_FORM_SELECTOR)$/, `selector arg must be literal/constant: ${call}`);
  }
  for (const bad of ['eval(', 'new Function', 'document.evaluate', 'XPath', 'executeScript', 'innerHTML', 'outerHTML', 'document.cookie', 'localStorage', 'sessionStorage', 'fetch(', 'import(']) {
    assert.ok(!src.includes(bad), `content script must not contain ${bad}`);
  }
  // payload 값이 selector 로 흘러가는 형태가 없다.
  assert.ok(!/querySelector(?:All)?\((payload|msg|q|query)/.test(src));
});

test('F2. content script: password/OTP 거절 · COMMIT 클릭 거절 · cross-origin 링크 거절 · form-with-password submit 거절 경로가 있다', () => {
  const src = readCode(path.join(EXT_SRC, 'content-script.js'));
  assert.ok(src.includes("type === 'password'"));
  assert.ok(src.includes('ERR.USER_ACTION_REQUIRED'));
  assert.ok(src.includes("riskLevel === 'COMMIT'"));
  assert.ok(src.includes('ERR.CROSS_ORIGIN_BLOCKED'));
  assert.ok(src.includes('PASSWORD_IN_FORM_SELECTOR'));
  // set_input 은 text/search/textarea 만.
  assert.ok(src.includes("type === 'text' || type === 'search'"));
  // 값 자체는 내보내지 않는다 — hasValue 뿐.
  assert.ok(src.includes('hasValue'));
  assert.ok(!/payload\.value|out\.value\s*=/.test(src));
  // 메시지는 이 확장의 SW 에서 온 것만.
  assert.ok(src.includes('sender.id !== chrome.runtime.id'));
});

test('F3. service worker: DOM 요청은 등재 site 탭 하나로만 가고 executeScript 로 주입하지 않는다 (§8·§36·§44)', () => {
  const src = readCode(path.join(EXT_SRC, 'service-worker.js'));
  assert.ok(src.includes('chrome.tabs.sendMessage'));
  assert.ok(src.includes('chrome.permissions.contains'));
  assert.ok(src.includes('DOM_TAB_NOT_FOUND'));
  assert.ok(src.includes('DOM_PERMISSION_REQUIRED'));
  assert.ok(!src.includes('executeScript'));
  assert.ok(!src.includes('chrome.scripting'));
  const manifest = JSON.parse(read(path.join(EXT_SRC, '..', 'manifest.json')));
  assert.deepEqual(manifest.permissions, ['sidePanel', 'tabs', 'nativeMessaging']);
  assert.deepEqual(manifest.host_permissions, ['https://neture.co.kr/*', 'https://health.kr/*']); // PHARMACY-WEB-CORE V0: 등재 site 2
});
