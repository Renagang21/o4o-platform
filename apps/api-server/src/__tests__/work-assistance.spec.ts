/**
 * WO-O4O-AUTOMATION-USER-ASSISTANCE-AND-CORRECTION-V1 — Experience Model V1 Phase 2(User Assistance · Correction)
 *
 *   A. 순수 규칙 — 입력 분류(값 확인=Assistance · 교정 4유형) · 값/지시 판정 · 대안 검증(D5) · Avoid 포함 판정 · recall 화이트리스트
 *   B. protocol 경계 — context_save / context_recall / assistance_record / experience_recall 검증기(원문 · 값 · 미검증 label 거절)
 *   C. runtime — QUESTION 때 원래 업무 구조 저장 → 재개는 같은 runId · 원래 업무로 이어감(답변은 새 목적 아님)
 *      · 일반 Assistance · Task 의미 교정 · health.kr 동일성분 방법 교정(대안 성공 → verified) · 다음 run 의 Avoid 실행 차단
 *
 * Planner 는 scripted(결정적). agent 응답은 DB stub harness(work-experience.spec 과 같은 방식).
 * Local 의 Preferred/Avoid 생성(verified + reusable_knowledge 일 때만)은 tools/o4o-local-agent/test/local-db.test.mjs 가 본다.
 * 실 PC 는 smoke 가 본다.
 */

