/**
 * @o4o/hospital-pharmacy-core — 병원약국 얇은 Domain Core 결정론 테스트
 *
 * WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1
 *
 * 순수 계층(도메인 필드 · TargetSchema · 자연어 파싱 · 원내 Local Context · adapter · surface plan)을
 * 결정론적으로 고정한다. O4O Main Automation Core 를 소비만 하고 재구현하지 않음(단방향 의존)을
 * adapter(NormalizedRecord→도메인)와 TargetSchema(구조적 호환)로 확인한다.
 */

import {
  HOSPITAL_DRUG_TARGET_SCHEMA,
  HOSPITAL_DRUG_STORAGE_KEY,
  makeHospitalDrugDataset,
  isHospitalDrugDataset,
  extractProduct,
  extractStrength,
  mentionsHospital,
  mentionsSameIngredient,
  queryLocalRows,
  matchLocalByResearchIngredients,
  renderLocalContextBlock,
  normalizedRecordToHospitalRow,
  normalizedRecordsToHospitalRows,
  decideHospitalSurfacePlan,
  type HospitalDrugRecord,
  type NormalizedRecordLike,
} from '@o4o/hospital-pharmacy-core';

describe('hospital-pharmacy-core · TargetSchema (§2·§3)', () => {
  it('product_name 만 required, 6개 도메인 필드 선언', () => {
    expect(HOSPITAL_DRUG_TARGET_SCHEMA.id).toBe('hospital-drug-list.v1');
    const keys = HOSPITAL_DRUG_TARGET_SCHEMA.fields.map((f) => f.key);
    expect(keys).toEqual(['product_name', 'ingredient', 'strength', 'dosage_form', 'manufacturer', 'status']);
    const required = HOSPITAL_DRUG_TARGET_SCHEMA.fields.filter((f) => f.required).map((f) => f.key);
    expect(required).toEqual(['product_name']);
  });

  it('모든 필드에 AI 판단용 자연어 description 이 있다(별칭 나열이 아님)', () => {
    for (const f of HOSPITAL_DRUG_TARGET_SCHEMA.fields) {
      expect(f.description.length).toBeGreaterThan(5);
    }
  });
});

describe('hospital-pharmacy-core · 자연어 파싱 (§1·§5)', () => {
  it('따옴표 구절/약품 어미로 제품 토큰을 뽑는다', () => {
    expect(extractProduct('"타이레놀정500mg" 의 효능을 조사해줘')).toBe('타이레놀정500mg');
    expect(extractProduct('아모디핀정 찾아줘')).toBe('아모디핀정');
    // 약품 어미 토큰이 둘이면 단정하지 않는다(null)
    expect(extractProduct('아모디핀정과 무코스타정 비교')).toBeNull();
    expect(extractProduct('오늘 날씨 어때')).toBeNull();
  });

  it('함량을 공백 없는 소문자로 뽑는다', () => {
    expect(extractStrength('타이레놀 500 mg 있어?')).toBe('500mg');
    expect(extractStrength('1.5g 규격')).toBe('1.5g');
    expect(extractStrength('함량 정보 없음')).toBeNull();
  });

  it('원내·동일성분 지시를 판정한다', () => {
    expect(mentionsHospital('우리 원내에 이 약 있어?')).toBe(true);
    expect(mentionsHospital('효능만 알려줘')).toBe(false);
    expect(mentionsSameIngredient('같은 성분 원내약 있어?')).toBe(true);
    expect(mentionsSameIngredient('동일성분 대체약')).toBe(true);
    expect(mentionsSameIngredient('그냥 조사해줘')).toBe(false);
  });
});

const ROWS: HospitalDrugRecord[] = [
  { product_name: '타이레놀정500mg', ingredient: '아세트아미노펜', strength: '500mg', dosage_form: '정제' },
  { product_name: '써스펜좌약', ingredient: '아세트아미노펜', strength: '125mg', dosage_form: '좌제' },
  { product_name: '아모디핀정', ingredient: '암로디핀', strength: '5mg' },
];

