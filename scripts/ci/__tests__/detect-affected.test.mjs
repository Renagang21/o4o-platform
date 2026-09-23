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
 *
 * WO-O4O-DOCS-ONLY-CI-SECURITY-FAST-PATH-AND-PUSH-CONCURRENCY-PRESERVATION-V1 §19 (Case D1~D10)
 *   - Markdown 문서 추가·수정만 docs fast path 다
 *   - `docs/` 안이어도 데이터 자산(JSON fixture 등)은 fast 가 아니다
 *   - 문서 삭제·이동, 코드 혼합, base SHA 이상은 전부 기존 경로다
 *   - scheduled CodeQL 은 판정과 무관하게 항상 Analyze 한다 (workflow 계약)
 *   - main push 는 진행 중인 검증을 취소하지 않는다 (concurrency 계약)
 *
 * WO-O4O-API-CD-RUNTIME-AFFECTED-DEPLOY-GATE-V1 §17 (Case A~K)
 *   - CI 영향(api_ci_affected)과 배포 영향(api_deploy_affected)은 다른 축이다
 *   - API test 만 바뀐 변경은 production image 를 바꾸지 않는다 → 배포 skip
 *   - closure 밖 package · 서비스 프론트 변경은 API 를 배포시키지 않는다
 *   - migration 변경은 무조건 배포 영향이다
 *   - pnpm-lock.yaml 은 importer 단위로 정밀 판정하되 조금이라도 불확실하면 true
 *   - base SHA 이상 · 판정 실패는 전부 배포 fallback(true)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  apiDeployImporters,
  buildWorkspaceGraph,
  dependencyClosure,
  classify,
  classifyApiDeploy,
  classifyDocs,
  isApiNonDeployPath,
  lockfileDeployImpact,
  parseFileList,
  parsePnpmLock,
  readChangedFiles,
  REPO_ROOT,
  selectDocsConsumerSpecs,
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

// ---------------------------------------------------------------------------
// Case D1~D10 — docs fast path
//   WO-O4O-DOCS-ONLY-CI-SECURITY-FAST-PATH-AND-PUSH-CONCURRENCY-PRESERVATION-V1 §19
// ---------------------------------------------------------------------------

const docsOf = (lines) => classifyDocs(parseFileList(lines.join('\n')));

test('Case D1. CHECK 문서 1건 수정 → docs fast', () => {
  const v = verdictOf(['M\tdocs/checks/CHECK-X.md']);
  assert.equal(v.docs_only, true);
  assert.equal(v.docs_fast_eligible, true);
  assert.equal(v.global_or_unknown, false);
  // docs fast 는 code 축을 깨우지 않는다
  assert.equal(v.admin_affected, false);
  assert.equal(v.api_affected, false);
});

test('Case D2. baseline 수정 + WO 추가 → docs fast', () => {
  const v = verdictOf(['M\tdocs/baseline/X.md', 'A\tdocs/work-orders/WO-X.md']);
  assert.equal(v.docs_only, true);
  assert.equal(v.docs_fast_eligible, true);
});

test('Case D3. docs 안의 데이터 자산은 fast 아님', () => {
  const v = verdictOf(['M\tdocs/checks/data/product-description-guard/foo.json']);
  assert.equal(v.docs_only, true, 'docs/ 안이므로 docs_only 는 참이다');
  assert.equal(v.docs_fast_eligible, false, 'Markdown 이 아니므로 fast 가 아니다');

  // 확장자 축과 세그먼트 축이 각각 독립적으로 막는다
  assert.equal(docsOf(['M\tdocs/guides/content-authoring/translations/ko.json']).docs_fast_eligible, false);
  assert.equal(docsOf(['M\tdocs/checks/data/anything.md']).docs_fast_eligible, false, 'data/ 세그먼트는 .md 여도 제외');
  assert.equal(docsOf(['M\tdocs/checks/rollback-manifest.yml']).docs_fast_eligible, false);
  assert.equal(docsOf(['M\tdocs/checks/export.csv']).docs_fast_eligible, false);
});

