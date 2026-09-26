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
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  apiDeployImporters,
  buildWorkspaceGraph,
  emptyVerdict,
  safeFallbackVerdict,
  classifyWebDeploy,
  webServiceClosures,
  WEB_SERVICES,
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
  listApiJestSpecs,
  buildApiSourceImportGraph,
  selectApiJestSpecs,
  deriveAlwaysRunSpecs,
  deriveMigrationSpecs,
  API_JEST_LARGE_CHANGE_THRESHOLD,
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
// Case 8b~8d — `!read.ok` safe fallback 그 자체
//
// 2026-09-24 사고: base SHA 가 빈 workflow_dispatch 실행에서 fallback 이
// `api_ci_affected` · `api_deploy_affected` 를 빠뜨려 두 값이 undefined 가 됐고,
// `deploy-api.yml` 의 `api_deploy_affected == 'true'` 를 통과하지 못해
// **build-and-deploy 전체가 skip** 됐다(배포 0건인데 workflow 는 success).
// 기존 Case 8 은 `classify([], graph)` 경로만 봤기 때문에 이 결함을 못 잡았다 —
// fallback 이 `main()` 안 인라인 객체였고 시험이 닿지 않았다.
// 아래 세 케이스가 그 구멍을 막는다.
// ---------------------------------------------------------------------------

test('Case 8b. base SHA 없음/all-zero → fallback 이 모든 실행 축을 연다', () => {
  for (const reason of [
    'base SHA 없음/all-zero (empty)',
    'base SHA 없음/all-zero (0000000000000000000000000000000000000000)',
    '변경 파일 수집 예외: fatal: bad object deadbeef',
  ]) {
    const v = safeFallbackVerdict(reason);
    // 판정 불가 = 전부 실행. 하나라도 false/undefined 면 조용한 skip 이 된다.
    assert.equal(v.api_ci_affected, true, `api_ci_affected (${reason})`);
    assert.equal(v.api_deploy_affected, true, `api_deploy_affected (${reason})`);
    assert.equal(v.admin_affected, true);
    assert.equal(v.api_affected, true);
    assert.equal(v.global_or_unknown, true);
    assert.equal(v.fallback, true);
    assert.equal(v.admin_only, false);
    assert.equal(v.docs_only, false);
    assert.equal(v.docs_fast_eligible, false);
    // 전 Web 서비스 배포
    for (const svc of WEB_SERVICES) {
      assert.equal(v.web_deploy[svc.key], true, `web_deploy.${svc.key}`);
    }
    assert.match(v.reasons.join(' '), /safe fallback/);
  }
});

test('Case 8c. fallback 은 정본 verdict 와 **형태가 같다** (새 축이 조용히 빠지지 않는다)', () => {
  // 이 단언이 2026-09-24 결함의 재발 방지 핵심이다.
  // 축이 추가되면 emptyVerdict 에 들어가고, fallback 이 그 키를 빼면 여기서 깨진다.
  const fallbackKeys = Object.keys(safeFallbackVerdict('reason')).sort();
  const shapeKeys = Object.keys(emptyVerdict()).sort();
  assert.deepEqual(fallbackKeys, shapeKeys);

  // 실제 판정 경로의 결과와도 같은 형태여야 한다(workflow output 이름이 여기서 나온다).
  const classified = Object.keys(classify(parseFileList('M\tapps/api-server/src/main.ts'), graph)).sort();
  assert.deepEqual(fallbackKeys, classified);

  // undefined 가 하나도 없어야 한다 — workflow 는 문자열 'true' 비교를 한다.
  for (const [k, val] of Object.entries(safeFallbackVerdict('reason'))) {
    assert.notEqual(val, undefined, `${k} is undefined`);
  }
});

