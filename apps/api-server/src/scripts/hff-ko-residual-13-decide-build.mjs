/**
 * WO-O4O-HFF-MULTILINGUAL-AUTHORING-CONTRACT-PARITY-AND-RESIDUAL-CLEANUP-V1
 * Phase 2 — ko 기능성 섹션 부재 13건 사람 판정 + 경계 확정 건 patch 생성 (read-only, DB write 0).
 *
 * 13건은 전량 프로바이오틱스 복합 제품이며, 직전 WO 의 라인 기반 parser 가
 * `BOUNDARY_UNRESOLVED` 로 차단했다. 차단 원인은 실제로 3가지뿐이다.
 *   (1) 여러 `[라벨] 본문` 그룹이 **한 줄**에 이어져 있어 라인 분해가 실패
 *   (2) 라벨 안에 중첩 대괄호가 있음 — 예: `[리스펙타(Respecta®)[프로바이오틱스 등 복합물](제2019-26호)]`
 *   (3) `(국문)`/`(영문)` 병기
 *
 * 사람 판정 결론(경계 규칙):
 *   - 그룹 경계는 **깊이 인식 top-level `[...]` 라벨**로만 잡는다.
 *   - 그룹 **내부는 절대 쪼개지 않는다**. `•`·`･`·`·` 로 나열된 프로바이오틱스 문구는
 *     말미의 "…에 도움을 줄 수 있음" 이 분배 공유되므로, 쪼개면 원문에 없는 문장이 생긴다.
 *     한 그룹 = 한 절(원문 그대로).
 *   - `(영문)` 이후는 EN 자산이므로 KO 문서에 넣지 않는다. `(국문)` 마커만 제거한다.
 *   - 라벨 밖 텍스트가 남으면 라벨을 만들어내야 하므로 **HOLD**(문구 생성 금지).
 *   - 라벨이 전혀 없고 `*헤더 + ①②③` 형태면 헤더를 라벨로, ①②③ 를 절 경계로 쓴다.
 * 모든 절은 공식 원문의 verbatim 부분문자열이어야 하며(dense 비교), 아니면 HOLD.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const OUT_DEC = `${D}/hff-ko-residual-13-decisions-v1.json`;
const OUT_T = `${D}/hff-ko-residual-13-targets-v1.json`;
const OUT_RB = `${D}/hff-ko-residual-13-rollback-v1.json`;
const OUT_HOLD = `${D}/hff-ko-residual-13-final-queue-v1.jsonl`;
const TMP = `${D}/tmp-hff-residual13-newcontent.json`;

const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');
const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why','sd-func','is-solid']);
const KO = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`;

/** 깊이 인식 top-level `[...]` 그룹 분해. 라벨 밖 잔여 텍스트도 함께 돌려준다. */
function splitLabeledGroups(src) {
  const s = nrm(src);
  const groups = []; const outside = [];
  let i = 0, cursor = 0;
  while (i < s.length) {
    if (s[i] === '[') {
      const pre = s.slice(cursor, i).replace(/^[\s,]+|[\s,]+$/g, '');
      if (pre) outside.push(pre);
      let depth = 0, j = i;
      for (; j < s.length; j++) {
        if (s[j] === '[') depth++;
        else if (s[j] === ']') { depth--; if (depth === 0) break; }
      }
      if (depth !== 0) return { ok: false, why: 'UNBALANCED_LABEL_BRACKET' };
      const label = s.slice(i + 1, j).trim();
      // 본문 = 다음 top-level '[' 직전까지
      let k = j + 1, d2 = 0, end = s.length;
      for (; k < s.length; k++) {
        if (s[k] === '[') { if (d2 === 0) { end = k; break; } d2++; }
        else if (s[k] === ']') d2--;
      }
      groups.push({ label, body: s.slice(j + 1, end).replace(/^[\s,]+|[\s,]+$/g, '') });
      i = end; cursor = end;
    } else i++;
  }
  const tail = s.slice(cursor).replace(/^[\s,]+|[\s,]+$/g, '');
  if (tail && groups.length) outside.push(tail);
  else if (tail && !groups.length) outside.push(tail);
  return { ok: true, groups, outside };
}

/** `(국문)`/`(영문)` 병기 처리 — 국문만 취하고 영문 구간은 버린다. */
function koOnly(body) {
  let t = body;
  const en = t.search(/\(\s*영\s*문\s*\)/);
  if (en >= 0) t = t.slice(0, en);
  t = t.replace(/\(\s*국\s*문\s*\)\s*/g, '');
  return t.replace(/^[\s,]+|[\s,.]+$/g, '').trim();
}

const ENUM = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]/g;

