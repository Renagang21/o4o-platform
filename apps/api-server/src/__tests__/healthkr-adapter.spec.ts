/**
 * WO-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0 — §53 HealthKr Adapter test gates + §54 회귀
 *
 * 11 drug search · 12 no drug · 13 multiple drug · 14 same ingredient · 15 same ingredient unavailable
 * 16 pill identification · 17 pill no match · 18 pill multiple matches · 19 drug detail · 20 partial detail
 * 21 entrypoint outdated · 22 cross-origin block · 23 arbitrary selector absent · 24 arbitrary JS absent
 * 25 credential action absent · (§54) Browser DOM · Bridge · Supplier · Computer Use · routing 회귀
 *
 * agent 응답 stub 은 2026-09-12 실측한 health.kr 화면(통합검색 결과표 · 식별검색 결과표 · 상세 기본정보 표)의 형상을 그대로 쓴다.
 */

jest.setTimeout(30_000); // 명령당 결과 폴링 250ms × 최대 13 명령 + 이동/렌더 대기

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';
import { composeSiteAction, parseLocalAction } from '../services/local-agent/local-agent-protocol.js';
import {
  HEALTHKR_ADAPTER,
  HEALTHKR_ERROR,
  cleanHealthkrDetailValue,
  findHealthkrAdapterViolations,
  ingredientKeyOf,
  matchHealthkrDrug,
  parseHealthkrDetailTable,
  parseHealthkrPillTable,
  parseHealthkrSearchTable,
  splitPillConditions,
} from '../services/local-agent/healthkr-adapter.js';
import { PHARMACY_WEB_ERROR, PHARMACY_WEB_USAGE_KEYS } from '../services/local-agent/pharmacy-web-core.js';
import { AI_TOOL_NAMES, AI_TOOL_REGISTRY, type VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { FALLBACK_REASON, isCommandAuthoritative, resolveAutomationMethod } from '../services/ai-tools/automation-execution-contract.js';
import { PHARMACY_WEB_MAX_DOM_COMMANDS } from '../services/ai-tools/pharmacy-web-executor.js';
import { executeAiTool, renderToolContext, selectToolInvocationForRequest } from '../services/ai-tools/ai-tool-router.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const read = (p: string) => readFileSync(p, 'utf8');
const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*(?:\/\/|\*)[^\n]*$/gm, '').replace(/(^|[^:])\/\/[^\n]*$/gm, '$1');
const SITE = 'healthkr';
const TOOL = AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT;
const SNAP = 's_abcd1234';
const ctx = (over: Partial<VerifiedToolContext> = {}): VerifiedToolContext => ({ userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: 'dev-1', ...over });

type Outcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };

/** 명령 base 별 응답 큐. 같은 base 가 여러 번 오면 순서대로, 다 쓰면 마지막을 반복한다. */
type Script = Record<string, Outcome[]>;

async function drive(db: LocalAgentDb, script: Script, max = 40) {
  const seen: { base: string; args: Record<string, unknown> }[] = [];
  const cursors: Record<string, number> = {};
  let k = 0;
  while (k < max) {
    for (let i = 0; i < 200 && db.commands.length <= k; i += 1) await new Promise((r) => setTimeout(r, 5));
    const cmd = db.commands[k];
    if (!cmd) break;
    k += 1;
    const base = parseLocalAction(String(cmd.action)).base.replace('local.browser.dom.', '');
    seen.push({ base, args: cmd.result_data ? JSON.parse(String(cmd.result_data)) : {} });
    const queue = script[base] ?? [{ status: 'failed', errorCode: 'DOM_ELEMENT_NOT_FOUND' }];
    const idx = Math.min(cursors[base] ?? 0, queue.length - 1);
    cursors[base] = (cursors[base] ?? 0) + 1;
    const o = queue[idx];
    await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: o.status, errorCode: o.errorCode, data: o.data } as any);
  }
  return seen;
}

async function run(entryPointId: string, input: Record<string, unknown>, script: Script) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  const [result, seen] = await Promise.all([executeAiTool(db.dataSource, TOOL, { entryPointId, input }, ctx()), drive(db, script)]);
  return { result, seen, data: (result.data ?? {}) as Record<string, unknown>, db };
}
const render = (data: Record<string, unknown>) => renderToolContext({ ok: true, tool: TOOL, data }) ?? '';

