"""Prepare a private replacement; never change IAM, live routing or old resources.

Only the trusted web deploy workflow invokes this CLI. Raw configuration remains
in memory; diagnostics deliberately exclude API bodies, env and credentials.
"""
import argparse
from contextlib import contextmanager
from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time

PROJECT = 'netureyoutube'
REGION = 'asia-northeast3'
OLD = 'kpa-society-web'
NEW = 'pharmacy-business-web'
RUN = f'https://{REGION}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/{PROJECT}/services'
COMPUTE = f'https://compute.googleapis.com/compute/v1/projects/{PROJECT}'
NEG = f'{COMPUTE}/regions/{REGION}/networkEndpointGroups'
BACKEND = f'{COMPUTE}/global/backendServices'
MARKER = 'o4o-pharmacy-private-preparation-v1'
SYSTEM_ANNOTATIONS = {
    'run.googleapis.com/client-name', 'run.googleapis.com/client-version',
    'run.googleapis.com/operation-id', 'run.googleapis.com/ingress-status',
    'run.googleapis.com/urls', 'serving.knative.dev/creator',
    'serving.knative.dev/lastModifier',
}


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def matches(current, desired):
    """Compare intended fields, allowing server defaults and equivalent Compute selfLinks."""
    if isinstance(desired, dict):
        return isinstance(current, dict) and all(k in current and matches(current[k], v) for k, v in desired.items())
    if isinstance(desired, list):
        return isinstance(current, list) and len(current) == len(desired) and all(matches(a, b) for a, b in zip(current, desired))
    if isinstance(desired, str) and isinstance(current, str):
        return current.replace('https://www.googleapis.com/', 'https://compute.googleapis.com/') == desired.replace('https://www.googleapis.com/', 'https://compute.googleapis.com/')
    return current == desired


def metadata(source):
    return {
        'labels': {k: v for k, v in source.get('labels', {}).items()
                   if not k.startswith(('cloud.googleapis.com/', 'serving.knative.dev/'))},
        'annotations': {k: v for k, v in source.get('annotations', {}).items()
                        if k not in SYSTEM_ANNOTATIONS and not k.startswith('kubectl.kubernetes.io/')},
    }


