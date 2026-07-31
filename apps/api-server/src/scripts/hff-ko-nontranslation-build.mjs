/**
 * WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1
 *   §6 현재 문제 재현 · §7 renderer family · §8 사람 판정 기준 · §9 KO patch 계약
 *
 * Track A(KO 잔여 213) 전량을 현재 DB 로 재판정하고, 경계·귀속·구조가 **단일 확정**되는
 * 대상만 삽입 전용 patch 로 계획한다. read-only — DB write 0.
 *
 * 산출:
 *   data/hff-ko-review-residual-decisions-v1.json   전량 판정
 *   data/hff-ko-nontranslation-safe-targets-v1.json  적용 계획(전/후 전문·해시)
 *   data/hff-ko-nontranslation-rollback-v1.json      역연산(원본 전문·해시)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import {
  esc, htmlText, cmpText, findFunctionalSections, clauseCoverage, insertHazard,
} from './hff-ko-function-family-preserving-patch.mjs';
import { parseOfficialGroups } from './hff-ko-official-label-parser.mjs';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const pop = JSON.parse(fs.readFileSync(`${D}/hff-ko-nontranslation-population-v1.json`, 'utf8'));

/* §7 renderer family SSOT — 감사 산출물이 있으면 그 값을 우선한다. */
let familyAudit = new Map();
try {
  const fa = JSON.parse(fs.readFileSync(`${D}/hff-ko-skipped-existing-2451-renderer-family-audit-v1.json`, 'utf8'));
  for (const r of (Array.isArray(fa) ? fa : fa.rows ?? [])) {
    if (r.canonicalId && r.family) familyAudit.set(r.canonicalId, r.family);
  }
} catch { familyAudit = new Map(); }

const DRIVER_H2 = ['주요 기능성', '섭취량 및 섭취방법 (공식 표기 그대로)', '섭취 시 참고사항', '확인 가능한 기준·규격 정보', '매장 전문가 문의 안내'];
const COMPOSITE_H2 = ['왜 이 제품인가', '섭취방법 (공식 표기 그대로)', '표시 기준', '이런 분께'];
/** §7 우선순위 2: h2 시그널 집합. class 존재만으로 판정하지 않는다. */
function familyByH2(content) {
  const h2 = [...String(content).matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => htmlText(m[1]));
  const d = DRIVER_H2.filter((x) => h2.includes(x)).length;
  let c = COMPOSITE_H2.filter((x) => h2.includes(x)).length;
  if (h2.some((x) => /기능성/.test(x))) c += 1;
  if (d === c) return 'AMBIGUOUS';
  return d > c ? 'DRIVER' : 'COMPOSITE';
}

/* ── 삽입 계획 검증 (신설 카드 포함 — verifyPatch 는 카드 증가를 막으므로 전용 검증기) ── */
const classSet = (h) => new Set([...String(h).matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean)));
const h2Seq = (h) => [...String(h).matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => htmlText(m[1])).join('␟');
const cardNames = (h) => findFunctionalSections(h).flatMap((s) => s.ingredients.map((x) => x.name));
const countTag = (h, t) => (String(h).match(new RegExp(`<${t}\\b`, 'g')) ?? []).length;
const countEnd = (h, t) => (String(h).match(new RegExp(`</${t}>`, 'g')) ?? []).length;

function applyOps(before, ops) {
  let out = before;
  for (const op of [...ops].sort((a, b) => b.pos - a.pos)) out = out.slice(0, op.pos) + op.html + out.slice(op.pos);
  return out;
}

