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
  evaluateSmoke,
  planFromService,
  rollbackArgs,
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
