import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { makePlan, isBuildInput, recordBuild, verifyBuild, clearBuild } from '../api-build-cache.mjs';
import { buildWorkspaceGraph, classifyApiDeploy, classify, REPO_ROOT } from '../detect-affected.mjs';

const runtime = { node: '22.18.0', pnpm: '10.25.0', arch: 'x64', ci: 'true' };
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'o4o-build-cache-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const tracked = [];
  const put = (p, content, track = true) => {
    mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    writeFileSync(path.join(root, p), content);
    if (track && !tracked.includes(p)) tracked.push(p);
  };
  put('package.json', '{}'); put('pnpm-lock.yaml', 'lockfileVersion: 9');
  put('apps/api-server/package.json', JSON.stringify({ name: '@o4o/api-server', dependencies: { '@o4o/test-dep': 'workspace:*' } }));
  put('packages/test-dep/package.json', JSON.stringify({ name: '@o4o/test-dep', scripts: { build: 'tsc --build' }, main: 'dist/index.js' }));
  put('packages/test-dep/src/index.ts', 'export const value = 1;');
  return { root, tracked, put, plan: () => makePlan(root, tracked, runtime) };
}
test('source, lockfile, config and runtime changes invalidate compiled outputs', t => {
  const f = fixture(t); const initial = f.plan().key;
  assert.equal(f.plan().key, initial);
  for (const [p, text] of [
    ['packages/test-dep/src/index.ts', 'export const value = 2;'],
    ['pnpm-lock.yaml', 'lockfileVersion: 9\nchanged: true'],
    ['tsconfig.base.json', '{"compilerOptions":{"strict":true}}'],
    ['.github/actions/api-dependency-build/action.yml', 'new build recipe'],
  ]) {
    const before = f.plan().key; f.put(p, text); assert.notEqual(f.plan().key, before, p);
  }
  assert.notEqual(makePlan(f.root, f.tracked, { ...runtime, node: '22.19.0' }).key, f.plan().key);
  assert.notEqual(makePlan(f.root, f.tracked, { ...runtime, pnpm: '10.26.0' }).key, f.plan().key);
});
test('API implementation and docs are not package compiler inputs; API manifest remains an input', t => {
  const f = fixture(t); const initial = f.plan().key;
  f.put('apps/api-server/src/example.ts', 'consumer change'); f.put('docs/example.md', 'documentation');
  assert.equal(f.plan().key, initial);
  assert.ok(isBuildInput('apps/api-server/package.json'));
  assert.ok(!isBuildInput('apps/api-server/src/scripts/data/huge.json'));
  f.put('apps/api-server/package.json', JSON.stringify({ name: '@o4o/api-server', dependencies: { '@o4o/test-dep': 'workspace:*' }, version: '2' }));
  assert.notEqual(f.plan().key, initial);
});
test('cache cannot conceal changed, missing or extra emitted files', t => {
  const f = fixture(t); const plan = f.plan();
  assert.equal(verifyBuild(f.root, plan), false);
  f.put('packages/test-dep/dist/index.js', 'original emitted JS', false);
  recordBuild(f.root, plan); assert.equal(verifyBuild(f.root, plan), true);
  f.put('packages/test-dep/dist/index.js', 'tampered JS', false);
  assert.equal(verifyBuild(f.root, plan), false);
  f.put('packages/test-dep/dist/index.js', 'original emitted JS', false);
  f.put('packages/test-dep/dist/extra.js', 'stale output', false);
  assert.equal(verifyBuild(f.root, plan), false);
  rmSync(path.join(f.root, 'packages/test-dep/dist/extra.js'));
  rmSync(path.join(f.root, 'packages/test-dep/dist/index.js'));
  assert.equal(verifyBuild(f.root, plan), false);
});
test('missing outputs cannot produce a receipt; stale outputs and incremental state are cleared', t => {
  const f = fixture(t); const plan = f.plan();
  assert.throws(() => recordBuild(f.root, plan), /No compiled/);
  f.put('packages/test-dep/dist/index.js', 'output', false);
  f.put('packages/test-dep/tsconfig.tsbuildinfo', 'stale incremental state', false);
  recordBuild(f.root, plan); clearBuild(f.root, plan);
  assert.equal(verifyBuild(f.root, plan), false);
  assert.throws(() => readFileSync(path.join(f.root, 'packages/test-dep/tsconfig.tsbuildinfo')));
  assert.equal(readFileSync(path.join(f.root, 'packages/test-dep/src/index.ts'), 'utf8'), 'export const value = 1;');
});
test('unrecognized build scripts, tracked output and application backreferences bypass reuse', t => {
  const f = fixture(t);
  f.put('packages/test-dep/package.json', JSON.stringify({ name: '@o4o/test-dep', scripts: { build: 'node arbitrary-build.js' } }));
  assert.throws(f.plan, /Custom/);
  f.put('packages/test-dep/package.json', JSON.stringify({ name: '@o4o/test-dep', scripts: { build: 'tsc' } }));
  f.put('packages/test-dep/src/index.ts', "import x from '@o4o/api-server';");
  assert.throws(f.plan, /application/);
  f.put('packages/test-dep/src/index.ts', 'export const value = 1;');
  f.put('packages/test-dep/dist/index.js', 'tracked output');
  assert.throws(f.plan, /Tracked build output/);
});
test('tracked path traversal and output-delimiter injection are rejected', t => {
  const f = fixture(t);
  for (const p of ['../outside', '/outside', 'packages/evil\nO4O_BUILD_CACHE', 'packages\\outside']) {
    assert.throws(() => makePlan(f.root, [...f.tracked, p], runtime), /Invalid tracked/);
  }
});
test('symlink sources or cached outputs are not reusable and cleanup never follows links', t => {
  const f = fixture(t); const plan = f.plan();
  f.put('outside.txt', 'must survive', false);
  mkdirSync(path.join(f.root, 'packages/test-dep/dist'));
  symlinkSync(path.join(f.root, 'outside.txt'), path.join(f.root, 'packages/test-dep/dist/index.js'));
  assert.throws(() => recordBuild(f.root, plan), /Symlink/);
  clearBuild(f.root, plan);
  assert.equal(readFileSync(path.join(f.root, 'outside.txt'), 'utf8'), 'must survive');
  rmSync(path.join(f.root, 'packages/test-dep/src/index.ts'));
  symlinkSync(path.join(f.root, 'outside.txt'), path.join(f.root, 'packages/test-dep/src/index.ts'));
  assert.throws(f.plan, /Non-regular/);
});
test('cache action falls back to a real build and never caches Jest results', () => {
  const action = readFileSync(new URL('../../../.github/actions/api-dependency-build/action.yml', import.meta.url), 'utf8');
  assert.match(action, /steps\.restore\.outputs\.cache-hit == 'true'/);
  assert.match(action, /api-build-cache\.mjs verify/);
  assert.match(action, /if: steps\.verify\.outputs\.valid != 'true'[\s\S]*?pnpm --fail-if-no-match --filter '@o4o\/api-server\^\.\.\.' run build/);
  assert.doesNotMatch(action, /restore-keys:|save-always:|jest|coverage/);
  const workflow = readFileSync(new URL('../../../.github/workflows/ci-pipeline.yml', import.meta.url), 'utf8');
  assert.match(workflow, /npx jest --maxWorkers=1 --shard=\$\{\{ matrix\.shard \}\}\/3/);
});
test('CI-only action does not deploy API; other actions remain conservative and CI still runs fully', () => {
  const graph = buildWorkspaceGraph();
  const files = path => [{ status: 'M', path }];
  assert.equal(classifyApiDeploy(files('.github/actions/api-dependency-build/action.yml'), graph).api_deploy_affected, false);
  assert.equal(classify(files('.github/actions/api-dependency-build/action.yml'), graph).global_or_unknown, true);
  for (const p of ['.github/actions/setup-build-env/action.yml', '.github/actions/unknown/action.yml']) {
    assert.equal(classifyApiDeploy(files(p), graph).api_deploy_affected, true, p);
  }
  const consumers = [];
  const candidates = readdirSync(path.join(REPO_ROOT, '.github/workflows')).filter(n => /\.ya?ml$/.test(n)).map(n => `.github/workflows/${n}`);
  for (const entry of readdirSync(path.join(REPO_ROOT, '.github/actions'), { withFileTypes: true })) {
    if (entry.isDirectory()) candidates.push(`.github/actions/${entry.name}/action.yml`);
  }
  for (const p of candidates) {
    const text = readFileSync(path.join(REPO_ROOT, p), 'utf8');
    if (text.includes('uses: ./.github/actions/api-dependency-build')) consumers.push(p);
  }
  assert.deepEqual(consumers.sort(), ['.github/workflows/ci-pipeline.yml', '.github/workflows/scheduled-api-full-jest.yml']);
});