test('Case D4. 문서 삭제 → full fallback (기록물 존재를 단언하는 정적 spec 보호)', () => {
  const v = verdictOf(['D\tdocs/checks/X.md']);
  assert.equal(v.docs_fast_eligible, false);
  assert.equal(v.global_or_unknown, true);
  assert.equal(v.api_affected, true);
});

test('Case D5. 문서 rename → full fallback', () => {
  const v = verdictOf(['R\tdocs/baseline/A.md', 'R\tdocs/baseline/B.md']);
  assert.equal(v.docs_fast_eligible, false);
  assert.equal(v.global_or_unknown, true);
});

test('Case D6. 문서 + API 코드 혼합 → docs_only=false, 기존 code 경로', () => {
  const v = verdictOf(['M\tdocs/checks/X.md', 'M\tapps/api-server/src/foo.ts']);
  assert.equal(v.docs_only, false);
  assert.equal(v.docs_fast_eligible, false);
  assert.equal(v.api_affected, true);
});

test('Case D6-b. 문서 + scripts/.github/root manifest 혼합 → global fallback', () => {
  for (const other of [
    'M\tscripts/ci/detect-affected.mjs',
    'M\t.github/workflows/ci-pipeline.yml',
    'M\tpackage.json',
  ]) {
    const v = verdictOf(['M\tdocs/checks/X.md', other]);
    assert.equal(v.docs_fast_eligible, false, other);
    assert.equal(v.global_or_unknown, true, other);
  }
});

