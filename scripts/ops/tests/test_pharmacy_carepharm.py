"""CarePharm routing changes preserve shared hosts and fail closed on drift."""
from copy import deepcopy
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).parents[1]))
import carepharm_transition as c
import pharmacy_transition as t

OLD = 'https://www.googleapis.com/compute/v1/projects/netureyoutube/global/backendServices/backend-neture-web-http'
NEW = t.backend_link(t.NEW)


def topology():
    return {'fingerprint': 'v1', 'hostRules': [
        {'hosts': ['supplier.neture.co.kr', c.HOST, 'community.neture.co.kr'], 'pathMatcher': c.NETURE_MATCHER},
        {'hosts': sorted(t.HOSTS), 'pathMatcher': t.MATCHER}],
        'pathMatchers': [{'name': c.NETURE_MATCHER, 'defaultService': OLD}, {'name': t.MATCHER, 'defaultService': NEW}],
        'tests': [{'host': c.HOST, 'path': '/', 'service': OLD}, {'host': 'supplier.neture.co.kr', 'path': '/', 'service': OLD}]}


class Routing(unittest.TestCase):
    def test_cutover_splits_only_carepharm_and_updates_its_test(self):
        source = topology()
        candidate = c.candidate_map(source, NEW, OLD)
        self.assertEqual(source, topology())
        self.assertEqual(candidate['hostRules'][0]['hosts'], ['supplier.neture.co.kr', 'community.neture.co.kr'])
        self.assertEqual(candidate['hostRules'][1], source['hostRules'][1])
        self.assertEqual(c.host_matcher(candidate), {'name': c.MATCHER, 'defaultService': NEW})
        self.assertEqual(candidate['tests'][0]['service'], NEW)
        self.assertEqual(candidate['tests'][1], source['tests'][1])
        # Retirement's exact pharmacy/megapharm host contract stays valid.
        self.assertEqual(t.routed_matcher(candidate, t.NEW), source['pathMatchers'][1])

    def test_rollback_keeps_other_hosts_and_no_stale_matcher(self):
        forward = c.candidate_map(topology(), NEW, OLD)
        back = c.candidate_map(forward, NEW, OLD, rollback=True)
        self.assertEqual(c.host_matcher(back), {'name': c.NETURE_MATCHER, 'defaultService': OLD})
        self.assertFalse(any(m['name'] == c.MATCHER for m in back['pathMatchers']))
        self.assertEqual(back['tests'], topology()['tests'])
        self.assertEqual(back['hostRules'][0], forward['hostRules'][0])

    def test_duplicate_host_unknown_source_and_existing_matcher_are_rejected(self):
        for mutation in ('duplicate', 'backend', 'matcher', 'path-rule'):
            with self.subTest(mutation=mutation):
                source = topology()
                if mutation == 'duplicate': source['hostRules'].append({'hosts': [c.HOST], 'pathMatcher': c.NETURE_MATCHER})
                if mutation == 'backend': source['pathMatchers'][0]['defaultService'] = 'unreviewed'
                if mutation == 'matcher': source['pathMatchers'].append({'name': c.MATCHER, 'defaultService': NEW})
                if mutation == 'path-rule': source['pathMatchers'][0]['pathRules'] = []
                with self.assertRaises(ValueError): c.candidate_map(source, NEW, OLD)

    def test_rollback_refuses_other_users_of_carepharm_matcher(self):
        source = c.candidate_map(topology(), NEW, OLD)
        source['hostRules'][-1]['hosts'].append('other.example.test')
        with self.assertRaises(ValueError): c.candidate_map(source, NEW, OLD, rollback=True)

    def test_drift_prevents_write_and_public_failure_restores_previous_map(self):
        class API:
            def __init__(self): self.map = topology(); self.writes = []
            def request(self, method, url): return deepcopy(self.map)
            def compute_operation(self, method, url, body):
                self.writes.append(deepcopy(body)); self.map.update(deepcopy(body)); self.map['fingerprint'] += '-next'
        api = API(); original = topology()
        record = {'candidate': c.candidate_map(original, NEW, OLD), 'mode': 'carepharm-cutover', 'target_revision': 'ready', 'asset': 'expected'}
        api.map['fingerprint'] = 'drift'
        with self.assertRaises(ValueError): c.apply(api, record, original)
        self.assertEqual(api.writes, [])
        api.map = topology()
        with patch.object(t, 'stable_revision', return_value=({}, {'metadata': {'name': 'ready'}}, 'digest')), patch.object(t, 'production_idle') as gate, patch.object(t, 'public_smoke', return_value='wrong'), patch.object(c.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, 'previous routing restored'): c.apply(api, record, original)
            gate.assert_called_once()
        self.assertEqual(len(api.writes), 2)
        self.assertEqual(c.host_matcher(api.map), c.host_matcher(original))
        self.assertEqual(api.map['tests'], original['tests'])

    def test_failed_smoke_never_overwrites_concurrent_map_edit(self):
        original = topology(); candidate = c.candidate_map(original, NEW, OLD)
        class API:
            def __init__(self): self.map = deepcopy(original); self.writes = []
            def request(self, method, url): return deepcopy(self.map)
            def compute_operation(self, method, url, body): self.writes.append(body); self.map.update(deepcopy(body))
        api = API()
        def changed_smoke(url):
            api.map['hostRules'][0]['hosts'].append('new.example.test')
            raise ValueError('failed')
        record = {'candidate': candidate, 'mode': 'carepharm-cutover', 'target_revision': 'ready', 'asset': 'expected'}
        with patch.object(t, 'stable_revision', return_value=({}, {'metadata': {'name': 'ready'}}, 'digest')), patch.object(t, 'production_idle'), patch.object(t, 'public_smoke', side_effect=changed_smoke), patch.object(c.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, 'concurrent routing edit'): c.apply(api, record, original)
        self.assertEqual(len(api.writes), 1)

    def test_plan_requires_exact_main_image_and_only_validates(self):
        class API:
            def __init__(self): self.calls = []
            def request(self, method, url, body=None):
                self.calls.append((method, url))
                if url == t.MAP: return topology()
                if url == NEW: return {'loadBalancingScheme': 'EXTERNAL_MANAGED'}
                if url == t.MAP + '/validate': return {'result': {'loadSucceeded': True, 'testPassed': True}}
                raise AssertionError(url)
        sha = 'a' * 40
        service = {'spec': {'template': {'spec': {'containers': [{'image': f'gcr.io/{t.PROJECT}/{t.NEW}:' + sha}]}}}, 'status': {'url': 'https://new.example.test'}}
        stable = (service, {'metadata': {'name': 'new-ready'}}, f'gcr.io/{t.PROJECT}/{t.NEW}@sha256:' + 'b' * 64)
        api = API()
        with patch.dict(c.os.environ, {'GITHUB_SHA': sha}), patch.object(t, 'stable_revision', return_value=stable), patch.object(t, 'public_smoke', return_value='asset'):
            record, fingerprint, _ = c.plan(api)
            self.assertEqual(record['target_revision'], 'new-ready')
            self.assertEqual(len(fingerprint), 64)
            self.assertEqual([m for m, _ in api.calls if m != 'GET'], ['POST'])
        with patch.dict(c.os.environ, {'GITHUB_SHA': 'c' * 40}), patch.object(t, 'stable_revision', return_value=stable):
            with self.assertRaisesRegex(ValueError, 'exact reviewed main image'): c.plan(API())
