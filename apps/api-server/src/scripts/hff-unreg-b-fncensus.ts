/**
 * Agent B 소유 — READ-ONLY. 대상 마커(지표성분) 라벨을 가진 shard 후보의 MAIN_FNCTN 을
 * 공용 `splitFunctions` 로 분해하고, 공용 registry 어느 원료에도 귀속되지 않는 문구를 마커별로 집계한다.
 *
 * 목적: B 전용 `INGREDIENT_FN` 세트를 **실제 공식 원문 문구**로만 구성하기 위한 근거 수집.
 * 실행: ... MARKERS='코로솔산,로르산,...' OUT=<json> npx tsx src/scripts/hff-unreg-b-fncensus.ts
 */
import { DataSource } from 'typeorm';
import * as fs from 'node:fs';
import { splitFunctions, CLS } from './hff-source-parse.js';
import { fnBelongsTo } from './hff-nutrient-registry.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const SHARD = parseInt(process.env.SHARD ?? '1', 10);
const MARKERS = (process.env.MARKERS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const OUT = process.env.OUT; if (!OUT || !MARKERS.length) throw new Error('MARKERS·OUT 필요');

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(`SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const agg: Record<string, Record<string, number>> = {}; for (const mk of MARKERS) agg[mk] = {};
    let after = '00000000-0000-0000-0000-000000000000'; let hit = 0;
    for (;;) {
      const rows: Array<Record<string, string | null>> = await ds.query(
        `SELECT matched_product_master_id mid, raw_payload->'source'->>'STTEMNT_NO' stmt, raw_payload->'source'->>'BASE_STANDARD' base, raw_payload->'source'->>'MAIN_FNCTN' fn, id
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 5000`, [after]);
      if (!rows.length) break;
      for (const r of rows) {
        const stmt = String(r.stmt ?? '').trim(); if (!stmt) continue;
        if (stableHash(stmt) % 3 !== SHARD) continue;
        if (r.mid != null || taken.has(stmt)) continue;
        const base = String(r.base ?? '');
        const mine = MARKERS.filter((mk) => base.includes(mk));
        if (!mine.length) continue;
        hit++;
        const fns = splitFunctions(String(r.fn ?? ''));
        const orphan = fns.filter((f) => !CLS.some((c) => fnBelongsTo(f, c.k)));
        for (const mk of mine) for (const f of orphan) agg[mk][f] = (agg[mk][f] ?? 0) + 1;
      }
      after = String(rows[rows.length - 1].id);
    }
    fs.writeFileSync(OUT, JSON.stringify(agg, null, 1), 'utf8');
    console.log(`FNCENSUS shard=${SHARD} hit=${hit}`);
    for (const mk of MARKERS) {
      const e = Object.entries(agg[mk]).sort((a, b) => b[1] - a[1]);
      console.log(`\n### ${mk} — orphan 문구 ${e.length}`);
      for (const [f, n] of e.slice(0, 12)) console.log(`  ${n}\t${f.slice(0, 110)}`);
    }
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
