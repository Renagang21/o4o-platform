// WO-O4O-CI-SHORT-JOB-CONSOLIDATION-V1 (IR-O4O-PRIVATE-CI-BUDGET-V1 §8-4 · §8-7 2)
//
// 1분 미만 job 두 개(문서 민감정보 guard · RoleGuard Guard Policy)를 CI Pipeline 의 Detect step 으로 옮겼다.
// 이 시험은 (1) 검사가 빠지지 않고 모든 run 에서 돌며 (2) 실패가 CI Gate 로 전파되고
// (3) Ready · main · 최종 커밋에서 full CI 가 빠지지 않는다는 것을 workflow 의 실제 식으로 고정한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateIf, template } from './lib/gh-expression.mjs';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const wfDir = path.join(root, '.github/workflows');
const ci = yaml.load(readFileSync(path.join(wfDir, 'ci-pipeline.yml'), 'utf8'));
const ROLE_GUARD = path.join(root, 'scripts/ci/check-role-guard.sh');

const HEAVY = ['quality-check', 'api-tests', 'build', 'web-build', 'pc-installer-windows', 'central-operator-integration', 'api-runtime-dependencies'];

function ctxOf({ name = 'pull_request', draft = false, budget = false } = {}) {
  const github = { workflow: ci.name, event_name: name, ref: name === 'push' ? 'refs/heads/main' : 'refs/pull/1/merge', event: {} };
  if (name === 'pull_request') github.event.pull_request = { number: 1, draft, head: { repo: { fork: false } } };
  const vars = budget ? { CI_COST_PROFILE: 'budget' } : {};
  const scope = { admin_affected: 'true', admin_only: 'false', api_affected: 'true', docs_only: 'false', docs_fast_eligible: 'false', global_or_unknown: 'true', fallback: 'false', web_build_dirs: '["services/web-neture"]' };
  const outputs = {};
  for (const [k, v] of Object.entries(ci.jobs.detect.outputs)) outputs[k] = template(v, { github, vars, steps: { scope: { outputs: scope }, live: { outputs: { superseded: 'false' } } } });
  return { github, vars, needs: { detect: { result: 'success', outputs } } };
}

test('Detect 가 문서 민감정보 guard 와 RoleGuard 를 조건 없이(모든 run) 실행한다', () => {
  const steps = ci.jobs.detect.steps;
  const idx = (re) => steps.findIndex((s) => re.test(s.run ?? ''));
  const docs = idx(/node scripts\/check-doc-sensitive\.mjs/);
  const role = idx(/bash scripts\/ci\/check-role-guard\.sh/);
  const classify = idx(/node scripts\/ci\/detect-affected\.mjs/);
  assert.ok(docs > classify && role > classify, '판정(outputs) 뒤에 돈다');
  for (const i of [docs, role]) {
    assert.equal(steps[i].if, undefined, `${steps[i].name}: 조건 없이 항상`);
    assert.equal(steps[i]['continue-on-error'], undefined, `${steps[i].name}: 실패를 삼키지 않는다`);
  }
  assert.equal(steps[docs].name, 'Docs sensitive info guard', 'DOCUMENT-LIFECYCLE §10-4 가 가리키는 이름');
  // Detect 는 어떤 이벤트에서도 skip 되지 않는다
  assert.equal(ci.jobs.detect.if, undefined);
  assert.equal(ci.jobs.detect['continue-on-error'], undefined);
  // full checkout 이라 docs · services 가 모두 있다
  const checkout = steps.find((s) => /actions\/checkout/.test(s.uses ?? ''));
  assert.equal(checkout.with?.['fetch-depth'], 0);
  assert.equal(checkout.with?.['sparse-checkout'], undefined);
});

test('옮긴 job · workflow 는 남아 있지 않다 (중복 실행 없음)', () => {
  assert.equal(ci.jobs['docs-sensitive-guard'], undefined);
  assert.equal(existsSync(path.join(wfDir, 'ci-guard-policy.yml')), false);
  const all = readFileSync(path.join(wfDir, 'ci-pipeline.yml'), 'utf8');
  assert.equal((all.match(/check-doc-sensitive\.mjs/g) ?? []).length >= 1, true);
});

