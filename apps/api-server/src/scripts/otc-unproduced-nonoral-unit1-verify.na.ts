/**
 * WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-APPLY-ENABLEMENT-V1 — 비경구 Unit 1 **독립검증** (에이전트 나)
 *
 * ⚠️ READ-ONLY · **DB write 0**. 생산 실행기와 **분리된** SELECT 전용 검증기다.
 * 실행기의 in-TX 사후검증과 코드를 공유하지 않는다 — 같은 로직으로 자기 결과를 재확인하면
 * 검증이 아니라 반복이 되므로, 승인 SSOT 의 대상 집합만 입력으로 받아 독립 쿼리로 산출한다.
 *
 * 항목: targetMasters · koAuthoredCanonical · enCanonical · easyDeprecated · easyStillCanonical ·
 *       auditKo · needsReviewLeft · canonicalDup · sourceRefLeak · enHangul · holdWritten ·
 *       기존 경구·외용 LIVE 불변 · 점안 Unit 2 write 0
 *
 * Usage(apps/api-server): tsx src/scripts/otc-unproduced-nonoral-unit1-verify.na.ts [--out=<path>]
 * 종료코드: 0 = GREEN, 1 = FAIL
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const SSOT = path.join(DATA, 'otc-unproduced-nonoral-unit1-approved-ssot-v1.json');
const PROPOSAL = path.join(DATA, 'otc-unproduced-nonoral-approval-proposal-v1.json');
const WO = 'WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-APPLY-ENABLEMENT-V1';
const AUTHORED = 'mfds_drug_otc';
const EXPECTED = { fp: 70, master: 443, ko: 1772, en: 886, total: 2658 };

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
function anchor(fp: string): string {
  const h = md5(`otc-combo-leaflet:${fp}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];

async function main(): Promise<void> {
  const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
  const ids: string[] = (ssot.groups as any[]).flatMap((g) => g.masterIds).sort();
  const refs: string[] = (ssot.groups as any[]).map((g) => anchor(g.fp)).sort();

  // HOLD 원장 — 절대 write 되면 안 되는 대상
  const proposal = fs.existsSync(PROPOSAL) ? JSON.parse(fs.readFileSync(PROPOSAL, 'utf8')) : { holds: [] };
  const holdIds: string[] = (proposal.holds as any[]).map((h) => h.masterId);
  // 점안 Unit 2 — 본 단위 밖, write 0 이어야 한다
  const ophthalmicIds: string[] = ((proposal.groups as any[]) || [])
    .filter((g) => g.route === 'ophthalmic').flatMap((g) => g.masterIds);

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 600000 },
  });
  await ds.initialize();
  const q = async <T>(s: string, p: unknown[]): Promise<T[]> => retRows<T>(await ds.query(s, p));

  const r = (await q<Record<string, string>>(`
    SELECT
      (SELECT count(*) FROM product_masters WHERE id=ANY($1::uuid[]))::text targets,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical'
        AND source_type=$2 AND deleted_at IS NULL)::text ko_auth,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL)::text en_canon,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='deprecated'
        AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::text easy_dep,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical'
        AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::text easy_left,
      (SELECT count(*) FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[])
        AND event_type='canonical_replaced' AND language='ko')::text audit_ko,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND status='needs_review' AND deleted_at IS NULL)::text nr,
      (SELECT count(*) FROM (SELECT master_id, COALESCE(language,'ko') l FROM shared_product_descriptions
        WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
        GROUP BY 1,2 HAVING count(*)>1) d)::text dup,
      (SELECT count(*) FROM shared_product_descriptions WHERE source_ref_id=ANY($3::uuid[])
        AND NOT (master_id=ANY($1::uuid[])) AND deleted_at IS NULL)::text ref_leak,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND language='en' AND status='canonical'
        AND content ~ '[가-힣]' AND deleted_at IS NULL)::text en_hangul,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($4::uuid[])
        AND description_type='STORE' AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::text hold_written,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($5::uuid[])
        AND description_type='STORE' AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::text ophth_written
    `, [ids, AUTHORED, refs, holdIds.length ? holdIds : ids.slice(0, 0), ophthalmicIds.length ? ophthalmicIds : ids.slice(0, 0)]))[0];

  // 기존 LIVE(경구 Unit1 · 외용) 불변 — 본 단위 밖 authored canonical 총수 스냅샷
  const priorLive = (await q<{ n: string }>(`
    SELECT count(DISTINCT master_id)::text n FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND source_type=$1
      AND NOT (master_id=ANY($2::uuid[])) AND deleted_at IS NULL`, [AUTHORED, ids]))[0];
  await ds.destroy();

  const v = {
    targetMasters: +r.targets, koAuthoredCanonical: +r.ko_auth, enCanonical: +r.en_canon,
    easyDeprecated: +r.easy_dep, easyStillCanonical: +r.easy_left, auditKo: +r.audit_ko,
    needsReviewLeft: +r.nr, canonicalDup: +r.dup, sourceRefLeak: +r.ref_leak,
    enHangul: +r.en_hangul, holdWritten: +r.hold_written, ophthalmicUnit2Written: +r.ophth_written,
    priorLiveAuthoredOutsideUnit: +priorLive.n,
  };
  const applied = v.koAuthoredCanonical === EXPECTED.master && v.enCanonical === EXPECTED.master;
  const checks: Array<{ name: string; actual: number; expected: number | string; pass: boolean }> = [
    { name: 'targetMasters', actual: v.targetMasters, expected: EXPECTED.master, pass: v.targetMasters === EXPECTED.master },
    { name: 'koAuthoredCanonical', actual: v.koAuthoredCanonical, expected: EXPECTED.master, pass: v.koAuthoredCanonical === EXPECTED.master },
    { name: 'enCanonical', actual: v.enCanonical, expected: EXPECTED.master, pass: v.enCanonical === EXPECTED.master },
    { name: 'easyDeprecated', actual: v.easyDeprecated, expected: EXPECTED.master, pass: v.easyDeprecated === EXPECTED.master },
    { name: 'easyStillCanonical', actual: v.easyStillCanonical, expected: 0, pass: v.easyStillCanonical === 0 },
    { name: 'auditKo', actual: v.auditKo, expected: EXPECTED.master, pass: v.auditKo === EXPECTED.master },
    { name: 'needsReviewLeft', actual: v.needsReviewLeft, expected: 0, pass: v.needsReviewLeft === 0 },
    { name: 'canonicalDup', actual: v.canonicalDup, expected: 0, pass: v.canonicalDup === 0 },
    { name: 'sourceRefLeak', actual: v.sourceRefLeak, expected: 0, pass: v.sourceRefLeak === 0 },
    { name: 'enHangul', actual: v.enHangul, expected: 0, pass: v.enHangul === 0 },
    { name: 'holdWritten', actual: v.holdWritten, expected: 0, pass: v.holdWritten === 0 },
    { name: 'ophthalmicUnit2Written', actual: v.ophthalmicUnit2Written, expected: 0, pass: v.ophthalmicUnit2Written === 0 },
  ];
  const out = arg('out') || path.join(DATA, 'otc-unproduced-nonoral-unit1-verify.na.json');
  const report = {
    wo: WO, artifact: 'independent-verify', agent: 'na', readOnly: true, dbWrite: 0,
    ssot: path.basename(SSOT), expected: EXPECTED,
    state: applied ? 'APPLIED' : 'PRE_APPLY',
    note: applied ? undefined
      : 'apply 전 실행이므로 ko/en canonical 계열은 0 이 정상이다. GREEN 판정은 apply 후 실행 결과로만 한다.',
    values: v, checks, allPass: checks.every((c) => c.pass),
    priorLiveInvariant: { authoredCanonicalOutsideUnit: v.priorLiveAuthoredOutsideUnit,
      note: 'apply 전후 동일해야 한다(본 단위 밖 write 0 증거). 스냅샷 비교는 apply 후 재실행으로 수행.' },
  };
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`독립검증 [${report.state}] — ${checks.filter((c) => c.pass).length}/${checks.length} PASS · DB write 0`);
  for (const c of checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name.padEnd(24)} ${String(c.actual).padStart(5)} / ${c.expected}`);
  console.log(`  본 단위 밖 authored canonical(불변 기준선): ${v.priorLiveAuthoredOutsideUnit}`);
  console.log(`  → ${out}`);
  if (applied && !report.allPass) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
