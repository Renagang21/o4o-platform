#!/usr/bin/env node
/** Pin Docker's external dependencies to the API versions actually tested by pnpm. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** All TypeORM consumers must resolve the same package version/type identity. */
export function checkTypeormAlignment(lock, version) {
  assert.equal(lock.overrides?.typeorm, version, 'TypeORM must be pinned workspace-wide, not only in the API');
  for (const [name, importer] of Object.entries(lock.importers)) {
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      const entry = importer[section]?.typeorm;
      if (entry) assert.equal(entry.version.split('(')[0], version, `${name}: shared TypeORM resolution differs from the API`);
    }
  }
  const resolutions = Object.keys(lock.packages ?? {}).filter(name => name.startsWith('typeorm@'));
  assert.deepEqual(resolutions, [`typeorm@${version}`], 'pnpm lock must contain one shared TypeORM version');
}

export function runtimeDependencies(api, lock) {
  const importer = lock.importers?.['apps/api-server'];
  assert.ok(importer, 'Missing API importer in pnpm-lock.yaml');
  const dependencies = {};
  for (const [name, specifier] of Object.entries(api.dependencies)) {
    if (specifier.startsWith('workspace:') || name.startsWith('@types/')) continue;
    const entry = importer.dependencies?.[name];
    assert.equal(entry?.specifier, specifier, `${name}: API manifest and pnpm lock differ`);
    const match = /^(\d+\.\d+\.\d+(?:-[\w.-]+)?)(?:\(|$)/.exec(entry.version);
    assert.ok(match, `${name}: unsupported pnpm resolution ${entry.version}`);
    dependencies[name] = match[1];
  }
  if (dependencies.typeorm) checkTypeormAlignment(lock, dependencies.typeorm);
  return Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b, 'en')));
}

export function checkRuntimeDependencies(api, pnpmLock, manifest, npmLock) {
  const expected = runtimeDependencies(api, pnpmLock);
  assert.deepEqual(manifest.dependencies, expected, 'Production manifest drift: run pnpm run sync:api-runtime, then refresh the npm lock in an isolated directory');
  assert.equal(manifest.engines.node, api.engines.node, 'Production Node engine must match the API');
  assert.ok(Object.hasOwn(expected, '@nestjs/platform-express') || !npmLock.packages?.['node_modules/@nestjs/platform-express'], 'Remove the unused optional Nest adapter from the production lock as well as the manifest');
  assert.equal(npmLock.lockfileVersion, 3, 'Production npm lock must use lockfileVersion 3');
  assert.deepEqual(npmLock.packages?.['']?.dependencies, expected, 'Production npm lock root differs from its manifest');
  for (const [name, version] of Object.entries(expected)) {
    assert.equal(npmLock.packages?.[`node_modules/${name}`]?.version, version, `${name}: production npm lock differs from the tested/preserved exact version`);
  }
  return { shared: Object.keys(expected).length, exceptions: 0 };
}

function main() {
  assert.ok(process.argv.length <= 3 && (!process.argv[2] || process.argv[2] === '--write'), 'Usage: node scripts/ci/api-runtime-dependencies.mjs [--write]');
  const read = name => JSON.parse(readFileSync(path.join(root, name), 'utf8'));
  const api = read('apps/api-server/package.json');
  const require = createRequire(path.join(root, 'apps/api-server/package.json'));
  const pnpmLock = require('js-yaml').load(readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'));
  const manifestPath = 'apps/api-server/package.production.json';
  const manifest = read(manifestPath);
  if (process.argv[2] === '--write') {
    manifest.dependencies = runtimeDependencies(api, pnpmLock);
    manifest.engines.node = api.engines.node;
    writeFileSync(path.join(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log('Production manifest generated; refresh package.production-lock.json in an isolated directory before committing.');
    return;
  }
  const result = checkRuntimeDependencies(api, pnpmLock, manifest, read('apps/api-server/package.production-lock.json'));
  console.log(`API runtime dependency parity PASS: ${result.shared} shared exact versions; ${result.exceptions} exceptions. Transitive npm/pnpm trees remain separate.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
