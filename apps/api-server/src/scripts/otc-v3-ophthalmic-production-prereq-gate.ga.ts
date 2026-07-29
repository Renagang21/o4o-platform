/**
 * WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1
 * ophthalmic-unit-1 LIVE 생산 **선행 게이트** (read-only · write 0)
 *
 * 실행: npx tsx src/scripts/otc-v3-ophthalmic-production-prereq-gate.ga.ts
 *
 * 게이트 (모두 통과해야 LIVE apply 진입):
 *   P1 oral route COMPLETE(540 master · KO/EN canonical 540 · easy deprecated 540 · easy 잔존 0)
 *   P2 topical-unit-1 GREEN(327 master · 동일 축)
 *   P3 ophthalmic readiness 산출물 digest 불변(dry-run manifest MD5)
 *   P4 타 세션 LIVE write 0 (ophthalmic 대상 V3 authored/audit 0)
 *   P5 기존 authored KO/EN canonical 0
 *   P6 easy KO canonical 253
 *   P7 V3 sourceRef LIVE 충돌 0
 *   P8 canonicalDup 0
 *   P9 oromucosal-unit-1 14 master write 0 (easy canonical 14 유지)
 *   P10 승인 SSOT = APPROVED_FOR_PRODUCTION · unit ledger 총계 불변(214fp/1134master)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { connect, DATA_DIR } from './otc-easy-drug-ready-ophthalmic-253-v3-contract.ga.js';

const AUTHORED_V3 = 'mfds_drug_otc';
const EASY = 'mfds_easy_drug';
const PRODUCTION_WO = 'WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1';
const DRYRUN_MANIFEST_MD5 = '4ded10109bc96bb6ff57097f5131c7fc';

type Unit = { unit: string; route: string; fpCount: number; masterCount: number; masterIds: string[]; sourceRefs: string[] };
const ledger = JSON.parse(fs.readFileSync(
  path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json'), 'utf8')) as
  { totals: { fp: number; masters: number; units: number }; units: Unit[] };
const byUnit = (u: string) => ledger.units.find((x) => x.unit === u)!;
const md5File = (p: string) => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');

/** route 축 상태 — authored KO/EN canonical · easy deprecated · easy 잔존 · 본 WO audit. */
async function routeState(db: { query: (t: string, p?: unknown[]) => Promise<any[]> }, ids: string[]) {
  const r = (await db.query(`
    SELECT
      (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
         WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE'
           AND COALESCE(s.language,'ko')='ko' AND s.source_type=$2 AND s.deleted_at IS NULL))::int ko_authored,
      (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
         WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE'
           AND s.language='en' AND s.source_type=$2 AND s.deleted_at IS NULL))::int en_authored,
      (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
         WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type=$3
           AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL))::int easy_deprecated,
      (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
         WHERE s.master_id=mid AND s.status='canonical' AND s.source_type=$3
           AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL))::int easy_canonical,
      (SELECT count(*) FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[])
         AND metadata->>'productionWo'=$4)::int this_wo_audit,
      (SELECT count(*) FROM (SELECT master_id, COALESCE(language,'ko') lang FROM shared_product_descriptions
         WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
         GROUP BY 1,2 HAVING count(*)>1) d)::int canonical_dup
  `, [ids, AUTHORED_V3, EASY, PRODUCTION_WO]))[0];
  return r as Record<string, number>;
}

