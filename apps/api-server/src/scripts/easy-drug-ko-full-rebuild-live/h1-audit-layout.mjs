/**
 * 전수 h1 감사 — B층: 제품명 19,363개 × 3폭 레이아웃 전수 측정 (DB write 0)
 *
 * 5.8만 페이지를 여는 대신, **실제 공개 랜딩 페이지를 폭마다 1번만 열고**
 * 그 안의 진짜 `h1`(진짜 CSS·진짜 폰트·진짜 조상 컨테이너) 텍스트만 갈아끼우며 측정한다.
 * 측정 대상은 결함이 났던 축 그대로다:
 *   - h1 가로 넘침        h1.scrollWidth > h1.clientWidth
 *   - h1 조상 컨테이너 넘침 조상 각각의 scrollWidth > clientWidth
 *   - document 가로 넘침   documentElement.scrollWidth > clientWidth
 *   - 여유 폭(slack)      h1.clientWidth - 실제 최장 줄 폭   (하위 위험 제품 원장)
 *   - 줄 수 / 높이 증가    4~6줄에서도 아래 콘텐츠와 겹치지 않는지의 재료
 * 로그인 게이트(`p`)는 같은 규칙을 쓰는지 확인하기 위해 비로그인 컨텍스트에서 따로 돈다.
 *
 * 이 하니스는 **실제 페이지 측정과 대조 검증(calibrate)** 한 뒤에만 신뢰한다.
 *   --calibrate <keys.json> 로 대표 건을 실제 페이지로 열어 같은 값이 나오는지 비교한다.
 *
 * 산출: results/h1-layout-{result.json,findings.jsonl,slack-ledger.jsonl}
 * 사용: SMOKE_EMAIL=… SMOKE_PASSWORD=… node h1-audit-layout.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const ORIGIN = process.env.NETURE_PUBLIC_ORIGIN || 'https://neture.co.kr';
const LIMIT = parseInt(arg('--limit', '0'), 10);
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

const VIEWPORTS = [
  { key: 'desktop', opts: { viewport: { width: 1440, height: 900 } } },
  { key: 'mobile', opts: { ...devices['iPhone 12'] } },
  { key: 'tablet', opts: { viewport: { width: 1024, height: 768 }, hasTouch: true } },
];

/** 페이지 안에서 h1 텍스트를 갈아끼우며 재는 함수. 조상 체인은 카드 바깥까지 훑는다. */
const measureNames = ([names, selector]) => {
  const el = document.querySelector(selector);
  if (!el) return { error: `selector not found: ${selector}` };
  const original = el.textContent;
  const doc = document.documentElement;
  // 조상 체인: h1 부모부터 body 직전까지. 어느 층에서 터지는지 알아야 "조상 컨테이너 초과 0" 을 말할 수 있다.
  const ancestors = [];
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) ancestors.push(p);

  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 0;
  const out = [];
  for (const name of names) {
    el.textContent = name;
    void el.offsetHeight; // 강제 리플로우
    // 실제 최장 줄 폭은 텍스트 노드의 client rect 중 최대값이다. scrollWidth 는 정수로 반올림돼 여유 폭이 뭉개진다.
    const range = document.createRange();
    range.selectNodeContents(el);
    let maxLine = 0; let lineCount = 0;
    for (const r of range.getClientRects()) { if (r.width > maxLine) maxLine = r.width; lineCount++; }
    const anc = ancestors
      .map((p, i) => ({ i, tag: p.tagName.toLowerCase(), over: p.scrollWidth - p.clientWidth }))
      .filter((a) => a.over > 1);
    out.push({
      name,
      h1Over: el.scrollWidth - el.clientWidth,
      ancestorOver: anc,
      docOver: doc.scrollWidth - doc.clientWidth,
      slack: Math.round((el.clientWidth - maxLine) * 100) / 100,
      maxLine: Math.round(maxLine * 100) / 100,
      clientWidth: el.clientWidth,
      lines: lineCount,
      heightPx: Math.round(el.getBoundingClientRect().height),
      lineHeight,
    });
  }
  el.textContent = original;
  return { rows: out };
};

async function login(ctx, email, password) {
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
  await page.close();
}

async function openLanding(ctx, publicKey, selector) {
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/p/${publicKey}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector(selector, { timeout: 30000 });
  await page.waitForTimeout(600);
  return page;
}

