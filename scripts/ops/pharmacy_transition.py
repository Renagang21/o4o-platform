"""Fixed pharmacy frontend transition. No IAM/DB writes or arbitrary resource inputs."""
import argparse
from copy import deepcopy
from datetime import datetime, timezone
import json
import hashlib
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

from pharmacy_prepare import (BACKEND, COMPUTE, MARKER, NEG, NEW, OLD, PROJECT, REGION,
                              RUN, cloud_api, digest, emit_summary)

MAP = f'{COMPUTE}/global/urlMaps/o4o-global-lb'
HOSTS = {'pharmacy.neture.co.kr', 'megapharm.neture.co.kr'}
MATCHER = 'path-matcher-pharmacy'
CUTOVER_MARKER = MARKER + ';cutover='
PRODUCTION_WORKFLOWS = {'delivery.yml', 'promote.yml', 'deploy-api.yml', 'deploy-admin.yml',
                        'deploy-web-services.yml', 'deploy-cooperative.yml', 'pharmacyhub-qr-cutover.yml'}
OBSERVATION_SECONDS = 600
PROPAGATION_SECONDS = 120
INGESTION_SECONDS = 180


def canonical(value):
    return value.replace('https://www.googleapis.com/', 'https://compute.googleapis.com/')


def backend_link(name):
    return f'{BACKEND}/backend-{name}'.replace('https://compute.googleapis.com/', 'https://www.googleapis.com/')


def replace_routes(value, old, new):
    if isinstance(value, list):
        return [replace_routes(item, old, new) for item in value]
    if isinstance(value, dict):
        return {k: new if k in {'service', 'defaultService', 'backendService'} and isinstance(v, str)
                and canonical(v) == canonical(old) else replace_routes(v, old, new) for k, v in value.items()}
    return value


def routed_matcher(url_map, expected):
    hosts = {host for rule in url_map.get('hostRules', []) if rule.get('pathMatcher') == MATCHER
             for host in rule.get('hosts', [])}
    candidates = [m for m in url_map.get('pathMatchers', []) if m.get('name') == MATCHER]
    if (hosts != HOSTS or len(candidates) != 1 or not isinstance(url_map.get('fingerprint'), str)
            or canonical(candidates[0].get('defaultService', '')) != canonical(backend_link(expected))):
        raise ValueError('Pharmacy routing or host scope differs from the reviewed fixed topology')
    return candidates[0]


def candidate_map(url_map, source, target):
    routed_matcher(url_map, source)
    result = deepcopy(url_map)
    result['pathMatchers'] = [replace_routes(m, backend_link(source), backend_link(target))
                              if m['name'] == MATCHER else m for m in result['pathMatchers']]
    # Persisted assertions belonging to these two hosts must follow their renamed backend.
    if 'tests' in result:
        result['tests'] = [replace_routes(t, backend_link(source), backend_link(target))
                           if t.get('host') in HOSTS else t for t in result['tests']]
    for key in ('id', 'kind', 'creationTimestamp', 'selfLink'):
        result.pop(key, None)
    return result


def validate_map(api, candidate, scheme):
    if scheme not in ('EXTERNAL', 'EXTERNAL_MANAGED'):
        raise ValueError('Unexpected load balancing scheme')
    tested = deepcopy(candidate)
    target = next(m for m in candidate['pathMatchers'] if m['name'] == MATCHER)['defaultService']
    tested['tests'] = tested.get('tests', []) + [{'host': host, 'path': '/', 'service': target} for host in sorted(HOSTS)]
    result = api.request('POST', MAP + '/validate', {'resource': tested, 'loadBalancingSchemes': [scheme]}).get('result', {})
    if result.get('loadSucceeded') is not True or result.get('testPassed') is not True:
        raise ValueError('GCP URL map validation failed; response withheld')


