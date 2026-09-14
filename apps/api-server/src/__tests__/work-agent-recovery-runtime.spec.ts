/**
 * WO-O4O-AUTOMATION-FAILURE-ESCALATION-AND-USER-GUIDED-RECOVERY-V0 §69~§72 — runtime 통합(escalation·hint 배선)
 *
 * 순수 계약(분류·판단·결과·설명·힌트 sanitize)은 automation-recovery.spec.ts 가 본다.
 * 이 스펙은 그 계약이 work-agent-runtime 의 실제 loop 에 **어떻게 물렸는가** 만 본다 — 같은 runWorkAgent · 같은 DB stub 하네스:
 *
 *   ① 정상 planner 로 뚫지 못한 국면(무진전·반복 행동)에서 strong planner 가 실제로 갈아끼워진다(§11·§16).
 *      → strong 이 성공하면 recovered_by_strong_model 로 기록되고 개선 후보로 신호된다(§22·§27).
 *   ② strong planner 가 없으면 escalation 없이 기존대로 인계된다(무회귀). "올릴 곳이 없다" → PROVIDER_UNAVAILABLE(§67).
 *   ③ 사용자 복구 힌트(source=user)가 sanitize 되어 planner 입력으로 전달되고, 그 뒤 성공은 recovered_by_user_hint(§64·§65·§27).
 *
 * 실 strong-model 호출·실 브라우저는 CHECK 의 smoke 가 본다. 여기서는 planner 를 주입해 배선만 검사한다.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import logger from '../utils/logger.js';
import { parseLocalAction } from '../services/local-agent/local-agent-protocol.js';
import { runWorkAgent, buildPlannerUserPrompt, type PlannerInput, type WorkPlanner, type WorkAgentRunOptions } from '../services/ai-tools/work-agent-runtime.js';
import { sanitizeRecoveryHint } from '../services/ai-tools/automation-recovery-contract.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import type { VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

jest.setTimeout(180_000);

const SITE = 'healthkr';
const SNAP = 's_abcd1234';
const REQUEST = '약학정보원에서 아모디핀 찾아줘';
const ctx = (): VerifiedToolContext => ({ userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: 'dev-1' });

type Outcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };
type Script = Record<string, Outcome[]>;

const OK = (data: Record<string, unknown>): Outcome => ({ status: 'success', data: { siteId: SITE, ...data } });
const CTX = (path: string, docId: string): Outcome => OK({ active: true, ready: true, path, docId });
const EL = (elementRef: string, role: string, name: string) => ({ elementRef, role, name });
const HOME = [EL('e_1', 'heading', '약학정보원'), EL('e_2', 'searchbox', '약물명'), EL('e_3', 'button', '검 색')];
const INSPECT = OK({ snapshotId: SNAP, elements: HOME, elementCount: HOME.length });

/** 관찰이 늘 같도록 get_context 는 같은 docId, inspect 는 같은 HOME, click 은 화면을 바꾸지 않는다 → 무진전·반복 행동. */
const STUCK_SCRIPT: Script = {
  get_context: [CTX('/', 'd_1')],
  inspect: [INSPECT],
  click: [OK({ elementRef: 'e_3', changed: true, role: 'button', riskLevel: 'REVERSIBLE' })],
};

async function drive(db: LocalAgentDb, script: Script, max = 80) {
  const cursors: Record<string, number> = {};
  let k = 0;
  while (k < max) {
    for (let i = 0; i < 400 && db.commands.length <= k; i += 1) await new Promise((r) => setTimeout(r, 5));
    const cmd = db.commands[k];
    if (!cmd) break;
    k += 1;
    const base = parseLocalAction(String(cmd.action)).base.replace('local.browser.dom.', '');
    if (base === 'local.target.prepare') {
      await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: 'success', data: { targetId: SITE, targetType: 'browser_site', state: 'ready', reusedExisting: true, openedByO4O: false, tabCount: 1, path: '/' } } as any);
      continue;
    }
    const queue = script[base] ?? [{ status: 'failed', errorCode: 'DOM_ELEMENT_NOT_FOUND' }];
    const idx = Math.min(cursors[base] ?? 0, queue.length - 1);
    cursors[base] = (cursors[base] ?? 0) + 1;
    const o = queue[idx];
    await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: o.status, errorCode: o.errorCode, data: o.data } as any);
  }
}

function scripted(proposals: unknown[]): WorkPlanner & { calls: PlannerInput[] } {
  const calls: PlannerInput[] = [];
  let i = 0;
  return {
    kind: 'scripted',
    calls,
    async plan(input) {
      calls.push(input);
      const p = proposals[Math.min(i, proposals.length - 1)];
      i += 1;
      if (p instanceof Error) throw p;
      return p;
    },
  };
}

