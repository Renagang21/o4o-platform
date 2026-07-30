/**
 * WO-O4O-HFF-KO-WHY-FAMILY-REMAINING-14-AND-AUTHORING-POLICY-FULL-CLEANUP-V1
 * Phase A~E — 모집단 확정 + 최종 콘텐츠 생성 + rollback manifest (read-only).
 *
 * 작업 3종을 canonicalId 당 **1회 UPDATE** 로 병합한다.
 *   FN     : 공식 기능성 섹션 삽입 (잔여 14건)
 *   AUD    : `이런 분께` section 정확 제거
 *   FOOT   : sd-foot 말미에 왜-family 표준 전문가 안내 절 추가
 *
 * rollback 은 **역연산 정보**(제거된 section HTML · 추가된 절 · 삽입 블록 + 해시)로 저장한다.
 *   15,000+ 건의 old/new 전문을 담으면 파일이 100MB 급이 되어 커밋 불가능하다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const OUT_T = `${D}/hff-ko-why-family-policy-cleanup-targets-v1.json`;
const OUT_14 = `${D}/hff-ko-why-family-remaining-14-decisions-v1.json`;
const OUT_RB = `${D}/hff-ko-why-family-policy-cleanup-rollback-v1.json`;
const OUT_HR = `${D}/hff-ko-why-family-policy-cleanup-human-review-v1.jsonl`;

const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');
const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why','sd-func','is-solid']);

const KO = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`;
const HAS_FN = `content ~ '<h2>[^<]*기능성[^<]*</h2>'`;
const WHO_RE = /<h2>이런 분께<\/h2><ul class="sd-who">[\s\S]*?<\/ul>/;
const EXPERT_PHRASE = '매장 내 약사 등 전문가';
const STD_CLAUSE = '· 건강기능식품은 질병의 예방·치료를 위한 의약품이 아니며, 궁금한 점은 매장 내 약사 등 전문가와 상담하십시오';
const FOOT_END_RE = /<div class="sd-foot"><b>[^<]*<\/b>([\s\S]*?)<\/div><\/div>$/;

const MARKER = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\((?:가|나|다|라|마)\)/;
const FN_VERB = /(도움|필요|개선|유지|감소|억제|보호|완화|증진|원활|관여|생성|형성|흡수)/;
const CLAUSE_MARK = /^(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\((?:가|나|다|라|마)\)|\d+\s*[).]|[·•‧∙‐‑–—-])\s*/;
const stripMark = (s) => s.replace(CLAUSE_MARK, '').trim();

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5496', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

/* ── Phase A: 모집단 ─────────────────────────────────── */
const scope = (await c.query(`
  SELECT
    count(*)::int AS ko_total,
    count(*) FILTER (WHERE content LIKE '%왜 이 제품인가%')::int AS wae_total,
    count(*) FILTER (WHERE NOT (${HAS_FN}))::int AS A_no_fn,
    count(*) FILTER (WHERE content LIKE '%<h2>이런 분께</h2>%')::int AS B_audience_all,
    count(*) FILTER (WHERE content LIKE '%<h2>이런 분께</h2>%' AND content LIKE '%왜 이 제품인가%')::int AS B_audience_wae,
    count(*) FILTER (WHERE content LIKE '%<h2>이런 분께</h2>%' AND content NOT LIKE '%왜 이 제품인가%')::int AS B_audience_nonwae,
    count(*) FILTER (WHERE content NOT LIKE '%${EXPERT_PHRASE}%')::int AS C_no_expert_all,
    count(*) FILTER (WHERE content NOT LIKE '%${EXPERT_PHRASE}%' AND content LIKE '%왜 이 제품인가%')::int AS C_no_expert_wae,
    count(*) FILTER (WHERE content NOT LIKE '%${EXPERT_PHRASE}%' AND content NOT LIKE '%왜 이 제품인가%')::int AS C_no_expert_nonwae
  FROM shared_product_descriptions WHERE ${KO}`)).rows[0];

// 작업 대상: 왜-family 한정 (A ∪ B ∪ C), 비-왜-family 는 보고만
const rows = (await c.query(`
  SELECT spd.id canonical_id, spd.master_id, spd.content, pc.id candidate_id,
         pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
         pc.raw_payload::jsonb->'source'->>'PRDUCT' name,
         pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
  FROM shared_product_descriptions spd
  LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
    AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
  WHERE ${KO.replace(/content/g, 'spd.content').replace(/source_type/g, 'spd.source_type').replace(/description_type/g, 'spd.description_type').replace(/status/g, 'spd.status').replace(/language/g, 'spd.language').replace(/deleted_at/g, 'spd.deleted_at')}
    AND spd.content LIKE '%왜 이 제품인가%'
    AND (NOT (spd.content ~ '<h2>[^<]*기능성[^<]*</h2>')
         OR spd.content LIKE '%<h2>이런 분께</h2>%'
         OR spd.content NOT LIKE '%${EXPERT_PHRASE}%')
  ORDER BY spd.id`)).rows;
