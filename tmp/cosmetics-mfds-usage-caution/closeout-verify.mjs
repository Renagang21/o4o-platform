/**
 * WO-O4O-COSMETICS-MFDS-USAGE-CAUTION-ENRICHMENT-V1 — MAIN MERGE CLOSEOUT
 * 저장소(main)와 운영 DB 상태가 일치하는지 **read-only** 로 재확인한다. DB write 0.
 */
import { withDb } from '../../apps/api-server/src/scripts/cosmetics-productmaster-apply-pilot/db.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const pv = JSON.parse(readFileSync(new URL('./post-verify.json', import.meta.url), 'utf8'));
const out = { wo: 'WO-O4O-COSMETICS-MFDS-USAGE-CAUTION-ENRICHMENT-V1', step: 'main-merge-closeout', readOnly: true, dbWrites: 0, pass: true, failures: [] };
const must = (ok, l) => { if (!ok) { out.pass = false; out.failures.push(l); } };

await withDb(async (q) => {
  const one = async (s) => (await q(s)).rows[0];
  const KO_CANON = `FROM shared_product_descriptions s JOIN product_masters m ON m.id = s.master_id
     WHERE m.regulatory_type='COSMETIC' AND s.description_type='STORE' AND s.status='canonical'
       AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL`;

  out.cosmeticMasters = (await one(`SELECT COUNT(*)::int c FROM product_masters WHERE regulatory_type='COSMETIC'`)).c;
  must(out.cosmeticMasters === 32674, `COSMETIC master 32674 → ${out.cosmeticMasters}`);

  out.koStoreCanonical = (await one(`SELECT COUNT(*)::int c ${KO_CANON}`)).c;
  must(out.koStoreCanonical === 32674, `KO STORE canonical 32674 → ${out.koStoreCanonical}`);

  out.cautionSection = (await one(`SELECT COUNT(*)::int c ${KO_CANON} AND s.content LIKE '%<h3>주의사항</h3>%'`)).c;
  must(out.cautionSection === pv.statAfter.cautionSection, `주의사항 절 ${pv.statAfter.cautionSection} → ${out.cautionSection}`);

  out.usageSection = (await one(`SELECT COUNT(*)::int c ${KO_CANON} AND s.content LIKE '%<h3>사용 방법</h3>%'`)).c;
  must(out.usageSection === pv.statAfter.usageSection, `사용 방법 절 ${pv.statAfter.usageSection} → ${out.usageSection}`);

  // 배치 태그 = rollback 근거. 계획 1,309건과 일치해야 한다.
  out.batchTaggedMasters = (await one(`SELECT COUNT(*)::int c FROM product_masters
      WHERE regulatory_type='COSMETIC' AND jsonb_typeof(tags)='object' AND tags ? 'mfdsUsageBatch'`)).c;
  must(out.batchTaggedMasters === pv.plannedApplied, `배치 태그 ${pv.plannedApplied} → ${out.batchTaggedMasters}`);

  out.emptyContent = (await one(`SELECT COUNT(*)::int c ${KO_CANON} AND COALESCE(TRIM(s.content),'')=''`)).c;
  must(out.emptyContent === 0, `빈 본문 ${out.emptyContent}`);

  out.canonicalDuplicateGroups = (await one(`SELECT COUNT(*)::int c FROM (
      SELECT master_id FROM shared_product_descriptions
       WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
       GROUP BY master_id, COALESCE(language,'ko') HAVING COUNT(*) > 1) t`)).c;
  must(out.canonicalDuplicateGroups === 0, `canonicalDup ${out.canonicalDuplicateGroups}`);

  out.orphanDescriptions = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions s
      WHERE NOT EXISTS (SELECT 1 FROM product_masters m WHERE m.id = s.master_id)`)).c;
  must(out.orphanDescriptions === 0, `orphan ${out.orphanDescriptions}`);

  // 다른 제품군 drift — WO 무관 군의 master 수는 직전 postVerify 기준선과 같아야 한다
  const BASE = { DRUG: 177413, 건강기능식품: 40948, QUASI_DRUG: 17148, MEDICAL_DEVICE: 3826, GENERAL: 11, 일반: 15 };
  const rt = await q(`SELECT COALESCE(regulatory_type,'(null)') t, COUNT(*)::int c FROM product_masters GROUP BY 1`);
  out.byRegulatoryType = Object.fromEntries(rt.rows.map((r) => [r.t, r.c]));
  for (const [t, c] of Object.entries(BASE)) must(out.byRegulatoryType[t] === c, `${t} drift ${c} → ${out.byRegulatoryType[t]}`);

  // 비 COSMETIC 설명서가 이 배치 태그에 오염되지 않았는지
  out.nonCosmeticBatchTag = (await one(`SELECT COUNT(*)::int c FROM product_masters
      WHERE regulatory_type <> 'COSMETIC' AND jsonb_typeof(tags)='object' AND tags ? 'mfdsUsageBatch'`)).c;
  must(out.nonCosmeticBatchTag === 0, `비 COSMETIC 배치 태그 ${out.nonCosmeticBatchTag}`);
});

writeFileSync(new URL('./closeout-verify.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
console.log(`\n판정: ${out.pass ? 'PASS' : 'FAIL — ' + out.failures.join(' | ')}`);
if (!out.pass) process.exitCode = 3;
