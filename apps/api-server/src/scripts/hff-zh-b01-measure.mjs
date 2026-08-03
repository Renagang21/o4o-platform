/**
 * WO-O4O-HFF-ZH-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §4
 * 사전·규칙 커버리지 측정 (offline, DB 미접근). 다음 저작 라운드 대상을 뽑는다.
 */
import fs from 'node:fs';
import { zh, lostNums, dictSize, authoredRounds } from './hff-zh-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.ZH_CACHE ?? 'apps/api-server/src/scripts/.cache';
const P = JSON.parse(fs.readFileSync(`${D}/hff-zh-b01-phrases-v1.json`, 'utf8'));
const docs = fs.readFileSync(`${CACHE}/hff-zh-b01-docslots.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const ok = new Set(); const bad = [];
const howTally = {};
for (const p of P.phrases) {
  const r = zh(p.kind, p.text);
  const lost = r ? lostNums(p.text, r.zh) : ['UNRESOLVED'];
  if (r && !lost.length) { ok.add(p.i); howTally[String(r.how).split('(')[0]] = (howTally[String(r.how).split('(')[0]] ?? 0) + 1; continue; }
  bad.push({ ...p, why: r ? 'NUMBER_DRIFT' : 'UNRESOLVED', zh: r?.zh ?? null, lost });
}
let full = 0;
const blockScore = new Map();
for (const d of docs) {
  const miss = d.p.filter((i) => !ok.has(i));
  if (!miss.length) { full++; continue; }
  for (const i of miss) blockScore.set(i, (blockScore.get(i) ?? 0) + 1);
}
const byId = new Map(P.phrases.map((p) => [p.i, p]));
const next = [...blockScore.entries()].sort((a, b) => b[1] - a[1])
  .map(([i, n]) => ({ blocks: n, ...byId.get(i), why: bad.find((b) => b.i === i)?.why ?? '?', zh: bad.find((b) => b.i === i)?.zh ?? null }));

const out = {
  rounds: authoredRounds, dict: dictSize(),
  phrasesTotal: P.phrases.length, phrasesResolved: ok.size, phrasesRemaining: bad.length,
  howTally, docsTotal: docs.length, docsFullyResolvable: full, target: 10000,
  remainingByKind: bad.reduce((a, b) => { a[b.kind] = (a[b.kind] ?? 0) + 1; return a; }, {}),
  remainingByWhy: bad.reduce((a, b) => { a[b.why] = (a[b.why] ?? 0) + 1; return a; }, {}),
};
fs.writeFileSync(`${CACHE}/hff-zh-b01-next-phrases.json`, JSON.stringify(next, null, 1));
console.log(JSON.stringify(out, null, 1));