def stable_revision(api, name):
    service = api.request('GET', f'{RUN}/{name}')
    if service.get('metadata', {}).get('annotations', {}).get('run.googleapis.com/invoker-iam-disabled') == 'true':
        raise ValueError('Invoker IAM must remain enabled')
    status = service.get('status', {})
    serving = [t for t in status.get('traffic', []) if t.get('percent', 0) > 0]
    ready = status.get('latestReadyRevisionName', '')
    if (len(serving) != 1 or serving[0].get('percent') != 100 or serving[0].get('revisionName') != ready
            or status.get('latestCreatedRevisionName') != ready
            or not re.fullmatch(re.escape(name) + r'-[a-z0-9-]+', ready)):
        raise ValueError('Frontend must have one stable latest ready revision serving 100%')
    revision = api.request('GET', RUN.rsplit('/services', 1)[0] + '/revisions/' + ready)
    if (revision.get('spec', {}).get('serviceAccountName') != f'o4o-runtime@{PROJECT}.iam.gserviceaccount.com'
            or len(revision.get('spec', {}).get('containers', [])) != 1):
        raise ValueError('Unexpected runtime identity')
    policy = api.request('GET', f'https://run.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/services/{name}:getIamPolicy')
    if not any(b.get('role') == 'roles/run.invoker' and 'allUsers' in b.get('members', [])
               and not b.get('condition') for b in policy.get('bindings', [])):
        raise ValueError('Owner public invoker bootstrap is required before transition')
    image = revision.get('status', {}).get('imageDigest', '')
    if not re.fullmatch(r'gcr\.io/netureyoutube/(?:kpa-society-web|pharmacy-business-web)@sha256:[0-9a-f]{64}', image):
        raise ValueError('Unexpected frontend immutable image')
    return service, revision, image


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def public_smoke(origin):
    parsed = urllib.parse.urlparse(origin)
    run_host = re.fullmatch(r'(?:infra-rename---)?(?:pharmacy-business-web|kpa-society-web)-[a-z0-9-]+\.(?:a\.run\.app|asia-northeast3\.run\.app)', parsed.hostname or '')
    if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.port or parsed.path not in ('', '/') or not (parsed.hostname in HOSTS or run_host):
        raise ValueError('Unexpected public smoke origin')
    opener = urllib.request.build_opener(NoRedirect())
    def get(url):
        try:
            with opener.open(url, timeout=30) as response:
                body = response.read(5_000_001)
                if response.status != 200 or len(body) > 5_000_000:
                    raise ValueError('Public frontend response failed its status or size contract')
                return body
        except (urllib.error.URLError, OSError) as error:
            status = error.code if isinstance(error, urllib.error.HTTPError) else 'network'
            raise ValueError(f'Public frontend smoke failed for {parsed.hostname} ({status}); response withheld') from None
    html = get(origin.rstrip('/') + '/')
    if b'<html' not in html.lower() and b'<!doctype html' not in html.lower():
        raise ValueError('Public frontend did not return HTML')
    scripts = re.findall(rb'<script[^>]+src="(/assets/[A-Za-z0-9_./-]+\.js)"', html)
    if not scripts or b'..' in scripts[0]:
        raise ValueError('No same-origin primary frontend JS asset')
    return hashlib.sha256(get(origin.rstrip('/') + scripts[0].decode())).hexdigest()


