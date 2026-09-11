/**
 * WO-O4O-COMPUTER-USE-V0 §46 — 자동 테스트 21항목
 *
 * 등재 앱 창 안 **제한된 상호작용**의 왕복 배관과 안전 경계를 고정한다. 실제 PowerShell ·
 * SendInput · 화면 캡처는 부르지 않는다 — 그것은 §36 Windows local smoke 와 §37 production
 * smoke 가 담당한다.
 *
 * 특히 고정하려는 것 (§49):
 *   - 대상은 등재 appId 뿐이다. HWND · 임의 창 제목 · 전체 desktop 은 표현할 수 없다.
 *   - 좌표는 정규화 [0,1] 만, 텍스트는 1~500자 · 제어문자 없음 · credential/shell 성격 금지,
 *     키는 ENTER/TAB/ESC 뿐 — 서버와 agent 가 **같은 규칙**을 두 번 검사한다.
 *   - target lost · out-of-bounds · 사용자 처리 창 은 코드로 정규화되어 실행되지 않는다.
 *   - shell · 임의 process · 파일 접근 · credential 입력 경로는 **존재하지 않는다**.
 *   - 스크린샷은 서버 어디에도 저장되지 않는다(이미지 필드 자체가 없다).
 *   - 창 축 · 브라우저 축 · pairing/LNA · replay 보호 회귀 0.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  APP_TARGET_ACTIONS,
  COMPUTER_ARGS_ACTIONS,
  COMPUTER_TARGET_ACTIONS,
  DATA_TARGET_ACTIONS,
  LOCAL_AGENT_ACTIONS,
  LOCAL_AGENT_ACTION_ALLOWLIST,
  LOCAL_AGENT_ERROR,
  SAFE_COMPUTER_INFO_BOOLEAN_FIELDS,
  SAFE_COMPUTER_INFO_NUMBER_FIELDS,
  SAFE_COMPUTER_INFO_STRING_FIELDS,
  SITE_TARGET_ACTIONS,
  composeAppAction,
  composeComputerAction,
  isAllowedLocalAction,
  pickSafeComputerInfo,
  pickSafeResultData,
  validateLocalCommandArgs,
} from '../services/local-agent/local-agent-protocol.js';
import {
  COMPUTER_ALLOWED_KEYS,
  COMPUTER_TEXT_MAX_LENGTH,
  MAX_COMPUTER_ACTIONS_PER_REQUEST,
  textDenyReason,
  validateClickArgs,
  validateKeyArgs,
  validateTextArgs,
} from '../services/local-agent/computer-use-contract.js';
import { WINDOWS_APP_IDS } from '../services/local-agent/windows-app-registry.js';
import {
  AiCapability,
  AI_TOOL_NAMES,
  AI_TOOL_REGISTRY,
  assertToolAllowed,
  deriveAiCapabilities,
  findToolDefinition,
  resolveAvailableTools,
  validateToolArguments,
  type VerifiedToolContext,
} from '../services/ai-tools/ai-tool-contract.js';
import {
  asksForClick,
  asksForScreenInspect,
  asksForTyping,
  computerRequestGap,
  detectAllowedKey,
  executeAiTool,
  extractTypeText,
  renderToolContext,
  selectToolInvocationForRequest,
} from '../services/ai-tools/ai-tool-router.js';
import { buildHomeChatSystemPrompt } from '../services/ai-prompts/homeChat.js';
import {
  awaitCommandResult,
  claimPendingCommands,
  issueCommand,
  submitCommandResult,
} from '../services/local-agent/local-agent-service.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const AGENT_SRC = join(REPO_ROOT, 'tools', 'o4o-local-agent', 'src');
const readAgent = (f: string) => readFileSync(join(AGENT_SRC, f), 'utf8');
const readServer = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8');
/** 주석을 뺀 코드만 (블록 주석 · `//` · `#` · `*` 줄 · 줄 끝 `//`). */
const codeOnly = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*(?:\/\/|#|\*)[^\n]*$/gm, '')
    .replace(/(^|[^:])\/\/[^\n]*$/gm, '$1');

const NOTEPAD = 'windows.notepad';
const CALC = 'windows.calculator';

const ctx = (over: Partial<VerifiedToolContext> = {}): VerifiedToolContext => ({
  userId: 'user-1',
  workspace: 'home',
  localAgentStatus: 'connected',
  localDeviceId: 'dev-1',
  ...over,
});

type AgentOutcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };

/** n 번째 명령이 발행될 때까지 기다렸다가 agent 처럼 답한다. */
async function respondAsAgent(db: LocalAgentDb, index: number, outcome: AgentOutcome) {
  for (let i = 0; i < 400 && db.commands.length <= index; i += 1) {
    await new Promise((r) => setTimeout(r, 5));
  }
  const cmd = db.commands[index];
  if (!cmd) throw new Error(`command #${index} 가 발행되지 않았다`);
  await submitCommandResult(db.dataSource, cmd.device_id, {
    commandId: cmd.command_id,
    status: outcome.status,
    errorCode: outcome.errorCode,
    data: outcome.data,
  } as any);
  return cmd;
}

const ACTIVATED = (): AgentOutcome => ({
  status: 'success',
  data: { appId: NOTEPAD, found: true, windowCount: 1, activated: true, state: 'foreground' },
});

/**
 * 상호작용 tool 은 activate_window → computer.* 두 명령을 낸다(§30 inspect→1 interaction).
 * inspect 는 한 명령뿐이다.
 */
async function runComputerTool(
  db: LocalAgentDb,
  tool: string,
  args: Record<string, unknown>,
  outcomes: AgentOutcome[],
) {
  const responders = outcomes.map((o, i) => respondAsAgent(db, i, o));
  const [result] = await Promise.all([executeAiTool(db.dataSource, tool, args, ctx()), ...responders]);
  return { result, cmds: db.commands };
}

// ─── 1~2. inspect ────────────────────────────────────────────────────────────

