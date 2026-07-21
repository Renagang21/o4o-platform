/**
 * HFF single-lutein 31 — RETIRE+REPLACE 적재 (dry-run 기본 · --apply 이중게이트)
 *   dry-run: PROXY_PORT=5442 npx tsx src/scripts/hff-lut31-retire-replace-apply.ts --targets <a.json,b.json,...> --queue <queue.json>
 *   apply  : HFF_LUT31_APPLY_CONFIRM=YES PROXY_PORT=5442 npx tsx ... --targets ... --queue ... --apply
 *
 * 설계: CHECK-O4O-HFF-SINGLE-LINE-ABSORPTION-CORRECTION-DESIGN-A-V1 §4~§6
 * 정본: hff-lut31-final-correction-queue.json (Agent A, commit 8761bdea7)
 *
 * 계약(기존 nutrient-apply 와 반대 — 신규 master 를 만들지 않는다):
 *   - 기존 단일 STORE canonical(ko+en) → status='deprecated' 은퇴
 *   - verifiedFullSet 복합형 STORE canonical(ko+en) 신규 INSERT
 *   - master_id 불변 · product_masters write 0 · product_candidates write 0 · source_ref_id 보존
 *   - 은퇴+신규를 단일 트랜잭션에서 원자적으로(이중 canonical 금지, postVerify canonicalDup=0)
 * write = 제품당 4 (UPDATE 2 + INSERT 2) = 31 × 4 = 124
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import type { GuardProductInput } from '../modules/content-guard/product-description-guard.types.js';
import { sanitizeDescriptionHtml } from '../modules/neture/utils/sanitize-description-html.util.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const TARGETS = arg('targets'); const QUEUE = arg('queue');
if (!TARGETS || !QUEUE) throw new Error('--targets <json[,json...]> --queue <queue.json> 필요');
const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_LUT31_APPLY_CONFIRM === 'YES';
const PROXY_HOST = process.env.PROXY_HOST ?? '127.0.0.1';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5442', 10);
const SPD_SOURCE_TYPE = 'o4o_hff_generated';
const RETIRED_STATUS = 'deprecated';
const SP = process.env.HFF_APPLY_MANIFEST_DIR ?? path.join(os.tmpdir(), 'hff-apply-manifests');
fs.mkdirSync(SP, { recursive: true });

interface QueueItem { statementNo: string; productName: string; verifiedFullSet: string[]; action: string; verdict: string }
const sig = (v: Iterable<string>): string => [...new Set(v)].sort().join('+');

async function main(): Promise<void> {
  if (APPLY && !CONFIRM) throw new Error('APPLY_BLOCKED: --apply 는 HFF_LUT31_APPLY_CONFIRM=YES 필요');

  // ── 입력: 정본 큐 + 생성 산출(복수 그룹)
  const queue = JSON.parse(fs.readFileSync(QUEUE, 'utf8')) as QueueItem[];
  const items: GuardProductInput[] = TARGETS.split(',').flatMap((f) => JSON.parse(fs.readFileSync(f.trim(), 'utf8')) as GuardProductInput[]);
  const EXPECT = queue.length;
  const checks: Record<string, number | string> = {};

  // ── #1 정본 대조: 산출 == 큐 (큐 밖 제품 혼입 0 · 누락 0)
  const qStmts = new Set(queue.map((q) => String(q.statementNo).trim()));
  const stmts = items.map((it) => String((it as unknown as { statementNo: string }).statementNo).trim());
  if (new Set(stmts).size !== stmts.length) throw new Error(`DUP_IN_TARGET: 유일 ${new Set(stmts).size}/${stmts.length}`);
  const outside = stmts.filter((s) => !qStmts.has(s));
  const missingFromTarget = [...qStmts].filter((s) => !stmts.includes(s));
  checks['#1 정본대조'] = `target ${items.length}/${EXPECT} · 큐밖 ${outside.length} · 누락 ${missingFromTarget.length}`;
  if (outside.length) throw new Error(`OUTSIDE_QUEUE ${outside.length}: ${outside.slice(0, 3)}`);
  if (missingFromTarget.length) throw new Error(`MISSING_FROM_TARGET ${missingFromTarget.length}: ${missingFromTarget.slice(0, 3)}`);
  if (items.length !== EXPECT) throw new Error(`TARGET_COUNT ${items.length} != ${EXPECT}`);

  // ── #2 큐 무결성: 전건 PASS · RETIRE_REPLACE
  const badVerdict = queue.filter((q) => q.verdict !== 'PASS' || q.action !== 'RETIRE_REPLACE');
  checks['#2 큐 verdict/action'] = badVerdict.length ? `BAD ${badVerdict.length}` : 'PASS31/RETIRE_REPLACE31';
  if (badVerdict.length) throw new Error(`QUEUE_VERDICT ${badVerdict.length}`);

  // ── #3 Guard: BLOCKED 0 · ko/en draft 존재
  let blocked = 0, review = 0, missDraft = 0;
  for (const it of items) {
    const r = runGuard(it, { phase: 'all' });
    if (r.overallStatus === 'BLOCKED') blocked++;
    if (r.overallStatus === 'REVIEW_REQUIRED') review++;
    if (!it.drafts?.ko?.trim() || !it.drafts?.en?.trim()) missDraft++;
  }
  checks['#3 guard'] = `BLOCKED ${blocked} · REVIEW ${review} · draft결측 ${missDraft}`;
  if (blocked || missDraft) throw new Error(`GUARD_FAIL blocked=${blocked} draft=${missDraft}`);

  // ── #4 그룹 정합: 생성 원료집합 == 큐 verifiedFullSet
  const qGroup = new Map(queue.map((q) => [String(q.statementNo).trim(), sig(q.verifiedFullSet)]));
  const groupMismatch: string[] = [];
  const groupDist: Record<string, number> = {};
  for (const it of items) {
    const s = String((it as unknown as { statementNo: string }).statementNo).trim();
    const ings = (it as unknown as { grounding?: { ingredients?: Array<{ key: string }> } }).grounding?.ingredients;
    const derived = ings ? sig(ings.map((g) => g.key)) : null;
    const want = qGroup.get(s)!;
    groupDist[want] = (groupDist[want] ?? 0) + 1;
    if (derived && derived !== want) groupMismatch.push(`${s}: ${derived} != ${want}`);
  }
  checks['#4 그룹정합'] = groupMismatch.length ? `MISMATCH ${groupMismatch.length}` : JSON.stringify(groupDist);
  if (groupMismatch.length) throw new Error(`GROUP_MISMATCH ${groupMismatch.length}: ${groupMismatch.slice(0, 3)}`);

  const ds = new DataSource({ type: 'postgres', host: PROXY_HOST, port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 3, connectionTimeoutMillis: 15000, query_timeout: 180000, statement_timeout: 180000 } });
  await ds.initialize();
  const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
  try {
    // ── #5 master 존재·유일 (신규 생성 금지 — 전건 기존 master 여야 한다)
    const masters: Array<{ permit: string; id: string }> = await qr.query(
      `SELECT mfds_permit_number AS permit, id FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts]);
    const byPermit = new Map<string, string[]>();
    for (const m of masters) { const a = byPermit.get(m.permit) ?? []; a.push(m.id); byPermit.set(m.permit, a); }
    const noMaster = stmts.filter((s) => !byPermit.has(s));
    const dupMaster = stmts.filter((s) => (byPermit.get(s)?.length ?? 0) > 1);
    checks['#5 master'] = `${masters.length} (없음 ${noMaster.length}, 중복 ${dupMaster.length})`;
    if (noMaster.length) throw new Error(`MASTER_MISSING ${noMaster.length}: ${noMaster.slice(0, 3)}`);
    if (dupMaster.length) throw new Error(`MASTER_AMBIGUOUS ${dupMaster.length}`);
    const masterIds = stmts.map((s) => byPermit.get(s)![0]);
    const masterCountBefore = masters.length;

    // ── #6 기존 STORE canonical: 제품당 ko1+en1 정확히 2건 (은퇴 대상)
    const olds: Array<{ id: string; master_id: string; language: string; source_ref_id: string | null }> = await qr.query(
      `SELECT id, master_id, coalesce(language,'ko') AS language, source_ref_id
       FROM shared_product_descriptions
       WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [masterIds]);
    const oldByMaster = new Map<string, typeof olds>();
    for (const o of olds) { const a = oldByMaster.get(o.master_id) ?? []; a.push(o); oldByMaster.set(o.master_id, a); }
    const badShape = masterIds.filter((mid) => {
      const a = oldByMaster.get(mid) ?? [];
      return a.length !== 2 || a.filter((x) => x.language === 'ko').length !== 1 || a.filter((x) => x.language === 'en').length !== 1;
    });
    const noRef = olds.filter((o) => !o.source_ref_id);
    checks['#6 기존canonical'] = `${olds.length} (기대 ${EXPECT * 2}) · 형태이상 ${badShape.length} · ref없음 ${noRef.length}`;
    if (olds.length !== EXPECT * 2) throw new Error(`OLD_CANONICAL_COUNT ${olds.length} != ${EXPECT * 2}`);
    if (badShape.length) throw new Error(`OLD_CANONICAL_SHAPE ${badShape.length}`);
    if (noRef.length) throw new Error(`OLD_SOURCE_REF_NULL ${noRef.length}`);
    const oldIds = olds.map((o) => o.id);

    // ── #7 candidate 링크(불변 확인용 스냅샷)
    const candBefore: Array<{ c: number }> = await qr.query(
      `SELECT count(*)::int c FROM product_candidates WHERE matched_product_master_id = ANY($1) AND candidate_status='approved_new_master'`, [masterIds]);
    checks['#7 candidate(before)'] = candBefore[0].c;
    if (candBefore[0].c !== EXPECT) throw new Error(`CANDIDATE_LINK ${candBefore[0].c} != ${EXPECT}`);

    // ── 신규 복합형 canonical 구성 (master_id·source_ref_id 승계)
    const nIds: string[] = [], nMaster: string[] = [], nContent: string[] = [], nRef: string[] = [], nLang: string[] = [];
    const snapshot: Array<{ stmt: string; masterId: string; retiredSpdIds: string[]; newSpdIds: string[] }> = [];
    let sanitizeEmpty = 0; let sample: unknown = null;
    for (let i = 0; i < items.length; i++) {
      const it = items[i]; const stmt = stmts[i]; const mid = masterIds[i];
      const olds2 = oldByMaster.get(mid)!;
      const refKo = olds2.find((o) => o.language === 'ko')!.source_ref_id!;
      const refEn = olds2.find((o) => o.language === 'en')!.source_ref_id!;
      const koC = sanitizeDescriptionHtml(it.drafts.ko), enC = sanitizeDescriptionHtml(it.drafts.en);
      if (!koC.trim() || !enC.trim()) sanitizeEmpty++;
      if (!sample) sample = { stmt, name: it.productName, koBefore: it.drafts.ko.length, koAfter: koC.length, enBefore: it.drafts.en.length, enAfter: enC.length };
      const newKo = randomUUID(), newEn = randomUUID();
      nIds.push(newKo, newEn); nMaster.push(mid, mid); nContent.push(koC, enC); nRef.push(refKo, refEn); nLang.push('ko', 'en');
      snapshot.push({ stmt, masterId: mid, retiredSpdIds: olds2.map((o) => o.id), newSpdIds: [newKo, newEn] });
    }
    checks['#8 sanitizeEmpty'] = sanitizeEmpty;
    if (sanitizeEmpty) throw new Error(`SANITIZE_EMPTY ${sanitizeEmpty}`);

    // ── 원자적 은퇴 → 신규 (이중 canonical 금지)
    const retired = await qr.query(
      `UPDATE shared_product_descriptions SET status=$2, updated_at=now() WHERE id = ANY($1)`, [oldIds, RETIRED_STATUS]);
    await qr.query(
      `INSERT INTO shared_product_descriptions (id, master_id, content, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
       SELECT u.id, u.mid, u.content, $1, u.refid, 'canonical', u.lang, 'STORE', now(), now()
       FROM unnest($2::uuid[], $3::uuid[], $4::text[], $5::uuid[], $6::text[]) AS u(id, mid, content, refid, lang)`,
      [SPD_SOURCE_TYPE, nIds, nMaster, nContent, nRef, nLang]);
    void retired;

    // ── postVerify
    const v: Record<string, number> = {};
    v.retiredNow = (await qr.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE id = ANY($1) AND status=$2`, [oldIds, RETIRED_STATUS]))[0].c;
    v.newCanonical = (await qr.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE id = ANY($1) AND status='canonical' AND description_type='STORE'`, [nIds]))[0].c;
    v.newKo = (await qr.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE id = ANY($1) AND language='ko'`, [nIds]))[0].c;
    v.newEn = (await qr.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE id = ANY($1) AND language='en'`, [nIds]))[0].c;
    // 제품당 살아있는 STORE canonical 이 정확히 2 (ko1+en1) — 이중 canonical 0
    v.canonicalPerMasterOk = (await qr.query(
      `SELECT count(*)::int c FROM (
         SELECT master_id FROM shared_product_descriptions
         WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
         GROUP BY master_id HAVING count(*)=2 AND count(*) FILTER (WHERE coalesce(language,'ko')='ko')=1 AND count(*) FILTER (WHERE language='en')=1) x`, [masterIds]))[0].c;
    v.canonicalDup = (await qr.query(
      `SELECT count(*)::int c FROM (
         SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions
         WHERE master_id = ANY($1) AND status='canonical' AND deleted_at IS NULL
         GROUP BY 1,2,3 HAVING count(*)>1) x`, [masterIds]))[0].c;
    v.masterCountAfter = (await qr.query(`SELECT count(*)::int c FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts]))[0].c;
    v.candidateAfter = (await qr.query(`SELECT count(*)::int c FROM product_candidates WHERE matched_product_master_id = ANY($1) AND candidate_status='approved_new_master'`, [masterIds]))[0].c;
    v.srcRefPreserved = (await qr.query(
      `SELECT count(*)::int c FROM shared_product_descriptions n
       WHERE n.id = ANY($1) AND n.source_ref_id IN (SELECT unnest($2::uuid[]))`, [nIds, olds.map((o) => o.source_ref_id)]))[0].c;

    const pass = v.retiredNow === EXPECT * 2
      && v.newCanonical === EXPECT * 2 && v.newKo === EXPECT && v.newEn === EXPECT
      && v.canonicalPerMasterOk === EXPECT && v.canonicalDup === 0
      && v.masterCountAfter === masterCountBefore && v.candidateAfter === EXPECT
      && v.srcRefPreserved === EXPECT * 2;

    const report = {
      mode: APPLY ? 'apply' : 'dry-run(exec+rollback)',
      scope: 'single-lutein 31 RETIRE+REPLACE', target: EXPECT, review,
      groups: groupDist,
      preloadChecks: checks,
      expectedWrites: { spd_retire_update: EXPECT * 2, spd_new_insert: EXPECT * 2, product_masters: 0, product_candidates: 0, total: EXPECT * 4 },
      sampleSanitize: sample,
      postVerify: v, postVerifyPass: pass,
    } as Record<string, unknown>;

    if (!pass) { await qr.rollbackTransaction(); report.result = 'POST_VERIFY_FAIL → ROLLBACK'; console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END'); process.exit(2); }
    if (!APPLY) { await qr.rollbackTransaction(); report.result = 'DRY-RUN OK → ROLLBACK (DB write 0)'; console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END'); return; }
    fs.writeFileSync(`${SP}/hff-lut31-retire-replace-rollback-manifest.json`, JSON.stringify({ scope: 'lut31', retiredStatus: RETIRED_STATUS, snapshot }, null, 2));
    await qr.commitTransaction(); report.result = 'COMMIT 완료';
    console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END');
  } catch (e) { try { await qr.rollbackTransaction(); } catch { /* noop */ } throw e; } finally { await qr.release(); await ds.destroy(); }
}
main().catch((e) => { console.error('[lut31-retire-replace] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
