/**
 * HFF 유산균 **고형** 그룹 — STORE 설명서 canonical 적재 (env 파라미터화 · dry-run 기본 · --apply 이중게이트)
 *
 * WO-O4O-HFF-PROBIOTICS-LOAD-PREP-CONSOLIDATION-V1 §2 의 G2~G5(68건) 실행용.
 * hff-b3-store-canonical-apply.ts(G1 226) 계약을 **동일하게** 재사용하되, loadTargets/TARGET/tags/게이트를
 * env 로 파라미터화 — 그룹마다 thin 변형을 새로 만들지 않는다(같은 계약, 입력만 교체).
 * **고형 전용**(grounding.declaredCfu/serving/declaredAmount). 액상은 hff-liq-store-canonical-apply.ts.
 *
 *   status='canonical' · description_type='STORE' · source_type='o4o_hff_generated' · source_ref_id=candidate.id
 *   canonical 불변식 = DB partial-unique (master_id, description_type, coalesce(language,'ko')) where canonical
 *   regulatory_type='건강기능식품' · barcode NULL · mfds_permit_number=STTEMNT_NO
 *
 * 필수 env:
 *   HFF_APPLY_FILES   쉼표구분 데이터 파일 basename (확장자 없이). 예: hff-probiotics-kw-cp02,...cp03,...cp04
 *   HFF_APPLY_TARGET  기대 건수(파일 합계와 일치해야 함)
 *   HFF_APPLY_TAG     batch 태그. 예: batch:probiotics-kids-womens
 * 선택 env:
 *   HFF_APPLY_ROLLBACK  롤백 매니페스트 basename(기본: hff-solid-<tagslug>-apply-rollback-manifest)
 *   HFF_DATA_DIR / HFF_SCRATCH_DIR  경로 override
 *
 * Usage (예: G4 KW-확대 46):
 *   dry-run: HFF_APPLY_FILES=hff-probiotics-kw-cp02,hff-probiotics-kw-cp03,hff-probiotics-kw-cp04 \
 *            HFF_APPLY_TARGET=46 HFF_APPLY_TAG=batch:probiotics-kids-womens \
 *            PROXY_PORT=5442 npx tsx src/scripts/hff-probiotics-solid-store-canonical-apply.ts
 *   apply  : HFF_SOLID_CANONICAL_APPLY_CONFIRM=YES <위 env> PROXY_PORT=5442 npx tsx ... --apply
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import type { GuardProductInput } from '../modules/content-guard/product-description-guard.types.js';
import { sanitizeDescriptionHtml } from '../modules/neture/utils/sanitize-description-html.util.js';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_SOLID_CANONICAL_APPLY_CONFIRM === 'YES';
const PROXY_HOST = process.env.PROXY_HOST ?? '127.0.0.1';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5442', 10);
const SOURCE_LABEL = 'MFDS_HEALTH_FUNCTIONAL_FOOD';
const SPD_SOURCE_TYPE = 'o4o_hff_generated';
const REGULATORY_TYPE = '건강기능식품';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const DATA = process.env.HFF_DATA_DIR ?? path.join(REPO_ROOT, 'docs/checks/data/product-description-guard');
const SP = process.env.HFF_SCRATCH_DIR ?? path.join(REPO_ROOT, 'scratchpad');

const FILES = (process.env.HFF_APPLY_FILES ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const TARGET = parseInt(process.env.HFF_APPLY_TARGET ?? '', 10);
const TAG = (process.env.HFF_APPLY_TAG ?? '').trim();
const ROLLBACK = process.env.HFF_APPLY_ROLLBACK ?? `hff-solid-${TAG.replace(/[^a-z0-9]+/gi, '-')}-apply-rollback-manifest`;

function loadTargets(): GuardProductInput[] {
  const out: GuardProductInput[] = [];
  for (const f of FILES) out.push(...JSON.parse(fs.readFileSync(path.join(DATA, `${f}.json`), 'utf8')));
  return out;
}

async function main(): Promise<void> {
  if (!FILES.length || !Number.isInteger(TARGET) || !TAG)
    throw new Error('ENV_REQUIRED: HFF_APPLY_FILES · HFF_APPLY_TARGET · HFF_APPLY_TAG 필수');
  if (APPLY && !CONFIRM) throw new Error('APPLY_BLOCKED: --apply 는 HFF_SOLID_CANONICAL_APPLY_CONFIRM=YES 필요');
  fs.mkdirSync(SP, { recursive: true });

  const items = loadTargets();
  if (items.length !== TARGET) throw new Error(`대상 수 불일치: ${items.length} (기대 ${TARGET}) files=${FILES.join(',')}`);

  // ── 가드 A: 파일 레벨 재검증 (최신 Guard). 고형 grounding 완전성 ──
  let blocked = 0, review = 0, missDraft = 0, missGround = 0, liqMixed = 0;
  const reviewRules: Record<string, number> = {};
  for (const it of items) {
    if ((it as any).liquidGrounding) liqMixed++; // 고형 스크립트에 액상 혼입 방지
    const r = runGuard(it, { phase: 'all' });
    if (r.overallStatus === 'BLOCKED') blocked++;
    if (r.overallStatus === 'REVIEW_REQUIRED') { review++; for (const f of r.findings) if (f.status === 'REVIEW_REQUIRED') reviewRules[f.ruleId] = (reviewRules[f.ruleId] ?? 0) + 1; }
    if (!it.drafts?.ko?.trim() || !it.drafts?.en?.trim()) missDraft++;
    const g: any = (it as any).grounding;
    if (!g?.declaredCfu || !g?.serving || !g?.declaredAmount) missGround++;
  }
  if (liqMixed) throw new Error(`LIQUID_MIXED ${liqMixed}: 고형 스크립트에 액상(liquidGrounding) 혼입 — hff-liq-store-canonical-apply.ts 사용`);
  if (blocked || missDraft || missGround) throw new Error(`GUARD_FAIL blocked=${blocked} draft=${missDraft} ground=${missGround}`);
  console.log(`[가드A] ${TAG} 파일 ${TARGET}: BLOCKED ${blocked} · REVIEW ${review} · draft결손 ${missDraft} · grounding결손 ${missGround} · REVIEW rule ${JSON.stringify(reviewRules)}`);

  const stmts = items.map((it) => String((it as any).statementNo).trim());
  if (new Set(stmts).size !== TARGET) throw new Error(`신고번호 중복(파일): 유일 ${new Set(stmts).size}`);

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
    // ── 가드 B: candidate 존재·1:1·미승격 ──
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

    // ── 계획 구성 ──
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
    const report: any = { mode: APPLY ? 'apply' : 'dry-run', tag: TAG, target: TARGET, files: FILES, guard: { blocked, review, reviewRules, missDraft, missGround, candMatch: cands.length, masterDup: dup.length }, planned: { ...planned, totalWrites: planned.masters + planned.candidateLinks + planned.spdKo + planned.spdEn }, sampleSanitize: sample };

    if (!APPLY) {
      fs.writeFileSync(`${SP}/${ROLLBACK.replace('rollback-manifest', 'dryrun-plan')}.json`, JSON.stringify({ tag: TAG, planned, sample, outcomes: outcomes.slice(0, 5) }, null, 2));
      await qr.rollbackTransaction();
      report.verify = '(dry-run: INSERT 미실행, 트랜잭션 롤백, DB write 0)';
      console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END');
      return;
    }

    // ── APPLY: 3 bulk statement ──
    const tags = JSON.stringify(['import:mfds-hff', TAG, 'wo:hff-store-canonical']);
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

    if (v.masters !== TARGET || v.spdKo !== TARGET || v.spdEn !== TARGET || v.canonicalDup !== 0 || v.candidatesLinked !== TARGET) {
      await qr.rollbackTransaction();
      console.log('사후검증 실패 -> ROLLBACK', JSON.stringify(v));
      process.exit(2);
    }
    fs.writeFileSync(`${SP}/${ROLLBACK}.json`, JSON.stringify({ tag: TAG, createdMasters: ids, createdSpd: spdIds, candIds, snapshot, outcomes }, null, 2));
    await qr.commitTransaction();
    console.log(`COMMIT 완료 · 롤백 매니페스트 → scratchpad/${ROLLBACK}.json`);
    console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END');
  } catch (e) {
    try { await qr.rollbackTransaction(); } catch { /* already rolled back */ }
    throw e;
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

main().catch((e) => { console.error('[hff-probiotics-solid-store-canonical-apply] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
