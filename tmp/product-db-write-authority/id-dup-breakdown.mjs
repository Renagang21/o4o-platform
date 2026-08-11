import { withDb } from '../../apps/api-server/src/scripts/cosmetics-productmaster-apply-pilot/db.mjs';
await withDb(async (q) => {
  const r = await q(`SELECT identifier_type t, COUNT(*)::int groups FROM (
      SELECT identifier_type, normalized_value FROM product_identifiers
       WHERE normalized_value IS NOT NULL AND deleted_at IS NULL
       GROUP BY 1,2 HAVING COUNT(DISTINCT product_master_id) > 1) x
    GROUP BY 1 ORDER BY 2 DESC`);
  console.log(JSON.stringify(r.rows, null, 2));
});
