import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectResources, retireResources, deletionPermissions } from './pharmacy-hub-resource-retirement.mjs';

const targets = ['backend-pharmacy-hub-web', 'neg-pharmacy-hub-web', 'pharmacy-hub-web'];
const negLink = 'https://www.googleapis.com/compute/v1/projects/netureyoutube/regions/asia-northeast3/networkEndpointGroups/neg-pharmacy-hub-web';
function inventory() {
  return {
    applicationMap: { phMatchers: [{ defaultUrlRedirect: { hostRedirect: 'pharmacy.neture.co.kr', redirectResponseCode: 'FOUND', stripQuery: false } }] },
    urlMaps: [{ name: 'o4o-global-lb', phReferences: false }],
    backends: [{ name: targets[0], region: 'global', groups: [negLink] }, { name: 'backend-store-web', region: 'global', groups: ['other-neg'] }],
    negs: [{ name: targets[1], selfLink: negLink, type: 'SERVERLESS', cloudRunService: targets[2] }], runPresent: true,
  };
}
const http = () => ({ checks: Array.from({ length: 12 }, () => ({ status: 302, hostMatch: true, pathMatch: true, queryMatch: true, schemeMatch: true })) });

test('only detached fixed PH resources are proposed for retirement', () => {
  assert.deepEqual(inspectResources(inventory(), http()), targets);
});
test('a remaining reference in any URL map blocks resource deletion', () => {
  const cloud = inventory(); cloud.urlMaps.push({ name: 'another-map', phReferences: true });
  assert.throws(() => inspectResources(cloud, http()), /not completely detached/);
});
test('another backend or unexpected NEG ownership blocks deletion', () => {
  const cloud = inventory(); cloud.backends[1].groups = [negLink];
  assert.throws(() => inspectResources(cloud, http()), /Another backend/);
  cloud.backends[1].groups = ['other-neg']; cloud.negs.push({ ...cloud.negs[0], name: 'shared-other-neg' });
  assert.throws(() => inspectResources(cloud, http()), /Unexpected PH NEG/);
});
test('a PH backend containing an unrelated group is never deleted', () => {
  const cloud = inventory(); cloud.backends[0].groups.push('shared-other-neg');
  assert.throws(() => inspectResources(cloud, http()), /Unexpected PH backend/);
});
test('failed or incomplete redirect checks block all deletion', () => {
  const result = http(); result.checks[0].queryMatch = false;
  assert.throws(() => inspectResources(inventory(), result), /not verified/);
  result.checks = result.checks.slice(1);
  assert.throws(() => inspectResources(inventory(), result), /not verified/);
});
function harness() {
  let live = [...targets];
  const removed = [];
  let verified = 0;
  return { removed, options: { mode: 'apply', permissions: async () => deletionPermissions,
    read: async () => [...live], verify: async () => { verified++; },
    remove: async target => { removed.push(target); live = live.filter(item => item !== target); },
  }, set: value => { live = value; }, verified: () => verified };
}
test('plan reports exact missing permissions without deleting anything', async () => {
  const h = harness();
  const plan = await retireResources({ ...h.options, mode: 'plan', permissions: async () => ['run.services.delete'] });
  assert.deepEqual(plan.targets, targets);
  assert.ok(plan.missingPermissions.includes('compute.backendServices.delete'));
  assert.deepEqual(h.removed, []);
});
test('missing permission or failed actual QR/tablet validation blocks all writes', async () => {
  const h = harness();
  await assert.rejects(retireResources({ ...h.options, permissions: async () => [] }), /deletion blocked/);
  await assert.rejects(retireResources({ ...h.options, verify: async () => { throw new Error('QR unavailable'); } }), /QR unavailable/);
  assert.deepEqual(h.removed, []);
});
test('apply deletes in dependency order and verifies absence and QR after deletion', async () => {
  const h = harness();
  const result = await retireResources(h.options);
  assert.deepEqual(h.removed, targets);
  assert.equal(result.applied, true);
  assert.equal(result.databaseWrites, false);
  assert.ok(h.verified() >= 5);
});
test('fresh reference failures and time budget failures prevent the next delete', async () => {
  const h = harness(); let reads = 0;
  await assert.rejects(retireResources({ ...h.options, read: async () => {
    if (++reads > 1) throw new Error('new shared reference');
    return targets;
  } }), /new shared reference/);
  await assert.rejects(retireResources({ ...h.options, beforeWrite: () => { throw new Error('budget'); } }), /budget/);
  assert.deepEqual(h.removed, []);
});
test('unconfirmed deletion stops and rerunning resumes only remaining targets', async () => {
  const h = harness();
  await assert.rejects(retireResources({ ...h.options, remove: async () => {} }), /not confirmed/);
  h.set([targets[1], targets[2]]);
  await retireResources(h.options);
  assert.deepEqual(h.removed, [targets[1], targets[2]]);
});
test('a resumed retirement needs permissions only for remaining resources', async () => {
  const h = harness(); h.set([targets[2]]);
  await retireResources({ ...h.options, permissions: async () => ['run.services.delete'] });
  assert.deepEqual(h.removed, [targets[2]]);
  await retireResources({ ...h.options, permissions: async () => [] });
  assert.deepEqual(h.removed, [targets[2]]);
});
test('resources appearing after the initial plan are preserved', async () => {
  const h = harness(); let reads = 0;
  await assert.rejects(retireResources({ ...h.options, read: async () => ++reads === 1 ? [targets[2]] : targets }), /appeared after inventory/);
  assert.deepEqual(h.removed, []);
});
test('a deleted resource reappearing prevents subsequent deletions', async () => {
  const h = harness(); let reads = 0;
  const read = h.options.read;
  await assert.rejects(retireResources({ ...h.options, read: async () => {
    if (++reads === 4) return targets; // Backend recreated before NEG deletion.
    return read();
  } }), /appeared after inventory/);
  assert.deepEqual(h.removed, [targets[0]]);
});

