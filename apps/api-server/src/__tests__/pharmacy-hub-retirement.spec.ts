jest.mock('../../../../services/web-store/src/lib/apiClient', () => ({ API_BASE_URL: 'https://api.example' }));

import { getJoinableServices, getService, getServiceOrigin, getServicePublicOrigin } from '../config/service-catalog';
import { resolveSessionServiceKey } from '../utils/session-origin';
import { resolveOperatorRole } from '../config/operator-role-catalog';
import { getCommunityDefinition, communityKeyForServiceEntry, communityKeyForForumStorageCode } from '../config/community-catalog';
import { listSupplierContentHandoffTargets } from '../modules/neture/constants/supplier-content-handoff-targets';
import { SUPPLIER_VISIBLE_FULFILLMENT_SERVICE_KEYS } from '../modules/neture/constants/fulfillment-service-scope';
import { isUnifiedServiceKey, pickCommonServiceContext, SERVICE_API_PREFIX } from '../../../../services/web-store/src/lib/serviceContext';
import { getStoreWorkspacePathsForService } from '../../../../packages/store-ui-core/src/workspace/storeWorkspace';

describe('Pharmacy Hub retirement', () => {
  it('retired membership cannot produce a PH join, handoff origin, public origin or operator assignment', () => {
    expect(getService('pharmacy-hub')).toBeUndefined();
    expect(getServiceOrigin('pharmacy-hub')).toBeUndefined();
    expect(getServicePublicOrigin('pharmacy-hub')).toBeUndefined();
    expect(getJoinableServices().some(service => service.key === 'pharmacy-hub')).toBe(false);
    expect(resolveSessionServiceKey('https://pharmacyhub.co.kr')).toBeNull();
    expect(resolveSessionServiceKey('https://www.pharmacyhub.co.kr')).toBeNull();
    for (const role of ['pharmacy-hub:admin', 'pharmacy-hub:operator']) {
      expect(() => resolveOperatorRole(role, 'pharmacy-hub')).toThrow('부여할 수 없는 역할');
    }
  });

  it('Store never selects a retired PH API even with a remaining historical enrollment', () => {
    expect(isUnifiedServiceKey('pharmacy-hub')).toBe(false);
    expect(pickCommonServiceContext(['pharmacy-hub'])).toBeNull();
    expect(pickCommonServiceContext(['pharmacy-hub', 'kpa-society'])).toBe('kpa-society');
    expect(SERVICE_API_PREFIX).not.toHaveProperty('pharmacy-hub');
    expect(getStoreWorkspacePathsForService('pharmacy-hub')).toBeNull();
    expect(getStoreWorkspacePathsForService('kpa-society')).not.toBeNull();
  });

  it('PH is not a new supplier content destination; historical orders and pharmacist forum data remain visible', () => {
    expect(listSupplierContentHandoffTargets().map(target => target.key)).not.toContain('pharmacy-hub');
    expect(SUPPLIER_VISIBLE_FULFILLMENT_SERVICE_KEYS).toContain('pharmacy-hub');
    expect(getCommunityDefinition('pharmacy')?.forumStorageCodes).toContain('pharmacy-hub');
    expect(communityKeyForServiceEntry('pharmacy-hub')).toBeUndefined();
    expect(communityKeyForForumStorageCode('pharmacy-hub')).toBe('pharmacy');
  });

  it('current Store and independent service origins and operator scopes remain intact', () => {
    expect(resolveSessionServiceKey('https://store.neture.co.kr')).toBe('store');
    expect(getServicePublicOrigin('kpa-society')).toBe('https://pharmacy.neture.co.kr');
    expect(getServicePublicOrigin('community')).toBe('https://community.neture.co.kr');
    expect(resolveOperatorRole('supplier:operator', 'supplier').serviceKey).toBe('supplier');
    expect(resolveOperatorRole('funding:operator', 'funding').serviceKey).toBe('funding');
  });
});
