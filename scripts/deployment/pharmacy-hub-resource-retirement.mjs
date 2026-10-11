/** Fixed PH infrastructure targets only. No database writes, DNS or certificate deletion. */
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { collectCloudInventory, collectHttpInventory } from './pharmacy-hub-retirement-inventory.mjs';
import { parseProbes, verifyTargets, verifyPublicData } from './pharmacy-hub-qr-cutover.mjs';

class ResourceDiagnosticError extends Error {}
class InventoryCountError extends ResourceDiagnosticError {}

const project = 'netureyoutube';
// ubuntu-latest's preinstalled Cloud SDK; never resolve an executable from checkout-writable PATH entries.
const gcloud = '/usr/bin/gcloud';
const region = 'asia-northeast3';
const backend = 'backend-pharmacy-hub-web';
const neg = 'neg-pharmacy-hub-web';
const service = 'pharmacy-hub-web';
const negLink = `https://www.googleapis.com/compute/v1/projects/${project}/regions/${region}/networkEndpointGroups/${neg}`;
export const deletionPermissions = ['compute.backendServices.delete', 'compute.regionNetworkEndpointGroups.delete',
  'compute.globalOperations.get', 'compute.regionOperations.get', 'run.services.delete'];
const knownPermissions = new Set([...deletionPermissions, 'run.services.list', 'iam.serviceAccounts.getAccessToken']);
const permissionsByTarget = new Map([
  [backend, ['compute.backendServices.delete', 'compute.globalOperations.get']],
  [neg, ['compute.regionNetworkEndpointGroups.delete', 'compute.regionOperations.get']],
  [service, ['run.services.delete']],
]);
const productionWorkflows = new Set(['promote.yml', 'delivery.yml', 'deploy-api.yml', 'deploy-admin.yml', 'deploy-web-services.yml', 'pharmacyhub-qr-cutover.yml']);
const activeStatuses = ['in_progress', 'queued', 'pending', 'waiting', 'requested'];

function checkProductionRuns(result, runId, page, status) {
  if (!Array.isArray(result.workflow_runs) || !Number.isInteger(result.total_count) || result.total_count < 0) {
    throw new ResourceDiagnosticError('Production run inventory is incomplete; no deletion submitted.');
  }
  for (const other of result.workflow_runs) {
    if (String(other.id) === String(runId) || other.status === 'completed') continue;
    if (typeof other.path !== 'string') throw new ResourceDiagnosticError('Production run path is unavailable; no deletion submitted.');
    const references = other.referenced_workflows ?? [];
    if (!Array.isArray(references) || references.some(item => typeof item.path !== 'string')) {
      throw new ResourceDiagnosticError('Referenced production workflow inventory is incomplete; no deletion submitted.');
    }
    const paths = [other.path, ...references.map(item => item.path)];
    const name = paths.map(path => path.split('@')[0].split('/').at(-1)).find(path => productionWorkflows.has(path));
    if (name) throw new ResourceDiagnosticError(`Production write gate blocked: workflow=${name}; run=${Number(other.id)}.`);
  }
  const expected = Math.min(100, Math.max(0, result.total_count - (page - 1) * 100));
  if (result.workflow_runs.length !== expected) {
    throw new InventoryCountError(`Production run inventory is incomplete: status=${status}; page=${page}; expected=${expected}; returned=${result.workflow_runs.length}. Next deletion not submitted.`);
  }
}

async function readProductionStatusOnce(runId, list, status) {
  let total;
  for (let page = 1; page <= 10; page++) {
    const result = await list(status, page);
    checkProductionRuns(result, runId, page, status);
    if (total !== undefined && result.total_count !== total) {
      throw new InventoryCountError(`Production run inventory is incomplete: status=${status}; page=${page}; previousTotal=${total}; currentTotal=${result.total_count}. Next deletion not submitted.`);
    }
    total = result.total_count;
    if (page * 100 >= total) return;
  }
  throw new ResourceDiagnosticError('Production run inventory exceeds its bound; no deletion submitted.');
}

async function readProductionSweep(runId, list) {
  const results = await Promise.allSettled(activeStatuses.map(status => readProductionStatusOnce(runId, list, status)));
  const failures = results.filter(result => result.status === 'rejected').map(result => result.reason);
  // A count disagreement must never hide another branch's known writer or invalid metadata.
  const fatal = failures.find(error => !(error instanceof InventoryCountError));
  if (fatal) throw fatal;
  if (failures.length) throw failures[0];
}

