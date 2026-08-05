/**
 * 전수 h1 감사 — C층: 위험군 84건 × 3폭 실제 페이지 시각 검증 (DB write 0)
 *
 * A·B층이 전수 PASS 여도 자동 측정이 못 보는 것이 있다 — 겹침, 한 글자씩 깨짐, 빌드 CSS 누락.
 * 그래서 가장 깨지기 쉬운 84건은 실제 공개 URL 을 그대로 연다.
 *
 * 검사 축:
 *   OVERFLOW      h1 / 조상 / document 가로 넘침
 *   CSS_MISSING   빌드된 CSS 에 overflow-wrap:anywhere · word-break:keep-all 이 실제로 먹었는지 (computed style)
 *   CHAR_BREAK    한글이 한 글자씩 깨지는지 — 줄이 안 찼는데 줄바꿈이 일어났으면 의심
 *   OVERLAP       제목 박스가 다른 요소(제조사명·배지·버튼·본문 카드)와 겹치는지
 *   CALIBRATION   B층 하니스 예측(줄 수)과 실제 페이지 값이 다르면 하니스를 믿지 않는다
 *
 * 산출: results/h1-risk-visual-{result.json,findings.jsonl,rows.jsonl} + results/screenshots/risk/
 * 사용: SMOKE_EMAIL=… SMOKE_PASSWORD=… node run-h1-risk-visual.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const SHOTS = path.join(RESULTS, 'screenshots', 'risk');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const ORIGIN = process.env.NETURE_PUBLIC_ORIGIN || 'https://neture.co.kr';
const LIMIT = parseInt(arg('--limit', '0'), 10);
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

const VIEWPORTS = [
  { key: 'desktop', opts: { viewport: { width: 1440, height: 900 } } },
  { key: 'mobile', opts: { ...devices['iPhone 12'] } },
  { key: 'tablet', opts: { viewport: { width: 1024, height: 768 }, hasTouch: true } },
];

function measure() {
  const el = document.querySelector('h1');
  if (!el) return { state: /찾을 수 없|표시할 수 없/.test(document.body.innerText) ? 'NOT_FOUND' : 'LOADING' };
  const doc = document.documentElement;
  const cs = getComputedStyle(el);
  const r0 = el.getBoundingClientRect();

  const ancestors = [];
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const over = p.scrollWidth - p.clientWidth;
    if (over > 1) ancestors.push({ tag: p.tagName.toLowerCase(), cls: (p.className || '').toString().slice(0, 40), over });
  }

  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = [...range.getClientRects()];
  const maxLine = rects.reduce((m, r) => Math.max(m, r.width), 0);
  // "한 글자씩 깨짐" 은 줄 폭이 아니라 **줄당 글자 수**로만 판별된다.
  // 줄 폭이 짧은 건 keep-all 이 한글 덩어리를 지킨 정상 동작이고, 1~2글자 줄이 생기는 게 진짜 파손이다.
  const tn = el.firstChild;
  const lineTops = new Map();
  if (tn && tn.nodeType === 3) {
    for (let i = 0; i < tn.length; i++) {
      const rr = document.createRange();
      rr.setStart(tn, i); rr.setEnd(tn, i + 1);
      const top = Math.round(rr.getBoundingClientRect().top);
      lineTops.set(top, (lineTops.get(top) ?? 0) + 1);
    }
  }
  const charsPerLine = [...lineTops.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c);
  const minCharsExceptLast = charsPerLine.length > 1 ? Math.min(...charsPerLine.slice(0, -1)) : Infinity;

  // 겹침: 제목 사각형과 실제로 겹치는 다른 요소를 찾는다. 조상·자손은 당연히 포함 관계이므로 제외한다.
  const overlaps = [];
  for (const o of document.querySelectorAll('h1 ~ *, .max-w-2xl button, .max-w-2xl a, dl, p, section, h2')) {
    if (o === el || el.contains(o) || o.contains(el)) continue;
    const r = o.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const ix = Math.min(r0.right, r.right) - Math.max(r0.left, r.left);
    const iy = Math.min(r0.bottom, r.bottom) - Math.max(r0.top, r.top);
    if (ix > 1 && iy > 1) overlaps.push({ tag: o.tagName.toLowerCase(), cls: (o.className || '').toString().slice(0, 40), ix: Math.round(ix), iy: Math.round(iy) });
  }

  return {
    state: 'OK',
    name: el.textContent,
    overflowWrap: cs.overflowWrap, wordBreak: cs.wordBreak,
    h1Over: el.scrollWidth - el.clientWidth,
    ancestorOver: ancestors,
    docOver: doc.scrollWidth - doc.clientWidth,
    clientWidth: el.clientWidth,
    lines: rects.length,
    charsPerLine, minCharsExceptLast,
    maxLine: Math.round(maxLine * 100) / 100,
    heightPx: Math.round(r0.height),
    overlaps: overlaps.slice(0, 5),
  };
}

async function main() {
  const sel = JSON.parse(fs.readFileSync(path.join(RESULTS, 'h1-risk-targets.json'), 'utf8'));
  let targets = sel.targets;
  if (LIMIT) targets = targets.slice(0, LIMIT);
  const ledger = readJsonl(path.join(RESULTS, 'h1-layout-slack-ledger.jsonl'));
  const pred = new Map(ledger.map((l) => [`${l.viewport}|${l.publicKey}`, l]));

  const email = process.env.SMOKE_EMAIL; const password = process.env.SMOKE_PASSWORD;
  if (!email || !password) throw new Error('STOP: SMOKE_EMAIL / SMOKE_PASSWORD 필요');
  fs.mkdirSync(SHOTS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const findings = []; const rows = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext(vp.opts);
    const lp = await ctx.newPage();
    await lp.goto(`${ORIGIN}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await lp.fill('input[type="email"], input[name="email"]', email);
    await lp.fill('input[type="password"], input[name="password"]', password);
    await lp.click('button[type="submit"]');
    await lp.waitForTimeout(3500);
    await lp.close();

    const page = await ctx.newPage();
    let i = 0;
    for (const t of targets) {
      i++;
      await page.goto(`${ORIGIN}/p/${t.publicKey}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const settled = () => document.querySelector('h1') !== null || /찾을 수 없|표시할 수 없/.test(document.body.innerText);
      await page.waitForFunction(settled, null, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(400);
      let m = await page.evaluate(measure);
      if (m.state === 'LOADING') {
        await page.waitForTimeout(3000);
        await page.waitForFunction(settled, null, { timeout: 30000 }).catch(() => {});
        m = await page.evaluate(measure);
      }
      const add = (verdict, detail) => findings.push({ viewport: vp.key, publicKey: t.publicKey, masterId: t.masterId, groups: t.groups, verdict, detail });

      if (m.state !== 'OK') { add(m.state === 'LOADING' ? 'OTHER_REVIEW' : 'ACCESS_DEFECT', `state=${m.state}`); rows.push({ viewport: vp.key, ...t, ...m }); continue; }
      if ((m.name || '') !== t.productName) add('WRONG_PRODUCT', `h1="${m.name}" db="${t.productName}"`);
      if (m.h1Over > 1) add('RESPONSIVE_DEFECT', `h1 +${m.h1Over}px`);
      if (m.ancestorOver.length) add('RESPONSIVE_DEFECT', `조상 넘침 ${JSON.stringify(m.ancestorOver)}`);
      if (m.docOver > 1) add('RESPONSIVE_DEFECT', `document +${m.docOver}px`);
      if (m.overflowWrap !== 'anywhere' || m.wordBreak !== 'keep-all') add('CSS_MISSING', `overflow-wrap=${m.overflowWrap} word-break=${m.wordBreak}`);
      // 마지막 줄을 뺀 어느 줄이 1~2글자면 한글이 낱자로 흩어진 것이다.
      if (m.minCharsExceptLast <= 2) add('CHAR_BREAK', `charsPerLine=[${m.charsPerLine}]`);
      if (m.overlaps.length) add('OVERLAP', JSON.stringify(m.overlaps));
      const p = pred.get(`${vp.key}|${t.publicKey}`);
      if (p && Math.abs((p.lines ?? 0) - m.lines) > 1) add('CALIBRATION_MISMATCH', `harness lines=${p.lines} real lines=${m.lines}`);

      rows.push({ viewport: vp.key, ...t, ...m, predLines: p?.lines ?? null });
      // 증거: 각 폭에서 줄 수 최대 3건만 남긴다(스크린샷 원본은 커밋하지 않고 대표만 추린다).
      if (m.lines >= 4) {
        await page.screenshot({ path: path.join(SHOTS, `${vp.key}-lines${m.lines}-${t.publicKey}.png`), fullPage: false });
      }
      process.stderr.write(`${vp.key} ${i}/${targets.length} lines=${m.lines} ${findings.length ? `F${findings.length}` : 'PASS'}\n`);
    }
    await ctx.close();
  }
  await browser.close();

  const out = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1',
    step: 'h1-risk-visual',
    targets: targets.length,
    loads: targets.length * VIEWPORTS.length,
    byVerdict: findings.reduce((a, f) => ({ ...a, [f.verdict]: (a[f.verdict] ?? 0) + 1 }), {}),
    productsWithFindings: new Set(findings.map((f) => f.publicKey)).size,
    priorDefect14Reproduced: new Set(findings.filter((f) => f.groups?.includes('G1_prior_defect')).map((f) => f.publicKey)).size,
    maxLines: Object.fromEntries(VIEWPORTS.map((v) => [v.key, Math.max(...rows.filter((r) => r.viewport === v.key).map((r) => r.lines || 0))])),
    dbWrites: 0,
    result: findings.length === 0 ? 'PASS' : 'REVIEW',
  };
  fs.writeFileSync(path.join(RESULTS, 'h1-risk-visual-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'h1-risk-visual-findings.jsonl'), findings.map((f) => JSON.stringify(f)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'h1-risk-visual-rows.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
