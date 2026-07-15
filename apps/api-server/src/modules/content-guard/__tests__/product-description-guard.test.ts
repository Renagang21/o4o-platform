/**
 * Product Description Guard — 단위 + 회귀 테스트
 * WO-O4O-PRODUCT-DESCRIPTION-GROUNDING-GUARD-AUTOMATION-V1 §22
 */

import {
  computeBasis, runGuard, runGuardBatch, mergeStatus, exitCodeFor, runPreGuard,
} from '../product-description-guard.js';
import {
  extractKoCounts, extractEnCounts, extractWeights, koCountToEn, stripHtml, toMg,
} from '../product-description-guard.units.js';
import {
  KNOWN_ERROR_FIXTURES,
  ERR_LACTOFIT_DAILY_TOTAL, ERR_PROBA_PER_STICK, ERR_DINOKIDS_BASIS_AND_AGE,
  ERR_SUPERLATIVE, ERR_ABSENCE_AS_PERMISSION, ERR_KIDS_NAME_CLAIM,
  ERR_NAME_DERIVED, ERR_FORM_GENERALIZATION, ERR_KO_EN_MISMATCH, ERR_FUNCTION_ESCALATION,
  OK_KIMCHI_DAILY_BASIS, OK_VIVA_FULL_BASIS,
} from './fixtures/known-errors.js';

const ruleIds = (r: ReturnType<typeof runGuard>) => r.findings.filter((f) => f.status !== 'PASS').map((f) => f.ruleId);
const blocked = (r: ReturnType<typeof runGuard>) => r.findings.filter((f) => f.status === 'BLOCKED');

// ═══ 단위 정규화 ═══════════════════════════════════════════════════════════

describe('units', () => {
  it('억 표기를 절대수로 변환', () => {
    expect(extractKoCounts('100억 CFU')[0].value).toBe(1e10);
    expect(extractKoCounts('1억 CFU')[0].value).toBe(1e8);
    expect(extractKoCounts('5,000억')[0].value).toBe(5e11);
  });

  // 30-A 실측 — source-grounding-parser 의 결손 #1 과 **동일한 결손이 이 모듈에도** 있었다.
  // 청인 해우 ko "1.5억" 을 5억으로 읽어 en "150 million" 과 허위 불일치(BLOCKED)를 냈다.
  it('소수점 억을 정확히 읽는다 (1.5억 ≠ 5억)', () => {
    expect(extractKoCounts('1.5억 CFU')[0].value).toBe(1.5e8);
    expect(extractKoCounts('1.5억 CFU')[0].value).not.toBe(5e8);
    expect(extractKoCounts('표시량 150,000,000(1.5억)CFU/15g')
      .map((c) => c.value)).toContain(1.5e8);
    expect(extractKoCounts('2.5억')[0].value).toBe(2.5e8);
  });
  it('영어 표기를 절대수로 변환', () => {
    expect(extractEnCounts('10 billion CFU')[0].value).toBe(1e10);
    expect(extractEnCounts('100 million CFU')[0].value).toBe(1e8);
  });
  it('억 ↔ billion/million 환산이 일치', () => {
    expect(koCountToEn(1e8)).toBe('100 million');
    expect(koCountToEn(1e9)).toBe('1 billion');
    expect(koCountToEn(1e10)).toBe('10 billion');
    expect(koCountToEn(3e9)).toBe('3 billion');
    expect(koCountToEn(5e9)).toBe('5 billion');
  });
  it('중량 mg 정규화', () => {
    expect(toMg(2, 'g')).toBe(2000);
    expect(toMg(450, 'mg')).toBe(450);
    expect(toMg(500, '㎍')).toBeCloseTo(0.5);
    expect(extractWeights('1,500 mg 과 2g')[0].mg).toBe(1500);
  });
  it('stripHtml 이 태그를 제거', () => {
    expect(stripHtml('<p>가 <b>나</b></p>')).toBe('가 나');
  });
});

// ═══ A. 기준량 환산 ════════════════════════════════════════════════════════

