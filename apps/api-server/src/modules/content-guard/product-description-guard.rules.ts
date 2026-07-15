/**
 * Product Description Guard — 규칙 A~H (PURE)
 *
 * WO-O4O-PRODUCT-DESCRIPTION-GROUNDING-GUARD-AUTOMATION-V1 §8~§16
 * 수작업 SSOT: docs/guides/content-authoring/GROUNDING-GUARD-CHECKLIST.md
 *
 * 미탐 최소화 우선(§6.3): 애매하면 PASS 가 아니라 REVIEW_REQUIRED.
 */

import type {
  GuardFinding,
  GuardProductInput,
} from './product-description-guard.types.js';
import {
  extractKoCounts,
  extractEnCounts,
  extractWeights,
  koCountToEn,
  stripHtml,
  contextAround,
  toMg,
} from './product-description-guard.units.js';

const ok = (
  ruleId: string,
  field: string,
  message: string,
): GuardFinding => ({
  ruleId, severity: 'INFO', status: 'PASS', language: 'n/a',
  field, matchedText: null, sourceEvidence: null, message, suggestedAction: '조치 불요',
});

// ═══ A. 기준량·섭취단위·일일량 ══════════════════════════════════════════════

export interface BasisComputation {
  /** 환산 가능 여부 (A-1: 4값 전부 원문 확인) */
  allowed: boolean;
  reason: string;
  /** 1회 총중량(mg) */
  servingMg?: number;
  /** 1일 총중량(mg) */
  dailyMg?: number;
  /** 표시 기준량(mg) */
  basisMg?: number;
  /** 기준량이 1회분인지 1일분인지 */
  basisEquals?: 'serving' | 'daily' | 'neither';
  /** 1단위당 기능성분량 (절대수) */
  perUnitCount?: number;
  /** 1일 총 기능성분량 (절대수) */
  dailyCount?: number;
}

/** A-1/A-3: 환산 허용 판정 + 계산. 근거가 하나라도 없으면 allowed=false. */
export function computeBasis(input: GuardProductInput): BasisComputation {
  const da = input.grounding.declaredAmount;
  const sv = input.grounding.serving;
  if (!da) return { allowed: false, reason: '표시량(declaredAmount) 없음' };
  if (!sv) return { allowed: false, reason: '섭취단위(serving) 없음' };
  if (sv.unitWeight == null || sv.unitWeightUnit == null)
    return { allowed: false, reason: '1단위 중량이 공식 원문에 없음' };
  if (sv.unitsPerServing == null) return { allowed: false, reason: '1회 섭취 개수 없음' };
  if (sv.servingsPerDay == null) return { allowed: false, reason: '1일 섭취 횟수 없음' };

  const unitMg = toMg(sv.unitWeight, sv.unitWeightUnit);
  const basisMg = toMg(da.basisAmount, da.basisUnit);
  if (unitMg == null || basisMg == null)
    return { allowed: false, reason: `중량 단위 미지원(${sv.unitWeightUnit}/${da.basisUnit})` };

  const servingMg = unitMg * sv.unitsPerServing;
  const dailyMg = servingMg * sv.servingsPerDay;

  // 표시량 절대수 (예: 100 억 CFU → 1e10)
  const declaredCount = normalizeDeclared(da.value, da.unit);
  if (declaredCount == null)
    return { allowed: false, reason: `표시량 단위 미지원(${da.unit})`, servingMg, dailyMg, basisMg };

  const basisEquals: BasisComputation['basisEquals'] =
    near(basisMg, dailyMg) ? 'daily' : near(basisMg, servingMg) ? 'serving' : 'neither';

  // 기준량이 1일분이면 → 1일 총량 = 표시량, 1단위당 = 표시량 / (1일 총 단위수)
  // 기준량이 1회분이면 → 1회 = 표시량, 1일 총량 = 표시량 × 횟수
  const unitsPerDay = sv.unitsPerServing * sv.servingsPerDay;
  let perUnitCount: number | undefined;
  let dailyCount: number | undefined;
  if (basisEquals === 'daily') {
    dailyCount = declaredCount;
    perUnitCount = declaredCount / unitsPerDay;
  } else if (basisEquals === 'serving') {
    perUnitCount = declaredCount / sv.unitsPerServing;
    dailyCount = declaredCount * sv.servingsPerDay;
  } else {
    return {
      allowed: false,
      reason: `표시 기준량(${basisMg}mg)이 1회분(${servingMg}mg)·1일분(${dailyMg}mg) 어느 쪽과도 일치하지 않음`,
      servingMg, dailyMg, basisMg, basisEquals,
    };
  }
  return { allowed: true, reason: '4값 전부 확인 + 기준량 대응 확정', servingMg, dailyMg, basisMg, basisEquals, perUnitCount, dailyCount };
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < Math.max(0.01, Math.abs(b) * 0.001);
}

function normalizeDeclared(value: number, unit: string): number | null {
  const u = unit.trim();
  if (/^억\s*CFU$/i.test(u) || u === '억') return value * 1e8;
  if (/^만\s*CFU$/i.test(u)) return value * 1e4;
  if (/^CFU$/i.test(u)) return value;
  if (/^billion/i.test(u)) return value * 1e9;
  if (/^million/i.test(u)) return value * 1e6;
  return null;
}

/** per-unit / daily-total 수치를 주장하는 표현 (ko/en) */
const PER_UNIT_KO = /(1|한)\s*(캡슐|캅셀|정|포|스틱)\s*(당|에)\s*[0-9][0-9,]*\s*(조|억|만|천)/g;
const PER_UNIT_KO2 = /(1|한)\s*(캡슐|캅셀|정|포|스틱)\s*\([0-9][0-9,.]*\s*(mg|g)\)\s*당/g;
const DAILY_KO = /1일\s*(섭취\s*)?(총\s*)?(프로바이오틱스\s*)?[0-9][0-9,]*\s*(조|억|만|천)/g;
const PER_UNIT_EN = /\b[0-9][0-9,.]*\s*(trillion|billion|million)\s*CFU\s*per\s*(capsule|tablet|stick|sachet)\b/gi;
const DAILY_EN = /\b[0-9][0-9,.]*\s*(trillion|billion|million)\s*CFU\s*(of\s+probiotics\s+)?per\s*day\b/gi;