const OK = (data: Record<string, unknown>): Outcome => ({ status: 'success', data: { siteId: SITE, ...data } });
const CTX = (path: string, ready = true) => OK({ active: true, ready, path });
const FIND = (matches: Record<string, unknown>[]) => OK({ snapshotId: SNAP, matches, matchCount: matches.length });
const SEARCH_BOX = FIND([{ elementRef: 'e_33', role: 'textbox', name: '약물의 제품명 또는 성분명을 입력하세요.' }]);
const SEARCH_BTNS = FIND([{ elementRef: 'e_34', role: 'button', name: '검 색' }, { elementRef: 'e_35', role: 'button', name: '상세검색' }, { elementRef: 'e_247', role: 'button', name: '검 색' }]);
const TYPED = OK({ elementRef: 'e_33', hasValue: true });
const CLICK_NAV = OK({ elementRef: 'e_34', navigated: true, changed: true, riskLevel: 'REVERSIBLE', role: 'button' });
const SEARCH_COLUMNS = ['식별/포장', '제품명', '성분/함량', '효능', '회사명', '제형', '구분', '약가', '공급유무'];
const ROW_5 = ['식별이미지', '아모디핀정5mg', 'Amlodipine Camsylate 7.841mg', '', '한미약품', '정제', '전문', '390원/1정', 'O'];
const ROW_25 = ['식별이미지', '아모디핀정2.5mg', 'Amlodipine Camsylate 3.921mg', '', '한미약품', '정제', '전문', '261원/1정', 'O'];
const ROW_AMOSARTAN = ['식별이미지', '아모잘탄정5/50mg', 'Amlodipine Camsylate 7.841mg 외 1', '', '한미약품', '정제', '전문', '767원/1정', 'O'];
const TABLE = (rows: string[][]) => OK({ columns: SEARCH_COLUMNS, rows, rowCount: rows.length });

/** 통합검색 1회 스크립트: get_context(ready) → find(box) → set_input → find(btn) → click → get_context(결과) → read_table. */
const searchScript = (rows: string[][], extra: Partial<Script> = {}): Script => ({
  get_context: [CTX('/searchDrug/search_detail.asp'), CTX('/searchDrug/search_total_result.asp')],
  find: [SEARCH_BOX, SEARCH_BTNS],
  set_input: [TYPED],
  click: [CLICK_NAV],
  read_table: [TABLE(rows)],
  ...extra,
});

// ─── 11~13. drug search ──────────────────────────────────────────────────────

describe('11. drug search (§21·§22)', () => {
  it('통합검색 → 결과표 → 제품 1건: 명령 순서 고정 · 전부 #healthkr · 검색어는 set_input 인자에만', async () => {
    const { seen, data } = await run('healthkr.drug_search', { query: '아모디핀정5mg' }, searchScript([ROW_5, ROW_25]));
    expect(seen.map((s) => s.base)).toEqual(['get_context', 'find', 'set_input', 'find', 'click', 'get_context', 'read_table']);
    expect(seen.length).toBeLessThanOrEqual(PHARMACY_WEB_MAX_DOM_COMMANDS);
    expect(seen[1].args).toEqual({ query: { placeholder: '제품명 또는 성분명' } });
    expect(seen[2].args).toEqual({ elementRef: 'e_33', snapshotId: SNAP, text: '아모디핀정5mg' });
    expect(seen[4].args).toEqual({ elementRef: 'e_34', snapshotId: SNAP }); // 헤더 "검 색" (문서 순서상 첫 정확 일치)
    expect(seen.filter((s) => JSON.stringify(s.args).includes('아모디핀')).map((s) => s.base)).toEqual(['set_input']);
    for (const s of seen) expect(JSON.stringify(s.args)).not.toMatch(/selector|xpath|url|javascript|drug_cd/i);
    expect(data.available).toBe(true);
    expect(data.outcome).toBe('one');
    expect(data.item).toEqual({ productName: '아모디핀정5mg', ingredient: 'Amlodipine Camsylate 7.841mg', company: '한미약품', dosageForm: '정제', category: '전문', price: '390원/1정', supplied: 'O' });
    expect(data.source).toBe('webpage');
    const block = render(data);
    expect(block).toContain('[webpage]');
    expect(block).toContain('아모디핀정5mg');
    expect(block).toContain('제품명을 클릭해 상세 페이지를 연 뒤');
    // usage event — 허용 키뿐, 검색어 없음(§14·§15)
    const calls = (logger.info as jest.Mock).mock.calls.filter((c) => c[0] === 'pharmacy-web usage');
    const ev = calls[calls.length - 1][1];
    expect(Object.keys(ev).sort()).toEqual([...PHARMACY_WEB_USAGE_KEYS].sort());
    expect(ev).toMatchObject({ siteId: SITE, entryPointId: 'healthkr.drug_search', intent: 'drug_search', status: 'success', errorCode: null, domCommands: 7 });
    expect(JSON.stringify(ev)).not.toContain('아모디핀');
  });

  it('표 해석 · 매칭 순수 함수', () => {
    const p = parseHealthkrSearchTable(SEARCH_COLUMNS, [ROW_5, ROW_25]);
    expect(p.ok).toBe(true);
    expect(p.items).toHaveLength(2);
    expect(matchHealthkrDrug(p.items, '아모디핀정5mg')).toEqual({ status: 'one', index: 0, candidateCount: 1 });
    expect(matchHealthkrDrug(p.items, '아모디핀정 5mg')).toEqual({ status: 'one', index: 0, candidateCount: 1 });
    expect(matchHealthkrDrug(p.items, '아모디핀')).toEqual({ status: 'multiple', candidateCount: 2 });
    // 제품명에 검색어가 없어도 사이트가 결과를 줬으면 후보(성분명 · 영문명 검색). 결과 0 일 때만 none.
    expect(matchHealthkrDrug(p.items, 'Amlodipine')).toEqual({ status: 'multiple', candidateCount: 2 });
    expect(matchHealthkrDrug([p.items[0]], 'Amlodipine')).toEqual({ status: 'one', index: 0, candidateCount: 1 });
    expect(matchHealthkrDrug([], '노바스크')).toEqual({ status: 'none', candidateCount: 0 });
    expect(parseHealthkrSearchTable(['번호', '비고'], [['1', '-']]).ok).toBe(false);
    expect(findHealthkrAdapterViolations()).toEqual([]);
  });
});

