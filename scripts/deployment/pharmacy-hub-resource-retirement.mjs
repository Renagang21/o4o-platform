/** Fixed PH infrastructure targets only. No database writes, DNS or certificate deletion. */
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { collectCloudInventory, collectHttpInventory } from './pharmacy-hub-retirement-inventory.mjs';
import { parseProbes, verifyTargets, verifyPublicData } from './pharmacy-hub-qr-cutover.mjs';

class ResourceDiagnosticError extends Error {}

const project = 'netureyoutube';
const region = 'asia-northeast3';
const backend = 'backend-pharmacy-hub-web';
const neg = 'neg-pharmacy-hub-web';
const service = 'pharmacy-hub-web';
const negLink = `https://www.googleapis.com/compute/v1/projects/${project}/regions/${region}/networkEndpointGroups/${neg}`;
export const deletionPermissions = ['compute.backendServices.delete', 'compute.networkEndpointGroups.delete',
  'compute.globalOperations.get', 'compute.regionOperations.get', 'run.services.delete'];
const knownPermissions = new Set([...deletionPermissions, 'run.services.list', 'iam.serviceAccounts.getAccessToken']);
const permissionsByTarget = new Map([
  [backend, ['compute.backendServices.delete', 'compute.globalOperations.get']],
  [neg, ['compute.networkEndpointGroups.delete', 'compute.regionOperations.get']],
  [service, ['run.services.delete']],
]);

function run(args, timeout = 15000) {
  const result = spawnSync('gcloud', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout });
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
  const cloud = collectCloudInventory((command, args, options) => spawnSync(command, args, { ...options, timeout: 15000 }));
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

export async function retireResources({ mode, read, permissions, verify, remove, beforeWrite = () => {} }) {
  if (!['plan', 'apply'].includes(mode)) throw new ResourceDiagnosticError('Unknown PH resource mode.');
  const allowed = await permissions();
  let targets = await read();
  const expectedTargets = new Set(targets);
  const requiredPermissions = deletionPermissions.filter(permission =>
    targets.some(target => permissionsByTarget.get(target)?.includes(permission)));
  const missingPermissions = requiredPermissions.filter(permission => !allowed.includes(permission));
  await verify(); // Actual QR/tablet data and Neture targets, without recording QR scans.
  const plan = { mode, applied: false, targets, requiredPermissions, missingPermissions, httpVerified: true };
  if (mode === 'plan') return plan;
  if (missingPermissions.length) throw new ResourceDiagnosticError(`PH resource deletion blocked; permissions=${missingPermissions.join(',')}.`);
  for (const target of [backend, neg, service]) {
    // Fresh complete references + HTTP checks immediately before each irreversible delete.
    targets = await read();
    assertExpectedResources(targets, expectedTargets);
    await verify();
    if (!targets.includes(target)) continue; // Resume safely after a partial deletion.
    beforeWrite();
    await remove(target);
    const after = await read();
    if (after.includes(target)) throw new ResourceDiagnosticError(`PH resource deletion not confirmed: ${target}.`);
    expectedTargets.delete(target);
    assertExpectedResources(after, expectedTargets);
  }
  await verify();
  if ((await read()).length) throw new ResourceDiagnosticError('PH resource deletion is incomplete.');
  return { mode, applied: true, targets: [], httpVerified: true, databaseWrites: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const paths = parseProbes(process.env.QR_PROBE_PATHS || await readFile(process.env.PROBE_OUTPUT, 'utf8'));
    const result = await retireResources({
      mode: process.env.CUTOVER_MODE ?? 'plan', permissions: readPermissions,
      read: async () => inspectResources(readCloud(), await collectHttpInventory()),
      verify: async () => { await verifyTargets(paths); await verifyPublicData(paths); },
      beforeWrite: () => {
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
    console.log(JSON.stringify(result));
  } catch (error) {
    // Helpers only emit fixed diagnostics and allowlisted permission/resource names.
    console.error(error instanceof ResourceDiagnosticError ? error.message : 'PH resource retirement failed; check read-only inventory and public QR/tablet readiness.');
    process.exitCode = 1;
  }
}
