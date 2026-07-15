/**
 * OTC single 초안 그룹 → ProductMaster 전개 (공용)
 *
 * WO-O4O-OTC-SINGLE-GROUP-EXPANSION-APPLY-PATH-V1
 *
 * single 초안(`otc-draft-v1`, 66그룹)은 `seed_json.groupScope.masterIds` 가 **없다**.
 * 대신 **성분·함량·제형 3축 정확일치**로 master 를 전개한다 — 근거·실측 =
 * CHECK-O4O-OTC-KO-CANONICAL-PROMOTION-READINESS-V1 / CHECK-O4O-OTC-SINGLE-GROUP-EXPANSION-APPLY-PATH-V1.
 *
 * 이 모듈은 **read-only 조회만** 한다. INSERT/UPDATE 경로가 없다.
 * 승격 apply 는 이 전개 결과를 받아서 쓴다(dry-run 과 apply 가 **같은 함수**를 쓰므로 결과가 어긋날 수 없다).
 *
 * 전개 기준(기존 read-only dry-run `drug-otc-description-promotion-dryrun.ts` 와 동일):
 *   ingredient = product_masters.name 끝 괄호 안 성분명   `…(트리메부틴말레산염)`
 *   strength   = specification 의 첫 토큰                `200밀리그램 / …`
 *   form       = name 에서 파생 (연질캡슐 > 캡슐 > 정 우선순위)
 *   대상       = regulatory_type='DRUG' AND drug_category='otc'
 */

/** 전개 결과 1행 = (그룹, master) 쌍 + 그 master 의 기존 SPD 상태 */
export interface ExpandedMasterRow {
  /** 그룹 키 = `성분|함량|제형` (draft.source_identifier_value) */
  gk: string;
  candidateId: string;
  title: string;
  /** guard_result.verdict — INSERT_auto / INSERT_review_flag / … */
  verdict: string | null;
  masterId: string;
  /** canonical SPD 보유 */
  hasCanonical: boolean;
  /** SPD 가 하나라도 있음(status 무관) */
  hasAnySpd: boolean;
  /** 이미 이 승격 source_type 으로 들어간 SPD 보유 */
  hasOtcPromotion: boolean;
}

export interface SingleGroupExpansionOptions {
  /** 초안 source_label. 기본 'MFDS_DRUG_OTC' */
  sourceLabel?: string;
  /** 승격 source_type (already-applied 계측용). 기본 'mfds_drug_otc' */
  promotionSourceType?: string;
}

/** 최소 DataSource 인터페이스 — typeorm 의존을 타입으로만 둔다(스크립트가 주입). */
export interface QueryRunnerLike {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
}

/**
 * 성분·함량·제형 3축 정확일치 전개.
 *
 * Raw SQL 파라미터 바인딩 사용(문자열 보간 금지 — CLAUDE.md §7 Guard Rule 2).
 */
const EXPANSION_SQL = `
  WITH d AS (
    SELECT source_identifier_value AS gk,
           candidate_id::text      AS candidate_id,
           title,
           seed_json->>'ingredient'     AS ing,
           seed_json->>'strengthToken'  AS str,
           seed_json->>'doseForm'       AS form,
           guard_result->>'verdict'     AS verdict
    FROM product_candidate_description_drafts
    WHERE source_label = $1
      AND deleted_at IS NULL
      AND seed_json->>'ingredient'    IS NOT NULL
      AND seed_json->>'strengthToken' IS NOT NULL
      AND seed_json->>'doseForm'      IS NOT NULL
  ),
  parsed AS (
    SELECT pm.id,
           substring(pm.name from '\\(([^()]+)\\)\\s*$') AS ing,
           split_part(pm.specification, ' / ', 1)        AS str,
           CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐'
                WHEN pm.name LIKE '%캡슐%'     THEN '캡슐'
                WHEN pm.name LIKE '%정%'       THEN '정'
                ELSE NULL END                            AS form
    FROM product_masters pm
    WHERE pm.regulatory_type = 'DRUG' AND pm.drug_category = 'otc'
  ),
  m AS (
    SELECT d.gk, d.candidate_id, d.title, d.verdict, p.id AS master_id
    FROM d
    JOIN parsed p ON p.ing = d.ing AND p.str = d.str AND p.form = d.form
  )
  SELECT m.gk, m.candidate_id, m.title, m.verdict, m.master_id::text AS master_id,
         EXISTS(SELECT 1 FROM shared_product_descriptions s
                WHERE s.master_id = m.master_id AND s.deleted_at IS NULL AND s.status = 'canonical') AS has_canonical,
         EXISTS(SELECT 1 FROM shared_product_descriptions s
                WHERE s.master_id = m.master_id AND s.deleted_at IS NULL) AS has_any_spd,
         EXISTS(SELECT 1 FROM shared_product_descriptions s
                WHERE s.master_id = m.master_id AND s.deleted_at IS NULL AND s.source_type = $2) AS has_otc_promotion
  FROM m
  ORDER BY m.gk, m.master_id
`;

