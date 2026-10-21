import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { assertOwnModules, buildPilot, lightOptions, outputRoot, profile, restorePosition, serviceRoot, sha256 } from './build.mjs';
import { loginInputs, parserInputs, validDraft } from './fixtures.mjs';
import { stripSourceMapComment } from './source-map-comment.mjs';

const artifact = await buildPilot();
const baseline = await import(pathToFileURL(path.join(outputRoot, 'public/baseline/pilot.js')).href);
const obfuscated = await import(pathToFileURL(path.join(outputRoot, 'public/obfuscated/pilot.js')).href);

test('only explicitly selected own modules may enter the comparison bundle', () => {
  assert.throws(() => assertOwnModules([]));
  assert.throws(() => assertOwnModules([path.join(serviceRoot, 'node_modules/react/index.js')]));
  assert.throws(() => assertOwnModules([path.join(serviceRoot, 'src/App.tsx')]));
});

test('public artifacts have no maps, mapping comments or private source content', async () => {
  for (const kind of ['baseline', 'obfuscated']) {
    assert.deepEqual(await readdir(path.join(outputRoot, 'public', kind)), ['pilot.js']);
    assert.doesNotMatch(artifact[kind], /sourceMappingURL=|sourceURL=|debugger\s*;|\beval\s*\(/);
    assert.equal(sha256(artifact[kind]), artifact.manifest[kind].sha256);
  }
  const manifest = JSON.parse(await readFile(path.join(outputRoot, 'private/manifest.json'), 'utf8'));
  assert.equal(manifest.modules.length, 4);
  assert.ok(manifest.modules.every((item) => /^[a-f0-9]{64}$/.test(item.sha256)));
});

test('same input and fixed seed give the same transformed executable', () => {
  const code = stripSourceMapComment(JavaScriptObfuscator.obfuscate(artifact.baseline, lightOptions).getObfuscatedCode());
  assert.equal(code, artifact.obfuscated);
  assert.notEqual(code, artifact.baseline);
  if (profile === 'strings') assert.match(code, /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}/i);
});

test('map comment removal handles LF/CRLF without touching literals or earlier comments', () => {
  const code = 'const value = 1;';
  assert.equal(stripSourceMapComment(code + '\n//# sourceMappingURL=pilot.js.map\n'), code);
  assert.equal(stripSourceMapComment(code + '\r\n  //# sourceMappingURL=pilot.js.map \r\n\t'), code);
  assert.equal(stripSourceMapComment('//# sourceMappingURL=pilot.js.map'), '');
  for (const source of ['', code + '\n', 'const value = "//# sourceMappingURL=literal";', '//# sourceMappingURL=earlier\n' + code]) {
    assert.equal(stripSourceMapComment(source), source);
  }
  const longLine = 'x'.repeat(1000000);
  assert.equal(stripSourceMapComment(longLine), longLine);
});

test('exported interface remains the same', () => {
  assert.deepEqual(Object.keys(obfuscated), Object.keys(baseline));
  assert.deepEqual(Object.keys(obfuscated), ['isSafeReturnPath', 'parseSupplierProductCandidateDraft', 'resolveLoginReturnPath']);
});

for (const [index, args] of loginInputs.entries()) {
  test(`login return-path case ${index + 1} keeps original routing decisions`, () => {
    assert.equal(obfuscated.resolveLoginReturnPath(...args), baseline.resolveLoginReturnPath(...args));
  });
}

test('external return paths remain rejected', () => {
  for (const value of ['//example.invalid', '/\\example.invalid', 'https://example.invalid', '', null, 7]) {
    assert.equal(obfuscated.isSafeReturnPath(value), false);
  }
  assert.equal(obfuscated.resolveLoginReturnPath(null, '?returnTo=//example.invalid&returnUrl=/safe'), undefined);
});

for (const [index, input] of parserInputs.entries()) {
  test(`draft parser case ${index + 1} keeps data, warnings and errors`, () => {
    assert.deepEqual(obfuscated.parseSupplierProductCandidateDraft(input), baseline.parseSupplierProductCandidateDraft(input));
  });
}

test('JSON properties, Korean text and forbidden-field filtering remain intact', () => {
  const result = obfuscated.parseSupplierProductCandidateDraft(JSON.stringify({ ...validDraft, supplierId: 'synthetic', stock: 10 }));
  assert.equal(result.ok, true);
  assert.equal(result.draft.name, validDraft.name);
  assert.equal(result.draft.offerDraft.priceGeneral, 1500);
  assert.equal('supplierId' in result.draft, false);
  assert.equal('stock' in result.draft, false);
  assert.equal(result.warnings.length, 2);
});

test('an actual transformed parser exception restores to original TypeScript', async () => {
  let stack;
  try { obfuscated.parseSupplierProductCandidateDraft({}); } catch (error) { stack = error.stack; }
  const match = stack?.match(/pilot\.js:(\d+):(\d+)/);
  assert.ok(match, 'expected a generated file position in the exception');
  const restored = restorePosition([artifact.obfuscatedMap, artifact.baselineMap], Number(match[1]) - 1, Number(match[2]) - 1);
  assert.match(restored.originalSource, /supplier-product-authoring\/parse\.ts$/);
  const source = await readFile(path.join(serviceRoot, 'src/lib/supplier-product-authoring/parse.ts'), 'utf8');
  assert.match(source.split('\n')[restored.originalLine], /\.trim\(/);
});
