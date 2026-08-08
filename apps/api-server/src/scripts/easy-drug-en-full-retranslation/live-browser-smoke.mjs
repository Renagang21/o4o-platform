/**
 * WO-O4O-EASY-DRUG-EN-PUBLIC-BROWSER-SMOKE-CLOSE-V1 — 실제 브라우저 화면 검증 (DB write 0).
 *
 * 공개 랜딩 `https://neture.co.kr/p/:publicKey` 를 Chromium 으로 직접 열어
 * 언어 선택 UI · EN/KO 렌더 · identity 보존 · 레이아웃 회귀를 3개 viewport 에서 확인한다.
 *
 * **화면 결함을 발견해도 번역 데이터나 DB 를 고치지 않는다.** UI 결함과 콘텐츠 불일치를 분리해 보고만 한다.
 * 이 스크립트는 SELECT 와 HTTP GET 만 한다 — DB write 0, apply 재실행 0.
 *
 * 렌더 검증 주의: 설명서 CSS 는 `.store-desc-content` 하위로만 스코프된다.
 * 그 래퍼가 없으면 무스타일 상태로 "보이긴 하니 PASS" 라는 허위 통과가 난다 → 래퍼 존재를 명시 검사한다.
 *
 * 사용: run-with-db.ps1 -Script live-browser-smoke.mjs -ScriptArgs @('--port','15501')
 *       (O4O_EMAIL / O4O_PASSWORD 환경변수 필요 — 값은 로그에 남기지 않는다)
 */
import fs from 'node:fs';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import pg from 'pg';
import { chromium } from 'playwright';
import { RESULTS, EN_UNITS_PATH } from './tm-lib.mjs';
import { SECTION_TITLE } from './en-frame.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', '15501'), 10);
const WEB = arg('--web', 'https://neture.co.kr');
const SHOTS = arg('--shots', path.join(RESULTS, 'browser-smoke-shots'));
const HEADED = process.argv.includes('--headed');
fs.mkdirSync(SHOTS, { recursive: true });

const ONLY_VP = arg('--vp', '');
const SAMPLE_LIMIT = parseInt(arg('--limit', '0'), 10);
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
].filter((v) => !ONLY_VP || v.name === ONLY_VP);
const EN_TITLES = new Set(Object.values(SECTION_TITLE));
const KO_TITLES = new Set(Object.keys(SECTION_TITLE));

function* streamJsonl(file) {
  const fd = fs.openSync(file, 'r');
  const dec = new StringDecoder('utf8');
  try {
    const buf = Buffer.alloc(1 << 20); let tail = '';
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (!n) break;
      const ls = (tail + dec.write(buf.subarray(0, n))).split('\n');
      tail = ls.pop() ?? '';
      for (const l of ls) if (l.trim()) yield JSON.parse(l);
    }
    tail += dec.end();
    if (tail.trim()) yield JSON.parse(tail);
  } finally { fs.closeSync(fd); }
}

/* ── 표본: 기존 위험군 13개를 그대로 사용 ─────────────────────── */
const risk = JSON.parse(fs.readFileSync(path.join(RESULTS, 'live-risk-sample-inspect-result.json'), 'utf8'));
let samples = risk.results.map((r) => ({ category: r.category, masterId: r.masterId, itemSeq: r.itemSeq, action: r.action }));
if (SAMPLE_LIMIT > 0) samples = samples.slice(0, SAMPLE_LIMIT);
const wanted = new Set(samples.map((s) => s.masterId));
const fixedBy = new Map();
for (const u of streamJsonl(EN_UNITS_PATH)) {
  if (!wanted.has(u.masterId)) continue;
  fixedBy.set(u.masterId, u.segments.filter((s) => s.kind === 'FIXED_IDENTITY').map((s) => s.text));
}

const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: 'o4o_platform' });
await client.connect();
await client.query('SET default_transaction_read_only = on');
const meta = new Map((await client.query(
  `SELECT l.product_master_id::text "masterId", l.public_key "publicKey", m.name, m.manufacturer_name "manufacturer"
   FROM product_landings l JOIN product_masters m ON m.id = l.product_master_id
   WHERE l.product_master_id = ANY($1::uuid[])`, [[...wanted]])).rows.map((r) => [r.masterId, r]));
await client.end();

/* ── 브라우저 ────────────────────────────────────────────────── */
const email = process.env.O4O_EMAIL, password = process.env.O4O_PASSWORD;
if (!email || !password) throw new Error('O4O_EMAIL / O4O_PASSWORD 환경변수가 필요합니다');
const browser = await chromium.launch({ headless: !HEADED });

const findings = [];       // 화면 결함 (UI / CONTENT 분리)
const rows = [];
const consoleErrors = [];

const record = (ctx, kind, detail) => findings.push({ ...ctx, kind, detail });

