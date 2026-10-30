import { buildSync } from 'esbuild';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

it.each([true, false])('loads ambient env files only outside review isolation (isolated=%s)', isolated => {
  const fixture = mkdtempSync(join(tmpdir(), 'o4o-review-loader-'));
  try {
    const app = join(fixture, 'app');
    mkdirSync(join(app, 'dist'), { recursive: true });
    writeFileSync(join(app, '.env.development'), 'O4O_REVIEW_LOADER_SENTINEL=synthetic-fixture\n');
    const output = join(app, 'dist', 'env-loader.cjs');
    // Bundle the real loader into a disposable app, so no checkout's private env file is read.
    buildSync({ entryPoints: [resolve(__dirname, '../../env-loader.ts')], outfile: output,
      bundle: true, platform: 'node', format: 'cjs',
      define: { 'import.meta.url': JSON.stringify(pathToFileURL(output).href) } });
    const result = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(output)}); process.stdout.write(process.env.O4O_REVIEW_LOADER_SENTINEL || 'missing')`], {
      cwd: app, encoding: 'utf8', env: { NODE_ENV: 'development', ...(isolated ? { REVIEW_DEMO_ENVIRONMENT: 'isolated' } : {}) },
    });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(isolated ? 'missing' : 'synthetic-fixture');
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
