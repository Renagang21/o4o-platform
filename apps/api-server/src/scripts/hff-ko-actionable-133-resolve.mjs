/**
 * 133건 판정 빌더 (read-only).
 *
 * 직전 WO 대비 교정한 규칙 3가지:
 *   1) 중복 가드는 **그룹 내부**로 한정한다. 서로 다른 원료가 동일 기능성 문구를 각각 공식
 *      보유하는 것은 정상이며(예: MSM·NAG 의 "관절 및 연골 건강"), 그룹 간 비교는 오판이다.
 *   2) 라벨 라인 앞의 구두점(`,[프로바이오틱스]`)을 제거한 뒤 라벨을 인식한다.
 *   3) `(국문)`·마커 없는 기능성 라인은 **직전 라벨 그룹의 계속**으로 귀속한다.
 *      단 선행 라벨이 없으면 고아로 보고 HOLD.
 *
 * SAFE 조건: 전 절이 소유자 확정(라벨 그룹 또는 라벨이 전혀 없는 단일 묶음)
 *            · 원문 verbatim · 영문 제외 · 그룹 내 중복/손상 없음 · 현재 canonical 대비 누락 재현
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const POP = JSON.parse(fs.readFileSync(`${D}/hff-ko-actionable-hold-133-population-v1.json`, 'utf8'));
const OUT_DEC = `${D}/hff-ko-actionable-hold-133-human-decisions-v1.json`;
const OUT_SAFE = `${D}/hff-ko-actionable-hold-133-safe-targets-v1.json`;
const OUT_RB = `${D}/hff-ko-actionable-hold-133-rollback-v1.json`;

const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');
const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why','sd-func','is-solid']);
const MARK = /^(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\((?:가|나|다|라|마)\)|\(\s*\d+\s*\)|\d+\s*[).]|[·•‧∙‐‑–—-])\s*/;
const EMBEDDED = /.\s*(?:\d+\s*\)|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])\s*\S/;
const FN_VERB = /(도움|필요|개선|유지|감소|억제|보호|완화|증진|원활|관여|생성|형성|흡수|조절)/;
const EN = /^\(영문\)|^[A-Za-z][A-Za-z ,.'()\/-]{15,}$/;
const GRADE = /^\(?생리활성기능\s*\d등급\)?$/;

const clean = (x) => { let v = String(x).trim(), p = null;
  while (v !== p) { p = v; v = v.replace(/^\(국문\)\s*/, '').replace(MARK, '').trim(); }
  return v; };

/** 라벨 라인 내부 / 연속 라인 → 절 배열 */
function toClauses(text) {
  const t = String(text ?? '').trim();
  if (!t) return [];
  let parts;
  if (/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]/.test(t)) parts = t.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])/);
  // `(1) A (2) B` 처럼 숫자 괄호 마커가 2개 이상이면 그 경계로 분할한다.
  //   미지원 시 한 절에 `(2)` 가 박힌 채로 남아 손상으로 오판된다.
  else if ((t.match(/\(\s*\d+\s*\)/g) ?? []).length >= 2) parts = t.split(/(?=\(\s*\d+\s*\))/);
  else if (t.includes('/')) parts = t.split('/');
  else if (/,\s*(?=[가-힣])/.test(t) && t.split(/,\s*/).filter((x) => FN_VERB.test(x)).length >= 2) parts = t.split(/,\s*/);
  else parts = [t];
  return parts.map(clean).filter((x) => x.length >= 4 && FN_VERB.test(x) && !EN.test(x));
}