describe('1~2. 대상 창 검사 (§10·§14)', () => {
  it('1. 등재 대상 inspect — targetId 만 실려 가고, 되돌아오는 것은 크기와 상태뿐이다', async () => {
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    const { result, cmds } = await runComputerTool(db, AI_TOOL_NAMES.COMPUTER_INSPECT, { targetId: NOTEPAD }, [
      {
        status: 'success',
        data: {
          targetId: NOTEPAD,
          displayName: '가짜 이름',
          found: true,
          windowCount: 1,
          foreground: true,
          clientWidth: 800,
          clientHeight: 600,
          snapshotAvailable: true,
          snapshotWidth: 800,
          snapshotHeight: 600,
          capturedAt: '2026-09-11T00:00:00.000Z',
          // agent 가 (버그로) 실어 보내도 서버 화이트리스트가 버려야 하는 것들
          image: 'iVBORw0KGgo=',
          title: '제목 없음 - 메모장',
          hwnd: 123456,
          pid: 4242,
        },
      },
    ]);
    expect(cmds).toHaveLength(1);
    expect(cmds[0].action).toBe(composeComputerAction(LOCAL_AGENT_ACTIONS.COMPUTER_INSPECT, NOTEPAD));
    expect(cmds[0].result_data).toBeNull(); // 결과 회수 후 지워진다

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      available: true,
      targetId: NOTEPAD,
      displayName: '메모장',
      found: true,
      foreground: true,
      clientWidth: 800,
      clientHeight: 600,
      snapshotAvailable: true,
      capturedAt: '2026-09-11T00:00:00.000Z',
    });
    const text = JSON.stringify(result) + (renderToolContext(result) ?? '');
    for (const leaked of ['가짜 이름', 'iVBOR', '제목 없음', '123456', '4242', 'image', 'hwnd']) {
      expect(text).not.toContain(leaked);
    }
    expect(renderToolContext(result)).toContain('## 화면 조작 상태');
    expect(renderToolContext(result)).toContain('800×600');
  });

  it('2. 미등재 대상은 인자 검증에서 끝난다 — 명령이 발행되지 않는다', async () => {
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    for (const targetId of ['windows.cmd', 'windows.explorer', 'notepad.exe', '', 123, null, 'C:\\Windows\\notepad.exe']) {
      const r = await executeAiTool(db.dataSource, AI_TOOL_NAMES.COMPUTER_INSPECT, { targetId }, ctx());
      expect(r).toMatchObject({ ok: false, reason: 'INVALID_ARGUMENTS' });
    }
    // HWND 를 직접 넣을 칸도 없다(§8).
    expect(
      validateToolArguments({ targetId: NOTEPAD, hwnd: 123 }, findToolDefinition(AI_TOOL_NAMES.COMPUTER_INSPECT)!).ok,
    ).toBe(false);
    expect(db.commands).toHaveLength(0);
    // allowlist 에도 없다.
    expect(isAllowedLocalAction('local.computer.inspect#windows.cmd')).toBe(false);
    expect(isAllowedLocalAction('local.computer.inspect')).toBe(false);
    expect(isAllowedLocalAction('local.computer.inspect#123456')).toBe(false);
  });
});

// ─── 3~4. click ──────────────────────────────────────────────────────────────

describe('3~4. 클릭 (§15·§16·§22)', () => {
  it('3. 범위 안 클릭 — 활성화 1회 → 클릭 1회, 좌표는 정규화 값 그대로 실려 간다', async () => {
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    const { result, cmds } = await runComputerTool(
      db,
      AI_TOOL_NAMES.COMPUTER_CLICK,
      { targetId: NOTEPAD, x: 0.5, y: 0.25 },
      [
        ACTIVATED(),
        {
          status: 'success',
          data: { targetId: NOTEPAD, found: true, windowCount: 1, foreground: true, clicked: true, verified: true, clientWidth: 800, clientHeight: 600 },
        },
      ],
    );
    expect(cmds).toHaveLength(2);
    expect(cmds[0].action).toBe(composeAppAction(LOCAL_AGENT_ACTIONS.ACTIVATE_WINDOW, NOTEPAD));
    expect(cmds[1].action).toBe(composeComputerAction(LOCAL_AGENT_ACTIONS.COMPUTER_CLICK, NOTEPAD));
    expect(result.data).toMatchObject({ available: true, clicked: true, verified: true, targetId: NOTEPAD });
    expect(renderToolContext(result)).toContain('클릭했습니다');
  });

  it('3-b. agent 가 인자를 집어가면 DB 의 인자는 같은 문장에서 지워진다 (§12·§43)', async () => {
    const db = makeDb();
    const agent = await connected(db);
    const issued = await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: agent.deviceId,
      action: composeComputerAction(LOCAL_AGENT_ACTIONS.COMPUTER_CLICK, NOTEPAD),
      toolName: AI_TOOL_NAMES.COMPUTER_CLICK,
      args: { x: 0.5, y: 0.25 },
    });
    expect(issued.ok).toBe(true);
    if (issued.ok === false) return;
    const claimed = await claimPendingCommands(db.dataSource, agent.deviceId);
    expect(claimed).toHaveLength(1);
    expect(claimed[0].args).toEqual({ x: 0.5, y: 0.25 });
    expect(db.commands[0].result_data).toBeNull();
    // 두 번째 claim 은 아무것도 주지 않는다 — replay 불가(§18 회귀).
    expect(await claimPendingCommands(db.dataSource, agent.deviceId)).toHaveLength(0);
  });

  it('4. 범위 밖 · 픽셀 · 음수 · NaN · 추가 키 는 서버에서 거절되고 명령이 발행되지 않는다', async () => {
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    const bad: unknown[] = [
      { targetId: NOTEPAD, x: 1.01, y: 0.5 },
      { targetId: NOTEPAD, x: -0.01, y: 0.5 },
      { targetId: NOTEPAD, x: 400, y: 300 },
      { targetId: NOTEPAD, x: Number.NaN, y: 0.5 },
      { targetId: NOTEPAD, x: Number.POSITIVE_INFINITY, y: 0.5 },
      { targetId: NOTEPAD, x: '0.5', y: 0.5 },
      { targetId: NOTEPAD, x: 0.5 },
      { targetId: NOTEPAD, x: 0.5, y: 0.5, button: 'right' },
      { targetId: NOTEPAD, x: 0.5, y: 0.5, double: true },
      { targetId: NOTEPAD, x: 0.5, y: 0.5, hwnd: 1 },
    ];
    for (const args of bad) {
      const r = await executeAiTool(db.dataSource, AI_TOOL_NAMES.COMPUTER_CLICK, args, ctx());
      expect(r).toMatchObject({ ok: false, reason: 'INVALID_ARGUMENTS' });
    }
    expect(db.commands).toHaveLength(0);
    // 경계값은 닫힌 구간이다.
    expect(validateClickArgs({ x: 0, y: 1 })).toEqual({ ok: true, args: { x: 0, y: 1 } });
    // agent 가 OUT_OF_BOUNDS 로 답하면 코드 그대로 정규화된다.
    const { result } = await runComputerTool(db, AI_TOOL_NAMES.COMPUTER_CLICK, { targetId: NOTEPAD, x: 1, y: 1 }, [
      ACTIVATED(),
      { status: 'failed', errorCode: LOCAL_AGENT_ERROR.COMPUTER_OUT_OF_BOUNDS, data: { targetId: NOTEPAD, found: true, clientWidth: 0, clientHeight: 0 } },
    ]);
    expect(result.data).toMatchObject({ available: false, errorCode: LOCAL_AGENT_ERROR.COMPUTER_OUT_OF_BOUNDS });
    expect(renderToolContext(result)).toContain('창 영역 밖');
  });
});

// ─── 5~6. type_text ──────────────────────────────────────────────────────────

