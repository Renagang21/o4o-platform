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
import type { CompositeToolExecutor, CompositeToolResult } from '../services/ai-tools/hospital-drug-composite.js';
import {
  decideHospitalDrugSurfacePlan,
  runHospitalDrugSurface,
  type SurfaceResearchResult,
  type HospitalDrugSurfaceDeps,
} from '../services/ai-tools/hospital-drug-surface.js';

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
    expect(researchCalls).toEqual([C]);
    expect(localCalls).toEqual([{ field: 'product_name', value: '타이레놀정' }]);
    // Source 이름을 강제하지 않는다.
    expect(r.answer).not.toContain('health.kr');
    expect(r.answer).not.toContain('약학정보원');
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
