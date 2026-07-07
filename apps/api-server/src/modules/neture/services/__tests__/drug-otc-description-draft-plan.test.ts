/**
 * WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-DESIGN-V1 — 순수 plan 로직 테스트
 * DB 무관. classifyGroup / buildDrugOtcDraftRowPlan / fixture 무결성.
 */
import {
  DRUG_OTC_DESCRIPTION_GROUPS,
  classifyGroup,
  isInsertable,
  buildDrugOtcDraftRowPlan,
  DRUG_OTC_SOURCE_LABEL,
  type DrugOtcGroupFixture,
  type DrugOtcGroupResolution,
} from '../../drug-import/drug-otc-description-draft-plan.js';
import {
  extractDraftsFromDoc,
  normalizeDraftHeaderLabel,
} from '../../drug-import/drug-otc-description-draft-content.js';

const baseFix: DrugOtcGroupFixture = {
  seq: 999, doc: '20g', label: '테스트 100mg 정', ingredient: '테스트', strengthToken: '100밀리그램',
  doseForm: '정', klass: 'auto', grounding: 50,
};
const res = (o: Partial<DrugOtcGroupResolution>): DrugOtcGroupResolution => ({
  masterTotal: 100, otc: 100, rx: 0, otherCat: 0, manufacturers: 30, spdMasters: 60,
  anchorMasters: 100, anchorCandidateId: '00000000-0000-0000-0000-000000000001', ...o,
});

describe('classifyGroup', () => {
  it('정상 auto', () => {
    expect(classifyGroup(baseFix, res({}))).toBe('INSERT_auto');
  });
  it('match_fail 이 최우선', () => {
    expect(classifyGroup(baseFix, res({ masterTotal: 0, otc: 0, anchorMasters: 0 }))).toBe('EXCLUDE_match_fail');
  });
  it('no_otc 가 rx_heavy 보다 우선(otc=0)', () => {
    // 분류 우선순위: match_fail → no_otc → anchor_fail → rx_heavy. otc=0 이면 rx 유무와 무관하게 no_otc.
    expect(classifyGroup(baseFix, res({ otc: 0, rx: 100 }))).toBe('EXCLUDE_no_otc');
    expect(classifyGroup(baseFix, res({ otc: 0, rx: 0, masterTotal: 5, otherCat: 5 }))).toBe('EXCLUDE_no_otc');
  });
  it('anchor_fail', () => {
    expect(classifyGroup(baseFix, res({ anchorMasters: 0 }))).toBe('EXCLUDE_anchor_fail');
  });
  it('rx_heavy vs rx_minor', () => {
    expect(classifyGroup(baseFix, res({ otc: 40, rx: 60 }))).toBe('EXCLUDE_rx_heavy');
    expect(classifyGroup(baseFix, res({ otc: 128, rx: 3 }))).toBe('INSERT_rx_minor_flag');
  });
  it('manual > rx_minor > low_ground > review', () => {
    expect(classifyGroup({ ...baseFix, klass: 'manual' }, res({}))).toBe('INSERT_manual_flag');
    expect(classifyGroup({ ...baseFix, klass: 'low_ground', grounding: 7 }, res({}))).toBe('INSERT_low_ground_flag');
    expect(classifyGroup({ ...baseFix, klass: 'review' }, res({}))).toBe('INSERT_review_flag');
    expect(classifyGroup({ ...baseFix, grounding: 10 }, res({}))).toBe('INSERT_low_ground_flag');
  });
});

describe('buildDrugOtcDraftRowPlan', () => {
  it('row 조립 + FK 앵커 + write-neutral 필드', () => {
    const plan = buildDrugOtcDraftRowPlan(baseFix, res({}), 'INSERT_auto');
    expect(plan.candidate_id).toBe('00000000-0000-0000-0000-000000000001');
    expect(plan.source_label).toBe(DRUG_OTC_SOURCE_LABEL);
    expect(plan.draft_type).toBe('store_description');
    expect(plan.language).toBe('ko');
    expect(plan.review_status).toBe('needs_review');
    expect(plan.ai_provider).toBeNull(); // 외부 초안 — O4O 생성 아님
    expect(plan.source_identifier_value).toBe('테스트|100밀리그램|정');
    expect((plan.content_json as { contentPending: boolean }).contentPending).toBe(true);
  });
  it('anchor 없으면 throw', () => {
    expect(() => buildDrugOtcDraftRowPlan(baseFix, res({ anchorCandidateId: null }), 'INSERT_auto')).toThrow();
  });
  it('spd 중복 존재 시 spd_overlap flag', () => {
    const plan = buildDrugOtcDraftRowPlan(baseFix, res({ spdMasters: 60 }), 'INSERT_auto');
    expect(plan.review_flags).toContain('spd_overlap');
  });
});