await c.end();

/* ── Phase B: 잔여 기능성 파싱 (직전 WO 규칙 재사용) ── */
function parseFn(raw) {
  const text = (raw ?? '').replace(/\r/g, '');
  if (!nrm(text)) return { ok: false, why: 'NO_OFFICIAL_SOURCE' };
  if (!/[가-힣]/.test(text)) return { ok: false, why: 'ENGLISH_ONLY' };
  const lines = text.split('\n').map((x) => x.trim()).filter(Boolean);
  const closed = lines.filter((l) => /^\[[^\]\n]+\]\s*\S/.test(l));
  if (closed.length === lines.length && lines.length >= 1) {
    const groups = lines.map((l) => { const m = l.match(/^\[([^\]\n]+)\]\s*(.+)$/); return { label: m[1].trim(), clauses: [nrm(m[2])] }; });
    return { ok: true, rule: 'R-D', groups };
  }
  if (lines.length === 1 && !lines[0].startsWith('[') && !/^\*/.test(lines[0])) {
    const t = stripMark(nrm(lines[0]));
    if (!FN_VERB.test(t)) return { ok: false, why: 'SINGLE_LINE_NOT_FUNCTIONAL' };
    return { ok: true, rule: 'R-A', groups: [{ label: null, clauses: [t] }] };
  }
  const head = lines[0], rest = lines.slice(1);
  const headerLike = /^\*/.test(head) || /^\[[^\]\n]+\]$/.test(head) || (!head.startsWith('[') && head.length <= 40 && !FN_VERB.test(head));
  if (headerLike && rest.length && rest.every((l) => CLAUSE_MARK.test(l))) {
    const cs = rest.map(stripMark).filter((x) => x.length >= 4);
    if (cs.length === rest.length) return { ok: true, rule: 'R-B', groups: [{ label: null, clauses: cs }] };
  }
  if (lines.every((l) => CLAUSE_MARK.test(l))) {
    const cs = lines.map(stripMark).filter((x) => x.length >= 4);
    if (cs.length === lines.length) return { ok: true, rule: 'R-C', groups: [{ label: null, clauses: cs }] };
  }
  return { ok: false, why: 'BOUNDARY_UNRESOLVED' };
}

const targets = [], decisions14 = [], hr = [], comboTally = {}, fnTally = {};
let removedAudience = 0, addedFooter = 0, insertedFn = 0, fnClauses = 0;

