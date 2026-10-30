import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateDisposableFixtureUrl } from './disposable-postgres-fixture.js';

function fixtureUrl(port = '55439', database = 'o4o_main_automation_integration') {
  const url = new URL(`postgresql://127.0.0.1:${port}/${database}`);
  url.username = 'fixture'; url.password = randomUUID();
  return url;
}

test('each fixture accepts only its own explicit loopback database and port', () => {
  const main = fixtureUrl(), supplier = fixtureUrl('55432', 'o4o_supplier_store_integration');
  assert.equal(validateDisposableFixtureUrl('main-automation', main.href).port, '55439');
  assert.equal(validateDisposableFixtureUrl('supplier-store', supplier.href).port, '55432');
  assert.throws(() => validateDisposableFixtureUrl('main-automation', supplier.href), /Refusing/);
  assert.throws(() => validateDisposableFixtureUrl('supplier-store', main.href), /Refusing/);
});

test('remote/default databases, URL options and missing credentials are refused before connecting', () => {
  for (const change of [
    (url: URL) => { url.hostname = 'example.invalid'; },
    (url: URL) => { url.pathname = '/postgres'; },
    (url: URL) => { url.port = '5432'; },
    (url: URL) => { url.search = '?sslmode=disable'; },
    (url: URL) => { url.hash = '#unexpected'; },
    (url: URL) => { url.username = ''; },
    (url: URL) => { url.password = ''; },
  ]) {
    const url = fixtureUrl(); change(url);
    assert.throws(() => validateDisposableFixtureUrl('main-automation', url.href), /Refusing/);
  }
  assert.throws(() => validateDisposableFixtureUrl('main-automation', fixtureUrl().href.replace('postgresql:', 'https:')), /Refusing/);
  assert.throws(() => validateDisposableFixtureUrl('main-automation', undefined), /required/);
});