async function readProductionSweepWithRetry(runId, list, pause, attempt = 0) {
  try {
    await readProductionSweep(runId, list);
  } catch (error) {
    // Restart every status and page: queued runs may become in_progress during the pause.
    if (!(error instanceof InventoryCountError) || attempt === 2) throw error;
    await pause(2000);
    await readProductionSweepWithRetry(runId, list, pause, attempt + 1);
  }
}

export async function assertProductionIdle(runId, list, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  if (!/^\d+$/.test(String(runId))) throw new ResourceDiagnosticError('Production run identity is unavailable; no deletion submitted.');
  await readProductionSweepWithRetry(runId, list, pause);
}

async function checkProductionGate() {
  const token = process.env.PRODUCTION_GATE_TOKEN;
  if (!token) throw new ResourceDiagnosticError('Production run authorization is unavailable; no deletion submitted.');
  await assertProductionIdle(process.env.GITHUB_RUN_ID, async (status, page) => {
    const response = await fetch(`https://api.github.com/repos/Renagang21/o4o-platform/actions/runs?status=${status}&per_page=100&page=${page}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new ResourceDiagnosticError(`Production run check failed (HTTP ${response.status}); no deletion submitted.`);
    return response.json();
  });
}

function run(args, timeout = 15000) {
  const result = spawnSync(gcloud, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout });
  if (result.status !== 0 || /Some requests did not succeed|required.*permission|PERMISSION_DENIED|Forbidden/i.test(result.stderr ?? '')) {
    const permissions = [...new Set(((result.stderr ?? '').match(/(?:compute|run|iam)\.[A-Za-z]+\.[A-Za-z]+/g) ?? []).filter(value => knownPermissions.has(value)))];
    throw new ResourceDiagnosticError(`PH resource command not confirmed; permissions=${permissions.join(',') || 'unknown'}. Run read-only plan before retry.`);
  }
  return result.stdout;
}

async function readPermissions() {
  const token = run(['auth', 'print-access-token']).trim();
  const response = await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${project}:testIamPermissions`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions: deletionPermissions }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new ResourceDiagnosticError(`PH resource permission check failed (HTTP ${response.status}).`);
  const payload = await response.json();
  return deletionPermissions.filter(permission => payload.permissions?.includes(permission));
}

function readCloud() {
  const cloud = collectCloudInventory((_command, args, options) => spawnSync(gcloud, args, { ...options, timeout: 15000 }));
  const services = JSON.parse(run(['run', 'services', 'list', `--project=${project}`, `--region=${region}`,
    `--filter=metadata.name=${service}`, '--format=json(metadata.name)']));
  const runPresent = services.some(item => item.metadata?.name === service);
  const blockers = cloud.blockers.filter(item => !(item.check === 'runService' && item.code === 'UNAVAILABLE' && !runPresent));
  if (blockers.length) throw new ResourceDiagnosticError(`PH resource inventory incomplete: ${blockers.map(item => item.check).join(',')}.`);
  return { ...cloud.resources, runPresent };
}

export function inspectResources(cloud, http) {
  const matcher = cloud.applicationMap?.phMatchers?.[0];
  const redirect = matcher?.defaultUrlRedirect;
  if (cloud.applicationMap?.phMatchers?.length !== 1 || redirect?.hostRedirect !== 'pharmacy.neture.co.kr'
    || redirect.redirectResponseCode !== 'FOUND' || redirect.stripQuery !== false
    || !cloud.urlMaps?.length || cloud.urlMaps.some(map => map.phReferences)) {
    throw new ResourceDiagnosticError('PH backend is not completely detached from URL maps.');
  }
  if (http.checks?.length !== 12 || http.checks.some(check => check.status !== 302
    || !check.hostMatch || !check.pathMatch || !check.queryMatch || !check.schemeMatch)) {
    throw new ResourceDiagnosticError('PH host redirects are not verified.');
  }
  const ownedBackend = cloud.backends?.filter(item => item.name === backend) ?? [];
  if (ownedBackend.length > 1 || ownedBackend.some(item => item.region !== 'global'
    || item.groups.some(group => group !== negLink))) throw new ResourceDiagnosticError('Unexpected PH backend ownership.');
  if (cloud.backends?.some(item => item.name !== backend && item.groups.includes(negLink))) {
    throw new ResourceDiagnosticError('Another backend still uses the PH NEG.');
  }
  if (cloud.negs?.some(item => item.name !== neg || item.selfLink !== negLink || item.type !== 'SERVERLESS'
    || item.cloudRunService !== service)) throw new ResourceDiagnosticError('Unexpected PH NEG or Cloud Run reference.');
  return [ownedBackend.length ? backend : null, cloud.negs?.length ? neg : null, cloud.runPresent ? service : null].filter(Boolean);
}

function assertExpectedResources(targets, expected) {
  if (targets.some(item => !expected.has(item))) throw new ResourceDiagnosticError('PH resources appeared after inventory; rerun standalone plan.');
}

async function retireOne(target, { read, verify, remove, beforeWrite }, expectedTargets) {
  // Dependencies require serial deletes; each subsequent phase rechecks the actual state.
  const targets = await read();
  assertExpectedResources(targets, expectedTargets);
  await verify();
  if (!targets.includes(target)) return;
  await beforeWrite();
  await remove(target);
  const after = await read();
  if (after.includes(target)) throw new ResourceDiagnosticError(`PH resource deletion not confirmed: ${target}.`);
  expectedTargets.delete(target);
  assertExpectedResources(after, expectedTargets);
}

export async function retireResources({ mode, read, permissions, verify, remove, beforeWrite = async () => {} }) {
  if (!['plan', 'apply'].includes(mode)) throw new ResourceDiagnosticError('Unknown PH resource mode.');
  const allowed = await permissions();
  const targets = await read();
  const expectedTargets = new Set(targets);
  const requiredPermissions = deletionPermissions.filter(permission =>
    targets.some(target => permissionsByTarget.get(target)?.includes(permission)));
  const missingPermissions = requiredPermissions.filter(permission => !allowed.includes(permission));
  await verify(); // Actual QR/tablet data and Neture targets, without recording QR scans.
  const plan = { mode, applied: false, targets, requiredPermissions, missingPermissions, httpVerified: true };
  if (mode === 'plan') return plan;
  if (missingPermissions.length) throw new ResourceDiagnosticError(`PH resource deletion blocked; permissions=${missingPermissions.join(',')}.`);
  await [backend, neg, service].reduce((previous, target) => previous.then(() =>
    retireOne(target, { read, verify, remove, beforeWrite }, expectedTargets)), Promise.resolve());
  await verify();
  if ((await read()).length) throw new ResourceDiagnosticError('PH resource deletion is incomplete.');
  return { mode, applied: true, targets: [], httpVerified: true, databaseWrites: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    // Retirement may have no active PH data. Keep all route validation and the
    // independent twelve host redirect checks; verify any paths that still exist.
    const paths = parseProbes(process.env.QR_PROBE_PATHS || await readFile(process.env.PROBE_OUTPUT, 'utf8'), { requireActiveFamilies: false });
    const result = await retireResources({
      mode: process.env.CUTOVER_MODE ?? 'plan', permissions: readPermissions,
      read: async () => inspectResources(readCloud(), await collectHttpInventory()),
      verify: async () => { await verifyTargets(paths); await verifyPublicData(paths); },
      beforeWrite: async () => {
        await checkProductionGate();
        const deadline = Number(process.env.CUTOVER_DEADLINE_MS);
        if (!Number.isFinite(deadline) || Date.now() + 15 * 60000 > deadline) {
          throw new ResourceDiagnosticError('Insufficient PH deletion time budget; no next delete submitted.');
        }
      },
      remove: async target => {
        const commands = {
          [backend]: ['compute', 'backend-services', 'delete', backend, '--global'],
          [neg]: ['compute', 'network-endpoint-groups', 'delete', neg, `--region=${region}`],
          [service]: ['run', 'services', 'delete', service, `--region=${region}`],
        };
        const args = commands[target];
        if (!args) throw new ResourceDiagnosticError('Unknown PH deletion target.');
        run([...args, `--project=${project}`, '--quiet'], 90000);
      },
    });
    console.log(JSON.stringify({ ...result, activeFamiliesVerified: paths.length }));
  } catch (error) {
    // Helpers only emit fixed diagnostics and allowlisted permission/resource names.
    console.error(error instanceof ResourceDiagnosticError ? error.message : 'PH resource retirement failed; check read-only inventory and public QR/tablet readiness.');
    process.exitCode = 1;
  }
}
