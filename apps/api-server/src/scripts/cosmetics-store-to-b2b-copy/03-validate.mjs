/**
 * WO §9 사전 검증 — dry-run 계획을 DB 로 되짚어 확인한다. read-only.
 * 계획 파일을 신뢰하지 않고, 계획의 id 를 DB 에서 다시 읽어 조건을 재확인한다.
 * 산출: validation.json (위반 0 이어야 apply)
 */
import { withDb } from '../cosmetics-productmaster-apply-pilot/db.mjs';
import { readOut, writeOut } from './lib.mjs';

const plan = readOut('dry-run-plan.json');
const res = { plannedCopy: plan.length, violations: [], pass: true };
const fail = (k, v) => { res.violations.push(`${k}: ${v}`); res.pass = false; };

await withDb(async (q) => {
  const one = async (sql, p) => (await q(sql, p)).rows[0];
  const ids = plan.map((p) => p.storeDescriptionId);
  const masters = plan.map((p) => p.masterId);

  res.planStoreIdUnique = new Set(ids).size === ids.length;
  if (!res.planStoreIdUnique) fail('planStoreIdUnique', 'storeDescriptionId 중복');
  res.planMasterUnique = new Set(masters).size === masters.length;
  if (!res.planMasterUnique) fail('planMasterUnique', 'masterId 중복');

  // 계획된 STORE row 가 지금도 조건을 만족하는가 (전량 대조)
  res.planRowsStillValid = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions s
      JOIN product_masters m ON m.id = s.master_id
     WHERE s.id = ANY($1::uuid[]) AND m.regulatory_type='COSMETIC' AND s.description_type='STORE'
       AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
       AND COALESCE(TRIM(s.content),'') <> ''`, [ids])).c;
  if (res.planRowsStillValid !== plan.length) fail('planRowsStillValid', `${res.planRowsStillValid} != ${plan.length}`);

  // 본문 지문이 dry-run 시점과 같은가 (그 사이 STORE 가 바뀌지 않았는가)
  const hashRows = (await q(`SELECT id, md5(content) h FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [ids])).rows;
  const dbHash = new Map(hashRows.map((r) => [r.id, r.h]));
  res.contentHashDrift = plan.filter((p) => dbHash.get(p.storeDescriptionId) !== p.contentHash).length;
  if (res.contentHashDrift !== 0) fail('contentHashDrift', res.contentHashDrift);

  // STORE canonical 중복 / 대상 master 당 STORE 1개
  res.storeCanonicalDuplicate = (await one(`SELECT COUNT(*)::int c FROM (
      SELECT s.master_id FROM shared_product_descriptions s JOIN product_masters m ON m.id = s.master_id
       WHERE m.regulatory_type='COSMETIC' AND s.description_type='STORE' AND s.status='canonical'
         AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
       GROUP BY s.master_id HAVING COUNT(*) > 1) t`)).c;
  if (res.storeCanonicalDuplicate !== 0) fail('storeCanonicalDuplicate', res.storeCanonicalDuplicate);

  // B2B canonical collision — 계획 master 중 이미 KO B2B canonical 을 가진 건
  res.b2bCollision = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions b
     WHERE b.master_id = ANY($1::uuid[]) AND b.description_type='B2B' AND b.status='canonical'
       AND COALESCE(b.language,'ko')='ko' AND b.deleted_at IS NULL`, [masters])).c;
  if (res.b2bCollision !== 0) fail('b2bCollision', res.b2bCollision);

  res.emptyContent = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions
     WHERE id = ANY($1::uuid[]) AND COALESCE(TRIM(content),'')=''`, [ids])).c;
  if (res.emptyContent !== 0) fail('emptyContent', res.emptyContent);

  res.masterOrphan = (await one(`SELECT COUNT(*)::int c FROM unnest($1::uuid[]) mid
     WHERE NOT EXISTS (SELECT 1 FROM product_masters m WHERE m.id = mid)`, [masters])).c;
  if (res.masterOrphan !== 0) fail('masterOrphan', res.masterOrphan);

  // canonical unique index 가 실재하는가 (INSERT 안전판)
  res.canonicalUniqueIndex = (await one(`SELECT COUNT(*)::int c FROM pg_indexes
     WHERE tablename='shared_product_descriptions' AND indexname='uniq_shared_product_descriptions_canonical_per_master_type_lang'`)).c === 1;
  if (!res.canonicalUniqueIndex) fail('canonicalUniqueIndex', '없음');

  // 배치 표식(description_type='B2B' + source_type='o4o_cosmetics_retail') 이 기존 데이터와 겹치지 않는가
  res.rollbackKeyCollision = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions
     WHERE description_type='B2B' AND source_type='o4o_cosmetics_retail'`)).c;
  if (res.rollbackKeyCollision !== 0) fail('rollbackKeyCollision', res.rollbackKeyCollision);
});

writeOut('validation.json', res);
console.log(JSON.stringify(res, null, 2));
if (!res.pass) process.exitCode = 3;
