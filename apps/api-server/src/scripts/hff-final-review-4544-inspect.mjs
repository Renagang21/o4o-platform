/** §7 사유 그룹별 사람 검토용 표본 덤프 (read-only, DB 접근 없음 — 분류 산출물만 사용). */
import fs from 'node:fs';
const D = 'apps/api-server/src/scripts/data';
const cls = JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-classification-v1.json`, 'utf8'));
const want = process.argv[2];
const n = parseInt(process.argv[3] ?? '4', 10);
const rows = cls.items.filter((x) => x.language === 'ko' && x.statusReason === want).slice(0, n);
for (const r of rows) {
  console.log('='.repeat(100));
  console.log(`${r.productName} | ${r.canonicalId} | family=${r.rendererFamily}(${r.rendererFamilySource}) | sectionMode=${r.analysis?.sectionMode}`);
  console.log(`officialBlocks=${r.analysis?.officialBlockCount} labeled=${r.analysis?.officialLabeledBlockCount} clauses=${r.analysis?.officialClauseCount}`);
  console.log('-- SECTIONS --'); console.log(JSON.stringify(r.analysis?.sections));
  console.log('-- MISSING --'); for (const m of r.analysis?.missingClauses ?? []) console.log(`  [${m.header ?? '∅'}] ${m.clause}`);
  if (r.analysis?.attributionMismatches?.length) { console.log('-- ATTR MISMATCH --'); console.log(JSON.stringify(r.analysis.attributionMismatches)); }
  console.log('-- OFFICIAL SOURCE --'); console.log((r.officialSourceEvidence?.[0] ?? '').replace(/\s+/g, ' ').slice(0, 700));
}
console.log(`\n(${want}: ${cls.items.filter((x) => x.statusReason === want).length} rows total)`);
