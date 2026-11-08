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
const RUN_URL = (id) => `https://github.com/o/r/actions/runs/${id}`;
/** run 이 남긴 commit status `production` (최신순 목록에서 앞에 올수록 최근) */
const st = (id, state, description) => ({ context: 'production', state, description, target_url: RUN_URL(id) });
/**
 * 가짜 GitHub API — Promote runs 목록과 SHA 의 commit statuses.
 * statuses 를 주지 않으면, 성공한 run 마다 최종 `DEPLOYED` success 가 있다(모든 서비스 target)고 본다.
 */
const api = (runs, { status = 200, statuses } = {}) => async (url) => {
  if (status !== 200) return { ok: false, status, json: async () => ({}) };
  if (/\/commits\/[0-9a-f]+\/statuses/.test(url)) {
    const list = statuses ?? runs.filter((r) => r.conclusion === 'success').map((r) => st(r.id, 'success', 'DEPLOYED · deploy: api,neture'));
    return { ok: true, status: 200, json: async () => list };
  }
  return { ok: true, status: 200, json: async () => ({ workflow_runs: runs }) };
};
const base = { repo: 'o/r', sha: SHA, runId: SELF, services: '', dryRun: 'false', force: 'false', token: 't' };

test('같은 SHA 의 이전 run 이 모든 서비스를 target 에 올렸으면(마지막 production status = DEPLOYED · NO_DEPLOY success) skip', async () => {
  const r = await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5 })]) });
  assert.equal(r.skip, true);
  assert.match(r.reason, /모든 서비스를 target/);
  // 최신순: classify 의 DEPLOYING(pending) 뒤에 report 의 DEPLOYED(success) 가 남은 실제 순서
  const real = [st(5, 'success', 'DEPLOYED · deploy: api,admin'), st(5, 'pending', 'DEPLOYING · deploy: api,admin')];
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5 })], { statuses: real }) })).skip, true);
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5 })], { statuses: [st(5, 'success', 'NO_DEPLOY')] }) })).skip, true, '이미 전부 target');
});

test('workflow 는 success 여도 모든 서비스를 올리지 못한 run 은 완료가 아니다 (Codex #980 P2 2건)', async () => {
  const cases = {
    'freeze · guard skip · 판정 거절 = status 없음': [],
    '다른 run 의 status 만 있음': [st(4, 'success', 'DEPLOYED · deploy: api')],
    'classify 의 DEPLOYING 만 남음(report 없음)': [st(5, 'pending', 'DEPLOYING · deploy: api')],
    '한 서비스 serving 조회 실패로 보류(PROMOTE_REFUSED_UNKNOWN_SERVING)': [st(5, 'pending', 'HELD_LEVEL_3 · deploy: api · held: neture(L3)')],
    '서비스 일부만 선택(NOT_SELECTED)': [st(5, 'pending', 'NOT_SELECTED · deploy: api · held: neture(not-selected)')],
    '배포 실패': [st(5, 'failure', 'FAILED · deploy: api · failed: neture')],
    '취소': [st(5, 'error', 'CANCELLED · cancelled: neture (re-run Delivery)')],
    'HEAD 아님(SUPERSEDED · 배포 0)': [st(5, 'success', 'SUPERSEDED')],
    'state 가 success 가 아님(설명 첫 단어만 DEPLOYED)': [st(5, 'pending', 'DEPLOYED · deploy: api')],
    '나중 status 가 pending 으로 덮음': [st(5, 'pending', 'HELD_LEVEL_3 · held: api(L3)'), st(5, 'success', 'DEPLOYED · deploy: api')],
  };
  for (const [name, statuses] of Object.entries(cases)) {
    assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5 })], { statuses }) })).skip, false, name);
  }
});

