/**
 * WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT2-OPHTHALMIC-FINAL-PRODUCTION-V1 — 점안 Unit 2 독립검증 (에이전트 가)
 *
 * 생산 실행기(`otc-unproduced-nonoral-unit2-ophthalmic-production.ga.ts`)와 **분리된 경로**로,
 * 실행기의 내부 상태를 일절 재사용하지 않고 승인 SSOT + DB 만 보고 사후 상태를 재계산한다.
 * READ-ONLY · DB write 0.
 *
 * 검증 항목
 *   targetMasters · koAuthoredCanonical · enCanonical · easyDeprecated · easyStillCanonical
 *   auditKo · needsReviewLeft · canonicalDup · sourceRefLeak · enHangul · holdWritten
 *   nonoralUnit1Intact (443) · oralUnitsIntact (3,699)
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-unproduced-nonoral-unit2-ophthalmic-verify.ga.ts
 *   ../../node_modules/.bin/tsx ... --stage=baseline     # apply 이전 기준선 기록
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fpToUuidV2 } from './otc-v2-store-leaflet-runner.shared.js';

const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');

const WO = 'WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT2-OPHTHALMIC-FINAL-PRODUCTION-V1';
const READINESS_WO = 'WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT2-OPHTHALMIC-FINAL-READINESS-V1';
const AUTHORED_SOURCE = 'mfds_drug_otc';
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const SSOT = path.join(DATA_DIR, 'otc-unproduced-nonoral-unit2-ophthalmic-approved-ssot-v1.json');
const PROPOSAL = path.join(DATA_DIR, 'otc-unproduced-nonoral-approval-proposal-v1.json');
const SSOT_NONORAL_U1 = path.join(DATA_DIR, 'otc-unproduced-nonoral-unit1-approved-ssot-v1.json');
const SSOT_ORAL_U1 = path.join(DATA_DIR, 'otc-unproduced-oral-unit1-approved-ssot-v1.json');
const SSOT_ORAL_U2 = path.join(DATA_DIR, 'otc-unproduced-oral-unit2-approved-ssot-v1.json');

const EXPECT = {
  targetMasters: 159, koAuthoredCanonical: 159, enCanonical: 159, easyDeprecated: 159,
  easyStillCanonical: 0, auditKo: 159, needsReviewLeft: 0, canonicalDup: 0, sourceRefLeak: 0,
  enHangul: 0, holdWritten: 0, nonoralUnit1Intact: 443, oralUnitsIntact: 3699,
  enUsageMatched: 159, enRowsFound: 159,
};

const masterIdsOf = (p: string): string[] => {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const fromGroups: string[] = (j.groups || []).flatMap((g: any) => g.masterIds || []);
  const fromMasters: string[] = (j.masters || []).map((m: any) => m.masterId).filter(Boolean);
  return [...new Set([...fromGroups, ...fromMasters])].sort();
};

async function main(): Promise<void> {
  const stage = arg('stage') || 'post';
  const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
  const proposal = JSON.parse(fs.readFileSync(PROPOSAL, 'utf8'));
  const targets = masterIdsOf(SSOT);
  const refs = (ssot.groups as any[]).map((g) => fpToUuidV2(g.fp)).sort();
  const holdMasters = [...new Set((proposal.holds as any[]).map((h) => h.masterId).filter(Boolean))].sort();
  const u1NonOral = masterIdsOf(SSOT_NONORAL_U1);
  const oralAll = [...new Set([...masterIdsOf(SSOT_ORAL_U1), ...masterIdsOf(SSOT_ORAL_U2)])].sort();

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 },
  });
  await ds.initialize();

  let actual: Record<string, number>;
  try {
    const r = retRows<Record<string, string>>(await ds.query(`
      SELECT
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
          AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::text "koAuthoredCanonical",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
          AND language='en' AND status='canonical' AND deleted_at IS NULL)::text "enCanonical",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
          AND status='deprecated' AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::text "easyDeprecated",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
          AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::text "easyStillCanonical",
        (SELECT count(*) FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND language='ko'
          AND description_type='STORE' AND metadata->>'unit'='nonoral-unit-2-ophthalmic' AND metadata->>'wo'=ANY($6))::text "auditKo",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
          AND status='needs_review' AND deleted_at IS NULL)::text "needsReviewLeft",
        (SELECT count(*) FROM (SELECT master_id, COALESCE(language,'ko') l FROM shared_product_descriptions
          WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
          GROUP BY 1,2 HAVING count(*)>1) d)::text "canonicalDup",
        (SELECT count(*) FROM shared_product_descriptions WHERE source_ref_id=ANY($3::uuid[]) AND deleted_at IS NULL
          AND NOT (master_id=ANY($1::uuid[])))::text "sourceRefLeak",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
          AND language='en' AND status='canonical' AND deleted_at IS NULL AND content ~ '[가-힣]')::text "enHangul",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($4::uuid[]) AND description_type='STORE'
          AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::text "holdWritten",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($5::uuid[]) AND description_type='STORE'
          AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::text "nonoralUnit1Intact",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($7::uuid[]) AND description_type='STORE'
          AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::text "oralUnitsIntact"
      `, [targets, AUTHORED_SOURCE, refs, holdMasters, u1NonOral, [WO, READINESS_WO], oralAll]));
    actual = Object.fromEntries(Object.entries(r[0]).map(([k, v]) => [k, +v]));
    // LIVE EN canonical 본문 대조 — 저작 EN 용법 문장(방울 수·횟수·간격·기간 포함)이 실제 행에 그대로 있는지.
    // 실행기 내부 상태를 쓰지 않고 EN JSON 과 DB 본문만 본다.
    const enCfg = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-unit2-oph-en-config-ga-all.json'), 'utf8'));
    const usageByRef = new Map<string, string>(enCfg.groups.map((e: any) => [fpToUuidV2(e.fp), e.usage]));
    const enRows = retRows<{ ref: string; content: string }>(await ds.query(
      `SELECT source_ref_id::text ref, content FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en'
         AND status='canonical' AND deleted_at IS NULL`, [targets]));
    actual.enUsageMatched = enRows.filter((r) => {
      const want = usageByRef.get(r.ref);
      return !!want && r.content.includes(want);
    }).length;
    actual.enRowsFound = enRows.length;
  } finally {
    await ds.destroy();
  }
  actual.targetMasters = targets.length;

  // audit 은 KO apply 단계의 readiness WO 태그로도 남을 수 있어 두 WO 태그를 함께 본다.
  const out: any = {
    wo: WO, agent: 'ga', unitId: 'nonoral-unit-2-ophthalmic', stage, readOnly: true, dbWrite: 0,
    inputs: {
      ssot: path.basename(SSOT), ssotMd5: md5(fs.readFileSync(SSOT, 'utf8')),
      enConfig: 'otc-unit2-oph-en-config-ga-all.json',
      enMd5: md5(fs.readFileSync(path.join(DATA_DIR, 'otc-unit2-oph-en-config-ga-all.json'), 'utf8')),
      readinessWo: READINESS_WO,
    },
    expected: EXPECT, actual,
    checks: Object.fromEntries(Object.keys(EXPECT).map((k) => [k, actual[k] === (EXPECT as any)[k]])),
  };
  out.allPass = Object.values(out.checks).every(Boolean);

  const outPath = path.join(DATA_DIR, `otc-unproduced-nonoral-unit2-ophthalmic-verify.ga.${stage}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n', 'utf8');

  console.log(`OPH-U2 INDEPENDENT VERIFY (${stage}) — ${out.allPass ? 'ALL PASS' : '*** FAIL ***'}`);
  for (const k of Object.keys(EXPECT)) {
    console.log(`  ${out.checks[k] ? 'PASS' : '*** FAIL ***'}  ${k}: ${actual[k]} (기대 ${(EXPECT as any)[k]})`);
  }
  console.log(`  → ${outPath}`);
  if (!out.allPass && stage !== 'baseline') process.exitCode = 1;
}

if (process.argv[1] && /otc-unproduced-nonoral-unit2-ophthalmic-verify\.ga\./.test(process.argv[1])) {
  void main();
}
