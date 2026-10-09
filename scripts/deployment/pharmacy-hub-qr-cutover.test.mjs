import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCutover, parseProbes, verifyRedirects, validateHosts } from './pharmacy-hub-qr-cutover.mjs';

const paths = ['/qr/active', '/tablet/store?tabletId=test&language=ko', '/multilingual-products/product?locale=ko', '/foreign-visitor/affiliate/active'];
const original = () => ({
  name: 'o4o-global-lb', fingerprint: 'v1',
  hostRules: [{ hosts: ['pharmacyhub.co.kr', 'www.pharmacyhub.co.kr'], pathMatcher: 'path-matcher-pharmacy-hub' }],
  pathMatchers: [{ name: 'path-matcher-pharmacy-hub', defaultService: 'backend-pharmacy-hub-web' }],
});
function harness() {
  let live = original();
  const writes = [];
  const saved = [];
  return {
    writes, saved,
    options: {
      mode: 'apply', probes: paths.join('\n'),
      read: async () => structuredClone(live), validate: async () => {},
      replace: async (draft, fingerprint) => {
        assert.equal(fingerprint, live.fingerprint);
        writes.push(structuredClone(draft));
        live = { ...structuredClone(draft), fingerprint: `v${writes.length + 1}` };
      },
      verify: async () => {}, save: async (name, data) => saved.push({ name, data }),
    },
    change: fn => { live = fn(live); },
  };
}
test('plan validates and saves a backup without making a write', async () => {
  const h = harness();
  await runCutover({ ...h.options, mode: 'plan', probes: '' });
  assert.equal(h.writes.length, 0);
  assert.deepEqual(h.saved.map(s => s.name), ['before.json', 'draft.json']);
});
test('apply preserves unrelated configuration and checks real paths', async () => {
  const h = harness();
  const result = await runCutover({ ...h.options, verify: async actual => assert.deepEqual(actual, paths) });
  assert.equal(result.httpVerified, true);
  assert.equal(h.writes.length, 1);
  assert.deepEqual(h.writes[0].hostRules, original().hostRules);
  assert.equal(h.writes[0].pathMatchers[0].defaultService, 'backend-pharmacy-hub-web');
});
test('verification failure restores and verifies the original configuration', async () => {
  const h = harness();
  await assert.rejects(runCutover({ ...h.options, verify: async () => { throw new Error('bad redirect'); } }), /bad redirect/);
  assert.equal(h.writes.length, 2);
  assert.deepEqual(h.writes[1].pathMatchers, original().pathMatchers);
  assert.equal(h.saved.at(-1).name, 'rollback.json');
});
test('concurrent changes before apply prevent any write', async () => {
  const h = harness();
  await assert.rejects(runCutover({ ...h.options, validate: async () => h.change(map => ({ ...map, fingerprint: 'external' })) }), /changed after inventory/);
  assert.equal(h.writes.length, 0);
});
test('unavailable Neture targets prevent any write', async () => {
  const h = harness();
  await assert.rejects(runCutover({ ...h.options, preflight: async () => { throw new Error('target unavailable'); } }), /target unavailable/);
  assert.equal(h.writes.length, 0);
});
test('concurrent changes during verification prevent destructive rollback', async () => {
  const h = harness();
  await assert.rejects(runCutover({ ...h.options, verify: async () => {
    h.change(map => ({ ...map, description: 'another operator change' }));
    throw new Error('verification failed');
  } }), /rollback blocked/);
  assert.equal(h.writes.length, 1);
});
test('unrelated hosts and missing active probe families fail closed', () => {
  const map = original(); map.hostRules[0].hosts.push('another-service.example');
  assert.throws(() => validateHosts(map));
  assert.throws(() => parseProbes(paths.slice(1).join('\n')));
  assert.throws(() => parseProbes(paths.map(p => p.startsWith('/qr/') ? '//outside.example/qr/x' : p).join('\n')));
  assert.deepEqual(parseProbes(paths.join('\n')), paths);
});
test('both root and www must return 302 with the original path and query intact', async () => {
  let calls = 0;
  await verifyRedirects(paths, async url => {
    calls++;
    const u = new URL(url);
    if (u.host === 'pharmacy.neture.co.kr') return new Response(null, { status: 200 });
    return new Response(null, { status: 302, headers: { location: `https://pharmacy.neture.co.kr${u.pathname}${u.search}` } });
  });
  assert.equal(calls, 12);
  await assert.rejects(verifyRedirects(paths, async () => new Response(null, { status: 200 })), /302 redirect/);
  await assert.rejects(verifyRedirects(paths, async () => new Response(null, { status: 404 })), /HTTP 200/);
});