describe('12. no drug (§22·§48)', () => {
  it('결과 행이 없거나 표 자체가 없으면 HEALTHKR_DRUG_NOT_FOUND', async () => {
    const a = await run('healthkr.drug_search', { query: '없는약정' }, searchScript([]));
    expect(a.data.available).toBe(false);
    expect(a.data.errorCode).toBe(HEALTHKR_ERROR.DRUG_NOT_FOUND);
    expect(render(a.data)).toContain('검색 결과에 해당 의약품이 없습니다');
    const b = await run('healthkr.drug_search', { query: '없는약정' }, searchScript([], { read_table: [{ status: 'failed', errorCode: 'DOM_ELEMENT_NOT_FOUND' }] }));
    expect(b.data.errorCode).toBe(HEALTHKR_ERROR.DRUG_NOT_FOUND);
    expect(b.data.rowCount).toBe(0);
  });
});

describe('13. multiple drug (§23)', () => {
  it('후보 여럿 → HEALTHKR_MULTIPLE_MATCHES + 후보 요약(≤10) · 자동 확정 없음', async () => {
    const { data } = await run('healthkr.drug_search', { query: '아모디핀' }, searchScript([ROW_5, ROW_25]));
    expect(data.available).toBe(true);
    expect(data.outcome).toBe('multiple');
    expect(data.code).toBe(HEALTHKR_ERROR.MULTIPLE_MATCHES);
    expect(data.candidateCount).toBe(2);
    expect((data.candidates as unknown[]).length).toBe(2);
    expect(data.item).toBeUndefined();
    const block = render(data);
    expect(block).toContain('하나를 임의로 고르지 않았습니다');
    expect(block).toContain('아모디핀정2.5mg');
  });
});

// ─── 14~15. same ingredient ─────────────────────────────────────────────────

describe('14. same ingredient (§24·§25)', () => {
  it('제품 검색 → 성분명 추출 → 성분명 재검색(robots Disallow 페이지 대신) → 다른 제품 목록', async () => {
    const script: Script = {
      get_context: [CTX('/'), CTX('/searchDrug/search_total_result.asp'), CTX('/searchDrug/search_total_result.asp'), CTX('/searchDrug/search_total_result.asp')],
      find: [SEARCH_BOX, SEARCH_BTNS, SEARCH_BOX, SEARCH_BTNS],
      set_input: [TYPED, TYPED],
      click: [CLICK_NAV, CLICK_NAV],
      read_table: [TABLE([ROW_5, ROW_25]), TABLE([ROW_AMOSARTAN, ROW_5, ROW_25, ['식별이미지', '코자엑스큐정5/50mg', 'Amlodipine Camsylate 7.84mg 외 1', '', '한국오가논', '정제', '전문', '780원/1정', 'O']])],
    };
    const { seen, data } = await run('healthkr.same_ingredient', { query: '아모디핀정5mg' }, script);
    const inputs = seen.filter((s) => s.base === 'set_input').map((s) => String(s.args.text));
    expect(inputs).toEqual(['아모디핀정5mg', 'Amlodipine Camsylate']);
    // robots Disallow 경로로 가는 명령이 없다 — 링크 클릭이 아니라 검색 재실행이다.
    expect(seen.filter((s) => s.base === 'click')).toHaveLength(2);
    expect(data.available).toBe(true);
    expect(data.outcome).toBe('list');
    expect(data.ingredient).toBe('Amlodipine Camsylate');
    expect((data.item as { productName: string }).productName).toBe('아모디핀정5mg');
    expect(data.sameIngredientCount).toBe(3);
    expect((data.sameIngredient as { productName: string }[]).map((i) => i.productName)).toEqual(['아모잘탄정5/50mg', '아모디핀정2.5mg', '코자엑스큐정5/50mg']);
    const block = render(data);
    expect(block).toContain('염(salt)·함량이 다른 제품이 섞일 수 있습니다');
    expect(ingredientKeyOf('Amlodipine Camsylate 7.841mg')).toEqual({ name: 'Amlodipine Camsylate', compound: false });
    expect(ingredientKeyOf('Amlodipine Camsylate 7.841mg 외 1')).toEqual({ name: 'Amlodipine Camsylate', compound: true });
    expect(ingredientKeyOf('')).toEqual({ name: '', compound: false });
  });
});

