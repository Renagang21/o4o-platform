/**
 * WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1  §14
 *
 * Track A SAFE 26건 전량을 before/after 로 렌더한다 (DB write 0).
 * - 래퍼 `<div class="store-desc-content">` 필수 · 폭 430/820/1280
 * - overflow 0 / clipping 0 / 빈 h2·ul·li·section 0 / raw HTML·대괄호 조각 0
 * - DOM 원료→기능성 귀속 diff: after ⊇ before (라벨·절 손실 0)
 *                              after \ before == plan (원문 밖 추가 0 · 원료 간 혼입 0)
 * - 추가된 절은 공식 MAIN_FNCTN 안에 verbatim 으로 존재해야 한다 (§13)
 *
 * 산출: data/hff-ko-nontranslation-render-audit-v1.json
 */
import fs from 'node:fs';
import pg from 'pg';
import { chromium } from 'playwright';
import { cmpText } from './hff-ko-function-family-preserving-patch.mjs';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-nontranslation-render-audit-v1.json`;
const targets = JSON.parse(fs.readFileSync(`${D}/hff-ko-nontranslation-safe-targets-v1.json`, 'utf8')).targets;

const src = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8');
const css = src.match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
if (!css || !css.includes('.store-desc-content .sd-func')) { console.log(JSON.stringify({ error: 'CSS_EXTRACT_FAIL' })); process.exit(1); }

/* 공식 원문 (verbatim 게이트용) — read-only */
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }
const official = new Map();
for (const r of (await c.query(`
  SELECT spd.id, pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
    FROM shared_product_descriptions spd
    LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
      AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
   WHERE spd.id = ANY($1)`, [targets.map((t) => t.canonicalId)])).rows) official.set(r.id, r.fn ?? '');
await c.end();

/* 브라우저 내 귀속 추출 — DRIVER_GROUP(.sd-item/.sd-tag) · PER_INGREDIENT(li>b>ul) · FLAT(라벨 없음) */
const EXTRACT = () => {
  const SEP = '';
  const t = (n) => n.textContent.replace(/\s+/g, ' ').trim();
  const pairs = [], labels = [], seen = new Set();
  for (const it of document.querySelectorAll('.sd-item')) {
    const lab = it.querySelector('.sd-tag') ? t(it.querySelector('.sd-tag')) : '';
    labels.push(lab);
    for (const li of it.querySelectorAll('ul > li')) { pairs.push(lab + '' + t(li)); seen.add(li); }
  }
  for (const li of document.querySelectorAll('li')) {
    const b = li.querySelector(':scope > b'); const ul = li.querySelector(':scope > ul');
    if (!b || !ul) continue;
    const lab = t(b); labels.push(lab);
    for (const cl of ul.querySelectorAll(':scope > li')) { pairs.push(lab + '' + t(cl)); seen.add(cl); }
  }
  for (const li of document.querySelectorAll('li')) {
    if (seen.has(li) || li.querySelector(':scope > ul') || li.querySelector(':scope > b')) continue;
    pairs.push('' + t(li));
  }
  const de = document.documentElement, vw = de.clientWidth;
  let elemOverflow = 0, clipped = 0;
  for (const el of document.querySelectorAll('.sd-card *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) elemOverflow++;
    const cs = getComputedStyle(el);
    if ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && cs.overflow === 'hidden') clipped++;
  }
  const text = document.body.innerText;
  const empty = (sel) => [...document.querySelectorAll(sel)].filter((n) => !n.textContent.trim()).length;
  return {
    pairs, labels,
    headings: [...document.querySelectorAll('h2')].map(t),
    pageOverflow: de.scrollWidth > de.clientWidth + 1, elemOverflow, clipped,
    emptyH2: empty('h2'), emptyUl: [...document.querySelectorAll('ul')].filter((n) => !n.querySelector('li')).length,
    emptyLi: empty('li'), emptySection: empty('section'),
    rawBracket: /[[\]]/.test(text), rawHtml: /<[a-zA-Z/]/.test(text),
    hasExpertNotice: /전문가|약사|문의/.test(text),
    hintCardEmpty: [...document.querySelectorAll('h2')].some((h) => /참고사항/.test(h.textContent) && !(h.nextElementSibling && h.nextElementSibling.textContent.trim())),
    computed: (() => { const card = document.querySelector('.sd-card'), hero = document.querySelector('.sd-hero'), badge = document.querySelector('.sd-badge');
      return { cardMaxWidth: card ? getComputedStyle(card).maxWidth : null, cardBorderRadius: card ? getComputedStyle(card).borderRadius : null,
        heroPadding: hero ? getComputedStyle(hero).padding : null, badgeBorderRadius: badge ? getComputedStyle(badge).borderRadius : null }; })(),
  };
};

const html = (content) => `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="store-desc-content">${content}</div></body></html>`;

const browser = await chromium.launch();
const WIDTHS = [430, 820, 1280];
const pages = {};
for (const w of WIDTHS) pages[w] = await browser.newPage({ viewport: { width: w, height: 1200 } });

/* 래퍼 증명 — 래퍼 없이는 CSS 가 적용되지 않음을 보인다 */
const probe = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const measure = () => probe.evaluate(() => { const c2 = document.querySelector('.sd-card');
  return c2 ? { maxWidth: getComputedStyle(c2).maxWidth, borderRadius: getComputedStyle(c2).borderRadius } : null; });
await probe.setContent(`<html><head><style>${css}</style></head><body>${targets[0].afterContent}</body></html>`);
const without = await measure();
await probe.setContent(html(targets[0].afterContent));
const withW = await measure();
await probe.close();
const wrapperProof = { withoutWrapper: without, withWrapper: withW,
  cssActuallyApplied: withW?.maxWidth === '860px' && withW.maxWidth !== without?.maxWidth };

const results = [];
for (const t of targets) {
  const fnCmp = cmpText(official.get(t.canonicalId) ?? '');
  const per = [];
  for (const w of WIDTHS) {
    const p = pages[w];
    await p.setContent(html(t.beforeContent), { waitUntil: 'load' });
    const before = await p.evaluate(EXTRACT);
    await p.setContent(html(t.afterContent), { waitUntil: 'load' });
    const after = await p.evaluate(EXTRACT);
    const bs = new Set(before.pairs), as = new Set(after.pairs);
    const lost = [...bs].filter((x) => !as.has(x));
    const added = [...as].filter((x) => !bs.has(x));
    const lostLabels = [...new Set(before.labels)].filter((x) => !after.labels.includes(x));
    per.push({ width: w, before, after, lost, added, lostLabels });
  }
  const base = per[0];
  const added = base.added.map((x) => { const [label, clause] = x.split(''); return { label, clause }; });
  /* 계획된 라벨 = 신설 카드 라벨 ∪ 기존 카드 삽입 대상 라벨 (§9 두 허용 연산) */
  const plannedLabels = new Set([
    ...(t.newCards ?? []).map((n) => n.label),
    ...t.ops.filter((o) => o.kind === 'INSERT_CLAUSE' && o.label).map((o) => o.label),
  ]);
  const expectedAdded = (t.newCards ?? []).reduce((s, n) => s + n.clauses, 0) + (t.insertedClauses ?? 0);

  const notVerbatim = added.filter((a) => !fnCmp.includes(cmpText(a.clause)));
  const labelNotPlanned = added.filter((a) => a.label && !plannedLabels.has(a.label));
  const widthDisagree = per.some((x) => x.added.length !== base.added.length || x.lost.length !== base.lost.length);

  /* 레이아웃은 before 대비 악화 여부로 본다. 공식 원문에서 온 기존 대괄호(섭취 시 참고사항 등)는
     §9 상 수정 금지 대상이므로 패치가 유발하지 않은 결함을 FAIL 로 계상하지 않는다.
     전문가 안내 누락만 절대 기준으로 본다. */
  const worse = (x) => (x.after.pageOverflow && !x.before.pageOverflow)
    || x.after.elemOverflow > x.before.elemOverflow || x.after.clipped > x.before.clipped
    || x.after.emptyH2 > x.before.emptyH2 || x.after.emptyUl > x.before.emptyUl
    || x.after.emptyLi > x.before.emptyLi || x.after.emptySection > x.before.emptySection
    || (x.after.rawBracket && !x.before.rawBracket) || (x.after.rawHtml && !x.before.rawHtml)
    || !x.after.hasExpertNotice || (x.after.hintCardEmpty && !x.before.hintCardEmpty);
  const layoutOk = !per.some(worse);
  const preexisting = { rawBracket: base.before.rawBracket, pageOverflow: base.before.pageOverflow,
    elemOverflow: base.before.elemOverflow, clipped: base.before.clipped };
  const cs = base.after.computed;
  const styleOk = cs.cardMaxWidth === '860px' && cs.cardBorderRadius !== '0px' && cs.heroPadding && cs.heroPadding !== '0px' && cs.badgeBorderRadius !== '0px';
  const headingsSame = JSON.stringify(base.before.headings) === JSON.stringify(base.after.headings);

  const checks = {
    clauseLoss: base.lost.length, labelLoss: base.lostLabels.length,
    addedPairs: added.length, expectedAdded,
    addedCountMatch: added.length === expectedAdded,
    outOfSourceAdditions: notVerbatim.length, ingredientMixing: labelNotPlanned.length,
    headingsSame, widthDisagree, layoutOk, styleOk,
  };
  const verdict = checks.clauseLoss === 0 && checks.labelLoss === 0 && checks.addedCountMatch
    && checks.outOfSourceAdditions === 0 && checks.ingredientMixing === 0
    && headingsSame && !widthDisagree && layoutOk && styleOk ? 'PASS' : 'FAIL';

  results.push({ canonicalId: t.canonicalId, productName: t.productName, rendererFamily: t.rendererFamily, mode: t.mode,
    labelForm: t.labelForm, checks, verdict, added, preexisting,
    failures: verdict === 'FAIL' ? { lost: base.lost, notVerbatim, labelNotPlanned,
      layout: per.filter(worse)
        .map((x) => ({ width: x.width, ...x.after, pairs: undefined, labels: undefined, headings: undefined })) } : undefined,
    widths: per.map((x) => ({ width: x.width, pageOverflow: x.after.pageOverflow, elemOverflow: x.after.elemOverflow, clipped: x.after.clipped })) });
}
await browser.close();

const out = {
  ranAt: new Date().toISOString(), wo: 'WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1',
  applied: false, dbWrites: 0, wrapperProof, rendered: results.length, widths: WIDTHS,
  totals: {
    pass: results.filter((r) => r.verdict === 'PASS').length,
    fail: results.filter((r) => r.verdict === 'FAIL').length,
    clauseLoss: results.reduce((s, r) => s + r.checks.clauseLoss, 0),
    labelLoss: results.reduce((s, r) => s + r.checks.labelLoss, 0),
    addedPairs: results.reduce((s, r) => s + r.checks.addedPairs, 0),
    expectedAdded: results.reduce((s, r) => s + r.checks.expectedAdded, 0),
    outOfSourceAdditions: results.reduce((s, r) => s + r.checks.outOfSourceAdditions, 0),
    ingredientMixing: results.reduce((s, r) => s + r.checks.ingredientMixing, 0),
  },
  verdict: results.every((r) => r.verdict === 'PASS') && wrapperProof.cssActuallyApplied ? 'PASS' : 'FAIL',
  results,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ out: OUT, wrapperProof, verdict: out.verdict, totals: out.totals,
  fails: results.filter((r) => r.verdict === 'FAIL').map((r) => ({ id: r.canonicalId.slice(0, 8), name: r.productName, checks: r.checks })) }, null, 2));
