import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareQrRedirect, prepareHostRetirement, printedQrPaths } from './pharmacy-hub-qr-redirect.mjs';
test('full host retirement removes all PH backend routes but preserves other matchers', () => {
  const draft = prepareHostRetirement(original);
  assert.deepEqual(draft.pathMatchers[0], original.pathMatchers[0]);
  const retired = draft.pathMatchers[1];
  assert.equal(retired.defaultService, undefined);
  assert.deepEqual(retired.pathRules, [{ paths: ['/terms', '/terms/'], urlRedirect: { ...retired.defaultUrlRedirect, pathRedirect: '/policy' } }]);
  assert.doesNotMatch(JSON.stringify(retired), /ph-old-service|backend-pharmacy-hub-web/);
  assert.equal(retired.defaultUrlRedirect.hostRedirect, 'pharmacy.neture.co.kr');
  assert.equal(retired.defaultUrlRedirect.stripQuery, false);
  assert.equal(retired.defaultUrlRedirect.redirectResponseCode, 'FOUND');
  assert.deepEqual(prepareHostRetirement(prepareQrRedirect(original)), draft);
});
const original = { name: 'o4o-global-lb', fingerprint: 'export-only', hostRules: [{ hosts: ['hospital.neture.co.kr'], pathMatcher: 'hospital' }], pathMatchers: [
  { name: 'hospital', defaultService: 'hospital-service' },
  { name: 'path-matcher-pharmacy-hub', defaultService: 'backend-pharmacy-hub-web', pathRules: [{ paths: ['/news/*'], service: 'ph-old-service' }] },
] };
test('302 changes only the four printed-QR routes, preserving the old server and other services', () => {
  const draft = prepareQrRedirect(original);
  assert.equal(draft.fingerprint, undefined);
  assert.deepEqual(draft.hostRules, original.hostRules);
  assert.deepEqual(draft.pathMatchers[0], original.pathMatchers[0]);
  assert.equal(draft.pathMatchers[1].defaultService, 'backend-pharmacy-hub-web');
  assert.deepEqual(draft.pathMatchers[1].pathRules[0], original.pathMatchers[1].pathRules[0]);
  const rule = draft.pathMatchers[1].pathRules[1];
  assert.deepEqual(rule.paths, printedQrPaths);
  assert.deepEqual(rule.urlRedirect, { hostRedirect: 'pharmacy.neture.co.kr', httpsRedirect: true, redirectResponseCode: 'FOUND', stripQuery: false });
  assert.equal(original.pathMatchers[1].pathRules.length, 1);
});
test('conflicting, missing or already retired routes fail before producing an import draft', () => {
  assert.throws(() => prepareQrRedirect({ pathMatchers: [] }));
  const conflicting = structuredClone(original); conflicting.pathMatchers[1].pathRules.push({ paths: ['/*'] });
  assert.throws(() => prepareQrRedirect(conflicting));
  assert.throws(() => prepareQrRedirect(prepareQrRedirect(original)));
});
