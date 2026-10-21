import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { buildPilot, outputRoot, profile, restorePosition } from './build.mjs';
import { loginInputs, parserInputs, validDraft } from './fixtures.mjs';

// A synthetic local page exercising the actual built functions. Never connects to O4O.
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Neture local build comparison</title>
<style>body{font-family:sans-serif;max-width:42rem;margin:1rem}input,textarea{box-sizing:border-box;width:100%}textarea{height:12rem}output{display:block;overflow-wrap:anywhere}button{min-height:44px;margin:1rem 0}</style>
<h1>로컬 비교 시험</h1><label>로그인 복귀 경로<input id="return-path"></label><button id="resolve">경로 확인</button><output id="path"></output>
<label>합성 상품 초안<textarea id="draft"></textarea></label><button id="parse">초안 확인</button><output id="result"></output>
<script type="module" src="/harness.js"></script></html>`;
const harness = `
const kind = new URLSearchParams(location.search).get('kind');
if (!['baseline','obfuscated'].includes(kind)) throw new Error('Invalid comparison kind');
const importStarted = performance.now();
const api = await import('/'+kind+'/pilot.js');
window.pilotImportMs = performance.now() - importStarted;
document.querySelector('#resolve').onclick = () => {
  const value = document.querySelector('#return-path').value;
  document.querySelector('#path').textContent = api.resolveLoginReturnPath(null, '?returnTo='+encodeURIComponent(value)) ?? 'REJECTED';
};
document.querySelector('#parse').onclick = () => {
  document.querySelector('#result').textContent = JSON.stringify(api.parseSupplierProductCandidateDraft(document.querySelector('#draft').value));
};
window.pilotApi = api;
`;
const artifact = await buildPilot();
const server = createServer(async (request, response) => {
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'");
  response.setHeader('Cache-Control', 'no-store');
  const pathname = new URL(request.url, 'http://localhost').pathname;
  // Exact public allowlist: maps, manifest and source files are never served.
  if (pathname === '/') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(html);
  } else if (pathname === '/harness.js') {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    response.end(harness);
  } else if (['/baseline/pilot.js', '/obfuscated/pilot.js'].includes(pathname)) {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    response.end(await readFile(path.join(outputRoot, 'public', pathname.slice(1))));
  } else {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const errors = [];
const externalRequests = [];
const writes = [];
const results = [];
let browser;
try {
  browser = await chromium.launch({
    ...(process.env.PILOT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PILOT_CHROMIUM_EXECUTABLE } : {}),
  });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    await context.route('**/*', async (route) => {
      const request = route.request();
      if (new URL(request.url()).origin !== origin) { externalRequests.push(request.url()); return route.abort(); }
      if (request.method() !== 'GET') { writes.push(request.method()); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    const corpusResults = {};
    for (const kind of ['baseline', 'obfuscated']) {
      await page.goto(`${origin}/?kind=${kind}`);
      await page.waitForFunction(() => Boolean(window.pilotApi));
      await page.locator('#return-path').fill('/supplier/products?view=draft');
      await page.locator('#resolve').click();
      assert.equal(await page.locator('#path').textContent(), '/supplier/products?view=draft');
      await page.locator('#return-path').fill('//example.invalid');
      await page.locator('#resolve').click();
      assert.equal(await page.locator('#path').textContent(), 'REJECTED');
      await page.locator('#draft').fill(JSON.stringify({ ...validDraft, supplierId: 'synthetic' }));
      await page.locator('#parse').click();
      const parsed = JSON.parse(await page.locator('#result').textContent());
      assert.equal(parsed.ok, true);
      assert.equal(parsed.draft.name, validDraft.name);
      assert.equal('supplierId' in parsed.draft, false);
      await page.locator('#draft').fill('not JSON');
      await page.locator('#parse').click();
      assert.equal(JSON.parse(await page.locator('#result').textContent()).code, 'INVALID_JSON');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      corpusResults[kind] = await page.evaluate(({ loginInputs, parserInputs }) => ({
        login: loginInputs.map((args) => window.pilotApi.resolveLoginReturnPath(...args) ?? null),
        parser: parserInputs.map((input) => window.pilotApi.parseSupplierProductCandidateDraft(input)),
      }), { loginInputs, parserInputs });
      const errorStack = await page.evaluate(() => {
        try { window.pilotApi.parseSupplierProductCandidateDraft({}); } catch (error) { return error.stack; }
      });
      const match = errorStack?.match(/pilot\.js:(\d+):(\d+)/);
      assert.ok(match);
      const maps = kind === 'baseline' ? [artifact.baselineMap] : [artifact.obfuscatedMap, artifact.baselineMap];
      const restored = restorePosition(maps, Number(match[1]) - 1, Number(match[2]) - 1);
      assert.match(restored.originalSource, /supplier-product-authoring\/parse\.ts$/);
      for (const privateUrl of ['/private/manifest.json', '/private/baseline.js.map', '/obfuscated/pilot.js.map']) {
        assert.equal((await page.request.get(origin + privateUrl)).status(), 404);
      }
      results.push({ width: viewport.width, kind, flows: 4, corpusCases: loginInputs.length + parserInputs.length, sourceRestored: true, localImportMs: await page.evaluate(() => window.pilotImportMs) });
    }
    assert.deepEqual(corpusResults.baseline, corpusResults.obfuscated);
    await context.close();
  }

  // Interleave samples after warm-up to reduce ordering/JIT bias. This measures
  // only the selected functions on this machine, not whole-app loading or users.
  const page = await browser.newPage();
  await page.goto(`${origin}/?kind=baseline`);
  const timing = await page.evaluate(async ({ validDraft }) => {
    const baseline = await import('/baseline/pilot.js');
    const obfuscated = await import('/obfuscated/pilot.js');
    const input = JSON.stringify({ ...validDraft, offerDraft: { ...validDraft.offerDraft, consumerDetailDescription: '설명'.repeat(1000) } });
    function sample(api) {
      const start = performance.now();
      let successful = 0;
      for (let i = 0; i < 2000; i++) {
        if (api.parseSupplierProductCandidateDraft(input).ok) successful++;
        api.resolveLoginReturnPath(null, '?returnTo=/supplier/products');
      }
      if (successful !== 2000) throw new Error('Benchmark did not exercise the successful path');
      return performance.now() - start;
    }
    sample(baseline); sample(obfuscated);
    const samples = { baseline: [], obfuscated: [] };
    for (let i = 0; i < 10; i++) {
      for (const kind of i % 2 ? ['obfuscated', 'baseline'] : ['baseline', 'obfuscated']) {
        samples[kind].push(sample(kind === 'baseline' ? baseline : obfuscated));
      }
    }
    const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    return { samples, baselineMedianMs: median(samples.baseline), obfuscatedMedianMs: median(samples.obfuscated), operationsPerSample: 2000 };
  }, { validDraft });
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(writes, []);
  // Pilot budgets only. Crossing one means keep the experiment off, not relax it.
  const gzipDelta = artifact.manifest.obfuscated.gzipBytes - artifact.manifest.baseline.gzipBytes;
  const budgets = {
    compressedGrowth: gzipDelta <= 1024 && gzipDelta / artifact.manifest.baseline.gzipBytes <= 0.20,
    operationLatency: (timing.obfuscatedMedianMs - timing.baselineMedianMs) / timing.operationsPerSample <= 0.1,
  };
  const report = { browser: browser.version(), profile, syntheticOnly: true, results, timing, budgets, errors: errors.length, externalRequests: externalRequests.length, writes: writes.length };
  await writeFile(path.join(outputRoot, 'private/browser-report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
  assert.ok(Object.values(budgets).every(Boolean), 'Pilot exceeded its predefined size/latency budget; leave production unchanged');
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
