/**
 * Health Functional Food Store Description — Guards (PURE, DB/AI 무관)
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-DRYRUN-V1 §4
 *
 * 3종 품질 검수 장치 + 사전 필터. 전부 순수 함수(입력 불변, 부작용 없음).
 *  - computePreFilterFlags: 입력 seed 기반 사전 flag (생성 전 대상 분류)
 *  - sourceFidelityGuard   : 공식 원문 밖 확장(효능/원료/의미확대/창작) 검출  — 금지 룰셋 아님
 *  - medicineLikeWordingGuard: 의약품식 단정 문장 검출 (caution 원문 표현은 제외)
 *  - draftQualityGuard     : 매장 설명 부적합(짧음/광고적/법령투/caution·intake 누락) 검출
 *  - classifyPreGeneration / classifyDraft: WO §5.6 판정 라벨 매핑
 *
 * 원칙(seed-design §5·§6, AI-DRAFT-DRYRUN CHECK): 기능성/질병 표현 "일괄 금지" 아님.
 *   공식 원문에 있는 기능성·주의·질병 문구는 사용 가능. guard 는 "원문 밖 확장/의약품 단정/품질"만 본다.
 */

import type {
  HealthFunctionalFoodDescriptionSeed,
  HealthFunctionalFoodStoreDescriptionDraft,
} from './health-functional-food-store-description.prompt.js';

// ─── 사전 필터 flag (입력측) ─────────────────────────────────────────────────

export type HffDescriptionPreFlag =
  | 'RAW_MATERIAL_OR_OEM'
  | 'EXPORT_ONLY'
  | 'TERSE_CLAIM'
  | 'MAIN_FUNCTION_MISSING'
  | 'INTAKE_MISSING'
  | 'CAUTION_MISSING'
  | 'LONG_TEXT'
  | 'MULTI_CLAIM';

export const HFF_DESCRIPTION_PRE_FLAGS: HffDescriptionPreFlag[] = [
  'RAW_MATERIAL_OR_OEM',
  'EXPORT_ONLY',
  'TERSE_CLAIM',
  'MAIN_FUNCTION_MISSING',
  'INTAKE_MISSING',
  'CAUTION_MISSING',
  'LONG_TEXT',
  'MULTI_CLAIM',
];

/** 원료/OEM 정황: 섭취방법이 "원료로 사용" 류이거나 제품명에 원료/제조용 표기 */
const RAW_MATERIAL_PATTERN = /원료\s*로?\s*사용|원료용|제조\s*용\s*원료|벌크|대용량\s*원료|OEM|ODM|식품\s*첨가/i;
/** 수출용 정황 */
const EXPORT_PATTERN = /수출\s*용|수출\s*전용|export\s*only/i;
/** 식약처 인정 기능성 어미(있으면 terse 아님) */
const APPROVED_SUFFIX_PATTERN = /도움을?\s*줄\s*수\s*있|필요|유지하는데|유지하는\s데|보호하는데|보호하는\s데|감소에\s*도움|개선에\s*도움|증진에\s*도움|관여|생성에\s*필요/;

const LONG_TEXT_THRESHOLD = 2000;
const MULTI_CLAIM_THRESHOLD = 5;
const TERSE_MAIN_LEN = 15;

export function computePreFilterFlags(seed: HealthFunctionalFoodDescriptionSeed): HffDescriptionPreFlag[] {
  const flags: HffDescriptionPreFlag[] = [];
  const intake = seed.intake ?? '';
  const name = seed.productName ?? '';
  const main = seed.mainFunction ?? '';

  if (RAW_MATERIAL_PATTERN.test(intake) || RAW_MATERIAL_PATTERN.test(name)) flags.push('RAW_MATERIAL_OR_OEM');
  if (EXPORT_PATTERN.test(name)) flags.push('EXPORT_ONLY');

  if (!seed.mainFunction) {
    flags.push('MAIN_FUNCTION_MISSING');
  } else if (main.trim().length < TERSE_MAIN_LEN || !APPROVED_SUFFIX_PATTERN.test(main)) {
    // 기능성은 있으나 인정 어미가 없어 AI 가 어미를 창작할 위험
    flags.push('TERSE_CLAIM');
  }

  if (!seed.intake) flags.push('INTAKE_MISSING');
  if (!seed.caution) flags.push('CAUTION_MISSING');

  const totalLen = main.length + intake.length + (seed.caution?.length ?? 0) + (seed.baseStandard?.length ?? 0);
  if (totalLen > LONG_TEXT_THRESHOLD) flags.push('LONG_TEXT');
  if (seed.functionalClaims.length >= MULTI_CLAIM_THRESHOLD) flags.push('MULTI_CLAIM');

  return flags;
}

export interface GenerationEligibilityOpts {
  excludeRawMaterial?: boolean; // 기본 true
  excludeExport?: boolean; // 기본 true
}

