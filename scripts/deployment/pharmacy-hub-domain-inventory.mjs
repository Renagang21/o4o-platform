/** Read-only PH certificate/reference inventory. Never emits PEMs, tokens or service envs. */
import { spawnSync } from 'node:child_process';

const hosts = new Set(['pharmacyhub.co.kr', 'www.pharmacyhub.co.kr', '*.pharmacyhub.co.kr']);
const name = value => typeof value === 'string' ? value.split('/').at(-1) : null;
const resource = value => typeof value === 'string' ? (value.includes('projects/') ? value.slice(value.indexOf('projects/')) : value) : null;
const domains = value => Array.isArray(value) ? value.filter(v => typeof v === 'string' && /^[a-z0-9.*-]+$/i.test(v)) : [];
const phDomains = value => domains(value).some(v => hosts.has(v.toLowerCase()));

export function collectDomainInventory(run = spawnSync) {
  const blockers = [];
  function read(check, args) {
    try {
      const out = run('/usr/bin/gcloud', [...args, '--project=netureyoutube', '--format=json'], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000,
      });
      if (out.status !== 0 || /Some requests did not succeed|PERMISSION_DENIED|required.*permission|Forbidden/i.test(out.stderr ?? '')) {
        const permissions = [...new Set(String(out.stderr ?? '').match(/(?:compute|certificatemanager)\.[A-Za-z]+\.[A-Za-z]+/g) ?? [])];
        blockers.push({ check, code: 'INVENTORY_UNAVAILABLE', permissions });
        return null;
      }
      const data = JSON.parse(out.stdout);
      if (!Array.isArray(data)) throw new Error('Expected a complete list');
      return data;
    } catch {
      blockers.push({ check, code: 'INVENTORY_UNAVAILABLE', permissions: [] });
      return null;
    }
  }
  const legacy = read('sslCertificates', ['compute', 'ssl-certificates', 'list']);
  const proxies = read('httpsProxies', ['compute', 'target-https-proxies', 'list']);
  const certificates = read('managedCertificates', ['certificate-manager', 'certificates', 'list', '--location=-']);
  const maps = read('certificateMaps', ['certificate-manager', 'maps', 'list']);
  const auth = read('dnsAuthorizations', ['certificate-manager', 'dns-authorizations', 'list', '--location=-']);
  const certificateMaps = [];
  for (const map of maps ?? []) {
    const mapName = name(map.name);
    if (!mapName || !/^[a-z][a-z0-9-]{0,62}$/.test(mapName)) {
      blockers.push({ check: 'certificateMapIdentity', code: 'INVENTORY_UNAVAILABLE', permissions: [] });
      continue;
    }
    const entries = read(`mapEntries:${mapName}`, ['certificate-manager', 'maps', 'entries', 'list', `--map=${mapName}`]);
    certificateMaps.push({ name: mapName, complete: entries !== null,
      entries: (entries ?? []).map(e => ({ name: name(e.name), hostname: domains([e.hostname])[0] ?? null,
        matcher: e.matcher ?? null, certificates: (e.certificates ?? []).map(resource) })),
      proxies: (proxies ?? []).filter(p => name(p.certificateMap) === mapName).map(p => name(p.name)),
    });
  }
  const managed = (certificates ?? []).filter(c => phDomains(c.managed?.domains) || phDomains(c.sanDnsnames));
  return { readOnly: true, complete: blockers.length === 0, hosts: [...hosts].filter(h => !h.startsWith('*')),
    legacyCertificates: (legacy ?? []).filter(c => phDomains(c.managed?.domains) || phDomains(c.subjectAlternativeNames)).map(c => ({
      name: name(c.name), resource: resource(c.selfLink ?? c.name), domains: domains(c.managed?.domains ?? c.subjectAlternativeNames),
      proxies: (proxies ?? []).filter(p => (p.sslCertificates ?? []).some(ref => resource(ref) === resource(c.selfLink ?? c.name))).map(p => name(p.name)),
    })),
    managedCertificates: managed.map(c => ({ name: name(c.name), resource: resource(c.name), domains: domains(c.managed?.domains ?? c.sanDnsnames),
      state: c.managed?.state ?? null, dnsAuthorizations: (c.managed?.dnsAuthorizations ?? []).map(resource),
      directProxies: (proxies ?? []).filter(p => (p.certificateManagerCertificates ?? []).some(ref => resource(ref) === resource(c.name)))
        .map(p => ({ name: name(p.name), resource: resource(p.selfLink ?? p.name) })),
    })),
    certificateMaps,
    dnsAuthorizations: (auth ?? []).filter(a => phDomains([a.domain])).map(a => ({ name: name(a.name), resource: resource(a.name), domain: a.domain })),
    blockers, mutations: 0,
  };
}