function verifyOps({ before, after, ops, newCardCount }) {
  /* 1. additive-only 증명: after 에서 삽입 구간을 오프셋 순으로 벗겨내면 before 와 byte 동일 */
  const asc = [...ops].sort((a, b) => a.pos - b.pos);
  let peel = '', cursor = 0, shift = 0;
  for (const op of asc) {
    const at = op.pos + shift;
    if (after.slice(at, at + op.html.length) !== op.html) return 'INSERT_OFFSET_MISMATCH';
    peel += after.slice(cursor, at);
    cursor = at + op.html.length;
    shift += op.html.length;
  }
  peel += after.slice(cursor);
  if (peel !== before) return 'NOT_ADDITIVE_ONLY';

  if (h2Seq(before) !== h2Seq(after)) return 'H2_SEQUENCE_CHANGED';
  for (const cls of classSet(after)) if (!classSet(before).has(cls)) return 'CLASS_SET_CHANGED';
  const head = (h) => String(h).slice(0, String(h).indexOf('<h2'));
  if (head(before) !== head(after)) return 'WRAPPER_CHANGED';
  const foot = (h) => (String(h).match(/<div class="sd-foot">[\s\S]*$/) ?? [''])[0];
  if (foot(before) !== foot(after)) return 'FOOTER_CHANGED';
  for (const t of ['ul', 'li', 'div', 'section', 'span']) {
    if (countTag(after, t) !== countEnd(after, t)) return `TAG_UNBALANCED_${t.toUpperCase()}`;
  }
  const nb = cardNames(before), na = cardNames(after);
  if (na.length !== nb.length + newCardCount) return 'CARD_COUNT_UNEXPECTED';
  if (na.slice(0, nb.length).join('␟') !== nb.join('␟')) return 'CARD_ORDER_CHANGED';
  /* DRIVER 전용 마크업을 COMPOSITE 문서에 주입하지 않았는지 */
  if (!/sd-item/.test(before) && /sd-item/.test(after)) return 'DRIVER_FORMAT_INJECTED';
  return null;
}

