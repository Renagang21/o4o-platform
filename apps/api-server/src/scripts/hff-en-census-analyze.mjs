/**
 * WO-O4O-HFF-EN-FULL-40902-SEMANTIC-LINGUISTIC-QUALITY-CENSUS-AND-REPAIR-PLANNING-V1 §4·§5·§6·§9
 *
 * KO↔EN 전수 대조. **오프라인** (hff-en-census-fetch.mjs 가 만든 쌍 캐시만 읽는다).
 *
 * 설계:
 *   - 기계 검사(§9)는 40,902 문서 전수로 돌린다 — 수치·구조·항목수·한글잔존·마커·빈 섹션.
 *   - 의미/언어 검사는 문서를 통째로 읽을 수 없으므로 **슬롯 단위로 KO↔EN 쌍을 뽑아 중복 제거**한다.
 *     같은 EN 문장이 수천 문서에 재사용되므로, 고유 쌍을 문서 기여도 순으로 보면
 *     소수의 패턴이 대다수 문서를 설명한다(§8 군집화 전제).
 *   - 규칙으로 잡히는 언어 결함(§6)은 자동 판정하고, 나머지는 대표 표본으로 사람이 판정할 수 있게 남긴다.
 *
 * 산출: .cache/hff-en-pairs-distinct.json   (고유 KO↔EN 슬롯 쌍 + 문서 수)
 *       .cache/hff-en-machine-issues.jsonl  (기계 검사 결과)
 *       .cache/hff-en-analyze-summary.json
 */
import fs from 'node:fs';
import { JA_SLOTS, norm, koNums } from './hff-ja-b01-translate.mjs';

const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const SRC = `${CACHE}/hff-en-pairs.jsonl`;
const SPLIT_NL = new RegExp(String.fromCharCode(92) + 'r?' + String.fromCharCode(92) + 'n');
if (!fs.existsSync(SRC)) { console.error('NO_PAIRS_CACHE'); process.exit(1); }

const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const cnt = (h, re) => (h.match(re) ?? []).length;
const PARITY = [[/<li[ >]/g, 'li'], [/<h2[ >]/g, 'h2'], [/sd-item/g, 'sd-item'], [/sd-tag/g, 'sd-tag'], [/<b>/g, 'b'], [/<ul[ >]/g, 'ul'], [/<p[ >]/g, 'p']];

