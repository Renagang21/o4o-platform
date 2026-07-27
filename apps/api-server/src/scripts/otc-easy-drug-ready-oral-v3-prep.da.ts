/**
 * WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1 — agent-da EN 저작 준비 dump (READ-ONLY)
 *
 * 목적: oral 131 content-fp 각 대표 master 의 공식 6섹션 + composeKoV3 결과 + 용법 원문(EN 수치대조용)을
 *   파일로 덤프하여 EN 페이로드 저작 근거로 삼는다. DB write 0. LIVE apply 0. 저작·번역 없음(원문 추출만).
 *
 * fp 산식/파싱은 da V3 composer(라 census VERBATIM)와 동일. 대표 master 는 fp 그룹 masterIds 정렬 첫 원소
 *   (fp 내부 6섹션 byte-identical 이 G6 로 이미 증명되어 대표 1건이 그룹 전원과 원문 동일).
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-oral-v3-prep.da.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {
  sections, CONTENT_SECTIONS, sectionHashVector, contentFingerprint, contentFpToUuid,
  composeKoV3, buildKoV3Html, toPlain, normalize, resolveRoute,
} from './otc-easy-drug-ready-oral-v3-composer.da.js';
import { BLOCKED_MASTER_IDS } from './otc-v2-store-leaflet-runner.shared.js';

const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const V3_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json');
const OUT = path.join(DATA_DIR, 'otc-easy-drug-ready-oral-v3-ko-source-dump.da.json');
const ENV_PATH = path.resolve(process.cwd(), '.env');
const readPw = (): string => {
  const m = fs.readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD not found in .env');
  return m[1].trim();
};

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
  const ledger = JSON.parse(fs.readFileSync(V3_LEDGER, 'utf8'));
  const oralUnits: any[] = ledger.units.filter((u: any) => u.route === 'oral');
  const unitByMid = new Map<string, string>();
  const allIds: string[] = [];
  for (const u of oralUnits) for (const mid of u.masterIds) { unitByMid.set(mid, u.unit); allIds.push(mid); }
  allIds.sort();

  const ds = await connect();
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

  const nameRows = retRows<{ mid: string; name: string }>(await ds.query(
    `SELECT id::text mid, name FROM product_masters WHERE id = ANY($1::uuid[])`, [allIds]));
  const nameByMid = new Map(nameRows.map((r) => [r.mid, r.name]));

  const contentRows = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status IN ('canonical','deprecated') AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true`, [allIds]));
  const contentByMid = new Map(contentRows.map((r) => [r.id, r.content]));
  await ds.destroy();

  interface P { mid: string; unit: string; gencode: string; route: string; form: string; sec: Record<string, string>; fp: string; }
  const producible: P[] = [];
  for (const mid of allIds) {
    if (BLOCKED_MASTER_IDS.has(mid)) continue;
    const content = contentByMid.get(mid) || '';
    if (!content) continue;
    const gencodes = genByMid.get(mid) || [];
    if (gencodes.length !== 1) continue;
    const rr = resolveRoute(gencodes[0]);
    if (!rr.ok || rr.route !== 'oral') continue;
    const sec = sections(content);
    const hv = sectionHashVector(sec);
    producible.push({ mid, unit: unitByMid.get(mid)!, gencode: gencodes[0], route: rr.route, form: rr.form || '정', sec, fp: contentFingerprint(gencodes[0], rr.route, hv) });
  }

  const fpGroups = new Map<string, P[]>();
  for (const p of producible) (fpGroups.get(p.fp) || fpGroups.set(p.fp, []).get(p.fp)!).push(p);

  const records: any[] = [];
  let composeAnomalies = 0, koBuildFail = 0;
  for (const [fp, ids] of fpGroups) {
    const members = ids.map((p) => p.mid).sort();
    const rep = ids.slice().sort((a, b) => a.mid.localeCompare(b.mid))[0];
    const ko = composeKoV3(rep.sec, rep.route, rep.form, rep.gencode);
    if (ko.anomalies.length) composeAnomalies++;
    const built = buildKoV3Html(ko.source, { title: nameByMid.get(rep.mid) || rep.gencode });
    if (built.missing.length) koBuildFail++;
    const presence: Record<string, boolean> = {};
    for (const k of CONTENT_SECTIONS) presence[k] = !!normalize(rep.sec[k] || '');
    records.push({
      fp, unit: rep.unit, sourceRef: contentFpToUuid(fp), gencode: rep.gencode, route: rep.route, form: rep.form,
      repMid: rep.mid, repName: nameByMid.get(rep.mid) || null, memberCount: members.length,
      sectionPresence: presence,
      official: {
        '효능·효과': toPlain(rep.sec['효능·효과'] || ''),
        '용법·용량': toPlain(rep.sec['용법·용량'] || ''),
        '경고': toPlain(rep.sec['경고'] || ''),
        '사용상 주의사항': toPlain(rep.sec['사용상 주의사항'] || ''),
        '이상반응': toPlain(rep.sec['이상반응'] || ''),
        '상호작용': toPlain(rep.sec['상호작용'] || ''),
      },
      koComposed: ko.source,
      koAnomalies: ko.anomalies,
      koBuildMissing: built.missing,
    });
  }
  records.sort((a, b) => (a.unit === b.unit ? a.fp.localeCompare(b.fp) : a.unit.localeCompare(b.unit)));

  const sizes = records.map((r) => JSON.stringify(r.official).length).sort((a, b) => a - b);
  const summary = {
    fpCount: records.length,
    unit1: records.filter((r) => r.unit === 'oral-unit-1').length,
    unit2: records.filter((r) => r.unit === 'oral-unit-2').length,
    composeAnomalies, koBuildFail,
    officialSizeMin: sizes[0], officialSizeMedian: sizes[Math.floor(sizes.length / 2)], officialSizeMax: sizes[sizes.length - 1],
    presenceTotals: CONTENT_SECTIONS.reduce((acc, k) => { acc[k] = records.filter((r) => r.sectionPresence[k]).length; return acc; }, {} as Record<string, number>),
  };
  fs.writeFileSync(OUT, JSON.stringify({ wo: 'WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1', agent: 'da', summary, records }, null, 2), 'utf8');
  console.log('=== oral V3 KO source dump (READ-ONLY) ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('OUT ' + OUT);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
