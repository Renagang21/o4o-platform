// WO-O4O-SELF-HOSTED-CI-PREPARATION-V1
// 일반 CI job 의 실행 장소 선택식을 고정하고, 그 식을 GitHub Actions expression 의미대로 평가해
// "변수 없음 = GitHub 호스팅 · public = 차단 · fork PR = 차단 · private + 명시 설정 = 자체 실행기" 를 확인한다.
// 정본: docs/baseline/operations/O4O-SELF-HOSTED-CI-RUNNER-V1.md
//
// 이 시험은 YAML 과 식의 의미만 본다. 실제 자체 실행기의 동작(label 매칭 · Docker service · 정리)은
// 실기 확인 항목이며 여기서 검증하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, template } from './lib/gh-expression.mjs';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const wfDir = path.join(root, '.github/workflows');
const load = (f) => yaml.load(readFileSync(path.join(wfDir, f), 'utf8'));

const LINUX_LABELS = '["self-hosted","Linux","X64","o4o-ci-linux"]';
const WINDOWS_LABELS = '["self-hosted","Windows","X64","o4o-ci-windows"]';
const guard = "github.event.repository.private == true && github.event.pull_request.head.repo.fork != true";
export const LINUX_EXPR = `\${{ fromJSON(vars.CI_RUNNER_LINUX == 'self-hosted' && ${guard} && '${LINUX_LABELS}' || '"ubuntu-latest"') }}`;
export const WINDOWS_EXPR = `\${{ fromJSON(vars.CI_RUNNER_WINDOWS == 'self-hosted' && ${guard} && '${WINDOWS_LABELS}' || '"windows-latest"') }}`;
const SCHEDULED_EXPR = `\${{ fromJSON(needs.runner.outputs.linux || '"ubuntu-latest"') }}`;

// 전환 지원 job — 여기 없는 job 은 고정 GitHub 호스팅이다.
const SWITCHABLE = {
  'ci-pipeline.yml': {
    detect: LINUX_EXPR, 'draft-light': LINUX_EXPR, 'quality-check': LINUX_EXPR, 'api-tests': LINUX_EXPR, build: LINUX_EXPR,
    'web-build': LINUX_EXPR, 'docs-fast-validate': LINUX_EXPR, 'admin-fast-validate': LINUX_EXPR,
    'admin-fast-guards': LINUX_EXPR, 'docs-sensitive-guard': LINUX_EXPR, 'pc-installer-windows': WINDOWS_EXPR,
    'central-operator-integration': LINUX_EXPR, 'api-runtime-dependencies': LINUX_EXPR, 'ci-gate': LINUX_EXPR,
  },
  'ci-guard-policy.yml': { 'guard-check': LINUX_EXPR },
  'ci-appstore-guard.yml': { 'appstore-guard': LINUX_EXPR },
  'automation-pr-labeler.yml': { 'size-label': LINUX_EXPR },
  'scheduled-api-full-jest.yml': { runner: 'ubuntu-latest', plan: SCHEDULED_EXPR, 'full-jest': SCHEDULED_EXPR, aggregate: SCHEDULED_EXPR },
};

// GitHub Actions expression 평가기는 공용 helper 를 쓴다(lib/gh-expression.mjs).

const ctx = ({ linux, windows, isPrivate, event = 'push', fork } = {}) => ({
  vars: { ...(linux !== undefined && { CI_RUNNER_LINUX: linux }), ...(windows !== undefined && { CI_RUNNER_WINDOWS: windows }) },
  github: {
    event_name: event,
    // schedule 이벤트 payload 에는 repository 가 없다 → isPrivate === 'absent'
    event: {
      ...(isPrivate !== 'absent' && { repository: { private: isPrivate ?? false } }),
      ...(event === 'pull_request' && { pull_request: { head: { repo: { fork: fork ?? false } } } }),
    },
  },
});
const SH_LINUX = JSON.parse(LINUX_LABELS);
const SH_WINDOWS = JSON.parse(WINDOWS_LABELS);

test('변수 미설정이면 GitHub 호스팅 (public · private 모두)', () => {
  for (const isPrivate of [false, true]) {
    assert.equal(evaluate(LINUX_EXPR, ctx({ isPrivate })), 'ubuntu-latest');
    assert.equal(evaluate(WINDOWS_EXPR, ctx({ isPrivate })), 'windows-latest');
  }
});

