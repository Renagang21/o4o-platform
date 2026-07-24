/**
 * READ-ONLY — shard1 미생산 후보 중 parseSpecs unknownLabels 빈도 census. DB write 0.
 *   PROXY_PORT=5438 npx tsx src/scripts/hff-unknown-spec-census.ts --produced <json> --out <json>
 *
 * 목적: 규격 라벨이 미해석(UNKNOWN_SPEC)돼 HOLD 되는 제품에서 **다수 회수 가능한 반복 라벨**을 빈도순으로 확인.
 *       공용 classify/CLS/parseSpecs 무수정 — 본 census 는 순수 관찰.
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';
import { parseSpecs, classify, normalizeSpecText } from './hff-source-parse.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const PRODUCED = arg('produced'); const OUT = arg('out') || 'unknown-census.json';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5438', 10);
function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const produced = new Set(JSON.parse(fs.readFileSync(PRODUCED, 'utf8')) as string[]);
// 정규화: 공백·괄호주석·인정번호·함량접미 제거 → 반복 라벨 병합
const normLabel = (l: string): string => l.replace(/\s+/g, '').replace(/\([^)]*\)/g, '').replace(/제\d+-?\d*호$/g, '').replace(/\d[\d,.]*(mg|g|μg|mcg|IU)$/gi, '').trim();

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const hist: Record<string, { n: number; sample: string; withKnown: number }> = {};
    let scanned = 0, shard1 = 0, hasUnknown = 0;
    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; base: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt, coalesce(raw_payload->'source'->>'BASE_STANDARD','') base
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 4000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        scanned++;
        const stmt = String(r.stmt).trim(); if (!stmt || produced.has(stmt) || r.mid != null) continue;
        if (stableHash(stmt) % 3 !== 1) continue; shard1++;
        const sp = parseSpecs(r.base || '');
        if (!sp.unknownLabels.length) continue; hasUnknown++;
        const knownCount = sp.byKey.size;
        for (const lb of sp.unknownLabels) {
          const k = normLabel(lb); if (k.length < 2) continue;
          const e = (hist[k] ??= { n: 0, sample: lb, withKnown: 0 });
          e.n++; if (knownCount > 0) e.withKnown++;
        }
      }
      after = rows[rows.length - 1].id;
    }
    const ranked = Object.entries(hist).map(([label, v]) => ({ label, count: v.n, withKnownPartner: v.withKnown, sample: v.sample, classifyHit: !!classify(label) })).sort((a, b) => b.count - a.count);
    fs.writeFileSync(OUT, JSON.stringify({ scanned, shard1, hasUnknown, distinctLabels: ranked.length, ranked }, null, 1));
    console.log('JSON_UNK_BEGIN');
    console.log(JSON.stringify({ scanned, shard1, hasUnknown, distinctLabels: ranked.length, top: ranked.slice(0, 40) }, null, 2));
    console.log('JSON_UNK_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