describe('5~6. 텍스트 입력 (§17·§18·§27)', () => {
  it('5. 정상 텍스트 — 활성화 후 1건 입력, 텍스트는 명령 인자로만 가고 로그·결과에는 없다', async () => {
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    const { result, cmds } = await runComputerTool(
      db,
      AI_TOOL_NAMES.COMPUTER_TYPE_TEXT,
      { targetId: NOTEPAD, text: 'O4O computer use test' },
      [
        ACTIVATED(),
        { status: 'success', data: { targetId: NOTEPAD, found: true, typed: true, typedLength: 21, verified: true, text: 'O4O computer use test' } },
      ],
    );
    expect(cmds).toHaveLength(2);
    expect(cmds[1].action).toBe(composeComputerAction(LOCAL_AGENT_ACTIONS.COMPUTER_TYPE_TEXT, NOTEPAD));
    expect(result.data).toMatchObject({ available: true, typed: true, typedLength: 21 });
    // 결과 · 컨텍스트 어디에도 입력 전문이 없다(§43 "typed text 전문 기록 금지").
    const text = JSON.stringify(result) + (renderToolContext(result) ?? '');
    expect(text).not.toContain('computer use test');
    expect(renderToolContext(result)).toContain('21자');
    // 발행 시 실렸던 인자는 회수 후 남지 않는다.
    expect(cmds[1].result_data).toBeNull();
  });

  it('6. 너무 긴 텍스트 · 빈 텍스트 · 제어문자 · 줄바꿈 은 거절된다', async () => {
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    const bad: unknown[] = [
      { targetId: NOTEPAD, text: 'a'.repeat(COMPUTER_TEXT_MAX_LENGTH + 1) },
      { targetId: NOTEPAD, text: '' },
      { targetId: NOTEPAD, text: '   ' },
      { targetId: NOTEPAD, text: 'line1\nline2' },
      { targetId: NOTEPAD, text: 'tab\there' },
      { targetId: NOTEPAD, text: 'esc\u001b[2J' },
      { targetId: NOTEPAD, text: 123 },
      { targetId: NOTEPAD, text: ['a'] },
      { targetId: NOTEPAD },
      { targetId: NOTEPAD, text: 'ok', delayMs: 10 },
    ];
    for (const args of bad) {
      const r = await executeAiTool(db.dataSource, AI_TOOL_NAMES.COMPUTER_TYPE_TEXT, args, ctx());
      expect(r).toMatchObject({ ok: false, reason: 'INVALID_ARGUMENTS' });
    }
    expect(db.commands).toHaveLength(0);
    expect(validateTextArgs({ text: 'a'.repeat(COMPUTER_TEXT_MAX_LENGTH) }).ok).toBe(true);
    expect(validateTextArgs({ text: 'a'.repeat(COMPUTER_TEXT_MAX_LENGTH + 1) })).toMatchObject({ ok: false, reason: 'TOO_LONG' });
    expect(validateTextArgs({ text: 'x\ny' })).toMatchObject({ ok: false, reason: 'CONTROL_CHAR' });
    expect(validateTextArgs({ text: '' })).toMatchObject({ ok: false, reason: 'EMPTY' });
    // 한글 · 이모지 · 공백 섞인 보통 문장은 통과한다.
    expect(textDenyReason('테스트 입니다. Hello 123 ✓')).toBeNull();
  });
});

// ─── 7~8. key ────────────────────────────────────────────────────────────────

describe('7~8. 제한된 특수키 (§19·§20)', () => {
  it('7. ENTER / TAB / ESC 만 허용되고 활성화 후 1회 눌린다', async () => {
    expect([...COMPUTER_ALLOWED_KEYS]).toEqual(['ENTER', 'TAB', 'ESC']);
    for (const key of COMPUTER_ALLOWED_KEYS) {
      const db = makeDb();
      await pairAndRegister(db);
      await connected(db);
      const { result, cmds } = await runComputerTool(db, AI_TOOL_NAMES.COMPUTER_KEY, { targetId: NOTEPAD, key }, [
        ACTIVATED(),
        { status: 'success', data: { targetId: NOTEPAD, found: true, keyPressed: true, key, verified: true } },
      ]);
      expect(cmds).toHaveLength(2);
      expect(cmds[1].action).toBe(composeComputerAction(LOCAL_AGENT_ACTIONS.COMPUTER_KEY, NOTEPAD));
      expect(result.data).toMatchObject({ available: true, keyPressed: true, key });
      expect(renderToolContext(result)).toContain(`${key} 키를 눌렀습니다`);
    }
  });

  it('8. 임의 키 · 조합키 · 소문자 · 핫키 문자열 은 거절되고 명령이 발행되지 않는다', async () => {
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    const bad = [
      'F4', 'ALT+F4', 'CTRL+ALT+DEL', 'WIN', 'WIN+R', 'CTRL+S', 'CTRL+V', 'DELETE', 'BACKSPACE',
      'enter', 'Enter', ' ENTER', 'ENTER ', 'RETURN', 'ESCAPE', '\r', '\n', '{ENTER}', '^s', '%{F4}', '', 13,
    ];
    for (const key of bad) {
      const r = await executeAiTool(db.dataSource, AI_TOOL_NAMES.COMPUTER_KEY, { targetId: NOTEPAD, key }, ctx());
      expect(r).toMatchObject({ ok: false, reason: 'INVALID_ARGUMENTS' });
      expect(validateKeyArgs({ key }).ok).toBe(false);
    }
    // 두 키를 한 번에 / 반복 횟수 도 표현 불가.
    for (const args of [
      { targetId: NOTEPAD, key: 'ENTER', repeat: 3 },
      { targetId: NOTEPAD, key: 'ENTER', modifiers: ['CTRL'] },
      { targetId: NOTEPAD, keys: ['ENTER', 'TAB'] },
    ]) {
      const r = await executeAiTool(db.dataSource, AI_TOOL_NAMES.COMPUTER_KEY, args, ctx());
      expect(r).toMatchObject({ ok: false, reason: 'INVALID_ARGUMENTS' });
    }
    expect(db.commands).toHaveLength(0);
    // 자연어에서도 허용키 외에는 골라지지 않는다.
    expect(detectAllowedKey('메모장에서 엔터 눌러')).toBe('ENTER');
    expect(detectAllowedKey('메모장에서 탭키 눌러')).toBe('TAB');
    expect(detectAllowedKey('메모장에서 이스케이프 눌러')).toBe('ESC');
    expect(detectAllowedKey('메모장에서 F4 눌러')).toBeNull();
    expect(detectAllowedKey('메모장에서 alt+f4 눌러')).toBeNull();
    expect(detectAllowedKey('메모장에서 ctrl+s 눌러')).toBeNull();
    expect(detectAllowedKey('메모장에서 엔터 누르고 탭 눌러')).toBeNull(); // 둘이면 고르지 않는다(§31)
  });
});

// ─── 9. target lost ──────────────────────────────────────────────────────────

