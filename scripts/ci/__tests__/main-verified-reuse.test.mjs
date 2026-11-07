// WO-O4O-CI-MAIN-VERIFIED-REUSE-V1 — main 검증 재사용 판정 · workflow 계약 회귀 시험.
// 판정 근거는 GitHub API 정보(tree SHA · 병합 PR · Actions run/job 결과)뿐이며, 확인할 수 없으면 full 이다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decideReuse } from '../main-verified-reuse.mjs';
import { evaluateIf, template } from './lib/gh-expression.mjs';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ci = yaml.load(readFileSync(path.join(root, '.github/workflows/ci-pipeline.yml'), 'utf8'));
const delivery = yaml.load(readFileSync(path.join(root, '.github/workflows/delivery.yml'), 'utf8'));

const REPO = 'o/r';
const C = 'c'.repeat(40), P = 'p'.repeat(40), H = 'h'.repeat(40), T = 't'.repeat(40);

/** 가짜 GitHub API — over 로 응답을 바꾼다. */
function fakeApi(over = {}) {
  const data = {
    [`commits/${C}`]: { commit: { tree: { sha: T } }, parents: [{ sha: P }] },
    [`compare/${P}...${C}`]: { files: [{ filename: 'apps/api-server/src/a.ts' }] },
    [`commits/${C}/pulls`]: [{ number: 7, merged_at: 'x', base: { ref: 'main' }, merge_commit_sha: C, head: { sha: H, repo: { full_name: REPO } } }],
    [`commits/${H}`]: { commit: { tree: { sha: T } } },
    'runs': { workflow_runs: [{ id: 11, head_sha: H, event: 'pull_request', path: '.github/workflows/ci-pipeline.yml', conclusion: 'success', created_at: '2026-11-07T00:00:00Z', repository: { full_name: REPO }, head_repository: { full_name: REPO }, html_url: 'u' }] },
    'jobs/11': { jobs: [{ name: 'Detect affected scope', conclusion: 'success' }, { name: 'CI Gate', conclusion: 'success' }] },
    ...over,
  };
  return async (url) => {
    const ep = url.replace(`https://api.github.com/repos/${REPO}/`, '');
    let key = ep;
    if (ep.startsWith('actions/workflows/ci-pipeline.yml/runs')) key = 'runs';
    const m = ep.match(/^actions\/runs\/(\d+)\/jobs/); if (m) key = `jobs/${m[1]}`;
    const body = data[key];
    if (body === undefined || body === 'ERR') return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => body };
  };
}
const decide = (over, extra = {}) => decideReuse({ repo: REPO, sha: C, enabled: 'true', token: 't', fetchImpl: fakeApi(over), ...extra });

test('같은 tree + head 의 pull_request CI 에서 "CI Gate" success → verified', async () => {
  const r = await decide();
  assert.equal(r.verified, true, r.reason);
  assert.deepEqual(r.evidence, { pr: 7, head: H, tree: T, run: 11, runUrl: 'u' });
});

test('tree(C) ≠ tree(PR head) 이면 full (PR branch 가 병합 직전 main 을 포함하지 않음)', async () => {
  assert.equal((await decide({ [`commits/${H}`]: { commit: { tree: { sha: 'x'.repeat(40) } } } })).verified, false);
});

test('CI 인프라(.github/** · scripts/**) 변경은 tree 가 같아도 full', async () => {
  for (const f of ['.github/workflows/ci-pipeline.yml', 'scripts/ci/detect-affected.mjs', 'scripts/check-doc-sensitive.mjs']) {
    assert.equal((await decide({ [`compare/${P}...${C}`]: { files: [{ filename: 'docs/a.md' }, { filename: f }] } })).verified, false, f);
  }
  assert.equal((await decide({ [`compare/${P}...${C}`]: { files: Array.from({ length: 300 }, (_, i) => ({ filename: `apps/x/${i}.ts` })) } })).verified, false, '300건 이상');
});

test('병합 PR 이 정확히 1개 · 같은 저장소 · merge_commit_sha=C 가 아니면 full', async () => {
  const pr = (o) => ({ number: 7, merged_at: 'x', base: { ref: 'main' }, merge_commit_sha: C, head: { sha: H, repo: { full_name: REPO } }, ...o });
  for (const [label, pulls] of Object.entries({
    '없음': [],
    '둘': [pr(), pr({ number: 8 })],
    '미병합': [pr({ merged_at: null })],
    '다른 merge commit': [pr({ merge_commit_sha: 'z'.repeat(40) })],
    'fork': [pr({ head: { sha: H, repo: { full_name: 'fork/r' } } })],
    'base 가 main 아님': [pr({ base: { ref: 'develop' } })],
  })) assert.equal((await decide({ [`commits/${C}/pulls`]: pulls })).verified, false, label);
});

test('head 의 CI 결과가 녹색 "CI Gate" 가 아니면 full (드래프트 gate · 실패 · 다른 이벤트 · 다른 workflow · fork run)', async () => {
  const run = (o) => ({ id: 11, head_sha: H, event: 'pull_request', path: '.github/workflows/ci-pipeline.yml', conclusion: 'success', created_at: 'z', repository: { full_name: REPO }, head_repository: { full_name: REPO }, ...o });
  const cases = {
    '드래프트 gate 이름': { 'jobs/11': { jobs: [{ name: 'CI Gate (draft · not final)', conclusion: 'success' }] } },
    'gate 실패': { 'jobs/11': { jobs: [{ name: 'CI Gate', conclusion: 'failure' }] } },
    'gate 없음': { 'jobs/11': { jobs: [{ name: 'Detect affected scope', conclusion: 'success' }] } },
    'run 실패': { runs: { workflow_runs: [run({ conclusion: 'failure' })] } },
    'workflow_dispatch run': { runs: { workflow_runs: [run({ event: 'workflow_dispatch' })] } },
    '다른 workflow': { runs: { workflow_runs: [run({ path: '.github/workflows/other.yml' })] } },
    'fork head run': { runs: { workflow_runs: [run({ head_repository: { full_name: 'fork/r' } })] } },
    '다른 head': { runs: { workflow_runs: [run({ head_sha: 'q'.repeat(40) })] } },
    'run 없음': { runs: { workflow_runs: [] } },
  };
  for (const [label, over] of Object.entries(cases)) assert.equal((await decide(over)).verified, false, label);
});

