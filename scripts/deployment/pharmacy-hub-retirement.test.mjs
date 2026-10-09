import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preparePharmacyHubRetirement, isPharmacyHubHost } from './pharmacy-hub-retirement.mjs';

const fixture = () => ({
  name: 'shared-lb', fingerprint: 'snapshot', defaultService: 'backend-main',
  hostRules: [
    { hosts: ['pharmacyhub.co.kr', 'www.pharmacyhub.co.kr'], pathMatcher: 'ph' },
    { hosts: ['store.neture.co.kr'], pathMatcher: 'store' },
  ],
  pathMatchers: [{ name: 'ph', defaultService: 'backend-ph' }, { name: 'store', defaultService: 'backend-store' }],
});

test('PH hosts and their orphan matcher are removed together, with no redirect; other routing is preserved', () => {
  const input = fixture();
  const result = preparePharmacyHubRetirement(input);
  assert.deepEqual(result.removedHosts, ['pharmacyhub.co.kr', 'www.pharmacyhub.co.kr']);
  assert.deepEqual(result.map.hostRules, [input.hostRules[1]]);
  assert.deepEqual(result.map.pathMatchers, [input.pathMatchers[1]]);
  assert.deepEqual(result.unreferencedBackendCandidates, ['backend-ph']);
  assert.equal(result.map.defaultService, 'backend-main');
  assert.equal(result.map.fingerprint, undefined);
  assert.equal(input.hostRules.length, 2);
  assert.equal(JSON.stringify(result.map).includes('urlRedirect'), false);
});

test('a mixed host rule retains the other host and its shared matcher', () => {
  const input = fixture();
  input.hostRules[0].hosts.push('unrelated.example');
  const result = preparePharmacyHubRetirement(input);
  assert.deepEqual(result.map.hostRules[0].hosts, ['unrelated.example']);
  assert.deepEqual(result.sharedPathMatchers, ['ph']);
  assert.deepEqual(result.unreferencedBackendCandidates, []);
  assert.equal(result.map.pathMatchers.length, 2);
});

test('PH validation tests are removed before import while other host tests remain unchanged', () => {
  const input = fixture();
  const storeTest = { host: 'store.neture.co.kr', path: '/qr', service: 'backend-store' };
  input.tests = [
    { host: 'pharmacyhub.co.kr', path: '/', service: 'backend-ph' },
    { host: 'WWW.PHARMACYHUB.CO.KR', path: '/store', service: 'backend-ph' },
    { host: 'legacy.pharmacyhub.co.kr', path: '/tablet', service: 'backend-ph' },
    storeTest,
  ];
  const result = preparePharmacyHubRetirement(input);
  assert.deepEqual(result.removedTestHosts, ['pharmacyhub.co.kr', 'WWW.PHARMACYHUB.CO.KR', 'legacy.pharmacyhub.co.kr']);
  assert.deepEqual(result.map.tests, [storeTest]);
  assert.deepEqual(result.unreferencedBackendCandidates, ['backend-ph']);
  assert.equal(input.tests.length, 4);
  assert.deepEqual(preparePharmacyHubRetirement(result.map).map, result.map);
});

test('validation expectations do not count as routing references and invalid tests fail closed', () => {
  const input = fixture();
  input.tests = [{ host: 'unrelated.example', path: '/', service: 'backend-ph' }];
  const result = preparePharmacyHubRetirement(input);
  assert.deepEqual(result.map.tests, input.tests);
  assert.deepEqual(result.unreferencedBackendCandidates, ['backend-ph']);
  assert.deepEqual(result.sharedBackendServices, []);
  input.tests = {};
  assert.throws(() => preparePharmacyHubRetirement(input), /tests must be an array/);
});

test('a PH backend referenced by remaining routing is not a deletion candidate', () => {
  const input = fixture();
  input.pathMatchers[1].defaultService = 'backend-ph';
  const result = preparePharmacyHubRetirement(input);
  assert.deepEqual(result.unreferencedBackendCandidates, []);
  assert.deepEqual(result.sharedBackendServices, ['backend-ph']);
});

test('weighted backend references also protect shared resources', () => {
  const input = fixture();
  input.pathMatchers[1].routeRules = [{ priority: 1, routeAction: { weightedBackendServices: [{ backendService: 'backend-ph', weight: 100 }] } }];
  assert.deepEqual(preparePharmacyHubRetirement(input).unreferencedBackendCandidates, []);
});

test('missing or duplicate target matchers fail before generating an importable map', () => {
  const input = fixture();
  input.pathMatchers = input.pathMatchers.slice(1);
  assert.throws(() => preparePharmacyHubRetirement(input), /Expected one path matcher/);
  input.pathMatchers = [fixture().pathMatchers[0], fixture().pathMatchers[0]];
  assert.throws(() => preparePharmacyHubRetirement(input), /Expected one path matcher/);
});

test('PH subdomains match exactly without capturing similarly named domains; repeated preparation is idempotent', () => {
  assert.equal(isPharmacyHubHost('*.pharmacyhub.co.kr'), true);
  assert.equal(isPharmacyHubHost('PHARMACYHUB.CO.KR'), true);
  assert.equal(isPharmacyHubHost('pharmacyhub.co.kr.example'), false);
  assert.equal(isPharmacyHubHost('otherpharmacyhub.co.kr'), false);
  const first = preparePharmacyHubRetirement(fixture());
  assert.deepEqual(preparePharmacyHubRetirement(first.map).map, first.map);
});
