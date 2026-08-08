/**
 * WO-O4O-HFF-EN-C01-… — 병목 슬롯 큐 (DB 미접근)
 *
 * 적용은 **문서 단위 all-or-nothing** 이므로, 문서를 여는 데 실제로 필요한 것은
 * "빈도 높은 문구" 가 아니라 **그 문서의 마지막 남은 미해소 슬롯**이다.
 * 미해소 슬롯이 1~2개뿐인 문서를 골라, 그 문서를 막고 있는 문구를 빈도순으로 낸다.
 */
import fs from 'node:fs';
import { translateSlot } from './hff-en-c01-translate.mjs';
import { splitSlot, norm } from './hff-en-c01-lib.mjs';

const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const targets = JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c01-slots.json`, 'utf8'));
const MAX = Number(process.argv[2] ?? 1);
const N = Number(process.argv[3] ?? 40);

const hist = new Map(), block = new Map();
for (const t of targets) {
  const bad = [];
  for (const h of t.hits) { const r = translateSlot(h.inner); if (!r.ok) bad.push({ h, r }); }
  hist.set(bad.length, (hist.get(bad.length) ?? 0) + 1);
  if (!bad.length || bad.length > MAX) continue;
  for (const { h, r } of bad) {
    const p = splitSlot(h.inner);
    const key = r.why === 'HEAD_UNKNOWN' ? `HEAD ${norm(p.head)}` : `${h.shape} ${norm(r.why === 'BODY_UNKNOWN' ? p.body : h.inner)}`;
    block.set(key, (block.get(key) ?? 0) + 1);
  }
}
const ranked = [...block.entries()].sort((a, b) => b[1] - a[1]);
console.log('미해소 슬롯 수별 문서 분포:', JSON.stringify(Object.fromEntries([...hist.entries()].sort((a, b) => a[0] - b[0]).slice(0, 12))));
console.log(`미해소 ${MAX} 개 이하인 문서를 막는 문구: ${ranked.reduce((a, x) => a + x[1], 0)} 회 / 고유 ${ranked.length}`);
for (const [k, n] of ranked.slice(0, N)) console.log(`${n}\t${k}`);
