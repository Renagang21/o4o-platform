/**
 * WO-O4O-HFF-EN-FULL-40902-SEMANTIC-LINGUISTIC-QUALITY-CENSUS-AND-REPAIR-PLANNING-V1 §8·§12
 *
 * 오류를 **문서 개별이 아니라 공통 패턴으로 군집화**한다(§8).
 * 한글 잔존이 어느 섹션에서 나오는지 `<h2>` 기준으로 귀속시켜, 재번역 단위를 섹션/문구로 확정한다.
 *
 * 오프라인 전용. 산출:
 *   data/hff-en-full-repair-clusters-v1.json
 *   data/hff-en-full-quality-issues-v1.jsonl
 *   data/hff-en-full-quality-summary-v1.json
 */
import fs from 'node:fs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-EN-FULL-40902-SEMANTIC-LINGUISTIC-QUALITY-CENSUS-AND-REPAIR-PLANNING-V1';
const SPLIT_NL = new RegExp(String.fromCharCode(92) + 'r?' + String.fromCharCode(92) + 'n');
const HANGUL = /[가-힣]/;

/* 단위를 동반한 수치만 센다 — 맨숫자(항목번호·`1일 1회`의 어형 변화)는 대조축이 아니다. */
const NUM = /(?<![A-Za-z0-9])\d+(?:[.,]\d+)*\s*(?:억|만|천)?\s*(?:mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|㎖|L|CFU|cfu|%)/gi;
const bag = (s) => {
  const m = new Map();
  for (const x of (String(s).match(NUM) ?? [])) {
    const k = x.replace(/[,\s]/g, '').replace(/㎎/g, 'mg').replace(/㎍|μg|mcg/g, 'ug').replace(/㎖/g, 'ml').toLowerCase();
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};
const cnt = (h, re) => (h.match(re) ?? []).length;
const stripKeep = (s) => s.replace(/[^·<>]{0,40}(?:製造|\(주\)|㈜|주식회사|유한회사)[^·<>]{0,40}/g, ' ');

/** `<h2>제목</h2> …본문…` 구간으로 문서를 자른다. h1 제품명은 제외한다. */
function sections(html) {
  const body = String(html).replace(/<h1[\s\S]*?<\/h1>/g, '');
  const out = [];
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/g;
  let m;
  while ((m = re.exec(body))) out.push({ title: m[1].replace(/<[^>]+>/g, '').trim(), body: m[2] });
  if (!out.length) out.push({ title: '(no-h2)', body });
  return out;
}
const visible = (h) => stripKeep(String(h).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const issues = [];
const secResidue = new Map();     /* EN 섹션 제목 -> {docs, tokens} */
const phraseResidue = new Map();  /* 한글 잔존 문장 -> {docs, sec} */
const counters = {
  HANGUL_RESIDUE: 0, NUMERIC_DRIFT: 0, LICENSE_LOST: 0,
  STRUCTURE_DIFF: 0, SECTION_COUNT_DIFF: 0, ITEM_COUNT_DIFF: 0, EMPTY_SECTION: 0,
};
let docs = 0, pass = 0;

for (const line of fs.readFileSync(`${CACHE}/hff-en-pairs.jsonl`, 'utf8').split(SPLIT_NL)) {
  if (!line) continue;
  const d = JSON.parse(line);
  docs++;
  const docIssues = [];

  /* ① 한글 잔존 — 섹션별 귀속 */
  const secs = sections(d.en);
  let residueTokens = 0;
  for (const s of secs) {
    const v = visible(s.body);
    if (!HANGUL.test(v)) continue;
    const toks = (v.match(/[^\s]*[가-힣][^\s]*/g) ?? []);
    residueTokens += toks.length;
    const e = secResidue.get(s.title) ?? { docs: 0, tokens: 0 };
    e.docs++; e.tokens += toks.length; secResidue.set(s.title, e);
    /* 잔존 문장 단위 — 재번역 단위 확정용 */
    for (const sent of v.split(/(?<=[.!?。])\s+|(?:\s*·\s*)/)) {
      const t = sent.trim();
      if (!t || !HANGUL.test(t)) continue;
      const key = t.slice(0, 160);
      const p = phraseResidue.get(key) ?? { docs: 0, sec: s.title };
      p.docs++; phraseResidue.set(key, p);
    }
  }
  if (residueTokens) {
    counters.HANGUL_RESIDUE++;
    docIssues.push({ type: 'REPAIR_LINGUISTIC', code: 'HANGUL_RESIDUE', tokens: residueTokens });
  }

  /* ② 수치·단위 (단위 동반분만) */
  const kb = bag(d.ko), eb = bag(d.en);
  const lost = [];
  for (const [k, n] of kb) if ((eb.get(k) ?? 0) < n) lost.push(k);
  if (lost.length) { counters.NUMERIC_DRIFT++; docIssues.push({ type: 'REPAIR_SEMANTIC', code: 'NUMERIC_DRIFT', lost: lost.slice(0, 6) }); }

  /* ③ 개별인정번호 */
  const koLic = new Set((d.ko.match(/\d{4}-\d+/g) ?? []));
  const licLost = [...koLic].filter((x) => !new Set((d.en.match(/\d{4}-\d+/g) ?? [])).has(x));
  if (licLost.length) { counters.LICENSE_LOST++; docIssues.push({ type: 'REPAIR_SEMANTIC', code: 'LICENSE_LOST', lost: licLost.slice(0, 5) }); }

  /* ④ 구조 */
  const h2k = cnt(d.ko, /<h2[ >]/g), h2e = cnt(d.en, /<h2[ >]/g);
  const lik = cnt(d.ko, /<li[ >]/g), lie = cnt(d.en, /<li[ >]/g);
  if (h2k !== h2e) { counters.SECTION_COUNT_DIFF++; docIssues.push({ type: 'REPAIR_STRUCTURE', code: 'SECTION_COUNT_DIFF', ko: h2k, en: h2e }); }
  if (lik !== lie) { counters.ITEM_COUNT_DIFF++; docIssues.push({ type: 'REPAIR_STRUCTURE', code: 'ITEM_COUNT_DIFF', ko: lik, en: lie }); }
  if (/<h2[^>]*>\s*<\/h2>|<li>\s*<\/li>/.test(d.en)) { counters.EMPTY_SECTION++; docIssues.push({ type: 'REPAIR_STRUCTURE', code: 'EMPTY_SECTION' }); }

  if (!docIssues.length) pass++;
  else issues.push({ m: d.m, n: d.n, enId: d.ei, issues: docIssues });
}

/* ── 군집 ─────────────────────────────────────────────────── */
const secList = [...secResidue.entries()].map(([title, v]) => ({ section: title, docs: v.docs, tokens: v.tokens }))
  .sort((a, b) => b.docs - a.docs);
const phraseList = [...phraseResidue.entries()].map(([ko, v]) => ({ docs: v.docs, section: v.sec, ko }))
  .sort((a, b) => b.docs - a.docs);

let cid = 0;
const clusters = [];
for (const s of secList.slice(0, 12)) {
  clusters.push({
    clusterId: `C${String(++cid).padStart(2, '0')}`,
    type: 'REPAIR_LINGUISTIC', code: 'HANGUL_RESIDUE_SECTION',
    section: s.section, affectedDocs: s.docs, residueTokens: s.tokens,
    representativeKo: (phraseList.find((p) => p.section === s.section) ?? {}).ko?.slice(0, 120) ?? null,
    correctDirection: '해당 섹션 본문을 KO canonical 기준으로 영어로 재번역한다. 섹션 구조·항목 수는 유지.',
    autoRepairable: false, retranslationRequired: true,
    regressionRisk: 'LOW — 섹션 단위 교체이며 수치·구조는 대조 게이트로 검증 가능',
  });
}
clusters.push({
  clusterId: `C${String(++cid).padStart(2, '0')}`,
  type: 'REPAIR_SEMANTIC', code: 'NUMERIC_DRIFT',
  affectedDocs: counters.NUMERIC_DRIFT,
  correctDirection: 'KO 의 단위 동반 수치가 EN 에 그대로 남도록 재생성. 수치 토큰은 원문 그대로 옮긴다.',
  autoRepairable: false, retranslationRequired: true, regressionRisk: 'MEDIUM — 수치 보존 게이트 필수',
});
clusters.push({
  clusterId: `C${String(++cid).padStart(2, '0')}`,
  type: 'REPAIR_SEMANTIC', code: 'LICENSE_LOST',
  affectedDocs: counters.LICENSE_LOST,
  correctDirection: '개별인정번호(제20XX-N호)를 EN 본문에 원문 표기로 복원.',
  autoRepairable: true, retranslationRequired: false, regressionRisk: 'LOW',
});
clusters.push({
  clusterId: `C${String(++cid).padStart(2, '0')}`,
  type: 'REPAIR_STRUCTURE', code: 'STRUCTURE_DIFF',
  affectedDocs: counters.SECTION_COUNT_DIFF + counters.ITEM_COUNT_DIFF + counters.EMPTY_SECTION,
  correctDirection: 'KO 와 섹션·항목 수를 일치시킨다. 누락 항목은 재번역, 빈 섹션은 제거 또는 채움.',
  autoRepairable: false, retranslationRequired: true, regressionRisk: 'MEDIUM',
});

fs.writeFileSync(`${D}/hff-en-full-quality-issues-v1.jsonl`, issues.map((x) => JSON.stringify(x)).join('\n'));
fs.writeFileSync(`${D}/hff-en-full-repair-clusters-v1.json`, JSON.stringify({
  wo: WO, generatedAt: new Date().toISOString(), clusters,
  sectionResidueRanking: secList,
  topResiduePhrases: phraseList.slice(0, 200),
}, null, 1));

const summary = {
  wo: WO, generatedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  documents: docs, passDocuments: pass, issueDocuments: issues.length,
  totalIssues: issues.reduce((a, b) => a + b.issues.length, 0),
  countersByCode: counters,
  distinctResiduePhrases: phraseList.length,
  sectionsWithResidue: secList.length,
  topSectionsByAffectedDocs: secList.slice(0, 12),
  topResiduePhrases: phraseList.slice(0, 20).map((p) => ({ docs: p.docs, section: p.section, ko: p.ko.slice(0, 90) })),
};
fs.writeFileSync(`${D}/hff-en-full-quality-summary-v1.json`, JSON.stringify(summary, null, 1));
console.log(JSON.stringify({ ...summary, topResiduePhrases: summary.topResiduePhrases.slice(0, 8) }, null, 1));
