/**
 * Agent B 소유 — READ-ONLY 표본 조사. 특정 라벨을 포함하는 shard 후보의 공식 원문
 * (BASE_STANDARD · MAIN_FNCTN · SRV_USE · PRDUCT)과 B resolver 해석 결과를 함께 덤프한다.
 *
 * 실행: ... LABEL='코로솔산' N=8 npx tsx src/scripts/hff-unreg-b-probe.ts
 */
import { DataSource } from 'typeorm';
import * as fs from 'node:fs';
import { parseSpecsB } from './hff-spec-b-resolve.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const SHARD = parseInt(process.env.SHARD ?? '1', 10);
const LABEL = process.env.LABEL ?? '';
const N = parseInt(process.env.N ?? '6', 10);
const OUT = process.env.OUT;
if (!LABEL) throw new Error('LABEL 필요');

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(`SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const rows: Array<Record<string, string | null>> = await ds.query(
      `SELECT matched_product_master_id mid, raw_payload->'source'->>'STTEMNT_NO' stmt, raw_payload->'source'->>'BASE_STANDARD' base,
              raw_payload->'source'->>'MAIN_FNCTN' fn, raw_payload->'source'->>'SRV_USE' srv, raw_payload->'source'->>'PRDUCT' name,
              raw_payload->'source'->>'ENTRPS' ent
       FROM product_candidates
       WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
         AND raw_payload->'source'->>'BASE_STANDARD' LIKE $1 LIMIT 4000`, [`%${LABEL}%`]);
    const out: unknown[] = [];
    let n = 0;
    for (const r of rows) {
      const stmt = String(r.stmt ?? '').trim(); if (!stmt) continue;
      if (stableHash(stmt) % 3 !== SHARD) continue;
      if (r.mid != null || taken.has(stmt)) continue;
      const bp = parseSpecsB(String(r.base ?? ''));
      out.push({ stmt, name: r.name, ent: r.ent, byKey: [...bp.byKey.entries()].map(([k, v]) => `${k}=${v.value}${v.unit}/${v.basisAmount}${v.basisUnit} ${v.ratio}`), unknown: bp.unknownLabels, base: String(r.base ?? '').replace(/\s+/g, ' ').slice(0, 900), fn: String(r.fn ?? '').replace(/\s+/g, ' ').slice(0, 500), srv: String(r.srv ?? '').replace(/\s+/g, ' ').slice(0, 300) });
      if (++n >= N) break;
    }
    if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
    console.log(JSON.stringify(out, null, 1));
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