describe('A. 기준량 환산 (computeBasis)', () => {
  it('4값 완전 + 기준량=1일분 → 환산 허용, 1캡슐=50억/1일=100억', () => {
    const b = computeBasis(OK_KIMCHI_DAILY_BASIS);
    expect(b.allowed).toBe(true);
    expect(b.basisEquals).toBe('daily');
    expect(b.dailyCount).toBe(1e10);      // 100억
    expect(b.perUnitCount).toBe(5e9);     // 1캡슐 50억
  });

  it('5캡슐×500mg×2회=5,000mg=기준량 → 1일 10억, 1캡슐 1억', () => {
    const b = computeBasis(OK_VIVA_FULL_BASIS);
    expect(b.allowed).toBe(true);
    expect(b.basisEquals).toBe('daily');
    expect(b.dailyCount).toBe(1e9);       // 10억
    expect(b.perUnitCount).toBe(1e8);     // 1캡슐 1억 (10캡슐)
  });

  it('1단위 중량이 원문에 없으면 환산 불가', () => {
    const b = computeBasis(ERR_LACTOFIT_DAILY_TOTAL);
    expect(b.allowed).toBe(false);
    expect(b.reason).toMatch(/1단위 중량/);
  });

  it('작성 전 가드가 환산 불가 시 생성 금지 목록을 고지', () => {
    const pre = runPreGuard(ERR_LACTOFIT_DAILY_TOTAL);
    const f = pre.find((x) => x.ruleId === 'PRE-A-BASIS-001')!;
    // V1.1: 작성 전 고지는 위반 검출이 아니다 → 최종 REVIEW 집계에서 제외
    expect(f.status).toBe('PRECHECK_INFO');
    expect(f.message).toMatch(/생성 금지 목록/);
  });
});

// ═══ V1.1 REVIEW 튜닝: 위험 신호 / 정보성 신호 분리 ══════════════════════════