function decide(fnRaw) {
  const src = nrm(fnRaw);
  if (!src) return { status: 'HOLD', reason: 'NO_OFFICIAL_SOURCE' };
  if (!/[가-힣]/.test(src)) return { status: 'HOLD', reason: 'ENGLISH_ONLY' };

  const sp = splitLabeledGroups(src);
  if (!sp.ok) return { status: 'HOLD', reason: sp.why };

  let groups;
  let rule;
  if (sp.groups.length) {
    if (sp.outside.length) return { status: 'HOLD', reason: 'UNLABELED_TEXT_OUTSIDE_GROUPS', outside: sp.outside };
    rule = 'H-1 라벨그룹 = 절 (그룹 내부 미분할, 영문 제외)';
    groups = sp.groups.map((g) => ({ label: g.label, clauses: [koOnly(g.body)] }));
  } else {
    // 라벨 없음 — `*헤더 + ①②③` 만 허용
    const m = src.match(/^\*\s*([^①-⑮]+?)\s*(?=[①-⑮])/);
    if (!m) return { status: 'HOLD', reason: 'NO_LABEL_AND_NO_ENUM_HEADER' };
    const header = m[1].trim();
    const rest = src.slice(m[0].length);
    const marks = [...rest.matchAll(ENUM)].map((x) => x.index);
    if (marks.length < 2) return { status: 'HOLD', reason: 'ENUM_TOO_FEW' };
    const cs = marks.map((at, n) => rest.slice(at + 1, n + 1 < marks.length ? marks[n + 1] : rest.length).trim().replace(/^[\s,]+|[\s,]+$/g, ''));
    rule = 'H-2 열거헤더 = 라벨, ①②③ = 절 경계';
    groups = [{ label: header, clauses: cs }];
  }

  const all = groups.flatMap((g) => g.clauses);
  if (!all.length || all.some((x) => x.length < 4)) return { status: 'HOLD', reason: 'CLAUSE_TOO_SHORT' };
  if (!all.every((x) => dense(src).includes(dense(x)))) return { status: 'HOLD', reason: 'CLAUSE_NOT_VERBATIM' };
  if (!groups.every((g) => g.label && g.label.length >= 2)) return { status: 'HOLD', reason: 'LABEL_MISSING' };
  if (!groups.every((g) => dense(src).includes(dense(g.label)))) return { status: 'HOLD', reason: 'LABEL_NOT_VERBATIM' };
  if (all.some((x) => /[,;･･、•]$/.test(x))) return { status: 'HOLD', reason: 'CLAUSE_TRAILING_DELIMITER_ARTIFACT' };
  if (all.length !== new Set(all.map(dense)).size) return { status: 'HOLD', reason: 'CLAUSE_REPETITION' };
  if (all.some((x) => /[A-Za-z]{6,}/.test(x))) return { status: 'HOLD', reason: 'ENGLISH_TEXT_LEAKED_INTO_KO_CLAUSE' };
  return { status: 'SAFE_FUNCTION_APPLY', reason: rule, groups, clauseCount: all.length };
}

/* ── DB (read-only) ────────────────────────────────────── */
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const rows = (await c.query(`
  SELECT spd.id canonical_id, spd.master_id, spd.content, pc.id candidate_id,
         pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
         pc.raw_payload::jsonb->'source'->>'PRDUCT' name,
         pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
  FROM shared_product_descriptions spd
  LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
    AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
  WHERE ${KO.replace(/\b(content|source_type|description_type|status|language|deleted_at)\b/g, 'spd.$1')}
    AND spd.content !~ '<h2>[^<]*기능성[^<]*</h2>'
  ORDER BY spd.id`)).rows;
await c.end();