describe('9. target lost 보호 (§9·§45)', () => {
  it('9. 활성화 실패 → 상호작용 명령이 발행되지 않는다; agent 가 TARGET_LOST 로 답하면 그대로 정규화된다', async () => {
    // (a) 활성화 단계가 실패하면 두 번째 명령이 없다.
    {
      const db = makeDb();
      await pairAndRegister(db);
      await connected(db);
      const { result, cmds } = await runComputerTool(db, AI_TOOL_NAMES.COMPUTER_TYPE_TEXT, { targetId: NOTEPAD, text: 'x' }, [
        { status: 'failed', errorCode: LOCAL_AGENT_ERROR.WINDOW_ACTIVATION_FAILED, data: { appId: NOTEPAD, found: true, windowCount: 1 } },
      ]);
      await new Promise((r) => setTimeout(r, 30));
      expect(cmds).toHaveLength(1);
      expect(result.data).toMatchObject({ available: false, errorCode: LOCAL_AGENT_ERROR.WINDOW_ACTIVATION_FAILED });
    }
    // (b) 실행 직전 foreground 가 바뀌었다고 agent 가 답하면 TARGET_LOST.
    {
      const db = makeDb();
      await pairAndRegister(db);
      await connected(db);
      const { result } = await runComputerTool(db, AI_TOOL_NAMES.COMPUTER_TYPE_TEXT, { targetId: NOTEPAD, text: 'x' }, [
        ACTIVATED(),
        {
          status: 'failed',
          errorCode: LOCAL_AGENT_ERROR.COMPUTER_TARGET_LOST,
          data: { targetId: NOTEPAD, found: true, foreground: false, foregroundTitle: '다른 프로그램', foregroundHwnd: 99 },
        },
      ]);
      expect(result.data).toMatchObject({ available: false, errorCode: LOCAL_AGENT_ERROR.COMPUTER_TARGET_LOST, foreground: false });
      const text = JSON.stringify(result) + (renderToolContext(result) ?? '');
      expect(text).not.toContain('다른 프로그램');
      expect(text).not.toContain('99');
      expect(renderToolContext(result)).toContain('앞에 있지 않아');
    }
    // (c) 미실행 · 여러 창 도 코드로 정규화된다.
    {
      const db = makeDb();
      await pairAndRegister(db);
      await connected(db);
      const { result } = await runComputerTool(db, AI_TOOL_NAMES.COMPUTER_INSPECT, { targetId: NOTEPAD }, [
        { status: 'failed', errorCode: LOCAL_AGENT_ERROR.COMPUTER_TARGET_NOT_FOUND, data: { targetId: NOTEPAD, found: false, windowCount: 0 } },
      ]);
      expect(result.data).toMatchObject({ available: false, errorCode: LOCAL_AGENT_ERROR.COMPUTER_TARGET_NOT_FOUND });
      expect(renderToolContext(result)).toContain('실행');
    }
    // (d) agent 쪽 스크립트도 실행 직전 foreground 검사를 한다.
    const input = codeOnly(readAgent('windows-computer-input.ps1'));
    expect(input).toContain("'TARGET_LOST'");
    expect(input).toContain('GetForegroundWindow');
    expect(input.indexOf("'TARGET_LOST'")).toBeLessThan(input.indexOf('::LeftClick()'));
  });
});

// ─── 10~13. 없는 것은 없다 ───────────────────────────────────────────────────