/* ── 대상 1건 판정 ──────────────────────────────────────────────────── */
function adjudicate({ content, mainFnctn }) {
  const parsed = parseOfficialGroups(mainFnctn);
  if (!parsed.ok) {
    const holdMap = {
      EMPTY_OFFICIAL_SOURCE: 'HOLD_SOURCE_REPAIR_REQUIRED',
      UNATTRIBUTED_CLAUSE: 'HOLD_AMBIGUOUS_INGREDIENT_OWNERSHIP',
      NO_LABELED_CLAUSE: 'HOLD_AMBIGUOUS_INGREDIENT_OWNERSHIP',
      LABEL_CONTAINMENT_AMBIGUOUS: 'HOLD_AMBIGUOUS_INGREDIENT_OWNERSHIP',
      CLAUSE_COUNT_MISMATCH: 'HOLD_AMBIGUOUS_FUNCTION_BOUNDARY',
      SEGMENTER_UNRESOLVED_CLAUSE: 'HOLD_AMBIGUOUS_FUNCTION_BOUNDARY',
      EMPTY_LABEL: 'HOLD_AMBIGUOUS_INGREDIENT_OWNERSHIP',
    };
    const st = parsed.reason.startsWith('SOURCE_DAMAGE_') ? 'HOLD_SOURCE_REPAIR_REQUIRED' : holdMap[parsed.reason] ?? 'HOLD_AMBIGUOUS_FUNCTION_BOUNDARY';
    return { status: st, detail: { parseReason: parsed.reason, ...parsed.detail } };
  }

  const whole = cmpText(content);
  /* 미반영 절 산출 */
  const groups = parsed.groups.map((g) => {
    const cov = g.clauses.map((cl) => ({ clause: cl, ...clauseCoverage(cl, whole) }));
    return { label: g.label, clauses: g.clauses, covered: cov.filter((x) => x.covered).length, missing: cov.filter((x) => !x.covered).map((x) => x.clause) };
  });
  const needy = groups.filter((g) => g.missing.length);
  if (!needy.length) return { status: 'RESOLVED_NO_CHANGE', detail: { reason: 'ALL_OFFICIAL_CLAUSES_PRESENT', officialGroups: groups.length, labelForm: parsed.labelForm } };

  const secs = findFunctionalSections(content);
  if (secs.length !== 1) return { status: 'HOLD_CANONICAL_STRUCTURE_UNSAFE', detail: { functionalSectionCount: secs.length, missingGroups: needy.map((g) => g.label) } };
  const sec = secs[0];
  if (sec.mode !== 'PER_INGREDIENT' && sec.mode !== 'DRIVER_GROUP') {
    return { status: 'HOLD_UNSUPPORTED_RENDERER_STRUCTURE', detail: { mode: sec.mode, ulClass: sec.ulClass, missingGroups: needy.map((g) => g.label) } };
  }
  if (sec.ingredients.some((c) => !c.name)) return { status: 'HOLD_UNSUPPORTED_RENDERER_STRUCTURE', detail: { reason: 'UNLABELED_SIBLING_CARD', mode: sec.mode } };
  if (sec.ingredients.some((c) => c.ulEndIdx <= 0)) return { status: 'HOLD_CANONICAL_STRUCTURE_UNSAFE', detail: { reason: 'INGREDIENT_LIST_UNBALANCED' } };
  if (sec.mode === 'PER_INGREDIENT' && (sec.extraTopUl > 0 || sec.ulEndIdx <= 0)) {
    return { status: 'HOLD_CANONICAL_STRUCTURE_UNSAFE', detail: { reason: 'MULTIPLE_TOP_LEVEL_LISTS', extraTopUl: sec.extraTopUl } };
  }

  /* 삽입 위험 절이 하나라도 있으면 문서 전체를 HOLD */
  for (const g of needy) {
    for (const cl of g.missing) {
      const hz = insertHazard(cl, whole);
      if (hz) return { status: 'HOLD_AMBIGUOUS_FUNCTION_BOUNDARY', detail: { hazard: hz, label: g.label, clause: cl.slice(0, 120) } };
    }
  }

  /* 원료 → 기존 카드 대응 (포함 관계 허용, 단 유일해야 함) */
  const ops = [];
  const newCards = [];
  const existing = sec.ingredients.map((c) => ({ ...c, key: cmpText(c.name) }));
  for (const g of needy) {
    const key = cmpText(g.label);
    /* 라벨 없는 단일 그룹 원문은 카드가 정확히 1개일 때만 귀속이 확정된다. */
    if (g.label == null && existing.length !== 1) {
      return { status: 'HOLD_AMBIGUOUS_INGREDIENT_OWNERSHIP', detail: { reason: 'UNLABELED_SOURCE_MULTI_CARD', cards: existing.length } };
    }
    const hits = existing.filter((c) => c.key === key || c.key.includes(key) || key.includes(c.key));
    if (hits.length > 1) return { status: 'HOLD_AMBIGUOUS_INGREDIENT_OWNERSHIP', detail: { reason: 'INGREDIENT_CARD_AMBIGUOUS', label: g.label, cards: hits.map((c) => c.name) } };
    if (hits.length === 1) {
      ops.push({ pos: hits[0].ulEndIdx, html: g.missing.map((cl) => `<li>${esc(cl)}</li>`).join(''), kind: 'INSERT_CLAUSE', label: hits[0].name, clauses: g.missing });
      continue;
    }
    /* 대응 카드 없음 → 신설. 단 일부만 미반영이면 내용이 다른 카드에 흩어져 있다는 뜻이므로 HOLD */
    if (g.missing.length !== g.clauses.length) {
      return { status: 'HOLD_AMBIGUOUS_INGREDIENT_OWNERSHIP', detail: { reason: 'PARTIAL_COVERAGE_WITHOUT_CARD', label: g.label, missing: g.missing.length, total: g.clauses.length } };
    }
    newCards.push({ label: g.label, clauses: g.clauses });
  }
  /* 신설 라벨끼리·기존 카드와 충돌 금지 */
  const newKeys = newCards.map((n) => cmpText(n.label));
  for (let i = 0; i < newKeys.length; i++) {
    for (let j = 0; j < newKeys.length; j++) {
      if (i !== j && (newKeys[i] === newKeys[j] || newKeys[i].includes(newKeys[j]))) {
        return { status: 'HOLD_AMBIGUOUS_INGREDIENT_OWNERSHIP', detail: { reason: 'NEW_LABEL_COLLISION', a: newCards[i].label, b: newCards[j].label } };
      }
    }
  }

  if (newCards.length) {
    const last = sec.ingredients[sec.ingredients.length - 1];
    if (!last) return { status: 'HOLD_UNSUPPORTED_RENDERER_STRUCTURE', detail: { reason: 'NO_SIBLING_CARD_TO_CLONE' } };
    /* 마크업은 같은 문서의 마지막 형제 카드에서 복제한다 — 새 class 0 */
    const ulTag = (content.slice(last.ulOpenIdx).match(/^<ul\b[^>]*>/) ?? ['<ul>'])[0];
    let pos, html;
    if (sec.mode === 'PER_INGREDIENT') {
      pos = sec.ulEndIdx;
      html = newCards.map((n) => `<li><b>${esc(n.label)}</b>${ulTag}${n.clauses.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></li>`).join('');
    } else {
      const afterUl = last.ulEndIdx + '</ul>'.length;
      if (!content.slice(afterUl).startsWith('</div>')) return { status: 'HOLD_UNSUPPORTED_RENDERER_STRUCTURE', detail: { reason: 'DRIVER_CARD_TAIL_UNEXPECTED' } };
      pos = afterUl + '</div>'.length;
      html = newCards.map((n) => `<div class="sd-item"><span class="sd-tag">${esc(n.label)}</span>${ulTag}${n.clauses.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>`).join('');
    }
    ops.push({ pos, html, kind: 'NEW_CARD', labels: newCards.map((n) => n.label), clauseCount: newCards.reduce((a, n) => a + n.clauses.length, 0) });
  }

  /* §13 "원문 밖 기능성 추가 0" — 삽입되는 모든 절이 공식 원문의 부분 문자열임을 증명 */
  const srcKey = cmpText(mainFnctn);
  for (const g of needy) {
    for (const cl of g.missing) {
      if (!srcKey.includes(cmpText(cl))) return { status: 'HOLD_AMBIGUOUS_FUNCTION_BOUNDARY', detail: { reason: 'CLAUSE_NOT_VERBATIM_IN_SOURCE', clause: cl.slice(0, 120) } };
    }
  }

  const after = applyOps(content, ops);
  if (after === content) return { status: 'HOLD_CANONICAL_STRUCTURE_UNSAFE', detail: { reason: 'NO_CHANGE_PRODUCED' } };
  const bad = verifyOps({ before: content, after, ops, newCardCount: newCards.length });
  if (bad) return { status: 'HOLD_CANONICAL_STRUCTURE_UNSAFE', detail: { verifyFail: bad } };

  return {
    status: 'RESOLVED_UPDATED', after, ops,
    detail: {
      labelForm: parsed.labelForm, repair: parsed.repair,
      mode: sec.mode, officialGroups: groups.length,
      insertedClauses: ops.filter((o) => o.kind === 'INSERT_CLAUSE').reduce((a, o) => a + o.clauses.length, 0),
      newCards: newCards.map((n) => ({ label: n.label, clauses: n.clauses.length })),
      byteDelta: after.length - content.length,
    },
  };
}

