/**
 * WO-O4O-HFF-ZH-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §3
 * 10,000 문서를 채우기 위해 필요한 문구 집합 규모 산정 (offline, DB 미접근).
 * 탐욕적으로 "새 문구를 가장 적게 요구하는 문서"부터 채운다.
 */
import fs from 'node:fs';
const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.ZH_CACHE ?? 'apps/api-server/src/scripts/.cache';
const P = JSON.parse(fs.readFileSync(`${D}/hff-zh-b01-phrases-v1.json`, 'utf8'));
const byId = new Map(P.phrases.map((p) => [p.i, p]));
const docs = fs.readFileSync(`${CACHE}/hff-zh-b01-docslots.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

/* 문서를 "요구 문구의 희소도 합" 오름차순으로 본다 — 흔한 문구만 쓰는 문서가 먼저 채워진다. */
const scored = docs.map((d) => ({ d, s: d.p.reduce((a, i) => a + 1 / (byId.get(i)?.docFreq ?? 1), 0) }))
  .sort((a, b) => a.s - b.s);

const covered = new Set();
const picked = [];
const curve = [];
for (const { d } of scored) {
  for (const i of d.p) covered.add(i);
  picked.push(d.m);
  if (picked.length % 1000 === 0) curve.push({ docs: picked.length, phrases: covered.size });
  if (picked.length >= 10000) break;
}
const need = [...covered].map((i) => byId.get(i)).filter(Boolean);
const kindTally = {};
for (const p of need) kindTally[p.kind] = (kindTally[p.kind] ?? 0) + 1;

fs.writeFileSync(`${D}/hff-zh-b01-plan-v1.json`, JSON.stringify({
  wo: P.wo, plannedAt: new Date().toISOString(),
  poolDocuments: docs.length, targetDocuments: 10000,
  phrasesNeeded: need.length, kindTally, curve,
}, null, 1));
fs.writeFileSync(`${CACHE}/hff-zh-b01-needed-phrases.json`, JSON.stringify(need.sort((a, b) => b.docFreq - a.docFreq), null, 1));
console.log(JSON.stringify({ phrasesNeeded: need.length, kindTally, curve }, null, 1));
