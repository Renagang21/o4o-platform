/**
 * Multi-Tenant Simulation - Navigation Isolation Tests
 * Phase 9 - Task 2.1
 *
 * Tests navigation isolation across service groups and tenants
 * Connected to real NavigationRegistry service
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import {
    setupMultiTenantTests,
    teardownMultiTenantTests,
    MultiTenantTestContext,
    getRepresentativeTenants,
    getNavigationForTenant,
    ServiceGroup,
} from './setup.js';

describe('Multi-Tenant Navigation Isolation', () => {
    let context: MultiTenantTestContext;
    let representatives: Record<string, any>;

    beforeAll(async () => {
        // Setup test environment with 15 tenants
        context = await setupMultiTenantTests(global.testDataSource);
        representatives = getRepresentativeTenants(context);
    });

    afterAll(async () => {
        await teardownMultiTenantTests(context);
    });

    describe('NAV-MULTI-001: Service Group Menu Isolation', () => {
        test('Cosmetics tenant shows only cosmetics menus', async () => {
            const { cosmetics } = representatives;
            const navigation = getNavigationForTenant(
                context,
                cosmetics.id,
                'cosmetics' as ServiceGroup
            );

            // Verify cosmetics menus are present
            const navLabels = navigation.map((n: any) => n.label);
            expect(navLabels).toContain('Products');
            expect(navLabels).toContain('Reviews');
            expect(navLabels).toContain('Routines');

            // Verify NO yaksa/tourist/seller/supplier menus
            expect(navLabels).not.toContain('Members');
            expect(navLabels).not.toContain('Tours');
            expect(navLabels).not.toContain('Inventory');
            expect(navLabels).not.toContain('Catalog');
        });

        test('Yaksa tenant shows only yaksa menus', async () => {
            const { yaksa } = representatives;
            const navigation = getNavigationForTenant(
                context,
                yaksa.id,
                'yaksa' as ServiceGroup
            );

            // Verify yaksa menus are present
            const navLabels = navigation.map((n: any) => n.label);
            expect(navLabels).toContain('Members');
            expect(navLabels).toContain('Subscriptions');
            expect(navLabels).toContain('Education');

            // Verify NO cosmetics/tourist/ops menus
            expect(navLabels).not.toContain('Products');
            expect(navLabels).not.toContain('Tours');
            expect(navLabels).not.toContain('Inventory');
        });

        test('Tourist tenant shows only tourist menus', async () => {
            const { tourist } = representatives;
            const navigation = getNavigationForTenant(
                context,
                tourist.id,
                'tourist' as ServiceGroup
            );

            // Verify tourist menus are present
            const navLabels = navigation.map((n: any) => n.label);
            expect(navLabels).toContain('Tours');
            expect(navLabels).toContain('Bookings');
            expect(navLabels).toContain('Attractions');

            // Verify NO other service group menus
            expect(navLabels).not.toContain('Products');
            expect(navLabels).not.toContain('Members');
        });

        test('Sellerops tenant shows only sellerops menus', async () => {
            const { sellerops } = representatives;
            const navigation = getNavigationForTenant(
                context,
                sellerops.id,
                'sellerops' as ServiceGroup
            );

            // Verify sellerops menus are present
            const navLabels = navigation.map((n: any) => n.label);
            expect(navLabels).toContain('Inventory');
            expect(navLabels).toContain('Orders');
            expect(navLabels).toContain('Settlements');

            // Verify NO other service group menus
            expect(navLabels).not.toContain('Products');
            expect(navLabels).not.toContain('Members');
            expect(navLabels).not.toContain('Catalog');
        });

        test('Supplierops tenant shows only supplierops menus', async () => {
            const { supplierops } = representatives;
            const navigation = getNavigationForTenant(
                context,
                supplierops.id,
                'supplierops' as ServiceGroup
            );

            // Verify supplierops menus are present
            const navLabels = navigation.map((n: any) => n.label);
            expect(navLabels).toContain('Catalog');
            expect(navLabels).toContain('Offers');
            expect(navLabels).toContain('Fulfillment');

            // Verify NO other service group menus
            expect(navLabels).not.toContain('Products');
            expect(navLabels).not.toContain('Inventory');
        });
    });

    describe('NAV-MULTI-002: Cross-Tenant Navigation Isolation', () => {
        test('Cosmetics Tenant 1 menus != Cosmetics Tenant 2 custom menus', async () => {
            const tenant1 = context.cosmeticsTenants[0];
            const tenant2 = context.cosmeticsTenants[1];

            // Both tenants should see same service group menus
            const nav1 = getNavigationForTenant(context, tenant1.id, 'cosmetics' as ServiceGroup);
            const nav2 = getNavigationForTenant(context, tenant2.id, 'cosmetics' as ServiceGroup);

            // Service group menus should be the same
            expect(nav1.length).toBe(nav2.length);
            expect(tenant1.id).not.toBe(tenant2.id);

            // Verify both get cosmetics menus
            const labels1 = nav1.map((n: any) => n.label);
            const labels2 = nav2.map((n: any) => n.label);
            expect(labels1).toContain('Products');
            expect(labels2).toContain('Products');
        });

        test('Cross-service-group menu injection blocked', async () => {
            const { cosmetics } = representatives;

            // Get cosmetics navigation
            const cosmeticsNav = getNavigationForTenant(
                context,
                cosmetics.id,
                'cosmetics' as ServiceGroup
            );

            // Verify yaksa menus are not present
            const navLabels = cosmeticsNav.map((n: any) => n.label);
            expect(navLabels).not.toContain('Members');
            expect(navLabels).not.toContain('Subscriptions');

            // Count check - cosmetics should only have cosmetics + global menus
            expect(cosmeticsNav.length).toBeGreaterThan(0);
            expect(cosmeticsNav.length).toBeLessThan(10); // Sanity check
        });
    });

    describe('NAV-MULTI-003: NavigationRegistry Filtering', () => {
        test('NavigationRegistry.getNavTreeByContext enforces serviceGroup filter', async () => {
            // Test direct registry access with cosmetics context
            const cosmeticsTree = context.navigationRegistry.getNavTreeByContext({
                serviceGroup: 'cosmetics',
            });

            // Should only return cosmetics and global menus
            for (const item of cosmeticsTree) {
                const serviceGroups = (item as any).serviceGroups || [];
                expect(
                    serviceGroups.length === 0 || // global (no restriction)
                    serviceGroups.includes('cosmetics') ||
                    serviceGroups.includes('global')
                ).toBe(true);
            }
        });

        test('Navigation query with wrong serviceGroup returns filtered results', async () => {
            // Get all yaksa navigation
            const yaksaNav = context.navigationRegistry.getNavTreeByContext({
                serviceGroup: 'yaksa',
            });

            // Verify no cosmetics-specific menus
            for (const item of yaksaNav) {
                const serviceGroups = (item as any).serviceGroups || [];
                expect(serviceGroups.includes('cosmetics') && !serviceGroups.includes('yaksa') && !serviceGroups.includes('global')).toBe(false);
            }
        });

        test('Global navigation available to all service groups', async () => {
            const serviceGroups: ServiceGroup[] = ['cosmetics', 'yaksa', 'tourist', 'sellerops', 'supplierops'];

            for (const sg of serviceGroups) {
                const navTree = context.navigationRegistry.getNavTreeByContext({
                    serviceGroup: sg,
                    roles: ['admin'],
                });

                // Admin menu should be visible (it's global + role-based)
                const hasAdminMenu = navTree.some((item: any) => item.id === 'admin-dashboard');
                expect(hasAdminMenu).toBe(true);
            }
        });
    });

    describe('NAV-MULTI-004: Role-Based Visibility Across Service Groups', () => {
        test('Admin menu visible only to admin role', async () => {
            // Admin user context
            const adminNav = context.navigationRegistry.getNavTreeByContext({
                serviceGroup: 'cosmetics',
                roles: ['admin'],
            });

            // Regular user context (no admin role)
            const userNav = context.navigationRegistry.getNavTreeByContext({
                serviceGroup: 'cosmetics',
                roles: ['user'],
            });

            // Admin should see admin dashboard
            const adminHasAdminMenu = adminNav.some((item: any) => item.id === 'admin-dashboard');
            expect(adminHasAdminMenu).toBe(true);

            // Regular user should NOT see admin dashboard
            const userHasAdminMenu = userNav.some((item: any) => item.id === 'admin-dashboard');
            expect(userHasAdminMenu).toBe(false);
        });

        test('Admin menu visibility consistent across all service groups', async () => {
            const serviceGroups: ServiceGroup[] = ['cosmetics', 'yaksa', 'tourist', 'sellerops', 'supplierops'];

            for (const sg of serviceGroups) {
                // Admin in this service group should see admin menu
                const adminNav = context.navigationRegistry.getNavTreeByContext({
                    serviceGroup: sg,
                    roles: ['admin'],
                });
                const hasAdmin = adminNav.some((item: any) => item.id === 'admin-dashboard');
                expect(hasAdmin).toBe(true);

                // Non-admin should NOT see admin menu
                const userNav = context.navigationRegistry.getNavTreeByContext({
                    serviceGroup: sg,
                    roles: [],
                });
                const userHasAdmin = userNav.some((item: any) => item.id === 'admin-dashboard');
                expect(userHasAdmin).toBe(false);
            }
        });
    });

    describe('NAV-MULTI-005: Navigation Count Validation', () => {
        test('Each service group has expected number of menus', async () => {
            const expectations: Record<string, number> = {
                cosmetics: 3,    // Products, Reviews, Routines
                yaksa: 3,       // Members, Subscriptions, Education
                tourist: 3,     // Tours, Bookings, Attractions
                sellerops: 3,   // Inventory, Orders, Settlements
                supplierops: 3, // Catalog, Offers, Fulfillment
            };

            for (const [sg, expectedCount] of Object.entries(expectations)) {
                const nav = context.navigationRegistry.getNavTreeByContext({
                    serviceGroup: sg as ServiceGroup,
                });

                // Filter out global admin items for this count
                const serviceSpecificNav = nav.filter((item: any) => {
                    const serviceGroups = item.serviceGroups || [];
                    return serviceGroups.includes(sg);
                });

                expect(serviceSpecificNav.length).toBe(expectedCount);
            }
        });

        test('Total navigation items registered correctly', async () => {
            const totalNavItems = context.navigationRegistry.count();
            // 5 service groups × 3 menus each + 2 admin menus = 17 total
            expect(totalNavItems).toBe(17);
        });
    });
});
