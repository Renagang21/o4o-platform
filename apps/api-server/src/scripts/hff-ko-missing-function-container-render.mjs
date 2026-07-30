/** 제안 canonical 2안 렌더 검증 (`.store-desc-content` 래퍼 필수 · DB write 0). */
import fs from 'node:fs';
import { chromium } from 'playwright';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-missing-function-container-35-render-audit-v1.json`;
const p = JSON.parse(fs.readFileSync(`${D}/hff-ko-missing-function-container-35-proposal-v1.json`, 'utf8'));

const src = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8');
const css = src.match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
if (!css || !css.includes('.store-desc-content .sd-card')) { console.log(JSON.stringify({ error: 'CSS_EXTRACT_FAIL' })); process.exit(1); }

const clauses = p.officialSource.parsedClauses;
const variants = [
  { key: 'CURRENT_LIVE', content: null, note: '현재 LIVE (기능성 섹션 없음)' },
  { key: 'A_FAMILY_NATIVE_HEADING__RECOMMENDED', content: p.proposals.A_FAMILY_NATIVE_HEADING__RECOMMENDED.content },
  { key: 'B_DRIVER_STANDARD_HEADING', content: p.proposals.B_DRIVER_STANDARD_HEADING.content },
];
// 현재 LIVE 는 제안본에서 삽입 블록을 제거해 복원
variants[0].content = p.proposals.B_DRIVER_STANDARD_HEADING.content.replace(p.proposals.B_DRIVER_STANDARD_HEADING.insertedBlock, '').replace(/^\s+/m, (m) => m);

const browser = await chromium.launch();

// 래퍼 증명
const probe = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const measure = () => probe.evaluate(() => {
  const c = document.querySelector('.sd-card'), h = document.querySelector('.sd-hero'), b = document.querySelector('.sd-badge');
  return { card_maxWidth: c ? getComputedStyle(c).maxWidth : null, card_borderRadius: c ? getComputedStyle(c).borderRadius : null,
    hero_padding: h ? getComputedStyle(h).padding : null, badge_borderRadius: b ? getComputedStyle(b).borderRadius : null };
});
await probe.setContent(`<html><head><style>${css}</style></head><body>${variants[1].content}</body></html>`);
const without = await measure();
await probe.setContent(`<html><head><style>${css}</style></head><body><div class="store-desc-content">${variants[1].content}</div></body></html>`);
const withW = await measure();
await probe.close();
const wrapperProof = { withoutWrapper: without, withWrapper: withW,
  cssActuallyApplied: withW.card_maxWidth === '860px' && withW.card_maxWidth !== without.card_maxWidth };

const results = [];
for (const v of variants) {
  const widths = [];
  for (const w of [430, 820, 1280]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="store-desc-content">${v.content}</div></body></html>`, { waitUntil: 'load' });
    widths.push({ width: w, ...(await page.evaluate((cls) => {
      const de = document.documentElement, vw = de.clientWidth;
      let clipped = 0, elemOverflow = 0;
      for (const el of document.querySelectorAll('.sd-card *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.right > vw + 1 || r.left < -1) elemOverflow++;
        const cs = getComputedStyle(el);
        if ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && cs.overflow === 'hidden') clipped++;
      }
      const text = document.body.innerText;
      return { pageOverflow: de.scrollWidth > de.clientWidth + 1, elemOverflow, clipped,
        headings: [...document.querySelectorAll('h2')].map((h) => h.textContent.trim()),
        clausesAsListItems: [...document.querySelectorAll('li')].map((n) => n.textContent.trim()).filter((t) => cls.includes(t)).length,
        clausesExpected: cls.length,
        rawBracketVisible: /[\[\]]/.test(text),
        emptyItem: [...document.querySelectorAll('li')].some((n) => !n.textContent.trim()) };
    }, clauses)) });
    await page.close();
  }
  const ok = widths.every((x) => !x.pageOverflow && x.elemOverflow === 0 && x.clipped === 0 && !x.emptyItem && !x.rawBracketVisible);
  results.push({ variant: v.key, note: v.note ?? null, widths,
    clausesRenderedAsItems: widths[0].clausesAsListItems, clausesExpected: clauses.length,
    layoutOk: ok, verdict: v.key === 'CURRENT_LIVE' ? 'BASELINE' : (ok && widths[0].clausesAsListItems === clauses.length ? 'PASS' : 'FAIL') });
}
await browser.close();

const out = { ranAt: new Date().toISOString(), applied: false, dbWrites: 0, wrapperProof, clauses, results,
  verdict: results.filter((r) => r.verdict !== 'BASELINE').every((r) => r.verdict === 'PASS') && wrapperProof.cssActuallyApplied ? 'PASS' : 'FAIL' };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ out: OUT, wrapperProof, verdict: out.verdict,
  results: results.map((r) => ({ v: r.variant, headings: r.widths[0].headings, clauses: `${r.clausesRenderedAsItems}/${r.clausesExpected}`, layoutOk: r.layoutOk, verdict: r.verdict })) }, null, 2));
