/**
 * WO-O4O-HFF-KO-FIRST-10000-INTAKE-HINT-AND-DESIGN-TARGETED-BACKFILL-V1 — 표본 20건 사전 검증 산출기.
 *
 * WO §"표본 20건 사전 검증" 의 8개 유형을 충족하는 표본을 결정적으로 선별해
 *   1) before/after JSON (data/…-samples-20.json)
 *   2) 실제 렌더 확인용 HTML (LIVE ContentRenderer.storeDescriptionCss 를 그대로 추출해 주입)
 * 를 생성한다. 신규 화면·라우트 0 / DB write 0.
 *
 * Usage: PGPW=... node apps/api-server/src/scripts/hff-ko-first-10000-targeted-backfill-samples.mjs
 */
import fs from 'node:fs';

const OUT_JSON = 'apps/api-server/src/scripts/data/hff-ko-first-10000-targeted-backfill-samples-20.json';
const OUT_HTML = process.env.HFF_BF_PREVIEW ?? 'C:/tmp/hff-bf-preview.html';
const RENDERER = 'packages/content-editor/src/components/ContentRenderer.tsx';

/** LIVE 렌더러에서 storeDescriptionCss 를 그대로 추출(사본 작성 금지 — 실 CSS 사용). */
function liveCss() {
  const src = fs.readFileSync(RENDERER, 'utf8');
  const m = src.match(/const storeDescriptionCss = `([\s\S]*?)`;\s/);
  if (!m) throw new Error('storeDescriptionCss 추출 실패 — 렌더러 구조 변경 확인 필요');
  return m[1];
}

const CATEGORIES = [
  { key: 'hint_long', label: 'INTAKE_HINT1 긴 제품', want: 4, test: (x) => x.hintLen >= 400 },
  { key: 'hint_drug', label: '약물 복용 관련 참고사항', want: 3, test: (x) => /의약품|치료제|항응고제|복용 시/.test(x.hint) },
  { key: 'hint_pregnancy', label: '임신·수유 관련 참고사항', want: 2, test: (x) => /임산부|수유부|임신/.test(x.hint) },
  { key: 'hint_allergy', label: '알레르기 관련 참고사항', want: 2, test: (x) => /알레르기|특이체질|과민/.test(x.hint) },
  { key: 'hint_disease', label: '특정 질환·증상 관련 참고사항', want: 3, test: (x) => /질환|고칼슘혈증|당뇨|고지혈증|골다공증|설사|위통|복부팽만|간 질환/.test(x.hint) },
  { key: 'hint_empty', label: 'INTAKE_HINT1 공란 제품', want: 2, test: (x) => x.hintStatus !== 'OK' },
  { key: 'func_dup', label: '기능성 중복 제품(주요 기능성 ≡ 기능성 상세)', want: 2, test: (x) => x.funcDup },
  { key: 'long_src', label: '긴 MAIN_FNCTN·SRV_USE 제품', want: 2, test: (x) => x.fnLen + x.srvLen >= 600 },
];

// 표본은 러너(`--pool`)가 생성한 before/after 전수 풀에서 고른다 — 별도 재구성 없이 동일 산출물 사용.
const pool = JSON.parse(fs.readFileSync(process.env.HFF_BF_POOL ?? 'C:/tmp/hff-bf-pool.json', 'utf8'));

const enriched = pool.map((x) => ({
  ...x,
  hintLen: (x.hint || '').length,
  fnLen: (x.mainFnctn || '').length,
  srvLen: (x.srvUse || '').length,
  funcDup: x.before.includes('<h2>기능성 상세</h2>'),
}));

const picked = [];
const used = new Set();
for (const c of CATEGORIES) {
  const cands = enriched.filter((x) => !used.has(x.descriptionId) && c.test(x));
  // 결정적 선별: 유형별 정렬 후 상위 want 건
  cands.sort((a, b) => (c.key === 'hint_long' || c.key === 'long_src' ? b.hintLen + b.fnLen - (a.hintLen + a.fnLen) : a.descriptionId < b.descriptionId ? -1 : 1));
  for (const x of cands.slice(0, c.want)) { used.add(x.descriptionId); picked.push({ category: c.key, categoryLabel: c.label, ...x }); }
}

fs.writeFileSync(OUT_JSON, JSON.stringify(picked.map((p) => ({
  category: p.category, categoryLabel: p.categoryLabel, descriptionId: p.descriptionId,
  statementNo: p.statementNo, productName: p.productName, hintStatus: p.hintStatus,
  intakeHint1: p.hint, before: p.before, after: p.after,
})), null, 1));

const css = liveCss();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const blocks = picked.map((p, i) => `
<section class="sample" id="s${i + 1}">
  <div class="lbl">#${i + 1} · ${esc(p.categoryLabel)} · ${esc(p.productName)} · hint=${p.hintStatus}</div>
  <div class="pair">
    <div><div class="cap">BEFORE (LIVE)</div><div class="store-desc-content">${p.before}</div></div>
    <div><div class="cap">AFTER (보정본)</div><div class="store-desc-content">${p.after}</div></div>
  </div>
  <details><summary>공식 INTAKE_HINT1 원문</summary><pre>${esc(p.hint || '(공란)')}</pre></details>
</section>`).join('\n');

fs.writeFileSync(OUT_HTML, `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HFF KO 1~10000 targeted backfill — 표본 20</title>
<style>${css}
body{margin:0;font-family:system-ui,sans-serif;background:#f4f6f9}
.sample{padding:10px 0;border-bottom:4px solid #c9d4e2}
.lbl{font:700 14px/1.5 system-ui;padding:8px 12px;background:#17356b;color:#fff}
.cap{font:700 12px/1.6 system-ui;padding:4px 10px;background:#dfe7f1;color:#17356b}
.pair{display:grid;grid-template-columns:1fr;gap:0}
@media(min-width:1100px){.pair{grid-template-columns:1fr 1fr}}
details{padding:8px 12px;font:12px/1.5 system-ui}
pre{white-space:pre-wrap;background:#fff;padding:8px;border:1px solid #d5dfeb}
</style></head><body>${blocks}</body></html>`);

console.log(JSON.stringify({ picked: picked.length, byCategory: CATEGORIES.map((c) => ({ key: c.key, want: c.want, got: picked.filter((p) => p.category === c.key).length })), outJson: OUT_JSON, outHtml: OUT_HTML }, null, 2));
