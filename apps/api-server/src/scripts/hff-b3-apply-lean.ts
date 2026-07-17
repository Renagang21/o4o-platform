/**
 * HFF 유산균 Batch 003 226건 — STORE canonical 적재 (경량: guard/jsdom 미로드).
 *   저메모리 환경(병렬 세션 다수) V8 Zone OOM 회피용. b3 계약 동일.
 *   전제(별도 검증 완료): 226 최신 Guard BLOCKED 0·파편 0·물 0(독립검증) · sanitize 무손실 byte-동일(452/452).
 *   → content = raw 초안 그대로(sanitize no-op 확인), guard 미import.
 *   dry-run: PROXY_PORT=54xx npx tsx src/scripts/hff-b3-apply-lean.ts
 *   apply  : HFF_B3_CANONICAL_APPLY_CONFIRM=YES PROXY_PORT=54xx npx tsx ... --apply
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_B3_CANONICAL_APPLY_CONFIRM === 'YES';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5461', 10);
const SOURCE_LABEL = 'MFDS_HEALTH_FUNCTIONAL_FOOD';
const SPD_SOURCE_TYPE = 'o4o_hff_generated';
const REGULATORY_TYPE = '건강기능식품';
const TARGET = 226;
const SP = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/55e4dd9c-cf70-462e-8114-188f6c53d473/scratchpad';
const DATA = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard';

interface Item { statementNo: string; productName: string; manufacturer: string; drafts: { ko: string; en: string } }
function loadTargets(): Item[] {
  const out: Item[] = [];
  for (let i = 1; i <= 12; i++) out.push(...JSON.parse(fs.readFileSync(`${DATA}/hff-probiotics-prod-c-cp${String(i).padStart(2, '0')}.json`, 'utf8')));
  return out;
}

async function main(): Promise<void> {
  if (APPLY && !CONFIRM) throw new Error('APPLY_BLOCKED: --apply 는 HFF_B3_CANONICAL_APPLY_CONFIRM=YES 필요');
  const items = loadTargets();
  if (items.length !== TARGET) throw new Error(`대상 수 불일치: ${items.length} (기대 ${TARGET})`);
  const missDraft = items.filter((it) => !it.drafts?.ko?.trim() || !it.drafts?.en?.trim()).length;
  if (missDraft) throw new Error(`DRAFT_INCOMPLETE ${missDraft}`);
  const stmts = items.map((it) => String(it.statementNo).trim());
  if (new Set(stmts).size !== TARGET) throw new Error(`신고번호 중복(파일): 유일 ${new Set(stmts).size}`);
  console.log(`[경량] 파일 ${TARGET}: draft결손 ${missDraft} · 신고번호 유일 ${new Set(stmts).size} · (Guard BLOCKED 0·파편 0·물 0·sanitize 무손실은 독립검증 완료)`);

  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port: PROXY_PORT,
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 3, connectionTimeoutMillis: 15000, statement_timeout: 120000 },
  });
  await ds.initialize();
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    // 가드 B: candidate 226 존재·1:1·미승격
    const cands: Array<{ stmt: string; id: string; matched: string | null; status: string }> = await qr.query(
      `SELECT raw_payload::jsonb->'source'->>'STTEMNT_NO' AS stmt, id, matched_product_master_id AS matched, candidate_status AS status
         FROM product_candidates WHERE source_label=$1 AND deleted_at IS NULL AND raw_payload::jsonb->'source'->>'STTEMNT_NO' = ANY($2)`,
      [SOURCE_LABEL, stmts]);
    const byStmt = new Map<string, typeof cands>();
    for (const c of cands) { const a = byStmt.get(c.stmt) ?? []; a.push(c); byStmt.set(c.stmt, a); }
    const missing = stmts.filter((s) => !byStmt.has(s));
    const ambiguous = stmts.filter((s) => (byStmt.get(s)?.length ?? 0) > 1);
    const promoted = cands.filter((c) => c.matched != null);
    if (missing.length) throw new Error(`CANDIDATE_MISSING ${missing.length}: ${missing.slice(0, 3)}`);
    if (ambiguous.length) throw new Error(`CANDIDATE_AMBIGUOUS ${ambiguous.length}`);
    if (promoted.length) throw new Error(`ALREADY_PROMOTED ${promoted.length}`);
    // 가드 C: permit master 부재
    const dup: Array<{ p: string }> = await qr.query(`SELECT mfds_permit_number AS p FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts]);
    if (dup.length) throw new Error(`MASTER_EXISTS ${dup.length}: ${dup.slice(0, 3).map((x) => x.p)}`);

    const ids: string[] = [], names: string[] = [], makers: string[] = [], permits: string[] = [];
    const candIds: string[] = [], masterForCand: string[] = [];
    const spdIds: string[] = [], spdMaster: string[] = [], spdContent: string[] = [], spdRef: string[] = [], spdLang: string[] = [];
    for (const it of items) {
      const stmt = String(it.statementNo).trim();
      const cand = byStmt.get(stmt)![0];
      const masterId = randomUUID();
      ids.push(masterId); names.push(it.productName); makers.push(it.manufacturer); permits.push(stmt);
      candIds.push(cand.id); masterForCand.push(masterId);
      for (const [lang, content] of [['ko', it.drafts.ko], ['en', it.drafts.en]] as const) {
        spdIds.push(randomUUID()); spdMaster.push(masterId); spdContent.push(content); spdRef.push(cand.id); spdLang.push(lang);
      }
    }
    const planned = { masters: ids.length, candidateLinks: candIds.length, spdKo: spdLang.filter((l) => l === 'ko').length, spdEn: spdLang.filter((l) => l === 'en').length };
    const report: any = { mode: APPLY ? 'apply' : 'dry-run', target: TARGET, candMatch: cands.length, masterDup: dup.length, planned: { ...planned, totalWrites: planned.masters + planned.candidateLinks + planned.spdKo + planned.spdEn } };

    if (!APPLY) {
      await qr.rollbackTransaction();
      report.verify = '(dry-run: INSERT 미실행, 롤백, DB write 0)';
      console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END');
      return;
    }

    const tags = JSON.stringify(['import:mfds-hff', 'batch:probiotics-prod-003', 'wo:hff-continuous-e2e']);
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

    const v: any = {};
    v.masters = (await qr.query(`SELECT count(*)::int c FROM product_masters WHERE id = ANY($1)`, [ids]))[0].c;
    v.spdKo = (await qr.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='ko' AND description_type='STORE' AND status='canonical'`, [ids]))[0].c;
    v.spdEn = (await qr.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='en' AND description_type='STORE' AND status='canonical'`, [ids]))[0].c;
    v.canonicalDup = (await qr.query(`SELECT count(*)::int c FROM (SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions WHERE master_id = ANY($1) AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) x`, [ids]))[0].c;
    v.candidatesLinked = (await qr.query(`SELECT count(*)::int c FROM product_candidates WHERE matched_product_master_id = ANY($1) AND candidate_status='approved_new_master'`, [ids]))[0].c;
    report.verify = v;
    if (v.masters !== TARGET || v.spdKo !== TARGET || v.spdEn !== TARGET || v.canonicalDup !== 0 || v.candidatesLinked !== TARGET) {
      await qr.rollbackTransaction();
      console.log('❌ 사후검증 실패 → ROLLBACK', JSON.stringify(v)); process.exit(2);
    }
    fs.writeFileSync(`${SP}/hff-b3-rollback-manifest.json`, JSON.stringify({ createdMasters: ids, createdSpd: spdIds, candIds }, null, 1));
    await qr.commitTransaction();
    console.log('✅ COMMIT 완료 · 롤백 → scratchpad/hff-b3-rollback-manifest.json');
    console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END');
  } catch (e) {
    try { await qr.rollbackTransaction(); } catch { /* ignore */ }
    throw e;
  } finally {
    await qr.release(); await ds.destroy();
  }
}
main().catch((e) => { console.error('[hff-b3-apply-lean] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
