/** READ-ONLY — intra-fp 안전지문 mismatch 를 의약학적으로 분류(SUBSTANTIVE vs COSMETIC). DB write 0. */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { officialAxes, normalize } from './otc-v2-store-leaflet-runner.shared.js';

const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json');
const readPw = (): string => (fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m) || [])[1]!.trim();

/** 순수 용량 값 집합: mg/g/mL/IU/% 실수치 (천단위 콤마 제거). 제형단위(정/캡슐/포)·회수는 제외. */
function doseAmounts(s: string): Set<string> {
  const t = normalize(s).replace(/(\d),(\d{3})(?!\d)/g, '$1$2'); // 3,200 → 3200
  const out = new Set<string>();
  const re = /(\d+(?:\.\d+)?)\s*(mg|g|㎎|㎍|밀리그램|그램|mL|㎖|밀리리터|iu|%)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) out.add(`${m[1]}${m[2].toLowerCase()}`);
  return out;
}
/** 연령/대상 집합. */
function ageSet(s: string): Set<string> {
  const t = normalize(s);
  const out = new Set<string>();
  for (const x of t.match(/(만\s?)?\d+\s*(세|개월)\s*(이상|이하|미만|초과)?/g) || []) out.add(x.replace(/\s+/g, ''));
  for (const kw of ['성인', '소아', '어린이', '영아', '유아', '고령자', '노인', '임부', '수유부', '신생아']) if (t.includes(kw)) out.add(kw);
  return out;
}
/** 효능 키워드 집합 — 한글 2자 이상 토큰(구두점/공백 제거 후). */
function indKeywords(s: string): Set<string> {
  const t = normalize(s).replace(/\([^)]*\)/g, ' ').replace(/[^가-힣]/g, ' ');
  return new Set((t.match(/[가-힣]{2,}/g) || []).filter((w) => !['이약은', '사용', '완화', '개선', '예방', '증상', '보급'].includes(w)));
}
const setEq = (a: Set<string>, b: Set<string>): boolean => a.size === b.size && [...a].every((x) => b.has(x));
const jaccard = (a: Set<string>, b: Set<string>): number => {
  const inter = [...a].filter((x) => b.has(x)).length; const uni = new Set([...a, ...b]).size;
  return uni === 0 ? 1 : inter / uni;
};

async function main(): Promise<void> {
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const units = ledger.units.filter((u: any) => u.route === 'oral');
  const allIds: string[] = [...new Set(units.flatMap((u: any) => u.masterIds))] as string[];
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5442, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const stdRows = retRows<{ mid: string; gencodes: string[] | null }>(await ds.query(`
    SELECT pi.product_master_id::text mid, array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id=pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL AND pi.product_master_id = ANY($1::uuid[]) GROUP BY 1`, [allIds]));
  const genByMid = new Map(stdRows.map((r) => [r.mid, (r.gencodes || []).filter(Boolean).sort()]));
  const content = retRows<{ id: string; name: string; content: string }>(await ds.query(`
    SELECT pop.id, pop.name, es.content FROM (SELECT pm.id::text id, pm.name FROM product_masters pm WHERE pm.id=ANY($1::uuid[])) pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true`, [allIds]));
  const byMid = new Map(content.map((r) => [r.id, r]));
  await ds.destroy();

  const report: any[] = [];
  let substantiveFp = 0;
  for (const u of units) {
    const fpGroups = new Map<string, string[]>();
    for (const mid of u.masterIds as string[]) { const gc = genByMid.get(mid) || []; if (gc.length === 1) (fpGroups.get(gc[0]) || fpGroups.set(gc[0], []).get(gc[0])!).push(mid); }
    for (const [fp, ids] of fpGroups) {
      const axs = ids.map((mid) => ({ mid, name: byMid.get(mid)?.name, ax: officialAxes(byMid.get(mid)?.content || '') }));
      // dose amounts union across dos+ind
      const doseSets = axs.map((x) => doseAmounts(`${x.ax.dos}\n${x.ax.ind}`));
      const ageSets = axs.map((x) => ageSet(`${x.ax.dos}\n${x.ax.cau}`));
      const indSets = axs.map((x) => indKeywords(x.ax.ind));
      const doseVary = !doseSets.every((s) => setEq(s, doseSets[0]));
      const ageVary = !ageSets.every((s) => setEq(s, ageSets[0]));
      const indMinJac = Math.min(...indSets.map((s) => jaccard(s, indSets[0])));
      const indVary = indMinJac < 0.85; // <85% keyword overlap = substantive indication divergence
      const substantive = doseVary || ageVary || indVary;
      if (!substantive) continue;
      substantiveFp++;
      report.push({
        unit: u.unit, fp, size: ids.length,
        doseVary, ageVary, indKeywordMinOverlap: +indMinJac.toFixed(2),
        distinctDoseSets: [...new Set(doseSets.map((s) => [...s].sort().join(',')))].slice(0, 4),
        distinctAgeSets: ageVary ? [...new Set(ageSets.map((s) => [...s].sort().join(',')))].slice(0, 4) : undefined,
        names: axs.map((x) => x.name).slice(0, 6),
      });
    }
  }
  console.log(`SUBSTANTIVE intra-fp divergence: ${substantiveFp} fp`);
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
