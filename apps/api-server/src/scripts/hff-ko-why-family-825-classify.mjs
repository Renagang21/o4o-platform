/**
 * WO-O4O-HFF-KO-WHY-FAMILY-825-OFFICIAL-FUNCTION-SECTION-FULL-PRODUCTION-V1 / 전수 분류
 *
 * 왜-family 중 전용 공식 기능성 섹션이 없는 canonical 전량을 분류하고,
 * SAFE_APPLY 대상의 제안 content + rollback manifest 를 생성한다. (read-only)
 *
 * 삽입 계약: `<h2>공식 인정 기능성</h2><ul class="sd-why">…</ul>` 를
 *   `<h2>섭취방법` 앞(= `왜 이 제품인가` 직후)에 삽입. 새 class·wrapper 신설 없음.
 *   기존 content 는 substring 그대로 보존하고 삽입 블록 외 byte 동일을 검증한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const OUT_CLS = `${D}/hff-ko-why-family-825-classification-v1.json`;
const OUT_SAFE = `${D}/hff-ko-why-family-825-safe-targets-v1.json`;
const OUT_RB = `${D}/hff-ko-why-family-825-rollback-manifest-v1.json`;
const OUT_HR = `${D}/hff-ko-why-family-825-human-review-v1.jsonl`;

const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');
const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => (s ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why','is-solid']);
const HAS_FN = `content ~ '<h2>[^<]*기능성[^<]*</h2>'`;
const MARKER = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\((?:가|나|다|라|마)\)/;

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5494', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

// 모집단: HFF STORE/ko canonical 중 기능성 섹션 부재 + HFF candidate 연결
const pop = (await c.query(`
  SELECT spd.id canonical_id, spd.master_id, spd.content, spd.updated_at,
         spd.source_type, spd.status, spd.language, spd.description_type,
         pc.id candidate_id, pc.candidate_status, pc.matched_product_master_id,
         pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
         pc.raw_payload::jsonb->'source'->>'PRDUCT' name,
         pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
  FROM shared_product_descriptions spd
  LEFT JOIN product_candidates pc
    ON pc.matched_product_master_id = spd.master_id
   AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
  WHERE spd.source_type='o4o_hff_generated' AND spd.description_type='STORE'
    AND spd.status='canonical' AND coalesce(spd.language,'ko')='ko' AND spd.deleted_at IS NULL
    AND NOT (${HAS_FN})
  ORDER BY spd.id`)).rows;

/** MAIN_FNCTN → 라벨별 기능성 절. 라벨은 닫힌 대괄호 또는 첫 마커로 확정. */
function parseFunctions(raw) {
  const text = (raw ?? '').replace(/\r/g, '');
  if (!nrm(text)) return { ok: false, why: 'NO_OFFICIAL_SOURCE', groups: [] };
  if (!/[가-힣]/.test(text)) return { ok: false, why: 'ENGLISH_ONLY', groups: [] };
  const groups = [];
  let unresolved = 0, ambiguous = 0;
  for (const line0 of text.split('\n')) {
    const line = line0.trim();
    if (!line) continue;
    let label = null, rest = line;
    if (line.startsWith('[')) {
      const closed = line.match(/^\[([^\]\n]+)\]/);
      if (closed) { label = closed[1].trim(); rest = line.slice(closed[0].length); }
      else {
        const b = line.slice(1); const m = b.match(MARKER);
        if (!m) { unresolved++; continue; }
        label = b.slice(0, m.index).trim(); rest = b.slice(m.index);
        if (/[\[\]]/.test(label)) { ambiguous++; continue; }
      }
    } else if (/^\*\s/.test(line)) { unresolved++; continue; }
    const m2 = rest.match(MARKER);
    if (!m2) {
      // 마커 없는 단문: 라벨이 있으면 절 1개로 인정, 라벨 없으면 미확정
      const single = nrm(rest);
      if (label && single.length >= 4) { groups.push({ label, clauses: [single] }); continue; }
      unresolved++; continue;
    }
    const cls = rest.slice(m2.index)
      .split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])|(?=\((?:가|나|다|라|마)\))/)
      .map((x) => x.replace(/^[①-⑮\s]*/, '').replace(/^\((?:가|나|다|라|마)\)\s*/, '').trim())
      .filter((x) => x.length >= 4);
    if (!cls.length) { unresolved++; continue; }
    // 라벨 없는 **연속 라인**(②③… 이어지는 줄)은 직전 원료 그룹의 계속으로 본다.
    //   별도 그룹으로 만들면 원료 귀속이 사라져 다원료 제품에서 오귀속이 된다.
    if (!label && groups.length) { groups[groups.length - 1].clauses.push(...cls); continue; }
    groups.push({ label, clauses: cls });
  }
  if (!groups.length) return { ok: false, why: unresolved ? 'BOUNDARY_UNRESOLVED_NO_MARKER' : 'NO_PARSABLE_CLAUSE', groups: [] };
  if (unresolved || ambiguous) return { ok: false, why: ambiguous ? 'AMBIGUOUS_LABEL_BOUNDARY' : 'PARTIAL_BOUNDARY_UNRESOLVED', groups, unresolved, ambiguous };
  return { ok: true, groups };
}

