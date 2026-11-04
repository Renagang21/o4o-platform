import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeDependencies, checkRuntimeDependencies, productionOnly } from '../api-runtime-dependencies.mjs';

function fixture() {
  const api = { engines: { node: '>=22.18.0' }, dependencies: { pg: '^8.16.3', sharp: '0.34.3', '@o4o/types': 'workspace:*', '@types/pg': '^8.0.0' } };
  const lock = { importers: { 'apps/api-server': { dependencies: { pg: { specifier: '^8.16.3', version: '8.16.3' }, sharp: { specifier: '0.34.3', version: '0.34.3(peer@1.0.0)' } } } } };
  const expected = { ...productionOnly, pg: '8.16.3', sharp: '0.34.3' };
  const manifest = { engines: api.engines, dependencies: expected };
  const npmLock = { lockfileVersion: 3, packages: { '': { dependencies: expected }, ...Object.fromEntries(Object.entries(expected).map(([name, version]) => [`node_modules/${name}`, { version }])) } };
  return { api, lock, manifest, npmLock };
}

test('uses resolved pnpm versions, handles peer suffixes, and excludes bundled workspaces/types', () => {
  const { api, lock } = fixture();
  assert.deepEqual(runtimeDependencies(api, lock), { ...productionOnly, pg: '8.16.3', sharp: '0.34.3' });
});

test('accepts matching direct dependencies without pretending transitive trees are equal', () => {
  const { api, lock, manifest, npmLock } = fixture();
  assert.deepEqual(checkRuntimeDependencies(api, lock, manifest, npmLock), { shared: 2, exceptions: 1 });
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

test('fails closed for unresolved aliases and a production exception entering the API graph', () => {
  const { api, lock } = fixture();
  lock.importers['apps/api-server'].dependencies.pg.version = 'link:../pg';
  assert.throws(() => runtimeDependencies(api, lock), /unsupported pnpm resolution/);
  lock.importers['apps/api-server'].dependencies.pg.version = '8.16.3';
  api.dependencies['@nestjs/platform-express'] = '10.4.22';
  lock.importers['apps/api-server'].dependencies['@nestjs/platform-express'] = { specifier: '10.4.22', version: '10.4.22' };
  assert.throws(() => runtimeDependencies(api, lock), /remove the production-only exception/);
});

test('preserves the patched production ORM until a coordinated shared type upgrade', () => {
  const { api, lock } = fixture();
  api.dependencies.typeorm = '0.3.27';
  lock.importers['apps/api-server'].dependencies.typeorm = { specifier: '0.3.27', version: '0.3.27(pg@8.23.1)' };
  assert.equal(runtimeDependencies(api, lock).typeorm, '0.3.31');
  lock.importers['apps/api-server'].dependencies.typeorm.version = '0.3.31';
  assert.throws(() => runtimeDependencies(api, lock), /review\/remove the explicit CI\/runtime version exception/);
});