test('target_url 은 run id 경계로 맞춘다 (run 5 ≠ run 55 · attempts 경로 허용)', async () => {
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5 })], { statuses: [st(55, 'success', 'DEPLOYED')] }) })).skip, false);
  const attempt = { context: 'production', state: 'success', description: 'DEPLOYED', target_url: `${RUN_URL(5)}/attempts/2` };
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5 })], { statuses: [attempt] }) })).skip, true);
  const other = { ...attempt, context: 'ci/other', target_url: RUN_URL(5) };
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5 })], { statuses: [other] }) })).skip, false, '다른 context');
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
  const third = await checkDuplicate({ ...base, runId: 7, fetchImpl: api([run({ id: 5 })], { statuses: [] }) });
  assert.equal(third.skip, false);
});

test('실패 · 취소된 이전 run 은 재시도를 허용한다', async () => {
  for (const conclusion of ['failure', 'cancelled', 'timed_out']) {
    assert.equal((await checkDuplicate({ ...base, fetchImpl: api([run({ id: 5, conclusion })]) })).skip, false, conclusion);
  }

});

test('서비스 범위: 진행 중인 앞 run 은 범위가 덮을 때만, 끝난 run 은 모든 서비스가 target 일 때만 막는다 (Codex #980 P2)', async () => {
  const titled = (over, svc) => run({ ...over, display_title: `Promote ${SHA} · services=${svc}` });
  const inflight = (svc) => titled({ id: 5, status: 'in_progress', conclusion: null }, svc);
  // 진행 중인 api 전용 run 은 전체 · 다른 서비스 요청을 막지 않는다
  assert.equal((await checkDuplicate({ ...base, services: '', fetchImpl: api([inflight('api')]) })).skip, false, 'api → 전부');
  assert.equal((await checkDuplicate({ ...base, services: 'neture', fetchImpl: api([inflight('api')]) })).skip, false, 'api → neture');
  assert.equal((await checkDuplicate({ ...base, services: 'api,neture', fetchImpl: api([inflight('api')]) })).skip, false, 'api → api,neture');
  // 덮으면 막는다 (순서 · 공백 무관) · 범위 없는 run = 전부
  assert.equal((await checkDuplicate({ ...base, services: 'api', fetchImpl: api([inflight('api')]) })).skip, true, 'api → api');
  assert.equal((await checkDuplicate({ ...base, services: ' neture , api ', fetchImpl: api([inflight('api,neture,store')]) })).skip, true, '상위 집합');
  assert.equal((await checkDuplicate({ ...base, services: 'store', fetchImpl: api([run({ id: 5, status: 'in_progress', conclusion: null })]) })).skip, true, '전부 → store');
  // 끝난 api 전용 run: 나머지가 NOT_SELECTED 로 남았으면(pending) 전체 요청은 실행
  const apiOnly = titled({ id: 5 }, 'api');
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([apiOnly], { statuses: [st(5, 'pending', 'NOT_SELECTED · deploy: api · held: neture(not-selected)')] }) })).skip, false, 'api 만 승격 → 전부');
  // 다른 서비스가 이미 target 이라 api 만으로 전부 target 이 됐으면(DEPLOYED) 어떤 요청이든 충족
  assert.equal((await checkDuplicate({ ...base, fetchImpl: api([apiOnly], { statuses: [st(5, 'success', 'DEPLOYED · deploy: api')] }) })).skip, true, '전부 target');
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
  // commit status 조회만 실패 · 형식 이상 — 완료를 확인할 수 없으므로 실행
  const statusFail = async (url) => (/\/statuses/.test(url) ? { ok: false, status: 502, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ workflow_runs: [run({ id: 5 })] }) });
  assert.equal((await checkDuplicate({ ...base, fetchImpl: statusFail })).skip, false);
  const statusOdd = async (url) => ({ ok: true, status: 200, json: async () => (/\/statuses/.test(url) ? { not: 'array' } : { workflow_runs: [run({ id: 5 })] }) });
  assert.equal((await checkDuplicate({ ...base, fetchImpl: statusOdd })).skip, false);
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
  assert.equal(j.dedupe.permissions.statuses, 'read', 'guard 는 commit status 를 읽기만 한다');
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