/** A-2 + A-3 */
export function ruleA(input: GuardProductInput): GuardFinding[] {
  const out: GuardFinding[] = [];
  const basis = computeBasis(input);
  const ko = stripHtml(input.drafts.ko);
  const en = stripHtml(input.drafts.en);
  const evidence = `BASE_STANDARD: ${truncate(input.source.baseStandard, 90)} | SRV_USE: ${truncate(input.source.intake, 60)}`;

  // 작성자 선언(calculationAllowed)과 실제 근거 불일치 → 독립 재계산 우선
  if (input.grounding.calculationAllowed === true && !basis.allowed) {
    out.push({
      ruleId: 'A-CALC-DECLARED-MISMATCH-001', severity: 'ERROR', status: 'BLOCKED', language: 'n/a',
      field: 'grounding.calculationAllowed', matchedText: 'calculationAllowed=true',
      sourceEvidence: evidence,
      message: `환산 허용으로 선언됐으나 실제 근거가 부족합니다: ${basis.reason}`,
      suggestedAction: 'calculationAllowed 를 false 로 두고 표시 기준량만 기술하십시오.',
    });
  }

  if (!basis.allowed) {
    // A-2: 근거 없는데 per-unit / daily 수치가 본문에 있으면 BLOCKED
    for (const [re, lang, field, label] of [
      [PER_UNIT_KO, 'ko', 'koDraft', '1단위당 수치'],
      [PER_UNIT_KO2, 'ko', 'koDraft', '1단위(중량)당 수치'],
      [DAILY_KO, 'ko', 'koDraft', '1일 총량'],
      [PER_UNIT_EN, 'en', 'enDraft', 'per-unit 수치'],
      [DAILY_EN, 'en', 'enDraft', 'per-day 총량'],
    ] as const) {
      const text = lang === 'ko' ? ko : en;
      for (const m of matchAll(re, text)) {
        out.push({
          ruleId: 'A-UNIT-BASIS-001', severity: 'ERROR', status: 'BLOCKED', language: lang,
          field, matchedText: m.text, sourceEvidence: evidence,
          message: `표시 기준량과 섭취단위의 연결 근거가 없는데 ${label}를 기술했습니다 (근거 부족: ${basis.reason}).`,
          suggestedAction: '표시 기준량만 기술하고 1단위당·1일 총량 수치는 삭제하십시오.',
        });
      }
    }
    if (out.every((f) => f.ruleId !== 'A-UNIT-BASIS-001')) {
      out.push(ok('A-UNIT-BASIS-001', 'drafts', `환산 근거 없음(${basis.reason}) — 파생 수치 미기재 확인`));
    }
    return out;
  }

  // A-3: 계산 가능 → 본문 수치가 계산값과 일치하는지
  const expectedPerUnit = basis.perUnitCount!;
  const expectedDaily = basis.dailyCount!;
  for (const m of matchAll(DAILY_KO, ko)) {
    const nums = extractKoCounts(m.text);
    for (const n of nums) {
      if (!near(n.value, expectedDaily)) {
        out.push({
          ruleId: 'A-CALC-MISMATCH-002', severity: 'ERROR', status: 'BLOCKED', language: 'ko',
          field: 'koDraft', matchedText: m.text, sourceEvidence: evidence,
          message: `1일 총량이 계산값과 다릅니다. 본문 ${n.value.toLocaleString()} vs 계산 ${expectedDaily.toLocaleString()} (기준량=${basis.basisEquals}).`,
          suggestedAction: `1일 총량을 ${koCountToEn(expectedDaily)} 기준으로 정정하십시오.`,
        });
      }
    }
  }
  for (const m of matchAll(PER_UNIT_KO, ko)) {
    const nums = extractKoCounts(m.text);
    for (const n of nums) {
      if (!near(n.value, expectedPerUnit)) {
        out.push({
          ruleId: 'A-CALC-MISMATCH-002', severity: 'ERROR', status: 'BLOCKED', language: 'ko',
          field: 'koDraft', matchedText: m.text, sourceEvidence: evidence,
          message: `1단위당 수치가 계산값과 다릅니다. 본문 ${n.value.toLocaleString()} vs 계산 ${expectedPerUnit.toLocaleString()}.`,
          suggestedAction: `1단위당 수치를 정정하거나 삭제하십시오(기준량=${basis.basisEquals}).`,
        });
      }
    }
  }
  if (out.length === 0) out.push(ok('A-CALC-MISMATCH-002', 'drafts', `환산 검증 통과(1일 ${expectedDaily.toLocaleString()}, 1단위 ${expectedPerUnit.toLocaleString()})`));
  return out;
}

// ═══ B. 최상급·비교급 ══════════════════════════════════════════════════════

const SUPERLATIVE_KO = /(가장|최대|최소|최고|유일한|대표적인|특별한|프리미엄)/g;
const COMPARATIVE_KO = /(높은|낮은|많은|적은)\s*(균수|함량|숫자|수치)/g;
// ⚠️ 규격 표기("at least 10 billion CFU", "keep to a minimum")는 최상급이 아니다 → SPEC_MINMAX_EN 으로 분리.
const SUPERLATIVE_EN = /\b(the\s+best|the\s+most\s+\w+|highest|lowest|the\s+least|unique|premium)\b/gi;
/** 공식 규격상의 최소·최대치 (WO §9: 근거 확인 후 PASS) → 자동 PASS 하지 않고 REVIEW */
const SPEC_MINMAX_EN = /\b(at\s+least|at\s+most|to\s+a\s+minimum|minimum|maximum)\b/gi;
/** 소비자 상황 문맥(제품 비교 아님) — 오탐 완화 → REVIEW_REQUIRED 로 강등 */
const CONSUMER_CONTEXT = /(막막|고민|신경\s*쓰|부담스러|번거로|어려워|잊게)/;