test('Case 8d. fallback 이 만능 참은 아니다 — 정상 판정은 그대로 좁게 유지된다', () => {
  // fallback 을 열어둔 대가로 정상 경로가 넓어지면 안 된다.
  const v = classify(parseFileList('M\tapps/api-server/src/__tests__/some.spec.ts'), graph);
  assert.equal(v.fallback, false);
  assert.equal(v.global_or_unknown, false);
  // test 만 바뀐 변경은 production image 를 바꾸지 않는다 (§17 Case B)
  assert.equal(v.api_deploy_affected, false);
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

// ---------------------------------------------------------------------------
// WO-O4O-WEB-SERVICES-CD-DEPENDENCY-AFFECTED-DEPLOY-GATE-V1 §22 (Case W1~W13)
//
// 고정하는 것
//   - Web 배포 판정은 **하드코딩 목록이 아니라** workspace dependency graph 의
//     transitive closure 에서 나온다
//   - 어떤 Web 서비스도 쓰지 않는 package 변경은 Web 배포를 0 으로 만든다
//   - 판정 불가(base SHA 이상 · 매핑 불가 · root build 입력)는 전부 9개 fallback
// ---------------------------------------------------------------------------

const WEB_KEYS = WEB_SERVICES.map((s) => s.key);
const webOf = (lines, opts) => classifyWebDeploy(parseFileList(lines.join('\n')), graph, opts);
const onOf = (verdict) => WEB_KEYS.filter((k) => verdict.services[k]).sort();
/** graph 가 말하는 consumer — 기대값을 테스트에 적지 않고 graph 에서 받아온다 */
const consumersOf = (pkg) =>
  [...webServiceClosures(graph).values()].filter((e) => e.closure.has(pkg)).map((e) => e.key).sort();

test('W1. 서비스 자체 변경 → 그 서비스만 배포된다', () => {
  const v = webOf(['M\tservices/web-kpa-branch/src/App.tsx']);
  assert.deepEqual(onOf(v), ['kpa-branch']);
  assert.equal(v.fallback, false);
});

test('W2. hospital-pharmacy-core 변경 → hospital-pharmacy 만 (기존엔 9개 전부였다)', () => {
  const v = webOf(['M\tpackages/hospital-pharmacy-core/src/index.ts']);
  assert.deepEqual(onOf(v), consumersOf('@o4o/hospital-pharmacy-core'));
  assert.deepEqual(onOf(v), ['hospital-pharmacy']);
  assert.equal(onOf(v).length, 1, '9개 전부 배포하던 자리다');
});

test('W3. store-ui-core 변경 → graph consumer 만 · 비소비 서비스는 false', () => {
  const v = webOf(['M\tpackages/store-ui-core/src/index.ts']);
  assert.deepEqual(onOf(v), consumersOf('@o4o/store-ui-core'));
  for (const key of ['lecture', 'kpa-branch', 'signage-player', 'hospital-pharmacy']) {
    assert.equal(v.services[key], false, `${key} 는 store-ui-core 를 소비하지 않는다`);
  }
});

test('W4. auth-client 변경 → 소비 서비스 전부 · 그래도 "9개 하드코딩" 은 아니다', () => {
  const v = webOf(['M\tpackages/auth-client/src/api.ts']);
  const expected = consumersOf('@o4o/auth-client');
  assert.deepEqual(onOf(v), expected);
  // hospital-pharmacy 는 무로그인 V1 로 auth 의존이 없다(WO-O4O-HOSPITAL-PHARMACY-V1-FIXED-LOCAL-FILE-AND-LOGINLESS-SIMPLIFICATION).
  assert.ok(expected.length >= 7, 'auth 계열은 실제로 거의 전 서비스가 쓴다');
  assert.ok(!expected.includes('hospital-pharmacy'), 'hospital-pharmacy 는 auth-client 를 소비하지 않는다');
  assert.equal(v.fallback, false, '넓은 판정이어도 fallback 이 아니라 graph 결과다');
});

test('W5. 어떤 Web 서비스도 소비하지 않는 package → Web 배포 0', () => {
  assert.deepEqual(consumersOf('@o4o/ai-core'), [], '전제: ai-core 는 web closure 밖이다');
  const v = webOf(['M\tpackages/ai-core/src/router.ts']);
  assert.deepEqual(onOf(v), []);
  assert.equal(v.fallback, false);
});

test('W6. 서비스 변경 + package 변경 → 합집합', () => {
  const v = webOf([
    'M\tservices/web-lecture/src/main.tsx',
    'M\tpackages/hospital-pharmacy-core/src/index.ts',
  ]);
  assert.deepEqual(onOf(v), ['hospital-pharmacy', 'lecture']);
});

test('W7. 여러 서비스 동시 변경 → 각각 true, 나머지는 false', () => {
  const v = webOf([
    'M\tservices/web-neture/src/a.tsx',
    'M\tservices/signage-player-web/src/b.tsx',
  ]);
  assert.deepEqual(onOf(v), ['neture', 'signage-player']);
});

test('W8. transitive(2단계 이상) dependency 변경도 잡는다', () => {
  // 어떤 서비스의 **직접** dependency 도 아닌 package 를 graph 에서 고른다
  const direct = new Set();
  for (const svc of WEB_SERVICES) {
    const name = graph.byDir.get(svc.dir);
    for (const dep of graph.byName.get(name).deps) direct.add(dep);
  }
  const transitive = [];
  for (const entry of webServiceClosures(graph).values()) {
    for (const pkg of entry.closure) {
      if (pkg !== entry.name && !direct.has(pkg)) transitive.push(pkg);
    }
  }
  assert.ok(transitive.length > 0, '전제: 2단계 이상 의존 package 가 존재한다');
  const pkg = transitive[0];
  const dir = graph.byName.get(pkg).dir;
  const v = webOf([`M\t${dir}/src/index.ts`]);
  assert.deepEqual(onOf(v), consumersOf(pkg));
  assert.ok(onOf(v).length > 0, '직접 의존이 아니어도 배포 대상이 나와야 한다');
});

test('W9. 매핑 불가 경로 · root build 입력 → 9개 전부 fallback', () => {
  for (const line of [
    'M\tunknown-root-thing/x.ts',
    'M\tpackage.json',
    'M\tpnpm-workspace.yaml',
    'M\ttsconfig.base.json',
  ]) {
    const v = webOf([line]);
    assert.deepEqual(onOf(v), [...WEB_KEYS].sort(), `${line} → 전 서비스`);
    assert.equal(v.fallback, true);
  }
  // 반면 이미지 빌드에 들어가지 않는 경로는 무영향이다
  for (const line of ['M\tdocs/checks/CHECK.md', 'M\tCLAUDE.md', 'M\te2e/spec.ts']) {
    assert.deepEqual(onOf(webOf([line])), [], `${line} → Web 무영향`);
  }
});

test('W10. multi-commit push — 배치 앞 commit 의 package 변경을 놓치지 않는다', () => {
  const { dir, write, base } = makeRepo();
  try {
    write('packages/hospital-pharmacy-core/src/index.ts', 'x\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'core change']);

    write('docs/checks/CHECK.md', 'doc\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'docs only']);
    const head = git(dir, ['rev-parse', 'HEAD']).stdout.trim();

    const lastOnly = classifyWebDeploy(readChangedFiles(`${head}~1`, head, dir).files, graph);
    assert.deepEqual(onOf(lastOnly), [], '마지막 commit 만 보면 배포가 사라진다');

    const batch = readChangedFiles(base, head, dir);
    assert.equal(batch.ok, true);
    assert.deepEqual(onOf(classifyWebDeploy(batch.files, graph)), ['hospital-pharmacy']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('W11. base SHA 이상 · 변경 0건 → 9개 전부 fallback', () => {
  const v = classifyWebDeploy([], graph);
  assert.deepEqual(onOf(v), [...WEB_KEYS].sort());
  assert.equal(v.fallback, true);
  // classify() 전체 경로에서도 동일하다
  const full = classify([], graph);
  for (const key of WEB_KEYS) assert.equal(full.web_deploy[key], true);
});

test('W12 · W13. deploy-web-services.yml 계약 — dispatch all/단일 배포는 그대로다', () => {
  const yml = workflowYaml('deploy-web-services.yml');
  assert.match(yml, /node scripts\/ci\/detect-affected\.mjs/, '판정은 공통 SSOT 를 쓴다');
  assert.ok(!/grep -q "\^packages\//.test(yml), 'packages/** → 전 서비스 배포 규칙은 제거돼야 한다');
  assert.match(yml, /fetch-depth: 0/, 'push batch 전체를 봐야 한다');
  assert.match(yml, /github\.event\.before/, 'before..sha 배치 diff 를 유지한다');
  // §20 — 수동 배포 경로는 detector 가 제한하지 않는다
  assert.match(yml, /if \[ "\$SERVICE" = "all" \]; then/, 'dispatch all 경로 유지');
  for (const key of WEB_KEYS) {
    assert.ok(yml.includes(`echo "${key}=$( [ "$SERVICE" = '${key}' ]`), `dispatch 단일 배포 유지: ${key}`);
    assert.ok(yml.includes(`deploy-${key}:`), `deploy job 이 있어야 한다: ${key}`);
    // §21 — summary 가 9개를 전부 알아야 한다
    assert.ok(yml.includes(`      - deploy-${key}`), `summary needs 누락: deploy-${key}`);
    assert.ok(yml.includes(`needs.detect-changes.outputs.${key} }}"`), `summary 출력 누락: ${key}`);
  }
  // §17 — root build 입력이 trigger 에 있어야 silent false-negative 가 없다
  for (const trigger of ["- 'package.json'", "- 'pnpm-lock.yaml'", "- 'pnpm-workspace.yaml'"]) {
    assert.ok(yml.includes(trigger), `push trigger 누락: ${trigger}`);
  }
});

test('§23. 9개 서비스의 실제 @o4o import 는 전부 선언된 dependency closure 안에 있다', () => {
  // undeclared workspace import 가 있으면 graph 기반 판정이 false-negative 를 낸다.
  const failures = [];
  for (const entry of webServiceClosures(graph).values()) {
    const files = [];
    const walk = (d) => {
      let items;
      try {
        items = readdirSync(d, { withFileTypes: true });
      } catch {
        return;
      }
      for (const it of items) {
        if (it.name === 'node_modules' || it.name === 'dist') continue;
        const abs = path.join(d, it.name);
        if (it.isDirectory()) walk(abs);
        else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(it.name)) files.push(abs);
      }
    };
    walk(path.join(REPO_ROOT, entry.dir, 'src'));
    for (const file of files) {
      const code = readFileSync(file, 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      const re = /(?:from\s+|import\s*\(|require\(\s*)['"](@o4o(?:-apps)?\/[a-z0-9-]+)/g;
      for (const m of code.matchAll(re)) {
        const pkg = m[1];
        if (!graph.byName.has(pkg)) continue;
        if (!entry.closure.has(pkg)) failures.push(`${entry.key}: ${pkg} (${path.relative(REPO_ROOT, file)})`);
      }
    }
  }
  assert.deepEqual(failures, [], `UNDECLARED_USED workspace import:\n${failures.join('\n')}`);
});

/* ---------------------------------------------------------------------------
 * WO-O4O-API-JEST-AFFECTED-TEST-EXECUTION-PHASE0-SHADOW-V1 §22 (Case J1~J16)
 *
 * **Phase 0 은 shadow 다.** 여기서 고정하는 것은 selector 의 판정이지 CI 의 Jest
 * 실행 범위가 아니다. 실제 실행은 workflow 가 계속 full 로 돈다.
 *
 * 고정하는 것
 *   - ALWAYS_RUN · MIGRATION 특별군은 **파일 목록 하드코딩이 아니라** 규칙에서 나온다
 *   - findRelatedTests 가 0 을 내도 다른 축이 덮는다 (workspace 밖 파일의 0 은 무의미하다)
 *   - 의심스러운 입력(전역 경로 · lockfile · Jest 설정 · 대규모 변경 · 판정 실패)은 전부 full
 *   - test 만 바뀐 변경이 suite 0 으로 붕괴하지 않는다
 * ------------------------------------------------------------------------ */

const apiJestSpecs = listApiJestSpecs();
const apiImportGraph = buildApiSourceImportGraph();
/** jest 를 실제로 띄우지 않고(느리다) 나머지 축만 검증한다 — findRelated 는 J14 에서 따로 본다 */
const selectJest = (lines, opts = {}) => {
  const files = parseFileList(lines.join('\n'));
  return selectApiJestSpecs(files, graph, REPO_ROOT, {
    verdict: classify(files, graph),
    skipFindRelated: true,
    importGraph: apiImportGraph,
    ...opts,
  });
};

test('J1. API route 변경은 selected 이고, 그 route 를 읽는 inventory spec 을 포함한다', () => {
  const r = selectJest(['M\tapps/api-server/src/routes/admin/store-owner-terminations.routes.ts']);
  assert.equal(r.mode, 'selected');
  assert.ok(r.specs.includes('src/__tests__/admin-api-guard-inventory.spec.ts'),
    'route inventory census spec 이 빠지면 route guard 회귀를 놓친다');
  assert.ok(r.specs.length < apiJestSpecs.length, 'selected 는 전체보다 작아야 한다');
});

test('J2. test 만 바뀐 변경은 그 test 자신을 반드시 포함한다 (0 suite 로 붕괴 금지)', () => {
  const target = 'src/__tests__/unified-store-workspace-handoff.spec.ts';
  const r = selectJest([`M\tapps/api-server/${target}`]);
  assert.equal(r.mode, 'selected');
  assert.ok(r.specs.includes(target), '변경된 test 자신이 빠지면 그 변경을 아무도 검증하지 않는다');
  assert.ok(r.components.changedTests >= 1);
});

test('J3. packages/security-core 변경은 findRelatedTests 가 0 이어도 raw consumer 를 선별한다', () => {
  const r = selectJest(['M\tpackages/security-core/src/index.ts']);
  assert.equal(r.mode, 'selected');
  assert.equal(r.components.findRelated, 0, 'workspace 밖 파일은 jest roots 밖이라 항상 0 이다');
  assert.ok(r.components.rawSource > 0, '그 0 을 "관련 없음" 으로 읽으면 대량 누락이 된다');
  assert.ok(r.components.importerBridge > 0, 'api-server 쪽 importer bridge 가 살아 있어야 한다');
});

test('J4. frontend package 변경도 raw-source consumer + ALWAYS_RUN 으로 덮인다', () => {
  const r = selectJest(['M\tpackages/store-ui-core/src/index.ts']);
  assert.equal(r.mode, 'selected');
  assert.ok(r.components.rawSource > 0);
  assert.ok(r.components.alwaysRun > 0);
});

test('J5. migration 변경은 database 특별군을 추가한다', () => {
  const r = selectJest(['A\tapps/api-server/src/database/migrations/20990101000000-Example.ts']);
  assert.equal(r.mode, 'selected');
  assert.ok(r.components.migration > 0, 'schema false-negative 방지가 시간 절감보다 우선이다');
  assert.ok(r.specs.includes('src/__tests__/unified-store-workspace-handoff.spec.ts'),
    'manifest/lockstep 계약 spec 은 migration 변경에서 반드시 돈다');
});

test('J6. .github/** 변경은 full 이다 (기존 global 판정을 완화하지 않는다)', () => {
  const r = selectJest(['M\t.github/workflows/ci-pipeline.yml']);
  assert.equal(r.mode, 'full');
  assert.match(r.reason, /global_or_unknown/);
});

test('J7. scripts/** 변경은 full 이다', () => {
  const r = selectJest(['M\tscripts/ci/detect-affected.mjs']);
  assert.equal(r.mode, 'full');
});

test('J8. pnpm-lock.yaml 변경은 full 이다', () => {
  const r = selectJest(['M\tpnpm-lock.yaml']);
  assert.equal(r.mode, 'full');
});

test('J9. base SHA 이상(변경 파일 수집 실패)은 full 이다', () => {
  const r = selectApiJestSpecs([], graph, REPO_ROOT, {
    verdict: { global_or_unknown: true },
    skipFindRelated: true,
    importGraph: apiImportGraph,
  });
  assert.equal(r.mode, 'full');
});

test('J10. 선택이 전체의 80% 를 넘으면 full 로 되돌린다 (full 이 더 싸다)', () => {
  const r = selectApiJestSpecs(
    parseFileList('M\tapps/api-server/src/database/entities.ts'),
    graph,
    REPO_ROOT,
    {
      verdict: {},
      importGraph: apiImportGraph,
      // findRelatedTests 가 거의 전체를 반환하는 상황을 강제한다
      run: () => ({ status: 0, stdout: apiJestSpecs.map((s) => `/apps/api-server/${s.rel}`).join('\n') }),
    },
  );
  assert.equal(r.mode, 'full');
  assert.match(r.reason, /80% 초과/);
});

test('J11. 미분류 경로(저장소 루트 신규 디렉터리)는 full 이다', () => {
  const r = selectJest(['A\tunknown-top-level/thing.ts']);
  assert.equal(r.mode, 'full');
});

test('J12. multi-commit push 에서 앞쪽 commit 의 API 변경이 유지된다', () => {
  const r = selectJest([
    'M\tapps/api-server/src/routes/admin/store-owner-terminations.routes.ts',
    'M\tdocs/checks/CHECK-EXAMPLE.md',
  ]);
  assert.equal(r.mode, 'selected');
  assert.ok(r.specs.includes('src/__tests__/admin-api-guard-inventory.spec.ts'));
});

test('J13. manual full override 는 무조건 full 이다', () => {
  const r = selectJest(['M\tapps/api-server/src/routes/admin/store-owner-terminations.routes.ts'], { manualFull: true });
  assert.equal(r.mode, 'full');
  assert.match(r.reason, /manual full override/);
});

test('J14. Jest 설정 · setup 변경과 대규모 변경은 full 이다', () => {
  assert.equal(selectJest(['M\tapps/api-server/jest.config.cjs']).mode, 'full');
  assert.equal(selectJest(['M\tapps/api-server/src/__tests__/setup/jest.setup.ts']).mode, 'full');
  const many = Array.from({ length: API_JEST_LARGE_CHANGE_THRESHOLD + 1 },
    (_, i) => `M\tapps/api-server/src/services/generated-${i}.ts`);
  assert.equal(selectJest(many).mode, 'full');
});

test('J15. ALWAYS_RUN 은 파일 목록이 아니라 규칙에서 도출된다 (census spec 20종 전부 포함)', () => {
  const derived = new Set(deriveAlwaysRunSpecs(apiJestSpecs));
  // IR 의 runtime 계측에서 저장소 파일 2,000개 초과를 읽은 census suite 표본.
  // 신규 census spec 이 추가돼도 규칙이 자동으로 잡아야 하므로 "포함" 만 고정한다.
  const censusSample = apiJestSpecs
    .filter((s) => /\breaddirSync\b|\bglobSync\b/.test(s.source))
    .map((s) => s.rel);
  assert.ok(censusSample.length >= 20, `census 표본이 ${censusSample.length} 개로 줄었다 — 규칙 점검 필요`);
  for (const spec of censusSample) assert.ok(derived.has(spec), `ALWAYS_RUN 에서 누락: ${spec}`);
});

test('J16. MIGRATION 특별군도 규칙 도출이며 lockstep 계약 spec 을 포함한다', () => {
  const derived = new Set(deriveMigrationSpecs(apiJestSpecs));
  assert.ok(derived.has('src/__tests__/unified-store-workspace-handoff.spec.ts'));
  assert.ok(derived.size >= 30, `migration 특별군이 ${derived.size} 개로 줄었다 — 보수성 점검 필요`);
  assert.ok(derived.size < apiJestSpecs.length);
});

test('J17. Phase 0 계약 — workflow 는 selected 여부와 무관하게 full Jest 를 실행한다', () => {
  const ci = readFileSync(path.join(REPO_ROOT, '.github/workflows/ci-pipeline.yml'), 'utf-8');
  assert.ok(ci.includes('Calculate API Jest affected set (shadow)'), 'shadow step 이 없다');
  assert.ok(ci.includes('node scripts/ci/detect-affected.mjs --mode=api-jest'), 'shadow selector 호출이 없다');
  // Phase 0 의 핵심 계약: selector 출력이 jest 인자로 흘러가면 안 된다.
  assert.ok(!/api_jest_specs/.test(ci.replace(/--mode=api-jest/g, '')),
    'Phase 0 에서는 selector 출력을 실제 jest 인자로 쓰지 않는다');
  // WO-O4O-CI-API-JEST-SHARD-PARALLELIZATION-V1 — 허용되는 추가 인자는 `--shard` 하나뿐이다.
  // shard 는 선별이 아니라 분할이므로, matrix 가 1..N 을 빠짐없이 덮는지까지 확인한다.
  const run = ci.match(/run: cd apps\/api-server && npx jest --maxWorkers=1 --shard=\$\{\{ matrix\.shard \}\}\/(\d+)\n/);
  assert.ok(run, 'api-tests 의 full Jest 실행 명령은 --maxWorkers=1 과 --shard 외 인자를 갖지 않아야 한다');
  const total = Number(run[1]);
  const shards = ci.match(/\n\s+shard: \[([\d,\s]+)\]\n/);
  assert.ok(shards, 'api-tests matrix.shard 목록이 없다');
  const list = shards[1].split(',').map((s) => Number(s.trim()));
  assert.deepEqual(list, Array.from({ length: total }, (_, i) => i + 1),
    `matrix.shard 는 1..${total} 전부여야 한다 — 빠진 shard 는 그만큼 suite 를 건너뛴다`);
});

test('J18. 정기 full Jest workflow 가 존재하고 선별하지 않는다 (§17 · §18)', () => {
  const wf = readFileSync(path.join(REPO_ROOT, '.github/workflows/scheduled-api-full-jest.yml'), 'utf-8');
  assert.match(wf, /schedule:/, 'docs/admin fast path 가 red main 을 가리는 것을 막는 최종 안전망이다');
  assert.ok(wf.includes('npx jest --maxWorkers=1\n'), '선별 인자 없이 전체를 돌려야 한다');
  // §18 — Docker / Cloud Run / migration Job 과 연결하지 않는다
  for (const forbidden of ['docker', 'gcloud', 'Cloud Run', 'migration']) {
    assert.ok(!new RegExp(forbidden, 'i').test(wf.replace(/^\s*#.*$/gm, '')),
      `scheduled full Jest 는 ${forbidden} 과 연결하지 않는다`);
  }
});