jest.setTimeout(30_000);

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { LOCAL_AGENT_ACTIONS, parseLocalAction, validateLocalCommandArgs } from '../services/local-agent/local-agent-protocol.js';
import {
  isPlainValueAnswer,
  pickRecalledContext,
  pickSafeExperienceRecall,
  sanitizeStrategy,
  sanitizeUserInput,
  strategyContains,
  verifyAlternative,
} from '../services/ai-tools/work-assistance.js';
import { buildPlannerUserPrompt, runWorkAgent, type WorkPlanner, type PlannerInput } from '../services/ai-tools/work-agent-runtime.js';
import type { VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

const A = LOCAL_AGENT_ACTIONS;
const OLD = { ops: [{ op: 'search' }, { op: 'extract_field' }, { op: 're_search' }] };
const ALT = { ops: [{ op: 'open_detail' }, { op: 'open_tab', label: '동일성분' }] };

// ─── A. 순수 규칙 ─────────────────────────────────────────────────────────────

describe('A. 순수 규칙', () => {
  it('값 확인은 Planner 가 교정이라 해도 Assistance · per_run_value 로 고정된다(§7-2)', () => {
    const ui = sanitizeUserInput({ kind: 'correction', providedKind: 'value', correctionType: 'procedure_method', reusability: 'reusable_knowledge', alternative: ALT });
    expect(ui).toMatchObject({ kind: 'assistance', providedKind: 'value', correctionType: null, reusability: 'per_run_value', alternative: null });
  });

  it('교정은 유형이 있어야 한다 — 유형 없으면 Assistance · 4유형은 그대로', () => {
    expect(sanitizeUserInput({ kind: 'correction', providedKind: 'correction' })?.kind).toBe('assistance');
    for (const t of ['task_intent', 'target', 'procedure_method', 'outcome']) {
      expect(sanitizeUserInput({ kind: 'correction', providedKind: 'correction', correctionType: t })).toMatchObject({ kind: 'correction', correctionType: t });
    }
  });

  it('방법 label 에 이번 run 값(입력값)이 들어가면 label 만 버린다 · 어휘 밖 op 는 버린다', () => {
    const s = sanitizeStrategy({ ops: [{ op: 'open_tab', label: '타이레놀 상세' }, { op: 'hack' }, { op: 'search', label: 'x' }] }, ['타이레놀']);
    expect(s).toEqual({ ops: [{ op: 'open_tab' }, { op: 'search' }] });
  });

  it('값/지시 판정 — "게보린" 은 값, "그 방법 말고 … 탭을 써" · "나는 보통 A도매를 써" 는 값이 아니다', () => {
    expect(isPlainValueAnswer('게보린')).toBe(true);
    expect(isPlainValueAnswer('타이레놀 500')).toBe(true);
    expect(isPlainValueAnswer('그 방법 말고 제품 상세의 동일성분 탭을 써')).toBe(false);
    expect(isPlainValueAnswer('나는 보통 A도매를 써')).toBe(false);
  });

  it('대안 검증(D5) — 성공 + label 이 실제 성공한 클릭 locator 와 맞을 때만 verified', () => {
    const locs = [{ role: 'tab', name: '동일성분' }];
    expect(verifyAlternative(ALT, 'PARTIAL_SUCCESS', locs)).toEqual({ result: 'verified', strategy: ALT });
    expect(verifyAlternative(ALT, 'PARTIAL_SUCCESS', [{ role: 'tab', name: '허가정보' }]).result).toBe('not_verified');
    expect(verifyAlternative(ALT, null, locs).result).toBe('not_verified');
    expect(verifyAlternative(ALT, 'FAILED', locs)).toEqual({ result: 'failed', strategy: { ops: [{ op: 'open_detail' }, { op: 'open_tab' }] } });
    // label 이 하나도 없으면 무엇으로 성공했는지 근거가 없다.
    expect(verifyAlternative(OLD as any, 'SUCCESS', locs).result).toBe('not_verified');
  });

  it('Avoid 포함 판정 — op 순서가 부분열로 들어 있으면 같은 방법', () => {
    expect(strategyContains({ ops: [{ op: 'search' }, { op: 'read_result' }, { op: 'extract_field' }, { op: 're_search' }] } as any, OLD as any)).toBe(true);
    expect(strategyContains(ALT as any, OLD as any)).toBe(false);
    expect(strategyContains({ ops: [{ op: 'search' }] } as any, OLD as any)).toBe(false);
  });

  it('recall 화이트리스트 — 출처 run · 시각 · 원문은 통과하지 않는다', () => {
    const r = pickSafeExperienceRecall({
      taskKeys: ['drug_info.same_ingredient', 'BAD KEY'],
      patterns: [{ stageKey: 'find_same_ingredient', polarity: 'avoid', strategy: OLD, verifiedCount: 1, runId: 'g_x', note: '원문' }],
      goalSummary: '타이레놀',
    });
    expect(r).toEqual({
      taskKeys: ['drug_info.same_ingredient'],
      patterns: [{ stageKey: 'find_same_ingredient', polarity: 'avoid', strategy: OLD, verifiedCount: 1 }],
    });
    expect(pickRecalledContext({ found: true, taskKey: 'drug_info.lookup', goalSummary: '원문', candidateId: '../x' })).toMatchObject({ found: true, candidateId: null });
  });
});

// ─── B. protocol 경계 ─────────────────────────────────────────────────────────

const EVENT = (over: Record<string, unknown> = {}) => ({
  kind: 'correction', stageKey: 'find_same_ingredient', askKind: 'procedure_order', providedKind: 'correction', structured: null,
  resolution: 'resolved', progressedSteps: 2, reusability: 'reusable_knowledge',
  correction: { type: 'procedure_method', reason: 'site_feature_exists', wrong: OLD, alternative: ALT },
  validation: { result: 'verified', evidence: 'agent_inferred' },
  ...over,
});
const REC = (over: Record<string, unknown> = {}, ev: Record<string, unknown> = {}) => ({
  runId: 'g_as1', targetId: 'healthkr', taskKey: 'drug_info.same_ingredient', event: EVENT(ev), ...over,
});

describe('B. protocol 경계', () => {
  it('정상 형상은 통과 — 4 action', () => {
    expect(validateLocalCommandArgs(A.DATA_WORK_RUN_ASSISTANCE_RECORD, REC()).ok).toBe(true);
    expect(validateLocalCommandArgs(A.DATA_WORK_RUN_ASSISTANCE_RECORD, REC({}, { validation: { result: 'verified', evidence: 'user_confirmed' } })).ok).toBe(true);
    expect(validateLocalCommandArgs(A.DATA_WORK_RUN_CONTEXT_SAVE, {
      runId: 'g_as1', targetId: 'healthkr', taskKey: 'drug_info.lookup', stageKey: 'search_product',
      ask: { kind: 'value_confirmation', slots: ['drug_name'] }, strategy: { ops: [{ op: 'search' }] }, replay: null,
    }).ok).toBe(true);
    expect(validateLocalCommandArgs(A.DATA_WORK_RUN_CONTEXT_RECALL, { runId: 'g_as1', targetId: 'healthkr', slotValue: '게보린' }).ok).toBe(true);
    expect(validateLocalCommandArgs(A.DATA_WORK_RUN_EXPERIENCE_RECALL, { targetId: 'healthkr', taskKey: null }).ok).toBe(true);
  });

  it('형상 밖은 거절 — 답변 원문 · 값 · 값 확인의 교정화 · 틀린 방법 label · 미검증 label · 미등재 대상', () => {
    const bad: [string, Record<string, unknown>][] = [
      ['answer key', REC({ answer: '그 방법 말고' })],
      ['event text', REC({}, { note: '원문' })],
      ['slot value', REC({}, { kind: 'assistance', providedKind: 'value', reusability: 'per_run_value', correction: null, structured: { slots: ['drug_name'], value: '게보린' } })],
      ['value as correction', REC({}, { providedKind: 'value', reusability: 'per_run_value' })],
      ['value reusable', REC({}, { kind: 'assistance', providedKind: 'value', correction: null })],
      ['wrong label', REC({}, { correction: { type: 'procedure_method', reason: null, wrong: ALT, alternative: ALT } })],
      ['unverified label', REC({}, { validation: { result: 'not_verified', evidence: null } })],
      ['bad evidence', REC({}, { validation: { result: 'verified', evidence: 'llm_said_so' } })],
      ['bad target', REC({ targetId: 'evil.example' })],
      ['bad op', REC({}, { correction: { type: 'procedure_method', reason: null, wrong: { ops: [{ op: 'exec' }] }, alternative: null } })],
    ];
    for (const [name, a] of bad) expect([name, validateLocalCommandArgs(A.DATA_WORK_RUN_ASSISTANCE_RECORD, a).ok]).toEqual([name, false]);
    expect(validateLocalCommandArgs(A.DATA_WORK_RUN_CONTEXT_RECALL, { runId: 'g_as1', targetId: 'healthkr', slotValue: '<script>' }).ok).toBe(false);
    expect(validateLocalCommandArgs(A.DATA_WORK_RUN_EXPERIENCE_RECALL, { targetId: 'healthkr', taskKey: 'SELECT * FROM' }).ok).toBe(false);
  });
});

// ─── C. runtime ───────────────────────────────────────────────────────────────

const SITE = 'healthkr';
const SNAP = 's_abcd1234';
const ctx = (): VerifiedToolContext => ({ userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: 'dev-1' });
type Outcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };
type Script = Record<string, Outcome[]>;
const OK = (data: Record<string, unknown>): Outcome => ({ status: 'success', data: { siteId: SITE, ...data } });
const FAIL = (errorCode: string): Outcome => ({ status: 'failed', errorCode });
const CTX = (path: string) => OK({ active: true, ready: true, path });
const EL = (elementRef: string, role: string, name: string, extra: Record<string, unknown> = {}) => ({ elementRef, role, name, ...extra });
const HOME = [EL('e_1', 'heading', '약학정보원'), EL('e_2', 'searchbox', '약물의 제품명 또는 성분명을 입력하세요.'), EL('e_3', 'button', '검 색')];
const DETAIL = [EL('e_1', 'heading', '의약품 상세'), EL('e_4', 'tab', '허가정보'), EL('e_5', 'tab', '동일성분')];
const SAME = [EL('e_1', 'heading', '동일성분 의약품'), EL('e_6', 'table', '', { text: '제품명 업체명' })];
const INSPECT = (elements: Record<string, unknown>[]) => OK({ snapshotId: SNAP, elements, elementCount: elements.length });
const READY = { targetId: SITE, targetType: 'browser_site', state: 'ready', reusedExisting: true, openedByO4O: false, tabCount: 1, path: '/' };

