// WO-O4O-CI-DRAFT-LIGHT-READY-GUARANTEE-V1 (IR-O4O-PRIVATE-CI-BUDGET-V1 §8-3 · §8-7 1)
//
// 드래프트 PR 은 가벼운 검사만 하고, **Ready 전환 · Ready 이후 push · main push · 수동 실행에서는 full CI 가 반드시 돈다**.
// workflow YAML 의 실제 식을 GitHub expression 의미로 평가해 고정한다(lib/gh-expression.mjs).
// #974 — 드래프트로 연 직후 Ready 로 바꾼 경합에서 가짜 CI Gate 실패가 생기지 않는 것도 고정한다.
//
// 이 시험은 식의 분기만 본다. 실제 GitHub 실행(그룹 취소 시점 · check run 생성)은 PR CI · 실기로 확인한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, evaluateIf, template, toStr } from './lib/gh-expression.mjs';
import { checkSuperseded } from '../pr-live-draft.mjs';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const wf = (f) => yaml.load(readFileSync(path.join(root, '.github/workflows', f), 'utf8'));
const ci = wf('ci-pipeline.yml');
const labeler = wf('automation-pr-labeler.yml');

const HEAVY = ['quality-check', 'api-tests', 'build', 'web-build', 'pc-installer-windows', 'central-operator-integration', 'api-runtime-dependencies'];
const GATE = 'CI Gate';

/** 이벤트 문맥. budget=true 면 `CI_COST_PROFILE=budget`. */
function event({ name = 'pull_request', draft = false, budget = true, pr = 974, ref = 'refs/pull/974/merge' } = {}) {
  const github = { workflow: ci.name, event_name: name, ref, event: {} };
  if (name === 'pull_request') github.event.pull_request = { number: pr, draft, head: { repo: { fork: false } } };
  if (name === 'push') github.ref = 'refs/heads/main';
  return { github, vars: budget ? { CI_COST_PROFILE: 'budget' } : {} };
}

/** detect 의 outputs 를 실제 식으로 계산한다. scope 는 detect-affected.mjs 가 full 판정을 낸 경우. */
function detectOutputs(ctx, { superseded = 'false', scope = {} } = {}) {
  const steps = {
    scope: { outputs: { admin_affected: 'true', admin_only: 'false', api_affected: 'true', docs_only: 'false', docs_fast_eligible: 'false', global_or_unknown: 'true', fallback: 'false', web_build_dirs: '["services/web-neture"]', ...scope } },
    live: { outputs: { superseded } },
  };
  const out = {};
  for (const [k, v] of Object.entries(ci.jobs.detect.outputs)) out[k] = template(v, { ...ctx, steps });
  return out;
}
const withNeeds = (ctx, outputs, results = {}) => ({ ...ctx, needs: { detect: { outputs, result: 'success' }, ...Object.fromEntries(Object.entries(results).map(([k, r]) => [k, { result: r, outputs: {} }])) } });
const runs = (id, c) => evaluateIf(ci.jobs[id].if, c);
const gateName = (c) => template(ci.jobs['ci-gate'].name, c);
const group = (c) => template(ci.concurrency.group, c);
const gateStep = (prefix) => ci.jobs['ci-gate'].steps.find((s) => (s.name ?? '').startsWith(prefix));

const FULL_CASES = {
  'main push': event({ name: 'push' }),
  'Ready 전환(ready_for_review)': event({ draft: false }),
  'Ready 이후 push(synchronize)': event({ draft: false }),
  'workflow_dispatch': event({ name: 'workflow_dispatch', ref: 'refs/heads/main' }),
  'budget 꺼짐 + 드래프트': event({ draft: true, budget: false }),
};

test('트리거: opened · synchronize · reopened · ready_for_review · converted_to_draft 를 모두 받는다', () => {
  const types = ci.on.pull_request.types;
  for (const t of ['opened', 'synchronize', 'reopened', 'ready_for_review', 'converted_to_draft']) assert.ok(types.includes(t), t);
  assert.ok(ci.on.push.branches.includes('main'));
});

