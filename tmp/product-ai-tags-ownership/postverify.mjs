/**
 * WO-O4O-PRODUCT-AI-TAGS-SUPPLIER-OWNERSHIP-GUARD-V1 §11 postVerify (read-only)
 * 이 WO 는 코드 가드/테스트만 다룬다 — DB write 0. drift 0 확인이 목적이다.
 */
import { withDb } from '../../apps/api-server/src/scripts/cosmetics-productmaster-apply-pilot/db.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const base = JSON.parse(readFileSync(new URL('../product-db-write-authority/postverify.json', import.meta.url), 'utf8'));
const audit = JSON.parse(readFileSync(new URL('./audit.json', import.meta.url), 'utf8'));
const out = { wo: 'WO-O4O-PRODUCT-AI-TAGS-SUPPLIER-OWNERSHIP-GUARD-V1', step: 'postVerify', readOnly: true, dbWrites: 0, pass: true, failures: [] };
const must = (ok, l) => { if (!ok) { out.pass = false; out.failures.push(l); } };

await withDb(async (q) => {
  const one = async (s) => (await q(s)).rows[0];
  out.productMasterTotal = (await one('SELECT COUNT(*)::int c FROM product_masters')).c;
  must(out.productMasterTotal === base.productMasterTotal, `ProductMaster drift ${base.productMasterTotal} → ${out.productMasterTotal}`);

  out.canonicalStore = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL`)).c;
  const baseCanonical = Object.values(base.canonicalStoreByLanguage).reduce((a, b) => a + b, 0);
  must(out.canonicalStore === baseCanonical, `canonical drift ${baseCanonical} → ${out.canonicalStore}`);

  out.supplierOfferRows = (await one('SELECT COUNT(*)::int c FROM supplier_product_offers')).c;
  must(out.supplierOfferRows === audit.supplierOfferRows, `offer drift ${audit.supplierOfferRows} → ${out.supplierOfferRows}`);

  out.productAiTagsRows = (await one('SELECT COUNT(*)::int c FROM product_ai_tags')).c;
  must(out.productAiTagsRows === audit.productAiTagsRows, `ai tags drift ${audit.productAiTagsRows} → ${out.productAiTagsRows}`);

  // AI tags 외 ProductMaster 필드 drift — 메타 object 보존 여부
  out.metaObjectTagsMasters = (await one(`SELECT COUNT(*)::int c FROM product_masters WHERE jsonb_typeof(tags)='object'`)).c;
  must(out.metaObjectTagsMasters === 32674, `메타 object tags drift 32674 → ${out.metaObjectTagsMasters}`);

  const rt = await q(`SELECT COALESCE(regulatory_type,'(null)') t, COUNT(*)::int c FROM product_masters GROUP BY 1`);
  out.byRegulatoryType = Object.fromEntries(rt.rows.map((r) => [r.t, r.c]));
  for (const [t, c] of Object.entries(base.byRegulatoryType)) must(out.byRegulatoryType[t] === c, `${t} drift ${c} → ${out.byRegulatoryType[t]}`);
});

writeFileSync(new URL('./postverify.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
console.log(`\n판정: ${out.pass ? 'PASS' : 'FAIL — ' + out.failures.join(' | ')}`);
if (!out.pass) process.exitCode = 3;
