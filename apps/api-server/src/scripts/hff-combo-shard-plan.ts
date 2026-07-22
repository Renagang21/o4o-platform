/**
 * HFF 복합형 — 병렬 세션 shard 계획 (read-only, DB write 0)
 *   PROXY_PORT=5442 npx tsx src/scripts/hff-combo-shard-plan.ts --shard 1 --shard-count 3 --out <plan.json>
 *
 * 목적: 완결형 생산 세션 간 후보 선점 충돌 방지.
 *   - 미승격(matched NULL) + canonical STORE SPD 미존재 + clean(unknownLabels 0) full-set(N>=2) 후보만.
 *   - 정렬 signature 를 stableHash % shard-count 로 분리 → 각 세션은 자기 shard signature 만 생산.
 *   - 기생산/불안정(식이섬유·오메가3·루테인 등) signature 제외.
 * stableHash 는 hff-combo-select 와 **동일 구현**(FNV-1a) — 두 도구의 shard 판정 일치 보장.
 */
import '../env-loader.js';
import fs from 'node:fs';
import { DataSource } from 'typeorm';
import { parseSpecs } from './hff-source-parse.js';
import { normalizeSource } from '../modules/content-guard/source-grounding-parser.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const SHARD = parseInt(arg('shard', '-1'), 10);
const SHARD_COUNT = parseInt(arg('shard-count', '0'), 10);
const OUT = arg('out');
const ALL = process.argv.includes('--all-shards'); // 검증용: 전 shard 분포 출력
if (!OUT || SHARD_COUNT <= 0) throw new Error('--shard-count N --out <path> 필요 (생산은 --shard M 도)');

export function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

// 제외: 불안정 귀속·비대상 원료 signature
const EXC = /식이섬유|오메가3|루테인|가르시니아|글루코사민|프로폴리스|은행|녹차|테아닌|옥타코사놀|코엔자임|MSM|밀크씨슬|GABA/;
const LIQ = /(액상|시럽|드링크|앰플|튜브형|젤리스틱)/;

async function main(): Promise<void> {
  const producedFile = arg('produced');
  const produced: Set<string> = new Set(producedFile && fs.existsSync(producedFile) ? JSON.parse(fs.readFileSync(producedFile, 'utf8')) : []);
  const port = parseInt(process.env.PROXY_PORT ?? '5442', 10);
  const ds = new DataSource({ type: 'postgres', host: process.env.PROXY_HOST ?? '127.0.0.1', port, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 1, statement_timeout: 600000 } });
  await ds.initialize();
  const buckets = new Map<string, { c: number; ids: string[] }>();
  let scanned = 0, clean = 0; let after = '00000000-0000-0000-0000-000000000000';
  try {
    for (;;) {
      const rows: Array<{ id: string; base: string; stmt: string }> = await ds.query(
        `SELECT id, raw_payload->'source'->>'BASE_STANDARD' base, raw_payload->'source'->>'STTEMNT_NO' stmt
           FROM product_candidates
          WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND matched_product_master_id IS NULL AND id > $1
          ORDER BY id ASC LIMIT 5000`, [after]);
      if (!rows.length) break;
      for (const r of rows) {
        scanned++;
        const base = r.base ?? ''; if (!base || LIQ.test(normalizeSource(base))) continue;
        const sp = parseSpecs(base); if (sp.unknownLabels.length > 0) continue;
        const keys = [...sp.byKey.keys()]; if (keys.length < 2) continue;
        clean++;
        const sig = [...keys].sort().join('+');
        if (!buckets.has(sig)) buckets.set(sig, { c: 0, ids: [] });
        const b = buckets.get(sig)!; b.c++; if (b.ids.length < 500) b.ids.push(String(r.stmt));
      }
      after = rows[rows.length - 1].id;
    }
  } finally { await ds.destroy(); }

  const all = [...buckets.entries()]
    .filter(([sig]) => !produced.has(sig) && !EXC.test(sig))
    .map(([sig, v]) => ({ sig, c: v.c, shard: stableHash(sig) % SHARD_COUNT, ids: v.ids }))
    .sort((a, b) => b.c - a.c);

  if (ALL) {
    const dist: Record<number, { sigs: number; products: number }> = {};
    for (const x of all) { (dist[x.shard] ??= { sigs: 0, products: 0 }); dist[x.shard].sigs++; dist[x.shard].products += x.c; }
    console.log('scanned', scanned, 'clean', clean, 'sigs', all.length);
    console.log('shard 분포:', JSON.stringify(dist));
    // 교집합 검증: 각 sig 는 정확히 한 shard
    const seen = new Map<string, number>(); let overlap = 0;
    for (const x of all) { if (seen.has(x.sig) && seen.get(x.sig) !== x.shard) overlap++; seen.set(x.sig, x.shard); }
    console.log('signature 다중shard 배정(교집합):', overlap);
    fs.writeFileSync(OUT, JSON.stringify({ scanned, clean, dist, all: all.map(({ ids, ...r }) => r) }, null, 1));
    return;
  }

  const mine = all.filter((x) => x.shard === SHARD);
  fs.writeFileSync(OUT, JSON.stringify({ shard: SHARD, shardCount: SHARD_COUNT, scanned, clean, groups: mine }, null, 1));
  console.log(`shard ${SHARD}/${SHARD_COUNT}: signature ${mine.length} · 후보합 ${mine.reduce((s, x) => s + x.c, 0)}`);
  for (const x of mine.slice(0, 25)) console.log('  ', String(x.c).padStart(3), x.sig);
}
main().catch((e) => { console.error('[shard-plan] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
