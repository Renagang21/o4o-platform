/**
 * Phase D — 제안 canonical 렌더 검증 (실제 storeDescriptionCss + `.store-desc-content` 래퍼 필수).
 * 래퍼 유무 computed style 대조로 CSS 적용을 증명한다.
 */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { D } from './hff-ko-function-review-pilot-47-lib.mjs';

const RB = `${D}/hff-ko-function-review-pilot-47-rollback-manifest-v1.json`;
const OUT = `${D}/hff-ko-function-review-pilot-47-render-audit-v1.json`;
const { targets } = JSON.parse(fs.readFileSync(RB, 'utf8'));

const src = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8');
const css = src.match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
if (!css || !css.includes('.store-desc-content .sd-card')) { console.log(JSON.stringify({ error: 'CSS_EXTRACT_FAIL' })); process.exit(1); }

const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why']);

const browser = await chromium.launch();

// 래퍼 적용 증명
const probe = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const measure = () => probe.evaluate(() => {
  const card = document.querySelector('.sd-card'), hero = document.querySelector('.sd-hero'), badge = document.querySelector('.sd-badge');
  return {
    card_maxWidth: card ? getComputedStyle(card).maxWidth : null,
    card_borderRadius: card ? getComputedStyle(card).borderRadius : null,
    hero_padding: hero ? getComputedStyle(hero).padding : null,
    badge_borderRadius: badge ? getComputedStyle(badge).borderRadius : null,
  };
});
await probe.setContent(`<html><head><style>${css}</style></head><body>${targets[0].newContent}</body></html>`);
const without = await measure();
await probe.setContent(`<html><head><style>${css}</style></head><body><div class="store-desc-content">${targets[0].newContent}</div></body></html>`);
const withW = await measure();
await probe.close();
const wrapperProof = { wrapperApplied: true, withoutWrapper: without, withWrapper: withW,
  cssActuallyApplied: withW.card_maxWidth === '860px' && withW.card_maxWidth !== without.card_maxWidth && withW.hero_padding !== without.hero_padding };

const perTarget = [];
for (const t of targets) {
  const widths = [];
  for (const w of [430, 820, 1280]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="store-desc-content">${t.newContent}</div></body></html>`, { waitUntil: 'load' });
    const res = await page.evaluate((expectClaims) => {
      const de = document.documentElement, vw = de.clientWidth;
      let clipped = 0, elemOverflow = 0, ellipsis = 0;
      for (const el of document.querySelectorAll('.sd-card *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.right > vw + 1 || r.left < -1) elemOverflow++;
        const cs = getComputedStyle(el);
        if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) { if (cs.overflow === 'hidden') clipped++; }
        if (cs.textOverflow === 'ellipsis') ellipsis++;
      }
      const text = document.body.innerText;
      return {
        pageOverflow: de.scrollWidth > de.clientWidth + 1, elemOverflow, clipped, ellipsis,
        rawBracketVisible: /[\[\]]/.test(text),
        emptyHeading: [...document.querySelectorAll('h1,h2')].some((h) => !h.textContent.trim()),
        emptyItem: [...document.querySelectorAll('li,.sd-item')].some((n) => !n.textContent.trim()),
        sdWarn: document.querySelectorAll('.sd-warn').length,
        footerPresent: text.includes('매장 내 약사 등 전문가'),
        sectionsPresent: ['주요 기능성', '섭취량 및 섭취방법', '확인 가능한 기준', '매장 전문가 문의'].every((s) => text.includes(s)),
        insertedClaimsVisible: expectClaims.filter((cl) => text.includes(cl)).length,
        insertedClaimsExpected: expectClaims.length,
      };
    }, t.insertedGroups.flatMap((g) => g.claims));
    widths.push({ width: w, ...res });
    await page.close();
  }
  const undefCls = [...t.newContent.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((x) => x && !DEFINED.has(x));
  const allOk = widths.every((x) => !x.pageOverflow && x.elemOverflow === 0 && x.clipped === 0 && x.ellipsis === 0
    && !x.emptyHeading && !x.emptyItem && x.sdWarn === 0 && x.footerPresent && x.sectionsPresent
    && x.insertedClaimsVisible === x.insertedClaimsExpected);
  perTarget.push({ pilotIndex: t.pilotIndex, productName: t.productName, canonicalId: t.canonicalId,
    undefinedClasses: undefCls, widths, verdict: allOk && undefCls.length === 0 ? 'PASS' : 'FAIL' });
}
await browser.close();

const out = { ranAt: new Date().toISOString(), wrapperProof, total: perTarget.length,
  pass: perTarget.filter((p) => p.verdict === 'PASS').length, targets: perTarget,
  verdict: perTarget.every((p) => p.verdict === 'PASS') && wrapperProof.cssActuallyApplied ? 'PASS' : 'FAIL' };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ out: OUT, wrapperProof, total: out.total, pass: out.pass, verdict: out.verdict,
  perTarget: perTarget.map((p) => ({ i: p.pilotIndex, name: p.productName, verdict: p.verdict,
    claims: p.widths[0].insertedClaimsVisible + '/' + p.widths[0].insertedClaimsExpected,
    rawBracket430: p.widths[0].rawBracketVisible })) }, null, 2));