describe('10~13. shell · process · file · credential 경로 부재 (§5·§33·§34·§39)', () => {
  const agentJs = ['handlers.mjs', 'index.mjs', 'windows-window-control.mjs', 'computer-use-limits.mjs', 'local-server.mjs'];
  const newPs1 = ['windows-computer-inspect.ps1', 'windows-computer-input.ps1'];

  it('10. shell 은 불가능하다 — 텍스트 인자로도 스크립트로도', () => {
    // (a) 텍스트 인자에 shell 조립 성격 문자열은 서버 · agent 양쪽에서 거절된다.
    for (const t of [
      'cmd /c del *.*',
      'powershell -Command Get-Process',
      'a && b',
      'a || b',
      'dir | findstr x',
      'x; rm -rf /',
      '$(whoami)',
      '`whoami`',
      'Invoke-WebRequest x',
      'iex (x)',
      'curl http://x',
      'wget http://x',
      'del /q file',
      'rm -rf /',
      'shutdown /s',
      'taskkill /f /im x',
    ]) {
      expect(textDenyReason(t)).toBe('DENIED_CONTENT');
    }
    // (b) 인자에 command · script · shell 칸이 없다.
    for (const tool of [AI_TOOL_NAMES.COMPUTER_CLICK, AI_TOOL_NAMES.COMPUTER_TYPE_TEXT, AI_TOOL_NAMES.COMPUTER_KEY, AI_TOOL_NAMES.COMPUTER_INSPECT]) {
      const def = findToolDefinition(tool)!;
      for (const extra of [{ command: 'x' }, { script: 'x' }, { shell: true }, { exec: 'x' }]) {
        expect(validateToolArguments({ targetId: NOTEPAD, x: 0.5, y: 0.5, text: 'a', key: 'ENTER', ...extra }, def).ok).toBe(false);
      }
    }
    // (c) 새 스크립트 두 개는 -Command · Invoke-Expression · 외부 실행 없이 Win32 호출만 한다.
    for (const f of newPs1) {
      const code = codeOnly(readAgent(f));
      for (const forbidden of ['Invoke-', 'iex', '-Command', '-EncodedCommand', 'Start-Process', 'Start-Job', 'cmd.exe', '&amp;', '& $', '& "']) {
        expect(code).not.toContain(forbidden);
      }
      expect(code).not.toContain('$args');
      expect(code).not.toContain('param(');
    }
    // (d) JS 쪽 execFile 지점은 여전히 하나이고 스크립트 5개 · argv 상수다.
    const importers = agentJs.filter((f) => codeOnly(readAgent(f)).includes('child_process'));
    expect(importers).toEqual(['windows-window-control.mjs']);
    const control = codeOnly(readAgent('windows-window-control.mjs'));
    expect(control).not.toContain('shell: true');
    expect(control).not.toMatch(/[^A-Za-z]exec[(]/);
    expect(control).not.toMatch(/[^A-Za-z]spawn[(]/);
    // (e) 서버 allowlist 에 shell 계열 이름이 없다.
    for (const a of ['local.exec_shell', 'local.computer.run', 'local.computer.shell', 'local.computer.hotkey', 'local.computer.type_text']) {
      expect(isAllowedLocalAction(a)).toBe(false);
    }
  });

  it('11. 임의 process 시작은 불가능하다 (§33 start_process 금지)', () => {
    for (const a of ['local.start_process', 'local.computer.start', 'local.computer.launch', 'local.computer.open#windows.notepad']) {
      expect(isAllowedLocalAction(a)).toBe(false);
    }
    expect(AI_TOOL_REGISTRY.map((t) => t.name).filter((n) => /start|launch|run|exec|spawn/i.test(n))).toEqual([]);
    for (const f of [...agentJs, ...newPs1]) {
      const code = codeOnly(readAgent(f));
      for (const forbidden of ['Start-Process', 'ShellExecute', 'CreateProcess', 'Process.Start', 'WinExec']) {
        expect(code).not.toContain(forbidden);
      }
    }
    // 종료도 없다(§39 "프로그램 종료"). limits 모듈은 금지어 목록이라 'taskkill' 문자열을 가진다 — 제외.
    for (const f of [...agentJs, ...newPs1].filter((n) => n !== 'computer-use-limits.mjs')) {
      const code = codeOnly(readAgent(f));
      for (const forbidden of ['Stop-Process', 'TerminateProcess', 'CloseMainWindow', 'PostMessage', 'SendMessage', 'DestroyWindow', 'WM_CLOSE', 'taskkill']) {
        expect(code).not.toContain(forbidden);
      }
    }
  });

  it('12. 파일 접근은 불가능하다 — 캡처는 파일로 가지 않는다 (§5·§12·§15)', () => {
    for (const f of ['handlers.mjs', 'windows-window-control.mjs', 'computer-use-limits.mjs']) {
      expect(readAgent(f)).not.toContain('node:fs');
      expect(readAgent(f)).not.toMatch(/from\s+'fs'/);
    }
    // 순수 함수 모듈은 import 자체가 없다.
    expect(codeOnly(readAgent('computer-use-limits.mjs'))).not.toMatch(/\bimport\b/);
    for (const f of newPs1) {
      const code = codeOnly(readAgent(f));
      for (const forbidden of [
        'Get-Content', 'Set-Content', 'Remove-Item', 'Out-File', 'Export-', 'Add-Content', 'New-Item',
        '.Save(', 'ImageFormat', 'Clipboard', 'Get-Clipboard', 'Set-Clipboard', 'ToBase64String', 'MemoryStream', 'FileStream',
      ]) {
        expect(code).not.toContain(forbidden);
      }
    }
    // inspect 스크립트는 비트맵을 만들면 반드시 Dispose 한다.
    const inspect = codeOnly(readAgent('windows-computer-inspect.ps1'));
    expect(inspect).toContain('$bitmap.Dispose()');
    expect(inspect).toContain('CopyFromScreen');
    // inspect tool 의 인자에 path · format 칸이 없다.
    const def = findToolDefinition(AI_TOOL_NAMES.COMPUTER_INSPECT)!;
    expect(validateToolArguments({ targetId: NOTEPAD, path: 'C:\\x.png' }, def).ok).toBe(false);
    expect(validateToolArguments({ targetId: NOTEPAD, save: true }, def).ok).toBe(false);
  });

  it('13. credential 입력 경로가 없다 — 텍스트 금지어 · 로그인 요청 분기 · 사용자 처리 창 정지 (§3·§17·§34)', () => {
    // (a) credential 성격 텍스트는 서버에서 거절된다 (agent 도 같은 규칙 — 20번에서 대조).
    for (const t of [
      'my password is x', 'passwd', 'pwd 1234', 'OTP 123456', 'credential', 'the secret', 'api_key=abc', 'api-key abc', 'token abc',
      '비밀번호 1234', '비번 1234', '암호 1234', '인증번호 123456', '공동인증서', '공인인증서', '보안카드 12',
      '비 밀 번 호',
    ]) {
      expect(textDenyReason(t)).toBe('DENIED_CONTENT');
    }
    // (b) 로그인 요청이 있으면 화면 조작 tool 을 고르지 않는다 — 가장 강한 문장에서도.
    for (const m of ['메모장에 로그인해줘', '메모장에 "1234" 라고 써서 로그인해', '메모장 login 하고 비밀번호 입력해']) {
      const sel = selectToolInvocationForRequest(m, ctx());
      expect(sel?.tool).not.toBe(AI_TOOL_NAMES.COMPUTER_TYPE_TEXT);
      expect(sel?.tool).not.toBe(AI_TOOL_NAMES.COMPUTER_KEY);
      expect(sel?.tool).not.toBe(AI_TOOL_NAMES.COMPUTER_CLICK);
    }
    // 금지 내용을 타이핑하라는 요청은 tool 없이 gap 사유만 남는다.
    expect(selectToolInvocationForRequest('메모장에 "비밀번호 1234" 라고 써줘', ctx())).toBeNull();
    expect(computerRequestGap('메모장에 "비밀번호 1234" 라고 써줘')).toBe('TEXT_DENIED');
    expect(computerRequestGap('메모장에 로그인해줘')).toBe('LOGIN_REQUEST');
    expect(computerRequestGap('메모장에 써줘')).toBe('TEXT_MISSING');
    expect(computerRequestGap('메모장 열려 있어?')).toBeNull();
    // (c) 프롬프트에 사유가 실리고, "대신 입력" 을 약속하지 않는다.
    const denied = buildHomeChatSystemPrompt({ ...baseFacts(), computerRequestGap: 'TEXT_DENIED' } as any);
    expect(denied).toContain('비밀번호');
    expect(denied).toMatch(/입력하지 않|입력할 수 없|대신 입력하지/);
    const login = buildHomeChatSystemPrompt({ ...baseFacts(), computerRequestGap: 'LOGIN_REQUEST' } as any);
    expect(login).toContain('직접');
    // (d) tool · capability 이름에 password/login/credential 이 없다.
    for (const n of AI_TOOL_REGISTRY.map((t) => t.name)) expect(n).not.toMatch(/password|login|credential|otp|fill|submit/i);
    for (const c of Object.values(AiCapability)) expect(c).not.toMatch(/PASSWORD|LOGIN|CREDENTIAL|OTP/);
    // (e) agent 는 로그인 · 파일 대화상자 창 제목이면 실행하지 않는다 — 표식이 코드에 있고 판정만 나간다.
    const limits = readAgent('computer-use-limits.mjs');
    for (const marker of ["'login'", "'sign in'", "'passw'", "'otp'", "'로그인'", "'비밀번호'", "'save as'", "'다른 이름으로 저장'"]) {
      expect(limits).toContain(marker);
    }
    const handlers = codeOnly(readAgent('handlers.mjs'));
    expect(handlers).toContain('isUserActionTitle(target.window.title)');
    expect(handlers.indexOf('isUserActionTitle(target.window.title)')).toBeLessThan(handlers.indexOf('deliverComputerInput('));
    // (f) 브라우저 profile · cookie · DPAPI 문자열은 agent 어디에도 없다(§21 clipboard 포함).
    for (const f of [...agentJs, ...newPs1]) {
      const code = codeOnly(readAgent(f));
      for (const forbidden of ['Cookies', 'Login Data', 'DPAPI', 'CryptUnprotectData', 'Clipboard', 'CredRead', 'CredEnumerate', 'Credential Manager']) {
        expect(code).not.toContain(forbidden);
      }
    }
  });
});

function baseFacts() {
  return {
    serviceLabel: 'O4O',
    workspace: 'home',
    capabilities: [],
    localAgentStatus: 'connected',
  };
}

// ─── 14. popup ───────────────────────────────────────────────────────────────

describe('14. 예상 밖 팝업 · 사용자 처리 창 (§41·§42)', () => {
  it('14. USER_ACTION_REQUIRED 는 실행 없이 멈추고, 프롬프트는 OK/Yes 를 대신 누르지 말라고 한다', async () => {
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    const { result, cmds } = await runComputerTool(db, AI_TOOL_NAMES.COMPUTER_KEY, { targetId: NOTEPAD, key: 'ENTER' }, [
      ACTIVATED(),
      {
        status: 'failed',
        errorCode: LOCAL_AGENT_ERROR.COMPUTER_USER_ACTION_REQUIRED,
        data: { targetId: NOTEPAD, found: true, userActionRequired: true, title: '다른 이름으로 저장' },
      },
    ]);
    expect(cmds).toHaveLength(2); // 재시도 · 추가 명령 없음(§30·§32)
    expect(result.data).toMatchObject({ available: false, errorCode: LOCAL_AGENT_ERROR.COMPUTER_USER_ACTION_REQUIRED, userActionRequired: true });
    const block = renderToolContext(result) ?? '';
    expect(block).toContain('직접 처리');
    expect(block).toContain('대신 누르지 않습니다');
    expect(block).not.toContain('다른 이름으로 저장');
    // agent 는 같은 프로세스의 다른 창(대화상자)이 앞에 있으면 USER_ACTION_REQUIRED 로 분류한다.
    const handlers = codeOnly(readAgent('handlers.mjs'));
    expect(handlers).toContain('outcome.foregroundPid === outcome.targetPid');
    expect(handlers).toContain("COMPUTER_USE_USER_ACTION_REQUIRED");
  });
});

// ─── 15. screenshot persistence ──────────────────────────────────────────────

describe('15. 스크린샷 저장 0 (§11·§12·§43·§44)', () => {
  it('15. 이미지 필드는 서버 화이트리스트에 없고, 서비스 · 마이그레이션 어디에도 저장 경로가 없다', () => {
    // (a) 화이트리스트 필드에 image/base64/png/title 이 없다.
    const all = [...SAFE_COMPUTER_INFO_STRING_FIELDS, ...SAFE_COMPUTER_INFO_BOOLEAN_FIELDS, ...SAFE_COMPUTER_INFO_NUMBER_FIELDS];
    for (const f of all) expect(f).not.toMatch(/image|png|jpeg|base64|bytes|title|hwnd|pid|path|text$/i);
    expect(pickSafeComputerInfo({ image: 'x', png: 'y', title: 'z', hwnd: 1, text: 'typed', foreground: true })).toEqual({ foreground: true });
    // targetId 는 등재 값만 통과한다.
    expect(pickSafeComputerInfo({ targetId: 'windows.cmd' })).toEqual({});
    expect(pickSafeComputerInfo({ targetId: NOTEPAD })).toEqual({ targetId: NOTEPAD });
    // 문자열 필드는 형식이 고정돼 있다 — capturedAt 은 ISO, key 는 허용키.
    expect(pickSafeComputerInfo({ capturedAt: 'C:\\Users\\x' })).toEqual({});
    expect(pickSafeComputerInfo({ key: 'F4' })).toEqual({});
    // dispatch 도 computer action 은 computer 화이트리스트를 탄다.
    expect(pickSafeResultData(composeComputerAction(LOCAL_AGENT_ACTIONS.COMPUTER_INSPECT, NOTEPAD), { image: 'x', snapshotWidth: 10 })).toEqual({ snapshotWidth: 10 });
    // (b) 서버 코드에 이미지 저장 · 파일 쓰기가 없다.
    for (const f of [
      'services/local-agent/local-agent-service.ts',
      'services/local-agent/local-agent-protocol.ts',
      'services/local-agent/computer-use-contract.ts',
      'services/ai-tools/ai-tool-router.ts',
    ]) {
      const code = codeOnly(readServer(f));
      for (const forbidden of ['writeFile', 'createWriteStream', 'sharp(', "toString('base64')", 'base64,', 'image/png', 'Storage(']) {
        expect(code).not.toContain(forbidden);
      }
    }
    // (c) 새 테이블 · 마이그레이션 0 (§44).
    const migrationsDir = join(__dirname, '..', 'database', 'migrations');
    const files = readdirSync(migrationsDir);
    // Local Agent 축의 migration 은 V0 의 한 파일뿐이다 — 이번 WO 는 0 (§44).
    expect(files.filter((f) => /computer|screenshot|screen[-_]?capture|local[-_]?agent/i.test(f))).toEqual(['20270402000000-CreateLocalAgentTables.ts']);
    const service = readServer('services/local-agent/local-agent-service.ts');
    expect(service).not.toMatch(/CREATE TABLE|ALTER TABLE/i);
    expect([...service.matchAll(/(?:INSERT INTO|UPDATE|FROM)\s+([a-z_]+)/g)].map((m) => m[1]).every((t) => t.startsWith('local_agent_'))).toBe(true);
  });
});

// ─── 16~17. capability · allowlist ───────────────────────────────────────────

describe('16~17. 서버 capability · agent allowlist (§23·§24·§25·§26)', () => {
  it('16. PC 미연결 · 다른 workspace · 위조 입력 은 화면 조작 tool 을 열지 못한다', async () => {
    // 연결됐을 때만 두 capability 가 있다.
    const caps = deriveAiCapabilities({ localAgentStatus: 'connected', localDeviceId: 'dev-1', workspace: 'home' } as any);
    expect(caps).toContain(AiCapability.READ_ONLY_LOCAL_COMPUTER_INSPECT);
    expect(caps).toContain(AiCapability.LOCAL_COMPUTER_INTERACT);
    for (const status of ['none', 'offline', 'ambiguous']) {
      const c = deriveAiCapabilities({ localAgentStatus: status, workspace: 'home' } as any);
      expect(c).not.toContain(AiCapability.READ_ONLY_LOCAL_COMPUTER_INSPECT);
      expect(c).not.toContain(AiCapability.LOCAL_COMPUTER_INTERACT);
      const tools = resolveAvailableTools(ctx({ localAgentStatus: status as any, localDeviceId: undefined })).map((t) => t.name);
      for (const t of [AI_TOOL_NAMES.COMPUTER_INSPECT, AI_TOOL_NAMES.COMPUTER_CLICK, AI_TOOL_NAMES.COMPUTER_TYPE_TEXT, AI_TOOL_NAMES.COMPUTER_KEY]) {
        expect(tools).not.toContain(t);
        expect(assertToolAllowed(t, ctx({ localAgentStatus: status as any, localDeviceId: undefined })).allowed).toBe(false);
      }
    }
    // 위조 capability 입력은 무시된다 — ctx 의 capabilities 를 직접 주입해도 파생 값이 이긴다.
    const forged = assertToolAllowed(AI_TOOL_NAMES.COMPUTER_TYPE_TEXT, {
      ...ctx({ localAgentStatus: 'none', localDeviceId: undefined }),
      capabilities: [AiCapability.LOCAL_COMPUTER_INTERACT],
    } as any);
    expect(forged.allowed).toBe(false);
    // 상호작용은 별도 effect 이고 최종 게이트에 열거돼 있다 — 그 밖의 effect 는 없다.
    for (const t of [AI_TOOL_NAMES.COMPUTER_CLICK, AI_TOOL_NAMES.COMPUTER_TYPE_TEXT, AI_TOOL_NAMES.COMPUTER_KEY]) {
      expect(findToolDefinition(t)!.effect).toBe('COMPUTER_INTERACTION');
      expect(findToolDefinition(t)!.requiredCapabilities).toEqual([AiCapability.LOCAL_COMPUTER_INTERACT]);
    }
    expect(findToolDefinition(AI_TOOL_NAMES.COMPUTER_INSPECT)!.requiredCapabilities).toEqual([AiCapability.READ_ONLY_LOCAL_COMPUTER_INSPECT]);
    const contract = codeOnly(readServer('services/ai-tools/ai-tool-contract.ts'));
    const gate = contract.slice(contract.indexOf('const ALLOWED_TOOL_EFFECTS'), contract.indexOf(']);', contract.indexOf('const ALLOWED_TOOL_EFFECTS')));
    expect(gate).toContain("'COMPUTER_INTERACTION'");
    expect(gate).not.toMatch(/SHELL|PROCESS|FILE|CLIPBOARD/);
    // offline 이면 명령 없이 끝난다.
    const db = makeDb();
    await pairAndRegister(db);
    const r = await executeAiTool(db.dataSource, AI_TOOL_NAMES.COMPUTER_INSPECT, { targetId: NOTEPAD }, ctx());
    expect(r.data).toMatchObject({ available: false, errorCode: LOCAL_AGENT_ERROR.OFFLINE });
    expect(db.commands).toHaveLength(0);
    // 한 요청당 상호작용 상한은 1 이다(§31).
    expect(MAX_COMPUTER_ACTIONS_PER_REQUEST).toBe(1);
  });

  it('17. 서버 · agent allowlist 가 같고, agent 는 미등재 대상 · 규칙 밖 인자를 스크립트 전에 거절한다', () => {
    // (a) 서버 allowlist = 기존 + computer × 등재 appId. HWND 는 항목이 될 수 없다.
    expect(COMPUTER_TARGET_ACTIONS).toEqual([
      LOCAL_AGENT_ACTIONS.COMPUTER_INSPECT,
      LOCAL_AGENT_ACTIONS.COMPUTER_CLICK,
      LOCAL_AGENT_ACTIONS.COMPUTER_TYPE_TEXT,
      LOCAL_AGENT_ACTIONS.COMPUTER_KEY,
    ]);
    expect(COMPUTER_ARGS_ACTIONS).not.toContain(LOCAL_AGENT_ACTIONS.COMPUTER_INSPECT);
    for (const base of COMPUTER_TARGET_ACTIONS) {
      for (const appId of WINDOWS_APP_IDS) expect(isAllowedLocalAction(composeComputerAction(base, appId))).toBe(true);
      expect(isAllowedLocalAction(composeComputerAction(base, 'windows.cmd'))).toBe(false);
      expect(isAllowedLocalAction(base)).toBe(false);
    }
    // inspect 에 인자를 실어 보내는 경로도 형상에서 막힌다.
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.COMPUTER_INSPECT, { text: 'x' }).ok).toBe(false);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.ACTIVATE_WINDOW, { key: 'ENTER' }).ok).toBe(false);
    // (b) agent ACTIONS 문자열 = 서버 문자열.
    const handlers = readAgent('handlers.mjs');
    for (const [k, v] of Object.entries({
      COMPUTER_INSPECT: LOCAL_AGENT_ACTIONS.COMPUTER_INSPECT,
      COMPUTER_CLICK: LOCAL_AGENT_ACTIONS.COMPUTER_CLICK,
      COMPUTER_TYPE_TEXT: LOCAL_AGENT_ACTIONS.COMPUTER_TYPE_TEXT,
      COMPUTER_KEY: LOCAL_AGENT_ACTIONS.COMPUTER_KEY,
    })) {
      expect(handlers).toContain(`${k}: '${v}'`);
    }
    // (c) agent runAction 은 등재 검사 → 인자 검사 → 플랫폼 검사 → 실행 순이다. 검사 전에 스크립트를 부르지 않는다.
    const code = codeOnly(handlers);
    const run = code.slice(code.indexOf('export async function runAction'));
    const iReg = run.indexOf('findWindowsApp(appId)');
    const iArg = run.indexOf('computerHandler.validate(args)');
    const iRun = run.indexOf('computerHandler.run(app, checked.args)');
    expect(iReg).toBeGreaterThan(0);
    expect(iArg).toBeGreaterThan(iReg);
    expect(iRun).toBeGreaterThan(iArg);
    expect(run).toContain("'WINDOWS_APP_NOT_REGISTERED'");
    expect(run).toContain("'COMPUTER_USE_UNSUPPORTED_ACTION'");
    // (d) agent 의 handler 표에 4개가 있고 그 밖의 computer 항목은 없다.
    expect([...code.matchAll(/\[ACTIONS\.(COMPUTER_[A-Z_]+)\]/g)].map((m) => m[1]).sort()).toEqual(
      ['COMPUTER_CLICK', 'COMPUTER_INSPECT', 'COMPUTER_KEY', 'COMPUTER_TYPE_TEXT'],
    );
    expect(code).not.toMatch(/local\.computer\.(?!inspect|click|type_text|key)/);
  });
});

