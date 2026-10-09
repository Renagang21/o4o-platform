import type { EntityManager } from 'typeorm';

/** Manual phase two. Never registered in automatic bootstrap migrations. */
export async function eventIndexState(exec: Pick<EntityManager, 'query'>) {
  const [row] = await exec.query(`SELECT pg_get_expr(i.indpred, i.indrelid) AS predicate
    FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.oid = to_regclass('public.idx_org_listing_unique_v2') AND i.indisvalid AND i.indisunique`);
  if (!row) throw new Error('EVENT_INDEX_MISSING_OR_INVALID');
  const predicate = typeof row.predicate === 'string' ? row.predicate.replace(/[()]/g, '').replace(/\s+/g, ' ').trim() : null;
  return row.predicate === null ? 'phase-one' as const
    : predicate && /^service_key(?:::text)? <> 'neture-event-offer'(?:::text)?$/.test(predicate) ? 'phase-two' as const
    : (() => { throw new Error('EVENT_INDEX_UNEXPECTED_PREDICATE'); })();
}

export async function transitionEventIndex(exec: Pick<EntityManager, 'query'>, direction: 'up' | 'down') {
  // Caller must use one transaction. Serialize all listing writers during replacement.
  await exec.query('LOCK TABLE organization_product_listings IN ACCESS EXCLUSIVE MODE');
  const current = await eventIndexState(exec);
  if ((direction === 'up' && current === 'phase-two') || (direction === 'down' && current === 'phase-one')) return;
  if (direction === 'down') {
    const [row] = await exec.query(`SELECT COUNT(*)::int AS count FROM (
      SELECT 1 FROM organization_product_listings
      GROUP BY organization_id, service_key, offer_id HAVING COUNT(*) > 1
    ) duplicates`);
    if (row.count > 0) throw new Error('EVENT_INDEX_ROLLBACK_HAS_DUPLICATE_LISTINGS');
  }
  await exec.query('DROP INDEX idx_org_listing_unique_v2');
  await exec.query(`CREATE UNIQUE INDEX idx_org_listing_unique_v2
    ON organization_product_listings (organization_id, service_key, offer_id)
    ${direction === 'up' ? "WHERE service_key <> 'neture-event-offer'" : ''}`);
}
