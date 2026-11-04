#!/usr/bin/env node
/** Load the isolated npm/Docker dependency tree, never the workspace hoist. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

assert.equal(process.argv.length, 3, 'Usage: node scripts/ci/smoke-api-runtime.mjs <isolated-runtime-directory>');
const directory = path.resolve(process.argv[2]);
const manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
assert.equal(manifest.name, '@o4o/api-server-runtime', 'Use the isolated production manifest, not the workspace');
const failures = [];
for (const name of Object.keys(manifest.dependencies)) {
  // The SDK's package root is not an executable entry. Exercise the server
  // subpaths used by our MCP routes instead of reporting a false missing module.
  const entries = name === '@modelcontextprotocol/sdk'
    ? [`${name}/server/mcp.js`, `${name}/server/streamableHttp.js`, `${name}/server/auth/router.js`]
    : [name];
  const code = `
    let dependency;
    for (const entry of ${JSON.stringify(entries)}) dependency = await import(entry);
    if (${JSON.stringify(name)} === 'sharp') {
      const buffer = await dependency.default({ create: { width: 1, height: 1, channels: 3, background: '#fff' } }).png().toBuffer();
      if (buffer.length < 8) throw new Error('Sharp native image encoding failed');
    }
    process.exit(0);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', code], {
    cwd: directory, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) failures.push(`${name}: ${result.error?.message || result.stderr || `exit ${result.status}`}`);
}
assert.equal(failures.length, 0, `Production dependency loading failed:\n${failures.join('\n')}`);
console.log(`API isolated runtime smoke PASS: ${Object.keys(manifest.dependencies).length} packages loaded; Sharp native PNG encoding passed; no application/DB started.`);
