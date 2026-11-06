import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertPartition,
  validatePlan,
  validateShard,
  aggregate,
  relativeTests,
  NODE_VERSION,
} from '../scheduled-jest.mjs';
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const runtime = JSON.parse(
  readFileSync(path.join(root, 'package.json'), 'utf8'),
).volta;
const sha = 'a'.repeat(40);
function plan(patch = {}) {
  const content = {
    schemaVersion: 1,
    sha,
    node: NODE_VERSION,
    strategy: 'balanced',
    cacheMode: 'default',
    buildCacheDisabled: false,
    full: ['src/a.test.ts', 'src/b.test.ts', 'src/c.test.ts'],
    bins: [['src/a.test.ts'], ['src/b.test.ts'], ['src/c.test.ts']],
    ...patch,
  };
  return {
    ...content,
    digest: createHash('sha256').update(JSON.stringify(content)).digest('hex'),
  };
}
function record(p, index = 1) {
  return {
    index,
    sha: p.sha,
    planDigest: p.digest,
    node: p.node,
    npm: runtime.npm,
    pnpm: runtime.pnpm,
    strategy: p.strategy,
    cacheMode: p.cacheMode,
    buildCacheDisabled: p.buildCacheDisabled,
    apiRoot: '/fixture/api',
    maxRssKb: 12345,
    heapLimitBytes: 2000000000,
    elapsedMs: 1000,
    exitCode: 0,
    signal: null,
  };
}
function report(p, index = 1) {
  return {
    success: true,
    numFailedTests: 0,
    numFailedTestSuites: 0,
    numTotalTestSuites: p.bins[index - 1].length,
    testResults: p.bins[index - 1].map((name) => ({
      name: '/fixture/api/' + name,
      status: 'passed',
    })),
  };
}
const write = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
};
function fixture(t) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'o4o-scheduled-jest-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const p = plan();
  write(path.join(dir, 'plan', 'plan.json'), p);
  for (let i = 1; i <= 3; i++) {
    write(path.join(dir, String(i), 'shard-result.json'), record(p, i));
    write(path.join(dir, String(i), 'jest-report.json'), report(p, i));
  }
  return { dir, p };
}

