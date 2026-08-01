/**
 * WO-...-BATCH-02-REMAINING-915-...-V1
 * 915건을 막고 있는 문구 전수 추출 (read-only, DB 미접근).
 *   OUT=<file>   문구 목록 (docs|kind|text)
 *   FROM/TO      슬라이스 범위 (기본 전체)
 */
import fs from 'node:fs';
import { lookup, norm, key } from './hff-en-batch-01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const POP = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-remaining915-population-v1.json`, 'utf8')).rows;

const ph = new Map();
for (const r of POP) {
  for (const t of r.unresolvedPhrases ?? []) {
    // 이미 해소된 문구는 제외한다(라운드 진행 중 사전이 커진다).
    if (lookup('clause', t) || lookup('meta', t) || lookup('label', t)) continue;
    const k = key(norm(t));
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
console.log(JSON.stringify({ totalPhrases: rows.length, sliced: slice.length, docsCovered: POP.length }, null, 1));
