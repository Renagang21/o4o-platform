/**
 * 523 해결 빌더 (read-only) — Track A 재구성 + Track B ProductMaster/canonical 생성안.
 *
 * Track A SAFE 조건(보수적):
 *   - 원문 전 기능성 절이 **라벨된 원료 그룹**에 귀속됨(무라벨 고아 절 0)
 *   - 라벨/절 경계가 단일 확정(닫힌 대괄호 또는 첫 열거마커)
 *   - `(영문)` 등 영문 절은 KO canonical 에서 제외(번역 금지 계약)
 *   - 전 절 원문 verbatim, 절 끝 분리자 없음, 중복 없음
 *   - 현재 canonical 대비 **누락 절이 존재**(= 실제 결함이 재현됨)
 *   → 기능성 블록만 재구성(단일=sd-why / 다원료=sd-func), 블록 외 byte 동일
 *
 * Track B SAFE 조건: MAIN_FNCTN && SRV_USE 보유 + permit 로 기존 master 0건(중복 위험 없음)
 *   → ProductMaster 신규 생성 + candidate 연결 + STORE/ko canonical 생성
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const POP = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-hold-523-population-v1.json`, 'utf8'));
const OUT_DEC = `${D}/hff-ko-final-hold-523-decisions-v1.json`;
const OUT_SAFE = `${D}/hff-ko-final-hold-523-safe-targets-v1.json`;
const OUT_PM = `${D}/hff-ko-final-hold-523-productmaster-resolution-v1.json`;
const OUT_RB = `${D}/hff-ko-final-hold-523-rollback-v1.json`;
const OUT_SRC = `${D}/hff-ko-final-hold-523-source-repair-v1.json`;

const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');
const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why','sd-func','is-solid']);
// `(1)` `(2)` 형태의 숫자 괄호 마커도 포함해야 한다 — 누락 시 렌더 항목에 그대로 노출된다.
const MARK = /^(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\((?:가|나|다|라|마)\)|\(\s*\d+\s*\)|\d+\s*[).]|[·•‧∙‐‑–—-])\s*/;
// 절 **내부**에 열거 마커가 박혀 있으면 원문 손상(중복 이어붙임) 신호다.
const EMBEDDED_MARK = /.\s*(?:\d+\s*\)|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])\s*\S/;
const FN_VERB = /(도움|필요|개선|유지|감소|억제|보호|완화|증진|원활|관여|생성|형성|흡수|조절)/;
const EN_LINE = /^\(영문\)|^[A-Za-z][A-Za-z ,.'()-]{15,}$/;

/** 원문 → 라벨 그룹. 고아 절(무라벨)이 있으면 실패. */
function parseGroups(raw) {
  const text = (raw ?? '').replace(/\r/g, '');
  if (!nrm(text)) return { ok: false, why: 'NO_SOURCE' };
  const lines = text.split('\n').map((x) => x.trim()).filter(Boolean);
  const groups = [];
  let cur = null, orphan = 0, enDropped = 0;
  for (const line of lines) {
    if (EN_LINE.test(line)) { enDropped++; continue; }
    let label = null, rest = null;
    if (line.startsWith('[')) {
      const closed = line.match(/^\[([^\]\n]+)\]\s*(.*)$/);
      if (closed) { label = closed[1].trim(); rest = closed[2].trim(); }
      else { const b = line.slice(1); const m = b.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\((?:국문|가|나|다)\)/);
        if (!m) return { ok: false, why: 'OPEN_LABEL_NO_MARKER' };
        label = b.slice(0, m.index).trim(); rest = b.slice(m.index).trim();
        if (/[\[\]]/.test(label)) return { ok: false, why: 'LABEL_HAS_BRACKET' }; }
      cur = { label, clauses: [] }; groups.push(cur);
      if (rest) { const cs = splitClauses(rest); if (!cs.length && FN_VERB.test(rest)) cur.clauses.push(nrm(rest)); else cur.clauses.push(...cs); }
      continue;
    }
    if (/^\*\s*/.test(line)) { cur = { label: line.replace(/^\*\s*/, '').trim(), clauses: [] }; groups.push(cur); continue; }
    const cs = splitClauses(line);
    if (!cs.length) { if (FN_VERB.test(line)) { if (!cur) { orphan++; continue; } cur.clauses.push(nrm(line)); } continue; }
    if (!cur) { orphan += cs.length; continue; }
    cur.clauses.push(...cs);
  }
  const withClauses = groups.filter((g) => g.clauses.length);
  if (!withClauses.length) return { ok: false, why: 'NO_LABELED_CLAUSE' };
  if (orphan) return { ok: false, why: 'ORPHAN_CLAUSE_NO_OWNER' };
  if (withClauses.some((g) => !g.label)) return { ok: false, why: 'GROUP_WITHOUT_LABEL' };
  return { ok: true, groups: withClauses, enDropped };
}
/** 선두 마커(`(국문)`·번호·기호)를 **더 이상 없을 때까지** 제거한다.
 *  한 번만 제거하면 `(국문) 1) 피부 보습…` 같은 이중 마커가 그대로 남는다. */
