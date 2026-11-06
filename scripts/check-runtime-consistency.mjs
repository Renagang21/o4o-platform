#!/usr/bin/env node
/** Keep the Node 22 baseline and frozen Docker/CI installs aligned with volta. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFileSync(path.join(root, name), 'utf8').replaceAll('\r\n', '\n');

function yamlValue(line, key) {
  const text = line.trim();
  if (!text.startsWith(`${key}:`)) return undefined;
  const value = text.slice(key.length + 1).trim();
  if (!value) return undefined;
  if (value.startsWith("'") || value.startsWith('"')) {
    const end = value.indexOf(value[0], 1);
    return end > 0 ? value.slice(1, end) : undefined;
  }
  return value.split(/[ \t#]/, 1)[0];
}

function inputDefault(text, key) {
  const lines = text.split('\n');
  const start = lines.indexOf(`  ${key}:`);
  if (start < 0) return undefined;
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && !line.startsWith('    ')) return undefined;
    const value = yamlValue(line, 'default');
    if (value !== undefined) return value;
  }
  return undefined;
}

function* workflowFiles(dir) {
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const name = `${dir}/${entry.name}`;
    if (entry.isDirectory()) yield* workflowFiles(name);
    else if (/\.ya?ml$/.test(entry.name)) yield name;
  }
}

function* nodePins(text) {
  let job;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;
    if (indent === 2 && trimmed.endsWith(':')) job = trimmed.slice(0, -1);
    const version = yamlValue(line, 'node-version') ?? yamlValue(line, 'NODE_VERSION');
    if (version === undefined || version.startsWith('${{')) continue;
    assert.match(version, /^\d+\.\d+\.\d+$/, 'Pin an exact Node version');
    yield { version, job };
  }
}
const { volta, packageManager } = JSON.parse(read('package.json'));
assert.match(volta.node, /^22\.\d+\.\d+$/, 'The supported runtime must remain Node 22');
assert.equal(process.versions.node, volta.node, `Run this check with Node ${volta.node}`);
assert.equal(read('.nvmrc').trim(), volta.node, '.nvmrc must match volta.node');
// pnpm/action-setup v4+ fails when its `version` input differs from packageManager, so keep them identical (no hash suffix).
assert.equal(packageManager, `pnpm@${volta.pnpm}`, 'packageManager must equal pnpm@volta.pnpm');
assert.match(read('.npmrc'), /^verify-store-integrity=true$/m, 'Keep store integrity verification enabled');
const setup = read('.github/actions/setup-build-env/action.yml');
assert.equal(inputDefault(setup, 'pnpm-version'), volta.pnpm, 'The CI pnpm default must match volta.pnpm');
const packagedNode = /export const NODE_VERSION = ['"]([^'"]+)/.exec(read('tools/o4o-local-agent/release/build-release.mjs'))?.[1];
assert.match(packagedNode, /^22\.\d+\.\d+$/, 'The separately packaged PC runtime must remain Node 22');
const installerNode = /manifest\.nodeVersion !== ['"]([^'"]+)/.exec(read('tools/o4o-local-agent/release/install-core.mjs'))?.[1];
assert.equal(installerNode, packagedNode, 'The PC installer manifest check must match its packaged runtime');

let workflowPins = 0;
let packagedPins = 0;
for (const name of workflowFiles('.github')) {
  const text = read(name);
  // Retired workflows are historical records and cannot execute their jobs.
  if (/^name:.*RETIRED/m.test(text)) continue;
  for (const { version, job } of nodePins(text)) {
    const pcInstaller = name === '.github/workflows/ci-pipeline.yml' && job === 'pc-installer-windows';
    const expected = pcInstaller ? packagedNode : volta.node;
    assert.equal(version, expected, `${name}: Node pin differs from ${pcInstaller ? 'the packaged PC runtime' : 'volta.node'}`);
    if (pcInstaller) packagedPins++;
    workflowPins++;
  }
  const nodeDefault = inputDefault(text, 'node-version');
  if (nodeDefault !== undefined && name.startsWith('.github/actions/setup-')) {
    assert.equal(nodeDefault, volta.node, `${name}: default Node differs from volta.node`);
    workflowPins++;
  }
}
assert.ok(workflowPins > 0, 'No workflow runtime pins were checked');
assert.equal(packagedPins, 1, 'Check the Windows installer against its packaged runtime');

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
console.log(`Runtime consistency PASS: Node ${volta.node}, pnpm ${volta.pnpm}; ${workflowPins} workflow pins (${packagedPins} PC runtime ${packagedNode}), ${dockerStages} Docker stages`);
