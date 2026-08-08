/**
 * WO-O4O-HFF-EN-C01-… — 커버리지 측정
 *
 * 번역 엔진을 전체 잔존 슬롯에 돌려 **해소/미해소**를 센다. DB 접근 없음(survey 산출물 사용).
 * 미해소는 사유(HEAD_UNKNOWN / BODY_UNKNOWN)와 형태(shape)별로 집계하고,
 * **저작 대기 큐**(고유 문구 × 문서 수)를 빈도순으로 내보낸다 — 다음 라운드의 입력이다.
 *
 * 산출: data/hff-en-c01-measure-v1.json · .cache/hff-en-c01-queue.json
 */
import fs from 'node:fs';
import { translateSlot } from './hff-en-c01-translate.mjs';
import { ROUNDS } from './hff-en-c01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const targets = JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c01-slots.json`, 'utf8'));

const headQ = new Map(), bodyQ = new Map(), shapeFail = new Map(), shapeOk = new Map();
const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
let slots = 0, ok = 0, fail = 0;
let docsFull = 0, docsPartial = 0, docsNone = 0;
const docState = [];
for (const t of targets) {
  let o = 0, f = 0;
  for (const h of t.hits) {
    slots++;
    const r = translateSlot(h.inner);
    if (r.ok) { o++; ok++; bump(shapeOk, h.shape); continue; }
    f++; fail++; bump(shapeFail, h.shape + '|' + r.why);
    if (r.why === 'HEAD_UNKNOWN') bump(headQ, r.ko);
    else bump(bodyQ, (r.shape ?? h.shape) + '' + r.ko);
  }
  if (!f) docsFull++; else if (o) docsPartial++; else docsNone++;
  docState.push({ enId: t.enId, full: !f });
}

const rank = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
const bodyRanked = rank(bodyQ).map(([k, n]) => { const [shape, ko] = k.split(''); return { n, shape, ko }; });
const headRanked = rank(headQ).map(([ko, n]) => ({ n, ko }));

const cum = (arr, frac) => { const tot = arr.reduce((a, x) => a + x.n, 0); let s = 0, i = 0; for (; i < arr.length && s < tot * frac; i++) s += arr[i].n; return i; };

const out = {
  wo: 'WO-O4O-HFF-EN-C01-LABELLED-STANDARD-40896-FULL-TRANSLATION-REPAIR-V1',
  measuredAt: new Date().toISOString(), authoringRounds: ROUNDS,
  documents: targets.length, docsFullyResolved: docsFull, docsPartial, docsNone,
  slots, slotsResolved: ok, slotsUnresolved: fail,
  slotCoveragePct: +(ok / slots * 100).toFixed(2),
  docCoveragePct: +(docsFull / targets.length * 100).toFixed(2),
  resolvedByShape: Object.fromEntries(rank(shapeOk)),
  unresolvedByShapeWhy: Object.fromEntries(rank(shapeFail)),
  distinctUnresolvedHeads: headRanked.length, distinctUnresolvedBodies: bodyRanked.length,
  /** 상위 몇 개를 저작하면 미해소 슬롯의 50% / 80% 를 덮는가 — 라운드 크기 결정 근거 */
  headsFor50pct: cum(headRanked, 0.5), headsFor80pct: cum(headRanked, 0.8),
  bodiesFor50pct: cum(bodyRanked, 0.5), bodiesFor80pct: cum(bodyRanked, 0.8),
  topUnresolvedHeads: headRanked.slice(0, 40),
  topUnresolvedBodies: bodyRanked.slice(0, 40),
};
fs.writeFileSync(`${D}/hff-en-c01-measure-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${CACHE}/hff-en-c01-queue.json`, JSON.stringify({ heads: headRanked, bodies: bodyRanked }));
fs.writeFileSync(`${CACHE}/hff-en-c01-docstate.json`, JSON.stringify(docState));
console.log(JSON.stringify({ ...out, topUnresolvedHeads: headRanked.slice(0, 15), topUnresolvedBodies: bodyRanked.slice(0, 15) }, null, 1));
