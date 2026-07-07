/**
 * Drug OTC Store Description — 오프라인 draft → product_candidate_description_drafts 적재 PLAN (순수)
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-DESIGN-V1 (설계 + dry-run, DB write 0)
 *
 * 이 모듈은 **DB 무관 순수 로직**이다. 오프라인 CHECK 문서(pilot/5/20/50그룹)에 손으로 작성된
 * OTC 성분·함량·제형 그룹 설명서를, product_candidate_description_drafts 로 적재하기 위한
 * (1) 그룹 fixture, (2) 그룹 해상도 → verdict 분류, (3) draft row plan 조립을 제공한다.
 *
 * 설계 핵심:
 *   - HFF 는 master 부재 → candidate 1:1 draft. Drug OTC 는 master 존재 + (성분·함량·제형) 그룹 단위.
 *   - 그룹 draft 1건을 그룹의 **대표 candidate(anchorCandidateId)** 에 앵커한다(candidate_id NOT NULL FK).
 *     실제 그룹 범위는 seed_json.groupKey + masterIds/candidateIds 로 보존한다(설명 N배 복사 회피).
 *   - shared_product_descriptions(e약은요, master 기준 canonical) 에는 절대 write 하지 않는다.
 *   - dedup 축 = 활성 (candidate_id, draft_type, language) 1개(uniq_pcdd_candidate_draft_type_language_active).
 *     그룹은 disjoint master 집합 → anchorCandidate disjoint → draft key 충돌 없음.
 */

/** 오프라인 CHECK 문서에서 확정된 OTC 그룹 정의(성분·함량·제형 3축 + 근거). */
export interface DrugOtcGroupFixture {
  /** 전역 순번(pilot=1 … 50g=66) */
  seq: number;
  /** 출처 문서(pilot | 5g | 20g | 50g) */
  doc: 'pilot' | '5g' | '20g' | '50g';
  /** 사람용 라벨(성분 함량 제형) */
  label: string;
  /** name 괄호 파싱 성분값(substring(name,'\\(([^()]+)\\)\\s*$')) */
  ingredient: string;
  /** specification 첫 토큰(한글 단위, split_part(specification,' / ',1)) */
  strengthToken: string;
  /** 제형 키워드(연질캡슐 > 캡슐 > 정) */
  doseForm: '정' | '캡슐' | '연질캡슐';
  /** 문서 분류: auto=자동초안 / review=약사검토강화 / manual=수동큐레이션(투여경로 등) / low_ground=저 grounding */
  klass: 'auto' | 'review' | 'manual' | 'low_ground';
  /** 문서상 e약은요 grounding 수(참고) */
  grounding: number;
}

/** 프로덕션 DB read-only 해상도 결과(그룹당). */
export interface DrugOtcGroupResolution {
  masterTotal: number;
  otc: number;
  rx: number;
  otherCat: number;
  manufacturers: number;
  /** 그룹 OTC master 중 e약은요(shared_product_descriptions) 보유 수(참고, 제외 기준 아님) */
  spdMasters: number;
  /** 앵커 가능한 OTC master 수(csv_import candidate 연결) */
  anchorMasters: number;
  /** 대표 앵커 candidate_id(min). 없으면 null */
  anchorCandidateId: string | null;
}

export type DrugOtcDraftVerdict =
  | 'INSERT_auto'
  | 'INSERT_review_flag'
  | 'INSERT_rx_minor_flag'
  | 'INSERT_manual_flag'
  | 'INSERT_low_ground_flag'
  | 'EXCLUDE_match_fail'
  | 'EXCLUDE_anchor_fail'
  | 'EXCLUDE_rx_heavy'
  | 'EXCLUDE_no_otc';

export const DRUG_OTC_INSERT_VERDICTS: DrugOtcDraftVerdict[] = [
  'INSERT_auto',
  'INSERT_review_flag',
  'INSERT_rx_minor_flag',
  'INSERT_manual_flag',
  'INSERT_low_ground_flag',
];

export function isInsertable(v: DrugOtcDraftVerdict): boolean {
  return DRUG_OTC_INSERT_VERDICTS.includes(v);
}