def make_plan(service, revision, neg, backend, url_map, policy):
    ready = service.get('status', {}).get('latestReadyRevisionName')
    status = service.get('status', {})
    serving = [t for t in status.get('traffic', []) if t.get('percent', 0) > 0]
    if (not ready or ready != status.get('latestCreatedRevisionName') or len(serving) != 1
            or serving[0].get('percent') != 100 or serving[0].get('revisionName') != ready
            or revision.get('metadata', {}).get('name') != ready):
        raise ValueError('Source must have one stable, latest ready revision serving 100%')
    if not any(b.get('role') == 'roles/run.invoker' and 'allUsers' in b.get('members', [])
               and not b.get('condition') for b in policy.get('bindings', [])):
        raise ValueError('Source public invoker policy differs from the reviewed topology')
    immutable = revision.get('status', {}).get('imageDigest', '')
    if not re.fullmatch(r'gcr\.io/netureyoutube/kpa-society-web@sha256:[0-9a-f]{64}', immutable):
        raise ValueError('Source immutable image digest unavailable or unexpected')
    if neg.get('networkEndpointType') != 'SERVERLESS' or neg.get('cloudRun') != {'service': OLD}:
        raise ValueError('Source NEG topology changed')
    groups = backend.get('backends', [])
    if backend.get('securityPolicy') or backend.get('edgeSecurityPolicy') or backend.get('region'):
        raise ValueError('Source has a security-policy attachment or regional scope requiring a separate reviewed clone procedure')
    expected_group = f'{NEG}/neg-{OLD}'
    if len(groups) != 1 or groups[0].get('group', '').replace('https://www.googleapis.com/', 'https://compute.googleapis.com/') != expected_group:
        raise ValueError('Source backend topology changed')
    matchers = [m for m in url_map.get('pathMatchers', []) if m.get('name') == 'path-matcher-pharmacy']
    if len(matchers) != 1 or matchers[0].get('defaultService', '').replace('https://www.googleapis.com/', 'https://compute.googleapis.com/') != f'{BACKEND}/backend-{OLD}':
        raise ValueError('Live pharmacy URL map topology changed')
    for host in ('pharmacy.neture.co.kr', 'megapharm.neture.co.kr'):
        if not any(host in h.get('hosts', []) and h.get('pathMatcher') == 'path-matcher-pharmacy'
                   for h in url_map.get('hostRules', [])):
            raise ValueError('Live pharmacy host mapping changed')
    target = {'apiVersion': 'serving.knative.dev/v1', 'kind': 'Service',
              'metadata': metadata(service['metadata']), 'spec': deepcopy(service['spec'])}
    target['metadata'].update(name=NEW, namespace=PROJECT)
    if target['metadata']['annotations'].get('run.googleapis.com/invoker-iam-disabled') == 'true':
        raise ValueError('Invoker IAM must remain enabled')
    template = target['spec']['template']
    template['metadata'] = metadata(template.get('metadata', {}))
    # Clone the serving revision spec, rather than a possibly not-yet-serving template.
    template['spec'] = deepcopy(revision['spec'])
    containers = template['spec'].get('containers', [])
    if len(containers) != 1:
        raise ValueError('Only the reviewed single-container frontend is supported')
    containers[0]['image'] = immutable
    if template['spec'].get('serviceAccountName') != f'o4o-runtime@{PROJECT}.iam.gserviceaccount.com':
        raise ValueError('Unexpected runtime identity')
    target['spec']['traffic'] = [{'latestRevision': True, 'percent': 100}]
    target_neg = {'name': f'neg-{NEW}', 'description': MARKER,
                  'networkEndpointType': 'SERVERLESS', 'cloudRun': {'service': NEW}}
    target_backend = deepcopy(backend)
    for key in ('id', 'kind', 'creationTimestamp', 'selfLink', 'fingerprint', 'usedBy', 'securityPolicy', 'edgeSecurityPolicy', 'region'):
        target_backend.pop(key, None)
    target_backend.update(name=f'backend-{NEW}', description=MARKER)
    target_backend['backends'][0]['group'] = groups[0]['group'].rsplit('/', 1)[0] + f'/neg-{NEW}'
    plan = {'source_revision': ready, 'service': target, 'neg': target_neg, 'backend': target_backend,
            'live_url_map_fingerprint': url_map.get('fingerprint')}
    fingerprint = digest(plan)
    # Full digest stays in the summary; label values have a 63 character limit.
    target['metadata']['labels']['o4o-preparation'] = fingerprint[:40]
    return plan, fingerprint


class API:
    def __init__(self, session):
        self.session = session

    def request(self, method, url, body=None, missing=False):
        response = self.session.request(method, url, json=body, timeout=30)
        if missing and response.status_code == 404:
            return None
        if not 200 <= response.status_code < 300:
            raise RuntimeError(f'{method} resource request failed (HTTP {response.status_code}); response withheld')
        return response.json()

    def compute_create(self, collection, body):
        scope = f'regions/{REGION}' if collection == NEG else 'global'
        self.compute_operation('POST', collection, body, scope)

    def compute_operation(self, method, url, body=None, scope='global'):
        if scope not in ('global', f'regions/{REGION}'):
            raise ValueError('Unexpected Compute operation scope')
        op = self.request(method, url, body)
        name = op.get('name', '')
        if not re.fullmatch(r'operation-[a-zA-Z0-9-]+', name):
            raise RuntimeError('Unexpected Compute operation identifier')
        for _ in range(90):
            current = self.request('GET', f'{COMPUTE}/{scope}/operations/{name}')
            if current.get('status') == 'DONE':
                if current.get('error'):
                    raise RuntimeError('Compute operation failed; response withheld')
                return
            time.sleep(2)
        raise RuntimeError('Compute operation timed out; inspect owned target before retry')


@contextmanager
def cloud_api():
    sdk_root = Path(os.environ.get('PHARMACY_CLOUDSDK_ROOT', ''))
    vendor = sdk_root / 'lib' / 'third_party'
    if not sdk_root.is_absolute() or not vendor.is_dir():
        raise RuntimeError('Trusted Cloud SDK library unavailable')
    sys.path.insert(0, str(vendor))
    import google.auth
    from google.auth.transport.requests import AuthorizedSession
    credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
    with AuthorizedSession(credentials) as session:
        yield API(session)


