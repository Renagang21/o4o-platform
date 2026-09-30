/**
 * ci-gate.mjs 회귀 시험 (node:test · 네트워크 0 · 시계/sleep 주입)
 *   WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 §28 CI gate
 *   WO-O4O-CICD-CI-GATE-STABILIZATION-AND-RISK-DETECTOR-REFINEMENT-V1 §18 — MISSING/PENDING bounded retry
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PENDING_STATUSES, REQUIRED_WORKFLOWS, evaluateCiGate, latestRunFor, pollCiGate } from '../ci-gate.mjs';

const T = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const CI = REQUIRED_WORKFLOWS[0].path;
const run = (over) => ({ id: 1, head_sha: T, status: 'completed', conclusion: 'success', created_at: '2026-09-30T00:00:00Z', run_attempt: 1, event: 'push', ...over });

describe('evaluateCiGate — 한 번의 조회', () => {
  it('필수 workflow 는 CI Pipeline 하나다 (CodeQL 은 advisory)', () => {
    assert.deepEqual(REQUIRED_WORKFLOWS.map((w) => w.path), ['.github/workflows/ci-pipeline.yml']);
  });

  it('green → GREEN', () => {
    const r = evaluateCiGate(T, { [CI]: [run()] });
    assert.equal(r.state, 'GREEN');
    assert.equal(r.green, true);
  });

  it('failure · cancelled · timed_out → 즉시 BLOCKED (재조회 대상 아님)', () => {
    for (const conclusion of ['failure', 'cancelled', 'timed_out', 'action_required', null]) {
      const r = evaluateCiGate(T, { [CI]: [run({ conclusion })] });
      assert.equal(r.state, 'BLOCKED', String(conclusion));
      assert.match(r.reason, /FAILED_CHECK=CI Pipeline/);
    }
  });

  it('GitHub 의 미완료 status 전부 → PENDING', () => {
    for (const status of PENDING_STATUSES) {
      const r = evaluateCiGate(T, { [CI]: [run({ status, conclusion: null })] });
      assert.equal(r.state, 'PENDING', status);
      assert.equal(r.green, false);
    }
  });

  it('run 0건 → MISSING (재조회 대상 · green 아님)', () => {
    const r = evaluateCiGate(T, { [CI]: [] });
    assert.equal(r.state, 'MISSING');
    assert.equal(r.green, false);
  });

  it('wrong SHA — 다른 SHA 의 green run 은 인정하지 않는다', () => {
    const r = evaluateCiGate(T, { [CI]: [run({ head_sha: OTHER })] });
    assert.equal(r.green, false);
    assert.equal(r.state, 'MISSING');
    assert.equal(r.checks[0].mismatched_runs, 1);
  });

  it('target 형식 오류 → 즉시 BLOCKED', () => {
    for (const t of ['', 'abc', 'A'.repeat(40), undefined]) assert.equal(evaluateCiGate(t, { [CI]: [run()] }).state, 'BLOCKED');
  });

  it('re-run: 가장 최근 run 이 기준', () => {
    const older = run({ id: 1, conclusion: 'failure', created_at: '2026-09-30T00:00:00Z' });
    const newer = run({ id: 2, conclusion: 'success', created_at: '2026-09-30T01:00:00Z' });
    assert.equal(evaluateCiGate(T, { [CI]: [older, newer] }).green, true);
    assert.equal(evaluateCiGate(T, { [CI]: [run({ id: 3 }), run({ id: 4, conclusion: 'failure', created_at: '2026-09-30T02:00:00Z' })] }).green, false);
    assert.equal(latestRunFor([run({ id: 5, run_attempt: 1, conclusion: 'failure' }), run({ id: 5, run_attempt: 2 })], T).run_attempt, 2);
  });
});

/** 조회 결과를 순서대로 돌려주는 가짜 GitHub + 가짜 시계 */
function harness(responses) {
  let t = 0;
  let i = 0;
  const seen = [];
  const logs = [];
  return {
    fetchRuns: async () => {
      const r = responses[Math.min(i, responses.length - 1)];
      i += 1;
      seen.push(r);
      if (r instanceof Error) throw r;
      return r;
    },
    sleep: async (ms) => {
      t += ms;
    },
    now: () => t,
    log: (l) => logs.push(l),
    calls: () => i,
    logs,
  };
}
const poll = (h, over = {}) =>
  pollCiGate({ target: T, fetchRuns: h.fetchRuns, sleep: h.sleep, now: h.now, log: h.log, waitSeconds: 1800, missingWaitSeconds: 300, intervalSeconds: 30, ...over });

