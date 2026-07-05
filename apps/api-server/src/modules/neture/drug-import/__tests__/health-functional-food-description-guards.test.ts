/**
 * HFF Store Description Guards — unit tests
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-DRYRUN-V1 §4
 */

import {
  computePreFilterFlags,
  isGenerationEligible,
  sourceFidelityGuard,
  medicineLikeWordingGuard,
  draftQualityGuard,
  classifyPreGeneration,
  classifyDraft,
} from '../health-functional-food-description-guards';
import type { HealthFunctionalFoodDescriptionSeed, HealthFunctionalFoodStoreDescriptionDraft } from '../health-functional-food-store-description.prompt';

function seed(p: Partial<HealthFunctionalFoodDescriptionSeed>): HealthFunctionalFoodDescriptionSeed {
  return {
    sttemntNo: '1', productName: '테스트', manufacturerName: '업체',
    mainFunction: null, functionalClaims: [], intake: null, caution: null, baseStandard: null,
    sourceFields: [], missingFields: [], ...p,
  };
}
function draft(p: Partial<HealthFunctionalFoodStoreDescriptionDraft>): HealthFunctionalFoodStoreDescriptionDraft {
  return {
    title: 't', summary: '요약 문장입니다 충분히 길게 작성한 요약',
    sections: { mainFunction: [], howToTake: [], caution: [] },
    sourceTrace: { usedFields: [], omittedFields: [] }, reviewFlags: [], ...p,
  };
}

describe('computePreFilterFlags', () => {
  it('원료(intake=원료로 사용) → RAW_MATERIAL_OR_OEM', () => {
    expect(computePreFilterFlags(seed({ intake: '건강기능식품 원료로 사용', mainFunction: '항산화에 도움을 줄 수 있음' })))
      .toContain('RAW_MATERIAL_OR_OEM');
  });
  it('수출용 제품명 → EXPORT_ONLY', () => {
    expect(computePreFilterFlags(seed({ productName: 'ATOMY HemoHIM(말레이시아 수출용)', mainFunction: null })))
      .toContain('EXPORT_ONLY');
  });
  it('인정 어미 없는 짧은 기능성 → TERSE_CLAIM', () => {
    expect(computePreFilterFlags(seed({ mainFunction: '피로 개선', functionalClaims: ['피로 개선'] }))).toContain('TERSE_CLAIM');
    expect(computePreFilterFlags(seed({ mainFunction: '항산화 작용', functionalClaims: ['항산화 작용'] }))).toContain('TERSE_CLAIM');
  });
  it('인정 어미 있는 기능성 → TERSE_CLAIM 아님', () => {
    expect(computePreFilterFlags(seed({ mainFunction: '유산균 증식 및 유해균 억제·배변활동 원활에 도움을 줄 수 있음' })))
      .not.toContain('TERSE_CLAIM');
  });
  it('기능성 결측 → MAIN_FUNCTION_MISSING (TERSE 아님)', () => {
    const f = computePreFilterFlags(seed({ mainFunction: null }));
    expect(f).toContain('MAIN_FUNCTION_MISSING');
    expect(f).not.toContain('TERSE_CLAIM');
  });
  it('결측/길이/다항목 flag', () => {
    const f = computePreFilterFlags(seed({
      mainFunction: '항산화 작용을 하여 유해산소로부터 세포를 보호하는데 필요',
      functionalClaims: ['a', 'b', 'c', 'd', 'e'],
      intake: null, caution: null, baseStandard: 'x'.repeat(2100),
    }));
    expect(f).toEqual(expect.arrayContaining(['INTAKE_MISSING', 'CAUTION_MISSING', 'LONG_TEXT', 'MULTI_CLAIM']));
  });
});

