"""No cloud access: prove preparation cannot write live routing or adopt foreign targets."""
from copy import deepcopy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('prepare', Path(__file__).parents[1] / 'pharmacy_prepare.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)


def fixtures():
    revision_name = 'kpa-society-web-00001-abc'
    service = {
        'metadata': {'name': p.OLD, 'annotations': {'run.googleapis.com/ingress': 'all',
                                                  'run.googleapis.com/operation-id': 'discard'},
                     'labels': {'o4o-commit-sha': 'a' * 40}},
        'spec': {'template': {'metadata': {'name': revision_name,
                    'annotations': {'autoscaling.knative.dev/maxScale': '5'}},
                 'spec': {'containers': [{'image': 'mutable:tag'}]}},
                 'traffic': [{'revisionName': revision_name, 'percent': 100}]},
        'status': {'latestReadyRevisionName': revision_name, 'latestCreatedRevisionName': revision_name,
                   'traffic': [{'revisionName': revision_name, 'percent': 100}]}}
    revision = {'metadata': {'name': revision_name}, 'spec': {
        'serviceAccountName': f'o4o-runtime@{p.PROJECT}.iam.gserviceaccount.com',
        'containerConcurrency': 80, 'timeoutSeconds': 300,
        'containers': [{'image': 'mutable:tag', 'env': [{'name': 'SAMPLE', 'value': 'must-stay-private'}],
                        'resources': {'limits': {'memory': '256Mi', 'cpu': '1000m'}}}]},
        'status': {'imageDigest': f'gcr.io/{p.PROJECT}/{p.OLD}@sha256:' + 'b' * 64}}
    neg = {'networkEndpointType': 'SERVERLESS', 'cloudRun': {'service': p.OLD}}
    backend = {'name': f'backend-{p.OLD}', 'id': 'private-id', 'fingerprint': 'server-token',
               'protocol': 'HTTP', 'enableCDN': True, 'timeoutSec': 30,
               'backends': [{'group': f'{p.NEG}/neg-{p.OLD}'}]}
    url_map = {'fingerprint': 'live-route-version',
               'hostRules': [{'hosts': ['pharmacy.neture.co.kr', 'megapharm.neture.co.kr'],
                              'pathMatcher': 'path-matcher-pharmacy'}],
               'pathMatchers': [{'name': 'path-matcher-pharmacy', 'defaultService': f'{p.BACKEND}/backend-{p.OLD}'}]}
    policy = {'bindings': [{'role': 'roles/run.invoker', 'members': ['allUsers']}]}
    return service, revision, neg, backend, url_map, policy


class FakeAPI:
    def __init__(self, resources=None):
        self.resources = resources or {}
        self.writes = []

    def request(self, method, url, body=None, missing=False):
        if method == 'GET':
            return self.resources.get(url)
        self.writes.append((method, url, deepcopy(body)))
        resource = deepcopy(body)
        resource['status'] = {'conditions': [{'type': 'Ready', 'status': 'True'}]}
        self.resources[url + '/' + body['metadata']['name']] = resource
        return resource

    def compute_create(self, url, body):
        self.writes.append(('POST', url, deepcopy(body)))
        self.resources[url + '/' + body['name']] = deepcopy(body)


class PreparationTests(unittest.TestCase):
    def test_clone_preserves_runtime_env_cdn_and_immutable_image(self):
        values = fixtures()
        before = deepcopy(values)
        plan, fingerprint = p.make_plan(*values)
        self.assertEqual(values, before)
        template = plan['service']['spec']['template']
        self.assertNotIn('name', template['metadata'])
        self.assertEqual(template['spec']['containers'][0]['env'][0]['value'], 'must-stay-private')
        self.assertIn('@sha256:', template['spec']['containers'][0]['image'])
        self.assertTrue(plan['backend']['enableCDN'])
        self.assertNotIn('fingerprint', plan['backend'])
        self.assertNotIn('run.googleapis.com/operation-id', plan['service']['metadata']['annotations'])
        self.assertEqual(plan['service']['metadata']['labels']['o4o-preparation'], fingerprint[:40])

    def test_config_and_routing_drift_changes_review_digest(self):
        values = fixtures()
        _, first = p.make_plan(*values)
        values[1]['spec']['timeoutSeconds'] = 301
        _, changed = p.make_plan(*values)
        self.assertNotEqual(first, changed)
        values = fixtures()
        values[4]['fingerprint'] = 'concurrent-update'
        self.assertNotEqual(first, p.make_plan(*values)[1])

    def test_staged_or_split_source_refused(self):
        for mutation in ('not-latest', 'split', 'mutable', 'non-public', 'wrong-neg', 'iam-disabled'):
            with self.subTest(mutation=mutation):
                values = fixtures()
                if mutation == 'not-latest':
                    values[0]['status']['latestCreatedRevisionName'] = 'pending'
                elif mutation == 'split':
                    values[0]['status']['traffic'][0]['percent'] = 90
                elif mutation == 'mutable':
                    values[1]['status']['imageDigest'] = 'mutable:tag'
                elif mutation == 'non-public':
                    values[5]['bindings'] = []
                elif mutation == 'wrong-neg':
                    values[2]['cloudRun']['service'] = 'other'
                else:
                    values[0]['metadata']['annotations']['run.googleapis.com/invoker-iam-disabled'] = 'true'
                with self.assertRaises(ValueError):
                    p.make_plan(*values)

    def test_compute_selflink_alias_is_accepted(self):
        values = fixtures()
        values[3]['backends'][0]['group'] = values[3]['backends'][0]['group'].replace('compute.googleapis.com', 'www.googleapis.com')
        values[4]['pathMatchers'][0]['defaultService'] = values[4]['pathMatchers'][0]['defaultService'].replace('compute.googleapis.com', 'www.googleapis.com')
        p.make_plan(*values)

    def test_plan_has_zero_writes(self):
        plan, fingerprint = p.make_plan(*fixtures())
        api = FakeAPI()
        p.ensure_targets(api, plan, fingerprint, False)
        self.assertEqual(api.writes, [])

    def test_foreign_backend_collision_fails_before_any_creation(self):
        plan, fingerprint = p.make_plan(*fixtures())
        api = FakeAPI({f'{p.BACKEND}/backend-{p.NEW}': {'description': 'foreign'}})
        with self.assertRaises(ValueError):
            p.ensure_targets(api, plan, fingerprint, True)
        self.assertEqual(api.writes, [])

    def test_create_only_new_resources_and_retry_has_zero_writes(self):
        plan, fingerprint = p.make_plan(*fixtures())
        api = FakeAPI()
        p.ensure_targets(api, plan, fingerprint, True)
        self.assertEqual([(m, u) for m, u, _ in api.writes],
                         [('POST', p.RUN), ('POST', p.NEG), ('POST', p.BACKEND)])
        self.assertEqual(api.writes[0][2]['metadata']['name'], p.NEW)
        api.writes.clear()
        p.ensure_targets(api, plan, fingerprint, True)
        self.assertEqual(api.writes, [])


if __name__ == '__main__':
    unittest.main()
