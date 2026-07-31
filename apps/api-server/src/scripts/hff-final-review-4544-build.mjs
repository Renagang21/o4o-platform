/**
 * WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1  §7·§10
 *
 * 분류 결과에서 **안전 대상만** patch 를 생성한다. (read-only, DB write 0)
 *
 * 두 경로
 *   A) 기존 카드/목록에 누락 절 삽입 — `analyzeTarget` 의 SAFE_MISSING_CLAUSE 계획 그대로.
 *   B) **원료 카드 신설**(HOLD→SAFE 승격) — 공식 원문이 `[원료]` 라벨로 온전하고, 그 원료에
 *      대응하는 카드가 canonical 에 아예 없으며, 해당 원료의 공식 절이 전부 안전할 때만.
 *      신설 카드는 **같은 문서의 형제 카드 마크업을 그대로** 따르며, 새 class 를 만들지 않는다.
 *      → 라벨이 곧 공식 귀속이므로 원료 간 혼입이 발생하지 않는다.
 *
 * 승격하지 않는 경우 (§7 HOLD)
 *   - 공식 원문 대괄호 손상(`[비타민B1[`, `홍삼]…`, `…음[`) → 라벨 자체가 추정이 된다 = SOURCE_REPAIR_REQUIRED
 *   - 라벨 없는 평면 목록 + 다중 원료 → 귀속 표기 불가
 *   - 결합 세그먼트·서술어 없음·부분 중복 위험 → 경계 불확실
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { analyzeTarget, applyPatch, verifyPatch, findFunctionalSections, insertHazard, cmpText, htmlText, esc } from './hff-ko-function-family-preserving-patch.mjs';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const cls = JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-classification-v1.json`, 'utf8'));

/** 공식 원문 대괄호 손상 판정 — 손상되면 라벨 추정이 되므로 승격 금지. */
export function sourceDamage(src) {
  const s = String(src ?? '');
  let depth = 0;
  for (const ch of s) {
    if (ch === '[') { if (depth > 0) return 'NESTED_OPEN_BRACKET'; depth++; }
    else if (ch === ']') { if (depth === 0) return 'CLOSE_WITHOUT_OPEN'; depth--; }
  }
  if (depth !== 0) return 'UNCLOSED_LABEL_BRACKET';
  return null;
}

/* ── DB 재조회 (patch 는 실측 content 기준) ───────────────────────────── */
const candidates = cls.items.filter((x) => x.language === 'ko'
  && (x.status === 'SAFE_APPLY'
    || (x.status === 'HOLD_AMBIGUOUS' && ['INGREDIENT_CARD_NOT_FOUND', 'MISSING_CLAUSE_WITHOUT_INGREDIENT_LABEL'].includes(x.statusReason))));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }
const ids = candidates.map((x) => x.canonicalId);
const live = new Map();
for (let i = 0; i < ids.length; i += 500) {
  const rows = (await c.query(`
    SELECT spd.id, spd.master_id, spd.content, pc.id candidate_id,
           pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
           pc.raw_payload::jsonb->'source'->>'PRDUCT' pname,
           pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
      FROM shared_product_descriptions spd
      LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
        AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
     WHERE spd.id = ANY($1) AND spd.deleted_at IS NULL`, [ids.slice(i, i + 500)])).rows;
  for (const r of rows) live.set(r.id, r);
}
await c.end();

/* ── B) 카드 신설 계획 ────────────────────────────────────────────────── */
/**
 * 형제 카드 마크업을 그대로 복제해 새 원료 카드를 만든다.
 * PER_INGREDIENT : `<li><b>원료</b><ul class="…"><li>절</li>…</ul></li>`  (최상위 ul 끝에 append)
 * DRIVER_GROUP   : `<div class="sd-item"><span class="sd-tag">원료</span><ul class="…">…</ul></div>` (마지막 카드 뒤)
 */
