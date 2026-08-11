import { withDb } from '../../apps/api-server/src/scripts/cosmetics-productmaster-apply-pilot/db.mjs';
await withDb(async (q) => {
  console.log((await q(`SELECT data_type, udt_name FROM information_schema.columns WHERE table_name='product_masters' AND column_name='tags'`)).rows);
  console.log((await q(`SELECT jsonb_typeof(tags) t, COUNT(*)::int c FROM product_masters WHERE tags IS NOT NULL GROUP BY 1`)).rows);
  console.log((await q(`SELECT tags FROM product_masters WHERE jsonb_typeof(tags)='object' LIMIT 2`)).rows);
  console.log((await q(`SELECT tags FROM product_masters WHERE jsonb_typeof(tags)='array' AND tags <> '[]'::jsonb LIMIT 2`)).rows);
});
