import { withDb } from '../../apps/api-server/src/scripts/cosmetics-productmaster-apply-pilot/db.mjs';
await withDb(async (q) => {
  console.log((await q(`SELECT jsonb_typeof(tags) t, COUNT(*)::int c FROM product_masters WHERE tags IS NOT NULL GROUP BY 1 ORDER BY 2 DESC`)).rows);
  console.log('object 중 rollback/배치 키 보유:', (await q(`SELECT COUNT(*)::int c FROM product_masters WHERE jsonb_typeof(tags)='object' AND (tags ? 'nameCleanupV1' OR tags ? 'woBatch')`)).rows);
});
