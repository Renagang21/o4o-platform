/**
 * WO-O4O-PROMOTE-SHORT-JOB-CONSOLIDATION-V1 — detect + CI gate 한 job 통합 · web summary 직접 실행 한정의 의미 고정.
 *
 * 세 deploy workflow(api · admin · web)는 종전에 `detect` → `ci-gate` → 배포 job 이었다. 이제 CI gate 는 detect job 의
 * step 이고 배포 job 은 `needs.<detect>.outputs.ci_gate == 'passed'` 를 요구한다. 여기서는 **실제 workflow 의 조건식**을
 * GitHub 식 평가기로 돌려, 상황 조합 전부에서 "배포 job 실행 여부" 가 종전 의미(아래 OLD_*)와 같음을 확인한다.
 *
 *   종전 의미: gate 열림 = freeze=='false' ∧ dry_run≠'true' ∧ (dispatch 아님 ∨ 소유자) ∧ 대상 있음
 *             배포 = freeze=='false' ∧ 대상 조건 ∧ gate 열림 ∧ CI green   (gate skip · 실패 → needs 로 skip)
 *
 * 실제 GitHub 실행을 대신하지 않는다(step 출력 전달 · needs 실패 전파는 GitHub 문서 의미로 모델링).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { evaluateIf } from './lib/gh-expression.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const load = (f) => yaml.load(readFileSync(path.join(root, '.github/workflows', f), 'utf8'));
const OWNER = 'Renagang21';
const WEB_KEYS = ['partner', 'neture', 'kpa-society', 'lecture', 'store', 'kpa-branch', 'hospital-pharmacy'];

const FREEZE = ['false', 'true', ''];
const EVENTS = [
  { name: 'call(workflow_run)', event_name: 'workflow_run', actor: 'github-actions[bot]', dispatch: false },
  { name: 'dispatch(owner)', event_name: 'workflow_dispatch', actor: OWNER, dispatch: true },
  { name: 'dispatch(collaborator)', event_name: 'workflow_dispatch', actor: 'someone-else', dispatch: true },
];

function ctxOf({ freeze, ev, inputs, steps = {}, needs = {}, success = true, workflowRef = '' }) {
  return {
    vars: { DEPLOY_FREEZE: freeze },
    github: { event_name: ev.event_name, triggering_actor: ev.actor, repository_owner: OWNER, workflow_ref: workflowRef },
    inputs,
    steps,
    needs,
    $status: { success },
  };
}

/**
 * detect job 을 모델링해 배포 job 실행 여부를 계산한다.
 * - gate step `if` 가 참이면 CI 결과에 따라 출력 'passed' 또는 job 실패.
 * - 배포 job 은 needs 가 성공일 때만(암묵 success()) 그리고 자신의 `if`.
 */
function simulate({ wf, detect, scopeStep, deployJob, scopeOutputs, freeze, ev, inputs, ciGreen }) {
  const steps = wf.jobs[detect].steps;
  const gate = steps.find((s) => s.id === 'ci_gate');
  const setup = steps.find((s) => s.name === 'Set up Node for CI gate');
  const stepCtx = ctxOf({ freeze, ev, inputs, steps: { [scopeStep]: { outputs: scopeOutputs } } });
  const gateRuns = evaluateIf(gate.if, stepCtx);
  assert.equal(evaluateIf(setup.if, stepCtx), gateRuns, 'setup-node step 조건은 gate step 과 같아야 한다');
  const detectOk = !gateRuns || ciGreen;
  const outputs = { ...scopeOutputs, ci_gate: gateRuns && ciGreen ? 'passed' : '' };
  const job = wf.jobs[deployJob];
  assert.deepEqual(job.needs, [detect], `${deployJob} 는 ${detect} 만 needs 로 가진다`);
  return { gateRuns, deploy: evaluateIf(job.if, ctxOf({ freeze, ev, inputs, needs: { [detect]: { outputs } }, success: detectOk })) };
}

const ownerOk = (ev) => !ev.dispatch || ev.actor === OWNER;