/**
 * 순수: 그룹 fixture + 해상도 → verdict.
 * SQL dry-run(dryrun_resolve) 의 CASE 와 동일한 우선순위. 하드 제외가 flag 보다 우선.
 */
export function classifyGroup(f: DrugOtcGroupFixture, r: DrugOtcGroupResolution): DrugOtcDraftVerdict {
  if (r.masterTotal === 0) return 'EXCLUDE_match_fail';
  if (r.otc === 0) return 'EXCLUDE_no_otc';
  if (r.anchorMasters === 0) return 'EXCLUDE_anchor_fail';
  if (r.rx > r.otc) return 'EXCLUDE_rx_heavy';
  if (f.klass === 'manual') return 'INSERT_manual_flag';
  if (r.rx > 0) return 'INSERT_rx_minor_flag';
  if (f.grounding <= 10 || f.klass === 'low_ground') return 'INSERT_low_ground_flag';
  if (f.klass === 'review') return 'INSERT_review_flag';
  return 'INSERT_auto';
}

import type { ParsedDrugOtcDraft } from './drug-otc-description-draft-content.js';

/** product_candidate_description_drafts 컬럼과 1:1 대응하는 적재 plan row(순수 조립, DB write 아님). */
export interface DrugOtcDraftRowPlan {
  candidate_id: string;
  source_label: string;
  source_identifier_value: string | null;
  draft_type: string;
  language: string;
  title: string;
  summary: string | null;
  content_json: Record<string, unknown>;
  content_html: string | null;
  seed_json: Record<string, unknown>;
  guard_result: Record<string, unknown>;
  review_status: 'needs_review';
  review_flags: string[];
  ai_provider: string | null;
  ai_model: string | null;
  ai_policy_scope: string | null;
  ai_cost_estimate: number | null;
  generated_at: Date | null;
}

export const DRUG_OTC_SOURCE_LABEL = 'MFDS_DRUG_OTC';

/** verdict → review_flags 매핑(빠른 필터용). */
function verdictFlags(verdict: DrugOtcDraftVerdict, f: DrugOtcGroupFixture, r: DrugOtcGroupResolution): string[] {
  const flags = new Set<string>([f.klass]);
  if (verdict === 'INSERT_manual_flag') flags.add('dose_route_manual');
  if (verdict === 'INSERT_rx_minor_flag') flags.add('rx_minor');
  if (verdict === 'INSERT_low_ground_flag') flags.add('low_grounding');
  if (verdict === 'INSERT_review_flag') flags.add('pharmacist_review');
  if (r.rx > 0) flags.add('rx_present');
  if (r.spdMasters > 0) flags.add('spd_overlap'); // e약은요 중복 존재(참고)
  return Array.from(flags);
}

/**
 * 순수: insertable 그룹 → draft row plan 조립.
 *   - candidate_id = 그룹 대표 anchorCandidateId (FK 필수 placeholder)
 *   - content_json = 그룹 키 + 문서 참조(sourceRef). **본문 마크다운→JSON 추출은 apply 단계 ETL**(이 설계 범위 밖)
 *   - seed_json = 그룹 범위(masterIds/candidateIds 는 apply 시 확정) + 문서 근거
 *   - review_status = needs_review 고정(약사 검수 전). ai_* = null(외부 초안, O4O 생성 아님)
 * anchorCandidateId 가 없으면 throw (호출부에서 EXCLUDE 처리 후 호출).
 */
