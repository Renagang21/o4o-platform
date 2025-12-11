/**
 * Multi-Tenant Simulation - Service Group Configurations
 * Phase 9 - Task 1.1
 * 
 * Defines configuration for 5 service groups used in multi-tenant testing
 */

export interface ServiceGroupConfig {
    serviceGroup: string;
    template: string;
    initPack: string;
    theme: string;
    tenantCount: number;
    description: string;
}

/**
 * Service Group Configurations for Multi-Tenant Simulation
 * Creates 15 total tenants (5 groups × 3 tenants each)
 */
export const SERVICE_GROUPS: ServiceGroupConfig[] = [
    {
        serviceGroup: 'cosmetics',
        template: 'cosmetics-retail',
        initPack: 'cosmetics-retail-init.json',
        theme: 'cosmetics-default',
        tenantCount: 3,
        description: 'Cosmetics retail stores with product listings and reviews',
    },
    {
        serviceGroup: 'yaksa',
        template: 'yaksa-branch',
        initPack: 'yaksa-branch-init.json',
        theme: 'yaksa-default',
        tenantCount: 3,
        description: 'Yaksa branches with member management and subscriptions',
    },
    {
        serviceGroup: 'tourist',
        template: 'tourist-guide',
        initPack: 'tourist-guide-init.json',
        theme: 'tourist-default',
        tenantCount: 3,
        description: 'Tourist guide services with locations and bookings',
    },
    {
        serviceGroup: 'sellerops',
        template: 'sellerops-dashboard',
        initPack: 'sellerops-init.json',
        theme: 'sellerops-default',
        tenantCount: 3,
        description: 'Seller operations dashboards with inventory and orders',
    },
    {
        serviceGroup: 'supplierops',
        template: 'supplierops-portal',
        initPack: 'supplierops-init.json',
        theme: 'supplierops-default',
        tenantCount: 3,
        description: 'Supplier portals with product catalog and fulfillment',
    },
];

/**
 * Get total number of tenants to be created
 */
export function getTotalTenantCount(): number {
    return SERVICE_GROUPS.reduce((sum, group) => sum + group.tenantCount, 0);
}

/**
 * Get service group configuration by name
 */
export function getServiceGroup(serviceGroup: string): ServiceGroupConfig | undefined {
    return SERVICE_GROUPS.find(g => g.serviceGroup === serviceGroup);
}

/**
 * Get all service group names
 */
export function getServiceGroupNames(): string[] {
    return SERVICE_GROUPS.map(g => g.serviceGroup);
}
