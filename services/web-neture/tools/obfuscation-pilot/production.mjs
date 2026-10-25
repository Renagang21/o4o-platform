import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { stripSourceMapComment } from './source-map-comment.mjs';

export const PRODUCTION_CHUNK = 'neture-logic';
export const PRODUCTION_MODULES = [
  'src/lib/loginReturnPath.ts',
  'src/lib/supplier-product-authoring/parse.ts',
  'src/lib/supplier-product-authoring/types.ts',
];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const moduleId = (value) => value.replaceAll('\\', '/');

export const productionOptions = Object.freeze({
  compact: true, controlFlowFlattening: false, deadCodeInjection: false,
  debugProtection: false, debugProtectionInterval: 0, disableConsoleOutput: false,
  identifierNamesGenerator: 'mangled-shuffled', identifiersPrefix: 'ntr_',
  ignoreImports: true, numbersToExpressions: false, renameGlobals: false,
  renameProperties: false, selfDefending: false, simplify: false,
  splitStrings: false, stringArray: false, transformObjectKeys: false,
  unicodeEscapeSequence: false, seed: 20261020, target: 'browser-no-eval',
  sourceMap: true, sourceMapMode: 'separate', sourceMapSourcesMode: 'sources-content',
});

/** Production-only Vite integration. The caller explicitly installs the plugin. */
export function netureProductionObfuscation(root, options = {}) {
  const allowed = new Set(PRODUCTION_MODULES.map((name) => moduleId(path.resolve(root, name))));
  // Keep ordinary local maps outside the workspace and dev server's allowlist.
  const privateDir = path.resolve(options.privateDir ?? process.env.NETURE_PRIVATE_DEBUG_DIR
    ?? path.join(os.tmpdir(), 'o4o-neture-production-debug', hash(path.resolve(root)).slice(0, 16)));
  let outputDir;
  let transformed;
  let privateFiles;
  return {
    privateDir,
    manualChunk: (id) => allowed.has(moduleId(id)) ? PRODUCTION_CHUNK : undefined,
    plugin: {
      name: 'neture-production-names',
      apply: 'build',
      enforce: 'post',
      configResolved(config) {
        if (config.command !== 'build' || config.mode !== 'production' || config.build.sourcemap !== 'hidden') {
          throw new Error('Neture names transform requires an explicit production build with hidden maps');
        }
        outputDir = path.resolve(config.root, config.build.outDir);
        if (privateDir === outputDir || privateDir.startsWith(outputDir + path.sep)) {
          throw new Error('Private debug output must be outside the public build directory');
        }
      },
      buildStart() { transformed = undefined; privateFiles = undefined; },
      renderChunk: {
        // Run after Vite/esbuild minification. The returned map is composed by Rollup.
        order: 'post',
        handler(code, chunk) {
          if (chunk.name !== PRODUCTION_CHUNK) return null;
          if (!chunk.moduleIds.length || chunk.moduleIds.some((id) => !allowed.has(moduleId(id)))) {
            throw new Error('Neture names chunk contains a module outside its allowlist');
          }
          if (transformed) throw new Error('Expected a single Neture names chunk');
          const result = JavaScriptObfuscator.obfuscate(code, {
            ...productionOptions, inputFileName: 'neture-logic.js',
          });
          const next = stripSourceMapComment(result.getObfuscatedCode());
          const beforeGzip = gzipSync(code).length;
          const afterGzip = gzipSync(next).length;
          if (afterGzip - beforeGzip > 1024 || afterGzip > beforeGzip * 1.2) {
            throw new Error('Neture names chunk exceeded its gzip budget');
          }
          transformed = { beforeBytes: Buffer.byteLength(code), afterBytes: Buffer.byteLength(next), beforeGzip, afterGzip };
          return { code: next, map: JSON.parse(result.getSourceMap()) };
        },
      },
      generateBundle: {
        order: 'post',
        handler(_options, bundle) {
          const chunks = Object.values(bundle).filter((item) => item.type === 'chunk' && item.name === PRODUCTION_CHUNK);
          if (!transformed || chunks.length !== 1 || !chunks[0].map) throw new Error('Missing mapped Neture names chunk');
          const chunk = chunks[0];
          const map = chunk.map.toString();
          if (/sourceMappingURL=/.test(chunk.code)) throw new Error('Public chunk contains a source map URL');
          privateFiles = { map, manifest: {
            profile: 'names-v1', file: chunk.fileName, codeSha256: hash(chunk.code),
            mapFile: 'neture-logic.js.map', mapSha256: hash(map), ...transformed,
          } };
          // Rollup's maps must never become public assets, including vendor maps.
          for (const name of Object.keys(bundle)) if (name.endsWith('.map')) delete bundle[name];
        },
      },
      async writeBundle() {
        if (!privateFiles) throw new Error('Missing private debug artifacts');
        // Rollup can materialize maps during writing; remove only generated map files.
        const removeMaps = async (dir) => {
          const { unlink } = await import('node:fs/promises');
          for (const entry of await readdir(dir, { withFileTypes: true })) {
            const target = path.join(dir, entry.name);
            if (entry.isDirectory()) await removeMaps(target);
            else if (entry.name.endsWith('.map')) await unlink(target);
          }
        };
        await removeMaps(outputDir);
        const published = await readFile(path.join(outputDir, privateFiles.manifest.file));
        if (hash(published) !== privateFiles.manifest.codeSha256) throw new Error('Published chunk differs from private debug manifest');
        await mkdir(privateDir, { recursive: true, mode: 0o700 });
        await writeFile(path.join(privateDir, 'neture-logic.js.map'), privateFiles.map, { mode: 0o600 });
        await writeFile(path.join(privateDir, 'manifest.json'), JSON.stringify(privateFiles.manifest, null, 2) + '\n', { mode: 0o600 });
        console.log(`Neture names-v1: ${privateFiles.manifest.file}, gzip ${transformed.beforeGzip} -> ${transformed.afterGzip} bytes; private map retained`);
      },
    },
  };
}