def emit_summary(title, summary):
    payload = json.dumps({'resource': title.replace(' ', '-'), 'metadata': summary}, separators=(',', ':'))
    escaped = payload.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
    print('::notice title=Pharmacy ' + title + '::' + escaped)
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as output:
        output.write('\n```json\n' + json.dumps(summary, indent=2) + '\n```\n')


def ensure_targets(api, plan, fingerprint, apply):
    desired = plan['service']
    current = api.request('GET', f'{RUN}/{NEW}', missing=True)
    if current is not None:
        if (current.get('metadata', {}).get('labels', {}).get('o4o-preparation') != fingerprint[:40]
                or not matches(current.get('metadata', {}), {k: v for k, v in desired['metadata'].items() if k != 'namespace'})
                or metadata(current.get('metadata', {}))['annotations'] != desired['metadata']['annotations']
                or metadata(current.get('spec', {}).get('template', {}).get('metadata', {}))['annotations'] != desired['spec']['template']['metadata']['annotations']
                or not matches(current.get('spec', {}), desired['spec'])):
            raise ValueError('Target Run service exists with different ownership or configuration')
    missing_service = current is None
    pending = []
    for collection, key in ((NEG, 'neg'), (BACKEND, 'backend')):
        body = plan[key]
        current = api.request('GET', f'{collection}/{body["name"]}', missing=True)
        if current is not None:
            # Do not update/adopt unrelated resources, including a same-named target.
            if not matches(current, body):
                raise ValueError(f'Target {key} exists with different ownership or configuration')
        else:
            pending.append((collection, body))
    if apply:
        # All collision checks precede the first write. Never overwrite a target.
        if missing_service:
            api.request('POST', RUN, desired)
        for _ in range(90):
            current = api.request('GET', f'{RUN}/{NEW}')
            ready = any(c.get('type') == 'Ready' and c.get('status') == 'True'
                        for c in current.get('status', {}).get('conditions', []))
            if ready:
                break
            time.sleep(2)
        else:
            raise RuntimeError('Private Run readiness timed out; live routing is unchanged')
        for collection, body in pending:
            api.compute_create(collection, body)
        # Creation success alone does not prove settings were retained by the API.
        ensure_targets(api, plan, fingerprint, False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=('plan', 'prepare'), required=True)
    parser.add_argument('--expected-plan', default='')
    args = parser.parse_args()
    if args.mode == 'prepare' and not re.fullmatch(r'[0-9a-f]{64}', args.expected_plan):
        raise ValueError('prepare requires the exact reviewed 64-character plan digest')
    with cloud_api() as api:
        source = api.request('GET', f'{RUN}/{OLD}')
        ready = source.get('status', {}).get('latestReadyRevisionName', '')
        if not re.fullmatch(r'kpa-society-web-[a-z0-9-]+', ready):
            raise ValueError('Unexpected source revision name')
        revision_url = RUN.rsplit('/services', 1)[0] + '/revisions/' + ready
        plan, fingerprint = make_plan(
            source, api.request('GET', revision_url), api.request('GET', f'{NEG}/neg-{OLD}'),
            api.request('GET', f'{BACKEND}/backend-{OLD}'),
            api.request('GET', f'{COMPUTE}/global/urlMaps/o4o-global-lb'),
            api.request('GET', f'https://run.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/services/{OLD}:getIamPolicy'),
        )
        if args.mode == 'prepare' and fingerprint != args.expected_plan:
            raise ValueError('Live source changed since review; run plan again')
        ensure_targets(api, plan, fingerprint, args.mode == 'prepare')
    summary = {'mode': args.mode, 'plan_digest': fingerprint, 'source_revision': ready,
               'immutable_image': plan['service']['spec']['template']['spec']['containers'][0]['image'],
               'target_service': NEW, 'target_neg': plan['neg']['name'],
               'target_backend': plan['backend']['name'],
               'live_routing_changed': False, 'iam_changed': False,
               'private_resources_ready': args.mode == 'prepare',
               'next_step': 'Owner grants new service roles/run.invoker to allUsers before routed smoke'}
    emit_summary('private preparation', summary)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Preparation failed; diagnostic response withheld. Live routing and IAM were not changed.', file=sys.stderr)
        sys.exit(1)
