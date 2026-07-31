/** Phase 2-B — 기능성 복구 대상 11건 전량 렌더 검증 (3 viewport, DB write 0). */
import fs from 'node:fs';
import { chromium } from 'playwright';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-residual-13-render-audit-v1.json`;
const idx = JSON.parse(fs.readFileSync(`${D}/hff-ko-residual-13-targets-v1.json`, 'utf8'));
const contents = new Map(JSON.parse(fs.readFileSync(`${D}/tmp-hff-residual13-newcontent.json`, 'utf8')).map((x) => [x.canonicalId, x.newContent]));
const css = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8').match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
if (!css.includes('.store-desc-content .sd-func')) { console.log(JSON.stringify({ error: 'CSS_MISSING_SDFUNC' })); process.exit(1); }

const browser = await chromium.launch();
const pages = {};
for (const w of [430, 820, 1280]) pages[w] = await browser.newPage({ viewport: { width: w, height: 900 } });

const agg = { checked: 0, docs: 0, pageOverflow: 0, elemOverflow: 0, clipped: 0, emptyNode: 0, emptySection: 0,
  functionMissing: 0, clauseMissing: 0, labelMissing: 0, englishLeaked: 0, footerMisplaced: 0, rawHtmlVisible: 0 };
const failures = [];
for (const t of idx.targetsIndex) {
  const content = contents.get(t.canonicalId);
  if (!content) { failures.push({ id: t.canonicalId, why: 'CONTENT_MISSING' }); continue; }
  agg.docs++;
  const clauses = t.fnGroups.flatMap((g) => g.clauses);
  const labels = t.fnGroups.map((g) => g.label);
  for (const w of [430, 820, 1280]) {
    const page = pages[w];
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="store-desc-content">${content}</div></body></html>`, { waitUntil: 'domcontentloaded' });
    const r = await page.evaluate(([cls, lbl]) => {
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
      // 기능성 섹션 안에 영문 문장이 섞였는지 (라벨의 학명·원료명은 제외 대상이 아니라 li 본문만 본다)
      const fnHead = [...document.querySelectorAll('h2')].find((h) => /기능성/.test(h.textContent));
      let englishLeaked = false;
      if (fnHead) {
        let n = fnHead.nextElementSibling;
        if (n) for (const li of n.querySelectorAll('li')) {
          if (li.querySelector('ul')) continue;
          const own = li.textContent.replace(/^[\s\S]*?(?=[가-힣])/, '');
          if (/(May help|help to|Lactobacillus\s|beneficial)/i.test(own)) englishLeaked = true;
        }
      }
      return { pageOverflow: de.scrollWidth > de.clientWidth + 1, elemOverflow, clipped,
        emptyNode: [...document.querySelectorAll('h2,li,ul')].some((n) => !n.textContent.trim()),
        emptySection: [...document.querySelectorAll('.sd-body > *')].some((n) => n.tagName !== 'H2' && !n.textContent.trim()),
        functionPresent: !!fnHead,
        clausesVisible: cls.filter((x) => text.includes(x)).length, clausesExpected: cls.length,
        labelsVisible: lbl.filter((x) => text.includes(x)).length, labelsExpected: lbl.length,
        englishLeaked,
        footerIsLastChild: !!foot && !!card && card.lastElementChild === foot,
        rawHtmlVisible: /<\/?(div|ul|li|h2|p|b)\b/i.test(text) };
    }, [clauses, labels]);
    agg.checked++;
    if (r.pageOverflow) agg.pageOverflow++;
    if (r.elemOverflow) agg.elemOverflow++;
    if (r.clipped) agg.clipped++;
    if (r.emptyNode) agg.emptyNode++;
    if (r.emptySection) agg.emptySection++;
    if (!r.functionPresent) { agg.functionMissing++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'FUNCTION_MISSING' }); }
    if (r.clausesVisible !== r.clausesExpected) { agg.clauseMissing++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: `CLAUSE_MISSING ${r.clausesVisible}/${r.clausesExpected}` }); }
    if (r.labelsVisible !== r.labelsExpected) { agg.labelMissing++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: `LABEL_MISSING ${r.labelsVisible}/${r.labelsExpected}` }); }
    if (r.englishLeaked) { agg.englishLeaked++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'ENGLISH_LEAKED' }); }
    if (!r.footerIsLastChild) { agg.footerMisplaced++; if (failures.length < 20) failures.push({ id: t.canonicalId, w, why: 'FOOTER_MISPLACED' }); }
    if (r.rawHtmlVisible) agg.rawHtmlVisible++;
  }
}
for (const w of [430, 820, 1280]) await pages[w].close();
await browser.close();

const bad = Object.entries(agg).filter(([k]) => k !== 'checked' && k !== 'docs').reduce((a, [, v]) => a + v, 0);
const out = { ranAt: new Date().toISOString(), applied: false, dbWrites: 0, coverage: 'FULL',
  totalTargets: idx.targetsIndex.length, renderedDocs: agg.docs, aggregate: agg, failures,
  verdict: bad === 0 && agg.docs === idx.targetsIndex.length ? 'PASS' : 'FAIL' };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