export function buildDrugOtcDraftRowPlan(
  f: DrugOtcGroupFixture,
  r: DrugOtcGroupResolution,
  verdict: DrugOtcDraftVerdict,
  content?: ParsedDrugOtcDraft,
): DrugOtcDraftRowPlan {
  if (!r.anchorCandidateId) {
    throw new Error(`buildDrugOtcDraftRowPlan: seq=${f.seq} anchorCandidateId 없음(호출 전 EXCLUDE 처리 필요)`);
  }
  const groupKey = `${f.ingredient}|${f.strengthToken}|${f.doseForm}`;
  const contentSource = { doc: f.doc, seq: f.seq, ref: `CHECK-O4O-DRUG-OTC-DESCRIPTION-*-V1 §draft ${f.label}` };
  // content 있으면 본문 ETL 결과 주입(apply), 없으면 contentPending(설계 dry-run)
  const content_json: Record<string, unknown> = content
    ? {
        groupKey,
        ingredient: f.ingredient,
        strengthToken: f.strengthToken,
        doseForm: f.doseForm,
        format: 'structured',
        summaryTable: content.summaryTable,
        efficacy: content.efficacy,
        usage: content.usage,
        usageLabel: content.usageLabel,
        caution: content.caution,
        ingredientSelection: content.ingredientSelection,
        bodyMarkdown: content.bodyMarkdown,
        contentSource,
        contentPending: false,
      }
    : { groupKey, ingredient: f.ingredient, strengthToken: f.strengthToken, doseForm: f.doseForm, contentSource, contentPending: true };
  return {
    candidate_id: r.anchorCandidateId,
    source_label: DRUG_OTC_SOURCE_LABEL,
    source_identifier_value: groupKey,
    draft_type: 'store_description',
    language: 'ko',
    title: f.label,
    summary: content?.summaryTable?.['선택 포인트'] ?? null,
    content_json,
    content_html: null,
    seed_json: {
      groupKey,
      ingredient: f.ingredient,
      strengthToken: f.strengthToken,
      doseForm: f.doseForm,
      klass: f.klass,
      sourceDoc: f.doc,
      groupScope: {
        masterTotal: r.masterTotal,
        otc: r.otc,
        rx: r.rx,
        manufacturers: r.manufacturers,
        spdMasters: r.spdMasters,
        anchorMasters: r.anchorMasters,
      },
    },
    guard_result: {
      verdict,
      rxPurity: r.otc + r.rx > 0 ? r.otc / (r.otc + r.rx) : null,
      rxCount: r.rx,
      groundingEasyDrug: f.grounding,
      spdOverlap: r.spdMasters,
      doseRouteManual: f.klass === 'manual',
    },
    review_status: 'needs_review',
    review_flags: verdictFlags(verdict, f, r),
    ai_provider: null,
    ai_model: null,
    ai_policy_scope: null,
    ai_cost_estimate: null,
    generated_at: null,
  };
}

/**
 * 66개 OTC 그룹 fixture — pilot(1) + 5그룹 + 20그룹 + 50그룹(실제 40).
 * 출처: docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-{ONE-GROUP-PILOT,TEMPLATE-AND-5-GROUP,20-GROUP,50-GROUP}-DRAFT-V1.md §6
 */