test('비활성 · 입력 이상 · API 실패는 모두 full', async () => {
  assert.equal((await decide({}, { enabled: '' })).verified, false);
  assert.equal((await decide({}, { enabled: 'false' })).verified, false);
  assert.equal((await decide({}, { sha: 'short' })).verified, false);
  assert.equal((await decide({}, { token: '' })).verified, false);
  for (const key of [`commits/${C}`, `compare/${P}...${C}`, `commits/${C}/pulls`, `commits/${H}`, 'runs', 'jobs/11']) {
    assert.equal((await decide({ [key]: 'ERR' })).verified, false, `${key} 실패`);
  }
});

// ---- workflow 계약 ----
const HEAVY = ['quality-check', 'api-tests', 'build', 'web-build', 'docs-fast-validate', 'admin-fast-validate', 'admin-fast-guards', 'pc-installer-windows', 'central-operator-integration', 'api-runtime-dependencies'];
const full = { defer_full: 'false', admin_only: 'false', docs_fast_eligible: 'false', api_affected: 'true', global_or_unknown: 'true', web_build_dirs: '["services/web-neture"]' };
const ctxOf = (event, outputs, vars = { CI_MAIN_REUSE: 'true' }) => ({
  github: { event_name: event, ref: event === 'pull_request' ? 'refs/pull/1/merge' : 'refs/heads/main', event: event === 'pull_request' ? { pull_request: { draft: false } } : {} },
  vars, needs: { detect: { result: 'success', outputs } },
});
const reuseStep = ci.jobs.detect.steps.find((s) => s.id === 'mainreuse');

test('재사용 판정 step 은 main push + CI_MAIN_REUSE=true 일 때만 돈다', () => {
  assert.ok(reuseStep);
  assert.equal(evaluateIf(reuseStep.if, ctxOf('push', {})), true);
  assert.equal(evaluateIf(reuseStep.if, ctxOf('push', {}, {})), false, '변수 없음');
  for (const ev of ['pull_request', 'schedule', 'workflow_dispatch']) assert.equal(evaluateIf(reuseStep.if, ctxOf(ev, {})), false, ev);
  const dev = ctxOf('push', {}); dev.github.ref = 'refs/heads/develop';
  assert.equal(evaluateIf(reuseStep.if, dev), false, 'develop push');
  assert.deepEqual(ci.jobs.detect.permissions, { contents: 'read', actions: 'read', 'pull-requests': 'read' });
});

test('main_verified=true 면 무거운 job 은 skip, gate 는 "CI Gate" 로 통과 · 실패 전파 유지', () => {
  const c = ctxOf('push', { ...full, main_verified: 'true' });
  for (const id of HEAVY) assert.equal(evaluateIf(ci.jobs[id].if, c), false, id);
  assert.equal(template(ci.jobs['ci-gate'].name, c), 'CI Gate');
  const fail = ci.jobs['ci-gate'].steps.find((s) => (s.name ?? '').startsWith('Fail when'));
  const broken = { ...c, needs: { ...c.needs, 'docs-sensitive-guard': { result: 'failure' } } };
  assert.equal(evaluateIf(fail.if, broken), true, '가벼운 확인에서도 실패는 gate 실패');
});

test('main_verified 가 비었거나 false 면(판정 안 함 · 실패) 무거운 job 이 모두 돈다 — PR · schedule · dispatch · 변수 없음', () => {
  for (const [label, c] of Object.entries({
    'main push, 판정 false': ctxOf('push', { ...full, main_verified: 'false' }),
    'main push, 판정 안 함': ctxOf('push', { ...full, main_verified: '' }),
    'PR(Ready)': ctxOf('pull_request', { ...full, main_verified: '' }),
    '매일 schedule': ctxOf('schedule', { ...full, main_verified: '' }),
    'workflow_dispatch': ctxOf('workflow_dispatch', { ...full, main_verified: '' }),
  })) {
    for (const id of ['quality-check', 'api-tests', 'build', 'web-build', 'pc-installer-windows', 'central-operator-integration', 'api-runtime-dependencies']) {
      assert.equal(evaluateIf(ci.jobs[id].if, c), true, `${label}: ${id}`);
    }
  }
});

test('매일 1회 main 전체 검사(schedule)가 있고, Delivery 는 그 run 으로 배포하지 않는다', () => {
  assert.ok(Array.isArray(ci.on.schedule) && ci.on.schedule.length === 1, 'schedule 1개');
  assert.match(ci.on.schedule[0].cron, /^\d+ \d+ \* \* \*$/, '매일 1회');
  const classify = delivery.jobs.classify.if;
  assert.equal(evaluateIf(classify, { github: { event_name: 'workflow_run', event: { workflow_run: { event: 'schedule' } } } }), false, 'schedule CI 완료 → Delivery 판정 안 함');
  assert.equal(evaluateIf(classify, { github: { event_name: 'workflow_run', event: { workflow_run: { event: 'push' } } } }), true);
});
