/**
 * WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 — 최소 자동 테스트 (§34)
 *
 * 여기서 고정하려는 것은 "창이 앞으로 온다" 가 아니라 **경계가 정확히 한 칸만 열렸다** 이다.
 *
 *   - 찾을 수 있는 프로그램은 등재된 것뿐이고, 등재되지 않은 대상은 **표현할 수단이 없다**
 *   - 창이 0개면 안내, 2개 이상이면 임의 선택 대신 확인 요청 (§14·§16)
 *   - 서버·AI 로 나가는 것은 개수·상태·표시 이름뿐 — 창 제목 · PID · 창 핸들 ·
 *     실행 파일 경로 · 전체 프로세스 목록은 문을 지나지 못한다 (§20·§21)
 *   - 실행 · 종료 · 셸 · 파일 접근 · 키보드 · 마우스 · 화면 캡처는 금지 이전에 **없다**
 *     (§25·§26·§27·§28)
 *   - 직전 WO 의 replay · 인증 · pairing · LNA UX 계약은 그대로다 (§33)
 *
 * ⚠️ 이번 WO 는 agent 에 `child_process` 를 **의도적으로 한 파일만** 열었다.
 * 그 한 칸이 넓어지지 않는다는 것을 13~14번이 지킨다.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  APP_TARGET_ACTIONS,
  composeAppAction,
  isAllowedLocalAction,
  LOCAL_AGENT_ACTIONS,
  LOCAL_AGENT_ERROR,
  parseLocalAction,
  pickSafeResultData,
  pickSafeWindowInfo,
} from '../services/local-agent/local-agent-protocol.js';
import {
  findWindowsApp,
  isRegisteredWindowsApp,
  WINDOWS_APP_IDS,
  WINDOWS_APP_REGISTRY,
  windowsAppDisplayName,
} from '../services/local-agent/windows-app-registry.js';
import {
  AiCapability,
  AI_TOOL_NAMES,
  assertToolAllowed,
  deriveAiCapabilities,
  findToolDefinition,
  resolveAvailableTools,
  validateToolArguments,
  type VerifiedToolContext,
} from '../services/ai-tools/ai-tool-contract.js';
import {
  detectRegisteredApp,
  executeAiTool,
  renderToolContext,
  selectToolInvocationForRequest,
} from '../services/ai-tools/ai-tool-router.js';
import {
  authenticateAgentSession,
  awaitCommandResult,
  issueCommand,
  openAgentSession,
  redeemPairingGrant,
  submitCommandResult,
} from '../services/local-agent/local-agent-service.js';

import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const AGENT_SRC = join(REPO_ROOT, 'tools', 'o4o-local-agent', 'src');
const readAgent = (f: string) => readFileSync(join(AGENT_SRC, f), 'utf8');

/** 주석을 지운 코드 본문. "이런 건 쓰지 않는다" 는 설명이 금지 문자열 검사에 걸리지 않게 한다. */
const codeOnly = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*(?:\/\/|#|\*)[^\n]*$/gm, '')
    .replace(/(^|[^:])\/\/[^\n]*$/gm, '$1');

/** 소스에 남아 있는 정규식 리터럴 (주석 제거 후에만 쓴다). */
const RE_LITERAL = /\/(?![/*])(?:\\.|\[[^\]]*\]|[^/\\\n])+\/[gimsuy]*/g;

const NOTEPAD = 'windows.notepad';

const ctx = (over: Partial<VerifiedToolContext> = {}): VerifiedToolContext => ({
  userId: 'user-1',
  workspace: 'home',
  localAgentStatus: 'connected',
  localDeviceId: 'dev-1',
  ...over,
});

/**
 * agent 역할 대역. 명령이 큐에 뜨면 지정한 결과를 제출한다.
 *
 * 실제 PowerShell 을 부르지 않는다 — 여기서 검증하는 것은 창 제어의 성공 여부가 아니라
 * **왕복 배관과 정보 경계**다. 실제 창 동작은 §35 Windows local smoke 가 담당한다.
 */
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
  appId: string,
  outcome: Parameters<typeof respondAsAgent>[1],
) {
  const [result, cmd] = await Promise.all([
    executeAiTool(db.dataSource, tool, { appId }, ctx()),
    respondAsAgent(db, outcome),
  ]);
  return { result, cmd };
}

// ─── 1~3. 등재 · 탐색 · 거절 ─────────────────────────────────────────────────

describe('1~3. 등재된 프로그램만 찾을 수 있다', () => {
  it('1. 등재 앱이 실행 중이면 실행 중이라고 답한다', async () => {
    const db = makeDb();
    await connected(db);
    const { result, cmd } = await runTool(db, AI_TOOL_NAMES.FIND_APPLICATION, NOTEPAD, {
      status: 'success',
      data: { appId: NOTEPAD, displayName: '메모장', found: true, windowCount: 1, state: 'running' },
    });
    // appId 는 인자 칸이 아니라 allowlist 에 등재된 action 문자열 안으로 간다(§9·§38).
    expect(cmd.action).toBe(composeAppAction(LOCAL_AGENT_ACTIONS.FIND_APPLICATION, NOTEPAD));
    expect(parseLocalAction(cmd.action)).toEqual({
      base: LOCAL_AGENT_ACTIONS.FIND_APPLICATION,
      appId: NOTEPAD,
    });
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ available: true, found: true, windowCount: 1 });
    expect(renderToolContext(result)).toContain('실행 중입니다');
  });

  it('2. 실행 중이 아니면 "먼저 실행해 주세요" 안내로 끝난다 — 대신 실행하지 않는다', async () => {
    const db = makeDb();
    await connected(db);
    const { result } = await runTool(db, AI_TOOL_NAMES.FIND_APPLICATION, NOTEPAD, {
      status: 'failed',
      errorCode: LOCAL_AGENT_ERROR.APP_NOT_RUNNING,
      data: { appId: NOTEPAD, displayName: '메모장', found: false, windowCount: 0 },
    });
    const block = renderToolContext(result);
    expect(block).toContain('실행되고 있지 않습니다');
    expect(block).toContain('먼저 실행해 주세요');
    expect(block).toContain('대신 실행하지 않습니다');
    // 내부 오류 코드는 사용자 문장에 섞이지 않는다.
    expect(block).not.toContain(LOCAL_AGENT_ERROR.APP_NOT_RUNNING);
  });

  it('3. 등재되지 않은 프로그램은 명령이 되지 못한다', async () => {
    const db = makeDb();
    await connected(db);

    // (a) 계약 계층 — 인자 검증에서 끝난다.
    const activate = findToolDefinition(AI_TOOL_NAMES.ACTIVATE_WINDOW);
    expect(validateToolArguments({ appId: 'windows.cmd' }, activate).reason).toBe(
      'INVALID_ARGUMENTS',
    );
    const denied = await executeAiTool(
      db.dataSource,
      AI_TOOL_NAMES.ACTIVATE_WINDOW,
      { appId: 'windows.cmd' },
      ctx(),
    );
    expect(denied.ok).toBe(false);
    expect(denied.reason).toBe('INVALID_ARGUMENTS');
    expect(db.commands).toHaveLength(0);

    // (b) allowlist — 같은 형태의 문자열이어도 등재부 밖이면 없는 action 이다.
    expect(isAllowedLocalAction('local.activate_window#windows.cmd')).toBe(false);
    expect(isRegisteredWindowsApp('windows.cmd')).toBe(false);
    // (c) appId 외의 인자를 얹으려는 시도도 막힌다.
    expect(validateToolArguments({ appId: NOTEPAD, hwnd: 123 }, activate).reason).toBe(
      'INVALID_ARGUMENTS',
    );
    expect(validateToolArguments({ processName: 'notepad.exe' }, activate).reason).toBe(
      'INVALID_ARGUMENTS',
    );
  });
});

