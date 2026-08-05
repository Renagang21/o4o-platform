/**
 * WO-O4O-HFF-ZH-ALL-REMAINING-10414-DIRECT-BULK-PRODUCTION-AND-TRACK-CLOSURE-V1  §3 / §4
 * 10,000 문서를 채우는 데 필요한 **추가 저작 문구 규모** 산정 (offline, DB 미접근).
 *   - 실제 render 와 같은 build() 로 문서별 미해소 조각을 구한다.
 *   - 이미 생산 가능한 문서를 먼저 담고, 남은 자리는 "새 문구를 가장 적게 요구하는 문서"부터 채운다.
 * 산출: <CACHE>/hff-zh-final-needed-phrases.json · data/hff-zh-final-plan-v1.json
 */
import fs from 'node:fs';
import { build } from './hff-zh-b01-build.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.ZH_CACHE ?? 'apps/api-server/src/scripts/.cache';
const TARGET = 10000;
const pool = fs.readFileSync(`${CACHE}/hff-zh-final-pool.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const need = new Map();          // key -> {kind, text, why, blocks}
const docs = [];                 // {m, keys:[]}
let ok = 0, damaged = 0, hangulOnly = 0;
for (const r of pool) {
  if (!r.c || !/<h2|<li/.test(r.c)) { damaged++; continue; }
  const b = build(r.c);
  if (!b.misses.length && !b.hangul) { ok++; docs.push({ m: r.m, keys: [] }); continue; }
  if (!b.misses.length) { hangulOnly++; continue; }  // 슬롯은 다 옮겼는데 한글이 남는 문서 — 저작으로 풀리지 않는다.
  const seen = new Map();
  for (const x of b.misses) seen.set(`${x.kind}${x.why}${x.text}`, x);
  for (const [k, x] of seen) {
    const e = need.get(k);
    if (e) e.blocks++;
    else need.set(k, { kind: x.kind, why: x.why, text: x.text, blocks: 1 });
  }
  docs.push({ m: r.m, keys: [...seen.keys()] });
}

/* 새로 저작해야 하는 문구 수가 적은 문서부터 채운다(희소도 가중). */
const blocksOf = (k) => need.get(k)?.blocks ?? 1;
const scored = docs.map((d) => ({ d, s: d.keys.reduce((a, k) => a + 1 / blocksOf(k), 0) })).sort((a, b) => a.s - b.s);
const covered = new Set();
const curve = [];
let picked = 0;
for (const { d } of scored) {
  for (const k of d.keys) covered.add(k);
  picked++;
  if (picked % 1000 === 0) curve.push({ docs: picked, newPhrases: covered.size });
  if (picked >= TARGET) break;
}
const needed = [...covered].map((k) => need.get(k)).filter(Boolean).sort((a, b) => b.blocks - a.blocks);
const kindTally = {}, whyTally = {};
for (const p of needed) { kindTally[p.kind] = (kindTally[p.kind] ?? 0) + 1; whyTally[p.why] = (whyTally[p.why] ?? 0) + 1; }

fs.writeFileSync(`${CACHE}/hff-zh-final-needed-phrases.json`, JSON.stringify(needed, null, 1));
const out = {
  wo: 'WO-O4O-HFF-ZH-ALL-REMAINING-10414-DIRECT-BULK-PRODUCTION-AND-TRACK-CLOSURE-V1',
  plannedAt: new Date().toISOString(),
  poolDocuments: pool.length, damaged, alreadyProducible: ok, hangulOnly,
  targetDocuments: TARGET, docsAvailable: docs.length,
  newPhrasesNeeded: needed.length, kindTally, whyTally, curve,
};
fs.writeFileSync(`${D}/hff-zh-final-plan-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
