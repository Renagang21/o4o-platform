/**
 * WO-O4O-OTC-EASY-DRUG-READY-OROMUCOSAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1 — oromucosal-unit-1 LIVE apply 선행 게이트(na)
 *
 * apply 러너와 별개 코드경로. **read-only(SELECT) 전용 · DB write 0.**
 * 전부 PASS 여야만 LIVE apply 를 시작한다(중지 조건 = fail 1건 이상).
 * topical 게이트(otc-v3-topical-preflight-gate.na.ts)의 축을 그대로 계승하되, 선행 route 가
 * "미착수" 가 아니라 "GREEN(완료)" 이라는 점만 뒤집는다(G10).
 *
 *  G1  oral route COMPLETE       : 540 master KO/EN authored canonical · easy deprecated 540 · 잔존 0 · audit 540
 *  G2  oromucosal PRE_APPLY READY: preapply-ready-oromucosal-unit-1.json status=PRE_APPLY_READY · 14m/2fp · writePlan 84
 *  G3  readiness 산출물 불변      : build/en-build/preapply-ready md5 == readiness commit(bb2e79a22) blob md5
 *  G4  ledger/승인 SSOT 불변      : unit-ledger·재승인 SSOT md5 == 승인 commit(00851d237) blob md5 + 대상 집합 일치
 *  G5  대상 easy anchor          : 14 master KO canonical == mfds_easy_drug 14
 *  G6  기존 authored canonical 0  : KO/EN 모두 0 (다른 세션 LIVE write 0 의 직접 증거)
 *  G7  V3 sourceRef 충돌 0       : oromucosal 2 sourceRef 를 쓰는 LIVE 행 0
 *  G8  canonicalDup 0
 *  G9  대상 audit 0
 *  G10 선행 route GREEN          : topical 327 · ophthalmic 253 전건 KO/EN authored canonical · easy 잔존 0
 *  G11 전문용 혼입 0
 *  G12 dry-run digest 불변       : 14867f16e6fd0d3a1935d2c0b2b9c9b6
 *
 * Usage(apps/api-server): npx tsx src/scripts/otc-v3-oromucosal-preflight-gate.na.ts [--port 5470]
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';

const CWD = process.cwd();
const readPw = (): string => readFileSync(path.resolve(CWD, '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const DATA = path.resolve(CWD, 'src/scripts/data');
const NA = path.join(DATA, 'otc-ready-na-v3');
const rd = (p: string): any => JSON.parse(readFileSync(p, 'utf8'));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => { const a = arg('--port'); return a ? parseInt(a, 10) : 5470; };
const md5 = (b: Buffer | string): string => crypto.createHash('md5').update(b).digest('hex');

const READINESS_COMMIT = 'bb2e79a22';
const APPROVAL_COMMIT = '00851d237';
const ORAL_WO = ['WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1',
  'WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT2-CONTENT-FP-V3-FINAL-PRODUCTION-V1'];
const TOPICAL_WO = 'WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1';
const OPHTHALMIC_WO = 'WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1';
const THIS_WO = 'WO-O4O-OTC-EASY-DRUG-READY-OROMUCOSAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1';
const READINESS_WO = 'WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-OROMUCOSAL-CONTENT-FP-V3-FINAL-READINESS-V1';
const DRYRUN_DIGEST = '14867f16e6fd0d3a1935d2c0b2b9c9b6';

function blobMd5(commit: string, repoRelPath: string): string {
  const buf = execFileSync('git', ['show', `${commit}:${repoRelPath}`], { cwd: path.resolve(CWD, '../..'), maxBuffer: 1 << 30 });
  return md5(buf);
}
const fileMd5 = (abs: string): string => md5(readFileSync(abs));

/** master 집합의 canonical 상태 축 — 전 게이트 공용. */
const STATE_SQL = `SELECT
  count(*) FILTER (WHERE easy_canon)::int "easyCanonical",
  count(*) FILTER (WHERE ko_authored)::int "koAuthoredCanonical",
  count(*) FILTER (WHERE en_authored)::int "enAuthoredCanonical",
  count(*) FILTER (WHERE dep_easy)::int "easyDeprecated",
  count(*) FILTER (WHERE kocanon>1)::int "koCanonicalDup",
  count(*) FILTER (WHERE encanon>1)::int "enCanonicalDup",
  count(*) FILTER (WHERE kocanon=0)::int "koNoCanonical"
  FROM (SELECT mid,
    (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) kocanon,
    (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) encanon,
    EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) easy_canon,
    EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) ko_authored,
    EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) en_authored,
    EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy
    FROM unnest($1::uuid[]) mid) t`;