describe('V1.1 — 위험 신호와 정보성 신호 분리', () => {
  it('PRE-* 고지는 PRECHECK_INFO 이며 reviewCount 에 합산되지 않는다', () => {
    const r = runGuard(OK_VIVA_FULL_BASIS, { phase: 'pre' });
    // V1.2: pre 단계에 원문 교차검증(PRE-SRC-*)이 추가됐다. 고지(PRECHECK_INFO)와
    // 원문 일치(PASS)는 섞이지만, **위험 신호는 없어야** 한다.
    expect(r.findings.some((f) => f.status === 'BLOCKED' || f.status === 'REVIEW_REQUIRED')).toBe(false);
    expect(r.reviewCount).toBe(0);
    expect(r.findings.filter((f) => f.ruleId === 'PRE-A-BASIS-001' || f.ruleId === 'PRE-F-AGE-001')
      .every((f) => f.status === 'PRECHECK_INFO')).toBe(true);
    expect(r.precheckInfoCount).toBeGreaterThanOrEqual(2);
    expect(r.overallStatus).not.toBe('REVIEW_REQUIRED');
  });

  it('PRECHECK_INFO 단독으로는 배치 REVIEW 를 만들지 않는다', () => {
    const b = runGuardBatch([OK_VIVA_FULL_BASIS, OK_KIMCHI_DAILY_BASIS], { phase: 'pre' });
    expect(b.reviewRequired).toBe(0);
    expect(b.blocked).toBe(0);
    // findingsByRule 은 위험 신호만 집계
    expect(Object.keys(b.findingsByRule)).not.toContain('PRE-A-BASIS-001');
  });

  it('PRECHECK_INFO 는 BLOCKED 를 가리지 않는다 (미탐 0 유지)', () => {
    const r = runGuard(ERR_LACTOFIT_DAILY_TOTAL);
    expect(r.precheckInfoCount).toBeGreaterThan(0);
    expect(r.overallStatus).toBe('BLOCKED');
  });

  // H-MAKER 3분기. en 초안에 제조사 표기가 실제로 있는 입력을 만들어 검증한다
  // (OK_VIVA_FULL_BASIS 의 en 초안에는 제조사 표기 자체가 없어 ABSENT 분기로 간다).
  const withEnMaker = (enMakerText: string, manufacturerEn: string | null) => ({
    ...OK_VIVA_FULL_BASIS,
    manufacturerEn,
    drafts: {
      ...OK_VIVA_FULL_BASIS.drafts,
      en: `${OK_VIVA_FULL_BASIS.drafts.en}<p>Manufacturer: ${enMakerText}</p>`,
    },
  });

  it('H-MAKER: 공식 영문 제조사명이 없으면 창작하지 않고 INFO 로 고지', () => {
    // 공식 영문명 없음 + en 에 한국어 법인명 보존 → 창작 요구 없이 INFO
    const r = runGuard(withEnMaker(OK_VIVA_FULL_BASIS.manufacturer, null), { phase: 'bilingual' });
    const f = r.findings.find((x) => x.ruleId.startsWith('H-MAKER'))!;
    expect(f.ruleId).toBe('H-MAKER-NO-OFFICIAL-EN-007');
    expect(f.status).toBe('INFO');
    expect(f.suggestedAction).toMatch(/자동 판정 대상 아님/);
  });

  it('H-MAKER: 공식 영문명이 en 초안과 일치하면 INFO', () => {
    const r = runGuard(withEnMaker('Novarex Co., Ltd.', 'Novarex Co., Ltd.'), { phase: 'bilingual' });
    const f = r.findings.find((x) => x.ruleId.startsWith('H-MAKER'))!;
    expect(f.ruleId).toBe('H-MAKER-MATCH-005');
    expect(f.status).toBe('INFO');
  });

  it('H-MAKER: 공식 영문명이 있는데 en 초안이 다르면 REVIEW (미탐 방지)', () => {
    const r = runGuard(withEnMaker('Some Other Corp.', 'Novarex Co., Ltd.'), { phase: 'bilingual' });
    const f = r.findings.find((x) => x.ruleId.startsWith('H-MAKER'))!;
    expect(f.ruleId).toBe('H-MAKER-MISMATCH-005');
    expect(f.status).toBe('REVIEW_REQUIRED');
  });

  it('H-MAKER: en 초안에 제조사 표기 자체가 없으면 REVIEW', () => {
    const r = runGuard({ ...OK_VIVA_FULL_BASIS, manufacturerEn: null }, { phase: 'bilingual' });
    const f = r.findings.find((x) => x.ruleId.startsWith('H-MAKER'))!;
    expect(f.ruleId).toBe('H-MAKER-ABSENT-006');
    expect(f.status).toBe('REVIEW_REQUIRED');
  });

  // G 규칙 결손 (30-A 실측) — 원문이 문자 그대로 허용하는 표현을 차단하고 있었다.
  it('G-FORM: 원문이 "그대로 섭취"라고 적었으면 초안의 "그대로 섭취"는 위반이 아니다', () => {
    const r = runGuard(
      {
        ...OK_VIVA_FULL_BASIS,
        source: { ...OK_VIVA_FULL_BASIS.source, intake: '1일 2회, 1회 1포를 물, 음료에 타거나 그대로 섭취하십시오.' },
        drafts: { ko: '<p>물·음료에 타거나 그대로 섭취할 수 있습니다.</p>', en: '<p>Mix it or take it directly.</p>' },
      },
      { phase: 'post' },
    );
    expect(r.findings.some((f) => f.ruleId === 'G-FORM-GENERALIZATION-001' && f.status === 'BLOCKED')).toBe(false);
  });

  it('G-FORM: 원문에 직접섭취 근거가 없으면 "물 없이"는 여전히 BLOCKED (미탐 방지)', () => {
    const r = runGuard(
      {
        ...OK_VIVA_FULL_BASIS,
        source: { ...OK_VIVA_FULL_BASIS.source, intake: '성인 : 1일 3회, 1회 2포 (2그램), 소아 : 1일 2회, 1회 1포 (1그램)' },
        drafts: { ko: '<p>물 없이도 먹을 수 있는 과립입니다.</p>', en: '<p>x</p>' },
      },
      { phase: 'post' },
    );
    expect(r.findings.some((f) => f.ruleId === 'G-FORM-GENERALIZATION-001' && f.status === 'BLOCKED')).toBe(true);
  });

  it('G-CHEWABLE: 원문이 "물과 함께 씹어"면 물 언급은 위반이 아니다', () => {
    const r = runGuard(
      {
        ...OK_VIVA_FULL_BASIS,
        source: { ...OK_VIVA_FULL_BASIS.source, intake: '1일 3회, 1회 1포씩 식전 또는 식후에 물과 함께 씹어드십시오.' },
        drafts: { ko: '<p>물과 함께 씹어서 섭취합니다.</p>', en: '<p>x</p>' },
      },
      { phase: 'post' },
    );
    expect(r.findings.some((f) => f.ruleId === 'G-CHEWABLE-002')).toBe(false);
  });

  it('G-CHEWABLE: 원문이 물을 지시하지 않는 츄어블을 물과 함께 삼킨다고 쓰면 BLOCKED', () => {
    const r = runGuard(
      {
        ...OK_VIVA_FULL_BASIS,
        source: { ...OK_VIVA_FULL_BASIS.source, intake: '1일 2회, 1회 1정을 씹어서 섭취하십시오.' },
        drafts: { ko: '<p>물과 함께 삼키면 됩니다.</p>', en: '<p>x</p>' },
      },
      { phase: 'post' },
    );
    expect(r.findings.some((f) => f.ruleId === 'G-CHEWABLE-002' && f.status === 'BLOCKED')).toBe(true);
  });

  // B-SPEC-MINMAX 3분기 — 규격어는 문자열이 아니라 **문맥**으로 판정한다.
  const withEn = (enBody: string) => ({
    ...OK_VIVA_FULL_BASIS,
    drafts: { ...OK_VIVA_FULL_BASIS.drafts, en: `<p>${enBody}</p>` },
  });

  it('B-SPEC-MINMAX: 규격 인용 문맥("at least 1 billion CFU")은 INFO', () => {
    const r = runGuard(withEn('Contains at least 1 billion CFU per labelled basis.'), { phase: 'post' });
    const f = r.findings.find((x) => x.ruleId.startsWith('B-SPEC-MINMAX'))!;
    expect(f.ruleId).toBe('B-SPEC-MINMAX-003');
    expect(f.status).toBe('INFO');
  });

  it('B-SPEC-MINMAX: 수량·단위 없는 규격어는 REVIEW (자동 PASS 하지 않음)', () => {
    const r = runGuard(withEn('Keep hassle to a minimum every morning.'), { phase: 'post' });
    const f = r.findings.find((x) => x.ruleId.startsWith('B-SPEC-MINMAX'))!;
    expect(f.ruleId).toBe('B-SPEC-MINMAX-003');
    expect(f.status).toBe('REVIEW_REQUIRED');
  });

  // D-SHELFLIFE-GUARANTEE (V1.2) — 표본검수에서 발견된 신규 실패 유형.
  //   BASE_STANDARD 는 "표시량 … 이상" 이라는 **규격**만 진술한다.
  //   "유통기한까지 보장" 은 규제 일반지식을 끌어온 추론 확장이다.
  it('D-SHELFLIFE: ko "유통기한까지 보장" 은 원문 근거 없으면 BLOCKED', () => {
    const r = runGuard(
      {
        ...OK_VIVA_FULL_BASIS,
        drafts: { ...OK_VIVA_FULL_BASIS.drafts, ko: '<p>이 제품은 5,000mg당 10억 CFU 이상을 유통기한까지 보장합니다.</p>' },
      },
      { phase: 'post' },
    );
    const f = r.findings.find((x) => x.ruleId === 'D-SHELFLIFE-GUARANTEE-007')!;
    expect(f).toBeDefined();
    expect(f.status).toBe('BLOCKED');
    expect(f.language).toBe('ko');
  });

  it('D-SHELFLIFE: en "guarantees … through its shelf life" 도 BLOCKED', () => {
    const r = runGuard(
      {
        ...OK_VIVA_FULL_BASIS,
        drafts: {
          ...OK_VIVA_FULL_BASIS.drafts,
          en: '<p>This product guarantees at least 1 billion CFU per 5,000mg through its shelf life.</p>',
        },
      },
      { phase: 'post' },
    );
    const f = r.findings.find((x) => x.ruleId === 'D-SHELFLIFE-GUARANTEE-007')!;
    expect(f).toBeDefined();
    expect(f.status).toBe('BLOCKED');
  });

  it('D-SHELFLIFE: 원문이 유통기한 보장을 진술하면 BLOCKED 아님 (REVIEW)', () => {
    const r = runGuard(
      {
        ...OK_VIVA_FULL_BASIS,
        source: { ...OK_VIVA_FULL_BASIS.source, baseStandard: '프로바이오틱스 수 : 표시량 이상 (유통기한까지 보장)' },
        drafts: { ...OK_VIVA_FULL_BASIS.drafts, ko: '<p>이 제품은 5,000mg당 10억 CFU 이상을 유통기한까지 보장합니다.</p>' },
      },
      { phase: 'post' },
    );
    expect(r.findings.some((x) => x.ruleId === 'D-SHELFLIFE-GUARANTEE-007')).toBe(false);
    const f = r.findings.find((x) => x.ruleId === 'D-SHELFLIFE-GUARANTEE-GROUNDED-008')!;
    expect(f.status).toBe('REVIEW_REQUIRED');
  });

  // 소수점 결손 **5번째 경로** (CP2 전 전수 검색에서 발견) — 이번엔 **미탐**이다.
  // 문장 경계를 `[^.]` 로 잡으면 "1.5 billion" 의 소수점에서 끊겨 위반을 통째로 놓친다.
  it('D-SHELFLIFE: 소수점이 끼어도 유통기한 보장을 놓치지 않는다 (en)', () => {
    const r = runGuard(
      {
        ...OK_VIVA_FULL_BASIS,
        drafts: {
          ...OK_VIVA_FULL_BASIS.drafts,
          en: '<p>This product guarantees at least 1.5 billion CFU per 15g through its shelf life.</p>',
        },
      },
      { phase: 'post' },
    );
    expect(r.findings.some((f) => f.ruleId === 'D-SHELFLIFE-GUARANTEE-007' && f.status === 'BLOCKED')).toBe(true);
  });

  it('D-SHELFLIFE: 소수점이 끼어도 유통기한 보장을 놓치지 않는다 (ko)', () => {
    const r = runGuard(
      {
        ...OK_VIVA_FULL_BASIS,
        drafts: { ...OK_VIVA_FULL_BASIS.drafts, ko: '<p>이 제품은 15g당 1.5억 CFU를 유통기한까지 보장합니다.</p>' },
      },
      { phase: 'post' },
    );
    expect(r.findings.some((f) => f.ruleId === 'D-SHELFLIFE-GUARANTEE-007' && f.status === 'BLOCKED')).toBe(true);
  });

  it('D-SHELFLIFE: 문장이 바뀌면 결합하지 않는다 (과탐 방지)', () => {
    const r = runGuard(
      {
        ...OK_VIVA_FULL_BASIS,
        drafts: {
          ...OK_VIVA_FULL_BASIS.drafts,
          en: '<p>This product guarantees quality. Storage is cool and dry through its shelf life.</p>',
        },
      },
      { phase: 'post' },
    );
    expect(r.findings.some((f) => f.ruleId.startsWith('D-SHELFLIFE'))).toBe(false);
  });

  it('D-SHELFLIFE: 중립 표현(표시 기준/labelled standard)은 검출되지 않는다', () => {
    const r = runGuard(
      {
        ...OK_VIVA_FULL_BASIS,
        drafts: {
          ko: '<p>이 제품의 표시 기준은 5,000mg당 10억 CFU 이상입니다.</p>',
          en: '<p>The labelled standard for this product is at least 1 billion CFU per 5,000mg.</p>',
        },
      },
      { phase: 'post' },
    );
    expect(r.findings.some((x) => x.ruleId.startsWith('D-SHELFLIFE'))).toBe(false);
  });

  it('B-SPEC-MINMAX: 규격어가 제품 비교로 쓰이면 BLOCKED (탐지력 강화)', () => {
    const r = runGuard(
      withEn('Contains at least 1 billion CFU, more than other products in this group.'),
      { phase: 'post' },
    );
    const f = r.findings.find((x) => x.ruleId === 'B-SPEC-MINMAX-COMPARE-004')!;
    expect(f).toBeDefined();
    expect(f.status).toBe('BLOCKED');
    expect(r.overallStatus).toBe('BLOCKED');
  });
});

