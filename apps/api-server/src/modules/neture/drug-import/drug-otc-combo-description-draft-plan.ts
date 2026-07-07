/**
 * Drug OTC COMBO Store Description Draft — Model A-family 적재 plan (순수)
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-V1
 *
 * GROUNDING-DRAFT-V1 drafted 27 registry group_key → **ATC 계열당 draft 1건**(6 family).
 * body 는 계열 공유(설명 1벌 → 여러 SKU). registry group_key 27개는 seed_json 에 보존.
 * DB 무관 순수 함수(fixture + classify + buildRow). resolve/apply 는 별도.
 */
import type { ParsedComboDraft } from './drug-otc-combo-description-draft-content.js';

export const DRUG_OTC_COMBO_SOURCE_LABEL = 'MFDS_DRUG_OTC' as const;

export interface ComboFamilyFixture {
  atc7: string;
  comboCode: string;
  /** content 파서 정규화 라벨(GROUNDING §5.x) */
  contentLabel: string;
  title: string;
  summary: string;
  registryGroupKeys: string[];
  reviewFlags: string[];
  subVariants: string[];
}

/** 계열별 DB 스코프(resolve 결과) */
export interface ComboFamilyResolution {
  atc7: string;
  masterTotal: number;
  otc: number;
  rx: number;
  manufacturers: number;
  spdMasters: number;
  anchorCandidateId: string | null;
  anchorMasterName: string | null;
  spdSampleIds: string[];
}

export interface ComboDraftRowPlan {
  candidate_id: string;
  source_label: string;
  source_identifier_value: string;
  draft_type: 'store_description';
  language: 'ko';
  title: string;
  summary: string;
  content_json: Record<string, unknown>;
  content_html: null;
  seed_json: Record<string, unknown>;
  guard_result: Record<string, unknown>;
  review_status: 'needs_review';
  review_flags: string[];
  ai_provider: null;
  ai_model: null;
  ai_policy_scope: null;
  ai_cost_estimate: null;
  generated_at: null;
}

const BASE_FLAGS = ['combo', 'pharmacist_review', 'spd_grounded'];

/** 가이드 §6 GMP "성분 기준 선택" 공통 문구 전문(초안의 (§6 공통 문구) placeholder 치환용). */
export const GMP_INGREDIENT_SELECTION_TEXT =
  '의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다. ' +
  '같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다. ' +
  '제품명보다 성분과 함량을 기준으로 약사에게 확인하세요. ' +
  '익숙한 제품명이 아니어도 성분 기준으로 선택할 수 있습니다.';

