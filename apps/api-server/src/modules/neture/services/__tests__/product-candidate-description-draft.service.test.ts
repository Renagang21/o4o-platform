/**
 * ProductCandidateDescriptionDraft — buildDescriptionDraftRow / resolveReviewStatus unit tests
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-V1
 */

import {
  buildDescriptionDraftRow,
  resolveReviewStatus,
  type BuildDescriptionDraftInput,
} from '../product-candidate-description-draft.service';
import type { HealthFunctionalFoodDescriptionSeed, HealthFunctionalFoodStoreDescriptionDraft } from '../../drug-import/health-functional-food-store-description.prompt';

const seed: HealthFunctionalFoodDescriptionSeed = {
  sttemntNo: '20240012345', productName: '예시 프로바이오틱스', manufacturerName: '예시헬스',
  mainFunction: '배변활동 원활에 도움을 줄 수 있음', functionalClaims: ['배변활동 원활에 도움을 줄 수 있음'],
  intake: '1일 1회', caution: '알레르기 확인', baseStandard: 'CFU 기준',
  sourceFields: ['mainFunction', 'intake', 'caution', 'baseStandard'], missingFields: [],
};
const draft: HealthFunctionalFoodStoreDescriptionDraft = {
  title: '예시 프로바이오틱스', summary: '배변활동에 도움을 줄 수 있는 건강기능식품',
  sections: { mainFunction: ['배변활동 원활에 도움을 줄 수 있습니다'], howToTake: ['1일 1회 섭취'], caution: ['알레르기 확인'] },
  sourceTrace: { usedFields: ['mainFunction', 'intake', 'caution'], omittedFields: ['baseStandard'] },
  reviewFlags: [],
};

function input(over: Partial<BuildDescriptionDraftInput> = {}): BuildDescriptionDraftInput {
  return {
    candidateId: 'cand-1', sourceLabel: 'MFDS_HEALTH_FUNCTIONAL_FOOD', sourceIdentifierValue: '20240012345',
    seed, draft,
    guard: { preFlags: ['MULTI_CLAIM'], draftVerdict: 'PASS_READY_FOR_REVIEW' },
    ai: { provider: 'gemini', model: 'gemini-2.5-flash', policyScope: 'HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION', costEstimate: 0.0016, generatedAt: null },
    ...over,
  };
}

describe('resolveReviewStatus', () => {
  it('guard FAIL → rejected', () => {
    expect(resolveReviewStatus('FAIL_MEDICINE_LIKE')).toBe('rejected');
    expect(resolveReviewStatus('FAIL_BEYOND_SOURCE')).toBe('rejected');
    expect(resolveReviewStatus('FAIL_JSON_PARSE')).toBe('rejected');
  });
  it('PASS/HOLD → needs_review', () => {
    expect(resolveReviewStatus('PASS_READY_FOR_REVIEW')).toBe('needs_review');
    expect(resolveReviewStatus('HOLD_TERSE_CLAIM_NEEDS_REVIEW')).toBe('needs_review');
  });
});

describe('buildDescriptionDraftRow', () => {
  it('기본 draft_type=store_description, language=ko, review_status=needs_review', () => {
    const r = buildDescriptionDraftRow(input());
    expect(r.draft_type).toBe('store_description');
    expect(r.language).toBe('ko');
    expect(r.review_status).toBe('needs_review');
    expect(r.candidate_id).toBe('cand-1');
    expect(r.source_identifier_value).toBe('20240012345');
  });

  it('review_flags = preFlags + draftVerdict (dedup)', () => {
    const r = buildDescriptionDraftRow(input({ guard: { preFlags: ['TERSE_CLAIM'], draftVerdict: 'HOLD_TERSE_CLAIM_NEEDS_REVIEW' } }));
    expect(r.review_flags).toEqual(expect.arrayContaining(['TERSE_CLAIM', 'HOLD_TERSE_CLAIM_NEEDS_REVIEW']));
  });

  it('guard FAIL → review_status rejected', () => {
    const r = buildDescriptionDraftRow(input({ guard: { preFlags: [], draftVerdict: 'FAIL_MEDICINE_LIKE' } }));
    expect(r.review_status).toBe('rejected');
  });

  it('seed_json 은 raw_payload 전체가 아니라 추적 필드만', () => {
    const r = buildDescriptionDraftRow(input());
    expect(Object.keys(r.seed_json).sort()).toEqual(
      ['functionalClaims', 'manufacturerName', 'missingFields', 'productName', 'sourceFields', 'sttemntNo'].sort(),
    );
    // 원문 대량 필드(intake/caution/baseStandard 원문)는 seed_json 에 중복 저장 안 함
    expect((r.seed_json as any).caution).toBeUndefined();
    expect((r.seed_json as any).baseStandard).toBeUndefined();
  });

  it('content_json = draft 구조 그대로, ai 메타 반영', () => {
    const r = buildDescriptionDraftRow(input());
    expect((r.content_json as any).sections.mainFunction[0]).toContain('배변활동');
    expect(r.ai_model).toBe('gemini-2.5-flash');
    expect(r.ai_policy_scope).toBe('HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION');
  });
});
