/**
 * Health Functional Food Official Text Parser — 건강기능식품 공식 텍스트 → 구조화 평문 (PURE, DB 무관)
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-OFFICIAL-TEXT-PARSER-DRYRUN-V1
 * 선행: CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-GATE0-V1 / -GATE-B-PREREQUISITE-SOURCE-AUDIT-V1
 *
 * 대상: ProductCandidate.raw_payload.source 의 건강기능식품 item 11필드(평면 텍스트).
 *   의약외품(XML CDATA)과 달리 HFF 는 XML 이 아니라 평문/약한 마크업 필드이므로
 *   quasi-drug-permit-official-text.parser 를 복사하지 않고 별도 설계한다.
 *
 * 정책 (WO §4·§6.1):
 *   - 순수 함수. DB/네트워크/파일/AI 미접근. 입력 raw_payload 를 변경하지 않는다.
 *   - HTML entity decode, <br>/<p> 및 CRLF 를 줄바꿈으로, ㆍ(가운뎃점 불릿)를 줄바꿈으로 정규화.
 *   - 중복 공백 제거. **숫자/단위/원료명 보존 — 지나친 재작성 금지.**
 *     (; 및 - 는 내용(예: "1-2정", "비타민-C")일 수 있어 분리하지 않는다.)
 *   - 의학적 의미 보정/효능 강화/질병명 치환을 하지 않는다. 위험 문구는 RISK flag 로만 분리.
 *
 * 섹션 매핑 (HFF 11필드 실측 기준):
 *   mainFunction ← MAIN_FNCTN(주된 기능성) · intake ← SRV_USE(섭취방법/용도)
 *   caution ← INTAKE_HINT1(섭취 시 주의사항) · baseStandard ← BASE_STANDARD(기준·규격)
 *   appearance ← SUNGSANG(성상) · storage ← PRSRV_PD(보관조건) · shelfLife ← DISTB_PD(유통기한)
 *   ingredients ← (HFF 원천 미제공 — 항상 undefined. 원료/주원료 필드 없음)
 */

import type { HealthFunctionalFoodItem } from './health-functional-food-jsonl.parser.js';

export type HealthFunctionalFoodOfficialTextFlag =
  | 'RAW_PAYLOAD_MISSING' // item 자체가 없음/비어있음
  | 'RAW_TEXT_MISSING' // 설명 후보 텍스트 섹션 전부 결손
  | 'MAIN_FUNCTION_MISSING' // MAIN_FNCTN 결손
  | 'INTAKE_MISSING' // SRV_USE 결손
  | 'BASE_STANDARD_MISSING' // BASE_STANDARD 결손
  | 'HAD_HTML' // <br>/<p>/entity 등 마크업 존재(정규화됨)
  | 'RISK_DISEASE_CLAIM'; // 질병 치료/예방 암시 등 검토 필요 문구

export const HFF_OFFICIAL_TEXT_FLAGS: HealthFunctionalFoodOfficialTextFlag[] = [
  'RAW_PAYLOAD_MISSING',
  'RAW_TEXT_MISSING',
  'MAIN_FUNCTION_MISSING',
  'INTAKE_MISSING',
  'BASE_STANDARD_MISSING',
  'HAD_HTML',
  'RISK_DISEASE_CLAIM',
];

/** 설명 생성 적합성 분류 (WO §6.4) */
export type HealthFunctionalFoodDescriptionSuitability =
  | 'READY_FOR_GUIDELINE' // 핵심 필드(기능성 + 섭취/기준) 충분
  | 'PARTIAL_TEXT_ONLY' // 일부 공식 텍스트만
  | 'REVIEW_RISK_CLAIM' // 질병 치료/예방 암시 등 검토 필요
  | 'INSUFFICIENT_TEXT' // 설명 생성용 공식 텍스트 부족
  | 'RAW_PAYLOAD_MISSING'; // 원문 없음

export interface HealthFunctionalFoodOfficialTextSections {
  mainFunction?: string;
  intake?: string;
  baseStandard?: string;
  appearance?: string;
  storage?: string;
  shelfLife?: string;
  caution?: string;
  ingredients?: string; // HFF 미제공 — 항상 부재
}

