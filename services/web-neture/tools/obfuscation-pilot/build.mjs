import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire, SourceMap } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { build } from 'vite';

const require = createRequire(import.meta.url);
export const serviceRoot = fileURLToPath(new URL('../../', import.meta.url));
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const profile = process.env.NETURE_PILOT_PROFILE ?? 'names';
if (!['names', 'strings'].includes(profile)) throw new Error('NETURE_PILOT_PROFILE must be names or strings');
// Outside the checkout and Docker build context; each worktree gets its own output.
export const outputRoot = path.join(os.tmpdir(), 'o4o-neture-obfuscation-pilot', sha256(serviceRoot).slice(0, 16), profile);
const ownModules = [
  'tools/obfuscation-pilot/entry.ts',
  'src/lib/loginReturnPath.ts',
  'src/lib/supplier-product-authoring/parse.ts',
  'src/lib/supplier-product-authoring/types.ts',
];

// No runtime decoder, property renaming, console suppression, eval, anti-debugging,
// self-defending code or control-flow changes. Escapes are a reading hurdle only.
export const lightOptions = Object.freeze({
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'mangled-shuffled',
  identifiersPrefix: 'ntr_',
  ignoreImports: true,
  numbersToExpressions: false,
  renameGlobals: false,
  renameProperties: false,
  selfDefending: false,
  simplify: false,
  splitStrings: false,
  stringArray: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: profile === 'strings',
  seed: 20261020,
  target: 'browser-no-eval',
  sourceMap: true,
  sourceMapMode: 'separate',
  sourceMapSourcesMode: 'sources-content',
  sourceMapFileName: 'pilot.js.map',
  inputFileName: 'pilot.js',
});

export function assertOwnModules(moduleIds) {
  const allowed = new Set(ownModules.map((name) => path.resolve(serviceRoot, name)));
  if (!moduleIds.length || moduleIds.some((id) => !allowed.has(path.resolve(id)))) {
    throw new Error('Pilot bundle contains a module outside its explicit allowlist');
  }
}

// Resolve generated coordinates through both private maps: obfuscated → minified → TS.
// Columns and lines use the same zero-based convention as node:module SourceMap.
export function restorePosition(maps, line, column) {
  let position = { originalLine: line, originalColumn: column };
  for (const map of maps) {
    position = new SourceMap(map).findEntry(position.originalLine, position.originalColumn);
    if (!position.originalSource) throw new Error('Pilot source position could not be restored');
  }
  return position;
}

export async function buildPilot() {
  const started = performance.now();
  const result = await build({
    root: serviceRoot,
    configFile: false,
    publicDir: false,
    logLevel: 'warn',
    mode: 'production',
    build: {
      write: false,
      sourcemap: 'hidden',
      minify: 'esbuild',
      target: 'es2020',
      // App-mode minification, matching the app's whitespace compression too.
      // Vite library mode deliberately leaves ES whitespace and is not a fair baseline.
      rollupOptions: {
        input: path.join(serviceRoot, ownModules[0]),
        preserveEntrySignatures: 'strict',
        output: { format: 'es', entryFileNames: 'pilot.js', inlineDynamicImports: true },
      },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((item) => item.output);
  const chunks = outputs.filter((item) => item.type === 'chunk');
  if (chunks.length !== 1 || !chunks[0].map) throw new Error('Expected one mapped ESM pilot chunk');
  const chunk = chunks[0];
  assertOwnModules(Object.keys(chunk.modules));
  const baseline = chunk.code;
  const baselineMap = JSON.parse(chunk.map.toString());
  const obfuscationStarted = performance.now();
  const transformed = JavaScriptObfuscator.obfuscate(baseline, lightOptions);
  // Keep source maps out of public output, including the discoverable URL comment.
  const obfuscated = transformed.getObfuscatedCode().replace(/\n?\/\/# sourceMappingURL=[^\r\n]*\s*$/, '');
  const obfuscatedMap = JSON.parse(transformed.getSourceMap());
  const obfuscationMs = performance.now() - obfuscationStarted;

  const privateRoot = path.join(outputRoot, 'private');
  await mkdir(privateRoot, { recursive: true, mode: 0o700 });
  for (const [kind, code] of [['baseline', baseline], ['obfuscated', obfuscated]]) {
    const dir = path.join(outputRoot, 'public', kind);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'pilot.js'), code);
  }
  await writeFile(path.join(privateRoot, 'baseline.js.map'), JSON.stringify(baselineMap), { mode: 0o600 });
  await writeFile(path.join(privateRoot, 'obfuscated.js.map'), JSON.stringify(obfuscatedMap), { mode: 0o600 });

  const manifest = {
    experimentOnly: true,
    profile,
    versions: { node: process.version, vite: require('vite/package.json').version, obfuscator: require('javascript-obfuscator/package.json').version },
    modules: await Promise.all(ownModules.map(async (name) => ({ path: name, sha256: sha256(await readFile(path.join(serviceRoot, name))) }))),
    options: lightOptions,
    baseline: { sha256: sha256(baseline), bytes: Buffer.byteLength(baseline), gzipBytes: gzipSync(baseline).length },
    obfuscated: { sha256: sha256(obfuscated), bytes: Buffer.byteLength(obfuscated), gzipBytes: gzipSync(obfuscated).length },
    totalBuildMs: Math.round(performance.now() - started),
    obfuscationMs: Math.round(obfuscationMs),
  };
  await writeFile(path.join(privateRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
  return { baseline, obfuscated, baselineMap, obfuscatedMap, manifest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { manifest } = await buildPilot();
  console.log(JSON.stringify({ outputRoot, ...manifest }, null, 2));
}
