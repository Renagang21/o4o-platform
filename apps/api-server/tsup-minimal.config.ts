import { defineConfig } from 'tsup';

/**
 * Minimal tsup configuration for Cloud Run health check server
 */
export default defineConfig({
  entry: ['src/main-minimal.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  bundle: true,

  // Keep express external
  external: ['express'],

  shims: true,

  banner: {
    js: `
import { createRequire as _cReq } from 'module';
import { fileURLToPath as _fURL } from 'url';
import { dirname as _dir } from 'path';
var require = globalThis.require ?? _cReq(import.meta.url);
var __filename = globalThis.__filename ?? _fURL(import.meta.url);
var __dirname = globalThis.__dirname ?? _dir(__filename);
`.trim(),
  },
});