// ═══ 회귀: 과거 실제 오류를 전부 검출해야 한다 (§21·§23) ═══════════════════

describe('회귀 — 과거 실제 오류 검출', () => {
  it('① 락토핏: 1포=4g 가정 + 1일 200억 → BLOCKED', () => {
    const r = runGuard(ERR_LACTOFIT_DAILY_TOTAL);
    expect(r.overallStatus).toBe('BLOCKED');
    expect(ruleIds(r)).toEqual(expect.arrayContaining(['A-UNIT-BASIS-001']));
    // 작성자가 calculationAllowed=true 로 잘못 선언한 것도 잡는다
    expect(ruleIds(r)).toEqual(expect.arrayContaining(['A-CALC-DECLARED-MISMATCH-001']));
  });

  it('② 프로바: 1포=2,000mg 가정 → BLOCKED', () => {
    const r = runGuard(ERR_PROBA_PER_STICK);
    expect(r.overallStatus).toBe('BLOCKED');
    expect(ruleIds(r)).toEqual(expect.arrayContaining(['A-UNIT-BASIS-001']));
  });

  it('③ 디노키즈: 1포=2g 가정 + 연령 경계 확정 → BLOCKED', () => {
    const r = runGuard(ERR_DINOKIDS_BASIS_AND_AGE);
    expect(r.overallStatus).toBe('BLOCKED');
    expect(ruleIds(r)).toEqual(expect.arrayContaining(['A-UNIT-BASIS-001', 'F-AGE-BOUNDARY-001']));
    // en 의 "ages 4 to under 9" 도 검출
    expect(blocked(r).some((f) => f.language === 'en' && f.ruleId === 'F-AGE-BOUNDARY-001')).toBe(true);
  });

  it('④ "가장 낮은 균수 구간" → BLOCKED', () => {
    const r = runGuard(ERR_SUPERLATIVE);
    expect(ruleIds(r)).toEqual(expect.arrayContaining(['B-SUPERLATIVE-001']));
    expect(r.overallStatus).toBe('BLOCKED');
  });

  it('⑤ "냉장 조건이 표시되어 있지 않습니다" → BLOCKED', () => {
    const r = runGuard(ERR_ABSENCE_AS_PERMISSION);
    expect(ruleIds(r)).toEqual(expect.arrayContaining(['C-ABSENCE-AS-PERMISSION-001']));
    expect(r.overallStatus).toBe('BLOCKED');
  });

  it('⑥ 키즈 명칭 + 연령별 없음 + 어린이 적합 → BLOCKED', () => {
    const r = runGuard(ERR_KIDS_NAME_CLAIM);
    expect(ruleIds(r)).toEqual(expect.arrayContaining(['F-KIDS-NAME-001']));
    expect(r.overallStatus).toBe('BLOCKED');
  });

  it('⑦ W이너밸런스 → 여성 균형 → BLOCKED', () => {
    const r = runGuard(ERR_NAME_DERIVED);
    expect(ruleIds(r)).toEqual(expect.arrayContaining(['E-NAME-DERIVED-001']));
    expect(r.overallStatus).toBe('BLOCKED');
  });

  it('⑧ 원문 "충분한 물과 함께" 인데 "물 없이" → BLOCKED', () => {
    const r = runGuard(ERR_FORM_GENERALIZATION);
    expect(ruleIds(r)).toEqual(expect.arrayContaining(['G-FORM-GENERALIZATION-001']));
    expect(r.overallStatus).toBe('BLOCKED');
  });

  it('⑨ ko 100억 vs en 1 billion → BLOCKED', () => {
    const r = runGuard(ERR_KO_EN_MISMATCH);
    expect(ruleIds(r)).toEqual(expect.arrayContaining(['H-COUNT-MISMATCH-001']));
    expect(r.overallStatus).toBe('BLOCKED');
  });

  it('⑩ en improves/boosts → BLOCKED', () => {
    const r = runGuard(ERR_FUNCTION_ESCALATION);
    expect(ruleIds(r)).toEqual(expect.arrayContaining(['H-FUNCTION-ESCALATION-003']));
    expect(r.overallStatus).toBe('BLOCKED');
  });

  it('과거 오류 픽스처 10건 전부 BLOCKED (미탐 0)', () => {
    const batch = runGuardBatch(KNOWN_ERROR_FIXTURES);
    expect(batch.blocked).toBe(KNOWN_ERROR_FIXTURES.length);
    expect(exitCodeFor(batch)).toBe(2);
  });
});

