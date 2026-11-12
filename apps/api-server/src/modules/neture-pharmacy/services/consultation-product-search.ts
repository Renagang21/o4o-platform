import type { DataSource } from "typeorm";
import {
  consultationDescriptionSql,
  consultationEntry,
  type ConsultationDescriptionRow,
} from "../../neture/product-description-intake/consultation-resource.js";
import { NeturePharmacyError } from "../constants.js";

export const CONSULTATION_SEARCH_BATCH_SIZE = 50;
export const CONSULTATION_SEARCH_MATCH_LIMIT = 1000;
const RESULT_LIMIT = 12;
interface SearchRow {
  id: string;
  kind: "listing" | "local";
  name: string;
  metadata: string;
  knowledge: ConsultationDescriptionRow | null;
}
export interface ConsultationProductCandidate {
  id: string;
  kind: "listing" | "local";
  name: string;
  location: string;
}

/** SQL is a coarse literal-text filter, not a trust decision. Full intake schema,
 * current body, purpose, language and source validation runs before ranking.
 */
export const consultationProductSearchSql = `WITH eligible AS (
  SELECT DISTINCT ON (l.master_id) l.id,l.master_id,
    concat_ws(' · ',m.name,NULLIF(m.specification,''),NULLIF(m.manufacturer_name,'')) AS name,
    concat_ws(' ',m.name,m.regulatory_name,m.specification,
      (SELECT string_agg(t.tag,' ') FROM product_ai_tags t WHERE t.product_id=m.id)) AS metadata
  FROM organization_product_listings l JOIN product_masters m ON m.id=l.master_id AND m.status='ACTIVE'
  WHERE l.organization_id=$1 AND l.is_active=true ORDER BY l.master_id,l.id
), store_products AS (
  SELECT e.id,'listing'::text AS kind,e.name,e.metadata,
    CASE WHEN k.id IS NULL THEN NULL ELSE to_jsonb(k) END AS knowledge
  FROM eligible e LEFT JOIN LATERAL (
    ${consultationDescriptionSql("d.master_id=e.master_id", "'ko'")}
  ) k ON true
  UNION ALL
  SELECT p.id,'local'::text,p.name,p.name,NULL::jsonb FROM store_local_products p
  WHERE p.organization_id=$1 AND p.is_active=true
)
SELECT id,kind,name,metadata,knowledge FROM store_products
WHERE ($3::uuid IS NULL OR (id,kind)>($3::uuid,$4::text)) AND (
  EXISTS(SELECT 1 FROM unnest($2::text[]) term WHERE position(lower(term) in lower(metadata))>0)
  OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(CASE
      WHEN jsonb_typeof(knowledge->'entry'->'aiSections')='array' THEN knowledge->'entry'->'aiSections'
      ELSE '[]'::jsonb END) section
    WHERE section->>'kind' IN ('product-fact','professional-reference','counseling-support')
      AND EXISTS(SELECT 1 FROM unnest($2::text[]) term
        WHERE position(lower(term) in lower(concat_ws(' ',section->>'title',section->>'text')))>0)
  )
)
ORDER BY id,kind LIMIT ${CONSULTATION_SEARCH_BATCH_SIZE}`;

function matchedTerms(texts: string[], terms: string[]) {
  // Test each field separately: joining unrelated sections must not invent a phrase.
  const values = texts.map((text) => text.toLowerCase());
  return terms.reduce(
    (score, term) => score + Number(values.some((text) => text.includes(term))),
    0,
  );
}

/** Scan coarse matches in bounded pages; an overbroad search fails explicitly.
 * Invalid/old knowledge must not fill
 * a top-N limit and hide a later valid product. Only the best 12 are retained.
 * No embeddings, generation, new tables or transcript persistence.
 */
export async function searchConsultationProducts(
  db: Pick<DataSource, "query">,
  organizationId: string,
  rawTerms: string[],
  authorize: () => Promise<boolean>,
): Promise<ConsultationProductCandidate[]> {
  const terms = [...new Set(rawTerms.map((term) => term.toLowerCase()))];
  if (!terms.length) return [];
  const ranked: Array<ConsultationProductCandidate & { score: number }> = [];
  let cursor: { id: string; kind: string } | null = null;
  let scanned = 0;
  for (;;) {
    const rows: SearchRow[] = await db.query(consultationProductSearchSql, [
      organizationId,
      terms,
      cursor?.id ?? null,
      cursor?.kind ?? null,
    ]);
    scanned += rows.length;
    if (scanned > CONSULTATION_SEARCH_MATCH_LIMIT)
      throw new NeturePharmacyError(
        422,
        "CONSULTATION_SEARCH_TOO_BROAD",
        "검색 범위가 넓습니다. 상품명·성분 등의 조건을 더 구체적으로 입력해 주세요.",
      );
    for (const row of rows) {
      const entry =
        row.kind === "listing" && row.knowledge
          ? consultationEntry(row.knowledge, "ko")
          : null;
      const sections =
        entry?.aiSections?.filter(
          (section) =>
            section.kind !== "unclassified" && section.referenceUrls.length,
        ) ?? [];
      const score = matchedTerms(
        [
          row.metadata,
          ...sections.flatMap((section) => [section.title, section.text]),
        ],
        terms,
      );
      if (score)
        ranked.push({
          id: row.id,
          kind: row.kind,
          name: row.name,
          location: "",
          score,
        });
    }
    ranked.sort(
      (a, b) =>
        b.score - a.score ||
        a.name.localeCompare(b.name, "ko") ||
        a.id.localeCompare(b.id) ||
        a.kind.localeCompare(b.kind),
    );
    ranked.length = Math.min(ranked.length, RESULT_LIMIT);
    if (rows.length < CONSULTATION_SEARCH_BATCH_SIZE) break;
    if (!(await authorize()))
      throw new NeturePharmacyError(
        403,
        "STORE_ACCESS_REQUIRED",
        "현재 매장의 상담 권한을 확인해 주시기 바랍니다.",
      );
    const last = rows[rows.length - 1];
    cursor = { id: last.id, kind: last.kind };
  }
  return ranked.map(({ id, kind, name, location }) => ({
    id,
    kind,
    name,
    location,
  }));
}
