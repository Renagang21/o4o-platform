/**
 * READ-ONLY — 식이섬유 family 후보 전수 census (B 전용 준비, 공용 parser 무접촉). DB write 0.
 *   PROXY_PORT=5435 npx tsx src/scripts/hff-fiber-census.ts --out <dir>
 *
 * WO-O4O-HFF-DIETARY-FIBER-COMBO-PRODUCTION-B-V1 B-01~B-04.
 * 원료별(차전자피/난소화성말토덱스트린/이눌린·치커리/프락토올리고당/폴리덱스트로스/자일로올리고당/귀리/혼합/generic)
 * 후보 수 · 표기 변이 · 포맷 분포 · 타도메인 동반원료 · fixture 원문 샘플 수집.
 * generic(원료 특정 불가)은 생산 제외 대상으로 별도 집계.
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { normalizeSpecText } from './hff-source-parse.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUT = arg('out') || '.'; fs.mkdirSync(OUT, { recursive: true });
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5435', 10);
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;

const FIBER_SOURCES: Array<{ key: string; re: RegExp }> = [
  { key: '차전자피', re: /차전자/ },
  { key: '난소화성말토덱스트린', re: /난소화성/ },
  { key: '이눌린치커리', re: /이눌린|치커리/ },
  { key: '프락토올리고당', re: /프락토올리고/ },
  { key: '폴리덱스트로스', re: /폴리덱스트로스/ },
  { key: '자일로올리고당', re: /자일로올리고/ },
  { key: '귀리', re: /귀리/ },
];
const FIBER_FN = /배변활동|장내\s*유익균|식후\s*혈당|혈중\s*콜레스테롤/;
// 타도메인 동반 기능성 원료(누락 감시 대상)
const PARTNERS: Array<{ key: string; re: RegExp }> = [
  { key: '바나바(혈당)', re: /바나바|코로솔산/ }, { key: '키토산(콜레)', re: /키토산/ }, { key: '홍국(콜레)', re: /홍국/ },
  { key: '가르시니아(체지방)', re: /가르시니아/ }, { key: '녹차(체지방)', re: /녹차|카테킨/ }, { key: '알로에(장)', re: /알로에/ },
  { key: '프로바이오틱스(장)', re: /프로바이오틱|유산균/ }, { key: '아연(면역)', re: /아연/ }, { key: '비타민(류)', re: /비타민/ },
  { key: '은행잎(혈행)', re: /은행잎/ }, { key: '밀크씨슬(간)', re: /밀크씨슬|실리마린/ },
];

function fiberSpecLines(base: string): string[] {
  const t = normalizeSpecText(base);
  // 식이섬유 관련 라인만 추출(라벨에 식이섬유/원료 키워드)
  return t.split(/(?=\d+\s*[).·.]\s)|\n/).map((x) => x.trim()).filter((x) => /식이섬유|차전자|난소화성|이눌린|치커리|프락토올리고|폴리덱스트로스|자일로올리고|귀리/.test(x) && x.length > 4);
}
function formatOf(line: string): string[] {
  const f: string[] = [];
  if (/표시량/.test(line)) f.push('표시량형');
  if (/이상(?!.*%)/.test(line) && !/[~∼]/.test(line)) f.push('X이상형');
  if (/[~∼].*%/.test(line)) f.push('비율형');
  if (/㎎/.test(line)) f.push('㎎');
  if (/그램/.test(line)) f.push('그램표기');
  if (/%\s*(?:이상)?/.test(line) && !/[~∼]/.test(line)) f.push('%단독');
  if (/\|/.test(line)) f.push('표형식');
  return f.length ? f : ['기타'];
}

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    type SB = { total: number; solid: number; notTaken: number; pureFiber: number; withPartners: number };
    const bySource: Record<string, SB> = {}; const sb = (k: string): SB => (bySource[k] ??= { total: 0, solid: 0, notTaken: 0, pureFiber: 0, withPartners: 0 });
    const formatHist: Record<string, number> = {}; const variantHist: Record<string, number> = {};
    const partnerHist: Record<string, number> = {};
    const fixtures: Array<Record<string, unknown>> = [];
    const fixtureNeed = new Set(['차전자단독', '난소화성단독', '폴리덱스트로스단독', '다원료동반', '총량+개별', 'X이상형', '㎎표기', '그램표기', '표형식', '줄바꿈형', '타원료동반', 'generic만']);
    let scanned = 0, fiberProducts = 0, genericOnly = 0, mixedMulti = 0;

    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; sungsang: string; srv: string; fn: string; base: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang,
           coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn,
           coalesce(raw_payload->'source'->>'BASE_STANDARD','') base
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 3000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        scanned++;
        const hay = normalizeSpecText(`${r.base} ${r.fn}`);
        if (!FIBER_FN.test(normalizeSpecText(r.fn)) || !/식이섬유|차전자|난소화성|이눌린|치커리|프락토올리고|폴리덱스트로스|자일로올리고/.test(hay)) continue;
        fiberProducts++;
        const solid = !LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`);
        const stmt = String(r.stmt).trim(); const notTaken = r.mid == null && !taken.has(stmt);
        const sources = FIBER_SOURCES.filter((s) => s.re.test(hay)).map((s) => s.key);
        const partners = PARTNERS.filter((p) => p.re.test(hay)).map((p) => p.key);
        for (const p of partners) partnerHist[p] = (partnerHist[p] ?? 0) + 1;
        if (sources.length === 0) { genericOnly++; if (fixtureNeed.delete('generic만')) fixtures.push({ case: 'generic만(생산제외)', stmt, name: r.name.trim(), base: r.base.trim().slice(0, 400) }); continue; }
        if (sources.length > 1) mixedMulti++;
        for (const s of sources) { const b = sb(s); b.total++; if (solid) b.solid++; if (notTaken && solid) b.notTaken++; if (partners.length === 0) b.pureFiber++; else b.withPartners++; }
        // 표기 변이 + 포맷
        for (const line of fiberSpecLines(r.base)) {
          for (const f of formatOf(line)) formatHist[f] = (formatHist[f] ?? 0) + 1;
          const lbl = line.match(/^([^:：]{2,24})[:：]/); if (lbl) variantHist[lbl[1].trim().replace(/\s+/g, ' ')] = (variantHist[lbl[1].trim().replace(/\s+/g, ' ')] ?? 0) + 1;
        }
        // fixture 채집(실원문)
        const b0 = r.base.trim();
        const grab = (c: string): void => { if (fixtureNeed.delete(c)) fixtures.push({ case: c, stmt, name: r.name.trim(), base: b0.slice(0, 500), fn: r.fn.trim().slice(0, 200), expectedSources: sources }); };
        if (sources.length === 1 && sources[0] === '차전자피') grab('차전자단독');
        if (sources.length === 1 && sources[0] === '난소화성말토덱스트린') grab('난소화성단독');
        if (sources.length === 1 && sources[0] === '폴리덱스트로스') grab('폴리덱스트로스단독');
        if (sources.length >= 2) grab('다원료동반');
        if (/총\s*식이섬유/.test(hay) && sources.length >= 1) grab('총량+개별');
        if (/이상/.test(b0) && !/[~∼]/.test(b0)) grab('X이상형');
        if (/㎎/.test(b0)) grab('㎎표기');
        if (/그램/.test(b0)) grab('그램표기');
        if (/\|/.test(b0)) grab('표형식');
        if (/\n/.test(b0)) grab('줄바꿈형');
        if (partners.length > 0) grab('타원료동반');
      }
      after = rows[rows.length - 1].id;
    }
    const report = { scanned, fiberProducts, genericOnly_생산제외: genericOnly, mixedMultiSource: mixedMulti,
      bySource, formatHist, partnerHist, topLabelVariants: Object.entries(variantHist).sort((a, b) => b[1] - a[1]).slice(0, 25),
      fixturesCollected: fixtures.length, fixtureMissing: [...fixtureNeed] };
    fs.writeFileSync(path.join(OUT, 'fiber-census.json'), JSON.stringify(report, null, 1));
    fs.writeFileSync(path.join(OUT, 'fiber-fixtures.json'), JSON.stringify(fixtures, null, 1));
    console.log('JSON_FIBER_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_FIBER_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
