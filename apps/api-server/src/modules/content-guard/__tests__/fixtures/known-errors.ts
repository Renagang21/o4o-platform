/**
 * 회귀 픽스처 — **과거 실제로 발생했던 오류** (WO §21)
 *
 * 전부 실제 산출물에서 검출·정정된 오류다. 가드가 이것들을 검출하지 못하면 회귀다.
 * 출처: 5건 파일럿 REVIEW-V1 §2 Q2 정정 / GUARD-20-A~D
 */

import type { GuardProductInput } from '../product-description-guard.types.js';

const base = (over: Partial<GuardProductInput>): GuardProductInput => ({
  candidateId: 'fixture',
  productName: '제품',
  manufacturer: '(주)제조사',
  statementNo: '00000000',
  category: 'hff',
  source: {
    mainFunction: '유산균 증식 및 유해균 억제･배변활동 원활･장 건강에 도움을 줄 수 있음',
    baseStandard: '프로바이오틱스 수 : 표시량(10,000,000,000(100억) CFU/4g) 이상',
    intake: '1일 2회, 1회 1포를 섭취하십시오.',
    caution: '(가) 질환이 있거나 의약품 복용 시 전문가와 상담할 것',
    dosageForm: '분말',
  },
  grounding: { declaredAmount: null, serving: null },
  drafts: { ko: '', en: '' },
  ...over,
});

/** ① 락토핏 — 1포=4g 가정 + 1일 200억 도출 (2배 오차). 5건 파일럿 "최대 수확"이라 선언됐던 오류. */
export const ERR_LACTOFIT_DAILY_TOTAL = base({
  candidateId: 'err-lactofit',
  productName: '락토핏 플러스 프로바이오틱스',
  manufacturer: '종근당건강(주)',
  statementNo: '20040020016703',
  source: {
    mainFunction: '유산균 증식 및 유해균 억제･배변활동 원활･장 건강에 도움을 줄 수 있음',
    baseStandard: '프로바이오틱스 수 : 표시량(10,000,000,000 (100억) CFU/4g) 이상',
    intake: '1일 2회, 1회 1포를 식전·식후 어느때나 물 없이 섭취하십시오.',
    caution: '(가) 질환이 있거나 의약품 복용 시 전문가와 상담할 것',
    dosageForm: '흰보라색의 분말',
  },
  grounding: {
    declaredAmount: { value: 100, unit: '억 CFU', basisAmount: 4, basisUnit: 'g' },
    // 원문에 포 중량이 없다 → unitWeight: null
    serving: { unitType: 'stick', unitWeight: null, unitWeightUnit: null, unitsPerServing: 1, servingsPerDay: 2 },
    calculationAllowed: true, // ← 작성자가 잘못 선언한 상태 재현
  },
  drafts: {
    ko: '<p>1포(4g)당 100억 CFU 담았고, 하루 2회 1포씩 — <b>1일 섭취 프로바이오틱스 200억 CFU</b>(1포 100억 × 2회)</p>',
    en: '<p>10 billion CFU per stick — <b>20 billion CFU of probiotics per day</b> (10 billion × 2)</p>',
  },
});

/** ② 프로바 — 1포=2,000mg 가정 */
export const ERR_PROBA_PER_STICK = base({
  candidateId: 'err-proba',
  productName: '프로바',
  manufacturer: '주식회사 노바렉스',
  statementNo: '200400200082521',
  source: {
    mainFunction: '유산균 증식 및 유해균 억제･배변활동 원활･장 건강에 도움을 줄 수 있음',
    baseStandard: '프로바이오틱스 수 : 표시량(100,000,000(1억) CFU/2000mg) 이상',
    intake: '1일 1회, 1회 1포를 섭취하십시오.',
    caution: '(가) 질환이 있거나 의약품 복용 시 전문가와 상담할 것',
    dosageForm: '흰색의 분말',
  },
  grounding: {
    declaredAmount: { value: 1, unit: '억 CFU', basisAmount: 2000, basisUnit: 'mg' },
    serving: { unitType: 'stick', unitWeight: null, unitWeightUnit: null, unitsPerServing: 1, servingsPerDay: 1 },
  },
  drafts: {
    ko: '<p>이 제품은 <b>1포(2,000mg)당 1억 CFU</b> 이상을 보장합니다.</p>',
    en: '<p>at least 100 million CFU per stick (2,000mg)</p>',
  },
});

