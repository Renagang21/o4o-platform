/**
 * READ-ONLY — PARTNER_COMBO_ROUTE 1,131 전수 signature census + 도메인 소유권 분류. DB write 0.
 *   PROXY_PORT=5436 npx tsx src/scripts/hff-fiber-partner-census.ts --holds <holds.json> --out <dir>
 *
 * WO-O4O-HFF-FIBER-PARTNER-COMBO-MAX-PRODUCTION-B-V1 B-01/02.
 * signature = fiber sources(parseFiberSources) + partner keys(parseSpecs). 소유권 = 비-fiber 기능성 도메인:
 *   B(장·배변·혈당·지질·체지방·면역·대사) / A(관절·피부) / C(눈·인지·혈행) / OWN(프로바이오틱스·홍삼) / AMBIG(혼합·미귀속).
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { normalizeSpecText, parseSpecs, parseFiberSources, splitFunctions } from './hff-source-parse.js';
import { mapFunctionEn } from './hff-nutrient-registry.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const HOLDS = arg('holds'); const OUT = arg('out'); if (!HOLDS || !OUT) throw new Error('--holds --out 필요');
fs.mkdirSync(OUT, { recursive: true });
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5436', 10);

const FIBER_FNRE = /배변활동|장내\s*유익균|식후\s*혈당|혈중\s*콜레스테롤|식이섬유/;
const DOM_A = /관절|연골|피부/;
const DOM_C = /눈\s*건강|황반|눈의\s*피로|기억력|인지력|혈행/;
const DOM_B = /배변|유익균|혈당|콜레스테롤|중성지질|체지방|면역|에너지|대사|피로|항산화|뼈|치아|세포\s*보호|신경|근육|갑상선|헤모글로빈|산소|혈액\s*생성|엽산|호모시스테인|정상적인/;
const OWN = /프로바이오틱|유산균|락토바실|비피더스|홍삼/;
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;

async function main(): Promise<void> {
  const holds = JSON.parse(fs.readFileSync(HOLDS, 'utf8')) as Array<{ statementNo: string; reason: string }>;
  const stmts = [...new Set(holds.filter((h) => h.reason === 'PARTNER_COMBO_ROUTE').map((h) => h.statementNo))];
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; sungsang: string; srv: string; fn: string; base: string }> = await ds.query(
      `SELECT id, matched_product_master_id mid, raw_payload->'source'->>'STTEMNT_NO' stmt,
         coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang,
         coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn,
         coalesce(raw_payload->'source'->>'BASE_STANDARD','') base
       FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
         AND raw_payload->'source'->>'STTEMNT_NO' = ANY($1)`, [stmts]);

    const cls: Record<string, Array<Record<string, unknown>>> = { B: [], A: [], C: [], OWN: [], AMBIG: [] };
    const sigHist: Record<string, number> = {}; const partnerHist: Record<string, number> = {};
    let fresh = 0, liquid = 0, takenN = 0;
    for (const r of rows) {
      const stmt = String(r.stmt).trim();
      if (r.mid != null || taken.has(stmt)) { takenN++; continue; }
      if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) { liquid++; continue; }
      fresh++;
      const fp = parseFiberSources(r.base, r.fn);
      const partners = [...parseSpecs(r.base).byKey.keys()].filter((k) => k !== '식이섬유');
      for (const p of partners) partnerHist[p] = (partnerHist[p] ?? 0) + 1;
      const sig = [...fp.sources, ...partners].sort().join('+') || '(fiber-generic+partner-fn-only)';
      sigHist[sig] = (sigHist[sig] ?? 0) + 1;
      const fns = splitFunctions(r.fn);
      const nonFiber = fns.filter((f) => !FIBER_FNRE.test(f));
      const t = normalizeSpecText(`${r.fn} ${r.base}`);
      let dom: keyof typeof cls;
      if (OWN.test(t)) dom = 'OWN';
      else {
        const hasA = nonFiber.some((f) => DOM_A.test(f)); const hasC = nonFiber.some((f) => DOM_C.test(f));
        const allB = nonFiber.every((f) => DOM_B.test(f) && !DOM_A.test(f) && !DOM_C.test(f));
        if (hasA && !hasC && !nonFiber.some((f) => DOM_B.test(f) && !DOM_A.test(f))) dom = 'A';
        else if (hasC && !hasA && !nonFiber.some((f) => DOM_B.test(f) && !DOM_C.test(f))) dom = 'C';
        else if (!hasA && !hasC && allB) dom = 'B';
        else if (hasA || hasC) dom = 'AMBIG';
        else dom = nonFiber.length === 0 ? 'B' : 'AMBIG';
      }
      // EN 가늠(B만): 전 기능성 mapFunctionEn HIT 여부
      const enOk = fns.length > 0 && fns.every((f) => mapFunctionEn(f) != null);
      cls[dom].push({ statementNo: stmt, candidateId: r.id, name: r.name.trim(), sig, fiberSources: fp.sources, partners, fnCount: fns.length, enOk });
    }
    const summary = { poolStmts: stmts.length, dbRows: rows.length, taken: takenN, liquid, fresh,
      domains: Object.fromEntries(Object.entries(cls).map(([k, v]) => [k, v.length])),
      B_enOk: cls.B.filter((x) => x.enOk).length,
      topSigs: Object.entries(sigHist).sort((a, b) => b[1] - a[1]).slice(0, 20), partnerHist };
    for (const [k, v] of Object.entries(cls)) fs.writeFileSync(path.join(OUT, `partner-domain-${k}.json`), JSON.stringify(v, null, 1));
    fs.writeFileSync(path.join(OUT, 'partner-census-summary.json'), JSON.stringify(summary, null, 1));
    console.log('JSON_PC_BEGIN'); console.log(JSON.stringify(summary, null, 2)); console.log('JSON_PC_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
