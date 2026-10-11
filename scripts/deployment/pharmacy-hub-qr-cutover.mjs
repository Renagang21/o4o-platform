import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { randomUUID } from 'node:crypto';
import { prepareQrRedirect, prepareHostRetirement, printedQrPaths } from './pharmacy-hub-qr-redirect.mjs';

const project = 'netureyoutube';
const mapName = 'o4o-global-lb';
const oldHosts = ['pharmacyhub.co.kr', 'www.pharmacyhub.co.kr'];
const newHost = 'pharmacy.neture.co.kr';
const endpoint = `https://compute.googleapis.com/compute/v1/projects/${project}/global/urlMaps/${mapName}`;
const clean = map => {
  const copy = structuredClone(map);
  for (const key of ['id', 'creationTimestamp', 'selfLink', 'fingerprint', 'kind']) delete copy[key];
  return copy;
};

export function validateHosts(map) {
  for (const host of oldHosts) {
    const rules = (map.hostRules ?? []).filter(rule => rule.hosts?.includes(host));
    if (rules.length !== 1 || rules[0].pathMatcher !== 'path-matcher-pharmacy-hub') {
      throw new Error(`Unexpected host routing: ${host}`);
    }
  }
  if (map.hostRules.some(rule => rule.pathMatcher === 'path-matcher-pharmacy-hub' && rule.hosts.some(host => !oldHosts.includes(host)))) {
    throw new Error('PharmacyHub matcher serves an unrelated host.');
  }
}

export function parseProbes(raw) {
  const paths = raw.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
  if (paths.length < 2 || paths.length > printedQrPaths.length) throw new Error('Supply real QR and tablet paths, with optional multilingual and affiliate paths.');
  for (const prefix of printedQrPaths.map(p => p.slice(0, -1))) {
    const count = paths.filter(p => p.startsWith(prefix)).length;
    if (count > 1 || (['/qr/', '/tablet/'].includes(prefix) && count !== 1)) throw new Error('QR and tablet are required; each family may appear at most once.');
  }
  for (const p of paths) {
    if (!printedQrPaths.some(pattern => p.startsWith(pattern.slice(0, -1)))) throw new Error('Unknown QR route family.');
    const url = new URL(p, `https://${newHost}`);
    if (url.host !== newHost || !p.startsWith('/') || p.includes('\\') || url.hash || url.username || url.password || /[\s<>]/.test(p) || /(?:^|\/)\.{1,2}(?:\/|\?|$)|%2e|%2f|%5c/i.test(p)) {
      throw new Error('Probe must be a relative public path without credentials or fragments.');
    }
    if (!url.pathname.split('/').at(-1)) throw new Error('Probe requires a real slug or public key.');
  }
  return paths;
}

export function missingFamilyRuleProbes(paths) {
  return ['/multilingual-products/', '/foreign-visitor/affiliate/']
    .filter(prefix => !paths.some(path => path.startsWith(prefix)))
    .map(prefix => `${prefix}__ph_retirement_rule_check__?ruleCheck=1`);
}

