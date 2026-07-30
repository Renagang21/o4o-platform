/**
 * 잔여 525건 전수 판정 + SAFE patch 생성 (read-only).
 *
 * 직전 WO 의 판정은 마커 정규식이 `①~⑮`·`(가)` 만 인정하고 `*`/맨이름 원료 헤더를 처리하지 못해
 * 경계가 명확한 건들을 전부 불확정으로 떨어뜨렸다. 규칙을 형태별로 확장한다.
 *
 * 안전 규칙 (경계가 **단일하게** 확정되는 형태만):
 *   R-A  단일 라인 · 라벨 없음 · 마커 없음        → 라인 전체 = 1절 (라벨 없음)
 *   R-B  1행 원료 헤더 + 이후 마커 절 라인들      → 단일 그룹 (라벨 생략, 단일 원료)
 *   R-C  헤더 없이 ·/• 불릿 절 라인들             → 절 목록 (라벨 없음)
 *   R-D  닫힌 라벨 + 절 이 여러 원료             → 다원료 → sd-func idiom
 * 그 외 → HUMAN_REVIEW
 *
 * 절 분할은 **라인 단위**만 사용한다(라인 내부 `･`·`•` 재분할 금지 — 원문 충실).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const OUT_CLS = `${D}/hff-ko-why-family-525-classification-v1.json`;
const OUT_SAFE = `${D}/hff-ko-why-family-525-safe-targets-v1.json`;
const OUT_RB = `${D}/hff-ko-why-family-525-rollback-manifest-v1.json`;
const OUT_HR = `${D}/hff-ko-why-family-525-human-review-v1.jsonl`;

const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');
const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why','sd-func','is-solid']);
const HAS_FN = `content ~ '<h2>[^<]*기능성[^<]*</h2>'`;

const FN_VERB = /(도움|필요|개선|유지|감소|억제|보호|완화|증진|원활|관여|생성|형성|흡수)/;
const CLAUSE_MARK = /^(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\((?:가|나|다|라|마)\)|\d+\s*[).]|[·•‧∙‐‑–—-])\s*/;
const stripMark = (s) => s.replace(CLAUSE_MARK, '').trim();
/** 인라인 `원료 : 절` 을 라벨/절로 분리. 라벨은 짧고 기능성 동사가 없어야 한다.
 *  단일 원료군은 라벨을 생략해 렌더하므로(R-B 와 동일 계약) 절만 남긴다. */
function splitInlineLabel(line) {
  const t = stripMark(line);
  const m = t.match(/^([^:：]{1,30})\s*[:：]\s*(.+)$/);
  if (!m) return { clause: t, label: null };
  const label = m[1].trim(), rest = m[2].trim();
  if (FN_VERB.test(label) || !FN_VERB.test(rest) || rest.length < 4) return { clause: t, label: null };
  return { clause: rest, label };
}
const TRAILING_DELIM = /[,;·･․、•]$/;

/** 라인이 원료 헤더인지 (기능성 서술 동사 없음 + 짧음) */
const isHeader = (l) => {
  const t = l.replace(/^\*\s*/, '').replace(/^\[([^\]]*)\]$/, '$1').trim();
  return t.length > 0 && t.length <= 40 && !FN_VERB.test(t);
};

