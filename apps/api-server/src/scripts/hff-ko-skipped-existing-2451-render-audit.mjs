/**
 * WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1  §20
 *
 * patch 적용 결과(after) 를 실브라우저에서 430 / 820 / 1280 으로 렌더 검증한다.
 *   - CSS 는 `packages/content-editor/src/components/ContentRenderer.tsx` 의
 *     `storeDescriptionCss` 를 **원문 그대로 추출**해 사용한다(공용 CSS 수정 0).
 *   - before/after 를 같은 폭에서 함께 재고, 레이아웃 지표가 기능성 목록 증가분
 *     외에는 달라지지 않는지(가로 오버플로 0 · 카드 폭 동일) 확인한다.
 * DB 접근 0 — 입력은 quality-samples 산출물.
 *
 * 산출물: data/hff-ko-skipped-existing-2451-render-audit-v1.json
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const DATA = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1';
const CSS_SRC = 'packages/content-editor/src/components/ContentRenderer.tsx';
const WIDTHS = [430, 820, 1280];

/* storeDescriptionCss 원문 추출 (수정 없음) */
const tsx = fs.readFileSync(CSS_SRC, 'utf8');
const start = tsx.indexOf('const storeDescriptionCss = `');
const from = tsx.indexOf('`', start) + 1;
const to = tsx.indexOf('`;', from);
if (start < 0 || to < 0) { console.error('CSS_EXTRACTION_FAILED'); process.exit(2); }
const CSS = tsx.slice(from, to);

const samples = JSON.parse(fs.readFileSync(`${DATA}/hff-ko-skipped-existing-2451-quality-samples-v1.json`, 'utf8'))
  .samples.filter((s) => s.kind === 'SAFE_APPLY');

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));

const violations = [];
const perWidth = [];
for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 900 });
  const rows = [];
  for (const s of samples) {
    const measure = async (html, side) => {
      await page.setContent(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}${CSS}</style></head><body><div class="store-desc-content">${html}</div></body></html>`, { waitUntil: 'load' });
      return page.evaluate(() => {
        const w = document.querySelector('.store-desc-content');
        const card = document.querySelector('.sd-card');
        const funcH2 = [...document.querySelectorAll('h2')].filter((h) => /기능성|영양기능/.test(h.textContent || ''));
        const emptyLi = [...document.querySelectorAll('li')].filter((li) => !(li.textContent || '').trim()).length;
        const rawTagLeak = /&lt;(ul|li|div|h2)\b/i.test(document.body.innerHTML) ? 1 : 0;
        const cs = card ? getComputedStyle(card) : null;
        return {
          wrapperPresent: !!w,
          cardPresent: !!card,
          docScrollWidth: document.documentElement.scrollWidth,
          docClientWidth: document.documentElement.clientWidth,
          bodyOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          wrapperScrollWidth: w?.scrollWidth ?? 0,
          wrapperClientWidth: w?.clientWidth ?? 0,
          cardWidth: card ? Math.round(card.getBoundingClientRect().width) : 0,
          cardMaxWidth: cs?.maxWidth ?? null,
          cardBorderRadius: cs?.borderTopLeftRadius ?? null,
          contentHeight: w?.scrollHeight ?? 0,
          funcSectionCount: funcH2.length,
          liCount: document.querySelectorAll('li').length,
          emptyLi, rawTagLeak,
        };
      }).then((m) => ({ side, ...m }));
    };
    const before = await measure(s.beforeContent, 'before');
    const after = await measure(s.afterContent, 'after');

    const fails = [];
    if (!after.wrapperPresent) fails.push('WRAPPER_MISSING');
    if (!after.cardPresent) fails.push('SD_CARD_MISSING');
    if (after.bodyOverflowX) fails.push('HORIZONTAL_OVERFLOW');
    if (after.wrapperScrollWidth > after.wrapperClientWidth) fails.push('WRAPPER_HORIZONTAL_OVERFLOW');
    if (after.emptyLi > before.emptyLi) fails.push('EMPTY_LIST_ITEM');
    if (after.rawTagLeak) fails.push('RAW_TAG_LEAK');
    if (after.funcSectionCount !== before.funcSectionCount) fails.push('FUNC_SECTION_COUNT_CHANGED');
    if (after.funcSectionCount < 1) fails.push('FUNC_SECTION_MISSING');
    if (after.cardWidth !== before.cardWidth) fails.push('CARD_WIDTH_CHANGED');
    if (after.cardMaxWidth !== before.cardMaxWidth || after.cardBorderRadius !== before.cardBorderRadius) fails.push('COMPUTED_STYLE_MISMATCH');
    if (after.liCount - before.liCount !== s.inserts.length) fails.push('LI_DELTA_MISMATCH');
    if (after.contentHeight < before.contentHeight) fails.push('CONTENT_HEIGHT_SHRANK');
    if (fails.length) violations.push({ width, candidateId: s.candidateId, productName: s.productName, fails });

    rows.push({
      candidateId: s.candidateId, productName: s.productName, family: s.family, mode: s.mode,
      insertCount: s.inserts.length, before, after,
      liDelta: after.liCount - before.liCount,
      heightDelta: after.contentHeight - before.contentHeight,
      fails,
    });
  }
  perWidth.push({ width, sampleCount: rows.length, samples: rows });
}
await browser.close();

const zeroChecks = ['WRAPPER_MISSING', 'SD_CARD_MISSING', 'HORIZONTAL_OVERFLOW', 'WRAPPER_HORIZONTAL_OVERFLOW', 'EMPTY_LIST_ITEM', 'RAW_TAG_LEAK', 'FUNC_SECTION_COUNT_CHANGED', 'FUNC_SECTION_MISSING', 'CARD_WIDTH_CHANGED', 'COMPUTED_STYLE_MISMATCH', 'LI_DELTA_MISMATCH', 'CONTENT_HEIGHT_SHRANK']
  .reduce((a, k) => ({ ...a, [k]: violations.filter((v) => v.fails.includes(k)).length }), {});
const verdict = violations.length === 0 && consoleErrors.length === 0 ? 'PASS' : 'STOP';

fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-render-audit-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§20 — SAFE 대상 before/after × 430·820·1280 실브라우저 렌더 검증. 공용 CSS 수정 0 · DB 접근 0.',
  generatedAt: new Date().toISOString(),
  cssSource: `${CSS_SRC} :: storeDescriptionCss (원문 추출, 수정 없음)`,
  cssBytes: CSS.length,
  wrapper: '<div class="store-desc-content">',
  widths: WIDTHS, sampleCount: samples.length,
  consoleErrors, zeroChecks, violations, verdict, perWidth,
}, null, 1));

console.log(JSON.stringify({
  samples: samples.length, widths: WIDTHS, consoleErrors: consoleErrors.length,
  violations: violations.length, zeroChecks, verdict,
}, null, 1));
if (verdict !== 'PASS') process.exit(2);
