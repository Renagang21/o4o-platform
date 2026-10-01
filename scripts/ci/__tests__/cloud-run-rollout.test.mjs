/**
 * WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 — cloud-run-rollout.mjs 회귀 시험 (gcloud · HTTP 주입 대체)
 * WO §28 Revision smoke: 성공 → 전환 가능 · 실패 → traffic 유지
 */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  evaluateReadiness,
  evaluateServing,
  evaluateSmoke,
  planFromService,
  rollbackArgs,
  rollbackConfirmed,
  runCommand,
  switchArgs,
  tagForSha,
  taggedTarget,
} from '../cloud-run-rollout.mjs';

const SHA = 'cd8c7ab3e17c900863cbd620aab835a717c67cd3';
const TAG = tagForSha(SHA);
const pinned = { status: { latestReadyRevisionName: 'svc-002', traffic: [{ revisionName: 'svc-001', percent: 100 }, { revisionName: 'svc-002', percent: 0, tag: TAG, url: 'https://sha---svc.a.run.app' }] } };
const latest = { status: { traffic: [{ revisionName: 'svc-001', percent: 100, latestRevision: true }] } };

describe('plan · 대상 · 인자', () => {
  it('tag 는 규칙을 지킨다 (소문자 시작 · 짧음)', () => {
    assert.equal(TAG, 'sha-cd8c7ab3e17c');
    assert.throws(() => tagForSha('xyz'));
  });

  it('pin 서비스와 latest 추종 서비스를 구분한다', () => {
    assert.deepEqual(planFromService(pinned).mode, 'pinned');
    assert.deepEqual(planFromService(pinned).previous, [{ revision: 'svc-001', percent: 100 }]);
    assert.equal(planFromService(latest).mode, 'latest');
  });

  it('tag 로 새 revision 과 전용 URL 을 찾는다', () => {
    assert.deepEqual(taggedTarget(pinned, TAG), { url: 'https://sha---svc.a.run.app', revision: 'svc-002', percent: 0 });
    assert.equal(taggedTarget(pinned, 'sha-nope'), null);
  });

  it('switch 는 이전 방식을 보존한다', () => {
    assert.ok(switchArgs('svc', { mode: 'latest' }, 'svc-002').includes('--to-latest'));
    assert.ok(switchArgs('svc', { mode: 'pinned' }, 'svc-002').includes('--to-revisions=svc-002=100'));
  });

  it('rollback 은 이전 분배를 그대로 복원한다', () => {
    const args = rollbackArgs('svc', { previous: [{ revision: 'svc-001', percent: 100 }] });
    assert.ok(args.includes('--to-revisions=svc-001=100'));
    assert.throws(() => rollbackArgs('svc', { previous: [] }));
  });
});

describe('smoke 판정', () => {
  it('HTML 200 → PASS · 5xx/0/HTML 아님 → FAIL', () => {
    assert.equal(evaluateSmoke([{ path: '/', status: 200, body: '<!doctype html><html>' }]).ok, true);
    assert.equal(evaluateSmoke([{ path: '/', status: 503, body: '' }]).ok, false);
    assert.equal(evaluateSmoke([{ path: '/', status: 0, body: 'ECONNREFUSED' }]).ok, false);
    assert.equal(evaluateSmoke([{ path: '/', status: 200, body: '' }]).ok, false);
    assert.equal(evaluateSmoke([{ path: '/health', status: 200, body: 'ok' }]).ok, true);
    assert.equal(evaluateSmoke([]).ok, false, '검사 0개는 PASS 가 아니다');
  });

  it('readiness 모드는 Ready=True 만 PASS', () => {
    assert.equal(evaluateReadiness({ status: { conditions: [{ type: 'Ready', status: 'True' }] } }).ok, true);
    assert.equal(evaluateReadiness({ status: { conditions: [{ type: 'Ready', status: 'False', reason: 'HealthCheckContainerError' }] } }).ok, false);
    assert.equal(evaluateReadiness({}).ok, false);
  });
});