/** 페이지 전역 레이아웃 회귀 측정 */
async function measure(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const horizontalOverflow = de.scrollWidth - de.clientWidth;
    const wrapper = document.querySelector('.store-desc-content');
    const wrapperStyled = wrapper
      ? getComputedStyle(wrapper).getPropertyValue('--sd-bg').trim() !== ''
      : false;
    // 잘림/겹침: 스코프 내부 요소 중 overflow 가 hidden/clip 인데 내용이 넘치는 것
    const clipped = [];
    if (wrapper) {
      for (const el of wrapper.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        const hidX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
        const hidY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
        if ((hidX && el.scrollWidth > el.clientWidth + 2) || (hidY && el.scrollHeight > el.clientHeight + 2)) {
          clipped.push(`${el.tagName.toLowerCase()}.${el.className || ''}`.slice(0, 60));
        }
        if (el.getBoundingClientRect().right > de.clientWidth + 2) {
          clipped.push(`overflow-right:${el.tagName.toLowerCase()}.${el.className || ''}`.slice(0, 60));
        }
      }
    }
    const h2s = [...(wrapper?.querySelectorAll('h2') ?? [])].map((h) => h.textContent.trim());
    return {
      horizontalOverflow,
      hasWrapper: !!wrapper,
      wrapperStyled,
      clipped: [...new Set(clipped)].slice(0, 8),
      h2s,
      wrapperText: (wrapper?.innerText ?? '').slice(0, 200000),
      h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    };
  });
}

async function gotoLanding(page, publicKey, { clearLocale = true } = {}) {
  await page.goto(`${WEB}/p/${encodeURIComponent(publicKey)}`, { waitUntil: 'domcontentloaded' });
  if (clearLocale) {
    await page.evaluate(() => { try { localStorage.removeItem('o4o_product_landing_locale'); } catch {} });
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  await page.waitForLoadState('networkidle').catch(() => {});
}

/* 1) 비로그인 접근 계약 (검사 11) — 표본 1건으로 게이트 확인 */
const gateSample = samples[0];
const gateKey = meta.get(gateSample.masterId).publicKey;
const anonCtx = await browser.newContext({ viewport: VIEWPORTS[0] });
const anonPage = await anonCtx.newPage();
await gotoLanding(anonPage, gateKey);
const anonHasContent = await anonPage.locator('.store-desc-content').count();
const anonHasLoginBtn = await anonPage.getByRole('button', { name: /로그인/ }).count();
const authGateOk = anonHasContent === 0 && anonHasLoginBtn > 0;
if (!authGateOk) record({ scope: 'auth-gate' }, 'UI', `비로그인 게이트 이상 content=${anonHasContent} loginBtn=${anonHasLoginBtn}`);
await anonPage.screenshot({ path: path.join(SHOTS, 'auth-gate-anon.png'), fullPage: false });

/* 2) 실제 로그인 모달로 인증 → storageState 재사용 */
await anonPage.getByRole('button', { name: /로그인/ }).first().click();
await anonPage.locator('input[type="email"]').first().fill(email);
await anonPage.locator('input[type="password"]').first().fill(password);
await anonPage.locator('button[type="submit"]').first().click();
await anonPage.waitForSelector('.store-desc-content', { timeout: 30000 });
const storageState = await anonCtx.storageState();
const authedAfterLogin = await anonPage.locator('.store-desc-content').count();
await anonPage.screenshot({ path: path.join(SHOTS, 'auth-gate-after-login.png'), fullPage: false });
await anonCtx.close();

/* 3) 표본 × viewport 검증 */
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, storageState, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({ vp: vp.name, text: m.text().slice(0, 200) }); });

  for (const s of samples) {
    const m = meta.get(s.masterId);
    const ctxTag = { viewport: vp.name, category: s.category, itemSeq: s.itemSeq };
    const row = { viewport: vp.name, category: s.category, masterId: s.masterId, itemSeq: s.itemSeq, action: s.action, checks: {} };
    try {
      await gotoLanding(page, m.publicKey);

      // (1) 랜딩 정상 load + (4) KO 기본 표시
      await page.waitForSelector('.store-desc-content', { timeout: 30000 });
      const ko = await measure(page);
      row.checks.LOAD_OK = true;
      row.checks.KO_DEFAULT_RENDER = ko.h2s.length > 0 && ko.h2s.every((t) => KO_TITLES.has(t));
      row.checks.CSS_SCOPE_APPLIED = ko.hasWrapper && ko.wrapperStyled;

      // (2) 언어 선택 UI 존재
      const koBtn = page.getByRole('button', { name: /한국어/ }).first();
      const otherBtn = page.getByRole('button', { name: /Other Languages|English/ }).first();
      row.checks.LANG_UI_PRESENT = (await koBtn.count()) > 0 && (await otherBtn.count()) > 0;

      // (3) EN 선택
      await otherBtn.click();
      await page.getByRole('dialog').getByRole('button', { name: /English/i }).first().click();
      await page.waitForFunction(
        (titles) => {
          const w = document.querySelector('.store-desc-content');
          if (!w) return false;
          const h = [...w.querySelectorAll('h2')].map((x) => x.textContent.trim());
          return h.length > 0 && h.every((t) => titles.includes(t));
        },
        [...EN_TITLES], { timeout: 30000 },
      );
      const en = await measure(page);
      row.checks.EN_RENDER = en.h2s.length > 0 && en.h2s.every((t) => EN_TITLES.has(t));

      // (5) identity 한국어 원문 유지
      const fixed = fixedBy.get(s.masterId) ?? [];
      const koIdentity = fixed.filter((t) => /[가-힣]/.test(t));
      row.checks.IDENTITY_KO_PRESERVED = koIdentity.length > 0 && koIdentity.every((t) => en.wrapperText.includes(t));

      // (6) 섹션 라벨 영어 == EN_RENDER, (7) 타 master 혼입 0
      row.checks.NO_FOREIGN_MASTER = en.wrapperText.includes(s.itemSeq) && (m.name ? (en.h1 ?? '').includes(m.name.slice(0, 8)) : true);

      // (8)(9)(10) 레이아웃
      row.checks.NO_H_OVERFLOW = en.horizontalOverflow <= 1;
      row.checks.NO_CLIPPING = en.clipped.length === 0;
      row.details = { h2Count: en.h2s.length, hOverflow: en.horizontalOverflow, clipped: en.clipped, h1: en.h1 };

      // (4 재확인) KO 로 되돌리기
      await page.getByRole('button', { name: /한국어/ }).first().click();
      await page.waitForFunction(
        (titles) => {
          const w = document.querySelector('.store-desc-content');
          if (!w) return false;
          const h = [...w.querySelectorAll('h2')].map((x) => x.textContent.trim());
          return h.length > 0 && h.every((t) => titles.includes(t));
        },
        [...KO_TITLES], { timeout: 30000 },
      );
      row.checks.KO_ROUNDTRIP = true;

      if (vp.name === 'mobile' || ['longest_content', 'create_new_en'].includes(s.category)) {
        await page.getByRole('button', { name: /Other Languages|English/ }).first().click();
        await page.getByRole('dialog').getByRole('button', { name: /English/i }).first().click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SHOTS, `${vp.name}-${s.category}.png`), fullPage: true });
      }
    } catch (e) {
      row.checks.LOAD_OK = row.checks.LOAD_OK ?? false;
      row.error = String(e.message || e).slice(0, 200);
      record(ctxTag, 'UI', row.error);
    }
    const failed = Object.entries(row.checks).filter(([, v]) => v === false).map(([k]) => k);
    row.pass = failed.length === 0 && !row.error;
    row.failed = failed;
    if (!row.pass) record(ctxTag, 'UI', `실패 검사: ${failed.join(', ') || row.error}`);
    rows.push(row);
    process.stderr.write(`${vp.name}/${s.category} ${row.pass ? 'PASS' : 'FAIL ' + failed.join(',')}\n`);
  }
  await ctx.close();
}
await browser.close();

