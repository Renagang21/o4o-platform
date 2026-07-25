import pg from 'pg';
import fs from 'node:fs';
for (const line of fs.readFileSync('.env','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');}
const c=new pg.Client({host:process.env.DB_HOST,port:+process.env.DB_PORT,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
await c.connect();
await c.query("SET statement_timeout='300000'");
// single-pass: HFF candidates whose BASE_STANDARD mentions both MSM and 비타민 D
const q=await c.query(`
  SELECT count(*)::int mention,
         count(*) FILTER (WHERE matched_product_master_id IS NOT NULL)::int promoted
  FROM product_candidates
  WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
    AND raw_payload->'source'->>'BASE_STANDARD' ILIKE '%MSM%'
    AND raw_payload->'source'->>'BASE_STANDARD' ~ '비타민\s?D'`);
console.log('MSM & 비타민D mention:', JSON.stringify(q.rows[0]));
// how many mention MSM at all
const msm=await c.query(`SELECT count(*)::int n FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND raw_payload->'source'->>'BASE_STANDARD' ILIKE '%MSM%'`);
console.log('MSM (any) mention:', msm.rows[0].n);
// sample base standards of MSM & 비타민D
const s=await c.query(`SELECT raw_payload->'source'->>'PRDLST_NM' nm, left(raw_payload->'source'->>'BASE_STANDARD',160) base FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND raw_payload->'source'->>'BASE_STANDARD' ILIKE '%MSM%' AND raw_payload->'source'->>'BASE_STANDARD' ~ '비타민\s?D' LIMIT 5`);
console.log('samples:'); for(const r of s.rows) console.log(' -', r.nm, '::', (r.base||'').replace(/\s+/g,' '));
await c.end();