export const DRUG_OTC_COMBO_FAMILIES: ComboFamilyFixture[] = [
  {
    atc7: 'A06AB52',
    comboCode: 'a06ab52_combo',
    contentLabel: '변비약 — 자극성 완하제 복합 정/캡슐',
    title: '변비약 — 자극성 완하제 복합 (정/캡슐)',
    summary: '변비 및 변비에 따른 복부팽만·장내이상발효·치질 증상 완화. 취침 시 최소량부터.',
    registryGroupKeys: [
      'drug_otc::combo::oral::a06ab52_combo::5mg::tablet',
      'drug_otc::combo::oral::a06ab52_combo::16.75mg::tablet',
      'drug_otc::combo::oral::a06ab52_combo::55mg::tablet',
      'drug_otc::combo::oral::a06ab52_combo::6mg::tablet',
      'drug_otc::combo::oral::a06ab52_combo::10mg::tablet',
      'drug_otc::combo::oral::a06ab52_combo::100mg::tablet',
      'drug_otc::combo::oral::a06ab52_combo::20mg::soft_capsule',
      'drug_otc::combo::oral::a06ab52_combo::3mg::liquid',
      'drug_otc::combo::oral::a06ab52_combo::12mg::tablet',
      'drug_otc::combo::oral::a06ab52_combo::15mg::tablet',
      'drug_otc::combo::oral::a06ab52_combo::21mg::soft_capsule',
      'drug_otc::combo::oral::a06ab52_combo::50mg::tablet',
      'drug_otc::combo::oral::a06ab52_combo::3mg::tablet',
      'drug_otc::combo::oral::a06ab52_combo::6mg::soft_capsule',
    ],
    reviewFlags: [...BASE_FLAGS, 'laxative_stimulant', 'chronic_use_caution'],
    subVariants: [],
  },
  {
    atc7: 'A06AC51',
    comboCode: 'a06ac51_combo',
    contentLabel: '변비약 — 팽창성 완하제 과립',
    title: '변비약 — 팽창성 완하제 (과립)',
    summary: '변비 완화. 충분한 수분과 함께 복용, 취침 직전/누워서 복용 금지.',
    registryGroupKeys: ['drug_otc::combo::oral::a06ac51_combo::4g::granule'],
    reviewFlags: [...BASE_FLAGS, 'laxative_bulk'],
    subVariants: ['262(na) dup은 CLEANUP blocked'],
  },
  {
    atc7: 'M03BB53',
    comboCode: 'm03bb53_combo',
    contentLabel: '근이완 진통 복합 정',
    title: '근이완 진통 복합 (정)',
    summary: '신경통·요통·어깨결림 등 근긴장 동반 통증 완화.',
    registryGroupKeys: [
      'drug_otc::combo::oral::m03bb53_combo::150mg::tablet',
      'drug_otc::combo::oral::m03bb53_combo::25mg::tablet',
      'drug_otc::combo::oral::m03bb53_combo::300mg::tablet',
    ],
    reviewFlags: [...BASE_FLAGS, 'apap_overlap', 'drowsiness'],
    subVariants: ['리렉사정(300mg)=클로르족사존+아세트아미노펜(중복복용 주의)'],
  },
  {
    atc7: 'M09AB52',
    comboCode: 'm09ab52_combo',
    contentLabel: '소염효소 복합 정',
    title: '소염효소 복합 (정)',
    summary: '수술·외상 후, 유즙울체의 염증성 부종 완화.',
    registryGroupKeys: [
      'drug_otc::combo::oral::m09ab52_combo::40mg::tablet',
      'drug_otc::combo::oral::m09ab52_combo::1mg::tablet',
    ],
    reviewFlags: [...BASE_FLAGS, 'anticoagulant_caution'],
    subVariants: ['트로멜정(1mg) grounding 2'],
  },
  {
    atc7: 'A02BA53',
    comboCode: 'a02ba53_combo',
    contentLabel: '위장약 — 파모티딘 복합 정',
    title: '위장약 — 파모티딘 복합 (정)',
    summary: '위산과다·속쓰림 관련 가슴앓이 경감. 24시간 2정 초과 금지.',
    registryGroupKeys: [
      'drug_otc::combo::oral::a02ba53_combo::10mg::tablet',
      'drug_otc::combo::oral::a02ba53_combo::800mg::tablet',
    ],
    reviewFlags: [...BASE_FLAGS, 'renal_caution'],
    subVariants: ['파모콤푸츄정(800mg)=제산 복합', 'single/combo 경계 재확인(파모컴정 원문은 단일 파모티딘)'],
  },
  {
    atc7: 'M01AE51',
    comboCode: 'm01ae51_combo',
    contentLabel: '이부프로펜 진통 복합 정/연질캡슐',
    title: '이부프로펜 진통 복합 (정/연질캡슐)',
    summary: '두통·치통·생리통·근육통 등 통증 및 발열 완화. NSAID 주의.',
    registryGroupKeys: [
      'drug_otc::combo::oral::m01ae51_combo::200mg::soft_capsule',
      'drug_otc::combo::oral::m01ae51_combo::400mg::soft_capsule',
      'drug_otc::combo::oral::m01ae51_combo::200mg::tablet',
      'drug_otc::combo::oral::m01ae51_combo::75mg::tablet',
      'drug_otc::combo::oral::m01ae51_combo::250mg::soft_capsule',
    ],
    reviewFlags: [...BASE_FLAGS, 'nsaid', 'cardiovascular_caution'],
    subVariants: ['캐롤에프정(368.9mg) 제외=needs_review(SPD 원문 부재)'],
  },
];

