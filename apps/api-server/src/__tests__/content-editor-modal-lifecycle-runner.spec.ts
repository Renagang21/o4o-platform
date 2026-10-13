/**
 * Run the real content-editor ESM/React regressions through the standard API Jest
 * discovery used by `pnpm test` and the required CI's three shards.
 * Vitest stays in its own process because the modal uses Vite import.meta.env.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

it('runs the content-editor modal lifecycle regressions in the default test runner', () => {
  const repositoryRoot = resolve(__dirname, '../../../..');
  const result = spawnSync(process.execPath, [
    resolve(repositoryRoot, 'node_modules/vitest/vitest.mjs'), 'run',
    'packages/content-editor/tests', '--environment', 'jsdom', '--maxWorkers=1',
  ], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  // Keep the nested runner's real test counts and failure details visible in CI.
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.stdout).toMatch(/Tests\s+[1-9]\d* passed/);
}, 150_000);
