/**
 * WO-O4O-BROWSER-CONTROL-V0
 *
 * 등재 사이트 열기의 **왕복 배관과 정보 경계**를 고정한다. 실제 PowerShell·브라우저는 부르지
 * 않는다 — 그것은 §38 Windows local smoke 와 §39 production smoke 가 담당한다.
 *
 * 특히 고정하려는 것 (§49):
 *   - AI·서버·사용자 누구도 URL 을 실행 경로에 넣을 수 없다. siteId 만 흐른다.
 *   - `javascript:` / `file:` / `data:` / 임의 URL 은 프로토콜 레벨에서 표현 불가능하다.
 *   - 로그인 automation · credential 입력 · cookie 접근 수단이 **존재하지 않는다**.
 *   - 임의 process launch · shell 은 여전히 불가능하고, `Start-Process` 는 한 곳 한 번뿐이다.
 *   - 창 축 · pairing · LNA 회귀 0.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  LOCAL_AGENT_ACTIONS,
  LOCAL_AGENT_ERROR,
  SITE_TARGET_ACTIONS,
  composeSiteAction,
  isAllowedLocalAction,
  pickSafeBrowserInfo,
  pickSafeResultData,
} from '../services/local-agent/local-agent-protocol.js';
import {
  BROWSER_SITE_IDS,
  BROWSER_SITE_REGISTRY,
  browserSiteDisplayName,
  findBrowserSite,
  isRegisteredBrowserSite,
} from '../services/local-agent/browser-site-registry.js';
import {
  AiCapability,
  AI_TOOL_NAMES,
  AI_TOOL_REGISTRY,
  assertToolAllowed,
  deriveAiCapabilities,
  resolveAvailableTools,
  validateToolArguments,
  findToolDefinition,
  type VerifiedToolContext,
} from '../services/ai-tools/ai-tool-contract.js';
import {
  asksForLogin,
  asksForSiteOpen,
  detectRegisteredSite,
  executeAiTool,
  needsLocalDeviceResolution,
  renderToolContext,
  selectToolInvocationForRequest,
} from '../services/ai-tools/ai-tool-router.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const AGENT_SRC = join(REPO_ROOT, 'tools', 'o4o-local-agent', 'src');
const readAgent = (f: string) => readFileSync(join(AGENT_SRC, f), 'utf8');
const codeOnly = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*(?:\/\/|#|\*)[^\n]*$/gm, '')
    .replace(/(^|[^:])\/\/[^\n]*$/gm, '$1');

const SITE = 'o4o.neture';

const ctx = (over: Partial<VerifiedToolContext> = {}): VerifiedToolContext => ({
  userId: 'user-1',
  workspace: 'home',
  localAgentStatus: 'connected',
  localDeviceId: 'dev-1',
  ...over,
});

async function respondAsAgent(
  db: LocalAgentDb,
  outcome: { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown },
) {
  for (let i = 0; i < 200 && db.commands.length === 0; i += 1) {
    await new Promise((r) => setTimeout(r, 5));
  }
  const cmd = db.commands[db.commands.length - 1];
  await submitCommandResult(db.dataSource, cmd.device_id, {
    commandId: cmd.command_id,
    status: outcome.status,
    errorCode: outcome.errorCode,
    data: outcome.data,
  } as any);
  return cmd;
}

async function runTool(
  db: LocalAgentDb,
  tool: string,
  siteId: string,
  outcome: Parameters<typeof respondAsAgent>[1],
) {
  const [result, cmd] = await Promise.all([
    executeAiTool(db.dataSource, tool, { siteId }, ctx()),
    respondAsAgent(db, outcome),
  ]);
  return { result, cmd };
}

// ─── 1~2. 등재 · 열기 ────────────────────────────────────────────────────────

describe('1~2. 등재 사이트 식별 · 열기', () => {
  it('1. 등재 사이트는 이름으로만 식별된다 — URL 은 siteId 가 되지 못한다', () => {
    expect(detectRegisteredSite('네뚜레 사이트 열어줘')).toBe(SITE);
    expect(detectRegisteredSite('O4O 홈 열어줘')).toBe(SITE);
    expect(detectRegisteredSite('open neture please')).toBe(SITE);
    // URL 을 그대로 말해도 식별되지 않는다(§10·§29).
    expect(detectRegisteredSite('https://neture.co.kr/ 열어줘')).toBe(SITE); // 이름이 들어 있으니 이름으로 식별
    expect(detectRegisteredSite('https://evil.example/ 열어줘')).toBeNull();
    expect(detectRegisteredSite('구글 열어줘')).toBeNull();
  });

  it('2. 등재 사이트 열기 — siteId 만 실려 가고 URL 은 명령 어디에도 없다', async () => {
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);

    const { result, cmd } = await runTool(db, AI_TOOL_NAMES.BROWSER_OPEN_SITE, SITE, {
      status: 'success',
      data: {
        siteId: SITE,
        displayName: '가짜 이름', // agent 주장 — 서버 registry 값으로 덮여야 한다
        opened: true,
        browserRunning: true,
        browserType: 'edge',
        browserWasRunning: false,
        activated: true,
      },
    });

    expect(cmd.action).toBe(composeSiteAction(LOCAL_AGENT_ACTIONS.BROWSER_OPEN_SITE, SITE));
    expect(cmd.action).not.toMatch(/https?:/i);
    expect(JSON.stringify(cmd)).not.toContain('neture.co.kr');

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      available: true,
      opened: true,
      siteId: SITE,
      displayName: 'O4O 홈', // registry 값
      browserType: 'edge',
      browserWasRunning: false,
      activated: true,
    });
    expect(JSON.stringify(result)).not.toContain('가짜 이름');
    expect(db.commands).toHaveLength(1);
  });

  it('2-b. 브라우저 상태 조회는 열지 않으며 siteKnownOpen 을 true 로 만들지 못한다', async () => {
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    const { result, cmd } = await runTool(db, AI_TOOL_NAMES.BROWSER_GET_SITE_STATUS, SITE, {
      status: 'success',
      data: { siteId: SITE, browserRunning: true, browserType: 'chrome', siteKnownOpen: true },
    });
    expect(cmd.action).toBe(composeSiteAction(LOCAL_AGENT_ACTIONS.BROWSER_GET_SITE_STATUS, SITE));
    expect(result.data).toMatchObject({ available: true, browserRunning: true, browserType: 'chrome' });
    // agent 가 true 라고 주장해도 통과하지 못한다 — V0 는 탭을 열거하지 않는다(§13).
    expect(result.data).not.toHaveProperty('siteKnownOpen');
  });
});

// ─── 3~6. 미등재 · 임의 URL · 위험 스킴 · agent allowlist ────────────────────

describe('3~6. 미등재 사이트 · 임의 URL · agent allowlist', () => {
  it('3. 미등재 siteId 는 인자 검증에서 끝난다 — 명령이 발행되지 않는다', async () => {
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    const tool = findToolDefinition(AI_TOOL_NAMES.BROWSER_OPEN_SITE);
    expect(validateToolArguments({ siteId: 'evil.example' }, tool).ok).toBe(false);
    const r = await executeAiTool(db.dataSource, AI_TOOL_NAMES.BROWSER_OPEN_SITE, { siteId: 'evil.example' }, ctx());
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_ARGUMENTS');
    expect(db.commands).toHaveLength(0);
  });

  it('4. 임의 URL 은 인자 형상 자체에 칸이 없다', () => {
    const tool = findToolDefinition(AI_TOOL_NAMES.BROWSER_OPEN_SITE);
    for (const bad of [
      { url: 'https://neture.co.kr/' },
      { siteId: SITE, url: 'https://evil.example/' },
      { siteId: 'https://neture.co.kr/' },
      { href: 'x' },
      {},
      [],
      'https://neture.co.kr/',
    ]) {
      expect(validateToolArguments(bad, tool).ok).toBe(false);
    }
  });

  it('5. javascript: / file: / data: / custom protocol 은 프로토콜 레벨에서 표현 불가능하다', () => {
    for (const evil of [
      'javascript:alert(1)',
      'file:///C:/Windows/system32',
      'data:text/html,<script>',
      'ms-settings:',
      'chrome://settings',
    ]) {
      expect(isRegisteredBrowserSite(evil)).toBe(false);
      expect(isAllowedLocalAction(composeSiteAction(LOCAL_AGENT_ACTIONS.BROWSER_OPEN_SITE, evil))).toBe(false);
    }
    // 등재부 자체가 https 만 담는다(§12).
    for (const s of BROWSER_SITE_REGISTRY) {
      expect(s.url).toMatch(/^https:\/\//);
      for (const o of s.allowedOrigins) expect(o).toMatch(/^https:\/\//);
    }
  });

  it('6. agent allowlist — 서버·agent 등재부가 같고, agent 는 미등재 siteId 를 거절한다', () => {
    // (a) 두 등재부가 어긋나면 여기서 깨진다.
    const agentSrc = readAgent('browser-site-registry.mjs');
    for (const s of BROWSER_SITE_REGISTRY) {
      expect(agentSrc).toContain(`siteId: '${s.siteId}'`);
      expect(agentSrc).toContain(`url: '${s.url}'`);
      expect(agentSrc).toContain(`displayName: '${s.displayName}'`);
    }
    const agentIds = [...agentSrc.matchAll(/siteId: '([^']+)'/g)].map((m) => m[1]).sort();
    expect(agentIds).toEqual([...BROWSER_SITE_IDS].sort());

    // (b) agent handler 는 등재부 조회 실패 시 BROWSER_SITE_NOT_REGISTERED 로 끝낸다.
    const handlers = codeOnly(readAgent('handlers.mjs'));
    expect(handlers).toContain("findBrowserSite(appId)");
    expect(handlers).toContain("errorCode: 'BROWSER_SITE_NOT_REGISTERED'");
    // (c) 서버 allowlist 도 등재 siteId 만 펼친다.
    for (const base of SITE_TARGET_ACTIONS) {
      for (const id of BROWSER_SITE_IDS) expect(isAllowedLocalAction(composeSiteAction(base, id))).toBe(true);
      expect(isAllowedLocalAction(composeSiteAction(base, 'not.registered'))).toBe(false);
    }
  });
});

// ─── 7~9. capability · 브라우저 없음 · agent offline ─────────────────────────

describe('7~9. 자격 · 정규화', () => {
  it('7. PC 가 연결되지 않으면 브라우저 capability 가 없고 tool 이 노출되지 않는다', () => {
    const noDevice = ctx({ localAgentStatus: 'none', localDeviceId: undefined });
    const caps = deriveAiCapabilities(noDevice);
    expect(caps).not.toContain(AiCapability.LOCAL_BROWSER_OPEN);
    expect(caps).not.toContain(AiCapability.READ_ONLY_LOCAL_BROWSER_INSPECT);
    const names = resolveAvailableTools(noDevice).map((t) => t.name);
    expect(names).not.toContain(AI_TOOL_NAMES.BROWSER_OPEN_SITE);
    expect(names).not.toContain(AI_TOOL_NAMES.BROWSER_GET_SITE_STATUS);
    expect(assertToolAllowed(AI_TOOL_NAMES.BROWSER_OPEN_SITE, noDevice)).toMatchObject({
      allowed: false,
      reason: 'CAPABILITY_MISSING',
    });
  });

  it('8. 브라우저 없음 / 열기 실패는 코드로 정규화되고 원문은 새지 않는다', async () => {
    for (const errorCode of [LOCAL_AGENT_ERROR.BROWSER_NOT_AVAILABLE, LOCAL_AGENT_ERROR.BROWSER_OPEN_FAILED]) {
      const db = makeDb();
      await pairAndRegister(db);
      await connected(db);
      const { result } = await runTool(db, AI_TOOL_NAMES.BROWSER_OPEN_SITE, SITE, {
        status: 'failed',
        errorCode,
        data: { siteId: SITE, opened: false, stack: 'C:\\Users\\someone\\...', profile: 'Default' },
      });
      expect(result.data).toMatchObject({ available: false, errorCode, siteId: SITE });
      const text = JSON.stringify(result) + (renderToolContext(result) ?? '');
      expect(text).not.toContain('C:\\Users');
      expect(text).not.toContain('Default');
      expect(text).not.toContain('powershell');
    }
  });

  it('9. agent offline 이면 명령 없이 OFFLINE 으로 끝난다', async () => {
    const db = makeDb();
    await pairAndRegister(db); // heartbeat 없음 → offline
    const r = await executeAiTool(db.dataSource, AI_TOOL_NAMES.BROWSER_OPEN_SITE, { siteId: SITE }, ctx());
    expect(r.data).toMatchObject({ available: false, errorCode: LOCAL_AGENT_ERROR.OFFLINE });
    expect(db.commands).toHaveLength(0);
    expect(renderToolContext(r)).toContain('연결되어 있지 않아');
  });
});

// ─── 10~12. 로그인 · credential · cookie ─────────────────────────────────────

describe('10~12. 로그인은 사용자 몫 — credential/cookie 수단 부재', () => {
  it('10. 로그인 요청은 열기까지만 수행하고, 사용자 직접 로그인 안내가 프롬프트에 들어간다', async () => {
    expect(asksForLogin('네뚜레 로그인해 줘')).toBe(true);
    const sel = selectToolInvocationForRequest('네뚜레 로그인해 줘', ctx());
    // 로그인 tool 은 없다. 열기 tool 로 간다.
    expect(sel).toEqual({ tool: AI_TOOL_NAMES.BROWSER_OPEN_SITE, args: { siteId: SITE } });

    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    const { result } = await runTool(db, AI_TOOL_NAMES.BROWSER_OPEN_SITE, SITE, {
      status: 'success',
      data: { siteId: SITE, opened: true, browserRunning: true, browserType: 'edge', browserWasRunning: true },
    });
    const block = renderToolContext(result) ?? '';
    expect(block).toContain('직접');
    expect(block).toContain('로그인을 대신하지 않습니다');
    expect(block).toContain('[로그인 완료]');
  });

  it('11. password 입력 tool 이 존재하지 않는다 — 이름도 자격도 없다', () => {
    const names = AI_TOOL_REGISTRY.map((t) => t.name);
    for (const n of names) {
      expect(n).not.toMatch(/password|login|credential|fill|submit/i);
      // 열기 축(local.browser.<x>)에는 입력 tool 이 없다. DOM 축(local.browser.dom.*, BROWSER-DOM-CONTROL-V0)의
      // set_input 은 elementRef 대상의 짧은 텍스트뿐이고 password/OTP 필드는 확장이 거절한다(browser-dom-control.spec).
      if (n.startsWith('local.browser.') && !n.startsWith('local.browser.dom.')) expect(n).not.toMatch(/type|input/i);
    }
    for (const bogus of ['local.browser.login', 'local.browser.type_password', 'local.browser.fill']) {
      expect(assertToolAllowed(bogus, ctx())).toMatchObject({ allowed: false, reason: 'UNKNOWN_TOOL' });
      expect(isAllowedLocalAction(bogus)).toBe(false);
    }
    for (const c of Object.values(AiCapability)) {
      expect(c).not.toMatch(/PASSWORD|LOGIN|CREDENTIAL|INPUT/);
    }
    // 브라우저 열기 경로(handlers · window-control · browser-open.ps1)에는 입력을 보내는 코드가 없다.
    // COMPUTER-USE-V0 이후 입력 API 는 `windows-computer-input.ps1` **한 파일에만** 있고,
    // 그 파일은 등재 앱 창 핸들로만 호출된다 (computer-use.spec 이 그 파일을 별도로 검사한다).
    const agent = codeOnly(readAgent('handlers.mjs') + readAgent('windows-window-control.mjs') + readAgent('windows-browser-open.ps1'));
    for (const f of ['SendKeys', 'SendInput', 'keybd_event', 'mouse_event', 'SetCursorPos', 'password', 'credential']) {
      expect(agent.toLowerCase()).not.toContain(f.toLowerCase());
    }
  });

  it('12. cookie · 프로필 · 저장 비밀번호 접근 수단이 없다', () => {
    const agent = codeOnly(
      ['handlers.mjs', 'windows-window-control.mjs', 'browser-site-registry.mjs', 'windows-browser-open.ps1']
        .map(readAgent)
        .join('\n'),
    );
    // `-NoProfile` 은 PowerShell 의 **보안** 플래그(프로필 스크립트 미로드)라 허용한다 —
    // 브라우저 프로필 접근을 뜻하는 문자열만 금지한다.
    for (const f of [
      'Cookies', 'Login Data', 'Local State', 'DPAPI', 'CryptUnprotectData', 'localStorage', 'sessionStorage',
      'User Data', '--profile-directory', '--user-data-dir', '--remote-debugging', 'DevTools', 'CDP',
      'puppeteer', 'playwright', 'Web Data', 'Network\\Cookies',
    ]) {
      expect(agent).not.toContain(f);
    }
    expect(agent).toContain('-NoProfile'); // 보안 플래그는 오히려 있어야 한다
    // 서버 응답 화이트리스트에도 그런 필드가 없다.
    const out = pickSafeBrowserInfo({
      siteId: SITE, opened: true, browserType: 'edge',
      cookies: 'x', sessionToken: 'y', url: 'https://neture.co.kr/', profilePath: 'C:\\...', tabs: ['a'], username: 'u',
    });
    expect(Object.keys(out).sort()).toEqual(['browserType', 'opened', 'siteId'].sort());
    // browserType 은 두 값뿐이다.
    expect(pickSafeBrowserInfo({ browserType: 'firefox' })).toEqual({});
  });
});

// ─── 13~14. 임의 실행 · 셸 ──────────────────────────────────────────────────

describe('13~14. 임의 process launch · shell 은 여전히 불가능하다', () => {
  it('13. 사이트 열기는 실행 파일을 지정하지 않는다 — 열리는 것은 등재 https URL 뿐', () => {
    const opener = codeOnly(readAgent('windows-browser-open.ps1'));
    expect((opener.match(/Start-Process/g) ?? []).length).toBe(1);
    expect(opener).toContain('Start-Process -FilePath $raw');
    expect(opener).toContain("-notmatch '^https://");
    for (const f of ['.exe', '-ArgumentList', '-Verb', 'chrome', 'msedge', 'iexplore', 'cmd', 'powershell']) {
      expect(opener.toLowerCase()).not.toContain(f.toLowerCase());
    }
    // handler 판별은 https UrlAssociation 의 ProgId **읽기** 한 건뿐 — registry 를 쓰거나 다른 키를 읽지 않는다.
    expect((opener.match(/Get-ItemProperty/g) ?? []).length).toBe(1);
    expect(opener).toContain('UrlAssociations\\https\\UserChoice');
    for (const f of ['Set-ItemProperty', 'New-Item', 'Remove-Item', 'HKLM', 'Local State', 'Login Data']) {
      expect(opener).not.toContain(f);
    }
    // JS 쪽도 https 검사 뒤에만 환경변수로 넘긴다.
    const control = codeOnly(readAgent('windows-window-control.mjs'));
    expect(control).toContain('O4O_SITE_URL');
    expect(control).toMatch(/\^https:\\\/\\\//);
    // 실행 계열 action 이름은 여전히 없다.
    for (const a of ['local.start_process', 'local.exec', 'local.run', 'local.open_app', 'local.browser.exec']) {
      expect(isAllowedLocalAction(a)).toBe(false);
    }
  });

  it('14. 셸은 열려 있지 않다 (기존 잠금 유지)', () => {
    const control = codeOnly(readAgent('windows-window-control.mjs'));
    for (const forbidden of ['shell: true', 'execSync', '-Command', '-EncodedCommand']) {
      expect(control).not.toContain(forbidden);
    }
    expect(control).not.toMatch(/[^A-Za-z]exec[(]/);
    expect(control).not.toMatch(/[^A-Za-z]spawn[(]/);
    expect(readAgent('handlers.mjs')).not.toContain('child_process');
    expect(readAgent('browser-site-registry.mjs')).not.toContain('child_process');
  });
});

// ─── 15~18. 회귀 · 위조 입력 ────────────────────────────────────────────────

describe('15~18. 회귀 · 위조', () => {
  it('15~17. 창 축 · 로컬 축 선택이 그대로다 (사이트 축이 끼어들지 않는다)', () => {
    expect(selectToolInvocationForRequest('메모장 열려 있어?', ctx()))
      .toEqual({ tool: AI_TOOL_NAMES.FIND_APPLICATION, args: { appId: 'windows.notepad' } });
    expect(selectToolInvocationForRequest('메모장 앞으로 가져와', ctx()))
      .toEqual({ tool: AI_TOOL_NAMES.ACTIVATE_WINDOW, args: { appId: 'windows.notepad' } });
    expect(selectToolInvocationForRequest('내 PC 연결됐어?', ctx()).tool)
      .toBe(AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS);
    // 사이트와 앱이 한 문장에 같이 오면 임의로 고르지 않는다.
    expect(selectToolInvocationForRequest('메모장이랑 네뚜레 열어줘', ctx())).toBeNull();
    // "열려 있어?" 는 조회로, "열어줘" 만 열기로 간다.
    expect(selectToolInvocationForRequest('네뚜레 열려 있어?', ctx()))
      .toEqual({ tool: AI_TOOL_NAMES.BROWSER_GET_SITE_STATUS, args: { siteId: SITE } });
    expect(selectToolInvocationForRequest('네뚜레 열어줘', ctx()))
      .toEqual({ tool: AI_TOOL_NAMES.BROWSER_OPEN_SITE, args: { siteId: SITE } });
    expect(asksForSiteOpen('네뚜레 열려 있어?')).toBe(false);
    // 라우트가 device 를 조회해야 하는 요청으로 인식한다(창 축에서 겪은 결함의 재발 방지).
    expect(needsLocalDeviceResolution('네뚜레 열어줘')).toBe(true);
  });

  it('18. WorkScope 위조 입력이 브라우저 자격을 열지 못한다', () => {
    const forged = {
      ...ctx({ localAgentStatus: 'none', localDeviceId: undefined }),
      capabilities: ['LOCAL_BROWSER_OPEN'],
      localAgentStatus: 'connected', // 클라이언트가 주장 — 서버가 device 를 재확정하지 않으면 무효
    } as unknown as VerifiedToolContext;
    // localDeviceId 가 없으면 connected 라고 주장해도 자격이 없다.
    expect(deriveAiCapabilities(forged)).not.toContain(AiCapability.LOCAL_BROWSER_OPEN);
  });

  it('displayName 은 등재부 밖 입력을 되돌리지 않는다', () => {
    expect(browserSiteDisplayName('<script>alert(1)</script>')).toBe('해당 사이트');
    expect(findBrowserSite('nope')).toBeUndefined();
  });

  it('safe result dispatch — 사이트 action 은 브라우저 화이트리스트를 탄다', () => {
    const out = pickSafeResultData(composeSiteAction(LOCAL_AGENT_ACTIONS.BROWSER_OPEN_SITE, SITE), {
      siteId: SITE, opened: true, url: 'x', windowCount: 3,
    });
    expect(out).toEqual({ siteId: SITE, opened: true });
  });
});