export const DRUG_OTC_DESCRIPTION_GROUPS: DrugOtcGroupFixture[] = [
  { seq: 1, doc: 'pilot', label: '에르도스테인 300mg 캡슐', ingredient: '에르도스테인', strengthToken: '300밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 373 },
  { seq: 2, doc: '5g', label: '세티리진염산염 10mg 정', ingredient: '세티리진염산염', strengthToken: '10밀리그램', doseForm: '정', klass: 'auto', grounding: 163 },
  { seq: 3, doc: '5g', label: '알벤다졸 400mg 정', ingredient: '알벤다졸', strengthToken: '400밀리그램', doseForm: '정', klass: 'auto', grounding: 92 },
  { seq: 4, doc: '5g', label: '알마게이트 500mg 정', ingredient: '알마게이트', strengthToken: '500밀리그램', doseForm: '정', klass: 'auto', grounding: 124 },
  { seq: 5, doc: '5g', label: '나프록센나트륨 275mg 정', ingredient: '나프록센나트륨', strengthToken: '275밀리그램', doseForm: '정', klass: 'review', grounding: 96 },
  { seq: 6, doc: '5g', label: '트리메부틴말레산염 100mg 정', ingredient: '트리메부틴말레산염', strengthToken: '100밀리그램', doseForm: '정', klass: 'auto', grounding: 127 },
  { seq: 7, doc: '20g', label: '아세틸시스테인 200mg 캡슐', ingredient: '아세틸시스테인', strengthToken: '200밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 228 },
  { seq: 8, doc: '20g', label: '나프록센 250mg 연질캡슐', ingredient: '나프록센', strengthToken: '250밀리그램', doseForm: '연질캡슐', klass: 'review', grounding: 87 },
  { seq: 9, doc: '20g', label: '아스피린 100mg 정', ingredient: '아스피린', strengthToken: '100밀리그램', doseForm: '정', klass: 'review', grounding: 105 },
  { seq: 10, doc: '20g', label: '브로멜라인 100mg 정', ingredient: '브로멜라인', strengthToken: '100밀리그램', doseForm: '정', klass: 'auto', grounding: 86 },
  { seq: 11, doc: '20g', label: '바실루스리케니포르미스균 250mg 캡슐', ingredient: '바실루스리케니포르미스균', strengthToken: '250밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 88 },
  { seq: 12, doc: '20g', label: '디오스민 600mg 정', ingredient: '디오스민', strengthToken: '600밀리그램', doseForm: '정', klass: 'auto', grounding: 64 },
  { seq: 13, doc: '20g', label: '파모티딘 10mg 정', ingredient: '파모티딘', strengthToken: '10밀리그램', doseForm: '정', klass: 'review', grounding: 104 },
  { seq: 14, doc: '20g', label: '엘카르니틴 330mg 정', ingredient: '엘카르니틴', strengthToken: '330밀리그램', doseForm: '정', klass: 'auto', grounding: 42 },
  { seq: 15, doc: '20g', label: '암브록솔염산염 30mg 정', ingredient: '암브록솔염산염', strengthToken: '30밀리그램', doseForm: '정', klass: 'auto', grounding: 71 },
  { seq: 16, doc: '20g', label: '클로닉신리시네이트 125mg 정', ingredient: '클로닉신리시네이트', strengthToken: '125밀리그램', doseForm: '정', klass: 'review', grounding: 51 },
  { seq: 17, doc: '20g', label: '펙소페나딘염산염 120mg 정', ingredient: '펙소페나딘염산염', strengthToken: '120밀리그램', doseForm: '정', klass: 'auto', grounding: 29 },
  { seq: 18, doc: '20g', label: '클로트리마졸 100mg 질정', ingredient: '클로트리마졸', strengthToken: '100밀리그램', doseForm: '정', klass: 'manual', grounding: 26 },
  { seq: 19, doc: '20g', label: '로라타딘 10mg 정', ingredient: '로라타딘', strengthToken: '10밀리그램', doseForm: '정', klass: 'auto', grounding: 41 },
  { seq: 20, doc: '20g', label: '디오스민 300mg 캡슐', ingredient: '디오스민', strengthToken: '300밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 45 },
  { seq: 21, doc: '20g', label: '디펜히드라민염산염 50mg 연질캡슐', ingredient: '디펜히드라민염산염', strengthToken: '50밀리그램', doseForm: '연질캡슐', klass: 'review', grounding: 15 },
  { seq: 22, doc: '20g', label: '니자티딘 75mg 정', ingredient: '니자티딘', strengthToken: '75밀리그램', doseForm: '정', klass: 'auto', grounding: 21 },
  { seq: 23, doc: '20g', label: '알파칼시돌 0.5㎍ 연질캡슐', ingredient: '알파칼시돌', strengthToken: '0.5마이크로그램', doseForm: '연질캡슐', klass: 'review', grounding: 29 },
  { seq: 24, doc: '20g', label: '독시라민숙신산염 25mg 정', ingredient: '독시라민숙신산염', strengthToken: '25밀리그램', doseForm: '정', klass: 'review', grounding: 19 },
  { seq: 25, doc: '20g', label: '펙소페나딘염산염 60mg 정', ingredient: '펙소페나딘염산염', strengthToken: '60밀리그램', doseForm: '정', klass: 'auto', grounding: 36 },
  { seq: 26, doc: '20g', label: '폴산 1mg 정', ingredient: '폴산', strengthToken: '1밀리그램', doseForm: '정', klass: 'auto', grounding: 18 },
  { seq: 27, doc: '50g', label: '덱시부프로펜 300mg 정', ingredient: '덱시부프로펜', strengthToken: '300밀리그램', doseForm: '정', klass: 'auto', grounding: 97 },
  { seq: 28, doc: '50g', label: '아세트아미노펜 650mg 정', ingredient: '아세트아미노펜', strengthToken: '650밀리그램', doseForm: '정', klass: 'auto', grounding: 78 },
  { seq: 29, doc: '50g', label: '아세트아미노펜 325mg 연질캡슐', ingredient: '아세트아미노펜', strengthToken: '325밀리그램', doseForm: '연질캡슐', klass: 'auto', grounding: 24 },
  { seq: 30, doc: '50g', label: '아세트아미노펜 160mg 정', ingredient: '아세트아미노펜', strengthToken: '160밀리그램', doseForm: '정', klass: 'auto', grounding: 12 },
  { seq: 31, doc: '50g', label: '이부프로펜 200mg 연질캡슐', ingredient: '이부프로펜', strengthToken: '200밀리그램', doseForm: '연질캡슐', klass: 'review', grounding: 46 },
  { seq: 32, doc: '50g', label: '이부프로펜 400mg 연질캡슐', ingredient: '이부프로펜', strengthToken: '400밀리그램', doseForm: '연질캡슐', klass: 'review', grounding: 28 },
  { seq: 33, doc: '50g', label: '이부프로펜 200mg 정', ingredient: '이부프로펜', strengthToken: '200밀리그램', doseForm: '정', klass: 'review', grounding: 14 },
  { seq: 34, doc: '50g', label: '이부프로펜아르기닌 368.9mg 정', ingredient: '이부프로펜아르기닌', strengthToken: '368.9밀리그램', doseForm: '정', klass: 'review', grounding: 8 },
  { seq: 35, doc: '50g', label: '클로닉신리시네이트 125mg 연질캡슐', ingredient: '클로닉신리시네이트', strengthToken: '125밀리그램', doseForm: '연질캡슐', klass: 'review', grounding: 29 },
  { seq: 36, doc: '50g', label: '세티리진염산염 10mg 연질캡슐', ingredient: '세티리진염산염', strengthToken: '10밀리그램', doseForm: '연질캡슐', klass: 'auto', grounding: 23 },
  { seq: 37, doc: '50g', label: '로라타딘 10mg 연질캡슐', ingredient: '로라타딘', strengthToken: '10밀리그램', doseForm: '연질캡슐', klass: 'auto', grounding: 12 },
  { seq: 38, doc: '50g', label: '펙소페나딘염산염 60mg 연질캡슐', ingredient: '펙소페나딘염산염', strengthToken: '60밀리그램', doseForm: '연질캡슐', klass: 'auto', grounding: 9 },
  { seq: 39, doc: '50g', label: '트리메부틴말레산염 150mg 정', ingredient: '트리메부틴말레산염', strengthToken: '150밀리그램', doseForm: '정', klass: 'auto', grounding: 49 },
  { seq: 40, doc: '50g', label: '트리메부틴말레산염 200mg 정', ingredient: '트리메부틴말레산염', strengthToken: '200밀리그램', doseForm: '정', klass: 'auto', grounding: 39 },
  { seq: 41, doc: '50g', label: '에르도스테인 300mg 정', ingredient: '에르도스테인', strengthToken: '300밀리그램', doseForm: '정', klass: 'auto', grounding: 30 },
  { seq: 42, doc: '50g', label: '아세틸시스테인 100mg 캡슐', ingredient: '아세틸시스테인', strengthToken: '100밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 18 },
  { seq: 43, doc: '50g', label: '소브레롤 200mg 캡슐', ingredient: '소브레롤', strengthToken: '200밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 15 },
  { seq: 44, doc: '50g', label: '브로멜라인 45mg 정', ingredient: '브로멜라인', strengthToken: '45밀리그램', doseForm: '정', klass: 'auto', grounding: 14 },
  { seq: 45, doc: '50g', label: '탄산수소나트륨 500mg 정', ingredient: '탄산수소나트륨', strengthToken: '500밀리그램', doseForm: '정', klass: 'auto', grounding: 14 },
  { seq: 46, doc: '50g', label: '수산화마그네슘 500mg 정', ingredient: '수산화마그네슘', strengthToken: '500밀리그램', doseForm: '정', klass: 'auto', grounding: 15 },
  { seq: 47, doc: '50g', label: '침강탄산칼슘 500mg 정', ingredient: '침강탄산칼슘', strengthToken: '500밀리그램', doseForm: '정', klass: 'auto', grounding: 11 },
  { seq: 48, doc: '50g', label: '니푸록사지드 200mg 캡슐', ingredient: '니푸록사지드', strengthToken: '200밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 19 },
  { seq: 49, doc: '50g', label: '로페라미드염산염 2mg 캡슐', ingredient: '로페라미드염산염', strengthToken: '2밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 19 },
  { seq: 50, doc: '50g', label: '락토바실루스아시도필루스균 300mg 캡슐', ingredient: '락토바실루스아시도필루스균', strengthToken: '300밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 13 },
  { seq: 51, doc: '50g', label: '엔테로코쿠스페슘균 30mg 캡슐', ingredient: '엔테로코쿠스페슘스트레인세르넬레68균', strengthToken: '30밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 27 },
  { seq: 52, doc: '50g', label: '사카로마이세스보울라르디균 282.5mg 캡슐', ingredient: '사카로마이세스보울라르디균', strengthToken: '282.5밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 11 },
  { seq: 53, doc: '50g', label: '플루벤다졸 500mg 정', ingredient: '플루벤다졸', strengthToken: '500밀리그램', doseForm: '정', klass: 'auto', grounding: 7 },
  { seq: 54, doc: '50g', label: '비오틴 5mg 정', ingredient: '비오틴', strengthToken: '5밀리그램', doseForm: '정', klass: 'auto', grounding: 19 },
  { seq: 55, doc: '50g', label: '메코발라민 500㎍ 캡슐', ingredient: '메코발라민', strengthToken: '500마이크로그램', doseForm: '캡슐', klass: 'auto', grounding: 10 },
  { seq: 56, doc: '50g', label: 'L-시스틴 500mg 연질캡슐', ingredient: 'L-시스틴', strengthToken: '500밀리그램', doseForm: '연질캡슐', klass: 'auto', grounding: 8 },
  { seq: 57, doc: '50g', label: '시트룰린말산염 500mg 정', ingredient: '시트룰린말산염', strengthToken: '500밀리그램', doseForm: '정', klass: 'auto', grounding: 14 },
  { seq: 58, doc: '50g', label: '폴리사카리드철착염 326.1mg 캡슐', ingredient: '폴리사카리드철착염', strengthToken: '326.1밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 11 },
  { seq: 59, doc: '50g', label: '알파칼시돌 1㎍ 연질캡슐', ingredient: '알파칼시돌', strengthToken: '1마이크로그램', doseForm: '연질캡슐', klass: 'review', grounding: 10 },
  { seq: 60, doc: '50g', label: '덱스판테놀 100mg 정', ingredient: '덱스판테놀', strengthToken: '100밀리그램', doseForm: '정', klass: 'auto', grounding: 21 },
  { seq: 61, doc: '50g', label: '은행엽건조엑스 80mg 정', ingredient: '은행엽건조엑스', strengthToken: '80밀리그램', doseForm: '정', klass: 'low_ground', grounding: 10 },
  { seq: 62, doc: '50g', label: '우르소데옥시콜산 100mg 정', ingredient: '우르소데옥시콜산', strengthToken: '100밀리그램', doseForm: '정', klass: 'auto', grounding: 13 },
  { seq: 63, doc: '50g', label: '결정글루코사민황산염 250mg 캡슐', ingredient: '결정글루코사민황산염', strengthToken: '250밀리그램', doseForm: '캡슐', klass: 'auto', grounding: 10 },
  { seq: 64, doc: '50g', label: '아르기닌티디아시케이트 200mg 연질캡슐', ingredient: '아르기닌티디아시케이트', strengthToken: '200밀리그램', doseForm: '연질캡슐', klass: 'low_ground', grounding: 7 },
  { seq: 65, doc: '50g', label: '포도엽건조엑스 180mg 캡슐', ingredient: '포도엽건조엑스', strengthToken: '180밀리그램', doseForm: '캡슐', klass: 'low_ground', grounding: 7 },
  { seq: 66, doc: '50g', label: '데소게스트렐 0.075mg 정', ingredient: '데소게스트렐', strengthToken: '0.075밀리그램', doseForm: '정', klass: 'review', grounding: 6 },
];
