/**
 * WO-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1 §8 — /hospital-drug surface 오케스트레이션 테스트
 *
 *   공통 Goal-driven Core 를 소비하는 첫 contextual surface 의 결정론 로직을 고정한다:
 *     A "이 약의 효능을 조사해줘"        → research (grounded, 원내 Context 없음)
 *     B "우리 원내에 이 약 있어?"         → local_only (원내 Context 만, 웹 호출 없음)
 *     C "이 약과 같은 성분의 원내약 있어?" → research_and_local (조사 + 원내 Context)
 *     · 단서 없는 모호한 요청             → question (되묻기)
 *
 *   research 는 주입된 fn(runWebResearch), local 은 주입된 executor(executeAiTool) 를 지난다.
 *   특정 Source(health.kr) 를 고정하지 않는다. DB 접근 없음.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { AI_TOOL_NAMES } from '../services/ai-tools/ai-tool-contract.js';
import {
  buildHospitalResearchQuery,
  HOSPITAL_RESEARCH_NO_INVENTORY,
  type CompositeToolExecutor,
  type CompositeToolResult,
} from '../services/ai-tools/hospital-drug-composite.js';
import {
  decideHospitalDrugSurfacePlan,
  runHospitalDrugSurface,
  type SurfaceResearchResult,
  type HospitalDrugSurfaceDeps,
} from '../services/ai-tools/hospital-drug-surface.js';
import {
  mentionsHospital,
  mentionsSameIngredient,
  queryLocalRows,
  matchLocalByResearchIngredients,
  type HospitalDrugRecord,
} from '@o4o/hospital-pharmacy-core';

// ─── 가짜 deps 빌더 ───────────────────────────────────────────────────────────

interface FakeSpec {
  local?: CompositeToolResult['data'];
  localReason?: string;
  research?: SurfaceResearchResult;
}

function fakeDeps(spec: FakeSpec): {
  deps: HospitalDrugSurfaceDeps;
  localCalls: { field: string; value: string }[];
  researchCalls: string[];
} {
  const localCalls: { field: string; value: string }[] = [];
  const researchCalls: string[] = [];
  const exec: CompositeToolExecutor = async (name, args) => {
    if (name === AI_TOOL_NAMES.DATA_LOCAL_QUERY) {
      const a = args as { field: string; value: string };
      localCalls.push({ field: a.field, value: a.value });
      if (spec.localReason) return { ok: false, tool: name, reason: spec.localReason };
      return { ok: true, tool: name, data: spec.local ?? {} };
    }
    return { ok: false, tool: name, reason: 'UNEXPECTED_TOOL' };
  };
  const research = async (query: string): Promise<SurfaceResearchResult> => {
    researchCalls.push(query);
    return spec.research ?? { content: '리서치 답변', model: 'gemini-3.8-flash', grounding: { used: true, sources: [] } as never };
  };
  return { deps: { exec, research }, localCalls, researchCalls };
}

const A = '타이레놀정의 효능을 조사해줘';
const B = '우리 원내에 타이레놀정 있어?';
const C = '타이레놀정과 같은 성분의 원내약 있어?';

const LOCAL_ROWS = {
  available: true,
  rows: [
    { product_name: '원내타이레놀', ingredient: '아세트아미노펜', strength: '500mg', dosage_form: '정' },
  ],
};

describe('hospital-drug surface — plan 판정(도메인 어휘는 surface 소유)', () => {
  test('A 조사어휘 → research', () => {
    expect(decideHospitalDrugSurfacePlan(A, 'research')).toBe('research');
  });
  test('B 원내 → local_only', () => {
    expect(decideHospitalDrugSurfacePlan(B, 'question')).toBe('local_only');
  });
  test('C 동일성분+원내 → research_and_local', () => {
    expect(decideHospitalDrugSurfacePlan(C, 'question')).toBe('research_and_local');
  });
  test('제품 있으나 단서 없음 → research (표면 기본값)', () => {
    expect(decideHospitalDrugSurfacePlan('타이레놀정 어때?', 'question')).toBe('research');
  });
  test('제품도 단서도 없음 → question', () => {
    expect(decideHospitalDrugSurfacePlan('안녕하세요', 'question')).toBe('question');
  });
});

describe('§8-A research — grounded 조사만(원내 Context 없음)', () => {
  test('research fn 호출 · local 미호출 · 본문 그대로', async () => {
    const { deps, localCalls, researchCalls } = fakeDeps({
      research: { content: '타이레놀정은 해열·진통제입니다.', model: 'gemini-3.8-flash', grounding: { used: true, sources: [{}] } as never },
    });
    const r = await runHospitalDrugSurface(deps, A, 'research');
    expect(r.plan).toBe('research');
    expect(r.answer).toBe('타이레놀정은 해열·진통제입니다.');
    expect(r.usedResearch).toBe(true);
    expect(r.usedLocal).toBe(false);
    expect(r.groundingUsed).toBe(true);
    expect(r.researchModel).toBe('gemini-3.8-flash');
    expect(researchCalls).toEqual([A]);
    expect(localCalls).toEqual([]);
  });
});

describe('§8-B local_only — 원내 Context 만(웹 호출 없음)', () => {
  test('local 조회(product_name) 만 · research 미호출', async () => {
    const { deps, localCalls, researchCalls } = fakeDeps({ local: LOCAL_ROWS });
    const r = await runHospitalDrugSurface(deps, B, 'question');
    expect(r.plan).toBe('local_only');
    expect(r.usedResearch).toBe(false);
    expect(r.usedLocal).toBe(true);
    expect(r.localOutcome).toBe('rows:1');
    expect(r.answer).toContain('원내');
    expect(researchCalls).toEqual([]);
    expect(localCalls).toEqual([{ field: 'product_name', value: '타이레놀정' }]);
  });

  test('원내 미연결 → 안내 문구 · outcome=unavailable', async () => {
    const { deps } = fakeDeps({ local: { available: false, errorCode: 'LOCAL_DB_NOT_AVAILABLE' } });
    const r = await runHospitalDrugSurface(deps, B, 'question');
    expect(r.plan).toBe('local_only');
    expect(r.localOutcome).toBe('unavailable');
    expect(r.answer).toContain('원내 약품 파일');
  });
});

describe('§8-C research_and_local — 조사 + 원내 Context 결합(Source 강제 없음)', () => {
  test('research 와 local 을 모두 호출하고 한 답으로 합친다', async () => {
    const { deps, localCalls, researchCalls } = fakeDeps({
      local: LOCAL_ROWS,
      research: { content: '동일성분(아세트아미노펜) 의약품이 있습니다.', model: 'gemini-3.8-flash', grounding: { used: true, sources: [{}] } as never },
    });
    const r = await runHospitalDrugSurface(deps, C, 'question');
    expect(r.plan).toBe('research_and_local');
    expect(r.usedResearch).toBe(true);
    expect(r.usedLocal).toBe(true);
    expect(r.answer).toContain('동일성분(아세트아미노펜)');
    expect(r.answer).toContain('원내');
    // 동일성분·원내 문장은 원문이 아니라 bounded 질의로 조사한다(원내 보유 언급 금지).
    expect(researchCalls).toEqual([buildHospitalResearchQuery(C)]);
    expect(researchCalls[0]).toContain(HOSPITAL_RESEARCH_NO_INVENTORY);
    expect(localCalls).toEqual([{ field: 'product_name', value: '타이레놀정' }]);
    // Source 이름을 강제하지 않는다.
    expect(r.answer).not.toContain('health.kr');
    expect(r.answer).not.toContain('약학정보원');
  });
});

describe('suppressLocal — 원내를 클라이언트가 처리(localSource=client) · 서버 원내 조회 생략', () => {
  test('plan: 원내(local_only)·동일성분(research_and_local)이 research/공통판정으로 접힌다', () => {
    // B 원내 보유 → suppressLocal 이면 서버 local 없이 공통 판정(제품만 있으니 research).
    expect(decideHospitalDrugSurfacePlan(B, 'question', true)).toBe('research');
    // C 동일성분 → 서버는 조사만(원내 결합은 클라이언트).
    expect(decideHospitalDrugSurfacePlan(C, 'question', true)).toBe('research');
    // 조사 요청은 suppressLocal 과 무관하게 그대로 research.
    expect(decideHospitalDrugSurfacePlan(A, 'research', true)).toBe('research');
    // 단서 없으면 여전히 question.
    expect(decideHospitalDrugSurfacePlan('안녕하세요', 'question', true)).toBe('question');
  });

  test('run: 동일성분이라도 local(queryLocal) 을 부르지 않고 research 만', async () => {
    const { deps, localCalls, researchCalls } = fakeDeps({
      local: LOCAL_ROWS,
      research: { content: '동일성분 조사 결과입니다.', model: 'gemini-3.8-flash', grounding: { used: true, sources: [{}] } as never },
    });
    const r = await runHospitalDrugSurface(deps, C, 'question', true);
    expect(r.plan).toBe('research');
    expect(r.usedResearch).toBe(true);
    expect(r.usedLocal).toBe(false);
    expect(researchCalls).toEqual([buildHospitalResearchQuery(C)]);
    expect(localCalls).toEqual([]); // 원내 파일은 서버로 오지 않는다.
  });

  test('run: 원내 보유(B) 도 서버 local 없이 처리(공통 판정 → research)', async () => {
    const { deps, localCalls } = fakeDeps({ local: LOCAL_ROWS });
    const r = await runHospitalDrugSurface(deps, B, 'question', true);
    expect(r.usedLocal).toBe(false);
    expect(localCalls).toEqual([]);
  });
});

describe('question — 되묻기(공통 question modality 보존)', () => {
  test('단서 없음 → research·local 모두 미호출', async () => {
    const { deps, localCalls, researchCalls } = fakeDeps({});
    const r = await runHospitalDrugSurface(deps, '안녕하세요', 'question');
    expect(r.plan).toBe('question');
    expect(r.usedResearch).toBe(false);
    expect(r.usedLocal).toBe(false);
    expect(researchCalls).toEqual([]);
    expect(localCalls).toEqual([]);
  });
});

describe('병원 surface 기본값 — 원내가 명확하지 않고 대상이 있으면 조사(병원 surface 전용 · 공통 Router 무변경)', () => {
  test.each([
    '타이레놀 성분이 무어니',
    '타이레놀 성분이 뭐야?',
    '타이레놀성분이무어니',
    '아스피린 부작용 알려줘',
    '이부프로펜 복용법',
    '게보린 효능',
    '타이레놀은 무슨 약이야?',
    '타이레놀 부작용 알려줘',
    '아세트아미노펜 주의사항?',
  ])('%s → research (suppressLocal 무관)', (text) => {
    expect(decideHospitalDrugSurfacePlan(text, 'question', true)).toBe('research');
    expect(decideHospitalDrugSurfacePlan(text, 'question', false)).toBe('research');
  });

  test.each(['안녕하세요', '성분이 뭐야?', '부작용 알려줘', '도와줘', '무슨 약이야?', '감사합니다'])('%s → question (대상 약품 없음)', (text) => {
    expect(decideHospitalDrugSurfacePlan(text, 'question', true)).toBe('question');
  });

  test('원내·동일성분 판정은 그대로(서버 원내 경로)', () => {
    expect(decideHospitalDrugSurfacePlan('원내에 아모디핀정 있어?', 'question', false)).toBe('local_only');
    expect(decideHospitalDrugSurfacePlan('아모디핀정과 같은 성분 원내약 있어?', 'question', false)).toBe('research_and_local');
  });

  test('run: "타이레놀 성분이 무어니" 는 research 를 호출한다', async () => {
    const { deps, researchCalls, localCalls } = fakeDeps({});
    const r = await runHospitalDrugSurface(deps, '타이레놀 성분이 무어니', 'question', true);
    expect(r.plan).toBe('research');
    expect(r.usedResearch).toBe(true);
    expect(researchCalls).toEqual(['타이레놀 성분이 무어니']);
    expect(localCalls).toEqual([]);
  });
});

// ─── /hospital 병동 경로 — 약품명 어미 없는 "타이레놀" 원내 질문 2건 ─────────────────────
// 병동 화면(web-hospital-pharmacy WardPage)은 원내 판정을 브라우저에서 core 함수로 하고, 원내 행은 사용자가 고른 실제 파일에서 읽는다.
// 서버는 suppressLocal=true 로 불리며 원내 조회를 열지 않는다. 이 테스트는 그 경로가 쓰는 core 함수 + 서버 판정을 그대로 고정한다.
describe('/hospital 병동 경로 — "타이레놀"(약품명 어미 없음) 원내 · 동일성분 질문', () => {
  const rows: HospitalDrugRecord[] = [
    { product_name: '타이레놀정500mg', ingredient: '아세트아미노펜', strength: '500mg' },
    { product_name: '세토펜정', ingredient: '아세트아미노펜', strength: '325mg' },
    { product_name: '아모디핀정', ingredient: '암로디핀', strength: '5mg' },
  ];

  test('"우리 원내에 타이레놀 있어?" → 원내 조회(브라우저 local_only) · 서버 호출 없음 · 타이레놀 행 매칭', () => {
    const text = '우리 원내에 타이레놀 있어?';
    // WardPage: hospitalOnly = mentionsHospital && !mentionsSameIngredient → 서버를 부르지 않고 로컬 행으로 답한다.
    expect(mentionsHospital(text)).toBe(true);
    expect(mentionsSameIngredient(text)).toBe(false);
    // WardPage 의 needle = 조사·불용어를 뗀 2자 이상 토큰 → '타이레놀'.
    const matches = queryLocalRows(rows, ['타이레놀'], { limit: 50 });
    expect(matches.map((r) => r.product_name)).toEqual(['타이레놀정500mg']);
  });

  test('"타이레놀과 같은 성분의 원내약 있어?" → 서버 research(원내 조회 없음) + 브라우저 원내 결합', async () => {
    const text = '타이레놀과 같은 성분의 원내약 있어?';
    // WardPage: sameIngredient → 로컬 단독이 아니라 서버 조사 후 결합.
    expect(mentionsSameIngredient(text)).toBe(true);
    // 서버(suppressLocal=true): 약품명 어미가 없어도 대상('타이레놀')이 있으므로 question 이 아니라 research.
    expect(decideHospitalDrugSurfacePlan(text, 'question', true)).toBe('research');
    const { deps, researchCalls, localCalls } = fakeDeps({
      research: { content: '타이레놀의 주성분은 아세트아미노펜입니다.', model: 'gemini-3.8-flash' },
    });
    const r = await runHospitalDrugSurface(deps, text, 'question', true);
    expect(r.plan).toBe('research');
    expect(researchCalls).toEqual([buildHospitalResearchQuery(text)]);
    expect(localCalls).toEqual([]); // 원내 파일은 서버로 가지 않는다
    // 브라우저 결합: 조사 답의 성분(아세트아미노펜)으로 같은 성분 원내 행을 찾는다.
    const byIngredient = matchLocalByResearchIngredients(rows, r.answer, 50);
    expect(byIngredient.map((x) => x.product_name)).toEqual(['타이레놀정500mg', '세토펜정']);
  });
});

// ─── 결함 A — research 가 원내 재고를 지어내지 않게 한다(원내 보유의 정본 = 브라우저 Local) ─────
describe('병원 research 질의 — 원내·동일성분 문장은 원문 대신 bounded 질의(원내 보유 언급 금지)', () => {
  test.each([
    ['타이레놀과 같은 성분의 원내약 있어?', '타이레놀'],
    ['아모디핀정과 같은 성분의 원내약 있어?', '아모디핀정'],
  ])('동일성분+원내 %s → 성분·동일성분 정보만 묻고 원내 보유 판단 금지', async (text, subject) => {
    const q = buildHospitalResearchQuery(text);
    expect(q).toContain(`${subject}의 유효성분`);
    expect(q).toContain('같은 유효성분을 가진 의약품');
    expect(q).toContain(HOSPITAL_RESEARCH_NO_INVENTORY);
    // 사용자 원문("원내약 있어?")을 그대로 넘기지 않는다.
    expect(q).not.toContain('원내약');
    expect(q).not.toContain('있어?');
    const { deps, researchCalls } = fakeDeps({});
    await runHospitalDrugSurface(deps, text, 'question', true);
    expect(researchCalls).toEqual([q]);
  });

  test('원내 보유 문장이 서버 research 로 오더라도 보유 여부를 묻지 않는다', () => {
    const q = buildHospitalResearchQuery('우리 원내에 타이레놀 있어?');
    expect(q).toContain('타이레놀에 대한 의약품 정보');
    expect(q).toContain(HOSPITAL_RESEARCH_NO_INVENTORY);
    expect(q).not.toContain('원내에');
  });

  test.each(['타이레놀 성분이 무어니', '타이레놀은 무슨 약이야?', '아세트아미노펜 주의사항?', A])(
    '일반 research %s → 원문 그대로',
    async (text) => {
      expect(buildHospitalResearchQuery(text)).toBe(text);
      const { deps, researchCalls } = fakeDeps({});
      await runHospitalDrugSurface(deps, text, text === A ? 'research' : 'question', true);
      expect(researchCalls).toEqual([text]);
    },
  );

  test('판정 회귀 없음 — 원내·동일성분·question 분기 그대로', () => {
    expect(decideHospitalDrugSurfacePlan('원내에 아모디핀정 있어?', 'question', false)).toBe('local_only');
    expect(decideHospitalDrugSurfacePlan('아모디핀정과 같은 성분의 원내약 있어?', 'question', false)).toBe('research_and_local');
    expect(decideHospitalDrugSurfacePlan('타이레놀과 같은 성분의 원내약 있어?', 'question', true)).toBe('research');
    expect(decideHospitalDrugSurfacePlan('성분이 뭐야?', 'question', true)).toBe('question');
    // 브라우저 결합 판정(core)도 그대로.
    expect(mentionsSameIngredient('타이레놀과 같은 성분의 원내약 있어?')).toBe(true);
    expect(mentionsHospital('우리 원내에 타이레놀 있어?')).toBe(true);
  });
});
