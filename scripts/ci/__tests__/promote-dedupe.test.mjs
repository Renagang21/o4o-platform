// WO-O4O-PROMOTE-SAME-SHA-GUARD-V1 — 같은 SHA 의 Promote 재실행 방지 회귀 시험.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDuplicate, covers, parseServices, parseTitle } from '../promote-dedupe.mjs';
import { evaluateIf, template } from './lib/gh-expression.mjs';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const promote = yaml.load(readFileSync(path.join(root, '.github/workflows/promote.yml'), 'utf8'));

const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const SELF = 99;
const run = (over) => ({ id: 5, head_sha: SHA, display_title: `Promote ${SHA}`, status: 'completed', conclusion: 'success', html_url: 'u', ...over });
const REPORT = 'Promote / Report (serving SHA · commit status)';
/**
 * 가짜 Actions API — runs 목록과 run 별 jobs. jobs 를 주지 않은 run 은 Report success(실제 승격 완료)로 본다.
 */
const api = (runs, { status = 200, jobs = {} } = {}) => async (url) => {
  if (status !== 200) return { ok: false, status, json: async () => ({}) };
  const m = /\/actions\/runs\/(\d+)\/jobs/.exec(url);
  if (m) return { ok: true, status: 200, json: async () => ({ jobs: jobs[m[1]] ?? [{ name: REPORT, conclusion: 'success' }] }) };
  return { ok: true, status: 200, json: async () => ({ workflow_runs: runs }) };
};
const base = { repo: 'o/r', sha: SHA, runId: SELF, services: '', dryRun: 'false', force: 'false', token: 't' };

test('같은 SHA 가 실제로 승격을 마쳤으면(Report success) skip', async () => {
  const r = await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5 })]) });
  assert.equal(r.skip, true);
  assert.match(r.reason, /승격을 마침/);
});

test('workflow 는 success 여도 배포 없이 끝난 run(freeze · guard skip · 판정 거절 = Report 없음 · skipped)은 완료가 아니다 (Codex #980)', async () => {
  for (const jobs of [
    [{ name: 'Same-SHA guard', conclusion: 'success' }, { name: 'Promote / Classify (CI · freeze · serving → target · risk)', conclusion: 'success' }],
    [{ name: REPORT, conclusion: 'skipped' }],
    [{ name: 'Same-SHA guard', conclusion: 'success' }],
  ]) {
    const r = await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5 })], { jobs: { 5: jobs } }) });
    assert.equal(r.skip, false, JSON.stringify(jobs));
  }
});

test('먼저 시작된 같은 SHA run 이 진행 · 대기 중이면 skip', async () => {
  for (const status of ['queued', 'in_progress', 'waiting', 'pending', 'requested']) {
    assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5, status, conclusion: null })]) })).skip, true, status);
  }
});

test('뒤에 만들어진 대기 run 은 막는 근거가 아니다 — 연속 dispatch 에서 승격이 사라지지 않는다 (Codex #980 P1)', async () => {
  // run 5 가 guard 실행 중 · run 7 이 concurrency 로 대기: run 5 는 7 을 보고 건너뛰면 안 된다
  const first = await checkDuplicate({ ...base, runId: 5, fetchImpl: api([run({ id: 7, status: 'pending', conclusion: null })]) });
  assert.equal(first.skip, false);
  // run 5 가 실제로 승격을 마친 뒤 run 7 이 돌면 그때 skip
  const second = await checkDuplicate({ ...base, runId: 7, fetchImpl: api([run({ id: 5 })]) });
  assert.equal(second.skip, true);
  // run 5 가 (뒤 run 때문이든 무엇이든) 배포 없이 끝났다면 run 7 은 실행한다
  const third = await checkDuplicate({ ...base, runId: 7, fetchImpl: api([run({ id: 5 })], { jobs: { 5: [] } }) });
  assert.equal(third.skip, false);
});

test('실패 · 취소된 이전 run 은 재시도를 허용한다', async () => {
  for (const conclusion of ['failure', 'cancelled', 'timed_out']) {
    assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5, conclusion })]) })).skip, false, conclusion);
  }
  // workflow 는 success 인데 Report 가 실패(FAILED · CANCELLED) — 재시도 허용
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5 })], { jobs: { 5: [{ name: REPORT, conclusion: 'failure' }] } }) })).skip, false);
});

