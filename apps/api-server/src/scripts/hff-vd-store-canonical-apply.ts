/**
 * HFF 비타민 D 단일형 417건 — STORE 설명서 canonical 적재 (dry-run 기본 · --apply 이중게이트)
 *
 * WO-O4O-HFF-DESCRIPTION-VITAMIN-D-PRODUCTION-LINE-V1 후속(프리로드 9종 + dry-run).
 * 대상: hff-vitamin-d-new-30.json(30) + hff-vitamin-d-production.json(387) = 417.
 * 계약 = 유산균 192·비타민 C 100 경로 동일(hff-store-description-canonical-apply.ts).
 *   grounding = declaredAmount(함량) + serving (CFU 아님)
 *   regulatory_type='건강기능식품' · mfds_permit_number=STTEMNT_NO · barcode NULL(무바코드)
 *   SPD: status='canonical' · description_type='STORE' · source_type='o4o_hff_generated' · source_ref_id=candidate.id
 *   canonical 불변식 = partial-unique (master_id, description_type, coalesce(language,'ko')) where canonical
 *
 * **dry-run(기본)**: 프리로드 9종 SELECT → 실제 INSERT/UPDATE 실행 → 트랜잭션 내 사후검증 → **ROLLBACK**(DB write 0).
 * **apply**: 동일 경로 + COMMIT (HFF_VD_APPLY_CONFIRM=YES 필요).
 * 접속: Cloud SQL Auth Proxy (127.0.0.1:PROXY_PORT). DB_USERNAME/PASSWORD/NAME=env.
 *
 * Usage:
 *   dry-run: PROXY_PORT=5433 npx tsx src/scripts/hff-vd-store-canonical-apply.ts
 *   apply  : HFF_VD_APPLY_CONFIRM=YES PROXY_PORT=5433 npx tsx ... --apply
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import type { GuardProductInput } from '../modules/content-guard/product-description-guard.types.js';
import { sanitizeDescriptionHtml } from '../modules/neture/utils/sanitize-description-html.util.js';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_VD_APPLY_CONFIRM === 'YES';
const PROXY_HOST = process.env.PROXY_HOST ?? '127.0.0.1';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);
const SOURCE_LABEL = 'MFDS_HEALTH_FUNCTIONAL_FOOD';
const SPD_SOURCE_TYPE = 'o4o_hff_generated';
const REGULATORY_TYPE = '건강기능식품';
const EXPECT = 417;
const SP = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/2b5935f9-9c75-483f-8206-e3385235d4d4/scratchpad';
const DATA = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard';

function loadTargets(): GuardProductInput[] {
  const a: GuardProductInput[] = JSON.parse(fs.readFileSync(`${DATA}/hff-vitamin-d-new-30.json`, 'utf8'));
  const b: GuardProductInput[] = JSON.parse(fs.readFileSync(`${DATA}/hff-vitamin-d-production.json`, 'utf8'));
  return [...a, ...b];
}

async function main(): Promise<void> {
  if (APPLY && !CONFIRM) throw new Error('APPLY_BLOCKED: --apply 는 HFF_VD_APPLY_CONFIRM=YES 필요');
  const items = loadTargets();
  if (items.length !== EXPECT) throw new Error(`대상 수 불일치: ${items.length} (기대 ${EXPECT})`);

  // ── 프리로드 #1(고정) + #6(ko/en) + #7(Guard) + #8(sanitize) : 파일 레벨 ──
  let blocked = 0, review = 0, missDraft = 0, missGround = 0;
  for (const it of items) {
    const r = runGuard(it, { phase: 'all' });
    if (r.overallStatus === 'BLOCKED') blocked++;
    if (r.overallStatus === 'REVIEW_REQUIRED') review++;
    if (!it.drafts?.ko?.trim() || !it.drafts?.en?.trim()) missDraft++;
    const g = (it as unknown as { grounding?: { declaredAmount?: unknown; serving?: unknown } }).grounding;
    if (!g?.declaredAmount || !g?.serving) missGround++;
  }
  if (blocked || missDraft || missGround) throw new Error(`GUARD_FAIL blocked=${blocked} draft=${missDraft} ground=${missGround}`);
  const koN = items.filter((it) => it.drafts?.ko?.trim()).length;
  const enN = items.filter((it) => it.drafts?.en?.trim()).length;

  const stmts = items.map((it) => String((it as unknown as { statementNo: string }).statementNo).trim());
  if (new Set(stmts).size !== EXPECT) throw new Error(`신고번호 중복(파일): 유일 ${new Set(stmts).size}`);

  const ds = new DataSource({
    type: 'postgres', host: PROXY_HOST, port: PROXY_PORT,
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'], ssl: false,
    extra: { max: 3, connectionTimeoutMillis: 15000, query_timeout: 120000, statement_timeout: 120000 },
  });
  await ds.initialize();
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  const checks: Record<string, number | string> = {};
  try {
    // ── #2 candidate 매칭 417·1:1 + #3 사전승격 0 ──
    const cands: Array<{ stmt: string; id: string; matched: string | null; status: string }> = await qr.query(
      `SELECT raw_payload::jsonb->'source'->>'STTEMNT_NO' AS stmt, id, matched_product_master_id AS matched, candidate_status AS status
         FROM product_candidates
        WHERE source_label=$1 AND deleted_at IS NULL AND raw_payload::jsonb->'source'->>'STTEMNT_NO' = ANY($2)`,
      [SOURCE_LABEL, stmts]);
    const byStmt = new Map<string, typeof cands>();
    for (const c of cands) { const arr = byStmt.get(c.stmt) ?? []; arr.push(c); byStmt.set(c.stmt, arr); }
    const missing = stmts.filter((s) => !byStmt.has(s));
    const ambiguous = stmts.filter((s) => (byStmt.get(s)?.length ?? 0) > 1);
    const alreadyPromoted = cands.filter((c) => c.matched != null);
    checks['#1 매니페스트 고정'] = EXPECT;
    checks['#2 candidateMatch(1:1)'] = `${cands.length} (missing ${missing.length}, ambiguous ${ambiguous.length})`;
    checks['#3 사전승격'] = alreadyPromoted.length;
    if (missing.length) throw new Error(`CANDIDATE_MISSING ${missing.length}: ${missing.slice(0, 3)}`);
    if (ambiguous.length) throw new Error(`CANDIDATE_AMBIGUOUS ${ambiguous.length}: ${ambiguous.slice(0, 3)}`);
    if (alreadyPromoted.length) throw new Error(`ALREADY_PROMOTED ${alreadyPromoted.length}`);

    // ── #4 신고번호 기존 master 중복 0 ──
    const dup: Array<{ p: string }> = await qr.query(
      `SELECT mfds_permit_number AS p FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts]);
    checks['#4 masterDup(permit)'] = dup.length;
    if (dup.length) throw new Error(`MASTER_EXISTS ${dup.length}: ${dup.slice(0, 3).map((x) => x.p)}`);

    // ── #5 기존 STORE canonical SPD 중복 0 (permit→master→STORE canonical SPD) ──
    const spdDup: Array<{ c: number }> = await qr.query(
      `SELECT count(*)::int c FROM shared_product_descriptions s
         JOIN product_masters m ON m.id=s.master_id
        WHERE m.mfds_permit_number = ANY($1) AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL`, [stmts]);
    checks['#5 canonicalSpdDup'] = spdDup[0].c;
    if (spdDup[0].c) throw new Error(`STORE_CANONICAL_SPD_EXISTS ${spdDup[0].c}`);

    checks['#6 ko/en 완전성'] = `ko ${koN} · en ${enN}`;
    checks['#7 Guard BLOCKED'] = blocked;

    // ── 계획 구성 + #8 sanitize 무손실 + #9 연결 완전성 ──
    const ids: string[] = [], names: string[] = [], makers: string[] = [], permits: string[] = [];
    const candIds: string[] = [], masterForCand: string[] = [];
    const spdIds: string[] = [], spdMaster: string[] = [], spdContent: string[] = [], spdRef: string[] = [], spdLang: string[] = [];
    const snapshot: Array<{ candidateId: string; stmt: string; prev_status: string }> = [];
    let sanitizeEmpty = 0, refComplete = 0;
    let sample: unknown = null;
    for (const it of items) {
      const stmt = String((it as unknown as { statementNo: string }).statementNo).trim();
      const cand = byStmt.get(stmt)![0];
      const masterId = randomUUID();
      ids.push(masterId); names.push(it.productName); makers.push((it as unknown as { manufacturer: string }).manufacturer); permits.push(stmt);
      candIds.push(cand.id); masterForCand.push(masterId);
      const koC = sanitizeDescriptionHtml(it.drafts.ko), enC = sanitizeDescriptionHtml(it.drafts.en);
      if (!koC.trim() || !enC.trim()) sanitizeEmpty++;
      // #9 연결: candidate.stmt === permit(STTEMNT_NO) === source_ref 대상
      if (cand.stmt === stmt && stmt.length > 0 && cand.id) refComplete++;
      if (!sample) sample = { name: it.productName, koBefore: it.drafts.ko.length, koAfter: koC.length, enBefore: it.drafts.en.length, enAfter: enC.length };
      for (const [lang, content] of [['ko', koC], ['en', enC]] as const) {
        spdIds.push(randomUUID()); spdMaster.push(masterId); spdContent.push(content); spdRef.push(cand.id); spdLang.push(lang);
      }
      snapshot.push({ candidateId: cand.id, stmt, prev_status: cand.status });
    }
    checks['#8 sanitize 무손실(empty)'] = sanitizeEmpty;
    checks['#9 source_ref·permit·candidate 연결'] = `${refComplete}/${EXPECT}`;
    if (sanitizeEmpty) throw new Error(`SANITIZE_EMPTY ${sanitizeEmpty}`);
    if (refComplete !== EXPECT) throw new Error(`REF_INCOMPLETE ${refComplete}`);

    const planned = { masters: ids.length, candidateUpdates: candIds.length, spdKo: spdLang.filter((l) => l === 'ko').length, spdEn: spdLang.filter((l) => l === 'en').length };
    const totalWrites = planned.masters + planned.candidateUpdates + planned.spdKo + planned.spdEn;

    // ── 실제 INSERT/UPDATE 실행 (트랜잭션 내) ──
    const tags = JSON.stringify(['import:mfds-hff', 'batch:vitamin-d-production', 'wo:hff-vd-store-canonical']);
    await qr.query(
      `INSERT INTO product_masters (id, barcode, regulatory_type, regulatory_name, name, manufacturer_name, mfds_permit_number, is_mfds_verified, status, tags, created_at, updated_at)
       SELECT u.id, NULL, $1, u.nm, u.nm, u.mk, u.permit, true, 'ACTIVE', $2::jsonb, now(), now()
         FROM unnest($3::uuid[], $4::text[], $5::text[], $6::text[]) AS u(id, nm, mk, permit)`,
      [REGULATORY_TYPE, tags, ids, names, makers, permits]);
    await qr.query(
      `UPDATE product_candidates pc SET matched_product_master_id=u.mid, candidate_status='approved_new_master', reviewed_at=now(), updated_at=now()
         FROM unnest($1::uuid[], $2::uuid[]) AS u(cid, mid) WHERE pc.id=u.cid`,
      [candIds, masterForCand]);
    await qr.query(
      `INSERT INTO shared_product_descriptions (id, master_id, content, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
       SELECT u.id, u.mid, u.content, $1, u.refid, 'canonical', u.lang, 'STORE', now(), now()
         FROM unnest($2::uuid[], $3::uuid[], $4::text[], $5::uuid[], $6::text[]) AS u(id, mid, content, refid, lang)`,
      [SPD_SOURCE_TYPE, spdIds, spdMaster, spdContent, spdRef, spdLang]);

    // ── 사후검증 (트랜잭션 내) ──
    const v: Record<string, number> = {};
    v.masters = (await qr.query(`SELECT count(*)::int c FROM product_masters WHERE id = ANY($1)`, [ids]))[0].c;
    v.spdKo = (await qr.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='ko' AND description_type='STORE' AND status='canonical'`, [ids]))[0].c;
    v.spdEn = (await qr.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='en' AND description_type='STORE' AND status='canonical'`, [ids]))[0].c;
    v.canonicalDup = (await qr.query(`SELECT count(*)::int c FROM (SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions WHERE master_id = ANY($1) AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) x`, [ids]))[0].c;
    v.candidatesLinked = (await qr.query(`SELECT count(*)::int c FROM product_candidates WHERE matched_product_master_id = ANY($1) AND candidate_status='approved_new_master'`, [ids]))[0].c;
    v.spdRefLinked = (await qr.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND source_ref_id = ANY($2)`, [ids, candIds]))[0].c;
    const verifyPass = v.masters === EXPECT && v.spdKo === EXPECT && v.spdEn === EXPECT && v.canonicalDup === 0 && v.candidatesLinked === EXPECT && v.spdRefLinked === EXPECT * 2;

    const report = {
      mode: APPLY ? 'apply' : 'dry-run(exec+rollback)',
      target: EXPECT, preloadChecks: checks,
      planned: { ...planned, totalWrites },
      expectedWrites: { product_masters: EXPECT, product_candidates_update: EXPECT, shared_product_descriptions: EXPECT * 2, total: EXPECT * 4 },
      fixedValues: { regulatory_type: REGULATORY_TYPE, mfds_permit_number: 'STTEMNT_NO', description_type: 'STORE', status: 'canonical', source_type: SPD_SOURCE_TYPE, barcode: 'NULL' },
      sampleSanitize: sample,
      postVerify: v, postVerifyPass: verifyPass,
    } as Record<string, unknown>;

    if (!verifyPass) {
      await qr.rollbackTransaction();
      report.result = 'POST_VERIFY_FAIL → ROLLBACK';
      console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END');
      process.exit(2);
    }

    if (!APPLY) {
      await qr.rollbackTransaction();
      report.result = 'DRY-RUN OK → ROLLBACK (DB write 0)';
      fs.writeFileSync(`${SP}/hff-vd-dryrun-plan.json`, JSON.stringify({ planned, expectedWrites: report.expectedWrites, checks, postVerify: v }, null, 2));
      console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END');
      return;
    }
    fs.writeFileSync(`${SP}/hff-vd-apply-rollback-manifest.json`, JSON.stringify({ createdMasters: ids, createdSpd: spdIds, candIds, snapshot }, null, 2));
    await qr.commitTransaction();
    report.result = 'COMMIT 완료';
    console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END');
  } catch (e) {
    try { await qr.rollbackTransaction(); } catch { /* already rolled back */ }
    throw e;
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

main().catch((e) => { console.error('[hff-vd-store-canonical-apply] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
