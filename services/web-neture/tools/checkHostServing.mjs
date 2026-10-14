/** Real HTTP regression smoke. Run after Docker startup; no application API writes.
 * node services/web-neture/tools/checkHostServing.mjs http://127.0.0.1:8080
 * Optional second argument: the dist directory used to build the running image.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request as httpRequest } from 'node:http';

const base = process.argv[2] || 'http://127.0.0.1:8080';
assert.ok(new URL(base).protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Use a local HTTP container endpoint');
const dist = process.argv[3] || resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const hosts = ['neture.co.kr', 'supplier.neture.co.kr', 'funding.neture.co.kr', 'community.neture.co.kr'];
let count = 0;
const check = (condition, message) => { assert.ok(condition, message); count++; };
// Node fetch may replace Host with the URL host; use the HTTP transport explicitly.
const request = (host, path, options = {}) => new Promise((resolveRequest, reject) => {
  const req = httpRequest(new URL(path, base), {
    ...options, headers: { Host: host, ...options.headers },
  }, res => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => resolveRequest(new Response(
      [204, 304].includes(res.statusCode) || options.method === 'HEAD' ? null : Buffer.concat(chunks),
      { status: res.statusCode, headers: res.headers },
    )));
    res.on('error', reject);
  });
  req.setTimeout(10000, () => req.destroy(new Error('Container HTTP smoke timeout')));
  req.on('error', reject);
  req.end();
});

for (const [index, host] of hosts.entries()) {
  const profile = index === 0 ? 'main' : host.split('.')[0];
  const expected = await readFile(resolve(dist, `__seo/${profile}-home.html`), 'utf8');
  for (const path of ['/', '/?utm_source=smoke', '/index.html']) {
    const response = await request(host, path);
    check(response.status === 200 && await response.text() === expected, `${host}${path}: host HTML`);
    check(response.headers.get('cache-control') === 'no-cache' && response.headers.get('vary')?.includes('Host'), `${host}${path}: HTML cache`);
  }
  for (const path of ['/supplier/products/new', '/market-trial/fixture', '/communities/fixture/forum', '/login', '/missing-route']) {
    const response = await request(host, path);
    const body = await response.text();
    check(response.status === 200 && body.includes('<div id="root">') && !body.includes('rel="canonical"') && !body.includes('property="og:url"'), `${host}${path}: SPA without home URL metadata`);
  }
  for (const path of ['/assets/missing.js', '/missing.css', '/missing.png', '/__seo/supplier-home.html', '/__seo/main-spa.html']) {
    const response = await request(host, path);
    check(response.status === 404 && !(await response.text()).includes('<div id="root">'), `${host}${path}: real 404`);
  }
  const head = await request(host, '/', { method: 'HEAD' });
  check(head.status === 200 && await head.text() === '', `${host}: HEAD`);
  const assets = [...expected.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]);
  check(assets.length > 0, `${host}: bundle references`);
  for (const asset of assets) {
    const response = await request(host, asset);
    const mime = response.headers.get('content-type') || '';
    check(response.status === 200 && mime.includes(asset.endsWith('.js') ? 'javascript' : 'text/css') && response.headers.get('cache-control')?.includes('immutable'), `${host}${asset}: MIME/cache`);
    await response.arrayBuffer();
    const range = await request(host, asset, { headers: { Range: 'bytes=0-9' } });
    check(range.status === 206 && (await range.arrayBuffer()).byteLength === 10, `${host}${asset}: range`);
    const cached = await request(host, asset, { headers: { 'If-None-Match': response.headers.get('etag') } });
    check(cached.status === 304, `${host}${asset}: ETag`);
  }
  const compressed = await request(host, assets[0], { headers: { 'Accept-Encoding': 'gzip' } });
  check(compressed.status === 200 && compressed.headers.get('content-encoding') === 'gzip', `${host}: gzip`);
  await compressed.arrayBuffer();
}
for (const host of ['localhost', 'www.neture.co.kr', 'unknown.example', 'supplier.neture.co.kr.evil.example']) {
  const response = await request(host, '/');
  check(response.status === 200 && (await response.text()).includes('<title>O4O '), `${host}: default identity`);
}
console.info(`Host serving smoke: ${count} assertions passed`);