test('서비스 범위: 이전 범위가 이번 요청을 모두 덮을 때만 중복이다 (Codex #980 P2)', async () => {
  const titled = (svc) => run({ id: 5, display_title: `Promote ${SHA} · services=${svc}` });
  // api 만 승격한 뒤 전체 · 다른 서비스 요청 → 실행
  assert.equal((await checkDuplicate({ ...base, services: '', fetchImpl: api([titled('api')]) })).skip, false, 'api → 전부');
  assert.equal((await checkDuplicate({ ...base, services: 'neture', fetchImpl: api([titled('api')]) })).skip, false, 'api → neture');
  assert.equal((await checkDuplicate({ ...base, services: 'api,neture', fetchImpl: api([titled('api')]) })).skip, false, 'api → api,neture');
  // 이전 범위가 덮으면 skip (순서 · 공백 무관)
  assert.equal((await checkDuplicate({ ...base, services: 'api', fetchImpl: api([titled('api')]) })).skip, true, 'api → api');
  assert.equal((await checkDuplicate({ ...base, services: ' neture , api ', fetchImpl: api([titled('api,neture,store')]) })).skip, true, '상위 집합');
  // 범위 없는 run(= 승격 가능한 전부)은 어떤 요청이든 덮는다
  assert.equal((await checkDuplicate({ ...base, services: 'store', fetchImpl: api([run({ id: 5 })]) })).skip, true, '전부 → store');
});

test('제목 해석: services · dry-run 조합과 다른 제목', () => {
  assert.deepEqual(parseTitle(`Promote ${SHA}`, SHA), { dryRun: false, services: [] });
  assert.deepEqual(parseTitle(`Promote ${SHA} (dry-run)`, SHA), { dryRun: true, services: [] });
  assert.deepEqual(parseTitle(`Promote ${SHA} · services=neture,api`, SHA), { dryRun: false, services: ['api', 'neture'] });
  assert.deepEqual(parseTitle(`Promote ${SHA} · services=api (dry-run)`, SHA), { dryRun: true, services: ['api'] });
  assert.equal(parseTitle(`Promote ${OTHER}`, SHA), null);
  assert.equal(parseTitle(`Promote ${SHA} something`, SHA), null);
  assert.equal(parseTitle('Something else', SHA), null);
  assert.deepEqual(parseServices(' b, a ,,a '), ['a', 'b']);
  assert.equal(covers([], ['x']), true);
  assert.equal(covers(['x'], []), false);
});

test('dry-run run 은 비교 대상이 아니고, 이 run 이 dry-run 이면 막지 않는다', async () => {
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5, display_title: `Promote ${SHA} (dry-run)` })]) })).skip, false);
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5, display_title: `Promote ${SHA} · services=api (dry-run)` })]) })).skip, false);
  assert.equal((await checkDuplicate({ ...base, dryRun: 'true', fetchImpl: api([run({ id: 5 })]) })).skip, false);
});

test('자기 자신 · 다른 SHA · 제목이 다른 run 은 세지 않는다', async () => {
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: SELF, status: 'in_progress', conclusion: null })]) })).skip, false, '자기 run');
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5, head_sha: OTHER, display_title: `Promote ${OTHER}` })]) })).skip, false, '다른 SHA');
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5, display_title: 'Something else' })]) })).skip, false, '제목 불일치');
});

test("force='true' 면 성공 · 진행 중이 있어도 실행한다 (롤백 뒤 재배포)", async () => {
  assert.equal((await checkDuplicate({ ...base, force: 'true', fetchImpl: api([run({ id: 5 })]) })).skip, false);
});