interface Ledger {
  contextSaves: Record<string, unknown>[];
  contextRecalls: Record<string, unknown>[];
  assists: Record<string, any>[];
  expRecalls: Record<string, unknown>[];
  contextReply: Record<string, unknown>;
  taskKeys: string[];
  patterns: Record<string, unknown>[];
}

async function drive(db: LocalAgentDb, script: Script, ledger: Ledger, max = 60) {
  const seen: { base: string; args: Record<string, unknown> }[] = [];
  const cursors: Record<string, number> = {};
  let k = 0;
  while (k < max) {
    for (let i = 0; i < 200 && db.commands.length <= k; i += 1) await new Promise((r) => setTimeout(r, 5));
    const cmd = db.commands[k];
    if (!cmd) break;
    k += 1;
    const base = parseLocalAction(String(cmd.action)).base.replace('local.browser.dom.', '');
    const args = cmd.result_data ? JSON.parse(String(cmd.result_data)) : {};
    const reply = (data: unknown) => submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: 'success', data } as any);
    if (base === 'local.target.prepare') { await reply(READY); continue; }
    if (base === A.DATA_WORK_RUN_CONTEXT_SAVE) { ledger.contextSaves.push(args); await reply({ saved: true }); continue; }
    if (base === A.DATA_WORK_RUN_CONTEXT_RECALL) { ledger.contextRecalls.push(args); await reply(ledger.contextReply); continue; }
    if (base === A.DATA_WORK_RUN_ASSISTANCE_RECORD) { ledger.assists.push(args); await reply({ saved: true, patternCount: 0 }); continue; }
    if (base === A.DATA_WORK_RUN_EXPERIENCE_RECALL) {
      ledger.expRecalls.push(args);
      await reply(args.taskKey === null ? { taskKeys: ledger.taskKeys } : { patterns: ledger.patterns });
      continue;
    }
    if (base === A.DATA_WORK_RUN_CANDIDATE_MATCH) { await reply({ matched: false }); continue; }
    if (base.startsWith('local.data.work_run_')) { await reply({ runId: 'r_test', runStatus: 'active', saved: true }); continue; }
    seen.push({ base, args });
    const queue = script[base] ?? [FAIL('DOM_ELEMENT_NOT_FOUND')];
    const idx = Math.min(cursors[base] ?? 0, queue.length - 1);
    cursors[base] = (cursors[base] ?? 0) + 1;
    const o = queue[idx];
    await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: o.status, errorCode: o.errorCode, data: o.data } as any);
  }
  return seen;
}