const CHECK_KEYS = ['LOAD_OK', 'KO_DEFAULT_RENDER', 'CSS_SCOPE_APPLIED', 'LANG_UI_PRESENT', 'EN_RENDER',
  'IDENTITY_KO_PRESERVED', 'NO_FOREIGN_MASTER', 'NO_H_OVERFLOW', 'NO_CLIPPING', 'KO_ROUNDTRIP'];
const perCheck = {};
for (const k of CHECK_KEYS) perCheck[k] = rows.filter((r) => r.checks[k] === true).length;

const out = {
  wo: 'WO-O4O-EASY-DRUG-EN-PUBLIC-BROWSER-SMOKE-CLOSE-V1',
  step: 'live-browser-smoke',
  web: WEB,
  samples: samples.length,
  viewports: VIEWPORTS.map((v) => `${v.name} ${v.width}x${v.height}`),
  cases: rows.length,
  passed: rows.filter((r) => r.pass).length,
  failed: rows.filter((r) => !r.pass).length,
  perCheck,
  authGate: { anonBodyHidden: authGateOk, bodyVisibleAfterLogin: authedAfterLogin > 0 },
  consoleErrors: consoleErrors.slice(0, 20),
  consoleErrorCount: consoleErrors.length,
  findings,
  rows,
  screenshotsDir: SHOTS,
  dbWrites: 0,
};
fs.writeFileSync(path.join(RESULTS, 'live-browser-smoke-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ...out, rows: `[${rows.length} cases]`, findings: findings.slice(0, 20) }, null, 2));