export function ruleB(input: GuardProductInput): GuardFinding[] {
  const out: GuardFinding[] = [];
  const scan = (text: string, re: RegExp, lang: 'ko' | 'en', field: string) => {
    for (const m of matchAll(re, text)) {
      const ctx = contextAround(text, m.index, 45);
      const consumerish = lang === 'ko' && CONSUMER_CONTEXT.test(ctx);
      out.push({
        ruleId: consumerish ? 'B-SUPERLATIVE-CONTEXT-002' : 'B-SUPERLATIVE-001',
        severity: consumerish ? 'WARNING' : 'ERROR',
        status: consumerish ? 'REVIEW_REQUIRED' : 'BLOCKED',
        language: lang, field, matchedText: m.text,
        sourceEvidence: null,
        message: consumerish
          ? `비교 표현이지만 소비자 상황 문맥으로 보입니다: "${ctx}" — 제품 비교 주장이면 삭제해야 합니다.`
          : `전수 비교 근거 없이 최상급·비교급을 사용했습니다: "${ctx}"`,
        suggestedAction: consumerish
          ? '제품·그룹 비교 주장이 아닌지 사람이 확인하십시오.'
          : '비교를 삭제하고 수치를 그대로 기술하십시오(예: "1억 CFU 기준으로 설계된 제품").',
      });
    }
  };
  scan(stripHtml(input.drafts.ko), SUPERLATIVE_KO, 'ko', 'koDraft');
  scan(stripHtml(input.drafts.ko), COMPARATIVE_KO, 'ko', 'koDraft');
  scan(stripHtml(input.drafts.en), SUPERLATIVE_EN, 'en', 'enDraft');
  // 규격 최소·최대치 — **문자열이 아니라 공식 규격 문맥**으로 판정 (V1.1 튜닝)
  {
    const en = stripHtml(input.drafts.en);
    // 공식 BASE_STANDARD 가 "…이상/이하/not less than" 규격을 쓰는가?
    const srcHasSpecBound = /이상|이하|미만|초과|not\s+less\s+than|at\s+least/i.test(input.source.baseStandard);
    for (const m of matchAll(SPEC_MINMAX_EN, en)) {
      const ctx = contextAround(en, m.index, 55);
      // 규격 인용 문맥: 수량/단위와 함께 쓰였고 원문에도 규격 하한이 있음.
      // ⚠️ 단위는 반드시 **경계와 수량**을 요구한다. `g` 를 맨몸 대안으로 두면
      //    "mornin(g)" 같은 임의 단어가 규격 인용으로 오인돼 INFO 로 강등된다(=미탐).
      const SPEC_QUOTE_CTX =
        /(\bCFU\b|\d\s*(?:mg|g|billion|million)\b|\bbillion\b|\bmillion\b|labelled basis|\bper\s)/i;
      const specQuote = srcHasSpecBound && SPEC_QUOTE_CTX.test(ctx);
      // 제품·그룹 비교 문맥이면 규격 인용이 아니다
      const comparative = /(than|in this group|compared|other products|competitors)/i.test(ctx);
      if (specQuote && !comparative) {
        out.push({
          ruleId: 'B-SPEC-MINMAX-003', severity: 'INFO', status: 'INFO', language: 'en',
          field: 'enDraft', matchedText: m.text,
          sourceEvidence: `BASE_STANDARD 규격 하한 존재: ${truncate(input.source.baseStandard, 60)}`,
          message: `공식 규격 인용입니다("${m.text}") — BASE_STANDARD 의 "…이상" 에 대응.`,
          suggestedAction: '조치 불요(규격 인용).',
        });
        continue;
      }
      out.push({
        ruleId: comparative ? 'B-SPEC-MINMAX-COMPARE-004' : 'B-SPEC-MINMAX-003',
        severity: comparative ? 'ERROR' : 'WARNING',
        status: comparative ? 'BLOCKED' : 'REVIEW_REQUIRED',
        language: 'en', field: 'enDraft', matchedText: m.text,
        sourceEvidence: srcHasSpecBound
          ? `BASE_STANDARD: ${truncate(input.source.baseStandard, 60)}`
          : 'BASE_STANDARD 에 규격 하한 표현 없음',
        message: comparative
          ? `규격어가 **제품·그룹 비교**로 사용됐습니다: "${ctx}"`
          : `규격 최소·최대치 표현이나 규격 인용 문맥이 아닙니다: "${ctx}"`,
        suggestedAction: comparative
          ? '비교 주장을 삭제하십시오(전수 비교 근거 없음).'
          : '공식 규격 인용이면 수량·단위와 함께 쓰십시오. 제품 비교면 삭제하십시오.',
      });
    }
  }
  if (out.length === 0) out.push(ok('B-SUPERLATIVE-001', 'drafts', '최상급·비교급 검출 없음'));
  return out;
}

// ═══ C. 부재 → 허용/부존재 ═════════════════════════════════════════════════

const ABSENCE_KO = /(필요하지\s*않|필요\s*없|불필요|하지\s*않아도\s*되|아닙니다|들어\s*있지\s*않|포함되어\s*있지\s*않|별도\s*(보관\s*)?조건이\s*없|표시되어\s*있지\s*않)/g;
const ABSENCE_EN = /\b(no\s+refrigeration|without\s+refrigeration|does\s+not\s+(require|need)|not\s+required|free\s+from|room-temperature\s+storage)\b/gi;
/** "no need to time it around eating" 처럼 **원문 지시("식전·식후 어느때나")의 번역**일 수 있다 → REVIEW */
const ABSENCE_SOFT_EN = /\bno\s+need\s+to\b/gi;
/** 수치·계산 서술(제품 속성 주장 아님) → 오탐 */
const NUMERIC_CONTEXT = /(계산|환산|세\s*값|일치)/;
/**
 * 긍정 원문에서 파생된 부정형 대비 표현 → 근거 있음.
 * 예: 원문 "씹어서 섭취" → "물로 삼키는 방식이 **아닙니다**"
 * 창작이 아니라 **표현 방식** 문제이므로 BLOCKED 가 아니라 REVIEW(긍정형 권고).
 */
const CONTRAST_CONTEXT = /(씹어|츄어블|장용|이중\s*캡슐)/;

