/**
 * WO-O4O-HFF-MULTILINGUAL-AUTHORING-CONTRACT-PARITY-AND-RESIDUAL-CLEANUP-V1
 * Phase 4-C — EN canonical 정합 patch 생성 (read-only, DB write 0).
 *
 * 작업 3종 (canonicalId 당 1회 UPDATE 로 병합):
 *   AUD  : sd-who 섹션 제거 — KO 에서 확정된 저작 정책의 EN 대응. 문구 생성 없음(삭제 전용).
 *   FOOT : 전문가 안내 절 추가 — **기존 EN canonical 1,543 건에서 실측한 문구를 verbatim 재사용**.
 *          신규 번역·KO 기계 번역을 하지 않는다.
 *   FN   : 기능성 섹션 삽입 — 공식 원문의 `(영문)` 구간이 **모든 원료 그룹을 빠짐없이 커버**할 때만.
 *          부분 근거(일부 원료만 영문 표기)는 기능성을 축소 표기하게 되므로 HOLD.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const OUT_T = `${D}/hff-en-parity-targets-v1.json`;
const OUT_RB = `${D}/hff-en-parity-rollback-v1.json`;
const OUT_HOLD = `${D}/hff-en-parity-final-queue-v1.jsonl`;
const TMP = `${D}/tmp-hff-en-newcontent.json`;

const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');
const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why','sd-func','is-solid']);
const EN = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND language='en'`;

/* 기존 EN canonical 에서 실측한 승인 문구 (Phase 4-B probe, 1,543 건 전량 동일) */
const EN_EXPERT_CLAUSE = '· This health functional food is not a drug for preventing or treating disease; consult a pharmacist or professional in store';
const EN_EXPERT_RE = /(pharmacist|in-store expert|store expert)/i;
const WHO_RE = /<h2>[^<]*<\/h2><ul class="sd-who">[\s\S]*?<\/ul>/;
const FOOT_END_RE = /<div class="sd-foot"><b>[^<]*<\/b>([\s\S]*?)<\/div><\/div>$/;
const EN_FN_HEADING = 'Officially recognised functions';

