"""Fixed Drugstore routing/TLS writes require reviewed topology and preserve other resources."""
from copy import deepcopy
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).parents[1]))
import drugstore_transition as d
import pharmacy_transition as t


def topology():
    return {'fingerprint': 'before', 'hostRules': [
        {'hosts': ['pharmacy.neture.co.kr', d.LEGACY_HOST], 'pathMatcher': t.MATCHER},
        {'hosts': ['carepharm.neture.co.kr', 'neture.co.kr'], 'pathMatcher': 'other'}],
        'pathMatchers': [{'name': t.MATCHER, 'defaultService': t.backend_link(t.NEW), 'pathRules': [{'paths': ['/api/*'], 'service': 'api'}]},
                         {'name': 'other', 'defaultService': 'other'}],
        'tests': [{'host': d.LEGACY_HOST, 'path': '/', 'service': t.backend_link(t.NEW)},
                  {'host': 'carepharm.neture.co.kr', 'path': '/', 'service': 'other'}]}


class Cloud:
    def __init__(self, ready=False):
        self.map = topology()
        self.writes = []
        self.entries = []
        self.cert = None
        self.ready_after_create = True
        if ready:
            self.cert = {'name': d.CERT, 'managed': {'domains': [d.HOST], 'state': 'ACTIVE'}, 'labels': d.OWNER}
            self.entries = [{'name': d.ENTRY, 'hostname': d.HOST, 'certificates': [d.CERT], 'labels': d.OWNER}]

    def request(self, method, url, body=None, missing=False):
        if method == 'GET':
            if url == t.MAP:
                return deepcopy(self.map)
            if url.endswith('/targetHttpsProxies'):
                return {'items': [{'urlMap': t.MAP, 'certificateMap': '//' + d.CM.split('://')[1].split('/v1')[0] + '/' + d.MAP_NAME}]}
            if url.endswith('/certificateMapEntries'):
                return {'certificateMapEntries': deepcopy(self.entries)}
            if url == d.CM + '/' + d.CERT:
                return deepcopy(self.cert)
            if '/operations/' in url:
                return {'done': True}
            raise AssertionError(url)
        self.writes.append((method, url, deepcopy(body)))
        if 'certificateId=' in url:
            self.cert = {'name': d.CERT, **deepcopy(body)}
            self.cert['managed']['state'] = 'ACTIVE' if self.ready_after_create else 'PROVISIONING'
        elif 'certificateMapEntryId=' in url:
            self.entries.append({'name': d.ENTRY, **deepcopy(body)})
        else:
            raise AssertionError(url)
        return {'name': d.ROOT + '/operations/test-operation'}

    def compute_operation(self, method, url, body):
        self.writes.append((method, url, deepcopy(body)))
        self.map.update(deepcopy(body))
        self.map['fingerprint'] += '-next'


class Routing(unittest.TestCase):
    def test_replaces_only_legacy_host_and_test_preserving_pharmacy_carepharm_and_api_paths(self):
        source = topology()
        target = d.candidate_map(source)
        self.assertEqual(source, topology())
        self.assertEqual(target['hostRules'][0]['hosts'], ['pharmacy.neture.co.kr', d.HOST])
        self.assertEqual(target['hostRules'][1], source['hostRules'][1])
        self.assertEqual(target['pathMatchers'], source['pathMatchers'])
        self.assertEqual(target['tests'][0]['host'], d.HOST)
        self.assertEqual(target['tests'][1], source['tests'][1])

    def test_already_moved_route_is_idempotent(self):
        target = d.candidate_map(topology())
        self.assertEqual(d.candidate_map(target), target)

    def test_existing_new_alias_is_not_duplicated(self):
        source = topology()
        source['hostRules'].append({'hosts': [d.HOST], 'pathMatcher': t.MATCHER})
        target = d.candidate_map(source)
        self.assertEqual(sum(d.HOST in r['hosts'] for r in target['hostRules']), 1)
        self.assertEqual(target['hostRules'][0]['hosts'], ['pharmacy.neture.co.kr'])

    def test_foreign_host_matcher_backend_and_scope_drift_fail_closed(self):
        for kind in ('foreign', 'backend', 'extra', 'fingerprint'):
            with self.subTest(kind=kind):
                source = topology()
                if kind == 'foreign': source['hostRules'][0]['pathMatcher'] = 'other'
                if kind == 'backend': source['pathMatchers'][0]['defaultService'] = 'foreign'
                if kind == 'extra': source['hostRules'][0]['hosts'].append('store.neture.co.kr')
                if kind == 'fingerprint': del source['fingerprint']
                with self.assertRaises(ValueError): d.candidate_map(source)

    def test_conflicting_tests_are_rejected(self):
        source = topology()
        source['tests'].append({'host': d.HOST, 'path': '/', 'service': 'foreign'})
        with self.assertRaisesRegex(ValueError, 'Conflicting'): d.candidate_map(source)


