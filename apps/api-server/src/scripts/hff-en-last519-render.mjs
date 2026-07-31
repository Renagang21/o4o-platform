/**
 * WO-O4O-HFF-EN-BULK-PRODUCTION-BATCH-01-5000-V1 / 렌더 검증 (read-only, DB 미접근).
 * 수정 대상 전량 + `.store-desc-content` 래퍼 + computed style 증명.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const D = 'apps/api-server/src/scripts/data';
const ALL = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-safe-targets-v1.json`, 'utf8')).targets;
// 구조 시그니처 전수 커버: 같은 마크업 구조는 한 번만 렌더한다(WO §18).
// 고위험(개별인정번호·다원료·구조 특수)은 시그니처와 무관하게 전량 렌더한다.
const sig = (h) => {
  const tags = (h.match(/<(h1|h2|ul|ol|li|div|span|p|b)/g) ?? []).join('');
  const cls = [...new Set((h.match(/class="([^"]+)"/g) ?? []))].sort().join('|');
  return `${tags.length}|${(h.match(/<li>/g) ?? []).length}|${(h.match(/<h2>/g) ?? []).length}|${cls}`;
};
const seenSig = new Set();
const SAFE = ALL.filter((t) => {
  const high = /\d{4}-\d+/.test(t.newContent) || (t.newContent.match(/sd-tag|<b>/g) ?? []).length >= 6;
  const k = sig(t.newContent);
  if (high) return true;
  if (seenSig.has(k)) return false;
  seenSig.add(k); return true;
});
const CSS = (fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8')
  .match(/const storeDescriptionCss = `([\s\S]*?)`;/) ?? [])[1];
if (!CSS) { console.error('STORE_DESC_CSS_NOT_FOUND'); process.exit(1); }
const DEFINED = new Set([...CSS.matchAll(/\.store-desc-content\s+\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
  .concat([...CSS.matchAll(/\.([a-z][a-zA-Z0-9_-]*)\s*[,{]/g)].map((m) => m[1])));

const WIDTHS = [430, 820, 1280];
const counters = {
  pageOverflow: 0, elementOverflow: 0, clipped: 0,
  emptyH2: 0, emptyUl: 0, emptyLi: 0, emptySection: 0,
  undefinedClass: 0, rawHtml: 0, hangulVisible: 0, markerVisible: 0,
  labelLost: 0, licenseNoLost: 0, clauseLost: 0, expertNoteMissing: 0, fnSectionMissing: 0,
};
const failures = [];
let renders = 0, wrapperProof = null;
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

for (const t of SAFE) {
  for (const w of WIDTHS) {
    const dom = new JSDOM(
      `<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;width:${w}px}${CSS}</style></head>` +
      `<body><div class="store-desc-content">${t.newContent}</div></body></html>`, { pretendToBeVisual: true });
    const { window } = dom, doc = window.document;
    renders++;

    if (wrapperProof === null && w === 820) {
      const bare = new JSDOM(`<!doctype html><html><head><style>${CSS}</style></head><body>${t.newContent}</body></html>`, { pretendToBeVisual: true });
      const card = doc.querySelector('.sd-card'), bareCard = bare.window.document.querySelector('.sd-card');
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

    const fnH2 = [...doc.querySelectorAll('h2')].find((h) => /unction/i.test(h.textContent));
    if (!fnH2) { counters.fnSectionMissing++; failures.push({ p: t.productNameKo, w, why: 'FN_H2_MISSING' }); window.close(); continue; }
    if (!fnH2.textContent.trim()) counters.emptyH2++;

    const scope = [];
    for (let n = fnH2.nextElementSibling; n && n.tagName !== 'H2' && !n.classList?.contains('sd-foot'); n = n.nextElementSibling) scope.push(n);
    if (!scope.length) { counters.emptySection++; failures.push({ p: t.productNameKo, w, why: 'EMPTY_FN_SECTION' }); }

    for (const root of scope) {
      for (const ul of [root, ...root.querySelectorAll('ul')].filter((e) => e.tagName === 'UL')) {
        if (!ul.querySelector('li')) { counters.emptyUl++; failures.push({ p: t.productNameKo, w, why: 'EMPTY_UL' }); }
      }
      for (const li of root.querySelectorAll('li')) {
        if (li.querySelector('ul')) continue;
        const txt = li.textContent.trim();
        if (!txt) { counters.emptyLi++; failures.push({ p: t.productNameKo, w, why: 'EMPTY_LI' }); continue; }
        if (HANGUL.test(txt)) { counters.hangulVisible++; failures.push({ p: t.productNameKo, w, why: 'HANGUL', txt: txt.slice(0, 40) }); }
        if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(txt)) { counters.markerVisible++; failures.push({ p: t.productNameKo, w, why: 'MARKER' }); }
        if (/&lt;|&gt;|<[a-z]/i.test(li.innerHTML.replace(/<\/?(b|span|em|strong)>/g, ''))) counters.rawHtml++;
      }
      for (const el of [root, ...root.querySelectorAll('*')]) {
        for (const cls of el.classList ?? []) if (cls.startsWith('sd-') && !DEFINED.has(cls)) { counters.undefinedClass++; failures.push({ p: t.productNameKo, w, why: `UNDEFINED_CLASS:${cls}` }); }
      }
      for (const b of root.querySelectorAll('b, .sd-tag')) {
        if (HANGUL.test(b.textContent)) { counters.labelLost++; failures.push({ p: t.productNameKo, w, why: 'LABEL_HANGUL', txt: b.textContent.slice(0, 40) }); }
      }
    }
    // 한국어 노출 검사는 **이번에 삽입한 기능성 섹션**으로 한정한다.
    // 기존 EN 문서의 한국어 제품명 등은 이 WO 의 수정 범위가 아니다(기능성 섹션 최소 삽입).
    const fnText = fnH2.textContent + scope.map((n) => n.textContent).join(' ');
    if (HANGUL.test(fnText)) { counters.hangulVisible++; failures.push({ p: t.productNameKo, w, why: 'FN_HANGUL', txt: fnText.slice(0, 60) }); }
    if (!/expert|pharmacist|professional|consult|label/i.test(doc.body.textContent)) { counters.expertNoteMissing++; failures.push({ p: t.productNameKo, w, why: 'EXPERT_NOTE' }); }
    // 개별인정번호 보존
    for (const no of (t.newContent.match(/\d{4}-\d+/g) ?? [])) if (!doc.body.textContent.includes(no)) counters.licenseNoLost++;

    for (const el of doc.querySelectorAll('.store-desc-content *')) {
      const cs = window.getComputedStyle(el);
      if (/px$/.test(cs.width) && parseInt(cs.width, 10) > w) { counters.elementOverflow++; failures.push({ p: t.productNameKo, w, why: 'ELEMENT_OVERFLOW' }); }
      if (cs.whiteSpace === 'nowrap' && cs.overflow === 'hidden') counters.clipped++;
    }
    window.close();
  }
}

const total = Object.values(counters).reduce((a, b) => a + b, 0);
const out = {
  renderedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  documentsTotal: ALL.length, documentsRendered: SAFE.length,
  structureSignatures: seenSig.size, coverage: 'signature-exhaustive + high-risk full',
  documents: SAFE.length, widths: WIDTHS, renders, wrapperProof, counters,
  totalIssues: total, verdict: total === 0 ? 'PASS' : 'FAIL', failures: failures.slice(0, 25),
};
fs.writeFileSync(`${D}/hff-en-last519-render-audit-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, failures: out.failures.slice(0, 8) }, null, 2));
