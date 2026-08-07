/**
 * WO-O4O-HFF-JA-LONGTAIL-CONTINUOUS-SHARD-AUTHORING-V4-CYCLE-03 §4-B
 *
 * **게이트 차단 문서의 원인 원문**을 뽑는다.
 *
 * 게이트(`hff-ja-b04-gate`)는 조립 사고를 막지만 "어느 KO 문구가 사고를 냈는지"는 말해주지 않는다.
 * 이 도구는 차단된 문서를 슬롯 단위로 다시 조립해, **사고를 내는 슬롯의 KO 원문**을 찾아낸다.
 * 그 원문을 개별 사전 항목으로 직접 저작하면 조립 경로를 타지 않으므로 사고가 사라진다.
 *
 * 규칙을 넓혀 게이트를 통과시키는 것이 아니다 — 저작 대상을 특정하는 것이 목적이다(§4·§7).
 *
 * 산출: .cache/hff-ja-b04-gate-targets.json  [[docs, koText, defect], ...]  문서 기여도 내림차순
 */
import fs from 'node:fs';
import { JA_SLOTS, norm, ja, clearMemo } from './hff-ja-b01-translate.mjs';
import { build } from './hff-ja-b01-build.mjs';
import { grammarDefect } from './hff-ja-b04-gate.mjs';

const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const SRC = `${CACHE}/hff-ja-b04-ko-source.jsonl`;
const SPLIT_NL = new RegExp(String.fromCharCode(92) + 'r?' + String.fromCharCode(92) + 'n');
if (!fs.existsSync(SRC)) { console.error('NO_KO_SOURCE_CACHE'); process.exit(1); }
const docs = fs.readFileSync(SRC, 'utf8').split(SPLIT_NL).filter(Boolean).map((l) => JSON.parse(l));

/* 태그를 경계로 바꿔 검사한다 — 문서 게이트와 같은 규칙(태그를 넘어 잘못 매칭되지 않게). */
const flat = (h) => String(h ?? '').replace(/<[^>]+>/g, '・');

const agg = new Map();      /* koText -> { docs, defect } */
let blocked = 0, unattributed = 0;
for (const d of docs) {
  if (!d.c || !/<h2|<li/.test(d.c)) continue;
  const b = build(d.c);
  if (b.misses.length || b.hangul || b.simplified) continue;   /* UNRESOLVED 쪽 모집단 */
  const def = grammarDefect(flat(b.html));
  if (!def) continue;
  blocked++;
  /* 사고를 내는 슬롯 찾기 — 슬롯별로 번역해 같은 검사를 돌린다. */
  let found = null;
  for (const { kind, re } of JA_SLOTS) {
    for (const m of d.c.matchAll(re)) {
      const inner = m[2];
      const t = norm(inner);
      if (!t || !/[가-힣]/.test(t)) continue;
      const r = ja(kind, t);
      if (!r) continue;
      if (grammarDefect(flat(r.ja))) { found = t; break; }
    }
    if (found) break;
  }
  if (!found) { unattributed++; continue; }
  const e = agg.get(found) ?? { docs: 0, defect: def };
  e.docs++;
  agg.set(found, e);
}
clearMemo();

const list = [...agg.entries()].map(([t, v]) => [v.docs, t, v.defect])
  .sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1], 'ko'));
fs.writeFileSync(`${CACHE}/hff-ja-b04-gate-targets.json`, JSON.stringify(list));
console.log(JSON.stringify({
  documents: docs.length, gateBlocked: blocked,
  attributedPhrases: list.length, unattributedDocs: unattributed,
  byDefect: list.reduce((a, x) => { a[x[2]] = (a[x[2]] ?? 0) + 1; return a; }, {}),
  top: list.slice(0, 12).map((x) => [x[0], x[2], x[1].slice(0, 60)]),
}, null, 1));
