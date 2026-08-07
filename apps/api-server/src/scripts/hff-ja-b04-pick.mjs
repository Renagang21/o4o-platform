/**
 * WO-O4O-HFF-JA-LONGTAIL-CONTINUOUS-SHARD-AUTHORING §5 저작 우선순위 목록
 *
 * 아직 해석되지 않는 문구를 **문서 개방 기여도 내림차순**으로 뽑는다.
 * 한 문구가 여는 문서 수가 많을수록 먼저 저작해야 개방률이 빨리 오른다.
 *
 * 입력: .cache/hff-ja-b04-misses.jsonl   (hff-ja-b04-measure.mjs 산출)
 * 산출: .cache/hff-ja-b04-pick.json      [[docs, koText], ...]
 *
 * 사전이 넓어질 때마다 재실행한다 — 이미 열린 문구는 자동으로 빠진다.
 * 오프라인 전용(DB 접속 없음).
 */
import fs from 'node:fs';
import { ja } from './hff-ja-b01-translate.mjs';

const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const SRC = `${CACHE}/hff-ja-b04-misses.jsonl`;
const SPLIT_NL = new RegExp(String.fromCharCode(92) + 'r?' + String.fromCharCode(92) + 'n');
if (!fs.existsSync(SRC)) { console.error('NO_MISSES — run hff-ja-b04-measure.mjs first'); process.exit(1); }

const misses = fs.readFileSync(SRC, 'utf8').split(SPLIT_NL).filter(Boolean).map((l) => JSON.parse(l));

/* 같은 텍스트가 kind 별로 나뉘어 집계된다. `any` 등재는 전 kind 에 적용되므로 텍스트로 합친다. */
const agg = new Map();
for (const m of misses) {
  const e = agg.get(m.text) ?? { docs: 0, kind: m.kind };
  e.docs += m.docs;
  agg.set(m.text, e);
}

const left = [];
for (const [t, v] of agg) if (!ja(v.kind, t)) left.push([v.docs, t]);
/* 기여도 동률이면 문구 순으로 — 유사 문구가 인접해 계열 단위로 일관 저작하기 쉽다. */
left.sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1], 'ko'));

fs.writeFileSync(`${CACHE}/hff-ja-b04-pick.json`, JSON.stringify(left));
console.log(JSON.stringify({
  distinctTexts: agg.size,
  stillUnresolved: left.length,
  resolvedSinceMeasure: agg.size - left.length,
  topDocs: left.slice(0, 10).map((x) => x[0]),
}, null, 1));
