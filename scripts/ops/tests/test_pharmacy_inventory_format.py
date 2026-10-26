import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('inventory_format', Path(__file__).parents[1] / 'pharmacy_inventory_format.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class InventoryProjectionTests(unittest.TestCase):
    def test_nested_routes_keep_links_and_exclude_free_text_and_headers(self):
        data = [{'name': 'o4o-global-lb', 'description': 'excluded-marker',
                 'hostRules': [{'hosts': ['pharmacy.example.test'], 'pathMatcher': 'app', 'description': 'excluded-marker'}],
                 'pathMatchers': [{'name': 'app', 'defaultService': 'backend-app',
                                   'routeRules': [{'priority': 1, 'routeAction': {
                                       'weightedBackendServices': [{'backendService': 'backend-canary', 'weight': 10}],
                                       'requestHeadersToAdd': [{'headerValue': 'excluded-marker'}]}}]}]}]
        result = module.project('url-maps', data)
        self.assertNotIn('excluded-marker', json.dumps(result))
        self.assertEqual(result['metadata'][0]['hostRules'][0]['pathMatcher'], 'app')
        weighted = result['metadata'][0]['pathMatchers'][0]['routeRules'][0]['routeAction']['weightedBackendServices']
        self.assertEqual(weighted, [{'backendService': 'backend-canary', 'weight': 10}])

    def test_backend_groups_survive_without_unrequested_fields(self):
        data = [{'name': 'backend-kpa-society-web', 'description': 'excluded-marker',
                 'backends': [{'group': 'neg-app', 'description': 'excluded-marker'}]}]
        self.assertEqual(module.project('backends', data)['metadata'],
                         [{'name': 'backend-kpa-society-web', 'backends': [{'group': 'neg-app'}]}])

    def test_incomplete_previous_list_projections_are_rejected(self):
        for label, name in [('url-maps', 'o4o-global-lb'), ('backends', 'backend-kpa-society-web')]:
            with self.subTest(label=label), self.assertRaises(ValueError):
                module.project(label, [{'name': name}])

    def test_notice_roundtrip_and_size_limit(self):
        data = {'metadata': {'name': 'fixture%value\nline'}}
        emitted = module.notice('cloud-run', data).split('::', 2)[-1]
        decoded = emitted.replace('%0A', '\n').replace('%0D', '\r').replace('%25', '%')
        self.assertEqual(json.loads(decoded)['metadata'], data)
        with self.assertRaises(ValueError):
            module.notice('cloud-run', {'metadata': {'name': 'x' * 61000}})

    def test_unsupported_labels_and_wrong_shapes_fail(self):
        with self.assertRaises(ValueError):
            module.project('unknown', [])
        with self.assertRaises(ValueError):
            module.project('url-maps', {})


class PermissionResponseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        permission_spec = importlib.util.spec_from_file_location('permission_preflight', Path(__file__).parents[1] / 'pharmacy_permission_preflight.py')
        cls.permissions = importlib.util.module_from_spec(permission_spec)
        permission_spec.loader.exec_module(cls.permissions)

    def test_missing_permissions_are_reported_without_granting_or_hiding_them(self):
        result = self.permissions.summarize({'permissions': ['run.services.get']})
        self.assertEqual(result['granted'], ['run.services.get'])
        self.assertIn('run.services.setIamPolicy', result['missing'])
        self.assertEqual(set(result['granted']) | set(result['missing']), set(self.permissions.PERMISSIONS))

    def test_permissions_target_regional_serverless_negs(self):
        required = self.permissions.PERMISSIONS
        self.assertIn('compute.regionNetworkEndpointGroups.create', required)
        self.assertIn('compute.regionNetworkEndpointGroups.delete', required)
        self.assertIn('compute.regionOperations.get', required)
        self.assertFalse(any(item.startswith('compute.networkEndpointGroups.') for item in required))

    def test_unrequested_permissions_and_wrong_shapes_are_rejected(self):
        for data in [{'permissions': ['unexpected.permission']}, {'permissions': 'run.services.get'}]:
            with self.subTest(data=data), self.assertRaises(ValueError):
                self.permissions.summarize(data)


if __name__ == '__main__':
    unittest.main()
