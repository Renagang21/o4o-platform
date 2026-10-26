"""Project non-secret GCP routing metadata and emit bounded GitHub notices."""
import json
import sys

URL_KEYS = frozenset({
    'name', 'hostRules', 'hosts', 'pathMatcher', 'pathMatchers',
    'defaultService', 'pathRules', 'paths', 'service', 'routeRules', 'priority',
    'defaultRouteAction', 'routeAction', 'weightedBackendServices', 'backendService', 'weight',
    'defaultUrlRedirect', 'urlRedirect', 'hostRedirect', 'pathRedirect', 'prefixRedirect',
    'stripQuery', 'httpsRedirect', 'redirectResponseCode',
})
BACKEND_KEYS = frozenset({'name', 'backends', 'group'})
LABELS = frozenset({'cloud-run', 'url-maps', 'backends', 'negs', 'permission-preflight'})


def keep_keys(value, keys):
    if isinstance(value, dict):
        return {key: keep_keys(item, keys) for key, item in value.items() if key in keys}
    if isinstance(value, list):
        return [keep_keys(item, keys) for item in value]
    return value


def project(label, data):
    if label not in LABELS:
        raise ValueError('Unsupported inventory resource')
    if label in {'url-maps', 'backends'}:
        if not isinstance(data, list):
            raise ValueError('Expected resource list')
        for item in data:
            if not isinstance(item, dict) or not isinstance(item.get('name'), str):
                raise ValueError('Missing resource name')
            if label == 'url-maps' and item['name'] == 'o4o-global-lb' and not isinstance(item.get('hostRules'), list):
                raise ValueError('Missing load balancer host rules')
            if label == 'backends' and item['name'] == 'backend-kpa-society-web' and not isinstance(item.get('backends'), list):
                raise ValueError('Missing pharmacy backend groups')
        data = keep_keys(data, URL_KEYS if label == 'url-maps' else BACKEND_KEYS)
    return {'resource': label, 'metadata': data}


def notice(label, data):
    payload = json.dumps(project(label, data), separators=(',', ':'))
    if len(payload) >= 60000:
        raise ValueError('Inventory record too large')
    escaped = payload.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
    return '::notice title=Pharmacy runtime inventory::' + escaped


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: pharmacy_inventory_format.py <resource>')
    print(notice(sys.argv[1], json.load(sys.stdin)))
