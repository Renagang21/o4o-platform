/** 정책 정비 렌더 검증 — FN·삼중작업 전량 + 조합별 표본 (DB write 0). */
import fs from 'node:fs';
import { chromium } from 'playwright';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-why-family-policy-cleanup-render-audit-v1.json`;
const idx = JSON.parse(fs.readFileSync(`${D}/hff-ko-why-family-policy-cleanup-targets-v1.json`, 'utf8'));
const contents = new Map(JSON.parse(fs.readFileSync(`${D}/tmp-hff-policy-newcontent.json`, 'utf8')).map((x) => [x.canonicalId, x.newContent]));
const byId = new Map(idx.targetsIndex.map((t) => [t.canonicalId, t]));
const css = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8').match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
if (!css.includes('.store-desc-content .sd-func')) { console.log(JSON.stringify({ error: 'CSS_MISSING_SDFUNC' })); process.exit(1); }

const PER_COMBO = 60;
const groups = {};
for (const t of idx.targetsIndex) (groups[t.combo] ??= []).push(t);
const pick = [];
for (const [combo, arr] of Object.entries(groups)) {
  if (combo.includes('FN') || arr.length <= PER_COMBO) { pick.push(...arr); continue; }
  const step = Math.floor(arr.length / PER_COMBO);
  for (let i = 0, n = 0; i < arr.length && n < PER_COMBO; i += step, n++) pick.push(arr[i]);
}

const browser = await chromium.launch();
const pages = {};
for (const w of [430, 820, 1280]) pages[w] = await browser.newPage({ viewport: { width: w, height: 900 } });

const agg = { checked: 0, docs: 0, pageOverflow: 0, elemOverflow: 0, clipped: 0, emptyNode: 0,
  audienceVisible: 0, expertMissing: 0, footerMisplaced: 0, fnClauseMissing: 0, rawHtmlVisible: 0, emptySection: 0 };
const failures = [];
for (const t of pick) {
  const content = contents.get(t.canonicalId);
  if (!content) { failures.push({ id: t.canonicalId, why: 'CONTENT_MISSING' }); continue; }
  agg.docs++;
  const fnClauses = t.fnInsertedBlock
    ? (() => { const out = []; const re = /<li[^>]*>([\s\S]*?)(?=<li[^>]*>|<\/li>)/g; let m;
        while ((m = re.exec(t.fnInsertedBlock)) !== null) { const x = m[1].replace(/<[^>]+>/g, '').trim(); if (x) out.push(x); } return out; })()
    : [];
  for (const w of [430, 820, 1280]) {
    const page = pages[w];
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="store-desc-content">${content}</div></body></html>`, { waitUntil: 'domcontentloaded' });
    const r = await page.evaluate((cls) => {
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
        fnClausesVisible: cls.filter((x) => text.includes(x)).length, fnClausesExpected: cls.length,
        rawHtmlVisible: /<\/?(div|ul|li|h2|p|b)\b/i.test(text) };
    }, fnClauses);
    agg.checked++;
    if (r.pageOverflow) agg.pageOverflow++;
    if (r.elemOverflow) agg.elemOverflow++;
    if (r.clipped) agg.clipped++;
    if (r.emptyNode) agg.emptyNode++;
    if (r.emptySection) agg.emptySection++;
    if (r.audienceVisible) { agg.audienceVisible++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'AUDIENCE_VISIBLE' }); }
    if (!r.expertPresent) { agg.expertMissing++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'EXPERT_MISSING' }); }
    if (!r.footerIsLastChild) { agg.footerMisplaced++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'FOOTER_MISPLACED' }); }
    if (r.fnClausesVisible !== r.fnClausesExpected) { agg.fnClauseMissing++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'FN_CLAUSE_MISSING' }); }
    if (r.rawHtmlVisible) agg.rawHtmlVisible++;
  }
}
for (const w of [430, 820, 1280]) await pages[w].close();
await browser.close();

const bad = agg.pageOverflow + agg.elemOverflow + agg.clipped + agg.emptyNode + agg.emptySection
  + agg.audienceVisible + agg.expertMissing + agg.footerMisplaced + agg.fnClauseMissing + agg.rawHtmlVisible;
const out = { ranAt: new Date().toISOString(), applied: false, dbWrites: 0,
  totalTargets: idx.targetsIndex.length, renderedDocs: agg.docs, comboCoverage: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])),
  aggregate: agg, failures, verdict: bad === 0 ? 'PASS' : 'FAIL' };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ out: OUT, renderedDocs: agg.docs, comboCoverage: out.comboCoverage, aggregate: agg, verdict: out.verdict, failures: failures.slice(0, 5) }, null, 2));