test('public 저장소에서는 변수를 설정해도 자체 실행기로 가지 않는다', () => {
  for (const event of ['push', 'pull_request', 'workflow_dispatch']) {
    assert.equal(evaluate(LINUX_EXPR, ctx({ linux: 'self-hosted', isPrivate: false, event })), 'ubuntu-latest');
    assert.equal(evaluate(WINDOWS_EXPR, ctx({ windows: 'self-hosted', isPrivate: false, event })), 'windows-latest');
  }
});

test('repository 공개 여부를 알 수 없는 payload(schedule 등)는 GitHub 호스팅', () => {
  assert.equal(evaluate(LINUX_EXPR, ctx({ linux: 'self-hosted', isPrivate: 'absent', event: 'schedule' })), 'ubuntu-latest');
  assert.equal(evaluate(LINUX_EXPR, ctx({ linux: 'self-hosted', isPrivate: 'true' })), 'ubuntu-latest', '문자열 "true" 는 boolean 이 아니다');
});

test('private + 명시적 self-hosted 일 때만 전용 label 을 고른다', () => {
  for (const event of ['push', 'pull_request', 'workflow_dispatch']) {
    assert.deepEqual(evaluate(LINUX_EXPR, ctx({ linux: 'self-hosted', isPrivate: true, event })), SH_LINUX);
    assert.deepEqual(evaluate(WINDOWS_EXPR, ctx({ windows: 'self-hosted', isPrivate: true, event })), SH_WINDOWS);
  }
  // GitHub expression 의 문자열 비교는 대소문자를 무시한다(문서화된 동작).
  assert.deepEqual(evaluate(LINUX_EXPR, ctx({ linux: 'Self-Hosted', isPrivate: true })), SH_LINUX);
  for (const value of ['', 'github', 'true', '1', 'selfhosted', '["self-hosted"]']) {
    assert.equal(evaluate(LINUX_EXPR, ctx({ linux: value, isPrivate: true })), 'ubuntu-latest', value);
  }
});

test('Linux · Windows 는 서로의 변수에 반응하지 않는다', () => {
  assert.equal(evaluate(WINDOWS_EXPR, ctx({ linux: 'self-hosted', isPrivate: true })), 'windows-latest');
  assert.equal(evaluate(LINUX_EXPR, ctx({ windows: 'self-hosted', isPrivate: true })), 'ubuntu-latest');
});

test('fork 에서 온 PR 은 private 이어도 GitHub 호스팅', () => {
  assert.equal(evaluate(LINUX_EXPR, ctx({ linux: 'self-hosted', isPrivate: true, event: 'pull_request', fork: true })), 'ubuntu-latest');
  assert.equal(evaluate(WINDOWS_EXPR, ctx({ windows: 'self-hosted', isPrivate: true, event: 'pull_request', fork: true })), 'windows-latest');
});

test('전환 지원 job 은 정해진 선택식을 문자 그대로 쓴다', () => {
  for (const [file, jobs] of Object.entries(SWITCHABLE)) {
    const wf = load(file);
    for (const [id, expected] of Object.entries(jobs)) {
      assert.ok(wf.jobs[id], `${file}: job ${id} 없음`);
      assert.equal(wf.jobs[id]['runs-on'], expected, `${file}: ${id}`);
    }
    for (const [id, job] of Object.entries(wf.jobs)) {
      if (!(id in jobs)) assert.ok(!/self-hosted|CI_RUNNER_/.test(JSON.stringify(job)), `${file}: ${id} 는 전환 대상이 아니다`);
    }
  }
});