describe('hospital-pharmacy-core · 원내 Local Context (§4·§5)', () => {
  it('제품명/성분으로 원내 행을 검색한다', () => {
    expect(queryLocalRows(ROWS, ['타이레놀']).map((r) => r.product_name)).toEqual(['타이레놀정500mg']);
    expect(queryLocalRows(ROWS, ['아세트아미노펜']).length).toBe(2);
    expect(queryLocalRows(ROWS, ['x']).length).toBe(0); // 2자 미만 needle 무시
  });

  it('research 본문의 성분으로 동일성분 원내약을 근사한다', () => {
    const research = '이 약의 주성분은 아세트아미노펜이며 해열·진통에 쓰입니다.';
    const matched = matchLocalByResearchIngredients(ROWS, research);
    expect(matched.map((r) => r.product_name).sort()).toEqual(['써스펜좌약', '타이레놀정500mg']);
    expect(matchLocalByResearchIngredients(ROWS, '관련 성분 언급 없음')).toEqual([]);
  });

  it('원내 블록은 함량 일치 행을 앞으로, 미일치 시 참고 문구', () => {
    const block = renderLocalContextBlock(queryLocalRows(ROWS, ['아세트아미노펜']), '125mg');
    expect(block).toContain('[원내 약품] 2건 확인');
    expect(block.indexOf('써스펜좌약')).toBeLessThan(block.indexOf('타이레놀정500mg'));
    const noMatch = renderLocalContextBlock(queryLocalRows(ROWS, ['아모디핀']), '999mg');
    expect(noMatch).toContain('정확히 일치하는 항목은 확인되지 않았습니다');
    expect(renderLocalContextBlock([], null)).toContain('일치하는 항목을 찾지 못했습니다');
  });
});

describe('hospital-pharmacy-core · GFU adapter (§2·§3 — Core 소비, 단방향)', () => {
  const RECORDS: NormalizedRecordLike[] = [
    { fields: { product_name: ' 타이레놀정500mg ', ingredient: '아세트아미노펜', strength: '500mg', drug_category: '무시됨' } },
    { fields: { product_name: '', ingredient: '성분만' } }, // product_name 없음 → skip
    { fields: { product_name: '아모디핀정' } },
  ];

  it('NormalizedRecord → HospitalDrugRecord (trim · 빈 선택필드 제외 · 미지 필드 무시)', () => {
    const row = normalizedRecordToHospitalRow(RECORDS[0]);
    expect(row).toEqual({ product_name: '타이레놀정500mg', ingredient: '아세트아미노펜', strength: '500mg' });
    // TargetSchema 밖 필드(drug_category)는 도메인 행에 실리지 않는다
    expect(row && 'drug_category' in row).toBe(false);
    expect(normalizedRecordToHospitalRow(RECORDS[1])).toBeNull();
  });

  it('레코드 배열 → 행 배열 + skip 집계 → 데이터셋 조립', () => {
    const { rows, total, skipped } = normalizedRecordsToHospitalRows(RECORDS);
    expect(total).toBe(3);
    expect(skipped).toBe(1);
    expect(rows.map((r) => r.product_name)).toEqual(['타이레놀정500mg', '아모디핀정']);

    const ds = makeHospitalDrugDataset('원내목록.xlsx', rows, '2026-09-22T00:00:00.000Z');
    expect(ds).toEqual({
      v: 1,
      fileName: '원내목록.xlsx',
      connectedAt: '2026-09-22T00:00:00.000Z',
      count: 2,
      rows,
    });
    expect(isHospitalDrugDataset(ds)).toBe(true);
    expect(isHospitalDrugDataset({ v: 2, rows: [] })).toBe(false);
    expect(HOSPITAL_DRUG_STORAGE_KEY).toBe('neture:hospital-drug:local-dataset:v1');
  });
});

describe('hospital-pharmacy-core · surface plan (§1·§5·§6)', () => {
  it('서버 원내 경로(suppressLocal=false)', () => {
    expect(decideHospitalSurfacePlan('아모디핀정과 같은 성분 원내약 있어?', 'question', false)).toBe('research_and_local');
    expect(decideHospitalSurfacePlan('원내에 아모디핀정 있어?', 'question', false)).toBe('local_only');
    expect(decideHospitalSurfacePlan('아모디핀정 효능 조사', 'research', false)).toBe('research');
    // 제품·단서 없음 → 되묻는다(QUESTION 은 정상)
    expect(decideHospitalSurfacePlan('도와줘', 'question', false)).toBe('question');
  });

  it('Local-first(suppressLocal=true) — 동일성분도 서버는 research 만, 원내 결합은 브라우저', () => {
    expect(decideHospitalSurfacePlan('아모디핀정과 같은 성분 원내약 있어?', 'question', true)).toBe('research');
    expect(decideHospitalSurfacePlan('원내에 아모디핀정 있어?', 'question', true)).toBe('research'); // 제품 있으면 조사
    expect(decideHospitalSurfacePlan('도와줘', 'question', true)).toBe('question');
  });
});
