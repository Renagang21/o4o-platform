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
    expect(f.status).toBe('REVIEW_REQUIRED');
    expect(f.message).toMatch(/생성 금지 목록/);
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
