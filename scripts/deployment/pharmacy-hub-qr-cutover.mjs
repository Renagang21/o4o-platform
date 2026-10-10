import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { randomUUID } from 'node:crypto';
import { prepareQrRedirect, printedQrPaths } from './pharmacy-hub-qr-redirect.mjs';

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
  if (paths.length !== printedQrPaths.length) throw new Error('Supply one real active path for each of the four QR route families.');
  for (const prefix of printedQrPaths.map(p => p.slice(0, -1))) {
    if (paths.filter(p => p.startsWith(prefix)).length !== 1) throw new Error('Each QR route family must appear exactly once.');
  }
  for (const p of paths) {
    const url = new URL(p, `https://${newHost}`);
    if (url.host !== newHost || !p.startsWith('/') || p.includes('\\') || url.hash || url.username || url.password || /[\s<>]/.test(p) || /(?:^|\/)\.{1,2}(?:\/|\?|$)|%2e|%2f|%5c/i.test(p)) {
      throw new Error('Probe must be a relative public path without credentials or fragments.');
    }
    if (!url.pathname.split('/').at(-1)) throw new Error('Probe requires a real slug or public key.');
  }
  return paths;
}

export async function verifyTargets(paths, request = fetch, signal) {
  await Promise.all(paths.map(async path => {
    const target = new URL(path, `https://${newHost}`).href;
    const destination = await request(target, { redirect: 'manual', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
    await destination.body?.cancel();
    if (destination.status !== 200) throw new Error('Neture target did not return HTTP 200.');
  }));
}

export async function verifyRedirects(paths, request = fetch, signal) {
  await verifyTargets(paths, request, signal);
  await Promise.all(paths.map(async path => {
    const target = new URL(path, `https://${newHost}`).href;
    await Promise.all(oldHosts.map(async host => {
      const response = await request(new URL(path, `https://${host}`).href, { redirect: 'manual', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (response.status !== 302 || !location || new URL(location, `https://${host}`).href !== target) {
        throw new Error('Old host did not preserve path and query in a 302 redirect.');
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

export async function runCutover({ mode, probes, read, validate, replace, verify, save, preflight, beforeWrite }) {
  const before = await read();
  validateHosts(before);
  if (!before.fingerprint) throw new Error('Live fingerprint is required.');
  const draft = prepareQrRedirect(before);
  await save('before.json', before);
  await save('draft.json', draft);
  await validate(draft);
  if (mode === 'plan') return { mode, applied: false };
  if (mode !== 'apply') throw new Error('Unknown cutover mode.');
  const paths = parseProbes(probes);
  await preflight?.(paths);
  const current = await read();
  if (current.fingerprint !== before.fingerprint) throw new Error('URL map changed after inventory.');
  await beforeWrite?.();
  let changed = false;
  try {
    // replace must submit this fingerprint to the Compute API (optimistic lock).
    changed = true; // includes uncertain network outcomes after submission
    await replace(draft, before.fingerprint);
    await verify(paths);
    const after = await read();
    if (!isDeepStrictEqual(clean(after), draft)) throw new Error('URL map changed during verification.');
    await save('after.json', after);
    return { mode, applied: true, httpVerified: true };
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.CUTOVER_MODE ?? 'plan';
  const output = process.env.CUTOVER_OUTPUT ?? '/tmp/pharmacyhub-qr-cutover';
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
  const api = async (url, method = 'GET', body) => {
    const response = await fetch(url, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`Compute API ${method} failed (HTTP ${response.status}).`);
    return response.json();
  };
  await mkdir(output, { recursive: true, mode: 0o700 });
  const result = await runCutover({
    mode, probes: process.env.QR_PROBE_PATHS || (process.env.PROBE_OUTPUT ? await readFile(process.env.PROBE_OUTPUT, 'utf8') : ''),
    preflight: paths => verifyTargets(paths),
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
    verify: async paths => {
      // Allow load balancer propagation; each probe attempt is bounded.
      const signal = AbortSignal.timeout(120000);
      for (let attempt = 0; attempt < 6; attempt++) {
        try { await verifyRedirects(paths, fetch, signal); return; } catch (error) {
          if (attempt === 5 || signal.aborted) throw error;
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    },
  });
  console.log(JSON.stringify(result));
}