/** 현재 canonical 이 공식 절을 **목록 항목**으로 표시하고 있는지 */
function alreadyRepresented(ko, clauses) {
  const items = [...ko.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => dense(unesc(m[1].replace(/<[^>]+>/g, ''))));
  return clauses.every((cl) => items.some((it) => it.includes(dense(cl))));
}

const rows = [];
const safe = [];
const hr = [];
const tally = {};
const blockedTally = {};

for (const r of pop) {
  const ko = r.content ?? '';
  const rec = {
    canonicalId: r.canonical_id, candidateId: r.candidate_id, productMasterId: r.master_id,
    statementNo: r.stmt, productName: r.name,
    headings: [...ko.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => m[1]),
    currentHash: sha(ko), contentLength: ko.length,
    status: null, reason: null,
  };

  // 연결 무결성
  if (!r.candidate_id) { rec.status = 'BLOCKED_SOURCE'; rec.reason = 'NO_HFF_CANDIDATE_LINK'; }
  else {
    const p = parseFunctions(r.fn);
    const anchorCount = (ko.match(/<h2>섭취방법/g) ?? []).length;
    const whyCount = (ko.match(/<h2>왜 이 제품인가<\/h2>/g) ?? []).length;
    const hasSdWhy = /<ul class="sd-why">/.test(ko);

    if (!p.ok && (p.why === 'NO_OFFICIAL_SOURCE' || p.why === 'ENGLISH_ONLY')) { rec.status = 'BLOCKED_SOURCE'; rec.reason = p.why; }
    else if (!p.ok) { rec.status = 'HUMAN_REVIEW'; rec.reason = p.why; }
    else {
      const allClauses = p.groups.flatMap((g) => g.clauses);
      const verbatim = allClauses.every((x) => dense(r.fn).includes(dense(x)));
      // 절 끝에 분리자가 남은 경우 = 분할기가 구분자를 정리하지 못한 텍스트 아티팩트
      const trailingDelim = allClauses.filter((x) => /[,;·･․、•]$/.test(x.trim()));
      // 원문 반복은 정책상 실패가 아니지만(dedupe 금지) 자동 적용 대상으로도 올리지 않는다
      const dupClauses = allClauses.length !== new Set(allClauses.map(dense)).size;
      if (!verbatim) { rec.status = 'HUMAN_REVIEW'; rec.reason = 'CLAUSE_NOT_VERBATIM'; }
      else if (trailingDelim.length) { rec.status = 'HUMAN_REVIEW'; rec.reason = 'CLAUSE_TRAILING_DELIMITER_ARTIFACT'; rec.evidence = trailingDelim.slice(0, 3); }
      else if (dupClauses) { rec.status = 'HUMAN_REVIEW'; rec.reason = 'SOURCE_CLAUSE_REPETITION_NOT_AUTO_APPLIED'; }
      else if (alreadyRepresented(ko, allClauses)) { rec.status = 'NO_CHANGE'; rec.reason = 'ALL_CLAUSES_ALREADY_LIST_ITEMS'; }
      else if (anchorCount !== 1) { rec.status = 'BLOCKED_STRUCTURE'; rec.reason = anchorCount === 0 ? 'ANCHOR_ABSENT_섭취방법' : 'ANCHOR_NOT_UNIQUE'; }
      else if (whyCount !== 1) { rec.status = 'BLOCKED_STRUCTURE'; rec.reason = '왜이제품인가_ANCHOR_NOT_UNIQUE'; }
      else if (!hasSdWhy) { rec.status = 'BLOCKED_STRUCTURE'; rec.reason = 'NO_SD_WHY_PATTERN_IN_DOC'; }
      else if (p.groups.length >= 2) {
        /* 다원료 = family 의 `원료별 공식 인정 기능성` idiom 대상이다.
           그 idiom 은 `<ul class="sd-func"><li><b>원료</b><ul class="sd-why">…` 인데
           `sd-func` 는 **renderer 정의 집합에 없는 무스타일 클래스**(기존 8,277건 공통 결함)이다.
           라벨을 li 안에 붙이는 형태는 family 선례 0건이므로 신규 패턴 발명이 된다.
           → 자동 적용하지 않고 idiom 결정을 사람에게 넘긴다. */
        rec.status = 'HUMAN_REVIEW';
        rec.reason = 'MULTI_INGREDIENT_NEEDS_원료별_IDIOM_DECISION';
        rec.groupCount = p.groups.length;
      }
      else {
        /* 단일 원료군 → family 선례 그대로: `공식 인정 기능성` + 라벨 없는 평문 sd-why (5,702건 idiom).
           단일 원료이므로 라벨 생략으로 귀속 정보가 손실되지 않는다. */
        const li = p.groups[0].clauses.map((x) => `<li>${esc(x)}</li>`).join('');
        const block = `<h2>공식 인정 기능성</h2><ul class="sd-why">${li}</ul>\n  `;
        const at = ko.indexOf('<h2>섭취방법');
        const newContent = ko.slice(0, at) + block + ko.slice(at);

        const introRe = /<p class="sd-intro">[\s\S]*?<\/p>/, footRe = /<div class="sd-foot">[\s\S]*?<\/div>/;
        const checks = {
          outsideIdentical: newContent.slice(0, at) === ko.slice(0, at) && newContent.slice(at + block.length) === ko.slice(at),
          introUnchanged: (ko.match(introRe)?.[0] ?? '#A') === (newContent.match(introRe)?.[0] ?? '#B'),
          footUnchanged: (ko.match(footRe)?.[0] ?? null) === (newContent.match(footRe)?.[0] ?? null),
          oldHeadingsKept: [...ko.matchAll(/<h2>[\s\S]*?<\/h2>/g)].map((m) => m[0]).every((h) => newContent.includes(h)),
          headingOrderOk: (() => { const hs = [...newContent.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => m[1]);
            const iw = hs.indexOf('왜 이 제품인가'), ifn = hs.indexOf('공식 인정 기능성'), ii = hs.findIndex((h) => h.startsWith('섭취방법'));
            return iw >= 0 && ifn === iw + 1 && ii === ifn + 1; })(),
          classesOk: [...newContent.matchAll(/class="([^"]+)"/g)].every((m) => m[1].split(/\s+/).every((x) => !x || DEFINED.has(x))),
          balanced: ['div','ul','li','span','p','h1','h2','b','small'].every((tg) =>
            (newContent.match(new RegExp(`<${tg}[\\s>]`, 'g')) ?? []).length === (newContent.match(new RegExp(`</${tg}>`, 'g')) ?? []).length),
          noEmpty: !/<li>\s*<\/li>|<ul[^>]*>\s*<\/ul>|<h2>\s*<\/h2>/.test(newContent),
          singleFunctionSection: (newContent.match(/<h2>[^<]*기능성[^<]*<\/h2>/g) ?? []).length === 1,
          driverVocabNotIntroduced: !newContent.includes('<h2>주요 기능성</h2>'),
          noRawBracket: !/[\[\]]/.test(block.replace(/<[^>]+>/g, '')),
          clausesInNew: allClauses.filter((x) => dense(newContent).includes(dense(x))).length,
          clausesExpected: allClauses.length,
        };
        const pass = Object.entries(checks).filter(([k]) => !['clausesInNew', 'clausesExpected'].includes(k)).every(([, v]) => v)
          && checks.clausesInNew === checks.clausesExpected;
        if (!pass) { rec.status = 'BLOCKED_STRUCTURE'; rec.reason = 'PATCH_POST_CHECK_FAIL'; rec.failedChecks = Object.entries(checks).filter(([, v]) => v === false).map(([k]) => k); }
        else {
          rec.status = 'SAFE_APPLY';
          rec.reason = 'UNIQUE_BOUNDARY_AND_ANCHOR';
          rec.groups = p.groups;
          rec.clauseCount = allClauses.length;
          rec.insertedBlock = block.trim();
          rec.newHash = sha(newContent);
          rec.lenDelta = newContent.length - ko.length;
          safe.push({ ...rec, oldContent: ko, newContent, checks });
        }
      }
    }
  }

  tally[rec.status] = (tally[rec.status] ?? 0) + 1;
  if (rec.status !== 'SAFE_APPLY' && rec.status !== 'NO_CHANGE') {
    blockedTally[`${rec.status}:${rec.reason}`] = (blockedTally[`${rec.status}:${rec.reason}`] ?? 0) + 1;
    hr.push(JSON.stringify({
      candidateId: rec.candidateId, statementNo: rec.statementNo, productName: rec.productName,
      canonicalId: rec.canonicalId, status: rec.status, reason: rec.reason,
      sourceMainFunction: nrm(r.fn).slice(0, 600),
      currentFunctionRepresentation: [...ko.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => nrm(unesc(m[1].replace(/<[^>]+>/g, '')))).slice(0, 12),
      boundaryEvidence: rec.headings,
      nextAction: rec.status === 'BLOCKED_SOURCE' ? 'SOURCE_REPAIR_OR_EXCLUDE'
        : rec.status === 'BLOCKED_STRUCTURE' ? 'STRUCTURE_REVIEW'
        : 'HUMAN_BOUNDARY_DECISION',
    }));
  }
  rows.push(rec);
}
await c.end();