// ─── 4~8. 창 선택 · 복원 · foreground ────────────────────────────────────────

describe('4~8. 창 선택과 활성화', () => {
  it('4. 등재 process 의 제목 있는 창만 후보가 된다', () => {
    // jest 는 CJS 로 돌고 agent 는 ESM(.mjs) 이라 그대로 require 할 수 없다.
    // 대신 **저장소에 있는 그 함수의 소스를 그대로** 평가한다 — 복제본이 아니라 원본이다.
    // (matchWindows 이후 구간은 순수 함수 선언뿐이고, 부작용 있는 코드는 그 앞에 있다.)
    const source = readAgent('windows-window-control.mjs');
    const tail = source.slice(source.indexOf('export function matchWindows')).split('export ').join('');
    const matchWindows = new Function(`${tail}; return matchWindows;`)() as (
      w: unknown[],
      a: unknown,
    ) => { hwnd: number }[];
    const app = { appId: NOTEPAD, displayName: '메모장', processNames: ['notepad'] };
    const picked = matchWindows(
      [
        { hwnd: 1, pid: 10, processName: 'notepad', title: '제목 없음 - 메모장', minimized: false },
        { hwnd: 2, pid: 11, processName: 'notepad', title: '', minimized: false }, // 제목 없음
        { hwnd: 3, pid: 12, processName: 'explorer', title: '탐색기', minimized: false }, // 다른 앱
        { hwnd: 4, pid: 13, processName: 'svchost', title: '서비스', minimized: false }, // helper
      ],
      app,
    );
    expect(picked.map((w: { hwnd: number }) => w.hwnd)).toEqual([1]);
  });

  it('5. 창이 2개 이상이면 임의로 고르지 않고 확인을 요청한다', async () => {
    const db = makeDb();
    await connected(db);
    const { result } = await runTool(db, AI_TOOL_NAMES.ACTIVATE_WINDOW, NOTEPAD, {
      status: 'failed',
      errorCode: LOCAL_AGENT_ERROR.APP_WINDOW_AMBIGUOUS,
      data: { appId: NOTEPAD, displayName: '메모장', found: true, windowCount: 3 },
    });
    const block = renderToolContext(result);
    expect(block).toContain('3개');
    expect(block).toContain('임의로');
  });

  it('6. 최소화된 창은 복원 후 활성화하며, 복원 사실을 그대로 말한다', async () => {
    const db = makeDb();
    await connected(db);
    const { result } = await runTool(db, AI_TOOL_NAMES.ACTIVATE_WINDOW, NOTEPAD, {
      status: 'success',
      data: {
        appId: NOTEPAD,
        displayName: '메모장',
        found: true,
        windowCount: 1,
        activated: true,
        restored: true,
        state: 'foreground',
      },
    });
    expect(result.data).toMatchObject({ activated: true, restored: true });
    expect(renderToolContext(result)).toContain('복원');

    // 복원은 **최소화된 창에만** 적용된다. 숨은 창을 임의로 띄우지 않는다(§18).
    const ps = readAgent('windows-window-activate.ps1');
    expect(ps).toContain('IsIconic');
    expect(ps.indexOf('IsIconic($handle)) {')).toBeLessThan(ps.indexOf('SW_RESTORE)'));
    expect(ps).toContain('IsWindowVisible');
  });

  it('7. 창이 하나면 앞으로 가져오고 성공을 보고한다', async () => {
    const db = makeDb();
    await connected(db);
    const { result, cmd } = await runTool(db, AI_TOOL_NAMES.ACTIVATE_WINDOW, NOTEPAD, {
      status: 'success',
      data: {
        appId: NOTEPAD,
        displayName: '메모장',
        found: true,
        windowCount: 1,
        activated: true,
        restored: false,
        state: 'foreground',
      },
    });
    expect(cmd.action).toBe(composeAppAction(LOCAL_AGENT_ACTIONS.ACTIVATE_WINDOW, NOTEPAD));
    expect(renderToolContext(result)).toContain('앞으로 가져왔습니다');
    // 한 요청에서 foreground 전환은 최대 1회 — 명령도 1건뿐이다(§19).
    expect(db.commands).toHaveLength(1);
  });

  it('8. 활성화 실패는 코드가 아니라 사용자 문장으로 정규화된다', async () => {
    const db = makeDb();
    await connected(db);
    const { result } = await runTool(db, AI_TOOL_NAMES.ACTIVATE_WINDOW, NOTEPAD, {
      status: 'failed',
      errorCode: LOCAL_AGENT_ERROR.WINDOW_ACTIVATION_FAILED,
      data: { appId: NOTEPAD, displayName: '메모장', found: true, windowCount: 1 },
    });
    const block = renderToolContext(result);
    expect(block).toContain('앞으로 가져오지 못했습니다');
    expect(block).not.toContain(LOCAL_AGENT_ERROR.WINDOW_ACTIVATION_FAILED);
    // 스택 트레이스 · PowerShell 오류 문자열이 흘러나오지 않는다.
    expect(block).not.toMatch(/powershell/i);
  });
});