/** 원문 → {ok, rule, groups[{label,clauses}]} */
function parse(raw) {
  const text = (raw ?? '').replace(/\r/g, '');
  if (!nrm(text)) return { ok: false, why: 'NO_OFFICIAL_SOURCE' };
  if (!/[가-힣]/.test(text)) return { ok: false, why: 'ENGLISH_ONLY' };
  const lines = text.split('\n').map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return { ok: false, why: 'NO_LINE' };

  // R-D: 모든 라인이 `[라벨] 절…` (닫힌 라벨 + 뒤에 텍스트) 이고 2개 이상
  const closedWithText = lines.filter((l) => /^\[[^\]\n]+\]\s*\S/.test(l));
  if (closedWithText.length === lines.length && lines.length >= 2) {
    const groups = lines.map((l) => {
      const m = l.match(/^\[([^\]\n]+)\]\s*(.+)$/);
      return { label: m[1].trim(), clauses: [nrm(m[2])] };
    });
    return { ok: true, rule: 'R-D', groups };
  }
  // R-D 단일 라벨 1개 = 단일 그룹
  if (closedWithText.length === lines.length && lines.length === 1) {
    const m = lines[0].match(/^\[([^\]\n]+)\]\s*(.+)$/);
    return { ok: true, rule: 'R-D1', groups: [{ label: m[1].trim(), clauses: [nrm(m[2])] }] };
  }

  // R-A: 단일 라인 · 대괄호/`*` 없음 (선두 불릿 마커는 내용이 아니라 마커이므로 제거)
  if (lines.length === 1 && !lines[0].startsWith('[') && !/^\*/.test(lines[0])) {
    const raw1 = nrm(lines[0]);
    const { clause } = splitInlineLabel(raw1);
    if (!FN_VERB.test(clause)) return { ok: false, why: 'SINGLE_LINE_NOT_FUNCTIONAL' };
    // 라인 내부에 열거 마커가 여러 개면 절 다중 → 별도 처리(R-B3 계열)
    if (/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]/.test(clause)) {
      const cs = clause.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])/).map(stripMark).filter((x) => x.length >= 4);
      if (cs.length >= 2) return { ok: true, rule: 'R-A2', groups: [{ label: null, clauses: cs }] };
    }
    return { ok: true, rule: 'R-A', groups: [{ label: null, clauses: [clause] }] };
  }

  // R-B: 1행 원료 헤더 + 이후 마커 절
  const head = lines[0];
  const rest = lines.slice(1);
  const headerLike = (/^\*/.test(head) || /^\[[^\]\n]+\]$/.test(head) || (!head.startsWith('[') && isHeader(head)));
  if (headerLike && rest.length && rest.every((l) => CLAUSE_MARK.test(l))) {
    const clauses = rest.map(stripMark).filter((x) => x.length >= 4);
    if (clauses.length !== rest.length) return { ok: false, why: 'CLAUSE_TOO_SHORT' };
    return { ok: true, rule: 'R-B', groups: [{ label: null, clauses }] };
  }
  // R-B2: 헤더 + 마커가 한 줄에 이어진 형태 (헤더행 + 단일 절행)
  if (headerLike && rest.length === 1 && !CLAUSE_MARK.test(rest[0]) && FN_VERB.test(rest[0])) {
    return { ok: true, rule: 'R-B2', groups: [{ label: null, clauses: [nrm(rest[0])] }] };
  }
  // R-B3: 헤더 + 마커 절이 한 라인에 여러 개 (①…②…③…)
  if (headerLike && rest.length === 1 && /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]/.test(rest[0])) {
    const cs = rest[0].split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])/).map(stripMark).filter((x) => x.length >= 4);
    if (cs.length) return { ok: true, rule: 'R-B3', groups: [{ label: null, clauses: cs }] };
  }

  // R-C: 헤더 없이 전 라인이 불릿/마커 절
  if (lines.every((l) => CLAUSE_MARK.test(l))) {
    const clauses = lines.map(stripMark).filter((x) => x.length >= 4);
    if (clauses.length === lines.length) return { ok: true, rule: 'R-C', groups: [{ label: null, clauses }] };
  }
  return { ok: false, why: 'BOUNDARY_UNRESOLVED' };
}

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5495', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const pop = (await c.query(`
  SELECT spd.id canonical_id, spd.master_id, spd.content, pc.id candidate_id,
         pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
         pc.raw_payload::jsonb->'source'->>'PRDUCT' name,
         pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
  FROM shared_product_descriptions spd
  LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
    AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
  WHERE spd.source_type='o4o_hff_generated' AND spd.description_type='STORE'
    AND spd.status='canonical' AND coalesce(spd.language,'ko')='ko' AND spd.deleted_at IS NULL
    AND NOT (${HAS_FN}) ORDER BY spd.id`)).rows;
await c.end();

const rows = [], safe = [], hr = [];
const tally = {}, reasonTally = {}, ruleTally = {};
for (const r of pop) {
  const ko = r.content ?? '';
  const rec = { canonicalId: r.canonical_id, candidateId: r.candidate_id, productMasterId: r.master_id,
    statementNo: r.stmt, productName: r.name, currentHash: sha(ko),
    headings: [...ko.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => m[1]), status: null, reason: null };

  if (!r.candidate_id) { rec.status = 'BLOCKED_SOURCE'; rec.reason = 'NO_HFF_CANDIDATE_LINK'; }
  else {
    const p = parse(r.fn);
    if (!p.ok && (p.why === 'NO_OFFICIAL_SOURCE' || p.why === 'ENGLISH_ONLY')) { rec.status = 'BLOCKED_SOURCE'; rec.reason = p.why; }
    else if (!p.ok) { rec.status = 'HUMAN_REVIEW'; rec.reason = p.why; }
    else {
      const all = p.groups.flatMap((g) => g.clauses);
      const anchor = (ko.match(/<h2>섭취방법/g) ?? []).length;
      const why = (ko.match(/<h2>왜 이 제품인가<\/h2>/g) ?? []).length;
      if (!all.every((x) => dense(r.fn).includes(dense(x)))) { rec.status = 'HUMAN_REVIEW'; rec.reason = 'CLAUSE_NOT_VERBATIM'; }
      else if (all.some((x) => TRAILING_DELIM.test(x))) { rec.status = 'HUMAN_REVIEW'; rec.reason = 'CLAUSE_TRAILING_DELIMITER_ARTIFACT'; }
      else if (all.length !== new Set(all.map(dense)).size) { rec.status = 'HUMAN_REVIEW'; rec.reason = 'SOURCE_CLAUSE_REPETITION_NOT_AUTO_APPLIED'; }
      else if (anchor !== 1 || why !== 1) { rec.status = 'BLOCKED_STRUCTURE'; rec.reason = anchor !== 1 ? 'ANCHOR_섭취방법_NOT_UNIQUE' : 'ANCHOR_왜이제품인가_NOT_UNIQUE'; }
      else {
        const multi = p.groups.length >= 2;
        const heading = multi ? '원료별 공식 인정 기능성' : '공식 인정 기능성';
        const body = multi
          ? `<ul class="sd-func">${p.groups.map((g) => `<li><b>${esc(g.label)}</b><ul class="sd-why">${g.clauses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('')}</ul>`
          : `<ul class="sd-why">${p.groups[0].clauses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
        const block = `<h2>${heading}</h2>${body}\n  `;
        const at = ko.indexOf('<h2>섭취방법');
        const newContent = ko.slice(0, at) + block + ko.slice(at);
        const introRe = /<p class="sd-intro">[\s\S]*?<\/p>/, footRe = /<div class="sd-foot">[\s\S]*?<\/div>/;
        const checks = {
          outsideIdentical: newContent.slice(0, at) === ko.slice(0, at) && newContent.slice(at + block.length) === ko.slice(at),
          introUnchanged: (ko.match(introRe)?.[0] ?? null) === (newContent.match(introRe)?.[0] ?? null),
          footUnchanged: (ko.match(footRe)?.[0] ?? null) === (newContent.match(footRe)?.[0] ?? null),
          oldHeadingsKept: [...ko.matchAll(/<h2>[\s\S]*?<\/h2>/g)].map((m) => m[0]).every((h) => newContent.includes(h)),
          headingOrderOk: (() => { const hs = [...newContent.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => m[1]);
            const iw = hs.indexOf('왜 이 제품인가'), ifn = hs.indexOf(heading), ii = hs.findIndex((h) => h.startsWith('섭취방법'));
            return iw >= 0 && ifn === iw + 1 && ii === ifn + 1; })(),
          classesOk: [...newContent.matchAll(/class="([^"]+)"/g)].every((m) => m[1].split(/\s+/).every((x) => !x || DEFINED.has(x))),
          balanced: ['div','ul','li','span','p','h1','h2','b','small'].every((tg) =>
            (newContent.match(new RegExp(`<${tg}[\\s>]`, 'g')) ?? []).length === (newContent.match(new RegExp(`</${tg}>`, 'g')) ?? []).length),
          noEmpty: !/<li>\s*<\/li>|<ul[^>]*>\s*<\/ul>|<h2>\s*<\/h2>/.test(newContent),
          singleFnSection: (newContent.match(/<h2>[^<]*기능성[^<]*<\/h2>/g) ?? []).length === 1,
          driverVocabNotIntroduced: !newContent.includes('<h2>주요 기능성</h2>'),
          noRawBracketInBlock: !/[\[\]]/.test(block.replace(/<[^>]+>/g, '')),
          clausesInNew: all.filter((x) => dense(newContent).includes(dense(x))).length, clausesExpected: all.length,
        };
        const pass = Object.entries(checks).filter(([k]) => !['clausesInNew', 'clausesExpected'].includes(k)).every(([, v]) => v)
          && checks.clausesInNew === checks.clausesExpected;
        if (!pass) { rec.status = 'BLOCKED_STRUCTURE'; rec.reason = 'PATCH_POST_CHECK_FAIL'; rec.failed = Object.entries(checks).filter(([, v]) => v === false).map(([k]) => k); }
        else {
          rec.status = 'SAFE_APPLY'; rec.reason = p.rule; rec.rule = p.rule; rec.multi = multi;
          rec.clauseCount = all.length; rec.groupCount = p.groups.length;
          rec.insertedBlock = block.trim(); rec.newHash = sha(newContent); rec.lenDelta = newContent.length - ko.length;
          safe.push({ ...rec, oldContent: ko, newContent });
          ruleTally[p.rule] = (ruleTally[p.rule] ?? 0) + 1;
        }
      }
    }
  }
  tally[rec.status] = (tally[rec.status] ?? 0) + 1;
  if (rec.status !== 'SAFE_APPLY') {
    reasonTally[`${rec.status}:${rec.reason}`] = (reasonTally[`${rec.status}:${rec.reason}`] ?? 0) + 1;
    hr.push(JSON.stringify({ candidateId: rec.candidateId, statementNo: rec.statementNo, productName: rec.productName,
      canonicalId: rec.canonicalId, status: rec.status, reason: rec.reason,
      sourceMainFunction: nrm(r.fn).slice(0, 600), boundaryEvidence: rec.headings,
      nextAction: rec.status === 'BLOCKED_SOURCE' ? 'SOURCE_REPAIR_OR_EXCLUDE' : 'HUMAN_BOUNDARY_DECISION' }));
  }
  rows.push(rec);
}

fs.writeFileSync(OUT_CLS, JSON.stringify({ classifiedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  population: rows.length, expectedPopulation: 525, populationMatches: rows.length === 525,
  tally, reasonTally, safeRuleTally: ruleTally, rows: rows.map(({ ...x }) => x) }, null, 1));
fs.writeFileSync(OUT_SAFE, JSON.stringify({ total: safe.length, ruleTally, targets: safe.map(({ oldContent, newContent, ...x }) => x) }, null, 1));
fs.writeFileSync(OUT_RB, JSON.stringify({ builtAt: new Date().toISOString(),
  wo: 'WO-O4O-HFF-KO-WHY-FAMILY-SD-FUNC-STYLING-AND-REMAINING-525-FULL-PRODUCTION-V1',
  expectedUpdate: safe.length,
  targets: safe.map((s, i) => ({ targetIndex: i + 1, candidateId: s.candidateId, statementNo: s.statementNo,
    productName: s.productName, productMasterId: s.productMasterId, canonicalId: s.canonicalId,
    rule: s.rule, multiIngredient: s.multi, clauseCount: s.clauseCount, insertedBlock: s.insertedBlock,
    oldContent: s.oldContent, oldContentHash: s.currentHash, newContent: s.newContent, newContentHash: s.newHash,
    applyStatus: 'PENDING' })) }, null, 1));
fs.writeFileSync(OUT_HR, hr.join('\n') + (hr.length ? '\n' : ''));

console.log(JSON.stringify({ population: rows.length, populationMatches: rows.length === 525,
  tally, reasonTally, safeRuleTally: ruleTally, safeCount: safe.length,
  safeClauseTotal: safe.reduce((a, s) => a + s.clauseCount, 0),
  multiIngredientSafe: safe.filter((s) => s.multi).length }, null, 2));