describe('fixture 무결성', () => {
  it('66개 그룹, seq 유일 1..66', () => {
    expect(DRUG_OTC_DESCRIPTION_GROUPS).toHaveLength(66);
    const seqs = DRUG_OTC_DESCRIPTION_GROUPS.map((g) => g.seq).sort((a, b) => a - b);
    expect(seqs[0]).toBe(1);
    expect(seqs[65]).toBe(66);
    expect(new Set(seqs).size).toBe(66);
  });
  it('groupKey(성분|함량|제형) 유일', () => {
    const keys = DRUG_OTC_DESCRIPTION_GROUPS.map((g) => `${g.ingredient}|${g.strengthToken}|${g.doseForm}`);
    expect(new Set(keys).size).toBe(66);
  });
  it('모든 그룹 insertable 여부는 해상도에 의존(순수 분류만 확인)', () => {
    for (const g of DRUG_OTC_DESCRIPTION_GROUPS) {
      const v = classifyGroup(g, res({}));
      expect(typeof isInsertable(v)).toBe('boolean');
    }
  });
  it('#51 은 축약표기(…)가 아니라 실제 DB 파싱 성분명', () => {
    const g51 = DRUG_OTC_DESCRIPTION_GROUPS.find((g) => g.seq === 51)!;
    expect(g51.ingredient).not.toContain('…');
    expect(g51.ingredient).toBe('엔테로코쿠스페슘스트레인세르넬레68균');
  });
});

const SAMPLE_DOC = `
## 9. 최종 설명서 초안 (pilot)

## 에르도스테인 300mg 캡슐

| 항목 | 내용 |
|---|---|
| 성분 | 에르도스테인 300mg |
| 분류 | 일반의약품 |
| 선택 포인트 | 가래 배출을 돕는 점액용해제 |

**효능·효과**
급·만성 기관지염의 객담 배출에 사용합니다.

**복용 안내**
성인은 1회 1캡슐 1일 2회 복용합니다.

**주의 대상**
임부·수유부는 상담하세요.

**성분 기준 선택**
성분·함량 기준으로 약사에게 확인하세요.

## 10. 다음
내용 없음`;

describe('content 파서', () => {
  it('normalizeDraftHeaderLabel: 섹션번호·약효군 괄호 제거', () => {
    expect(normalizeDraftHeaderLabel('### 13.1 덱시부프로펜 300mg 정 (NSAID)')).toBe('덱시부프로펜 300mg 정');
    expect(normalizeDraftHeaderLabel('## 에르도스테인 300mg 캡슐')).toBe('에르도스테인 300mg 캡슐');
    expect(normalizeDraftHeaderLabel('일반 문단')).toBeNull();
  });
  it('효능·효과 있는 섹션만 draft 로 추출 + 요약표/본문 파싱', () => {
    const m = extractDraftsFromDoc(SAMPLE_DOC);
    expect(m.has('에르도스테인 300mg 캡슐')).toBe(true);
    expect(m.has('9. 최종 설명서 초안 (pilot)')).toBe(false); // 효능 없음 → draft 아님
    const d = m.get('에르도스테인 300mg 캡슐')!;
    expect(d.summaryTable['성분']).toBe('에르도스테인 300mg');
    expect(d.summaryTable['항목']).toBeUndefined(); // 헤더 행 제외
    expect(d.efficacy).toContain('객담 배출');
    expect(d.usageLabel).toBe('복용 안내');
    expect(d.usage).toContain('1일 2회');
    expect(d.caution).toContain('임부');
    expect(d.ingredientSelection).toContain('약사');
    expect(d.bodyMarkdown).toContain('**효능·효과**');
  });
});
