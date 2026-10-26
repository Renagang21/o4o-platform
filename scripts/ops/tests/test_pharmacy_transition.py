"""Fixed-target cloud transitions are exercised only with in-memory APIs."""
from copy import deepcopy
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
import pharmacy_transition as t


def routing(name=t.OLD):
    return {'name': 'o4o-global-lb', 'fingerprint': 'version-1',
            'hostRules': [{'hosts': sorted(t.HOSTS), 'pathMatcher': t.MATCHER},
                          {'hosts': ['other.example.test'], 'pathMatcher': 'other'}],
            'pathMatchers': [{'name': t.MATCHER, 'defaultService': t.backend_link(name)},
                             {'name': 'other', 'defaultService': 'other-backend'}]}


def metric(value='0'):
    return {'metric': {'type': 'run.googleapis.com/request_count'},
            'resource': {'labels': {'service_name': t.OLD, 'location': t.REGION}},
            'points': [{'value': {'int64Value': value}}]}


class FakeCloud:
    def __init__(self, name=t.OLD):
        self.map = routing(name)
        self.writes = []
        self.resources = {
            f'{t.BACKEND}/backend-{t.NEW}': {'description': t.CUTOVER_MARKER + '1799998000', 'fingerprint': 'be-version',
                                           'backends': [{'group': f'{t.NEG}/neg-{t.NEW}'}]},
            f'{t.NEG}/neg-{t.NEW}': {'description': t.MARKER, 'cloudRun': {'service': t.NEW}, 'networkEndpointType': 'SERVERLESS'},
            f'{t.BACKEND}/backend-{t.OLD}': {'id': 'old-be-id', 'name': f'backend-{t.OLD}',
                                           'selfLink': t.backend_link(t.OLD),
                                           'backends': [{'group': f'{t.NEG}/neg-{t.OLD}'}]},
            f'{t.NEG}/neg-{t.OLD}': {'id': 'old-neg-id', 'name': f'neg-{t.OLD}',
                                     'selfLink': f'{t.NEG}/neg-{t.OLD}', 'networkEndpointType': 'SERVERLESS',
                                     'cloudRun': {'service': t.OLD}},
            f'{t.RUN}/{t.OLD}': {'metadata': {'uid': 'old-run-id'}, 'spec': {'template': {'spec': {
                'containers': [{'image': f'gcr.io/{t.PROJECT}/{t.OLD}:' + 'a' * 40}]}}}},
        }
        self.metric_data = {'timeSeries': [metric()]}

    def request(self, method, url, body=None, missing=False):
        if method == 'GET':
            if url == t.MAP:
                return deepcopy(self.map)
            if 'monitoring.googleapis.com' in url:
                return deepcopy(self.metric_data)
            return deepcopy(self.resources.get(url))
        self.writes.append((method, url, deepcopy(body)))
        if method == 'DELETE':
            self.resources.pop(url)
        return {}

    def compute_operation(self, method, url, body=None, scope='global'):
        self.writes.append((method, url, deepcopy(body)))
        if method == 'DELETE':
            self.resources.pop(url)
        elif url == t.MAP:
            if body['fingerprint'] != self.map['fingerprint']:
                raise RuntimeError('optimistic lock conflict')
            self.map.update(deepcopy(body))
            self.map['fingerprint'] += '-next'
        else:
            self.resources[url].update(deepcopy(body))


def current_revision(*_):
    return ({'status': {'url': 'https://pharmacy-business-web-fixed.a.run.app'},
             'metadata': {'uid': 'new-run-id', 'labels': {'o4o-preparation': 'a' * 40}},
             'spec': {'unchanged': True}},
            {'metadata': {'name': 'pharmacy-business-web-00002-ready'}},
            f'gcr.io/{t.PROJECT}/{t.NEW}@sha256:' + 'b' * 64)


def inventory(api, collection, _field):
    if collection == 'urlMaps':
        return [deepcopy(api.map)]
    prefix = t.BACKEND if collection == 'backendServices' else t.NEG
    return [deepcopy(v) for k, v in api.resources.items() if k.startswith(prefix + '/')]


