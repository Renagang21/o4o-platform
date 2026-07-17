/**
 * HFF 비타민 C 100건 — STORE 설명서 canonical 적재 (dry-run 기본 · --apply env 이중게이트)
 *
 * 대상: 비타민 C 단일형 100건 (hff-vitamin-c-20/30/60/100.json). heldOut(ATOMY) 제외.
 * 유산균 192 경로(hff-store-description-canonical-apply.ts) 계약 동일. grounding=declaredAmount(CFU 아님).
 * 정규 계약 준수(선례): drug-master-promotion-apply(master) · markCandidatePromoted(candidate) ·
 *   easy-drug-shared-description-derive(SPD raw insert + sanitizeDescriptionHtml).
 *   status='canonical' · description_type='STORE' · source_type='o4o_hff_generated' · source_ref_id=candidate.id
 *   canonical 불변식 = DB partial-unique (master_id, description_type, coalesce(language,'ko')) where canonical
 *   regulatory_type='건강기능식품'(기존 관례), barcode NULL(무바코드), mfds_permit_number=STTEMNT_NO
 *
 * 배치 쿼리(왕복 최소화): preload 2 SELECT + apply 3 bulk(unnest) statement. 단일 트랜잭션.
 * 접속: 로컬은 Cloud SQL Auth Proxy(127.0.0.1:PROXY_PORT)만.
 *
 * Usage:
 *   dry-run: PROXY_PORT=5435 npx tsx src/scripts/hff-store-description-canonical-apply.ts
 *   apply  : HFF_STORE_CANONICAL_APPLY_CONFIRM=YES PROXY_PORT=5435 npx tsx ... --apply
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import type { GuardProductInput } from '../modules/content-guard/product-description-guard.types.js';
import { sanitizeDescriptionHtml } from '../modules/neture/utils/sanitize-description-html.util.js';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_VC_CANONICAL_APPLY_CONFIRM === 'YES';
const PROXY_HOST = process.env.PROXY_HOST ?? '127.0.0.1';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5435', 10);
const SOURCE_LABEL = 'MFDS_HEALTH_FUNCTIONAL_FOOD';
const SPD_SOURCE_TYPE = 'o4o_hff_generated';
const REGULATORY_TYPE = '건강기능식품';
const SP = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/55e4dd9c-cf70-462e-8114-188f6c53d473/scratchpad';
const DATA = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard';

function loadTargets(): GuardProductInput[] {
  const out: GuardProductInput[] = [];
  for (const p of ['20', '30', '60', '100']) {
    out.push(...JSON.parse(fs.readFileSync(`${DATA}/hff-vitamin-c-${p}.json`, 'utf8')));
  }
  return out;
}

async function main(): Promise<void> {
  if (APPLY && !CONFIRM) throw new Error('APPLY_BLOCKED: --apply 는 HFF_VC_CANONICAL_APPLY_CONFIRM=YES 필요');

  const items = loadTargets();
  if (items.length !== 100) throw new Error(`대상 수 불일치: ${items.length} (기대 100)`);

  // ── 가드 A: 파일 레벨 재검증 ──
  let blocked = 0, review = 0, missDraft = 0, missGround = 0;
  for (const it of items) {
    const r = runGuard(it, { phase: 'all' });
    if (r.overallStatus === 'BLOCKED') blocked++;
    if (r.overallStatus === 'REVIEW_REQUIRED') review++;
    if (!it.drafts?.ko?.trim() || !it.drafts?.en?.trim()) missDraft++;
    const g: any = (it as any).grounding;
    if (!g?.declaredAmount || !g?.serving) missGround++; // 비타민 C: declaredAmount(함량) + serving
  }
  if (blocked || missDraft || missGround) throw new Error(`GUARD_FAIL blocked=${blocked} draft=${missDraft} ground=${missGround}`);
  console.log(`[가드A] 파일 100: BLOCKED ${blocked} · REVIEW ${review} · draft결손 ${missDraft} · grounding결손 ${missGround}`);

  const stmts = items.map((it) => String((it as any).statementNo).trim());
  if (new Set(stmts).size !== 100) throw new Error(`신고번호 중복(파일): 유일 ${new Set(stmts).size}`);

  const ds = new DataSource({
    type: 'postgres', host: PROXY_HOST, port: PROXY_PORT,
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'], ssl: false,
    extra: { max: 3, connectionTimeoutMillis: 15000, query_timeout: 60000, statement_timeout: 60000 },
  });
  await ds.initialize();

  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    // ── 가드 B: candidate 100 존재·1:1·미승격 ──
    const cands: Array<{ stmt: string; id: string; matched: string | null; status: string }> = await qr.query(
      `SELECT raw_payload::jsonb->'source'->>'STTEMNT_NO' AS stmt, id, matched_product_master_id AS matched, candidate_status AS status
         FROM product_candidates
        WHERE source_label=$1 AND deleted_at IS NULL AND raw_payload::jsonb->'source'->>'STTEMNT_NO' = ANY($2)`,
      [SOURCE_LABEL, stmts],
    );
    const byStmt = new Map<string, typeof cands>();
    for (const c of cands) { const a = byStmt.get(c.stmt) ?? []; a.push(c); byStmt.set(c.stmt, a); }
    const missing = stmts.filter((s) => !byStmt.has(s));
    const ambiguous = stmts.filter((s) => (byStmt.get(s)?.length ?? 0) > 1);
    const alreadyPromoted = cands.filter((c) => c.matched != null);
    if (missing.length) throw new Error(`CANDIDATE_MISSING ${missing.length}: ${missing.slice(0, 3)}`);
    if (ambiguous.length) throw new Error(`CANDIDATE_AMBIGUOUS ${ambiguous.length}: ${ambiguous.slice(0, 3)}`);
    if (alreadyPromoted.length) throw new Error(`ALREADY_PROMOTED ${alreadyPromoted.length}`);

    // ── 가드 C: permit master 부재 ──
    const dup: Array<{ p: string }> = await qr.query(
      `SELECT mfds_permit_number AS p FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts]);
    if (dup.length) throw new Error(`MASTER_EXISTS ${dup.length}: ${dup.slice(0, 3).map((x) => x.p)}`);

    // ── 계획 구성 (client-side UUID) ──
    const ids: string[] = [], names: string[] = [], makers: string[] = [], permits: string[] = [];
    const candIds: string[] = [], masterForCand: string[] = [];
    const spdIds: string[] = [], spdMaster: string[] = [], spdContent: string[] = [], spdRef: string[] = [], spdLang: string[] = [];
    const snapshot: Array<{ candidateId: string; stmt: string; prev_status: string }> = [];
    const outcomes: Array<{ stmt: string; name: string; masterId: string; candidateId: string }> = [];
    let sample: any = null;
    for (const it of items) {
      const stmt = String((it as any).statementNo).trim();
      const cand = byStmt.get(stmt)![0];
      const masterId = randomUUID();
      ids.push(masterId); names.push(it.productName); makers.push((it as any).manufacturer); permits.push(stmt);
      candIds.push(cand.id); masterForCand.push(masterId);
      const koC = sanitizeDescriptionHtml(it.drafts.ko), enC = sanitizeDescriptionHtml(it.drafts.en);
      if (!koC.trim() || !enC.trim()) throw new Error(`SANITIZE_EMPTY ${stmt}`);
      if (!sample) sample = { name: it.productName, koBefore: it.drafts.ko.length, koAfter: koC.length, enBefore: it.drafts.en.length, enAfter: enC.length };
      for (const [lang, content] of [['ko', koC], ['en', enC]] as const) {
        spdIds.push(randomUUID()); spdMaster.push(masterId); spdContent.push(content); spdRef.push(cand.id); spdLang.push(lang);
      }
      snapshot.push({ candidateId: cand.id, stmt, prev_status: cand.status });
      outcomes.push({ stmt, name: it.productName, masterId, candidateId: cand.id });
    }

    const planned = { masters: ids.length, candidateLinks: candIds.length, spdKo: spdLang.filter((l) => l === 'ko').length, spdEn: spdLang.filter((l) => l === 'en').length };
    const report: any = { mode: APPLY ? 'apply' : 'dry-run', target: 100, guard: { blocked, review, missDraft, missGround, candMatch: cands.length, masterDup: dup.length }, planned: { ...planned, totalWrites: planned.masters + planned.candidateLinks + planned.spdKo + planned.spdEn }, sampleSanitize: sample };

    if (!APPLY) {
      fs.writeFileSync(`${SP}/hff-apply-dryrun-plan.json`, JSON.stringify({ planned, sample, outcomes: outcomes.slice(0, 5) }, null, 2));
      await qr.rollbackTransaction();
      report.verify = '(dry-run: INSERT 미실행, 트랜잭션 롤백, DB write 0)';
      console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END');
      return;
    }

    // ── APPLY: 3 bulk statement ──
    const tags = JSON.stringify(['import:mfds-hff', 'batch:probiotics-prod-001', 'wo:hff-store-canonical']);
    await qr.query(
      `INSERT INTO product_masters (id, barcode, regulatory_type, regulatory_name, name, manufacturer_name, mfds_permit_number, is_mfds_verified, status, tags, created_at, updated_at)
       SELECT u.id, NULL, $1, u.nm, u.nm, u.mk, u.permit, true, 'ACTIVE', $2::jsonb, now(), now()
         FROM unnest($3::uuid[], $4::text[], $5::text[], $6::text[]) AS u(id, nm, mk, permit)`,
      [REGULATORY_TYPE, tags, ids, names, makers, permits],
    );
    await qr.query(
      `UPDATE product_candidates pc SET matched_product_master_id=u.mid, candidate_status='approved_new_master', reviewed_at=now(), updated_at=now()
         FROM unnest($1::uuid[], $2::uuid[]) AS u(cid, mid) WHERE pc.id=u.cid`,
      [candIds, masterForCand],
    );
    await qr.query(
      `INSERT INTO shared_product_descriptions (id, master_id, content, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
       SELECT u.id, u.mid, u.content, $1, u.refid, 'canonical', u.lang, 'STORE', now(), now()
         FROM unnest($2::uuid[], $3::uuid[], $4::text[], $5::uuid[], $6::text[]) AS u(id, mid, content, refid, lang)`,
      [SPD_SOURCE_TYPE, spdIds, spdMaster, spdContent, spdRef, spdLang],
    );

    // ── 사후검증(트랜잭션 내) ──
    const v: any = {};
    v.masters = (await qr.query(`SELECT count(*)::int c FROM product_masters WHERE id = ANY($1)`, [ids]))[0].c;
    v.spdKo = (await qr.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='ko' AND description_type='STORE' AND status='canonical'`, [ids]))[0].c;
    v.spdEn = (await qr.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='en' AND description_type='STORE' AND status='canonical'`, [ids]))[0].c;
    v.canonicalDup = (await qr.query(`SELECT count(*)::int c FROM (SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions WHERE master_id = ANY($1) AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) x`, [ids]))[0].c;
    v.candidatesLinked = (await qr.query(`SELECT count(*)::int c FROM product_candidates WHERE matched_product_master_id = ANY($1) AND candidate_status='approved_new_master'`, [ids]))[0].c;
    report.verify = v;

    if (v.masters !== 100 || v.spdKo !== 100 || v.spdEn !== 100 || v.canonicalDup !== 0 || v.candidatesLinked !== 100) {
      await qr.rollbackTransaction();
      console.log('❌ 사후검증 실패 → ROLLBACK', JSON.stringify(v));
      process.exit(2);
    }
    fs.writeFileSync(`${SP}/hff-apply-rollback-manifest.json`, JSON.stringify({ createdMasters: ids, createdSpd: spdIds, candIds, snapshot, outcomes }, null, 2));
    await qr.commitTransaction();
    console.log('✅ COMMIT 완료 · 롤백 매니페스트 → scratchpad/hff-apply-rollback-manifest.json');
    console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END');
  } catch (e) {
    try { await qr.rollbackTransaction(); } catch { /* already rolled back */ }
    throw e;
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

main().catch((e) => { console.error('[hff-store-canonical-apply] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