async function run(planner: WorkPlanner, script: Script, options: WorkAgentRunOptions = {}, input: { recoveryHint?: string } = {}) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  const [result] = await Promise.all([runWorkAgent(db.dataSource, ctx(), { request: REQUEST, ...input }, planner, options), drive(db, script)]);
  return result;
}

/** 마지막 'work-agent run' usage 로그(§60 화이트리스트 필드). */
function lastUsage(): Record<string, unknown> {
  const runs = (logger.info as jest.Mock).mock.calls.filter((c) => c[0] === 'work-agent run');
  return runs[runs.length - 1]?.[1] as Record<string, unknown>;
}

beforeEach(() => jest.clearAllMocks());

describe('escalation 배선 (§11·§16·§22·§27)', () => {
  it('정상 planner 가 같은 행동만 반복하면 strong planner 로 갈아끼워지고, strong 성공은 recovered_by_strong_model 로 남는다', async () => {
    const normal = scripted([{ assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } }]);
    const strong = scripted([{ assessment: 'completed', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } }]);
    const result = await run(normal, STUCK_SCRIPT, { strongPlanner: strong });

    // strong 이 실제로 호출됐다(정상 planner 만으로는 goal_sufficiently_advanced 를 낼 수 없다).
    expect(strong.calls.length).toBeGreaterThanOrEqual(1);
    expect(result.takeover?.reason).toBe('goal_sufficiently_advanced');
    expect(result.progress).toBe('completed');

    const u = lastUsage();
    expect(u.failureClass).toBe('NO_PROGRESS');
    expect(u.recoveryMethod).toBe('recovered_by_strong_model');
    expect(u.improvementCandidate).toBe(true);
    expect(u.recoveryStatus).toBeNull(); // 복구 성공 — 진행(ESCALATED) 신호 해제
  });

  it('strong planner 가 escalation 전에 관찰을 넘겨받는다(정상 planner 입력과 같은 형상)', async () => {
    const normal = scripted([{ assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } }]);
    const strong = scripted([{ assessment: 'completed', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } }]);
    await run(normal, STUCK_SCRIPT, { strongPlanner: strong });
    const input = strong.calls[0];
    expect(input.observation.siteId).toBe(SITE);
    expect(input.goal.request).toBe(REQUEST);
    // strong 도 권한·위험을 못 바꾼다 — 같은 goal·관찰만 받는다. (내부 tier/모델명은 planner 입력에 없다.)
    expect(Object.keys(input)).not.toContain('tier');
    expect(Object.keys(input)).not.toContain('model');
  });
});

describe('무회귀 — strong planner 없음 (§67)', () => {
  it('strong planner 가 없으면 escalation 없이 인계된다("올릴 곳 없음" → PROVIDER_UNAVAILABLE · not_recovered)', async () => {
    const normal = scripted([{ assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } }]);
    const result = await run(normal, STUCK_SCRIPT); // options 없음 = strong planner 없음

    expect(result.takeover?.reason).toBe('no_progress');
    expect(result.progress).toBe('no_progress');

    const u = lastUsage();
    expect(u.failureClass).toBe('NO_PROGRESS');
    expect(u.recoveryMethod).toBe('not_recovered');
    expect(u.recoveryStatus).toBe('AUTOMATION_RECOVERY_PROVIDER_UNAVAILABLE');
    expect(u.improvementCandidate).toBe(true);
  });
});

describe('사용자 복구 힌트 배선 (§64·§65·§27)', () => {
  it('sanitize 된 힌트가 planner 입력·프롬프트에 실리고, 그 뒤 성공은 recovered_by_user_hint 로 남는다', async () => {
    const hint = '  성분명 대신 제품명으로 검색해 주세요  ';
    const planner = scripted([{ assessment: 'completed', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } }]);
    const result = await run(planner, { get_context: [CTX('/', 'd_1')], inspect: [INSPECT] }, {}, { recoveryHint: hint });

    expect(planner.calls[0].recoveryHint).toBe(sanitizeRecoveryHint(hint));
    expect(result.progress).toBe('completed');
    const u = lastUsage();
    expect(u.recoveryMethod).toBe('recovered_by_user_hint');
    expect(u.improvementCandidate).toBe(true);

    // 프롬프트에 힌트가 source=user 로 실리되, 그 지시로도 위험 국면은 못 넘긴다는 경계가 함께 실린다.
    const prompt = buildPlannerUserPrompt({ ...planner.calls[0] });
    expect(prompt).toContain('사용자 추가 지시 (source=user)');
    expect(prompt).toContain('로그인·결제·주문 확정·삭제·게시는 하지 않는다');
  });

  it('제어문자·과길이 힌트는 버려져 planner 입력에 실리지 않는다(undefined)', async () => {
    const planner = scripted([{ assessment: 'completed', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } }]);
    await run(planner, { get_context: [CTX('/', 'd_1')], inspect: [INSPECT] }, {}, { recoveryHint: '나쁜\x00바이트' });
    expect(planner.calls[0].recoveryHint).toBeUndefined();
  });
});
