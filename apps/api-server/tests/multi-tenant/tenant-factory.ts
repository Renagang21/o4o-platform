/**
 * Multi-Tenant Simulation - Tenant Factory
 * Phase 9 - Task 1.1
 * 
 * Factory for creating test tenants across multiple service groups
 */

import { DataSource } from 'typeorm';
import { SERVICE_GROUPS, ServiceGroupConfig } from './config/service-groups.js';

export interface TenantConfig {
    name: string;
    serviceGroup: string;
    template: string;
    initPack: string;
    theme: string;
    metadata?: Record<string, any>;
}

export interface SimulatedTenant {
    id: string;
    name: string;
    serviceGroup: string;
    template: string;
    initPack: string;
    theme: string;
    createdAt: Date;
    metadata: Record<string, any>;
}

/**
 * Tenant Factory - Creates and manages test tenants
 */
export class TenantFactory {
    private dataSource: DataSource;
    private createdTenants: SimulatedTenant[] = [];

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Create a single tenant with given configuration
     */
    async createTenant(config: TenantConfig): Promise<SimulatedTenant> {
        // Note: This is a placeholder - actual implementation would integrate
        // with the real tenant creation service

        const tenant: SimulatedTenant = {
            id: `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: config.name,
            serviceGroup: config.serviceGroup,
            template: config.template,
            initPack: config.initPack,
            theme: config.theme,
            createdAt: new Date(),
            metadata: config.metadata || {},
        };

        // Store in test registry
        this.createdTenants.push(tenant);

        console.log(`✅ Created tenant: ${tenant.name} (${tenant.serviceGroup})`);

        return tenant;
    }

    /**
     * Generate full multi-tenant simulation (15 tenants)
     * Returns array of all created tenants
     */
    async generateSimulation(): Promise<SimulatedTenant[]> {
        console.log('🚀 Starting Multi-Tenant Simulation Generation');
        console.log(`📊 Target: ${SERVICE_GROUPS.length} service groups`);
        console.log('');

        const tenants: SimulatedTenant[] = [];

        for (const group of SERVICE_GROUPS) {
            console.log(`\n📦 Creating ${group.serviceGroup} tenants (${group.tenantCount}x)...`);

            for (let i = 1; i <= group.tenantCount; i++) {
                const tenant = await this.createTenant({
                    name: `${group.serviceGroup}-tenant-${i}`,
                    serviceGroup: group.serviceGroup,
                    template: group.template,
                    initPack: group.initPack,
                    theme: group.theme,
                    metadata: {
                        description: group.description,
                        index: i,
                        totalInGroup: group.tenantCount,
                    },
                });

                tenants.push(tenant);
            }
        }

        console.log('\n✅ Multi-Tenant Simulation Complete');
        console.log(`   Total tenants created: ${tenants.length}`);
        console.log('');

        return tenants;
    }

    /**
     * Get tenants by service group
     */
    getTenantsByServiceGroup(serviceGroup: string): SimulatedTenant[] {
        return this.createdTenants.filter(t => t.serviceGroup === serviceGroup);
    }

    /**
     * Get all created tenants
     */
    getAllTenants(): SimulatedTenant[] {
        return [...this.createdTenants];
    }

    /**
     * Clean up all created tenants (for teardown)
     */
    async cleanup(): Promise<void> {
        console.log(`🧹 Cleaning up ${this.createdTenants.length} test tenants...`);

        // TODO: Implement actual cleanup logic
        // Would delete tenants from database, clean associated data, etc.

        this.createdTenants = [];
        console.log('✅ Cleanup complete');
    }

    /**
     * Get simulation statistics
     */
    getStatistics() {
        const byServiceGroup: Record<string, number> = {};

        for (const tenant of this.createdTenants) {
            byServiceGroup[tenant.serviceGroup] = (byServiceGroup[tenant.serviceGroup] || 0) + 1;
        }

        return {
            total: this.createdTenants.length,
            byServiceGroup,
            serviceGroups: Object.keys(byServiceGroup).length,
        };
    }
}

/**
 * Helper function to create tenant factory for tests
 */
export async function createTenantFactory(dataSource: DataSource): Promise<TenantFactory> {
    return new TenantFactory(dataSource);
}
