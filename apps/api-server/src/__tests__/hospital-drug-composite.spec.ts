/**
 * WO-O4O-HOSPITAL-DRUG-COMPOSITE-QUERY-ORCHESTRATION-V1 §9·§13 — 결합 오케스트레이션 테스트
 *
 *   §13 필수 문장:
 *     A web+local  "우루사정 200mg과 같은 성분의 원내약 있어?"
 *     B local only "원내에 우루사정 200mg 있어?"
 *     C web only   "우루사정 200mg 성분이 뭐야?"
 *     D local 없음  (원내 조회인데 device 미연결 → §10 파일 연결 안내)
 *     E 상품명 모호  (health.kr outcome:multiple → 후보 제시 · 원내 조회로 넘어가지 않음)
 *     F health.kr 실패 (지어내지 않음 + 원내 상품명 조회 fallback)
 *
 *   각 단계는 주입된 executor 를 지난다 — 실사용은 executeAiTool(권한·인자 게이트)을 감싼다.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { AI_TOOL_NAMES } from '../services/ai-tools/ai-tool-contract.js';
import { LOCAL_AGENT_ERROR } from '../services/local-agent/local-agent-protocol.js';
import { HEALTHKR_ERROR } from '../services/local-agent/healthkr-adapter.js';
import {
  runHospitalDrugComposite,
  planForMessage,
  extractProduct,
  extractStrength,
  mentionsHospital,
  mentionsSameIngredient,
  type CompositeToolExecutor,
  type CompositeToolResult,
} from '../services/ai-tools/hospital-drug-composite.js';
import { isCompositeHospitalDrugRequest, classifyUnifiedRequest } from '../services/ai-tools/unified-request-router.js';

// ─── 가짜 executor 빌더 ───────────────────────────────────────────────────────

interface FakeSpec {
  web?: CompositeToolResult['data'];
  webReason?: string;
  local?: CompositeToolResult['data'];
  localReason?: string;
}

function fakeExecutor(spec: FakeSpec): { exec: CompositeToolExecutor; calls: { name: string; args: any }[] } {
  const calls: { name: string; args: any }[] = [];
  const exec: CompositeToolExecutor = async (name, args) => {
    calls.push({ name, args });
    if (name === AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT) {
      if (spec.webReason) return { ok: false, tool: name, reason: spec.webReason };
      return { ok: true, tool: name, data: spec.web ?? {} };
    }
    if (name === AI_TOOL_NAMES.DATA_LOCAL_QUERY) {
      if (spec.localReason) return { ok: false, tool: name, reason: spec.localReason };
      return { ok: true, tool: name, data: spec.local ?? {} };
    }
    return { ok: false, tool: name, reason: 'UNEXPECTED_TOOL' };
  };
  return { exec, calls };
}

const A = '우루사정 200mg과 같은 성분의 원내약 있어?';
const B = '원내에 우루사정 200mg 있어?';
const C = '우루사정 200mg 성분이 뭐야?';

describe('hospital-drug composite — 문장 파싱', () => {
  test('제품 토큰 · 함량 추출', () => {
    expect(extractProduct(A)).toBe('우루사정');
    expect(extractProduct(B)).toBe('우루사정');
    expect(extractStrength(A)).toBe('200mg');
    expect(extractStrength('안녕하세요')).toBeNull();
  });

  test('원내 · 동일성분 지시 감지', () => {
    expect(mentionsHospital(A)).toBe(true);
    expect(mentionsHospital(C)).toBe(false);
    expect(mentionsSameIngredient(A)).toBe(true);
    expect(mentionsSameIngredient(B)).toBe(false);
  });

  test('plan 판정 — A=web_and_local · B=local_only · C=web_only', () => {
    expect(planForMessage(A)).toBe('web_and_local');
    expect(planForMessage(B)).toBe('local_only');
    expect(planForMessage(C)).toBe('web_only');
    expect(planForMessage('안녕')).toBe('unsupported');
  });
});

describe('unified router — composite 분기(§9)', () => {
  test('isCompositeHospitalDrugRequest — A·B 는 composite, 제품 없음/일반은 아님', () => {
    expect(isCompositeHospitalDrugRequest(A)).toBe(true);
    expect(isCompositeHospitalDrugRequest(B)).toBe(true);
    expect(isCompositeHospitalDrugRequest('원내 재고 알려줘')).toBe(false); // 제품 토큰 없음
    expect(isCompositeHospitalDrugRequest('안녕하세요')).toBe(false);
  });

  test('classifyUnifiedRequest — 등재 대상 없어도 composite 로(§13-B)', () => {
    const d = classifyUnifiedRequest(B);
    expect(d.route).toBe('composite');
    expect(d.reason).toBe('hospital_drug_composite');
  });

  test('runId 재개는 composite 보다 우선(Work resume)', () => {
    const d = classifyUnifiedRequest(B, { runId: 'run-1' });
    expect(d.route).toBe('work');
    expect(d.reason).toBe('resume');
  });
});

describe('§13-A web+local — 동일성분 식별 → 원내 성분 조회', () => {
  test('성분 확정 후 원내 성분 조회를 이어 실행하고 한 답으로 합친다', async () => {
    const { exec, calls } = fakeExecutor({
      web: {
        available: true,
        outcome: 'list',
        ingredient: '우르소데옥시콜산',
        sameIngredientCount: 3,
        sameIngredient: [{ productName: '가나정', ingredient: '우르소데옥시콜산' }],
      },
      local: {
        available: true,
        dataset: 'hospital_drug_list',
        field: 'ingredient',
        rows: [
          { product_name: '원내우루사', ingredient: '우르소데옥시콜산', strength: '200mg', dosage_form: '정' },
          { product_name: '원내데옥시', ingredient: '우르소데옥시콜산', strength: '100mg', dosage_form: '정' },
        ],
      },
    });
    const r = await runHospitalDrugComposite(exec, A);
    expect(r.plan).toBe('web_and_local');
    expect(r.ingredient).toBe('우르소데옥시콜산');
    // web 먼저(same_ingredient) → local(ingredient) 순
    expect(calls[0].name).toBe(AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT);
    expect(calls[0].args.entryPointId).toBe('healthkr.same_ingredient');
    expect(calls[1].name).toBe(AI_TOOL_NAMES.DATA_LOCAL_QUERY);
    expect(calls[1].args.field).toBe('ingredient');
    expect(calls[1].args.value).toBe('우르소데옥시콜산');
    // 하나의 답에 성분 · 동일성분 건수 · 원내 결과가 함께
    expect(r.answer).toContain('우르소데옥시콜산');
    expect(r.answer).toContain('동일성분 의약품 3건');
    expect(r.answer).toContain('원내우루사');
    // §7 함량 정렬 — 요청 200mg 이 앞
    expect(r.answer.indexOf('200mg')).toBeLessThan(r.answer.indexOf('100mg'));
    expect(r.steps.map((s) => s.source)).toEqual(['healthkr', 'local_data']);
  });
});

describe('§13-B local only — 원내 상품명 보유 조회', () => {
  test('web 단계 없이 원내 상품명 조회만', async () => {
    const { exec, calls } = fakeExecutor({
      local: { available: true, rows: [{ product_name: '우루사정', ingredient: '우르소데옥시콜산', strength: '200mg' }] },
    });
    const r = await runHospitalDrugComposite(exec, B);
    expect(r.plan).toBe('local_only');
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe(AI_TOOL_NAMES.DATA_LOCAL_QUERY);
    expect(calls[0].args.field).toBe('product_name');
    expect(r.answer).toContain('원내 보유');
    expect(r.answer).toContain('우루사정');
  });
});

describe('§13-C web only — 약학정보원 검색만', () => {
  test('원내 조회 없이 health.kr 검색', async () => {
    const { exec, calls } = fakeExecutor({
      web: { available: true, outcome: 'one', item: { productName: '우루사정', ingredient: '우르소데옥시콜산' } },
    });
    const r = await runHospitalDrugComposite(exec, C);
    expect(r.plan).toBe('web_only');
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe(AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT);
    expect(calls[0].args.entryPointId).toBe('healthkr.drug_search');
    expect(r.answer).toContain('우르소데옥시콜산');
    expect(r.answer).not.toContain('원내 약품');
  });
});

describe('§13-D local 미연결 — §10 파일 연결 안내', () => {
  test('원내 조회인데 device 없음 → [원내 약품 파일 연결]', async () => {
    const { exec } = fakeExecutor({
      local: { available: false, errorCode: LOCAL_AGENT_ERROR.NO_DEVICE },
    });
    const r = await runHospitalDrugComposite(exec, B);
    expect(r.plan).toBe('local_only');
    expect(r.answer).toContain('[원내 약품 파일 연결]');
    expect(r.answer).not.toContain('일치하는 항목');
  });
});

describe('§13-E 상품명 모호 — 후보 제시 · 원내 조회로 넘어가지 않음', () => {
  test('health.kr outcome:multiple 이면 확정하지 않고 되묻는다', async () => {
    const { exec, calls } = fakeExecutor({
      web: {
        available: true,
        outcome: 'multiple',
        candidateCount: 2,
        candidates: [
          { productName: '우루사정100mg', ingredient: '우르소데옥시콜산' },
          { productName: '우루사정200mg', ingredient: '우르소데옥시콜산' },
        ],
      },
    });
    const r = await runHospitalDrugComposite(exec, A);
    expect(r.plan).toBe('web_and_local');
    expect(r.ingredient).toBeNull();
    // web 만 호출 — 성분을 확정하지 못해 원내 조회로 넘어가지 않았다
    expect(calls).toHaveLength(1);
    expect(r.answer).toContain('여러 건');
    expect(r.answer).toContain('우루사정100mg');
    expect(r.answer).toContain('우루사정200mg');
  });
});

describe('§13-F health.kr 실패 — 지어내지 않음 + 원내 상품명 fallback', () => {
  test('web 실패 시 실패를 밝히고 원내 상품명 보유만 확인', async () => {
    const { exec, calls } = fakeExecutor({
      web: { available: false, errorCode: HEALTHKR_ERROR.DRUG_NOT_FOUND },
      local: { available: true, rows: [{ product_name: '우루사정', ingredient: '우르소데옥시콜산', strength: '200mg' }] },
    });
    const r = await runHospitalDrugComposite(exec, A);
    expect(r.plan).toBe('web_and_local');
    expect(r.ingredient).toBeNull();
    expect(calls[0].name).toBe(AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT);
    expect(calls[1].name).toBe(AI_TOOL_NAMES.DATA_LOCAL_QUERY);
    expect(calls[1].args.field).toBe('product_name');
    expect(r.answer).toContain('약학정보원');
    expect(r.answer).toContain('찾지 못했습니다');
    // 지어내지 않는다 — 없는 성분을 답에 넣지 않는다
    expect(r.answer).not.toContain('동일성분 의약품');
  });
});

describe('제품 미검출 — 되묻기', () => {
  test('제품 토큰이 없으면 실행하지 않고 다시 입력을 요청', async () => {
    const { exec, calls } = fakeExecutor({});
    const r = await runHospitalDrugComposite(exec, '원내에 뭐 있어?');
    expect(r.plan).toBe('unsupported');
    expect(calls).toHaveLength(0);
    expect(r.answer).toContain('제품명');
  });
});
