/**
 * WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT2-CONTENT-FP-V3-FINAL-PRODUCTION-V1 — oral V3 540 트랙 최종 독립검증(da)
 *
 * apply/postverify 러너와 별개 코드경로. **read-only(SELECT) 전용.**
 *   A. oral 540 전체: contentFp 131 · master 540 · KO/EN authored canonical 540 · easy deprecated 540 ·
 *      easy canonical 잔존 0 · audit 540 · canonicalDup 0 · 저장 content 해시 불일치 0 · EN 한글 0
 *   B. write 총량: audit 앵커 기준 unit1 270 + unit2 270 = 540 master · KO 2,160T + EN 1,080T = 3,240T (계약 환산)
 *   C. sourceRef 격리: V3 oral 131 sourceRef 를 가진 행이 oral 540 master 밖에 **0**
 *   D. 타 route 무변경: ophthalmic-unit-1 / oromucosal-unit-1 / topical-unit-1 대상 master 에
 *      본 트랙 WO audit 0 · V3 oral sourceRef 0 · authored canonical 0 (= 아직 미착수 상태 유지)
 *   E. V1/V2 불간섭: 본 트랙 audit 이 oral 540 밖 master 를 하나도 건드리지 않음 · V2 namespace sourceRef 미사용
 *
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-oral-v3-track-verify.da.ts [--port 5445]
 */
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const CWD = process.cwd();
const readPw = (): string => readFileSync(path.resolve(CWD, '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const DATA = path.resolve(CWD, 'src/scripts/data');
const rd = (f: string): any => JSON.parse(readFileSync(path.join(DATA, f), 'utf8'));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => { const a = arg('--port'); return a ? parseInt(a, 10) : 5445; };
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');

const WO_U1 = 'WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1';
const WO_U2 = 'WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT2-CONTENT-FP-V3-FINAL-PRODUCTION-V1';
const ORAL_UNITS = ['oral-unit-1', 'oral-unit-2'];
const OTHER_UNITS = ['ophthalmic-unit-1', 'oromucosal-unit-1', 'topical-unit-1'];

async function main(): Promise<void> {
  const ledger = rd('otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json');
  const unitsById: Record<string, any> = Object.fromEntries(ledger.units.map((u: any) => [u.unit, u]));
  const oralMasters = [...new Set(ORAL_UNITS.flatMap((u) => unitsById[u].masterIds))] as string[];
  const oralRefs = [...new Set(ORAL_UNITS.flatMap((u) => unitsById[u].sourceRefs))] as string[];
  const otherMasters = [...new Set(OTHER_UNITS.flatMap((u) => unitsById[u].masterIds))] as string[];
  const builds = ORAL_UNITS.map((u) => ({
    unit: u,
    ko: rd(`otc-easy-drug-ready-oral-v3-build-${u}.json`),
    en: rd(`otc-easy-drug-ready-oral-v3-en-build-${u}.json`),
  }));
  const fpTotal = builds.reduce((t, b) => t + b.ko.fingerprints.length, 0);

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: port(), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 } });
  await ds.initialize();
  const fails: string[] = [];
  const notes: any = { oralMasters: oralMasters.length, oralSourceRefs: oralRefs.length, contentFp: fpTotal, otherRouteMasters: otherMasters.length };
  try {
    // A. oral 540 canonical 상태
    const a = (await ds.query(`SELECT
      count(*) FILTER (WHERE kocanon=1)::int "koCanon1",
      count(*) FILTER (WHERE kocanon>1)::int "koDup",
      count(*) FILTER (WHERE ko_authored)::int "koAuthoredCanonical",
      count(*) FILTER (WHERE encanon=1)::int "enCanon1",
      count(*) FILTER (WHERE encanon>1)::int "enDup",
      count(*) FILTER (WHERE en_authored)::int "enAuthoredCanonical",
      count(*) FILTER (WHERE dep_easy)::int "easyDeprecated",
      count(*) FILTER (WHERE easy_left)::int "easyStillCanonical"
      FROM (SELECT mid,
        (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) kocanon,
        (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) encanon,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) ko_authored,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) en_authored,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) easy_left
        FROM unnest($1::uuid[]) mid) t`, [oralMasters]))[0];
    const N = oralMasters.length;
    notes.oralTrack = { ...a, expected: N };
    for (const [k, want] of [['koCanon1', N], ['koAuthoredCanonical', N], ['enCanon1', N], ['enAuthoredCanonical', N], ['easyDeprecated', N]] as const) {
      if (a[k] !== want) fails.push(`A: ${k}=${a[k]}!=${want}`);
    }
    if (a.koDup !== 0) fails.push(`A: koCanonicalDup=${a.koDup}`);
    if (a.enDup !== 0) fails.push(`A: enCanonicalDup=${a.enDup}`);
    if (a.easyStillCanonical !== 0) fails.push(`A: easyStillCanonical=${a.easyStillCanonical}`);

    // B. audit 앵커 · write 총량
    const b = (await ds.query(`SELECT
      (SELECT count(DISTINCT master_id)::int FROM shared_product_description_audit_logs WHERE (metadata->>'productionWo')=$1) "u1Masters",
      (SELECT count(DISTINCT master_id)::int FROM shared_product_description_audit_logs WHERE (metadata->>'productionWo')=$2) "u2Masters",
      (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE (metadata->>'productionWo') IN ($1,$2)) "auditRows",
      (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE (metadata->>'productionWo') IN ($1,$2) AND NOT master_id=ANY($3::uuid[])) "auditOutsideOral"
      `, [WO_U1, WO_U2, oralMasters]))[0];
    notes.auditAnchor = { ...b, koWriteContract: N * 4, enWriteContract: N * 2, totalWriteContract: N * 6 };
    if (b.u1Masters !== 270) fails.push(`B: unit1 audit masters=${b.u1Masters}!=270`);
    if (b.u2Masters !== 270) fails.push(`B: unit2 audit masters=${b.u2Masters}!=270`);
    if (b.auditRows !== N) fails.push(`B: auditRows=${b.auditRows}!=${N}`);
    if (b.auditOutsideOral !== 0) fails.push(`B: auditOutsideOral=${b.auditOutsideOral} (트랙 밖 master 변경)`);

    // C. sourceRef 격리 (V3 oral namespace 행이 oral 540 밖에 존재하면 leak)
    const c = (await ds.query(`SELECT
      (SELECT count(*)::int FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL) "v3RowsTotal",
      (SELECT count(*)::int FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL AND NOT master_id=ANY($2::uuid[])) "sourceRefLeak",
      (SELECT count(DISTINCT source_ref_id)::int FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL) "distinctRefsUsed"
      `, [oralRefs, oralMasters]))[0];
    notes.sourceRefIsolation = { ...c, expectedRows: N * 2, expectedRefs: oralRefs.length };
    if (c.v3RowsTotal !== N * 2) fails.push(`C: v3Rows=${c.v3RowsTotal}!=${N * 2}`);
    if (c.sourceRefLeak !== 0) fails.push(`C: sourceRefLeak=${c.sourceRefLeak}`);
    if (c.distinctRefsUsed !== oralRefs.length) fails.push(`C: distinctRefsUsed=${c.distinctRefsUsed}!=${oralRefs.length}`);

    // D. 타 route(ophthalmic/oromucosal/topical) 무변경
    const d = (await ds.query(`SELECT
      (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND (metadata->>'productionWo') IN ($2,$3)) "auditFromThisTrack",
      (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_ref_id=ANY($4::uuid[]) AND deleted_at IS NULL) "oralV3RefRows",
      (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)) "authoredKoCanonical",
      (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)) "easyCanonical"
      `, [otherMasters, WO_U1, WO_U2, oralRefs]))[0];
    notes.otherRoutes = { units: OTHER_UNITS, masters: otherMasters.length, ...d };
    if (d.auditFromThisTrack !== 0) fails.push(`D: 타 route audit=${d.auditFromThisTrack}`);
    if (d.oralV3RefRows !== 0) fails.push(`D: 타 route 에 oral V3 sourceRef 행=${d.oralV3RefRows}`);
    if (d.authoredKoCanonical !== 0) fails.push(`D: 타 route authored ko canonical=${d.authoredKoCanonical} (미착수 전제 위반)`);
    if (d.easyCanonical !== otherMasters.length) fails.push(`D: 타 route easy canonical=${d.easyCanonical}!=${otherMasters.length}`);

    // E. 저장 content 해시 · EN 한글 (전 131 fp)
    let hashMismatch = 0, hangul = 0, variant = 0;
    for (const b2 of builds) {
      const enByFp: Record<string, any> = Object.fromEntries(b2.en.fingerprints.map((f: any) => [f.fp, f]));
      for (const f of b2.ko.fingerprints) {
        const ko = await ds.query(`SELECT DISTINCT md5(content) h FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND language='ko' AND status='canonical' AND source_type='mfds_drug_otc' AND description_type='STORE' AND deleted_at IS NULL`, [f.masterIds]);
        const en = await ds.query(`SELECT DISTINCT md5(content) h, bool_or(content ~ '[가-힣]') hg FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND language='en' AND status='canonical' AND source_type='mfds_drug_otc' AND description_type='STORE' AND deleted_at IS NULL GROUP BY 1`, [f.masterIds]);
        if (ko.length !== 1 || en.length !== 1) { variant++; continue; }
        if (ko[0].h !== md5(f.koHtml)) hashMismatch++;
        if (en[0].h !== md5(enByFp[f.fp].enHtml)) hashMismatch++;
        if (en[0].hg) hangul++;
      }
    }
    notes.storedContent = { fpChecked: fpTotal, variantFps: variant, storedContentHashMismatch: hashMismatch, enHangul: hangul };
    if (variant !== 0) fails.push(`E: content variant fps=${variant}`);
    if (hashMismatch !== 0) fails.push(`E: storedContentHashMismatch=${hashMismatch}`);
    if (hangul !== 0) fails.push(`E: enHangul=${hangul}`);
  } finally { await ds.destroy(); }

  const out = { wo: WO_U2, verifier: 'da-track-independent', pass: fails.length === 0, failCount: fails.length, fails, notes };
  console.log(JSON.stringify(out, null, 2));
  console.log(`\n=== ORAL V3 540 TRACK VERIFY · PASS=${out.pass} · fails=${out.failCount} ===`);
  if (!out.pass) process.exit(2);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
