/** Real IndexedDB cross-tab regression. No credentials, network APIs or user documents. */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const server = await createServer({ root, configFile: false, appType: 'custom', logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
server.middlewares.use((req, res, next) => {
  if (req.url !== '/') return next();
  res.setHeader('Content-Type', 'text/html');
  res.end('<!doctype html><html lang="ko"><body>Isolated manual storage test</body></html>');
});
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  assert(address && typeof address !== 'string');
  browser = await chromium.launch({ executablePath: process.env.O4O_BROWSER_EXECUTABLE || undefined, headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const a = await context.newPage(), b = await context.newPage();
  const origin = `http://127.0.0.1:${address.port}`;
  await Promise.all([a.goto(origin), b.goto(origin)]);
  const modulePath = '/services/web-neture/src/lib/manuals/storage.ts';
  const initial = { id: 'a'.repeat(64), title: 'Synthetic manual', program: 'Synthetic', importedAt: '2026-10-27', pages: [{ page: 1, text: 'Synthetic instructions' }], reports: {}, uses: 0 };
  await a.evaluate(async ({ modulePath, initial }) => { const { updateManuals } = await import(modulePath); await updateManuals('test-owner', () => [initial]); }, { modulePath, initial });
  await b.evaluate(async modulePath => { const { loadManuals } = await import(modulePath); window.staleManuals = await loadManuals('test-owner'); }, modulePath);
  await a.evaluate(async ({ modulePath, initial }) => {
    const { updateManuals } = await import(modulePath);
    await updateManuals('test-owner', latest => [...latest.map(doc => ({ ...doc, reports: { '1': { state: 'differs', note: 'Keep this other-tab correction' } } })), { ...initial, id: 'b'.repeat(64) }]);
  }, { modulePath, initial });
  const updated = await b.evaluate(async modulePath => {
    const { updateManuals } = await import(modulePath);
    return updateManuals('test-owner', latest => latest.map(doc => doc.id === 'a'.repeat(64) ? { ...doc, uses: doc.uses + 1 } : doc));
  }, modulePath);
  assert.equal(updated.length, 2);
  assert.equal(updated[0].reports['1'].note, 'Keep this other-tab correction');
  await Promise.all([a, b].map(page => page.evaluate(async modulePath => {
    const { updateManuals } = await import(modulePath);
    for (let i = 0; i < 20; i++) await updateManuals('test-owner', latest => latest.map(doc => doc.id === 'a'.repeat(64) ? { ...doc, uses: doc.uses + 1 } : doc));
  }, modulePath)));
  await a.evaluate(async modulePath => { const { updateManuals } = await import(modulePath); await updateManuals('test-owner', latest => latest.filter(doc => doc.id !== 'b'.repeat(64))); }, modulePath);
  const final = await b.evaluate(async modulePath => {
    const { updateManuals, loadManuals } = await import(modulePath);
    await updateManuals('test-owner', latest => latest.map(doc => ({ ...doc, uses: doc.uses + 1 })));
    return { own: await loadManuals('test-owner'), other: await loadManuals('different-owner') };
  }, modulePath);
  assert.equal(final.own.length, 1);
  assert.equal(final.own[0].uses, 42);
  assert.equal(final.own[0].reports['1'].state, 'differs');
  assert.equal(final.other.length, 0);
  console.log('PASS: real IndexedDB preserves other-tab additions/corrections/deletions, 42 atomic increments, and owner isolation');
  await context.close();
} finally {
  if (browser) await browser.close();
  await server.close();
}