test('세 deploy workflow 에 ci-gate job 이 없고, CI gate step 은 --enforce 후에만 passed 를 쓴다', () => {
  for (const [file, detect] of [['deploy-api.yml', 'detect'], ['deploy-admin.yml', 'detect'], ['deploy-web-services.yml', 'detect-changes']]) {
    const wf = load(file);
    assert.equal(wf.jobs['ci-gate'], undefined, `${file}: ci-gate job 이 남아 있다`);
    const job = wf.jobs[detect];
    assert.deepEqual(job.permissions, { contents: 'read', actions: 'read' }, file);
    assert.equal(job.outputs.ci_gate, '${{ steps.ci_gate.outputs.ci_gate }}', file);
    const gate = job.steps.find((s) => s.id === 'ci_gate');
    assert.ok(gate, `${file}: ci_gate step 없음`);
    assert.equal(gate['timeout-minutes'], 40, file);
    const lines = gate.run.trim().split('\n').map((l) => l.trim());
    assert.deepEqual(lines, [
      'set -euo pipefail',
      'node scripts/ci/ci-gate.mjs --target "${{ github.sha }}" --wait-seconds 1800 --enforce',
      'echo "ci_gate=passed" >> "$GITHUB_OUTPUT"',
    ], `${file}: gate 실패 시 passed 를 쓰지 않아야 한다`);
    assert.ok(job.steps.indexOf(gate) > job.steps.findIndex((s) => s.uses?.startsWith('actions/checkout@')), file);
  }
});

test('API: 배포 실행 여부가 종전 의미와 같다 (freeze · dry_run · 소유자 · 대상 · migrate_only · CI 결과 전 조합)', () => {
  const wf = load('deploy-api.yml');
  let deployed = 0;
  for (const freeze of FREEZE) for (const ev of EVENTS) for (const dry of ['false', 'true']) for (const affected of [true, false])
    for (const migrateOnly of ev.dispatch ? [false, true] : [false]) for (const ciGreen of [true, false]) {
      const inputs = { dry_run: ev.dispatch ? undefined : dry, migrate_only: ev.dispatch ? String(migrateOnly) : undefined, base_sha: '', force_deploy: 'false', erasure_operation: '' };
      if (ev.dispatch && dry === 'true') continue; // dispatch 에는 dry_run 입력이 없다
      const r = simulate({ wf, detect: 'detect', scopeStep: 'scope', deployJob: 'build-and-deploy',
        scopeOutputs: { api_deploy_affected: String(affected) }, freeze, ev, inputs, ciGreen });
      const oldGate = freeze === 'false' && inputs.dry_run !== 'true' && ownerOk(ev) && (migrateOnly || affected);
      const oldDeploy = freeze === 'false' && oldGate && ciGreen &&
        ((ev.dispatch && migrateOnly) || (affected && !migrateOnly));
      assert.equal(r.gateRuns, oldGate, JSON.stringify({ freeze, ev: ev.name, dry, affected, migrateOnly }));
      assert.equal(r.deploy, oldDeploy, JSON.stringify({ freeze, ev: ev.name, dry, affected, migrateOnly, ciGreen }));
      if (r.deploy) deployed++;
    }
  assert.ok(deployed > 0, '배포가 열리는 경로가 하나는 있어야 한다');
});

test('Admin: 배포 실행 여부가 종전 의미와 같다 (force_deploy 포함)', () => {
  const wf = load('deploy-admin.yml');
  for (const freeze of FREEZE) for (const ev of EVENTS) for (const dry of ['false', 'true']) for (const affected of [true, false])
    for (const force of ev.dispatch ? [false, true] : [false]) for (const ciGreen of [true, false]) {
      if (ev.dispatch && dry === 'true') continue;
      const inputs = { dry_run: ev.dispatch ? undefined : dry, force_deploy: ev.dispatch ? String(force) : undefined };
      const r = simulate({ wf, detect: 'detect', scopeStep: 'scope', deployJob: 'deploy',
        scopeOutputs: { admin_affected: String(affected) }, freeze, ev, inputs, ciGreen });
      const oldGate = freeze === 'false' && inputs.dry_run !== 'true' && ownerOk(ev) && (affected || force);
      assert.equal(r.gateRuns, oldGate);
      assert.equal(r.deploy, freeze === 'false' && oldGate && ciGreen && (affected || force),
        JSON.stringify({ freeze, ev: ev.name, dry, affected, force, ciGreen }));
    }
});

