import type { DataSource } from 'typeorm';
import { descriptionEntrySchema } from './contracts.js';
import { descriptionPlainText } from './ai-context.service.js';

/** Read-only, exact B2B/language coverage. Duplicate listings do not inflate product coverage. */
export async function readStoreAiReadiness(db: Pick<DataSource, 'query'>, org: string, language: string) {
  const rows: Array<{ masterId: string; content: string | null; entry: unknown; links: string }> = await db.query(`
    WITH handled AS (
      SELECT l.master_id,COUNT(*)::int AS links FROM organization_product_listings l
      JOIN product_masters m ON m.id=l.master_id AND m.status='ACTIVE'
      WHERE l.organization_id=$1 AND l.is_active=true GROUP BY l.master_id
    ) SELECT h.master_id AS "masterId",h.links,d.content,c.raw_payload->'descriptionResource'->'entry' AS entry
    FROM handled h LEFT JOIN shared_product_descriptions d ON d.master_id=h.master_id
      AND d.description_type='B2B' AND COALESCE(d.language,'ko')=$2 AND d.status='canonical' AND d.deleted_at IS NULL
    LEFT JOIN product_candidates c ON c.id=d.source_ref_id AND c.source_label='PRODUCT_DESCRIPTION_RESOURCE_V1' AND c.deleted_at IS NULL`, [org, language]);
  const states = { structured: 0, unclassified: 0, legacy: 0, missing: 0 };
  const masters = new Set<string>(); let listingCount = 0;
  for (const row of rows) {
    if (masters.has(row.masterId)) continue;
    masters.add(row.masterId); listingCount += Number(row.links);
    if (!row.content || !descriptionPlainText(row.content)) { states.missing++; continue; }
    const parsed = descriptionEntrySchema.safeParse(row.entry);
    const sections = parsed.success && parsed.data.descriptionType === 'B2B' && parsed.data.language === language && parsed.data.content === row.content
      ? parsed.data.aiSections : undefined;
    if (!sections?.length) states.legacy++;
    else if (sections.some(section => section.kind !== 'unclassified' && section.referenceUrls.length > 0)) states.structured++;
    else states.unclassified++;
  }
  const [local] = await db.query('SELECT COUNT(*)::int AS count FROM store_local_products WHERE organization_id=$1 AND is_active=true', [org]);
  return { organizationId: org, purpose: 'B2B' as const, language, listingCount, masterCount: masters.size,
    localCount: Number(local?.count ?? 0), states };
}