function planNewCards({ content, mainFnctn, analysis }) {
  const html = String(content);
  const damage = sourceDamage(mainFnctn);
  if (damage) return { ok: false, reason: `SOURCE_${damage}` };
  const sections = findFunctionalSections(html);
  if (sections.length !== 1) return { ok: false, reason: 'MULTIPLE_FUNCTIONAL_SECTIONS' };
  const sec = sections[0];
  if (!['PER_INGREDIENT', 'DRIVER_GROUP'].includes(sec.mode)) return { ok: false, reason: `MODE_${sec.mode}` };
  if (!sec.ingredients.length || sec.ingredients.some((x) => !x.name)) return { ok: false, reason: 'UNLABELED_SIBLING_CARD' };

  const missing = analysis.missingClauses ?? [];
  if (!missing.length) return { ok: false, reason: 'NO_MISSING_CLAUSE' };
  if (missing.some((m) => m.header == null)) return { ok: false, reason: 'MISSING_CLAUSE_WITHOUT_LABEL' };

  const wholeText = cmpText(html);
  const byHeader = new Map();
  for (const m of missing) {
    const hz = insertHazard(m.clause, wholeText);
    if (hz) return { ok: false, reason: hz };
    if (!byHeader.has(m.header)) byHeader.set(m.header, []);
    byHeader.get(m.header).push(m.clause);
  }
  /* 각 라벨은 기존 카드와 겹치지 않아야 하고(신설), 서로도 겹치면 안 된다. */
  const cardKeys = sec.ingredients.map((x) => cmpText(x.name));
  const newCards = [];
  for (const [header, clauses] of byHeader) {
    const key = cmpText(header);
    if (!key) return { ok: false, reason: 'EMPTY_LABEL' };
    if (cardKeys.some((n) => n === key || n.includes(key) || key.includes(n))) return { ok: false, reason: 'LABEL_COLLIDES_WITH_EXISTING_CARD' };
    if (newCards.some((x) => x.key === key)) return { ok: false, reason: 'DUPLICATE_NEW_LABEL' };
    if (new Set(clauses.map((x) => cmpText(x))).size !== clauses.length) return { ok: false, reason: 'DUPLICATE_CLAUSE_IN_LABEL' };
    newCards.push({ key, header, clauses });
  }
  if (!newCards.length) return { ok: false, reason: 'NO_NEW_CARD' };

  /* 삽입 위치와 마크업 — 형제 카드 실측에서 뽑는다 */
  const last = sec.ingredients[sec.ingredients.length - 1];
  let atIndex, cardHtml;
  if (sec.mode === 'PER_INGREDIENT') {
    const liEnd = html.indexOf('</li>', last.ulEndIdx);
    if (liEnd < 0) return { ok: false, reason: 'SIBLING_LI_END_NOT_FOUND' };
    atIndex = liEnd + '</li>'.length;
    const ulTag = (html.slice(last.ulOpenIdx).match(/^<ul\b[^>]*>/) ?? ['<ul>'])[0];
    cardHtml = newCards.map((nc) => `<li><b>${esc(nc.header)}</b>${ulTag}${nc.clauses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('');
  } else {
    const divEnd = html.indexOf('</div>', last.ulEndIdx);
    if (divEnd < 0) return { ok: false, reason: 'SIBLING_DIV_END_NOT_FOUND' };
    atIndex = divEnd + '</div>'.length;
    const ulTag = (html.slice(last.ulOpenIdx).match(/^<ul\b[^>]*>/) ?? ['<ul>'])[0];
    const tagOpen = (html.slice(0, last.ulOpenIdx).match(/<span class="sd-tag">[^<]*<\/span>\s*$/) ?? [])[0];
    if (!tagOpen) return { ok: false, reason: 'SIBLING_TAG_MARKUP_NOT_FOUND' };
    cardHtml = newCards.map((nc) => `<div class="sd-item"><span class="sd-tag">${esc(nc.header)}</span>${ulTag}${nc.clauses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
  }
  if (atIndex > sec.blockEnd) return { ok: false, reason: 'INSERT_POINT_OUTSIDE_SECTION' };
  return { ok: true, mode: sec.mode, sectionH2: sec.h2, atIndex, cardHtml,
    cards: newCards.map((x) => ({ ingredient: x.header, clauses: x.clauses })),
    clauseCount: newCards.reduce((n, x) => n + x.clauses.length, 0) };
}

/** 카드 신설 patch 검증 — 삽입 전용 + 구조 불변(신설 카드 토큰만 증가). */
function verifyNewCards({ before, after, plan }) {
  const fails = [];
  if (after === before) fails.push('NO_CHANGE_PRODUCED');
  const at = plan.atIndex;
  if (after.slice(at, at + plan.cardHtml.length) !== plan.cardHtml) fails.push('INSERT_OFFSET_MISMATCH');
  else if (after.slice(0, at) + after.slice(at + plan.cardHtml.length) !== before) fails.push('NOT_ADDITIVE_ONLY');
  const h2Seq = (h) => [...h.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => htmlText(m[1])).join('|');
  if (h2Seq(before) !== h2Seq(after)) fails.push('H2_SEQUENCE_CHANGED');
  const clsSet = (h) => [...new Set([...h.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)))].sort().join(',');
  if (clsSet(before) !== clsSet(after)) fails.push('CLASS_SET_CHANGED');       // 새 class 생성 금지
  if ((before.match(/^<div class="[^"]*"/) ?? [''])[0] !== (after.match(/^<div class="[^"]*"/) ?? [''])[0]) fails.push('WRAPPER_CHANGED');
  const foot = (h) => (h.match(/<div class="sd-foot">[\s\S]*?<\/div>/) ?? [''])[0];
  if (foot(before) !== foot(after)) fails.push('FOOTER_CHANGED');
  /* 기존 카드 순서 보존 — 신설 sd-item 만 증가하고 나머지 시퀀스는 동일해야 한다 */
  const seq = (h) => [...h.matchAll(/<div class="(sd-[^"]*)"/g)].map((m) => m[1]);
  const b = seq(before), a = seq(after);
  const added = plan.mode === 'DRIVER_GROUP' ? plan.cards.length : 0;
  if (a.length !== b.length + added) fails.push('CARD_COUNT_UNEXPECTED');
  else {
    /* 신설 카드는 마지막 형제 뒤에 연속으로 들어간다 — 삽입 구간만 제외하고 시퀀스 비교 */
    const kept = [...after.matchAll(/<div class="(sd-[^"]*)"/g)]
      .filter((m) => !(m.index >= plan.atIndex && m.index < plan.atIndex + plan.cardHtml.length))
      .map((m) => m[1]).join('|');
    if (kept !== b.join('|')) fails.push('CARD_ORDER_CHANGED');
  }
  for (const t of ['ul', 'li', 'div', 'h2', 'b', 'span']) {
    const o = (after.match(new RegExp(`<${t}\\b`, 'g')) ?? []).length;
    const cl = (after.match(new RegExp(`</${t}>`, 'g')) ?? []).length;
    if (o !== cl) fails.push(`TAG_UNBALANCED_${t.toUpperCase()}`);
  }
  const DRIVER_MARKS = ['이 제품은 식약처에 신고된 건강기능식품입니다', '주요 기능성', '매장 전문가 문의 안내', '확인 가능한 기준·규격 정보'];
  for (const mk of DRIVER_MARKS) if (!before.includes(mk) && after.includes(mk)) fails.push('DRIVER_FORMAT_INJECTED');
  return [...new Set(fails)];
}

/* ── 대상 생성 ─────────────────────────────────────────────────────────── */
const targets = [], rollback = [], contents = [], promoted = [], rejected = [];
const promoRejectTally = {}, effects = { insertOnly: 0, newCard: 0, clausesInserted: 0, cardsCreated: 0 };

for (const item of candidates) {
  const r = live.get(item.canonicalId);
  if (!r) { rejected.push({ canonicalId: item.canonicalId, reason: 'CANONICAL_NOT_FOUND' }); continue; }
  const before = r.content;
  const a = analyzeTarget({ content: before, mainFnctn: r.fn, family: item.rendererFamily });

  let after = null, ops = null, detail = null, fails = [];
  if (a.classification === 'SAFE_MISSING_CLAUSE') {
    after = applyPatch({ content: before, plan: a.plan });
    fails = verifyPatch({ before, after, plan: a.plan });
    ops = ['INSERT_CLAUSE'];
    detail = { mode: a.plan.mode, sectionH2: a.plan.sectionH2, inserts: a.plan.inserts.map((x) => ({ ingredient: x.ingredient, text: x.text })) };
    if (!fails.length) { effects.insertOnly++; effects.clausesInserted += a.plan.inserts.length; }
  } else {
    const p = planNewCards({ content: before, mainFnctn: r.fn, analysis: { missingClauses: a.detail.coverage.filter((x) => x.how === 'MISSING').map((x) => ({ header: x.header, clause: x.clause })) } });
    if (!p.ok) { promoRejectTally[p.reason] = (promoRejectTally[p.reason] ?? 0) + 1; rejected.push({ canonicalId: item.canonicalId, productName: item.productName, reason: p.reason, from: item.statusReason }); continue; }
    after = before.slice(0, p.atIndex) + p.cardHtml + before.slice(p.atIndex);
    fails = verifyNewCards({ before, after, plan: p });
    ops = ['NEW_INGREDIENT_CARD'];
    detail = { mode: p.mode, sectionH2: p.sectionH2, cards: p.cards };
    if (!fails.length) { effects.newCard++; effects.cardsCreated += p.cards.length; effects.clausesInserted += p.clauseCount;
      promoted.push({ canonicalId: item.canonicalId, productName: item.productName, from: item.statusReason, cards: p.cards.map((x) => x.ingredient) }); }
  }
  if (fails.length) { promoRejectTally[`VERIFY:${fails[0]}`] = (promoRejectTally[`VERIFY:${fails[0]}`] ?? 0) + 1;
    rejected.push({ canonicalId: item.canonicalId, productName: item.productName, reason: `VERIFY_FAIL:${fails.join(',')}`, from: item.statusReason }); continue; }

  /* 기능성 외 byte 변경 0 증명: 삽입분 제거 시 before 복원 (verify 에서 강제) */
  targets.push({ canonicalId: item.canonicalId, productMasterId: r.master_id, candidateId: r.candidate_id,
    statementNo: r.stmt, productName: r.pname, language: 'ko', rendererFamily: item.rendererFamily,
    fromStatus: item.status, fromReason: item.statusReason, ops, detail,
    oldContentHash: sha(before), newContentHash: sha(after), byteDelta: after.length - before.length });
  rollback.push({ canonicalId: item.canonicalId, productMasterId: r.master_id, language: 'ko',
    oldContentHash: sha(before), newContentHash: sha(after), oldContent: before, insertedHtml: ops[0] === 'INSERT_CLAUSE' ? a.plan.inserts.map((x) => x.html) : [detail.cards.length] });
  contents.push({ canonicalId: item.canonicalId, newContent: after, newContentHash: sha(after) });
}

const out = { builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  wo: 'WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1', phase: '§7·§10 — 안전 대상 patch 생성',
  candidates: candidates.length, targets: targets.length, rejected: rejected.length,
  effects, promotedFromHold: promoted.length, promotionRejectTally: promoRejectTally,
  promotedSamples: promoted.slice(0, 20), rejectedSamples: rejected.slice(0, 20),
  uniqueTargets: new Set(targets.map((t) => t.canonicalId)).size,
  targetsIndex: targets };
fs.writeFileSync(`${D}/hff-final-review-4544-safe-targets-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${D}/hff-final-review-4544-rollback-v1.json`, JSON.stringify({ wo: out.wo, phase: out.phase, builtAt: out.builtAt, targets: rollback }, null, 1));
fs.writeFileSync(`${D}/tmp-hff-final-4544-newcontent.json`, JSON.stringify(contents));
const { targetsIndex: _d, ...brief } = out;
console.log(JSON.stringify(brief, null, 2));