export interface HealthFunctionalFoodOfficialTextParseResult {
  sourceKind: 'health_functional_food';
  sttemntNo: string | null;
  productName: string | null;
  manufacturerName: string | null;
  sections: HealthFunctionalFoodOfficialTextSections;
  flags: HealthFunctionalFoodOfficialTextFlag[];
  metrics: {
    sourceFieldCount: number; // 원천에 값이 있던 설명 텍스트 필드 수(최대 7)
    parsedSectionCount: number; // 결과 섹션 수(값 존재)
    textLength: number; // 결합 섹션 텍스트 총 길이
  };
}

/** 설명 생성 핵심 텍스트 필드(적합성 판단 기준). ingredients 는 원천 부재라 제외. */
const DESCRIPTION_TEXT_KEYS: (keyof HealthFunctionalFoodOfficialTextSections)[] = [
  'mainFunction',
  'intake',
  'baseStandard',
  'appearance',
  'storage',
  'shelfLife',
  'caution',
];

/**
 * 질병 치료/예방 암시 등 검토 필요 문구 휴리스틱.
 * 과다 flag 는 안전(검토용), 과소 flag 는 위험 → 보수적으로 넓게. 삭제/치환은 하지 않는다.
 * 허용된 기능성 표현("~에 도움을 줄 수 있음")과 겹치는 개선/감소/도움 은 제외.
 */
const RISK_CLAIM_PATTERN =
  /(치료|완치|치유|질병|질환|예방|진단|처방|의약품|부작용|사멸|박멸|억제제|항암|당뇨|고혈압|고지혈|관절염|치매|우울증|불면증|아토피|변비\s*치료|다이어트\s*효과)/;

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&'); // amp 마지막 (이중 디코드 방지)
}

