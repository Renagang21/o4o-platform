/**
 * WO-O4O-HFF-EN-C01-… — 미해소 슬롯 조사기 (DB 미접근)
 *
 * 저작 전에 **실제 원문 슬롯**을 본다. 큐에는 머리/몸통만 남아 무엇이 문제인지 알기 어렵다.
 *
 *   node hff-en-c01-inspect.mjs head "세균수"      머리로 걸린 슬롯 원문
 *   node hff-en-c01-inspect.mjs body APPEARANCE 40 형태별 미해소 몸통
 *   node hff-en-c01-inspect.mjs why                사유별 요약
 */
import fs from 'node:fs';
import { translateSlot } from './hff-en-c01-translate.mjs';
import { splitSlot, norm } from './hff-en-c01-lib.mjs';

const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const targets = JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c01-slots.json`, 'utf8'));
const [mode, arg, nArg] = process.argv.slice(2);
const N = Number(nArg ?? 40);

const agg = new Map();
const bump = (k) => agg.set(k, (agg.get(k) ?? 0) + 1);
for (const t of targets) {
  for (const h of t.hits) {
    const r = translateSlot(h.inner);
    if (r.ok) continue;
    const p = splitSlot(h.inner);
    if (mode === 'head' && r.why === 'HEAD_UNKNOWN') { if (!arg || norm(p.head).includes(arg)) bump(norm(h.inner)); }
    else if (mode === 'body' && r.why === 'BODY_UNKNOWN') { if (!arg || h.shape === arg) bump(norm(p.body)); }
    else if (mode === 'slot' && r.why === (arg ?? 'RESIDUE_LEFT')) bump(norm(h.inner));
    else if (mode === 'why') bump(`${r.why} | ${h.shape}`);
  }
}
const ranked = [...agg.entries()].sort((a, b) => b[1] - a[1]);
console.log(`총 ${ranked.reduce((a, x) => a + x[1], 0)} 슬롯 / 고유 ${ranked.length}`);
for (const [k, n] of ranked.slice(0, N)) console.log(`${n}\t${k}`);