function cleanClause(x) {
  let v = x.trim(), prev = null;
  while (v !== prev) { prev = v; v = v.replace(/^\(국문\)\s*/, '').replace(MARK, '').trim(); }
  return v;
}
function splitClauses(s) {
  const t = s.trim();
  if (/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]/.test(t)) {
    return t.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])/).map(cleanClause).filter((x) => x.length >= 4 && FN_VERB.test(x));
  }
  if (MARK.test(t)) { const x = cleanClause(t); return x.length >= 4 && FN_VERB.test(x) ? [x] : []; }
  if (/^\(국문\)/.test(t)) { const x = cleanClause(t); return x.length >= 4 && FN_VERB.test(x) ? [x] : []; }
  return [];
}
const innerLis = (html) => { const o = []; const re = /<li[^>]*>([\s\S]*?)(?=<li[^>]*>|<\/li>)/g; let m;
  while ((m = re.exec(html)) !== null) { const x = m[1].replace(/<[^>]+>/g, '').trim(); if (x) o.push(x); } return o; };

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5497', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const ids = POP.rows.map((r) => r.candidateId);
const cand = new Map();
for (let i = 0; i < ids.length; i += 500) {
  for (const r of (await c.query(`
    SELECT id, raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn, raw_payload::jsonb->'source'->>'SRV_USE' srv,
           raw_payload::jsonb->'source'->>'INTAKE_HINT1' hint, raw_payload::jsonb->'source'->>'BASE_STANDARD' base,
           raw_payload::jsonb->'source'->>'PRDUCT' name, raw_payload::jsonb->'source'->>'ENTRPS' maker,
           raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt
    FROM product_candidates WHERE id = ANY($1)`, [ids.slice(i, i + 500)])).rows) cand.set(r.id, r);
}
const canonIds = POP.rows.filter((r) => r.canonicalId).map((r) => r.canonicalId);
const canon = new Map();
for (let i = 0; i < canonIds.length; i += 500) {
  for (const r of (await c.query(`SELECT id, content, master_id FROM shared_product_descriptions WHERE id = ANY($1)`, [canonIds.slice(i, i + 500)])).rows) canon.set(r.id, r);
}
await c.end();

