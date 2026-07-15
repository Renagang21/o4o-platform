/**
 * 체크포인트 원문 파서 스캔 (read-only) — grounding 작성 **전에** 원문 상태를 확정한다.
 *   npx tsx src/scripts/hff-cp-parser-scan.ts <selection.json> <checkpoint>
 */
import fs from 'node:fs';
import { parseCfu, parseBasis, parseServing, isBulkMaterial } from '../modules/content-guard/source-grounding-parser.js';

const sel = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const cp = Number(process.argv[3] ?? 1);
const items = sel.filter((p: { checkpoint: number }) => p.checkpoint === cp);

const kinds: Record<string, number> = { PARSED: 0, ABSENT: 0, PARSE_FAILED: 0, ABNORMAL: 0 };
const flagged: string[] = [];

console.log(`CP${cp} · ${items.length}건\n`);
console.log('제품'.padEnd(26) + 'CFU'.padEnd(13) + '기준량'.padEnd(12) + '섭취'.padEnd(12) + '비고');
console.log('─'.repeat(84));
for (const it of items) {
  const c = parseCfu(it.base);
  const b = parseBasis(it.base);
  const s = parseServing(it.srv);
  for (const k of [c.kind, b.kind, s.kind]) kinds[k] = (kinds[k] ?? 0) + 1;

  const notes: string[] = [];
  if (c.kind !== 'PARSED') notes.push(`CFU ${c.kind}`);
  if (b.kind !== 'PARSED') notes.push(`기준량 ${b.kind}`);
  if (s.kind !== 'PARSED') notes.push(`섭취 ${s.kind}`);
  if (!String(it.prsrv ?? '').trim()) notes.push('보관 원문 없음');
  if (isBulkMaterial(it.srv).bulk) notes.push('벌크 의심');
  if (notes.length) flagged.push(`${it.product} — ${notes.join(' / ')}`);

  console.log(
    it.product.slice(0, 24).padEnd(26) +
    (c.kind === 'PARSED' ? (c.value / 1e8).toLocaleString() + '억' : c.kind).padEnd(13) +
    (b.kind === 'PARSED' ? `${b.value.amount}${b.value.unit}` : b.kind).padEnd(12) +
    (s.kind === 'PARSED' ? `${s.value.unitsPerServing ?? '?'}${s.value.unitType ?? ''}×${s.value.servingsPerDay ?? '?'}회` : s.kind).padEnd(12) +
    (notes.length ? '⚠ ' + notes.join(', ') : ''),
  );
}
console.log(`\n[파서 상태] (${items.length}제품 × 3필드 = ${items.length * 3})`);
for (const [k, v] of Object.entries(kinds)) console.log('  ' + k.padEnd(14) + v);
console.log(`\n[주의 필요 ${flagged.length}건]`);
for (const f of flagged) console.log('  ⚠ ' + f);
