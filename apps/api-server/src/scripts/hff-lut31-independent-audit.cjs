/**
 * single-lutein 31 — 독립 수기 판정 (공용 파서 미사용, 원문 직접 판정)
 * 목적: hff-source-parse 산출(hff-lut31-rederived.json)과 원문 기반 독립 판정을 대조.
 * read-only. 입력: lut31-raw.json(DB 원문) + rederived.json(파서 산출).
 */
const fs = require('fs');
const SP = __dirname;
const raw = JSON.parse(fs.readFileSync(SP + '/lut31-raw.json', 'utf8'));
const parsed = JSON.parse(fs.readFileSync('c:/Users/home/coding/o4o-platform/docs/checks/data/product-description-guard/hff-lut31-rederived.json', 'utf8'));
const byStmt = Object.fromEntries(raw.map(r => [r.stmt, r]));

// ── 독립 정규화(파서와 별개 구현) ──
const norm = (s) => String(s || '')
  .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
  .replace(/㎍|㎍|ug|µg/gi, 'μg').replace(/㎎/g, 'mg')
  .replace(/\s+/g, ' ').trim();

// 원료 라벨 인식(독립 정의)
const ING = [
  ['비타민A', /비타민\s?A\b|레티놀|베타카로/i],
  ['비타민E', /비타민\s?E\b|토코페롤/i],
  // 루테인: BASE spec 라벨(루테인) ↔ MAIN_FNCTN 기능성 라벨(마리골드꽃추출물)이 상이 — 원문 라벨 전수확인 반영
  ['루테인', /루테인|지아잔틴|마리골드/i],
  ['비타민C', /비타민\s?C\b/i], ['비타민D', /비타민\s?D\b/i],
  ['아연', /아연/], ['셀레늄', /셀레늄|셀렌/], ['구리', /구리/], ['망간', /망간/],
  ['비타민B2', /비타민\s?B\s?2|리보플라빈/i], ['비타민B6', /비타민\s?B\s?6|피리독/i],
  ['비타민B1', /비타민\s?B\s?1\b|티아민/i], ['비타민B12', /비타민\s?B\s?12|코발라민/i],
  ['나이아신', /나이아신|니아신|니코틴/], ['판토텐산', /판토텐/], ['엽산', /엽산|폴[레리]?산/],
  ['비오틴', /비오틴|바이오틴/], ['마그네슘', /마그네슘/], ['칼슘', /칼슘/], ['철', /철분|헴철|피로인산철/],
];
const NONFUNC = /성상|대장균|붕해|납|카드뮴|비소|수은|아플라톡신|세균수|산가|과산화물|타르색소|보존료|수분|회분|중금속|미생물|헥산|엽록소/;
const classify = (l) => { for (const [k, re] of ING) if (re.test(l)) return k; return null; };

// SPEC: 라벨 : (표시량)? (값 단위 [/ 기준 단위])? 의 x~y% | 이상   ← 비율 필수(오탐 가드)
const SPEC_RE = /([가-힣A-Za-z0-9()\-·\s]{2,24}?)\s*[:：]\s*\(?\s*(?:표시량\s*\(?)?\s*([\d][\d,.]*)\s*(mg|g|μg|IU)\s*(?:RAE|RE|NE|DFE|α-?TE|a-?TE)?\s*(?:\/\s*([\d][\d,.]*)\s*(mg|g)\s*)?\)?\s*(?:(?:의\s*)?[\d.]+\s*[~∼\-]\s*[\d.]+\s*%|이상)/gi;

function specSet(base) {
  const b = norm(base); const set = new Set(); const unknown = [];
  let m; SPEC_RE.lastIndex = 0;
  while ((m = SPEC_RE.exec(b)) !== null) {
    const lbl = m[1].replace(/^[\d)．.\s]+/, '').trim();
    if (NONFUNC.test(lbl)) continue;
    const k = classify(lbl);
    if (k) set.add(k); else if (lbl.length > 1) unknown.push(lbl);
  }
  return { set, unknown };
}

// 명시 귀속 구조: [원료] 또는 n) 원료 :  — 라벨이 소유하는 구간을 절단해 그 안의 기능성만 귀속
function attribution(fnText) {
  const t = norm(fnText);
  const marks = [];
  const bracket = /\[([^\]]{1,30})\]/g; let m;
  while ((m = bracket.exec(t)) !== null) marks.push({ idx: m.index, len: m[0].length, label: m[1] });
  let kind = 'bracket';
  if (marks.length === 0) {
    const numbered = /(?:^|\s)(\d{1,2})\s*[).]\s*([가-힣A-Za-z0-9\s]{2,20}?)\s*[:：]/g;
    while ((m = numbered.exec(t)) !== null) marks.push({ idx: m.index, len: m[0].length, label: m[2] });
    kind = 'numbered';
  }
  if (marks.length === 0) {
    // 콜론 라벨형 `원료명 : 기능성` — 번호 없는 명시 구조(numbered 와 구조 동등, 라벨 스코프 확정).
    // 라벨이 알려진 원료로 분류될 때만 인정(추정 귀속 금지).
    const colon = /(?:^|\s)([가-힣A-Za-z0-9()\-·]{2,24}(?:\s?[가-힣A-Za-z0-9()\-·]{1,12})?)\s*[:：]\s*(?=[가-힣])/g;
    while ((m = colon.exec(t)) !== null) { if (classify(m[1].trim())) marks.push({ idx: m.index, len: m[0].length, label: m[1] }); }
    kind = 'colon';
  }
  const mode = marks.length ? kind : 'inline';
  const map = {};
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].idx + marks[i].len;
    const end = i + 1 < marks.length ? marks[i + 1].idx : t.length;
    const k = classify(marks[i].label);
    const seg = t.slice(start, end).trim();
    if (k) (map[k] ??= []).push(seg);
  }
  return { mode, map, wholeText: t };
}

