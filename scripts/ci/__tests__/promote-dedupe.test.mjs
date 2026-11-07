// WO-O4O-PROMOTE-SAME-SHA-GUARD-V1 — 같은 SHA 의 Promote 재실행 방지 회귀 시험.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDuplicate } from '../promote-dedupe.mjs';
import { evaluateIf } from './lib/gh-expression.mjs';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const promote = yaml.load(readFileSync(path.join(root, '.github/workflows/promote.yml'), 'utf8'));

const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const run = (over) => ({ id: 1, head_sha: SHA, display_title: `Promote ${SHA}`, status: 'completed', conclusion: 'success', html_url: 'u', ...over });
const api = (runs, status = 200) => async () => ({ ok: status === 200, status, json: async () => ({ workflow_runs: runs }) });
const base = { repo: 'o/r', sha: SHA, runId: 99, dryRun: 'false', force: 'false', token: 't' };

test('같은 SHA 가 이미 성공했으면 skip', async () => {
  const r = await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5 })]) });
  assert.equal(r.skip, true);
  assert.match(r.reason, /이미 성공/);
});

test('같은 SHA 가 진행 · 대기 중이면 skip (연속 dispatch)', async () => {
  for (const status of ['queued', 'in_progress', 'waiting', 'pending', 'requested']) {
    assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5, status, conclusion: null })]) })).skip, true, status);
  }
});

test('실패 · 취소된 이전 run 은 재시도를 허용한다', async () => {
  for (const conclusion of ['failure', 'cancelled', 'timed_out']) {
    assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5, conclusion })]) })).skip, false, conclusion);
  }
});

test('dry-run run 은 비교 대상이 아니고, 이 run 이 dry-run 이면 막지 않는다', async () => {
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5, display_title: `Promote ${SHA} (dry-run)` })]) })).skip, false);
  assert.equal((await checkDuplicate({ ...base, dryRun: 'true', fetchImpl: api([run({ id: 5 })]) })).skip, false);
});

test('자기 자신 · 다른 SHA · 제목이 다른 run 은 세지 않는다', async () => {
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 99, status: 'in_progress', conclusion: null })]) })).skip, false, '자기 run');
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5, head_sha: OTHER, display_title: `Promote ${OTHER}` })]) })).skip, false, '다른 SHA');
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5, display_title: 'Something else' })]) })).skip, false, '제목 불일치');
});

test("force='true' 면 성공 · 진행 중이 있어도 실행한다 (롤백 뒤 재배포)", async () => {
  assert.equal((await checkDuplicate({ ...base, force: 'true', fetchImpl: api([run({ id: 5 })]) })).skip, false);
});

test('확인할 수 없으면 막지 않는다 (API 오류 · 형식 이상 · 입력 이상)', async () => {
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([], 500) })).skip, false);
  assert.equal((await checkDuplicate({ ...base, fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) }) })).skip, false);
  assert.equal((await checkDuplicate({ ...base, fetchImpl: async () => { throw new Error('net'); } })).skip, false);
  assert.equal((await checkDuplicate({ ...base, sha: 'short', fetchImpl: api([run({ id: 5 })]) })).skip, false);
  assert.equal((await checkDuplicate({ ...base, token: '', fetchImpl: api([run({ id: 5 })]) })).skip, false);
});

test('promote.yml: 판정 job → promote(delivery 호출) 순서, guard 실패 · 누락은 승격을 막지 않는다', () => {
  const j = promote.jobs;
  assert.ok(j.dedupe, 'Same-SHA guard job');
  assert.deepEqual(j.promote.needs, ['dedupe']);
  assert.equal(j.promote.uses, './.github/workflows/delivery.yml');
  assert.equal(j.promote.with.mode, 'promote');
  assert.equal(j.dedupe.permissions.actions, 'read');
  assert.equal(j.dedupe.permissions['id-token'], undefined, 'guard 에는 GCP 인증 권한이 필요 없다');
  const ctx = (skip, result = 'success', cancelled = false) => ({ needs: { dedupe: { result, outputs: skip === undefined ? {} : { skip } } }, $status: { cancelled, success: !cancelled } });
  assert.equal(evaluateIf(j.promote.if, ctx('true')), false, 'skip=true → 배포 호출 안 함');
  assert.equal(evaluateIf(j.promote.if, ctx('false')), true);
  assert.equal(evaluateIf(j.promote.if, ctx(undefined, 'failure')), true, 'guard 가 실패해도 승격은 진행');
  assert.equal(evaluateIf(j.promote.if, ctx(undefined, 'failure', true)), false, 'run 취소 시에는 진행하지 않음');
  assert.equal(promote.on.workflow_dispatch.inputs.force.default, 'false');
  assert.equal(promote.concurrency.group, 'promote-production', '종전 concurrency 유지');
});
