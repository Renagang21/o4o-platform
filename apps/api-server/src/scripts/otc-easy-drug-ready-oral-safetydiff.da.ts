/** READ-ONLY — intra-fp(gencode) 안전지문 mismatch 그룹의 실제 원문 차이 진단. DB write 0. */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { officialAxes, normalize } from './otc-v2-store-leaflet-runner.shared.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json');
const readPw = (): string => (fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m) || [])[1]!.trim();
function numericSig(s: string): string {
  const t = normalize(s);
  const n = (t.match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|그램|정|캡슐|매|포|회|시간|일|주|개월|mL|밀리리터|㎖|L|리터|IU|%)/gi) || [])
    .map((x) => x.replace(/\s+/g, '').toLowerCase()).sort();
  return [...new Set(n)].join('|');
}

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

  for (const u of units) {
    const fpGroups = new Map<string, string[]>();
    for (const mid of u.masterIds as string[]) {
      const gc = genByMid.get(mid) || [];
      if (gc.length === 1) (fpGroups.get(gc[0]) || fpGroups.set(gc[0], []).get(gc[0])!).push(mid);
    }
    for (const [fp, ids] of fpGroups) {
      const axByMid = ids.map((mid) => ({ mid, name: byMid.get(mid)?.name, ax: officialAxes(byMid.get(mid)?.content || '') }));
      const indSet = new Set(axByMid.map((x) => H(normalize(x.ax.ind))));
      const dosSet = new Set(axByMid.map((x) => H(normalize(x.ax.dos))));
      const cauSet = new Set(axByMid.map((x) => H(normalize(x.ax.cau))));
      const numDosSet = new Set(axByMid.map((x) => numericSig(x.ax.dos)));
      const numIndSet = new Set(axByMid.map((x) => numericSig(x.ax.ind)));
      const mismatch = indSet.size > 1 || dosSet.size > 1 || cauSet.size > 1 || numDosSet.size > 1 || numIndSet.size > 1;
      if (!mismatch) continue;
      console.log(`\n===== ${u.unit} fp=${fp} size=${ids.length} — ind:${indSet.size} dos:${dosSet.size} cau:${cauSet.size} numDos:${numDosSet.size} numInd:${numIndSet.size}`);
      const which = numDosSet.size > 1 ? 'DOSAGE-NUMERIC' : numIndSet.size > 1 ? 'INDICATION-NUMERIC' : indSet.size > 1 ? 'INDICATION-TEXT' : dosSet.size > 1 ? 'DOSAGE-TEXT' : 'CAUTION-TEXT';
      console.log(`  >>> substantive axis: ${which}`);
      // print distinct ind/dos where they differ
      if (indSet.size > 1 || numIndSet.size > 1) {
        const seen = new Set<string>();
        for (const x of axByMid) { const k = H(normalize(x.ax.ind)); if (seen.has(k)) continue; seen.add(k); console.log(`  [IND ${x.name}] ${normalize(x.ax.ind).slice(0, 200)}`); }
      }
      if (dosSet.size > 1 || numDosSet.size > 1) {
        const seen = new Set<string>();
        for (const x of axByMid) { const k = H(normalize(x.ax.dos)); if (seen.has(k)) continue; seen.add(k); console.log(`  [DOS ${x.name}] ${normalize(x.ax.dos).slice(0, 240)}`); }
      }
    }
  }
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
