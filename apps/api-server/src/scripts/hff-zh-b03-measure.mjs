/**
 * WO-O4O-HFF-ZH-BATCH-03-10000-DIRECT-BULK-PRODUCTION-V1  §4
 * 사전·규칙 커버리지 측정 (offline, DB 미접근). 다음 저작 라운드 대상을 뽑는다.
 *   - 문서 단위로 "완전 해소 가능" 여부를 세어 10,000 도달 여부를 본다.
 *   - 막는 문구는 차단 문서 수 내림차순으로 정렬해 저작 우선순위를 만든다.
 */
import fs from 'node:fs';
import { zh, lostNums, dictSize, authoredRounds } from './hff-zh-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.ZH_CACHE ?? 'apps/api-server/src/scripts/.cache';
const TARGET = 10000;
const P = JSON.parse(fs.readFileSync(`${D}/hff-zh-b03-phrases-v1.json`, 'utf8'));
const docs = fs.readFileSync(`${CACHE}/hff-zh-b03-docslots.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const ok = new Set(); const bad = new Map();
const howTally = {};
for (const p of P.phrases) {
  const r = zh(p.kind, p.text);
  const lost = r ? lostNums(p.text, r.zh) : ['UNRESOLVED'];
  if (r && !lost.length) { ok.add(p.i); const h = String(r.how).split('(')[0]; howTally[h] = (howTally[h] ?? 0) + 1; continue; }
  bad.set(p.i, { ...p, why: r ? 'NUMBER_DRIFT' : 'UNRESOLVED', zh: r?.zh ?? null, lost });
}
let full = 0;
const blockScore = new Map();
for (const d of docs) {
  const miss = d.p.filter((i) => !ok.has(i));
  if (!miss.length) { full++; continue; }
  for (const i of miss) blockScore.set(i, (blockScore.get(i) ?? 0) + 1);
}
const next = [...blockScore.entries()].sort((a, b) => b[1] - a[1])
  .map(([i, n]) => ({ blocks: n, ...bad.get(i) }));

const out = {
  rounds: authoredRounds, dict: dictSize(),
  phrasesTotal: P.phrases.length, phrasesResolved: ok.size, phrasesRemaining: bad.size,
  howTally, docsTotal: docs.length, docsFullyResolvable: full, target: TARGET,
  reachesTarget: full >= TARGET,
  remainingByKind: [...bad.values()].reduce((a, b) => { a[b.kind] = (a[b.kind] ?? 0) + 1; return a; }, {}),
  remainingByWhy: [...bad.values()].reduce((a, b) => { a[b.why] = (a[b.why] ?? 0) + 1; return a; }, {}),
  topBlockers: next.slice(0, 15).map((x) => ({ blocks: x.blocks, kind: x.kind, why: x.why, text: x.text.slice(0, 60) })),
};
fs.writeFileSync(`${CACHE}/hff-zh-b03-next-phrases.json`, JSON.stringify(next.slice(0, 4000), null, 1));
console.log(JSON.stringify(out, null, 1));