/** 생성 대상 여부. 원료/OEM·수출용은 기본 제외. 결측/terse 는 flag 와 함께 생성 가능. */
export function isGenerationEligible(
  flags: HffDescriptionPreFlag[],
  opts: GenerationEligibilityOpts = {},
): boolean {
  const excludeRaw = opts.excludeRawMaterial !== false;
  const excludeExport = opts.excludeExport !== false;
  if (excludeRaw && flags.includes('RAW_MATERIAL_OR_OEM')) return false;
  if (excludeExport && flags.includes('EXPORT_ONLY')) return false;
  return true;
}

// ─── 출력측 guard (draft vs seed) ────────────────────────────────────────────

/** framing/연결 stopword — 매장 문장의 정당한 틀 단어. overlap 계산에서 제외(오탐 방지). */
const FRAMING_STOPWORDS = new Set([
  '제조사', '신고', '기능성', '제품', '건강기능식품', '도움', '섭취', '있습니다', '있음', '필요',
  '유지', '관련', '안내', '입니다', '그리고', '또는', '함께', '이며', '하는', '위해', '으로',
]);

/** 한글/영숫자 content 토큰(2자 이상, framing stopword 제외) 추출 — 겹침 판정용 */
function contentTokens(s: string): string[] {
  return (s.match(/[가-힣A-Za-z0-9]{2,}/g) ?? [])
    .map((t) => t.toLowerCase())
    .filter((t) => !FRAMING_STOPWORDS.has(t));
}

export interface SourceFidelityResult {
  beyondSource: boolean;
  reasons: string[];
}

/**
 * 공식 원문 밖 확장 검출.
 *  - 원문 mainFunction 이 없는데 draft 가 기능성 문구를 만든 경우 = 창작.
 *  - draft 의 기능성 라인 content 토큰이 seed 근거(mainFunction+functionalClaims)에
 *    거의 없으면(overlap<0.5) = 원문 밖 확장 의심.
 */
export function sourceFidelityGuard(
  seed: HealthFunctionalFoodDescriptionSeed,
  draft: HealthFunctionalFoodStoreDescriptionDraft,
): SourceFidelityResult {
  const reasons: string[] = [];
  const mainLines = draft.sections?.mainFunction ?? [];

  if (!seed.mainFunction && mainLines.length > 0) {
    reasons.push('FABRICATED_MAIN_FUNCTION: 원문 기능성 결측인데 draft 가 기능성 문구 생성');
  }

  const sourceBlob = `${seed.mainFunction ?? ''}\n${seed.functionalClaims.join('\n')}`;
  const sourceSet = new Set(contentTokens(sourceBlob));
  for (const line of mainLines) {
    const toks = contentTokens(line);
    if (toks.length === 0) continue;
    const unmatched = toks.filter((t) => !sourceSet.has(t));
    const overlap = (toks.length - unmatched.length) / toks.length;
    // overlap 부족 + 미매치 content 토큰 2개 이상일 때만 확장으로 판정(framing 단어 오탐 방지)
    if (overlap < 0.5 && unmatched.length >= 2) {
      reasons.push(`LOW_SOURCE_OVERLAP: "${line.slice(0, 40)}" (overlap ${overlap.toFixed(2)}, 미매치 ${unmatched.slice(0, 4).join('/')})`);
    }
  }
  return { beyondSource: reasons.length > 0, reasons };
}

const MEDICINE_LIKE_PATTERN =
  /치료(하|합니다|되|효과|제)|완치|치유(하|되|합니다)|낫(는다|게|습니다|아)|예방(하|합니다|되|효과)|반드시\s*효과|확실(히|한)\s*효과|특효|즉효|처방|복용(하세요|하십시오|법|하면)/;

export interface MedicineLikeResult {
  medicineLike: boolean;
  hits: string[];
}

/**
 * 의약품식 단정 문장 검출. **caution 은 제외**(주의사항의 질환/의약품/부작용은 정당한 보존 대상).
 * title/summary/mainFunction/howToTake 만 검사.
 */
export function medicineLikeWordingGuard(draft: HealthFunctionalFoodStoreDescriptionDraft): MedicineLikeResult {
  const scan = [
    draft.title ?? '',
    draft.summary ?? '',
    ...(draft.sections?.mainFunction ?? []),
    ...(draft.sections?.howToTake ?? []),
  ].join('\n');
  const hits: string[] = [];
  const m = scan.match(new RegExp(MEDICINE_LIKE_PATTERN, 'g'));
  if (m) hits.push(...Array.from(new Set(m)));
  return { medicineLike: hits.length > 0, hits };
}

const AD_PATTERN = /최고|최상|업계\s*1위|베스트|강력\s*추천|100\s*%|완벽|즉시\s*효과|부작용\s*없/;

export interface DraftQualityResult {
  issues: string[];
}

