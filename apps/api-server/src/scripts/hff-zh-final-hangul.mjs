/**
 * WO-O4O-HFF-ZH-ALL-REMAINING-10414-DIRECT-BULK-PRODUCTION-AND-TRACK-CLOSURE-V1  §3
 *
 * misses 는 없는데 잔존 한글이 남는 문서를 진단한다. DB 접근 없음.
 * 합성 규칙이 부분만 옮긴 슬롯의 **KO 원문**을 그대로 뽑아, 라운드 사전 키로 쓸 수 있게 한다.
 * (resolveAtom 은 라운드 사전을 규칙보다 먼저 조회하므로 원문 키를 넣으면 규칙 출력을 덮는다.)
 */
import fs from 'node:fs';
import { build, stripKeep, HANGUL, ZH_SLOTS } from './hff-zh-b01-build.mjs';
import { norm, zh } from './hff-zh-b01-translate.mjs';

const CACHE = process.env.ZH_CACHE ?? 'apps/api-server/src/scripts/.cache';
const POOL = process.env.ZH_POOL ?? `${CACHE}/hff-zh-final-pool.jsonl`;
const pool = fs.readFileSync(POOL, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const bad = new Map();
let docs = 0;
for (const r of pool) {
  if (!r.c || !/<h2|<li/.test(r.c)) continue;
  const b = build(r.c);
  if (b.misses.length || !b.hangul) continue;
  docs++;
  for (const { kind, re } of ZH_SLOTS) {
    for (const m of r.c.matchAll(re)) {
      const inner = m[2];
      const segs = /<[a-z]/i.test(inner)
        ? inner.split(/(<[^>]+>)/).filter((s) => !s.startsWith('<') && HANGUL.test(s))
        : [inner];
      for (const seg of segs) {
        const t = norm(seg);
        if (!t || !HANGUL.test(t)) continue;
        const out = zh(kind, seg);
        if (!out) continue;
        if (!HANGUL.test(stripKeep(out.zh))) continue;
        bad.set(t, { kind, zh: out.zh, n: (bad.get(t)?.n ?? 0) + 1 });
      }
    }
  }
}
const rows = [...bad.entries()].sort((a, b2) => b2[1].n - a[1].n);
console.log(JSON.stringify({ docs, slots: rows.length }));
fs.writeFileSync(`${CACHE}/hff-zh-final-hangul.json`, JSON.stringify(rows, null, 1));