// ─── 9~10. 정보 최소화 (§20·§21) ─────────────────────────────────────────────

describe('9~10. 프로세스 목록 · 경로는 문을 지나지 못한다', () => {
  const dirty = {
    appId: NOTEPAD,
    displayName: '메모장',
    found: true,
    windowCount: 2,
    state: 'running',
    // 아래는 전부 통과하면 안 되는 것들이다.
    hwnd: 132456,
    pid: 4242,
    processName: 'notepad',
    title: '환자목록.txt - 메모장',
    executablePath: 'C:\\Windows\\System32\\notepad.exe',
    commandLine: 'notepad.exe C:\\Users\\hong\\환자목록.txt',
    userHome: 'C:\\Users\\hong',
    processes: ['notepad', 'chrome', 'pm2000'],
  };

  it('9. 전체 프로세스 목록 · 창 제목은 통과하지 못한다', () => {
    const safe = pickSafeWindowInfo(dirty);
    expect(Object.keys(safe).sort()).toEqual([
      'appId',
      'displayName',
      'found',
      'state',
      'windowCount',
    ]);
    const json = JSON.stringify(safe);
    // appId(windows.notepad) 는 서버가 준 값이라 남는다. 새로 알아낸 것들만 검사한다.
    for (const leak of ['processes', 'chrome', 'pm2000', '환자목록', '132456', '4242']) {
      expect(json).not.toContain(leak);
    }
  });

  it('10. 실행 파일 경로 · command line · 사용자 경로도 통과하지 못한다', async () => {
    const json = JSON.stringify(pickSafeWindowInfo(dirty));
    for (const leak of ['System32', 'Users', 'hong', '.exe']) {
      expect(json).not.toContain(leak);
    }
    // 모르는 action 의 결과는 통째로 버린다 — 새 action 이 생겨도 기본이 "닫힘" 이다.
    expect(pickSafeResultData('local.something_new', dirty)).toEqual({});

    // census 스크립트가 경로 계열 속성을 읽지 않는다 (주석은 "읽지 않는다" 는 설명이라 제외).
    const census = codeOnly(readAgent('windows-window-census.ps1'));
    for (const forbidden of ['.Path', 'CommandLine', 'MainModule', 'StartInfo', 'Get-WmiObject']) {
      expect(census).not.toContain(forbidden);
    }

    // AI 로 나가는 결과에도 창 제목 · 핸들이 없다.
    const db = makeDb();
    await connected(db);
    const { result } = await runTool(db, AI_TOOL_NAMES.FIND_APPLICATION, NOTEPAD, {
      status: 'success',
      data: dirty,
    });
    const block = renderToolContext(result);
    expect(block).not.toContain('환자목록');
    expect(JSON.stringify(result)).not.toContain('132456');
  });
});