test('Case D7. multi-commit push — 앞 commit 이 코드면 docs fast 아님', () => {
  const { dir, write, base } = makeRepo();
  try {
    write('apps/admin-dashboard/src/main.tsx', 'code\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'code']);

    write('docs/checks/CHECK.md', 'doc\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'docs only']);
    const head = git(dir, ['rev-parse', 'HEAD']).stdout.trim();

    // 마지막 commit 만 보면 docs-only 로 보인다 — push batch 전체 기준으로 판정해야 한다.
    const lastOnly = classify(readChangedFiles(`${head}~1`, head, dir).files, graph);
    assert.equal(lastOnly.docs_fast_eligible, true, '마지막 commit 단독은 docs-only 다');

    const batch = readChangedFiles(base, head, dir);
    assert.equal(batch.ok, true);
    const v = classify(batch.files, graph);
    assert.equal(v.docs_only, false, 'push batch 전체를 보면 docs-only 가 아니다');
    assert.equal(v.docs_fast_eligible, false);
    assert.equal(v.admin_affected, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Case D8. multi-commit push — 전부 문서면 docs fast', () => {
  const { dir, write, base } = makeRepo();
  try {
    write('docs/checks/CHECK-1.md', 'doc\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'docs 1']);

    write('docs/work-orders/WO-2.md', 'doc\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'docs 2']);
    const head = git(dir, ['rev-parse', 'HEAD']).stdout.trim();

    const batch = readChangedFiles(base, head, dir);
    assert.equal(batch.ok, true);
    const v = classify(batch.files, graph);
    assert.equal(v.docs_only, true);
    assert.equal(v.docs_fast_eligible, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Case D9. 판정 불가 입력은 docs fast 가 되지 않는다', () => {
  const v = classify([], graph);
  assert.equal(v.docs_only, false);
  assert.equal(v.docs_fast_eligible, false);
  assert.equal(v.fallback, true);
  assert.equal(docsOf([]).docs_fast_eligible, false);
});

// ---------------------------------------------------------------------------
// 문서를 실제로 소비하는 test 선별 (§9 census 결과 고정)
// ---------------------------------------------------------------------------

test('변경 문서를 raw text 로 읽는 api-server test 가 선별된다 (nested 포함)', () => {
  const checks = selectDocsConsumerSpecs(parseFileList('M\tdocs/checks/CHECK-X.md'));
  // 기록물 폴더 존재·문서 수를 단언하는 정적 guard
  assert.ok(
    checks.includes('src/__tests__/archive-retention-and-tracked-backup-disposition.spec.ts'),
    `archive-retention guard 가 선별되어야 한다: ${checks.join(' ')}`,
  );
  // top-level 만 훑으면 놓치는 nested consumer (docs/checks/data/ JSON 을 읽는다)
  assert.ok(
    checks.includes('src/modules/content-guard/__tests__/liquid-guard.test.ts'),
    `nested docs consumer 가 선별되어야 한다: ${checks.join(' ')}`,
  );

  const baseline = selectDocsConsumerSpecs(
    parseFileList('M\tdocs/baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md'),
  );
  assert.ok(
    baseline.includes('src/__tests__/channels-stack-retirement.spec.ts'),
    `baseline 문서 존재를 단언하는 spec 이 선별되어야 한다: ${baseline.join(' ')}`,
  );

  // 선별이지 전체 실행이 아니다
  assert.ok(checks.length > 0 && checks.length < 40, `선별이 사실상 전체다: ${checks.length}`);
  for (const spec of checks) assert.match(spec, /^src\/.+\.(spec|test)\.tsx?$/);

  // 문서가 아닌 변경에는 docs consumer 선별이 관여하지 않는다
  assert.deepEqual(selectDocsConsumerSpecs(parseFileList('M\tapps/api-server/src/foo.ts')), []);
});

// ---------------------------------------------------------------------------
// Case D10 + §17 — workflow 계약 (YAML 정적 검증)
// ---------------------------------------------------------------------------

const workflowYaml = (name) => readFileSync(path.join(REPO_ROOT, '.github', 'workflows', name), 'utf-8');

test('Case D10. scheduled · workflow_dispatch CodeQL 은 판정과 무관하게 Analyze 한다', () => {
  const yml = workflowYaml('ci-security.yml');
  assert.match(yml, /schedule:/);
  assert.match(yml, /github\.event_name == 'schedule'/, 'schedule 은 항상 Analyze 여야 한다');
  assert.match(yml, /github\.event_name == 'workflow_dispatch'/, 'workflow_dispatch 는 항상 Analyze 여야 한다');
  assert.match(yml, /docs_fast_eligible != 'true'/, 'docs fast 일 때만 skip 이어야 한다');
});

test('§17. main push 는 진행 중인 검증을 취소하지 않는다 (PR 만 cancel-in-progress)', () => {
  for (const name of ['ci-pipeline.yml', 'ci-security.yml']) {
    const yml = workflowYaml(name);
    assert.match(
      yml,
      /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/,
      `${name} 의 concurrency 가 PR 한정 취소여야 한다`,
    );
  }
});

test('docs fast job 은 heavy job 과 상호배타다 (ci-pipeline.yml 계약)', () => {
  const yml = workflowYaml('ci-pipeline.yml');
  assert.match(yml, /docs-fast-validate:/, 'docs fast job 이 있어야 한다');
  const heavy = yml.match(/needs\.detect\.outputs\.docs_fast_eligible != 'true'/g) ?? [];
  assert.ok(heavy.length >= 3, `heavy job 게이트가 3개 이상이어야 한다: ${heavy.length}`);
});


// ---------------------------------------------------------------------------
// WO-O4O-API-CD-RUNTIME-AFFECTED-DEPLOY-GATE-V1 §17 — API 배포 영향 판정 회귀 (Case A~K)
//
// 기존 Admin/Docs 케이스는 위에 그대로 남는다. 여기서는 **배포 축**만 본다.
// 원칙: false positive(불필요한 배포 1회)는 허용, false negative(배포 누락)는 금지.
// ---------------------------------------------------------------------------

/** 배포 축 판정만 뽑는다. lockfile 은 기본적으로 공급자 없음 = 안전 fallback. */
const deployOf = (lines, opts) => classifyApiDeploy(parseFileList(lines.join('\n')), graph, opts);

test('Case 0-D. API closure 는 하드코딩이 아니라 workspace graph 에서 나온다', () => {
  const closure = dependencyClosure(graph, API);
  assert.ok(closure.has(API));
  // 대표 의존성(실재 확인용) — 목록 자체가 계약은 아니다
  assert.ok(closure.has('@o4o/security-core'));
  assert.ok(closure.has('@o4o/platform-core'));
  // API 와 무관한 frontend package 는 closure 밖이다
  assert.ok(!closure.has('@o4o/hospital-pharmacy-core'));
  assert.ok(!closure.has('@o4o/store-ui-core'));
  assert.ok(!closure.has('@o4o/auth-react'));

  const importers = apiDeployImporters(graph, closure);
  assert.ok(importers.has('.'), 'root importer 는 보수적으로 포함한다');
  assert.ok(importers.has('apps/api-server'));
  assert.ok(!importers.has('services/web-hospital-pharmacy'));
});

test('Case A. API runtime source → 배포 영향', () => {
  const v = deployOf(['M\tapps/api-server/src/routes/foo.ts']);
  assert.equal(v.api_deploy_affected, true);

  const full = classify(parseFileList('M\tapps/api-server/src/routes/foo.ts'), graph);
  assert.equal(full.api_ci_affected, true);
  assert.equal(full.api_deploy_affected, true);
});

test('Case B. API test 만 → CI 는 돌고 배포는 안 한다', () => {
  const files = [
    'M\tapps/api-server/src/__tests__/foo.spec.ts',
    'M\tapps/api-server/src/services/__tests__/bar.test.ts',
    'M\tapps/api-server/jest.config.cjs',
    'M\tapps/api-server/tests/multi-tenant/navigation.spec.ts',
  ];
  const full = classify(parseFileList(files.join('\n')), graph);
  assert.equal(full.api_ci_affected, true, 'API 검증은 그대로 돌아야 한다');
  assert.equal(full.api_deploy_affected, false, 'production image 는 바뀌지 않는다');
});

test('Case C. API test helper/fixture 만 → 배포 영향 아님 (census 확인 경로)', () => {
  // 실재하는 helper 경로다. production source 가 이 경로를 import 하거나
  // raw text 로 읽는 사례가 0건임을 조사로 확인했다.
  for (const f of [
    'apps/api-server/src/__tests__/helpers/local-agent-db-stub.ts',
    'apps/api-server/src/__tests__/security/test-utils.ts',
    'apps/api-server/src/__tests__/setup/jest.setup.ts',
    'apps/api-server/src/modules/neture/promotion/__tests__/in-memory-promotion-store.ts',
    'apps/api-server/src/modules/content-guard/__tests__/fixtures/known-errors.ts',
  ]) {
    assert.equal(isApiNonDeployPath(f), true, `배포 무영향이어야 한다: ${f}`);
  }
  // 반대로 production 경로는 전부 배포 영향이다
  for (const f of [
    'apps/api-server/src/main.ts',
    'apps/api-server/src/migrate.ts',
    'apps/api-server/src/bootstrap/register-routes.ts',
    'apps/api-server/src/assets/fonts/x.ttf',
    'apps/api-server/Dockerfile',
    'apps/api-server/tsup.config.ts',
    'apps/api-server/package.production.json',
  ]) {
    assert.equal(isApiNonDeployPath(f), false, `배포 영향이어야 한다: ${f}`);
  }
});

test('Case D. API closure 안의 package → 배포 영향', () => {
  assert.equal(deployOf(['M\tpackages/security-core/src/index.ts']).api_deploy_affected, true);
  assert.equal(deployOf(['M\tpackages/platform-core/src/a.ts']).api_deploy_affected, true);
  assert.equal(deployOf(['M\tpackages/mail-core/templates/email/x.hbs']).api_deploy_affected, true);
});

test('Case E. closure 밖 frontend package → 배포 영향 아님', () => {
  const files = [
    'M\tpackages/store-ui-core/src/index.ts',
    'M\tpackages/auth-react/src/GoogleContinue.tsx',
    'M\tpackages/hospital-pharmacy-core/src/plan.ts',
    'M\tpackages/shared-space-ui/src/index.ts',
  ];
  assert.equal(deployOf(files).api_deploy_affected, false);
});

test('Case F. 서비스 프론트만 → 배포 영향 아님', () => {
  assert.equal(
    deployOf([
      'M\tservices/web-hospital-pharmacy/src/App.tsx',
      'M\tapps/admin-dashboard/src/pages/auth/Login.tsx',
    ]).api_deploy_affected,
    false,
  );
});

test('Case G. migration · bootstrap · incremental 은 무조건 배포 영향', () => {
  for (const f of [
    'apps/api-server/src/database/migrations/1758000000000-Foo.ts',
    'apps/api-server/src/database/incremental/expected-schema-snapshot.ts',
    'apps/api-server/src/database/bootstrap/baseline-marker.ts',
    'apps/api-server/src/database/migration-config.ts',
    'apps/api-server/src/migrate.ts',
  ]) {
    assert.equal(deployOf([`M\t${f}`]).api_deploy_affected, true, f);
  }
});

test('Case H. test + runtime 혼합 → 배포 영향', () => {
  assert.equal(
    deployOf([
      'M\tapps/api-server/src/__tests__/foo.spec.ts',
      'M\tapps/api-server/src/services/auth/auth-login.service.ts',
    ]).api_deploy_affected,
    true,
  );
});

test('Case I. pnpm-lock.yaml — importer 단위 정밀 판정 + 안전 fallback', () => {
  const lock = (importers, tail) =>
    `lockfileVersion: '9.0'\n\nimporters:\n${importers}\npackages:\n${tail}\n`;
  const base = lock(
    "  .:\n    x: 1\n  apps/api-server:\n    a: 1\n  services/web-hospital-pharmacy:\n    b: 1\n",
    "  left-pad@1.0.0: {}\n",
  );

  // (1) closure 밖 importer 만 바뀌었고 packages/snapshots 동일 → 배포 아님
  const headOutside = lock(
    "  .:\n    x: 1\n  apps/api-server:\n    a: 1\n  services/web-hospital-pharmacy:\n    b: 2\n",
    "  left-pad@1.0.0: {}\n",
  );
  assert.equal(lockfileDeployImpact(base, headOutside, apiDeployImporters(graph)).affected, false);

  // (2) api-server importer 가 바뀌면 배포
  const headApi = lock(
    "  .:\n    x: 1\n  apps/api-server:\n    a: 2\n  services/web-hospital-pharmacy:\n    b: 1\n",
    "  left-pad@1.0.0: {}\n",
  );
  assert.equal(lockfileDeployImpact(base, headApi, apiDeployImporters(graph)).affected, true);

  // (3) importers 밖(외부 의존성 해석)이 바뀌면 배포
  const headTail = lock(
    "  .:\n    x: 1\n  apps/api-server:\n    a: 1\n  services/web-hospital-pharmacy:\n    b: 2\n",
    "  left-pad@1.0.1: {}\n",
  );
  assert.equal(lockfileDeployImpact(base, headTail, apiDeployImporters(graph)).affected, true);

  // (4) 파싱 불가 · 원문 없음 → 안전 fallback
  assert.equal(lockfileDeployImpact(undefined, headTail, apiDeployImporters(graph)).affected, true);
  assert.equal(lockfileDeployImpact(base, 'not a lockfile', apiDeployImporters(graph)).affected, true);
  assert.equal(parsePnpmLock('x'), null);

  // (5) CLI 가 원문을 못 주면(예: --files-from 재현) lockfile 변경은 배포로 본다
  assert.equal(deployOf(['M\tpnpm-lock.yaml']).api_deploy_affected, true);

  // (6) 원문 공급자가 있으면 closure 밖 변경은 skip 된다
  const readLock = (which) => (which === 'base' ? base : headOutside);
  assert.equal(
    deployOf(['M\tservices/web-hospital-pharmacy/src/App.tsx', 'M\tpnpm-lock.yaml'], { readLock })
      .api_deploy_affected,
    false,
  );
});

test('Case I-2. root package.json · 빌드 컨텍스트 · 이 workflow 자체는 배포 영향', () => {
  for (const f of ['package.json', 'pnpm-workspace.yaml', '.dockerignore', 'tsconfig.base.json']) {
    assert.equal(deployOf([`M\t${f}`]).api_deploy_affected, true, f);
  }
  assert.equal(deployOf(['M\t.github/workflows/deploy-api.yml']).api_deploy_affected, true);
  assert.equal(deployOf(['M\t.github/actions/setup-build-env/action.yml']).api_deploy_affected, true);

  // 다른 서비스의 workflow · CI 스크립트는 API 이미지에 들어가지 않는다
  assert.equal(deployOf(['M\t.github/workflows/deploy-web-services.yml']).api_deploy_affected, false);
  assert.equal(deployOf(['M\tscripts/ci/detect-affected.mjs']).api_deploy_affected, false);
  // 문서는 상태와 무관하게 배포 무영향 (삭제·이동 포함)
  assert.equal(deployOf(['D\tdocs/checks/OLD.md']).api_deploy_affected, false);
});

test('Case J. multi-commit push — 배치 앞의 runtime 변경을 놓치지 않는다', () => {
  const { dir, write, base } = makeRepo();
  try {
    write('apps/api-server/src/routes/foo.ts', 'x\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'api runtime']);

    write('services/web-neture/src/App.tsx', 'y\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'frontend only']);
    const head = git(dir, ['rev-parse', 'HEAD']).stdout.trim();

    const lastOnly = classify(readChangedFiles(`${head}~1`, head, dir).files, graph);
    assert.equal(lastOnly.api_deploy_affected, false, '마지막 commit 만 보면 배포가 skip 된다');

    const batch = readChangedFiles(base, head, dir);
    assert.equal(batch.ok, true);
    assert.equal(classify(batch.files, graph).api_deploy_affected, true, 'batch 전체는 배포다');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Case K. base SHA 이상 · 변경 0건 → 배포 fallback(true)', () => {
  assert.equal(classifyApiDeploy([], graph).api_deploy_affected, true);
  assert.equal(classify([], graph).api_deploy_affected, true);
  assert.equal(classify([], graph).fallback, true);
  // 매핑 불가 경로도 배포 fallback
  assert.equal(deployOf(['M\tunknown-root-thing/x.ts']).api_deploy_affected, true);
});

// ---------------------------------------------------------------------------
// WO-O4O-API-CD-RUNTIME-AFFECTED-DEPLOY-GATE-V1 §11 · §13 — deploy-api.yml 계약 (YAML 정적 검증)
// ---------------------------------------------------------------------------

test('§11. deploy-api.yml 은 detect → 조건부 build-and-deploy 구조다', () => {
  const yml = workflowYaml('deploy-api.yml');
  assert.match(yml, /^\s{2}detect:$/m, 'detect 잡이 있어야 한다');
  assert.match(yml, /node scripts\/ci\/detect-affected\.mjs/, '판정은 공통 SSOT 를 쓴다');
  assert.match(yml, /needs: \[detect\]/);
  assert.match(
    yml,
    /needs\.detect\.outputs\.api_deploy_affected == 'true'/,
    'heavy deploy 는 판정에 걸려 있어야 한다',
  );
  assert.match(yml, /fetch-depth: 0/, 'push batch 전체를 봐야 한다');
  // §12 — trigger 자체를 좁혀 workflow 가 안 뜨게 만들지 않는다
  assert.match(yml, /- 'apps\/api-server\/\*\*'/);
  assert.match(yml, /- 'packages\/\*\*'/);
  assert.match(yml, /- 'pnpm-lock\.yaml'/);
});

test('§13 · §15. migration/deploy step 은 build-and-deploy 안에만 있고, 재현 dispatch 는 배포하지 않는다', () => {
  const yml = workflowYaml('deploy-api.yml');
  // 세 가지 production 작업이 모두 같은 잡(build-and-deploy)에 있어야 판정 하나로 0 이 된다
  for (const step of [
    'Build and Push Docker image',
    'Run database migrations',
    'Deploy to Cloud Run',
    'Refresh one-off Cloud Run job image references',
  ]) {
    assert.ok(yml.includes(step), `step 이 있어야 한다: ${step}`);
    assert.ok(
      yml.indexOf(step) > yml.indexOf('build-and-deploy:'),
      `${step} 은 build-and-deploy 잡 안에 있어야 한다`,
    );
  }
  assert.match(yml, /base_sha:/, '판정 재현용 입력이 있어야 한다');
  assert.match(yml, /github\.event\.inputs\.base_sha == ''/, 'base_sha 재현 실행은 배포하지 않는다');
});
