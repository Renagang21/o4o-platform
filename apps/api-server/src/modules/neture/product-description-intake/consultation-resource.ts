import type { DataSource, EntityManager } from "typeorm";
import { descriptionEntrySchema, type DescriptionEntry } from "./contracts.js";
import { hasProductDescriptionText } from "../utils/sanitize-description-html.util.js";

type Db = Pick<DataSource | EntityManager, "query">;
export interface ConsultationDescriptionRow {
  master_id: string;
  id: string;
  description_type: "CONSULTATION" | "B2B";
  content: string;
  summary: string | null;
  updated_at: Date;
  entry: unknown;
}

/** Exact language. Explicit consultation canonical takes precedence, even if its
 * payload later becomes invalid; do not silently fall back to old knowledge.
 * Legacy B2B is eligible only as a version-matched structured intake resource.
 * Generic B2B HTML, QR/STORE and other-language resources are never substitutes.
 */
export async function readConsultationDescriptions(
  db: Db,
  masterIds: string[],
  language: string,
) {
  if (!masterIds.length) return new Map<string, ConsultationDescriptionRow>();
  const rows: ConsultationDescriptionRow[] = await db.query(
    `
    SELECT DISTINCT ON (d.master_id) d.master_id,d.id,d.description_type,d.content,d.summary,d.updated_at,
      c.raw_payload->'descriptionResource'->'entry' AS entry
    FROM shared_product_descriptions d LEFT JOIN product_candidates c
      ON c.id=d.source_ref_id AND c.source_label='PRODUCT_DESCRIPTION_RESOURCE_V1' AND c.deleted_at IS NULL
    WHERE d.master_id=ANY($1::uuid[]) AND COALESCE(d.language,'ko')=$2
      AND d.status='canonical' AND d.deleted_at IS NULL
      AND (d.description_type='CONSULTATION' OR (
        d.description_type='B2B'
        AND c.raw_payload->'descriptionResource'->'entry'->>'descriptionType'='B2B'
        AND c.raw_payload->'descriptionResource'->'entry'->>'language'=$2
        AND c.raw_payload->'descriptionResource'->'entry'->>'content'=d.content
        AND jsonb_typeof(c.raw_payload->'descriptionResource'->'entry'->'aiSections')='array'
        AND c.raw_payload->'descriptionResource'->'entry'->'aiSections'<>'[]'::jsonb
      ))
    ORDER BY d.master_id,CASE WHEN d.description_type='CONSULTATION' THEN 0 ELSE 1 END,d.updated_at DESC,d.id`.trim(),
    [[...new Set(masterIds)], language],
  );
  return new Map(rows.map((row) => [row.master_id, row]));
}

export function consultationEntry(
  row: ConsultationDescriptionRow,
  language: string,
): DescriptionEntry | null {
  const parsed = descriptionEntrySchema.safeParse(row.entry);
  return parsed.success &&
    hasProductDescriptionText(row.content) &&
    parsed.data.descriptionType === row.description_type &&
    parsed.data.language === language &&
    parsed.data.content === row.content &&
    parsed.data.aiSections?.length
    ? parsed.data
    : null;
}

export function consultationReadiness(
  row: ConsultationDescriptionRow | undefined,
  language: string,
) {
  if (!row) return "missing" as const;
  const entry = consultationEntry(row, language);
  if (!entry) return "missing" as const;
  return entry.aiSections!.some(
    (section) =>
      section.kind !== "unclassified" && section.referenceUrls.length,
  )
    ? ("structured" as const)
    : ("unclassified" as const);
}
