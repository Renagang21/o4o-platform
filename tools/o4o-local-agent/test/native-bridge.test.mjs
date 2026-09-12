/**
 * Native Bridge — 에이전트/확장 계약 테스트 (§58)
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0
 *
 * zero-dep node:test. Node 22.18.0 에서 반드시 파일을 명시해 실행한다:
 *   node --test tools/o4o-local-agent/test/native-bridge.test.mjs
 *
 * 다루는 축: 봉투 검증 · 버전 일치/불일치 · unknown/malformed/arbitrary 거절 · handshake ·
 * workspace 모드 전이 + work state 보존 · 준비 상태 게이트 · site registry ·
 * native host dispatcher · stdio framing · Chrome 감지 · 삼중 사본 교차확인 ·
 * manifest 유효성 · native host manifest 유효성 · deterministic 확장 ID · 보안 부재 소스 스캔.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import * as agentContract from '../src/native-bridge-protocol.mjs';
import * as host from '../src/native-host.mjs';
import { buildHostManifest } from '../src/install-native-host.mjs';
import { detectChromeInstalled, KNOWN_CHROME_PATHS, makeWindowsChromeProbe } from '../src/windows-chrome-detect.mjs';

import * as extContract from '../../o4o-chrome-extension/src/message-contract.js';
import * as extSites from '../../o4o-chrome-extension/src/site-registry.js';
import { transitionWorkspaceMode, initialWorkspaceState } from '../../o4o-chrome-extension/src/workspace-mode.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AGENT_SRC = path.join(HERE, '..', 'src');
const EXT_ROOT = path.join(HERE, '..', '..', 'o4o-chrome-extension');
const SERVER_PROTO = path.join(
  HERE, '..', '..', '..', 'apps', 'api-server', 'src', 'services', 'local-agent', 'browser-bridge-protocol.ts',
);
const read = (p) => readFileSync(p, 'utf8');
/** 주석을 제거한 소스. 보안 부재 스캔은 실제 코드만 봐야 한다(주석이 금지어를 설명하므로). */
const readCode = (p) =>
  readFileSync(p, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '') // 블록 주석
    .replace(/(^|[^:])\/\/.*$/gm, '$1'); // 라인 주석(URL 의 // 는 앞 문자로 보호)

// ── 봉투 검증 (§28) ──────────────────────────────────────────────────────────
test('valid envelope passes with defaulted payload', () => {
  const r = agentContract.validateBridgeMessage({ version: 1, requestId: 'r1', type: 'extension.status' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.message.payload, {});
});

test('version mismatch → NATIVE_BRIDGE_VERSION_MISMATCH (§53)', () => {
  const r = agentContract.validateBridgeMessage({ version: 2, requestId: 'r1', type: 'extension.hello' });
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, 'NATIVE_BRIDGE_VERSION_MISMATCH');
});

test('unknown message type → BAD_MESSAGE (not executed) (§29)', () => {
  for (const t of ['shell.exec', 'file.read', 'registry.write', 'browser.open_url', 'dom.click']) {
    const r = agentContract.validateBridgeMessage({ version: 1, requestId: 'r1', type: t });
    assert.equal(r.ok, false, `type ${t} must be rejected`);
    assert.equal(r.errorCode, 'NATIVE_BRIDGE_BAD_MESSAGE');
  }
});

test('malformed envelopes rejected (null/array/bad requestId/array payload)', () => {
  assert.equal(agentContract.validateBridgeMessage(null).ok, false);
  assert.equal(agentContract.validateBridgeMessage([1, 2]).ok, false);
  assert.equal(agentContract.validateBridgeMessage({ version: 1, requestId: '', type: 'extension.hello' }).ok, false);
  assert.equal(agentContract.validateBridgeMessage({ version: 1, requestId: 'x'.repeat(129), type: 'extension.hello' }).ok, false);
  assert.equal(
    agentContract.validateBridgeMessage({ version: 1, requestId: 'r', type: 'extension.hello', payload: [1] }).ok,
    false,
  );
});