(async () => {
  const oph = byUnit('ophthalmic-unit-1');
  const oral = [...byUnit('oral-unit-1').masterIds, ...byUnit('oral-unit-2').masterIds];
  const topical = byUnit('topical-unit-1').masterIds;
  const oromucosal = byUnit('oromucosal-unit-1');

  const db = await connect();
  const fails: string[] = [];
  const detail: Record<string, unknown> = {};
  try {
    // P1 oral COMPLETE
    const s1 = await routeState(db, oral);
    detail.P1_oral = s1;
    if (s1.ko_authored !== 540 || s1.en_authored !== 540 || s1.easy_deprecated !== 540 || s1.easy_canonical !== 0)
      fails.push(`P1 oral route COMPLETE 아님 → ${JSON.stringify(s1)}`);

    // P2 topical GREEN
    const s2 = await routeState(db, topical);
    detail.P2_topical = s2;
    if (s2.ko_authored !== 327 || s2.en_authored !== 327 || s2.easy_deprecated !== 327 || s2.easy_canonical !== 0)
      fails.push(`P2 topical-unit-1 GREEN 아님 → ${JSON.stringify(s2)}`);

    // P3 readiness digest 불변
    const manifestMd5 = md5File(path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-dryrun-manifest.ga.json'));
    const preApply = JSON.parse(fs.readFileSync(
      path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-pre-apply-ready-ledger.ga.json'), 'utf8'));
    detail.P3_readiness = { manifestMd5, expected: DRYRUN_MANIFEST_MD5, preApplyStatus: preApply.status, writePlan: preApply.writePlan };
    if (manifestMd5 !== DRYRUN_MANIFEST_MD5) fails.push(`P3 dry-run manifest digest 변경 ${manifestMd5}`);
    if (preApply.status !== 'PRE_APPLY_READY') fails.push(`P3 pre-apply 원장 status=${preApply.status}`);
    if (preApply.writePlan?.total !== 1518) fails.push(`P3 writePlan.total=${preApply.writePlan?.total}!=1518`);

    // P4~P8 ophthalmic 대상 상태
    const s3 = await routeState(db, oph.masterIds);
    detail.P4_P8_ophthalmic = s3;
    if (s3.this_wo_audit !== 0) fails.push(`P4 타 세션/선행 LIVE write 감지 — 본 WO audit=${s3.this_wo_audit}`);
    if (s3.ko_authored !== 0 || s3.en_authored !== 0) fails.push(`P5 기존 authored canonical ko=${s3.ko_authored} en=${s3.en_authored}`);
    if (s3.easy_canonical !== 253) fails.push(`P6 easy KO canonical=${s3.easy_canonical}!=253`);
    if (s3.easy_deprecated !== 0) fails.push(`P6 easy deprecated=${s3.easy_deprecated}!=0 (미착수 아님)`);
    if (s3.canonical_dup !== 0) fails.push(`P8 canonicalDup=${s3.canonical_dup}`);

    const refConflict = ((await db.query(
      `SELECT count(*)::int n FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL`,
      [oph.sourceRefs]))[0] as { n: number }).n;
    detail.P7_v3SourceRefConflict = refConflict;
    if (refConflict !== 0) fails.push(`P7 V3 sourceRef LIVE 충돌=${refConflict}`);

    // P9 oromucosal 미접촉
    const s4 = await routeState(db, oromucosal.masterIds);
    detail.P9_oromucosal = s4;
    if (s4.ko_authored !== 0 || s4.en_authored !== 0 || s4.easy_canonical !== 14 || s4.this_wo_audit !== 0)
      fails.push(`P9 oromucosal-unit-1 write 감지 → ${JSON.stringify(s4)}`);

    // P10 승인 SSOT · ledger 총계
    const ssot = JSON.parse(fs.readFileSync(
      path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-reapproval-ssot-v1.json'), 'utf8'));
    const status = ssot.status || ssot.approvalStatus || ssot.decision;
    detail.P10_approval = { status, totals: ledger.totals, ophFp: oph.fpCount, ophMasters: oph.masterCount };
    if (String(status).toUpperCase().indexOf('APPROVED') < 0) fails.push(`P10 승인 SSOT status=${status}`);
    if (ledger.totals.fp !== 214 || ledger.totals.masters !== 1134) fails.push(`P10 ledger 총계 변경 ${JSON.stringify(ledger.totals)}`);
    if (oph.fpCount !== 26 || oph.masterCount !== 253) fails.push(`P10 ophthalmic 타깃 변경 ${oph.fpCount}/${oph.masterCount}`);
  } finally {
    await db.destroy();
  }

  const report = { wo: PRODUCTION_WO, agent: 'ga', mode: 'production-prereq-gate', liveDbWrite: false,
    pass: fails.length === 0, failCount: fails.length, fails, detail };
  fs.writeFileSync(path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-production-prereq-gate.ga.json'),
    JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (fails.length) { console.error(`\n=== PREREQ GATE FAIL (${fails.length}) — LIVE apply 금지 ===`); process.exit(2); }
  console.log('\n=== PREREQ GATE PASS — ophthalmic-unit-1 LIVE apply 진입 가능 ===');
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
