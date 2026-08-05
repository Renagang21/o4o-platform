/**
 * 전수 h1 감사 — A층: 공개 랜딩 API 전수 호출 (19,363건, DB write 0)
 *
 * 브라우저로 5.8만 페이지를 여는 대신, 화면이 h1 에 넣는 **바로 그 값**을 서버에서 전수 확인한다.
 *   - 로드 성공 (HTTP 200 · LANDING_NOT_FOUND 0 · 5xx 0)
 *   - `data.product.name` == 기대 ProductMaster.name        → WRONG_PRODUCT
 *   - `data.languages` == ['ko']                           → LANGUAGE_EXPOSURE
 *   - `data.description.hasCanonical` == true              → 본문 결측
 *   - 비로그인 응답은 authRequired + 본문 없음               → ACCESS
 *
 * 세션은 로그인 1회로 얻는다. 토큰은 메모리에만 두고 산출물·로그에 남기지 않는다.
 * 사용: SMOKE_EMAIL=… SMOKE_PASSWORD=… node h1-audit-api.mjs [--concurrency 12]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const ORIGIN = process.env.NETURE_PUBLIC_ORIGIN || 'https://neture.co.kr';
const CONC = parseInt(arg('--concurrency', '12'), 10);
// 프론트가 실제로 쓰는 API 진입점. neture.co.kr 은 SPA 정적 호스팅이라 /api 를 받지 않는다.
const API_BASE = process.env.NETURE_API_ORIGIN || 'https://api.neture.co.kr';
const LIMIT = parseInt(arg('--limit', '0'), 10);
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

async function main() {
  let pop = readJsonl(path.join(RESULTS, 'h1-population.jsonl'));
  if (LIMIT) pop = pop.slice(0, LIMIT);

  const email = process.env.SMOKE_EMAIL; const password = process.env.SMOKE_PASSWORD;
  if (!email || !password) throw new Error('STOP: SMOKE_EMAIL / SMOKE_PASSWORD 필요');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);

  // 비로그인 대조 1건: 같은 키를 세션 없는 컨텍스트로 호출한다.
  const anonCtx = await browser.newContext();
  const anonProbe = await anonCtx.request.get(`${API_BASE}/api/v1/public/product-landings/${pop[0].publicKey}`);
  const anonBody = await anonProbe.json().catch(() => null);
  const anonGate = {
    httpStatus: anonProbe.status(),
    authRequired: anonBody?.data?.authRequired === true,
    hasCanonical: anonBody?.data?.description?.hasCanonical === true,
    contentLeaked: !!anonBody?.data?.description?.content,
    languages: anonBody?.data?.languages ?? null,
  };
  await anonCtx.close();

  // 이 프론트는 cookie 가 아니라 localStorage 토큰 전략이다(`o4o_accessToken`).
  // 로그인 직후 페이지 컨텍스트에서 그대로 꺼내 Authorization 헤더로 보낸다. 토큰은 산출물에 남기지 않는다.
  const authed = await page.evaluate(async () => {
    const t = localStorage.getItem('o4o_accessToken');
    const r = await fetch('https://api.neture.co.kr/api/v1/auth/me', { headers: { Authorization: `Bearer ${t}` } });
    return { hasToken: !!t, meStatus: r.status };
  });
  if (!authed.hasToken || authed.meStatus !== 200) throw new Error(`STOP: 로그인 세션 확보 실패 (${JSON.stringify(authed)})`);
  const findings = []; const rows = [];
  let done = 0;
  const chunkSize = 40;
  for (let i = 0; i < pop.length; i += chunkSize) {
    const chunk = pop.slice(i, i + chunkSize);
    const res = await page.evaluate(async ({ items, conc, apiBase }) => {
      const out = [];
      let idx = 0;
      async function worker() {
        while (idx < items.length) {
          const it = items[idx++];
          try {
            const r = await fetch(`${apiBase}/api/v1/public/product-landings/${it.publicKey}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('o4o_accessToken')}` },
            });
            const j = await r.json().catch(() => null);
            const d = j?.data ?? null;
            out.push({
              publicKey: it.publicKey, httpStatus: r.status, code: j?.code ?? null,
              name: d?.product?.name ?? null,
              authRequired: d?.authRequired === true,
              blocked: d?.blocked === true,
              languages: d?.languages ?? null,
              hasCanonical: d?.description?.hasCanonical === true,
              contentLength: (d?.description?.content || '').length,
            });
          } catch (e) {
            out.push({ publicKey: it.publicKey, httpStatus: 0, error: String(e).slice(0, 120) });
          }
        }
      }
      await Promise.all(Array.from({ length: conc }, worker));
      return out;
    }, { items: chunk.map((r) => ({ publicKey: r.publicKey })), conc: CONC, apiBase: API_BASE });

    const byKey = new Map(chunk.map((r) => [r.publicKey, r]));
    for (const r of res) {
      const exp = byKey.get(r.publicKey);
      const add = (verdict, detail) => findings.push({ publicKey: r.publicKey, masterId: exp.masterId, verdict, detail });
      if (r.httpStatus !== 200) add('LOAD_FAILURE', `http=${r.httpStatus} code=${r.code ?? r.error ?? ''}`);
      else {
        if (r.authRequired) add('ACCESS_DEFECT', '로그인 세션인데 authRequired');
        else if (r.blocked) add('ACCESS_DEFECT', 'blocked');
        else {
          if ((r.name || '') !== exp.productName) add('WRONG_PRODUCT', `api="${r.name}" db="${exp.productName}"`);
          const langs = (r.languages || []).slice().sort().join(',');
          if (langs !== 'ko') add('LANGUAGE_EXPOSURE_DEFECT', `languages=[${langs}]`);
          if (!r.hasCanonical || r.contentLength < 200) add('EMPTY_SECTION', `hasCanonical=${r.hasCanonical} len=${r.contentLength}`);
        }
      }
      rows.push({ ...r, masterId: exp.masterId, expectedName: exp.productName });
    }
    done += chunk.length;
    if (done % 1000 < chunkSize) process.stderr.write(`api ${done}/${pop.length} findings=${findings.length}\n`);
  }
  await browser.close();

  const byVerdict = findings.reduce((a, f) => ({ ...a, [f.verdict]: (a[f.verdict] ?? 0) + 1 }), {});
  const out = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1',
    step: 'h1-audit-api',
    origin: ORIGIN,
    population: pop.length,
    anonAccessGate: anonGate,
    byVerdict,
    productsWithFindings: new Set(findings.map((f) => f.publicKey)).size,
    contentLength: {
      min: Math.min(...rows.filter((r) => r.contentLength).map((r) => r.contentLength)),
      max: Math.max(...rows.map((r) => r.contentLength || 0)),
    },
    dbWrites: 0,
    result: findings.length === 0 && anonGate.authRequired && !anonGate.contentLeaked ? 'PASS' : 'REVIEW',
  };
  fs.writeFileSync(path.join(RESULTS, 'h1-audit-api-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'h1-audit-api-findings.jsonl'), findings.map((f) => JSON.stringify(f)).join('\n') + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