function waitingRun(db: LocalAgentDb, runId: string) {
  const row: Record<string, unknown> = {
    run_id: runId, user_id: 'user-1', device_id: null, status: 'waiting_for_user', version: 3,
    created_at: new Date(), updated_at: new Date(), expires_at: new Date(Date.now() + 600_000),
  };
  const base = (db.dataSource.query as jest.Mock).getMockImplementation()!;
  (db.dataSource.query as jest.Mock).mockImplementation(async (sql: string, params: any[] = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (s.startsWith('SELECT run_id, user_id') && s.includes('FROM work_run_coordination') && params[0] === runId) return [{ ...row }];
    if (s.startsWith('UPDATE work_run_coordination') && params[0] === runId) {
      if (['completed', 'taken_over', 'expired'].includes(String(row.status))) return [[], 0];
      row.status = params[1];
      row.version = Number(row.version) + 1;
      return [[{ ...row }], 1];
    }
    return base(sql, params);
  });
}

function scripted(proposals: unknown[]): WorkPlanner & { calls: PlannerInput[] } {
  const calls: PlannerInput[] = [];
  let i = 0;
  return {
    kind: 'scripted',
    calls,
    async plan(input) {
      calls.push({ ...input, history: [...input.history] });
      const p = proposals[Math.min(i, proposals.length - 1)];
      i += 1;
      return p;
    },
  };
}

async function run(request: string, planner: WorkPlanner, script: Script, opts: Partial<Ledger> & { runId?: string } = {}) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  if (opts.runId) waitingRun(db, opts.runId);
  const ledger: Ledger = {
    contextSaves: [], contextRecalls: [], assists: [], expRecalls: [],
    contextReply: opts.contextReply ?? { found: false }, taskKeys: opts.taskKeys ?? [], patterns: opts.patterns ?? [],
  };
  const input = { request, ...(opts.runId ? { runId: opts.runId, targetHint: SITE } : {}) };
  const [result, seen] = await Promise.all([runWorkAgent(db.dataSource, ctx(), input, planner), drive(db, script, ledger)]);
  return { result, seen, ledger };
}