class RoutingTests(unittest.TestCase):
    def setUp(self):
        self.sleeper = patch.object(t.time, 'sleep', return_value=None)
        self.sleeper.start()
        self.addCleanup(self.sleeper.stop)
    def test_only_pharmacy_matcher_changes_and_source_remains_unchanged(self):
        source = routing()
        source['tests'] = [{'host': sorted(t.HOSTS)[0], 'path': '/', 'service': t.backend_link(t.OLD)}]
        original = deepcopy(source)
        candidate = t.candidate_map(source, t.OLD, t.NEW)
        self.assertEqual(source, original)
        self.assertEqual(candidate['pathMatchers'][1], source['pathMatchers'][1])
        self.assertEqual(candidate['hostRules'], source['hostRules'])
        self.assertEqual(candidate['tests'][0]['service'], t.backend_link(t.NEW))
        self.assertEqual(t.routed_matcher(candidate, t.NEW)['defaultService'], t.backend_link(t.NEW))

    def test_unknown_host_scope_refused(self):
        source = routing()
        source['hostRules'][0]['hosts'].append('unexpected.example.test')
        with self.assertRaises(ValueError):
            t.candidate_map(source, t.OLD, t.NEW)

    def test_failed_provider_validation_is_not_accepted(self):
        api = FakeCloud()
        with patch.object(api, 'request', return_value={'result': {'loadSucceeded': True, 'testPassed': False}}):
            with self.assertRaises(ValueError):
                t.validate_map(api, routing(t.NEW), 'EXTERNAL_MANAGED')
        self.assertEqual(api.writes, [])

    def test_target_revision_drift_prevents_any_routing_write(self):
        api = FakeCloud()
        with patch.object(t, 'stable_revision', current_revision), self.assertRaises(ValueError):
            t.apply_transition(api, t.candidate_map(api.map, t.OLD, t.NEW), expected_revision='unexpected')
        self.assertEqual(api.writes, [])

    def test_map_fingerprint_conflict_has_zero_writes(self):
        api = FakeCloud()
        candidate = t.candidate_map(api.map, t.OLD, t.NEW)
        api.map['fingerprint'] = 'changed-concurrently'
        with self.assertRaises(ValueError), patch.object(t, 'production_idle'):
            t.apply_transition(api, candidate)
        self.assertEqual(api.writes, [])

    def test_cutover_preserves_other_routes_and_marks_after_smoke(self):
        api = FakeCloud()
        with patch.object(t, 'production_idle'), patch.object(t, 'stable_revision', current_revision), patch.object(t, 'public_smoke', return_value='asset'):
            t.apply_transition(api, t.candidate_map(api.map, t.OLD, t.NEW))
        t.routed_matcher(api.map, t.NEW)
        self.assertEqual(api.map['pathMatchers'][1], routing()['pathMatchers'][1])
        self.assertEqual([url for _, url, _ in api.writes], [t.MAP, f'{t.BACKEND}/backend-{t.NEW}'])
        self.assertNotIn('hostRules', api.writes[0][2])

    def test_failed_postcheck_rolls_back_only_our_change(self):
        api = FakeCloud()
        def smoke(url):
            if url == 'https://' + sorted(t.HOSTS)[0]:
                api.map['pathMatchers'][1]['defaultService'] = 'concurrent-unrelated-update'
                api.map['fingerprint'] += '-concurrent'
                return 'unexpected-asset'
            return 'expected-asset'
        with patch.object(t, 'production_idle'), patch.object(t, 'stable_revision', current_revision), patch.object(t, 'public_smoke', smoke):
            with self.assertRaisesRegex(RuntimeError, 'previous backend routing restored'):
                t.apply_transition(api, t.candidate_map(api.map, t.OLD, t.NEW))
        t.routed_matcher(api.map, t.OLD)
        self.assertEqual(api.map['pathMatchers'][1]['defaultService'], 'concurrent-unrelated-update')
        self.assertEqual(len(api.writes), 2)

    def test_concurrent_pharmacy_change_is_not_overwritten(self):
        api = FakeCloud()
        def smoke(url):
            if url in {'https://' + h for h in t.HOSTS}:
                api.map['pathMatchers'][0]['description'] = 'concurrent-pharmacy-change'
                return 'mismatch'
            return 'expected'
        with patch.object(t, 'production_idle'), patch.object(t, 'stable_revision', current_revision), patch.object(t, 'public_smoke', smoke):
            with self.assertRaisesRegex(RuntimeError, 'automatic rollback withheld'):
                t.apply_transition(api, t.candidate_map(api.map, t.OLD, t.NEW))
        self.assertEqual(len(api.writes), 1)

    def test_owned_compensation_is_not_stranded_by_later_main_activity(self):
        api = FakeCloud()
        def smoke(url):
            return 'mismatch' if url in {'https://' + h for h in t.HOSTS} else 'expected'
        with patch.object(t, 'production_idle', side_effect=[None, ValueError('Later main activity')]) as gate, patch.object(t, 'stable_revision', current_revision), patch.object(t, 'public_smoke', smoke):
            with self.assertRaisesRegex(RuntimeError, 'previous backend routing restored'):
                t.apply_transition(api, t.candidate_map(api.map, t.OLD, t.NEW))
        self.assertEqual(gate.call_count, 1)
        t.routed_matcher(api.map, t.OLD)

    def test_successful_route_can_resume_without_repeating_patch(self):
        api = FakeCloud(t.NEW)
        with patch.object(t, 'production_idle'), patch.object(t, 'stable_revision', current_revision), patch.object(t, 'public_smoke', return_value='asset'):
            t.apply_transition(api, t.candidate_map(api.map, t.NEW, t.NEW))
        self.assertEqual([url for _, url, _ in api.writes], [f'{t.BACKEND}/backend-{t.NEW}'])

    def test_rollback_plan_does_not_require_current_broken_domains(self):
        api = FakeCloud(t.NEW)
        service, revision, image = current_revision()
        service['status']['url'] = 'https://kpa-society-web-fixed.a.run.app'
        api.resources[f'{t.BACKEND}/backend-{t.OLD}']['loadBalancingScheme'] = 'EXTERNAL_MANAGED'
        def smoke(url):
            if url in {'https://' + h for h in t.HOSTS}:
                raise ValueError('Current domains unavailable')
            return 'healthy-old-asset'
        with patch.object(t, 'stable_revision', return_value=(service, revision, image)), patch.object(t, 'validate_map'), patch.object(t, 'public_smoke', side_effect=smoke) as public:
            plan, _, _, _, _, _ = t.transition_plan(api, rollback=True)
        self.assertEqual(plan['mode'], 'rollback')
        self.assertEqual(public.call_args_list, [unittest.mock.call(service['status']['url'])])
        self.assertEqual(api.writes, [])

    def test_failed_rollback_postcheck_keeps_recovery_target(self):
        api = FakeCloud(t.NEW)
        def smoke(url):
            if url in {'https://' + h for h in t.HOSTS}:
                raise ValueError('Shared domain outage')
            return 'healthy-old-asset'
        with patch.object(t, 'production_idle'), patch.object(t, 'stable_revision', current_revision), patch.object(t, 'public_smoke', smoke):
            with self.assertRaisesRegex(RuntimeError, 'recovery target retained'):
                t.apply_transition(api, t.candidate_map(api.map, t.NEW, t.OLD), rollback=True)
        t.routed_matcher(api.map, t.OLD)
        self.assertEqual([url for _, url, _ in api.writes], [t.MAP])


