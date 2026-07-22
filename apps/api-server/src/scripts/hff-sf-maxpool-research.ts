/**
 * READ-ONLY 조사 — 단일 기능성 관절·간·혈행·면역 계열 미생산 max pool. DB write 0.
 * 공용 helper import(수정 0): source-parse·source-grounding-parser·nutrient-registry(mapFunctionEn)·sf-registry(extractFunctionsKo).
 *   PROXY_PORT=5434 npx tsx src/scripts/hff-sf-maxpool-research.ts --out <dir>
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { normalizeSpecText, classify } from './hff-source-parse.js';
import { parseServing, parseBasis, isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { mapFunctionEn } from './hff-nutrient-registry.js';
import { extractFunctionsKo } from './hff-sf-registry.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out') || '.';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5434', 10);
function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;
const KIDS_WOMEN = /어린이|아동|키즈|kids|유아|영아|임산부|수유부|여성|우먼|women|산모|갱년기/i;

// 관절·간·혈행·면역 계열 원료 config(labelRe). B/C 담당 프로바이오틱스·banaba/hyaluronic/saw-palmetto/haematococcus/phosphatidylserine 제외.
const SERIES: Array<{ key: string; slug: string; series: string; re: RegExp }> = [
  // 면역·항산화·피로(홍삼/인삼/버섯류/조류)
  { key: '홍삼', slug: 'red-ginseng', series: '면역', re: /홍삼/ },
  { key: '인삼', slug: 'ginseng', series: '면역', re: /(^|[^홍])인삼|진세노사이드/ },
  { key: '알로에겔', slug: 'aloe', series: '면역', re: /알로에/ },
  { key: '표고버섯균사체', slug: 'shiitake-mycelium', series: '면역', re: /표고버섯|아가리쿠스/ },
  { key: '클로렐라', slug: 'chlorella', series: '면역', re: /클로렐라/ },
  { key: '스피루리나', slug: 'spirulina', series: '면역', re: /스피루리나/ },
  { key: '베타글루칸', slug: 'beta-glucan', series: '면역', re: /베타글루칸|효모.*글루칸|보리.*글루칸/ },
  { key: '상황버섯', slug: 'phellinus', series: '면역', re: /상황버섯/ },
  // 간 건강
  { key: '밀크씨슬', slug: 'milk-thistle', series: '간', re: /밀크씨슬|실리마린|카르두스/ },
  { key: '헛개나무과병추출물', slug: 'hovenia', series: '간', re: /헛개|호베니/ },
  { key: '표고버섯간', slug: 'liver-shiitake', series: '간', re: /간건강.*표고|표고.*간건강/ },
  // 혈행
  { key: '코엔자임Q10', slug: 'coenzyme-q10', series: '혈행', re: /코엔자임|Q10|유비퀴논|코큐텐/ },
  { key: '나토키나제', slug: 'nattokinase', series: '혈행', re: /나토키나제|나토키나아제/ },
  { key: '프랑스해안송껍질추출물', slug: 'pycnogenol', series: '혈행', re: /해안송|피크노제놀|소나무껍질|피크노/ },
  { key: '정어리펩타이드', slug: 'sardine-peptide', series: '혈행', re: /정어리펩타이드|정어리\s*펩타이드/ },
  { key: '은행잎추출물', slug: 'ginkgo', series: '혈행', re: /은행잎|징코/ },
  // 관절·연골
  { key: 'MSM', slug: 'msm', series: '관절', re: /MSM|메틸설포닐메탄|디메틸설폰/ },
  { key: '글루코사민', slug: 'glucosamine', series: '관절', re: /글루코사민/ },
  { key: 'N아세틸글루코사민', slug: 'nag', series: '관절', re: /엔\s*아세틸|N-아세틸글루코사민|아세틸글루코사민/ },
  { key: '보스웰리아', slug: 'boswellia', series: '관절', re: /보스웰리아/ },
  { key: '초록입홍합', slug: 'green-lipped-mussel', series: '관절', re: /초록입홍합|퍼나|그린리프드/ },
  { key: '콘드로이친', slug: 'chondroitin', series: '관절', re: /콘드로이친/ },
  { key: '강황', slug: 'turmeric', series: '관절', re: /강황|커큐민|울금/ },
  { key: '뮤코다당단백', slug: 'mucopolysaccharide', series: '관절', re: /뮤코다당|무코다당/ },
  // 지구력·항산화 기타
  { key: '옥타코사놀', slug: 'octacosanol', series: '지구력', re: /옥타코사놀/ },
  { key: '회화나무열매추출물', slug: 'sophora', series: '갱년기', re: /회화나무/ },
];

interface Row { id: string; mid: string | null; stmt: string; name: string; sungsang: string; srv: string; fn: string; base: string; maker: string; shelf: string; storage: string; caution: string }

async function main(): Promise<void> {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  const acc: Record<string, { key: string; slug: string; series: string; total: number; produced: number; notTaken: number; liquid: number; bulk: number; kidsWomen: number; servingFail: number; enPending: number; ready: number; reviewLater: number; shard: Record<number, number>; readyStmts: string[]; koFnSet: Set<string>; enUnmapped: Set<string>; labelVariants: Set<string> }> = {};
  const other: Record<string, { n: number; notTaken: number }> = {};
  const bump = (c: typeof SERIES[number]) => (acc[c.key] ??= { key: c.key, slug: c.slug, series: c.series, total: 0, produced: 0, notTaken: 0, liquid: 0, bulk: 0, kidsWomen: 0, servingFail: 0, enPending: 0, ready: 0, reviewLater: 0, shard: { 0: 0, 1: 0, 2: 0 }, readyStmts: [], koFnSet: new Set(), enUnmapped: new Set(), labelVariants: new Set() });
  try {
    const takenPermit = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    let after = '00000000-0000-0000-0000-000000000000'; let scanned = 0, pureSingle = 0;
    for (;;) {
      const rows: Row[] = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang,
           coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn,
           coalesce(raw_payload->'source'->>'BASE_STANDARD','') base, coalesce(raw_payload->'source'->>'ENTRPS','') maker,
           coalesce(raw_payload->'source'->>'DISTB_PD','') shelf, coalesce(raw_payload->'source'->>'PRSRV_PD','') storage,
           coalesce(raw_payload->'source'->>'INTAKE_HINT1','') caution
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 4000`, [after]);
      if (!rows.length) break;
      for (const r of rows) {
        scanned++;
        const t = normalizeSpecText(r.fn); const brackets = [...t.matchAll(/\[([^\]]{1,24})\]/g)].map((m) => m[1].trim());
        if (brackets.length !== 1) continue; const label = brackets[0];
        pureSingle++;
        const cfg = SERIES.find((c) => c.re.test(label)); // 라벨(실제 기능성 원료) 기준만 — 제품명 오귀속 방지
        if (!cfg) { // 미구성 라벨 빈도(discovery) — classify 되는 것(비타민/미네랄)은 제외
          if (classify(label)) continue; const key = label.slice(0, 20); (other[key] ??= { n: 0, notTaken: 0 }); other[key].n++;
          const stmt0 = String(r.stmt).trim(); if (r.mid == null && stmt0 && !takenPermit.has(stmt0)) other[key].notTaken++; continue;
        }
        const a = bump(cfg); a.total++; a.labelVariants.add(label);
        const stmt = String(r.stmt).trim();
        const produced = r.mid != null;
        if (produced || (stmt && takenPermit.has(stmt))) { a.produced++; continue; }
        if (!stmt) continue;
        a.notTaken++;
        const isLiquid = LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`);
        if (isLiquid) { a.liquid++; a.reviewLater++; continue; }
        if (isBulkMaterial(r.srv).bulk) { a.bulk++; a.reviewLater++; continue; }
        if (KIDS_WOMEN.test(`${r.name} ${r.fn}`)) { a.kidsWomen++; continue; }
        const serving = parseServing(r.srv);
        if (serving.kind !== 'PARSED') { a.servingFail++; a.reviewLater++; continue; }
        const kos = extractFunctionsKo(r.fn); kos.forEach((k) => a.koFnSet.add(k));
        let pending = kos.length === 0;
        for (const k of kos) { if (mapFunctionEn(k) == null) { pending = true; a.enUnmapped.add(k); } }
        const sh = stableHash(stmt) % 3;
        if (pending) { a.enPending++; continue; }
        a.ready++; a.shard[sh]++; a.readyStmts.push(stmt);
      }
      after = rows[rows.length - 1].id;
    }
    // 산출
    const summary = Object.values(acc).map((a) => ({ key: a.key, slug: a.slug, series: a.series, total: a.total, produced: a.produced, notTaken: a.notTaken, liquid: a.liquid, bulk: a.bulk, kidsWomen: a.kidsWomen, servingFail: a.servingFail, enPending: a.enPending, READY: a.ready, reviewLater: a.reviewLater, shard: a.shard, koFunctions: [...a.koFnSet].slice(0, 12), enUnmapped: [...a.enUnmapped].slice(0, 12), labelVariants: [...a.labelVariants].slice(0, 8) }))
      .sort((x, y) => y.READY - x.READY);
    for (const a of Object.values(acc)) fs.writeFileSync(path.join(OUTDIR, `sf-research-${a.slug}.json`), JSON.stringify({ key: a.key, slug: a.slug, series: a.series, counts: { total: a.total, produced: a.produced, notTaken: a.notTaken, READY: a.ready, reviewLater: a.reviewLater, enPending: a.enPending, liquid: a.liquid, bulk: a.bulk, kidsWomen: a.kidsWomen, servingFail: a.servingFail }, shard: a.shard, koFunctions: [...a.koFnSet], enUnmapped: [...a.enUnmapped], labelVariants: [...a.labelVariants], readyStmts: a.readyStmts }, null, 1));
    const otherTop = Object.entries(other).filter(([, v]) => v.notTaken >= 5).sort((a, b) => b[1].notTaken - a[1].notTaken).slice(0, 40).map(([k, v]) => ({ label: k, total: v.n, notTaken: v.notTaken }));
    fs.writeFileSync(path.join(OUTDIR, '_sf-research-manifest.json'), JSON.stringify({ generated: 'read-only', scanned, pureSingle, series: ['관절', '간', '혈행', '면역', '지구력', '갱년기'], ingredients: summary, discoveryOtherTop: otherTop, totals: { READY: summary.reduce((s, x) => s + x.READY, 0), notTaken: summary.reduce((s, x) => s + x.notTaken, 0), produced: summary.reduce((s, x) => s + x.produced, 0), shard0: summary.reduce((s, x) => s + x.shard[0], 0), shard1: summary.reduce((s, x) => s + x.shard[1], 0), shard2: summary.reduce((s, x) => s + x.shard[2], 0) } }, null, 1));
    console.log('JSON_RESEARCH_BEGIN');
    console.log(JSON.stringify({ scanned, pureSingle, totalREADY: summary.reduce((s, x) => s + x.READY, 0), byIngredient: summary, discoveryOtherTop: otherTop.slice(0, 20) }, null, 2));
    console.log('JSON_RESEARCH_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