fs.writeFileSync(OUT_CLS, JSON.stringify({
  classifiedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  population: rows.length, expectedPopulation: 825, populationMatches: rows.length === 825,
  tally, blockedTally,
  headingSignatureTally: rows.reduce((a, r) => { const k = r.headings.join(' | '); a[k] = (a[k] ?? 0) + 1; return a; }, {}),
  rows: rows.map(({ groups, ...x }) => x),
}, null, 1));
fs.writeFileSync(OUT_SAFE, JSON.stringify({ total: safe.length, targets: safe.map(({ oldContent, newContent, ...x }) => x) }, null, 1));
fs.writeFileSync(OUT_RB, JSON.stringify({
  builtAt: new Date().toISOString(),
  wo: 'WO-O4O-HFF-KO-WHY-FAMILY-825-OFFICIAL-FUNCTION-SECTION-FULL-PRODUCTION-V1',
  expectedUpdate: safe.length,
  targets: safe.map((s, i) => ({
    targetIndex: i + 1, candidateId: s.candidateId, statementNo: s.statementNo, productName: s.productName,
    productMasterId: s.productMasterId, canonicalId: s.canonicalId,
    patchOperation: 'INSERT_OFFICIAL_FUNCTION_SECTION', insertedHeading: '공식 인정 기능성',
    insertedBlock: s.insertedBlock, clauseCount: s.clauseCount,
    oldContent: s.oldContent, oldContentHash: s.currentHash,
    newContent: s.newContent, newContentHash: s.newHash,
    applyStatus: 'PENDING',
  })),
}, null, 1));
fs.writeFileSync(OUT_HR, hr.join('\n') + (hr.length ? '\n' : ''));

console.log(JSON.stringify({ population: rows.length, populationMatches: rows.length === 825, tally, blockedTally,
  safeCount: safe.length, humanReviewLines: hr.length,
  safeClauseTotal: safe.reduce((a, s) => a + s.clauseCount, 0) }, null, 2));