class InventoryTests(unittest.TestCase):
    def test_all_aggregate_scopes_are_explicit(self):
        api = FakeCloud()
        with patch.object(api, 'request', return_value={'items': {'global': {'urlMaps': []}}}) as request:
            self.assertEqual(t.aggregated(api, 'urlMaps', 'urlMaps'), [])
        query = t.urllib.parse.parse_qs(t.urllib.parse.urlparse(request.call_args.args[1]).query)
        self.assertEqual(query['includeAllScopes'], ['true'])
        self.assertEqual(query['returnPartialSuccess'], ['false'])

    def test_partial_or_missing_aggregate_is_not_zero_references(self):
        for response in ({'items': {}, 'unreachables': ['region']}, {'items': {'global': {}}},
                         {'items': {}, 'warning': {'code': 'PARTIAL_SUCCESS'}}, {}):
            with self.subTest(response=response), patch.object(FakeCloud, 'request', return_value=response):
                with self.assertRaises(ValueError):
                    t.aggregated(FakeCloud(), 'urlMaps', 'urlMaps')

    def test_request_metrics_require_elapsed_complete_window(self):
        api = FakeCloud()
        self.assertEqual(t.old_requests(api, 1799998000, 1800000000), 0)
        api.metric_data = {'timeSeries': [metric('3')]}
        self.assertEqual(t.old_requests(api, 1799998000, 1800000000), 3)
        with self.assertRaises(ValueError):
            t.old_requests(api, 1799999999, 1800000000)

    def test_invalid_metric_or_partial_read_is_not_zero_traffic(self):
        for response in ({'executionErrors': [{}]}, {'timeSeries': [metric('-1')]},
                         {'timeSeries': [metric('NaN')]}, {'timeSeries': [metric(False)]},
                         {'timeSeries': [{'points': []}]}):
            api = FakeCloud()
            api.metric_data = response
            with self.subTest(response=response), self.assertRaises(ValueError):
                t.old_requests(api, 1799998000, 1800000000)

    def test_empty_complete_metric_response_is_zero(self):
        api = FakeCloud()
        api.metric_data = {}
        self.assertEqual(t.old_requests(api, 1799998000, 1800000000), 0)