test('full discovery must be nonempty and partitioned exactly once across all three runners', () => {
  assertPartition(['a', 'b', 'c'], [['b'], ['c'], ['a']]);
  for (const bins of [
    [['a'], ['b'], []],
    [['a'], ['b'], ['a', 'c']],
    [['a'], ['b'], ['c', 'foreign']],
    [['a'], ['b', 'c']],
  ])
    assert.throws(() => assertPartition(['a', 'b', 'c'], bins));
  assert.throws(() => assertPartition([], [[], [], []]));
});
test('plan is content-addressed and pins SHA, runtime and execution policies', () => {
  const p = plan();
  validatePlan(p);
  for (const patch of [
    { sha: 'bad' },
    { node: 'v24.0.0' },
    { cacheMode: 'selective' },
    { strategy: 'unknown' },
    { bins: [[], [], []] },
  ])
    assert.throws(() => validatePlan(plan(patch)));
  assert.throws(
    () => validatePlan({ ...p, full: ['different'] }),
    /Shard union|digest/,
  );
});
test('actual reports must cover the assigned suites, including legitimately skipped suites', () => {
  const p = plan(),
    r = record(p),
    j = report(p);
  assert.deepEqual(validateShard(p, r, j, 1), ['src/a.test.ts']);
  j.testResults[0].status = 'pending';
  validateShard(p, r, j, 1);
  for (const bad of [
    { ...j, testResults: [] },
    { ...j, numTotalTestSuites: 2 },
    { ...j, testResults: [j.testResults[0], j.testResults[0]] },
    { ...j, testResults: [{ name: '/fixture/api/src/foreign.test.ts' }] },
  ])
    assert.throws(() => validateShard(p, r, bad, 1));
});
test('runtime/cache drift and stale reports cannot be reused as green evidence', () => {
  const p = plan();
  for (const patch of [
    { sha: 'b'.repeat(40) },
    { planDigest: 'old' },
    { node: 'v22.18.0' },
    { npm: 'old' },
    { pnpm: 'old' },
    { cacheMode: 'disabled' },
    { strategy: 'hash' },
    { buildCacheDisabled: true },
    { maxRssKb: null },
    { heapLimitBytes: 0 },
  ])
    assert.throws(() =>
      validateShard(p, { ...record(p), ...patch }, report(p), 1),
    );
  const disabled = plan({
    cacheMode: 'disabled',
    buildCacheDisabled: true,
    strategy: 'hash',
  });
  validateShard(disabled, record(disabled), report(disabled), 1);
});
test('a failed assertion, crash, OOM or signal never becomes green', () => {
  const p = plan();
  for (const patch of [
    { exitCode: 1 },
    { exitCode: 134 },
    { exitCode: null, signal: 'SIGKILL' },
    { error: 'discovery failed' },
  ])
    assert.throws(() =>
      validateShard(p, { ...record(p), ...patch }, report(p), 1),
    );
  for (const patch of [
    { success: false },
    { numFailedTests: 1 },
    { numFailedTestSuites: 1 },
  ])
    assert.throws(() =>
      validateShard(p, record(p), { ...report(p), ...patch }, 1),
    );
});
test('aggregate reconciles the whole discovered set and all required job results', (t) => {
  const { dir } = fixture(t);
  const result = aggregate(dir, 'success', 'success');
  assert.equal(result.totalSuites, 3);
  assert.deepEqual(
    result.rows.map((r) => r.reportedSuites),
    [1, 1, 1],
  );
  for (const state of ['failure', 'cancelled', 'skipped']) {
    assert.throws(() => aggregate(dir, state, 'success'));
    assert.throws(() => aggregate(dir, 'success', state));
  }
});
test('missing, duplicate and stale artifacts fail aggregation', (t) => {
  const { dir, p } = fixture(t);
  rmSync(path.join(dir, '3'), { recursive: true });
  assert.throws(() => aggregate(dir, 'success', 'success'), /artifact/);
  write(path.join(dir, '3', 'shard-result.json'), record(p, 2));
  write(path.join(dir, '3', 'jest-report.json'), report(p, 2));
  assert.throws(() => aggregate(dir, 'success', 'success'), /Duplicate/);
  write(path.join(dir, '3', 'shard-result.json'), {
    ...record(p, 3),
    sha: 'b'.repeat(40),
  });
  assert.throws(() => aggregate(dir, 'success', 'success'), /identity/);
});
test('suite names cannot escape the API root', () => {
  assert.deepEqual(
    relativeTests(['/fixture/api/src/a.test.ts'], '/fixture/api'),
    ['src/a.test.ts'],
  );
  assert.throws(() => relativeTests(['/outside/a.test.ts'], '/fixture/api'));
});
test('workflow keeps all shards blocking, pins the discovered checkout and preserves comparison artifacts', () => {
  const wf = readFileSync(
    path.join(root, '.github/workflows/scheduled-api-full-jest.yml'),
    'utf8',
  );
  assert.match(wf, /shard: \[1, 2, 3\]/);
  assert.match(wf, /fail-fast: false/);
  assert.match(wf, /ref: \$\{\{ needs.plan.outputs.sha \}\}/);
  assert.match(wf, /if: always\(\)/);
  for (const mode of ['plan', 'run', 'aggregate'])
    assert.ok(wf.includes(`node scripts/ci/scheduled-jest.mjs ${mode}`));
  assert.match(wf, /PLAN_RESULT: \$\{\{ needs.plan.result \}\}/);
  assert.match(wf, /MATRIX_RESULT: \$\{\{ needs.full-jest.result \}\}/);
  assert.match(wf, /overwrite: true/);
  assert.match(wf, /options: \[default, disabled\]/);
  assert.ok(!/continue-on-error/.test(wf));
});
