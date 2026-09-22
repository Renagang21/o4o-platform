/**
 * WO-O4O-ADMIN-CI-CD-AFFECTED-SCOPE-AND-DUPLICATE-WORK-REDUCTION-V1
 *   — affected scope 판정기 회귀 시험 (WO §13 Case 1~8)
 *
 * 의존성 0. Node 22 내장 test runner 로 blocking 실행한다.
 *   node --test scripts/ci/__tests__/detect-affected.test.mjs
 *
 * 고정하는 것
 *   - Admin 의존성 closure 는 **하드코딩이 아니라** 실제 workspace graph 에서 나온다
 *   - 무관한 package 변경은 Admin 을 깨우지 않는다
 *   - 의심스러운 모든 입력(root manifest · CI infra · 매핑 불가 · base SHA 이상)은
 *     full CI 로 fallback 한다
 *   - multi-commit push 에서 앞쪽 commit 의 변경을 놓치지 않는다
 *   - admin_only 여도 Admin 소스를 읽는 api-server 정적 guard spec 은 선별된다
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  buildWorkspaceGraph,
  dependencyClosure,
  classify,
  parseFileList,
  readChangedFiles,
  selectPathGuardSpecs,
  workspaceDirOf,
} from '../detect-affected.mjs';

const graph = buildWorkspaceGraph();
const verdictOf = (lines) => classify(parseFileList(lines.join('\n')), graph);

const ADMIN = '@o4o/admin-dashboard';
const API = '@o4o/api-server';

// ---------------------------------------------------------------------------
// 0. census — graph 가 실제 저장소를 읽었는지 먼저 확인한다
// ---------------------------------------------------------------------------

test('0. workspace graph 와 Admin closure 를 실제로 읽는다', () => {
  assert.ok(graph.byName.size > 50, `workspace 수가 너무 적다: ${graph.byName.size}`);
  assert.ok(graph.byName.has(ADMIN));
  assert.ok(graph.byName.has(API));

  const closure = dependencyClosure(graph, ADMIN);
  assert.ok(closure.has(ADMIN));
  // 하드코딩 목록이 아니라 graph 탐색 결과다 — 대표 의존성으로 실재성을 확인한다.
  for (const dep of ['@o4o/types', '@o4o/ui', '@o4o/auth-react']) {
    assert.ok(closure.has(dep), `${dep} 가 Admin closure 에 있어야 한다`);
  }
  assert.equal(workspaceDirOf(graph, 'apps/admin-dashboard/src/main.tsx'), 'apps/admin-dashboard');
});

// ---------------------------------------------------------------------------
// Case 1 — Admin source only
// ---------------------------------------------------------------------------

test('Case 1. Admin 소스 + 문서만 → admin_only', () => {
  const v = verdictOf([
    'M\tapps/admin-dashboard/src/pages/auth/ForgotPassword.tsx',
    'M\tdocs/checks/CHECK-X.md',
    'A\tdocs/work-orders/WO-X.md',
  ]);
  assert.equal(v.admin_affected, true);
  assert.equal(v.admin_only, true);
  assert.equal(v.api_affected, false);
  assert.equal(v.global_or_unknown, false);
});

// ---------------------------------------------------------------------------
// Case 2 — unrelated package
// ---------------------------------------------------------------------------

test('Case 2. Admin closure 밖 package/service → admin_affected=false', () => {
  assert.equal(
    dependencyClosure(graph, ADMIN).has('@o4o/hospital-pharmacy-core'),
    false,
    'hospital-pharmacy-core 가 Admin closure 에 들어오면 이 케이스의 전제가 깨진다',
  );

  const v = verdictOf([
    'M\tpackages/hospital-pharmacy-core/src/adapter.ts',
    'A\tservices/web-hospital-pharmacy/src/App.tsx',
  ]);
  assert.equal(v.admin_affected, false);
  assert.equal(v.admin_only, false);
  assert.equal(v.global_or_unknown, false);
});

// ---------------------------------------------------------------------------
// Case 3 — Admin transitive dependency
// ---------------------------------------------------------------------------

test('Case 3. Admin transitive dependency 변경 → admin_affected=true / admin_only=false', () => {
  const closure = dependencyClosure(graph, ADMIN);
  const samples = ['packages/auth-react', 'packages/types', 'packages/ui'];
  for (const dir of samples) {
    const pkg = graph.byDir.get(dir);
    assert.ok(pkg && closure.has(pkg), `${dir} 는 Admin closure 안이어야 한다`);
    const v = verdictOf([`M\t${dir}/src/index.ts`]);
    assert.equal(v.admin_affected, true, dir);
    assert.equal(v.admin_only, false, dir);
    assert.equal(v.global_or_unknown, false, dir);
  }
});

// ---------------------------------------------------------------------------
// Case 4 — API only
// ---------------------------------------------------------------------------

test('Case 4. api-server 단독 변경 → Admin 미영향 / api_affected=true', () => {
  const v = verdictOf(['M\tapps/api-server/src/routes/health.ts']);
  assert.equal(v.admin_affected, false);
  assert.equal(v.admin_only, false);
  assert.equal(v.api_affected, true);
  assert.equal(v.global_or_unknown, false);
});

// ---------------------------------------------------------------------------
// Case 5 — Admin + API
// ---------------------------------------------------------------------------

test('Case 5. Admin + API 혼합 → full regression 경로', () => {
  const v = verdictOf([
    'M\tapps/admin-dashboard/src/main.tsx',
    'M\tapps/api-server/src/main.ts',
  ]);
  assert.equal(v.admin_affected, true);
  assert.equal(v.admin_only, false);
  assert.equal(v.api_affected, true);
});

// ---------------------------------------------------------------------------
// Case 6 — root dependency / build config, CI infrastructure
// ---------------------------------------------------------------------------

test('Case 6. root manifest · lockfile · CI infra → global fallback', () => {
  const globals = [
    'pnpm-lock.yaml',
    'package.json',
    'pnpm-workspace.yaml',
    '.npmrc',
    'eslint.config.js',
    '.github/actions/setup-build-env/action.yml',
    '.github/workflows/ci-pipeline.yml',
    '.github/workflows/deploy-admin.yml',
    'scripts/ci-build-app.sh',
    'scripts/ci/detect-affected.mjs',
    'tools/o4o-local-agent/test/local-db.test.mjs',
  ];
  for (const file of globals) {
    const v = verdictOf([`M\t${file}`]);
    assert.equal(v.global_or_unknown, true, file);
    assert.equal(v.admin_affected, true, file);
    assert.equal(v.api_affected, true, file);
    assert.equal(v.admin_only, false, file);
  }
});

test('Case 6b. 매핑되지 않는 경로는 global 이다 (조용한 skip 금지)', () => {
  const v = verdictOf(['M\tREADME.md', 'M\tsome/unknown/place.txt']);
  assert.equal(v.global_or_unknown, true);
  assert.equal(v.admin_affected, true);
});

test('Case 6c. 문서 삭제 · 이동은 중립이 아니다', () => {
  const kept = verdictOf(['M\tapps/admin-dashboard/src/main.tsx', 'M\tdocs/checks/A.md']);
  assert.equal(kept.admin_only, true);

  for (const status of ['D', 'R']) {
    const v = verdictOf([`M\tapps/admin-dashboard/src/main.tsx`, `${status}\tdocs/checks/A.md`]);
    assert.equal(v.global_or_unknown, true, status);
    assert.equal(v.admin_only, false, status);
  }
});

// ---------------------------------------------------------------------------
// Case 7 / 8 — 실제 git 경로 (multi-commit push, base SHA 이상)
// ---------------------------------------------------------------------------

const git = (cwd, args) =>
  spawnSync('git', ['-c', 'user.name=ci-test', '-c', 'user.email=ci@test.local', ...args], {
    cwd,
    encoding: 'utf-8',
  });

const makeRepo = () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'o4o-detect-'));
  git(dir, ['init', '-q', '-b', 'main']);
  const write = (rel, body) => {
    const abs = path.join(dir, ...rel.split('/'));
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, body, 'utf-8');
  };
  write('README.md', 'base\n');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'base']);
  const base = git(dir, ['rev-parse', 'HEAD']).stdout.trim();
  return { dir, write, base };
};

test('Case 7. multi-commit push — 마지막 commit 이 docs-only 여도 앞의 Admin 변경을 감지한다', () => {
  const { dir, write, base } = makeRepo();
  try {
    write('apps/admin-dashboard/src/main.tsx', 'x\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'admin change']);

    write('docs/checks/CHECK.md', 'doc\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'docs only']);
    const head = git(dir, ['rev-parse', 'HEAD']).stdout.trim();

    // HEAD~1 만 봤다면 docs 만 보여 Admin 변경을 놓친다 — push batch 전체를 본다.
    const lastCommitOnly = readChangedFiles(`${head}~1`, head, dir);
    assert.equal(lastCommitOnly.ok, true);
    assert.deepEqual(lastCommitOnly.files.map((f) => f.path), ['docs/checks/CHECK.md']);

    const batch = readChangedFiles(base, head, dir);
    assert.equal(batch.ok, true);
    const paths = batch.files.map((f) => f.path).sort();
    assert.deepEqual(paths, ['apps/admin-dashboard/src/main.tsx', 'docs/checks/CHECK.md']);
    assert.equal(classify(batch.files, graph).admin_affected, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Case 8. base SHA 이상(all-zero · 없는 commit) → safe fallback', () => {
  const { dir, base } = makeRepo();
  try {
    const head = git(dir, ['rev-parse', 'HEAD']).stdout.trim();
    assert.equal(readChangedFiles('0000000000000000000000000000000000000000', head, dir).ok, false);
    assert.equal(readChangedFiles('', head, dir).ok, false);
    assert.equal(readChangedFiles('deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', head, dir).ok, false);
    // 정상 입력은 여전히 성공해야 한다 (fallback 이 만능 참이 되지 않도록)
    assert.equal(readChangedFiles(base, head, dir).ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // 판정 불가 입력은 admin_affected=true 로 흘러야 한다
  const v = classify([], graph);
  assert.equal(v.global_or_unknown, true);
  assert.equal(v.admin_affected, true);
  assert.equal(v.api_affected, true);
  assert.equal(v.fallback, true);
});

// ---------------------------------------------------------------------------
// admin_only 여도 Admin 소스를 읽는 정적 guard 는 남는다
// ---------------------------------------------------------------------------

test('admin_only 경로에서도 Admin 소스를 읽는 api-server 정적 guard spec 이 선별된다', () => {
  const files = parseFileList('M\tapps/admin-dashboard/src/pages/auth/ForgotPassword.tsx');
  const specs = selectPathGuardSpecs(files, graph);

  assert.ok(specs.length >= 10, `선별된 guard spec 이 너무 적다: ${specs.length}`);
  for (const spec of specs) assert.match(spec, /^src\/__tests__\/.+\.spec\.ts$/);

  // 대표 guard — Admin 소스를 raw text 로 읽어 은퇴 패턴 재유입을 막는 spec 들
  for (const expected of [
    'src/__tests__/legacy-partner-runtime-retirement.spec.ts',
    'src/__tests__/legacy-wordpress-block-editor-retirement.spec.ts',
    'src/__tests__/shortcode-domain-retirement.spec.ts',
  ]) {
    assert.ok(specs.includes(expected), `${expected} 가 선별되어야 한다`);
  }

  // 전체 suite 를 그대로 되돌리는 것은 선별이 아니다 — 실제로 부분집합이어야 한다
  assert.ok(specs.length < 100, `선별이 사실상 전체다: ${specs.length}`);
});