/** single 그룹 전개(read-only). 정렬 고정 → 반복 실행 시 동일 결과. */
export async function expandDrugOtcSingleGroups(
  ds: QueryRunnerLike,
  opts: SingleGroupExpansionOptions = {},
): Promise<ExpandedMasterRow[]> {
  const rows = (await ds.query(EXPANSION_SQL, [
    opts.sourceLabel ?? 'MFDS_DRUG_OTC',
    opts.promotionSourceType ?? 'mfds_drug_otc',
  ])) as Record<string, unknown>[];
  return rows.map((r) => ({
    gk: String(r.gk),
    candidateId: String(r.candidate_id),
    title: String(r.title),
    verdict: r.verdict === null || r.verdict === undefined ? null : String(r.verdict),
    masterId: String(r.master_id),
    hasCanonical: r.has_canonical === true,
    hasAnySpd: r.has_any_spd === true,
    hasOtcPromotion: r.has_otc_promotion === true,
  }));
}

/** 승격 정책. A = 설명이 전혀 없는 master 에만 신규 canonical(기존 canonical 절대 보존). */
export type PromotionPolicy = 'A_no_spd_only';

export interface GroupTarget {
  gk: string;
  candidateId: string;
  title: string;
  verdict: string | null;
  /** 정책 통과 master (중복 제거·정렬 완료) */
  masterIds: string[];
  /** 전개된 전체 master 수 */
  expandedMasters: number;
  /** 기존 canonical 보유라 제외한 수 */
  excludedExistingCanonical: number;
  /** 이미 이 승격으로 들어간 수 */
  alreadyPromoted: number;
}

/**
 * 전개 결과 → 정책별 승격 대상.
 *
 * 정책 A: `hasAnySpd=false` (설명 전무) 만 대상.
 *  - 기존 canonical 은 물론 candidate/hidden SPD 가 있어도 건드리지 않는다 → **UPDATE 0 보장**.
 *  - master 중복은 Set 으로 제거한다(같은 master 가 두 그룹에 잡히는 경우 방어).
 */
export function selectPromotionTargets(
  rows: ExpandedMasterRow[],
  policy: PromotionPolicy = 'A_no_spd_only',
): GroupTarget[] {
  if (policy !== 'A_no_spd_only') throw new Error(`지원하지 않는 정책: ${policy}`);
  const byGroup = new Map<string, GroupTarget & { seen: Set<string> }>();
  for (const r of rows) {
    let g = byGroup.get(r.gk);
    if (!g) {
      g = {
        gk: r.gk,
        candidateId: r.candidateId,
        title: r.title,
        verdict: r.verdict,
        masterIds: [],
        expandedMasters: 0,
        excludedExistingCanonical: 0,
        alreadyPromoted: 0,
        seen: new Set<string>(),
      };
      byGroup.set(r.gk, g);
    }
    g.expandedMasters++;
    if (r.hasCanonical) g.excludedExistingCanonical++;
    if (r.hasOtcPromotion) g.alreadyPromoted++;
    if (!r.hasAnySpd && !g.seen.has(r.masterId)) {
      g.seen.add(r.masterId);
      g.masterIds.push(r.masterId);
    }
  }
  return [...byGroup.values()].map(({ seen: _seen, ...g }) => g);
}

/** 같은 master 가 여러 그룹의 대상으로 잡혔는지 — 승격 전 반드시 0 이어야 한다. */
export function findCrossGroupDuplicateMasters(targets: GroupTarget[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const t of targets) for (const m of t.masterIds) (seen.has(m) ? dup : seen).add(m);
  return [...dup];
}