test('exactly twelve message types allowed — bridge 4 + DOM 8, no more (§27 · DOM-CONTROL §38)', () => {
  assert.deepEqual([...agentContract.NATIVE_BRIDGE_MESSAGE_TYPES].sort(), [
    'browser.dom.click',
    'browser.dom.find',
    'browser.dom.get_context',
    'browser.dom.inspect',
    'browser.dom.read_table',
    'browser.dom.read_text',
    'browser.dom.select_option',
    'browser.dom.set_input',
    'browser.get_context',
    'extension.hello',
    'extension.status',
    'workspace.set_mode',
  ]);
  assert.deepEqual([...agentContract.BRIDGE_DOM_MESSAGE_TYPES], [...extContract.BRIDGE_DOM_MESSAGE_TYPES]);
  // DOM type 이 확장→host 방향으로 요청되면 host 는 서비스하지 않는다(agent→확장 방향만).
  const r = host.handleBridgeMessage(
    { version: 1, requestId: 'r', type: 'browser.dom.click', payload: {} },
    { hasAgentCredentials: () => true },
  );
  assert.deepEqual(r.payload, { serviced: false, reason: 'AGENT_TO_EXTENSION_ONLY' });
});

// ── handshake (§30) ──────────────────────────────────────────────────────────
test('hello handshake carries only version info + agentConnected — no secrets (§30)', () => {
  const resp = host.handleBridgeMessage(
    { version: 1, requestId: 'h1', type: 'extension.hello', payload: {} },
    { hasAgentCredentials: () => true },
  );
  assert.equal(resp.type, 'extension.hello');
  assert.equal(resp.requestId, 'h1');
  assert.equal(resp.payload.agentConnected, true);
  assert.equal(resp.payload.bridgeProtocolVersion, 1);
  assert.ok(typeof resp.payload.agentVersion === 'string');
  // 민감 필드가 없어야 한다
  const keys = Object.keys(resp.payload);
  for (const forbidden of ['credential', 'token', 'password', 'cookie', 'path', 'deviceId']) {
    assert.ok(!keys.includes(forbidden), `handshake must not expose ${forbidden}`);
  }
});

test('status reflects agentConnected=false when no credentials', () => {
  const resp = host.handleBridgeMessage(
    { version: 1, requestId: 's1', type: 'extension.status', payload: {} },
    { hasAgentCredentials: () => false },
  );
  assert.equal(resp.payload.agentConnected, false);
});

test('browser-local types are acknowledged as not host-serviced in V0', () => {
  for (const t of ['browser.get_context', 'workspace.set_mode']) {
    const resp = host.handleBridgeMessage({ version: 1, requestId: 'q', type: t, payload: {} });
    assert.equal(resp.payload.serviced, false);
  }
});

// ── stdio framing (§23) ──────────────────────────────────────────────────────
test('encodeFrame/drainFrames round-trip, incl. split chunks', () => {
  const a = host.encodeFrame({ version: 1, requestId: 'a', type: 'extension.status', payload: {} });
  const b = host.encodeFrame({ version: 1, requestId: 'b', type: 'extension.hello', payload: {} });
  const both = Buffer.concat([a, b]);
  const drained = host.drainFrames(both);
  assert.equal(drained.messages.length, 2);
  assert.equal(drained.messages[0].requestId, 'a');
  assert.equal(drained.messages[1].requestId, 'b');
  // 잘린 프레임은 rest 로 남는다
  const partial = host.drainFrames(a.subarray(0, 6));
  assert.equal(partial.messages.length, 0);
  assert.equal(partial.rest.length, 6);
});

// ── workspace 모드 전이 + work state 보존 (§14·§43) ──────────────────────────
test('workspace transition preserves work state across mode change (§14)', () => {
  const workState = { step: 'reviewing-order', tabId: 42 };
  let state = initialWorkspaceState(workState);
  assert.equal(state.mode, 'split');
  const toFocus = transitionWorkspaceMode(state, 'focus');
  assert.equal(toFocus.ok, true);
  assert.equal(toFocus.changed, true);
  assert.deepEqual(toFocus.state.workState, workState, 'work state must survive split→focus');
  const backToSplit = transitionWorkspaceMode(toFocus.state, 'split');
  assert.deepEqual(backToSplit.state.workState, workState, 'work state must survive focus→split');
});

test('unsupported workspace mode → WORKSPACE_MODE_UNSUPPORTED (§54)', () => {
  const r = transitionWorkspaceMode(initialWorkspaceState(), 'dual');
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, 'WORKSPACE_MODE_UNSUPPORTED');
});

test('only split/focus supported in V0 (§15·§16)', () => {
  assert.deepEqual([...agentContract.WORKSPACE_MODES], ['split', 'focus']);
});

// ── 준비 상태 게이트 (§31·§35·§36) ──────────────────────────────────────────
test('browserAutomationReady only when all four true (§35)', () => {
  const all = agentContract.computeReadiness({
    chromeInstalled: true, extensionInstalled: true, extensionConnected: true, agentConnected: true,
  });
  assert.equal(all.browserAutomationReady, true);
  assert.equal(agentContract.readinessBlockReason(all), null);
});

