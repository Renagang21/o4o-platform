/**
 * WO-O4O-AUTOMATION-STRONG-FIRST-DISCOVERY-ROUTING-V1 — A(질문 이유 분리) · B(Discovery/Experienced 역할 routing) · C(prompt)
 *
 *   ① 새 업무 · 경험 없음이면 Discovery 역할(strongPlanner)로 시작하고, Experience 의 actor 는 ai_strong 이다.
 *   ② 검증된 Preferred 경험이 있으면 Experienced 역할(planner)로 계획하고, 막히면 Discovery 로 되돌린다.
 *   ③ 방법 부족(menu_location 등) 질문은 바로 넘기지 않고 재관찰 후 Discovery 가 다시 찾는다(상한 METHOD_DISCOVERY_MAX).
 *   ④ 정보 부족(value_confirmation) 질문은 바로 사용자에게 간다.
 *
 * 모델 교체가 아니라 역할 routing 이다 — 운영에서는 두 planner 가 같은 모델일 수 있다. 여기서는 planner 를 주입해 배선만 본다.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import logger from '../utils/logger.js';
import { LOCAL_AGENT_ACTIONS, parseLocalAction } from '../services/local-agent/local-agent-protocol.js';
import {
  runWorkAgent, buildPlannerUserPrompt, classifyQuestionBasis, choosePlannerMode, METHOD_DISCOVERY_MAX, WORK_PLANNER_SYSTEM_PROMPT,
  type PlannerInput, type WorkPlanner, type WorkAgentRunOptions,
} from '../services/ai-tools/work-agent-runtime.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import type { VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

jest.setTimeout(180_000);

const A = LOCAL_AGENT_ACTIONS;
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
// 검색 결과 — 제품명 셀은 onclick 만 가진 td 다. content-script 가 이를 'button' 으로 노출한다(D).
const RESULTS = [...HOME, EL('e_9', 'button', '아모디핀정 5mg')];
const INSPECT = (els: ReturnType<typeof EL>[]) => OK({ snapshotId: SNAP, elements: els, elementCount: els.length });
const DONE = { assessment: 'completed', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } };
const PREFERRED = [{ stageKey: 'search_drug', polarity: 'preferred', strategy: { ops: [{ op: 'search' }] }, verifiedCount: 2 }];

type Ledger = { taskKeys: string[]; patterns: Record<string, unknown>[]; experience: Record<string, unknown>[] };

async function drive(db: LocalAgentDb, script: Script, ledger: Ledger, max = 80) {
  const seen: { base: string; args: Record<string, unknown> }[] = [];
  const cursors: Record<string, number> = {};
  let k = 0;
  while (k < max) {
    for (let i = 0; i < 400 && db.commands.length <= k; i += 1) await new Promise((r) => setTimeout(r, 5));
    const cmd = db.commands[k];
    if (!cmd) break;
    k += 1;
    const base = parseLocalAction(String(cmd.action)).base.replace('local.browser.dom.', '');
    const args = cmd.result_data ? JSON.parse(String(cmd.result_data)) : {};
    const reply = (data: unknown) => submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: 'success', data } as any);
    if (base === 'local.target.prepare') {
      await reply({ targetId: SITE, targetType: 'browser_site', state: 'ready', reusedExisting: true, openedByO4O: false, tabCount: 1, path: '/' });
      continue;
    }
    if (base === A.DATA_WORK_RUN_EXPERIENCE_RECALL) {
      await reply(args.taskKey === null ? { taskKeys: ledger.taskKeys } : { patterns: ledger.patterns });
      continue;
    }
    if (base === A.DATA_WORK_RUN_EXPERIENCE_RECORD) { ledger.experience.push(args); await reply({ saved: true }); continue; }
    if (base === A.DATA_WORK_RUN_CONTEXT_RECALL) { await reply({ found: false }); continue; }
    if (base === A.DATA_WORK_RUN_CANDIDATE_MATCH) { await reply({ matched: false }); continue; }
    if (base.startsWith('local.data.work_run_')) { await reply({ runId: 'r_test', runStatus: 'active', saved: true }); continue; }
    seen.push({ base, args });
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
  return {
    kind: 'scripted',
    calls,
    async plan(input) {
      calls.push(input);
      const p = proposals[Math.min(i, proposals.length - 1)];
      i += 1;
      return p;
    },
  };
}

async function run(planner: WorkPlanner, script: Script, options: WorkAgentRunOptions = {}, ledgerInit: Partial<Ledger> = {}) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  const ledger: Ledger = { taskKeys: [], patterns: [], experience: [], ...ledgerInit };
  const [result, seen] = await Promise.all([runWorkAgent(db.dataSource, ctx(), { request: REQUEST }, planner, options), drive(db, script, ledger)]);
  return { result, seen, ledger };
}

const infoLogs = (msg: string) => (logger.info as jest.Mock).mock.calls.filter((c) => c[0] === msg).map((c) => c[1] as Record<string, unknown>);
const lastUsage = () => infoLogs('work-agent run').pop() as Record<string, unknown>;
const actorsOf = (ledger: Ledger): unknown[] =>
  ledger.experience.flatMap((e) => ((e.experience as any)?.steps ?? (e.steps as any) ?? []).map((s: any) => s.actor));

beforeEach(() => jest.clearAllMocks());

describe('A — 질문 이유 분리 (순수)', () => {
  it('방법 질문은 method_missing · 값/대상은 information_missing · 나머지는 user_decision', () => {
    expect(classifyQuestionBasis({ kind: 'menu_location' } as any, undefined)).toBe('method_missing');
    expect(classifyQuestionBasis({ kind: 'procedure_order' } as any, undefined)).toBe('method_missing');
    expect(classifyQuestionBasis({ kind: 'manual_request' } as any, undefined)).toBe('method_missing');
    expect(classifyQuestionBasis({ kind: 'value_confirmation', slots: ['drug_name'] } as any, '약 이름')).toBe('information_missing');
    expect(classifyQuestionBasis({ kind: 'target_confirmation' } as any, undefined)).toBe('information_missing');
    expect(classifyQuestionBasis(undefined, '무엇을 찾을지')).toBe('information_missing');
    expect(classifyQuestionBasis({ kind: 'success_confirmation' } as any, undefined)).toBe('user_decision');
    expect(classifyQuestionBasis(undefined, undefined)).toBe('user_decision');
    expect(METHOD_DISCOVERY_MAX).toBe(2);
  });
});

describe('B — 역할 선택 (순수)', () => {
  const base = { hasVerifiedPreferred: false, replayCompleted: false, correctionSeen: false, methodMismatch: false };
  it('경험 없음 → discovery · 검증된 Preferred 또는 재생 완료 → experienced', () => {
    expect(choosePlannerMode(base)).toBe('discovery');
    expect(choosePlannerMode({ ...base, hasVerifiedPreferred: true })).toBe('experienced');
    expect(choosePlannerMode({ ...base, replayCompleted: true })).toBe('experienced');
  });
  it('교정 직후 · 방법 불일치는 경험이 있어도 discovery', () => {
    expect(choosePlannerMode({ ...base, hasVerifiedPreferred: true, correctionSeen: true })).toBe('discovery');
    expect(choosePlannerMode({ ...base, hasVerifiedPreferred: true, methodMismatch: true })).toBe('discovery');
  });
});

describe('C — prompt 정렬', () => {
  it('방법을 모른다는 이유만으로 인계하지 말라는 규칙과 경계(인증 · 고위험 · 본질적 선택)가 함께 있다', () => {
    expect(WORK_PLANNER_SYSTEM_PROMPT).toContain('방법을 모른다는 이유만으로');
    expect(WORK_PLANNER_SYSTEM_PROMPT).toContain('후보가 보인다는 이유만으로 누르지 않는다');
  });
});

describe('B — runtime routing', () => {
  it('경험 없는 새 업무는 Discovery(strongPlanner)로 시작하고 Experience actor 는 ai_strong 이다', async () => {
    const normal = scripted([DONE]);
    const strong = scripted([{ assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } }, DONE]);
    const { result, ledger } = await run(normal, {
      get_context: [CTX('/', 'd_1'), CTX('/search', 'd_2')],
      inspect: [INSPECT(HOME), INSPECT(RESULTS)],
      click: [OK({ elementRef: 'e_3', changed: true, role: 'button', riskLevel: 'REVERSIBLE' })],
    }, { strongPlanner: strong });

    expect(result.progress).toBe('completed');
    expect(normal.calls).toHaveLength(0);
    expect(strong.calls).toHaveLength(2);
    expect(infoLogs('work-agent planner mode')[0]).toMatchObject({ mode: 'discovery', why: 'start' });
    const actors = actorsOf(ledger).filter((a) => a !== null);
    expect(actors.length).toBeGreaterThan(0);
    expect(actors.every((a) => a === 'ai_strong')).toBe(true);
    // 역할 routing 은 planner 입력에 모델명 · tier 를 싣지 않는다.
    expect(Object.keys(strong.calls[0])).not.toContain('model');
    expect(Object.keys(strong.calls[0])).not.toContain('tier');
  });

  it('검증된 Preferred 가 있으면 Experienced(planner)로 계획하고, 같은 행동만 반복하면 Discovery 로 되돌려 recovered_by_strong_model', async () => {
    const strong = scripted([
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' }, task: 'drug_info.search', stage: 'search_drug' },
      DONE,
    ]);
    const normal = scripted([{ assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } }]);
    const { result } = await run(normal, {
      get_context: [CTX('/', 'd_1')],
      inspect: [INSPECT(HOME)],
      click: [OK({ elementRef: 'e_3', changed: true, role: 'button', riskLevel: 'REVERSIBLE' })],
    }, { strongPlanner: strong }, { taskKeys: ['drug_info.search'], patterns: PREFERRED });

    expect(normal.calls.length).toBeGreaterThanOrEqual(1);
    expect(normal.calls[0].patterns).toHaveLength(1);
    expect(strong.calls).toHaveLength(2); // 업무 선언 1 + 막힘 뒤 복구 1
    expect(infoLogs('work-agent planner mode').map((l) => l.mode)).toEqual(['discovery', 'experienced', 'discovery']);
    expect(result.progress).toBe('completed');
    const u = lastUsage();
    expect(u.recoveryMethod).toBe('recovered_by_strong_model');
  });
});

describe('A — 방법 부족은 Discovery 가 먼저 다시 본다', () => {
  it('menu_location 질문 → 재관찰 → 새로 보인 scripted 셀(button)을 눌러 진행한다 · 사용자 질문 없음', async () => {
    const strong = scripted([
      { assessment: 'needs_user', action: { kind: 'takeover', reason: 'user_judgment_required' }, ask: { kind: 'menu_location' }, neededInput: '제품 상세로 가는 메뉴' },
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_9' } },
      DONE,
    ]);
    const { result, seen } = await run(scripted([DONE]), {
      get_context: [CTX('/search', 'd_1'), CTX('/search', 'd_1'), CTX('/detail', 'd_2')],
      inspect: [INSPECT(HOME), INSPECT(RESULTS), INSPECT(HOME)],
      click: [OK({ elementRef: 'e_9', changed: true, role: 'button', riskLevel: 'REVERSIBLE' })],
    }, { strongPlanner: strong });

    expect(result.progress).toBe('completed');
    expect(result.goal.status).not.toBe('waiting_for_user');
    expect(strong.calls[1].methodDiscovery).toEqual({ attempt: 1, askKind: 'menu_location' });
    expect(strong.calls[2].methodDiscovery).toBeUndefined();
    expect(strong.calls[1].observation.elements.map((e) => e.elementRef)).toContain('e_9');
    expect(buildPlannerUserPrompt(strong.calls[1])).toContain('## 방법 탐색');
    expect(seen.filter((s) => s.base === 'click').map((s) => s.args.elementRef)).toEqual(['e_9']);
    expect(infoLogs('work-agent method discovery')).toEqual([expect.objectContaining({ attempt: 1, askKind: 'menu_location' })]);
  });

  it(`방법 탐색이 ${METHOD_DISCOVERY_MAX}번 소진되면 그때 사용자에게 묻는다`, async () => {
    const ask = { assessment: 'needs_user', action: { kind: 'takeover', reason: 'user_judgment_required' }, ask: { kind: 'procedure_order' } };
    const strong = scripted([ask]);
    const { result } = await run(scripted([DONE]), {
      get_context: [CTX('/', 'd_1')],
      inspect: [INSPECT(HOME)],
    }, { strongPlanner: strong });

    expect(strong.calls).toHaveLength(METHOD_DISCOVERY_MAX + 1);
    expect(result.takeover?.reason).toBe('user_judgment_required');
    expect(result.progress).toBe('needs_user');
  });

  it('정보 부족(value_confirmation)은 재관찰 없이 바로 사용자에게 묻는다', async () => {
    const strong = scripted([
      { assessment: 'needs_user', action: { kind: 'takeover', reason: 'user_judgment_required' }, ask: { kind: 'value_confirmation', slots: ['drug_name'] }, neededInput: '찾을 약 이름' },
    ]);
    const { result } = await run(scripted([DONE]), {
      get_context: [CTX('/', 'd_1')],
      inspect: [INSPECT(HOME)],
    }, { strongPlanner: strong });

    expect(strong.calls).toHaveLength(1);
    expect(infoLogs('work-agent method discovery')).toEqual([]);
    expect(result.takeover?.reason).toBe('user_judgment_required');
    expect(result.progress).toBe('needs_user');
  });
});