describe('15. same ingredient unavailable (§25·§48)', () => {
  it('복합제("외 1") · 재검색에 다른 제품 없음 → HEALTHKR_SAME_INGREDIENT_UNAVAILABLE; 대상이 여럿이면 되묻는다', async () => {
    const a = await run('healthkr.same_ingredient', { query: '아모잘탄정5/50mg' }, searchScript([ROW_AMOSARTAN]));
    expect(a.data.errorCode).toBe(HEALTHKR_ERROR.SAME_INGREDIENT_UNAVAILABLE);
    expect(a.data.compound).toBe(true);
    expect(a.seen.filter((s) => s.base === 'set_input')).toHaveLength(1); // 재검색 없음
    const b = await run('healthkr.same_ingredient', { query: '아모디핀정5mg' }, {
      get_context: [CTX('/'), CTX('/searchDrug/search_total_result.asp')],
      find: [SEARCH_BOX, SEARCH_BTNS, SEARCH_BOX, SEARCH_BTNS],
      set_input: [TYPED],
      click: [CLICK_NAV],
      read_table: [TABLE([ROW_5]), TABLE([ROW_5])],
    });
    expect(b.data.errorCode).toBe(HEALTHKR_ERROR.SAME_INGREDIENT_UNAVAILABLE);
    expect(render(b.data)).toContain('동일성분 목록을 만들지 못했습니다');
    const c = await run('healthkr.same_ingredient', { query: '아모디핀' }, searchScript([ROW_5, ROW_25]));
    expect(c.data.outcome).toBe('multiple');
    expect(c.data.code).toBe(HEALTHKR_ERROR.MULTIPLE_MATCHES);
  });
});

// ─── 16~18. pill identification ─────────────────────────────────────────────

const PILL_COLUMNS = ['식별이미지', '식별표시 (앞/뒤)', '제형', '크기(mm)', '제품명/성분명', '회사명', '출력담기'];
const PILL_ROW = ['의약품이미지', 'HMP / AM 5', '나정', '8.32', '6.06', '3.13', '아모디핀정5mg Amlodipine Camsylate 7.841mg', '한미약품(주)', 't'];
const PILL_ROW_2 = ['의약품이미지', 'HMP / AM 10', '나정', '9.1', '6.5', '3.5', '아모디핀정10mg Amlodipine Camsylate 15.68mg', '한미약품(주)', 't'];
const pillScript = (rows: string[][], extra: Partial<Script> = {}): Script => ({
  get_context: [CTX('/'), CTX('/searchIdentity/search.asp'), CTX('/searchIdentity/search.asp')],
  find: [
    FIND([{ elementRef: 'e_44', role: 'link', name: '식별검색' }]), // 헤더 링크
    FIND([{ elementRef: 'e_81', role: 'textbox', name: '문자1' }]),
    FIND([{ elementRef: 'e_86', role: 'textbox', name: '문자2' }]),
    FIND([{ elementRef: 'e_34', role: 'button', name: '검 색' }, { elementRef: 'e_236', role: 'button', name: '다시 입력' }, { elementRef: 'e_237', role: 'button', name: '검 색' }]),
    FIND([{ elementRef: 'e_250', role: 'table', text: '식별이미지 식별표시 (앞/뒤) 제형 크기(mm)' }]),
  ],
  set_input: [OK({ elementRef: 'e_81', hasValue: true }), OK({ elementRef: 'e_86', hasValue: true })],
  click: [OK({ elementRef: 'e_44', navigated: true, role: 'link', riskLevel: 'REVERSIBLE' }), OK({ elementRef: 'e_237', changed: true, role: 'button', riskLevel: 'REVERSIBLE' })],
  read_table: [OK({ columns: PILL_COLUMNS, rows, rowCount: rows.length })],
  ...extra,
});