describe('pollCiGate — bounded retry (§18 시나리오)', () => {
  it('MISSING → success : 재조회로 GREEN (2026-09-30 API 1차 차단 재현)', async () => {
    const h = harness([[], [run()]]);
    const r = await poll(h);
    assert.equal(r.state, 'GREEN');
    assert.equal(r.attempts, 2);
    assert.match(h.logs[0], /^CI_GATE_WAIT reason=REQUIRED_CI_MISSING .* target_sha=a{40} attempt=1\/\d+$/);
  });

  it('MISSING → MISSING → success', async () => {
    const h = harness([[], [], [run()]]);
    const r = await poll(h);
    assert.equal(r.state, 'GREEN');
    assert.equal(r.attempts, 3);
  });

  it('MISSING 이 창(300s) 내내 계속 → REQUIRED_CI_MISSING_AFTER_RETRY 로 차단 (fail-closed · 무한 대기 없음)', async () => {
    const h = harness([[]]);
    const r = await poll(h);
    assert.equal(r.state, 'BLOCKED');
    assert.equal(r.green, false);
    assert.match(r.reason, /^REQUIRED_CI_MISSING_AFTER_RETRY/);
    assert.ok(h.now() <= 300_000, `창 초과 대기 ${h.now()}ms`);
    assert.ok(h.calls() >= 2 && h.calls() <= 11, `조회 ${h.calls()}회`);
  });

  it('pending → success', async () => {
    const h = harness([[run({ status: 'in_progress', conclusion: null })], [run({ status: 'queued', conclusion: null })], [run()]]);
    const r = await poll(h);
    assert.equal(r.state, 'GREEN');
    assert.equal(r.attempts, 3);
  });

  it('pending → failure : 실패가 확정되는 즉시 차단', async () => {
    const h = harness([[run({ status: 'in_progress', conclusion: null })], [run({ conclusion: 'failure' })], [run()]]);
    const r = await poll(h);
    assert.equal(r.state, 'BLOCKED');
    assert.match(r.reason, /^FAILED_CHECK/);
    assert.equal(h.calls(), 2, '실패 뒤에는 더 조회하지 않는다');
  });

  it('pending 이 긴 창(1800s) 내내 계속 → REQUIRED_CI_PENDING_AFTER_RETRY', async () => {
    const h = harness([[run({ status: 'in_progress', conclusion: null })]]);
    const r = await poll(h);
    assert.equal(r.state, 'BLOCKED');
    assert.match(r.reason, /^REQUIRED_CI_PENDING_AFTER_RETRY/);
    assert.ok(h.now() <= 1_800_000);
  });

  it('immediate failure → 재조회 0', async () => {
    const h = harness([[run({ conclusion: 'failure' })]]);
    const r = await poll(h);
    assert.equal(r.state, 'BLOCKED');
    assert.equal(h.calls(), 1);
    assert.equal(h.logs.length, 0);
  });

  it('wrong SHA 만 계속 → MISSING 재조회 후 차단 (다른 SHA 로 옮겨 가지 않는다)', async () => {
    const h = harness([[run({ head_sha: OTHER })]]);
    const r = await poll(h);
    assert.equal(r.state, 'BLOCKED');
    assert.match(r.reason, /REQUIRED_CI_MISSING_AFTER_RETRY/);
  });

  it('GitHub API 5xx → 재조회 후 success', async () => {
    const h = harness([new Error('GitHub API 502 Bad Gateway'), [run()]]);
    const r = await poll(h);
    assert.equal(r.state, 'GREEN');
  });

  it('GitHub API 가 창 내내 실패 → CI_STATUS_UNAVAILABLE_AFTER_RETRY 로 차단', async () => {
    const h = harness([new Error('GitHub API 503')]);
    const r = await poll(h);
    assert.equal(r.state, 'BLOCKED');
    assert.match(r.reason, /^CI_STATUS_UNAVAILABLE_AFTER_RETRY/);
  });

  it('창 0 (shadow 기본) → 한 번만 보고 MISSING 을 차단으로 기록 (AFTER_RETRY 아님)', async () => {
    const h = harness([[]]);
    const r = await poll(h, { waitSeconds: 0, missingWaitSeconds: 0 });
    assert.equal(r.state, 'BLOCKED');
    assert.match(r.reason, /^REQUIRED_CI_MISSING \(/);
    assert.equal(h.calls(), 1);
  });
});