/* ── 실행 ───────────────────────────────────────────────────────────── */
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const ids = pop.trackA.map((r) => r.canonicalId);
const live = new Map();
for (let i = 0; i < ids.length; i += 200) {
  for (const r of (await c.query(`
    SELECT spd.id, spd.master_id, spd.content,
           encode(sha256(convert_to(spd.content,'UTF8')),'hex') content_hash,
           pc.id candidate_id,
           pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
           pc.raw_payload::jsonb->'source'->>'PRDUCT' prduct,
           pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
      FROM shared_product_descriptions spd
      LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
        AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
     WHERE spd.id = ANY($1) AND spd.deleted_at IS NULL
       AND spd.source_type='o4o_hff_generated' AND spd.description_type='STORE'
       AND spd.status='canonical' AND coalesce(spd.language,'ko')='ko'`,
    [ids.slice(i, i + 200)])).rows) live.set(r.id, r);
}
await c.end();

const decisions = [], safeTargets = [], rollback = [];
for (const q of pop.trackA) {
  const l = live.get(q.canonicalId);
  if (!l) { decisions.push({ ...q, finalStatus: 'HOLD_CANONICAL_STRUCTURE_UNSAFE', detail: { reason: 'CANONICAL_NOT_FOUND_IN_DB' } }); continue; }
  const family = familyAudit.get(q.canonicalId) ?? q.rendererFamily ?? familyByH2(l.content);
  const familySource = familyAudit.has(q.canonicalId) ? 'AUDIT_ARTIFACT' : q.rendererFamily ? 'QUEUE_H2_SIGNAL' : 'LIVE_H2_SIGNAL';
  const familyLive = familyByH2(l.content);

  const r = adjudicate({ content: l.content, mainFnctn: l.fn });
  const row = {
    canonicalId: q.canonicalId, productMasterId: l.master_id, candidateId: l.candidate_id,
    statementNo: l.stmt, productName: l.prduct,
    rendererFamily: family, rendererFamilySource: familySource, rendererFamilyLive: familyLive,
    queueHoldReason: q.queueHoldReason, beforeHash: l.content_hash,
    finalStatus: r.status, detail: r.detail,
  };
  decisions.push(row);
  if (r.status === 'RESOLVED_UPDATED') {
    safeTargets.push({
      canonicalId: q.canonicalId, productMasterId: l.master_id, candidateId: l.candidate_id,
      statementNo: l.stmt, productName: l.prduct, rendererFamily: family,
      beforeHash: l.content_hash, afterHash: sha(r.after),
      beforeContent: l.content, afterContent: r.after,
      ops: r.ops.map(({ pos, kind, label, labels, clauses, clauseCount }) => ({ pos, kind, label, labels, clauses, clauseCount })),
      ...r.detail,
    });
    rollback.push({ canonicalId: q.canonicalId, productMasterId: l.master_id, restoreHash: l.content_hash, restoreContent: l.content, appliedHash: sha(r.after) });
  }
}

