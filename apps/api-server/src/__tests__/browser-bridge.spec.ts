/**
 * Browser Bridge Protocol — 서버 계약 스펙 (§58)
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0
 *
 * 서버 쪽 계약(browser-bridge-protocol.ts)의 준비 상태 게이트·오류 정규화·봉투 검증을
 * 검증하고, 세 사본(확장·agent·서버)의 message type / error code / workspace mode 가
 * 글자 그대로 일치하는지 교차 확인한다. 또한 이 WO 가 **브라우저 DOM 실행을 켜지 않았다**는
 * 계약(§46·§47·§48)을 회귀로 고정한다: browser executionMode 미실행 · browser tool 미등록.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  BRIDGE_PROTOCOL_VERSION,
  NATIVE_BRIDGE_MESSAGE_TYPES,
  WORKSPACE_MODES,
  BROWSER_BRIDGE_ERROR,
  validateBridgeMessage,
  computeReadiness,
  readinessBlockReason,
  assertBrowserAutomationReady,
  isAllowedBridgeMessageType,
  isSupportedWorkspaceMode,
} from '../services/local-agent/browser-bridge-protocol.js';
import { AI_TOOL_REGISTRY } from '../services/ai-tools/ai-tool-contract.js';

const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');
const AGENT_PROTO = path.join(REPO_ROOT, 'tools', 'o4o-local-agent', 'src', 'native-bridge-protocol.mjs');
const EXT_CONTRACT = path.join(REPO_ROOT, 'tools', 'o4o-chrome-extension', 'src', 'message-contract.js');
const CONTRACT_TS = path.join(__dirname, '..', 'services', 'ai-tools', 'ai-tool-contract.ts');
const read = (p: string): string => readFileSync(p, 'utf8');

describe('browser-bridge-protocol envelope validation (§28)', () => {
  it('accepts a valid envelope and defaults payload', () => {
    const r = validateBridgeMessage({ version: 1, requestId: 'r1', type: 'extension.status' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.message.payload).toEqual({});
  });

  it('rejects version mismatch with VERSION_MISMATCH (§53)', () => {
    const r = validateBridgeMessage({ version: 9, requestId: 'r1', type: 'extension.hello' });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.errorCode).toBe('NATIVE_BRIDGE_VERSION_MISMATCH');
  });

  it('rejects unknown/forbidden message types as BAD_MESSAGE (§29)', () => {
    for (const t of ['shell.exec', 'file.read', 'registry.write', 'browser.open_url']) {
      const r = validateBridgeMessage({ version: 1, requestId: 'r1', type: t });
      expect(r.ok).toBe(false);
      if (r.ok === false) expect(r.errorCode).toBe('NATIVE_BRIDGE_BAD_MESSAGE');
    }
  });

  it('rejects malformed envelopes', () => {
    expect(validateBridgeMessage(null).ok).toBe(false);
    expect(validateBridgeMessage([1]).ok).toBe(false);
    expect(validateBridgeMessage({ version: 1, requestId: '', type: 'extension.hello' }).ok).toBe(false);
    expect(validateBridgeMessage({ version: 1, requestId: 'r', type: 'extension.hello', payload: [1] }).ok).toBe(false);
  });

  it('type/mode guards behave', () => {
    expect(isAllowedBridgeMessageType('extension.hello')).toBe(true);
    expect(isAllowedBridgeMessageType('dom.click')).toBe(false);
    expect(isSupportedWorkspaceMode('split')).toBe(true);
    expect(isSupportedWorkspaceMode('dual')).toBe(false);
  });
});

describe('readiness gate (§31·§35·§36)', () => {
  const base = { chromeInstalled: true, extensionInstalled: true, extensionConnected: true, agentConnected: true };

  it('browserAutomationReady only when all four true', () => {
    expect(computeReadiness(base).browserAutomationReady).toBe(true);
    expect(computeReadiness({ ...base, agentConnected: false }).browserAutomationReady).toBe(false);
    expect(computeReadiness({}).browserAutomationReady).toBe(false);
  });

  it('block reason follows the priority chain (§35)', () => {
    expect(readinessBlockReason(computeReadiness(base))).toBeNull();
    expect(readinessBlockReason(computeReadiness({ ...base, chromeInstalled: false }))).toBe('CHROME_NOT_INSTALLED');
    expect(readinessBlockReason(computeReadiness({ ...base, extensionInstalled: false }))).toBe(
      'O4O_EXTENSION_NOT_INSTALLED',
    );
    expect(readinessBlockReason(computeReadiness({ ...base, agentConnected: false }))).toBe('LOCAL_AGENT_OFFLINE');
    expect(readinessBlockReason(computeReadiness({ ...base, extensionConnected: false }))).toBe(
      'O4O_EXTENSION_NOT_CONNECTED',
    );
  });

  it('assertBrowserAutomationReady throws normalized code when blocked, passes when ready', () => {
    expect(() => assertBrowserAutomationReady(computeReadiness(base))).not.toThrow();
    try {
      assertBrowserAutomationReady(computeReadiness({ ...base, chromeInstalled: false }));
      fail('should have thrown');
    } catch (e) {
      expect((e as { code: string }).code).toBe('CHROME_NOT_INSTALLED');
    }
  });
});

describe('three-way contract cross-check (§10·§54)', () => {
  it('server error codes match the values the agent copy declares', () => {
    const agent = read(AGENT_PROTO);
    for (const code of Object.values(BROWSER_BRIDGE_ERROR)) {
      expect(agent).toContain(`'${code}'`);
    }
  });

  it('agent + extension copies list the same message types (bridge 4 + DOM 8)', () => {
    const agent = read(AGENT_PROTO);
    const ext = read(EXT_CONTRACT);
    for (const t of NATIVE_BRIDGE_MESSAGE_TYPES) {
      expect(agent).toContain(`'${t}'`);
      expect(ext).toContain(`'${t}'`);
    }
    // 열세 번째 type 이 몰래 들어오지 않았는지 — 서버 사본 길이 고정(BRIDGE-V0 4 + BROWSER-DOM-CONTROL-V0 8).
    expect(NATIVE_BRIDGE_MESSAGE_TYPES.length).toBe(12);
    expect(NATIVE_BRIDGE_MESSAGE_TYPES.filter((t) => t.startsWith('browser.dom.')).length).toBe(8);
    expect([...WORKSPACE_MODES]).toEqual(['split', 'focus']);
    expect(BRIDGE_PROTOCOL_VERSION).toBe(1);
  });
});

describe('no browser DOM execution enabled this WO (§46·§47·§48)', () => {
  it('EXECUTABLE_MODES still excludes browser', () => {
    const src = read(CONTRACT_TS);
    // browser 를 실행 모드에 넣지 않았음을 소스에서 고정한다(§48).
    expect(src).toMatch(/EXECUTABLE_MODES[^\n]*=\s*Object\.freeze\(\['server',\s*'local'\]\)/);
  });

  it('no AI tool is registered with executionMode browser', () => {
    const browserTools = AI_TOOL_REGISTRY.filter((t) => t.executionMode === 'browser');
    expect(browserTools).toEqual([]);
  });
});