test('Ready · main · 최종 커밋 경로에서는 무거운 job 이 모두 돌고 gate 이름은 정확히 "CI Gate" 다', () => {
  for (const [label, ctx] of Object.entries(FULL_CASES)) {
    const out = detectOutputs(ctx);
    assert.equal(out.defer_full, 'false', `${label}: defer_full`);
    const c = withNeeds(ctx, out);
    for (const id of HEAVY) assert.equal(runs(id, c), true, `${label}: ${id} 가 돌아야 한다`);
    assert.equal(runs('draft-light', c), false, `${label}: 드래프트 가벼운 검사는 돌지 않는다`);
    assert.equal(gateName(c), GATE, `${label}: required check 이름`);
    assert.equal(evaluateIf(ci.jobs['ci-gate'].if, c), true, `${label}: gate 는 always()`);
  }
});

test('full 경로의 gate 는 upstream failure · cancelled 를 모두 실패로 본다 (종전 계약)', () => {
  for (const [label, ctx] of Object.entries(FULL_CASES)) {
    const out = detectOutputs(ctx);
    for (const bad of ['failure', 'cancelled']) {
      const c = withNeeds(ctx, out, { 'api-tests': bad });
      assert.equal(evaluateIf(gateStep('Fail when').if, c), true, `${label}: ${bad} → gate 실패`);
    }
    assert.equal(evaluateIf(gateStep('Draft PR').if, withNeeds(ctx, out)), false, `${label}: 드래프트 안내 단계 없음`);
  }
});

test('드래프트(budget): 무거운 job 은 skip, 가벼운 검사만, gate 이름은 "CI Gate" 가 아니다', () => {
  for (const ctx of [event({ draft: true }), event({ draft: true, name: 'pull_request' })]) {
    const out = detectOutputs(ctx);
    assert.equal(out.defer_full, 'true');
    const c = withNeeds(ctx, out);
    for (const id of [...HEAVY, 'docs-fast-validate', 'admin-fast-validate', 'admin-fast-guards']) assert.equal(runs(id, c), false, id);
    assert.equal(runs('draft-light', c), true);
    const name = gateName(c);
    assert.notEqual(name, GATE, '드래프트 gate 가 required check 를 채우면 Ready 직후 full 전에 병합될 수 있다');
    assert.match(name, /draft/i);
    assert.equal(evaluateIf(gateStep('Draft PR').if, c), true);
  }
});

test('드래프트 gate: 실제 failure 는 실패, 다음 드래프트 push 로 인한 cancelled 는 실패가 아니다', () => {
  const ctx = event({ draft: true });
  const out = detectOutputs(ctx);
  assert.equal(evaluateIf(gateStep('Fail when').if, withNeeds(ctx, out, { 'draft-light': 'failure' })), true);
  assert.equal(evaluateIf(gateStep('Fail when').if, withNeeds(ctx, out, { 'draft-light': 'cancelled' })), false);
  assert.equal(evaluateIf(gateStep('Fail when').if, withNeeds(ctx, out, { 'draft-light': 'success', 'api-tests': 'skipped' })), false);
});

