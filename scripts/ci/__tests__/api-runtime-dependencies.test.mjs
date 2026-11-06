import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeDependencies, checkRuntimeDependencies, checkTypeormAlignment } from '../api-runtime-dependencies.mjs';

function fixture() {
  const api = { engines: { node: '>=22.18.0' }, dependencies: { pg: '^8.16.3', sharp: '0.34.3', '@o4o/types': 'workspace:*', '@types/pg': '^8.0.0' } };
  const lock = { importers: { 'apps/api-server': { dependencies: { pg: { specifier: '^8.16.3', version: '8.16.3' }, sharp: { specifier: '0.34.3', version: '0.34.3(peer@1.0.0)' } } } } };
  const expected = { pg: '8.16.3', sharp: '0.34.3' };
  const manifest = { engines: api.engines, dependencies: expected };
  const npmLock = { lockfileVersion: 3, packages: { '': { dependencies: expected }, ...Object.fromEntries(Object.entries(expected).map(([name, version]) => [`node_modules/${name}`, { version }])) } };
  return { api, lock, manifest, npmLock };
}

test('uses resolved pnpm versions, handles peer suffixes, and excludes bundled workspaces/types', () => {
  const { api, lock } = fixture();
  assert.deepEqual(runtimeDependencies(api, lock), { pg: '8.16.3', sharp: '0.34.3' });
});

test('accepts matching direct dependencies without pretending transitive trees are equal', () => {
  const { api, lock, manifest, npmLock } = fixture();
  assert.deepEqual(checkRuntimeDependencies(api, lock, manifest, npmLock), { shared: 2, exceptions: 0 });
});

test('rejects root lock agreement when the actual installed top-level version differs', () => {
  const { api, lock, manifest, npmLock } = fixture();
  npmLock.packages['node_modules/pg'].version = '8.23.1';
  assert.throws(() => checkRuntimeDependencies(api, lock, manifest, npmLock), /pg: production npm lock differs/);
});

test('rejects missing/new runtime dependencies and stale pnpm specifiers', () => {
  const { api, lock, manifest, npmLock } = fixture();
  delete manifest.dependencies.sharp;
  assert.throws(() => checkRuntimeDependencies(api, lock, manifest, npmLock), /Production manifest drift/);
  api.dependencies.pg = '^9.0.0';
  assert.throws(() => runtimeDependencies(api, lock), /API manifest and pnpm lock differ/);
});

test('fails closed for unresolved aliases and untested production-only dependencies', () => {
  const { api, lock, manifest, npmLock } = fixture();
  lock.importers['apps/api-server'].dependencies.pg.version = 'link:../pg';
  assert.throws(() => runtimeDependencies(api, lock), /unsupported pnpm resolution/);
  lock.importers['apps/api-server'].dependencies.pg.version = '8.16.3';
  manifest.dependencies['@nestjs/platform-express'] = '10.4.22';
  assert.throws(() => checkRuntimeDependencies(api, lock, manifest, npmLock), /Production manifest drift/);
});

test('requires workspace-wide TypeORM alignment, including shared importers and duplicate versions', () => {
  const lock = { overrides: { typeorm: '0.3.31' }, packages: { 'typeorm@0.3.31': {} }, importers: {
    'apps/api-server': { dependencies: { typeorm: { version: '0.3.31(pg@8.23.1)' } } },
    'packages/auth-core': { dependencies: { typeorm: { version: '0.3.31(pg@8.16.3)' } } },
  } };
  checkTypeormAlignment(lock, '0.3.31');
  lock.importers['packages/auth-core'].dependencies.typeorm.version = '0.3.27';
  assert.throws(() => checkTypeormAlignment(lock, '0.3.31'), /shared TypeORM resolution/);
  lock.importers['packages/auth-core'].dependencies.typeorm.version = '0.3.31';
  lock.packages['typeorm@0.3.27'] = {};
  assert.throws(() => checkTypeormAlignment(lock, '0.3.31'), /one shared TypeORM version/);
  delete lock.packages['typeorm@0.3.27'];
  delete lock.overrides.typeorm;
  assert.throws(() => checkTypeormAlignment(lock, '0.3.31'), /pinned workspace-wide/);
});

test('rejects an unused optional Nest adapter retained only by the old npm lock', () => {
  const { api, lock, manifest, npmLock } = fixture();
  npmLock.packages['node_modules/@nestjs/platform-express'] = { version: '10.4.22', peer: true };
  assert.throws(() => checkRuntimeDependencies(api, lock, manifest, npmLock), /unused optional Nest adapter/);
});
