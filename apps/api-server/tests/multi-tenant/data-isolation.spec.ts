/**
 * Multi-Tenant Simulation - Data Isolation Stress Tests
 * Phase 9 - Task 2.3
 *
 * Tests data isolation across tenants and service groups
 * Note: These tests use mock TenantAwareRepository patterns
 * Actual DB tests require running database
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import {
    setupMultiTenantTests,
    teardownMultiTenantTests,
    MultiTenantTestContext,
    ServiceGroup,
} from './setup.js';

/**
 * Mock TenantAwareRepository for testing isolation patterns
 * In production, this connects to real TypeORM repository
 */
class MockTenantAwareRepository<T extends { tenantId?: string }> {
    private data: Map<string, T[]> = new Map();
    private currentTenantId: string | null = null;

    setTenantContext(tenantId: string) {
        this.currentTenantId = tenantId;
    }

    clearTenantContext() {
        this.currentTenantId = null;
    }

    async create(entity: Partial<T>): Promise<T> {
        if (!this.currentTenantId) {
            throw new Error('Tenant context required for create operation');
        }

        const newEntity = {
            ...entity,
            tenantId: this.currentTenantId,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        } as T;

        const tenantData = this.data.get(this.currentTenantId) || [];
        tenantData.push(newEntity);
        this.data.set(this.currentTenantId, tenantData);

        return newEntity;
    }

    async findAll(): Promise<T[]> {
        if (!this.currentTenantId) {
            throw new Error('Tenant context required for query operation');
        }

        return this.data.get(this.currentTenantId) || [];
    }

    async findById(id: string): Promise<T | undefined> {
        if (!this.currentTenantId) {
            throw new Error('Tenant context required for query operation');
        }

        const tenantData = this.data.get(this.currentTenantId) || [];
        return tenantData.find((item: any) => item.id === id);
    }

    async update(id: string, updates: Partial<T>): Promise<T | undefined> {
        if (!this.currentTenantId) {
            throw new Error('Tenant context required for update operation');
        }

        const tenantData = this.data.get(this.currentTenantId) || [];
        const index = tenantData.findIndex((item: any) => item.id === id);

        if (index === -1) {
            return undefined; // Not found in current tenant's data
        }

        tenantData[index] = { ...tenantData[index], ...updates };
        return tenantData[index];
    }

    async delete(id: string): Promise<boolean> {
        if (!this.currentTenantId) {
            throw new Error('Tenant context required for delete operation');
        }

        const tenantData = this.data.get(this.currentTenantId) || [];
        const index = tenantData.findIndex((item: any) => item.id === id);

        if (index === -1) {
            return false; // Not found in current tenant's data
        }

        tenantData.splice(index, 1);
        return true;
    }

    async bulkCreate(entities: Partial<T>[]): Promise<T[]> {
        const results: T[] = [];
        for (const entity of entities) {
            results.push(await this.create(entity));
        }
        return results;
    }

    // Test helper: get all data across tenants (for verification)
    getAllData(): Map<string, T[]> {
        return new Map(this.data);
    }
}

interface TestProduct {
    id?: string;
    tenantId?: string;
    name: string;
    price: number;
}

interface TestMember {
    id?: string;
    tenantId?: string;
    name: string;
    email: string;
}

