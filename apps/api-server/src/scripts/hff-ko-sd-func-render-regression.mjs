/**
 * sd-func 스타일 회귀 검증.
 *  A) sd-func 사용 문서 — 변경 전/후 실측 대조 (불릿·padding 제거, overflow·클리핑 0)
 *  B) sd-func **비사용** 문서 — 변경 전/후 byte-동일 렌더 지표(회귀 0)
 * DB write 0.
 */
import fs from 'node:fs';
import pg from 'pg';
import { chromium } from 'playwright';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-sd-func-render-regression-v1.json`;
const RENDERER = 'packages/content-editor/src/components/ContentRenderer.tsx';

// 현재(변경 후) CSS
const cssNew = fs.readFileSync(RENDERER, 'utf8').match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
// 변경 전 CSS = 추가한 sd-func 블록만 제거
const ADDED_START = '/* sd-func — 원료별 공식 인정 기능성 목록의 **상위 컨테이너**';
const ADDED_END = '.store-desc-content .sd-func .sd-why li:last-child{border-bottom:0}';
const s = cssNew.indexOf(ADDED_START), e = cssNew.indexOf(ADDED_END);
if (s < 0 || e < 0) { console.log(JSON.stringify({ error: 'ADDED_BLOCK_NOT_FOUND' })); process.exit(1); }
const cssOld = (cssNew.slice(0, s) + cssNew.slice(e + ADDED_END.length)).replace(/\n{3,}/g, '\n\n');
if (cssOld.includes('.sd-func')) { console.log(JSON.stringify({ error: 'OLD_CSS_STILL_HAS_SDFUNC' })); process.exit(1); }

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5495', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
// sd-func 사용 문서: ko 대표 + 최장 + 다원료 최다
const withFunc = (await c.query(`
  SELECT id, content FROM shared_product_descriptions
  WHERE deleted_at IS NULL AND content LIKE '%sd-func%' AND coalesce(language,'ko')='ko'
  ORDER BY length(content) DESC LIMIT 8`)).rows;
const withFuncEn = (await c.query(`
  SELECT id, content FROM shared_product_descriptions
  WHERE deleted_at IS NULL AND content LIKE '%sd-func%' AND coalesce(language,'ko')<>'ko'
  ORDER BY length(content) DESC LIMIT 4`)).rows;
// sd-func 비사용 문서(회귀 대조): 왜-family + driver-family 각각
const noFunc = (await c.query(`
  SELECT id, content FROM shared_product_descriptions
  WHERE deleted_at IS NULL AND content NOT LIKE '%sd-func%'
    AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko'
    AND (content LIKE '%왜 이 제품인가%' OR content LIKE '%<h2>주요 기능성</h2>%')
  ORDER BY length(content) DESC LIMIT 12`)).rows;
await c.end();

const browser = await chromium.launch();
const probe = async (css, content, w) => {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="store-desc-content">${content}</div></body></html>`, { waitUntil: 'domcontentloaded' });
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
    const f = document.querySelector('.sd-func');
    const fs_ = f ? getComputedStyle(f) : null;
    const nested = document.querySelector('.sd-func .sd-why');
    const emptyLi = [...document.querySelectorAll('li')].some((n) => !n.textContent.trim());
    return {
      pageOverflow: de.scrollWidth > de.clientWidth + 1, elemOverflow, clipped, emptyLi,
      textLen: document.body.innerText.replace(/\s+/g, ' ').trim().length,
      liCount: document.querySelectorAll('li').length,
      sdFunc: fs_ ? { listStyleType: fs_.listStyleType, paddingLeft: fs_.paddingLeft, display: fs_.display, rowGap: fs_.rowGap } : null,
      nestedDisplay: nested ? getComputedStyle(nested).display : null,
      cardWidth: document.querySelector('.sd-card')?.getBoundingClientRect().width ?? null,
    };
  });
  await page.close();
  return r;
};

const widths = [430, 820, 1280];
const funcDocs = [];
for (const d of [...withFunc, ...withFuncEn]) {
  const per = [];
  for (const w of widths) {
    const before = await probe(cssOld, d.content, w);
    const after = await probe(cssNew, d.content, w);
    per.push({ width: w, before, after,
      textPreserved: before.textLen === after.textLen,
      liPreserved: before.liCount === after.liCount,
      bulletRemoved: before.sdFunc?.listStyleType !== 'none' && after.sdFunc?.listStyleType === 'none',
      paddingNormalized: before.sdFunc?.paddingLeft !== '0px' && after.sdFunc?.paddingLeft === '0px',
      nestedSingleColumn: after.nestedDisplay === 'block',
      afterClean: !after.pageOverflow && after.elemOverflow === 0 && after.clipped === 0 && !after.emptyLi });
  }
  funcDocs.push({ canonicalId: d.id, widths: per,
    ok: per.every((x) => x.textPreserved && x.liPreserved && x.bulletRemoved && x.paddingNormalized && x.nestedSingleColumn && x.afterClean) });
}

const regressionDocs = [];
for (const d of noFunc) {
  const per = [];
  for (const w of widths) {
    const before = await probe(cssOld, d.content, w);
    const after = await probe(cssNew, d.content, w);
    per.push({ width: w,
      identical: before.textLen === after.textLen && before.liCount === after.liCount
        && before.pageOverflow === after.pageOverflow && before.elemOverflow === after.elemOverflow
        && before.clipped === after.clipped && before.cardWidth === after.cardWidth,
      after });
  }
  regressionDocs.push({ canonicalId: d.id, widths: per, ok: per.every((x) => x.identical) });
}
await browser.close();

const out = {
  ranAt: new Date().toISOString(), dbWrites: 0,
  cssChange: { addedBytes: cssNew.length - cssOld.length, addedSelectors: 5, scope: '.store-desc-content .sd-func 하위 전용' },
  sdFuncDocs: { count: funcDocs.length, allOk: funcDocs.every((x) => x.ok), docs: funcDocs },
  nonSdFuncRegression: { count: regressionDocs.length, allIdentical: regressionDocs.every((x) => x.ok), docs: regressionDocs.map((x) => ({ canonicalId: x.canonicalId, ok: x.ok })) },
  verdict: funcDocs.every((x) => x.ok) && regressionDocs.every((x) => x.ok) ? 'PASS' : 'FAIL',
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ out: OUT, cssChange: out.cssChange,
  sdFuncDocs: { count: funcDocs.length, allOk: out.sdFuncDocs.allOk },
  sample: funcDocs[0]?.widths?.map((w) => ({ w: w.width, bulletRemoved: w.bulletRemoved, paddingNormalized: w.paddingNormalized, nestedSingleColumn: w.nestedSingleColumn, textPreserved: w.textPreserved, afterClean: w.afterClean, beforeSdFunc: w.before.sdFunc, afterSdFunc: w.after.sdFunc })),
  nonSdFuncRegression: { count: regressionDocs.length, allIdentical: out.nonSdFuncRegression.allIdentical },
  verdict: out.verdict }, null, 2));
