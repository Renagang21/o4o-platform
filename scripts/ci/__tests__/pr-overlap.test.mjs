/**
 * scripts/ci/pr-overlap.mjs · .github/workflows/automation-pr-overlap.yml 회귀 테스트.
 * 의존성(js-yaml 제외) · 네트워크 · 토큰 0 — GitHub API 는 가짜 객체로 대신한다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { MARKER, computeOverlaps, isHubFile, lanesOf, makeApi, renderComment, run } from '../pr-overlap.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REPO = 'Renagang21/o4o-platform';
const f = (filename, status = 'modified', extra = {}) => ({ filename, status, ...extra });

test('lane 분류 — AGENTS.md §4-3 표', () => {
  assert.deepEqual(lanesOf(f('apps/api-server/src/database/migrations/1790000000000-AddX.ts', 'added')), ['migration']);
  assert.deepEqual(lanesOf(f('apps/api-server/src/database/migrations/1700000000000-Old.ts', 'modified')), []);
  assert.deepEqual(lanesOf(f('apps/api-server/src/database/incremental/manifest.ts')), ['migration']);
  assert.deepEqual(lanesOf(f('apps/api-server/src/database/incremental/expected-schema-states.ts')), ['migration']);
  assert.deepEqual(lanesOf(f('apps/api-server/src/bootstrap/register-routes.ts')), ['core-hub']);
  assert.deepEqual(lanesOf(f('apps/api-server/src/services/startup.service.ts')), ['core-hub']);
  assert.deepEqual(lanesOf(f('packages/auth-core/src/index.ts')), ['core-hub']);
  assert.deepEqual(lanesOf(f('packages/ui/src/Button.tsx')), ['shared-package:ui']);
  assert.deepEqual(lanesOf(f('services/web-neture/src/App.tsx')), []);
  assert.deepEqual(lanesOf(f('apps/api-server/src/modules/x/x.service.ts')), []);
  // §4-3 공통 controller — 여러 서비스가 함께 쓰는 operator console · common 계층 (Codex #1015)
  assert.deepEqual(lanesOf(f('apps/api-server/src/controllers/operator/MembershipConsoleController.ts')), ['core-hub']);
  assert.deepEqual(lanesOf(f('apps/api-server/src/common/base.controller.ts')), ['core-hub']);
  assert.deepEqual(lanesOf(f('apps/api-server/src/controllers/operator/__tests__/MembershipConsoleController.deleteScope.test.ts')), []);
  assert.deepEqual(lanesOf(f('apps/api-server/src/common/x.spec.ts')), []);
  assert.deepEqual(lanesOf(f('apps/api-server/src/controllers/kpa-branch/x.controller.ts')), []);
  assert.equal(isHubFile('services/web-neture/src/App.tsx'), true);
  assert.equal(isHubFile('docs/work-orders/TODO-O4O-X-V1.md'), true);
  assert.equal(isHubFile('docs/work-orders/WO-O4O-X-V1.md'), false);
});

test('같은 파일 · 이름 변경 전 경로 · 같은 lane(파일은 달라도)을 찾는다', () => {
  const current = { number: 10, files: [f('a.ts'), f('packages/ui/src/A.tsx'), f('new/b.ts', 'renamed', { previous_filename: 'old/b.ts' })] };
  const others = [
    { number: 3, title: 'same file', draft: false, files: [f('a.ts')] },
    { number: 4, title: 'renamed source', draft: true, files: [f('old/b.ts')] },
    { number: 5, title: 'same lane', draft: false, files: [f('packages/ui/src/B.tsx')] },
    { number: 6, title: 'unrelated', draft: false, files: [f('z.ts'), f('packages/other/x.ts')] },
    { number: 10, title: 'self', draft: false, files: [f('a.ts')] },
  ];
  assert.deepEqual(computeOverlaps(current, others), [
    { number: 3, title: 'same file', draft: false, files: ['a.ts'], lanes: [] },
    { number: 4, title: 'renamed source', draft: true, files: ['old/b.ts'], lanes: [] },
    { number: 5, title: 'same lane', draft: false, files: [], lanes: ['shared-package:ui'] },
  ]);
});

test('서로 다른 공통 controller 를 바꾸는 PR 은 같은 core-hub lane 으로 겹친다 (Codex #1015)', () => {
  const current = { number: 1, files: [f('apps/api-server/src/controllers/operator/MembershipConsoleController.ts')] };
  const others = [{ number: 2, title: 'products', draft: false, files: [f('apps/api-server/src/controllers/operator/ProductConsoleController.ts')] }];
  assert.deepEqual(computeOverlaps(current, others), [{ number: 2, title: 'products', draft: false, files: [], lanes: ['core-hub'] }]);
  assert.match(renderComment(computeOverlaps(current, others), { sha: 'x', repo: REPO }), /§4-3 R1/);
});

test('댓글: marker · 표 · R1 경고(Ready 같은 lane 일 때만) · 허브 안내 · 멘션 없음', () => {
  const rows = [
    { number: 5, title: 'a | b', draft: false, files: [], lanes: ['migration'] },
    { number: 7, title: 'hub', draft: true, files: ['services/web-x/src/App.tsx'], lanes: [] },
  ];
  const body = renderComment(rows, { sha: 'abcdef1234567', repo: REPO });
  assert.ok(body.startsWith(MARKER));
  assert.match(body, /\| #5 a \\\| b \| Ready \| — \| `migration` \|/);
  assert.match(body, /\| #7 hub \| 드래프트 \| `services\/web-x\/src\/App\.tsx` \| — \|/);
  assert.match(body, /§4-3 R1/);
  assert.match(body, /R6/);
  assert.match(body, /`abcdef123`/);
  assert.match(body, /https:\/\/github\.com\/Renagang21\/o4o-platform\/blob\/main\/AGENTS\.md/);
  assert.doesNotMatch(body, /@\w/);

  const draftOnly = renderComment([{ number: 5, title: 't', draft: true, files: [], lanes: ['migration'] }], { sha: 'x', repo: REPO });
  assert.doesNotMatch(draftOnly, /R1/, '드래프트와의 lane 겹침은 R1 위반이 아니다');

  const many = renderComment([{ number: 9, title: 't', draft: false, files: Array.from({ length: 13 }, (_, i) => `f${i}.ts`), lanes: [] }], { sha: 'x', repo: REPO });
  assert.match(many, /외 3개/);

  assert.match(renderComment([], { sha: 'x', repo: REPO }), /열린 PR 은 없습니다/);
});

function fakeApi({ pulls, files, comments = [] }) {
  const calls = [];
  return {
    calls,
    openPulls: async () => pulls,
    files: async (n) => files[n] ?? [],
    comments: async () => comments,
    createComment: async (n, body) => calls.push(['create', n, body]),
    updateComment: async (id, body) => calls.push(['update', id, body]),
  };
}
const pr = (number, draft = false) => ({ number, title: `PR ${number}`, draft, head: { sha: `sha${number}000000` } });

test('run: 겹치면 댓글 생성, 없고 이전 댓글도 없으면 아무것도 쓰지 않는다', async () => {
  const api = fakeApi({ pulls: [pr(1), pr(2)], files: { 1: [f('a.ts')], 2: [f('a.ts')] } });
  assert.equal((await run({ api, number: 1, repo: REPO })).action, 'created');
  assert.equal(api.calls[0][0], 'create');
  assert.equal(api.calls[0][1], 1);

  const quiet = fakeApi({ pulls: [pr(1), pr(2)], files: { 1: [f('a.ts')], 2: [f('b.ts')] } });
  assert.equal((await run({ api: quiet, number: 1, repo: REPO })).action, 'none');
  assert.equal(quiet.calls.length, 0);
});

test('run: 이전 봇 댓글은 고치고(겹침 해소 포함), 같은 내용이면 건드리지 않으며, 사람 댓글은 무시한다', async () => {
  const human = { id: 1, user: { type: 'User' }, body: `${MARKER} 사람이 붙여 넣은 글` };
  const bot = { id: 2, user: { type: 'Bot' }, body: `${MARKER}\nold` };
  const api = fakeApi({ pulls: [pr(1), pr(2)], files: { 1: [f('a.ts')], 2: [f('b.ts')] }, comments: [human, bot] });
  assert.equal((await run({ api, number: 1, repo: REPO })).action, 'updated');
  assert.deepEqual(api.calls.map((c) => c.slice(0, 2)), [['update', 2]]);
  assert.match(api.calls[0][2], /열린 PR 은 없습니다/);

  const same = renderComment([], { sha: 'sha1000000', repo: REPO });
  const api2 = fakeApi({ pulls: [pr(1)], files: { 1: [f('a.ts')] }, comments: [{ id: 3, user: { type: 'Bot' }, body: same }] });
  assert.equal((await run({ api: api2, number: 1, repo: REPO })).action, 'unchanged');
  assert.equal(api2.calls.length, 0);

  const closed = fakeApi({ pulls: [pr(2)], files: {} });
  assert.equal((await run({ api: closed, number: 1, repo: REPO })).action, 'skip');
});

test('makeApi: 인증 헤더 · 페이지네이션 · 오류 상태 전달', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push([url, init.method, init.headers.authorization]);
    const page = Number(new URL(url).searchParams.get('page'));
    const items = page === 1 ? Array.from({ length: 100 }, (_, i) => ({ number: i })) : [{ number: 100 }];
    return { ok: true, status: 200, json: async () => items };
  };
  const api = makeApi({ token: 't', repo: REPO, fetchImpl });
  assert.equal((await api.openPulls()).length, 101);
  assert.equal(seen.length, 2);
  assert.match(seen[0][0], /\/repos\/Renagang21\/o4o-platform\/pulls\?state=open&per_page=100&page=1$/);
  assert.equal(seen[0][2], 'Bearer t');

  const failing = makeApi({ token: 't', repo: REPO, fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({}) }) });
  await assert.rejects(failing.files(1), /403/);
});

test('workflow: Ready 에서만 · fork 제외 · 최소 권한 · 병합 gate 아님', () => {
  const wf = yaml.load(readFileSync(path.join(root, '.github/workflows/automation-pr-overlap.yml'), 'utf8'));
  assert.deepEqual(wf.on.pull_request.types, ['opened', 'synchronize', 'reopened', 'ready_for_review']);
  assert.deepEqual(wf.permissions, { contents: 'read', 'pull-requests': 'read', issues: 'write' });
  const job = wf.jobs['overlap-notice'];
  assert.match(job.if, /!github\.event\.pull_request\.draft/);
  assert.match(job.if, /head\.repo\.fork != true/);
  assert.ok(job.steps.some((s) => s.run === 'node scripts/ci/pr-overlap.mjs'));
  assert.ok(!job.steps.some((s) => /pnpm|npm ci|npm install/.test(s.run ?? '')), '설치 없이 실행');

  const ci = yaml.load(readFileSync(path.join(root, '.github/workflows/ci-pipeline.yml'), 'utf8'));
  assert.ok(!JSON.stringify(ci.jobs['ci-gate'].needs).includes('overlap'), 'CI Gate needs 에 넣지 않는다');

  const src = readFileSync(path.join(root, 'scripts/ci/pr-overlap.mjs'), 'utf8');
  for (const m of src.matchAll(/^\s*import\s[^'"]*?['"]([^'"]+)['"]/gm)) {
    assert.ok(m[1].startsWith('node:'), `외부 패키지 import: ${m[1]}`);
  }
});
