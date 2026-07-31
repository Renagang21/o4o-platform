/**
 * WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1  §12 렌더 검증 (DB write 0)
 *
 * 대상 65건은 전건 렌더한다(카드 신설·라벨 보존·다원료 기능성 = 전부 고위험 op).
 * 문자열 포함 검사로 판정하지 않는다 — before/after 를 각각 렌더해 **DOM 에서 원료→절 귀속 맵**을
 * 추출하고, 차집합이 계획된 삽입과 정확히 일치하는지 본다.
 *   · after ⊇ before          → 라벨 손실 0 / 공식 기능성 삭제 0 / 절 누락 0
 *   · after \ before == plan  → 원문 밖 기능성 추가 0 / 원료 간 혼입 0
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-final-review-4544-render-audit-v1.json`;
const VIEWPORTS = [430, 820, 1280];

const idx = JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-safe-targets-v1.json`, 'utf8'));
const before = new Map(JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-rollback-v1.json`, 'utf8')).targets.map((x) => [x.canonicalId, x.oldContent]));
const after = new Map(JSON.parse(fs.readFileSync(`${D}/tmp-hff-final-4544-newcontent.json`, 'utf8')).map((x) => [x.canonicalId, x.newContent]));
const css = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8').match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
if (!css.includes('.store-desc-content .sd-func')) { console.log(JSON.stringify({ error: 'CSS_MISSING_SDFUNC' })); process.exit(1); }

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const EXTRACT = (h2Label) => {
  /* 기능성 h2 다음 컨테이너에서 원료→절 귀속을 DOM 으로 추출 */
  const h2 = [...document.querySelectorAll('h2')].find((h) => h.textContent.replace(/\s+/g, ' ').trim() === h2Label);
  if (!h2) return { found: false, cards: [] };
  let n = h2.nextElementSibling; const cards = [];
  if (!n) return { found: true, cards };
  const groups = n.querySelectorAll(':scope > .sd-item');
  if (groups.length) {
    for (const g of groups) cards.push({ label: g.querySelector('.sd-tag')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
      items: [...g.querySelectorAll('li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()) });
  } else {
    for (const li of n.querySelectorAll(':scope > li')) {
      const b = li.querySelector(':scope > b');
      const sub = li.querySelector(':scope > ul');
      if (b && sub) cards.push({ label: b.textContent.replace(/\s+/g, ' ').trim(), items: [...sub.querySelectorAll('li')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()) });
      else cards.push({ label: null, items: [li.textContent.replace(/\s+/g, ' ').trim()] });
    }
  }
  return { found: true, cards };
};

const browser = await chromium.launch();
const pages = {};
for (const w of VIEWPORTS) pages[w] = await browser.newPage({ viewport: { width: w, height: 900 } });
const shell = (html) => `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="store-desc-content">${html}</div></body></html>`;

const agg = { docs: 0, checks: 0, pageOverflow: 0, elemOverflow: 0, clipped: 0, emptyNode: 0,
  sectionMissing: 0, labelLost: 0, clauseLost: 0, unplannedAddition: 0, crossIngredientMix: 0,
  recognitionNoLost: 0, rawHtmlVisible: 0, bracketFragment: 0 };
const failures = [];
const fail = (t, w, why, extra) => { agg[why]++; if (failures.length < 40) failures.push({ canonicalId: t.canonicalId, productName: t.productName, w, why, ...extra }); };

for (const t of idx.targetsIndex) {
  agg.docs++;
  const bHtml = before.get(t.canonicalId), aHtml = after.get(t.canonicalId);
  /* 계획된 추가분 — 카드 신설 / 기존 카드 삽입 */
  const plannedNewLabels = new Set((t.detail.cards ?? []).map((c) => norm(c.ingredient)));
  const plannedClauses = new Set([
    ...(t.detail.cards ?? []).flatMap((c) => c.clauses.map((x) => norm(x))),
    ...(t.detail.inserts ?? []).map((x) => norm(x.text)),
  ]);
  const plannedOwner = new Map();
  for (const c of t.detail.cards ?? []) for (const x of c.clauses) plannedOwner.set(norm(x), norm(c.ingredient));
  for (const x of t.detail.inserts ?? []) plannedOwner.set(norm(x.text), x.ingredient == null ? null : norm(x.ingredient));

  for (const w of VIEWPORTS) {
    const page = pages[w];
    await page.setContent(shell(bHtml), { waitUntil: 'domcontentloaded' });
    const bx = await page.evaluate(EXTRACT, t.detail.sectionH2);
    const bText = await page.evaluate(() => document.body.innerText);
    await page.setContent(shell(aHtml), { waitUntil: 'domcontentloaded' });
    const ax = await page.evaluate(EXTRACT, t.detail.sectionH2);
    const layout = await page.evaluate(() => {
      const de = document.documentElement, vw = de.clientWidth;
      let clipped = 0, elemOverflow = 0;
      for (const el of document.querySelectorAll('.sd-card *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.right > vw + 1 || r.left < -1) elemOverflow++;
        const s = getComputedStyle(el);
        if ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && s.overflow === 'hidden') clipped++;
      }
      const text = document.body.innerText;
      return { pageOverflow: de.scrollWidth > de.clientWidth + 1, elemOverflow, clipped,
        emptyNode: [...document.querySelectorAll('h2,li,ul')].some((n) => !n.textContent.trim()),
        rawHtmlVisible: /<\/?(div|ul|li|h2|p|b|span)\b/i.test(text),
        /* 줄 단위 대괄호 균형 — 손상된 원문 파편이 화면에 노출되는지 */
        bracketFragment: text.split('\n').some((line) => {
          let d = 0; for (const ch of line) { if (ch === '[') d++; else if (ch === ']') { d--; if (d < 0) return true; } } return d !== 0;
        }),
        text };
    });
    agg.checks++;
    if (layout.pageOverflow) fail(t, w, 'pageOverflow');
    if (layout.elemOverflow) fail(t, w, 'elemOverflow', { n: layout.elemOverflow });
    if (layout.clipped) fail(t, w, 'clipped', { n: layout.clipped });
    if (layout.emptyNode) fail(t, w, 'emptyNode');
    if (layout.rawHtmlVisible) fail(t, w, 'rawHtmlVisible');
    if (layout.bracketFragment) fail(t, w, 'bracketFragment');
    if (!ax.found || !bx.found) { fail(t, w, 'sectionMissing'); continue; }

    /* 라벨 보존 (DOM 구조 기준) */
    const bLabels = bx.cards.map((c) => c.label), aLabels = ax.cards.map((c) => c.label);
    for (const l of bLabels) if (!aLabels.includes(l)) fail(t, w, 'labelLost', { label: l });
    for (const l of aLabels) if (!bLabels.includes(l) && !(l !== null && plannedNewLabels.has(norm(l)))) fail(t, w, 'unplannedAddition', { label: l });

    /* 절 보존·추가·귀속 */
    const own = (cards) => { const m = new Map(); for (const c of cards) for (const it of c.items) m.set(norm(it), c.label === null ? null : norm(c.label)); return m; };
    const bo = own(bx.cards), ao = own(ax.cards);
    for (const [clause, owner] of bo) {
      if (!ao.has(clause)) fail(t, w, 'clauseLost', { clause: clause.slice(0, 60) });
      else if (ao.get(clause) !== owner) fail(t, w, 'crossIngredientMix', { clause: clause.slice(0, 60), from: owner, to: ao.get(clause) });
    }
    for (const [clause, owner] of ao) {
      if (bo.has(clause)) continue;
      if (!plannedClauses.has(clause)) { fail(t, w, 'unplannedAddition', { clause: clause.slice(0, 60) }); continue; }
      const want = plannedOwner.get(clause);
      if (want !== undefined && want !== null && owner !== want) fail(t, w, 'crossIngredientMix', { clause: clause.slice(0, 60), want, got: owner });
    }
    /* 개별인정 인정번호 보존 */
    const nos = (s) => new Set((s.match(/제\s?\d{4}\s?-\s?\d+\s?호/g) ?? []).map(norm));
    const aNos = nos(layout.text);
    for (const no of nos(bText)) if (!aNos.has(no)) fail(t, w, 'recognitionNoLost', { no });
  }
}
for (const w of VIEWPORTS) await pages[w].close();
await browser.close();

const bad = Object.entries(agg).filter(([k]) => !['docs', 'checks'].includes(k)).reduce((n, [, v]) => n + v, 0);
const out = { ranAt: new Date().toISOString(), wo: 'WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1',
  applied: false, dbWrites: 0, coverage: 'FULL_TARGETS', viewports: VIEWPORTS,
  totalTargets: idx.targetsIndex.length, renderedDocs: agg.docs, aggregate: agg, failures,
  verdict: bad === 0 && agg.docs === idx.targetsIndex.length ? 'PASS' : 'FAIL' };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
