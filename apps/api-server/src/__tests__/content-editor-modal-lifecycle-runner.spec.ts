/**
 * Run the real content-editor ESM/React regressions through the standard API Jest
 * discovery used by `pnpm test` and the required CI's three shards.
 * Vitest stays in its own process because the modal uses Vite import.meta.env.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

it('runs the content-editor modal lifecycle regressions in the default test runner', () => {
  const repositoryRoot = resolve(__dirname, '../../../..');
  const reportDirectory = mkdtempSync(resolve(tmpdir(), 'o4o-modal-lifecycle-'));
  const reportPath = resolve(reportDirectory, 'results.json');
  try {
    const result = spawnSync(process.execPath, [
      resolve(repositoryRoot, 'node_modules/vitest/vitest.mjs'), 'run',
      'packages/content-editor/tests', '--environment', 'jsdom', '--maxWorkers=1',
      '--reporter=default', '--reporter=json', `--outputFile.json=${reportPath}`,
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
    // Console summaries can contain CI/terminal formatting. Verify the current
    // invocation's structured results instead, including nonzero test execution.
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    expect(report.success).toBe(true);
    expect(report.numTotalTests).toBeGreaterThan(0);
    expect(report.numPassedTests).toBe(report.numTotalTests);
    expect(report.numFailedTests).toBe(0);
  } finally {
    rmSync(reportDirectory, { recursive: true, force: true });
  }
}, 150_000);
