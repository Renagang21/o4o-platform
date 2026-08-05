/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1 — 실브라우저 검증 러너 (DB write 0)
 *
 * 표본 60건을 **데스크톱·모바일·태블릿 3폭**에서 실제 프로덕션 공개 경로로 열고,
 * 화면에서만 드러나는 결함(가로 넘침·빈 카드·엔티티 노출·잘못된 제품·언어 노출)을 측정한다.
 *
 * 이 러너는 자체 프로필로 Chromium 을 띄운다. 다른 세션이 쓰는 MCP 자동화 브라우저를 건드리지 않는다.
 *
 * 접근 계약: /p/{key} 본문은 로그인 세션에만 응답한다(서버 read model 강제).
 *   → 비로그인 1건으로 로그인 게이트를 먼저 확인하고, 이후 로그인 상태로 전량 검증한다.
 *
 * 자격증명은 환경변수로만 받는다(파일·로그·커밋 금지):
 *   SMOKE_EMAIL / SMOKE_PASSWORD
 *
 * 산출:
 *   results/browser-smoke-result.json      축별 집계 + 판정
 *   results/browser-smoke-findings.jsonl   제품별 결함 원장
 *   results/screenshots/                   증거 (미추적, 대표 컷만 커밋)
 *
 * 사용: SMOKE_EMAIL=… SMOKE_PASSWORD=… node run-browser-smoke.mjs [--limit N] [--headed]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const SHOTS = path.join(RESULTS, 'screenshots');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const ORIGIN = process.env.NETURE_PUBLIC_ORIGIN || 'https://neture.co.kr';
const LIMIT = parseInt(arg('--limit', '0'), 10);
const HEADED = process.argv.includes('--headed');

const VIEWPORTS = [
  { key: 'desktop', width: 1440, height: 900, isMobile: false },
  { key: 'mobile', width: 390, height: 844, isMobile: true, deviceScaleFactor: 3 },
  { key: 'tablet', width: 1024, height: 768, isMobile: false },
];

