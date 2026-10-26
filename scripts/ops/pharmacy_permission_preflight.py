"""Read-only project testIamPermissions using the runner's existing WIF ADC."""
import json
from pathlib import Path
import os
import sys

PERMISSIONS = (
    'run.services.create', 'run.services.get', 'run.services.update', 'run.services.delete',
    'run.services.getIamPolicy', 'run.services.setIamPolicy',
    'compute.urlMaps.get', 'compute.urlMaps.update', 'compute.urlMaps.validate',
    'compute.backendServices.create', 'compute.backendServices.get', 'compute.backendServices.update', 'compute.backendServices.delete',
    'compute.regionNetworkEndpointGroups.create', 'compute.regionNetworkEndpointGroups.get', 'compute.regionNetworkEndpointGroups.delete', 'compute.regionNetworkEndpointGroups.use', 'compute.regionOperations.get', 'compute.globalOperations.get',
)


def summarize(data):
    granted = data.get('permissions', [])
    if not isinstance(granted, list) or any(not isinstance(item, str) or item not in PERMISSIONS for item in granted):
        raise ValueError('Unexpected permission response')
    return {'scope': 'project', 'granted': sorted(set(granted)),
            'missing': sorted(set(PERMISSIONS) - set(granted))}


def main():
    # Use the Google-auth library shipped with the trusted Cloud SDK, not token-printing commands.
    sdk_root = os.environ.get('PHARMACY_CLOUDSDK_ROOT', '')
    vendor = Path(sdk_root) / 'lib' / 'third_party'
    if not Path(sdk_root).is_absolute() or not vendor.is_dir():
        raise RuntimeError('Cloud SDK Python library unavailable')
    sys.path.insert(0, str(vendor))
    import google.auth
    from google.auth.transport.requests import AuthorizedSession
    from pharmacy_inventory_format import notice

    credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
    with AuthorizedSession(credentials) as session:
        response = session.post(
            'https://cloudresourcemanager.googleapis.com/v1/projects/netureyoutube:testIamPermissions',
            json={'permissions': list(PERMISSIONS)}, timeout=30,
        )
        if response.status_code != 200:
            raise RuntimeError('Permission preflight HTTP status ' + str(response.status_code))
        result = summarize(response.json())
    print(notice('permission-preflight', result))


if __name__ == '__main__':
    main()
