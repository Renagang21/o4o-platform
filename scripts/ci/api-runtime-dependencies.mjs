#!/usr/bin/env node
/** Pin Docker's external dependencies to the API versions actually tested by pnpm. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Retain the existing production-only Nest adapter. It is not in the pnpm API
// graph, so do not silently claim CI/runtime parity for it or resolve it afresh.
export const productionOnly = Object.freeze({ '@nestjs/platform-express': '10.4.22' });
// Keep the already-serving security-patched ORM until its shared workspace type
// graph can move together. Updating only the API creates incompatible DataSource
// identities; downgrading production would reintroduce resolved advisories.
export const versionExceptions = Object.freeze({ typeorm: { ci: '0.3.27', production: '0.3.31' } });

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
    const exception = versionExceptions[name];
    if (exception) assert.equal(match[1], exception.ci, `${name}: review/remove the explicit CI/runtime version exception after a coordinated workspace upgrade`);
    dependencies[name] = exception?.production ?? match[1];
  }
  for (const [name, version] of Object.entries(productionOnly)) {
    assert.ok(!Object.hasOwn(dependencies, name), `${name}: remove the production-only exception after adding it to the API graph`);
    dependencies[name] = version;
  }
  return Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b, 'en')));
}

export function checkRuntimeDependencies(api, pnpmLock, manifest, npmLock) {
  const expected = runtimeDependencies(api, pnpmLock);
  assert.deepEqual(manifest.dependencies, expected, 'Production manifest drift: run pnpm run sync:api-runtime, then refresh the npm lock in an isolated directory');
  assert.equal(manifest.engines.node, api.engines.node, 'Production Node engine must match the API');
  assert.equal(npmLock.lockfileVersion, 3, 'Production npm lock must use lockfileVersion 3');
  assert.deepEqual(npmLock.packages?.['']?.dependencies, expected, 'Production npm lock root differs from its manifest');
  for (const [name, version] of Object.entries(expected)) {
    assert.equal(npmLock.packages?.[`node_modules/${name}`]?.version, version, `${name}: production npm lock differs from the tested/preserved exact version`);
  }
  const exceptions = Object.keys(productionOnly).length + Object.keys(versionExceptions).filter(name => Object.hasOwn(expected, name)).length;
  return { shared: Object.keys(expected).length - exceptions, exceptions };
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
  console.log(`API runtime dependency parity PASS: ${result.shared} shared exact versions; ${result.exceptions} explicit exceptions (production-only Nest adapter; coordinated TypeORM upgrade pending). Transitive npm/pnpm trees remain separate.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
