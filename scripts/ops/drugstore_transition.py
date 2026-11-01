"""Fixed legacy-host to Drugstore cutover; preserve all other routes, IAM and data."""
from copy import deepcopy
import re
import time
import urllib.parse

HOST = 'drugstore.neture.co.kr'
LEGACY_HOST = 'megapharm.neture.co.kr'  # Transition input only, never a current destination.
CM = 'https://certificatemanager.googleapis.com/v1'
ROOT = 'projects/netureyoutube/locations/global'
CERT = ROOT + '/certificates/cm-cert-drugstore'
MAP_NAME = ROOT + '/certificateMaps/o4o-main-cert-map'
ENTRY = MAP_NAME + '/certificateMapEntries/cm-entry-drugstore'
OWNER = {'o4o-operation': 'drugstore-host-transition-v1'}
TLS_WAIT_SECONDS = 900
ROUTE_WRITE_SECONDS = 900
VERIFY_SECONDS = 180


def resource(name):
    return str(name).split('projects/', 1)[-1].replace('117791934476/', 'netureyoutube/', 1)


def candidate_map(original):
    import pharmacy_transition as t
    result = deepcopy(original)
    relevant = [r for r in result.get('hostRules', []) if any(h in (HOST, LEGACY_HOST) for h in r.get('hosts', []))]
    if not relevant or any(r.get('pathMatcher') != t.MATCHER for r in relevant):
        raise ValueError('Drugstore host has an unexpected owner or legacy route is missing')
    matched = [m for m in result.get('pathMatchers', []) if m.get('name') == t.MATCHER]
    hosts = {h for r in result.get('hostRules', []) if r.get('pathMatcher') == t.MATCHER for h in r.get('hosts', [])}
    if (len(matched) != 1 or not isinstance(original.get('fingerprint'), str)
            or t.canonical(matched[0].get('defaultService', '')) != t.canonical(t.backend_link(t.NEW))
            or 'pharmacy.neture.co.kr' not in hosts or hosts - {'pharmacy.neture.co.kr', HOST, LEGACY_HOST}):
        raise ValueError('Reviewed pharmacy backend or host scope changed')
    new_exists = any(HOST in r.get('hosts', []) for r in result['hostRules'])
    for rule in result['hostRules']:
        if LEGACY_HOST in rule.get('hosts', []):
            rule['hosts'] = ([h for h in rule['hosts'] if h != LEGACY_HOST] if new_exists else
                             list(dict.fromkeys(HOST if h == LEGACY_HOST else h for h in rule['hosts'])))
    result['hostRules'] = [r for r in result['hostRules'] if r.get('hosts')]
    for test in result.get('tests', []):
        if test.get('host') == LEGACY_HOST:
            test['host'] = HOST
    tests, seen = [], {}
    for test in result.get('tests', []):
        key = (test.get('host'), test.get('path'))
        if key in seen and seen[key] != test:
            raise ValueError('Conflicting Drugstore URL-map tests')
        if key not in seen:
            tests.append(test)
            seen[key] = test
    if 'tests' in result:
        result['tests'] = tests
    t.routed_matcher(result, t.NEW)
    return result


def listing(api, url, field):
    rows, token = [], None
    for _ in range(10):
        data = api.request('GET', url + ('?pageToken=' + urllib.parse.quote(token, safe='') if token else ''))
        if not isinstance(data.get(field, []), list):
            raise ValueError('TLS inventory is incomplete')
        rows.extend(data.get(field, []))
        token = data.get('nextPageToken')
        if not token:
            return rows
    raise ValueError('TLS inventory exceeded its bound')


def certificate(api, name):
    normalized = resource(name)
    if not re.fullmatch(r'netureyoutube/locations/global/certificates/[a-z0-9-]+', normalized):
        raise ValueError('Unexpected TLS certificate resource')
    return api.request('GET', CM + '/projects/' + normalized)


def covers(cert):
    return any(domain in (HOST, '*.neture.co.kr') for domain in cert.get('managed', {}).get('domains', []))


def tls_plan(api):
    import pharmacy_transition as t
    proxies = listing(api, t.COMPUTE + '/global/targetHttpsProxies', 'items')
    attached = [p for p in proxies if t.canonical(p.get('urlMap', '')) == t.canonical(t.MAP)]
    if len(attached) != 1 or resource(attached[0].get('certificateMap', '')) != resource(MAP_NAME):
        raise ValueError('Shared HTTPS proxy does not use the reviewed certificate map')
    entries = listing(api, CM + '/' + MAP_NAME + '/certificateMapEntries', 'certificateMapEntries')
    exact = [e for e in entries if e.get('hostname') == HOST]
    wildcard = [e for e in entries if e.get('hostname') == '*.neture.co.kr']
    if len(exact) > 1 or len(wildcard) > 1:
        raise ValueError('Duplicate TLS hostname entries')
    chosen = exact or wildcard
    if chosen:
        entry = chosen[0]
        certs = [certificate(api, name) for name in entry.get('certificates', [])]
        if any(covers(c) and c.get('managed', {}).get('state') == 'ACTIVE' for c in certs):
            return {'create_certificate': False, 'create_entry': False, 'ready': True,
                    'entry': 'projects/' + resource(entry['name']),
                    'certificates': sorted('projects/' + resource(name) for name in entry['certificates'])}
        if resource(entry.get('name')) != resource(ENTRY) or entry.get('labels') != OWNER:
            raise ValueError('Existing Drugstore TLS entry is not ready and is not owned by this operation')
        if [resource(c) for c in entry.get('certificates', [])] != [resource(CERT)] or entry.get('hostname') != HOST:
            raise ValueError('Owned Drugstore TLS entry configuration changed')
    current = api.request('GET', CM + '/' + CERT, missing=True)
    if current and (current.get('labels') != OWNER or current.get('managed', {}).get('domains') != [HOST]
                    or current.get('selfManaged') or current.get('managed', {}).get('dnsAuthorizations')):
        raise ValueError('Drugstore certificate name is already owned by another configuration')
    by_name = [e for e in entries if resource(e.get('name')) == resource(ENTRY)]
    if by_name and not exact:
        raise ValueError('Drugstore entry name is already owned by another hostname')
    return {'create_certificate': current is None, 'create_entry': not bool(exact),
            'ready': bool(current and current.get('managed', {}).get('state') == 'ACTIVE'),
            'entry': ENTRY, 'certificates': [CERT]}