describe('16. pill identification (§27~§31)', () => {
  it('헤더 링크로 진입 → 문자1/문자2 입력 → 폼의 마지막 검색 버튼 → 결과표(ref) → 후보 1건도 "후보"', async () => {
    const { seen, data } = await run('healthkr.pill_identification', { frontMark: 'HMP', backMark: 'AM', color: '흰색', shape: '원형' }, pillScript([PILL_ROW]));
    expect(seen.map((s) => s.base)).toEqual(['get_context', 'find', 'click', 'get_context', 'find', 'set_input', 'find', 'set_input', 'find', 'click', 'get_context', 'find', 'read_table']);
    expect(seen[1].args).toEqual({ query: { role: 'link', text: '식별검색' } });
    expect(seen[9].args).toEqual({ elementRef: 'e_237', snapshotId: SNAP }); // 마지막 "검 색"
    expect(seen[11].args).toEqual({ query: { role: 'table', text: '식별표시' } });
    expect(seen[12].args).toEqual({ elementRef: 'e_250', snapshotId: SNAP });
    expect(data.available).toBe(true);
    expect(data.outcome).toBe('one');
    expect(data.applied).toEqual(['frontMark', 'backMark']);
    expect(data.unapplied).toEqual(['color', 'shape']); // 커스텀 컨트롤 — V0 미적용, 사용자에게 알린다
    expect(data.candidates).toEqual([{ marks: 'HMP / AM 5', dosageForm: '나정', size: { long: '8.32', short: '6.06', thick: '3.13' }, product: '아모디핀정5mg Amlodipine Camsylate 7.841mg', company: '한미약품(주)' }]);
    const block = render(data);
    expect(block).toContain('후보');
    expect(block).toContain('약을 확정하지 않습니다');
    expect(block).not.toMatch(/이 약은 .*입니다|확정된 의약품|확인되었습니다/);
    expect(block).toContain('적용하지 못한 조건: 색상 · 모양');
    expect(splitPillConditions({ frontMark: 'A', line: '없음' })).toEqual({ applied: ['frontMark'], unapplied: ['line'] });
    // 이미 식별검색 페이지면 링크 클릭을 건너뛴다.
    const already = await run('healthkr.pill_identification', { frontMark: 'HMP' }, pillScript([PILL_ROW], { get_context: [CTX('/searchIdentity/search.asp')], find: [FIND([{ elementRef: 'e_81', role: 'textbox', name: '문자1' }]), FIND([{ elementRef: 'e_237', role: 'button', name: '검 색' }]), FIND([{ elementRef: 'e_250', role: 'table', text: '식별표시' }])], click: [OK({ elementRef: 'e_237', changed: true, role: 'button' })] }));
    expect(already.seen.map((s) => s.base)).toEqual(['get_context', 'find', 'set_input', 'find', 'click', 'get_context', 'find', 'read_table']);
  });

  it('식별검색 결과표 해석 — 크기 3셀 펼침 처리', () => {
    const p = parseHealthkrPillTable(PILL_COLUMNS, [PILL_ROW]);
    expect(p.ok).toBe(true);
    expect(p.candidates[0].product).toBe('아모디핀정5mg Amlodipine Camsylate 7.841mg');
    expect(p.candidates[0].company).toBe('한미약품(주)');
    expect(parseHealthkrPillTable(['번호'], [['1']]).ok).toBe(false);
  });
});

describe('17. pill no match (§48)', () => {
  it('결과표가 없거나 행이 없으면 HEALTHKR_PILL_NO_MATCH — 재시도 · fallback 없음', async () => {
    const a = await run('healthkr.pill_identification', { frontMark: 'ZZZ' }, pillScript([], { find: [FIND([{ elementRef: 'e_44', role: 'link', name: '식별검색' }]), FIND([{ elementRef: 'e_81', role: 'textbox', name: '문자1' }]), FIND([{ elementRef: 'e_237', role: 'button', name: '검 색' }]), FIND([])] }));
    expect(a.data.errorCode).toBe(HEALTHKR_ERROR.PILL_NO_MATCH);
    expect(a.data.fallbackReason).toBeNull();
    expect(render(a.data)).toContain('검색된 후보가 없습니다');
    const b = await run('healthkr.pill_identification', { frontMark: 'ZZZ' }, pillScript([], { find: [FIND([{ elementRef: 'e_44', role: 'link', name: '식별검색' }]), FIND([{ elementRef: 'e_81', role: 'textbox', name: '문자1' }]), FIND([{ elementRef: 'e_237', role: 'button', name: '검 색' }]), FIND([{ elementRef: 'e_250', role: 'table', text: '식별표시' }])] }));
    expect(b.data.errorCode).toBe(HEALTHKR_ERROR.PILL_NO_MATCH);
  });
});

describe('18. pill multiple matches (§31·§48)', () => {
  it('후보 여럿 → HEALTHKR_PILL_MULTIPLE_MATCHES + 후보 목록 · 확정 없음', async () => {
    const { data } = await run('healthkr.pill_identification', { frontMark: 'HMP', backMark: 'AM' }, pillScript([PILL_ROW, PILL_ROW_2]));
    expect(data.available).toBe(true);
    expect(data.outcome).toBe('multiple');
    expect(data.code).toBe(HEALTHKR_ERROR.PILL_MULTIPLE_MATCHES);
    expect(data.candidateCount).toBe(2);
    expect(render(data)).toContain('HMP / AM 10');
  });
});