for (const r of rows) {
  const ko = r.content;
  const needFn = !/<h2>[^<]*기능성[^<]*<\/h2>/.test(ko);
  const needAud = ko.includes('<h2>이런 분께</h2>');
  const needFoot = !ko.includes(EXPERT_PHRASE);
  let cur = ko;
  const ops = [];
  let removedHtml = null, insertedBlock = null, clauseCount = 0, fnDecision = null;

  /* FN */
  if (needFn) {
    const p = parseFn(r.fn);
    const anchor = (ko.match(/<h2>섭취방법/g) ?? []).length;
    const why = (ko.match(/<h2>왜 이 제품인가<\/h2>/g) ?? []).length;
    if (!r.candidate_id) fnDecision = { status: 'BLOCKED_SOURCE', reason: 'NO_HFF_CANDIDATE_LINK' };
    else if (!p.ok) fnDecision = { status: p.why === 'NO_OFFICIAL_SOURCE' || p.why === 'ENGLISH_ONLY' ? 'BLOCKED_SOURCE' : 'BLOCKED_AMBIGUOUS_BOUNDARY', reason: p.why };
    else {
      const all = p.groups.flatMap((g) => g.clauses);
      if (!all.every((x) => dense(r.fn).includes(dense(x)))) fnDecision = { status: 'BLOCKED_AMBIGUOUS_BOUNDARY', reason: 'CLAUSE_NOT_VERBATIM' };
      else if (all.some((x) => /[,;·･․、•]$/.test(x))) fnDecision = { status: 'BLOCKED_AMBIGUOUS_BOUNDARY', reason: 'CLAUSE_TRAILING_DELIMITER_ARTIFACT' };
      else if (all.length !== new Set(all.map(dense)).size) fnDecision = { status: 'BLOCKED_AMBIGUOUS_BOUNDARY', reason: 'SOURCE_CLAUSE_REPETITION' };
      else if (anchor !== 1 || why !== 1) fnDecision = { status: 'BLOCKED_STRUCTURE', reason: 'ANCHOR_NOT_UNIQUE' };
      else {
        const multi = p.groups.length >= 2;
        const heading = multi ? '원료별 공식 인정 기능성' : '공식 인정 기능성';
        const body = multi
          ? `<ul class="sd-func">${p.groups.map((g) => `<li><b>${esc(g.label)}</b><ul class="sd-why">${g.clauses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('')}</ul>`
          : `<ul class="sd-why">${p.groups[0].clauses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
        insertedBlock = `<h2>${heading}</h2>${body}\n  `;
        const at = cur.indexOf('<h2>섭취방법');
        cur = cur.slice(0, at) + insertedBlock + cur.slice(at);
        clauseCount = all.length; ops.push('FN');
        fnDecision = { status: 'SAFE_FUNCTION_APPLY', reason: p.rule, clauseCount: all.length, multi };
      }
    }
    decisions14.push({ canonicalId: r.canonical_id, candidateId: r.candidate_id, statementNo: r.stmt,
      productName: r.name, sourceMainFunction: nrm(r.fn).slice(0, 500), ...fnDecision });
    fnTally[fnDecision.status] = (fnTally[fnDecision.status] ?? 0) + 1;
    if (fnDecision.status !== 'SAFE_FUNCTION_APPLY') {
      hr.push(JSON.stringify({ canonicalId: r.canonical_id, candidateId: r.candidate_id, statementNo: r.stmt,
        productName: r.name, status: fnDecision.status, reason: fnDecision.reason,
        sourceMainFunction: nrm(r.fn).slice(0, 600), nextAction: 'HUMAN_BOUNDARY_DECISION' }));
    }
  }

  /* AUD — heading 이 소속된 section 만 정확 제거 */
  if (needAud) {
    const m = cur.match(WHO_RE);
    if (m) { removedHtml = m[0]; cur = cur.replace(WHO_RE, ''); ops.push('AUD'); }
  }

  /* FOOT — sd-foot 말미에 표준 절 추가 */
  if (needFoot) {
    if (FOOT_END_RE.test(cur) && !cur.includes(EXPERT_PHRASE)) {
      cur = cur.replace(/<\/div><\/div>$/, ` ${STD_CLAUSE}</div></div>`);
      ops.push('FOOT');
    }
  }

  if (!ops.length) continue;

  /* 사후 검증 */
  const keepRe = [/<p class="sd-intro">[\s\S]*?<\/p>/, /<h2>섭취방법[\s\S]*?(?=<h2>|<div class="sd-foot">)/, /<h2>표시 기준[\s\S]*?(?=<h2>|<div class="sd-foot">)/];
  /* 클래스·기능성 섹션 수는 **회귀 검사**로 판정한다.
     일부 기존 문서는 정의 밖 class 나 기능성 헤딩 2개를 이미 갖고 있다(선행 저작 산물).
     절대 검사로 두면 AUD/FOOT 만 하는 문서를 기존 상태 때문에 탈락시킨다. */
  const undefOf = (s) => [...s.matchAll(/class="([^"]+)"/g)].flatMap((m2) => m2[1].split(/\s+/)).filter((x) => x && !DEFINED.has(x));
  const fnCount = (s) => (s.match(/<h2>[^<]*기능성[^<]*<\/h2>/g) ?? []).length;
  const checks = {
    audienceGone: !cur.includes('이런 분께'),
    audienceExpected: needAud ? ops.includes('AUD') : true,
    expertPresent: cur.includes(EXPERT_PHRASE),
    expertNotDuplicated: (cur.match(new RegExp(STD_CLAUSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length <= 1,
    // FN 을 실제로 삽입한 경우에만 섹션 존재를 요구한다(FN 차단 문서도 AUD/FOOT 는 적용 대상)
    fnSectionPresentIfInserted: ops.includes('FN') ? /<h2>[^<]*기능성[^<]*<\/h2>/.test(cur) : true,
    fnSectionCountNotIncreased: fnCount(cur) <= fnCount(ko) + (ops.includes('FN') ? 1 : 0),
    introUnchanged: (ko.match(keepRe[0])?.[0] ?? null) === (cur.match(keepRe[0])?.[0] ?? null),
    footWrapperKept: /<div class="sd-foot">/.test(cur),
    noNewUndefinedClass: undefOf(cur).length <= undefOf(ko).length,
    balanced: ['div','ul','li','span','p','h1','h2','b','small'].every((t) =>
      (cur.match(new RegExp(`<${t}[\\s>]`, 'g')) ?? []).length === (cur.match(new RegExp(`</${t}>`, 'g')) ?? []).length),
    noEmpty: !/<li>\s*<\/li>|<ul[^>]*>\s*<\/ul>|<h2>\s*<\/h2>|<div class="sd-item">\s*<\/div>/.test(cur),
    waeKept: cur.includes('<h2>왜 이 제품인가</h2>'),
    driverVocabNotIntroduced: !cur.includes('<h2>주요 기능성</h2>'),
    endsWell: /<\/div><\/div>$/.test(cur),
    changed: cur !== ko,
  };
  // 미변경 섹션 텍스트 보존: 기능성 삽입/이런분께 제거/절 추가 외 텍스트 delta 설명 가능성
  const bad = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  const combo = ops.join('+') || 'NONE';
  if (bad.length) {
    hr.push(JSON.stringify({ canonicalId: r.canonical_id, statementNo: r.stmt, productName: r.name,
      status: 'BLOCKED_STRUCTURE', reason: 'POST_CHECK_FAIL:' + bad.join(','), nextAction: 'STRUCTURE_REVIEW' }));
    continue;
  }
  comboTally[combo] = (comboTally[combo] ?? 0) + 1;
  if (ops.includes('FN')) { insertedFn++; fnClauses += clauseCount; }
  if (ops.includes('AUD')) removedAudience++;
  if (ops.includes('FOOT')) addedFooter++;
  targets.push({
    canonicalId: r.canonical_id, productMasterId: r.master_id, candidateId: r.candidate_id,
    statementNo: r.stmt, productName: r.name, ops, combo,
    oldContentHash: sha(ko), newContentHash: sha(cur),
    oldLength: ko.length, newLength: cur.length,
    fnInsertedBlock: insertedBlock, fnClauseCount: clauseCount,
    audienceRemovedHtml: removedHtml, footerClauseAdded: ops.includes('FOOT') ? STD_CLAUSE : null,
    newContent: cur,
  });
}

const dup = targets.length - new Set(targets.map((t) => t.canonicalId)).size;
fs.writeFileSync(OUT_T, JSON.stringify({
  builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  scopeMeasured: scope,
  scopeNote: '작업 대상은 왜-family 한국어 canonical 로 한정. 비-왜-family 는 보고만 한다.',
  outOfScopeReported: { audience_nonWae: scope.b_audience_nonwae, noExpert_nonWae: scope.c_no_expert_nonwae },
  candidateRows: rows.length, targets: targets.length, canonicalIdDup: dup,
  comboTally, remaining14Tally: fnTally,
  effects: { functionSectionsInserted: insertedFn, functionClausesRestored: fnClauses, audienceSectionsRemoved: removedAudience, footerClausesAdded: addedFooter },
  standardExpertClause: STD_CLAUSE,
  targetsIndex: targets.map(({ newContent, ...x }) => x),
}, null, 1));
fs.writeFileSync(OUT_14, JSON.stringify({ total: decisions14.length, tally: fnTally, decisions: decisions14 }, null, 1));
fs.writeFileSync(OUT_HR, hr.join('\n') + (hr.length ? '\n' : ''));
// rollback: 역연산 정보만 (전문 미포함 — 15k 건 전문 저장 시 100MB 급)
fs.writeFileSync(OUT_RB, JSON.stringify({
  builtAt: new Date().toISOString(),
  wo: 'WO-O4O-HFF-KO-WHY-FAMILY-REMAINING-14-AND-AUTHORING-POLICY-FULL-CLEANUP-V1',
  expectedUpdate: targets.length,
  reversalContract: {
    FN: 'fnInsertedBlock 을 content 에서 제거',
    AUD: 'audienceRemovedHtml 을 sd-body 종료 </div> 앞(제거 위치)에 재삽입',
    FOOT: "footerClauseAdded 를 ' '+clause 형태로 content 말미에서 제거",
    verify: '역연산 후 sha256 == oldContentHash',
  },
  standardExpertClause: STD_CLAUSE,
  targets: targets.map(({ newContent, ...x }) => x),
}, null, 1));
// 적용용 전문은 별도(커밋 제외) 파일
fs.writeFileSync(`${D}/tmp-hff-policy-newcontent.json`, JSON.stringify(targets.map((t) => ({ canonicalId: t.canonicalId, productMasterId: t.productMasterId, oldContentHash: t.oldContentHash, newContentHash: t.newContentHash, newContent: t.newContent })), null, 0));

console.log(JSON.stringify({ scopeMeasured: scope, candidateRows: rows.length, targets: targets.length,
  canonicalIdDup: dup, comboTally, remaining14Tally: fnTally,
  effects: { functionSectionsInserted: insertedFn, functionClausesRestored: fnClauses, audienceSectionsRemoved: removedAudience, footerClausesAdded: addedFooter },
  humanReviewLines: hr.length }, null, 2));