/** 마크업 존재 여부(정규화 전 판단용). */
function hasMarkup(raw: string): boolean {
  return /<\s*(br|p|li|div|span|table|tr|td)[\s/>]/i.test(raw) || /&(?:lt|gt|amp|nbsp|quot|apos|#\d+|#x[0-9a-fA-F]+);/i.test(raw);
}

/**
 * 공식 텍스트 1개 필드 정규화 → 평문.
 * null/빈문자/공백 → ''. 숫자/단위/원료명 보존. 지나친 재작성 없음.
 */
export function normalizeOfficialTextField(raw: string | null | undefined): string {
  if (raw == null) return '';
  let s = String(raw);
  if (s.trim() === '') return '';
  // 1) 블록/행 마크업 → 줄바꿈, td → 탭
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');
  s = s.replace(/<\/\s*(p|li|div|paragraph|tr|caption)\s*>/gi, '\n');
  s = s.replace(/<\/\s*td\s*>/gi, '\t');
  // 2) 나머지 태그 제거
  s = s.replace(/<[^>]+>/g, '');
  // 3) 엔티티 디코드
  s = decodeEntities(s);
  // 4) 가운뎃점 불릿(ㆍ)만 줄바꿈으로 — ; 와 - 는 내용일 수 있어 보존
  s = s.replace(/ㆍ/g, '\n');
  // 5) 공백/줄바꿈 정리 (내용 문자는 보존)
  s = s
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ');
  return s.trim();
}

function clean(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

/**
 * 건강기능식품 item(11필드) → 구조화 공식 텍스트 + 검토 플래그 + 메트릭.
 *
 * @param item  raw_payload.source 의 HFF item (또는 raw JSONL 의 flatten item). null 허용.
 */
export function parseHealthFunctionalFoodOfficialText(
  item: HealthFunctionalFoodItem | null | undefined,
): HealthFunctionalFoodOfficialTextParseResult {
  const flags: HealthFunctionalFoodOfficialTextFlag[] = [];

  if (item == null || typeof item !== 'object' || Object.keys(item).length === 0) {
    return {
      sourceKind: 'health_functional_food',
      sttemntNo: null,
      productName: null,
      manufacturerName: null,
      sections: {},
      flags: ['RAW_PAYLOAD_MISSING', 'RAW_TEXT_MISSING', 'MAIN_FUNCTION_MISSING', 'INTAKE_MISSING', 'BASE_STANDARD_MISSING'],
      metrics: { sourceFieldCount: 0, parsedSectionCount: 0, textLength: 0 },
    };
  }

  // 원천 텍스트 필드(정규화 전) — 마크업 판단 + 존재율 측정
  const sourceRaw = {
    mainFunction: clean(item.MAIN_FNCTN),
    intake: clean(item.SRV_USE),
    caution: clean(item.INTAKE_HINT1),
    baseStandard: clean(item.BASE_STANDARD),
    appearance: clean(item.SUNGSANG),
    storage: clean(item.PRSRV_PD),
    shelfLife: clean(item.DISTB_PD),
  };
  const sourceFieldCount = Object.values(sourceRaw).filter((v) => v != null).length;
  const hadHtml = Object.values(sourceRaw).some((v) => v != null && hasMarkup(v));

  // 정규화 → 섹션 (값 있는 것만 세팅)
  const sections: HealthFunctionalFoodOfficialTextSections = {};
  const set = (key: keyof HealthFunctionalFoodOfficialTextSections, raw: string | null): void => {
    if (raw == null) return;
    const norm = normalizeOfficialTextField(raw);
    if (norm.length > 0) sections[key] = norm;
  };
  set('mainFunction', sourceRaw.mainFunction);
  set('intake', sourceRaw.intake);
  set('caution', sourceRaw.caution);
  set('baseStandard', sourceRaw.baseStandard);
  set('appearance', sourceRaw.appearance);
  set('storage', sourceRaw.storage);
  set('shelfLife', sourceRaw.shelfLife);
  // ingredients: HFF 원천 미제공 → 세팅 안 함

  const combined = DESCRIPTION_TEXT_KEYS.map((k) => sections[k] ?? '').filter(Boolean).join('\n');
  const parsedSectionCount = DESCRIPTION_TEXT_KEYS.filter((k) => sections[k]).length;

  // RISK 스캔은 claim-bearing 섹션(기능성/섭취방법)만 대상.
  // caution(주의사항)의 "질환이 있거나 의약품 복용 시 상담/부작용" 류는 법정 표준 안내문이라
  // 여기에 risk 패턴을 걸면 대량 오탐(전건 boilerplate) → 소비자 문구로 재작성될 필드만 검사.
  const claimText = [sections.mainFunction, sections.intake].filter(Boolean).join('\n');

  // 플래그
  if (parsedSectionCount === 0) flags.push('RAW_TEXT_MISSING');
  if (!sections.mainFunction) flags.push('MAIN_FUNCTION_MISSING');
  if (!sections.intake) flags.push('INTAKE_MISSING');
  if (!sections.baseStandard) flags.push('BASE_STANDARD_MISSING');
  if (hadHtml) flags.push('HAD_HTML');
  if (RISK_CLAIM_PATTERN.test(claimText)) flags.push('RISK_DISEASE_CLAIM');

  return {
    sourceKind: 'health_functional_food',
    sttemntNo: clean(item.STTEMNT_NO),
    productName: clean(item.PRDUCT),
    manufacturerName: clean(item.ENTRPS),
    sections,
    flags,
    metrics: {
      sourceFieldCount,
      parsedSectionCount,
      textLength: combined.length,
    },
  };
}

/**
 * 설명 생성 적합성 분류 (WO §6.4). 순수 함수 — 후보 status 등 변경 없음.
 * 우선순위: RAW_PAYLOAD_MISSING → REVIEW_RISK_CLAIM → READY → PARTIAL → INSUFFICIENT.
 */
export function classifyHealthFunctionalFoodDescriptionSuitability(
  result: HealthFunctionalFoodOfficialTextParseResult,
): HealthFunctionalFoodDescriptionSuitability {
  if (result.flags.includes('RAW_PAYLOAD_MISSING')) return 'RAW_PAYLOAD_MISSING';
  if (result.flags.includes('RISK_DISEASE_CLAIM')) return 'REVIEW_RISK_CLAIM';

  const hasMain = !!result.sections.mainFunction;
  const hasIntakeOrBase = !!result.sections.intake || !!result.sections.baseStandard;

  // READY: 기능성 + (섭취방법 or 기준규격) 존재 + 충분한 텍스트
  if (hasMain && hasIntakeOrBase && result.metrics.textLength >= 40) return 'READY_FOR_GUIDELINE';
  // INSUFFICIENT: 텍스트가 사실상 없음
  if (result.metrics.parsedSectionCount === 0 || result.metrics.textLength < 10) return 'INSUFFICIENT_TEXT';
  // 그 외: 일부 텍스트만
  return 'PARTIAL_TEXT_ONLY';
}