// ─── 19~20. drug detail ─────────────────────────────────────────────────────

const DETAIL_COLUMNS = ['제품명', '아모디핀정5mg Amodipin Tab. 5mg 복사', '식별 이미지 등록 (2004-12-22) HMP AM 5 포장 이미지'];
const DETAIL_ROWS = [
  ['성분 / 함량', '복사 동일성분 의약품 Amlodipine Camsylate 암로디핀캄실산염 7.841mg (암로디핀(으)로서 5mg)'],
  ['성상', '연한 노란색의 원형 정제'],
  ['회사명', '한미약품 Hanmi Pharm.'],
  ['구분', '전문의약품'],
  ['급여', '급여 390원/1정'],
];
const detailScript = (extra: Partial<Script> = {}): Script => ({
  get_context: [CTX('/searchDrug/result_drug.asp')],
  read_table: [OK({ columns: DETAIL_COLUMNS, rows: DETAIL_ROWS, rowCount: DETAIL_ROWS.length })],
  find: [FIND([{ elementRef: 'e_357', role: 'heading', text: '효능 · 효과' }]), FIND([{ elementRef: 'e_362', role: 'heading', text: '용법 · 용량' }]), FIND([{ elementRef: 'e_367', role: 'heading', text: '사용상의 주의사항' }])],
  ...extra,
});

describe('19. drug detail (§32·§33·§34)', () => {
  it('사용자가 연 상세 페이지의 기본정보 표 + 섹션 존재 확인 — 전체 설명서 dump 없음', async () => {
    const { seen, data } = await run('healthkr.drug_detail', {}, detailScript());
    expect(seen.map((s) => s.base)).toEqual(['get_context', 'read_table', 'find', 'find', 'find']);
    expect(seen.filter((s) => s.base === 'read_text')).toHaveLength(0); // 본문 텍스트를 읽지 않는다(§33)
    expect(data.available).toBe(true);
    expect(data.fields).toEqual({
      productName: '아모디핀정5mg Amodipin Tab. 5mg',
      // DOM 계약 셀 상한 60자(pickSafeDomInfo) — 긴 값은 잘린다(known limitation).
      ingredient: 'Amlodipine Camsylate 암로디핀캄실산염 7.841mg (암로디핀(으)로서',
      company: '한미약품 Hanmi Pharm.',
      dosageForm: '연한 노란색의 원형 정제',
      category: '전문의약품',
      insurance: '급여 390원/1정',
    });
    expect(data.sections).toEqual({ efficacy: true, dosage: true, precautions: true });
    const block = render(data);
    expect(block).toContain('효능·효과 · 용법·용량 · 사용상의 주의사항');
    expect(block).toContain('섹션 본문은 V0 에서 읽지 않습니다');
    expect(cleanHealthkrDetailValue('복사 동일성분 의약품 Amlodipine Camsylate 7.841mg')).toBe('Amlodipine Camsylate 7.841mg');
  });

  it('상세 페이지가 아니면 PHARMACY_WEB_USER_ACTION_REQUIRED — 사용자가 제품명을 클릭해 열어야 한다(td onclick 은 DOM V0 밖)', async () => {
    const { seen, data } = await run('healthkr.drug_detail', {}, { get_context: [CTX('/searchDrug/search_total_result.asp')] });
    expect(seen.map((s) => s.base)).toEqual(['get_context']);
    expect(data.errorCode).toBe(PHARMACY_WEB_ERROR.USER_ACTION_REQUIRED);
    expect(render(data)).toContain('직접 클릭해 상세 페이지를 연 뒤');
    // robots Disallow 페이지(동일성분)에 서 있어도 읽지 않는다.
    const r = await run('healthkr.drug_detail', {}, { get_context: [CTX('/searchDrug/result_sunb.asp')] });
    expect(r.data.errorCode).toBe(PHARMACY_WEB_ERROR.USER_ACTION_REQUIRED);
  });
});

