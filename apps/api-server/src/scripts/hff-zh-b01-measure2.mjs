/**
 * WO-O4O-HFF-ZH-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §4
 * 실제 render 와 **같은 build()** 로 측정한다 (offline, DB 미접근).
 * 입력: .cache/hff-zh-b01-pool.jsonl (render 가 read-only 로 덤프한 KO 모집단)
 */
import fs from 'node:fs';
import { build, parityBreak } from './hff-zh-b01-build.mjs';
import { FAILED } from './hff-zh-b01-translate.mjs';

const CACHE = process.env.ZH_CACHE ?? 'apps/api-server/src/scripts/.cache';
const pool = fs.readFileSync(`${CACHE}/hff-zh-b01-pool.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

let ok = 0, parity = 0, damaged = 0;
const tally = new Map(), byWhy = {};
for (const r of pool) {
  if (!r.c || !/<h2|<li/.test(r.c)) { damaged++; continue; }
  const b = build(r.c);
  if (b.misses.length || b.hangul) {
    const why = b.misses.length ? b.misses[0].why : 'HANGUL_REMAINS';
    byWhy[why] = (byWhy[why] ?? 0) + 1;
    for (const m of b.misses.slice(0, 4)) {
      const k = `${m.why}|${m.kind}|${m.text.slice(0, 160)}`;
      tally.set(k, (tally.get(k) ?? 0) + 1);
    }
    continue;
  }
  if (parityBreak(r.c, b.html)) { parity++; byWhy.PARITY = (byWhy.PARITY ?? 0) + 1; continue; }
  ok++;
}
const atoms = [...FAILED.entries()].filter(([t]) => t.length <= 60).sort((a, b) => b[1] - a[1]).slice(0, 600).map(([t, n]) => ({ n, t }));
fs.writeFileSync(`${CACHE}/hff-zh-b01-atoms.json`, JSON.stringify(atoms, null, 1));
const next = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 400).map(([k, n]) => ({ n, k }));
fs.writeFileSync(`${CACHE}/hff-zh-b01-render-blockers.json`, JSON.stringify(next, null, 1));
console.log(JSON.stringify({ pool: pool.length, producible: ok, target: 10000, parity, damaged, byWhy }, null, 1));
