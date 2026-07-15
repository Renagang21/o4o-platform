/**
 * 30-A 파서 상태 집계 — WO 보고 항목 전용 (read-only, DB 무관).
 *   npx tsx src/scripts/hff-30a-parser-report.ts <input.json>
 */
import fs from 'node:fs';
import { parseBasis, parseCfu, parseServing, isBulkMaterial } from '../modules/content-guard/source-grounding-parser.js';
import type { GuardProductInput } from '../modules/content-guard/product-description-guard.types.js';
import { computeBasis } from '../modules/content-guard/product-description-guard.js';

const file = process.argv[2];
const items: (GuardProductInput & { _bucket?: string })[] = JSON.parse(fs.readFileSync(file, 'utf8'));

const kinds: Record<string, number> = { PARSED: 0, ABSENT: 0, PARSE_FAILED: 0, ABNORMAL: 0 };
const bump = (k: string) => (kinds[k] = (kinds[k] ?? 0) + 1);

let mismatch = 0, bulkBlocked = 0;
console.log('제품'.padEnd(24) + 'CFU파싱'.padEnd(11) + '기준량파싱'.padEnd(12) + '섭취파싱'.padEnd(11) + '환산');
console.log('─'.repeat(78));
for (const it of items) {
  const c = parseCfu(it.source.baseStandard);
  const b = parseBasis(it.source.baseStandard);
  const s = parseServing(it.source.intake);
  bump(c.kind); bump(b.kind); bump(s.kind);
  if (isBulkMaterial(it.source.intake).bulk) bulkBlocked++;

  const declaredCfu = it.grounding.declaredCfu?.absolute ?? null;
  if (c.kind === 'PARSED' && declaredCfu !== null && Math.abs(declaredCfu - c.value) > 1) mismatch++;
  const db = it.grounding.declaredAmount
    ? it.grounding.declaredAmount.basisUnit === 'g' ? it.grounding.declaredAmount.basisAmount * 1000 : it.grounding.declaredAmount.basisAmount
    : null;
  if (b.kind === 'PARSED' && db !== null && Math.abs(db - (b.value.unit === 'g' ? b.value.amount * 1000 : b.value.amount)) > 0.5) mismatch++;

  const basis = computeBasis(it);
  console.log(
    it.productName.slice(0, 22).padEnd(24) +
    (c.kind === 'PARSED' ? (c.value / 1e8).toLocaleString() + '억' : c.kind).padEnd(11) +
    (b.kind === 'PARSED' ? `${b.value.amount}${b.value.unit}` : b.kind).padEnd(12) +
    (s.kind === 'PARSED' ? `${s.value.unitsPerServing ?? '?'}${s.value.unitType ?? ''}×${s.value.servingsPerDay ?? '?'}회` : s.kind).padEnd(11) +
    (basis.allowed ? '가능' : '불가'),
  );
}
console.log('\n[파서 상태별 건수] (제품 ' + items.length + ' × 3필드 = ' + items.length * 3 + ')');
for (const [k, v] of Object.entries(kinds)) console.log('  ' + k.padEnd(14) + v);
console.log('\n원문 파싱값 vs 수작업 grounding 불일치 : ' + mismatch);
console.log('파서가 새로 차단한 제품(벌크)            : ' + bulkBlocked);
