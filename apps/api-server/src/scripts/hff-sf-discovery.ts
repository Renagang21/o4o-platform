/**
 * READ-ONLY — 전체 HFF 단일 기능성 미생산 원료 전수 발굴 + EN 매핑 상태. DB write 0.
 *   PROXY_PORT=5434 npx tsx src/scripts/hff-sf-discovery.ts --out <json>
 *
 * pure-single([원료] 브래킷 1종) · 고형 · 미승격 · not-taken 후보를 브래킷 라벨로 히스토그램.
 * 제외: classify() 등재원료(combo/nutrient) · 프로바이오틱스(CFU, 별도) · 이미 SF_INGREDIENTS(5종).
 * 각 라벨: count · 대표 기능성 KO · mapFunctionEn HIT수 · serving PASS수 · shard 분포 → realistic producible.
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';
import { normalizeSpecText, classify } from './hff-source-parse.js';
import { mapFunctionEn } from './hff-nutrient-registry.js';
import { parseServing } from '../modules/content-guard/source-grounding-parser.js';
import { SF_INGREDIENTS, extractFunctionsKo } from './hff-sf-registry.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUT = arg('out') || 'sf-discovery.json';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5434', 10);
function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;
const PROB = /프로바이오틱|유산균|락토바실|비피더스/i;
// 이미 정본 5종(라벨 변이 통합)
const SF5 = /바나바|코로솔산|히알루론|hyaluron|쏘팔메토|톱야자|포스파티딜세린|헤마토코쿠스|아스타잔틴/i;
// 라벨 정규화 그룹키(표기 변이 통합): 공백·괄호·'추출물/분말/제품/농축/건조물' 접미 제거
function groupKey(label: string): string {
  return label.replace(/\s+/g, '')
    .replace(/[·･・‧⦁∙•⋅.]/g, '·')          // 중점 변이 통합
    .replace(/[()（）]/g, '')
    .replace(/제\d+-\d+호$|제\d+호$/g, '')   // 인정번호 접미 제거
    .replace(/(추출물|추출분말|추출|분말|제품|농축액|농축물|건조물|건조분말|혼합분말|함유유지|원료성|주정)$/g, '').trim();
}

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    type G = { label: string; count: number; enHit: number; servingPass: number; shard: Record<number, number>; topFn: Record<string, number>; sample: string };
    const groups: Record<string, G> = {};
    let scanned = 0;
    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; sungsang: string; srv: string; fn: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt, coalesce(raw_payload->'source'->>'PRDUCT','') name,
           coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang, coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 3000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        scanned++;
        const t = normalizeSpecText(r.fn); const brackets = [...t.matchAll(/\[([^\]]{1,24})\]/g)].map((m) => m[1].trim());
        if (brackets.length !== 1) continue; const label = brackets[0];
        if (classify(label)) continue;                    // 등재원료(combo/nutrient) 제외
        if (PROB.test(label)) continue;                   // 프로바이오틱스 제외
        if (SF5.test(label)) continue;                    // 정본 5종 제외
        if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) continue;  // 고형만
        const stmt = String(r.stmt).trim(); if (!stmt) continue;
        if (r.mid != null || taken.has(stmt)) continue;   // 미승격 · not-taken
        const gk = groupKey(label); if (gk.length < 2) continue;
        const g = (groups[gk] ??= { label: gk, count: 0, enHit: 0, servingPass: 0, shard: { 0: 0, 1: 0, 2: 0 }, topFn: {}, sample: stmt });
        g.count++; g.shard[stableHash(stmt) % 3]++;
        if (parseServing(r.srv).kind === 'PARSED') g.servingPass++;
        const fns = extractFunctionsKo(r.fn);
        if (fns.length && fns.every((f) => mapFunctionEn(f) != null)) g.enHit++;
        if (fns[0]) g.topFn[fns[0]] = (g.topFn[fns[0]] ?? 0) + 1;
      }
      after = rows[rows.length - 1].id;
    }
    const ranked = Object.values(groups).filter((g) => g.count >= 3)
      .map((g) => ({ label: g.label, count: g.count, enHitProducible: g.enHit, servingPass: g.servingPass, shard: g.shard,
        repFn: Object.entries(g.topFn).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '', repFnEn: mapFunctionEn(Object.entries(g.topFn).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '') }))
      .sort((a, b) => b.enHitProducible - a.enHitProducible || b.count - a.count);
    const totalEnHit = ranked.reduce((s, g) => s + g.enHitProducible, 0);
    fs.writeFileSync(OUT, JSON.stringify({ scanned, sfRegistered: Object.keys(SF_INGREDIENTS), groupsFound: ranked.length, totalEnHitProducible: totalEnHit, ranked }, null, 1));
    console.log('JSON_DISC_BEGIN');
    console.log(JSON.stringify({ scanned, groupsFound: ranked.length, totalEnHitProducible: totalEnHit, top: ranked.slice(0, 30) }, null, 2));
    console.log('JSON_DISC_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
