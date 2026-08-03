/**
 * WO-O4O-HFF-ZH-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §7 렌더 검증 워커
 *
 * JSDOM 인스턴스는 close() 후에도 heap 을 완전히 돌려주지 않아, 3만 회 렌더를 한 프로세스에서
 * 돌리면 12GB heap 도 소진된다. 그래서 렌더 구간을 청크로 나눠 **별도 프로세스**에서 처리하고
 * 프로세스 종료로 메모리를 회수한다. 검사 항목은 단일 프로세스판과 동일하다.
 *
 * 사용: node hff-zh-b01-render-worker.mjs <tasks.jsonl> <start> <end> <out.json>
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { HANGUL, stripKeep } from './hff-zh-b01-build.mjs';

const [tasksFile, startS, endS, outFile] = process.argv.slice(2);
const start = parseInt(startS, 10), end = parseInt(endS, 10);

const CSS = (fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8')
  .match(/const storeDescriptionCss = `([\s\S]*?)`;/) ?? [])[1];
if (!CSS) { console.error('STORE_DESC_CSS_NOT_FOUND'); process.exit(1); }
const DEFINED = new Set([...CSS.matchAll(/\.store-desc-content\s+\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
  .concat([...CSS.matchAll(/\.([a-z][a-zA-Z0-9_-]*)\s*[,{]/g)].map((m) => m[1])));

const tasks = fs.readFileSync(tasksFile, 'utf8').split('\n').filter(Boolean).slice(start, end).map((l) => JSON.parse(l));

const WIDTHS = [430, 820, 1280];
const counters = {
  structureParity: 0, pageOverflow: 0, elementOverflow: 0, clipped: 0,
  emptyH2: 0, emptyUl: 0, emptyLi: 0,
  undefinedClass: 0, rawHtml: 0, hangulVisible: 0, markerVisible: 0,
  labelLost: 0, licenseNoLost: 0,
};
const failures = [];
let renders = 0;
for (const t of tasks) {
  for (const w of WIDTHS) {
    const dom = new JSDOM(
      `<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;width:${w}px}${CSS}</style></head>`
      + `<body><div class="store-desc-content">${t.h}</div></body></html>`, { pretendToBeVisual: true });
    const { window } = dom, doc = window.document;
    renders++;
    for (const h2 of doc.querySelectorAll('h2')) if (!h2.textContent.trim()) counters.emptyH2++;
    for (const ul of doc.querySelectorAll('ul')) if (!ul.querySelector('li')) counters.emptyUl++;
    for (const li of doc.querySelectorAll('li')) {
      if (li.querySelector('ul')) continue;
      const txt = li.textContent.trim();
      if (!txt) { counters.emptyLi++; failures.push({ p: t.p, w, why: 'EMPTY_LI' }); continue; }
      if (HANGUL.test(stripKeep(txt))) { counters.hangulVisible++; failures.push({ p: t.p, w, why: 'HANGUL', txt: txt.slice(0, 40) }); }
      if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(txt)) { counters.markerVisible++; failures.push({ p: t.p, w, why: 'MARKER' }); }
      if (/&lt;|&gt;|<[a-z]/i.test(li.innerHTML.replace(/<\/?(b|span|em|strong)>/g, ''))) counters.rawHtml++;
    }
    for (const el of doc.querySelectorAll('.store-desc-content *')) {
      for (const cls of el.classList ?? []) if (cls.startsWith('sd-') && !DEFINED.has(cls)) { counters.undefinedClass++; failures.push({ p: t.p, w, why: `UNDEFINED_CLASS:${cls}` }); }
      const cs = window.getComputedStyle(el);
      if (/px$/.test(cs.width) && parseInt(cs.width, 10) > w) { counters.elementOverflow++; failures.push({ p: t.p, w, why: 'ELEMENT_OVERFLOW' }); }
      if (cs.whiteSpace === 'nowrap' && cs.overflow === 'hidden') counters.clipped++;
    }
    /* 슬롯 밖에 남은 한글까지 잡는다 — `<h1>` 제품명과 제조사 법인명만 원문 표기로 유지한다(EN 트랙과 동일 계약). */
    {
      const body = doc.querySelector('.store-desc-content').cloneNode(true);
      /* 제품명만 지운다 — 제목 안 `<small>` 부제(원료 열거)는 번역 대상이므로 남겨서 검사한다. */
      for (const h1 of body.querySelectorAll('h1')) {
        const sub = h1.querySelector('small');
        if (sub) h1.replaceWith(sub); else h1.remove();
      }
      const rest = stripKeep(body.textContent);
      if (HANGUL.test(rest)) {
        counters.hangulVisible++;
        failures.push({ p: t.p, w, why: 'HANGUL_DOC', txt: (rest.match(/[^\s]*[가-힣][^\s]*/) ?? [''])[0].slice(0, 40) });
      }
    }
    for (const b of doc.querySelectorAll('b, .sd-tag')) {
      if (HANGUL.test(stripKeep(b.textContent))) { counters.labelLost++; failures.push({ p: t.p, w, why: 'LABEL_HANGUL', txt: b.textContent.slice(0, 40) }); }
    }
    for (const no of t.lic ?? []) {
      if (no && !doc.body.textContent.includes(no)) { counters.licenseNoLost++; failures.push({ p: t.p, m: t.m, w, why: 'LICENSE_NO_LOST', no }); }
    }
    window.close();
  }
}
fs.writeFileSync(outFile, JSON.stringify({ start, end, docs: tasks.length, renders, counters, failures: failures.slice(0, 25) }));
