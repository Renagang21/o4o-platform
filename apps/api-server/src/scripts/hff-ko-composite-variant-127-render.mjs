/** Phase 1-C — COMPOSITE 변종 127 전량 렌더 검증 (3 viewport, DB write 0). */
import fs from 'node:fs';
import { chromium } from 'playwright';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-composite-variant-127-render-audit-v1.json`;
const idx = JSON.parse(fs.readFileSync(`${D}/hff-ko-composite-variant-127-targets-v1.json`, 'utf8'));
const contents = new Map(JSON.parse(fs.readFileSync(`${D}/tmp-hff-composite127-newcontent.json`, 'utf8')).map((x) => [x.canonicalId, x.newContent]));
const css = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8').match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
if (!css.includes('.store-desc-content .sd-func')) { console.log(JSON.stringify({ error: 'CSS_MISSING_SDFUNC' })); process.exit(1); }

const browser = await chromium.launch();
const pages = {};
for (const w of [430, 820, 1280]) pages[w] = await browser.newPage({ viewport: { width: w, height: 900 } });

const agg = { checked: 0, docs: 0, pageOverflow: 0, elemOverflow: 0, clipped: 0, emptyNode: 0, emptySection: 0,
  audienceVisible: 0, expertMissing: 0, footerMisplaced: 0, functionMissing: 0, rawHtmlVisible: 0 };
const failures = [];
for (const t of idx.targetsIndex) {
  const content = contents.get(t.canonicalId);
  if (!content) { failures.push({ id: t.canonicalId, why: 'CONTENT_MISSING' }); continue; }
  agg.docs++;
  for (const w of [430, 820, 1280]) {
    const page = pages[w];
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="store-desc-content">${content}</div></body></html>`, { waitUntil: 'domcontentloaded' });
    const r = await page.evaluate(() => {
      const de = document.documentElement, vw = de.clientWidth;
      let clipped = 0, elemOverflow = 0;
      for (const el of document.querySelectorAll('.sd-card *')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        if (b.right > vw + 1 || b.left < -1) elemOverflow++;
        const s = getComputedStyle(el);
        if ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && s.overflow === 'hidden') clipped++;
      }
      const text = document.body.innerText;
      const foot = document.querySelector('.sd-foot');
      const card = document.querySelector('.sd-card');
      return { pageOverflow: de.scrollWidth > de.clientWidth + 1, elemOverflow, clipped,
        emptyNode: [...document.querySelectorAll('h2,li,ul')].some((n) => !n.textContent.trim()),
        emptySection: [...document.querySelectorAll('.sd-body > *')].some((n) => n.tagName !== 'H2' && !n.textContent.trim()),
        audienceVisible: text.includes('이런 분께'),
        expertPresent: text.includes('매장 내 약사 등 전문가'),
        footerIsLastChild: !!foot && !!card && card.lastElementChild === foot,
        functionPresent: [...document.querySelectorAll('h2')].some((h) => /기능성/.test(h.textContent)),
        rawHtmlVisible: /<\/?(div|ul|li|h2|p|b)\b/i.test(text) };
    });
    agg.checked++;
    if (r.pageOverflow) agg.pageOverflow++;
    if (r.elemOverflow) agg.elemOverflow++;
    if (r.clipped) agg.clipped++;
    if (r.emptyNode) agg.emptyNode++;
    if (r.emptySection) agg.emptySection++;
    if (r.audienceVisible) { agg.audienceVisible++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'AUDIENCE_VISIBLE' }); }
    if (!r.expertPresent) { agg.expertMissing++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'EXPERT_MISSING' }); }
    if (!r.footerIsLastChild) { agg.footerMisplaced++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'FOOTER_MISPLACED' }); }
    if (!r.functionPresent) { agg.functionMissing++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'FUNCTION_MISSING' }); }
    if (r.rawHtmlVisible) agg.rawHtmlVisible++;
  }
}
for (const w of [430, 820, 1280]) await pages[w].close();
await browser.close();

const bad = agg.pageOverflow + agg.elemOverflow + agg.clipped + agg.emptyNode + agg.emptySection
  + agg.audienceVisible + agg.expertMissing + agg.footerMisplaced + agg.functionMissing + agg.rawHtmlVisible;
const out = { ranAt: new Date().toISOString(), applied: false, dbWrites: 0, coverage: 'FULL',
  totalTargets: idx.targetsIndex.length, renderedDocs: agg.docs, aggregate: agg, failures,
  verdict: bad === 0 && agg.docs === idx.targetsIndex.length ? 'PASS' : 'FAIL' };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
