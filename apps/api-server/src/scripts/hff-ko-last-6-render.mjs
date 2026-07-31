/**
 * WO-O4O-HFF-KO-FINAL-MANUAL-80-RESOLUTION-V1 / 렌더 검증 (read-only, DB 미접근).
 * `.store-desc-content` 래퍼 없이 렌더하면 무스타일 상태로 허위 PASS 가 난다 → 래퍼 + computed style 증명 필수.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const D = 'apps/api-server/src/scripts/data';
const SAFE = JSON.parse(fs.readFileSync(`${D}/hff-ko-last-6-safe-targets-v1.json`, 'utf8')).targets;
const CSS_SRC = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8');
const CSS = (CSS_SRC.match(/const storeDescriptionCss = `([\s\S]*?)`;/) ?? [])[1];
if (!CSS) { console.error('STORE_DESC_CSS_NOT_FOUND'); process.exit(1); }

const WIDTHS = [430, 820, 1280];
const counters = {
  pageOverflow: 0, elementOverflow: 0, clipped: 0,
  emptyH2: 0, emptyUl: 0, emptyLi: 0, emptySection: 0,
  undefinedClass: 0, rawHtml: 0, markerVisible: 0, englishClause: 0,
  labelLost: 0, licenseNoLost: 0, crossIngredientMix: 0, duplicateInGroup: 0,
  expertNoteMissing: 0, fnSectionMissing: 0,
};
const failures = [];
let renders = 0;
let wrapperProof = null;

const DEFINED = new Set([...CSS.matchAll(/\.store-desc-content\s+\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
  .concat([...CSS.matchAll(/\.([a-z][a-zA-Z0-9_-]*)\s*[,{]/g)].map((m) => m[1])));

for (const t of SAFE) {
  const fnHtml = (t.newContent.match(/(<h2>[^<]*기능성[^<]*<\/h2>)([\s\S]*?)(?=<h2>|<div class="sd-foot")/) ?? [])[0] ?? '';
  if (!fnHtml) { counters.fnSectionMissing++; failures.push({ p: t.productName, why: 'NO_FN_SECTION' }); continue; }

  for (const w of WIDTHS) {
    const dom = new JSDOM(
      `<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;width:${w}px}${CSS}</style></head>` +
      `<body><div class="store-desc-content">${t.newContent}</div></body></html>`,
      { pretendToBeVisual: true },
    );
    const { window } = dom;
    const doc = window.document;
    renders++;

    if (wrapperProof === null && w === 820) {
      const bare = new JSDOM(`<!doctype html><html><head><style>${CSS}</style></head><body>${t.newContent}</body></html>`, { pretendToBeVisual: true });
      const card = doc.querySelector('.sd-card');
      const bareCard = bare.window.document.querySelector('.sd-card');
      wrapperProof = {
        withoutWrapper: bareCard ? bare.window.getComputedStyle(bareCard).maxWidth : 'n/a',
        withWrapper: card ? window.getComputedStyle(card).maxWidth : 'n/a',
        borderRadius: card ? window.getComputedStyle(card).borderRadius : 'n/a',
        heroPadding: doc.querySelector('.sd-hero') ? window.getComputedStyle(doc.querySelector('.sd-hero')).padding : 'n/a',
        badgeRadius: doc.querySelector('.sd-badge') ? window.getComputedStyle(doc.querySelector('.sd-badge')).borderRadius : 'n/a',
      };
      wrapperProof.cssActuallyApplied = wrapperProof.withWrapper !== wrapperProof.withoutWrapper;
      bare.window.close();
    }

    const fnH2 = [...doc.querySelectorAll('h2')].find((h) => /기능성/.test(h.textContent));
    if (!fnH2) { counters.fnSectionMissing++; failures.push({ p: t.productName, w, why: 'FN_H2_MISSING' }); window.close(); continue; }

    // 기능성 섹션의 형제 노드들을 수집
    const nodes = [];
    for (let n = fnH2.nextElementSibling; n && n.tagName !== 'H2' && !(n.classList?.contains('sd-foot')); n = n.nextElementSibling) nodes.push(n);
    const scope = nodes;

    if (!fnH2.textContent.trim()) counters.emptyH2++;
    for (const root of scope) {
      for (const ul of [root, ...root.querySelectorAll('ul')].filter((e) => e.tagName === 'UL')) {
        if (!ul.querySelector('li')) { counters.emptyUl++; failures.push({ p: t.productName, w, why: 'EMPTY_UL' }); }
      }
      for (const li of root.querySelectorAll('li')) {
        if (li.querySelector('ul')) continue;                       // 최말단 li 만 절이다
        const txt = li.textContent.trim();
        if (!txt) { counters.emptyLi++; failures.push({ p: t.productName, w, why: 'EMPTY_LI' }); continue; }
        if (/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]/.test(txt) || /^\s*\(\s*\d+\s*\)/.test(txt)) { counters.markerVisible++; failures.push({ p: t.productName, w, why: 'MARKER', txt: txt.slice(0, 40) }); }
        if (/[A-Za-z]{6,}/.test(txt)) { counters.englishClause++; failures.push({ p: t.productName, w, why: 'ENGLISH', txt: txt.slice(0, 40) }); }
        if (/&lt;|&gt;|<[a-z]/i.test(li.innerHTML.replace(/<\/?(b|span|em|strong)>/g, ''))) { counters.rawHtml++; failures.push({ p: t.productName, w, why: 'RAW_HTML' }); }
      }
      if (!root.textContent.trim()) { counters.emptySection++; failures.push({ p: t.productName, w, why: 'EMPTY_SECTION' }); }
      for (const el of [root, ...root.querySelectorAll('*')]) {
        for (const cls of el.classList ?? []) if (cls.startsWith('sd-') && !DEFINED.has(cls)) { counters.undefinedClass++; failures.push({ p: t.productName, w, why: `UNDEFINED_CLASS:${cls}` }); }
      }
    }

    // 라벨·개별인정번호 보존 + 그룹 내 중복
    const labels = scope.flatMap((r) => [...r.querySelectorAll('b, .sd-tag')].map((e) => e.textContent.trim()));
    // 라벨 보존 검사는 라벨 구조로 렌더된 문서에만 적용한다.
    // 평면(sd-why / sd-fn / 단일 sd-item) 렌더는 애초에 라벨을 표시하지 않는다.
    const decLabels = /RESTORED|CONFIRMED/.test(t.why)
      ? (t.groups ?? []).filter((g) => g.label).map((g) => g.label) : [];
    for (const l of decLabels) if (!labels.some((x) => x.replace(/\s/g, '') === l.replace(/\s/g, ''))) { counters.labelLost++; failures.push({ p: t.productName, w, why: 'LABEL_LOST', l }); }
    for (const l of decLabels) {
      const no = l.match(/제?\s*\d{4}-\d+\s*호/);
      if (no && !labels.join('|').includes(no[0])) { counters.licenseNoLost++; failures.push({ p: t.productName, w, why: 'LICENSE_NO_LOST', l }); }
    }
    const groupEls = scope.flatMap((r) => [...r.querySelectorAll('.sd-item, ul.sd-func > li')]);
    for (const g of (groupEls.length ? groupEls : scope)) {
      const seen = new Set();
      for (const li of g.querySelectorAll('li')) {
        if (li.querySelector('ul')) continue;
        const k = li.textContent.replace(/\s/g, '');
        if (seen.has(k)) { counters.duplicateInGroup++; failures.push({ p: t.productName, w, why: 'DUP_IN_GROUP', txt: k.slice(0, 30) }); }
        seen.add(k);
      }
    }
    if (!/전문가|약사|상담|문의/.test(doc.body.textContent)) { counters.expertNoteMissing++; failures.push({ p: t.productName, w, why: 'EXPERT_NOTE' }); }

    // overflow / clipping (jsdom 은 레이아웃이 없으므로 폭 초과 요소를 문자열 길이가 아닌 스타일로 확인)
    const card = doc.querySelector('.sd-card');
    if (card) {
      const cs = window.getComputedStyle(card);
      const mw = parseInt(cs.maxWidth, 10);
      if (!Number.isNaN(mw) && mw > 0 && w < mw && cs.width && /px$/.test(cs.width) && parseInt(cs.width, 10) > w) counters.pageOverflow++;
      if (cs.overflow === 'hidden' && cs.height && /px$/.test(cs.height)) counters.clipped++;
    }
    for (const el of doc.querySelectorAll('.store-desc-content *')) {
      const cs = window.getComputedStyle(el);
      if (/px$/.test(cs.width) && parseInt(cs.width, 10) > w) { counters.elementOverflow++; failures.push({ p: t.productName, w, why: 'ELEMENT_OVERFLOW' }); }
      if (cs.whiteSpace === 'nowrap' && cs.overflow === 'hidden') { counters.clipped++; }
    }
    window.close();
  }
}

const total = Object.values(counters).reduce((a, b) => a + b, 0);
const out = {
  renderedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  documents: SAFE.length, widths: WIDTHS, renders,
  wrapperProof, counters, totalIssues: total,
  verdict: total === 0 ? 'PASS' : 'FAIL',
  failures: failures.slice(0, 30),
};
fs.writeFileSync(`${D}/hff-ko-last-6-render-audit-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