class ProductionWriteGateTests(unittest.TestCase):
    def gate(self, response):
        def opened(request, **_):
            data = {'object': {'sha': 'a' * 40}} if '/git/ref/' in request.full_url else response
            return io.BytesIO(json.dumps(data).encode())
        return patch.object(t.urllib.request, 'urlopen', side_effect=opened)

    def test_other_production_writer_is_not_ignored(self):
        for name in ('deploy-api.yml', 'deploy-cooperative.yml'):
            response = {'total_count': 1, 'workflow_runs': [{'id': 2, 'path': '.github/workflows/' + name}]}
            with self.subTest(name=name), patch.dict(t.os.environ, {'PRODUCTION_GATE_TOKEN': 'unit-placeholder', 'GITHUB_RUN_ID': '1', 'GITHUB_SHA': 'a' * 40}), self.gate(response):
                with self.assertRaisesRegex(ValueError, 'Another production'):
                    t.production_idle()

    def test_every_existing_production_wif_workflow_is_classified(self):
        root = Path(__file__).resolve().parents[3]
        for file in (root / '.github' / 'workflows').glob('*.yml'):
            source = file.read_text()
            if 'google-github-actions/auth@' not in source or not t.re.search(r'environment:\s*production', source):
                continue
            if file.name == 'gcp-wif-auth-smoke.yml':
                continue  # Explicitly read-only; never submits a runtime mutation.
            self.assertIn(file.name, t.PRODUCTION_WORKFLOWS, file.name)

    def test_incomplete_run_inventory_is_not_idle(self):
        with patch.dict(t.os.environ, {'PRODUCTION_GATE_TOKEN': 'unit-placeholder', 'GITHUB_RUN_ID': '1', 'GITHUB_SHA': 'a' * 40}), self.gate({'total_count': 1, 'workflow_runs': []}):
            with self.assertRaisesRegex(ValueError, 'incomplete'):
                t.production_idle()

    def test_missing_owner_bootstrap_stops_before_writes(self):
        service = {'metadata': {}, 'status': {'latestReadyRevisionName': t.NEW + '-00001-ready',
                   'latestCreatedRevisionName': t.NEW + '-00001-ready',
                   'traffic': [{'revisionName': t.NEW + '-00001-ready', 'percent': 100}]}}
        revision = {'spec': {'serviceAccountName': f'o4o-runtime@{t.PROJECT}.iam.gserviceaccount.com', 'containers': [{}]}}
        api = FakeCloud()
        with patch.object(api, 'request', side_effect=[service, revision, {'bindings': []}]):
            with self.assertRaisesRegex(ValueError, 'Owner public invoker bootstrap'):
                t.stable_revision(api, t.NEW)
        self.assertEqual(api.writes, [])


class RetirementTests(unittest.TestCase):
    def context(self):
        return (patch.object(t, 'production_idle'), patch.object(t, 'stable_revision', current_revision),
                patch.object(t, 'public_smoke', return_value='asset'), patch.object(t, 'aggregated', inventory))

    def test_plan_is_read_only_and_delete_order_is_fixed(self):
        api = FakeCloud(t.NEW)
        a, b, c, d = self.context()
        with a, b, c, d:
            plan, _ = t.retirement_plan(api, 1800000000)
            self.assertEqual(api.writes, [])
            with patch.object(t.time, 'time', return_value=1800000000):
                t.apply_retirement(api, plan)
        self.assertEqual([(method, url) for method, url, _ in api.writes], [
            ('DELETE', f'{t.BACKEND}/backend-{t.OLD}'), ('DELETE', f'{t.NEG}/neg-{t.OLD}'), ('DELETE', f'{t.RUN}/{t.OLD}')])
        self.assertIn(f'{t.BACKEND}/backend-{t.NEW}', api.resources)

    def test_foreign_reference_blocks_every_delete(self):
        api = FakeCloud(t.NEW)
        api.map['pathMatchers'][1]['defaultService'] = t.backend_link(t.OLD)
        a, b, c, d = self.context()
        with a, b, c, d, self.assertRaisesRegex(ValueError, 'still references'):
            t.retirement_plan(api, 1800000000)
        self.assertEqual(api.writes, [])

    def test_positive_old_request_count_blocks_deletion(self):
        api = FakeCloud(t.NEW)
        api.metric_data = {'timeSeries': [metric('1')]}
        a, b, c, d = self.context()
        with a, b, c, d, self.assertRaisesRegex(ValueError, 'still received requests'):
            t.retirement_plan(api, 1800000000)
        self.assertEqual(api.writes, [])

    def test_changed_identity_is_not_adopted_after_review(self):
        api = FakeCloud(t.NEW)
        a, b, c, d = self.context()
        with a, b, c, d:
            plan, _ = t.retirement_plan(api, 1800000000)
            api.resources[f'{t.BACKEND}/backend-{t.OLD}']['id'] = 'different-owner'
            with patch.object(t.time, 'time', return_value=1800000000), self.assertRaises(ValueError):
                t.apply_retirement(api, plan)
        self.assertEqual(api.writes, [])


if __name__ == '__main__':
    unittest.main()
