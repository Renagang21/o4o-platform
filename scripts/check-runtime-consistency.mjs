#!/usr/bin/env node
/** Keep the Node 22 baseline and frozen Docker/CI installs aligned with volta. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFileSync(path.join(root, name), 'utf8');
const { volta } = JSON.parse(read('package.json'));
assert.match(volta.node, /^22\.\d+\.\d+$/, 'The supported runtime must remain Node 22');
assert.equal(process.versions.node, volta.node, `Run this check with Node ${volta.node}`);
assert.equal(read('.nvmrc').trim(), volta.node, '.nvmrc must match volta.node');
assert.match(read('.npmrc'), /^verify-store-integrity=true$/m, 'Keep store integrity verification enabled');
const setup = read('.github/actions/setup-build-env/action.yml');
const pnpmDefault = /pnpm-version:\s*\n[\s\S]*?default:\s*['"]([^'"]+)/.exec(setup);
assert.equal(pnpmDefault?.[1], volta.pnpm, 'The CI pnpm default must match volta.pnpm');

let workflowPins = 0;
function checkWorkflows(dir) {
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const name = `${dir}/${entry.name}`;
    if (entry.isDirectory()) checkWorkflows(name);
    else if (/\.ya?ml$/.test(entry.name)) {
      const text = read(name);
      // Retired workflows are historical records and cannot execute their jobs.
      if (/^name:.*RETIRED/m.test(text)) continue;
      for (const match of text.matchAll(/^\s*(?:node-version|NODE_VERSION):\s*['"]?(\d+\.\d+\.\d+)/gm)) {
        assert.equal(match[1], volta.node, `${name}: Node pin differs from volta.node`);
        workflowPins++;
      }
      const input = /node-version:\s*\n[\s\S]*?default:\s*['"](\d+\.\d+\.\d+)/.exec(text);
      if (input && name.startsWith('.github/actions/setup-')) {
        assert.equal(input[1], volta.node, `${name}: default Node differs from volta.node`);
        workflowPins++;
      }
    }
  }
}
checkWorkflows('.github');
assert.ok(workflowPins > 0, 'No workflow runtime pins were checked');

let dockerStages = 0;
for (const dir of ['apps', 'services']) {
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const name = `${dir}/${entry.name}/Dockerfile`;
    if (!existsSync(path.join(root, name))) continue;
    const text = read(name).replace(/\\\r?\n\s*/g, ' ');
    for (const match of text.matchAll(/^FROM node:([^\s]+)/gm)) {
      assert.ok(match[1].startsWith(`${volta.node}-`), `${name}: Node image differs from volta.node`);
      dockerStages++;
    }
    for (const line of text.split('\n').filter(line => line.startsWith('RUN '))) {
      if (/\bpnpm install\b/.test(line)) {
        assert.ok(line.includes('--frozen-lockfile'), `${name}: pnpm installation must be frozen`);
        assert.ok(/COPY[^\n]*pnpm-lock\.yaml/.test(text), `${name}: copy pnpm-lock.yaml before installing`);
      }
      if (/\bnpm install\b/.test(line) && /(?: -g\b| --global\b)/.test(line)) {
        for (const token of line.split(/\s+/)) {
          if (/^pnpm(?:@|$)/.test(token)) assert.equal(token, `pnpm@${volta.pnpm}`, `${name}: pin pnpm to volta.pnpm`);
          if (/^serve(?:@|$)/.test(token)) assert.match(token, /^serve@\d+\.\d+\.\d+$/, `${name}: pin serve`);
        }
      }
    }
  }
}
assert.ok(dockerStages > 0, 'No Docker Node stages were checked');
assert.ok(!setup.includes('--no-frozen-lockfile'), 'CI must not resolve an unlocked dependency tree');
console.log(`Runtime consistency PASS: Node ${volta.node}, pnpm ${volta.pnpm}; ${workflowPins} workflow pins, ${dockerStages} Docker stages`);