const ANTIOX = /항산화|유해산소로부터\s*세포를\s*보호/;

const rows = [];
for (const p of parsed) {
  const r = byStmt[p.stmt];
  const { set: iSpec, unknown } = specSet(r.base);
  const att = attribution(r.fn);
  const eSpecInd = iSpec.has('비타민E');
  const eSegs = att.map['비타민E'] || [];
  const eFnExplicitInd = att.mode !== 'inline' && eSegs.some(s => ANTIOX.test(s));
  // 독립 fullSet: spec 존재 ∧ (해당 원료에 명시 귀속된 기능성 존재)
  const indFull = [...iSpec].filter(k => (att.map[k] || []).length > 0).sort();
  // 파서 산출
  const pSpec = String(p.specKeys || '').split('+').filter(Boolean);
  const pFn = String(p.fnAttributedKeys || '').split('+').filter(Boolean);
  const eSpecPar = pSpec.includes('비타민E');
  const eFnPar = pFn.includes('비타민E');

  // ── 새 비타민E 정책 적용 ──
  // spec+명시귀속 → 포함 / spec만 → 부원료 제외 / 모호(inline·unknown·fn without spec) → REVIEW
  // 모호성 판정은 **독립 spec 집합** 기준(파서 under-extraction 전파 방지)
  const fnOnlyKeys = Object.keys(att.map).filter(k => !iSpec.has(k));
  const ambiguous = [];
  if (att.mode === 'inline') ambiguous.push('FN_MODE_INLINE');
  if (unknown.length) ambiguous.push('UNKNOWN_SPEC_LABEL:' + unknown.join('|'));
  if (fnOnlyKeys.length) ambiguous.push('FN_WITHOUT_SPEC:' + fnOnlyKeys.join('|'));
  if (eSpecInd && !eFnExplicitInd && att.mode !== 'inline') ambiguous.push('E_SPEC_ONLY');

  const verified = eSpecInd && eFnExplicitInd
    ? indFull
    : indFull.filter(k => k !== '비타민E');

  const verdict = ambiguous.length ? 'REVIEW' : (verified.join('+') === '루테인' ? 'KEEP_SINGLE' : 'PASS');

  rows.push({
    stmt: p.stmt, name: r.name,
    parserFullSet: p.rederivedFullSet, parserVerdict: p.verdict, parserReasons: p.reasons,
    indSpecSet: [...iSpec].sort().join('+'), indFnKeys: Object.keys(att.map).sort().join('+'),
    indMode: att.mode, eSpec: eSpecInd, eFnExplicit: eFnExplicitInd,
    verifiedFullSet: verified.join('+'), verdict, ambiguous,
    agreeSpec: [...iSpec].sort().join('+') === pSpec.slice().sort().join('+'),
    agreeMode: att.mode === p.fnMode,
    agreeE: (eSpecInd === eSpecPar) && (eFnExplicitInd === (eFnPar && p.fnMode !== 'inline')),
    queueFullSet: p.queueFullSet,
    evidenceESpec: eSpecInd ? (norm(r.base).match(new RegExp('[^,;]*비타민\\s?E[^,;]*')) || [''])[0].slice(0, 90) : '',
    evidenceEFn: eSegs.length ? eSegs[0].slice(0, 90) : '',
  });
}
fs.writeFileSync(SP + '/lut31-independent.json', JSON.stringify(rows, null, 1));

// 대조 요약
const dis = rows.filter(r => !r.agreeSpec || !r.agreeMode || !r.agreeE);
console.log('=== 독립 판정 vs 파서 대조 ===');
console.log('총', rows.length, '| spec 일치', rows.filter(r => r.agreeSpec).length, '| mode 일치', rows.filter(r => r.agreeMode).length, '| E판정 일치', rows.filter(r => r.agreeE).length);
console.log('불일치', dis.length);
dis.forEach(r => console.log('  MISMATCH', r.stmt, 'spec', r.indSpecSet, 'vs', r.parserFullSet, '| mode', r.indMode, '| eSpec', r.eSpec, 'eFn', r.eFnExplicit));
const vt = {}; rows.forEach(r => vt[r.verdict] = (vt[r.verdict] || 0) + 1);
console.log('\n=== 새 정책 적용 판정 ==='); console.log(JSON.stringify(vt));
const gt = {}; rows.filter(r => r.verdict !== 'REVIEW').forEach(r => gt[r.verifiedFullSet] = (gt[r.verifiedFullSet] || 0) + 1);
console.log('=== 확정(PASS/KEEP_SINGLE) 그룹별 ==='); console.log(JSON.stringify(gt, null, 1));
const chg = rows.filter(r => r.verifiedFullSet !== r.queueFullSet);
console.log('=== 기존 큐 대비 변경', chg.length, '건 ===');
const cm = {}; chg.forEach(r => { const k = r.queueFullSet + ' → ' + r.verifiedFullSet; cm[k] = (cm[k] || 0) + 1; });
console.log(JSON.stringify(cm, null, 1));
console.log('\n=== REVIEW 상세 ===');
rows.filter(r => r.verdict === 'REVIEW').forEach(r => console.log(' ', r.stmt, r.name, '|', r.ambiguous.join(';')));
