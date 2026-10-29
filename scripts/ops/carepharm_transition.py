"""Fixed CarePharm host routing only. No Run, IAM, DB or other host mutations."""
from copy import deepcopy
import os
import re
import time

HOST = 'carepharm.neture.co.kr'
MATCHER = 'path-matcher-carepharm'
NETURE_MATCHER = 'path-matcher-neture'
NETURE_BACKEND = 'backend-neture-web-http'


def host_matcher(url_map):
    rules = [r for r in url_map.get('hostRules', []) if HOST in r.get('hosts', [])]
    if len(rules) != 1:
        raise ValueError('Expected exactly one explicit CarePharm host rule')
    names = rules[0].get('pathMatcher')
    matches = [m for m in url_map.get('pathMatchers', []) if m.get('name') == names]
    if len(matches) != 1 or set(matches[0]) != {'name', 'defaultService'}:
        raise ValueError('Unexpected CarePharm route shape; no write permitted')
    return matches[0]


def candidate_map(url_map, pharmacy_backend, neture_backend, rollback=False):
    """Split just CarePharm from the shared Neture host rule; preserve every other host."""
    source, target = (pharmacy_backend, neture_backend) if rollback else (neture_backend, pharmacy_backend)
    current = host_matcher(url_map)
    expected_name = MATCHER if rollback else NETURE_MATCHER
    if current != {'name': expected_name, 'defaultService': source}:
        raise ValueError('CarePharm source routing differs from the reviewed topology')
    out = deepcopy(url_map)
    if not rollback and any(m.get('name') == MATCHER for m in out['pathMatchers']):
        raise ValueError('CarePharm matcher already exists')
    rules = []
    for rule in out['hostRules']:
        rule['hosts'] = [h for h in rule['hosts'] if h != HOST]
        if rule['hosts']:
            rules.append(rule)
    if rollback:
        if any(r.get('pathMatcher') == MATCHER for r in rules):
            raise ValueError('CarePharm matcher is referenced by another host')
        neture = [m for m in out['pathMatchers'] if m.get('name') == NETURE_MATCHER]
        if neture != [{'name': NETURE_MATCHER, 'defaultService': neture_backend}]:
            raise ValueError('Neture recovery matcher changed')
        out['pathMatchers'] = [m for m in out['pathMatchers'] if m.get('name') != MATCHER]
        rules.append({'hosts': [HOST], 'pathMatcher': NETURE_MATCHER})
    else:
        rules.append({'hosts': [HOST], 'pathMatcher': MATCHER})
        out['pathMatchers'].append({'name': MATCHER, 'defaultService': target})
    out['hostRules'] = rules
    # Persisted LB test expectations must follow only this one host.
    from pharmacy_transition import replace_routes
    out['tests'] = [replace_routes(t, source, target) if t.get('host') == HOST else t
                    for t in out.get('tests', [])]
    for key in ('id', 'kind', 'creationTimestamp', 'selfLink'):
        out.pop(key, None)
    return out


def plan(api, rollback=False):
    import pharmacy_transition as t
    original = api.request('GET', t.MAP)
    neture_backend = f'https://www.googleapis.com/compute/v1/projects/{t.PROJECT}/global/backendServices/{NETURE_BACKEND}'
    candidate = candidate_map(original, t.backend_link(t.NEW), neture_backend, rollback)
    target = 'neture-web' if rollback else t.NEW
    service, revision, image = t.stable_revision(api, target)
    if not image.startswith(f'gcr.io/{t.PROJECT}/{target}@'):
        raise ValueError('Unexpected CarePharm target image namespace')
    if not rollback:
        expected = os.environ.get('GITHUB_SHA', '')
        deployed_image = service.get('spec', {}).get('template', {}).get('spec', {}).get('containers', [{}])[0].get('image')
        if not re.fullmatch(r'[0-9a-f]{40}', expected) or deployed_image != f'gcr.io/{t.PROJECT}/{target}:{expected}':
            raise ValueError('CarePharm replacement must already serve the exact reviewed main image')
    asset = t.public_smoke(service['status']['url'])
    tested = deepcopy(candidate)
    tested['tests'].append({'host': HOST, 'path': '/', 'service': host_matcher(candidate)['defaultService']})
    backend = api.request('GET', host_matcher(candidate)['defaultService'])
    scheme = backend.get('loadBalancingScheme')
    if scheme not in ('EXTERNAL', 'EXTERNAL_MANAGED'):
        raise ValueError('Unexpected CarePharm backend scheme')
    result = api.request('POST', t.MAP + '/validate', {'resource': tested, 'loadBalancingSchemes': [scheme]}).get('result', {})
    if result.get('loadSucceeded') is not True or result.get('testPassed') is not True:
        raise ValueError('CarePharm URL map validation failed')
    record = {'mode': 'carepharm-rollback' if rollback else 'carepharm-cutover',
              'candidate': candidate, 'target_revision': revision['metadata']['name'],
              'image': image, 'asset': asset}
    return record, t.digest(record), original


def apply(api, record, original):
    import pharmacy_transition as t
    candidate = record['candidate']
    if api.request('GET', t.MAP) != original:
        raise ValueError('URL map changed after plan; no write submitted')
    target = 'neture-web' if record['mode'] == 'carepharm-rollback' else t.NEW
    if t.stable_revision(api, target)[1]['metadata']['name'] != record['target_revision']:
        raise ValueError('CarePharm target revision changed')
    t.production_idle()
    fields = ('fingerprint', 'hostRules', 'pathMatchers', 'tests')
    api.compute_operation('PATCH', t.MAP, {k: candidate[k] for k in fields if k in candidate})
    try:
        for attempt in range(12):
            try:
                if host_matcher(api.request('GET', t.MAP)) != host_matcher(candidate):
                    raise ValueError('CarePharm route verification failed')
                if t.stable_revision(api, target)[1]['metadata']['name'] != record['target_revision']:
                    raise ValueError('CarePharm target revision changed during verification')
                if t.public_smoke('https://' + HOST) != record['asset']:
                    raise ValueError('CarePharm public bundle differs from the target')
                return
            except (ValueError, RuntimeError):
                if attempt == 11:
                    raise
                time.sleep(5)
    except Exception:
        # Compensate only if our exact topology remains; never overwrite another writer.
        current = api.request('GET', t.MAP)
        if any(current.get(k, []) != candidate.get(k, []) for k in ('hostRules', 'pathMatchers', 'tests')):
            raise RuntimeError('CarePharm verification failed; concurrent routing edit prevents automatic recovery') from None
        patch = {k: original[k] for k in fields if k in original}
        patch['fingerprint'] = current['fingerprint']
        # Clear tests added to a map that originally had none.
        patch.setdefault('tests', [])
        api.compute_operation('PATCH', t.MAP, patch)
        raise RuntimeError('CarePharm verification failed; previous routing restored') from None