test('workflow rejects mixed resource operations, foreign actors and frozen writes before authentication', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/pharmacyhub-qr-cutover.yml', import.meta.url), 'utf8');
  const gate = workflow.match(/- name: Enforce production write gate\n\s+run: \|\n([\s\S]*?)\n\s+- uses:/)[1]
    .split('\n').map(line => line.replace(/^          /, '')).join('\n');
  const directory = mkdtempSync(join(tmpdir(), 'ph-resource-gate-'));
  try {
    const env = { ...process.env, GITHUB_ENV: join(directory, 'env'), RUNNER_TEMP: directory,
      GITHUB_REF: 'refs/heads/main', CUTOVER_MODE: 'plan', DEPLOY_FREEZE: 'false',
      WORKFLOW_ACTOR: 'owner', REPOSITORY_OWNER: 'owner', RESOURCE_RETIREMENT: 'true',
      RETIREMENT_INVENTORY: 'false', RETIRE_PH_HOST: 'false', DEMO_CENSUS_FLAG: 'false',
      DEMO_RELINK_FLAG: 'false', DEMO_CLEANUP_FLAG: 'false', COPY_CLEANUP_FLAG: 'false' };
    const execute = overrides => spawnSync('bash', ['-c', gate], { env: { ...env, ...overrides }, encoding: 'utf8' }).status;
    assert.equal(execute({}), 0);
    for (const flag of ['RETIREMENT_INVENTORY', 'RETIRE_PH_HOST', 'DEMO_CENSUS_FLAG', 'DEMO_RELINK_FLAG', 'DEMO_CLEANUP_FLAG', 'COPY_CLEANUP_FLAG']) {
      assert.equal(execute({ [flag]: 'true' }), 1, flag);
    }
    assert.equal(execute({ WORKFLOW_ACTOR: 'another-actor' }), 1);
    assert.equal(execute({ CUTOVER_MODE: 'apply', DEPLOY_FREEZE: 'true' }), 1);
    assert.equal(execute({ GITHUB_REF: 'refs/heads/another-branch' }), 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
