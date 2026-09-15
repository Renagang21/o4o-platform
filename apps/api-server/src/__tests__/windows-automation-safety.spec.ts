/**
 * WO-O4O-WINDOWS-AUTOMATION-SAFETY-AND-TAKEOVER-V1 — 서버 계층: 안전 거절 → Planner 사유 / 인계 매핑 · 키 의미 검증 · whitelist · 렌더
 *
 *   §47~§49  Planner → Runtime 검증 → (agent Safety) → 실행. 안전 거절은 Planner 에 사유로 돌아가고(대안 기회), 같은 거절 2회면 인계.
 *            즉시 인계: user_active · uia_hidden_control · key_semantics_unknown · vision_uncertain
 *            재관찰 1회: target_changed · target_identity_uncertain(앱 자신의 제목 표식) · uia_target_ambiguous · submit_not_verified
 *   §18~§21  profile 없는 앱의 제출/취소 키 · riskyKeys 는 제안 단계에서 거절(KEY_INVALID)
 *   §58·§59  코드 9종 · safety 요약 whitelist(사유 enum · paused · retries) · 로그 키 불변
 *   §34      인계 문장(프로그램 화면 유지 · 초기화/삭제 제안 0)
 *   §64      Computer Use: vision 경로는 Work Agent 에 배선돼 있지 않다(코드 예약) — 좌표 클릭 fallback 은 agent 안전층이 목록에서 막는다
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';
import { LOCAL_AGENT_ERROR, parseLocalAction } from '../services/local-agent/local-agent-protocol.js';
import { findWindowsApp, WINDOWS_APP_REGISTRY } from '../services/local-agent/windows-app-registry.js';
import { pickSafeUiaInfo, SAFE_SAFETY_REASONS } from '../services/local-agent/windows-uia-contract.js';
import { TAKEOVER_REASONS, validateWorkProposal, type WorkObservation } from '../services/ai-tools/work-agent-contract.js';
import { runWorkAgent, buildPlannerUserPrompt, type PlannerInput, type WorkPlanner } from '../services/ai-tools/work-agent-runtime.js';
import type { VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

jest.setTimeout(120_000);
const AGENT_SRC = join(__dirname, '..', '..', '..', '..', 'tools', 'o4o-local-agent', 'src');
const ctx = (): VerifiedToolContext => ({ userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: 'dev-1' });
type Outcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };
type Script = Record<string, Outcome[]>;
const OK = (data: Record<string, unknown>): Outcome => ({ status: 'success', data });
const APP = 'windows.kakaotalk';
const OWN = '홍길동';
const PREP = OK({ targetId: APP, targetType: 'windows_app', state: 'ready', reusedExisting: true, windowCount: 1 });
const CHAT = OK({
  appId: APP, snapshotId: 's_chat0001',
  windows: [{ windowRef: 'w_1', title: OWN, foreground: true, minimized: false, userAction: false }],
  elements: [{ elementRef: 'e_1', role: 'window', name: OWN, windowRef: 'w_1', riskLevel: 'READ' }, { elementRef: 'e_2', role: 'textbox', name: 'RichEdit Control', windowRef: 'w_1', editable: true, riskLevel: 'REVERSIBLE', size: [365, 61] }],
  elementCount: 2,
});
const SAFETY_FAIL = (code: string, reason: string, paused = false): Outcome => ({ status: 'failed', errorCode: code, data: { appId: APP, elementRef: 'e_2', safety: { reason, paused, retries: paused ? 2 : 0 } } });

async function drive(db: LocalAgentDb, script: Script, max = 40) {
  const seen: { base: string; args: Record<string, unknown> }[] = [];
  const cursors: Record<string, number> = {};
  let k = 0;
  while (k < max) {
    for (let i = 0; i < 400 && db.commands.length <= k; i += 1) await new Promise((r) => setTimeout(r, 5));
    const cmd = db.commands[k];
    if (!cmd) break;
    k += 1;
    const base = parseLocalAction(String(cmd.action)).base;
    seen.push({ base, args: cmd.result_data ? JSON.parse(String(cmd.result_data)) : {} });
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
const GOAL = `카카오톡 ${OWN} 채팅방에 "O4O 자동화 테스트입니다." 보내줘`;
const SEND = [{ assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: 'O4O 자동화 테스트입니다.' } }, { assessment: 'progress', action: { kind: 'key', key: 'ENTER', elementRef: 'e_2' } }];

describe('contract', () => {
  it('코드 9종 · 인계 사유 9종 · safety whitelist(사유 enum · paused · retries) · 등재부 profile/visibility', () => {
    for (const c of ['USER_ACTIVE', 'TARGET_CHANGED', 'TARGET_UNCERTAIN', 'UIA_AMBIGUOUS', 'HIDDEN_CONTROL', 'SUBMIT_UNVERIFIED', 'KEY_UNKNOWN', 'VISION_UNCERTAIN', 'PAUSED']) {
      expect((LOCAL_AGENT_ERROR as Record<string, string>)[`WINDOWS_AUTOMATION_${c}`]).toBe(`WINDOWS_AUTOMATION_${c}`);
    }
    for (const r of ['user_active', 'target_changed', 'target_identity_uncertain', 'uia_target_ambiguous', 'uia_hidden_control', 'submit_not_verified', 'key_semantics_unknown', 'vision_uncertain', 'unexpected_window']) {
      expect((TAKEOVER_REASONS as readonly string[]).includes(r)).toBe(true);
    }
    expect(pickSafeUiaInfo({ appId: APP, safety: { reason: 'other_app_foreground', paused: false, retries: 0, foregroundTitle: 'Chrome', hwnd: 1 } })).toEqual({ source: 'app_window', appId: APP, safety: { reason: 'other_app_foreground', paused: false, retries: 0 } });
    expect(pickSafeUiaInfo({ safety: { reason: 'C:\\x', paused: 'yes', retries: 99 } })).toEqual({ source: 'app_window', safety: { paused: false, retries: 0 } });
    expect(SAFE_SAFETY_REASONS).toContain('blind_list_click');
    const kakao = findWindowsApp(APP)!;
    expect(kakao.interactionProfile).toEqual({ submitKeys: ['ENTER'], newlineKeys: ['CTRL+ENTER'], cancelKeys: ['ESC'], riskyKeys: ['ESC'] });
    expect(kakao.uiaVisibilityHints?.hidden).toEqual(['list_rows', 'message_list', 'send_button']);
    expect(findWindowsApp('windows.notepad')!.interactionProfile?.submitKeys).toEqual([]);
    expect(findWindowsApp('windows.calculator')!.interactionProfile).toBeUndefined();
    // 서버 등재부에 실행 경로 · 창 핸들은 여전히 없다(§51)
    expect(JSON.stringify(WINDOWS_APP_REGISTRY)).not.toMatch(/\.exe|hwnd|C:\\\\/);
    // agent 사본과 같은 값
    const agentReg = readFileSync(join(AGENT_SRC, 'windows-app-registry.mjs'), 'utf8');
    expect(agentReg).toContain("submitKeys: Object.freeze(['ENTER']), newlineKeys: Object.freeze(['CTRL+ENTER']), cancelKeys: Object.freeze(['ESC']), riskyKeys: Object.freeze(['ESC'])");
  });

  it('키 의미 검증(§20·§21): profile 없는 앱은 ENTER/CTRL+ENTER/ESC 제안 거절 · riskyKeys 거절 · 프롬프트에 키 의미/노출 범위', () => {
    const obs = (siteId: string): WorkObservation => ({ siteId, path: 'window:x', ready: true, elements: [{ elementRef: 'e_2', role: 'textbox', editable: true }], elementCount: 1, source: 'app_window', surface: 'uia', windows: [{ windowRef: 'w_1', title: 'x', foreground: true, userAction: false }], fingerprint: 'f' });
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'ENTER', elementRef: 'e_2' } }, obs('windows.calculator')).reason).toBe('KEY_INVALID');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'ESC' } }, obs('windows.calculator')).reason).toBe('KEY_INVALID');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'TAB' } }, obs('windows.calculator')).ok).toBe(true);
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'ESC' } }, obs(APP)).reason).toBe('KEY_INVALID');
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'ENTER', elementRef: 'e_2' } }, obs(APP)).ok).toBe(true);
    expect(validateWorkProposal({ assessment: 'progress', action: { kind: 'key', key: 'ENTER', elementRef: 'e_2' } }, obs('windows.notepad')).ok).toBe(true);
    const prompt = buildPlannerUserPrompt({ goal: { goalId: 'g', request: 'x', status: 'active' }, siteDisplayName: '카카오톡', observation: obs(APP), history: [], lastRead: null, stepsLeft: 5 });
    expect(prompt).toContain('제출: ENTER · 줄바꿈: CTRL+ENTER · 취소/닫기(누르지 말 것): ESC');
    expect(prompt).toContain('미노출: list_rows, message_list, send_button');
    const p2 = buildPlannerUserPrompt({ goal: { goalId: 'g', request: 'x', status: 'active' }, siteDisplayName: '계산기', observation: obs('windows.calculator'), history: [], lastRead: null, stepsLeft: 5 });
    expect(p2).toContain('등록되지 않음 — ENTER/CTRL+ENTER/ESC 는 제안하지 말고');
  });
});

describe('Work Agent — 안전 거절 → 인계', () => {
  it('즉시 인계: USER_ACTIVE(멈춤) → user_active · HIDDEN_CONTROL → uia_hidden_control · KEY_UNKNOWN → key_semantics_unknown · VISION_UNCERTAIN → vision_uncertain', async () => {
    for (const [code, reason, expected, text] of [
      ['WINDOWS_AUTOMATION_USER_ACTIVE', 'user_active', 'user_active', '키보드·마우스 입력이 감지되어'],
      ['WINDOWS_AUTOMATION_HIDDEN_CONTROL', 'blind_list_click', 'uia_hidden_control', '항목 선택은 직접'],
      ['WINDOWS_AUTOMATION_KEY_UNKNOWN', 'risky_key', 'key_semantics_unknown', '누르지 않았습니다'],
      ['WINDOWS_AUTOMATION_VISION_UNCERTAIN', 'probe_failed', 'vision_uncertain', '화면 판독의 확신이 낮아'],
    ] as const) {
      const planner = scripted(SEND);
      const { result, seen } = await run(GOAL, planner, { 'local.target.prepare': [PREP], 'local.uia.inspect': [CHAT], 'local.uia.set_value': [SAFETY_FAIL(code, reason, code.endsWith('USER_ACTIVE'))] });
      // VISUAL-CU-V1 §4: HIDDEN_CONTROL 은 즉시 인계 전에 시각 fallback 을 한 번 시도한다(활성화→캡처). 이 하네스엔
      // 캡처 스크립트가 없어 캡처가 실패하고, 그때 비로소 uia_hidden_control 로 인계한다. 나머지 3종은 캡처 없이 즉시 인계.
      const expectedSeen = code.endsWith('HIDDEN_CONTROL')
        ? ['local.target.prepare', 'local.uia.inspect', 'local.uia.set_value', 'local.activate_window', 'local.computer.capture']
        : ['local.target.prepare', 'local.uia.inspect', 'local.uia.set_value'];
      expect(seen.map((s) => s.base)).toEqual(expectedSeen);
      expect(result.takeover?.reason).toBe(expected);
      expect(result.progress).toBe('needs_user');
      expect(result.ok).toBe(true);
      expect(result.message).toContain(text);
      expect(result.message).toContain('프로그램 화면은 그대로 두었습니다');
      expect(result.message).not.toMatch(/초기화|삭제하세요/);
    }
  });

  it('대안 기회: TARGET_CHANGED 1회 → 재관찰 + Planner 에 SAFETY_REJECT(사유) → 창 앞으로(window click) → 진행 · 같은 거절 2회 → target_changed 인계', async () => {
    const planner = scripted([
      { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: 'O4O 자동화 테스트입니다.' } },
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_1' } },
      { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: 'O4O 자동화 테스트입니다.' } },
      { assessment: 'completed', action: { kind: 'done' } },
    ]);
    const { result, seen } = await run(GOAL, planner, {
      'local.target.prepare': [PREP], 'local.uia.inspect': [CHAT],
      'local.uia.set_value': [SAFETY_FAIL('WINDOWS_AUTOMATION_TARGET_CHANGED', 'other_app_foreground'), OK({ appId: APP, elementRef: 'e_2', role: 'textbox', executed: true, verified: true, hasValue: true })],
      'local.uia.invoke': [OK({ appId: APP, elementRef: 'e_1', role: 'window', executed: true })],
    });
    expect(seen.map((s) => s.base)).toEqual(['local.target.prepare', 'local.uia.inspect', 'local.uia.set_value', 'local.uia.inspect', 'local.uia.invoke', 'local.uia.inspect', 'local.uia.set_value']);
    expect(planner.calls[1].lastRejectReason).toBe('SAFETY_REJECT');
    expect(planner.calls[1].lastSafetyReason).toBe('other_app_foreground');
    expect(result.progress).toBe('completed');
    const twice = scripted([SEND[0]]);
    const r2 = await run(GOAL, twice, { 'local.target.prepare': [PREP], 'local.uia.inspect': [CHAT], 'local.uia.set_value': [SAFETY_FAIL('WINDOWS_AUTOMATION_TARGET_CHANGED', 'other_app_foreground')] });
    expect(r2.seen.filter((s) => s.base === 'local.uia.set_value').length).toBe(2);
    expect(r2.result.takeover?.reason).toBe('target_changed');
    expect(r2.result.message).toContain('앞에 있지 않아');
    // 제목 변경(앱 자신의 '*' 수정 표식 등)도 같은 길: 1회 재관찰(실행 없음) · 2회 → target_identity_uncertain
    const title = scripted([SEND[0]]);
    const r3 = await run(GOAL, title, { 'local.target.prepare': [PREP], 'local.uia.inspect': [CHAT], 'local.uia.set_value': [SAFETY_FAIL('WINDOWS_AUTOMATION_TARGET_UNCERTAIN', 'title_changed')] });
    expect(r3.seen.map((s) => s.base)).toEqual(['local.target.prepare', 'local.uia.inspect', 'local.uia.set_value', 'local.uia.inspect', 'local.uia.set_value']);
    expect(title.calls[1].lastSafetyReason).toBe('title_changed');
    expect(r3.result.takeover?.reason).toBe('target_identity_uncertain');
    expect(r3.result.message).toContain('대상을 확신할 수 없어');
  });

  it('제출 재검증 실패 SUBMIT_UNVERIFIED 2회 → submit_not_verified · 전송 명령은 실행되지 않았다(모두 안전층에서 거절)', async () => {
    const planner = scripted(SEND);
    const { result, seen } = await run(GOAL, planner, {
      'local.target.prepare': [PREP], 'local.uia.inspect': [CHAT],
      'local.uia.set_value': [OK({ appId: APP, elementRef: 'e_2', role: 'textbox', executed: true, verified: true, hasValue: true })],
      'local.uia.key': [SAFETY_FAIL('WINDOWS_AUTOMATION_SUBMIT_UNVERIFIED', 'submit_element_unverified')],
    });
    expect(seen.filter((s) => s.base === 'local.uia.key').length).toBe(2);
    expect(result.takeover?.reason).toBe('submit_not_verified');
    expect(result.message).toContain('보내지 않았습니다');
  });

  it('로그 키 불변 · 사유/제목/좌표가 로그에 없다 · Computer Use 는 시각 fallback(capture+visual_*)만 배선되고 inspect vision 루프는 아니다(§64/VISUAL-CU-V1)', async () => {
    const planner = scripted(SEND);
    await run(GOAL, planner, { 'local.target.prepare': [PREP], 'local.uia.inspect': [CHAT], 'local.uia.set_value': [SAFETY_FAIL('WINDOWS_AUTOMATION_USER_ACTIVE', 'user_active', true)] });
    const entry = (logger.info as jest.Mock).mock.calls.filter((c) => c[0] === 'local-agent uia command').pop();
    expect(Object.keys(entry![1]).sort()).toEqual(['action', 'appId', 'automationMethod', 'deviceId', 'durationMs', 'elementCount', 'elementRole', 'errorCode', 'riskLevel', 'status', 'tool']);
    expect(entry![1].errorCode).toBe('WINDOWS_AUTOMATION_USER_ACTIVE');
    expect(JSON.stringify(entry![1])).not.toMatch(/홍길동|user_active|x=|y=/);
    const runtime = readFileSync(join(__dirname, '..', 'services', 'ai-tools', 'work-agent-runtime.ts'), 'utf8');
    // VISUAL-CU-V1: 시각 fallback 은 이제 Work Agent 에 배선된다 — 조작은 COMPUTER_CLICK/TYPE_TEXT/KEY 로만 나간다.
    expect(runtime).toContain('LOCAL_AGENT_ACTIONS.COMPUTER_CLICK');
    expect(runtime).toContain('LOCAL_AGENT_ACTIONS.COMPUTER_TYPE_TEXT');
    expect(runtime).toContain('LOCAL_AGENT_ACTIONS.COMPUTER_KEY');
    // 그러나 무거운 inspect vision 추론 루프(COMPUTER_INSPECT)는 여전히 Work Agent 에 배선하지 않는다 — 화면은 capture 로만 읽는다.
    expect(runtime).not.toContain('COMPUTER_INSPECT');
  });
});
