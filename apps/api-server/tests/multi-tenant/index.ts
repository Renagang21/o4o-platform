/**
 * Multi-Tenant Simulation - Test Index
 * Exports all multi-tenant test utilities for easy import
 */

export {
    SERVICE_GROUPS,
    ServiceGroupConfig,
    getTotalTenantCount,
    getServiceGroup,
    getServiceGroupNames,
} from './config/service-groups.js';

export {
    TenantFactory,
    TenantConfig,
    SimulatedTenant,
    createTenantFactory,
} from './tenant-factory.js';

export {
    MultiTenantTestContext,
    setupMultiTenantTests,
    teardownMultiTenantTests,
    getTenant,
    getRepresentativeTenants,
} from './setup.js';
