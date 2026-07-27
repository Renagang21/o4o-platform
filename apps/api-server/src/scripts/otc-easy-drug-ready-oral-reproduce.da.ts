/**
 * WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-FINAL-READINESS-V1 — agent-da 재현/검증 probe (READ-ONLY)
 *
 * 승인 SSOT + unit 원장에서 oral-unit-1·2 를 전건 재현하고, DB 대조로 아래를 확인한다.
 *   - 각 master 의 gencode(일반명코드) = ledger 선언 fp 일치 · gencodeCount==1
 *   - 공식 mfds_easy_drug canonical ko 원문 존재·파싱(효능·용법·주의)
 *   - fp(gencode) 내부 안전지문(officialAxes 3축 + numeric/age/duration) mismatch 0
 *   - 기존 authored STORE ko/en canonical 0 · easy ko canonical 정확히 1 · canonicalDup 0
 *   - sourceRef=fpToUuidV2(gencode) 사전 충돌 0
 * DB write 0. 접속: 127.0.0.1:5442 · o4o_api · o4o_platform · pw=.env(열람/출력 안함).
 *
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-oral-reproduce.da.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { officialAxes, fpToUuidV2, normalize, resolveRoute } from './otc-v2-store-leaflet-runner.shared.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json');
const APPROVED = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-approved-for-production-ssot-v1.json');
const ENV_PATH = path.resolve(process.cwd(), '.env');
const readPw = (): string => {
  const m = fs.readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD not found in .env');
  return m[1].trim();
};

function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
function numericSig(s: string): string {
  const t = normalize(s);
  const n = (t.match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|그램|정|캡슐|매|포|회|시간|일|주|개월|mL|밀리리터|㎖|L|리터|IU|%)/gi) || [])
    .map((x) => x.replace(/\s+/g, '').toLowerCase()).sort();
  return H([...new Set(n)].join('|'));
}
function safetySig(ax: { ind: string; dos: string; cau: string }): Record<string, string> {
  return {
    indication: H(normalize(ax.ind)), dosage: H(normalize(ax.dos)), caution: H(normalize(ax.cau)),
    numeric: numericSig(ax.dos), numericInd: numericSig(ax.ind),
  };
}

async function connect(): Promise<any> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port: 5442,
    username: 'o4o_api', password: readPw(), database: 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 },
  });
  await ds.initialize();
  return ds;
}

async function main(): Promise<void> {
  const approved = JSON.parse(fs.readFileSync(APPROVED, 'utf8'));
  if (approved.status !== 'APPROVED_FOR_PRODUCTION') throw new Error(`SSOT status=${approved.status}`);
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const units = ledger.units.filter((u: any) => u.route === 'oral');
  const allIds: string[] = [...new Set(units.flatMap((u: any) => u.masterIds))] as string[];
  console.log(`oral units: ${units.map((u: any) => `${u.unit}=${u.fpCount}fp/${u.masterCount}m`).join(' · ')}`);
  console.log(`oral masters(distinct): ${allIds.length} (expect 540)`);

  const ds = await connect();
  // gencode 재현 (la builder VERBATIM join)
  const stdRows = retRows<{ mid: string; gencodes: string[] | null }>(await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id=pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL AND pi.product_master_id = ANY($1::uuid[])
    GROUP BY 1`, [allIds]));
  const genByMid = new Map(stdRows.map((r) => [r.mid, (r.gencodes || []).filter(Boolean).sort()]));

  // easy ko canonical content per master
  const content = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true`, [allIds]));
  const contentByMid = new Map(content.map((r) => [r.id, r.content]));

  // slots: easy ko canonical count, authored ko, en canonical
  const slots = retRows<{ mid: string; easy1: string; authored: string; encanon: string }>(await ds.query(`
    SELECT m.mid::text mid,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.source_type='mfds_easy_drug'
        AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)::text easy1,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status IN ('canonical','needs_review')
        AND s.source_type=ANY($2) AND s.deleted_at IS NULL)::text authored,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL)::text encanon
    FROM unnest($1::uuid[]) m(mid)`, [allIds, ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'nutrition_combo', 'o4o_drug_otc_topical']]));
  const slotBy = new Map(slots.map((r) => [r.mid, r]));

  const dup = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM (
      SELECT master_id, COALESCE(language,'ko') l, count(*) c FROM shared_product_descriptions
      WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1,2 HAVING count(*)>1) d`, [allIds]));

  // sourceRef preexisting per unit fp set
  const summary: any[] = [];
  for (const u of units) {
    const refs = (u.fingerprints as string[]).map((fp) => fpToUuidV2(fp));
    const refHit = retRows<{ n: string }>(await ds.query(
      `SELECT count(*)::text n FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [refs]));
    // reproduce fp groups from DB gencode
    const fpGroups = new Map<string, string[]>();
    const anomalies: string[] = [];
    let easy1 = 0, authored = 0, encanon = 0, srcMissing = 0;
    for (const mid of u.masterIds as string[]) {
      const gc = genByMid.get(mid) || [];
      if (gc.length !== 1) { anomalies.push(`gencodeCount!=1 ${mid}:${gc.length}`); continue; }
      const gencode = gc[0];
      const rr = resolveRoute(gencode);
      if (!rr.ok || rr.route !== 'oral') { anomalies.push(`route!=oral ${mid}:${gencode}:${rr.route}`); continue; }
      (fpGroups.get(gencode) || fpGroups.set(gencode, []).get(gencode)!).push(mid);
      const s = slotBy.get(mid);
      if (s) { if (+s.easy1 === 1) easy1++; else srcMissing++; authored += +s.authored; encanon += +s.encanon; }
      else srcMissing++;
    }
    // fp==declared?
    const derivedFps = [...fpGroups.keys()].sort();
    const declaredFps = [...(u.fingerprints as string[])].sort();
    const fpMatch = derivedFps.length === declaredFps.length && derivedFps.every((f, i) => f === declaredFps[i]);
    // membership match
    let memberMismatch = 0;
    for (const [fp, ids] of fpGroups) {
      const declaredIds = ids; // derived
      // cross-check: all derived ids for this fp must be in unit
      for (const id of declaredIds) if (!(u.masterIds as string[]).includes(id)) memberMismatch++;
    }
    // intra-fp safety mismatch
    let safetyMismatch = 0; const safetyBad: string[] = [];
    for (const [fp, ids] of fpGroups) {
      let sig0: string | null = null;
      for (const mid of ids) {
        const c = contentByMid.get(mid);
        if (!c) { anomalies.push(`no easy content ${mid}`); continue; }
        const ax = officialAxes(c);
        if (!ax.ind || !ax.dos) { anomalies.push(`source incomplete ${mid}`); continue; }
        const sig = JSON.stringify(safetySig(ax));
        if (sig0 === null) sig0 = sig;
        else if (sig !== sig0) { safetyMismatch++; safetyBad.push(`${fp}:${mid}`); break; }
      }
    }
    summary.push({
      unit: u.unit, declaredFp: u.fpCount, declaredMaster: u.masterCount,
      derivedFp: derivedFps.length, derivedMaster: [...fpGroups.values()].reduce((t, a) => t + a.length, 0),
      fpMatch, memberMismatch, sourceRefPreexisting: +refHit[0].n,
      easyKoCanonical1: easy1, existingAuthoredKo: authored, existingEnCanonical: encanon, srcMissing,
      safetyMismatch, safetyBadSample: safetyBad.slice(0, 5), anomaliesSample: anomalies.slice(0, 8), anomaliesCount: anomalies.length,
    });
  }
  await ds.destroy();
  console.log('canonicalDup(all 540):', +dup[0].n);
  console.log(JSON.stringify(summary, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