/** 적재 가능 판정: 앵커 + OTC>0 + rx 우세 아님 + content 존재. */
export function classifyComboFamily(
  f: ComboFamilyFixture,
  r: ComboFamilyResolution,
  hasContent: boolean,
): string {
  if (r.otc === 0) return 'EXCLUDE_no_otc';
  if (!r.anchorCandidateId) return 'EXCLUDE_anchor_fail';
  if (r.rx > r.otc) return 'EXCLUDE_rx_heavy';
  if (!hasContent) return 'EXCLUDE_no_content';
  return 'INSERT_combo_review';
}

export function isComboInsertable(verdict: string): boolean {
  return verdict.startsWith('INSERT_');
}

export function buildComboDraftRowPlan(
  f: ComboFamilyFixture,
  r: ComboFamilyResolution,
  verdict: string,
  content: ParsedComboDraft,
): ComboDraftRowPlan {
  const familyKey = `drug_otc::combo::oral::${f.atc7}`;
  // §6 축약 placeholder → 전문 치환
  const ingredientSelection =
    !content.ingredientSelection || /§6\s*공통\s*문구/.test(content.ingredientSelection)
      ? GMP_INGREDIENT_SELECTION_TEXT
      : content.ingredientSelection;
  const content_json = {
    groupKey: familyKey,
    atc7: f.atc7,
    comboCode: f.comboCode,
    summaryTable: content.summaryTable,
    efficacy: content.efficacy,
    usage: content.usage,
    usageLabel: content.usageLabel ?? '복용 안내',
    caution: content.caution,
    ingredientSelection,
    bodyMarkdown: content.bodyMarkdown,
    contentSource: 'CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-GROUNDING-DRAFT-V1 §5',
    registryGroupCount: f.registryGroupKeys.length,
  };
  const seed_json = {
    familyKey,
    atc7: f.atc7,
    comboCode: f.comboCode,
    registryGroupKeys: f.registryGroupKeys,
    registryGroupCount: f.registryGroupKeys.length,
    groupScope: {
      masterTotal: r.masterTotal,
      otc: r.otc,
      rx: r.rx,
      manufacturers: r.manufacturers,
      spdMasters: r.spdMasters,
      anchorCandidate: r.anchorCandidateId,
      anchorMaster: r.anchorMasterName,
    },
    grounding: { source: 'mfds_easy_drug', spdMasters: r.spdMasters, spdSampleIds: r.spdSampleIds },
    subVariants: f.subVariants,
    exclusions: {
      coldExcluded: true,
      nutritionExcluded: true,
      motionSicknessExcluded: true,
      heldNeedsReview: ['프라본정', '캐롤에프정'],
    },
    // applyRunId 는 apply 스크립트가 주입
  };
  const guard_result = {
    verdict,
    comboClass: 'ATC_combination',
    rxPurity: r.masterTotal > 0 ? Number((r.otc / r.masterTotal).toFixed(4)) : 0,
    rxCount: r.rx,
    groundingEasyDrug: r.spdMasters,
    spdOverlap: r.spdMasters > 0,
    doseRouteManual: false,
    coldExcluded: true,
    nutritionExcluded: true,
  };
  return {
    candidate_id: r.anchorCandidateId as string,
    source_label: DRUG_OTC_COMBO_SOURCE_LABEL,
    source_identifier_value: familyKey,
    draft_type: 'store_description',
    language: 'ko',
    title: f.title,
    summary: f.summary,
    content_json,
    content_html: null,
    seed_json,
    guard_result,
    review_status: 'needs_review',
    review_flags: f.reviewFlags,
    ai_provider: null,
    ai_model: null,
    ai_policy_scope: null,
    ai_cost_estimate: null,
    generated_at: null,
  };
}