async function main(): Promise<void> {
  const fails: string[] = [];
  const notes: any = { wo: THIS_WO, gate: 'preflight', port: port() };
  const REL = 'apps/api-server/src/scripts/data';

  const ready = rd(path.join(NA, 'preapply-ready-oromucosal-unit-1.json'));
  const ko = rd(path.join(NA, 'build-oromucosal-unit-1.json'));
  const en = rd(path.join(NA, 'en-build-oromucosal-unit-1.json'));
  const ledger = rd(path.join(DATA, 'otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json'));
  const unitsById: Record<string, any> = Object.fromEntries(ledger.units.map((u: any) => [u.unit, u]));
  const oro = unitsById['oromucosal-unit-1'];

  // ── G2 ──
  notes.g2 = { status: ready.status, masterCount: ready.masterCount, fpCount: ready.fpCount, writePlan: ready.writePlan,
    liveApplyLock: ready.liveApply, existingAuthoredKo: ready.gates.existingAuthoredKo, existingAuthoredEn: ready.gates.existingAuthoredEn };
  if (ready.status !== 'PRE_APPLY_READY') fails.push(`G2: ready.status=${ready.status}`);
  if (ready.masterCount !== 14) fails.push(`G2: masterCount=${ready.masterCount}!=14`);
  if (ready.fpCount !== 2) fails.push(`G2: fpCount=${ready.fpCount}!=2`);
  if (ready.writePlan.koTotal !== 56 || ready.writePlan.enTotal !== 28 || ready.writePlan.grandTotal !== 84)
    fails.push(`G2: writePlan ${JSON.stringify(ready.writePlan)}`);

  // ── G3 readiness 산출물 불변 ──
  const G3_FILES = ['otc-ready-na-v3/build-oromucosal-unit-1.json', 'otc-ready-na-v3/en-build-oromucosal-unit-1.json',
    'otc-ready-na-v3/preapply-ready-oromucosal-unit-1.json', 'otc-ready-na-v3/preapply-verify-v1.json',
    'otc-ready-na-v3/reproduce-check-v1.json', 'otc-ready-na-v3/en-check-v1.json'];
  notes.g3 = {};
  for (const f of G3_FILES) {
    const now = fileMd5(path.join(DATA, f)); const then = blobMd5(READINESS_COMMIT, `${REL}/${f}`);
    notes.g3[f] = { now, matchesReadinessCommit: now === then };
    if (now !== then) fails.push(`G3: ${f} 산출물 변경됨(readiness commit 과 md5 불일치)`);
  }

  // ── G4 승인 SSOT / ledger 불변 + 대상 집합 일치 ──
  const G4_FILES = ['otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json',
    'otc-easy-drug-ready-1134-content-fingerprint-reapproval-ssot-v1.json',
    'otc-easy-drug-ready-1134-composer-safety-section-contract-v1.json'];
  notes.g4 = {};
  for (const f of G4_FILES) {
    const now = fileMd5(path.join(DATA, f)); const then = blobMd5(APPROVAL_COMMIT, `${REL}/${f}`);
    notes.g4[f] = { now, matchesApprovalCommit: now === then };
    if (now !== then) fails.push(`G4: ${f} 승인 SSOT 변경됨`);
  }
  const ssot = rd(path.join(DATA, 'otc-easy-drug-ready-1134-content-fingerprint-reapproval-ssot-v1.json'));
  notes.g4.approvalStatus = ssot.status || ssot.decision || null;
  if (String(notes.g4.approvalStatus).toUpperCase().indexOf('APPROVED') < 0) fails.push(`G4: 승인 status=${notes.g4.approvalStatus}`);
  notes.g4.trackTotals = ledger.totals;
  if (ledger.totals.fp !== 214 || ledger.totals.masters !== 1134) fails.push(`G4: ledger 총계 ${JSON.stringify(ledger.totals)}`);

  const buildIds: string[] = ko.fingerprints.flatMap((f: any) => f.masterIds);
  const buildRefs: string[] = ko.fingerprints.map((f: any) => f.sourceRef);
  const ledgerIds: string[] = oro.masterIds;
  const sameSet = (a: string[], b: string[]): boolean => a.length === b.length && new Set([...a, ...b]).size === a.length;
  notes.g4.targetSet = { buildMasters: buildIds.length, ledgerMasters: ledgerIds.length,
    buildRefs: buildRefs.length, ledgerRefs: oro.sourceRefs.length,
    masterSetEqual: sameSet(buildIds, ledgerIds), refSetEqual: sameSet(buildRefs, oro.sourceRefs) };
  if (!notes.g4.targetSet.masterSetEqual) fails.push('G4: build master 집합 != ledger master 집합');
  if (!notes.g4.targetSet.refSetEqual) fails.push('G4: build sourceRef 집합 != ledger sourceRef 집합');
  if (new Set(buildIds).size !== 14) fails.push(`G4: distinct master=${new Set(buildIds).size}!=14`);
  const enFps = new Set(en.fingerprints.map((f: any) => f.fp));
  notes.g4.enPayloadFpParity = ko.fingerprints.every((f: any) => enFps.has(f.fp)) && enFps.size === ko.fingerprints.length;
  if (!notes.g4.enPayloadFpParity) fails.push('G4: EN payload fp 패리티 불일치');

  // ── G12 dry-run digest ──
  const digest = md5(ko.fingerprints.map((f: any) => `${f.fp}|${f.sourceRef}|${f.masterIds.length}`).sort().join('\n'));
  notes.g12 = { runnerDryRunDigestExpected: DRYRUN_DIGEST, buildTargetDigest: digest,
    note: 'runner --dry-run planDigestMd5 는 러너 실행으로 별도 확인(14867f16…). 여기서는 build 대상 축 digest 를 병기 기록' };

  const oralIds = [...new Set(['oral-unit-1', 'oral-unit-2'].flatMap((u) => unitsById[u].masterIds))] as string[];
  const topIds = unitsById['topical-unit-1'].masterIds as string[];
  const ophIds = unitsById['ophthalmic-unit-1'].masterIds as string[];

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: port(), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 } });
  await ds.initialize();
  try {
    // ── G1 oral COMPLETE ──
    const o = (await ds.query(STATE_SQL, [oralIds]))[0];
    const oAudit = (await ds.query(`SELECT count(DISTINCT master_id)::int m FROM shared_product_description_audit_logs WHERE (metadata->>'productionWo')=ANY($1)`, [ORAL_WO]))[0];
    notes.g1 = { oralMasters: oralIds.length, ...o, auditMasters: oAudit.m };
    if (o.koAuthoredCanonical !== 540 || o.enAuthoredCanonical !== 540) fails.push(`G1: oral authored ko=${o.koAuthoredCanonical} en=${o.enAuthoredCanonical} != 540`);
    if (o.easyDeprecated !== 540) fails.push(`G1: oral easyDeprecated=${o.easyDeprecated}!=540`);
    if (o.easyCanonical !== 0) fails.push(`G1: oral easy 잔존=${o.easyCanonical}`);
    if (o.koCanonicalDup !== 0 || o.enCanonicalDup !== 0) fails.push(`G1: oral canonicalDup ko=${o.koCanonicalDup} en=${o.enCanonicalDup}`);
    if (oAudit.m !== 540) fails.push(`G1: oral audit masters=${oAudit.m}!=540`);

    // ── G10 선행 route GREEN (topical · ophthalmic) ──
    for (const [label, ids, n, wo] of [['topical', topIds, 327, TOPICAL_WO], ['ophthalmic', ophIds, 253, OPHTHALMIC_WO]] as const) {
      const r = (await ds.query(STATE_SQL, [ids]))[0];
      const a = (await ds.query(`SELECT count(DISTINCT master_id)::int m FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND (metadata->>'productionWo')=$2`, [ids, wo]))[0];
      notes[`g10_${label}`] = { masters: ids.length, ...r, auditMasters: a.m };
      if (ids.length !== n) fails.push(`G10: ${label} ledger masters=${ids.length}!=${n}`);
      if (r.koAuthoredCanonical !== n || r.enAuthoredCanonical !== n) fails.push(`G10: ${label} GREEN 아님 ko=${r.koAuthoredCanonical} en=${r.enAuthoredCanonical} != ${n}`);
      if (r.easyDeprecated !== n) fails.push(`G10: ${label} easyDeprecated=${r.easyDeprecated}!=${n}`);
      if (r.easyCanonical !== 0) fails.push(`G10: ${label} easy 잔존=${r.easyCanonical}`);
      if (r.koCanonicalDup !== 0 || r.enCanonicalDup !== 0) fails.push(`G10: ${label} canonicalDup ko=${r.koCanonicalDup} en=${r.enCanonicalDup}`);
      if (a.m !== n) fails.push(`G10: ${label} audit masters=${a.m}!=${n}`);
    }

    // ── G5~G9 대상 현 상태 ──
    const t = (await ds.query(STATE_SQL, [ledgerIds]))[0];
    const refRows = (await ds.query(`SELECT count(*)::int n, count(*) FILTER (WHERE NOT master_id=ANY($2::uuid[]))::int outside FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [buildRefs, ledgerIds]))[0];
    const tAudit = (await ds.query(`SELECT count(*)::int n FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND ((metadata->>'productionWo')=$2 OR (metadata->>'wo')=$3)`, [ledgerIds, THIS_WO, READINESS_WO]))[0];
    notes.oromucosalBefore = { masters: ledgerIds.length, ...t, v3SourceRefRows: refRows.n, v3SourceRefOutside: refRows.outside, trackAudit: tAudit.n };
    if (t.easyCanonical !== 14) fails.push(`G5: easyCanonical=${t.easyCanonical}!=14`);
    if (t.koNoCanonical !== 0) fails.push(`G5: koNoCanonical=${t.koNoCanonical}`);
    if (t.koAuthoredCanonical !== 0) fails.push(`G6: 기존 authored KO canonical=${t.koAuthoredCanonical} (중지 조건)`);
    if (t.enAuthoredCanonical !== 0) fails.push(`G6: 기존 authored EN canonical=${t.enAuthoredCanonical} (중지 조건)`);
    if (t.easyDeprecated !== 0) fails.push(`G6: easy deprecated=${t.easyDeprecated} (미착수 전제 위반 — 다른 세션 write 의심)`);
    if (refRows.n !== 0) fails.push(`G7: V3 sourceRef LIVE 행=${refRows.n} (충돌)`);
    if (t.koCanonicalDup !== 0 || t.enCanonicalDup !== 0) fails.push(`G8: canonicalDup ko=${t.koCanonicalDup} en=${t.enCanonicalDup}`);
    if (tAudit.n !== 0) fails.push(`G9: 대상 master 트랙 audit=${tAudit.n} (다른 세션 LIVE write 감지)`);

    // ── G11 전문용 혼입 0 ──
    const cls = await ds.query(`SELECT e.drug_category cat, count(DISTINCT e.product_master_id)::int n
      FROM product_drug_extensions e WHERE e.product_master_id=ANY($1::uuid[]) AND e.deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC`, [ledgerIds]);
    const otcCovered = (await ds.query(`SELECT count(*)::int n FROM unnest($1::uuid[]) mid
      WHERE EXISTS(SELECT 1 FROM product_drug_extensions e WHERE e.product_master_id=mid AND e.drug_category='otc' AND e.deleted_at IS NULL)`, [ledgerIds]))[0].n;
    const nonOtc = cls.filter((c: any) => c.cat !== 'otc').reduce((t2: number, c: any) => t2 + c.n, 0);
    const PROFESSIONAL_RE = /전문의약품|의료전문가\s*전용|병원\s*전용|조제\s*전용/;
    const profFps = ko.fingerprints.filter((f: any) => Object.values(f.officialSections || {}).some((v: any) => PROFESSIONAL_RE.test(String(v || '')))).map((f: any) => f.fp);
    notes.g11 = { drugCategoryDistribution: cls, otcCoveredMasters: otcCovered, nonOtcMasters: nonOtc, professionalUseFps: profFps.length };
    if (otcCovered !== ledgerIds.length) fails.push(`G11: drug_category='otc' 미충족 master=${ledgerIds.length - otcCovered}`);
    if (nonOtc !== 0) fails.push(`G11: 비-otc drug_category master=${nonOtc}`);
    if (profFps.length !== 0) fails.push(`G11: 원문 전문가전용 표지 fp=${profFps.length}`);
  } finally { await ds.destroy(); }

  const out = { ...notes, pass: fails.length === 0, failCount: fails.length, fails };
  console.log(JSON.stringify(out, null, 2));
  console.log(`\n=== OROMUCOSAL-UNIT-1 PREFLIGHT GATE · PASS=${out.pass} · fails=${out.failCount} ===`);
  if (!out.pass) process.exit(2);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