/** 페이지 안에서 실행되는 측정기. DOM 만 읽는다. */
/* c8 ignore start */
function measureInPage() {
  const txt = (e) => (e?.innerText || '').trim();
  const root = document.querySelector('main') || document.body;
  const body = txt(root);

  const state = document.body.innerText.includes('제품을 찾을 수 없습니다') ? 'NOT_FOUND'
    : document.body.innerText.includes('현재 표시할 수 없는 제품입니다') ? 'BLOCKED'
      : document.body.innerText.includes('로그인 후 제품 설명을 볼 수 있어요') ? 'AUTH_REQUIRED'
        : document.body.innerText.includes('제품 정보를 불러오는 중') ? 'LOADING'
          : document.querySelector('h1') ? 'OK' : 'EMPTY';

  const de = document.scrollingElement || document.documentElement;
  // 뷰포트 오른쪽으로 삐져나온 요소. 스크롤 컨테이너(overflow auto/scroll)는 의도된 가로 스크롤이므로 뺀다.
  const overflowing = [];
  if (state === 'OK') {
    for (const el of root.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const st = getComputedStyle(el);
      const scrollable = /(auto|scroll)/.test(st.overflowX);
      const past = r.right > window.innerWidth + 1;
      const inner = !scrollable && el.scrollWidth > el.clientWidth + 2;
      if (past || inner) {
        overflowing.push({
          tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 60),
          right: Math.round(r.right), vw: window.innerWidth,
          scrollW: el.scrollWidth, clientW: el.clientWidth,
          kind: past ? 'past-viewport' : 'inner-overflow',
          text: (el.innerText || '').trim().slice(0, 60),
        });
      }
      if (overflowing.length >= 8) break;
    }
  }

  // 설명서 카드: 제목(h2/h3) + 그 아래 본문
  const headings = [...root.querySelectorAll('h2, h3')].map((h) => h.innerText.trim()).filter(Boolean);
  const emptyCards = [];
  for (const h of root.querySelectorAll('h2, h3')) {
    const card = h.closest('section, article, div');
    if (!card) continue;
    const clone = card.cloneNode(true);
    clone.querySelectorAll('h2, h3').forEach((x) => x.remove());
    if (!(clone.innerText || '').trim()) emptyCards.push(h.innerText.trim().slice(0, 40));
  }

  const langButtons = [...document.querySelectorAll('button')]
    .map((b) => (b.innerText || '').trim())
    .filter((t) => /한국어|Other Languages|English|中文|日本語/.test(t));

  const brokenImages = [...root.querySelectorAll('img')]
    .filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src).slice(0, 5);

  return {
    state,
    h1: txt(document.querySelector('h1')).slice(0, 120),
    textLength: body.length,
    pageHeight: de.scrollHeight,
    docOverflowPx: de.scrollWidth - de.clientWidth,
    overflowing,
    headings,
    headingCount: headings.length,
    emptyCards,
    langButtons,
    // 이스케이프가 덜 풀렸거나 sanitize 가 태그를 텍스트로 흘린 흔적
    entityLeak: (body.match(/&(?:[a-z]{2,6}|#\d+);/gi) || []).slice(0, 5),
    rawTagLeak: (body.match(/<\/?(?:p|div|ul|ol|li|br|strong|span|h[1-6])\b[^>]*>/gi) || []).slice(0, 5),
    // 줄바꿈 없이 이어지는 초장문 토큰(수치·단위가 붙어 가독성을 깨는 사례)
    longestToken: (body.split(/\s+/).reduce((m, w) => (w.length > m.length ? w : m), '')).slice(0, 60),
    brokenImages,
  };
}
/* c8 ignore stop */

const norm = (s) => (s || '').replace(/[\s()（）]/g, '').toLowerCase();

async function login(context) {
  const email = process.env.SMOKE_EMAIL; const password = process.env.SMOKE_PASSWORD;
  if (!email || !password) throw new Error('STOP: SMOKE_EMAIL / SMOKE_PASSWORD 환경변수가 필요하다');
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await Promise.all([
    page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(2500);
  const url = page.url();
  await page.close();
  return url;
}

async function measure(page, url) {
  const consoleErrors = []; const failed = [];
  const onC = (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); };
  const onR = (r) => failed.push(`${r.status()} ${r.url().slice(0, 120)}`);
  page.on('console', onC);
  page.on('response', (r) => { if (r.status() >= 400) onR(r); });
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // SPA 라 세션 복원 + 데이터 fetch 가 끝나야 화면이 확정된다. 종착 상태가 나올 때까지 기다린다.
  const settled = () => document.querySelector('h1') !== null
    || /제품을 찾을 수 없습니다|현재 표시할 수 없는 제품입니다/.test(document.body.innerText);
  await page.waitForFunction(settled, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(400);
  let m = await page.evaluate(measureInPage);
  // 로딩 상태로 측정됐다면 렌더러 결함이 아니라 타이밍이다 — 1회 재시도한 뒤에도 남으면 결함으로 본다.
  if (m.state === 'LOADING') {
    await page.waitForTimeout(3000);
    await page.waitForFunction(settled, null, { timeout: 30000 }).catch(() => {});
    m = await page.evaluate(measureInPage);
  }
  page.off('console', onC);
  return { httpStatus: resp?.status() ?? 0, consoleErrors: consoleErrors.slice(0, 3), failedRequests: failed.slice(0, 3), ...m };
}

/** 측정값 → 결함 판정. 데이터 오류와 렌더링 오류를 분리한다. */
function judge(target, vp, m) {
  const f = [];
  const add = (verdict, detail) => f.push({ no: target.n, publicKey: target.k, viewport: vp, verdict, detail });
  if (m.state !== 'OK') { add(m.state === 'LOADING' ? 'OTHER_REVIEW' : 'ACCESS_DEFECT', `state=${m.state} http=${m.httpStatus}`); return f; }
  if (norm(m.h1) !== norm(target.nm)) add('WRONG_PRODUCT', `h1="${m.h1}" expected="${target.nm}"`);
  if (m.headingCount === 0) add('CONTENT_RENDER_DEFECT', '설명서 카드 제목 0개');
  if (m.emptyCards.length) add('EMPTY_SECTION', `빈 카드: ${m.emptyCards.join(' / ')}`);
  if (m.entityLeak.length) add('CONTENT_RENDER_DEFECT', `HTML 엔티티 노출: ${m.entityLeak.join(' ')}`);
  if (m.rawTagLeak.length) add('CONTENT_RENDER_DEFECT', `raw 태그 노출: ${m.rawTagLeak.join(' ')}`);
  if (m.docOverflowPx > 1 || m.overflowing.length) {
    add('RESPONSIVE_DEFECT', `doc +${m.docOverflowPx}px / ${m.overflowing.length}개 요소 넘침: ` +
      m.overflowing.slice(0, 2).map((o) => `${o.tag}.${o.cls.split(' ')[0]}(${o.kind})`).join(', '));
  }
  if (m.langButtons.some((t) => /English|中文|日本語|Other Languages/.test(t))) {
    add('LANGUAGE_EXPOSURE_DEFECT', `외국어 노출: ${m.langButtons.join(' | ')}`);
  }
  if (m.brokenImages.length) add('CONTENT_RENDER_DEFECT', `깨진 이미지 ${m.brokenImages.length}`);
  if (m.failedRequests.length) add('OTHER_REVIEW', `실패 요청: ${m.failedRequests.join(' ')}`);
  if (m.consoleErrors.length) add('OTHER_REVIEW', `console error: ${m.consoleErrors[0]}`);
  return f;
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  let targets = JSON.parse(fs.readFileSync(path.join(RESULTS, 'browser-smoke-targets.json'), 'utf8'));
  const only = arg('--only', '');
  if (only) targets = targets.filter((t) => only.split(',').includes(t.k));
  if (LIMIT) targets = targets.slice(0, LIMIT);

  const browser = await chromium.launch({ headless: !HEADED });
  const findings = []; const rows = [];

  // ── 0. 비로그인 접근 계약 ──────────────────────────────────────────────────
  const anon = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const anonPage = await anon.newPage();
  const anonM = await measure(anonPage, `${ORIGIN}/p/${targets[0].k}`);
  await anonPage.screenshot({ path: path.join(SHOTS, 'anon-auth-gate.png') });
  const anonGate = { state: anonM.state, h1: anonM.h1, textLength: anonM.textLength, bodyLeaked: anonM.headingCount > 0 };
  await anon.close();

  // ── 1. 로그인 후 3폭 전량 ──────────────────────────────────────────────────
  const authCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginLanded = await login(authCtx);
  const storage = await authCtx.storageState();
  await authCtx.close();

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      storageState: storage,
      viewport: { width: vp.width, height: vp.height },
      isMobile: !!vp.isMobile, hasTouch: !!vp.isMobile,
      deviceScaleFactor: vp.deviceScaleFactor ?? 1,
    });
    const page = await ctx.newPage();
    for (const t of targets) {
      const m = await measure(page, `${ORIGIN}/p/${t.k}`);
      const f = judge(t, vp.key, m);
      findings.push(...f);
      rows.push({
        no: t.n, publicKey: t.k, productName: t.nm, stratum: t.st, route: t.rt,
        expectedLength: t.len, viewport: vp.key,
        state: m.state, httpStatus: m.httpStatus, h1: m.h1,
        textLength: m.textLength, pageHeight: m.pageHeight, docOverflowPx: m.docOverflowPx,
        headingCount: m.headingCount, headings: m.headings, emptyCards: m.emptyCards,
        langButtons: m.langButtons, overflowing: m.overflowing,
        entityLeak: m.entityLeak, rawTagLeak: m.rawTagLeak, longestToken: m.longestToken,
        verdicts: f.length ? [...new Set(f.map((x) => x.verdict))] : ['PASS'],
      });
      // 증거: 극단값·결함 건은 전체 페이지 캡처
      if (f.length || ['longest', 'short-or-empty-section', 'special-char-or-multi-sku'].includes(t.st)) {
        await page.screenshot({ path: path.join(SHOTS, `${vp.key}-${String(t.n).padStart(2, '0')}-${t.k}.png`), fullPage: true }).catch(() => {});
      }
      process.stderr.write(`${vp.key} ${t.n}/${targets.length} ${f.length ? f.map((x) => x.verdict).join(',') : 'PASS'}\n`);
    }
    await ctx.close();
  }
  await browser.close();

  const byVerdict = findings.reduce((a, f) => ({ ...a, [f.verdict]: (a[f.verdict] ?? 0) + 1 }), {});
  const failedProducts = new Set(findings.map((f) => f.no));
  const out = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1',
    step: 'browser-smoke',
    origin: ORIGIN,
    loginLanded,
    anonAccessGate: anonGate,
    targets: targets.length,
    viewports: VIEWPORTS.map((v) => `${v.key} ${v.width}x${v.height}`),
    pageLoads: rows.length,
    byVerdict,
    productsWithFindings: failedProducts.size,
    productsAllPass: targets.length - failedProducts.size,
    maxPageHeight: Math.max(...rows.map((r) => r.pageHeight)),
    anyDocOverflow: rows.filter((r) => r.docOverflowPx > 1).length,
    dbWrites: 0,
    result: findings.length === 0 && anonGate.state === 'AUTH_REQUIRED' && !anonGate.bodyLeaked ? 'PASS' : 'REVIEW',
  };
  fs.writeFileSync(path.join(RESULTS, 'browser-smoke-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'browser-smoke-findings.jsonl'), findings.map((f) => JSON.stringify(f)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'browser-smoke-rows.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