// ═══ 정상 픽스처: BLOCKED 0 ════════════════════════════════════════════════

describe('정상(정정 후) — BLOCKED 0', () => {
  it('김치생유산균(기준량=1일분, 계산 일치) BLOCKED 0', () => {
    const r = runGuard(OK_KIMCHI_DAILY_BASIS);
    expect(blocked(r)).toHaveLength(0);
  });
  it('비바 비피도(환산 근거 완전) BLOCKED 0', () => {
    const r = runGuard(OK_VIVA_FULL_BASIS);
    expect(blocked(r)).toHaveLength(0);
  });
  it('계산값과 다른 1일 총량이면 BLOCKED (A-3)', () => {
    const bad = {
      ...OK_KIMCHI_DAILY_BASIS,
      drafts: { ...OK_KIMCHI_DAILY_BASIS.drafts, ko: '<p>1일 섭취 프로바이오틱스 200억 CFU</p>' },
    };
    const r = runGuard(bad);
    expect(ruleIds(r)).toEqual(expect.arrayContaining(['A-CALC-MISMATCH-002']));
  });
});

// ═══ 오탐은 BLOCKED 가 아니라 REVIEW_REQUIRED (§23) ════════════════════════

describe('오탐 분리 — REVIEW_REQUIRED', () => {
  it('"가장 막막한 건" (소비자 상황) → BLOCKED 아님', () => {
    const r = runGuard({
      ...ERR_SUPERLATIVE,
      drafts: { ko: '<p>아이에게 유산균을 먹일 때 가장 막막한 건 몇 살에 몇 번인지입니다.</p>', en: '<p>ok</p>' },
    });
    const b = r.findings.filter((f) => f.ruleId.startsWith('B-') && f.status === 'BLOCKED');
    expect(b).toHaveLength(0);
    expect(r.findings.some((f) => f.ruleId === 'B-SUPERLATIVE-CONTEXT-002' && f.status === 'REVIEW_REQUIRED')).toBe(true);
  });

  it('"계산이 필요 없습니다" (수치 서술) → BLOCKED 아님', () => {
    const r = runGuard({
      ...OK_VIVA_FULL_BASIS,
      drafts: { ...OK_VIVA_FULL_BASIS.drafts, ko: '<p>세 값이 일치해 계산이 필요 없습니다.</p>' },
    });
    const c = r.findings.filter((f) => f.ruleId.startsWith('C-') && f.status === 'BLOCKED');
    expect(c).toHaveLength(0);
  });

  it('en "supports" 는 REVIEW_REQUIRED (BLOCKED 아님)', () => {
    const r = runGuard({
      ...ERR_KO_EN_MISMATCH,
      drafts: { ko: '<p>100억 CFU</p>', en: '<p>10 billion CFU that supports gut health</p>' },
    });
    expect(r.findings.some((f) => f.ruleId === 'H-FUNCTION-SUPPORTS-004' && f.status === 'REVIEW_REQUIRED')).toBe(true);
    expect(r.findings.some((f) => f.ruleId === 'H-FUNCTION-SUPPORTS-004' && f.status === 'BLOCKED')).toBe(false);
  });
});

