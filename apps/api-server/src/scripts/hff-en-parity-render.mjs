/**
 * Phase 4-D — EN 정합 patch 렌더 검증 (3 viewport, DB write 0).
 *
 * 커버리지 정책: 15,498 전량 브라우저 렌더는 비현실적이므로 **구조 시그니처 전수 커버**로 정의한다.
 *   시그니처 = (h2 텍스트 시퀀스) + (문서에 등장하는 class 집합) + (ops 조합)
 *   → 시그니처마다 최대 3개 대표 문서를 렌더하고, 시그니처 누락이 1개도 없어야 PASS.
 *   FN 삽입 문서는 시그니처와 무관하게 전건 렌더한다.
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-en-parity-render-audit-v1.json`;
const PER_SIG = 3;
const EN_EXPERT_CLAUSE = 'This health functional food is not a drug for preventing or treating disease; consult a pharmacist or professional in store';

const idx = JSON.parse(fs.readFileSync(`${D}/hff-en-parity-targets-v1.json`, 'utf8'));
const contents = new Map(JSON.parse(fs.readFileSync(`${D}/tmp-hff-en-newcontent.json`, 'utf8')).map((x) => [x.canonicalId, x.newContent]));
const css = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8').match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
if (!css.includes('.store-desc-content .sd-func')) { console.log(JSON.stringify({ error: 'CSS_MISSING_SDFUNC' })); process.exit(1); }

const sigOf = (html, ops) => {
  const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim()).join('|');
  const cls = [...new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)))].sort().join(',');
  return `${ops.join('+')}#${h2}#${cls}`;
};

const bySig = new Map();
let missingContent = 0;
for (const t of idx.targetsIndex) {
  const html = contents.get(t.canonicalId);
  if (!html) { missingContent++; continue; }
  const s = sigOf(html, t.ops);
  if (!bySig.has(s)) bySig.set(s, []);
  bySig.get(s).push(t);
}
const picked = [];
const seen = new Set();
for (const [s, list] of bySig) for (const t of list.slice(0, PER_SIG)) { picked.push({ ...t, sig: s }); seen.add(t.canonicalId); }
for (const t of idx.targetsIndex) if (t.ops.includes('FN') && !seen.has(t.canonicalId)) { picked.push({ ...t, sig: sigOf(contents.get(t.canonicalId), t.ops) }); seen.add(t.canonicalId); }

const browser = await chromium.launch();
const pages = {};
for (const w of [430, 820, 1280]) pages[w] = await browser.newPage({ viewport: { width: w, height: 900 } });

const agg = { checked: 0, docs: 0, pageOverflow: 0, elemOverflow: 0, clipped: 0, emptyNode: 0, emptySection: 0,
  audienceVisible: 0, expertMissing: 0, footerMisplaced: 0, functionMismatch: 0, rawHtmlVisible: 0 };
const failures = [];
for (const t of picked) {
  const content = contents.get(t.canonicalId);
  agg.docs++;
  const expectFn = /<h2[^>]*>[^<]*function[^<]*<\/h2>/i.test(content);
  for (const w of [430, 820, 1280]) {
    const page = pages[w];
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="store-desc-content">${content}</div></body></html>`, { waitUntil: 'domcontentloaded' });
    const r = await page.evaluate((clause) => {
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
        /* `For guardians` 는 sd-meta(제품 메타 문구)에도 쓰인다 — 대상 섹션은 h2 로만 판정한다 */
        audienceVisible: document.querySelectorAll('.sd-who').length > 0
          || [...document.querySelectorAll('h2')].some((h) => /Who it suits|For guardians|For whom/i.test(h.textContent)),
        expertPresent: text.includes(clause),
        footerIsLastChild: !!foot && !!card && card.lastElementChild === foot,
        functionPresent: [...document.querySelectorAll('h2')].some((h) => /function/i.test(h.textContent)),
        rawHtmlVisible: /<\/?(div|ul|li|h2|p|b)\b/i.test(text) };
    }, EN_EXPERT_CLAUSE);
    agg.checked++;
    if (r.pageOverflow) agg.pageOverflow++;
    if (r.elemOverflow) agg.elemOverflow++;
    if (r.clipped) agg.clipped++;
    if (r.emptyNode) agg.emptyNode++;
    if (r.emptySection) agg.emptySection++;
    if (r.audienceVisible) { agg.audienceVisible++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'AUDIENCE_VISIBLE', sig: t.sig }); }
    if (!r.expertPresent) { agg.expertMissing++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'EXPERT_MISSING', sig: t.sig }); }
    if (!r.footerIsLastChild) { agg.footerMisplaced++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'FOOTER_MISPLACED', sig: t.sig }); }
    if (r.functionPresent !== expectFn) { agg.functionMismatch++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'FUNCTION_DOM_STRING_MISMATCH', sig: t.sig }); }
    if (r.rawHtmlVisible) agg.rawHtmlVisible++;
  }
}
for (const w of [430, 820, 1280]) await pages[w].close();
await browser.close();

const bad = agg.pageOverflow + agg.elemOverflow + agg.clipped + agg.emptyNode + agg.emptySection
  + agg.audienceVisible + agg.expertMissing + agg.footerMisplaced + agg.functionMismatch + agg.rawHtmlVisible;
const sigCovered = new Set(picked.map((p) => p.sig));
const out = { ranAt: new Date().toISOString(), applied: false, dbWrites: 0,
  coverage: 'SIGNATURE_FULL', perSignatureCap: PER_SIG,
  totalTargets: idx.targetsIndex.length, missingContent,
  signatures: bySig.size, signaturesCovered: [...bySig.keys()].filter((s) => sigCovered.has(s)).length,
  fnDocsRendered: picked.filter((p) => p.ops.includes('FN')).length,
  fnDocsTotal: idx.targetsIndex.filter((t) => t.ops.includes('FN')).length,
  renderedDocs: agg.docs, aggregate: agg, failures,
  verdict: bad === 0 && missingContent === 0 && bySig.size === [...bySig.keys()].filter((s) => sigCovered.has(s)).length
    && picked.filter((p) => p.ops.includes('FN')).length === idx.targetsIndex.filter((t) => t.ops.includes('FN')).length ? 'PASS' : 'FAIL' };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