const SENSITIVE = ['타이레놀', '게보린', '내가 먹을 약', '그 방법 말고', '써', '찾아줘', 'e_2', 'e_5', SNAP, '제품명 업체명'];
const expectNoSensitive = (v: unknown) => {
  const json = JSON.stringify(v);
  for (const s of SENSITIVE) expect([s, json.includes(s)]).toEqual([s, false]);
};
const expectValidRecord = (a: Record<string, unknown>) => expect(validateLocalCommandArgs(A.DATA_WORK_RUN_ASSISTANCE_RECORD, a).ok).toBe(true);
const DONE = { assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } };

describe('C. runtime — 원래 업무 유지 · 도움/교정 구조 기록 · 검증 후 재사용', () => {
  it('일반 Assistance — QUESTION 때 구조만 저장 → "게보린" 재개는 같은 runId · 원래 업무로 이어가고 per_run_value 로만 남는다', async () => {
    const ask = { kind: 'value_confirmation', slots: ['drug_name'] };
    const q = scripted([{
      assessment: 'needs_user', action: { kind: 'inspect' }, neededInput: '어떤 약을 검색할까요?',
      task: 'drug_info.lookup', stage: 'search_product', strategy: { ops: [{ op: 'search' }] }, ask,
    }]);
    const first = await run('약학정보원에서 내가 먹을 약 검색해줘', q, { get_context: [CTX('/')], inspect: [INSPECT(HOME)] });
    expect(first.result.goal.status).toBe('waiting_for_user');
    expect(first.ledger.contextSaves).toEqual([{
      runId: first.result.goal.runId, targetId: SITE, taskKey: 'drug_info.lookup', stageKey: 'search_product',
      ask, strategy: { ops: [{ op: 'search' }] }, replay: null,
    }]);
    expectNoSensitive(first.ledger.contextSaves);
    expect(first.ledger.assists).toEqual([]); // 새 run · 분류된 사용자 입력 없음 → 기록 없음

    const runId = first.result.goal.runId as string;
    const planner = scripted([
      { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '게보린' }, userInput: { kind: 'assistance', askKind: 'value_confirmation', providedKind: 'value', reusability: 'per_run_value' } },
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } },
      DONE,
    ]);
    const second = await run('게보린', planner, {
      get_context: [CTX('/'), CTX('/searchDrug/search_total_result.asp')],
      inspect: [INSPECT(HOME), INSPECT(SAME)],
      set_input: [OK({ elementRef: 'e_2', hasValue: true })],
      click: [OK({ elementRef: 'e_3', navigated: true, changed: true, role: 'button', riskLevel: 'REVERSIBLE' })],
    }, { runId, contextReply: { found: true, taskKey: 'drug_info.lookup', stageKey: 'search_product', ask, strategy: { ops: [{ op: 'search' }] } } });
    expect(second.result.goal.runId).toBe(runId);
    // 값 하나면 막혔던 재생 자리만 채워 달라고 한다(Local 은 저장하지 않는다).
    expect(second.ledger.contextRecalls).toEqual([{ runId, targetId: SITE, slotValue: '게보린' }]);
    // 답변은 새 목적이 아니다 — Planner 는 원래 업무 구조와 답변을 따로 본다.
    expect(planner.calls[0].userAnswer).toBe('게보린');
    expect(planner.calls[0].resumeFrame).toMatchObject({ taskKey: 'drug_info.lookup', stageKey: 'search_product' });
    const prompt = buildPlannerUserPrompt(planner.calls[0]);
    expect(prompt).toContain('새 목적이 아니다');
    expect(prompt).toContain('업무: drug_info.lookup');
    expect(second.ledger.assists).toHaveLength(1);
    const rec = second.ledger.assists[0];
    expectValidRecord(rec);
    expect(rec.runId).toBe(runId);
    expect(rec.event).toMatchObject({
      kind: 'assistance', askKind: 'value_confirmation', providedKind: 'value', reusability: 'per_run_value',
      structured: { slots: ['drug_name'] }, correction: null, resolution: 'resolved', progressedSteps: 2,
    });
    expectNoSensitive(rec);
  });

  it('Task 의미 교정 — "그거 말고 성분 정보" 는 task_intent 교정으로 남고, 방법 대안이 없으니 not_verified(재사용 패턴 아님)', async () => {
    const planner = scripted([
      {
        assessment: 'progress', action: { kind: 'click', elementRef: 'e_4' }, task: 'drug_info.ingredient', stage: 'open_info',
        userInput: { kind: 'correction', askKind: 'target_confirmation', providedKind: 'correction', correctionType: 'task_intent', reason: 'wrong_intent', reusability: 'not_reusable' },
      },
      DONE,
    ]);
    const { result, ledger } = await run('그거 말고 성분 정보를 찾아줘', planner, {
      get_context: [CTX('/drug/detail'), CTX('/drug/detail')],
      inspect: [INSPECT(DETAIL), INSPECT(SAME)],
      click: [OK({ elementRef: 'e_4', navigated: false, changed: true, role: 'tab', riskLevel: 'REVERSIBLE' })],
    }, { runId: 'g_task01', contextReply: { found: true, taskKey: 'drug_info.side_effect', stageKey: 'open_info', ask: { kind: 'target_confirmation', slots: [] }, strategy: null } });
    expect(result.goal.runId).toBe('g_task01');
    expect(ledger.contextRecalls[0].slotValue).toBeNull(); // 지시 문장은 재생 slot 이 아니다
    const rec = ledger.assists[0];
    expectValidRecord(rec);
    expect(rec.taskKey).toBe('drug_info.ingredient');
    expect(rec.event).toMatchObject({
      kind: 'correction', providedKind: 'correction', reusability: 'not_reusable',
      correction: { type: 'task_intent', reason: 'wrong_intent', wrong: null, alternative: null },
      validation: { result: 'not_verified' },
    });
    expectNoSensitive(rec);
  });

  it('health.kr 동일성분 — "성분 추출→재검색" 을 "제품 상세→동일성분 탭" 으로 교정, 대안이 실제 성공해서 verified', async () => {
    const planner = scripted([
      {
        assessment: 'progress', action: { kind: 'click', elementRef: 'e_5' }, task: 'drug_info.same_ingredient', stage: 'find_same_ingredient', strategy: ALT,
        userInput: {
          kind: 'correction', askKind: 'procedure_order', providedKind: 'correction', correctionType: 'procedure_method', stage: 'find_same_ingredient',
          reason: 'site_feature_exists', wrong: OLD, alternative: ALT, reusability: 'reusable_knowledge',
        },
      },
      DONE,
    ]);
    const { result, ledger } = await run('그 방법 말고 제품 상세의 동일성분 탭을 써', planner, {
      get_context: [CTX('/drug/detail'), CTX('/drug/detail')],
      inspect: [INSPECT(DETAIL), INSPECT(SAME)],
      click: [OK({ elementRef: 'e_5', navigated: false, changed: true, role: 'tab', riskLevel: 'REVERSIBLE' })],
    }, {
      runId: 'g_same01',
      contextReply: { found: true, taskKey: 'drug_info.same_ingredient', stageKey: 'find_same_ingredient', ask: { kind: 'procedure_order', slots: [] }, strategy: OLD },
    });
    expect(result.goal.status).toBe('completed');
    expect(buildPlannerUserPrompt(planner.calls[0])).toContain('하던 방법: search → extract_field → re_search');
    const rec = ledger.assists[0];
    expectValidRecord(rec);
    expect(rec).toMatchObject({ runId: 'g_same01', targetId: SITE, taskKey: 'drug_info.same_ingredient' });
    expect(rec.event).toEqual({
      kind: 'correction', stageKey: 'find_same_ingredient', askKind: 'procedure_order', providedKind: 'correction', structured: null,
      resolution: 'resolved', progressedSteps: 1, reusability: 'reusable_knowledge',
      correction: { type: 'procedure_method', reason: 'site_feature_exists', wrong: OLD, alternative: ALT },
      validation: { result: 'verified', evidence: 'agent_inferred' },
    });
    expectNoSensitive(rec);
  });

  it('대안이 성공 근거와 맞지 않으면 label 없이 not_verified — Local 이 Preferred/Avoid 를 만들지 않는다', async () => {
    const planner = scripted([
      {
        assessment: 'progress', action: { kind: 'click', elementRef: 'e_4' }, task: 'drug_info.same_ingredient', stage: 'find_same_ingredient',
        userInput: { kind: 'correction', providedKind: 'correction', correctionType: 'procedure_method', alternative: ALT, wrong: OLD, reusability: 'reusable_knowledge' },
      },
      DONE,
    ]);
    const { ledger } = await run('그 방법 말고 제품 상세의 동일성분 탭을 써', planner, {
      get_context: [CTX('/drug/detail'), CTX('/drug/detail')],
      inspect: [INSPECT(DETAIL), INSPECT(DETAIL)],
      click: [OK({ elementRef: 'e_4', navigated: false, changed: true, role: 'tab', riskLevel: 'REVERSIBLE' })], // '허가정보' 탭 — 대안과 다름
    }, { runId: 'g_same02', contextReply: { found: true, taskKey: 'drug_info.same_ingredient', stageKey: 'find_same_ingredient', ask: null, strategy: OLD } });
    const rec = ledger.assists[0];
    expectValidRecord(rec);
    expect(rec.event.validation.result).toBe('not_verified');
    expect(rec.event.correction.alternative).toEqual({ ops: [{ op: 'open_detail' }, { op: 'open_tab' }] });
  });

  it('다음 같은 Task × Target — verified Avoid 방법은 실행되지 않고(AVOID_PATTERN), Preferred 가 Planner 에 보인다 · 같은 질문 없음', async () => {
    const patterns = [
      { stageKey: 'find_same_ingredient', polarity: 'preferred', strategy: ALT, verifiedCount: 1 },
      { stageKey: 'find_same_ingredient', polarity: 'avoid', strategy: OLD, verifiedCount: 1 },
    ];
    const oldWay = { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '아세트아미노펜' }, task: 'drug_info.same_ingredient', stage: 'find_same_ingredient', strategy: OLD };
    const planner = scripted([
      oldWay, // 업무 첫 선언 → 패턴 recall 후 다시 계획(실행 안 함)
      oldWay, // 그래도 옛 방법 → AVOID_PATTERN 거절
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_5' }, stage: 'find_same_ingredient', strategy: ALT },
      DONE,
    ]);
    const { result, seen, ledger } = await run('약학정보원에서 타이레놀 동일성분 제품 찾아줘', planner, {
      get_context: [CTX('/drug/detail'), CTX('/drug/detail')],
      inspect: [INSPECT([...HOME, ...DETAIL.slice(1)]), INSPECT(SAME)],
      click: [OK({ elementRef: 'e_5', navigated: false, changed: true, role: 'tab', riskLevel: 'REVERSIBLE' })],
    }, { taskKeys: ['drug_info.same_ingredient'], patterns });
    expect(result.goal.status).toBe('completed');
    expect(ledger.expRecalls).toEqual([{ targetId: SITE, taskKey: null }, { targetId: SITE, taskKey: 'drug_info.same_ingredient' }]);
    expect(planner.calls[0].knownTaskKeys).toEqual(['drug_info.same_ingredient']);
    expect(planner.calls[1].patterns).toHaveLength(2);
    const prompt = buildPlannerUserPrompt(planner.calls[1]);
    expect(prompt).toContain('## 확인된 방법(Preferred');
    expect(prompt).toContain('open_tab("동일성분")');
    expect(prompt).toContain('## 피할 방법(Avoid');
    expect(planner.calls[2].lastRejectReason).toBe('AVOID_PATTERN');
    // 옛 방법(성분명 재검색 입력)은 한 번도 나가지 않았다 · 질문(QUESTION)도 없었다.
    expect(seen.filter((s) => s.base === 'set_input')).toEqual([]);
    expect(seen.filter((s) => s.base === 'click').map((s) => s.args.elementRef)).toEqual(['e_5']);
    expect(ledger.contextSaves).toEqual([]);
    expect(ledger.assists).toEqual([]);
  });
});
