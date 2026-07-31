/** 523 렌더 검증 — Track A 수정본 + Track B 신규본 전량 × 430/820/1280 (DB write 0). */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { buildTrackBCanonical } from './hff-ko-final-hold-523-buildb.mjs';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-final-hold-523-render-audit-v1.json`;
const safe = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-hold-523-safe-targets-v1.json`, 'utf8'));
const newA = new Map(JSON.parse(fs.readFileSync(`${D}/tmp-hff-523-newcontent.json`, 'utf8')).map((x) => [x.canonicalId, x.newContent]));
const css = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8').match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
if (!css.includes('.store-desc-content .sd-card')) { console.log(JSON.stringify({ error: 'CSS_EXTRACT_FAIL' })); process.exit(1); }
const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why','sd-func','is-solid']);

const docs = [
  ...safe.trackATargets.map((t) => ({ kind: 'A', name: t.productName, html: newA.get(t.canonicalId) })),
  ...safe.trackBTargets.map((t) => ({ kind: 'B', name: t.productName, html: buildTrackBCanonical(t.official) })),
];

const browser = await chromium.launch();
const pages = {};
for (const w of [430, 820, 1280]) pages[w] = await browser.newPage({ viewport: { width: w, height: 900 } });

const probe = pages[1280];
await probe.setContent(`<html><head><style>${css}</style></head><body>${docs[0].html}</body></html>`);
const without = await probe.evaluate(() => getComputedStyle(document.querySelector('.sd-card')).maxWidth);
await probe.setContent(`<html><head><style>${css}</style></head><body><div class="store-desc-content">${docs[0].html}</div></body></html>`);
const withW = await probe.evaluate(() => getComputedStyle(document.querySelector('.sd-card')).maxWidth);
const wrapperProof = { withoutWrapper: without, withWrapper: withW, cssActuallyApplied: withW === '860px' && withW !== without };

const agg = { checked: 0, pageOverflow: 0, elemOverflow: 0, clipped: 0, emptyNode: 0,
  undefinedClass: 0, expertMissing: 0, rawHtml: 0, markerVisible: 0, englishVisible: 0, fnSectionMissing: 0 };
const failures = [];
for (const d of docs) {
  const undef = [...d.html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((x) => x && !DEFINED.has(x));
  if (undef.length) { agg.undefinedClass++; failures.push({ name: d.name, why: 'UNDEF_CLASS', undef: [...new Set(undef)] }); }
  for (const w of [430, 820, 1280]) {
    const page = pages[w];
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="store-desc-content">${d.html}</div></body></html>`, { waitUntil: 'domcontentloaded' });
    const r = await page.evaluate(() => {
      const de = document.documentElement, vw = de.clientWidth;
      let clipped = 0, elemOverflow = 0;
      for (const el of document.querySelectorAll('.sd-card *')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        if (b.right > vw + 1 || b.left < -1) elemOverflow++;
        const cs = getComputedStyle(el);
        if ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && cs.overflow === 'hidden') clipped++;
      }
      const text = document.body.innerText;
      const items = [...document.querySelectorAll('.sd-why li, .sd-core li, .sd-func li, .sd-item li')].map((n) => n.textContent.trim());
      return {
        pageOverflow: de.scrollWidth > de.clientWidth + 1, elemOverflow, clipped,
        emptyNode: [...document.querySelectorAll('h2,li,ul')].some((n) => !n.textContent.trim()),
        expert: text.includes('전문가'),
        rawHtml: /<\/?(div|ul|li|h2|p|b)\b/i.test(text),
        markerVisible: items.some((x) => /^(\(\s*\d+\s*\)|\d+\s*[).]|[①-⑳])/.test(x)),
        englishVisible: items.some((x) => /[A-Za-z]{6,}/.test(x)),
        fnSection: [...document.querySelectorAll('h2')].some((h) => /기능성/.test(h.textContent)),
      };
    });
    agg.checked++;
    if (r.pageOverflow) agg.pageOverflow++;
    if (r.elemOverflow) agg.elemOverflow++;
    if (r.clipped) agg.clipped++;
    if (r.emptyNode) agg.emptyNode++;
    if (!r.expert) agg.expertMissing++;
    if (r.rawHtml) agg.rawHtml++;
    if (r.markerVisible) { agg.markerVisible++; if (failures.length < 10) failures.push({ name: d.name, w, why: 'MARKER' }); }
    if (r.englishVisible) { agg.englishVisible++; if (failures.length < 10) failures.push({ name: d.name, w, why: 'ENGLISH' }); }
    if (!r.fnSection) agg.fnSectionMissing++;
  }
}
for (const w of [430, 820, 1280]) await pages[w].close();
await browser.close();

const bad = agg.pageOverflow + agg.elemOverflow + agg.clipped + agg.emptyNode + agg.undefinedClass
  + agg.expertMissing + agg.rawHtml + agg.markerVisible + agg.englishVisible + agg.fnSectionMissing;
const out = { ranAt: new Date().toISOString(), applied: false, dbWrites: 0, docs: docs.length,
  trackA: safe.trackATargets.length, trackB: safe.trackBTargets.length,
  wrapperProof, aggregate: agg, failures, verdict: bad === 0 && wrapperProof.cssActuallyApplied ? 'PASS' : 'FAIL' };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ out: OUT, docs: docs.length, wrapperProof, aggregate: agg, verdict: out.verdict, failures: failures.slice(0, 5) }, null, 2));