class TLS(unittest.TestCase):
    def test_ready_fixed_entry_requires_no_writes(self):
        api = Cloud(True)
        self.assertTrue(d.tls_plan(api)['ready'])
        self.assertEqual(api.writes, [])

    def test_missing_certificate_and_entry_propose_only_fixed_resources(self):
        api = Cloud()
        plan = d.tls_plan(api)
        self.assertTrue(plan['create_certificate'])
        self.assertTrue(plan['create_entry'])
        self.assertEqual(plan['certificates'], [d.CERT])
        self.assertEqual(api.writes, [])

    def test_owned_pending_resources_resume_without_recreation(self):
        api = Cloud(True)
        api.cert['managed']['state'] = 'PROVISIONING'
        plan = d.tls_plan(api)
        self.assertFalse(plan['create_certificate'])
        self.assertFalse(plan['create_entry'])
        self.assertFalse(plan['ready'])

    @patch.object(t, 'stable_revision', return_value=({'status': {'url': 'https://reviewed'}}, {'metadata': {'name': 'fixed'}}, ''))
    @patch.object(t, 'target_chain', return_value=({'loadBalancingScheme': 'EXTERNAL_MANAGED'}, {}))
    @patch.object(t, 'validate_map')
    @patch.object(t, 'public_smoke', return_value='bundle')
    def test_project_number_alias_and_issuance_progress_do_not_change_digest(self, smoke, validate, chain, revision):
        api = Cloud(True)
        api.cert['name'] = d.CERT.replace('netureyoutube', '117791934476')
        api.entries[0]['name'] = d.ENTRY.replace('netureyoutube', '117791934476')
        api.entries[0]['certificates'] = [api.cert['name']]
        api.cert['managed']['state'] = 'PROVISIONING'
        _, pending, _ = d.plan(api)
        api.cert['managed']['state'] = 'ACTIVE'
        record, active, _ = d.plan(api)
        self.assertTrue(record['tls']['ready'])
        self.assertEqual(pending, active)

    def test_foreign_certificate_collision_is_not_adopted(self):
        api = Cloud()
        api.cert = {'managed': {'domains': ['pharmacy.neture.co.kr']}, 'labels': d.OWNER}
        with self.assertRaisesRegex(ValueError, 'owned'): d.tls_plan(api)
        self.assertEqual(api.writes, [])

    def test_existing_unready_foreign_entry_is_not_overwritten(self):
        api = Cloud(True)
        api.cert['managed']['state'] = 'PROVISIONING'
        api.entries[0]['labels'] = {'someone': 'else'}
        with self.assertRaisesRegex(ValueError, 'not ready'): d.tls_plan(api)
        self.assertEqual(api.writes, [])

    @patch.object(t, 'production_idle')
    def test_creates_only_one_host_certificate_and_entry_without_iam_dns_or_database(self, idle):
        api = Cloud()
        d.ensure_tls(api, d.tls_plan(api))
        self.assertEqual(len(api.writes), 2)
        self.assertEqual(api.writes[0][2]['managed'], {'domains': [d.HOST]})
        self.assertEqual(api.writes[1][2]['hostname'], d.HOST)
        self.assertEqual(idle.call_count, 2)

    @patch.object(d.time, 'sleep')
    @patch.object(t, 'production_idle')
    def test_unissued_tls_never_changes_routing(self, idle, sleep):
        api = Cloud()
        api.ready_after_create = False
        with self.assertRaisesRegex(RuntimeError, 'not ACTIVE'): d.ensure_tls(api, d.tls_plan(api))
        self.assertEqual(api.map, topology())
        self.assertTrue(all(url.startswith(d.CM) for _, url, _ in api.writes))

    @patch.object(t, 'production_idle', side_effect=ValueError('busy'))
    def test_busy_production_gate_prevents_first_write(self, idle):
        api = Cloud()
        with self.assertRaisesRegex(ValueError, 'busy'): d.ensure_tls(api, d.tls_plan(api))
        self.assertEqual(api.writes, [])