export function ruleC(input: GuardProductInput): GuardFinding[] {
  const out: GuardFinding[] = [];
  const src = `${input.source.baseStandard} ${input.source.intake} ${input.source.caution} ${input.source.dosageForm}`;
  const scan = (text: string, re: RegExp, lang: 'ko' | 'en', field: string) => {
    for (const m of matchAll(re, text)) {
      const ctx = contextAround(text, m.index, 45);
      if (lang === 'ko' && NUMERIC_CONTEXT.test(ctx)) {
        out.push({
          ruleId: 'C-ABSENCE-NUMERIC-003', severity: 'INFO', status: 'REVIEW_REQUIRED', language: lang,
          field, matchedText: m.text, sourceEvidence: null,
          message: `부정형이지만 수치 서술 문맥으로 보입니다: "${ctx}"`,
          suggestedAction: '제품 속성 주장이 아닌지 확인하십시오(오탐 가능).',
        });
        continue;
      }
      // 원문의 긍정 사실(씹어서/장용성 등)에서 파생된 부정형 대비 → 창작 아님. 표현만 조정 권고.
      if (lang === 'ko' && CONTRAST_CONTEXT.test(ctx) && CONTRAST_CONTEXT.test(src)) {
        out.push({
          ruleId: 'C-ABSENCE-CONTRAST-005', severity: 'WARNING', status: 'REVIEW_REQUIRED', language: lang,
          field, matchedText: m.text,
          sourceEvidence: `원문에 대비 근거 있음 (SRV_USE/SUNGSANG: ${truncate(input.source.intake, 40)})`,
          message: `원문 사실에서 파생된 부정형 대비입니다: "${ctx}" — 근거는 있으나 부정형입니다.`,
          suggestedAction: '긍정형으로 바꾸는 것을 권합니다(예: "씹어서 섭취하도록 표시되어 있습니다").',
        });
        continue;
      }
      out.push({
        ruleId: 'C-ABSENCE-AS-PERMISSION-001', severity: 'ERROR', status: 'BLOCKED', language: lang,
        field, matchedText: m.text,
        sourceEvidence: `원문에 해당 부재·허용 명시 없음 (검색 대상: BASE_STANDARD/SRV_USE/INTAKE_HINT1/SUNGSANG)`,
        message: `원문에 없는 것을 "없다/불필요하다"로 기술했을 수 있습니다: "${ctx}"`,
        suggestedAction: '원문이 직접 뒷받침하지 않으면 삭제하십시오. 부정형 대신 긍정형(있는 것)으로 기술하십시오.',
      });
    }
  };
  scan(stripHtml(input.drafts.ko), ABSENCE_KO, 'ko', 'koDraft');
  scan(stripHtml(input.drafts.en), ABSENCE_EN, 'en', 'enDraft');
  {
    const en = stripHtml(input.drafts.en);
    for (const m of matchAll(ABSENCE_SOFT_EN, en)) {
      out.push({
        ruleId: 'C-ABSENCE-SOFT-004', severity: 'WARNING', status: 'REVIEW_REQUIRED', language: 'en',
        field: 'enDraft', matchedText: m.text,
        sourceEvidence: `SRV_USE: ${truncate(input.source.intake, 70)}`,
        message: `"${m.text}" — 원문 지시의 번역인지 부재 추론인지 확인이 필요합니다: "${contextAround(en, m.index, 45)}"`,
        suggestedAction: '원문이 직접 뒷받침하지 않으면 삭제하십시오.',
      });
    }
  }
  void src;
  if (out.length === 0) out.push(ok('C-ABSENCE-AS-PERMISSION-001', 'drafts', '부재→허용 표현 검출 없음'));
  return out;
}

// ═══ D. 근거 없는 제품 주장 ════════════════════════════════════════════════

const CLAIM_KO: Array<[RegExp, string]> = [
  [/부담\s*(이\s*)?(적|없)/g, '부담이 적다/없다'],
  [/(?<![가-힣])순한/g, '순한'],
  [/입문용|처음\s*시작하|이제\s*(막\s*)?챙겨/g, '입문용'],
  [/안심하고/g, '안심'],
  [/흡수율|흡수가\s*(좋|빠|잘)/g, '흡수'],
  [/장까지\s*(도달|전달)/g, '장까지 도달'],
  [/살아남/g, '생존'],
  [/효과가\s*좋/g, '효과가 좋다'],
  [/휴대(가)?\s*(편|간편)/g, '휴대 편의'],
  [/특허/g, '특허'],
  [/코팅/g, '코팅'],
  [/냉장\s*(이)?\s*(불필요|없이)/g, '냉장 불필요'],
];
const CLAIM_EN: Array<[RegExp, string]> = [
  [/\bgentle\b/gi, 'gentle'], [/\beasy to take\b/gi, 'easy to take'],
  [/\bfamily-friendly\b/gi, 'family-friendly'], [/\bkid-friendly\b/gi, 'kid-friendly'],
  [/\breaches the (intestine|gut)\b/gi, 'reaches the gut'], [/\bsurvives\b/gi, 'survives'],
  [/\bbetter absorption\b/gi, 'absorption'], [/\bpatented\b/gi, 'patented'],
  [/\bcoated\b/gi, 'coated'], [/\bno refrigeration needed\b/gi, 'no refrigeration'],
];

