/** Prepare a PH host removal from an exported URL map. No network or GCP mutation. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function isPharmacyHubHost(host) {
  const name = String(host).toLowerCase();
  return name === 'pharmacyhub.co.kr' || name.endsWith('.pharmacyhub.co.kr');
}

function backendReferences(value, out = new Set()) {
  if (!value || typeof value !== 'object') return out;
  for (const [key, item] of Object.entries(value)) {
    if ((key === 'defaultService' || key === 'service' || key === 'backendService') && typeof item === 'string') out.add(item);
    else if (item && typeof item === 'object') backendReferences(item, out);
  }
  return out;
}

export function preparePharmacyHubRetirement(input) {
  if (!Array.isArray(input.hostRules) || !Array.isArray(input.pathMatchers)) throw new Error('Exported URL map hostRules/pathMatchers are required.');
  if (input.tests !== undefined && !Array.isArray(input.tests)) throw new Error('URL map tests must be an array.');
  const map = structuredClone(input);
  const removedHosts = [];
  const removedTestHosts = [];
  if (map.tests) {
    map.tests = map.tests.filter(test => {
      if (!isPharmacyHubHost(test.host)) return true;
      removedTestHosts.push(test.host);
      return false;
    });
  }
  const affectedMatchers = new Set();
  map.hostRules = map.hostRules.flatMap(rule => {
    if (!Array.isArray(rule.hosts) || !rule.pathMatcher) throw new Error('Invalid host rule.');
    const hosts = rule.hosts.filter(host => {
      if (!isPharmacyHubHost(host)) return true;
      removedHosts.push(host);
      affectedMatchers.add(rule.pathMatcher);
      return false;
    });
    return hosts.length ? [{ ...rule, hosts }] : [];
  });
  const retainedMatchers = new Set(map.hostRules.map(rule => rule.pathMatcher));
  for (const name of affectedMatchers) {
    if (map.pathMatchers.filter(matcher => matcher.name === name).length !== 1) throw new Error(`Expected one path matcher: ${name}`);
  }
  const removed = map.pathMatchers.filter(matcher => affectedMatchers.has(matcher.name) && !retainedMatchers.has(matcher.name));
  const removedNames = new Set(removed.map(matcher => matcher.name));
  map.pathMatchers = map.pathMatchers.filter(matcher => !removedNames.has(matcher.name));
  const candidates = backendReferences(removed);
  // URL-map tests contain expected services, not live routing references.
  const retained = backendReferences({ ...map, tests: undefined });
  for (const key of ['id', 'creationTimestamp', 'selfLink', 'fingerprint', 'kind']) delete map[key];
  return {
    map,
    removedHosts,
    removedTestHosts,
    removedPathMatchers: [...removedNames],
    unreferencedBackendCandidates: [...candidates].filter(service => !retained.has(service)),
    sharedBackendServices: [...candidates].filter(service => retained.has(service)),
    sharedPathMatchers: [...affectedMatchers].filter(name => retainedMatchers.has(name)),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath || inputPath === outputPath) throw new Error('Usage: node scripts/deployment/pharmacy-hub-retirement.mjs exported-map.json review-map.json');
  const raw = await readFile(inputPath, 'utf8');
  const { map, ...report } = preparePharmacyHubRetirement(JSON.parse(raw));
  await writeFile(outputPath, JSON.stringify(map, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ action: 'draft-only', inputSha256: createHash('sha256').update(raw).digest('hex'), ...report, output: outputPath }));
}