test('#974 경합: 드래프트로 연 직후 Ready — 두 run 은 서로 취소하지 않고, 드래프트 run 은 중복 검사를 건너뛴다', () => {
  const draftOpen = event({ draft: true });
  const ready = event({ draft: false });
  // 1) 그룹이 달라 Ready run 이 드래프트 run 을 취소하지 않는다 → cancelled upstream → 가짜 failure 경로가 없다
  assert.notEqual(group(draftOpen), group(ready));
  assert.equal(group(ready), `ci-${ci.name}-974`, 'full run 그룹 이름은 종전과 같다');
  // 2) 드래프트 run 의 Detect 가 PR 이 이미 Ready 임을 확인하면 가벼운 검사도 건너뛴다
  const out = detectOutputs(draftOpen, { superseded: 'true' });
  assert.equal(out.draft_superseded, 'true');
  const c = withNeeds(draftOpen, out, { 'draft-light': 'skipped', 'api-tests': 'skipped' });
  assert.equal(runs('draft-light', c), false);
  for (const id of HEAVY) assert.equal(runs(id, c), false, `드래프트 run 에서 ${id} 중복 실행 없음`);
  // 3) 드래프트 run 의 gate 는 실패하지 않고, 이름이 required check 와 달라 병합 판정에 끼지 않는다
  assert.equal(evaluateIf(gateStep('Fail when').if, c), false);
  assert.notEqual(gateName(c), GATE);
  // 4) Ready run 은 full 이며 required check 를 만든다
  const r = withNeeds(ready, detectOutputs(ready));
  for (const id of HEAVY) assert.equal(runs(id, r), true, id);
  assert.equal(gateName(r), GATE);
  // 5) 같은 상황에서 예전처럼 Ready run 이 드래프트 run 을 취소했더라도(그룹 공유 · budget 꺼짐) full 경로 gate 는 cancelled 를 실패로 본다 — 안전 쪽
  const off = event({ draft: true, budget: false });
  assert.equal(group(off), group(event({ draft: false, budget: false })), 'budget 이 아니면 그룹은 종전과 같다');
});

test('converted_to_draft 와 드래프트 push 는 같은 드래프트 그룹이고 cancel-in-progress 다; main push 는 취소하지 않는다', () => {
  assert.equal(group(event({ draft: true })), `ci-${ci.name}-974-draft`);
  assert.equal(toStr(evaluate(ci.concurrency['cancel-in-progress'], event({ draft: true }))), 'true');
  assert.equal(toStr(evaluate(ci.concurrency['cancel-in-progress'], event({ name: 'push' }))), 'false');
  assert.equal(group(event({ name: 'push' })), `ci-${ci.name}-refs/heads/main`);
});

test('detect 가 실패 · 취소돼 output 이 비어도 드래프트가 아니면 gate 이름은 "CI Gate" 이고 실패를 보고한다', () => {
  const ctx = event({ draft: false });
  const c = withNeeds(ctx, {}, { detect: 'cancelled' });
  c.needs.detect.result = 'cancelled';
  assert.equal(gateName(c), GATE);
  assert.equal(evaluateIf(gateStep('Fail when').if, c), true);
});

test('모든 무거운 job 은 defer_full 로 막히고, 드래프트에서 도는 job 은 detect · draft-light · gate 뿐이다', () => {
  const ctx = event({ draft: true });
  const c = withNeeds(ctx, detectOutputs(ctx));
  const running = Object.keys(ci.jobs).filter((id) => evaluateIf(ci.jobs[id].if, c));
  assert.deepEqual(running.sort(), ['ci-gate', 'detect', 'draft-light'].sort());
  // 문서 민감정보 guard 는 별도 job 이 아니라 detect 의 조건 없는 step 이다(WO-O4O-CI-SHORT-JOB-CONSOLIDATION-V1) — 드래프트에서도 돈다.
  const guard = ci.jobs.detect.steps.find((s) => s.name === 'Docs sensitive info guard');
  assert.ok(guard, 'detect 에 Docs sensitive info guard step 이 있다');
  assert.equal(guard.if, undefined);
});

test('draft-light 는 설치 없이 도는 정적 guard 만 실행하고 무거운 명령을 부르지 않는다', () => {
  const run = ci.jobs['draft-light'].steps.map((s) => s.run ?? '').join('\n');
  for (const cmd of ['check-unsafe-routes.mjs', 'check-console-log.sh']) assert.match(run, new RegExp(cmd.replace('.', '\\.')));
  assert.doesNotMatch(run, /pnpm|npm ci|jest|vitest|tsc|build/);
  assert.ok(!ci.jobs['draft-light'].steps.some((s) => /setup-build-env/.test(s.uses ?? '')));
});

