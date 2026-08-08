/**
 * WO-O4O-HFF-EN-C01-… — 렌더 검증 (read-only, DB 미접근)
 *
 * `.store-desc-content` 래퍼를 씌우고 실제 ContentRenderer CSS 로 렌더한다.
 * 래퍼 없이 재면 무스타일 상태를 통과로 오판하므로 **computed style 로 적용을 증명**한다.
 *
 * 이 WO 는 EN 문서의 **다른 영역에도 한글이 남아 있는 상태**에서 한 섹션만 고친다.
 * 따라서 절대 카운터로는 판정할 수 없다 — **교정 전 원본을 같은 방법으로 렌더해 기준선을
 * 만들고, 교정 후와 대조**한다. 새로 생긴 결함이 0 이어야 통과다.
 * 다만 `Labelled standard` 섹션 안의 한글은 **0 이어야 한다**(이번 WO 의 목표).
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const load = (f) => fs.readFileSync(`${CACHE}/${f}`, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const AFTER = load('hff-en-c01-render-input.jsonl');
const BEFORE = load('hff-en-c01-render-base.jsonl');

const CSS = (fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8')
  .match(/const storeDescriptionCss = `([\s\S]*?)`;/) ?? [])[1];
if (!CSS) { console.error('STORE_DESC_CSS_NOT_FOUND'); process.exit(1); }
const DEFINED = new Set([...CSS.matchAll(/\.store-desc-content\s+\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
  .concat([...CSS.matchAll(/\.([a-z][a-zA-Z0-9_-]*)\s*[,{]/g)].map((m) => m[1])));
const WIDTHS = [430, 820, 1280];
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

function run(docs, label) {
  const counters = { pageOverflow: 0, elementOverflow: 0, clipped: 0, emptySlot: 0, emptySpec: 0,
    undefinedClass: 0, rawHtml: 0, hangulVisibleWholeDoc: 0, sectionHangul: 0, sectionMissing: 0 };
  const failures = [];
  let renders = 0, wrapperProof = null;
  for (const t of docs) {
    for (const w of WIDTHS) {
      const dom = new JSDOM(
        `<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;width:${w}px}${CSS}</style></head>` +
        `<body><div class="store-desc-content">${t.h}</div></body></html>`, { pretendToBeVisual: true });
      const { window } = dom, doc = window.document;
      renders++;
      if (wrapperProof === null && w === 820) {
        const bare = new JSDOM(`<!doctype html><html><head><style>${CSS}</style></head><body>${t.h}</body></html>`, { pretendToBeVisual: true });
        const card = doc.querySelector('.sd-card'), bareCard = bare.window.document.querySelector('.sd-card');
        wrapperProof = {
          withoutWrapper: bareCard ? bare.window.getComputedStyle(bareCard).maxWidth : 'n/a',
          withWrapper: card ? window.getComputedStyle(card).maxWidth : 'n/a',
          specGap: doc.querySelector('.sd-spec') ? window.getComputedStyle(doc.querySelector('.sd-spec')).display : 'n/a',
        };
        wrapperProof.cssActuallyApplied = wrapperProof.withWrapper !== wrapperProof.withoutWrapper;
        bare.window.close();
      }
      /* 대상 섹션 범위 */
      const h2 = [...doc.querySelectorAll('h2')].find((h) => /Labelled standard/i.test(h.textContent));
      if (!h2) { counters.sectionMissing++; window.close(); continue; }
      const scope = [];
      for (let n = h2.nextElementSibling; n && n.tagName !== 'H2'; n = n.nextElementSibling) scope.push(n);
      const secText = scope.map((n) => n.textContent).join(' ');
      if (HANGUL.test(secText)) { counters.sectionHangul++; if (failures.length < 20) failures.push({ m: t.m, w, why: 'SECTION_HANGUL', txt: secText.slice(0, 80) }); }
      for (const root of scope) {
        for (const it of [root, ...root.querySelectorAll('.sd-item')].filter((e) => e.classList?.contains('sd-item'))) {
          if (!it.textContent.trim()) { counters.emptySlot++; if (failures.length < 20) failures.push({ m: t.m, w, why: 'EMPTY_SLOT' }); }
          if (/&lt;|&gt;|<[a-z]/i.test(it.innerHTML.replace(/<\/?(b|span|em|strong)>/g, ''))) counters.rawHtml++;
        }
        if (root.classList?.contains('sd-spec') && !root.querySelector('.sd-item')) counters.emptySpec++;
        for (const el of [root, ...root.querySelectorAll('*')]) {
          for (const cls of el.classList ?? []) if (cls.startsWith('sd-') && !DEFINED.has(cls)) { counters.undefinedClass++; if (failures.length < 20) failures.push({ m: t.m, w, why: `UNDEFINED_CLASS:${cls}` }); }
        }
      }
      if (HANGUL.test(doc.body.textContent)) counters.hangulVisibleWholeDoc++;
      for (const el of doc.querySelectorAll('.store-desc-content *')) {
        const cs = window.getComputedStyle(el);
        if (/px$/.test(cs.width) && parseInt(cs.width, 10) > w) { counters.elementOverflow++; if (failures.length < 20) failures.push({ m: t.m, w, why: 'ELEMENT_OVERFLOW' }); }
        if (cs.whiteSpace === 'nowrap' && cs.overflow === 'hidden') counters.clipped++;
      }
      window.close();
    }
  }
  return { label, documents: docs.length, widths: WIDTHS, renders, wrapperProof, counters,
    total: Object.values(counters).reduce((a, b) => a + b, 0), failures };
}

const base = run(BEFORE, 'BEFORE');
const after = run(AFTER, 'AFTER');
const changed = {}, newDefects = {};
for (const k of Object.keys(after.counters)) {
  if (after.counters[k] !== base.counters[k]) changed[k] = { before: base.counters[k], after: after.counters[k] };
  if (after.counters[k] > base.counters[k]) newDefects[k] = after.counters[k] - base.counters[k];
}
const out = {
  wo: 'WO-O4O-HFF-EN-C01-LABELLED-STANDARD-40896-FULL-TRANSLATION-REPAIR-V1',
  renderedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  baselineTotal: base.total, afterTotal: after.total, changed,
  newDefects: Object.keys(newDefects).length ? newDefects : 'NONE',
  /* 이번 WO 의 목표 지표 — 대상 섹션 안의 한글 */
  sectionHangulBefore: base.counters.sectionHangul, sectionHangulAfter: after.counters.sectionHangul,
  wrapperProof: after.wrapperProof,
  verdict: (!Object.keys(newDefects).length && after.counters.sectionHangul === 0) ? 'PASS' : 'FAIL',
  base, after: { ...after, failures: after.failures.slice(0, 10) },
};
fs.writeFileSync(`${D}/hff-en-c01-render-audit-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, base: undefined, after: { counters: after.counters, failures: after.failures.slice(0, 6) } }, null, 1));