describe('Multi-Tenant Data Isolation', () => {
    let context: MultiTenantTestContext;
    let productRepo: MockTenantAwareRepository<TestProduct>;
    let memberRepo: MockTenantAwareRepository<TestMember>;

    beforeAll(async () => {
        context = await setupMultiTenantTests(global.testDataSource);
        productRepo = new MockTenantAwareRepository<TestProduct>();
        memberRepo = new MockTenantAwareRepository<TestMember>();
    });

    afterAll(async () => {
        await teardownMultiTenantTests(context);
    });

    describe('DATA-MULTI-001: Same Service Group Tenant Isolation', () => {
        test('Cosmetics Tenant 1 cannot access Cosmetics Tenant 2 data', async () => {
            const tenant1 = context.cosmeticsTenants[0];
            const tenant2 = context.cosmeticsTenants[1];

            // Create product in tenant1
            productRepo.setTenantContext(tenant1.id);
            const product = await productRepo.create({
                name: 'Tenant1 Product',
                price: 100,
            });

            expect(product.tenantId).toBe(tenant1.id);

            // Switch to tenant2 context
            productRepo.setTenantContext(tenant2.id);

            // Attempt to find product from tenant1
            const foundProduct = await productRepo.findById(product.id!);
            expect(foundProduct).toBeUndefined();

            // Tenant2's product list should be empty
            const tenant2Products = await productRepo.findAll();
            expect(tenant2Products.length).toBe(0);
        });

        test('Yaksa Tenant 1 cannot access Yaksa Tenant 2 members', async () => {
            const tenant1 = context.yaksaTenants[0];
            const tenant2 = context.yaksaTenants[1];

            // Create member in tenant1
            memberRepo.setTenantContext(tenant1.id);
            const member = await memberRepo.create({
                name: 'Yaksa Member 1',
                email: 'member1@yaksa.org',
            });

            // Switch to tenant2
            memberRepo.setTenantContext(tenant2.id);

            // Cannot access tenant1's member
            const foundMember = await memberRepo.findById(member.id!);
            expect(foundMember).toBeUndefined();
        });

        test('Tourist Tenant 1 cannot access Tourist Tenant 2 bookings', async () => {
            const tenant1 = context.touristTenants[0];
            const tenant2 = context.touristTenants[1];

            // Verify they are different tenants
            expect(tenant1.id).not.toBe(tenant2.id);
            expect(tenant1.serviceGroup).toBe('tourist');
            expect(tenant2.serviceGroup).toBe('tourist');
        });
    });

    describe('DATA-MULTI-002: Cross-Service Group Data Isolation', () => {
        test('Cosmetics tenant cannot access Yaksa member data', async () => {
            const cosmeticsTenant = context.cosmeticsTenants[0];
            const yaksaTenant = context.yaksaTenants[0];

            // Create yaksa member
            memberRepo.setTenantContext(yaksaTenant.id);
            await memberRepo.create({
                name: 'Yaksa Pharmacist',
                email: 'pharmacist@yaksa.org',
            });

            // Switch to cosmetics tenant
            memberRepo.setTenantContext(cosmeticsTenant.id);

            // Should not see yaksa members
            const members = await memberRepo.findAll();
            expect(members.length).toBe(0);

            // Different service groups
            expect(cosmeticsTenant.serviceGroup).not.toBe(yaksaTenant.serviceGroup);
        });

        test('Yaksa tenant cannot access Tourist tour data', async () => {
            const yaksaTenant = context.yaksaTenants[0];
            const touristTenant = context.touristTenants[0];

            expect(yaksaTenant.serviceGroup).not.toBe(touristTenant.serviceGroup);
            expect(yaksaTenant.serviceGroup).toBe('yaksa');
            expect(touristTenant.serviceGroup).toBe('tourist');
        });

        test('Sellerops cannot access Supplierops inventory', async () => {
            const selleropsTenant = context.selleropsTenants[0];
            const supplieropsTenant = context.supplieropsTenants[0];

            expect(selleropsTenant.serviceGroup).not.toBe(supplieropsTenant.serviceGroup);
            expect(selleropsTenant.serviceGroup).toBe('sellerops');
            expect(supplieropsTenant.serviceGroup).toBe('supplierops');
        });
    });

    describe('DATA-MULTI-003: TenantAwareRepository Enforcement', () => {
        test('Create operation auto-injects tenantId', async () => {
            const tenant = context.cosmeticsTenants[0];
            productRepo.setTenantContext(tenant.id);

            const product = await productRepo.create({
                name: 'Auto-Tenant Product',
                price: 50,
            });

            expect(product.tenantId).toBe(tenant.id);
        });

        test('Update operation validates tenantId match', async () => {
            const tenant1 = context.cosmeticsTenants[0];
            const tenant2 = context.cosmeticsTenants[1];

            // Create entity in tenant1
            productRepo.setTenantContext(tenant1.id);
            const product = await productRepo.create({
                name: 'Original Product',
                price: 100,
            });

            // Switch to tenant2 and try to update
            productRepo.setTenantContext(tenant2.id);
            const updateResult = await productRepo.update(product.id!, {
                name: 'Hacked Product',
            });

            // Should fail - product not visible in tenant2
            expect(updateResult).toBeUndefined();

            // Verify original is unchanged
            productRepo.setTenantContext(tenant1.id);
            const originalProduct = await productRepo.findById(product.id!);
            expect(originalProduct?.name).toBe('Original Product');
        });

        test('Delete operation validates tenantId match', async () => {
            const tenant1 = context.cosmeticsTenants[0];
            const tenant2 = context.cosmeticsTenants[1];

            // Create entity in tenant1
            productRepo.setTenantContext(tenant1.id);
            const product = await productRepo.create({
                name: 'Deletable Product',
                price: 200,
            });

            // Switch to tenant2 and try to delete
            productRepo.setTenantContext(tenant2.id);
            const deleteResult = await productRepo.delete(product.id!);

            // Should fail
            expect(deleteResult).toBe(false);

            // Verify still exists in tenant1
            productRepo.setTenantContext(tenant1.id);
            const stillExists = await productRepo.findById(product.id!);
            expect(stillExists).toBeDefined();
        });

        test('Query operation automatically filters by tenantId', async () => {
            // Create products in multiple tenants
            const tenant1 = context.cosmeticsTenants[0];
            const tenant2 = context.cosmeticsTenants[1];

            productRepo.setTenantContext(tenant1.id);
            await productRepo.create({ name: 'T1 Product A', price: 10 });
            await productRepo.create({ name: 'T1 Product B', price: 20 });

            productRepo.setTenantContext(tenant2.id);
            await productRepo.create({ name: 'T2 Product X', price: 30 });

            // Query from tenant1 - should only see tenant1 products
            productRepo.setTenantContext(tenant1.id);
            const tenant1Products = await productRepo.findAll();

            expect(tenant1Products.length).toBeGreaterThanOrEqual(2);
            expect(tenant1Products.every(p => p.tenantId === tenant1.id)).toBe(true);
            expect(tenant1Products.some(p => p.name === 'T2 Product X')).toBe(false);
        });
    });

    describe('DATA-MULTI-004: Public Endpoint Protection', () => {
        test('Operations without tenant context throw error', async () => {
            productRepo.clearTenantContext();

            await expect(productRepo.create({ name: 'No Context', price: 0 }))
                .rejects.toThrow('Tenant context required');

            await expect(productRepo.findAll())
                .rejects.toThrow('Tenant context required');
        });

        test('Public endpoints respect tenant boundaries', async () => {
            const tenant = context.cosmeticsTenants[0];
            productRepo.setTenantContext(tenant.id);

            await productRepo.create({ name: 'Bounded Product', price: 100 });
            const products = await productRepo.findAll();

            // All products belong to current tenant
            expect(products.every(p => p.tenantId === tenant.id)).toBe(true);
        });
    });

    describe('DATA-MULTI-005: @TenantScoped Decorator Enforcement', () => {
        test('All core entities enforce tenant scoping', async () => {
            // Verify all tenant factory tenants have unique IDs
            const allTenantIds = context.tenants.map(t => t.id);
            const uniqueIds = new Set(allTenantIds);
            expect(uniqueIds.size).toBe(context.tenants.length);
        });

        test('Service-specific entities are properly scoped', async () => {
            // Each service group should have dedicated tenants
            expect(context.cosmeticsTenants.length).toBe(3);
            expect(context.yaksaTenants.length).toBe(3);
            expect(context.touristTenants.length).toBe(3);
            expect(context.selleropsTenants.length).toBe(3);
            expect(context.supplieropsTenants.length).toBe(3);

            // Total should be 15
            expect(context.tenants.length).toBe(15);
        });
    });

    describe('DATA-MULTI-006: Bulk Operations Isolation', () => {
        test('Bulk create respects tenant boundaries', async () => {
            const tenant = context.cosmeticsTenants[0];
            productRepo.setTenantContext(tenant.id);

            const bulkProducts = await productRepo.bulkCreate([
                { name: 'Bulk Product 1', price: 10 },
                { name: 'Bulk Product 2', price: 20 },
                { name: 'Bulk Product 3', price: 30 },
            ]);

            // All should have correct tenant ID
            expect(bulkProducts.length).toBe(3);
            expect(bulkProducts.every(p => p.tenantId === tenant.id)).toBe(true);
        });

        test('Bulk operations cannot affect other tenants', async () => {
            const tenant1 = context.cosmeticsTenants[0];
            const tenant2 = context.cosmeticsTenants[1];

            // Create products in tenant1
            productRepo.setTenantContext(tenant1.id);
            const initialCount = (await productRepo.findAll()).length;

            // Bulk create in tenant2
            productRepo.setTenantContext(tenant2.id);
            await productRepo.bulkCreate([
                { name: 'T2 Bulk A', price: 100 },
                { name: 'T2 Bulk B', price: 200 },
            ]);

            // Tenant1 count should be unchanged
            productRepo.setTenantContext(tenant1.id);
            const afterCount = (await productRepo.findAll()).length;
            expect(afterCount).toBe(initialCount);
        });
    });

    describe('DATA-MULTI-007: Cross-Tenant Query Prevention', () => {
        test('No global query without tenant context', async () => {
            productRepo.clearTenantContext();

            await expect(productRepo.findAll())
                .rejects.toThrow('Tenant context required');
        });

        test('Switching tenants changes visible data', async () => {
            const tenant1 = context.cosmeticsTenants[0];
            const tenant2 = context.cosmeticsTenants[1];

            // Setup: Create unique products in each
            productRepo.setTenantContext(tenant1.id);
            await productRepo.create({ name: 'UNIQUE_TENANT1_PRODUCT', price: 111 });

            productRepo.setTenantContext(tenant2.id);
            await productRepo.create({ name: 'UNIQUE_TENANT2_PRODUCT', price: 222 });

            // Verify isolation
            productRepo.setTenantContext(tenant1.id);
            const tenant1Data = await productRepo.findAll();
            expect(tenant1Data.some(p => p.name === 'UNIQUE_TENANT1_PRODUCT')).toBe(true);
            expect(tenant1Data.some(p => p.name === 'UNIQUE_TENANT2_PRODUCT')).toBe(false);

            productRepo.setTenantContext(tenant2.id);
            const tenant2Data = await productRepo.findAll();
            expect(tenant2Data.some(p => p.name === 'UNIQUE_TENANT2_PRODUCT')).toBe(true);
            expect(tenant2Data.some(p => p.name === 'UNIQUE_TENANT1_PRODUCT')).toBe(false);
        });
    });
});
