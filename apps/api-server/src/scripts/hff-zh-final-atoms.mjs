/**
 * WO-O4O-HFF-ZH-ALL-REMAINING-10414-DIRECT-BULK-PRODUCTION-AND-TRACK-CLOSURE-V1  §3
 *
 * 정상 잔여 모집단(pool)에서 아직 해소되지 않은 번역 원자를 전수 추출한다.
 *   - DB 접근 없음. render 단계가 남겨둔 pool 캐시만 읽는다.
 *   - 저작 라운드를 한 번 얹을 때마다 다시 돌려 잔여 원자를 확인한다.
 *
 * 산출: .cache/hff-zh-final-atoms.txt  ("순번 | 등장문서수 | 원문")
 *       .cache/hff-zh-final-atoms.json
 */
import fs from 'node:fs';
import { build } from './hff-zh-b01-build.mjs';

const CACHE = process.env.ZH_CACHE ?? 'apps/api-server/src/scripts/.cache';
const POOL = process.env.ZH_POOL ?? `${CACHE}/hff-zh-final-pool.jsonl`;
const pool = fs.readFileSync(POOL, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const atomDocs = new Map();
let unresolvedDocs = 0, producible = 0, damaged = 0;
for (const r of pool) {
  if (!r.c || !/<h2|<li/.test(r.c)) { damaged++; continue; }
  const b = build(r.c);
  if (!b.misses.length && !b.hangul) { producible++; continue; }
  unresolvedDocs++;
  for (const t of new Set(b.misses.map((m) => m.text))) atomDocs.set(t, (atomDocs.get(t) ?? 0) + 1);
}
const order = [...atomDocs.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length);
fs.writeFileSync(`${CACHE}/hff-zh-final-atoms.txt`,
  order.map(([t, d], i) => `${i} | ${d} | ${t.replace(/\r?\n/g, ' ')}`).join('\n') + '\n');
fs.writeFileSync(`${CACHE}/hff-zh-final-atoms.json`, JSON.stringify(order));
console.log(JSON.stringify({ pool: pool.length, producible, unresolvedDocs, damaged, distinctAtoms: order.length }));
