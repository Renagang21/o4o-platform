import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { audit, daysBetween, pages, priceJob } from '../actions-cost.mjs';

test('dates are inclusive, validated and bounded', () => {
  assert.deepEqual(daysBetween('2026-09-30', '2026-10-01'), ['2026-09-30', '2026-10-01']);
  for (const range of [['2026-02-30', '2026-03-01'], ['2026-10-02', '2026-10-01'], ['2026-01-01', '2026-03-01']]) {
    assert.throws(() => daysBetween(...range));
  }
});
const job = (over = {}) => ({ id: 1, status: 'completed', conclusion: 'success', labels: ['ubuntu-latest'],
  started_at: '2026-10-01T00:00:00Z', completed_at: '2026-10-01T00:01:01Z', ...over });
test('job-level rounding, OS rate, skipped jobs and unsupported runners', () => {
  assert.deepEqual(priceJob(job()), { minutes: 2, usd: 0.012 });
  assert.equal(priceJob(job({ labels: ['windows-latest'] })).usd, 0.02);
  assert.equal(priceJob(job({ labels: ['macos-latest'] })).usd, 0.124);
  assert.equal(priceJob({ conclusion: 'skipped' }).usd, 0);
  for (const labels of [['self-hosted', 'linux'], ['custom-32core'], ['ubuntu-24.04-arm64']]) assert.throws(() => priceJob(job({ labels })));
  assert.throws(() => priceJob(job({ status: 'in_progress' })));
  assert.throws(() => priceJob(job({ completed_at: 'invalid' })));
});
test('pagination reads past 100 and rejects incomplete responses', async () => {
  const first = Array.from({ length: 100 }, (_, id) => ({ id }));
  const result = await pages(async endpoint => ({ total_count: 101, jobs: endpoint.endsWith('page=1') ? first : [{ id: 100 }] }), 'runs/1/jobs', 'jobs');
  assert.equal(result.length, 101);
  await assert.rejects(pages(async () => ({ total_count: 5, jobs: [] }), 'jobs', 'jobs'), /Incomplete/);
});
test('strata include failed/cancelled runs and reruns without double charging jobs', async () => {
  const run = (id, event, conclusion) => ({ id, path: 'ci.yml', created_at: `2026-10-01T00:0${id}:00Z`, event, conclusion, status: 'completed' });
  const runs = [run(1, 'push', 'success'), run(2, 'pull_request', 'cancelled'), run(3, 'push', 'failure')];
  const calls = [];
  const result = await audit({ repo: 'owner/repo', from: '2026-10-01', to: '2026-10-01', get: async endpoint => {
    calls.push(endpoint);
    if (endpoint.includes('/jobs?')) return { total_count: 3, jobs: [job(), job(), job({ id: 2 })] };
    if (endpoint.includes('per_page=1') && !endpoint.includes('per_page=100')) return { total_count: 3 };
    return { total_count: 3, workflow_runs: runs };
  } });
  assert.equal(result.totalRuns, 3);
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows.reduce((n, r) => n + r.estimatedMinutes, 0), 12);
  assert.equal(calls.filter(p => p.includes('filter=all')).length, 3);
});
test('dense day splits into hours rather than accepting a truncated 1000-run list', async () => {
  let hourly = 0;
  await audit({ repo: 'owner/repo', from: '2026-10-01', to: '2026-10-01', get: async endpoint => {
    if (!endpoint.includes('T')) return { total_count: 1000 };
    hourly++;
    return { total_count: 0, workflow_runs: [] };
  } });
  assert.equal(hourly, 48);
});

const readWorkflow = name => readFileSync(new URL(`../../../.github/workflows/${name}`, import.meta.url), 'utf8');
test('budget defers only draft PRs; ready and main retain the full merge/deployment gate', () => {
  const ci = readWorkflow('ci-pipeline.yml');
  assert.match(ci, /types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft\]/);
  assert.match(ci, /defer_full:.*vars\.CI_COST_PROFILE == 'budget'.*github\.event_name == 'pull_request'.*github\.event\.pull_request\.draft/);
  const ids = ['quality-check', 'api-tests', 'build', 'web-build', 'docs-fast-validate', 'admin-fast-validate', 'admin-fast-guards', 'pc-installer-windows', 'central-operator-integration'];
  for (const id of ids) {
    const block = ci.split(`\n  ${id}:\n`)[1]?.split(/\n  [a-z][a-z0-9-]*:\n/)[0];
    assert.ok(block, id);
    assert.match(block, /if: (?:>-\n\s*)?needs\.detect\.outputs\.defer_full != 'true' &&/, id);
  }
  const gate = ci.split('\n  ci-gate:\n')[1];
  assert.match(gate, /if: always\(\)/);
  assert.match(gate, /if: needs\.detect\.outputs\.defer_full == 'true'\n[\s\S]*?exit 1/);
});
test('private CodeQL requires explicit enablement; budget automatic CodeQL is off', () => {
  const security = readWorkflow('ci-security.yml');
  assert.match(security, /!github\.event\.repository\.private \|\| vars\.CODEQL_PRIVATE_ENABLED == 'true'/);
  assert.match(security, /vars\.CI_COST_PROFILE != 'budget' \|\| github\.event_name == 'workflow_dispatch'/);
  assert.match(security, /needs\.detect\.result == 'success' &&/);
});