test('CI Gate: needs 는 다른 job 전부, Detect 실패는 gate 실패로 전파된다', () => {
  const gate = ci.jobs['ci-gate'];
  assert.deepEqual([...gate.needs].sort(), Object.keys(ci.jobs).filter((id) => id !== 'ci-gate').sort());
  assert.equal(gate.if, 'always()');
  const fail = gate.steps.find((s) => (s.name ?? '').startsWith('Fail when'));
  for (const ctx of [ctxOf({ name: 'push' }), ctxOf({ draft: false }), ctxOf({ draft: true, budget: true })]) {
    const c = { ...ctx, needs: { ...ctx.needs, detect: { result: 'failure', outputs: {} }, 'quality-check': { result: 'skipped' } } };
    assert.equal(evaluateIf(fail.if, c), true, `${ctx.github.event_name}: detect(guard) 실패 → gate 실패`);
  }
});

test('Ready · main · 최종 커밋 · 수동 실행에서 full CI 가 빠지지 않는다', () => {
  for (const [label, ctx] of Object.entries({
    'main push': ctxOf({ name: 'push', budget: true }),
    'Ready 전환 / Ready 이후 push': ctxOf({ draft: false, budget: true }),
    'workflow_dispatch': ctxOf({ name: 'workflow_dispatch', budget: true }),
    'budget 꺼짐 PR': ctxOf({ draft: true, budget: false }),
  })) {
    for (const id of HEAVY) assert.equal(evaluateIf(ci.jobs[id].if, ctx), true, `${label}: ${id}`);
    assert.equal(template(ci.jobs['ci-gate'].name, ctx), 'CI Gate', `${label}: required check 이름`);
  }
});

// check-role-guard.sh — 패턴은 종전 ci-guard-policy.yml 그대로다
function repo(files) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'o4o-role-guard-'));
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(dir, ...rel.split('/'));
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return dir;
}
const runGuard = (files) => {
  const dir = repo(files);
  try { return spawnSync('bash', [ROLE_GUARD, dir], { encoding: 'utf8' }); } finally { rmSync(dir, { recursive: true, force: true }); }
};

test('check-role-guard: 깨끗하면 통과, 대상 디렉터리가 없어도 통과', () => {
  assert.equal(runGuard({ 'services/web-a/src/ok.tsx': 'if (user.roles.includes("admin")) {}\n<RoleGuard allowedRoles={["admin"]}>x</RoleGuard>\n' }).status, 0);
  assert.equal(runGuard({ 'README.md': '# x\n' }).status, 0);
});

test('check-role-guard: GUARD-005 · 006 · 007 위반은 각각 실패한다 (ts · tsx · 여러 서비스)', () => {
  for (const [file, body, code] of [
    ['services/web-a/src/a.ts', 'if (user.role === "admin") {}\n', 'GUARD-005'],
    ['services/web-b/src/b.tsx', 'if (user?.role !== "x") {}\n', 'GUARD-005'],
    ['services/web-a/src/c.ts', 'const r = user.currentRole;\n', 'GUARD-006'],
    ['services/web-c/src/d.ts', 'const r = user?.currentRole;\n', 'GUARD-006'],
    ['services/web-a/src/e.tsx', 'return <RoleGuard>child</RoleGuard>;\n', 'GUARD-007'],
  ]) {
    const r = runGuard({ [file]: body });
    assert.equal(r.status, 1, `${file}: ${body}`);
    assert.match(r.stdout, new RegExp(`${code} FAIL`));
  }
  // services/web-* 밖 · ts/tsx 가 아닌 파일은 대상이 아니다(종전 범위 그대로)
  assert.equal(runGuard({ 'apps/x/src/a.ts': 'user.role === "a"\n', 'services/web-a/src/n.md': 'user.role === "a"\n' }).status, 0);
});

test('check-role-guard: 저장소 현재 소스는 통과한다', () => {
  const r = spawnSync('bash', [ROLE_GUARD, root], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
