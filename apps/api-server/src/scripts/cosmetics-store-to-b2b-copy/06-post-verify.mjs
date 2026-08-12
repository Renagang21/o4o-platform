/**
 * WO §11·§12 독립 검증 + postVerify — 적용/생성 코드를 import 하지 않는다. read-only.
 * 판정 근거는 적용 전 스냅샷(baseline-store.jsonl)과 지금 DB 를 직접 대조한 결과만 쓴다.
 * 산출: post-verify.json
 */
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { withDb } from '../cosmetics-productmaster-apply-pilot/db.mjs';
import { OUT_DIR, readOut, writeOut } from './lib.mjs';

const plan = readOut('dry-run-plan.json');
const applyResult = readOut('apply-result.json');
const census = readOut('census.json');
const planByStore = new Map(plan.map((p) => [p.storeDescriptionId, p]));

const baseline = new Map();
{
  const rl = createInterface({ input: createReadStream(join(OUT_DIR, 'baseline-store.jsonl'), 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim()) {
      const r = JSON.parse(line);
      baseline.set(r.id, r);
    }
  }
}

const res = { plannedCopy: plan.length, insertedReported: applyResult.inserted, violations: [], samples: [] };
const fail = (k, v) => { res.violations.push(`${k}: ${v}`); };

await withDb(async (q) => {
  const one = async (sql, p) => (await q(sql, p)).rows[0];
  const b2bKo = (a) => `${a}.description_type='B2B' AND ${a}.status='canonical' AND COALESCE(${a}.language,'ko')='ko' AND ${a}.deleted_at IS NULL`;
  const newIds = applyResult.newIds;

  // ── 신규 B2B 실측 ──
  res.newB2bRowsFound = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [newIds])).c;
  if (res.newB2bRowsFound !== plan.length) fail('newB2bRowsFound', `${res.newB2bRowsFound} != ${plan.length}`);

  res.koB2bCanonicalCosmetic = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions b
      JOIN product_masters m ON m.id=b.master_id WHERE m.regulatory_type='COSMETIC' AND ${b2bKo('b')}`)).c;
  res.koB2bCanonicalAll = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions b WHERE ${b2bKo('b')}`)).c;
  res.koB2bCanonicalCosmeticBefore = census.existingKoB2bCosmetic;
  res.koB2bCanonicalAllBefore = census.existingKoB2bAll;
  if (res.koB2bCanonicalCosmetic !== census.existingKoB2bCosmetic + plan.length) {
    fail('koB2bCanonicalCosmetic', `${res.koB2bCanonicalCosmetic} != ${census.existingKoB2bCosmetic} + ${plan.length}`);
  }
  res.existingB2bPreserved = res.koB2bCanonicalAll - plan.length;
  if (res.existingB2bPreserved !== census.existingKoB2bAll) fail('existingB2bPreserved', `${res.existingB2bPreserved} != ${census.existingKoB2bAll}`);

  // ── 신규 B2B 본문 == 복사 시점 STORE 본문 (전량 md5 대조) ──
  const pairs = (await q(`SELECT b.id b2b_id, b.master_id, b.source_ref_id store_id, md5(b.content) b_content,
        md5(COALESCE(b.summary,'')) b_summary, b.description_type, b.status, b.language, b.source_type
      FROM shared_product_descriptions b WHERE b.id = ANY($1::uuid[])`, [newIds])).rows;
  let contentMatch = 0;
  let summaryMatch = 0;
  const badPairs = [];
  for (const r of pairs) {
    const p = planByStore.get(r.store_id);
    if (!p) { badPairs.push({ b2bId: r.b2b_id, reason: 'UNPLANNED_SOURCE' }); continue; }
    if (p.masterId !== r.master_id) badPairs.push({ b2bId: r.b2b_id, reason: 'MASTER_MISMATCH' });
    if (r.b_content === p.contentHash) contentMatch += 1;
    else badPairs.push({ b2bId: r.b2b_id, reason: 'CONTENT_MISMATCH' });
    if (r.b_summary === p.summaryHash) summaryMatch += 1;
    if (r.description_type !== 'B2B' || r.status !== 'canonical' || r.language !== 'ko') badPairs.push({ b2bId: r.b2b_id, reason: 'FIELD_MISMATCH' });
    if (r.b2b_id === r.store_id) badPairs.push({ b2bId: r.b2b_id, reason: 'ID_REUSED' });
  }
  res.contentMatch = contentMatch;
  res.summaryMatch = summaryMatch;
  res.badPairs = badPairs.slice(0, 20);
  if (contentMatch !== plan.length) fail('contentMatch', `${contentMatch} != ${plan.length}`);
  if (summaryMatch !== plan.length) fail('summaryMatch', `${summaryMatch} != ${plan.length}`);
  if (badPairs.length) fail('badPairs', badPairs.length);

  // ── STORE 원본 불변 (적용 전 스냅샷 전량 대조) ──
  const storeNow = (await q(`SELECT id, md5(content) content_md5, md5(COALESCE(summary,'')) summary_md5, status,
        description_type, updated_at FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [[...baseline.keys()]])).rows;
  let storeSame = 0;
  const storeChanged = [];
  for (const r of storeNow) {
    const b = baseline.get(r.id);
    const same = b && b.content_md5 === r.content_md5 && b.summary_md5 === r.summary_md5 && b.status === r.status
      && b.description_type === r.description_type && new Date(b.updated_at).getTime() === new Date(r.updated_at).getTime();
    if (same) storeSame += 1;
    else storeChanged.push(r.id);
  }
  res.storeRowsChecked = storeNow.length;
  res.storeUnchanged = storeSame;
  res.storeChanged = storeChanged.slice(0, 20);
  if (storeNow.length !== baseline.size) fail('storeRowsChecked', `${storeNow.length} != ${baseline.size}`);
  if (storeChanged.length !== 0) fail('storeChanged', storeChanged.length);

  res.koStoreCanonicalBefore = census.koStoreCanonical;
  res.koStoreCanonicalAfter = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions s
      JOIN product_masters m ON m.id=s.master_id
     WHERE m.regulatory_type='COSMETIC' AND s.description_type='STORE' AND s.status='canonical'
       AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL`)).c;
  if (res.koStoreCanonicalAfter !== census.koStoreCanonical) fail('koStoreCanonicalAfter', `${res.koStoreCanonicalAfter} != ${census.koStoreCanonical}`);

  // ── ProductMaster 무변경 / 다른 제품군 drift ──
  res.cosmeticMastersBefore = census.cosmeticMasters;
  res.cosmeticMastersAfter = (await one(`SELECT COUNT(*)::int c FROM product_masters WHERE regulatory_type='COSMETIC'`)).c;
  if (res.cosmeticMastersAfter !== census.cosmeticMasters) fail('cosmeticMastersAfter', res.cosmeticMastersAfter);
  const rt = await q(`SELECT COALESCE(regulatory_type,'(null)') t, COUNT(*)::int c FROM product_masters GROUP BY 1`);
  res.masterByRegulatoryTypeAfter = Object.fromEntries(rt.rows.map((r) => [r.t, r.c]));
  for (const [t, c] of Object.entries(census.masterByRegulatoryType)) {
    if (res.masterByRegulatoryTypeAfter[t] !== c) fail(`masterDrift:${t}`, `${c} -> ${res.masterByRegulatoryTypeAfter[t]}`);
  }

  // 이번 배치가 화장품 밖 / 다른 언어에 행을 만들지 않았는가
  res.newRowsOutsideCosmetic = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions b
      JOIN product_masters m ON m.id=b.master_id WHERE b.id = ANY($1::uuid[]) AND m.regulatory_type <> 'COSMETIC'`, [newIds])).c;
  if (res.newRowsOutsideCosmetic !== 0) fail('newRowsOutsideCosmetic', res.newRowsOutsideCosmetic);
  res.newRowsOtherLanguage = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions
     WHERE id = ANY($1::uuid[]) AND COALESCE(language,'ko') <> 'ko'`, [newIds])).c;
  if (res.newRowsOtherLanguage !== 0) fail('newRowsOtherLanguage', res.newRowsOtherLanguage);

  // 다른 제품군 설명서 총수 drift
  const dt = await q(`SELECT m.regulatory_type t, COUNT(*)::int c FROM shared_product_descriptions s
      JOIN product_masters m ON m.id=s.master_id WHERE s.deleted_at IS NULL AND s.description_type='B2B' GROUP BY 1`);
  res.b2bDescriptionsByRegulatoryType = Object.fromEntries(dt.rows.map((r) => [r.t, r.c]));

  // ── 무결성 ──
  res.canonicalDup = (await one(`SELECT COUNT(*)::int c FROM (
      SELECT master_id FROM shared_product_descriptions WHERE status='canonical' AND deleted_at IS NULL
       GROUP BY master_id, description_type, COALESCE(language,'ko') HAVING COUNT(*)>1) t`)).c;
  if (res.canonicalDup !== 0) fail('canonicalDup', res.canonicalDup);
  res.orphan = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions s
     WHERE NOT EXISTS (SELECT 1 FROM product_masters m WHERE m.id=s.master_id)`)).c;
  if (res.orphan !== 0) fail('orphan', res.orphan);
  res.emptyContentB2b = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions
     WHERE id = ANY($1::uuid[]) AND COALESCE(TRIM(content),'')=''`, [newIds])).c;
  if (res.emptyContentB2b !== 0) fail('emptyContentB2b', res.emptyContentB2b);

  // ── 표본: STORE id != B2B id / 본문 동일 / descriptionType 다름 ──
  const s = (await q(`SELECT b.id b2b_id, s.id store_id, b.description_type b_type, s.description_type s_type,
        (md5(b.content)=md5(s.content)) same_content, b.master_id, left(b.content, 50) head
      FROM shared_product_descriptions b JOIN shared_product_descriptions s ON s.id = b.source_ref_id
     WHERE b.id = ANY($1::uuid[]) ORDER BY b.master_id LIMIT 5`, [newIds])).rows;
  res.samples = s.map((r) => ({
    masterId: r.master_id, storeId: r.store_id, b2bId: r.b2b_id,
    idDiffers: r.store_id !== r.b2b_id, typeDiffers: r.s_type !== r.b_type, sameContent: r.same_content, head: r.head,
  }));
  if (res.samples.some((x) => !x.idDiffers || !x.typeDiffers || !x.sameContent)) fail('samples', '표본 계약 위반');
});

res.pass = res.violations.length === 0;
writeOut('post-verify.json', res);
console.log(JSON.stringify(res, null, 2));
if (!res.pass) process.exitCode = 3;