// ─── 11~14. 없는 것은 여전히 없다 (§25~§28) ─────────────────────────────────

describe('11~14. 실행 · 종료 · 셸 · 파일 접근은 구현 자체가 없다', () => {
  const agentFiles = ['handlers.mjs', 'index.mjs', 'windows-window-control.mjs', 'local-server.mjs'];

  it('11. 임의 프로그램을 실행할 수단이 없다', () => {
    // allowlist 에 실행 계열 action 이 없다 — 이름이 없으면 명령이 될 수 없다.
    for (const action of ['local.start_process', 'local.launch_exe', 'local.run', 'local.open_app']) {
      expect(isAllowedLocalAction(action)).toBe(false);
    }
    expect(APP_TARGET_ACTIONS).toEqual([
      LOCAL_AGENT_ACTIONS.FIND_APPLICATION,
      LOCAL_AGENT_ACTIONS.ACTIVATE_WINDOW,
    ]);
    for (const f of [...agentFiles, 'windows-window-census.ps1', 'windows-window-activate.ps1']) {
      const code = readAgent(f);
      for (const forbidden of ['Start-Process', 'ShellExecute', 'CreateProcess']) {
        expect(code).not.toContain(forbidden);
      }
    }

    // WO-O4O-BROWSER-CONTROL-V0 §25·§26·§27 — **의도적으로 한 칸 연 예외**.
    // `Start-Process` 는 저장소 전체에서 `windows-browser-open.ps1` 한 파일, 한 번만 허용되고,
    // 그 한 번은 반드시 `-FilePath $raw` 형태여야 한다. `$raw` 는 https 정규식을 통과한
    // 환경변수(등재부 상수)이고, 실행 파일 경로 · -ArgumentList · -Verb 는 쓸 수 없다.
    // 즉 이것은 "프로그램 실행" 이 아니라 "등재 URL 을 OS handler 에 넘기는 것" 뿐이다.
    const opener = readAgent('windows-browser-open.ps1');
    const openerCode = opener
      .split('\n')
      .filter((l) => !l.trim().startsWith('#'))
      .join('\n');
    expect((openerCode.match(/Start-Process/g) ?? []).length).toBe(1);
    expect(openerCode).toContain('Start-Process -FilePath $raw');
    for (const forbidden of ['-ArgumentList', '-Verb', '.exe', 'ShellExecute', 'CreateProcess', 'chrome', 'msedge']) {
      expect(openerCode).not.toContain(forbidden);
    }
    // 입력은 환경변수 하나뿐이고 https 절대 URL 이어야 한다.
    expect(openerCode).toContain('$env:O4O_SITE_URL');
    expect(openerCode).toContain("-notmatch '^https://");
    expect(openerCode).not.toContain('$args');
    expect(openerCode).not.toContain('param(');
  });

  it('12. 프로그램을 종료 · 강제 종료할 수단이 없다', () => {
    for (const f of [...agentFiles, 'windows-window-census.ps1', 'windows-window-activate.ps1']) {
      const code = readAgent(f);
      for (const forbidden of [
        'Stop-Process',
        'TerminateProcess',
        'CloseMainWindow',
        'PostMessage',
        'SendMessage',
        'DestroyWindow',
        'WM_CLOSE',
        'taskkill',
      ]) {
        expect(code).not.toContain(forbidden);
      }
    }
  });

  it('13. 셸은 열려 있지 않다 — child_process 는 한 파일 · 체크인된 .ps1 세 개뿐이다', () => {
    // (a) child_process 를 import 하는 파일은 정확히 하나다.
    const importers = agentFiles.filter((f) => readAgent(f).includes('child_process'));
    expect(importers).toEqual(['windows-window-control.mjs']);

    const control = readAgent('windows-window-control.mjs');
    // (b) 셸을 경유하는 API 를 쓰지 않는다 (머리말이 그 이유를 설명하므로 주석은 제외한다).
    expect(control).toContain("import { execFile } from 'node:child_process'");
    const controlCode = codeOnly(control);
    for (const forbidden of ['shell: true', 'execSync', '-Command', '-EncodedCommand']) {
      expect(controlCode).not.toContain(forbidden);
    }
    // `execFile` 은 허용, 맨 `exec(` · `spawn(` 은 불가 — 앞 글자를 붙여 구분한다.
    expect(controlCode).not.toMatch(/[^A-Za-z]exec[(]/);
    expect(controlCode).not.toMatch(/[^A-Za-z]spawn[(]/);
    // (c) 실행 대상은 저장소에 체크인된 .ps1 세 개뿐이고, argv 는 상수다.
    //     (BROWSER-CONTROL-V0 에서 등재 사이트 열기 스크립트가 하나 늘었다.)
    const scripts = [...control.matchAll(/'([\w-]+\.ps1)'/g)].map((m) => m[1]).sort();
    expect(scripts).toEqual([
      'windows-browser-open.ps1',
      'windows-window-activate.ps1',
      'windows-window-census.ps1',
    ]);
    expect(control).toContain("'-File'");
    // (d) 유일한 런타임 입력인 창 핸들은 10진 정수 검사를 통과해야 한다.
    expect(control).toContain('Number.isInteger(handle)');
    expect(readAgent('windows-window-activate.ps1')).toContain("-notmatch '^[0-9]{1,19}$'");
    // (e) appId · 창 제목은 프로세스 경계를 넘지 않는다 (census 는 인자를 받지 않는다).
    expect(readAgent('windows-window-census.ps1')).not.toContain('$args');
    expect(readAgent('windows-window-census.ps1')).not.toContain('param(');
    // (f) 사이트 열기의 유일한 입력(URL)도 JS 쪽에서 https 검사를 통과해야 넘어간다.
    expect(control).toContain('O4O_SITE_URL');
    expect(controlCode).toMatch(/\^https:\\\/\\\//);
  });

  it('14. 임의 파일 접근 수단이 없다 (fs 는 여전히 credentials 한 곳뿐)', () => {
    expect(readAgent('handlers.mjs')).not.toContain('node:fs');
    expect(readAgent('windows-window-control.mjs')).not.toContain('node:fs');
    expect(readAgent('windows-app-registry.mjs')).not.toContain('node:fs');
    expect(readAgent('index.mjs')).not.toContain("'node:fs'");
    expect(readAgent('credentials.mjs')).toContain("'credentials.json'");
    expect(readAgent('browser-site-registry.mjs')).not.toContain('node:fs');
    // PowerShell 쪽에도 파일 조작 cmdlet 이 없다.
    for (const f of ['windows-window-census.ps1', 'windows-window-activate.ps1', 'windows-browser-open.ps1']) {
      const code = readAgent(f);
      for (const forbidden of ['Get-Content', 'Set-Content', 'Remove-Item', 'Out-File', 'Invoke-']) {
        expect(code).not.toContain(forbidden);
      }
    }
  });
});

// ─── 15~16. 자격 · 미등록 action ─────────────────────────────────────────────

describe('15~16. 자격이 없으면 명령이 나가지 않는다', () => {
  it('15. PC 가 연결되어 있지 않으면 창 tool 자격이 성립하지 않는다', async () => {
    const offline = ctx({ localAgentStatus: 'offline', localDeviceId: undefined });
    const caps = deriveAiCapabilities(offline);
    expect(caps).not.toContain(AiCapability.READ_ONLY_LOCAL_APP_INSPECT);
    expect(caps).not.toContain(AiCapability.LOCAL_WINDOW_ACTIVATE);
    expect(assertToolAllowed(AI_TOOL_NAMES.ACTIVATE_WINDOW, offline)).toEqual({
      allowed: false,
      reason: 'CAPABILITY_MISSING',
    });

    const db = makeDb();
    await connected(db);
    const r = await executeAiTool(
      db.dataSource,
      AI_TOOL_NAMES.ACTIVATE_WINDOW,
      { appId: NOTEPAD },
      offline,
    );
    expect(r.ok).toBe(false);
    expect(db.commands).toHaveLength(0);

    // 자격이 없으면 후보 목록에도 뜨지 않는다 — 모델에게 보여주지 않는다.
    const names = resolveAvailableTools(offline).map((t) => t.name);
    expect(names).not.toContain(AI_TOOL_NAMES.ACTIVATE_WINDOW);
    expect(names).not.toContain(AI_TOOL_NAMES.FIND_APPLICATION);
    // 연결되면 둘 다 후보가 된다.
    expect(resolveAvailableTools(ctx()).map((t) => t.name)).toEqual(
      expect.arrayContaining([AI_TOOL_NAMES.FIND_APPLICATION, AI_TOOL_NAMES.ACTIVATE_WINDOW]),
    );
  });

  it('16. allowlist 밖의 local action 은 여전히 발행되지 않는다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    for (const action of [
      'local.exec_shell',
      'local.file_read',
      'local.find_application', // appId 없는 맨 이름도 allowlist 밖이다
      'local.activate_window#../../etc',
    ]) {
      const issued = await issueCommand(db.dataSource, {
        userId: 'user-1',
        deviceId: agent.deviceId,
        action,
        toolName: AI_TOOL_NAMES.FIND_APPLICATION,
      });
      expect(issued.ok).toBe(false);
    }
    expect(db.commands).toHaveLength(0);
  });
});

