/**
 * WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1 — da V3 apply 러너(oral 전용)
 *
 * 입력: otc-easy-drug-ready-oral-v3-build-{unit}.json(KO html/fp) + otc-easy-drug-ready-oral-v3-en-build-{unit}.json(EN html/fp).
 * 계약: na 형제 러너(otc-v3-topical-oromucosal-apply.na.ts) 의 KO(4T)/EN(2T) demote·flip·audit SQL VERBATIM 이식.
 *   KO 단일 TX per fp: easy canonical→deprecated · authored needs_review INSERT→canonical flip · audit canonical_replaced.
 *   EN 2T: authored en needs_review INSERT→canonical flip(easy EN 없음→demote 아님). EN 은 KO authored canonical 성립 후.
 * source_type='mfds_drug_otc'(AUTHORED_SOURCES 소속) · V3 sourceRef(otc-v3-content-leaflet namespace) 로 격리.
 *
 * 모드:
 *   (기본) dry-run       : write 0. BEFORE 상태·write plan·HTML 게이트만 검증. 결정적 plan 아티팩트 emit(2회 byte-identical).
 *   --rollback-test      : fp별 단일 TX(KO→KO검증→EN→EN검증) 후 **항상 ROLLBACK**. 독립 커넥션 residue 0 검증. net write 0.
 *   --apply --confirm    : LIVE(commit). 추가로 per-unit confirm env 필수 — 이 WO 에서는 미설정 → LOCKED. EN 은 KO canonical 선행.
 *
 * 포트: --port(기본 5442, da 전용 proxy). ENV .env DB_PASSWORD read-only 참조(값 미출력).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-oral-v3-apply.da.ts --unit oral-unit-1 [--rollback-test] [--port 5442]
 */
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const ENV_PATH = path.resolve(process.cwd(), '.env');
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const SOURCE_TYPE = 'mfds_drug_otc';
const EASY_SOURCE = 'mfds_easy_drug';
const AUTHORED = ['mfds_drug_otc', 'nutrition_combo'];
const WO = 'WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const has = (n: string): boolean => process.argv.includes(n);
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const rowsOf = (res: any): any[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res);
const port = (): number => { const a = arg('--port'); return a ? parseInt(a, 10) : 5442; };

interface Sg { fp: string; groupKey: string; gencode: string; route: string; T: number; masterIds: string[]; sourceRef: string; koHtml: string; enHtml: string }

function loadUnit(unit: string): Sg[] {
  const ko = JSON.parse(readFileSync(path.join(DATA_DIR, `otc-easy-drug-ready-oral-v3-build-${unit}.json`), 'utf8'));
  const en = JSON.parse(readFileSync(path.join(DATA_DIR, `otc-easy-drug-ready-oral-v3-en-build-${unit}.json`), 'utf8'));
  const enByFp: Record<string, any> = Object.fromEntries(en.fingerprints.map((f: any) => [f.fp, f]));
  return ko.fingerprints.map((f: any) => {
    const e = enByFp[f.fp];
    if (!e) throw new Error(`fp ${f.fp} EN build 누락`);
    return { fp: f.fp, groupKey: `${f.gencode}::${f.route}`, gencode: f.gencode, route: f.route,
      T: f.masterIds.length, masterIds: f.masterIds, sourceRef: f.sourceRef, koHtml: f.koHtml, enHtml: e.enHtml };
  });
}

function htmlGate(html: string, lang: 'ko' | 'en'): string[] {
  const a: string[] = [];
  if (!html || !html.includes('sd-warn')) a.push(`${lang} sd-warn 부재`);
  if (html.includes('<table') || html.includes('<!--')) a.push(`${lang} html 금지요소`);
  if (lang === 'en' && /[가-힣]/.test(html)) a.push('en 한글 잔존');
  return a;
}