export function ruleD(input: GuardProductInput): GuardFinding[] {
  const out: GuardFinding[] = [];
  const src = `${input.source.baseStandard} ${input.source.intake} ${input.source.caution} ${input.source.dosageForm}`;
  const scan = (text: string, list: Array<[RegExp, string]>, lang: 'ko' | 'en', field: string) => {
    for (const [re, label] of list) {
      for (const m of matchAll(re, text)) {
        const ctx = contextAround(text, m.index, 45);
        // 원문에 근거 키워드가 있으면 REVIEW(문맥 판정), 없으면 BLOCKED
        const grounded = srcHas(src, label);
        const consumerish = lang === 'ko' && CONSUMER_CONTEXT.test(ctx);
        out.push({
          ruleId: grounded ? 'D-CLAIM-GROUNDED-002' : consumerish ? 'D-CLAIM-CONTEXT-003' : 'D-CLAIM-UNGROUNDED-001',
          severity: grounded || consumerish ? 'WARNING' : 'ERROR',
          status: grounded || consumerish ? 'REVIEW_REQUIRED' : 'BLOCKED',
          language: lang, field, matchedText: m.text,
          sourceEvidence: grounded ? `원문에 "${label}" 관련 표현 존재` : '원문에 근거 없음',
          message: grounded
            ? `제품 주장(${label})이 원문 근거와 일치하는지 확인이 필요합니다: "${ctx}"`
            : consumerish
              ? `소비자 상황 표현으로 보이나 제품 주장일 수 있습니다: "${ctx}"`
              : `원문 근거 없는 제품 주장(${label})입니다: "${ctx}"`,
          suggestedAction: grounded || consumerish
            ? '원문 근거 위치를 §E 표에 기록하거나 삭제하십시오.'
            : '삭제하십시오. 제품 주장은 원문 근거가 있을 때만 가능합니다.',
        });
      }
    }
  };
  scan(stripHtml(input.drafts.ko), CLAIM_KO, 'ko', 'koDraft');
  scan(stripHtml(input.drafts.en), CLAIM_EN, 'en', 'enDraft');

  // D-7 (V1.2) — "표시량을 **유통기한까지 보장**한다" 주장.
  //   BASE_STANDARD 는 "표시량(N CFU/기준량) **이상**" 이라는 **규격**만 진술한다.
  //   수치·기준량은 근거가 있으나 다음 두 요소는 **공식 원문에 없다**:
  //     ① 보장 **주체** — 규격은 기준이지 제품이 소비자에게 하는 약속이 아니다
  //     ② 시간 **범위** — "유통기한까지" 는 원문 어디에도 없다
  //   "표시량은 유통기한까지 유지되어야 한다" 는 규제 일반지식을 끌어오는 것은
  //   **외부 지식 유입(실패유형 ②)** 이자 **추론 확장(실패유형 ⑤)** 이다.
  //   원문이 실제로 그 연결을 진술하면(예: 유통기한까지 균수 보장) grounded 로 REVIEW.
  {
    const srcAll = `${input.source.baseStandard} ${input.source.intake} ${input.source.caution} ${input.source.dosageForm} ${input.source.mainFunction}`;
    const srcStatesShelfGuarantee = /유통\s*기한|shelf\s*life|보장/i.test(srcAll);
    const claims: Array<[RegExp, 'ko' | 'en', string]> = [
      [/유통\s*기한\s*까지[^。.]{0,24}보장|보장[^。.]{0,24}유통\s*기한\s*까지/g, 'ko', 'koDraft'],
      [/guarantee[sd]?[^.]{0,90}shelf\s*life|shelf\s*life[^.]{0,50}guarantee[sd]?/gi, 'en', 'enDraft'],
    ];
    for (const [re, lang, field] of claims) {
      const text = stripHtml(lang === 'ko' ? input.drafts.ko : input.drafts.en);
      for (const m of matchAll(re, text)) {
        out.push({
          ruleId: srcStatesShelfGuarantee ? 'D-SHELFLIFE-GUARANTEE-GROUNDED-008' : 'D-SHELFLIFE-GUARANTEE-007',
          severity: srcStatesShelfGuarantee ? 'WARNING' : 'ERROR',
          status: srcStatesShelfGuarantee ? 'REVIEW_REQUIRED' : 'BLOCKED',
          language: lang, field, matchedText: truncate(m.text, 60),
          sourceEvidence: srcStatesShelfGuarantee
            ? `원문에 유통기한·보장 표현 존재: ${truncate(srcAll, 60)}`
            : `BASE_STANDARD 는 규격만 진술: "${truncate(input.source.baseStandard, 60)}" — 유통기한·보장 표현 없음`,
          message: srcStatesShelfGuarantee
            ? `유통기한 보장 주장의 원문 근거를 사람이 확인하십시오: "${truncate(m.text, 50)}"`
            : `원문에 없는 **유통기한 보장** 주장입니다: "${truncate(m.text, 50)}". 원문은 "표시량 … 이상" 이라는 규격만 진술합니다.`,
          suggestedAction: srcStatesShelfGuarantee
            ? '원문 근거 위치를 §E 표에 기록하십시오.'
            : '보장 주체·시간 범위를 삭제하고 규격을 규격으로 기술하십시오. 예: "이 제품의 표시 기준은 …당 N CFU 이상입니다" / "The labelled standard for this product is at least N CFU per …".',
        });
      }
    }
  }

  if (out.length === 0) out.push(ok('D-CLAIM-UNGROUNDED-001', 'drafts', '근거 없는 제품 주장 검출 없음'));
  return out;
}

function srcHas(src: string, label: string): boolean {
  const map: Record<string, RegExp> = {
    '코팅': /코팅|장용/, '특허': /특허/, '흡수': /흡수/, '장까지 도달': /장용|장에서/,
    '냉장 불필요': /냉장/, '휴대 편의': /휴대/,
  };
  const re = map[label];
  return re ? re.test(src) : false;
}

// ═══ E. 제품명 유도 주장 ═══════════════════════════════════════════════════

