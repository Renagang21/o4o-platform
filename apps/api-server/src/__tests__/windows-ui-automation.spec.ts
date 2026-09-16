/**
 * WO-O4O-WINDOWS-UI-AUTOMATION-V0 — 서버 계약 · Work Agent(uia 표면) 통합
 *
 *   contract   `local.uia.*#appId` 5개 × 등재 앱 · 인자 형상(ref+snapshot · 텍스트 규칙 · 허용 키 · 0..1 좌표 · clicks 1|2) · 안전 whitelist
 *   planner    uia 표면 검증 — key(허용 키 · 입력창) · click{x,y,clicks}(pointer role) · select_option/read_table 거절 · COMMIT 이름 · USER_ACTION 창
 *   loop       KakaoTalk 형상 scripted 흐름: prepare → inspect(list · 입력창) → click(list, 2회) → inspect(대화창) → set_input → key CTRL+ENTER →
 *              inspect(입력창 비움) → done. 제출 창이 요청에 없으면 거절 → takeover. find/read_text 는 명령 0.
 *   privacy    로그 키 · 창 제목/값이 로그에 없음 · 실행 경로 없음
 *
 * 실 카카오톡(UIA 노출 · Ctrl+Enter 전송 · 커스텀 목록 fallback)은 CHECK 의 smoke 가 본다.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';
import {
  LOCAL_AGENT_ACTIONS, LOCAL_AGENT_ACTION_ALLOWLIST, LOCAL_AGENT_ERROR, UIA_TARGET_ACTIONS, composeAppAction, isAllowedLocalAction, parseLocalAction,
  pickSafeResultData, validateLocalCommandArgs,
} from '../services/local-agent/local-agent-protocol.js';
import { WINDOWS_APP_IDS } from '../services/local-agent/windows-app-registry.js';
import { pickSafeUiaInfo, UIA_ALLOWED_KEYS, validateUiaClickArgs, validateUiaKeyArgs, validateUiaSetValueArgs } from '../services/local-agent/windows-uia-contract.js';
import { isSubmitWindowNamedInGoal, validateWorkProposal, type WorkObservation } from '../services/ai-tools/work-agent-contract.js';
import { runWorkAgent, buildPlannerUserPrompt, WORK_PLANNER_SYSTEM_PROMPT, type PlannerInput, type WorkPlanner } from '../services/ai-tools/work-agent-runtime.js';
import type { VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
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
const APP = 'windows.kakaotalk';
const OWN = '홍길동';

async function drive(db: LocalAgentDb, script: Script, max = 40) {
  const seen: { action: string; base: string; args: Record<string, unknown> }[] = [];
  const cursors: Record<string, number> = {};
  let k = 0;
  while (k < max) {
    for (let i = 0; i < 400 && db.commands.length <= k; i += 1) await new Promise((r) => setTimeout(r, 5));
    const cmd = db.commands[k];
    if (!cmd) break;
    k += 1;
    const base = parseLocalAction(String(cmd.action)).base;
    // PHASE 1 same-run resume: logical run 을 Local SQLite 에 남기는 ledger 명령(local.data.work_run_*)은 loop 관찰 밖의
    // 부수 채널이다(work-agent.spec 과 같은 처리). success 로 답하고 seen 에는 넣지 않는다.
    if (base.startsWith('local.data.work_run_')) {
      await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: 'success', data: { runId: 'r_test', runStatus: 'active', saved: true } } as any);
      continue;
    }
    seen.push({ action: String(cmd.action), base, args: cmd.result_data ? JSON.parse(String(cmd.result_data)) : {} });
    const queue = script[base] ?? [{ status: 'failed', errorCode: 'UIA_UNAVAILABLE' }];
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
async function run(request: string, planner: WorkPlanner, script: Script) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  const [result, seen] = await Promise.all([runWorkAgent(db.dataSource, ctx(), { request }, planner), drive(db, script)]);
  return { result, seen };
}

const PREP = OK({ targetId: APP, targetType: 'windows_app', state: 'ready', reusedExisting: true, windowCount: 1 });
const MAIN = OK({
  appId: APP, snapshotId: 's_main0001',
  windows: [{ windowRef: 'w_1', title: '카카오톡', foreground: true, minimized: false, userAction: false }],
  elements: [
    { elementRef: 'e_1', role: 'window', name: '카카오톡', riskLevel: 'READ', size: [392, 642] },
    { elementRef: 'e_2', role: 'list', name: 'ContactListCtrl', riskLevel: 'READ', size: [325, 407] },
    { elementRef: 'e_3', role: 'textbox', name: '', editable: true, riskLevel: 'REVERSIBLE', size: [138, 23] },
    { elementRef: 'e_4', role: 'button', name: '삭제', riskLevel: 'COMMIT' },
  ],
  elementCount: 4,
});
const CHAT = (value = '') => OK({
  appId: APP, snapshotId: value ? 's_chat0002' : 's_chat0003',
  windows: [{ windowRef: 'w_1', title: OWN, foreground: true, minimized: false, userAction: false }, { windowRef: 'w_2', title: '카카오톡', foreground: false, minimized: false, userAction: false }],
  elements: [
    { elementRef: 'e_1', role: 'window', name: OWN, riskLevel: 'READ' },
    { elementRef: 'e_2', role: 'textbox', name: 'RichEdit Control', editable: true, riskLevel: 'REVERSIBLE', size: [365, 61], ...(value ? { text: value, hasValue: true } : {}) },
    { elementRef: 'e_3', role: 'list', name: '', riskLevel: 'READ', size: [378, 433] },
  ],
  elementCount: 3,
});
const UIA_OBS = (windows: WorkObservation['windows'], elements: WorkObservation['elements']): WorkObservation => ({ siteId: APP, path: `window:${windows?.[0]?.title ?? ''}`, ready: true, elements, elementCount: elements.length, source: 'app_window', surface: 'uia', windows, fingerprint: 'f' });

describe('contract', () => {
  it('allowlist = 등재 appId × 5 · 인자 형상 · 임의 키/좌표/텍스트 거절', () => {
    expect(UIA_TARGET_ACTIONS.length).toBe(5);
    for (const appId of WINDOWS_APP_IDS) for (const base of UIA_TARGET_ACTIONS) expect(isAllowedLocalAction(composeAppAction(base, appId))).toBe(true);
    for (const bad of ['local.uia.inspect', 'local.uia.inspect#evil.app', 'local.uia.hotkey#windows.kakaotalk', 'local.uia.type#windows.kakaotalk', 'local.uia.screenshot#windows.kakaotalk', 'local.uia.exec#windows.kakaotalk']) {
      expect(isAllowedLocalAction(bad)).toBe(false);
    }
    expect(LOCAL_AGENT_ACTION_ALLOWLIST.filter((a) => a.startsWith('local.uia.')).length).toBe(5 * WINDOWS_APP_IDS.length);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.UIA_INSPECT, undefined).ok).toBe(true);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.UIA_INSPECT, { hwnd: 1 }).ok).toBe(false);
    expect(validateUiaSetValueArgs({ elementRef: 'e_2', snapshotId: 's_chat0002', text: 'O4O 자동화 테스트입니다.' }).ok).toBe(true);
    expect(validateUiaSetValueArgs({ elementRef: 'e_2', snapshotId: 's_chat0002', text: '비밀번호 1234' }).ok).toBe(false);
    expect(validateUiaSetValueArgs({ elementRef: 'e_2', snapshotId: 's_chat0002', text: 'a\nb' }).ok).toBe(false);
    expect(validateUiaSetValueArgs({ elementRef: 'e_2', snapshotId: 's_chat0002', text: 'x', hwnd: 5 }).ok).toBe(false);
    expect([...UIA_ALLOWED_KEYS]).toEqual(['ENTER', 'TAB', 'ESC', 'CTRL+ENTER']);
    expect(validateUiaKeyArgs({ key: 'CTRL+ENTER', snapshotId: 's_chat0002', elementRef: 'e_2' }).ok).toBe(true);
    expect(validateUiaKeyArgs({ key: 'ENTER', snapshotId: 's_chat0002' }).ok).toBe(true);
    for (const bad of [{ key: 'ALT+F4', snapshotId: 's_chat0002' }, { key: 'CTRL+V', snapshotId: 's_chat0002' }, { key: 'ENTER', snapshotId: 'x' }, { key: 'ENTER', snapshotId: 's_chat0002', vk: 13 }]) {
      expect(validateUiaKeyArgs(bad).ok).toBe(false);
    }
    expect(validateUiaClickArgs({ elementRef: 'e_2', snapshotId: 's_main0001', x: 0.35, y: 0.088, clicks: 2 }).ok).toBe(true);
    for (const bad of [{ elementRef: 'e_2', snapshotId: 's_main0001', x: 1.5, y: 0 }, { elementRef: 'e_2', snapshotId: 's_main0001', x: 0.1, y: 0.1, clicks: 3 }, { elementRef: 'e_2', snapshotId: 's_main0001', x: 0.1, y: 0.1, hwnd: 9 }, { elementRef: 'e_2', snapshotId: 's_main0001', screenX: 100, screenY: 200 }]) {
      expect(validateUiaClickArgs(bad).ok).toBe(false);
    }
  });

  it('pickSafeUiaInfo — role enum · 짧은 name/text · 플래그 · 크기 · 창 제목만, pid · hwnd · rid · rect · 실행 경로 탈락', () => {
    const safe = pickSafeUiaInfo({
      appId: APP, snapshotId: 's_main0001', elementCount: 2, truncated: false, pid: 11880, hwnd: 132362, launchPath: 'C:\\x.exe',
      windows: [{ windowRef: 'w_1', title: '카카오톡', foreground: true, minimized: false, userAction: false, hwnd: 132362, rect: [1, 2, 3, 4] }],
      elements: [{ elementRef: 'e_2', role: 'textbox', name: 'RichEdit Control', text: '안녕', editable: true, hasValue: true, size: [365, 61], rid: '42.1', hwnd: 1, rect: [0, 0, 1, 1], riskLevel: 'REVERSIBLE' }, { elementRef: 'bad', role: 'x' }],
    });
    expect(safe).toEqual({
      source: 'app_window', appId: APP, snapshotId: 's_main0001', truncated: false, elementCount: 2,
      windows: [{ windowRef: 'w_1', title: '카카오톡', foreground: true, minimized: false, userAction: false }],
      elements: [{ elementRef: 'e_2', role: 'textbox', name: 'RichEdit Control', text: '안녕', editable: true, hasValue: true, size: [365, 61], riskLevel: 'REVERSIBLE' }],
    });
    expect(pickSafeResultData('local.uia.key#windows.kakaotalk', { key: 'CTRL+ENTER', executed: true, valueCleared: true, hasValue: false, foregroundStill: true, rid: '1' })).toEqual({ source: 'app_window', key: 'CTRL+ENTER', executed: true, valueCleared: true, hasValue: false, foregroundStill: true });
    for (const code of ['UIA_UNAVAILABLE', 'UIA_INVALID_ARGUMENT', 'UIA_TEXT_DENIED', 'UIA_ELEMENT_STALE', 'UIA_ELEMENT_NOT_FOUND', 'UIA_ACTION_NOT_SUPPORTED', 'UIA_ACTION_NOT_ALLOWED', 'UIA_USER_ACTION_REQUIRED', 'UIA_TARGET_NOT_FOREGROUND']) {
      expect((LOCAL_AGENT_ERROR as Record<string, string>)[code]).toBe(code);
    }
  });
});

describe('planner validation on the uia surface', () => {
  const obs = UIA_OBS(
    [{ windowRef: 'w_1', title: OWN, foreground: true, userAction: false }],
    [
      { elementRef: 'e_1', role: 'window', name: OWN, riskLevel: 'READ' },
      { elementRef: 'e_2', role: 'textbox', name: 'RichEdit', editable: true, riskLevel: 'REVERSIBLE' },
      { elementRef: 'e_3', role: 'list', name: '', riskLevel: 'READ' },
      { elementRef: 'e_4', role: 'button', name: '삭제', riskLevel: 'COMMIT' },
      { elementRef: 'e_5', role: 'textbox', name: '비밀번호', editable: true, userAction: true },
      { elementRef: 'e_6', role: 'listitem', name: '항목' },
    ],
  );
  it('key: 허용 키 · 입력창 ref · dom 표면 거절 · 임의 키 거절', () => {
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'CTRL+ENTER', elementRef: 'e_2' } }, obs).ok).toBe(true);
    // SAFETY-V1 §18·§19: 카카오톡 profile 에서 ESC 는 riskyKeys(대화창 닫힘) → 제안 단계에서 거절, TAB 은 통과
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'ESC' } }, obs).reason).toBe('KEY_INVALID');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'TAB' } }, obs).ok).toBe(true);
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'ALT+F4' } }, obs).reason).toBe('KEY_INVALID');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'ENTER', elementRef: 'e_3' } }, obs).reason).toBe('ELEMENT_ROLE_MISMATCH');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'ENTER', elementRef: 'e_5' } }, obs).reason).toBe('USER_ACTION_WINDOW');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'ENTER' } }, { ...obs, surface: 'dom', source: 'webpage' }).reason).toBe('SURFACE_MISMATCH');
  });
  it('click{x,y,clicks}: pointer role 만 · 0..1 · clicks 1|2 · COMMIT 거절 · dom 표면 거절 · listitem invoke 허용 · select_option/read_table 거절', () => {
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'click', elementRef: 'e_3', x: 0.35, y: 0.088, clicks: 2 } }, obs).ok).toBe(true);
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'click', elementRef: 'e_2', x: 0.5, y: 0.5 } }, obs).reason).toBe('ELEMENT_ROLE_MISMATCH');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'click', elementRef: 'e_3', x: 2, y: 0 } }, obs).reason).toBe('SHAPE');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'click', elementRef: 'e_3', x: 0.1, y: 0.1, clicks: 3 } }, obs).reason).toBe('SHAPE');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'click', elementRef: 'e_4' } }, obs).reason).toBe('COMMIT_TARGET');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'click', elementRef: 'e_6' } }, obs).ok).toBe(true);
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'click', elementRef: 'e_3', x: 0.1, y: 0.1 } }, { ...obs, surface: 'dom', source: 'webpage' }).reason).toBe('SURFACE_MISMATCH');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'select_option', elementRef: 'e_2', option: 'x' } }, obs).reason).toBe('SURFACE_MISMATCH');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'read_table' } }, obs).reason).toBe('SURFACE_MISMATCH');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '인증번호 123456' } }, obs).reason).toBe('TEXT_DENIED');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'click', elementRef: 'e_3', coordinates: [1, 2] } }, obs).reason).toBe('FORBIDDEN_KEY');
  });
  it('제출 창 이름 규칙 — foreground 창 제목이 요청 문장에 있어야 한다', () => {
    expect(isSubmitWindowNamedInGoal(obs, `카카오톡 ${OWN} 채팅방에 O4O 자동화 테스트입니다 보내줘`)).toBe(true);
    expect(isSubmitWindowNamedInGoal(obs, '카카오톡에 테스트 메시지 보내줘')).toBe(false);
    expect(isSubmitWindowNamedInGoal({ ...obs, windows: [] }, OWN)).toBe(false);
  });
  it('프롬프트 — uia 표면은 app_window 출처 · 창 목록 · key/click 좌표 규칙 · 제출 창 규칙을 담는다', () => {
    const prompt = buildPlannerUserPrompt({ goal: { goalId: 'g', request: 'x', status: 'active' }, siteDisplayName: '카카오톡', observation: obs, history: [], lastRead: null, stepsLeft: 9 });
    expect(prompt).toContain('[app_window]');
    expect(prompt).toContain(`w_1 "${OWN}" (foreground)`);
    expect(prompt).toContain('editable');
    expect(prompt).not.toContain('[webpage]');
    expect(WORK_PLANNER_SYSTEM_PROMPT).toContain('CTRL+ENTER');
    expect(WORK_PLANNER_SYSTEM_PROMPT).toContain('창의 제목이 사용자 요청에 이름으로 들어 있지 않으면 제출하지 말고');
  });
});

describe('Work Agent loop on the uia surface (KakaoTalk 형상)', () => {
  const GOAL = `카카오톡 ${OWN} 채팅방에 "O4O 자동화 테스트입니다." 보내줘`;
  it('prepare → inspect → click(list 2회) → inspect(대화창) → set_input → key CTRL+ENTER → inspect(비움) → done — 명령 · 인자 · 결과', async () => {
    const planner = scripted([
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_2', x: 0.35, y: 0.088, clicks: 2 }, rationale: '내 프로필 행' },
      { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: 'O4O 자동화 테스트입니다.' } },
      { assessment: 'progress', action: { kind: 'key', key: 'CTRL+ENTER', elementRef: 'e_2' } },
      { assessment: 'completed', action: { kind: 'done' } },
    ]);
    const { result, seen } = await run(GOAL, planner, {
      'local.target.prepare': [PREP],
      'local.uia.inspect': [MAIN, CHAT(), CHAT('O4O 자동화 테스트입니다.'), CHAT()],
      'local.uia.click': [OK({ appId: APP, elementRef: 'e_2', role: 'list', riskLevel: 'REVERSIBLE', executed: true, clicks: 2 })],
      'local.uia.set_value': [OK({ appId: APP, elementRef: 'e_2', role: 'textbox', riskLevel: 'REVERSIBLE', executed: true, verified: true, hasValue: true })],
      'local.uia.key': [OK({ appId: APP, key: 'CTRL+ENTER', elementRef: 'e_2', riskLevel: 'REVERSIBLE', executed: true, valueCleared: true, hasValue: false, foregroundStill: true })],
    });
    expect(seen.map((s) => s.base)).toEqual(['local.target.prepare', 'local.uia.inspect', 'local.uia.click', 'local.uia.inspect', 'local.uia.set_value', 'local.uia.key', 'local.uia.inspect']);
    expect(seen[2].args).toEqual({ elementRef: 'e_2', snapshotId: 's_main0001', x: 0.35, y: 0.088, clicks: 2 });
    expect(seen[4].args).toEqual({ elementRef: 'e_2', snapshotId: 's_chat0003', text: 'O4O 자동화 테스트입니다.' });
    expect(seen[5].args).toEqual({ key: 'CTRL+ENTER', snapshotId: 's_chat0003', elementRef: 'e_2' });
    expect(seen.every((s) => s.action.endsWith(`#${APP}`))).toBe(true);
    expect(seen.some((s) => s.base.startsWith('local.browser') || s.base.startsWith('local.computer'))).toBe(false);
    expect(result.progress).toBe('completed');
    expect(planner.calls[1].observation.surface).toBe('uia');
    expect(planner.calls[1].observation.windows?.[0].title).toBe(OWN);
    expect(planner.calls[2].observation.elements.find((e) => e.elementRef === 'e_2')?.hasValue).toBeUndefined();
    expect(result.message).toContain('카카오톡 창을 찾아 앞으로 가져왔습니다.');
    expect(JSON.stringify(result)).not.toContain('11880');
  });

  it('제출 창이 요청에 없으면 key ENTER/CTRL+ENTER 는 실행되지 않고(명령 0) 거절 사유가 Planner 로 · 반복이면 user_judgment_required', async () => {
    const planner = scripted([{ assessment: 'progress', action: { kind: 'key', key: 'CTRL+ENTER', elementRef: 'e_2' } }]);
    const { result, seen } = await run('카카오톡에 테스트 메시지 보내줘', planner, {
      'local.target.prepare': [PREP],
      'local.uia.inspect': [CHAT('O4O 자동화 테스트입니다.')],
    });
    expect(seen.map((s) => s.base)).toEqual(['local.target.prepare', 'local.uia.inspect']);
    expect(planner.calls[1]?.lastRejectReason).toBe('WINDOW_NOT_NAMED_IN_GOAL');
    expect(result.takeover?.reason).toBe('user_judgment_required');
  });

  it('find · read_text 는 관찰 안에서 답한다(명령 0) · COMMIT invoke 는 commit_required · USER_ACTION 창은 credential_required', async () => {
    const planner = scripted([
      { assessment: 'progress', action: { kind: 'find', query: { role: 'textbox' } } },
      { assessment: 'progress', action: { kind: 'read_text', elementRef: 'e_2' } },
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_4' } },
      { assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } },
    ]);
    const { result, seen } = await run(`카카오톡 ${OWN} 확인`, planner, { 'local.target.prepare': [PREP], 'local.uia.inspect': [MAIN] });
    expect(seen.map((s) => s.base)).toEqual(['local.target.prepare', 'local.uia.inspect']);
    expect(planner.calls[1].lastRead).toContain('e_3 textbox');
    expect(planner.calls[2].lastRead).toBe('ContactListCtrl'); // e_2(list) 의 name — 값 없는 요소는 이름을 읽는다
    expect(planner.calls[2].lastRejectReason).toBeUndefined();
    // e_4 는 COMMIT → 검증에서 거절(명령 0) → 거절 사유가 Planner 로 돌아가고 다음 제안(takeover)이 채택된다
    expect(planner.calls[3].lastRejectReason).toBe('COMMIT_TARGET');
    expect(result.takeover?.reason).toBe('goal_sufficiently_advanced');
    const cred = scripted([{ assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: 'hello' } }]);
    const r2 = await run(`카카오톡 ${OWN} 확인`, cred, {
      'local.target.prepare': [PREP],
      'local.uia.inspect': [CHAT()],
      'local.uia.set_value': [{ status: 'failed', errorCode: 'UIA_USER_ACTION_REQUIRED', data: { appId: APP } }],
    });
    expect(r2.result.takeover?.reason).toBe('credential_required');
  });

  it('privacy — uia 로그 키 고정 · 값/제목/경로 없음 · agent 스크립트 경계(Start-Process 0 · 허용 키 4 · 텍스트 규칙)', async () => {
    const planner = scripted([{ assessment: 'completed', action: { kind: 'done' } }]);
    await run(`카카오톡 ${OWN} 확인`, planner, { 'local.target.prepare': [PREP], 'local.uia.inspect': [CHAT('비밀 값')] });
    const entry = (logger.info as jest.Mock).mock.calls.find((c) => c[0] === 'local-agent uia command');
    expect(entry).toBeTruthy();
    expect(Object.keys(entry![1]).sort()).toEqual(['action', 'appId', 'automationMethod', 'deviceId', 'durationMs', 'elementCount', 'elementRole', 'errorCode', 'riskLevel', 'status', 'tool']);
    expect(JSON.stringify(entry![1])).not.toMatch(/비밀 값|홍길동|C:\\\\/);
    const ps = read(join(AGENT_SRC, 'windows-uia.ps1')).split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
    for (const forbidden of ['Start-Process', 'Invoke-Expression', 'iex ', '-Command', 'cmd.exe', '$args', 'param(', 'Get-Clipboard', 'Set-Clipboard']) expect(ps).not.toContain(forbidden);
    expect(ps).toContain("'^(ENTER|TAB|ESC|CTRL\\+ENTER)$'");
    expect(ps).toContain('$allowedNames -notcontains $proc.ProcessName');
    const mjs = read(join(AGENT_SRC, 'windows-uia.mjs')).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');
    for (const forbidden of ["'node:fs'", 'child_process', 'fetch(', 'http']) expect(mjs).not.toContain(forbidden);
    expect(mjs).toContain('textDenyReason(args.text)');
    expect(mjs).toContain("riskLevelForName(r.entry.name) === 'COMMIT'");
    expect(mjs).toContain('entry.userAction');
  });
});