test('확인할 수 없으면 막지 않는다 (API 오류 · 형식 이상 · 입력 이상)', async () => {
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([], { status: 500 }) })).skip, false);
  assert.equal((await checkDuplicate({ ...base, fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) }) })).skip, false);
  assert.equal((await checkDuplicate({ ...base, fetchImpl: async () => { throw new Error('net'); } })).skip, false);
  assert.equal((await checkDuplicate({ ...base, sha: 'short', fetchImpl: api([run({ id: 5 })]) })).skip, false);
  assert.equal((await checkDuplicate({ ...base, token: '', fetchImpl: api([run({ id: 5 })]) })).skip, false);
  // jobs 조회만 실패 — 완료를 확인할 수 없으므로 실행
  const jobsFail = async (url) => (/\/jobs/.test(url) ? { ok: false, status: 502, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ workflow_runs: [run({ id: 5 })] }) });
  assert.equal((await checkDuplicate({ ...base, fetchImpl: jobsFail })).skip, false);
  // runId 를 모르면 진행 중 run 을 앞뒤로 가릴 수 없다 — 막지 않는다
  assert.equal((await checkDuplicate({ ...base, runId: undefined, fetchImpl: api([run({ id: 5, status: 'in_progress', conclusion: null })]) })).skip, false);
});

test('promote.yml: 판정 job → promote(delivery 호출) 순서, guard 실패 · 누락은 승격을 막지 않는다', () => {
  const j = promote.jobs;
  assert.ok(j.dedupe, 'Same-SHA guard job');
  assert.deepEqual(j.promote.needs, ['dedupe']);
  assert.equal(j.promote.uses, './.github/workflows/delivery.yml');
  assert.equal(j.promote.with.mode, 'promote');
  assert.equal(j.dedupe.permissions.actions, 'read');
  assert.equal(j.dedupe.permissions['id-token'], undefined, 'guard 에는 GCP 인증 권한이 필요 없다');
  // 쓰기 권한은 배포 호출 job 에만 있다(workflow 단위 권한은 읽기만) — delivery 가 필요한 권한 집합은 그대로다.
  assert.deepEqual(promote.permissions, { contents: 'read', actions: 'read' });
  assert.deepEqual(j.promote.permissions, { contents: 'read', actions: 'read', statuses: 'write', 'id-token': 'write' });
  assert.equal(j.dedupe.permissions.statuses, undefined);
  const ctx = (skip, result = 'success', cancelled = false) => ({ needs: { dedupe: { result, outputs: skip === undefined ? {} : { skip } } }, $status: { cancelled, success: !cancelled } });
  assert.equal(evaluateIf(j.promote.if, ctx('true')), false, 'skip=true → 배포 호출 안 함');
  assert.equal(evaluateIf(j.promote.if, ctx('false')), true);
  assert.equal(evaluateIf(j.promote.if, ctx(undefined, 'failure')), true, 'guard 가 실패해도 승격은 진행');
  assert.equal(evaluateIf(j.promote.if, ctx(undefined, 'failure', true)), false, 'run 취소 시에는 진행하지 않음');
  assert.equal(promote.on.workflow_dispatch.inputs.force.default, 'false');
  assert.equal(promote.concurrency.group, 'promote-production', '종전 concurrency 유지');
  // guard 는 서비스 범위를 받고, run 이름은 그 범위를 남긴다(이전 run 의 범위를 API 로 읽기 위해)
  const env = j.dedupe.steps.find((st) => st.id === 'check').env;
  assert.equal(env.PROMOTE_SERVICES, '${{ inputs.services }}');
  assert.match(promote['run-name'], /services=' \|\| '' \}\}\$\{\{ inputs\.services \}\}/);
});

test('promote.yml run-name: 제목 해석기와 같은 모양을 만든다', () => {
  const name = (services, dry) => template(promote['run-name'], { inputs: { sha: SHA, services, dry_run: dry } });
  assert.equal(name('', 'false'), `Promote ${SHA}`);
  assert.equal(name('', 'true'), `Promote ${SHA} (dry-run)`);
  assert.equal(name('api,neture', 'false'), `Promote ${SHA} · services=api,neture`);
  assert.deepEqual(parseTitle(name('neture, api', 'true'), SHA), { dryRun: true, services: ['api', 'neture'] });
  assert.deepEqual(parseTitle(name('', 'false'), SHA), { dryRun: false, services: [] });
});