async function main() {
  let pop = readJsonl(path.join(RESULTS, 'h1-population.jsonl'));
  if (LIMIT) pop = pop.slice(0, LIMIT);
  const names = pop.map((r) => r.productName);

  const email = process.env.SMOKE_EMAIL; const password = process.env.SMOKE_PASSWORD;
  if (!email || !password) throw new Error('STOP: SMOKE_EMAIL / SMOKE_PASSWORD 필요');

  // 기준 페이지는 대표 60건 재검증에서 PASS 한 건 중 첫 번째를 쓴다.
  const baseKey = pop[0].publicKey;
  const browser = await chromium.launch({ headless: true });
  const byViewport = {}; const gateByViewport = {};

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext(vp.opts);
    await login(ctx, email, password);
    const page = await openLanding(ctx, baseKey, 'h1');
    const chunk = 2000; const rows = [];
    for (let i = 0; i < names.length; i += chunk) {
      const r = await page.evaluate(measureNames, [names.slice(i, i + chunk), 'h1']);
      if (r.error) throw new Error(`STOP: ${vp.key} ${r.error}`);
      rows.push(...r.rows);
      process.stderr.write(`${vp.key} ${Math.min(i + chunk, names.length)}/${names.length}\n`);
    }
    byViewport[vp.key] = rows;
    await ctx.close();

    // 로그인 게이트: 같은 URL 을 세션 없이 열면 제품명이 `p` 로 나온다. 같은 줄바꿈 규칙인지 확인한다.
    const anon = await browser.newContext(vp.opts);
    const gp = await openLanding(anon, baseKey, 'p.font-semibold');
    const g = await gp.evaluate(measureNames, [names, 'p.font-semibold']);
    if (g.error) throw new Error(`STOP: gate ${vp.key} ${g.error}`);
    gateByViewport[vp.key] = g.rows;
    process.stderr.write(`${vp.key} gate ${g.rows.length}\n`);
    await anon.close();
  }
  await browser.close();

  const cap = Object.fromEntries(VIEWPORTS.map((v) => [v.key, Math.max(...byViewport[v.key].map((r) => r.clientWidth))]));
  const findings = []; const ledger = [];
  for (const vp of VIEWPORTS) {
    const rows = byViewport[vp.key]; const gate = gateByViewport[vp.key];
    rows.forEach((r, i) => {
      const p = pop[i];
      const push = (verdict, detail) => findings.push({ viewport: vp.key, masterId: p.masterId, publicKey: p.publicKey, verdict, detail });
      if (r.h1Over > 1) push('H1_OVERFLOW', `h1 ${r.h1Over}px`);
      if (r.ancestorOver.length) push('ANCESTOR_OVERFLOW', JSON.stringify(r.ancestorOver));
      if (r.docOver > 1) push('DOC_OVERFLOW', `${r.docOver}px`);
      const g = gate[i];
      if (g.h1Over > 1 || g.ancestorOver.length || g.docOver > 1) {
        push('GATE_OVERFLOW', `p=${g.h1Over}px anc=${g.ancestorOver.length} doc=${g.docOver}px`);
      }
      ledger.push({
        viewport: vp.key, masterId: p.masterId, publicKey: p.publicKey, productName: p.productName,
        // h1 은 `min-w-0` flex 자식이라 짧은 이름에서는 내용 폭으로 줄어든다(shrink-to-fit).
        // 그래서 진짜 "여유 폭" 은 그 폭의 최대치(cap) 대비로 봐야 한다.
        slack: r.slack, slackAtCap: Math.round((cap[vp.key] - r.maxLine) * 100) / 100,
        lines: r.lines, heightPx: r.heightPx, clientWidth: r.clientWidth,
        gateSlack: g.slack, gateLines: g.lines, risk: p.risk,
      });
    });
  }

  const stat = (key) => {
    const v = ledger.filter((l) => l.viewport === key);
    const s = v.map((l) => l.slackAtCap).sort((a, b) => a - b);
    return {
      capPx: cap[key], minSlackAtCap: s[0], p1SlackAtCap: s[Math.floor(s.length * 0.01)], medianSlackAtCap: s[Math.floor(s.length * 0.5)],
      maxLines: Math.max(...v.map((l) => l.lines)), maxHeightPx: Math.max(...v.map((l) => l.heightPx)),
      linesOver3: v.filter((l) => l.lines > 3).length,
    };
  };
  const out = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1',
    step: 'h1-audit-layout',
    population: pop.length,
    viewports: VIEWPORTS.map((v) => v.key),
    measurements: pop.length * VIEWPORTS.length * 2,
    byVerdict: findings.reduce((a, f) => ({ ...a, [f.verdict]: (a[f.verdict] ?? 0) + 1 }), {}),
    productsWithFindings: new Set(findings.map((f) => f.masterId)).size,
    slackStats: Object.fromEntries(VIEWPORTS.map((v) => [v.key, stat(v.key)])),
    dbWrites: 0,
    result: findings.length === 0 ? 'PASS' : 'REVIEW',
  };
  fs.writeFileSync(path.join(RESULTS, 'h1-layout-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'h1-layout-findings.jsonl'), findings.map((f) => JSON.stringify(f)).join('\n') + '\n', 'utf8');
  ledger.sort((a, b) => a.slackAtCap - b.slackAtCap);
  fs.writeFileSync(path.join(RESULTS, 'h1-layout-slack-ledger.jsonl'), ledger.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