// ─── 17~20. 직전 계약 회귀 0 (§33) ───────────────────────────────────────────

describe('17~20. 기존 계약은 그대로다', () => {
  it('17. 같은 명령에 결과를 두 번 제출할 수 없다 (replay 회귀 0)', async () => {
    const db = makeDb();
    const agent = await connected(db);
    const issued = await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: agent.deviceId,
      action: composeAppAction(LOCAL_AGENT_ACTIONS.FIND_APPLICATION, NOTEPAD),
      toolName: AI_TOOL_NAMES.FIND_APPLICATION,
    });
    expect(issued.ok).toBe(true);
    if (issued.ok === false) return;

    const payload = {
      commandId: issued.command.commandId,
      status: 'success' as const,
      data: { appId: NOTEPAD, found: true, windowCount: 1 },
    };
    expect(await submitCommandResult(db.dataSource, agent.deviceId, payload)).toEqual({ ok: true });
    const second = await submitCommandResult(db.dataSource, agent.deviceId, payload);
    expect(second.ok).toBe(false);

    const result = await awaitCommandResult(db.dataSource, issued.command.commandId, 1000);
    expect(result.status).toBe('success');
  });

  it('18. agent 인증 회귀 0 — 자격 없이 세션을 열 수 없다', async () => {
    const db = makeDb();
    const reg = await pairAndRegister(db);
    const bad = await openAgentSession(db.dataSource, reg.deviceId, 'wrong-credential');
    expect(bad.ok).toBe(false);
    const good = await openAgentSession(db.dataSource, reg.deviceId, reg.agentCredential);
    expect(good.ok).toBe(true);
    if (good.ok === false) return;
    // 알 수 없는 토큰에는 붙일 세션 자체가 없다.
    expect(await authenticateAgentSession(db.dataSource, 'not-a-token')).toBeFalsy();
    expect(await authenticateAgentSession(db.dataSource, good.sessionToken)).toBeTruthy();
  });

  it('19. pairing 회귀 0 — 연결 코드는 여전히 1회용이다', async () => {
    const db = makeDb();
    const reg = await pairAndRegister(db);
    const reuse = await redeemPairingGrant(db.dataSource, {
      grant: reg.grant,
      deviceName: '다른 PC',
      platform: 'windows',
      agentVersion: '0.1.0',
    });
    expect(reuse.ok).toBe(false);
  });

  it('20. LNA UX 회귀 0 — web-neture 회귀 테스트가 CI 에 배선되어 있다', () => {
    // 이 축은 조용히 깨지는 곳이라 파일 존재만으로는 부족하다. CI 가 실제로 돌려야 한다(§5).
    const workflow = readFileSync(join(REPO_ROOT, '.github', 'workflows', 'ci-pipeline.yml'), 'utf8');
    expect(workflow).toContain('npx vitest run --config services/web-neture/vitest.config.mjs');
    const lnaSpec = readFileSync(
      join(
        REPO_ROOT,
        'services/web-neture/src/components/mypage/__tests__/LocalAgentCard.lna.test.tsx',
      ),
      'utf8',
    );
    expect(lnaSpec.length).toBeGreaterThan(0);
  });
});