/** 원문 → {ok, groups[{label|null, clauses[]}], enDropped} */
function parse(raw) {
  const text = String(raw ?? '').replace(/\r/g, '');
  if (!nrm(text)) return { ok: false, why: 'NO_SOURCE' };
  const groups = [];
  let cur = null, orphan = 0, enDropped = 0, labelSeen = false;
  for (const line0 of text.split('\n')) {
    // 라벨 라인 앞 구두점 제거 (`,[프로바이오틱스]` 형태)
    const line = line0.trim().replace(/^[,،;·]\s*/, '');
    if (!line) continue;
    if (EN.test(line)) { enDropped++; continue; }
    if (GRADE.test(line)) continue;                       // 등급 표기는 기능성 절이 아님
    const closed = line.match(/^\[([^\]\n]+)\]\s*(.*)$/);
    if (closed) {
      labelSeen = true;
      cur = { label: closed[1].trim(), clauses: [] }; groups.push(cur);
      cur.clauses.push(...toClauses(closed[2]));
      continue;
    }
    if (line.startsWith('[')) {
      const b = line.slice(1);
      const m = b.match(/\((?:국문)\)|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]/);
      if (!m) return { ok: false, why: 'OPEN_LABEL_NO_MARKER' };
      const label = b.slice(0, m.index).trim();
      if (/[\[\]]/.test(label)) return { ok: false, why: 'LABEL_HAS_BRACKET' };
      labelSeen = true;
      cur = { label, clauses: [] }; groups.push(cur);
      cur.clauses.push(...toClauses(b.slice(m.index)));
      continue;
    }
    if (/^\*/.test(line)) { labelSeen = true; cur = { label: line.replace(/^\*\s*/, '').trim(), clauses: [] }; groups.push(cur); continue; }
    // 마커 없는/`(국문)` 연속 라인 → 직전 라벨 그룹의 계속
    const cs = toClauses(line);
    if (!cs.length) continue;
    if (!cur) {
      if (labelSeen) { orphan += cs.length; continue; }   // 라벨을 본 뒤의 고아 = 귀속 불명
      cur = { label: null, clauses: [] }; groups.push(cur);  // 라벨이 전혀 없는 문서 = 단일 묶음
    }
    cur.clauses.push(...cs);
  }
  const g = groups.filter((x) => x.clauses.length);
  if (!g.length) return { ok: false, why: 'NO_PARSABLE_CLAUSE' };
  if (orphan) return { ok: false, why: 'ORPHAN_CLAUSE_AFTER_LABEL' };
  // 라벨이 하나라도 있으면 전 그룹이 라벨을 가져야 한다(부분 라벨 = 귀속 불명)
  if (labelSeen && g.some((x) => !x.label)) return { ok: false, why: 'PARTIAL_LABEL_OWNERSHIP_UNCLEAR' };
  // 그룹 **내부** 손상 검사 (그룹 간 동일 문구는 정상 — 원료별 공식 보유)
  for (const x of g) {
    // 절 안에 대괄호가 남아 있으면 라인 중간의 인라인 원료 라벨을 파서가 놓친 것이다.
    //   그대로 두면 라벨이 기능성 문장에 섞여 렌더된다.
    if (x.clauses.some((v) => /[\[\]]/.test(v))) return { ok: false, why: 'INLINE_LABEL_IN_CLAUSE' };
    // `기능성 내용 :` 같은 머리말은 기능성 절이 아니다.
    if (x.clauses.some((v) => /^기능성\s*내용\s*[:：]/.test(v))) return { ok: false, why: 'HEADER_PREFIX_AS_CLAUSE' };
    if (x.clauses.some((v) => EMBEDDED.test(v))) return { ok: false, why: 'EMBEDDED_MARKER_IN_CLAUSE' };
    if (x.clauses.some((v) => /[,;·･․、•\/]$/.test(v))) return { ok: false, why: 'TRAILING_DELIMITER' };
    if (x.clauses.length !== new Set(x.clauses.map(dense)).size) return { ok: false, why: 'DUPLICATE_CLAUSE_IN_GROUP' };
    if (x.clauses.some((v, i) => x.clauses.some((w, j) => i !== j && dense(w).includes(dense(v))))) return { ok: false, why: 'CLAUSE_OVERLAP_IN_GROUP' };
  }
  return { ok: true, groups: g, enDropped, labelSeen };
}

