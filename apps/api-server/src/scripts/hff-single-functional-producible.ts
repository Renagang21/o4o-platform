/**
 * READ-ONLY — 미등재 단일 기능성 원료 producible 산정 + shard 분포. DB write 0.
 *   PROXY_PORT=5433 npx tsx src/scripts/hff-single-functional-producible.ts --out <json> [--shard-count 3]
 *
 * pure-single = MAIN_FNCTN `[원료]` 브래킷 라벨이 **정확히 1종** 인 제품(= 단일 기능성).
 *   그 라벨을 정규화 키로 묶어 원료별 producible(고형·미생산) 집계.
 * shard = stableHash(정규화 원료 signature) % shard-count (hff-combo-select 와 동일 FNV-1a) — 병렬 세션 분할용.
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';
import { classify, normalizeSpecText } from './hff-source-parse.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUT = arg('out') || 'producible.json';
const SHARD_COUNT = parseInt(arg('shard-count', '3'), 10);
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);
function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;

// 미등재 다빈도 원료 정규화(표기 변이 통합). registry 미등재라 별도 매핑.
const NORM: Array<{ key: string; re: RegExp }> = [
  { key: '프로바이오틱스', re: /프로바이오틱|유산균|락토바실|비피더스/i },
  { key: '바나바잎추출물', re: /바나바/i },
  { key: '포스파티딜세린', re: /포스파티딜세린/i },
  { key: '히알루론산', re: /히알루론/i },
  { key: '쏘팔메토열매추출물', re: /쏘팔메토|쏘야|톱야자/i },
  { key: '헤마토코쿠스추출물', re: /헤마토코쿠스|아스타잔틴/i },
  { key: '홍국', re: /홍국/i },
  { key: '홍경천추출물', re: /홍경천/i },
  { key: '회화나무열매추출물', re: /회화나무/i },
  { key: '대두이소플라본', re: /이소플라본/i },
  { key: '가르시니아', re: /가르시니아|HCA/i },
  { key: '루테인', re: /루테인|지아잔틴/i },
  { key: '밀크씨슬', re: /밀크씨슬|실리마린/i },
  { key: '코엔자임Q10', re: /코엔자임|Q10|유비퀴논/i },
  { key: '쏘이', re: /감마리놀렌/i },
];
const normKey = (label: string): string | null => { for (const n of NORM) if (n.re.test(label)) return n.key; return null; };

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const producedRows: Array<{ id: string }> = await ds.query(
      `SELECT DISTINCT master_id id FROM shared_product_descriptions
       WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND language='ko' AND source_type='o4o_hff_generated'`);
    const produced = new Set(producedRows.map((r) => r.id));

    type Bucket = { raw: number; pureSingle: number; pureSingleSolidAvail: number; produced: number; liquid: number };
    const byKey: Record<string, Bucket> = {};
    const bump = (k: string): Bucket => (byKey[k] ??= { raw: 0, pureSingle: 0, pureSingleSolidAvail: 0, produced: 0, liquid: 0 });
    let scanned = 0, pureSingleTotal = 0;

    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; name: string; sungsang: string; srv: string; fn: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid,
           coalesce(raw_payload->'source'->>'PRDUCT','') name,
           coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang,
           coalesce(raw_payload->'source'->>'SRV_USE','') srv,
           coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn
         FROM product_candidates
         WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1
         ORDER BY id ASC LIMIT 3000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        scanned++;
        const t = normalizeSpecText(r.fn);
        const brackets = [...t.matchAll(/\[([^\]]{1,24})\]/g)].map((m) => m[1].trim());
        if (brackets.length !== 1) continue;                    // pure-single(브래킷 정확히 1종)만
        const label = brackets[0];
        if (classify(label)) continue;                          // 이미 registry 등재 원료 → 별도(기존 라인)
        const key = normKey(label); if (!key) continue;         // 정규화 안 되는 라벨 skip(잡음)
        pureSingleTotal++;
        const b = bump(key); b.raw++; b.pureSingle++;
        const isLiquid = LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`);
        const isProduced = r.mid != null && produced.has(r.mid);
        if (isProduced) b.produced++;
        if (isLiquid) b.liquid++;
        if (!isProduced && !isLiquid) b.pureSingleSolidAvail++;
      }
      after = rows[rows.length - 1].id;
    }
    const ranked = Object.entries(byKey).map(([key, b]) => ({ key, ...b, shard: stableHash(key) % SHARD_COUNT }))
      .sort((a, b) => b.pureSingleSolidAvail - a.pureSingleSolidAvail);
    const shardTotals: Record<number, number> = {};
    for (const r of ranked) shardTotals[r.shard] = (shardTotals[r.shard] ?? 0) + r.pureSingleSolidAvail;
    const grand = ranked.reduce((s, r) => s + r.pureSingleSolidAvail, 0);
    fs.writeFileSync(OUT, JSON.stringify({ scanned, pureSingleTotal, shardCount: SHARD_COUNT, ranked, shardTotals, grandProducible: grand }, null, 1));
    console.log('JSON_PROD_BEGIN');
    console.log(JSON.stringify({ scanned, pureSingleTotal, grandProducible: grand, shardTotals, ranked }, null, 2));
    console.log('JSON_PROD_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