// ─── 부록: 등재부 · 의도 인식 ────────────────────────────────────────────────

describe('registry · 의도 인식', () => {
  it('server 등재부와 agent 등재부는 같은 목록이다 (이중 allowlist)', () => {
    const agentSrc = readAgent('windows-app-registry.mjs');
    for (const appId of WINDOWS_APP_IDS) {
      expect(agentSrc).toContain(`'${appId}'`);
      const app = findWindowsApp(appId);
      for (const p of app.processNames) expect(agentSrc).toContain(`'${p}'`);
    }
    // agent 쪽에 서버가 모르는 앱이 몰래 들어 있지 않다.
    const agentIds = [...agentSrc.matchAll(/appId: '([^']+)'/g)].map((m) => m[1]).sort();
    expect(agentIds).toEqual([...WINDOWS_APP_IDS].sort());
    expect(WINDOWS_APP_REGISTRY.length).toBe(WINDOWS_APP_IDS.length);
  });

  it('등재되지 않은 이름은 표시 이름조차 되돌려 주지 않는다', () => {
    expect(windowsAppDisplayName(NOTEPAD)).toBe('메모장');
    // 모델이 만든 문자열을 그대로 되읽지 않는다.
    expect(windowsAppDisplayName('<script>alert(1)</script>')).toBe('해당 프로그램');
  });

  it('한글 의도 키워드는 번들 후에도 살아 있어야 한다 (ASCII 이스케이프)', () => {
    const src = readFileSync(
      join(__dirname, '..', 'services', 'ai-tools', 'ai-tool-router.ts'),
      'utf8',
    );
    // 2026-09-09 프로덕션 실측 결함의 재발 방지: 한글이 정규식 리터럴에 있으면 안 된다.
    const regexLiterals = codeOnly(src).match(RE_LITERAL) ?? [];
    for (const re of regexLiterals) {
      expect(re).not.toMatch(/[\uAC00-\uD7A3]/);
    }
    expect(detectRegisteredApp('메모장 열려 있어?')).toBe(NOTEPAD);
    expect(detectRegisteredApp('계 산 기 좀')).toBe('windows.calculator');
    expect(detectRegisteredApp('pm2000 실행됐어?')).toBeNull();
    // 두 앱이 동시에 걸리면 고르지 않는다.
    expect(detectRegisteredApp('메모장이랑 계산기')).toBeNull();
  });

  it('기본은 조회다 — 활성화 지시어가 있을 때만 창을 앞으로 가져온다 (§19)', () => {
    expect(selectToolInvocationForRequest('메모장 열려 있는지 확인해 줘', ctx())).toEqual({
      tool: AI_TOOL_NAMES.FIND_APPLICATION,
      args: { appId: NOTEPAD },
    });
    expect(selectToolInvocationForRequest('메모장 창을 앞으로 가져와 줘', ctx())).toEqual({
      tool: AI_TOOL_NAMES.ACTIVATE_WINDOW,
      args: { appId: NOTEPAD },
    });
    // 자격이 없으면 아무 tool 도 고르지 않는다.
    expect(
      selectToolInvocationForRequest('메모장 창을 앞으로 가져와 줘', ctx({ localAgentStatus: 'none', localDeviceId: undefined })),
    ).toBeNull();
  });
});