class Apply(unittest.TestCase):
    def record(self, api):
        return {'candidate': d.candidate_map(api.map), 'tls': d.tls_plan(api), 'target_revision': 'fixed', 'asset': 'bundle'}

    @patch.object(t, 'stable_revision', return_value=({}, {'metadata': {'name': 'fixed'}}, ''))
    @patch.object(t, 'production_idle')
    @patch.object(t, 'public_smoke', return_value='bundle')
    def test_applies_only_host_rules_and_tests_then_verifies_public_bundle(self, smoke, idle, revision):
        api = Cloud(True)
        before = deepcopy(api.map)
        d.apply(api, self.record(api), before)
        patch_body = api.writes[0][2]
        self.assertEqual(set(patch_body), {'fingerprint', 'hostRules', 'tests'})
        self.assertEqual(api.map['pathMatchers'], before['pathMatchers'])
        smoke.assert_called_once_with('https://' + d.HOST)

    def test_route_drift_before_apply_prevents_all_writes(self):
        api = Cloud()
        original = deepcopy(api.map)
        record = self.record(api)
        api.map['fingerprint'] = 'another-owner'
        with self.assertRaisesRegex(ValueError, 'changed after plan'): d.apply(api, record, original)
        self.assertEqual(api.writes, [])

    @patch.object(t, 'stable_revision', return_value=({}, {'metadata': {'name': 'fixed'}}, ''))
    @patch.object(t, 'production_idle')
    @patch.object(t, 'public_smoke', side_effect=ValueError('unavailable'))
    @patch.object(d.time, 'sleep')
    def test_failed_public_verification_restores_previous_routes(self, sleep, smoke, idle, revision):
        api = Cloud(True)
        before = deepcopy(api.map)
        with self.assertRaisesRegex(RuntimeError, 'previous routes restored'): d.apply(api, self.record(api), before)
        self.assertEqual(api.map['hostRules'], before['hostRules'])
        self.assertEqual(api.map['tests'], before['tests'])
        self.assertEqual(len(api.writes), 2)

    @patch.object(t, 'stable_revision', return_value=({}, {'metadata': {'name': 'fixed'}}, ''))
    @patch.object(t, 'production_idle', side_effect=[None, ValueError('later main or queue')])
    @patch.object(t, 'public_smoke', side_effect=ValueError('unavailable'))
    @patch.object(d.time, 'sleep')
    def test_owned_compensation_is_not_stranded_by_later_main_activity(self, sleep, smoke, idle, revision):
        api = Cloud(True)
        before = deepcopy(api.map)
        with self.assertRaisesRegex(RuntimeError, 'previous routes restored'): d.apply(api, self.record(api), before)
        self.assertEqual(api.map['hostRules'], before['hostRules'])
        self.assertEqual(api.map['tests'], before['tests'])
        self.assertEqual(idle.call_count, 1)

    @patch.object(t, 'stable_revision', return_value=({}, {'metadata': {'name': 'fixed'}}, ''))
    @patch.object(t, 'production_idle')
    def test_slow_public_failure_has_a_deadline_and_restores_without_another_retry(self, idle, revision):
        api = Cloud(True)
        before = deepcopy(api.map)
        clock = [0]
        def timeout(_):
            clock[0] += d.VERIFY_SECONDS + 1
            raise ValueError('timeout')
        with patch.object(d.time, 'monotonic', side_effect=lambda: clock[0]), patch.object(t, 'public_smoke', side_effect=timeout) as smoke:
            with self.assertRaisesRegex(RuntimeError, 'previous routes restored'): d.apply(api, self.record(api), before)
        self.assertEqual(smoke.call_count, 1)
        self.assertEqual(api.map['hostRules'], before['hostRules'])

    @patch.object(t, 'stable_revision', return_value=({}, {'metadata': {'name': 'fixed'}}, ''))
    @patch.object(t, 'production_idle')
    def test_slow_tls_preparation_cannot_start_a_late_route_write(self, idle, revision):
        api = Cloud(True)
        before = deepcopy(api.map)
        clock = [0]
        def slow(*_): clock[0] = d.ROUTE_WRITE_SECONDS + 1
        with patch.object(d.time, 'monotonic', side_effect=lambda: clock[0]), patch.object(d, 'ensure_tls', side_effect=slow):
            with self.assertRaisesRegex(RuntimeError, 'budget exhausted'): d.apply(api, self.record(api), before)
        self.assertEqual(api.writes, [])

    @patch.object(t, 'stable_revision', return_value=({}, {'metadata': {'name': 'fixed'}}, ''))
    @patch.object(t, 'production_idle')
    @patch.object(d.time, 'sleep')
    def test_concurrent_edit_during_failed_verification_is_not_overwritten(self, sleep, idle, revision):
        api = Cloud(True)
        before = deepcopy(api.map)
        def foreign(_):
            api.map['hostRules'][1]['hosts'].append('foreign.neture.co.kr')
            raise ValueError('unavailable')
        with patch.object(t, 'public_smoke', side_effect=foreign):
            with self.assertRaisesRegex(RuntimeError, 'no safe automatic'): d.apply(api, self.record(api), before)
        self.assertEqual(len(api.writes), 1)
        self.assertIn('foreign.neture.co.kr', api.map['hostRules'][1]['hosts'])


if __name__ == '__main__':
    unittest.main()
