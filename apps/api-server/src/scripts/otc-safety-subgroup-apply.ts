/**
 * WO-O4O-OTC-SAFETY-MISMATCH-STORE-LEAFLET-PRODUCTION-NA-V2 — 파라미터화 안전 subgroup 매장설명서 러너(KO+EN).
 * 명령: npx tsx src/scripts/otc-safety-subgroup-apply.ts --group <slug|groupKey> | --all  [--lang ko|en|both]  [--apply --confirm]
 *   (권한 패턴 매칭 위해 env 프리픽스 금지. dry-run 기본. write = --apply + --confirm 둘 다.)
 * 포트: src/scripts/data/otc-apply-proxy-port.txt (없으면 5447). main 이 프록시 갱신 시 이 파일 갱신.
 * 저작: src/scripts/data/otc-safety-subgroup-authoring/<slug>.json (공식 원문 grounded, 원문 외 의료사실 0).
 *
 * KO 계약(파일럿 LIVE 검증 이식): 단일 TX ① easy canonical→deprecated ② authored canonical INSERT(needs_review→flip) ③ audit canonical_replaced.
 *   TypeORM UPDATE...RETURNING = [rows,count] 정규화. writePlanThisRun=(T−authoredRow)+3×easyCanon(fresh 4T·recovery·noop 반영).
 * EN 계약(2T, fresh): easy EN 없음 → demote 아님. authored EN needs_review INSERT → canonical flip. writePlanThisRun=(T−enRow)+(T−enCanon).
 * 민감(DR-008 sensitive:true): KO=needs_review 만(canonical flip 금지, easy 유지), EN=보류(KO canonical 미성립).
 * 사후검증(실패 시 그 subgroup ROLLBACK+HOLD, 다음 진행): authored canonical=T·easy deprecated=T(KO)·dup 0(ko·en)·scope=T·audit=T(KO)·target밖 0·writePlan==writeActual·재실행 no-op.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const AUTHOR_DIR = path.resolve(DATA_DIR, 'otc-safety-subgroup-authoring');
const PORT_FILE = path.resolve(DATA_DIR, 'otc-apply-proxy-port.txt');
const SOURCE_TYPE = 'mfds_drug_otc';
const EASY_SOURCE = 'mfds_easy_drug';
const AUTHORED = ['mfds_drug_otc', 'nutrition_combo'];

const arg = (name: string): string | undefined => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const has = (name: string): boolean => process.argv.includes(name);
const port = (): number => { try { return parseInt(readFileSync(PORT_FILE, 'utf8').trim(), 10) || 5447; } catch { return 5447; } };

function loadSubgroups(): any[] {
  if (!existsSync(AUTHOR_DIR)) return [];
  const files = readdirSync(AUTHOR_DIR).filter((f) => f.endsWith('.json'));
  const all = files.map((f) => JSON.parse(readFileSync(path.join(AUTHOR_DIR, f), 'utf8')));
  return all.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.slug < b.slug ? -1 : 1));
}
const rowsOf = (res: any): any[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res); // UPDATE...RETURNING [rows,count] 정규화

async function main(): Promise<void> {
  const doApply = has('--apply') && has('--confirm');
  const lang = (arg('--lang') || 'both').toLowerCase(); // ko|en|both
  const groupSel = arg('--group');
  const all = has('--all');
  let subs = loadSubgroups();
  if (!all) { if (!groupSel) { console.error('--group <slug|groupKey> 또는 --all 필요'); process.exit(2); } subs = subs.filter((s) => s.slug === groupSel || s.groupKey === groupSel); }
  if (subs.length === 0) { console.error('대상 subgroup 없음'); process.exit(2); }

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: port(), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const summary: any = { wo: 'WO-O4O-OTC-SAFETY-MISMATCH-STORE-LEAFLET-PRODUCTION-NA-V2', mode: doApply ? 'APPLY' : 'dry-run', lang, port: port(), results: [] };
  try {
    for (const sg of subs) {
      const r: any = { slug: sg.slug, groupKey: sg.groupKey, T: sg.masterIds.length, sensitive: !!sg.sensitive, ko: null, en: null, status: 'OK' };
      try {
        if (lang === 'ko' || lang === 'both') r.ko = await applyKo(ds, sg, doApply);
        if ((lang === 'en' || lang === 'both') && !sg.sensitive) r.en = await applyEn(ds, sg, doApply);
        else if ((lang === 'en' || lang === 'both') && sg.sensitive) r.en = { status: 'HELD_SENSITIVE_KO_NOT_CANONICAL' };
        r.status = (r.ko?.status === 'ROLLBACK' || r.en?.status === 'ROLLBACK') ? 'HOLD' : r.status;
      } catch (e) { r.status = 'HOLD'; r.error = e instanceof Error ? e.message : String(e); }
      summary.results.push(r);
      console.log(JSON.stringify(r, null, 2));
    }
  } finally { await ds.destroy(); }
  summary.applied = summary.results.filter((r: any) => r.ko?.status === 'APPLIED' || r.en?.status === 'APPLIED').length;
  summary.held = summary.results.filter((r: any) => r.status === 'HOLD').length;
  console.log('\n=== SUMMARY ===\n' + JSON.stringify({ mode: summary.mode, lang, port: summary.port, count: summary.results.length, applied: summary.applied, held: summary.held, results: summary.results.map((r: any) => `${r.slug}: ko=${r.ko?.status ?? '-'}(w${r.ko?.dbWrite ?? 0}) en=${r.en?.status ?? '-'}(w${r.en?.dbWrite ?? 0})`) }, null, 2));
}

// ── KO: demote easy + insert authored + audit (파일럿 LIVE 검증본 이식) ──
async function applyKo(ds: any, sg: any, doApply: boolean): Promise<any> {
  const T = sg.masterIds.length;
  const MASTER_IDS = sg.masterIds;
  const SOURCE_REF = sg.sourceRef;
  const built = buildDrugOtcConsumerHtml(sg.ko, { title: sg.title });
  const summary = sg.ko.summaryTable['성분'];
  const anomalies: string[] = [];
  if (new Set(MASTER_IDS).size !== T) anomalies.push('master_id 중복');
  if (built.missing.length) anomalies.push(`KO 필수필드 누락 ${built.missing.join(',')}`);
  if (!built.html || built.html.includes('<table') || built.html.includes('<!--') || !built.html.includes('sd-warn')) anomalies.push('KO html 게이트');

  const report: any = { lang: 'ko', T, sourceRef: SOURCE_REF, sensitive: !!sg.sensitive, dbWrite: 0, anomalies, htmlLen: built.html.length };
  // BEFORE
  const slot = await ds.query(`SELECT mid::text mid, (SELECT s.source_type FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL LIMIT 1) src FROM unnest($1::uuid[]) mid`, [MASTER_IDS]);
  const easyCanonBefore = slot.filter((x: any) => x.src === EASY_SOURCE).length;
  const authoredCanonBefore = slot.filter((x: any) => x.src && AUTHORED.includes(x.src)).length;
  const noneCanonBefore = slot.filter((x: any) => !x.src).length;
  const otherCanonBefore = slot.filter((x: any) => x.src && x.src !== EASY_SOURCE && !AUTHORED.includes(x.src)).length;
  const authoredRowBefore = (await ds.query(`SELECT count(*)::int n FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.status IN ('canonical','needs_review') AND s.deleted_at IS NULL)`, [MASTER_IDS]))[0].n;
  const isNoop = authoredCanonBefore === T && !sg.sensitive; // authored canonical 완료
  // ⚠️ no-op fix: easy-md5-canonical 가드는 !isNoop 일 때만(재실행 시 easy 가 deprecated 라 canonical 조회=0 → 허위 anomaly 방지)
  if (!isNoop) {
    const md5 = await ds.query(`SELECT md5(content) h FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [MASTER_IDS]);
    if (md5.length !== 1) anomalies.push(`easy md5 종류 ${md5.length}!=1`);
    else if (sg.expectEasyMd5 && !md5[0].h.startsWith(sg.expectEasyMd5)) anomalies.push(`easy md5 ${md5[0].h.slice(0, 8)}!=${sg.expectEasyMd5}`);
  }
  const enCanonBefore = (await ds.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [MASTER_IDS]))[0].n;
  report.before = { easyCanonical: easyCanonBefore, authoredKoCanonical: authoredCanonBefore, authoredRow: authoredRowBefore, noneCanonical: noneCanonBefore, otherCanonical: otherCanonBefore, enCanonical: enCanonBefore };
  if (slot.length !== T) anomalies.push(`target master ${slot.length}!=${T}`);
  if (noneCanonBefore > 0) anomalies.push(`canonical 없음 ${noneCanonBefore}`);
  if (otherCanonBefore > 0) anomalies.push(`예상밖 canonical source ${otherCanonBefore}`);
  const isFresh = easyCanonBefore === T && authoredCanonBefore === 0;
  if (!isNoop && !isFresh) anomalies.push(`혼재 상태 easy=${easyCanonBefore} authoredCanon=${authoredCanonBefore}`);
  const stepAExpected = T - authoredRowBefore;
  const upgradeExpected = sg.sensitive ? 0 : easyCanonBefore;
  report.writePlan = sg.sensitive ? T : 4 * T; // 민감=needs_review T · 비민감 cumulative 4T
  report.writePlanThisRun = sg.sensitive ? stepAExpected : stepAExpected + 3 * upgradeExpected;
  report.reexecNoop = isNoop;

  if (anomalies.length) { report.status = 'ABORT'; return report; }
  if (!doApply) { report.status = isNoop ? 'ALREADY_COMPLETE_NOOP' : 'DRYRUN_PASS'; return report; }

  const qr = ds.createQueryRunner(); await qr.connect();
  // STEP A: authored needs_review 준비(멱등)
  await qr.startTransaction();
  try {
    const insA = await qr.query(`INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
       SELECT mid, $3, $4, $2, $5::uuid, 'needs_review', 'ko', 'STORE', now(), now() FROM unnest($1::uuid[]) mid
       WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.status IN ('canonical','needs_review'))
       RETURNING id`, [MASTER_IDS, SOURCE_TYPE, built.html, summary, SOURCE_REF]);
    report.stepA_inserted = Array.isArray(insA) ? insA.length : 0;
    await qr.commitTransaction();
  } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }

  if (sg.sensitive) { report.status = 'NEEDS_REVIEW_HELD'; report.dbWrite = report.stepA_inserted; await qr.release(); return report; }

  // STEP B: 단일 TX
  await qr.startTransaction();
  try {
    let demoted = 0, flipped = 0, audited = 0;
    for (const mid of MASTER_IDS) {
      const cur = await qr.query(`SELECT id::text id, source_type FROM shared_product_descriptions WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [mid]);
      if (cur.length === 0) throw new Error(`master ${mid} canonical 0 → ABORT`);
      if (cur.length > 1) throw new Error(`master ${mid} canonical ${cur.length} → ABORT`);
      if (AUTHORED.includes(cur[0].source_type)) continue; // 이미 authored → no-op
      if (cur[0].source_type !== EASY_SOURCE) throw new Error(`master ${mid} canonical source ${cur[0].source_type} 예상밖 → ABORT`);
      const easyId = cur[0].id;
      const demoteRows = rowsOf(await qr.query(`UPDATE shared_product_descriptions SET status='deprecated', updated_at=now() WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId]));
      if (demoteRows.length !== 1) throw new Error(`master ${mid} demote ${demoteRows.length}!=1 → ABORT`); demoted++;
      const flipRows = rowsOf(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [mid]));
      const newId = flipRows[0]?.id;
      if (flipRows.length !== 1 || !newId) throw new Error(`master ${mid} flip ${flipRows.length} → ABORT`); flipped++;
      await qr.query(`INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, metadata, performed_at)
         VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb, now())`,
        [mid, easyId, newId, JSON.stringify({ targetMaster: mid, beforeSource: EASY_SOURCE, afterSource: SOURCE_TYPE, previousDemotedTo: 'deprecated', source_ref_id: SOURCE_REF, groupKey: sg.groupKey, safetyFp: sg.safetyFp, reason: 'safety-subgroup grounded 매장용 설명서 canonical 승격(easy→authored, 원문 보존 재구성)', wo: 'WO-O4O-OTC-SAFETY-MISMATCH-STORE-LEAFLET-PRODUCTION-NA-V2' })]);
      audited++;
    }
    const post = (await qr.query(`SELECT count(*) FILTER (WHERE canoncnt=1)::int canon1, count(*) FILTER (WHERE authored_canon)::int authored, count(*) FILTER (WHERE dep_easy)::int dep, count(*) FILTER (WHERE canoncnt>1)::int dup, count(*) FILTER (WHERE en_dup)::int en_dup, count(*) FILTER (WHERE easy_left)::int easy_left
      FROM (SELECT mid,
        (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) canoncnt,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) authored_canon,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy,
        ((SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL)>1) en_dup,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) easy_left
        FROM unnest($1::uuid[]) mid) t`, [MASTER_IDS]))[0];
    const scope = (await qr.query(`SELECT count(*)::int n, count(DISTINCT master_id)::int m FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`, [SOURCE_REF]))[0];
    const outside = (await qr.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND deleted_at IS NULL AND NOT master_id=ANY($2::uuid[])`, [SOURCE_REF, MASTER_IDS]))[0];
    const auditN = (await qr.query(`SELECT count(*)::int n FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND event_type='canonical_replaced' AND (metadata->>'source_ref_id')=$2`, [MASTER_IDS, SOURCE_REF]))[0];
    const enCanonAfter = (await qr.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [MASTER_IDS]))[0].n;
    const writeActual = report.stepA_inserted + demoted + flipped + audited;
    report.after = { canonical1: post.canon1, authoredKoCanonical: post.authored, easyDeprecated: post.dep, easyCanonicalLeft: post.easy_left, canonicalDupKo: post.dup, canonicalDupEn: post.en_dup, sourceRefScopeMasters: scope.m, targetOutsideWrite: outside.n, audit: auditN.n, enCanonical: enCanonAfter };
    report.writeActual = writeActual;
    const f: string[] = [];
    if (post.canon1 !== T) f.push(`canon1=${post.canon1}`);
    if (post.authored !== T) f.push(`authored=${post.authored}`);
    if (post.dep !== T) f.push(`dep=${post.dep}`);
    if (post.easy_left !== 0) f.push(`easyLeft=${post.easy_left}`);
    if (post.dup !== 0) f.push(`koDup=${post.dup}`);
    if (post.en_dup !== 0) f.push(`enDup=${post.en_dup}`);
    if (scope.m !== T) f.push(`scope=${scope.m}`);
    if (outside.n !== 0) f.push(`outside=${outside.n}`);
    if (auditN.n !== T) f.push(`audit=${auditN.n}`);
    if (enCanonAfter !== enCanonBefore) f.push(`enDrift`);
    if (writeActual !== report.writePlanThisRun) f.push(`writePlan ${report.writePlanThisRun}!=${writeActual}`);
    if (f.length) throw new Error(`KO 사후검증 실패 [${f.join(',')}] → ROLLBACK`);
    await qr.commitTransaction();
    report.status = 'APPLIED'; report.dbWrite = writeActual;
  } catch (e) { await qr.rollbackTransaction(); await qr.release(); report.status = 'ROLLBACK'; report.error = e instanceof Error ? e.message : String(e); return report; }
  await qr.release();
  return report;
}

// ── EN: authored en needs_review INSERT → canonical flip (2T fresh; easy EN 없음 → demote 아님) ──
async function applyEn(ds: any, sg: any, doApply: boolean): Promise<any> {
  const T = sg.masterIds.length;
  const MASTER_IDS = sg.masterIds;
  const SOURCE_REF = sg.sourceRef;
  const tr: DrugOtcEnTranslation = { groupKey: sg.groupKey, title: sg.en.title, usageLabel: sg.en.usageLabel, efficacy: sg.en.efficacy, usage: sg.en.usage, caution: sg.en.caution, summaryTable: sg.en.summaryTable };
  const built = buildDrugOtcEnConsumerHtml(tr);
  const summary = sg.en.summaryTable['Ingredient'] || null;
  const anomalies: string[] = [];
  if (built.missing.length) anomalies.push(`EN 필수필드 누락 ${built.missing.join(',')}`);
  if (!built.html || built.html.includes('<table') || built.html.includes('<!--') || !built.html.includes('sd-warn')) anomalies.push('EN html 게이트');
  if (/[가-힣]/.test(built.html)) anomalies.push('EN 에 한글 잔존');

  const report: any = { lang: 'en', T, sourceRef: SOURCE_REF, dbWrite: 0, anomalies, htmlLen: built.html.length };
  // KO canonical 존재 확인(EN 번역 기준). 없으면 EN 보류.
  const koCanon = (await ds.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND deleted_at IS NULL`, [MASTER_IDS]))[0].n;
  report.koAuthoredCanonical = koCanon;
  if (koCanon !== T) { report.status = 'HELD_KO_NOT_CANONICAL'; anomalies.push(`KO authored canonical ${koCanon}!=${T} (EN 번역 기준 미성립)`); return report; }

  const enCanonBefore = (await ds.query(`SELECT count(*)::int n FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)`, [MASTER_IDS]))[0].n;
  const enRowBefore = (await ds.query(`SELECT count(*)::int n FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.status IN ('canonical','needs_review') AND s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)`, [MASTER_IDS]))[0].n;
  report.before = { enAuthoredCanonical: enCanonBefore, enAuthoredRow: enRowBefore };
  const isNoop = enCanonBefore === T;
  const stepAExpected = T - enRowBefore;      // insert
  const flipExpected = T - enCanonBefore;     // flip
  report.writePlan = 2 * T;
  report.writePlanThisRun = stepAExpected + flipExpected;
  report.reexecNoop = isNoop;

  if (anomalies.length) { report.status = 'ABORT'; return report; }
  if (!doApply) { report.status = isNoop ? 'ALREADY_COMPLETE_NOOP' : 'DRYRUN_PASS'; return report; }

  const qr = ds.createQueryRunner(); await qr.connect();
  await qr.startTransaction();
  try {
    const insA = await qr.query(`INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
       SELECT mid, $3, $4, $2, $5::uuid, 'needs_review', 'en', 'STORE', now(), now() FROM unnest($1::uuid[]) mid
       WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.status IN ('canonical','needs_review'))
       RETURNING id`, [MASTER_IDS, SOURCE_TYPE, built.html, summary, SOURCE_REF]);
    const enInserted = Array.isArray(insA) ? insA.length : 0;
    const flipRows = rowsOf(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [MASTER_IDS]));
    const flipped = flipRows.length;
    const writeActual = enInserted + flipped;
    const post = (await qr.query(`SELECT count(*) FILTER (WHERE encanon=1)::int c1, count(*) FILTER (WHERE encanon>1)::int dup FROM (SELECT mid, (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) encanon FROM unnest($1::uuid[]) mid) t`, [MASTER_IDS]))[0];
    const scope = (await qr.query(`SELECT count(DISTINCT master_id)::int m FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND status='canonical' AND language='en' AND deleted_at IS NULL`, [SOURCE_REF]))[0];
    const outside = (await qr.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND language='en' AND deleted_at IS NULL AND NOT master_id=ANY($2::uuid[])`, [SOURCE_REF, MASTER_IDS]))[0];
    report.after = { enCanonical1: post.c1, enDup: post.dup, sourceRefScopeMasters: scope.m, targetOutsideWrite: outside.n }; report.writeActual = writeActual; report.stepA_inserted = enInserted; report.flipped = flipped;
    const f: string[] = [];
    if (post.c1 !== T) f.push(`enCanon1=${post.c1}`);
    if (post.dup !== 0) f.push(`enDup=${post.dup}`);
    if (scope.m !== T) f.push(`scope=${scope.m}`);
    if (outside.n !== 0) f.push(`outside=${outside.n}`);
    if (writeActual !== report.writePlanThisRun) f.push(`writePlan ${report.writePlanThisRun}!=${writeActual}`);
    if (f.length) throw new Error(`EN 사후검증 실패 [${f.join(',')}] → ROLLBACK`);
    await qr.commitTransaction();
    report.status = 'APPLIED'; report.dbWrite = writeActual;
  } catch (e) { await qr.rollbackTransaction(); await qr.release(); report.status = 'ROLLBACK'; report.error = e instanceof Error ? e.message : String(e); return report; }
  await qr.release();
  return report;
}

main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
