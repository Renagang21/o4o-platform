/** SAFE 전량 렌더 검증 (`.store-desc-content` 래퍼 필수 · DB write 0). */
import fs from 'node:fs';
import { chromium } from 'playwright';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-why-family-825-render-audit-v1.json`;
const rb = JSON.parse(fs.readFileSync(`${D}/hff-ko-why-family-825-rollback-manifest-v1.json`, 'utf8'));
const targets = rb.targets;
const css = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8').match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
if (!css || !css.includes('.store-desc-content .sd-card')) { console.log(JSON.stringify({ error: 'CSS_EXTRACT_FAIL' })); process.exit(1); }
const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why','is-solid']);

const browser = await chromium.launch();

// 래퍼 증명
const probe = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const measure = () => probe.evaluate(() => {
  const c = document.querySelector('.sd-card'), h = document.querySelector('.sd-hero');
  return { card_maxWidth: c ? getComputedStyle(c).maxWidth : null, card_borderRadius: c ? getComputedStyle(c).borderRadius : null,
    hero_padding: h ? getComputedStyle(h).padding : null };
});
await probe.setContent(`<html><head><style>${css}</style></head><body>${targets[0].newContent}</body></html>`);
const without = await measure();
await probe.setContent(`<html><head><style>${css}</style></head><body><div class="store-desc-content">${targets[0].newContent}</div></body></html>`);
const withW = await measure();
await probe.close();
const wrapperProof = { withoutWrapper: without, withWrapper: withW,
  cssActuallyApplied: withW.card_maxWidth === '860px' && withW.card_maxWidth !== without.card_maxWidth && withW.hero_padding !== without.hero_padding };

/* rawBracket 은 **회귀 검사**로 판정한다.
   왜-family `표시 기준` 은 공식 표기로 대괄호를 쓴다(예: `표시량[100,000,000(1억) CFU / 2 g] 이상`).
   절대 검사는 이 정상 표기를 결함으로 오판하므로, 삽입으로 **새로 생긴** 대괄호만 센다. */
const agg = { checked: 0, pageOverflow: 0, elemOverflow: 0, clipped: 0, emptyNode: 0,
  rawBracketIntroducedByPatch: 0, rawBracketPreExisting: 0,
  clauseMissing: 0, footerMissing: 0, undefinedClass: 0, headingOrderBad: 0, sectionMissing: 0 };
const failures = [];
const pages = {};
for (const w of [430, 820, 1280]) pages[w] = await browser.newPage({ viewport: { width: w, height: 900 } });

for (const t of targets) {
  const clauses = [...t.insertedBlock.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
  const undef = [...t.newContent.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((x) => x && !DEFINED.has(x));
  if (undef.length) { agg.undefinedClass++; failures.push({ id: t.canonicalId, why: 'UNDEFINED_CLASS', undef: [...new Set(undef)] }); }
  for (const w of [430, 820, 1280]) {
    const page = pages[w];
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="store-desc-content">${t.newContent}</div></body></html>`, { waitUntil: 'domcontentloaded' });
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
      const hs = [...document.querySelectorAll('h2')].map((h) => h.textContent.trim());
      const iw = hs.indexOf('왜 이 제품인가'), ifn = hs.indexOf('공식 인정 기능성'), ii = hs.findIndex((h) => h.startsWith('섭취방법'));
      return { pageOverflow: de.scrollWidth > de.clientWidth + 1, elemOverflow, clipped,
        emptyNode: [...document.querySelectorAll('h2,li,ul')].some((n) => !n.textContent.trim()),
        rawBracket: /[\[\]]/.test(text),
        clausesVisible: cls.filter((x) => text.includes(x)).length, clausesExpected: cls.length,
        footer: !!document.querySelector('.sd-foot')?.textContent.trim(),
        headingOrderOk: iw >= 0 && ifn === iw + 1 && ii === ifn + 1,
        hasIntake: ii >= 0 };
    }, clauses);
    agg.checked++;
    if (r.pageOverflow) agg.pageOverflow++;
    if (r.elemOverflow) agg.elemOverflow++;
    if (r.clipped) agg.clipped++;
    if (r.emptyNode) agg.emptyNode++;
    if (r.rawBracket) {
      // 삽입 블록 자체가 대괄호를 들여왔는지로 회귀 판정
      if (/[\[\]]/.test(t.insertedBlock.replace(/<[^>]+>/g, ' '))) agg.rawBracketIntroducedByPatch++;
      else agg.rawBracketPreExisting++;
    }
    if (r.clausesVisible !== r.clausesExpected) { agg.clauseMissing++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'CLAUSE_MISSING', got: r.clausesVisible, exp: r.clausesExpected }); }
    if (!r.footer) agg.footerMissing++;
    if (!r.headingOrderOk) { agg.headingOrderBad++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'HEADING_ORDER' }); }
    if (!r.hasIntake) agg.sectionMissing++;
  }
}
for (const w of [430, 820, 1280]) await pages[w].close();
await browser.close();

const bad = agg.pageOverflow + agg.elemOverflow + agg.clipped + agg.emptyNode + agg.rawBracketIntroducedByPatch
  + agg.clauseMissing + agg.footerMissing + agg.undefinedClass + agg.headingOrderBad + agg.sectionMissing;
const out = { ranAt: new Date().toISOString(), applied: false, dbWrites: 0,
  targetsRendered: targets.length, widths: [430, 820, 1280], wrapperProof, aggregate: agg,
  failures, verdict: bad === 0 && wrapperProof.cssActuallyApplied ? 'PASS' : 'FAIL' };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ out: OUT, targetsRendered: targets.length, wrapperProof, aggregate: agg, verdict: out.verdict, failures: failures.slice(0, 5) }, null, 2));
