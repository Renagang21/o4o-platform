import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCutover, parseProbes, verifyRedirects, validateHosts, settleOperation, safeComputeError, missingFamilyRuleProbes } from './pharmacy-hub-qr-cutover.mjs';

test('API diagnostics retain known permissions but discard raw messages and metadata', () => {
  const error = safeComputeError('POST', 403, { error: { message: 'private token compute.backendServices.use private row', errors: [{ reason: 'forbidden' }], details: [{ metadata: { secret: 'private credential' } }] } });
  assert.match(error.message, /permissions=compute.backendServices.use; reasons=forbidden/);
  assert.doesNotMatch(error.stack, /private/);
});

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
test('retirement applies with real QR and tablet and checks absent families as rules only', async () => {
  const h = harness();
  const active = paths.slice(0, 2);
  const rules = missingFamilyRuleProbes(active);
  const requests = [];
  const result = await runCutover({ ...h.options, probes: active.join('\n'),
    verify: async (actual, rulePaths) => {
      assert.deepEqual(actual, active);
      assert.deepEqual(rulePaths, rules);
      await verifyRedirects(actual, async url => {
        const u = new URL(url); requests.push(u);
        if (u.host === 'pharmacy.neture.co.kr') return new Response(null, { status: 200 });
        return new Response(null, { status: 302, headers: { location: `https://pharmacy.neture.co.kr${u.pathname}${u.search}` } });
      }, undefined, rulePaths);
    } });
  assert.equal(result.activeFamiliesVerified, 2);
  assert.equal(result.ruleOnlyFamiliesVerified, 2);
  assert.equal(requests.filter(u => u.host === 'pharmacy.neture.co.kr').length, 2);
  assert.equal(requests.filter(u => u.host !== 'pharmacy.neture.co.kr').length, 8);
  assert.equal(h.writes.length, 1);
});
test('failed missing-family redirect rule still triggers verified rollback', async () => {
  const h = harness();
  await assert.rejects(runCutover({ ...h.options, probes: paths.slice(0, 2).join('\n'), verify: async () => {
    await verifyRedirects(paths.slice(0, 2), async url => {
      const u = new URL(url);
      if (u.host === 'pharmacy.neture.co.kr') return new Response(null, { status: 200 });
      if (u.pathname.includes('__ph_retirement_rule_check__')) return new Response(null, { status: 404 });
      return new Response(null, { status: 302, headers: { location: `https://pharmacy.neture.co.kr${u.pathname}${u.search}` } });
    }, undefined, missingFamilyRuleProbes(paths.slice(0, 2)));
  } }), /302 redirect/);
  assert.equal(h.writes.length, 2);
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
test('insufficient remaining job budget rejects apply before submission', async () => {
  const h = harness();
  await assert.rejects(runCutover({ ...h.options, beforeWrite: async () => { throw new Error('budget exhausted'); } }), /budget exhausted/);
  assert.equal(h.writes.length, 0);
});
test('transient operation-read failures are reconciled until terminal success', async () => {
  let calls = 0;
  let clock = 0;
  await settleOperation('operation-1', async name => {
    assert.equal(name, 'operation-1');
    if (++calls === 1) throw new Error('transient network failure');
    return { status: calls === 2 ? 'RUNNING' : 'DONE' };
  }, { now: () => clock, sleep: async ms => { clock += ms; } });
  assert.equal(calls, 3);
});
test('pending server operation blocks unchanged-map assumptions and rollback', async () => {
  const h = harness();
  const pending = Object.assign(new Error('still pending'), { pendingOperation: true });
  await assert.rejects(runCutover({ ...h.options, replace: async () => { throw pending; } }), /still pending/);
  assert.equal(h.writes.length, 0);
  let clock = 0;
  await assert.rejects(settleOperation('pending', async () => ({ status: 'RUNNING' }), { now: () => clock, sleep: async ms => { clock += ms; }, timeoutMs: 4000 }), error => error.pendingOperation === true);
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
  assert.deepEqual(parseProbes(paths.slice(0, 2).join('\n')), paths.slice(0, 2));
  assert.throws(() => parseProbes([paths[0], paths[1], paths[0]].join('\n')));
  assert.throws(() => parseProbes([paths[0], paths[1], '/other/x'].join('\n')));
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