/** 매장 설명 부적합 검출: caution/intake 누락, 너무 짧음, 광고적. */
export function draftQualityGuard(
  seed: HealthFunctionalFoodDescriptionSeed,
  draft: HealthFunctionalFoodStoreDescriptionDraft,
): DraftQualityResult {
  const issues: string[] = [];
  const caution = draft.sections?.caution ?? [];
  const howToTake = draft.sections?.howToTake ?? [];

  if (seed.caution && caution.length === 0) issues.push('CAUTION_LOSS');
  if (seed.intake && howToTake.length === 0 && !computePreFilterFlags(seed).includes('RAW_MATERIAL_OR_OEM'))
    issues.push('INTAKE_LOSS');

  const bodyLen = (draft.summary ?? '').length + (draft.sections?.mainFunction ?? []).join('').length;
  if (bodyLen < 20) issues.push('TOO_SHORT');

  const adScan = `${draft.title ?? ''}\n${draft.summary ?? ''}\n${(draft.sections?.mainFunction ?? []).join('\n')}`;
  if (AD_PATTERN.test(adScan)) issues.push('TOO_AD');

  return { issues };
}

// ─── 판정 라벨 (WO §5.6) ─────────────────────────────────────────────────────

export type HffBulkPreVerdict =
  | 'HOLD_RAW_MATERIAL_OR_OEM'
  | 'HOLD_EXPORT_ONLY'
  | 'HOLD_MISSING_MAIN_FUNCTION'
  | 'HOLD_TERSE_CLAIM_NEEDS_REVIEW'
  | 'ELIGIBLE_FOR_GENERATION';

/** render-only(생성 전) 입력측 분류. */
export function classifyPreGeneration(flags: HffDescriptionPreFlag[]): HffBulkPreVerdict {
  if (flags.includes('RAW_MATERIAL_OR_OEM')) return 'HOLD_RAW_MATERIAL_OR_OEM';
  if (flags.includes('EXPORT_ONLY')) return 'HOLD_EXPORT_ONLY';
  if (flags.includes('MAIN_FUNCTION_MISSING')) return 'HOLD_MISSING_MAIN_FUNCTION';
  if (flags.includes('TERSE_CLAIM')) return 'HOLD_TERSE_CLAIM_NEEDS_REVIEW';
  return 'ELIGIBLE_FOR_GENERATION';
}

export type HffBulkDraftVerdict =
  | 'PASS_READY_FOR_REVIEW'
  | 'PASS_WITH_MINOR_EDIT'
  | 'HOLD_RAW_MATERIAL_OR_OEM'
  | 'HOLD_EXPORT_ONLY'
  | 'HOLD_TERSE_CLAIM_NEEDS_REVIEW'
  | 'HOLD_MISSING_MAIN_FUNCTION'
  | 'FAIL_BEYOND_SOURCE'
  | 'FAIL_MEDICINE_LIKE'
  | 'FAIL_CAUTION_LOSS'
  | 'FAIL_JSON_PARSE'
  | 'FAIL_PROVIDER_ERROR';

/**
 * 생성된 draft(또는 실패) 분류. draft=null 은 caller 가 parseError/providerError 로 구분해 전달.
 * 우선순위: provider/parse 실패 → 원문충실도/의약품/주의누락 FAIL → 입력 HOLD → 품질 minor → PASS.
 */
export function classifyDraft(
  seed: HealthFunctionalFoodDescriptionSeed,
  draft: HealthFunctionalFoodStoreDescriptionDraft | null,
  preFlags: HffDescriptionPreFlag[],
  failureKind?: 'json_parse' | 'provider_error',
): HffBulkDraftVerdict {
  if (failureKind === 'provider_error') return 'FAIL_PROVIDER_ERROR';
  if (failureKind === 'json_parse' || draft == null) return 'FAIL_JSON_PARSE';

  if (medicineLikeWordingGuard(draft).medicineLike) return 'FAIL_MEDICINE_LIKE';
  if (sourceFidelityGuard(seed, draft).beyondSource) return 'FAIL_BEYOND_SOURCE';
  if (draftQualityGuard(seed, draft).issues.includes('CAUTION_LOSS')) return 'FAIL_CAUTION_LOSS';

  if (preFlags.includes('RAW_MATERIAL_OR_OEM')) return 'HOLD_RAW_MATERIAL_OR_OEM';
  if (preFlags.includes('EXPORT_ONLY')) return 'HOLD_EXPORT_ONLY';
  if (preFlags.includes('MAIN_FUNCTION_MISSING')) return 'HOLD_MISSING_MAIN_FUNCTION';
  if (preFlags.includes('TERSE_CLAIM')) return 'HOLD_TERSE_CLAIM_NEEDS_REVIEW';

  if (draftQualityGuard(seed, draft).issues.length > 0) return 'PASS_WITH_MINOR_EDIT';
  return 'PASS_READY_FOR_REVIEW';
}