// ─── 18~21. 회귀 ─────────────────────────────────────────────────────────────

describe('18~21. 회귀 — replay · 창 축 · 브라우저 축 · pairing/LNA', () => {
  it('18. replay 보호 — 같은 명령을 두 번 집어갈 수 없고, 만료된 명령은 인자까지 지워진다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    const issued = await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: agent.deviceId,
      action: composeComputerAction(LOCAL_AGENT_ACTIONS.COMPUTER_TYPE_TEXT, NOTEPAD),
      toolName: AI_TOOL_NAMES.COMPUTER_TYPE_TEXT,
      args: { text: 'once' },
    });
    if (issued.ok === false) throw new Error('issue 실패');
    const first = await claimPendingCommands(db.dataSource, agent.deviceId);
    expect(first).toHaveLength(1);
    expect(first[0].args).toEqual({ text: 'once' });
    expect(await claimPendingCommands(db.dataSource, agent.deviceId)).toHaveLength(0);
    // 결과 두 번 제출 — 두 번째는 거절.
    const r1 = await submitCommandResult(db.dataSource, agent.deviceId, { commandId: issued.command.commandId, status: 'success', data: { typed: true } } as any);
    expect(r1).toEqual({ ok: true });
    const r2 = await submitCommandResult(db.dataSource, agent.deviceId, { commandId: issued.command.commandId, status: 'success', data: { typed: true } } as any);
    expect(r2.ok).toBe(false);
    await awaitCommandResult(db.dataSource, issued.command.commandId, 500);
    expect(db.commands[0].result_data).toBeNull();
    // 서버가 규칙 밖 인자로 발행하려 해도 발행 자체가 실패한다(§25 — AI 값을 그대로 믿지 않는다).
    const badIssue = await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: agent.deviceId,
      action: composeComputerAction(LOCAL_AGENT_ACTIONS.COMPUTER_KEY, NOTEPAD),
      toolName: AI_TOOL_NAMES.COMPUTER_KEY,
      args: { key: 'F4' },
    });
    expect(badIssue).toMatchObject({ ok: false, errorCode: LOCAL_AGENT_ERROR.COMPUTER_UNSUPPORTED_ACTION });
    expect(db.commands).toHaveLength(1);
  });

  it('19. 창 축 회귀 — "메모장 열려 있어?" · "계산기 앞으로" 는 그대로 창 tool 이다', () => {
    expect(selectToolInvocationForRequest('메모장 열려 있어?', ctx())).toEqual({ tool: AI_TOOL_NAMES.FIND_APPLICATION, args: { appId: NOTEPAD } });
    expect(selectToolInvocationForRequest('계산기 앞으로 가져와', ctx())).toEqual({ tool: AI_TOOL_NAMES.ACTIVATE_WINDOW, args: { appId: CALC } });
    expect(APP_TARGET_ACTIONS).toEqual([LOCAL_AGENT_ACTIONS.FIND_APPLICATION, LOCAL_AGENT_ACTIONS.ACTIVATE_WINDOW]);
    // 화면 조작 tool 은 등재 앱 이름이 있을 때만 골라진다.
    expect(selectToolInvocationForRequest('"테스트" 라고 써줘', ctx())).toBeNull();
    expect(selectToolInvocationForRequest('엔터 눌러', ctx())).toBeNull();
    expect(selectToolInvocationForRequest('클릭해', ctx())).toBeNull();
    // §38 UX 문장.
    expect(selectToolInvocationForRequest("메모장에 '테스트' 라고 써줘", ctx())).toEqual({
      tool: AI_TOOL_NAMES.COMPUTER_TYPE_TEXT,
      args: { targetId: NOTEPAD, text: '테스트' },
    });
    expect(extractTypeText('메모장에 테스트라고 써줘')).toBe('테스트');
    expect(extractTypeText('메모장에 "O4O computer use test" 입력해')).toBe('O4O computer use test');
    expect(asksForTyping('메모장에 테스트라고 써줘')).toBe(true);
    expect(asksForClick('메모장 클릭해')).toBe(true);
    expect(asksForScreenInspect('메모장 화면 확인해')).toBe(true);
    expect(selectToolInvocationForRequest('메모장 화면 확인해', ctx())).toEqual({ tool: AI_TOOL_NAMES.COMPUTER_INSPECT, args: { targetId: NOTEPAD } });
    expect(selectToolInvocationForRequest('메모장 클릭해', ctx())).toEqual({ tool: AI_TOOL_NAMES.COMPUTER_CLICK, args: { targetId: NOTEPAD, x: 0.5, y: 0.5 } });
    expect(selectToolInvocationForRequest('메모장에서 엔터 눌러', ctx())).toEqual({ tool: AI_TOOL_NAMES.COMPUTER_KEY, args: { targetId: NOTEPAD, key: 'ENTER' } });
    // 한 문장에 여럿이 있어도 하나만(§31).
    expect(selectToolInvocationForRequest("메모장에 '테스트' 라고 쓰고 엔터 눌러", ctx())).toEqual({
      tool: AI_TOOL_NAMES.COMPUTER_TYPE_TEXT,
      args: { targetId: NOTEPAD, text: '테스트' },
    });
    // 자격 없으면 창 축도 화면 축도 없다.
    expect(selectToolInvocationForRequest("메모장에 '테스트' 라고 써줘", ctx({ localAgentStatus: 'none', localDeviceId: undefined }))).toBeNull();
    // 프롬프트 — 수행한 동작을 부인하지 않고, 한 번만 했다고 말한다.
    const p = buildHomeChatSystemPrompt({ ...baseFacts(), computerAction: 'type_text' } as any);
    expect(p).toContain('## 화면 조작 상태');
    expect(p).toMatch(/한 번|1회|한 가지/);
  });

  it('20. 브라우저 축 회귀 — 브라우저 창은 화면 조작 대상이 아니다 (등재 앱만)', () => {
    expect(SITE_TARGET_ACTIONS).toEqual([LOCAL_AGENT_ACTIONS.BROWSER_GET_SITE_STATUS, LOCAL_AGENT_ACTIONS.BROWSER_OPEN_SITE]);
    expect(selectToolInvocationForRequest('네뚜레 열어줘', ctx())).toEqual({ tool: AI_TOOL_NAMES.BROWSER_OPEN_SITE, args: { siteId: 'o4o.neture' } });
    // 사이트 이름 + 타이핑 요청 = 사이트 축(열기까지). 타이핑 tool 로 가지 않는다.
    const sel = selectToolInvocationForRequest('네뚜레에 "abc" 라고 써줘', ctx());
    expect(sel?.tool).not.toBe(AI_TOOL_NAMES.COMPUTER_TYPE_TEXT);
    // 브라우저 process 는 등재 앱이 아니다 → targetId 가 될 수 없다.
    for (const t of ['chrome', 'msedge', 'browser', 'o4o.neture']) {
      expect(validateToolArguments({ targetId: t, text: 'x' }, findToolDefinition(AI_TOOL_NAMES.COMPUTER_TYPE_TEXT)!).ok).toBe(false);
      expect(isAllowedLocalAction(composeComputerAction(LOCAL_AGENT_ACTIONS.COMPUTER_TYPE_TEXT, t))).toBe(false);
    }
    // allowlist 전체 = 기존 + computer × 등재 appId, 그 이상 없음.
    const expected = [
      LOCAL_AGENT_ACTIONS.GET_AGENT_STATUS,
      LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
      ...DATA_TARGET_ACTIONS,
      ...APP_TARGET_ACTIONS.flatMap((b) => WINDOWS_APP_IDS.map((a) => composeAppAction(b, a))),
      ...SITE_TARGET_ACTIONS.map((b) => composeAppAction(b, 'o4o.neture')),
      ...COMPUTER_TARGET_ACTIONS.flatMap((b) => WINDOWS_APP_IDS.map((a) => composeComputerAction(b, a))),
    ].sort();
    expect([...LOCAL_AGENT_ACTION_ALLOWLIST].sort()).toEqual(expected);
    // 서버 규칙과 agent 규칙은 글자 단위로 같다 (§26 이중 검사의 전제).
    const server = readServer('services/local-agent/computer-use-contract.ts');
    const agent = readAgent('computer-use-limits.mjs');
    const regexes = (src: string) => [...src.matchAll(/^\s*(\/.+\/i?),\s*$/gm)].map((m) => m[1]);
    expect(regexes(agent)).toEqual(regexes(server));
    expect(regexes(agent).length).toBeGreaterThanOrEqual(10);
    const denyBlock = (src: string) => src.slice(src.indexOf('TEXT_DENY_KEYWORDS_KO'), src.indexOf(']);', src.indexOf('TEXT_DENY_KEYWORDS_KO')));
    const koKeywords = (src: string) => [...src.matchAll(/^\s*'([\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]+)',\s*(?:\/\/.*)?$/gm)].map((m) => m[1]);
    // 서버 파일은 esbuild ascii 때문에 \uXXXX 이스케이프일 수 있다 — 평가해서 비교한다.
    const serverKo = [...denyBlock(server).matchAll(/^\s*'((?:\\u[0-9a-fA-F]{4})+)',\s*(?:\/\/.*)?$/gm)].map((m) => JSON.parse(`"${m[1]}"`));
    const serverKoPlain = koKeywords(denyBlock(server));
    expect(new Set(koKeywords(denyBlock(agent)))).toEqual(new Set([...serverKo, ...serverKoPlain]));
    expect(koKeywords(denyBlock(agent)).length).toBeGreaterThanOrEqual(7);
    for (const c of ['COMPUTER_TEXT_MAX_LENGTH = 500', 'COMPUTER_TEXT_MIN_LENGTH = 1', "['ENTER', 'TAB', 'ESC']"]) {
      expect(server).toContain(c);
      expect(agent).toContain(c);
    }
  });

  it('21. pairing / LNA 회귀 — 명령은 여전히 device 소유자 · 연결 상태에 묶인다', async () => {
    const db = makeDb();
    await pairAndRegister(db, 'user-1');
    await connected(db, 'user-1');
    // 다른 사용자는 이 PC 에 명령을 낼 수 없다.
    const other = await executeAiTool(db.dataSource, AI_TOOL_NAMES.COMPUTER_INSPECT, { targetId: NOTEPAD }, ctx({ userId: 'user-2' }));
    expect(other.data).toMatchObject({ available: false, errorCode: LOCAL_AGENT_ERROR.NO_DEVICE });
    expect(db.commands).toHaveLength(0);
    // 다른 device 로는 결과를 제출할 수 없다.
    const { result } = await runComputerTool(db, AI_TOOL_NAMES.COMPUTER_INSPECT, { targetId: NOTEPAD }, [
      { status: 'success', data: { targetId: NOTEPAD, found: true, foreground: true } },
    ]);
    expect(result.data).toMatchObject({ available: true });
    const wrongDevice = await submitCommandResult(db.dataSource, 'dev-not-mine', { commandId: db.commands[0].command_id, status: 'success', data: {} } as any);
    expect(wrongDevice.ok).toBe(false);
    // 사용자 · device 확정 없이는 tool 자체가 없다(축은 연결 상태로만 열린다).
    expect(assertToolAllowed(AI_TOOL_NAMES.COMPUTER_INSPECT, ctx({ localAgentStatus: 'offline', localDeviceId: undefined })).allowed).toBe(false);
    expect(assertToolAllowed(AI_TOOL_NAMES.COMPUTER_INSPECT, ctx({ localDeviceId: undefined })).allowed).toBe(false);
    // agent 의 local-server(LNA) 는 여전히 loopback 전용이고 computer action 을 받지 않는다.
    const local = readAgent('local-server.mjs');
    expect(local).toContain('127.0.0.1');
    expect(local).not.toContain('local.computer');
  });
});