def plan(api):
    import pharmacy_transition as t
    original = api.request('GET', t.MAP)
    candidate = candidate_map(original)
    backend, _ = t.target_chain(api, t.NEW)
    t.validate_map(api, candidate, backend.get('loadBalancingScheme'))
    service, revision, _ = t.stable_revision(api, t.NEW)
    tls = tls_plan(api)
    record = {'candidate': candidate, 'tls': tls, 'target_revision': revision['metadata']['name'],
              'asset': t.public_smoke(service['status']['url'])}
    # Issuance state can progress without an operator write; resource identity/configuration may not.
    reviewed = deepcopy(record)
    reviewed['tls'].pop('ready')
    return record, t.digest(reviewed), original


def wait_operation(api, operation):
    name = operation.get('name', '')
    if not re.fullmatch(r'projects/(?:netureyoutube|117791934476)/locations/global/operations/[A-Za-z0-9-]+', name):
        raise ValueError('Unexpected Certificate Manager operation')
    for _ in range(60):
        result = api.request('GET', CM + '/' + name)
        if result.get('done'):
            if result.get('error'):
                raise RuntimeError('Certificate Manager operation failed; response withheld')
            return
        time.sleep(2)
    raise RuntimeError('Certificate Manager operation timed out; re-plan before resuming')


def ensure_tls(api, tls):
    import pharmacy_transition as t
    if tls['create_certificate']:
        t.production_idle()
        wait_operation(api, api.request('POST', CM + '/' + ROOT + '/certificates?certificateId=cm-cert-drugstore',
                                       {'managed': {'domains': [HOST]}, 'labels': OWNER}))
    if tls['create_entry']:
        t.production_idle()
        wait_operation(api, api.request('POST', CM + '/' + MAP_NAME + '/certificateMapEntries?certificateMapEntryId=cm-entry-drugstore',
                                       {'hostname': HOST, 'certificates': [CERT], 'labels': OWNER}))
    deadline = time.monotonic() + TLS_WAIT_SECONDS
    for attempt in range(120):
        current = tls_plan(api)
        if current['ready']:
            return
        if attempt % 6 == 0:
            print('::notice title=Drugstore TLS::Waiting for the fixed hostname managed certificate to become ACTIVE')
        if time.monotonic() >= deadline:
            break
        time.sleep(min(10, max(0, deadline - time.monotonic())))
    raise RuntimeError('Drugstore TLS is not ACTIVE; routing was not changed; owned TLS resources retained for re-plan')


def apply(api, record, original):
    import pharmacy_transition as t
    route_deadline = time.monotonic() + ROUTE_WRITE_SECONDS
    if api.request('GET', t.MAP) != original:
        raise ValueError('URL map changed after plan; no write submitted')
    ensure_tls(api, record['tls'])
    if api.request('GET', t.MAP) != original:
        raise ValueError('URL map changed during TLS issuance; no route write submitted')
    if t.stable_revision(api, t.NEW)[1]['metadata']['name'] != record['target_revision']:
        raise ValueError('Drugstore target revision changed')
    candidate = record['candidate']
    fields = ('hostRules', 'tests')
    changed = any(candidate.get(k, []) != original.get(k, []) for k in fields)
    if changed:
        t.production_idle()
        if time.monotonic() >= route_deadline:
            raise RuntimeError('Drugstore route write budget exhausted; routing unchanged; re-plan with prepared TLS')
        api.compute_operation('PATCH', t.MAP, {'fingerprint': original['fingerprint'], **{k: candidate[k] for k in fields if k in candidate}})
    deadline = time.monotonic() + VERIFY_SECONDS
    try:
        for attempt in range(36):
            observed = api.request('GET', t.MAP)
            if any(observed.get(k, []) != candidate.get(k, []) for k in ('hostRules', 'pathMatchers', 'tests')):
                raise ValueError('Drugstore route changed during verification')
            try:
                if t.public_smoke('https://' + HOST) != record['asset']:
                    raise ValueError('Drugstore bundle differs from reviewed target')
                return
            except (ValueError, RuntimeError):
                if attempt == 35 or time.monotonic() >= deadline:
                    raise
                time.sleep(min(5, max(0, deadline - time.monotonic())))
    except Exception:
        current = api.request('GET', t.MAP)
        if not changed or any(current.get(k, []) != candidate.get(k, []) for k in ('hostRules', 'pathMatchers', 'tests')):
            raise RuntimeError('Drugstore verification failed; no safe automatic route recovery') from None
        # Compensation belongs to the original approved write. A later main/queue
        # must not strand it; exact owned topology and Compute fingerprint protect other writers.
        api.compute_operation('PATCH', t.MAP, {'fingerprint': current['fingerprint'], **{k: original.get(k, []) for k in fields}})
        raise RuntimeError('Drugstore verification failed; previous routes restored; TLS resources retained') from None
