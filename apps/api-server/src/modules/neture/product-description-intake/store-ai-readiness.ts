import type { DataSource } from 'typeorm';
import { consultationReadiness, readConsultationDescriptions } from './consultation-resource.js';

/** Read-only consultation coverage. Duplicate listings do not inflate coverage. */
export async function readStoreAiReadiness(db: Pick<DataSource, 'query'>, org: string, language: string) {
  const rows: Array<{ masterId: string; links: string }> = await db.query(`
      SELECT l.master_id AS "masterId",COUNT(*)::int AS links FROM organization_product_listings l
      JOIN product_masters m ON m.id=l.master_id AND m.status='ACTIVE'
      WHERE l.organization_id=$1 AND l.is_active=true GROUP BY l.master_id
    `, [org]);
  const descriptions = await readConsultationDescriptions(db, rows.map(row => row.masterId), language);
  const states = { structured: 0, unclassified: 0, legacy: 0, missing: 0 };
  const masters = new Set<string>(); let listingCount = 0;
  for (const row of rows) {
    if (masters.has(row.masterId)) continue;
    masters.add(row.masterId); listingCount += Number(row.links);
    states[consultationReadiness(descriptions.get(row.masterId), language)]++;
  }
  const [local] = await db.query('SELECT COUNT(*)::int AS count FROM store_local_products WHERE organization_id=$1 AND is_active=true', [org]);
  // Deprecated transport field retained for deployed clients; no longer a storage selector.
  return { organizationId: org, purpose: 'B2B' as const, resourcePurpose: 'CONSULTATION' as const, language, listingCount, masterCount: masters.size,
    localCount: Number(local?.count ?? 0), states };
}
