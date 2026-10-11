import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectResources, retireResources, deletionPermissions, assertProductionIdle } from './pharmacy-hub-resource-retirement.mjs';

test('production gate allows its own run and read-only CI but blocks running and queued deployments', async () => {
  const self = { id: 10, path: '.github/workflows/pharmacyhub-qr-cutover.yml', status: 'in_progress' };
  const ci = { id: 11, path: '.github/workflows/ci-pipeline.yml', status: 'in_progress' };
  await assertProductionIdle(10, async () => ({ total_count: 2, workflow_runs: [self, ci] }));
  for (const workflow of ['promote.yml', 'delivery.yml', 'deploy-api.yml', 'deploy-admin.yml', 'deploy-web-services.yml', 'pharmacyhub-qr-cutover.yml']) {
    for (const status of ['in_progress', 'queued', 'pending', 'waiting', 'requested']) {
      await assert.rejects(assertProductionIdle(10, async queried => queried === status
        ? { total_count: 1, workflow_runs: [{ id: 12, path: `.github/workflows/${workflow}`, status }] }
        : { total_count: 0, workflow_runs: [] }), /write gate blocked/);
    }
  }
});
test('a different caller referencing a production reusable workflow is blocked', async () => {
  await assert.rejects(assertProductionIdle(10, async () => ({ total_count: 1, workflow_runs: [{
    id: 12, path: '.github/workflows/another-caller.yml', status: 'in_progress',
    referenced_workflows: [{ path: 'Renagang21/o4o-platform/.github/workflows/delivery.yml@refs/heads/main' }],
  }] })), /write gate blocked/);
  await assert.rejects(assertProductionIdle(10, async () => ({ total_count: 1, workflow_runs: [{
    id: 12, path: '.github/workflows/another-caller.yml', status: 'in_progress', referenced_workflows: [{}],
  }] })), /inventory is incomplete/);
});
test('production gate checks later pages and fails closed on incomplete inventory or missing identity', async () => {
  await assert.rejects(assertProductionIdle(10, async (_status, page) => ({ total_count: 101,
    workflow_runs: page === 1 ? Array.from({ length: 100 }, (_, index) => ({ id: index + 100, path: '.github/workflows/ci-pipeline.yml', status: 'queued' }))
      : [{ id: 12, path: '.github/workflows/delivery.yml', status: 'queued' }],
  })), /write gate blocked/);
  await assert.rejects(assertProductionIdle(10, async () => ({ total_count: 1, workflow_runs: [] }), async () => {}), /status=.*expected=1; returned=0/);
  await assert.rejects(assertProductionIdle(undefined, async () => assert.fail('must not query')), /identity/);
});

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
  assert.ok(plan.missingPermissions.includes('compute.regionNetworkEndpointGroups.delete'));
  assert.ok(!deletionPermissions.includes('compute.networkEndpointGroups.delete'));
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
test('an asynchronous production gate rejection prevents deletion', async () => {
  const h = harness();
  await assert.rejects(retireResources({ ...h.options, beforeWrite: async () => { throw new Error('deployment active'); } }), /deployment active/);
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

test('count/list disagreement is retried read-only while writers and malformed metadata still block', async () => {
  const calls = new Map(); let pauses = 0;
  await assertProductionIdle(10, async status => {
    const count = (calls.get(status) ?? 0) + 1; calls.set(status, count);
    return count === 1 ? { total_count: 1, workflow_runs: [] } : { total_count: 0, workflow_runs: [] };
  }, async ms => { assert.equal(ms, 2000); pauses++; });
  assert.equal(pauses, 1);
  for (const count of calls.values()) assert.equal(count, 2);
  await assert.rejects(assertProductionIdle(10, async () => ({ total_count: 1, workflow_runs: [
    { id: 12, path: '.github/workflows/delivery.yml', status: 'queued' },
  ] }), async () => assert.fail('a known writer must not be retried')), /write gate blocked/);
  await assert.rejects(assertProductionIdle(10, async () => ({ total_count: '1', workflow_runs: [] }),
    async () => assert.fail('malformed metadata must not be retried')), /incomplete/);
});

test('pagination drift restarts at page one so a shifted writer is not missed', async () => {
  let starts = 0;
  const ci = () => Array.from({ length: 100 }, (_, index) => ({ id: index + 100, path: '.github/workflows/ci-pipeline.yml', status: 'queued' }));
  await assert.rejects(assertProductionIdle(10, async (status, page) => {
    if (status !== 'queued') return { total_count: 0, workflow_runs: [] };
    if (page === 1) {
      starts++;
      const runs = ci();
      if (starts > 1) runs[99] = { id: 12, path: '.github/workflows/delivery.yml', status: 'queued' };
      return { total_count: starts === 1 ? 101 : 100, workflow_runs: runs };
    }
    return { total_count: 100, workflow_runs: [] };
  }, async () => {}), /write gate blocked/);
  assert.equal(starts, 2);
});

test('a writer on a count-mismatched page blocks immediately before any retry or status transition', async () => {
  let queuedCalls = 0;
  await assert.rejects(assertProductionIdle(10, async status => {
    if (status !== 'queued') return { total_count: 0, workflow_runs: [] };
    queuedCalls++;
    return queuedCalls === 1 ? { total_count: 0, workflow_runs: [
      { id: 12, path: '.github/workflows/delivery.yml', status: 'queued' },
    ] } : { total_count: 0, workflow_runs: [] };
  }, async () => assert.fail('a returned writer must not be retried')), /write gate blocked/);
  assert.equal(queuedCalls, 1);
});

test('any count retry restarts every status so an unseen queued-to-running writer is blocked', async () => {
  let runningReads = 0; let queuedReads = 0;
  await assert.rejects(assertProductionIdle(10, async status => {
    if (status === 'in_progress') {
      runningReads++;
      return runningReads === 1 ? { total_count: 0, workflow_runs: [] } : { total_count: 1, workflow_runs: [
        { id: 12, path: '.github/workflows/delivery.yml', status: 'in_progress' },
      ] };
    }
    if (status === 'queued') {
      queuedReads++;
      return { total_count: queuedReads === 1 ? 1 : 0, workflow_runs: [] };
    }
    return { total_count: 0, workflow_runs: [] };
  }, async () => {}), /write gate blocked/);
  assert.equal(runningReads, 2);
});
test('a known writer in another branch takes precedence over retryable count drift', async () => {
  await assert.rejects(assertProductionIdle(10, async status => {
    if (status === 'queued') return { total_count: 1, workflow_runs: [] };
    if (status === 'in_progress') return { total_count: 1, workflow_runs: [
      { id: 12, path: '.github/workflows/delivery.yml', status: 'in_progress' },
    ] };
    return { total_count: 0, workflow_runs: [] };
  }, async () => assert.fail('known writer must not be hidden by count drift')), /write gate blocked/);
});


// Interpret the small, pure Actions expression subset used by the actual concurrency declarations.
// No eval, external packages or production requests: exercise caller-context lock behavior from YAML.
function lockGroup(name, caller, ref = 'refs/heads/main', runId = '42', service = 'neture') {
  const source = readFileSync(new URL(`../../.github/workflows/${name}.yml`, import.meta.url), 'utf8');
  const raw = source.match(/^concurrency:[\s\S]*?^  group: (.+)$/m)?.[1];
  assert.ok(raw, `missing concurrency for ${name}`);
  assert.match(source, /^  cancel-in-progress: false$/m);
  assert.match(source, /^  queue: max$/m);
  if (!raw.startsWith('${{')) return raw;
  const expression = raw.slice(3, -2).trim();
  const tokens = expression.match(/'[^']*'|[a-z_]\w*(?:\.\w+)*|&&|\|\||[(),]/gi) ?? [];
  assert.equal(tokens.join(''), expression.replace(/\s/g, ''), 'unsupported expression token');
  const context = { 'github.workflow_ref': `Renagang21/o4o-platform/.github/workflows/${caller}.yml@${ref}`,
    'github.run_id': runId, 'inputs.service': service };
  let cursor = 0;
  const take = expected => assert.equal(tokens[cursor++], expected);
  function atom() {
    const token = tokens[cursor++];
    if (token === '(') { const value = or(); take(')'); return value; }
    if (token?.startsWith("'")) return token.slice(1, -1);
    if (tokens[cursor] !== '(') { assert.ok(Object.hasOwn(context, token)); return context[token]; }
    take('(');
    const args = [or()];
    while (tokens[cursor] === ',') { take(','); args.push(or()); }
    take(')');
    if (token === 'startsWith') return String(args[0]).toLowerCase().startsWith(String(args[1]).toLowerCase());
    assert.equal(token, 'format');
    return args[0].replace(/\{(\d+)\}/g, (_match, index) => args[Number(index) + 1]);
  }
  function and() {
    let value = atom();
    while (tokens[cursor] === '&&') { take('&&'); const next = atom(); value = value && next; }
    return value;
  }
  function or() {
    let value = and();
    while (tokens[cursor] === '||') { take('||'); const next = and(); value = value || next; }
    return value;
  }
  const value = or();
  assert.equal(cursor, tokens.length);
  return value;
}

test('all direct production roots share one non-cancelling concurrency lock', () => {
  const roots = ['delivery', 'promote', 'deploy-api', 'deploy-admin', 'deploy-web-services', 'pharmacyhub-qr-cutover'];
  const locks = roots.map((name, index) => lockGroup(name, name, 'refs/heads/main', String(index)));
  assert.equal(new Set(locks).size, 1);
  assert.equal(locks[0], 'o4o-production-mutation');
  for (const name of roots) assert.equal(lockGroup(name, name, 'refs/tags/deploy/example'), locks[0]);
});

test('Promote and Delivery nested calls never wait for their ancestor production lock', () => {
  for (const caller of ['delivery', 'promote']) {
    const parent = lockGroup(caller, caller);
    const delivery = lockGroup('delivery', caller);
    if (caller === 'promote') assert.notEqual(delivery, parent);
    for (const child of ['deploy-api', 'deploy-admin', 'deploy-web-services']) {
      const childLock = lockGroup(child, caller);
      assert.notEqual(childLock, parent);
      assert.notEqual(childLock, delivery);
    }
  }
  assert.notEqual(lockGroup('delivery', 'promote', undefined, '42'), lockGroup('delivery', 'promote', undefined, '43'));
  assert.notEqual(lockGroup('deploy-web-services', 'delivery', undefined, undefined, 'all'),
    lockGroup('deploy-web-services', 'delivery', undefined, undefined, 'neture'));
});

test('unsupported reusable callers fail before checkout and cannot bypass ancestor lock ownership', () => {
  for (const name of ['delivery', 'deploy-api', 'deploy-admin', 'deploy-web-services']) {
    assert.notEqual(lockGroup(name, 'unknown-parent'), 'o4o-production-mutation');
    assert.notEqual(lockGroup(name, 'unknown-parent', undefined, '42'), lockGroup(name, 'unknown-parent', undefined, '43'));
    const source = readFileSync(new URL(`../../.github/workflows/${name}.yml`, import.meta.url), 'utf8');
    const marker = source.indexOf('- name: Validate production lock caller');
    assert.ok(marker >= 0 && marker < source.indexOf('uses: actions/checkout'));
    const rest = source.slice(marker).split('\n');
    const run = rest.findIndex(line => line.trim() === 'run: |');
    const indent = rest[run].match(/^ */)[0].length + 2;
    const body = [];
    for (const line of rest.slice(run + 1)) {
      if (line.trim() && line.match(/^ */)[0].length < indent) break;
      body.push(line.slice(indent));
    }
    const shell = body.join('\n');
    const allowed = name === 'delivery' ? [name, 'promote'] : [name, 'delivery', 'promote'];
    for (const caller of [...allowed, 'unknown-parent']) {
      const result = spawnSync('bash', ['-c', shell], { encoding: 'utf8',
        env: { ...process.env, GITHUB_WORKFLOW_REF: `Renagang21/o4o-platform/.github/workflows/${caller}.yml@refs/heads/main` } });
      assert.equal(result.status, caller === 'unknown-parent' ? 1 : 0, `${name}: ${caller}`);
    }
  }
  const ci = readFileSync(new URL('../../.github/workflows/ci-pipeline.yml', import.meta.url), 'utf8');
  assert.match(ci, /run: node --test[^\n]*pharmacy-hub-resource-retirement\.test\.mjs/);
});