/** ③ 디노키즈 — 1포=2g 가정 + 연령 경계 "이상/미만" 확정 + 키즈 소구 */
export const ERR_DINOKIDS_BASIS_AND_AGE = base({
  candidateId: 'err-dinokids',
  productName: '디노키즈생유산균',
  manufacturer: '조아제약(주)',
  statementNo: '2004001601195',
  source: {
    mainFunction: '유산균 증식 및 유해균 억제･배변활동 원활･장 건강에 도움을 줄 수 있음',
    baseStandard: '프로바이오틱스 수 : 표시량(10,000,000,000 (100억) CFU / 2g) 이상',
    intake: '9세 이상 및 성인 : 1일 2~3회, 1회 1포 / 4-9세 어린이 : 1일 2회, 1회 1포 / 6개월-4세 어린이 : 1일 1회, 1회 1포',
    caution: '(다) 어린이가 함부로 섭취하지 않도록 일일섭취량 방법을 지도할 것',
    dosageForm: '미황색 분말',
  },
  grounding: {
    declaredAmount: { value: 100, unit: '억 CFU', basisAmount: 2, basisUnit: 'g' },
    serving: { unitType: 'stick', unitWeight: null, unitWeightUnit: null, unitsPerServing: 1, servingsPerDay: 1, servingsPerDayMax: 3 },
    ageBandsRaw: '9세 이상 및 성인 : 1일 2~3회, 1회 1포 / 4-9세 어린이 : 1일 2회, 1회 1포 / 6개월-4세 어린이 : 1일 1회, 1회 1포',
  },
  drafts: {
    ko: '<p><b>1포(2g)당 100억 CFU</b>. 4세 이상 9세 미만 어린이는 1일 2회. 6개월 이상 영유아부터.</p>',
    en: '<p>10 billion CFU per stick. Children ages 4 to under 9: twice a day.</p>',
  },
});

/** ④ "이 그룹에서 가장 낮은 균수 구간" — 전수 비교 없는 최상급 (20-A a5) */
export const ERR_SUPERLATIVE = base({
  candidateId: 'err-superlative',
  productName: '비피스앤(N)',
  drafts: {
    ko: '<li>프로바이오틱스 <b>1억 CFU</b>(1,000mg 기준) — 이 그룹에서 가장 낮은 균수 구간</li>',
    en: '<li>the lowest count in this group</li>',
  },
});

/** ⑤ "실온보관 — 별도 냉장 조건이 표시되어 있지 않습니다" — 부재→허용 (20-A a2) */
export const ERR_ABSENCE_AS_PERMISSION = base({
  candidateId: 'err-absence',
  productName: '락토필엔테로 비움',
  source: {
    mainFunction: '유산균 증식 및 유해균 억제･배변활동 원활･장 건강에 도움을 줄 수 있음',
    baseStandard: '프로바이오틱스 수 : 표시량 이상 (100억 CFU/350 mg)',
    intake: '1일 1회, 1회 1캡슐(350mg)을 물과 함께 섭취하십시오.',
    caution: '(가) 질환이 있거나 의약품 복용 시 전문가와 상담할 것',
    dosageForm: '경질캡슐',
  },
  drafts: {
    ko: '<li>직사광선을 피한 <b>실온보관</b> — 별도 냉장 조건이 표시되어 있지 않습니다</li>',
    en: '<li>Room-temperature storage — no refrigeration needed</li>',
  },
});

/** ⑥ 키즈 명칭 → 어린이 적합 (원문 연령별 없음) — 20-C */
export const ERR_KIDS_NAME_CLAIM = base({
  candidateId: 'err-kids',
  productName: '오달달 키즈 유산균',
  manufacturer: '(주)신비바이오',
  source: {
    mainFunction: '유산균 증식 및 유해균 억제･배변활동 원활･장 건강에 도움을 줄 수 있음',
    baseStandard: '프로바이오틱스 수 : 표시량(5,000,000,000(50억) CFU/2g) 이상',
    intake: '1일 1회, 1회 1포를 직접 섭취하시기 바랍니다.',
    caution: '(다) 어린이가 함부로 섭취하지 않도록 일일섭취량 방법을 지도할 것',
    dosageForm: '노랑 하양색의 분말',
  },
  grounding: {
    declaredAmount: { value: 50, unit: '억 CFU', basisAmount: 2, basisUnit: 'g' },
    serving: { unitType: 'stick', unitWeight: null, unitWeightUnit: null, unitsPerServing: 1, servingsPerDay: 1 },
    ageBandsRaw: null,
  },
  drafts: {
    ko: '<li>어린이에게 적합한 키즈 전용 유산균</li>',
    en: '<li>Suitable for children</li>',
  },
});

/** ⑦ 제품명 유도 — W이너밸런스 → 여성 균형 (20-B) */
export const ERR_NAME_DERIVED = base({
  candidateId: 'err-name',
  productName: 'W이너밸런스프로바이오틱스',
  manufacturer: '(주)오투바이오',
  drafts: {
    ko: '<p>여성의 균형을 위한 제품입니다.</p>',
    en: "<p>For women's balance.</p>",
  },
});

/** ⑧ 제형 일반화 — 원문 "충분한 물과 함께" 인데 "물 없이" (20-B b3) */
export const ERR_FORM_GENERALIZATION = base({
  candidateId: 'err-form',
  productName: 'W이너밸런스프로바이오틱스',
  source: {
    mainFunction: '유산균 증식 및 유해균 억제･배변활동 원활･장 건강에 도움을 줄 수 있음',
    baseStandard: '프로바이오틱스 : 표시량 이상 [표시량 5,000,000,000 (50억)CFU/2g]',
    intake: '1일 1회, 1회 1포(2g)를 충분한 물과 함께 섭취하십시오',
    caution: '(가) 질환이 있거나 의약품 복용 시 전문가와 상담할 것',
    dosageForm: '하양색의 분말',
  },
  drafts: {
    ko: '<li>물 없이 그대로 섭취할 수 있습니다</li>',
    en: '<li>Can be taken straight, without water</li>',
  },
});