// ── KO dry-run(BEFORE + plan, write 0) — na 러너 koBefore 이식 ──
async function koBefore(ds: any, sg: Sg): Promise<any> {
  const T = sg.T, MASTER_IDS = sg.masterIds;
  const anomalies = [...htmlGate(sg.koHtml, 'ko')];
  if (new Set(MASTER_IDS).size !== T) anomalies.push('master_id 중복');
  const slot = await ds.query(`SELECT mid::text mid, (SELECT s.source_type FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL LIMIT 1) src FROM unnest($1::uuid[]) mid`, [MASTER_IDS]);
  const easyCanonBefore = slot.filter((x: any) => x.src === EASY_SOURCE).length;
  const authoredCanonBefore = slot.filter((x: any) => x.src && AUTHORED.includes(x.src)).length;
  const noneCanonBefore = slot.filter((x: any) => !x.src).length;
  const otherCanonBefore = slot.filter((x: any) => x.src && x.src !== EASY_SOURCE && !AUTHORED.includes(x.src)).length;
  const authoredRowBefore = (await ds.query(`SELECT count(*)::int n FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.status IN ('canonical','needs_review') AND s.deleted_at IS NULL)`, [MASTER_IDS]))[0].n;
  if (slot.length !== T) anomalies.push(`target master ${slot.length}!=${T}`);
  if (noneCanonBefore > 0) anomalies.push(`canonical 없음 ${noneCanonBefore}`);
  if (otherCanonBefore > 0) anomalies.push(`예상밖 canonical source ${otherCanonBefore}`);
  const isFresh = easyCanonBefore === T && authoredCanonBefore === 0;
  if (!isFresh && authoredCanonBefore !== T) anomalies.push(`혼재 easy=${easyCanonBefore} authoredCanon=${authoredCanonBefore}`);
  const stepAExpected = T - authoredRowBefore;
  const writePlanThisRun = stepAExpected + 3 * easyCanonBefore;
  return { lang: 'ko', fp: sg.fp, T, sourceRef: sg.sourceRef, anomalies, htmlLen: sg.koHtml.length, htmlMd5: md5(sg.koHtml),
    before: { easyCanonical: easyCanonBefore, authoredKoCanonical: authoredCanonBefore, authoredRow: authoredRowBefore },
    writePlan: 4 * T, writePlanThisRun, status: anomalies.length ? 'ABORT' : 'DRYRUN_PASS' };
}
async function enBefore(ds: any, sg: Sg): Promise<any> {
  const T = sg.T, MASTER_IDS = sg.masterIds;
  const anomalies = [...htmlGate(sg.enHtml, 'en')];
  const koCanon = (await ds.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND deleted_at IS NULL`, [MASTER_IDS]))[0].n;
  const enCanonBefore = (await ds.query(`SELECT count(*)::int n FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)`, [MASTER_IDS]))[0].n;
  const enRowBefore = (await ds.query(`SELECT count(*)::int n FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.status IN ('canonical','needs_review') AND s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)`, [MASTER_IDS]))[0].n;
  const status = anomalies.length ? 'ABORT' : (koCanon !== T ? 'HELD_KO_NOT_CANONICAL' : 'DRYRUN_PASS');
  return { lang: 'en', fp: sg.fp, T, sourceRef: sg.sourceRef, anomalies, htmlLen: sg.enHtml.length, htmlMd5: md5(sg.enHtml),
    koAuthoredCanonical: koCanon, before: { enAuthoredCanonical: enCanonBefore, enAuthoredRow: enRowBefore },
    writePlan: 2 * T, writePlanThisRun: (T - enRowBefore) + (T - enCanonBefore), status };
}

// ── fp별 rollback-test: 단일 TX(KO→KO검증→EN→EN검증) 후 항상 ROLLBACK ──
async function rollbackTestFp(ds: any, sg: Sg): Promise<any> {
  const T = sg.T, MASTER_IDS = sg.masterIds, SOURCE_REF = sg.sourceRef;
  const rep: any = { fp: sg.fp, T, sourceRef: SOURCE_REF, ko: {}, en: {}, committed: false };
  const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
  try {
    // KO STEP A
    const insA = await qr.query(`INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
       SELECT mid, $3, $4, $2, $5::uuid, 'needs_review', 'ko', 'STORE', now(), now() FROM unnest($1::uuid[]) mid
       WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.status IN ('canonical','needs_review'))
       RETURNING id`, [MASTER_IDS, SOURCE_TYPE, sg.koHtml, null, SOURCE_REF]);
    const stepA = Array.isArray(insA) ? insA.length : 0;
    let demoted = 0, flipped = 0, audited = 0;
    for (const mid of MASTER_IDS) {
      const cur = await qr.query(`SELECT id::text id, source_type FROM shared_product_descriptions WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [mid]);
      if (cur.length !== 1) throw new Error(`KO master ${mid} canonical ${cur.length}!=1`);
      if (AUTHORED.includes(cur[0].source_type)) continue;
      if (cur[0].source_type !== EASY_SOURCE) throw new Error(`KO master ${mid} canonical source ${cur[0].source_type} 예상밖`);
      const easyId = cur[0].id;
      const dem = rowsOf(await qr.query(`UPDATE shared_product_descriptions SET status='deprecated', updated_at=now() WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId]));
      if (dem.length !== 1) throw new Error(`KO ${mid} demote ${dem.length}`); demoted++;
      const flip = rowsOf(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [mid]));
      const newId = flip[0]?.id;
      if (flip.length !== 1 || !newId) throw new Error(`KO ${mid} flip ${flip.length}`); flipped++;
      await qr.query(`INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, metadata, performed_at)
         VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb, now())`,
        [mid, easyId, newId, JSON.stringify({ targetMaster: mid, beforeSource: EASY_SOURCE, afterSource: SOURCE_TYPE, source_ref_id: SOURCE_REF, groupKey: sg.groupKey, safetyFp: sg.fp, contentFp: sg.fp, reason: 'V3 content-fingerprint grounded 매장용 설명서 canonical 승격(easy→authored, 6섹션 원문 보존)', wo: WO })]);
      audited++;
    }
    // KO post-verify (EN 미변경 상태)
    const post = (await qr.query(`SELECT count(*) FILTER (WHERE canoncnt=1)::int canon1, count(*) FILTER (WHERE authored_canon)::int authored, count(*) FILTER (WHERE dep_easy)::int dep, count(*) FILTER (WHERE canoncnt>1)::int dup, count(*) FILTER (WHERE easy_left)::int easy_left
      FROM (SELECT mid,
        (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) canoncnt,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) authored_canon,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) easy_left
        FROM unnest($1::uuid[]) mid) t`, [MASTER_IDS]))[0];
    const scope = (await qr.query(`SELECT count(DISTINCT master_id)::int m FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`, [SOURCE_REF]))[0];
    const outside = (await qr.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND deleted_at IS NULL AND NOT master_id=ANY($2::uuid[])`, [SOURCE_REF, MASTER_IDS]))[0];
    const auditN = (await qr.query(`SELECT count(*)::int n FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND event_type='canonical_replaced' AND (metadata->>'source_ref_id')=$2`, [MASTER_IDS, SOURCE_REF]))[0];
    const koWrite = stepA + demoted + flipped + audited;
    const kf: string[] = [];
    if (post.canon1 !== T) kf.push(`canon1=${post.canon1}`);
    if (post.authored !== T) kf.push(`authored=${post.authored}`);
    if (post.dep !== T) kf.push(`dep=${post.dep}`);
    if (post.easy_left !== 0) kf.push(`easyLeft=${post.easy_left}`);
    if (post.dup !== 0) kf.push(`koDup=${post.dup}`);
    if (scope.m !== T) kf.push(`scope=${scope.m}`);
    if (outside.n !== 0) kf.push(`outside=${outside.n}`);
    if (auditN.n !== T) kf.push(`audit=${auditN.n}`);
    if (koWrite !== 4 * T) kf.push(`koWrite ${koWrite}!=${4 * T}`);
    rep.ko = { writeActual: koWrite, writePlan: 4 * T, post, scope: scope.m, outside: outside.n, audit: auditN.n, fail: kf };
    if (kf.length) throw new Error(`KO 사후검증 실패 [${kf.join(',')}]`);

    // EN STEP (KO canonical 성립 후, 동일 TX)
    const insE = await qr.query(`INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
       SELECT mid, $3, $4, $2, $5::uuid, 'needs_review', 'en', 'STORE', now(), now() FROM unnest($1::uuid[]) mid
       WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.status IN ('canonical','needs_review'))
       RETURNING id`, [MASTER_IDS, SOURCE_TYPE, sg.enHtml, null, SOURCE_REF]);
    const enIns = Array.isArray(insE) ? insE.length : 0;
    const enFlip = rowsOf(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [MASTER_IDS]));
    const enPost = (await qr.query(`SELECT count(*) FILTER (WHERE encanon=1)::int c1, count(*) FILTER (WHERE encanon>1)::int dup FROM (SELECT mid, (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) encanon FROM unnest($1::uuid[]) mid) t`, [MASTER_IDS]))[0];
    const enScope = (await qr.query(`SELECT count(DISTINCT master_id)::int m FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND status='canonical' AND language='en' AND deleted_at IS NULL`, [SOURCE_REF]))[0];
    const enOutside = (await qr.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND language='en' AND deleted_at IS NULL AND NOT master_id=ANY($2::uuid[])`, [SOURCE_REF, MASTER_IDS]))[0];
    const enWrite = enIns + enFlip.length;
    const ef: string[] = [];
    if (enPost.c1 !== T) ef.push(`enCanon1=${enPost.c1}`);
    if (enPost.dup !== 0) ef.push(`enDup=${enPost.dup}`);
    if (enScope.m !== T) ef.push(`enScope=${enScope.m}`);
    if (enOutside.n !== 0) ef.push(`enOutside=${enOutside.n}`);
    if (enWrite !== 2 * T) ef.push(`enWrite ${enWrite}!=${2 * T}`);
    rep.en = { writeActual: enWrite, writePlan: 2 * T, post: enPost, scope: enScope.m, outside: enOutside.n, fail: ef };
    if (ef.length) throw new Error(`EN 사후검증 실패 [${ef.join(',')}]`);

    rep.txWritten = koWrite + enWrite;
    rep.status = 'ROLLBACK_TEST_PASS';
  } catch (e) {
    rep.status = 'ROLLBACK_TEST_FAIL'; rep.error = e instanceof Error ? e.message : String(e);
  } finally {
    await qr.rollbackTransaction(); await qr.release(); // ★ 항상 ROLLBACK — commit 없음
  }
  return rep;
}

async function main(): Promise<void> {
  const unit = arg('--unit');
  if (!unit) { console.error('--unit oral-unit-1|oral-unit-2 필요'); process.exit(2); }
  const mode = has('--rollback-test') ? 'rollback-test' : (has('--apply') && has('--confirm') ? 'APPLY' : 'dry-run');

  // ── LIVE apply 이중 게이트 + per-unit confirm env (이 WO 에서는 LOCKED) ──
  if (mode === 'APPLY') {
    const koEnv = process.env[`OTC_V3_APPLY_KO_${unit.replace(/-/g, '_').toUpperCase()}`];
    const enEnv = process.env[`OTC_V3_APPLY_EN_${unit.replace(/-/g, '_').toUpperCase()}`];
    if (koEnv !== 'CONFIRM') { console.error(`LOCKED: KO confirm env(OTC_V3_APPLY_KO_${unit.replace(/-/g, '_').toUpperCase()}=CONFIRM) 미설정 — 이 WO 는 LIVE apply 금지`); process.exit(3); }
    if (enEnv !== 'CONFIRM') { console.error(`LOCKED: EN confirm env 미설정`); process.exit(3); }
    console.error('LIVE APPLY 경로는 이 WO 범위 밖입니다. 중지.'); process.exit(3);
  }

  const subs = loadUnit(unit);
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: port(), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 } });
  await ds.initialize();

  const out: any = { wo: WO, agent: 'da', unit, route: subs[0].route, mode, port: port(), fpCount: subs.length,
    masterCount: subs.reduce((t, s) => t + s.T, 0), results: [] as any[] };
  try {
    if (mode === 'dry-run') {
      let koPlan = 0, enPlan = 0, ko0 = 0, enHeld = 0, anomaly = 0;
      for (const sg of subs) {
        const ko = await koBefore(ds, sg); const en = await enBefore(ds, sg);
        koPlan += ko.writePlanThisRun; enPlan += en.writePlanThisRun;
        if (ko.status !== 'DRYRUN_PASS') anomaly++;
        if (en.status === 'HELD_KO_NOT_CANONICAL') enHeld++;
        if (en.status === 'ABORT') anomaly++;
        out.results.push({ fp: sg.fp, T: sg.T, ko, en });
      }
      out.dryRun = { koWritePlan: koPlan, enWritePlan: enPlan, totalWritePlan: koPlan + enPlan,
        expectedKo: out.masterCount * 4, expectedEn: out.masterCount * 2, anomalies: anomaly, enHeldPendingKo: enHeld };
      out.pass = anomaly === 0 && koPlan === out.masterCount * 4 && enPlan === out.masterCount * 2;
    } else {
      // rollback-test
      const results: any[] = [];
      for (const sg of subs) results.push(await rollbackTestFp(ds, sg));
      out.results = results;
      const fails = results.filter((r) => r.status !== 'ROLLBACK_TEST_PASS');
      const txWritten = results.reduce((t, r) => t + (r.txWritten || 0), 0);
      // 독립 커넥션 residue 검증(전 master) — commit 0 이어야 함
      const allIds = subs.flatMap((s) => s.masterIds);
      const residue = (await ds.query(`SELECT
        (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_type=ANY($2) AND description_type='STORE' AND deleted_at IS NULL) authoredrows,
        (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_ref_id=ANY($3::uuid[]) AND deleted_at IS NULL) v3refrows,
        (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE' AND status='deprecated' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL) easydeprecated,
        (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND (metadata->>'wo')=$4) auditrows
        `, [allIds, AUTHORED, subs.map((s) => s.sourceRef), WO]))[0];
      out.rollbackTest = { fpCount: subs.length, passed: results.length - fails.length, failed: fails.length,
        txWrittenThenRolledBack: txWritten, residue,
        residueClean: residue.authoredrows === 0 && residue.v3refrows === 0 && residue.easydeprecated === 0 && residue.auditrows === 0,
        failDetail: fails.map((f) => ({ fp: f.fp, error: f.error })) };
      out.pass = fails.length === 0 && out.rollbackTest.residueClean;
    }
  } finally { await ds.destroy(); }

  // 결정적 아티팩트(dry-run byte-identical 근거): plan 만 추림(시간 비의존)
  const planDigest = out.mode === 'dry-run'
    ? out.results.map((r: any) => `${r.fp}|ko:${r.ko.writePlanThisRun}:${r.ko.htmlMd5}|en:${r.en.writePlanThisRun}:${r.en.htmlMd5}|${r.ko.before.easyCanonical}/${r.ko.before.authoredKoCanonical}`).sort().join('\n')
    : out.results.map((r: any) => `${r.fp}|${r.status}|${r.txWritten || 0}`).sort().join('\n');
  out.planDigestMd5 = md5(planDigest);

  console.log(JSON.stringify(out, (k, v) => (k === 'koHtml' || k === 'enHtml' ? undefined : v), 2));
  console.log(`\n=== ${unit} ${mode} · fp ${out.fpCount} · master ${out.masterCount} · PASS=${out.pass} · planDigestMd5 ${out.planDigestMd5} ===`);
  if (!out.pass) process.exit(2);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