def production_idle():
    token = os.environ.get('PRODUCTION_GATE_TOKEN', '')
    run_id = os.environ.get('GITHUB_RUN_ID', '')
    if not token or not run_id.isdigit():
        raise ValueError('Production write gate identity unavailable')
    def read(path):
        request = urllib.request.Request('https://api.github.com/repos/Renagang21/o4o-platform/' + path,
                                        headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json'})
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    if read('git/ref/heads/main').get('object', {}).get('sha') != os.environ.get('GITHUB_SHA'):
        raise ValueError('Production write gate requires the current main SHA')
    for status in ('in_progress', 'queued', 'pending', 'waiting', 'requested'):
        previous_total = None
        for page in range(1, 11):
            data = read(f'actions/runs?status={status}&per_page=100&page={page}')
            total = data.get('total_count')
            runs = data.get('workflow_runs')
            if (type(total) is not int or total < 0 or not isinstance(runs, list)
                    or len(runs) != min(100, max(0, total - (page - 1) * 100))
                    or previous_total is not None and previous_total != total):
                raise ValueError('Production workflow inventory is incomplete; no next write submitted')
            previous_total = total
            for run in runs:
                if str(run.get('id')) == run_id:
                    continue
                paths = [run.get('path')] + [w.get('path') for w in run.get('referenced_workflows', [])]
                if any(not isinstance(path, str) for path in paths):
                    raise ValueError('Production workflow path unavailable')
                if any(path.split('@')[0].rsplit('/', 1)[-1] in PRODUCTION_WORKFLOWS for path in paths):
                    raise ValueError('Another production workflow is active; no next write submitted')
            if page * 100 >= total:
                break
        else:
            raise ValueError('Production workflow inventory exceeded its bound')


def mark_cutover(api, epoch):
    current = api.request('GET', f'{BACKEND}/backend-{NEW}')
    existing = current.get('description', '')
    if existing != MARKER and not re.fullmatch(re.escape(CUTOVER_MARKER) + r'[1-9][0-9]{9}', existing):
        raise ValueError('Replacement backend ownership marker changed')
    description = CUTOVER_MARKER + str(epoch) if epoch else MARKER
    production_idle()
    api.compute_operation('PATCH', f'{BACKEND}/backend-{NEW}',
                          {'fingerprint': current['fingerprint'], 'description': description})


def target_chain(api, target):
    backend = api.request('GET', f'{BACKEND}/backend-{target}')
    neg = api.request('GET', f'{NEG}/neg-{target}')
    if (len(backend.get('backends', [])) != 1
            or canonical(backend['backends'][0].get('group', '')) != f'{NEG}/neg-{target}'
            or neg.get('networkEndpointType') != 'SERVERLESS' or neg.get('cloudRun') != {'service': target}):
        raise ValueError('Target backend/NEG chain changed')
    return backend, neg


def transition_plan(api, rollback=False):
    source, target = (NEW, OLD) if rollback else (OLD, NEW)
    service, revision, image = stable_revision(api, target)
    url_map = api.request('GET', MAP)
    current = next((m for m in url_map.get('pathMatchers', []) if m.get('name') == MATCHER), {})
    already_routed = canonical(current.get('defaultService', '')) == canonical(backend_link(target))
    candidate = candidate_map(url_map, target if already_routed else source, target)
    backend, neg = target_chain(api, target)
    marked_backend = backend.get('description', '')
    if not rollback and (marked_backend != MARKER and not re.fullmatch(re.escape(CUTOVER_MARKER) + r'[1-9][0-9]{9}', marked_backend)
                         or neg.get('description') != MARKER
                         or not re.fullmatch(r'[0-9a-f]{40}', service.get('metadata', {}).get('labels', {}).get('o4o-preparation', ''))):
        raise ValueError('Replacement ownership marker unavailable')
    validate_map(api, candidate, backend.get('loadBalancingScheme'))
    public_smoke(service['status']['url'])
    if not rollback:
        for host in sorted(HOSTS):
            public_smoke('https://' + host)
    plan = {'mode': 'rollback' if rollback else 'cutover', 'map_fingerprint': url_map['fingerprint'],
            'target_revision': revision['metadata']['name'], 'image': image,
            'target_identity': service['metadata']['uid'],
            'backend_digest': digest(backend), 'neg_digest': digest(neg),
            'target_spec_digest': digest(service['spec']), 'matcher': routed_matcher(candidate, target),
            'already_routed': already_routed}
    return plan, digest(plan), candidate, service, revision, image


def apply_transition(api, candidate, rollback=False, expected_revision=None):
    source, target = (NEW, OLD) if rollback else (OLD, NEW)
    original = api.request('GET', MAP)
    if original.get('fingerprint') != candidate.get('fingerprint'):
        raise ValueError('URL map changed after review; no routing write submitted')
    if expected_revision and stable_revision(api, target)[1]['metadata']['name'] != expected_revision:
        raise ValueError('Target revision changed after review; no routing write submitted')
    already_routed = canonical(next(m for m in original['pathMatchers'] if m['name'] == MATCHER).get('defaultService', '')) == canonical(backend_link(target))
    if not already_routed:
        production_idle()
        patch = {k: candidate[k] for k in ('fingerprint', 'pathMatchers', 'tests') if k in candidate}
        api.compute_operation('PATCH', MAP, patch)
    try:
        for attempt in range(6):
            try:
                routed_matcher(api.request('GET', MAP), target)
                service, revision, _ = stable_revision(api, target)
                if expected_revision and revision['metadata']['name'] != expected_revision:
                    raise ValueError('Target revision changed during routing verification')
                asset = public_smoke(service['status']['url'])
                if any(public_smoke('https://' + host) != asset for host in sorted(HOSTS)):
                    raise ValueError('Canonical domain JS differs from replacement')
                break
            except (ValueError, RuntimeError):
                if attempt == 5:
                    raise
                time.sleep(5)
    except Exception:
        if rollback:
            raise RuntimeError('Rollback routing applied; canonical smoke remains unhealthy; recovery target retained') from None
        if already_routed:
            raise RuntimeError('Existing routing failed public smoke; no routing write submitted') from None
        # Restore only our pharmacy matcher; preserve unrelated concurrent map edits.
        current = api.request('GET', MAP)
        if routed_matcher(current, target) != routed_matcher(candidate, target):
            raise RuntimeError('Post-cutover smoke failed and pharmacy routing changed concurrently; automatic rollback withheld') from None
        restore = candidate_map(current, target, source)
        # Compensation belongs to the already-authorized operation. A later main
        # commit/queued delivery must not strand our failed route in production.
        # Exact matcher comparison above and the fresh fingerprint protect other writers.
        api.compute_operation('PATCH', MAP, {k: restore[k] for k in ('fingerprint', 'pathMatchers', 'tests') if k in restore})
        routed_matcher(api.request('GET', MAP), source)
        raise RuntimeError('Post-cutover smoke failed; previous backend routing restored') from None
    mark_cutover(api, 0 if rollback else int(time.time()))


def aggregated(api, collection, field):
    output, token = [], None
    for _ in range(100):
        params = {'returnPartialSuccess': 'false', 'includeAllScopes': 'true', 'maxResults': 500}
        if token:
            params['pageToken'] = token
        data = api.request('GET', f'{COMPUTE}/aggregated/{collection}?' + urllib.parse.urlencode(params))
        if (data.get('unreachables') or not isinstance(data.get('items'), dict)
                or data.get('warning', {}).get('code') not in (None, 'NO_RESULTS_ON_PAGE')):
            raise ValueError('Aggregate reference inventory is incomplete')
        for scope in data['items'].values():
            if scope.get('warning', {}).get('code') not in (None, 'NO_RESULTS_ON_PAGE'):
                raise ValueError('Aggregate reference inventory has warnings')
            if field not in scope and scope.get('warning', {}).get('code') != 'NO_RESULTS_ON_PAGE':
                raise ValueError('Aggregate reference inventory scope is incomplete')
            entries = scope.get(field, [])
            if not isinstance(entries, list):
                raise ValueError('Aggregate reference inventory has an invalid shape')
            output.extend(entries)
        token = data.get('nextPageToken')
        if not token:
            return output
    raise ValueError('Aggregate reference inventory exceeded its bound')


def contains_link(value, link):
    if isinstance(value, str):
        return canonical(value) == canonical(link)
    if isinstance(value, dict):
        return any(contains_link(v, link) for v in value.values())
    if isinstance(value, list):
        return any(contains_link(v, link) for v in value)
    return False


def old_requests(api, cutover, now):
    end = now - INGESTION_SECONDS
    start = end - OBSERVATION_SECONDS
    if start < cutover + PROPAGATION_SECONDS:
        raise ValueError('Quiet observation window not elapsed; keep old resources for at least 15 minutes after cutover')
    stamp = lambda epoch: datetime.fromtimestamp(epoch, timezone.utc).isoformat().replace('+00:00', 'Z')
    params = {'filter': f'metric.type="run.googleapis.com/request_count" AND resource.type="cloud_run_revision" AND resource.labels.service_name="{OLD}" AND resource.labels.location="{REGION}"',
              'interval.startTime': stamp(start), 'interval.endTime': stamp(end), 'view': 'FULL', 'pageSize': 1000}
    total, token = 0, None
    for _ in range(100):
        if token:
            params['pageToken'] = token
        data = api.request('GET', f'https://monitoring.googleapis.com/v3/projects/{PROJECT}/timeSeries?' + urllib.parse.urlencode(params))
        if data.get('executionErrors') or data.get('unreachable'):
            raise ValueError('Request metric inventory is incomplete')
        series_list = data.get('timeSeries', [])
        if not isinstance(series_list, list):
            raise ValueError('Unexpected request metric response')
        for series in series_list:
            labels = series.get('resource', {}).get('labels', {})
            points = series.get('points')
            if (series.get('metric', {}).get('type') != 'run.googleapis.com/request_count'
                    or labels.get('service_name') != OLD or labels.get('location') != REGION
                    or not isinstance(points, list) or not points):
                raise ValueError('Unexpected request metric scope or missing points')
            for point in points:
                value = point.get('value', {})
                raw = value.get('int64Value')
                if len(value) != 1 or not isinstance(raw, (str, int)) or isinstance(raw, bool) or not re.fullmatch(r'[0-9]+', str(raw)):
                    raise ValueError('Unexpected request metric value')
                number = int(raw)
                if number > 2 ** 63 - 1:
                    raise ValueError('Invalid request metric count')
                total += number
        token = data.get('nextPageToken')
        if not token:
            return total
    raise ValueError('Request metric inventory exceeded its bound')


def retirement_plan(api, now):
    service, revision, image = stable_revision(api, NEW)
    if not image.startswith(f'gcr.io/{PROJECT}/{NEW}@'):
        raise ValueError('Replacement still uses the legacy image namespace')
    backend, neg = target_chain(api, NEW)
    if (neg.get('description') != MARKER or not re.fullmatch(r'[0-9a-f]{40}', service.get('metadata', {}).get('labels', {}).get('o4o-preparation', ''))):
        raise ValueError('Replacement ownership marker unavailable before retirement')
    description = backend.get('description', '')
    epoch = description.removeprefix(CUTOVER_MARKER) if description.startswith(CUTOVER_MARKER) else ''
    if not re.fullmatch(r'[1-9][0-9]{9}', epoch) or int(epoch) > now:
        raise ValueError('Successful cutover marker unavailable')
    routed_matcher(api.request('GET', MAP), NEW)
    asset = public_smoke(service['status']['url'])
    if any(public_smoke('https://' + host) != asset for host in sorted(HOSTS)):
        raise ValueError('Canonical domain JS differs before retirement')
    maps = aggregated(api, 'urlMaps', 'urlMaps')
    backends = aggregated(api, 'backendServices', 'backendServices')
    negs = aggregated(api, 'networkEndpointGroups', 'networkEndpointGroups')
    if any(contains_link(m, backend_link(OLD)) for m in maps):
        raise ValueError('A URL map still references the old backend')
    if any(canonical(b.get('selfLink', '')) != canonical(backend_link(OLD)) and contains_link(b, f'{NEG}/neg-{OLD}') for b in backends):
        raise ValueError('Another backend still references the old NEG')
    if any(n.get('cloudRun', {}).get('service') == OLD and canonical(n.get('selfLink', '')) != f'{NEG}/neg-{OLD}' for n in negs):
        raise ValueError('Another NEG still references the old Cloud Run service')
    targets = []
    for kind, url in (('backend', f'{BACKEND}/backend-{OLD}'), ('neg', f'{NEG}/neg-{OLD}'), ('service', f'{RUN}/{OLD}')):
        current = api.request('GET', url, missing=True)
        if current is None:
            continue
        if kind == 'backend' and (len(current.get('backends', [])) != 1 or canonical(current['backends'][0].get('group', '')) != f'{NEG}/neg-{OLD}'):
            raise ValueError('Old backend ownership changed')
        if kind == 'neg' and (current.get('networkEndpointType') != 'SERVERLESS' or current.get('cloudRun') != {'service': OLD}):
            raise ValueError('Old NEG ownership changed')
        if kind == 'service' and not re.fullmatch(r'gcr\.io/netureyoutube/kpa-society-web(?::[0-9a-f]{40}|@sha256:[0-9a-f]{64})', current.get('spec', {}).get('template', {}).get('spec', {}).get('containers', [{}])[0].get('image', '')):
            raise ValueError('Old service image ownership changed')
        identity = current.get('id') or current.get('metadata', {}).get('uid')
        if not isinstance(identity, str) or not identity:
            raise ValueError('Old resource identity unavailable')
        targets.append({'kind': kind, 'url': url, 'identity': identity,
                        'config_digest': digest(current.get('spec', current.get('backends', current.get('cloudRun'))))})
    count = old_requests(api, int(epoch), now)
    if count != 0:
        raise ValueError('Old Cloud Run still received requests in the quiet observation window')
    plan = {'mode': 'retire', 'cutover': epoch, 'replacement_revision': revision['metadata']['name'],
            'targets': targets, 'old_request_count': count, 'all_reference_lists_complete': True}
    return plan, digest(plan)


def apply_retirement(api, plan):
    remaining = {t['kind']: t for t in plan['targets']}
    for kind in ('backend', 'neg', 'service'):
        fresh, _ = retirement_plan(api, int(time.time()))
        for target in fresh['targets']:
            if remaining.get(target['kind']) != target:
                raise ValueError('Retirement target changed; no next delete submitted')
        if kind not in {t['kind'] for t in fresh['targets']}:
            remaining.pop(kind, None)
            continue
        production_idle()
        if kind == 'service':
            api.request('DELETE', remaining[kind]['url'])
        else:
            api.compute_operation('DELETE', remaining[kind]['url'], scope=f'regions/{REGION}' if kind == 'neg' else 'global')
        for _ in range(90):
            if api.request('GET', remaining[kind]['url'], missing=True) is None:
                break
            time.sleep(2)
        else:
            raise RuntimeError('Old resource deletion not confirmed; no next delete submitted')
        remaining.pop(kind)
    final, _ = retirement_plan(api, int(time.time()))
    if final['targets']:
        raise RuntimeError('Retirement incomplete')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--phase', required=True, choices=('cutover-plan', 'cutover', 'rollback-plan', 'rollback', 'retire-plan', 'retire', 'assert-route'))
    parser.add_argument('--expected-plan', default='')
    args = parser.parse_args()
    apply = args.phase in ('cutover', 'rollback', 'retire')
    if apply and not re.fullmatch(r'[0-9a-f]{64}', args.expected_plan):
        raise ValueError('Mutation requires the exact reviewed plan digest')
    with cloud_api() as api:
        if args.phase == 'assert-route':
            routed_matcher(api.request('GET', MAP), NEW)
            return
        if args.phase.startswith('retire'):
            plan, fingerprint = retirement_plan(api, int(time.time()))
            if apply:
                if fingerprint != args.expected_plan:
                    raise ValueError('Retirement plan changed after review')
                apply_retirement(api, plan)
                plan, _ = retirement_plan(api, int(time.time()))
        else:
            rollback = args.phase.startswith('rollback')
            plan, fingerprint, candidate, service, revision, image = transition_plan(api, rollback)
            if apply:
                if fingerprint != args.expected_plan:
                    raise ValueError('Transition plan changed after review')
                apply_transition(api, candidate, rollback, revision['metadata']['name'])
                _, actual, _ = stable_revision(api, OLD if rollback else NEW)
                plan['target_revision'] = actual['metadata']['name']
    emit_summary('resource transition', {'phase': args.phase, 'plan_digest': fingerprint, 'applied': apply,
                 'old_request_count': plan.get('old_request_count'), 'iam_changed': False, 'database_writes': False,
                 'target_revision': plan.get('target_revision'), 'old_resource_count': len(plan.get('targets', []))})


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError) as error:
        message = str(error).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
        print('::error title=Pharmacy resource transition::' + message)
        raise SystemExit(1)
    except Exception:
        print('::error title=Pharmacy resource transition::Operation failed; response withheld. Inspect the fixed targets before retry.')
        raise SystemExit(1)