/* EN 쪽 수치 토큰 — 단위 표기가 KO 와 같으므로 같은 축으로 센다. */
const NUM_RE = /(?<![A-Za-z0-9])\d+(?:[.,]\d+)*\s*(?:억|만|천)?\s*(?:mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|㎖|L|CFU|cfu|%)?/g;
const numBag = (s) => {
  const m = new Map();
  for (const x of (String(s).match(NUM_RE) ?? [])) {
    const k = x.replace(/[,\s]/g, '').replace(/㎎/g, 'mg').replace(/㎍|μg|mcg/g, 'ug').replace(/㎖/g, 'ml').toLowerCase();
    if (/^\d/.test(k)) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};

/* ── §6 영어 문장 품질: 규칙으로 확실히 잡히는 것만 ─────────────── */
const LING = [
  ['DOUBLE_WORD', /\b(\w+)\s+\1\b/i],                       /* 단어 중복 */
  ['DOUBLE_ARTICLE', /\b(the|a|an)\s+(the|a|an)\b/i],
  ['DOUBLE_PREP', /\b(of|to|in|on|for|with|by|from)\s+(of|to|in|on|for|with|by|from)\b/i],
  ['SPACE_BEFORE_PUNCT', /\s+[,.;:]/],
  ['DOUBLE_PUNCT', /[.]{2,}(?!\.)|,{2,}|;;/],
  ['EMPTY_PAREN', /\(\s*\)|（\s*）/],
  ['DANGLING_CONJ', /\b(and|or|but)\s*[.]?\s*$/i],
  ['HANGUL_IN_EN', HANGUL],
  ['UNCLOSED_QUOTE', /^[^"]*"[^"]*$/],
  ['LOWER_SENT_START', /^[a-z]{3,}/],                        /* 문장 첫 글자 소문자 */
  ['KO_ORDER_MAY_HELP', /\bhelp(?:s|ful)?\s+to\s+(?:be|is|are)\b/i],
  ['NOUN_PILEUP', /(?:\b[A-Za-z]+\b\s+){6,}(?:necessary|required|needed)\b/i],
];
const lingDefects = (s) => {
  const out = [];
  for (const [name, re] of LING) if (re.test(s)) out.push(name);
  return out;
};

/* ── 슬롯 추출 ──────────────────────────────────────────────── */
const slotsOf = (html) => {
  const out = [];
  for (const { kind, re } of JA_SLOTS) {
    for (const m of String(html).matchAll(re)) {
      const t = norm(m[2]);
      if (t) out.push({ kind, t });
    }
  }
  return out;
};

const machine = [];
const pairAgg = new Map();          /* `${kind}\t${ko}\t${en}` -> docs */
const enOnlyAgg = new Map();        /* EN 문장 -> {docs, defects} */
let docs = 0, docsWithMachineIssue = 0;
const counters = {
  NUMERIC_DRIFT: 0, STRUCTURE_DIFF: 0, SECTION_COUNT_DIFF: 0, ITEM_COUNT_DIFF: 0,
  HANGUL_REMAINS: 0, RAW_HTML: 0, EMPTY_SECTION: 0, SLOT_COUNT_DIFF: 0, LICENSE_LOST: 0,
};

for (const line of fs.readFileSync(SRC, 'utf8').split(SPLIT_NL)) {
  if (!line) continue;
  const d = JSON.parse(line);
  docs++;
  const issues = [];

  /* 수치·단위 parity — KO 에 있는 수치가 EN 에 남아 있는가 */
  const kb = numBag(d.ko), eb = numBag(d.en);
  const lost = [];
  for (const [k, n] of kb) if ((eb.get(k) ?? 0) < n) lost.push(k);
  if (lost.length) { counters.NUMERIC_DRIFT++; issues.push({ type: 'NUMERIC_DRIFT', lost: lost.slice(0, 6) }); }

  /* 구조 패리티 */
  for (const [re, name] of PARITY) {
    if (cnt(d.ko, re) !== cnt(d.en, re)) { counters.STRUCTURE_DIFF++; issues.push({ type: 'STRUCTURE_DIFF', at: name, ko: cnt(d.ko, re), en: cnt(d.en, re) }); break; }
  }
  if (cnt(d.ko, /<h2[ >]/g) !== cnt(d.en, /<h2[ >]/g)) counters.SECTION_COUNT_DIFF++;
  if (cnt(d.ko, /<li[ >]/g) !== cnt(d.en, /<li[ >]/g)) counters.ITEM_COUNT_DIFF++;

  /* 한글 잔존 — 제품명(h1)·제조사 표기는 원문 유지 계약이므로 제외 */
  const enRest = d.en.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/[^·<>]{0,40}(?:製造|\(주\)|㈜|주식회사|유한회사)[^·<>]{0,40}/g, ' ');
  if (HANGUL.test(enRest)) { counters.HANGUL_REMAINS++; issues.push({ type: 'HANGUL_REMAINS', txt: (enRest.match(/[^\s]*[가-힣][^\s]*/) ?? [''])[0].slice(0, 40) }); }

  /* raw HTML·빈 섹션 */
  if (/&lt;(?:div|span|li|ul|h2|p)\b/i.test(d.en)) { counters.RAW_HTML++; issues.push({ type: 'RAW_HTML' }); }
  if (/<h2[^>]*>\s*<\/h2>|<li>\s*<\/li>|<ul>\s*<\/ul>/.test(d.en)) { counters.EMPTY_SECTION++; issues.push({ type: 'EMPTY_SECTION' }); }

  /* 개별인정번호 보존 */
  const koLic = new Set((d.ko.match(/\d{4}-\d+/g) ?? []));
  const enLic = new Set((d.en.match(/\d{4}-\d+/g) ?? []));
  const licLost = [...koLic].filter((x) => !enLic.has(x));
  if (licLost.length) { counters.LICENSE_LOST++; issues.push({ type: 'LICENSE_LOST', lost: licLost.slice(0, 5) }); }

  /* 슬롯 대응 */
  const ks = slotsOf(d.ko), es = slotsOf(d.en);
  if (ks.length !== es.length) { counters.SLOT_COUNT_DIFF++; issues.push({ type: 'SLOT_COUNT_DIFF', ko: ks.length, en: es.length }); }
  else {
    for (let i = 0; i < ks.length; i++) {
      if (!HANGUL.test(ks[i].t)) continue;              /* 수치·로마자만인 슬롯은 대조 대상 아님 */
      const key = `${ks[i].kind}\t${ks[i].t}\t${es[i].t}`;
      pairAgg.set(key, (pairAgg.get(key) ?? 0) + 1);
    }
  }
  for (const s of es) {
    if (!/[A-Za-z]/.test(s.t)) continue;
    const e = enOnlyAgg.get(s.t) ?? { docs: 0, kind: s.kind };
    e.docs++; enOnlyAgg.set(s.t, e);
  }

  if (issues.length) { docsWithMachineIssue++; machine.push({ m: d.m, n: d.n, issues }); }
}

/* 고유 KO↔EN 쌍 — 문서 기여도 내림차순 */
const distinct = [...pairAgg.entries()].map(([k, n]) => {
  const [kind, ko, en] = k.split('\t');
  return { docs: n, kind, ko, en, ling: lingDefects(en) };
}).sort((a, b) => b.docs - a.docs);

const lingHit = distinct.filter((x) => x.ling.length);
const lingByType = {};
for (const x of lingHit) for (const t of x.ling) lingByType[t] = (lingByType[t] ?? 0) + 1;
const lingDocsByType = {};
for (const x of lingHit) for (const t of x.ling) lingDocsByType[t] = (lingDocsByType[t] ?? 0) + x.docs;

fs.writeFileSync(`${CACHE}/hff-en-pairs-distinct.json`, JSON.stringify(distinct));
fs.writeFileSync(`${CACHE}/hff-en-machine-issues.jsonl`, machine.map((x) => JSON.stringify(x)).join('\n'));

const summary = {
  documents: docs, docsWithMachineIssue,
  machineCounters: counters,
  distinctPairs: distinct.length,
  distinctEnStrings: enOnlyAgg.size,
  linguisticFlaggedPairs: lingHit.length,
  linguisticByType: lingByType,
  linguisticAffectedDocsByType: lingDocsByType,
  topPairsByDocs: distinct.slice(0, 30).map((x) => ({ docs: x.docs, kind: x.kind, ko: x.ko.slice(0, 60), en: x.en.slice(0, 80), ling: x.ling })),
};
fs.writeFileSync(`${CACHE}/hff-en-analyze-summary.json`, JSON.stringify(summary, null, 1));
console.log(JSON.stringify({ ...summary, topPairsByDocs: summary.topPairsByDocs.slice(0, 10) }, null, 1));
