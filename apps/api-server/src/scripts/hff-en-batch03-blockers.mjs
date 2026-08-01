/**
 * WO-...-BATCH-03-...-V1 : Batch 03 을 막고 있는 문구 추출 (read-only, DB 미접근).
 *   OUT=<file>  FROM/TO  KIND=clause|meta|label|...
 * 이미 해소된 문구(사전이 커진 뒤)는 제외한다.
 */
import fs from 'node:fs';
import { lookup, key, norm } from './hff-en-batch-01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const CLS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch03-classification-v1.json`, 'utf8')).results;
const pend = CLS.filter((r) => r.holdReason === 'HOLD_PENDING_DIRECT_TRANSLATION');

const ph = new Map();
for (const r of pend) {
  for (const t of r.unresolvedPhrases ?? []) {
    if (lookup('clause', t) || lookup('meta', t) || lookup('label', t)) continue;
    const k = key(norm(t));
    if (!k) continue;
    if (!ph.has(k)) ph.set(k, { text: t, docs: 0 });
    ph.get(k).docs++;
  }
}
const rows = [...ph.values()].sort((a, b) => b.docs - a.docs || a.text.length - b.text.length);
const from = parseInt(process.env.FROM ?? '0', 10);
const to = parseInt(process.env.TO ?? String(rows.length), 10);
const slice = rows.slice(from, to);
if (process.env.OUT) {
  fs.writeFileSync(process.env.OUT,
    `phrases=${rows.length} slice=${from}..${to}\n` + slice.map((p) => `${p.docs}|${p.text}`).join('\n'), 'utf8');
}
console.log(JSON.stringify({ pendingDocs: pend.length, totalPhrases: rows.length, sliced: slice.length }, null, 1));
