/**
 * Agent B 소유 — READ-ONLY. noBracket(=MAIN_FNCTN 대괄호 라벨 0) 미생산·미선점 후보 census.
 *   shard = stableHash(STTEMNT_NO) % 3 (기본 1). DB write 0.
 * 실행: PROXY_PORT=5442 DB_USERNAME=o4o_api DB_PASSWORD=... DB_NAME=o4o_platform OUT=<file> \
 *         npx tsx src/scripts/hff-nobracket-b-census.ts
 */
import { DataSource } from 'typeorm';
import { normalizeSpecText } from './hff-source-parse.js';
import * as fs from 'node:fs';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const SHARD = parseInt(process.env.SHARD ?? '1', 10);

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(`SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    let scanned = 0, inShard = 0, unpromoted = 0, notTaken = 0, noBracket = 0, nbEmptyFn = 0;
    const samples: unknown[] = []; const fnFreq: Record<string, number> = {};
    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<Record<string, string | null>> = await ds.query(
        `SELECT matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt, coalesce(raw_payload->'source'->>'PRDUCT','') name,
                coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang, coalesce(raw_payload->'source'->>'SRV_USE','') srv,
                coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, coalesce(raw_payload->'source'->>'RAWMTRL_NM','') raw, id
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 5000`, [after]);
      if (!rows.length) break;
      for (const r of rows) {
        scanned++; const stmt = String(r.stmt).trim(); if (!stmt) continue;
        if (stableHash(stmt) % 3 !== SHARD) continue; inShard++;
        if (r.mid != null) continue; unpromoted++;
        if (taken.has(stmt)) continue; notTaken++;
        const t = normalizeSpecText(String(r.fn ?? ''));
        if ([...t.matchAll(/\[([^\]]{1,24})\]/g)].length !== 0) continue;
        noBracket++;
        if (!t.trim()) nbEmptyFn++;
        const k = t.trim().slice(0, 60) || '(EMPTY)'; fnFreq[k] = (fnFreq[k] ?? 0) + 1;
        if (samples.length < 30) samples.push({ stmt: r.stmt, name: r.name, fn: String(r.fn).slice(0, 400), raw: String(r.raw).slice(0, 400), srv: String(r.srv).slice(0, 250), sungsang: String(r.sungsang).slice(0, 150) });
      }
      after = String(rows[rows.length - 1].id);
    }
    const fnTop = Object.entries(fnFreq).sort((a, b) => b[1] - a[1]).slice(0, 40);
    fs.writeFileSync(process.env.OUT ?? 'nobracket-census.json', JSON.stringify({ shard: SHARD, scanned, inShard, unpromoted, notTaken, noBracket, nbEmptyFn, fnTop, samples }, null, 1), 'utf8');
    console.log(`DONE shard=${SHARD} scanned=${scanned} inShard=${inShard} unpromoted=${unpromoted} notTaken=${notTaken} noBracket=${noBracket} emptyFn=${nbEmptyFn}`);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