const decisions = [], targets = [], hold = [], tally = {};
for (const r of rows) {
  const d = decide(r.fn);
  const anchor = (r.content.match(/<h2>섭취방법/g) ?? []).length;
  const why = (r.content.match(/<h2>왜 이 제품인가<\/h2>/g) ?? []).length;
  let final = d;
  if (d.status === 'SAFE_FUNCTION_APPLY' && (anchor !== 1 || why !== 1)) final = { status: 'HOLD', reason: 'ANCHOR_NOT_UNIQUE' };

  const rec = { canonicalId: r.canonical_id, candidateId: r.candidate_id, statementNo: r.stmt,
    productName: r.name, status: final.status, reason: final.reason,
    clauseCount: final.clauseCount ?? 0, groupCount: final.groups?.length ?? 0,
    sourceMainFunction: nrm(r.fn).slice(0, 600) };
  decisions.push(rec);
  tally[final.status] = (tally[final.status] ?? 0) + 1;

  if (final.status !== 'SAFE_FUNCTION_APPLY') {
    hold.push(JSON.stringify({ ...rec, nextAction: 'HUMAN_BOUNDARY_DECISION', finalQueue: true }));
    continue;
  }

  /* 라벨이 있으면 그룹 수와 무관하게 라벨 보존 형태(sd-func)로 렌더한다.
     단일 그룹을 `sd-why` 평면 목록으로 내면 개별인정 원료명·인정번호가 통째로 소실된다
     (Phase 2-B 렌더 검증에서 LABEL_MISSING 9건으로 실제 검출). */
  const labeled = final.groups.every((g) => !!g.label);
  const heading = labeled ? '원료별 공식 인정 기능성' : '공식 인정 기능성';
  const body = labeled
    ? `<ul class="sd-func">${final.groups.map((g) => `<li><b>${esc(g.label)}</b><ul class="sd-why">${g.clauses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('')}</ul>`
    : `<ul class="sd-why">${final.groups[0].clauses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const insertedBlock = `<h2>${heading}</h2>${body}\n  `;
  const at = r.content.indexOf('<h2>섭취방법');
  const cur = r.content.slice(0, at) + insertedBlock + r.content.slice(at);

  const undefOf = (s) => [...s.matchAll(/class="([^"]+)"/g)].flatMap((m2) => m2[1].split(/\s+/)).filter((x) => x && !DEFINED.has(x));
  const checks = {
    fnSectionPresent: /<h2>[^<]*기능성[^<]*<\/h2>/.test(cur),
    fnSectionCountIsOne: (cur.match(/<h2>[^<]*기능성[^<]*<\/h2>/g) ?? []).length === 1,
    waeKept: cur.includes('<h2>왜 이 제품인가</h2>'),
    driverVocabNotIntroduced: !cur.includes('<h2>주요 기능성</h2>'),
    noNewUndefinedClass: undefOf(cur).length <= undefOf(r.content).length,
    balanced: ['div','ul','li','span','p','h1','h2','b','small'].every((t) =>
      (cur.match(new RegExp(`<${t}[\\s>]`, 'g')) ?? []).length === (cur.match(new RegExp(`</${t}>`, 'g')) ?? []).length),
    noEmpty: !/<li>\s*<\/li>|<ul[^>]*>\s*<\/ul>|<h2>\s*<\/h2>/.test(cur),
    endsWell: /<\/div><\/div>$/.test(cur),
    insertOnly: cur.replace(insertedBlock, '') === r.content,
  };
  const bad = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  if (bad.length) {
    rec.status = 'HOLD'; rec.reason = 'POST_CHECK_FAIL:' + bad.join(',');
    tally.SAFE_FUNCTION_APPLY--; tally.HOLD = (tally.HOLD ?? 0) + 1;
    hold.push(JSON.stringify({ ...rec, nextAction: 'STRUCTURE_REVIEW', finalQueue: true }));
    continue;
  }
  targets.push({ canonicalId: r.canonical_id, productMasterId: r.master_id, candidateId: r.candidate_id,
    statementNo: r.stmt, productName: r.name, ops: ['FN'], combo: 'FN', rule: final.reason,
    oldContentHash: sha(r.content), newContentHash: sha(cur), oldLength: r.content.length, newLength: cur.length,
    fnInsertedBlock: insertedBlock, fnClauseCount: final.clauseCount,
    fnGroups: final.groups, newContent: cur });
}

const meta = {
  builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  wo: 'WO-O4O-HFF-MULTILINGUAL-AUTHORING-CONTRACT-PARITY-AND-RESIDUAL-CLEANUP-V1',
  phase: '2 — ko 기능성 섹션 부재 13건 사람 판정',
  population: rows.length, tally, targets: targets.length, holdRows: hold.length,
  boundaryRules: ['H-1 깊이인식 top-level [라벨] = 그룹, 그룹 내부 미분할, (영문) 구간 제외',
                  'H-2 라벨 부재 시 *헤더 = 라벨, ①②③ = 절 경계',
                  '라벨 밖 잔여 텍스트 / 비-verbatim / 영문 혼입 = HOLD'],
  effects: { functionSectionsInserted: targets.length, functionClausesRestored: targets.reduce((a, t) => a + t.fnClauseCount, 0) },
};
fs.writeFileSync(OUT_DEC, JSON.stringify({ ...meta, decisions }, null, 1));
fs.writeFileSync(OUT_T, JSON.stringify({ ...meta, targetsIndex: targets.map(({ newContent, ...x }) => x) }, null, 1));
fs.writeFileSync(OUT_RB, JSON.stringify({ ...meta, expectedUpdate: targets.length,
  reversalContract: { FN: 'fnInsertedBlock 문자열을 content 에서 1회 제거', verify: '역연산 후 sha256 == oldContentHash (insertOnly 체크로 전건 증명)' },
  targets: targets.map(({ newContent, ...x }) => x) }, null, 1));
fs.writeFileSync(OUT_HOLD, hold.join('\n') + (hold.length ? '\n' : ''));
fs.writeFileSync(TMP, JSON.stringify(targets.map((t) => ({ canonicalId: t.canonicalId, productMasterId: t.productMasterId, oldContentHash: t.oldContentHash, newContentHash: t.newContentHash, newContent: t.newContent })), null, 0));

console.log(JSON.stringify({ ...meta, decisions: decisions.map((d) => ({ n: d.productName, s: d.status, r: d.reason, g: d.groupCount, c: d.clauseCount })) }, null, 2));