export async function verifyTargets(paths, request = fetch, signal) {
  await Promise.all(paths.map(async path => {
    const target = new URL(path, `https://${newHost}`).href;
    const destination = await request(target, { redirect: 'manual', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
    await destination.body?.cancel();
    if (destination.status !== 200) throw new Error('Neture target did not return HTTP 200.');
  }));
}

export async function verifyPublicData(paths, request = fetch, signal) {
  const qrPaths = paths.filter(path => new URL(path, `https://${newHost}`).pathname.startsWith('/qr/'));
  const qrBase = 'https://api.neture.co.kr/api/v1/kpa/qr/public';
  const head = async url => {
    const response = await request(url, { method: 'HEAD', redirect: 'manual', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
    await response.body?.cancel();
    return response;
  };
  if (qrPaths.length) {
    // Old servers implement HEAD via GET and record scans. Check the slug-less
    // namespace first: it cannot match the scan-writing /:slug handler.
    const capability = await head(qrBase);
    if (capability.headers.get('x-qr-read-only-head') !== '1') throw new Error('Read-only QR HEAD support is not deployed.');
    await Promise.all(qrPaths.map(async path => {
      const slug = new URL(path, `https://${newHost}`).pathname.slice(4);
      const response = await head(`${qrBase}/${encodeURIComponent(decodeURIComponent(slug))}`);
      if (response.headers.get('x-qr-read-only-head') !== '1' || response.status !== 200 || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '')) {
        throw new Error('Read-only QR API did not resolve successful landing data.');
      }
    }));
  }
  const targets = paths.flatMap(path => {
    const source = new URL(path, `https://${newHost}`);
    if (!source.pathname.startsWith('/tablet/')) return [];
    const target = new URL(`https://api.neture.co.kr/api/v1/stores/${encodeURIComponent(decodeURIComponent(source.pathname.slice(8)))}/tablet/products`);
    if (source.searchParams.has('tabletId')) target.searchParams.set('tabletId', source.searchParams.get('tabletId'));
    return [target.href];
  });
  await Promise.all(targets.map(async target => {
    const response = await request(target, { redirect: 'manual', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new Error('Public tablet API did not return HTTP 200.');
    }
    let payload;
    try { payload = await response.json(); } catch { throw new Error('Public tablet API did not return JSON.'); }
    if (payload?.success !== true || payload.data == null || typeof payload.data !== 'object') throw new Error('Public tablet API did not return successful data.');
    // Never log public content, store identities or API error payloads.
  }));
}

export async function verifyRedirects(paths, request = fetch, signal, rulePaths = []) {
  const checks = [...paths, ...rulePaths].map(check => typeof check === 'string' ? { path: check, target: check } : check);
  await verifyTargets([...paths, ...checks.filter(check => check.verifyTarget).map(check => check.target)], request, signal);
  await Promise.all(checks.map(async ({ path, target: targetPath }) => {
    const target = new URL(targetPath, `https://${newHost}`).href;
    await Promise.all(oldHosts.map(async host => {
      const response = await request(new URL(path, `https://${host}`).href, { redirect: 'manual', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
      const location = response.headers.get('location');
      await response.body?.cancel();
      let observed=null;
      try { if(location) observed=new URL(location,`https://${host}`); } catch { /* no raw Location in errors */ }
      if (response.status !== 302 || observed?.href !== target) {
        const expected=new URL(target);
        const family=printedQrPaths.find(pattern=>path.startsWith(pattern.slice(0,-1)))??(path.startsWith('/terms')?'terms':'other');
        throw new Error(`Old host did not preserve path and query in a 302 redirect: host=${host}; family=${family}; status=${response.status}; locationPresent=${!!location}; hostMatch=${observed?.host===expected.host}; pathMatch=${observed?.pathname===expected.pathname}; queryMatch=${observed?.search===expected.search}; schemeMatch=${observed?.protocol===expected.protocol}.`);
      }
    }));
  }));
}

export async function settleOperation(name, readOperation, { now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), timeoutMs = 300000 } = {}) {
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    let operation;
    try { operation = await readOperation(name); } catch { /* transient errors do not prove completion */ }
    if (operation?.status === 'DONE') {
      if (operation.error) throw new Error('Compute update reached terminal failure.');
      return;
    }
    await sleep(2000);
  }
  const error = new Error('Compute update is not confirmed terminal; inspect the saved operation before any recovery.');
  error.pendingOperation = true;
  throw error;
}

export async function loadProbes(mode, raw, file, read = readFile) {
  if (mode === 'plan') return '';
  return raw || (file ? await read(file, 'utf8') : '');
}

export async function runCutover({ mode, probes, read, validate, replace, verify, save, preflight, beforeWrite, retireHost = false }) {
  const before = await read();
  validateHosts(before);
  if (!before.fingerprint) throw new Error('Live fingerprint is required.');
  const draft = retireHost ? prepareHostRetirement(before) : prepareQrRedirect(before);
  await save('before.json', before);
  await save('draft.json', draft);
  await validate(draft);
  if (mode === 'plan') return { mode, applied: false };
  if (mode !== 'apply') throw new Error('Unknown cutover mode.');
  const paths = parseProbes(probes);
  const rulePaths = [...missingFamilyRuleProbes(paths), ...(retireHost ? ['/', '/__ph_retirement_host_check__?ruleCheck=1',
    { path: '/terms?ruleCheck=1', target: '/policy?ruleCheck=1', verifyTarget: true },
    { path: '/terms/?ruleCheck=1', target: '/policy?ruleCheck=1', verifyTarget: true },
  ] : [])];
  await preflight?.([...paths, ...rulePaths.filter(rule => typeof rule === 'object' && rule.verifyTarget).map(rule => rule.target)]);
  const current = await read();
  if (current.fingerprint !== before.fingerprint) throw new Error('URL map changed after inventory.');
  await beforeWrite?.();
  let changed = false;
  try {
    // replace must submit this fingerprint to the Compute API (optimistic lock).
    changed = true; // includes uncertain network outcomes after submission
    await replace(draft, before.fingerprint);
    await verify(paths, rulePaths);
    const after = await read();
    if (!isDeepStrictEqual(clean(after), draft)) throw new Error('URL map changed during verification.');
    await save('after.json', after);
    return { mode, applied: true, httpVerified: true, activeFamiliesVerified: paths.length, ruleOnlyFamiliesVerified: rulePaths.length };
  } catch (error) {
    if (error.pendingOperation) throw error; // never infer no write from an unchanged map while update may be pending
    if (changed) {
      const live = await read();
      if (isDeepStrictEqual(clean(live), draft)) {
        await replace(clean(before), live.fingerprint);
        const restored = await read();
        if (!isDeepStrictEqual(clean(restored), clean(before))) throw new Error('Rollback could not be verified.');
        await save('rollback.json', restored);
      } else if (!isDeepStrictEqual(clean(live), clean(before))) {
        throw new Error('URL map changed externally; rollback blocked to preserve other changes.');
      }
    }
    throw error;
  }
}

export function safeComputeError(method, status, payload) {
  const known = new Set(['compute.urlMaps.get', 'compute.urlMaps.validate', 'compute.urlMaps.use', 'compute.urlMaps.update', 'compute.backendServices.use', 'compute.backendBuckets.use', 'serviceusage.services.use']);
  const candidates = JSON.stringify(payload ?? {}).match(/(?:compute|serviceusage)\.[A-Za-z]+\.[A-Za-z]+/g) ?? [];
  const permissions = [...new Set(candidates.filter(value => known.has(value)))];
  const reasons = (payload?.error?.errors ?? []).map(item => item.reason).filter(value => ['forbidden', 'insufficientPermissions', 'accessNotConfigured', 'invalid', 'rateLimitExceeded'].includes(value));
  return new Error(`Compute API ${method} failed (HTTP ${status}); permissions=${permissions.join(',') || 'unknown'}; reasons=${reasons.join(',') || 'unknown'}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.CUTOVER_MODE ?? 'plan';
  const output = process.env.CUTOVER_OUTPUT ?? '/tmp/pharmacyhub-qr-cutover';
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
  const api = async (url, method = 'GET', body) => {
    const response = await fetch(url, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw safeComputeError(method, response.status, payload);
    }
    return response.json();
  };
  await mkdir(output, { recursive: true, mode: 0o700 });
  const result = await runCutover({
    retireHost: process.env.RETIRE_PH_HOST === 'true',
    mode, probes: await loadProbes(mode, process.env.QR_PROBE_PATHS, process.env.PROBE_OUTPUT),
    preflight: async paths => { await verifyTargets(paths); await verifyPublicData(paths); },
    beforeWrite: () => {
      const deadline = Number(process.env.CUTOVER_DEADLINE_MS);
      // Bounded Compute retries/polls plus verification and rollback need at most 25 minutes.
      if (!Number.isFinite(deadline) || Date.now() + 25 * 60000 > deadline) {
        throw new Error('Insufficient workflow time remains for update, verification and rollback; no write submitted.');
      }
    },
    read: () => api(endpoint),
    save: (name, data) => writeFile(`${output}/${name}`, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 }),
    validate: async draft => {
      const result = await api(`${endpoint}/validate`, 'POST', { resource: draft });
      if (!result.result?.loadSucceeded || !result.result?.testPassed) throw new Error('Compute URL map validation failed.');
    },
    replace: async (draft, fingerprint) => {
      const requestId = randomUUID();
      await writeFile(`${output}/request-${requestId}.json`, JSON.stringify({ requestId, map: mapName }), { mode: 0o600 });
      let operation;
      try {
        // The same request ID retries the original operation instead of another write.
        for (let attempt = 0; attempt < 3; attempt++) {
          try { operation = await api(`${endpoint}?requestId=${requestId}`, 'PUT', { ...draft, fingerprint }); break; }
          catch (error) { if (attempt === 2) throw error; }
        }
      } catch (error) {
        // A lost HTTP response can hide an accepted operation. Keep its request ID and never claim no change.
        error.pendingOperation = true;
        throw error;
      }
      await writeFile(`${output}/operation-${requestId}.json`, JSON.stringify({ requestId, operation: operation.name }), { mode: 0o600 });
      await settleOperation(operation.name, name => api(`https://compute.googleapis.com/compute/v1/projects/${project}/global/operations/${name}`));
    },
    verify: async (paths, rulePaths) => {
      // Allow load balancer propagation; each probe attempt is bounded.
      const signal = AbortSignal.timeout(120000);
      for (let attempt = 0; attempt < 6; attempt++) {
        try { await verifyRedirects(paths, fetch, signal, rulePaths); await verifyPublicData(paths, fetch, signal); return; } catch (error) {
          if (attempt === 5 || signal.aborted) throw error;
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    },
  });
  console.log(JSON.stringify(result));
}