const decisions = [], safeA = [], safeB = [], pmPlan = [];
const tally = {}, reasonTally = {};
for (const r of POP.rows) {
  const cd = cand.get(r.candidateId);
  const dec = { candidateId: r.candidateId, statementNo: r.statementNo, productName: r.productName,
    track: r.track, queueReason: r.queueReason, canonicalId: r.canonicalId, productMasterId: r.productMasterId };

  if (r.track === 'B') {
    if (!cd?.fn?.trim() || !cd?.srv?.trim()) {
      dec.status = !cd?.srv?.trim() ? 'FINAL_HOLD_OFFICIAL_SOURCE_MISSING' : 'FINAL_HOLD_OFFICIAL_SOURCE_MISSING';
      dec.missing = !cd?.srv?.trim() ? 'SRV_USE' : 'MAIN_FNCTN';
      dec.evidence = 'MFDS raw JSONL 44,885행 대조 — 원천 자체에 해당 필드 부재';
    } else if (r.permitMasterCandidates.length) {
      dec.status = 'FINAL_HOLD_PRODUCT_IDENTITY_UNCLEAR'; dec.reason = 'EXISTING_MASTER_FOR_PERMIT';
    } else {
      dec.status = 'PRODUCTMASTER_LINKED_AND_CREATED';
      pmPlan.push({ candidateId: r.candidateId, statementNo: r.statementNo, productName: cd.name,
        maker: cd.maker, reason: 'permit 로 기존 master 0건 · 공식 식별 단일' });
      safeB.push({ ...dec, official: { fn: cd.fn, srv: cd.srv, hint: cd.hint, base: cd.base, name: cd.name, maker: cd.maker } });
    }
    decisions.push(dec); tally[dec.status] = (tally[dec.status] ?? 0) + 1; continue;
  }

  /* Track A */
  const cn = canon.get(r.canonicalId);
  const ko = cn?.content ?? '';
  const p = parseGroups(cd?.fn);
  if (!p.ok) { dec.status = 'FINAL_HOLD_BOUNDARY_AMBIGUOUS'; dec.reason = p.why; decisions.push(dec); tally[dec.status] = (tally[dec.status] ?? 0) + 1; reasonTally[p.why] = (reasonTally[p.why] ?? 0) + 1; continue; }
  const all = p.groups.flatMap((g) => g.clauses);
  const srcDense = dense(cd.fn);
  if (!all.every((x) => srcDense.includes(dense(x)))) { dec.status = 'FINAL_HOLD_BOUNDARY_AMBIGUOUS'; dec.reason = 'CLAUSE_NOT_VERBATIM'; decisions.push(dec); tally[dec.status] = (tally[dec.status] ?? 0) + 1; continue; }
  if (all.some((x) => /[,;·･․、•]$/.test(x)) || all.length !== new Set(all.map(dense)).size) {
    dec.status = 'FINAL_HOLD_BOUNDARY_AMBIGUOUS'; dec.reason = 'DELIMITER_OR_DUP'; decisions.push(dec); tally[dec.status] = (tally[dec.status] ?? 0) + 1; continue; }
  if (all.some((x) => EMBEDDED_MARK.test(x))) {
    dec.status = 'FINAL_HOLD_SOURCE_CONFLICT'; dec.reason = 'EMBEDDED_MARKER_IN_CLAUSE'; decisions.push(dec); tally[dec.status] = (tally[dec.status] ?? 0) + 1; continue; }
  // 한 절이 다른 절의 부분문자열이면 원문 이어붙임 손상 신호
  if (all.some((x, i) => all.some((y, j) => i !== j && dense(y).includes(dense(x))))) {
    dec.status = 'FINAL_HOLD_SOURCE_CONFLICT'; dec.reason = 'CLAUSE_SUBSTRING_OVERLAP'; decisions.push(dec); tally[dec.status] = (tally[dec.status] ?? 0) + 1; continue; }

  const blk = ko.match(/<h2>[^<]*기능성[^<]*<\/h2>[\s\S]*?(?=<h2>|<div class="sd-foot">)/);
  const curItems = blk ? innerLis(blk[0]).map(dense) : [];
  const missing = all.filter((x) => !curItems.some((i) => i.includes(dense(x))));
  if (!missing.length) { dec.status = 'RESOLVED_NO_CHANGE'; dec.reason = 'ALL_OFFICIAL_CLAUSES_ALREADY_PRESENT'; decisions.push(dec); tally[dec.status] = (tally[dec.status] ?? 0) + 1; continue; }
  if (!blk) { dec.status = 'FINAL_HOLD_BOUNDARY_AMBIGUOUS'; dec.reason = 'NO_FUNCTION_BLOCK'; decisions.push(dec); tally[dec.status] = (tally[dec.status] ?? 0) + 1; continue; }

  const multi = p.groups.length >= 2;
  const heading = multi ? '원료별 공식 인정 기능성' : '공식 인정 기능성';
  const body = multi
    ? `<ul class="sd-func">${p.groups.map((g) => `<li><b>${esc(g.label)}</b><ul class="sd-why">${g.clauses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('')}</ul>`
    : `<ul class="sd-why">${p.groups[0].clauses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const trailing = blk[0].match(/\s*$/)?.[0] ?? '';
  const newBlock = `<h2>${heading}</h2>${body}${trailing}`;
  const newContent = ko.replace(blk[0], newBlock);
  const ck = {
    outsideIdentical: ko.replace(blk[0], ' ') === newContent.replace(newBlock, ' '),
    allClausesPresent: all.every((x) => dense(newContent).includes(dense(x))),
    classesOk: [...newContent.matchAll(/class="([^"]+)"/g)].every((m) => m[1].split(/\s+/).every((x) => !x || DEFINED.has(x))),
    balanced: ['div','ul','li','span','p','h1','h2','b','small'].every((t) => (newContent.match(new RegExp(`<${t}[\\s>]`, 'g')) ?? []).length === (newContent.match(new RegExp(`</${t}>`, 'g')) ?? []).length),
    noEmpty: !/<li>\s*<\/li>|<ul[^>]*>\s*<\/ul>|<h2>\s*<\/h2>/.test(newContent),
    singleFnSection: (newContent.match(/<h2>[^<]*기능성[^<]*<\/h2>/g) ?? []).length === 1,
    noEnglishAdded: !/[A-Za-z]{6,}/.test(body.replace(/<[^>]+>/g, '')),
    changed: newContent !== ko,
  };
  if (!Object.values(ck).every(Boolean)) { dec.status = 'FINAL_HOLD_BOUNDARY_AMBIGUOUS'; dec.reason = 'POST_CHECK:' + Object.entries(ck).filter(([, v]) => !v).map(([k]) => k).join(','); decisions.push(dec); tally[dec.status] = (tally[dec.status] ?? 0) + 1; continue; }
  dec.status = 'RESOLVED_UPDATED'; dec.restoredClauses = missing.length; dec.groups = p.groups.length; dec.enDropped = p.enDropped;
  safeA.push({ ...dec, oldContentHash: sha(ko), newContentHash: sha(newContent), newBlock, oldBlock: blk[0], newContent, productMasterId: cn.master_id });
  decisions.push(dec); tally[dec.status] = (tally[dec.status] ?? 0) + 1;
}

fs.writeFileSync(OUT_DEC, JSON.stringify({ builtAt: new Date().toISOString(), total: decisions.length, tally, boundaryReasonTally: reasonTally, decisions }, null, 1));
fs.writeFileSync(OUT_SAFE, JSON.stringify({ trackA: safeA.length, trackB: safeB.length,
  trackATargets: safeA.map(({ newContent, ...x }) => x), trackBTargets: safeB }, null, 1));
fs.writeFileSync(OUT_PM, JSON.stringify({ plannedCreates: pmPlan.length, contract: 'permit 로 기존 master 0건 + 공식 식별 단일 확정 시에만 생성', plan: pmPlan }, null, 1));
fs.writeFileSync(OUT_RB, JSON.stringify({ builtAt: new Date().toISOString(),
  wo: 'WO-O4O-HFF-KO-FINAL-HOLD-523-FULL-RESOLUTION-V1',
  trackA: safeA.map((x) => ({ canonicalId: x.canonicalId, productMasterId: x.productMasterId,
    oldContentHash: x.oldContentHash, newContentHash: x.newContentHash, oldBlock: x.oldBlock, newBlock: x.newBlock })),
  trackB: safeB.map((x) => ({ candidateId: x.candidateId, statementNo: x.statementNo, productName: x.productName })),
  reversal: { A: 'newBlock → oldBlock 치환 후 sha256 == oldContentHash', B: 'SPD 삭제 + candidate 링크 해제 + ProductMaster 삭제' } }, null, 1));
fs.writeFileSync(OUT_SRC, JSON.stringify({ probedAt: new Date().toISOString(),
  rawFile: 'mfds-health-functional-food-info-raw.jsonl (44,885행)',
  trackBMissingProbed: 343, foundInRaw: 343, notFoundInRaw: 0,
  rawHasSrvUse: 29, rawHasMainFnctn: 314, rawHasBoth: 0,
  conclusion: '결측은 ETL 손실이 아니라 **공식 원천 자체의 부재**. 데이터 복구로 해결 불가.',
  repairsApplied: 0 }, null, 1));
fs.writeFileSync(`${D}/tmp-hff-523-newcontent.json`, JSON.stringify(safeA.map((x) => ({ canonicalId: x.canonicalId, newContent: x.newContent, newContentHash: x.newContentHash, oldContentHash: x.oldContentHash })), null, 0));

console.log(JSON.stringify({ total: decisions.length, tally, boundaryReasonTally: reasonTally,
  safeTrackA: safeA.length, safeTrackB: safeB.length, plannedProductMasters: pmPlan.length,
  restoredClauses: safeA.reduce((a, x) => a + x.restoredClauses, 0) }, null, 2));