describe('20. partial detail (§22·§32)', () => {
  it('일부 행 · 일부 섹션만 있어도 있는 것만 채우고 없는 것은 빈 값/false — 추측하지 않는다', async () => {
    const { data } = await run('healthkr.drug_detail', {}, detailScript({
      read_table: [OK({ columns: ['제품명', '타이레놀정500mg'], rows: [['회사명', '한국존슨앤드존슨']], rowCount: 1 })],
      find: [FIND([{ elementRef: 'e_1', role: 'heading', text: '효능 · 효과' }]), FIND([]), FIND([])],
    }));
    expect(data.available).toBe(true);
    expect(data.fields).toEqual({ productName: '타이레놀정500mg', ingredient: '', company: '한국존슨앤드존슨', dosageForm: '', category: '', insurance: '' });
    expect(data.sections).toEqual({ efficacy: true, dosage: false, precautions: false });
    expect(parseHealthkrDetailTable([], []).productName).toBe('');
    const none = await run('healthkr.drug_detail', {}, detailScript({ read_table: [OK({ columns: ['번호', '1'], rows: [], rowCount: 0 })] }));
    expect(none.data.errorCode).toBe(HEALTHKR_ERROR.DETAIL_UNAVAILABLE);
  });
});

// ─── 21~22. outdated · cross-origin ─────────────────────────────────────────

describe('21. entrypoint outdated (§42)', () => {
  it('검색창 · 결과표 헤더 · 진입 링크가 사라지면 PHARMACY_WEB_ENTRYPOINT_OUTDATED + fallbackReason(실행 없음)', async () => {
    const a = await run('healthkr.drug_search', { query: '아모디핀정' }, { get_context: [CTX('/')], find: [FIND([]), FIND([])] });
    expect(a.data.errorCode).toBe(PHARMACY_WEB_ERROR.ENTRYPOINT_OUTDATED);
    expect(a.data.fallbackReason).toBe(FALLBACK_REASON.DOM_ELEMENT_NOT_FOUND);
    expect(a.data.fallbackExecuted).toBe(false);
    expect(a.data.fallbackDecision).toBe('NO_METHOD_AVAILABLE');
    expect(a.db.commands.filter((c) => String(c.action).startsWith('local.computer.'))).toHaveLength(0);
    const b = await run('healthkr.drug_search', { query: '아모디핀정' }, searchScript([], { read_table: [OK({ columns: ['번호', '비고'], rows: [['1', '-']], rowCount: 1 })] }));
    expect(b.data.errorCode).toBe(PHARMACY_WEB_ERROR.ENTRYPOINT_OUTDATED);
    // 클릭 후 도착 경로가 entryPath 가 아니면(READY_POLLS 만큼 확인 후) outdated
    const c = await run('healthkr.pill_identification', { frontMark: 'HMP' }, { get_context: [CTX('/'), CTX('/'), CTX('/'), CTX('/'), CTX('/')], find: [FIND([{ elementRef: 'e_44', role: 'link', name: '식별검색' }])], click: [OK({ elementRef: 'e_44', navigated: true, role: 'link' })] });
    expect(c.data.errorCode).toBe(PHARMACY_WEB_ERROR.ENTRYPOINT_OUTDATED);
    expect(render(c.data)).toContain('화면 구조가 O4O 가 아는 것과 달라');
  });
});

describe('22. cross-origin block (§43·§45)', () => {
  it('탭이 다른 siteId 를 보고하거나 DOM 이 등재 밖 이동을 막으면 PHARMACY_WEB_CROSS_ORIGIN', async () => {
    const a = await run('healthkr.drug_search', { query: '아모디핀정' }, { get_context: [{ status: 'success', data: { siteId: 'o4o.neture', active: true, ready: true, path: '/' } }] });
    expect(a.seen).toHaveLength(1);
    expect(a.data.errorCode).toBe(PHARMACY_WEB_ERROR.CROSS_ORIGIN);
    const b = await run('healthkr.pill_identification', { frontMark: 'HMP' }, { get_context: [CTX('/')], find: [FIND([{ elementRef: 'e_44', role: 'link', name: '식별검색' }])], click: [{ status: 'failed', errorCode: 'DOM_CROSS_ORIGIN_BLOCKED' }] });
    expect(b.data.errorCode).toBe(PHARMACY_WEB_ERROR.CROSS_ORIGIN);
    expect(render(b.data)).toContain('등록된 사이트 밖');
    // 결과에는 페이지 텍스트가 데이터로만 실린다 — 정책 근거가 되지 않는다.
    expect(isCommandAuthoritative('webpage')).toBe(false);
    expect(resolveAutomationMethod({ availableMethods: ['browser_dom', 'computer_use'], riskLevel: 'REVERSIBLE', fallbackReason: FALLBACK_REASON.DOM_ELEMENT_NOT_FOUND }).method).toBe('browser_dom');
  });
});

// ─── 23~25. arbitrary selector · JS · credential ────────────────────────────