/** KO 원문의 top-level `[라벨]` 그룹 수 (Phase 2 와 동일 규칙, 깊이 인식) */
function labeledGroupCount(src) {
  const s = nrm(src);
  let i = 0, n = 0;
  while (i < s.length) {
    if (s[i] === '[') {
      let depth = 0, j = i;
      for (; j < s.length; j++) { if (s[j] === '[') depth++; else if (s[j] === ']') { depth--; if (depth === 0) break; } }
      if (depth !== 0) return -1;
      n++; i = j + 1;
    } else i++;
  }
  return n;
}
/** `(영문)` 구간의 영문 문구만 추출 */
function enParts(src) {
  const s = nrm(src);
  const parts = [];
  const re = /\(\s*영\s*문\s*\)\s*([^[(]*(?:\([^)]*\)[^[(]*)*)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const t = m[1].replace(/^[\s,]+|[\s,.]+$/g, '');
    if (t && /[A-Za-z]/.test(t) && !/[가-힣]/.test(t)) parts.push(t);
  }
  if (parts.length) return { kind: 'BILINGUAL_MARKER', parts };
  if (/[A-Za-z]/.test(s) && !/[가-힣]/.test(s) && s) return { kind: 'ENGLISH_ONLY_SOURCE', parts: [s] };
  return { kind: 'NONE', parts: [] };
}

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const scope = (await c.query(`
  SELECT count(*)::int en_total,
         count(*) FILTER (WHERE content LIKE '%class="sd-who"%')::int sd_who,
         count(*) FILTER (WHERE content !~* '(pharmacist|in-store expert|store expert)')::int no_expert,
         count(*) FILTER (WHERE content !~* '<h2>[^<]*function[^<]*</h2>')::int no_fn
  FROM shared_product_descriptions WHERE ${EN}`)).rows[0];

const rows = (await c.query(`
  SELECT spd.id canonical_id, spd.master_id, spd.content, pc.id candidate_id,
         pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
         pc.raw_payload::jsonb->'source'->>'PRDUCT' name,
         pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
  FROM shared_product_descriptions spd
  LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
    AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
  WHERE ${EN.replace(/\b(content|source_type|description_type|status|language|deleted_at)\b/g, 'spd.$1')}
  ORDER BY spd.id`)).rows;
await c.end();

const targets = [], hold = [], comboTally = {}, fnTally = {};
let removedWho = 0, addedFooter = 0, insertedFn = 0, fnClauses = 0;

for (const r of rows) {
  const en = r.content;
  const needWho = en.includes('class="sd-who"');
  const needFoot = !EN_EXPERT_RE.test(en);
  const needFn = !/<h2>[^<]*function[^<]*<\/h2>/i.test(en);
  let cur = en; const ops = [];
  let removedHtml = null, removedAt = -1, insertedBlock = null, clauseCount = 0;

  /* FN — 공식 EN 근거가 모든 원료 그룹을 커버할 때만 */
  if (needFn) {
    const g = enParts(r.fn);
    const gc = labeledGroupCount(r.fn);
    let dec;
    if (!r.candidate_id) dec = { status: 'HOLD', reason: 'NO_HFF_CANDIDATE_LINK' };
    else if (!g.parts.length) dec = { status: 'HOLD', reason: 'NO_OFFICIAL_EN_GROUNDING' };
    else if (gc < 0) dec = { status: 'HOLD', reason: 'UNBALANCED_LABEL_BRACKET' };
    else if (gc > g.parts.length) dec = { status: 'HOLD', reason: `EN_GROUNDING_PARTIAL_${g.parts.length}_OF_${gc}_GROUPS` };
    else if (!g.parts.every((x) => dense(nrm(r.fn)).includes(dense(x)))) dec = { status: 'HOLD', reason: 'EN_CLAUSE_NOT_VERBATIM' };
    else if (g.parts.some((x) => /[가-힣]/.test(x))) dec = { status: 'HOLD', reason: 'KOREAN_LEAKED_INTO_EN_CLAUSE' };
    else if ((en.match(/<h2>Directions/g) ?? []).length !== 1) dec = { status: 'HOLD', reason: 'ANCHOR_NOT_UNIQUE' };
    else dec = { status: 'SAFE_EN_FUNCTION_APPLY', reason: g.kind, parts: g.parts };
    fnTally[dec.status === 'SAFE_EN_FUNCTION_APPLY' ? 'SAFE_EN_FUNCTION_APPLY' : `HOLD:${dec.reason}`] =
      (fnTally[dec.status === 'SAFE_EN_FUNCTION_APPLY' ? 'SAFE_EN_FUNCTION_APPLY' : `HOLD:${dec.reason}`] ?? 0) + 1;
    if (dec.status === 'SAFE_EN_FUNCTION_APPLY') {
      // 라벨은 공식 원문상 한국어이므로 EN 문서에 넣지 않는다(번역 금지) → 무라벨 목록
      insertedBlock = `<h2>${EN_FN_HEADING}</h2><ul class="sd-why">${dec.parts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>\n  `;
      const at = cur.indexOf('<h2>Directions');
      cur = cur.slice(0, at) + insertedBlock + cur.slice(at);
      clauseCount = dec.parts.length; ops.push('FN');
    } else {
      hold.push(JSON.stringify({ canonicalId: r.canonical_id, candidateId: r.candidate_id, statementNo: r.stmt,
        productName: r.name, language: 'en', status: 'HOLD_EN_FUNCTION', reason: dec.reason,
        nextAction: 'OFFICIAL_EN_SOURCE_REQUIRED', finalQueue: true }));
    }
  }

  /* AUD — sd-who 섹션 제거 (삭제 전용) */
  if (needWho) {
    const m = cur.match(WHO_RE);
    /* sd-who 위치는 문서마다 다르다(sd-foot 직전이 아닌 문서 271건 실측).
       역연산은 앵커 문자열이 아니라 제거 오프셋으로 되돌린다. */
    if (m) { removedHtml = m[0]; removedAt = m.index; cur = cur.slice(0, m.index) + cur.slice(m.index + m[0].length); ops.push('AUD'); }
  }
  /* FOOT — 기존 EN canonical 문구 verbatim 추가 */
  if (needFoot && FOOT_END_RE.test(cur) && !EN_EXPERT_RE.test(cur)) {
    cur = cur.replace(/<\/div><\/div>$/, ` ${EN_EXPERT_CLAUSE}</div></div>`);
    ops.push('FOOT');
  }

  if (!ops.length) continue;

  const undefOf = (s) => [...s.matchAll(/class="([^"]+)"/g)].flatMap((m2) => m2[1].split(/\s+/)).filter((x) => x && !DEFINED.has(x));
  const fnCount = (s) => (s.match(/<h2>[^<]*function[^<]*<\/h2>/gi) ?? []).length;
  const introRe = /<p class="sd-intro">[\s\S]*?<\/p>/;
  const checks = {
    whoGone: !cur.includes('class="sd-who"'),
    whoExpected: needWho ? ops.includes('AUD') : true,
    expertPresent: EN_EXPERT_RE.test(cur),
    expertNotDuplicated: (cur.match(new RegExp(EN_EXPERT_CLAUSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length <= 1,
    fnSectionCountNotIncreasedUnexpectedly: fnCount(cur) <= fnCount(en) + (ops.includes('FN') ? 1 : 0),
    fnSectionPresentIfInserted: ops.includes('FN') ? fnCount(cur) >= 1 : true,
    koreanNotIntroduced: (cur.match(/[가-힣]/g) ?? []).length <= (en.match(/[가-힣]/g) ?? []).length,
    introUnchanged: (en.match(introRe)?.[0] ?? null) === (cur.match(introRe)?.[0] ?? null),
    footWrapperKept: /<div class="sd-foot">/.test(cur),
    noNewUndefinedClass: undefOf(cur).length <= undefOf(en).length,
    balanced: ['div','ul','li','span','p','h1','h2','b','small'].every((t) =>
      (cur.match(new RegExp(`<${t}[\\s>]`, 'g')) ?? []).length === (cur.match(new RegExp(`</${t}>`, 'g')) ?? []).length),
    noEmpty: !/<li>\s*<\/li>|<ul[^>]*>\s*<\/ul>|<h2>\s*<\/h2>|<div class="sd-item">\s*<\/div>/.test(cur),
    endsWell: /<\/div><\/div>$/.test(cur),
    changed: cur !== en,
    reversible: (() => {
      let back = cur;
      if (ops.includes('FOOT')) back = back.replace(new RegExp(` ${EN_EXPERT_CLAUSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</div></div>$`), '</div></div>');
      if (ops.includes('AUD')) back = back.slice(0, removedAt) + removedHtml + back.slice(removedAt);
      if (ops.includes('FN')) back = back.replace(insertedBlock, '');
      return sha(back) === sha(en);
    })(),
  };
  const bad = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  if (bad.length) {
    hold.push(JSON.stringify({ canonicalId: r.canonical_id, statementNo: r.stmt, productName: r.name, language: 'en',
      status: 'BLOCKED_STRUCTURE', reason: 'POST_CHECK_FAIL:' + bad.join(','), nextAction: 'STRUCTURE_REVIEW', finalQueue: true }));
    continue;
  }

  const combo = ops.join('+');
  comboTally[combo] = (comboTally[combo] ?? 0) + 1;
  if (ops.includes('AUD')) removedWho++;
  if (ops.includes('FOOT')) addedFooter++;
  if (ops.includes('FN')) { insertedFn++; fnClauses += clauseCount; }
  targets.push({ canonicalId: r.canonical_id, productMasterId: r.master_id, candidateId: r.candidate_id,
    statementNo: r.stmt, productName: r.name, language: 'en', ops, combo,
    oldContentHash: sha(en), newContentHash: sha(cur), oldLength: en.length, newLength: cur.length,
    whoRemovedHtml: removedHtml, whoRemovedAt: removedAt, footerClauseAdded: ops.includes('FOOT') ? EN_EXPERT_CLAUSE : null,
    fnInsertedBlock: insertedBlock, fnClauseCount: clauseCount, newContent: cur });
}

const dup = targets.length - new Set(targets.map((t) => t.canonicalId)).size;
const meta = {
  builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  wo: 'WO-O4O-HFF-MULTILINGUAL-AUTHORING-CONTRACT-PARITY-AND-RESIDUAL-CLEANUP-V1',
  phase: '4 — EN canonical 정합',
  scopeMeasured: scope, candidateRows: rows.length,
  targets: targets.length, canonicalIdDup: dup, comboTally, enFunctionTally: fnTally, holdRows: hold.length,
  reusedAssets: { expertClause: EN_EXPERT_CLAUSE, expertClauseSource: '기존 EN canonical 1,543 건 실측 (Phase 4-B probe) — 신규 번역 아님',
    functionHeading: EN_FN_HEADING, functionHeadingSource: '기존 EN canonical 2,275 건에서 사용 중' },
  effects: { whoSectionsRemoved: removedWho, footerClausesAdded: addedFooter, functionSectionsInserted: insertedFn, functionClausesRestored: fnClauses },
};
fs.writeFileSync(OUT_T, JSON.stringify({ ...meta, targetsIndex: targets.map(({ newContent, ...x }) => x) }, null, 1));
fs.writeFileSync(OUT_RB, JSON.stringify({ ...meta, expectedUpdate: targets.length,
  reversalContract: { AUD: 'whoRemovedHtml 을 whoRemovedAt 오프셋에 재삽입 (FOOT 제거 후, FN 제거 전 순서)', FOOT: "footerClauseAdded 를 ' '+clause 로 말미에서 제거", FN: 'fnInsertedBlock 1회 제거',
    verify: '역연산 후 sha256 == oldContentHash (build reversible 체크로 전건 증명)' },
  targets: targets.map(({ newContent, ...x }) => x) }, null, 1));
fs.writeFileSync(OUT_HOLD, hold.join('\n') + (hold.length ? '\n' : ''));
fs.writeFileSync(TMP, JSON.stringify(targets.map((t) => ({ canonicalId: t.canonicalId, productMasterId: t.productMasterId, oldContentHash: t.oldContentHash, newContentHash: t.newContentHash, newContent: t.newContent })), null, 0));
console.log(JSON.stringify(meta, null, 2));