const innerLis = (h) => { const o = []; const re = /<li[^>]*>([\s\S]*?)(?=<li[^>]*>|<\/li>)/g; let m;
  while ((m = re.exec(h)) !== null) { const x = m[1].replace(/<[^>]+>/g, '').trim(); if (x) o.push(x); } return o; };

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5499', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const ids = POP.rows.map((r) => r.candidateId);
const cand = new Map();
for (let i = 0; i < ids.length; i += 500) {
  for (const r of (await c.query(`SELECT id, raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn FROM product_candidates WHERE id = ANY($1)`, [ids.slice(i, i + 500)])).rows) cand.set(r.id, r.fn);
}
const cids = POP.rows.map((r) => r.canonicalId);
const canon = new Map();
for (let i = 0; i < cids.length; i += 500) {
  for (const r of (await c.query(`SELECT id, content, master_id FROM shared_product_descriptions WHERE id = ANY($1)`, [cids.slice(i, i + 500)])).rows) canon.set(r.id, r);
}
await c.end();

const decisions = [], safe = [];
const tally = {}, holdReason = {};
for (const r of POP.rows) {
  const raw = cand.get(r.candidateId) ?? '';
  const cn = canon.get(r.canonicalId);
  const ko = cn?.content ?? '';
  const d = { candidateId: r.candidateId, statementNo: r.statementNo, productName: r.productName,
    canonicalId: r.canonicalId, productMasterId: r.productMasterId, queueReason: r.queueReason };
  const p = parse(raw);
  if (!p.ok) {
    d.status = p.why === 'PARTIAL_LABEL_OWNERSHIP_UNCLEAR' || p.why === 'ORPHAN_CLAUSE_AFTER_LABEL'
      ? 'FINAL_HOLD_INGREDIENT_OWNERSHIP_AMBIGUOUS'
      : (p.why.includes('EMBEDDED') || p.why.includes('INLINE_LABEL') || p.why.includes('HEADER_PREFIX') || p.why.includes('OVERLAP') || p.why.includes('DUPLICATE') || p.why.includes('TRAILING') ? 'FINAL_HOLD_SOURCE_CONFLICT' : 'FINAL_HOLD_BOUNDARY_AMBIGUOUS');
    d.reason = p.why;
    decisions.push(d); tally[d.status] = (tally[d.status] ?? 0) + 1; holdReason[p.why] = (holdReason[p.why] ?? 0) + 1; continue;
  }
  const all = p.groups.flatMap((g) => g.clauses);
  if (!all.every((x) => dense(raw).includes(dense(x)))) {
    d.status = 'FINAL_HOLD_BOUNDARY_AMBIGUOUS'; d.reason = 'CLAUSE_NOT_VERBATIM';
    decisions.push(d); tally[d.status] = (tally[d.status] ?? 0) + 1; holdReason[d.reason] = (holdReason[d.reason] ?? 0) + 1; continue;
  }
  const blk = ko.match(/<h2>[^<]*기능성[^<]*<\/h2>[\s\S]*?(?=<h2>|<div class="sd-foot">)/);
  if (!blk) {
    d.status = 'FINAL_HOLD_CANONICAL_STRUCTURE_UNSAFE'; d.reason = 'NO_FUNCTION_BLOCK';
    decisions.push(d); tally[d.status] = (tally[d.status] ?? 0) + 1; holdReason[d.reason] = (holdReason[d.reason] ?? 0) + 1; continue;
  }
  const curItems = innerLis(blk[0]).map(dense);
  const missing = all.filter((x) => !curItems.some((i) => i.includes(dense(x))));
  if (!missing.length) {
    d.status = 'RESOLVED_NO_CHANGE'; d.reason = 'ALL_OFFICIAL_CLAUSES_PRESENT';
    decisions.push(d); tally[d.status] = (tally[d.status] ?? 0) + 1; continue;
  }
  const multi = p.groups.length >= 2 && p.groups.every((g) => g.label);
  const heading = multi ? '원료별 공식 인정 기능성' : (blk[0].match(/<h2>([^<]*)<\/h2>/)?.[1] ?? '공식 인정 기능성');
  const body = multi
    ? `<ul class="sd-func">${p.groups.map((g) => `<li><b>${esc(g.label)}</b><ul class="sd-why">${g.clauses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('')}</ul>`
    : `<ul class="sd-why">${all.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const trailing = blk[0].match(/\s*$/)?.[0] ?? '';
  const newBlock = `<h2>${heading}</h2>${body}${trailing}`;
  const newContent = ko.replace(blk[0], newBlock);
  const ck = {
    outsideIdentical: ko.replace(blk[0], ' ') === newContent.replace(newBlock, ' '),
    allPresent: all.every((x) => dense(newContent).includes(dense(x))),
    classesOk: [...newContent.matchAll(/class="([^"]+)"/g)].every((m) => m[1].split(/\s+/).every((x) => !x || DEFINED.has(x))),
    balanced: ['div','ul','li','span','p','h1','h2','b','small'].every((t) => (newContent.match(new RegExp(`<${t}[\\s>]`, 'g')) ?? []).length === (newContent.match(new RegExp(`</${t}>`, 'g')) ?? []).length),
    noEmpty: !/<li>\s*<\/li>|<ul[^>]*>\s*<\/ul>|<h2>\s*<\/h2>/.test(newContent),
    singleFn: (newContent.match(/<h2>[^<]*기능성[^<]*<\/h2>/g) ?? []).length === 1,
    // 영문 금지는 **기능성 절**에만 적용한다. 원료명 라벨(예: 락추로스 파우더(Lactulose Powder))의
    // 영문은 공식 원료명의 일부이므로 위반이 아니다.
    noEnglishInClauses: !all.some((x) => /[A-Za-z]{6,}/.test(x)),
    noMarker: !innerLis(body).some((x) => MARK.test(x)),
    changed: newContent !== ko,
  };
  if (!Object.values(ck).every(Boolean)) {
    d.status = 'FINAL_HOLD_CANONICAL_STRUCTURE_UNSAFE';
    d.reason = 'POST_CHECK:' + Object.entries(ck).filter(([, v]) => !v).map(([k]) => k).join(',');
    decisions.push(d); tally[d.status] = (tally[d.status] ?? 0) + 1; holdReason[d.reason] = (holdReason[d.reason] ?? 0) + 1; continue;
  }
  d.status = 'SAFE_UPDATE'; d.restoredClauses = missing.length; d.groups = p.groups.length;
  d.labelled = !!p.labelSeen; d.enDropped = p.enDropped;
  safe.push({ ...d, oldContentHash: sha(ko), newContentHash: sha(newContent), oldBlock: blk[0], newBlock, newContent,
    groupDetail: p.groups.map((g) => ({ label: g.label, clauses: g.clauses })) });
  decisions.push(d); tally[d.status] = (tally[d.status] ?? 0) + 1;
}

fs.writeFileSync(OUT_DEC, JSON.stringify({ builtAt: new Date().toISOString(), total: decisions.length, tally, holdReasonTally: holdReason, decisions }, null, 1));
fs.writeFileSync(OUT_SAFE, JSON.stringify({ total: safe.length, targets: safe.map(({ newContent, ...x }) => x) }, null, 1));
fs.writeFileSync(OUT_RB, JSON.stringify({ builtAt: new Date().toISOString(),
  wo: 'WO-O4O-HFF-KO-FINAL-ACTIONABLE-HOLD-133-HUMAN-RESOLUTION-V1', expectedUpdate: safe.length,
  reversal: 'newBlock → oldBlock 치환 후 sha256 == oldContentHash',
  targets: safe.map((x) => ({ canonicalId: x.canonicalId, productMasterId: x.productMasterId,
    oldContentHash: x.oldContentHash, newContentHash: x.newContentHash, oldBlock: x.oldBlock, newBlock: x.newBlock })) }, null, 1));
fs.writeFileSync(`${D}/tmp-hff-133-newcontent.json`, JSON.stringify(safe.map((x) => ({ canonicalId: x.canonicalId, newContent: x.newContent, oldContentHash: x.oldContentHash, newContentHash: x.newContentHash })), null, 0));

console.log(JSON.stringify({ total: decisions.length, tally, holdReasonTally: holdReason,
  safe: safe.length, restoredClauses: safe.reduce((a, x) => a + x.restoredClauses, 0) }, null, 2));