describe('23~25. arbitrary selector · JS · credential 부재 (§19·§39·§46)', () => {
  const files = ['pharmacy-web-core.ts', 'healthkr-adapter.ts'].map((f) => join(__dirname, '..', 'services', 'local-agent', f)).concat(join(__dirname, '..', 'services', 'ai-tools', 'pharmacy-web-executor.ts'));

  it('23. Adapter 정의의 find 조건은 DOM 5키뿐 · selector/xpath 칸 없음', () => {
    const all = [...HEALTHKR_ADAPTER.search.box, ...HEALTHKR_ADAPTER.search.submit, ...HEALTHKR_ADAPTER.pill.front, ...HEALTHKR_ADAPTER.pill.back, ...HEALTHKR_ADAPTER.pill.submit, HEALTHKR_ADAPTER.pill.resultTable];
    for (const q of all) for (const k of Object.keys(q)) expect(['role', 'text', 'name', 'label', 'placeholder']).toContain(k);
    expect(JSON.stringify(HEALTHKR_ADAPTER)).not.toMatch(/selector|xpath|querySelector|https?:|javascript/i);
    expect(findHealthkrAdapterViolations({ ...HEALTHKR_ADAPTER, search: { ...HEALTHKR_ADAPTER.search, box: [{ selector: '#q' } as any] } })).toContain('find 조건은 DOM 계약 5키 형상만(§46)');
  });

  it('24. 코어 · Adapter · executor 소스에 eval · new Function · executeScript · document. · window. 없음', () => {
    for (const f of files) {
      const src = codeOnly(read(f));
      expect(src).not.toMatch(/\beval\s*\(|new\s+Function|executeScript|querySelector|document\.|window\.|chrome\./);
    }
  });

  it('25. 로그인 · 비밀번호 · cookie · token 을 다루는 코드 없음 · 비밀번호 필드 거절은 사용자 행동 요청으로 끝난다', async () => {
    for (const f of files) {
      const src = codeOnly(read(f));
      expect(src).not.toMatch(/password\s*[:=]|credential|cookie|localStorage|sessionStorage|\btoken\b|login\s*\(/i);
    }
    const { seen, data } = await run('healthkr.drug_search', { query: '아모디핀정' }, { get_context: [CTX('/member/login.asp')], find: [SEARCH_BOX], set_input: [{ status: 'failed', errorCode: 'DOM_USER_ACTION_REQUIRED' }] });
    expect(seen.map((s) => s.base)).toEqual(['get_context', 'find', 'set_input']);
    expect(data.errorCode).toBe(PHARMACY_WEB_ERROR.USER_ACTION_REQUIRED);
    expect(data.fallbackReason).toBeNull();
    expect(render(data)).toContain('O4O 가 대신하지 않습니다');
  });
});

// ─── §54 회귀 ────────────────────────────────────────────────────────────────

describe('§54 regression — DOM · Bridge · Supplier · Computer Use · routing', () => {
  it('기존 tool 수 불변(DOM 8 · computer 4 · 열기 2 · supplier 1) · 공급처 · 네뚜레 문장은 약국 웹 축에 걸리지 않는다', () => {
    expect(AI_TOOL_REGISTRY.filter((t) => t.name.startsWith('local.browser.dom.'))).toHaveLength(8);
    expect(AI_TOOL_REGISTRY.filter((t) => t.name.startsWith('local.computer.'))).toHaveLength(4);
    expect(AI_TOOL_REGISTRY.filter((t) => t.name.startsWith('local.supplier.'))).toHaveLength(1);
    expect(selectToolInvocationForRequest('샘플 공급처에서 "아크클리어크림 20g" 가격 확인해줘', ctx())!.tool).toBe(AI_TOOL_NAMES.SUPPLIER_PRODUCT_LOOKUP);
    expect(selectToolInvocationForRequest("네뚜레에서 '검색' 버튼 눌러줘", ctx())!.tool).toBe(AI_TOOL_NAMES.DOM_CLICK);
    expect(selectToolInvocationForRequest('네뚜레 열어줘', ctx())!.tool).toBe(AI_TOOL_NAMES.BROWSER_OPEN_SITE);
    expect(selectToolInvocationForRequest('메모장 열려 있어?', ctx())!.tool).toBe(AI_TOOL_NAMES.FIND_APPLICATION);
    // 약학정보원 문장은 DOM 축(find/read)으로 새지 않는다.
    expect(selectToolInvocationForRequest('약학정보원에서 "아모디핀정" 찾아줘', ctx())!.tool).toBe(TOOL);
    // agent · 확장에 사이트 특화 규칙 없음 — 등재부 사본만 늘었다.
    const agent = read(join(REPO_ROOT, 'tools', 'o4o-local-agent', 'src', 'handlers.mjs'));
    const ext = read(join(REPO_ROOT, 'tools', 'o4o-chrome-extension', 'src', 'content-script.js'));
    expect(agent).not.toMatch(/healthkr|health\.kr/);
    expect(codeOnly(ext).match(/health\.kr/g) ?? []).toHaveLength(1); // origin → siteId 표 한 줄뿐
    expect(composeSiteAction('local.browser.dom.find', SITE)).toBe('local.browser.dom.find#healthkr');
  });
});