test('배포 · GCP · CodeQL · 그 밖의 workflow 는 자체 실행기를 참조하지 않는다', () => {
  const others = readdirSync(wfDir).filter((f) => f.endsWith('.yml') && !(f in SWITCHABLE));
  for (const must of ['deploy-api.yml', 'deploy-web-services.yml', 'deploy-admin.yml', 'delivery.yml', 'promote.yml', 'ci-security.yml']) {
    assert.ok(others.includes(must), must);
  }
  for (const f of others) {
    const text = readFileSync(path.join(wfDir, f), 'utf8');
    assert.ok(!/self-hosted|CI_RUNNER_/.test(text), `${f} 에 자체 실행기 참조가 있다`);
    for (const [id, job] of Object.entries(load(f).jobs)) {
      if (job.uses) continue; // reusable workflow 호출 job — 실행 장소는 호출된 workflow 가 정한다
      assert.match(String(job['runs-on']), /^(ubuntu|windows)-latest$/, `${f}: ${id}`);
    }
  }
});

test('CI Gate 이름 · always() · needs 는 그대로다', () => {
  const wf = load('ci-pipeline.yml');
  const gate = wf.jobs['ci-gate'];
  // 드래프트가 아닌 문맥(main push · budget 꺼짐)에서 이름은 정확히 "CI Gate" 다(분기 전체는 draft-ready-guarantee.test.mjs).
  for (const c of [{ github: { event_name: 'push', event: {} }, vars: { CI_COST_PROFILE: 'budget' } }, { github: { event_name: 'pull_request', event: { pull_request: { draft: true } } }, vars: {} }]) {
    assert.equal(template(gate.name, c), 'CI Gate');
  }
  assert.equal(gate.if, 'always()');
  assert.deepEqual([...gate.needs].sort(), Object.keys(wf.jobs).filter((id) => id !== 'ci-gate').sort());
});

test('Windows 자체 실행기 보호 단계는 self-hosted 에서만 돌고 실제 agent 를 종료하지 않는다', () => {
  const steps = load('ci-pipeline.yml').jobs['pc-installer-windows'].steps;
  const idx = steps.findIndex((s) => /real Local Agent port/.test(s.name ?? ''));
  assert.ok(idx >= 0 && idx < steps.findIndex((s) => /release-install\.test/.test(s.run ?? '')), '테스트보다 먼저 와야 한다');
  assert.equal(steps[idx].if, "runner.environment == 'self-hosted'");
  assert.match(steps[idx].run, /47821/);
  assert.doesNotMatch(steps[idx].run, /Stop-Process|taskkill|kill/i);
});

// scheduled workflow 의 판정 job 을 가짜 gh 로 실제 실행한다.
test('scheduled 판정 job: private + 변수일 때만 self-hosted, API 실패 · public · 미설정은 호스팅', () => {
  const step = load('scheduled-api-full-jest.yml').jobs.runner.steps.find((s) => s.id === 'select');
  const run = (privateOut, linux, ghFails = false) => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'o4o-runner-sel-'));
    try {
      writeFileSync(path.join(dir, 'gh'), ghFails ? '#!/bin/sh\nexit 1\n' : `#!/bin/sh\necho ${privateOut}\n`);
      chmodSync(path.join(dir, 'gh'), 0o755);
      const out = path.join(dir, 'out');
      writeFileSync(out, '');
      execFileSync('bash', ['-e', '-c', step.run], {
        env: { PATH: `${dir}:${process.env.PATH}`, GITHUB_OUTPUT: out, GITHUB_STEP_SUMMARY: path.join(dir, 'sum'),
          GITHUB_REPOSITORY: 'owner/repo', ...(linux !== undefined && { CI_RUNNER_LINUX: linux }) },
      });
      const value = readFileSync(out, 'utf8').match(/^linux=(.*)$/m)[1];
      return evaluate(SCHEDULED_EXPR, { needs: { runner: { outputs: { linux: value } } } });
    } finally { rmSync(dir, { recursive: true, force: true }); }
  };
  assert.deepEqual(run('true', 'self-hosted'), SH_LINUX);
  assert.equal(run('false', 'self-hosted'), 'ubuntu-latest');
  assert.equal(run('true', undefined), 'ubuntu-latest');
  assert.equal(run('true', 'github'), 'ubuntu-latest');
  assert.equal(run('', 'self-hosted', true), 'ubuntu-latest');
  // 판정 job 자체가 실패해 output 이 비어도 호스팅으로 떨어진다.
  assert.equal(evaluate(SCHEDULED_EXPR, { needs: { runner: { outputs: {} } } }), 'ubuntu-latest');
});