// Codex #975: 이 개발 환경의 전역 NODE_PATH 가 typescript 를 찾아 줘서 로컬 실측이 통과했지만 깨끗한 runner 에서는 실패했다.
// 그래서 실행 결과가 아니라 **소스의 import 대상**으로 판정한다 — draft-light 가 부르는 node 스크립트는 node 내장 모듈과
// 상대 경로만 import 해야 한다(설치 없이 실행 가능).
test('draft-light 가 부르는 node 스크립트는 외부 패키지를 import 하지 않는다 (설치 없이 실행 가능)', () => {
  const run = ci.jobs['draft-light'].steps.map((s) => s.run ?? '').join('\n');
  const scripts = [...run.matchAll(/node (scripts\/[\w./-]+\.mjs)/g)].map((m) => m[1]);
  assert.ok(scripts.length >= 1);
  const seen = new Set();
  const visit = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const abs = path.join(root, rel);
    if (!existsSync(abs)) return; // check-agent-config.mjs 처럼 "있을 때만" 실행하는 스크립트
    const src = readFileSync(abs, 'utf8');
    const specs = [
      ...src.matchAll(/^\s*import\s[^'"]*?['"]([^'"]+)['"]/gm),
      ...src.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
      ...src.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((m) => m[1]);
    for (const spec of specs) {
      if (spec.startsWith('node:')) continue;
      if (spec.startsWith('.')) { visit(path.relative(root, path.resolve(path.dirname(abs), spec)).split(path.sep).join('/')); continue; }
      assert.fail(`${rel} 가 외부 패키지 '${spec}' 를 불러온다 — draft-light 에는 설치 단계가 없다`);
    }
  };
  for (const s of scripts) visit(s);
  // 반례: entity 검사는 typescript 가 필요하다 → 이 규칙이 실제로 잡는다
  assert.match(readFileSync(path.join(root, 'scripts/check-typeorm-entities.mjs'), 'utf8'), /require\(\s*['"]typescript['"]\s*\)/);
});

test('Size Labeler: 드래프트에서는 건너뛰고 Ready 전환 때 실행한다', () => {
  assert.ok(labeler.on.pull_request.types.includes('ready_for_review'));
  const job = labeler.jobs['size-label'];
  assert.equal(evaluateIf(job.if, event({ draft: true })), false);
  assert.equal(evaluateIf(job.if, event({ draft: false })), true);
});

// pr-live-draft.mjs — 확인할 수 없으면 superseded=false(가벼운 검사 실행 · 검증 축소 없음)
const fakeFetch = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const base = { repo: 'owner/repo', pr: '974', token: 't' };
test('pr-live-draft: 이미 Ready 면 superseded, 그 밖은 모두 false', async () => {
  assert.equal((await checkSuperseded({ ...base, fetchImpl: fakeFetch(200, { state: 'open', draft: false }) })).superseded, true);
  assert.equal((await checkSuperseded({ ...base, fetchImpl: fakeFetch(200, { state: 'open', draft: true }) })).superseded, false);
  assert.equal((await checkSuperseded({ ...base, fetchImpl: fakeFetch(200, { state: 'closed', draft: false }) })).superseded, false);
  assert.equal((await checkSuperseded({ ...base, fetchImpl: fakeFetch(200, { state: 'open' }) })).superseded, false);
  assert.equal((await checkSuperseded({ ...base, fetchImpl: fakeFetch(403, {}) })).superseded, false);
  assert.equal((await checkSuperseded({ ...base, fetchImpl: async () => { throw new Error('network'); } })).superseded, false);
  assert.equal((await checkSuperseded({ ...base, token: '' })).superseded, false);
  assert.equal((await checkSuperseded({ ...base, pr: '' })).superseded, false);
  assert.equal((await checkSuperseded({ ...base, repo: 'bad repo' })).superseded, false);
});