describe('명령 흐름 (gcloud · HTTP fake)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'rollout-'));
  const planFile = path.join(dir, 'plan.json');
  writeFileSync(planFile, JSON.stringify({ mode: 'pinned', previous: [{ revision: 'svc-001', percent: 100 }] }));

  const makeRun = (state) => {
    const writes = [];
    const run = (cmd, args) => {
      if (args.includes('update-traffic')) {
        writes.push(args.join(' '));
        if (args.some((a) => a.startsWith('--to-revisions=svc-002=100'))) state.current = 'switched';
        if (args.some((a) => a.startsWith('--to-revisions=svc-001=100'))) state.current = 'rolledback';
        return { status: 0, stdout: '', stderr: '' };
      }
      if (args[1] === 'services' && args[2] === 'describe') {
        const traffic =
          state.current === 'switched'
            ? [{ revisionName: 'svc-002', percent: 100, tag: TAG, url: 'https://sha---svc.a.run.app' }]
            : pinned.status.traffic;
        return { status: 0, stdout: JSON.stringify({ status: { traffic } }), stderr: '' };
      }
      throw new Error(`unexpected ${cmd} ${args.join(' ')}`);
    };
    return { run, writes };
  };
  const noWait = async () => {};

  it('새 revision smoke 성공 → switch 가능 → 새 revision 100%', async () => {
    const state = {};
    const { run, writes } = makeRun(state);
    const get = async () => ({ status: 200, body: '<html>' });
    const s = await runCommand('smoke', { service: 'svc', tag: TAG, paths: '/' }, { run, get, wait: noWait });
    assert.equal(s.ok, true);
    assert.equal(writes.length, 0, 'smoke 는 쓰기 0');
    const sw = await runCommand('switch', { service: 'svc', tag: TAG, plan: planFile }, { run, get, wait: noWait });
    assert.equal(sw.ok, true);
    assert.ok(writes[0].includes('--to-revisions=svc-002=100'));
  });

  it('새 revision smoke 실패 → ok=false · 전환 명령 0 (traffic 유지)', async () => {
    const state = {};
    const { run, writes } = makeRun(state);
    const get = async () => ({ status: 502, body: 'Bad Gateway' });
    const s = await runCommand('smoke', { service: 'svc', tag: TAG, paths: '/', attempts: 2 }, { run, get, wait: noWait });
    assert.equal(s.ok, false);
    assert.equal(writes.length, 0);
    assert.equal(state.current, undefined, 'traffic 은 옛 revision 그대로');
  });

  it('새 revision 이 이미 traffic 을 받으면(--no-traffic 누락) smoke 실패', async () => {
    const state = { current: 'switched' };
    const { run } = makeRun(state);
    const s = await runCommand('smoke', { service: 'svc', tag: TAG }, { run, get: async () => ({ status: 200, body: '<html>' }), wait: noWait });
    assert.equal(s.ok, false);
  });

  it('전환 후 공개 검사 실패 → 이전 revision 으로 rollback', async () => {
    const state = { current: 'switched' };
    const { run, writes } = makeRun(state);
    const v = await runCommand('verify', { service: 'svc', url: 'https://api.example/health/ready', plan: planFile, attempts: 2 }, { run, get: async () => ({ status: 503, body: '' }), wait: noWait });
    assert.equal(v.ok, false);
    assert.equal(v.rolledBack, true);
    assert.ok(writes.some((w) => w.includes('--to-revisions=svc-001=100')));
    assert.equal(state.current, 'rolledback');
  });

  it('전환 후 공개 검사 성공 → rollback 없음', async () => {
    const state = { current: 'switched' };
    const { run, writes } = makeRun(state);
    const v = await runCommand('verify', { service: 'svc', url: 'https://x/health/ready', plan: planFile }, { run, get: async () => ({ status: 200, body: '' }), wait: noWait });
    assert.equal(v.ok, true);
    assert.equal(writes.length, 0);
  });
});