const NAME_TOKENS: Array<[RegExp, RegExp, string]> = [
  // [제품명 토큰, 본문 유도 표현, 설명]
  [/키즈|kids/i, /어린이(에게)?\s*(적합|좋|맞)|아이(에게)?\s*(적합|좋)|어린이용|키즈용|for children|suitable for children|kid-friendly/gi, '키즈 → 어린이 적합'],
  [/온가족|패밀리|family/i, /가족\s*모두|온\s*가족이|전\s*연령|whole family|all ages/gi, '온가족/패밀리 → 가족 모두 적합'],
  [/이너밸런스|balance/i, /여성(의)?\s*(균형|건강)|호르몬|women'?s balance|hormonal/gi, '이너밸런스 → 여성 기능성'],
  [/디땅트|detente|détente/i, /긴장\s*(완화|이완)|스트레스|릴랙스|relax|calm|stress|tension/gi, '디땅트 → 긴장 완화'],
  [/슬림|slim/i, /체지방|다이어트|살\s*빠|weight loss|slimming/gi, '슬림 → 체중 감소'],
  [/면역|immun/i, /면역력?\s*(증진|강화|향상)|immune (boost|support)/gi, '면역 → 면역 기능성'],
  [/브레인|brain|기억/i, /기억력|인지|집중력|memory|cognitive/gi, '브레인 → 인지 기능성'],
  [/파워|power/i, /정력|활력\s*증진|stamina|vitality boost/gi, '파워 → 활력 기능성'],
];

export function ruleE(input: GuardProductInput): GuardFinding[] {
  const out: GuardFinding[] = [];
  const name = input.productName;
  const mainFn = input.source.mainFunction;
  const texts: Array<['ko' | 'en', string, string]> = [
    ['ko', stripHtml(input.drafts.ko), 'koDraft'],
    ['en', stripHtml(input.drafts.en), 'enDraft'],
  ];
  for (const [nameRe, bodyRe, label] of NAME_TOKENS) {
    if (!nameRe.test(name)) continue;
    for (const [lang, text, field] of texts) {
      for (const m of matchAll(bodyRe, text)) {
        // 공식 기능성(MAIN_FNCTN)에 해당 표현이 있으면 근거 있음
        const grounded = new RegExp(m.text.slice(0, 4)).test(mainFn);
        out.push({
          ruleId: grounded ? 'E-NAME-DERIVED-GROUNDED-002' : 'E-NAME-DERIVED-001',
          severity: grounded ? 'WARNING' : 'ERROR',
          status: grounded ? 'REVIEW_REQUIRED' : 'BLOCKED',
          language: lang, field, matchedText: m.text,
          sourceEvidence: `제품명="${name}" / MAIN_FNCTN="${truncate(mainFn, 70)}"`,
          message: grounded
            ? `제품명 유도 의심(${label}) — 다만 공식 기능성에 유사 표현이 있어 확인이 필요합니다.`
            : `제품명(${label})을 근거로 본문 주장을 만들었습니다. 공식 기능성에 해당 근거가 없습니다.`,
          suggestedAction: '제품명은 그대로 표기만 하고, 이름에서 기능성·대상성을 유도하지 마십시오.',
        });
      }
    }
  }
  if (out.length === 0) out.push(ok('E-NAME-DERIVED-001', 'drafts', '제품명 유도 주장 검출 없음'));
  return out;
}

// ═══ F. 연령 범위 ══════════════════════════════════════════════════════════

const AGE_BOUNDARY_KO = /([0-9]+\s*(세|개월))\s*(이상|미만|이하|초과)/g;
const AGE_BOUNDARY_EN = /\bages?\s+[0-9]+\s+to\s+under\s+[0-9]+|\b[0-9]+\s*(months?|years?)\s+to\s+under\s+[0-9]+/gi;
const KIDS_NAME = /키즈|kids|어린이|베베|베이비|baby/i;
const KIDS_CLAIM = /어린이(에게)?\s*(적합|좋|맞)|어린이용|아이(에게)?\s*(적합|좋)|for children|suitable for children/gi;

export function ruleF(input: GuardProductInput): GuardFinding[] {
  const out: GuardFinding[] = [];
  const ageRaw = input.grounding.ageBandsRaw ?? '';
  const hasAgeBands = ageRaw.trim().length > 0;
  const ko = stripHtml(input.drafts.ko);
  const en = stripHtml(input.drafts.en);

  // F-1: 원문이 "이상/미만" 을 쓰지 않았는데 본문이 경계를 확정
  //      ⚠️ 원문 대조는 **양쪽 모두** 공백 제거 후 비교(원문 "9세 이상" ↔ 본문 "9세 이상").
  const ageRawNoSp = ageRaw.replace(/\s+/g, '');
  for (const m of matchAll(AGE_BOUNDARY_KO, ko)) {
    if (ageRawNoSp.includes(m.text.replace(/\s+/g, ''))) continue; // 원문이 그 경계를 명시 → 그대로 쓴 것
    out.push({
      ruleId: 'F-AGE-BOUNDARY-001', severity: 'ERROR', status: 'BLOCKED', language: 'ko',
      field: 'koDraft', matchedText: m.text,
      sourceEvidence: hasAgeBands ? `SRV_USE 연령 표기: "${truncate(ageRaw, 80)}"` : 'SRV_USE 에 연령 표기 없음',
      message: `원문보다 연령 경계를 명확하게 확정했습니다("${m.text}"). 원문 표기를 그대로 보존해야 합니다.`,
      suggestedAction: '원문 표기 그대로 쓰십시오(예: 원문 "4-9세" → "4-9세"). "이상/미만"은 원문이 명시할 때만.',
    });
  }
  for (const m of matchAll(AGE_BOUNDARY_EN, en)) {
    out.push({
      ruleId: 'F-AGE-BOUNDARY-001', severity: 'ERROR', status: 'BLOCKED', language: 'en',
      field: 'enDraft', matchedText: m.text,
      sourceEvidence: hasAgeBands ? `SRV_USE: "${truncate(ageRaw, 80)}"` : 'SRV_USE 에 연령 표기 없음',
      message: `영어에서 연령 경계를 확정했습니다("${m.text}").`,
      suggestedAction: '범위는 범위로: "ages 4–9" · "ages 6 months–4 years". "to under" 금지.',
    });
  }

  // F-3: 제품명만 키즈 + 원문 연령별 없음 + 본문 어린이 적합 주장
  if (KIDS_NAME.test(input.productName) && !hasAgeBands) {
    for (const [lang, text, field] of [['ko', ko, 'koDraft'], ['en', en, 'enDraft']] as const) {
      for (const m of matchAll(KIDS_CLAIM, text)) {
        out.push({
          ruleId: 'F-KIDS-NAME-001', severity: 'ERROR', status: 'BLOCKED', language: lang,
          field, matchedText: m.text,
          sourceEvidence: `제품명="${input.productName}" / 원문 연령별 섭취량 없음 / INTAKE_HINT1="${truncate(input.source.caution, 60)}"`,
          message: '제품명에만 키즈가 있고 원문에 연령별 섭취량이 없는데 어린이 적합을 주장했습니다.',
          suggestedAction: '어린이 적합 주장을 삭제하십시오. 주의사항의 "어린이가 함부로 섭취하지 않도록 지도"는 적합 근거가 아닙니다.',
        });
      }
    }
  }
  if (out.length === 0)
    out.push(ok('F-AGE-BOUNDARY-001', 'drafts', hasAgeBands ? '연령 경계 원문 보존 확인' : '연령 관련 위반 없음'));
  return out;
}

// ═══ G. 제형·섭취방법 일반화 ═══════════════════════════════════════════════

const DIRECT_KO = /물\s*없이|그대로\s*섭취|직접\s*섭취|직접\s*드/g;
// ⚠️ "straight from the label" 같은 오탐 방지 — **섭취 문맥**에서만 매칭
const DIRECT_EN = /\b(without water|taken?\s+(it\s+)?straight|straight,?\s+without|tipped\s+straight|taken?\s+directly|take\s+it\s+directly)\b/gi;
const CHEW_KO = /씹어/;

export function ruleG(input: GuardProductInput): GuardFinding[] {
  const out: GuardFinding[] = [];
  const intake = input.source.intake;
  // ⚠️ V1.2: `그대로` 누락으로 **원문이 문자 그대로 허용하는 표현을 차단**하고 있었다.
  //    실측: 리웰키드업 SRV_USE = "…타거나 **그대로 섭취**하십시오" / 닥터프로바 = "1회 1포를 **그대로** 혹은 물과 함께 섭취"
  //    원문이 "그대로"라고 적었는데 초안의 "그대로 섭취"를 제형 기반 추정으로 오판했다.
  const srcDirect = /직접|물\s*없이|털어서|그대로/.test(intake);
  const srcChew = /씹어/.test(intake);
  // 원문 자체가 "물과 함께"를 지시하면 츄어블이어도 물과 함께가 맞다.
  //    실측: 청인 해우 SRV_USE = "물과 함께 **씹어**드십시오" — 씹기와 물이 **양립**한다.
  const srcWithWater = /물과\s*함께|충분한\s*물|물로/.test(intake);
  const ko = stripHtml(input.drafts.ko);
  const en = stripHtml(input.drafts.en);

  if (!srcDirect) {
    for (const [lang, text, re, field] of [
      ['ko', ko, DIRECT_KO, 'koDraft'], ['en', en, DIRECT_EN, 'enDraft'],
    ] as const) {
      for (const m of matchAll(re, text)) {
        out.push({
          ruleId: 'G-FORM-GENERALIZATION-001', severity: 'ERROR', status: 'BLOCKED', language: lang,
          field, matchedText: m.text, sourceEvidence: `SRV_USE: "${truncate(intake, 80)}" — 직접 섭취 언급 없음`,
          message: '원문이 직접 섭취를 제시하지 않는데 "물 없이/그대로 섭취"를 기술했습니다(제형 기반 추정).',
          suggestedAction: '삭제하십시오. 원문이 "직접 또는 물과 함께" 처럼 명시할 때만 서술 가능합니다.',
        });
      }
    }
  }
  // 츄어블인데 물과 함께 삼키는 제품으로 서술.
  // 단 원문이 스스로 "물과 함께"를 지시하면 위반이 아니다(청인 해우: "물과 함께 씹어드십시오").
  if (srcChew && !srcWithWater && /물과\s*함께\s*(삼키|섭취)/.test(ko)) {
    out.push({
      ruleId: 'G-CHEWABLE-002', severity: 'ERROR', status: 'BLOCKED', language: 'ko',
      field: 'koDraft', matchedText: '물과 함께 삼키/섭취',
      sourceEvidence: `SRV_USE: "${truncate(intake, 80)}" — 씹어서 섭취`,
      message: '츄어블(씹어서) 제품을 물과 함께 삼키는 제품으로 기술했습니다.',
      suggestedAction: '"씹어서 섭취"로 원문 그대로 기술하십시오.',
    });
  }
  void CHEW_KO;
  if (out.length === 0) out.push(ok('G-FORM-GENERALIZATION-001', 'drafts', '제형 기반 추정 검출 없음'));
  return out;
}

// ═══ H. ko/en 대조 + §16 기능성 강화 ═══════════════════════════════════════

const ESCALATION_EN = /\b(improves|prevents|treats|boosts|enhances|ensures|restores)\b/gi;
/**
 * "guarantees at least N CFU" = 표시량 규격 문맥이지 기능성 강화(H)가 아니다 → H 에서는 REVIEW.
 * ⚠️ V1.2: `shelf life` 를 규격 문맥의 **근거로 쓰지 않는다**. "유통기한까지 보장" 은 원문에 없는
 *    추론 확장이며, 그 자체가 위반이다(D-SHELFLIFE-GUARANTEE-007 이 BLOCKED 로 검출).
 *    이전 정의는 위반 요소를 정당화 근거로 오인했다.
 */
const GUARANTEE_EN = /\bguarantees\b/gi;
const GUARANTEE_SPEC_CTX = /at\s+least|CFU|per\s+(capsule|stick|tablet)/i;
const SUPPORTS_EN = /\bsupports\b/gi;

export function ruleH(input: GuardProductInput): GuardFinding[] {
  const out: GuardFinding[] = [];
  const ko = stripHtml(input.drafts.ko);
  const en = stripHtml(input.drafts.en);

  // H-1: CFU 수량 집합 대조 (의미값)
  const koSet = uniq(extractKoCounts(ko).map((c) => c.value));
  const enSet = uniq(extractEnCounts(en).map((c) => c.value));
  for (const v of koSet) {
    if (!enSet.includes(v)) {
      out.push({
        ruleId: 'H-COUNT-MISMATCH-001', severity: 'ERROR', status: 'BLOCKED', language: 'both',
        field: 'drafts', matchedText: `${v.toLocaleString()} (ko)`,
        sourceEvidence: `ko 수량 집합=[${koSet.map((x) => x.toLocaleString()).join(', ')}] / en=[${enSet.map((x) => x.toLocaleString()).join(', ')}]`,
        message: `한국어에 있는 수량 ${v.toLocaleString()} 이 영어에 없습니다(기대 표기: ${koCountToEn(v)}).`,
        suggestedAction: `영어에 ${koCountToEn(v)} CFU 로 반영하거나 한국어에서 삭제하십시오.`,
      });
    }
  }
  for (const v of enSet) {
    if (!koSet.includes(v)) {
      out.push({
        ruleId: 'H-COUNT-MISMATCH-001', severity: 'ERROR', status: 'BLOCKED', language: 'both',
        field: 'drafts', matchedText: `${koCountToEn(v)} (en)`,
        sourceEvidence: `ko=[${koSet.map((x) => x.toLocaleString()).join(', ')}] / en=[${enSet.map((x) => x.toLocaleString()).join(', ')}]`,
        message: `영어에 있는 수량 ${koCountToEn(v)} 이 한국어에 없습니다.`,
        suggestedAction: '언어 간 수치를 일치시키십시오.',
      });
    }
  }

  // H-2: 중량 집합 대조
  const koW = uniq(extractWeights(ko).map((w) => w.mg));
  const enW = uniq(extractWeights(en).map((w) => w.mg));
  for (const v of koW) {
    if (!enW.includes(v)) {
      out.push({
        ruleId: 'H-WEIGHT-MISMATCH-002', severity: 'WARNING', status: 'REVIEW_REQUIRED', language: 'both',
        field: 'drafts', matchedText: `${v}mg (ko)`,
        sourceEvidence: `ko 중량=[${koW.join(', ')}]mg / en=[${enW.join(', ')}]mg`,
        message: `한국어 중량 ${v}mg 이 영어에 없습니다.`,
        suggestedAction: '언어 간 중량 표기를 확인하십시오(표기 단위 차이일 수 있음).',
      });
    }
  }

  // §16: 기능성 강화
  for (const m of matchAll(ESCALATION_EN, en)) {
    out.push({
      ruleId: 'H-FUNCTION-ESCALATION-003', severity: 'ERROR', status: 'BLOCKED', language: 'en',
      field: 'enDraft', matchedText: m.text,
      sourceEvidence: `MAIN_FNCTN: "${truncate(input.source.mainFunction, 70)}" (도움을 줄 수 있음)`,
      message: `영어에서 기능성이 한국어보다 강화됐습니다("${m.text}").`,
      suggestedAction: '"may help …" 프레임으로 되돌리십시오.',
    });
  }
  for (const m of matchAll(GUARANTEE_EN, en)) {
    const ctx = contextAround(en, m.index, 60);
    const specish = GUARANTEE_SPEC_CTX.test(ctx);
    out.push({
      ruleId: specish ? 'H-GUARANTEE-SPEC-006' : 'H-FUNCTION-ESCALATION-003',
      severity: specish ? 'INFO' : 'ERROR',
      status: specish ? 'REVIEW_REQUIRED' : 'BLOCKED',
      language: 'en', field: 'enDraft', matchedText: m.text,
      sourceEvidence: `BASE_STANDARD: ${truncate(input.source.baseStandard, 60)}`,
      message: specish
        ? `"guarantees" 가 표시량 규격 보장 문맥으로 보입니다: "${ctx}"`
        : `"guarantees" 로 결과를 보장했습니다: "${ctx}"`,
      suggestedAction: specish ? '표시량 규격 보장이면 PASS 입니다.' : '결과 보장 표현을 삭제하십시오.',
    });
  }
  for (const m of matchAll(SUPPORTS_EN, en)) {
    out.push({
      ruleId: 'H-FUNCTION-SUPPORTS-004', severity: 'WARNING', status: 'REVIEW_REQUIRED', language: 'en',
      field: 'enDraft', matchedText: m.text,
      sourceEvidence: `MAIN_FNCTN: "${truncate(input.source.mainFunction, 70)}"`,
      message: '"supports" 는 문맥에 따라 한국어("도움을 줄 수 있음")보다 강할 수 있습니다.',
      suggestedAction: '"may help support …" 형태인지 확인하십시오.',
    });
  }

  // 제조사 표기 (V1.1 튜닝) — 영문명을 **창작하지 않는다**. 3분기:
  //   ① 공식 영문명 있음 → 정확히 대조 (불일치·누락 = REVIEW)
  //   ② 공식 영문명 없음 → 한국어 법인명 보존 또는 음역 정책 → INFO
  //   ③ en 초안에 제조사 자체가 없음 → REVIEW
  {
    const mEn = (input.manufacturerEn ?? '').trim();
    // 제조사 흔적이 en 초안에 있는가.
    //   공식 영문 제조사명은 **원천(MFDS ENTRPS)에 존재하지 않는다**(한국어 법인명만 제공).
    //   따라서 en 초안은 한국어 법인명 보존 또는 음역 표기를 쓸 수밖에 없다.
    //   → 한국어 법인명 문자열 매칭만으로 "표기 없음"을 판정하면 음역 초안을 전부 오탐한다.
    //   실제 위험은 "제조사를 아예 안 밝힘"이므로 **제조사 지정 표기의 존재**로 판정한다.
    const koreanCoreName = input.manufacturer.replace(/\(주\)|주식회사|㈜|\)|\(|\s+/g, '');
    const MAKER_DESIGNATION_EN =
      /\b(manufactur(ed|er)\s+by|manufacturer\s*[:：]|made\s+by|produced\s+by|co\.\s*,?\s*ltd|inc\.|corp(\.|oration)?|pharm|plant)\b/i;
    const traceInEn =
      (mEn ? en.includes(mEn) : false) ||
      (koreanCoreName.length > 1 && en.includes(koreanCoreName)) ||
      MAKER_DESIGNATION_EN.test(en);

    if (mEn) {
      out.push(
        en.includes(mEn)
          ? {
              ruleId: 'H-MAKER-MATCH-005', severity: 'INFO', status: 'INFO', language: 'en',
              field: 'enDraft', matchedText: mEn, sourceEvidence: `manufacturerEn="${mEn}"`,
              message: '공식 영문 제조사명이 영어 초안과 일치합니다.',
              suggestedAction: '조치 불요.',
            }
          : {
              ruleId: 'H-MAKER-MISMATCH-005', severity: 'WARNING', status: 'REVIEW_REQUIRED', language: 'en',
              field: 'enDraft', matchedText: null,
              sourceEvidence: `manufacturerEn="${mEn}" / ENTRPS="${input.manufacturer}"`,
              message: '공식 영문 제조사명이 영어 초안에 그대로 나타나지 않습니다.',
              suggestedAction: `영어 초안의 제조사 표기를 "${mEn}" 로 맞추십시오(임의 영문명 생성 금지).`,
            },
      );
    } else if (!traceInEn) {
      out.push({
        ruleId: 'H-MAKER-ABSENT-006', severity: 'WARNING', status: 'REVIEW_REQUIRED', language: 'en',
        field: 'enDraft', matchedText: null, sourceEvidence: `ENTRPS="${input.manufacturer}" / 공식 영문명 없음`,
        message: '영어 초안에서 제조사 표기 자체가 확인되지 않습니다.',
        suggestedAction: '한국어 법인명을 보존하거나 지정된 음역 정책을 적용하십시오. **영문명 창작 금지.**',
      });
    } else {
      out.push({
        ruleId: 'H-MAKER-NO-OFFICIAL-EN-007', severity: 'INFO', status: 'INFO', language: 'en',
        field: 'enDraft', matchedText: null, sourceEvidence: `ENTRPS="${input.manufacturer}" / 공식 영문명 없음`,
        message: '공식 영문 제조사명이 없어 한국어 법인명 보존 또는 음역 표기로 처리됐습니다.',
        suggestedAction: '음역 표기가 정책에 맞는지는 표본검수에서 확인하십시오(자동 판정 대상 아님).',
      });
    }
  }

  if (out.length === 0) out.push(ok('H-COUNT-MISMATCH-001', 'drafts', 'ko/en 수치·기능성 대조 통과'));
  return out;
}

// ─── util ────────────────────────────────────────────────────────────────────

function matchAll(re: RegExp, text: string): Array<{ text: string; index: number }> {
  const out: Array<{ text: string; index: number }> = [];
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m: RegExpExecArray | null;
  while ((m = r.exec(text)) !== null) {
    out.push({ text: m[0], index: m.index });
    if (m[0].length === 0) r.lastIndex++;
  }
  return out;
}

function uniq(arr: number[]): number[] {
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}

function truncate(s: string, n: number): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}