test('readiness block reason follows priority chain (§35)', () => {
  const base = { chromeInstalled: true, extensionInstalled: true, extensionConnected: true, agentConnected: true };
  assert.equal(
    agentContract.readinessBlockReason(agentContract.computeReadiness({ ...base, chromeInstalled: false })),
    'CHROME_NOT_INSTALLED',
  );
  assert.equal(
    agentContract.readinessBlockReason(agentContract.computeReadiness({ ...base, extensionInstalled: false })),
    'O4O_EXTENSION_NOT_INSTALLED',
  );
  assert.equal(
    agentContract.readinessBlockReason(agentContract.computeReadiness({ ...base, agentConnected: false })),
    'LOCAL_AGENT_OFFLINE',
  );
  assert.equal(
    agentContract.readinessBlockReason(agentContract.computeReadiness({ ...base, extensionConnected: false })),
    'O4O_EXTENSION_NOT_CONNECTED',
  );
});

// ── site registry (§37) ──────────────────────────────────────────────────────
test('site registry identifies neture, rejects others; no <all_urls> host perms (§21)', () => {
  assert.equal(extSites.siteIdForUrl('https://neture.co.kr/some/path?x=1'), 'o4o.neture');
  assert.equal(extSites.siteIdForUrl('https://evil.example.com/'), null);
  assert.equal(extSites.siteIdForUrl('not a url'), null);
  assert.deepEqual(extSites.derivedHostPermissions(), ['https://neture.co.kr/*', 'https://health.kr/*']);
  assert.equal(extSites.siteIdForUrl('https://health.kr/searchIdentity/search.asp'), 'healthkr');
  assert.equal(extSites.siteIdForUrl('https://www.health.kr/'), null); // www 는 apex 로 301 — 등재 origin 아님
});

// ── Chrome 감지 (§32) ────────────────────────────────────────────────────────
test('chrome detected via App Paths, else via known file, else false (§32)', () => {
  assert.equal(detectChromeInstalled({ appPathsHasChrome: () => true, fileExists: () => false }), true);
  assert.equal(
    detectChromeInstalled({ appPathsHasChrome: () => false, fileExists: (p) => p === KNOWN_CHROME_PATHS[0] }),
    true,
  );
  assert.equal(detectChromeInstalled({ appPathsHasChrome: () => false, fileExists: () => false }), false);
  // 실제 probe 는 execFileSync/fs 없이도 예외 없이 false 를 준다(§32 — 전체 스캔 안 함)
  assert.equal(typeof makeWindowsChromeProbe().appPathsHasChrome(), 'boolean');
});

// ── 삼중 사본 교차 확인 (§10 계약 일관성) ────────────────────────────────────
test('extension + agent contract constants are identical', () => {
  assert.equal(extContract.BRIDGE_PROTOCOL_VERSION, agentContract.BRIDGE_PROTOCOL_VERSION);
  assert.deepEqual([...extContract.NATIVE_BRIDGE_MESSAGE_TYPES], [...agentContract.NATIVE_BRIDGE_MESSAGE_TYPES]);
  assert.deepEqual([...extContract.WORKSPACE_MODES], [...agentContract.WORKSPACE_MODES]);
  assert.deepEqual(extContract.NATIVE_BRIDGE_ERROR, agentContract.NATIVE_BRIDGE_ERROR);
});

test('server TS copy declares the same message types + error codes (§54)', () => {
  const ts = read(SERVER_PROTO);
  for (const t of agentContract.NATIVE_BRIDGE_MESSAGE_TYPES) {
    assert.ok(ts.includes(`'${t}'`), `server proto must list ${t}`);
  }
  for (const code of Object.values(agentContract.NATIVE_BRIDGE_ERROR)) {
    assert.ok(ts.includes(`'${code}'`), `server proto must list error ${code}`);
  }
  assert.ok(ts.includes('BRIDGE_PROTOCOL_VERSION = 1'), 'server proto version must be 1');
});

test('host name copy matches between extension client and native host (§25)', () => {
  const clientSrc = read(path.join(EXT_ROOT, 'src', 'native-bridge-client.js'));
  assert.ok(clientSrc.includes(`'${host.NATIVE_HOST_NAME}'`), 'extension client must use the same host name');
});