describe('isGenerationEligible', () => {
  it('원료/수출용 기본 제외', () => {
    expect(isGenerationEligible(['RAW_MATERIAL_OR_OEM'])).toBe(false);
    expect(isGenerationEligible(['EXPORT_ONLY'])).toBe(false);
    expect(isGenerationEligible(['TERSE_CLAIM', 'MAIN_FUNCTION_MISSING'])).toBe(true);
  });
  it('opt-out 시 원료 포함', () => {
    expect(isGenerationEligible(['RAW_MATERIAL_OR_OEM'], { excludeRawMaterial: false })).toBe(true);
  });
});

describe('sourceFidelityGuard', () => {
  it('원문 결측인데 기능성 생성 → beyondSource', () => {
    const r = sourceFidelityGuard(seed({ mainFunction: null }), draft({ sections: { mainFunction: ['면역력 증진에 도움'], howToTake: [], caution: [] } }));
    expect(r.beyondSource).toBe(true);
  });
  it('원문 근거 있는 기능성 → 통과', () => {
    const s = seed({ mainFunction: '피로 개선에 도움을 줄 수 있음', functionalClaims: ['피로 개선에 도움을 줄 수 있음'] });
    const r = sourceFidelityGuard(s, draft({ sections: { mainFunction: ['피로 개선에 도움을 줄 수 있습니다'], howToTake: [], caution: [] } }));
    expect(r.beyondSource).toBe(false);
  });
  it('원문에 없는 기능 확장 → LOW_SOURCE_OVERLAP', () => {
    const s = seed({ mainFunction: '피로 개선에 도움을 줄 수 있음', functionalClaims: ['피로 개선에 도움을 줄 수 있음'] });
    const r = sourceFidelityGuard(s, draft({ sections: { mainFunction: ['혈당 조절과 다이어트 효과가 뛰어남'], howToTake: [], caution: [] } }));
    expect(r.beyondSource).toBe(true);
  });

  // ── BEYONDSOURCE-MINI-AUDIT 회귀: 원문 붙여쓰기 ↔ draft 자연 띄어쓰기/조사 차이는 오탐 아님 ──
  it('붙여쓰기 원문 vs 띄어쓰기 draft(식이섬유) → 통과', () => {
    const s = seed({ mainFunction: '1. 콜레스테롤 조절 2. 식후혈당상승억제에 도움 3. 배변활동 원활', functionalClaims: [] });
    const r = sourceFidelityGuard(s, draft({ sections: {
      mainFunction: ['콜레스테롤 조절에 도움을 줄 수 있습니다.', '식후 혈당 상승 억제에 도움을 줄 수 있습니다.', '배변 활동 원활에 도움을 줄 수 있습니다.'],
      howToTake: [], caution: [] } }));
    expect(r.beyondSource).toBe(false);
  });
  it('조사/승인어미 부가(비타민C·프로바이오틱스) → 통과', () => {
    const s = seed({ mainFunction: '[프로바이오틱스 제품]①유익한 유산균 증식②유해균 억제 또는 배변활동 원활', functionalClaims: [] });
    const r = sourceFidelityGuard(s, draft({ sections: {
      mainFunction: ['유익한 유산균 증식에 도움을 줄 수 있습니다.', '유해균 억제에 도움을 줄 수 있습니다.', '배변 활동 원활에 도움을 줄 수 있습니다.'],
      howToTake: [], caution: [] } }));
    expect(r.beyondSource).toBe(false);
  });
  it('다원료 결합·연결어 재작성(철/비타민C) → 통과', () => {
    const s = seed({ mainFunction: '철 : (1) 체내 산소운반과 혈액생성에 필요 (2) 에너지 생성에 필요', functionalClaims: [] });
    const r = sourceFidelityGuard(s, draft({ sections: {
      mainFunction: ['철은 체내 산소 운반과 혈액 생성에 필요하며, 에너지 생성에도 필요합니다.'],
      howToTake: [], caution: [] } }));
    expect(r.beyondSource).toBe(false);
  });
});

