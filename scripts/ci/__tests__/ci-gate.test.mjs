/**
 * WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 — ci-gate.mjs 회귀 시험 (node:test · 네트워크 0)
 * WO §28 CI gate: green → eligible · failed → blocked · pending → blocked · wrong SHA → blocked
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { REQUIRED_WORKFLOWS, evaluateCiGate, latestRunFor } from '../ci-gate.mjs';

const T = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const CI = REQUIRED_WORKFLOWS[0].path;
const run = (over) => ({ id: 1, head_sha: T, status: 'completed', conclusion: 'success', created_at: '2026-09-30T00:00:00Z', run_attempt: 1, event: 'push', ...over });

describe('CI gate', () => {
  it('필수 workflow 는 CI Pipeline 하나다 (CodeQL 은 advisory)', () => {
    assert.deepEqual(REQUIRED_WORKFLOWS.map((w) => w.path), ['.github/workflows/ci-pipeline.yml']);
  });

  it('green target → eligible', () => {
    const r = evaluateCiGate(T, { [CI]: [run()] });
    assert.equal(r.state, 'GREEN');
    assert.equal(r.green, true);
  });

  it('failed · cancelled · timed_out target → blocked', () => {
    for (const conclusion of ['failure', 'cancelled', 'timed_out', 'action_required', null]) {
      const r = evaluateCiGate(T, { [CI]: [run({ conclusion })] });
      assert.equal(r.state, 'BLOCKED', String(conclusion));
      assert.equal(r.green, false);
      assert.match(r.reason, /FAILED_CHECK=CI Pipeline/);
    }
  });

  it('pending target → blocked (green 아님)', () => {
    for (const status of ['queued', 'in_progress', 'waiting']) {
      const r = evaluateCiGate(T, { [CI]: [run({ status, conclusion: null })] });
      assert.equal(r.state, 'PENDING', status);
      assert.equal(r.green, false);
    }
  });

  it('필수 CI 없음 → blocked', () => {
    const r = evaluateCiGate(T, { [CI]: [] });
    assert.equal(r.state, 'BLOCKED');
    assert.match(r.reason, /REQUIRED_CI_MISSING/);
  });

  it('wrong SHA — 다른 SHA 의 green run 은 인정하지 않는다', () => {
    const r = evaluateCiGate(T, { [CI]: [run({ head_sha: OTHER })] });
    assert.equal(r.green, false);
    assert.match(r.reason, /REQUIRED_CI_MISSING/);
    assert.equal(r.checks[0].mismatched_runs, 1);
  });

  it('target 형식 오류 → blocked', () => {
    for (const t of ['', 'abc', 'A'.repeat(40), undefined]) {
      assert.equal(evaluateCiGate(t, { [CI]: [run()] }).state, 'BLOCKED');
    }
  });

  it('re-run: 가장 최근 run 이 기준 — 실패 후 재실행 성공이면 green, 성공 후 재실행 실패면 blocked', () => {
    const older = run({ id: 1, conclusion: 'failure', created_at: '2026-09-30T00:00:00Z' });
    const newer = run({ id: 2, conclusion: 'success', created_at: '2026-09-30T01:00:00Z' });
    assert.equal(evaluateCiGate(T, { [CI]: [older, newer] }).green, true);
    assert.equal(evaluateCiGate(T, { [CI]: [run({ id: 3, created_at: '2026-09-30T00:00:00Z' }), run({ id: 4, conclusion: 'failure', created_at: '2026-09-30T02:00:00Z' })] }).green, false);
    // 같은 run 의 attempt 가 올라간 경우
    assert.equal(latestRunFor([run({ id: 5, run_attempt: 1, conclusion: 'failure' }), run({ id: 5, run_attempt: 2 })], T).run_attempt, 2);
  });
});
