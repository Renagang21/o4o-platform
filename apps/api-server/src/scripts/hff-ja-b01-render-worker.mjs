/**
 * WO-O4O-HFF-JA-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §8 렌더 검증 워커
 *
 * JSDOM 은 close() 후에도 heap 을 온전히 돌려주지 않아 수만 회 렌더를 한 프로세스에서 돌리면
 * heap 이 소진된다. 렌더 구간을 청크로 나눠 **별도 프로세스**에서 처리하고 프로세스 종료로 회수한다.
 * 검사 항목은 ZH 트랙과 동일하다 — 잔존 한글은 언어와 무관하게 실패다.
 *
 * 사용: node hff-ja-b01-render-worker.mjs <tasks.jsonl> <start> <end> <out.json>
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { HANGUL, stripKeep } from './hff-ja-b01-build.mjs';
import { SIMPLIFIED_ONLY } from './hff-ja-b01-translate.mjs';

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
  labelLost: 0, licenseNoLost: 0, simplifiedVisible: 0,
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
      /* ZH 트랙 사전을 우회 참조하면 간체자가 섞인다 — 일본어 문서에서는 실패다(§6). */
      if (SIMPLIFIED_ONLY.test(txt)) { counters.simplifiedVisible++; failures.push({ p: t.p, w, why: 'SIMPLIFIED', txt: txt.slice(0, 40) }); }
      if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(txt)) { counters.markerVisible++; failures.push({ p: t.p, w, why: 'MARKER' }); }
      /* KO 원문이 `2&gt;글루코사민` 처럼 항목 기호로 쓰는 맨 `>` 는 정상 텍스트다.
         raw HTML 로 볼 것은 **태그가 텍스트로 샌 경우**뿐이므로 태그 모양만 잡는다. */
      if (/&lt;\s*\/?[a-z]|&gt;\s*&lt;|<[a-z]/i.test(li.innerHTML.replace(/<\/?(b|span|em|strong)>/g, ''))) {
        counters.rawHtml++; failures.push({ p: t.p, w, why: 'RAW_HTML', txt: li.innerHTML.slice(0, 120) });
      }
    }
    for (const el of doc.querySelectorAll('.store-desc-content *')) {
      for (const cls of el.classList ?? []) if (cls.startsWith('sd-') && !DEFINED.has(cls)) { counters.undefinedClass++; failures.push({ p: t.p, w, why: `UNDEFINED_CLASS:${cls}` }); }
      const cs = window.getComputedStyle(el);
      if (/px$/.test(cs.width) && parseInt(cs.width, 10) > w) { counters.elementOverflow++; failures.push({ p: t.p, w, why: 'ELEMENT_OVERFLOW' }); }
      if (cs.whiteSpace === 'nowrap' && cs.overflow === 'hidden') counters.clipped++;
    }
    /* 슬롯 밖 잔존 한글도 잡는다 — `<h1>` 제품명과 제조사 법인명만 원문 표기로 유지한다. */
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