test('Web: 서비스 7개 배포 job 모두 종전 의미와 같다 · gate 는 web 7개 키만 본다', () => {
  const wf = load('deploy-web-services.yml');
  for (const svc of WEB_KEYS) {
    for (const freeze of FREEZE) for (const ev of EVENTS) for (const dry of ['false', 'true']) for (const target of [svc, 'other', 'none'])
      for (const ciGreen of [true, false]) {
        if (ev.dispatch && dry === 'true') continue;
        // target: svc = 이 서비스만 변경 · other = 다른 web 서비스 하나만 변경 · none = web 변경 없음
        const otherKey = WEB_KEYS.find((x) => x !== svc);
        const scopeOutputs = Object.fromEntries(WEB_KEYS.map((k) => [k, String((target === svc && k === svc) || (target === 'other' && k === otherKey))]));
        // 판정기가 step 에 함께 쓰는 web 밖 키 — gate 판정에 쓰이면 안 된다
        scopeOutputs.api_affected = 'true';
        scopeOutputs.admin_affected = 'true';
        const inputs = { dry_run: ev.dispatch ? undefined : dry, pharmacy_preparation: 'none' };
        const r = simulate({ wf, detect: 'detect-changes', scopeStep: 'changes', deployJob: `deploy-${svc}`,
          scopeOutputs, freeze, ev, inputs, ciGreen });
        const anyWeb = WEB_KEYS.some((k) => scopeOutputs[k] === 'true');
        const oldGate = freeze === 'false' && inputs.dry_run !== 'true' && ownerOk(ev) && anyWeb;
        assert.equal(r.gateRuns, oldGate, JSON.stringify({ svc, freeze, ev: ev.name, dry, target }));
        assert.equal(r.deploy, freeze === 'false' && scopeOutputs[svc] === 'true' && oldGate && ciGreen,
          JSON.stringify({ svc, freeze, ev: ev.name, dry, target, ciGreen }));
      }
  }
});

test('Web summary: 직접 dispatch 에서만 돈다 — Delivery · Promote 호출(workflow_ref = 호출자)에서는 skip', () => {
  const wf = load('deploy-web-services.yml');
  const job = wf.jobs.summary;
  assert.ok(!job.needs.includes('ci-gate'));
  const at = (workflowRef, prep = 'none') =>
    evaluateIf(job.if, ctxOf({ freeze: 'false', ev: EVENTS[0], inputs: { pharmacy_preparation: prep }, workflowRef }));
  assert.equal(at('Renagang21/o4o-platform/.github/workflows/deploy-web-services.yml@refs/heads/main'), true);
  assert.equal(at('Renagang21/o4o-platform/.github/workflows/delivery.yml@refs/heads/main'), false);
  assert.equal(at('Renagang21/o4o-platform/.github/workflows/promote.yml@refs/heads/main'), false);
  assert.equal(at('Renagang21/o4o-platform/.github/workflows/deploy-web-services.yml@refs/heads/main', 'plan'), false);
});

test('Delivery · Promote 의 배포 경로는 그대로 — reusable 호출 · report 의 needs 불변', () => {
  const d = load('delivery.yml');
  for (const id of ['deploy-api', 'deploy-web-after-api', 'deploy-web-parallel', 'deploy-admin']) assert.match(d.jobs[id].uses, /^\.\/\.github\/workflows\/deploy-/);
  assert.deepEqual(d.jobs.report.needs, ['classify', 'deploy-api', 'deploy-web-after-api', 'deploy-web-parallel', 'deploy-admin']);
  const p = load('promote.yml');
  assert.deepEqual(Object.keys(p.jobs), ['dedupe', 'promote']);
  assert.equal(p.jobs.promote.uses, './.github/workflows/delivery.yml');
});
