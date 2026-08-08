/**
 * WO-O4O-HFF-EN-C01-… — 번역 표본 검사
 *
 * 엔진이 **합성**한 결과를 사람이 읽고 확인하기 위한 덤프. DB 접근 없음.
 * 형태별로 빈도 상위와 무작위 표본을 함께 내보낸다 — 상위만 보면 롱테일 결함을 놓친다.
 */
import fs from 'node:fs';
import { translateSlot } from './hff-en-c01-translate.mjs';

const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const targets = JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c01-slots.json`, 'utf8'));
const want = process.argv[2] ?? 'APPEARANCE';
const n = Number(process.argv[3] ?? 25);

const agg = new Map();
for (const t of targets) for (const h of t.hits) {
  if (h.shape !== want) continue;
  const r = translateSlot(h.inner);
  if (!r.ok) continue;
  const e = agg.get(h.inner) ?? { n: 0, en: r.en };
  e.n++; agg.set(h.inner, e);
}
const arr = [...agg.entries()].sort((a, b) => b[1].n - a[1].n);
console.log(`=== ${want}: ${arr.reduce((a, x) => a + x[1].n, 0)} slots / ${arr.length} distinct ===`);
console.log('--- 빈도 상위 ---');
for (const [ko, v] of arr.slice(0, n)) console.log(`${v.n}\t${ko}\n\t=> ${v.en}`);
console.log('--- 균등 간격 표본(롱테일) ---');
const step = Math.max(1, Math.floor(arr.length / n));
for (let i = 0; i < arr.length && i / step < n; i += step) { const [ko, v] = arr[i]; console.log(`${v.n}\t${ko}\n\t=> ${v.en}`); }