const tally = (a, f) => a.reduce((m, r) => { const k = f(r); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const summary = {
  builtAt: new Date().toISOString(), wo: 'WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1',
  readOnly: true, dbWrites: 0,
  trackARows: decisions.length,
  byFinalStatus: tally(decisions, (r) => r.finalStatus),
  byQueueReasonAndFinal: decisions.reduce((m, r) => {
    (m[r.queueHoldReason] ??= {})[r.finalStatus] = ((m[r.queueHoldReason] ?? {})[r.finalStatus] ?? 0) + 1; return m;
  }, {}),
  rendererFamily: tally(decisions, (r) => r.rendererFamily),
  rendererFamilySourceDisagreement: decisions.filter((r) => r.rendererFamilyLive !== 'AMBIGUOUS' && r.rendererFamilyLive !== r.rendererFamily).length,
  safeTargets: safeTargets.length,
  insertedClauseTotal: safeTargets.reduce((a, r) => a + (r.insertedClauses ?? 0), 0),
  newCardTotal: safeTargets.reduce((a, r) => a + (r.newCards?.length ?? 0), 0),
  newCardClauseTotal: safeTargets.reduce((a, r) => a + (r.newCards ?? []).reduce((x, n) => x + n.clauses, 0), 0),
  byteDeltaTotal: safeTargets.reduce((a, r) => a + (r.byteDelta ?? 0), 0),
  labelForm: tally(safeTargets, (r) => r.labelForm ?? 'NA'),
  holdDetailTop: tally(decisions.filter((r) => r.finalStatus.startsWith('HOLD')), (r) => r.detail?.parseReason ?? r.detail?.reason ?? r.detail?.hazard ?? r.detail?.verifyFail ?? 'OTHER'),
};

fs.writeFileSync(`${D}/hff-ko-review-residual-decisions-v1.json`, JSON.stringify({ ...summary, decisions }, null, 1));
fs.writeFileSync(`${D}/hff-ko-nontranslation-safe-targets-v1.json`, JSON.stringify({ builtAt: summary.builtAt, count: safeTargets.length, targets: safeTargets }, null, 1));
fs.writeFileSync(`${D}/hff-ko-nontranslation-rollback-v1.json`, JSON.stringify({ builtAt: summary.builtAt, count: rollback.length, rows: rollback }, null, 1));
console.log(JSON.stringify(summary, null, 2));