// WO-O4O-CICD-WEB-VERIFIED-ROLLOUT-POST-SWITCH-VERIFY-ROLLBACK-V1 — 전환 후 serving SHA 검증 · 자동 rollback · 복귀 확인
describe('S. 전환 후 serving 검증 · rollback 확인', () => {
  const rev = (sha) => ({ metadata: { labels: { 'o4o-commit-sha': sha } } });
  const one = (name) => ({ status: { traffic: [{ revisionName: name, percent: 100, latestRevision: true }] } });
  const split = { status: { traffic: [{ revisionName: 'svc-001', percent: 50 }, { revisionName: 'svc-002', percent: 50 }] } };

  it('evaluateServing: 단일 100% · 기대 revision · label SHA 일치만 PASS', () => {
    assert.equal(evaluateServing(one('svc-002'), rev(SHA), { expectRevision: 'svc-002', expectSha: SHA }).ok, true);
    assert.equal(evaluateServing(split, rev(SHA), { expectSha: SHA }).ok, false, 'split 은 FAIL');
    assert.equal(evaluateServing(one('svc-001'), rev(SHA), { expectRevision: 'svc-002', expectSha: SHA }).ok, false, '다른 revision');
    assert.equal(evaluateServing(one('svc-002'), rev('e2e1be6cc'), { expectSha: SHA }).ok, false, 'SHA 불일치');
    assert.equal(evaluateServing(one('svc-002'), { metadata: {} }, { expectSha: SHA }).ok, false, 'label 없음');
    assert.equal(evaluateServing(one('svc-002'), null, {}).ok, true, 'expect 없으면 단일 100% 만 본다');
  });

  it('rollbackConfirmed: 실제 traffic 이 plan.previous 와 같을 때만 true (순서 무관)', () => {
    const plan = { previous: [{ revision: 'svc-002', percent: 50 }, { revision: 'svc-001', percent: 50 }] };
    assert.equal(rollbackConfirmed(split, plan), true);
    assert.equal(rollbackConfirmed(one('svc-002'), plan), false);
    assert.equal(rollbackConfirmed(one('svc-001'), { previous: [{ revision: 'svc-001', percent: 100 }] }), true);
  });

  const dir = mkdtempSync(path.join(tmpdir(), 'rollout-s-'));
  const planFile = path.join(dir, 'plan.json');
  writeFileSync(planFile, JSON.stringify({ mode: 'latest', previous: [{ revision: 'svc-001', percent: 100 }] }));

  /** state.serving = 현재 100% revision · state.labels = revision → SHA · rollbackSticks=false 면 rollback 이 반영되지 않는다 */
  const makeRun = (state) => {
    const writes = [];
    const run = (cmd, args) => {
      if (args.includes('update-traffic')) {
        writes.push(args.join(' '));
        if (state.rollbackSticks !== false && args.includes('--to-revisions=svc-001=100')) state.serving = 'svc-001';
        return { status: 0, stdout: '', stderr: '' };
      }
      if (args[1] === 'services' && args[2] === 'describe') return { status: 0, stdout: JSON.stringify(one(state.serving)), stderr: '' };
      if (args[1] === 'revisions' && args[2] === 'describe') return { status: 0, stdout: JSON.stringify(rev(state.labels[args[3]])), stderr: '' };
      throw new Error(`unexpected ${cmd} ${args.join(' ')}`);
    };
    return { run, writes };
  };
  const ok200 = async () => ({ status: 200, body: '<html>' });
  const noWait = async () => {};
  const labels = { 'svc-001': 'e2e1be6ccf088d3909b9d6b95577d14d9e921ac0', 'svc-002': SHA };
  const verifyArgs = { service: 'svc', url: 'https://neture.co.kr', plan: planFile, 'expect-sha': SHA, 'expect-revision': 'svc-002' };

  it('공개 PASS + serving SHA 일치 → PASS · rollback 0', async () => {
    const { run, writes } = makeRun({ serving: 'svc-002', labels });
    const v = await runCommand('verify', verifyArgs, { run, get: ok200, wait: noWait });
    assert.equal(v.ok, true);
    assert.equal(writes.length, 0);
  });

  it('공개 PASS 이지만 serving SHA 불일치 → rollback → 복귀 확인 → ok=false', async () => {
    const state = { serving: 'svc-002', labels: { ...labels, 'svc-002': 'deadbeef' } };
    const { run, writes } = makeRun(state);
    const v = await runCommand('verify', verifyArgs, { run, get: ok200, wait: noWait });
    assert.equal(v.ok, false);
    assert.equal(v.rolledBack, true);
    assert.equal(v.rollbackConfirmed, true);
    assert.equal(writes.filter((w) => w.includes('--to-revisions=svc-001=100')).length, 1);
    assert.equal(state.serving, 'svc-001');
  });

  it('serving 이 새 revision 이 아니면 rollback', async () => {
    const { run, writes } = makeRun({ serving: 'svc-003', labels: { ...labels, 'svc-003': SHA } });
    const v = await runCommand('verify', verifyArgs, { run, get: ok200, wait: noWait });
    assert.equal(v.ok, false);
    assert.equal(writes.length, 1);
  });

  it('공개 검사 FAIL → serving 검사 전에 rollback · 복귀 확인', async () => {
    const { run } = makeRun({ serving: 'svc-002', labels });
    const v = await runCommand('verify', { ...verifyArgs, attempts: 2 }, { run, get: async () => ({ status: 502, body: '' }), wait: noWait });
    assert.equal(v.ok, false);
    assert.equal(v.rollbackConfirmed, true);
  });

  it('rollback 이 반영되지 않으면 복귀 확인 false · rollback 명령 ok=false', async () => {
    const { run } = makeRun({ serving: 'svc-002', labels, rollbackSticks: false });
    const v = await runCommand('verify', { ...verifyArgs, attempts: 1 }, { run, get: async () => ({ status: 503, body: '' }), wait: noWait });
    assert.equal(v.rollbackConfirmed, false);
    const r = await runCommand('rollback', { service: 'svc', plan: planFile }, { run, get: ok200, wait: noWait });
    assert.equal(r.ok, false);
  });

  it('rollback 명령(전환 실패 경로): 이전 revision 100% 복귀 확인 → ok=true', async () => {
    const state = { serving: 'svc-002', labels };
    const { run } = makeRun(state);
    const r = await runCommand('rollback', { service: 'svc', plan: planFile }, { run, get: ok200, wait: noWait });
    assert.equal(r.ok, true);
    assert.equal(state.serving, 'svc-001');
  });

  it('expect-sha 없으면(API 경로) 공개 PASS 만으로 종전과 같이 PASS — gcloud 호출 0', async () => {
    let calls = 0;
    const run = () => {
      calls += 1;
      throw new Error('호출되면 안 됨');
    };
    const v = await runCommand('verify', { service: 'svc', url: 'https://x/health/ready', plan: planFile }, { run, get: ok200, wait: noWait });
    assert.equal(v.ok, true);
    assert.equal(calls, 0);
  });
});
