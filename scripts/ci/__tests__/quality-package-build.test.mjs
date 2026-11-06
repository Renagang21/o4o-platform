import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildWorkspaceGraph, dependencyClosure, REPO_ROOT } from '../detect-affected.mjs';

const graph = buildWorkspaceGraph();
const scripts = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).scripts;
const workflow = readFileSync(path.join(REPO_ROOT, '.github/workflows/ci-pipeline.yml'), 'utf8');
const quality = workflow.split('\n  quality-check:\n')[1].split('\n  api-tests:\n')[0];
const api = new Set(dependencyClosure(graph, '@o4o/api-server'));
api.delete('@o4o/api-server');
const remaining = quality.split('    - name: Build remaining shared packages\n')[1].split('\n    #')[0];
const remainingScripts = [...remaining.matchAll(/^        pnpm run ([\w:-]+)$/gm)].map(match => match[1]);

// Expand the existing root recipe, rather than freezing its current package list.
// A new command/selector fails closed until this CI split has been reviewed.
function targets(name, seen = new Set()) {
  assert.ok(!seen.has(name), `recursive build script: ${name}`);
  assert.equal(typeof scripts[name], 'string', `missing build script: ${name}`);
  return scripts[name].split(' && ').flatMap(command => {
    const nested = /^pnpm run ([\w:-]+)$/.exec(command);
    if (nested) return targets(nested[1], new Set([...seen, name]));
    const leaf = /^pnpm (?:--fail-if-no-match )?--filter(?:=| )"?(@[\w-]+\/[\w-]+(?:\^\.\.\.)?)"? run build$/.exec(command);
    assert.ok(leaf, `unreviewed build command: ${command}`);
    if (leaf[1] === '@o4o/api-server^...') return [...api];
    assert.ok(graph.byName.has(leaf[1]), `unknown workspace: ${leaf[1]}`);
    return [leaf[1]];
  });
}

test('quality build covers exactly the root recipe without rebuilding the API closure', () => {
  assert.ok(remainingScripts.length > 0);
  const extra = remainingScripts.flatMap(name => targets(name));
  assert.equal(extra.length, new Set(extra).size, 'duplicate remaining package build');
  assert.ok(extra.every(name => !api.has(name)), 'API package rebuilt after cache restore/build');
  assert.deepEqual([...new Set([...api, ...extra])].sort(), [...new Set(targets('build:packages'))].sort());
});

test('remaining package builds keep their workspace dependencies available in order', () => {
  const available = new Set(api);
  for (const name of remainingScripts.flatMap(script => targets(script))) {
    const dependencies = dependencyClosure(graph, name);
    dependencies.delete(name);
    for (const dep of dependencies) {
      const manifest = JSON.parse(readFileSync(path.join(REPO_ROOT, graph.byName.get(dep).dir, 'package.json'), 'utf8'));
      if (manifest.scripts?.build) assert.ok(available.has(dep), `${name} needs ${dep} built first`);
    }
    available.add(name);
  }
});

test('quality uses verified dependencies before remaining builds and the existing freshness/type guards', () => {
  const setup = quality.split('    - name: Setup build environment\n')[1].split('    - name: Build API dependency closure\n')[0];
  assert.match(setup, /strict-lockfile: 'true'/);
  assert.match(setup, /build-packages: 'false'/);
  const apiStep = quality.split('    - name: Build API dependency closure\n')[1].split('    - name: Build remaining shared packages\n')[0];
  assert.match(apiStep, /uses: \.\/\.github\/actions\/api-dependency-build/);
  assert.doesNotMatch(apiStep + remaining, /continue-on-error|\|\| true/);
  assert.match(remaining, /pnpm run build:account-ui\n        echo "O4O_PACKAGES_PREBUILT=1" >> "\$GITHUB_ENV"/);
  assert.match(quality, /name: Build shared types \(explicit guard\)/);
  assert.match(quality, /name: Verify types dist freshness/);
  assert.match(quality, /run: pnpm --filter @o4o\/api-server run type-check/);
  assert.ok(quality.includes('scripts/ci/__tests__/quality-package-build.test.mjs'));
});
