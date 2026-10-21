import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, readdir, rm } from 'node:fs/promises';
import { SourceMap } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import { netureProductionObfuscation, PRODUCTION_CHUNK, PRODUCTION_MODULES } from './production.mjs';
import { loginInputs, parserInputs } from './fixtures.mjs';

const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
const integrationFor = (root) => netureProductionObfuscation(root, { privateDir: path.join(root, '.private-build') });
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'neture-production-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const name of PRODUCTION_MODULES) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await copyFile(path.join(sourceRoot, name), path.join(root, name));
  }
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
  await writeFile(path.join(root, 'entry.js'), `
export {resolveLoginReturnPath} from './src/lib/loginReturnPath.ts';
export {parseSupplierProductCandidateDraft} from './src/lib/supplier-product-authoring/parse.ts';`);
  return root;
}
const filesBelow = async (dir) => {
  const names = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) names.push(...await filesBelow(target));
    else names.push(target);
  }
  return names;
};
function config(root, integration, extra = {}) {
  return {
    root, configFile: false, publicDir: false, logLevel: 'silent', mode: 'production',
    plugins: integration ? [integration.plugin] : [],
    build: {
      outDir: 'dist', sourcemap: integration ? 'hidden' : false, minify: 'esbuild', target: 'es2020',
      rollupOptions: {
        input: path.join(root, 'entry.js'), preserveEntrySignatures: 'strict',
        output: { entryFileNames: 'entry.js', manualChunks: integration?.manualChunk },
      },
    },
    ...extra,
  };
}

test('real Vite output keeps contracts and retains a restoring map outside public files', async (t) => {
  const root = await fixture(t);
  const baselineConfig = config(root);
  baselineConfig.build.outDir = 'baseline';
  await build(baselineConfig);
  const baseline = await import(pathToFileURL(path.join(root, 'baseline/entry.js')).href);
  const expected = {
    login: loginInputs.map((args) => baseline.resolveLoginReturnPath(...args)),
    parser: parserInputs.map((input) => baseline.parseSupplierProductCandidateDraft(input)),
  };
  const integration = integrationFor(root);
  await build(config(root, integration));
  const manifest = JSON.parse(await readFile(path.join(root, '.private-build/manifest.json')));
  const api = await import(pathToFileURL(path.join(root, 'dist/entry.js')).href);
  assert.deepEqual(loginInputs.map((args) => api.resolveLoginReturnPath(...args)), expected.login);
  assert.deepEqual(parserInputs.map((input) => api.parseSupplierProductCandidateDraft(input)), expected.parser);
  for (const file of await filesBelow(path.join(root, 'dist'))) {
    assert.equal(file.endsWith('.map'), false);
    assert.doesNotMatch(await readFile(file, 'utf8'), /sourceMappingURL=|sourcesContent/);
  }
  let stack;
  try { api.parseSupplierProductCandidateDraft({}); } catch (error) { stack = error.stack; }
  const match = stack?.match(/neture-logic-[^:]+\.js:(\d+):(\d+)/);
  assert.ok(match);
  const map = JSON.parse(await readFile(path.join(root, '.private-build/neture-logic.js.map')));
  const position = new SourceMap(map).findEntry(Number(match[1]) - 1, Number(match[2]) - 1);
  assert.match(position.originalSource, /supplier-product-authoring\/parse\.ts$/);
  const original = await readFile(path.join(root, 'src/lib/supplier-product-authoring/parse.ts'), 'utf8');
  assert.match(original.split('\n')[position.originalLine], /\.trim\(/);
  assert.equal(manifest.profile, 'names-v1');
});

test('vendor or another own module forced into the target chunk stops the build', async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'other.js'), 'export const other = 7;');
  const entry = path.join(root, 'entry.js');
  await writeFile(entry, await readFile(entry, 'utf8') + "\nexport {other} from './other.js';");
  const integration = integrationFor(root);
  const options = config(root, integration);
  options.build.rollupOptions.output.manualChunks = (id) => id.endsWith('/other.js') ? PRODUCTION_CHUNK : integration.manualChunk(id);
  await assert.rejects(build(options), /outside its allowlist/);
});

test('a private map location inside a public output directory is rejected', async (t) => {
  const root = await fixture(t);
  const options = config(root, integrationFor(root));
  options.build.outDir = root;
  await assert.rejects(build(options), /outside the public build directory/);
});

test('normal builds do not create private artifacts or obfuscation chunks', async (t) => {
  const root = await fixture(t);
  await build(config(root));
  await assert.rejects(readFile(path.join(root, '.private-build/manifest.json')), { code: 'ENOENT' });
  const names = await filesBelow(path.join(root, 'dist'));
  assert.equal(names.some((name) => name.includes(PRODUCTION_CHUNK)), false);
});
