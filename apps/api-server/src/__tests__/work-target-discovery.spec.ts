/**
 * WO-O4O-WORK-TARGET-DISCOVERY-AND-ACTIVATION-V0 — 서버 계층 · Work Agent 통합 (§5~§7·§32~§35·§46~§53·§59~§62)
 *
 *   resolution   별칭 → 등재 target(browser_site | windows_app) · 동시 매칭/미매칭은 null · hint 는 등재 id 만
 *   contract     `local.target.prepare#<targetId>` 가 allowlist 에 등재 id 당 1항목 · 인자 0 · 안전 whitelist(제목·URL·경로·핸들 탈락)
 *   integration  ready(재사용/열림) → loop 진행 · waiting_for_user → DOM 0 · windows_app ready → handoff · 미해석 → 되묻기
 *   privacy      로그 키 · 응답 키에 경로/제목/URL 없음 · 렌더 문장
 *
 * agent 계층(탭 선택 규칙 · 창 census · launch 경계)은 tools/o4o-local-agent/test/work-target.test.mjs 가 본다.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';
import {
  LOCAL_AGENT_ACTIONS, LOCAL_AGENT_ACTION_ALLOWLIST, LOCAL_AGENT_ERROR, TARGET_ACTIONS, WORK_TARGET_IDS,
  composeTargetAction, isAllowedLocalAction, isRegisteredWorkTarget, parseLocalAction, pickSafeResultData, pickSafeTargetInfo, validateLocalCommandArgs,
} from '../services/local-agent/local-agent-protocol.js';
import { resolveWorkTarget } from '../services/ai-tools/work-target-resolver.js';
import { renderTargetLine, runWorkAgent, resolveWorkSite, type PlannerInput, type WorkPlanner } from '../services/ai-tools/work-agent-runtime.js';
import { AI_TOOL_NAMES, type VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

jest.setTimeout(120_000);

const SRC = join(__dirname, '..');
const AGENT_SRC = join(SRC, '..', '..', '..', 'tools', 'o4o-local-agent', 'src');
const read = (p: string) => readFileSync(p, 'utf8');
const ctx = (): VerifiedToolContext => ({ userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: 'dev-1' });

type Outcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };
type Script = Record<string, Outcome[]>;
const OK = (data: Record<string, unknown>): Outcome => ({ status: 'success', data });
const HOME = [{ elementRef: 'e_1', role: 'searchbox', name: '검색' }, { elementRef: 'e_2', role: 'button', name: '검 색' }];

async function drive(db: LocalAgentDb, script: Script, max = 40) {
  const seen: { action: string; base: string; args: Record<string, unknown> }[] = [];
  const cursors: Record<string, number> = {};
  let k = 0;
  while (k < max) {
    for (let i = 0; i < 400 && db.commands.length <= k; i += 1) await new Promise((r) => setTimeout(r, 5));
    const cmd = db.commands[k];
    if (!cmd) break;
    k += 1;
    const base = parseLocalAction(String(cmd.action)).base.replace('local.browser.dom.', '');
    seen.push({ action: String(cmd.action), base, args: cmd.result_data ? JSON.parse(String(cmd.result_data)) : {} });
    const queue = script[base] ?? [{ status: 'failed', errorCode: 'DOM_ELEMENT_NOT_FOUND' }];
    const idx = Math.min(cursors[base] ?? 0, queue.length - 1);
    cursors[base] = (cursors[base] ?? 0) + 1;
    const o = queue[idx];
    await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: o.status, errorCode: o.errorCode, data: o.data } as any);
  }
  return seen;
}

function scripted(proposals: unknown[]): WorkPlanner & { calls: PlannerInput[] } {
  const calls: PlannerInput[] = [];
  let i = 0;
  return { kind: 'scripted', calls, async plan(input) { calls.push(input); const p = proposals[Math.min(i, proposals.length - 1)]; i += 1; return p; } };
}

async function run(request: string, planner: WorkPlanner, script: Script, targetHint?: string) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  const [result, seen] = await Promise.all([runWorkAgent(db.dataSource, ctx(), { request, targetHint }, planner), drive(db, script)]);
  return { result, seen };
}

const TARGET = (data: Record<string, unknown>): Outcome => OK({ targetId: 'healthkr', targetType: 'browser_site', ...data });

// ─── resolution (§5~§7) ──────────────────────────────────────────────────────

describe('target resolution', () => {
  it('별칭 → 등재 target: 사이트(site 축 + pharmacy web 등재부) · 프로그램(app 등재부) · 둘 다/없음은 null · hint 는 등재 id 만', () => {
    expect(resolveWorkTarget('약학정보원에서 아모디핀 찾아줘')).toEqual({ targetType: 'browser_site', targetId: 'healthkr', displayName: '약학정보원' });
    expect(resolveWorkTarget('약정원에서 검색')).toMatchObject({ targetId: 'healthkr' });
    expect(resolveWorkTarget('네뚜레에서 문의 보내줘')).toMatchObject({ targetType: 'browser_site', targetId: 'o4o.neture' });
    expect(resolveWorkTarget('메모장에 오늘 할 일 적어줘')).toEqual({ targetType: 'windows_app', targetId: 'windows.notepad', displayName: '메모장' });
    expect(resolveWorkTarget('notepad 열어줘')).toMatchObject({ targetId: 'windows.notepad' });
    expect(resolveWorkTarget('계산기 켜줘')).toMatchObject({ targetId: 'windows.calculator' });
    expect(resolveWorkTarget('약학정보원 결과를 메모장에 적어줘')).toBeNull(); // 사이트+앱 동시 → 임의 확정 금지
    expect(resolveWorkTarget('아무 데서나 찾아줘')).toBeNull();
    expect(resolveWorkTarget('https://evil.example 에서 찾아줘')).toBeNull();
    expect(resolveWorkTarget('찾아줘', 'healthkr')).toMatchObject({ targetType: 'browser_site' });
    expect(resolveWorkTarget('찾아줘', 'windows.notepad')).toMatchObject({ targetType: 'windows_app' });
    expect(resolveWorkTarget('찾아줘', 'evil.site')).toBeNull();
    expect(resolveWorkTarget('찾아줘', 'C:\\\\Windows\\\\System32\\\\cmd.exe')).toBeNull();
    // V0 호환 API 는 browser 대상만 돌려준다.
    expect(resolveWorkSite('메모장에 적어줘')).toBeNull();
    expect(resolveWorkSite('약학정보원에서 찾아줘')).toBe('healthkr');
  });
});

// ─── contract (§32·§33·§51) ─────────────────────────────────────────────────

describe('local.target.prepare contract', () => {
  it('allowlist 에 등재 targetId(siteId ∪ appId) 당 1항목 · 인자 0 · 등재 밖/URL/경로는 항목이 아니다', () => {
    expect(TARGET_ACTIONS).toEqual([LOCAL_AGENT_ACTIONS.TARGET_PREPARE]);
    expect([...WORK_TARGET_IDS].sort()).toEqual(['healthkr', 'o4o.neture', 'windows.calculator', 'windows.kakaotalk', 'windows.notepad']);
    for (const id of WORK_TARGET_IDS) expect(isAllowedLocalAction(composeTargetAction(LOCAL_AGENT_ACTIONS.TARGET_PREPARE, id))).toBe(true);
    for (const bad of ['local.target.prepare', 'local.target.prepare#evil.site', 'local.target.prepare#https://health.kr/', 'local.target.open#healthkr', 'local.target.launch#windows.notepad', 'local.app.launch#windows.notepad']) {
      expect(isAllowedLocalAction(bad)).toBe(false);
    }
    expect(LOCAL_AGENT_ACTION_ALLOWLIST.filter((a) => a.startsWith('local.target.')).length).toBe(WORK_TARGET_IDS.length);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.TARGET_PREPARE, undefined).ok).toBe(true);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.TARGET_PREPARE, { url: 'https://x' }).ok).toBe(false);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.TARGET_PREPARE, { path: 'C:\\\\x.exe' }).ok).toBe(false);
    expect(isRegisteredWorkTarget('healthkr') && isRegisteredWorkTarget('windows.notepad')).toBe(true);
    expect(isRegisteredWorkTarget('evil')).toBe(false);
    for (const code of ['NOT_RESOLVED', 'NOT_REGISTERED', 'NOT_FOUND', 'MULTIPLE_MATCHES', 'ACTIVATION_FAILED', 'LAUNCH_NOT_ALLOWED', 'LAUNCH_FAILED', 'USER_ACTION_REQUIRED', 'NOT_READY', 'TIMEOUT']) {
      expect((LOCAL_AGENT_ERROR as Record<string, string>)[`TARGET_${code}`]).toBe(`WORK_TARGET_${code}`);
    }
  });

  it('pickSafeTargetInfo — 상태 · 종류 · 사유 enum · 개수 · path 만 통과, 탭 제목 · URL · 실행 경로 · 핸들 · 창 제목은 탈락', () => {
    const safe = pickSafeTargetInfo({
      targetId: 'healthkr', targetType: 'browser_site', state: 'ready', reusedExisting: true, openedByO4O: false, userActionRequired: false,
      reason: 'active', selection: 'active', tabCount: 2, path: '/searchDrug/search.asp',
      url: 'https://health.kr/searchDrug/search.asp?q=secret', title: '약학정보원 - 검색', tabId: 123, windowId: 4, hwnd: 99, launchPath: 'C:\\\\x.exe', tabs: [{ tabId: 1 }],
    });
    expect(safe).toEqual({ targetId: 'healthkr', targetType: 'browser_site', state: 'ready', selection: 'active', reusedExisting: true, openedByO4O: false, userActionRequired: false, tabCount: 2, path: '/searchDrug/search.asp' });
    expect(pickSafeTargetInfo({ targetId: 'evil', state: 'weird', reason: 'C:\\\\x', path: '/a?b=c', tabCount: -1 })).toEqual({});
    expect(pickSafeResultData('local.target.prepare#healthkr', { targetId: 'healthkr', state: 'ready', title: 'x' })).toEqual({ targetId: 'healthkr', state: 'ready' });
  });
});

// ─── Work Agent integration (§34~§37) ────────────────────────────────────────

describe('Work Agent integration', () => {
  it('ready(재사용) → target 명령 1회가 관찰보다 먼저, 예산 미소모, 결과에 target 요약', async () => {
    const planner = scripted([{ assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } }]);
    const { result, seen } = await run('약학정보원에서 아모디핀 찾아줘', planner, {
      'local.target.prepare': [TARGET({ state: 'ready', reusedExisting: true, openedByO4O: false, tabCount: 1, path: '/', selection: 'active', title: 'leak' })],
      get_context: [OK({ siteId: 'healthkr', active: true, ready: true, path: '/', docId: 'd_1' })],
      inspect: [OK({ siteId: 'healthkr', snapshotId: 's_1', elements: HOME, elementCount: 2 })],
    });
    expect(seen.map((s) => s.base)).toEqual(['local.target.prepare', 'get_context', 'inspect']);
    expect(seen[0].action).toBe('local.target.prepare#healthkr');
    expect(seen[0].args).toEqual({});
    expect(result.target).toMatchObject({ targetType: 'browser_site', targetId: 'healthkr', state: 'ready', reusedExisting: true, openedByO4O: false, tabCount: 1 });
    expect(result.stepCount).toBe(2); // target 준비는 행동 예산 밖
    expect(result.takeover?.reason).toBe('goal_sufficiently_advanced');
    expect(result.message).toContain('약학정보원 탭이 이미 열려 있어 그 탭을 사용합니다.');
    expect(JSON.stringify(result)).not.toContain('leak');
  });

  it('ready(새로 열림) 도 loop 로 들어가고 문장이 구분된다', async () => {
    const planner = scripted([{ assessment: 'completed', action: { kind: 'done' } }]);
    const { result } = await run('약학정보원에서 아모디핀 찾아줘', planner, {
      'local.target.prepare': [TARGET({ state: 'ready', reusedExisting: false, openedByO4O: true, tabCount: 1, path: '/' })],
      get_context: [OK({ siteId: 'healthkr', active: true, ready: true, path: '/', docId: 'd_1' })],
      inspect: [OK({ siteId: 'healthkr', snapshotId: 's_1', elements: HOME, elementCount: 2 })],
    });
    expect(result.target?.openedByO4O).toBe(true);
    expect(result.message).toContain('약학정보원 탭이 없어 새로 열었습니다.');
  });

  it('waiting_for_user(여러 탭 · 확장 미연결 · 열기 실패) → DOM 명령 0 · Planner 0 · site_not_ready 인계 · 안내 문장', async () => {
    for (const [data, expectText] of [
      [{ state: 'waiting_for_user', userActionRequired: true, reason: 'multiple_tabs', tabCount: 2 }, '여러 개라 하나를 정하지 못했습니다'],
      [{ state: 'waiting_for_user', userActionRequired: true, reason: 'extension_not_connected', tabCount: 0 }, 'Chrome 확장이 연결'],
      [{ state: 'waiting_for_user', userActionRequired: true, reason: 'open_failed', tabCount: 0 }, '열어 둔 뒤 다시 요청'],
      [{ state: 'failed', reason: 'internal_error' }, '준비하지 못했습니다'],
    ] as const) {
      const planner = scripted([{ assessment: 'progress', action: { kind: 'inspect' } }]);
      const { result, seen } = await run('약학정보원에서 아모디핀 찾아줘', planner, {
        'local.target.prepare': [{ status: data.state === 'failed' ? 'failed' : 'success', errorCode: 'WORK_TARGET_MULTIPLE_MATCHES', data: { targetId: 'healthkr', targetType: 'browser_site', ...data } }],
      });
      expect(seen.map((s) => s.base)).toEqual(['local.target.prepare']);
      expect(planner.calls.length).toBe(0);
      expect(result.progress).toBe('needs_user');
      expect(result.takeover?.reason).toBe('site_not_ready');
      expect(result.ok).toBe(true);
      expect(result.errorCode).toBe('WORK_TARGET_MULTIPLE_MATCHES');
      expect(result.message).toContain(expectText);
      expect(result.message).not.toContain('0단계');
    }
  });

  it('windows_app: ready 면 UIA 표면으로 loop 에 들어간다(WINDOWS-UI-AUTOMATION-V0) — 첫 명령은 local.uia.inspect · Planner 는 surface=uia 관찰을 받는다', async () => {
    const planner = scripted([{ assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } }]);
    const reused = await run('메모장에 오늘 할 일 적어줘', planner, {
      'local.target.prepare': [OK({ targetId: 'windows.notepad', targetType: 'windows_app', state: 'ready', reusedExisting: true, windowCount: 1 })],
      'local.uia.inspect': [OK({ appId: 'windows.notepad', snapshotId: 's_note0001', windows: [{ windowRef: 'w_1', title: '제목 없음 - 메모장', foreground: true, minimized: false, userAction: false }], elements: [{ elementRef: 'e_1', role: 'window', name: '제목 없음 - 메모장' }, { elementRef: 'e_2', role: 'textbox', name: '텍스트 편집기', editable: true, size: [800, 500] }], elementCount: 2 })],
    });
    expect(reused.seen.map((s) => s.action)).toEqual(['local.target.prepare#windows.notepad', 'local.uia.inspect#windows.notepad']);
    expect(planner.calls.length).toBe(1);
    expect(planner.calls[0].observation.surface).toBe('uia');
    expect(planner.calls[0].observation.windows?.[0].title).toBe('제목 없음 - 메모장');
    expect(reused.result.message).toContain('메모장 창을 찾아 앞으로 가져왔습니다.');
    const userOpens = await run('계산기 켜줘', planner, {
      'local.target.prepare': [OK({ targetId: 'windows.calculator', targetType: 'windows_app', state: 'waiting_for_user', userActionRequired: true, reason: 'launch_not_allowed', windowCount: 0 })],
    });
    expect(userOpens.result.takeover?.reason).toBe('site_not_ready');
    expect(userOpens.result.message).toContain('프로그램을 실행해 주세요');
    expect(userOpens.result.message).toContain('로그인이 필요하면 로그인까지 완료해 주세요');
  });

  it('대상을 정하지 못하면 명령 0 · 되묻기 · target null', async () => {
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    const r = await runWorkAgent(db.dataSource, ctx(), { request: '아무 데서나 찾아줘' }, scripted([]));
    expect(r.errorCode).toBe('WORK_AGENT_SITE_UNRESOLVED');
    expect(r.target).toBeNull();
    expect(db.commands.length).toBe(0);
    expect(r.message).toContain('사이트나 프로그램');
  });
});

// ─── privacy · boundary (§46~§49·§55·§61) ────────────────────────────────────

describe('privacy · boundary', () => {
  it('target prepare 로그 키는 id · 종류 · 상태 · 사유 · 개수 · 시간뿐 — 경로 · 제목 · URL 없음', async () => {
    const planner = scripted([{ assessment: 'completed', action: { kind: 'done' } }]);
    await run('약학정보원에서 아모디핀 찾아줘', planner, {
      'local.target.prepare': [TARGET({ state: 'ready', reusedExisting: true, tabCount: 1, path: '/x', url: 'https://health.kr/x?q=1', title: 'T' })],
      get_context: [OK({ siteId: 'healthkr', active: true, ready: true, path: '/x', docId: 'd_1' })],
      inspect: [OK({ siteId: 'healthkr', snapshotId: 's_1', elements: HOME, elementCount: 2 })],
    });
    const entry = (logger.info as jest.Mock).mock.calls.find((c) => c[0] === 'local-agent target prepare');
    expect(entry).toBeTruthy();
    expect(Object.keys(entry![1]).sort()).toEqual(['deviceId', 'durationMs', 'errorCode', 'openedByO4O', 'reason', 'reusedExisting', 'state', 'status', 'tabCount', 'targetId', 'targetType', 'tool', 'windowCount']);
    expect(JSON.stringify(entry![1])).not.toMatch(/https:|title|\/x/);
  });

  it('agent 경계: 설치 프로그램 census · 전체 탭 census 업로드 · credential · 임의 exe/URL 통로가 없다 · 렌더 문장에 경로 없음', () => {
    const wt = read(join(AGENT_SRC, 'work-target.mjs'));
    const codeOnly = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');
    const wtCode = codeOnly(wt);
    for (const forbidden of ["'node:fs'", 'child_process', 'fetch(', 'Win32_Product', 'Get-Process', 'tasklist', 'readdir', 'cookie', 'password', 'credential']) {
      expect(wtCode).not.toContain(forbidden);
    }
    const reg = read(join(AGENT_SRC, 'windows-app-registry.mjs'));
    // launch 경로는 agent 등재부에만 있고 서버 등재부에는 없다(§45).
    expect(reg).toContain("launch: Object.freeze({ kind: 'executable', path: 'C:\\\\Windows\\\\System32\\\\notepad.exe' })");
    expect(read(join(SRC, 'services', 'local-agent', 'windows-app-registry.ts'))).not.toMatch(/launch|\.exe/);
    // 서버 어디에도 실행 경로 · URL 을 명령 인자로 싣는 통로가 없다.
    const executor = read(join(SRC, 'services', 'ai-tools', 'work-target-executor.ts'));
    expect(executor).toContain('args: undefined');
    // 확장 open 은 등재부 상수 URL 만.
    const sw = codeOnly(read(join(SRC, '..', '..', '..', 'tools', 'o4o-chrome-extension', 'src', 'service-worker.js')));
    expect(sw).toContain('chrome.tabs.create({ url: site.url, active: true })');
    expect(sw).not.toContain('payload.url');
    // 렌더 문장 — 경로/제목 미포함, 사용자에게 먼저 묻지 않는다(§55: "열려 있나요?" 문장 없음).
    for (const t of [
      { targetType: 'browser_site', targetId: 'healthkr', displayName: '약학정보원', state: 'ready', reusedExisting: true, openedByO4O: false, userActionRequired: false, reason: null, errorCode: null, tabCount: 1, windowCount: null },
      { targetType: 'windows_app', targetId: 'windows.notepad', displayName: '메모장', state: 'waiting_for_user', reusedExisting: false, openedByO4O: false, userActionRequired: true, reason: 'launch_failed', errorCode: 'WORK_TARGET_LAUNCH_FAILED', tabCount: null, windowCount: 0 },
    ] as const) {
      const line = renderTargetLine(t);
      expect(line).not.toMatch(/열려 있나요|C:\\|https?:/);
      expect(line.length).toBeGreaterThan(5);
    }
  });
});

// ─── regression: tool census unchanged (§62) ─────────────────────────────────

describe('regression', () => {
  it('AI tool 등재부에 launch/open-target tool 이 추가되지 않았다 — 대상 준비는 Work Agent 내부 단계다', () => {
    expect(Object.values(AI_TOOL_NAMES).filter((n) => /target|launch/i.test(n))).toEqual([]);
  });
});
