/**
 * OTC 영문 그룹 → master 전개(fan-out) — 번역 입력 / 저장 입력 분리
 *
 * WO-O4O-OTC-EN-GROUP-TO-MASTER-FANOUT-DESIGN-V1
 * 선행: WO-O4O-OTC-CANONICAL-APPLY-AUTO-ONLY-V1 (A군 686 ko canonical) ·
 *       WO-O4O-OTC-EN-TRANSLATION-PERSIST-PILOT-V1 (저장 구조 검증)
 *
 * 핵심 구조:
 *   **번역은 그룹당 1회 · 저장은 연결 master 전체에 전개.**
 *
 *   TranslationUnit (그룹당 1)  ── 사람/AI 가 번역하는 단위. consumerSource + translatorNote + route.
 *        ↓ 번역 결과 1개
 *   PersistUnit (그룹당 1 → N master) ── 같은 HTML 을 그룹의 모든 master 에 저장.
 *
 * 이 모듈은 **read-only 조회만** 한다(INSERT/UPDATE 경로 없음).
 * 멤버십 SSOT = **이미 저장된 한국어 canonical 행**(`source_type='mfds_drug_otc'`, `language='ko'`).
 *   → 전개를 다시 계산하지 않는다. ko 가 들어간 master 집합이 곧 en 대상이라 **ko/en 축이 어긋날 수 없다**.
 */

/** (그룹, master) 1행 + 그 master 의 en 보유 상태 */
export interface EnFanoutRow {
  candidateId: string;
  groupKey: string;
  title: string;
  masterId: string;
  /** 이 master 에 STORE/en 설명서가 이미 있음 */
  hasEn: boolean;
}

export interface QueryRunnerLike {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
}

/**
 * ko canonical 이 저장된 master 를 그룹별로 모은다(= en 전개 대상 모집단).
 * Raw SQL 파라미터 바인딩 사용(문자열 보간 금지 — CLAUDE.md §7 Guard Rule 2).
 */
const FANOUT_SQL = `
  SELECT ko.source_ref_id::text AS candidate_id,
         d.content_json->>'groupKey' AS group_key,
         d.title,
         ko.master_id::text AS master_id,
         EXISTS(
           SELECT 1 FROM shared_product_descriptions en
           WHERE en.master_id = ko.master_id
             AND en.description_type = 'STORE'
             AND en.language = 'en'
             AND en.deleted_at IS NULL
         ) AS has_en
  FROM shared_product_descriptions ko
  JOIN product_candidate_description_drafts d ON d.candidate_id = ko.source_ref_id
  WHERE ko.source_type = $1
    AND ko.status = 'canonical'
    AND ko.language = 'ko'
    AND ko.description_type = 'STORE'
    AND ko.deleted_at IS NULL
  ORDER BY group_key, master_id
`;

export async function loadEnFanoutRows(
  ds: QueryRunnerLike,
  opts: { sourceType?: string } = {},
): Promise<EnFanoutRow[]> {
  const rows = (await ds.query(FANOUT_SQL, [opts.sourceType ?? 'mfds_drug_otc'])) as Record<
    string,
    unknown
  >[];
  return rows.map((r) => ({
    candidateId: String(r.candidate_id),
    groupKey: String(r.group_key),
    title: String(r.title),
    masterId: String(r.master_id),
    hasEn: r.has_en === true,
  }));
}

/** 번역 단위 — **그룹당 1개**. 번역자는 이것만 본다(master 를 알 필요가 없다). */
export interface EnTranslationUnit {
  candidateId: string;
  groupKey: string;
  title: string;
  /** 이 그룹이 커버하는 master 수(참고용 — 번역 내용에 영향 없음) */
  masterCount: number;
}

/** 저장 단위 — 번역 결과 1개를 **그룹의 모든 대상 master 에 전개**. */
export interface EnPersistUnit {
  candidateId: string;
  groupKey: string;
  title: string;
  /** 저장 대상(기존 en 보유 master 제외 후) */
  targetMasterIds: string[];
  /** 그룹의 전체 master(= ko canonical 보유) */
  totalMasters: number;
  /** 기존 en 이 있어 제외한 수 */
  skippedExistingEn: number;
}

export interface EnFanoutPlan {
  translationUnits: EnTranslationUnit[];
  persistUnits: EnPersistUnit[];
  totals: {
    groups: number;
    masters: number;
    existingEn: number;
    expectedInsert: number;
    expectedUpdate: 0;
  };
  /** 여러 그룹에 걸린 master. **하나라도 있으면 전체 중단**해야 한다. */
  crossGroupDuplicateMasters: string[];
}

/**
 * 전개 계획 산출.
 *
 * - 기존 `STORE/en` 보유 master 는 **제외**(덮어쓰지 않는다).
 * - 같은 master 가 여러 그룹에 속하면 `crossGroupDuplicateMasters` 에 담는다(호출부가 중단).
 * - 그룹 내 master 중복은 제거한다.
 */
export function buildEnFanoutPlan(rows: EnFanoutRow[]): EnFanoutPlan {
  const byGroup = new Map<string, EnPersistUnit & { seen: Set<string> }>();
  const masterOwner = new Map<string, Set<string>>();

  for (const r of rows) {
    let g = byGroup.get(r.groupKey);
    if (!g) {
      g = {
        candidateId: r.candidateId,
        groupKey: r.groupKey,
        title: r.title,
        targetMasterIds: [],
        totalMasters: 0,
        skippedExistingEn: 0,
        seen: new Set<string>(),
      };
      byGroup.set(r.groupKey, g);
    }
    if (g.seen.has(r.masterId)) continue; // 그룹 내 중복 제거
    g.seen.add(r.masterId);
    g.totalMasters++;
    if (r.hasEn) g.skippedExistingEn++;
    else g.targetMasterIds.push(r.masterId);

    let owners = masterOwner.get(r.masterId);
    if (!owners) masterOwner.set(r.masterId, (owners = new Set<string>()));
    owners.add(r.groupKey);
  }

  const units = [...byGroup.values()].map(({ seen: _s, ...u }) => u);
  const crossGroupDuplicateMasters = [...masterOwner.entries()]
    .filter(([, owners]) => owners.size > 1)
    .map(([m]) => m);

  return {
    translationUnits: units.map((u) => ({
      candidateId: u.candidateId,
      groupKey: u.groupKey,
      title: u.title,
      masterCount: u.totalMasters,
    })),
    persistUnits: units,
    totals: {
      groups: units.length,
      masters: units.reduce((n, u) => n + u.totalMasters, 0),
      existingEn: units.reduce((n, u) => n + u.skippedExistingEn, 0),
      expectedInsert: units.reduce((n, u) => n + u.targetMasterIds.length, 0),
      expectedUpdate: 0,
    },
    crossGroupDuplicateMasters,
  };
}