// ═══ 엔진 ══════════════════════════════════════════════════════════════════

describe('engine', () => {
  it('mergeStatus 우선순위', () => {
    const f = (status: any) => ({ status } as any);
    expect(mergeStatus([f('PASS'), f('BLOCKED'), f('REVIEW_REQUIRED')])).toBe('BLOCKED');
    expect(mergeStatus([f('PASS'), f('REVIEW_REQUIRED')])).toBe('REVIEW_REQUIRED');
    expect(mergeStatus([f('PASS')])).toBe('PASS');
  });
  it('exit code: PASS=0 / REVIEW=1 / BLOCKED=2', () => {
    expect(exitCodeFor({ blocked: 0, reviewRequired: 0 } as any)).toBe(0);
    expect(exitCodeFor({ blocked: 0, reviewRequired: 2 } as any)).toBe(1);
    expect(exitCodeFor({ blocked: 1, reviewRequired: 0 } as any)).toBe(2);
  });
  it('phase=pre 는 초안 없이 동작', () => {
    const r = runGuard({ ...ERR_LACTOFIT_DAILY_TOTAL, drafts: { ko: '', en: '' } }, { phase: 'pre' });
    expect(r.preGuardStatus).not.toBe('NOT_APPLICABLE');
    expect(r.postGuardStatus).toBe('NOT_APPLICABLE');
  });
});
