/** Exact-input cache for compiled API workspace dependencies, never test results. */
import { createHash } from 'node:crypto';
import { appendFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorkspaceGraph, dependencyClosure } from './detect-affected.mjs';

const RECEIPT = 'node_modules/.cache/o4o-api-build/receipt.json';
const VERSION = 'api-deps-v1';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const safeRelative = p => typeof p === 'string' && p !== '' && !path.isAbsolute(p) && !/[\\\x00-\x1f\x7f]/.test(p) && !p.split('/').some(s => s === '..' || s === '.' || s === '');

// API implementation/tests are consumers of these packages. Everything else tracked is
// included conservatively, including every workspace manifest, compiler config and workflow.
export function isBuildInput(p) {
  return !p.startsWith('docs/') && !p.startsWith('apps/api-server/src/');
}

export function makePlan(root, tracked, runtime) {
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(runtime.pnpm || '')) throw new Error('Unknown package manager version');
  const graph = buildWorkspaceGraph(root);
  const closure = [...dependencyClosure(graph, '@o4o/api-server')].filter(n => n !== '@o4o/api-server');
  if (closure.length === 0) throw new Error('No API workspace dependency closure');
  const dirs = closure.map(n => graph.byName.get(n)?.dir).sort();
  for (const dir of dirs) {
    if (!safeRelative(dir) || !dir.startsWith('packages/')) throw new Error('Non-package dependency requires a fresh build');
    const manifest = JSON.parse(readFileSync(path.join(root, dir, 'package.json'), 'utf8'));
    // Custom build scripts may read arbitrary application files. Do not cache them.
    const commands = (manifest.scripts?.build || '').split(/\s*&&\s*/);
    if (!commands.every(c => /^(?:npx )?(?:tsc|tsup)(?: [A-Za-z0-9_./@=,:-]+)*$/.test(c))) {
      throw new Error('Custom dependency build requires a fresh build');
    }
  }
  const outputs = dirs.map(d => `${d}/dist`);
  const inputs = [...new Set(tracked)].filter(isBuildInput).sort();
  if (!inputs.includes('pnpm-lock.yaml') || !inputs.includes('package.json')) throw new Error('Missing build manifest inputs');
  const digest = createHash('sha256').update(JSON.stringify({ version: VERSION, runtime, dirs }));
  for (const p of inputs) {
    if (!safeRelative(p)) throw new Error('Invalid tracked input path');
    if (outputs.some(d => p === d || p.startsWith(`${d}/`)) || p.endsWith('.tsbuildinfo')) throw new Error('Tracked build output cannot be cached');
    const stat = lstatSync(path.join(root, p));
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Non-regular build input requires a fresh build');
    const data = readFileSync(path.join(root, p));
    // Enforce the package -> application boundary for this optimization as well.
    if (p.startsWith('packages/') && /\.(?:[cm]?[jt]sx?|json)$/.test(p)) {
      const text = data.toString('utf8');
      const imports = [...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
      if (imports.some(s => s.startsWith('@o4o/api-server') || path.posix.normalize(path.posix.join(path.posix.dirname(p), s)).startsWith('apps/api-server/')) ||
          (p.endsWith('.json') && /["'][^"']*apps\/api-server/.test(text))) throw new Error('Dependency references API application inputs');
    }
    if (/^tsconfig[^/]*\.json$/.test(p)) {
      const paths = /"paths"\s*:\s*\{([\s\S]*?)\}/.exec(data.toString('utf8'))?.[1] || '';
      if (paths.includes('apps/api-server')) throw new Error('Compiler alias references API application inputs');
    }
    digest.update(`${p}\0${stat.mode & 0o111}\0${data.length}\0`).update(data);
  }
  return { enabled: true, root, key: `${VERSION}-${digest.digest('hex')}`, dirs, outputs, receipt: RECEIPT };
}

function validatePlan(plan, root) {
  if (!plan.enabled || plan.root !== root || !/^api-deps-v1-[0-9a-f]{64}$/.test(plan.key)) throw new Error('Invalid cache plan');
  for (const d of plan.dirs) if (!safeRelative(d) || !d.startsWith('packages/')) throw new Error('Invalid output workspace');
  if (JSON.stringify(plan.outputs) !== JSON.stringify(plan.dirs.map(d => `${d}/dist`)) || plan.receipt !== RECEIPT) throw new Error('Invalid output scope');
}

export function snapshot(root, outputs) {
  const files = [];
  const walk = rel => {
    const absolute = path.join(root, rel);
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error('Symlink in cached build output');
    if (stat.isDirectory()) for (const name of readdirSync(absolute).sort()) walk(`${rel}/${name}`);
    else if (stat.isFile()) files.push({ path: rel, sha256: sha(readFileSync(absolute)) });
    else throw new Error('Unsupported cached build output');
  };
  for (const d of outputs) {
    try { lstatSync(path.join(root, d)); } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    walk(d);
  }
  return files;
}

export function recordBuild(root, plan) {
  validatePlan(plan, root);
  const files = snapshot(root, plan.outputs);
  if (files.length === 0) throw new Error('No compiled outputs to cache');
  const target = path.join(root, RECEIPT);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify({ key: plan.key, outputs: plan.outputs, files }));
}

export function verifyBuild(root, plan) {
  try {
    validatePlan(plan, root);
    const receipt = JSON.parse(readFileSync(path.join(root, RECEIPT), 'utf8'));
    return receipt.key === plan.key && receipt.files.length > 0 &&
      JSON.stringify(receipt.outputs) === JSON.stringify(plan.outputs) &&
      JSON.stringify(receipt.files) === JSON.stringify(snapshot(root, plan.outputs));
  } catch { return false; }
}

export function clearBuild(root, plan) {
  validatePlan(plan, root);
  for (const d of plan.dirs) {
    rmSync(path.join(root, d, 'dist'), { recursive: true, force: true });
    for (const name of readdirSync(path.join(root, d))) if (name.endsWith('.tsbuildinfo')) rmSync(path.join(root, d, name), { force: true });
  }
  rmSync(path.join(root, RECEIPT), { force: true });
}

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<O4O_BUILD_CACHE\n${value}\nO4O_BUILD_CACHE\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const operation = process.argv[2];
  if (operation === 'plan') {
    let plan;
    try {
      plan = makePlan(root, readFileSync(0, 'utf8').split('\0').filter(Boolean), {
        node: process.version, abi: process.versions.modules, platform: process.platform, arch: process.arch,
        pnpm: process.env.PNPM_VERSION, image: process.env.ImageOS,
        ci: process.env.CI, github: process.env.GITHUB_ACTIONS, nodeEnv: process.env.NODE_ENV || '', cwd: root,
      });
    } catch { plan = { enabled: false }; }
    output('enabled', String(plan.enabled));
    output('key', plan.key || '');
    output('paths', plan.enabled ? [...plan.outputs, plan.receipt].join('\n') : '');
    console.log(JSON.stringify(plan));
  } else {
    const plan = JSON.parse(readFileSync(process.argv[3], 'utf8'));
    if (operation === 'verify') output('valid', String(verifyBuild(root, plan)));
    else if (operation === 'record') recordBuild(root, plan);
    else if (operation === 'clean' && process.env.GITHUB_ACTIONS === 'true') clearBuild(root, plan);
    else throw new Error('Unsupported cache operation');
  }
}