/** ⑨ ko/en 수치 불일치 */
export const ERR_KO_EN_MISMATCH = base({
  candidateId: 'err-koen',
  drafts: {
    ko: '<p>프로바이오틱스 100억 CFU</p>',
    en: '<p>Probiotics, 1 billion CFU</p>', // 100억 = 10 billion 이어야 함
  },
});

/** ⑩ 기능성 강화 — en 에서 improves/boosts */
export const ERR_FUNCTION_ESCALATION = base({
  candidateId: 'err-escalation',
  drafts: {
    ko: '<p>장 건강에 도움을 줄 수 있는 프로바이오틱스 100억 CFU</p>',
    en: '<p>Probiotics 10 billion CFU that improves gut health and boosts immunity.</p>',
  },
});

export const KNOWN_ERROR_FIXTURES = [
  ERR_LACTOFIT_DAILY_TOTAL,
  ERR_PROBA_PER_STICK,
  ERR_DINOKIDS_BASIS_AND_AGE,
  ERR_SUPERLATIVE,
  ERR_ABSENCE_AS_PERMISSION,
  ERR_KIDS_NAME_CLAIM,
  ERR_NAME_DERIVED,
  ERR_FORM_GENERALIZATION,
  ERR_KO_EN_MISMATCH,
  ERR_FUNCTION_ESCALATION,
];

// ─── 정상(정정 후) 픽스처 — BLOCKED 0 이어야 함 ──────────────────────────────

/** 김치생유산균 — 기준량 900mg = 450mg×2 = 1일분. 환산 근거 완전. */
export const OK_KIMCHI_DAILY_BASIS = base({
  candidateId: 'ok-kimchi',
  productName: '김치생유산균바이오캡슐',
  manufacturer: '(주)바이오리듬',
  statementNo: '2009002001441',
  source: {
    mainFunction: '유산균 증식 및 유해균 억제･배변활동 원활･장 건강에 도움을 줄 수 있음',
    baseStandard: '프로바이오틱스 수 : 표시량(10,000,000,000cfu이상/900mg)이상',
    intake: '1일 2회, 1회 1캅셀(450mg)씩 물과 함께 섭취하십시오',
    caution: '(가) 질환이 있거나 의약품 복용 시 전문가와 상담할 것',
    dosageForm: '경질캡슐',
  },
  grounding: {
    declaredAmount: { value: 100, unit: '억 CFU', basisAmount: 900, basisUnit: 'mg' },
    serving: { unitType: 'capsule', unitWeight: 450, unitWeightUnit: 'mg', unitsPerServing: 1, servingsPerDay: 2 },
    calculationAllowed: true,
  },
  drafts: {
    ko: '<p>표시 기준량 900mg = 450mg 캅셀 2개 = 1일 섭취량 · <b>1일 섭취 프로바이오틱스 100억 CFU</b></p>',
    en: '<p>Labelled basis 900mg = two 450mg capsules = the daily intake · 10 billion CFU of probiotics per day</p>',
  },
});

/** 비바 비피도 — 5캡슐×500mg×2회 = 5,000mg = 기준량 → 1일 10억 */
export const OK_VIVA_FULL_BASIS = base({
  candidateId: 'ok-viva',
  productName: '비바 비피도 플러스',
  manufacturer: '주식회사 제이비케이랩',
  statementNo: '20160007515148',
  source: {
    mainFunction: '유산균 증식 및 유해균 억제･배변활동 원활･장 건강에 도움을 줄 수 있음',
    baseStandard: '프로바이오틱스 수 : 표시량(1,000,000,000(10억) CFU/5,000mg) 표시량 이상',
    intake: '1일 2회, 1회 5캡슐(1캡슐당 500mg)을 충분한 물과 함께 섭취하십시오.',
    caution: '(가) 질환이 있거나 의약품 복용 시 전문가와 상담할 것',
    dosageForm: '투명한 경질캡슐',
  },
  grounding: {
    declaredAmount: { value: 10, unit: '억 CFU', basisAmount: 5000, basisUnit: 'mg' },
    serving: { unitType: 'capsule', unitWeight: 500, unitWeightUnit: 'mg', unitsPerServing: 5, servingsPerDay: 2 },
    calculationAllowed: true,
  },
  drafts: {
    ko: '<p>1회 5캡슐 = 2,500mg × 1일 2회 = 1일 5,000mg = 표시 기준량 · <b>1일 섭취 프로바이오틱스 10억 CFU</b> (하루 10캡슐)</p>',
    en: '<p>5 capsules = 2,500mg per serving × twice daily = 5,000mg per day · 1 billion CFU of probiotics per day (10 capsules)</p>',
  },
});