// ── manifest 유효성 (§10·§20·§21·§22) ────────────────────────────────────────
test('extension manifest is minimal MV3 with no <all_urls> (§20·§21)', () => {
  const m = JSON.parse(read(path.join(EXT_ROOT, 'manifest.json')));
  assert.equal(m.manifest_version, 3);
  assert.ok(typeof m.key === 'string' && m.key.length > 0, 'must embed deterministic key');
  // 권한 최소화 — 이 집합의 부분집합만 허용
  const allowedPerms = new Set(['sidePanel', 'tabs', 'nativeMessaging', 'storage']);
  for (const p of m.permissions) assert.ok(allowedPerms.has(p), `unexpected permission ${p}`);
  assert.ok(!m.permissions.includes('cookies'), 'no cookies permission (§18·§45)');
  assert.ok(!m.permissions.includes('webRequest'), 'no webRequest permission');
  // host_permissions = 등재 origin 만, <all_urls> 금지
  assert.deepEqual(m.host_permissions, ['https://neture.co.kr/*', 'https://health.kr/*']);
  const raw = read(path.join(EXT_ROOT, 'manifest.json'));
  assert.ok(!raw.includes('<all_urls>'), 'manifest must not use <all_urls>');
  // background service worker = module
  assert.equal(m.background.type, 'module');
  assert.ok(m.side_panel && typeof m.side_panel.default_path === 'string');
  // content_scripts 도 neture 로만 좁혀져 있어야 한다(§22)
  for (const cs of m.content_scripts) {
    assert.deepEqual(cs.matches, ['https://neture.co.kr/*', 'https://health.kr/*']);
  }
});

// ── native host manifest 유효성 (§25) ────────────────────────────────────────
test('native host manifest: stdio, single extension id, no wildcard (§25)', () => {
  const manifest = buildHostManifest('C:\\Users\\x\\AppData\\Local\\o4o-local-agent\\o4o-native-host.bat');
  assert.equal(manifest.type, 'stdio');
  assert.equal(manifest.name, host.NATIVE_HOST_NAME);
  assert.equal(manifest.allowed_origins.length, 1);
  assert.equal(manifest.allowed_origins[0], `chrome-extension://${host.ALLOWED_EXTENSION_ID}/`);
  for (const o of manifest.allowed_origins) {
    assert.ok(!o.includes('*'), 'allowed_origins must not contain a wildcard');
  }
});

// ── deterministic 확장 ID (§26) ──────────────────────────────────────────────
test('extension id is deterministic from manifest key — no drift (§26)', () => {
  const m = JSON.parse(read(path.join(EXT_ROOT, 'manifest.json')));
  const der = Buffer.from(m.key, 'base64');
  const hash = createHash('sha256').update(der).digest();
  const first16 = hash.subarray(0, 16).toString('hex');
  const id = [...first16].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');
  assert.equal(id, host.ALLOWED_EXTENSION_ID, 'derived id must equal the allowed extension id');
});

// ── 보안 부재 소스 스캔 (§18·§29·§45·§46·§47) ────────────────────────────────
test('no forbidden capability appears in extension/host source (§29·§46·§47)', () => {
  const files = [
    path.join(AGENT_SRC, 'native-host.mjs'),
    path.join(AGENT_SRC, 'native-bridge-protocol.mjs'),
    path.join(EXT_ROOT, 'src', 'service-worker.js'),
    path.join(EXT_ROOT, 'src', 'content-script.js'),
    path.join(EXT_ROOT, 'src', 'native-bridge-client.js'),
  ];
  // 임의 실행이 소스에 없어야 한다. (native-host 는 child_process 를 import 하지 않는다)
  // DOM-CONTROL-V0 이후 content-script 는 DOM executor 를 갖지만, executor 는 상수 selector · elementRef 로만
  // 동작한다 — 그 잠금은 browser-dom.test.mjs 가 별도로 건다. 여기서는 SW · client · host 의 부재만 본다.
  for (const f of files) {
    const src = readCode(f);
    const bads = f.endsWith('content-script.js')
      ? ['child_process', 'executeScript', 'chrome.debugger', 'eval(', 'new Function']
      : ['child_process', 'executeScript', 'chrome.debugger', 'document.querySelector', '.click(', 'eval('];
    for (const bad of bads) {
      assert.ok(!src.includes(bad), `${path.basename(f)} must not contain ${bad}`);
    }
  }
});

test('content script never touches cookies · storage · raw HTML · page scripts (§18·§45 · DOM-CONTROL §12·§43)', () => {
  const src = readCode(path.join(EXT_ROOT, "src", "content-script.js"));
  for (const bad of ['document.cookie', 'localStorage', 'sessionStorage', 'innerHTML', 'outerHTML', 'document.forms', 'document.scripts', 'fetch(', 'XMLHttpRequest']) {
    assert.ok(!src.includes(bad), `content script must not touch ${bad}`);
  }
});