describe('medicineLikeWordingGuard', () => {
  it('치료/예방 단정 → medicineLike', () => {
    expect(medicineLikeWordingGuard(draft({ summary: '이 제품은 당뇨를 치료합니다' })).medicineLike).toBe(true);
    expect(medicineLikeWordingGuard(draft({ sections: { mainFunction: ['감기를 예방합니다'], howToTake: [], caution: [] } })).medicineLike).toBe(true);
  });
  it('caution 의 질환/의약품 표현은 검사 대상 아님', () => {
    const d = draft({ summary: '건강에 도움을 주는 제품', sections: { mainFunction: [], howToTake: [], caution: ['질환이 있거나 의약품 복용 시 전문가와 상담하십시오'] } });
    expect(medicineLikeWordingGuard(d).medicineLike).toBe(false);
  });
  it('인정 문구(위험 감소에 도움) → 통과', () => {
    expect(medicineLikeWordingGuard(draft({ sections: { mainFunction: ['높은 혈압 감소에 도움을 줄 수 있습니다'], howToTake: [], caution: [] } })).medicineLike).toBe(false);
  });
});

describe('draftQualityGuard', () => {
  it('caution 누락(seed 있음) → CAUTION_LOSS', () => {
    const r = draftQualityGuard(seed({ caution: '주의사항 있음' }), draft({ sections: { mainFunction: ['a'], howToTake: ['b'], caution: [] } }));
    expect(r.issues).toContain('CAUTION_LOSS');
  });
  it('광고적 표현 → TOO_AD', () => {
    const r = draftQualityGuard(seed({}), draft({ summary: '업계 최고의 완벽한 제품 100% 효과' }));
    expect(r.issues).toContain('TOO_AD');
  });
});

describe('classifyPreGeneration / classifyDraft', () => {
  it('render-only: 원료 → HOLD_RAW_MATERIAL_OR_OEM', () => {
    expect(classifyPreGeneration(['RAW_MATERIAL_OR_OEM', 'TERSE_CLAIM'])).toBe('HOLD_RAW_MATERIAL_OR_OEM');
  });
  it('render-only: 정상 → ELIGIBLE_FOR_GENERATION', () => {
    expect(classifyPreGeneration(['MULTI_CLAIM'])).toBe('ELIGIBLE_FOR_GENERATION');
  });
  it('draft: 의약품 단정 → FAIL_MEDICINE_LIKE (우선)', () => {
    const s = seed({ mainFunction: '피로 개선에 도움을 줄 수 있음', functionalClaims: ['피로 개선에 도움을 줄 수 있음'], caution: '주의' });
    const d = draft({ summary: '피로를 완치합니다', sections: { mainFunction: ['피로 개선에 도움'], howToTake: ['1일 1회'], caution: ['주의사항'] } });
    expect(classifyDraft(s, d, [])).toBe('FAIL_MEDICINE_LIKE');
  });
  it('draft: 정상 → PASS_READY_FOR_REVIEW', () => {
    const s = seed({ mainFunction: '피로 개선에 도움을 줄 수 있음', functionalClaims: ['피로 개선에 도움을 줄 수 있음'], intake: '1일 1회', caution: '주의' });
    const d = draft({ summary: '피로 개선에 도움을 줄 수 있는 건강기능식품입니다', sections: { mainFunction: ['피로 개선에 도움을 줄 수 있습니다'], howToTake: ['1일 1회 섭취'], caution: ['주의사항을 지켜주세요'] } });
    expect(classifyDraft(s, d, [])).toBe('PASS_READY_FOR_REVIEW');
  });
  it('draft: json parse 실패 → FAIL_JSON_PARSE', () => {
    expect(classifyDraft(seed({}), null, [], 'json_parse')).toBe('FAIL_JSON_PARSE');
  });
  it('draft: provider 실패 → FAIL_PROVIDER_ERROR', () => {
    expect(classifyDraft(seed({}), null, [], 'provider_error')).toBe('FAIL_PROVIDER_ERROR');
  });
});
