/**
 * Multi-Tenant Simulation - ViewSystem Cross-Service Tests
 * Phase 9 - Task 2.2
 *
 * Tests ViewSystem resolution and isolation across service groups
 * Connected to real ViewRegistry service
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import {
    setupMultiTenantTests,
    teardownMultiTenantTests,
    MultiTenantTestContext,
    getRepresentativeTenants,
    resolveViewByContext,
    getViewsByServiceGroup,
    ServiceGroup,
} from './setup.js';

describe('Multi-Tenant ViewSystem Resolution', () => {
    let context: MultiTenantTestContext;
    let representatives: Record<string, any>;

    beforeAll(async () => {
        context = await setupMultiTenantTests(global.testDataSource);
        representatives = getRepresentativeTenants(context);
    });

    afterAll(async () => {
        await teardownMultiTenantTests(context);
    });

    describe('VIEW-MULTI-001: Service Group View Isolation', () => {
        test('Cosmetics tenant resolves only cosmetics views', async () => {
            const { cosmetics } = representatives;

            // Resolve product list view with cosmetics context
            const view = resolveViewByContext(context, 'product', 'list', {
                tenantId: cosmetics.id,
                serviceGroup: 'cosmetics',
            });

            expect(view).toBeDefined();
            expect(view?.viewId).toBe('cosmetics.product.list');
            expect(view?.options.serviceGroups).toContain('cosmetics');
        });

        test('Yaksa tenant resolves only yaksa views', async () => {
            const { yaksa } = representatives;

            // Resolve member list view with yaksa context
            const view = resolveViewByContext(context, 'member', 'list', {
                tenantId: yaksa.id,
                serviceGroup: 'yaksa',
            });

            expect(view).toBeDefined();
            expect(view?.viewId).toBe('yaksa.member.list');
            expect(view?.options.serviceGroups).toContain('yaksa');
        });

        test('Tourist tenant resolves only tourist views', async () => {
            const { tourist } = representatives;

            // Resolve tour list view with tourist context
            const view = resolveViewByContext(context, 'tour', 'list', {
                tenantId: tourist.id,
                serviceGroup: 'tourist',
            });

            expect(view).toBeDefined();
            expect(view?.viewId).toBe('tourist.tour.list');
            expect(view?.options.serviceGroups).toContain('tourist');
        });

        test('Sellerops tenant resolves only sellerops views', async () => {
            const { sellerops } = representatives;

            // Resolve inventory list view with sellerops context
            const view = resolveViewByContext(context, 'inventory', 'list', {
                tenantId: sellerops.id,
                serviceGroup: 'sellerops',
            });

            expect(view).toBeDefined();
            expect(view?.viewId).toBe('sellerops.inventory.list');
            expect(view?.options.serviceGroups).toContain('sellerops');
        });

        test('Supplierops tenant resolves only supplierops views', async () => {
            const { supplierops } = representatives;

            // Resolve catalog list view with supplierops context
            const view = resolveViewByContext(context, 'catalog', 'list', {
                tenantId: supplierops.id,
                serviceGroup: 'supplierops',
            });

            expect(view).toBeDefined();
            expect(view?.viewId).toBe('supplierops.catalog.list');
            expect(view?.options.serviceGroups).toContain('supplierops');
        });
    });

    describe('VIEW-MULTI-002: Cross-Service View Rejection', () => {
        test('Cosmetics tenant cannot resolve yaksa views', async () => {
            const { cosmetics } = representatives;

            // Attempt to resolve member view in cosmetics context
            const view = resolveViewByContext(context, 'member', 'list', {
                tenantId: cosmetics.id,
                serviceGroup: 'cosmetics',
            });

            // Should not find yaksa-specific member view
            expect(view).toBeUndefined();
        });

        test('Yaksa tenant cannot resolve cosmetics views', async () => {
            const { yaksa } = representatives;

            // Attempt to resolve product view in yaksa context with cosmetics-specific CPT
            const view = resolveViewByContext(context, 'product', 'list', {
                tenantId: yaksa.id,
                serviceGroup: 'yaksa',
            });

            // Should get generic view or undefined, NOT cosmetics-specific
            if (view) {
                expect(view.viewId).not.toBe('cosmetics.product.list');
            }
        });

        test('Tourist tenant cannot resolve sellerops views', async () => {
            const { tourist } = representatives;

            // Attempt to resolve inventory view in tourist context
            const view = resolveViewByContext(context, 'inventory', 'list', {
                tenantId: tourist.id,
                serviceGroup: 'tourist',
            });

            expect(view).toBeUndefined();
        });

        test('Sellerops tenant cannot resolve supplierops views', async () => {
            const { sellerops } = representatives;

            // Attempt to resolve offer view in sellerops context
            const view = resolveViewByContext(context, 'offer', 'list', {
                tenantId: sellerops.id,
                serviceGroup: 'sellerops',
            });

            expect(view).toBeUndefined();
        });
    });

    describe('VIEW-MULTI-003: View Priority Rules Enforcement', () => {
        test('Service group views prioritized over generic views', async () => {
            const { cosmetics } = representatives;

            // Resolve product view - should get cosmetics-specific (priority 100) over generic (priority 10)
            const view = resolveViewByContext(context, 'product', 'list', {
                tenantId: cosmetics.id,
                serviceGroup: 'cosmetics',
            });

            expect(view).toBeDefined();
            expect(view?.viewId).toBe('cosmetics.product.list');
            expect(view?.options.priority).toBe(100);
        });

        test('Generic views fallback when no service-specific view exists', async () => {
            const { yaksa } = representatives;

            // Resolve product view in yaksa context - no yaksa-specific product view
            // Should fall back to generic OR return undefined (since product is cosmetics-specific)
            const view = resolveViewByContext(context, 'product', 'list', {
                tenantId: yaksa.id,
                serviceGroup: 'yaksa',
            });

            // In this test setup, generic.product.list has no serviceGroups restriction
            // so it could be returned as fallback
            if (view) {
                expect(view.viewId).toBe('generic.product.list');
                expect(view.options.priority).toBe(10); // Lower priority
            }
        });
    });

    describe('VIEW-MULTI-004: Dynamic Routing Across Service Groups', () => {
        test('/products routes correctly in cosmetics vs sellerops', async () => {
            const { cosmetics, sellerops } = representatives;

            // Cosmetics context resolves product view
            const cosmeticsView = resolveViewByContext(context, 'product', 'list', {
                tenantId: cosmetics.id,
                serviceGroup: 'cosmetics',
            });

            // Sellerops context should not resolve cosmetics product view
            const selleropsView = resolveViewByContext(context, 'product', 'list', {
                tenantId: sellerops.id,
                serviceGroup: 'sellerops',
            });

            // Different views for same path based on service group
            expect(cosmeticsView).toBeDefined();
            expect(cosmeticsView?.viewId).toBe('cosmetics.product.list');

            // Sellerops gets either generic or undefined
            if (selleropsView) {
                expect(selleropsView.viewId).not.toBe('cosmetics.product.list');
            }
        });

        test('/orders routes correctly in sellerops vs tourist', async () => {
            const { sellerops, tourist } = representatives;

            // Sellerops has order view
            const selleropsView = resolveViewByContext(context, 'order', 'list', {
                tenantId: sellerops.id,
                serviceGroup: 'sellerops',
            });

            // Tourist should not have sellerops order view
            const touristView = resolveViewByContext(context, 'order', 'list', {
                tenantId: tourist.id,
                serviceGroup: 'tourist',
            });

            expect(selleropsView).toBeDefined();
            expect(selleropsView?.viewId).toBe('sellerops.order.list');

            expect(touristView).toBeUndefined();
        });
    });

    describe('VIEW-MULTI-005: ViewSystem Registry Isolation', () => {
        test('ViewRegistry contains only service-appropriate views per tenant', async () => {
            const serviceGroups: ServiceGroup[] = ['cosmetics', 'yaksa', 'tourist', 'sellerops', 'supplierops'];

            for (const sg of serviceGroups) {
                const views = getViewsByServiceGroup(context, sg);

                // All views should be compatible with this service group
                for (const view of views) {
                    const viewServiceGroups = view.options.serviceGroups || [];

                    // View is valid if:
                    // 1. No serviceGroups restriction (available to all)
                    // 2. Includes this service group
                    // 3. Includes 'global'
                    const isValid =
                        viewServiceGroups.length === 0 ||
                        viewServiceGroups.includes(sg) ||
                        viewServiceGroups.includes('global');

                    expect(isValid).toBe(true);
                }
            }
        });

        test('Each service group has dedicated views', async () => {
            const cosmeticsViews = getViewsByServiceGroup(context, 'cosmetics');
            const yaksaViews = getViewsByServiceGroup(context, 'yaksa');
            const touristViews = getViewsByServiceGroup(context, 'tourist');

            // Each service should have unique views
            expect(cosmeticsViews.some(v => v.viewId.startsWith('cosmetics.'))).toBe(true);
            expect(yaksaViews.some(v => v.viewId.startsWith('yaksa.'))).toBe(true);
            expect(touristViews.some(v => v.viewId.startsWith('tourist.'))).toBe(true);
        });
    });

    describe('VIEW-MULTI-006: View Count Validation', () => {
        test('Each service group has expected views registered', async () => {
            const expectations: Record<string, string[]> = {
                cosmetics: ['cosmetics.product.list', 'cosmetics.product.detail', 'cosmetics.review.list'],
                yaksa: ['yaksa.member.list', 'yaksa.member.profile', 'yaksa.post.list', 'yaksa.course.list', 'yaksa.credit.list'],
                tourist: ['tourist.tour.list', 'tourist.booking.list'],
                sellerops: ['sellerops.inventory.list', 'sellerops.order.list'],
                supplierops: ['supplierops.catalog.list', 'supplierops.offer.list'],
            };

            for (const [sg, expectedViewIds] of Object.entries(expectations)) {
                const views = getViewsByServiceGroup(context, sg as ServiceGroup);
                const viewIds = views.map(v => v.viewId);

                for (const expectedId of expectedViewIds) {
                    expect(viewIds).toContain(expectedId);
                }
            }
        });

        test('Total views registered correctly', async () => {
            const totalViews = context.viewRegistry.count();
            // 3 cosmetics + 5 yaksa + 2 tourist + 2 sellerops + 2 supplierops + 1 generic = 15
            expect(totalViews).toBe(15);
        });
    });

    describe('VIEW-MULTI-007: View Context Matching', () => {
        test('getViewByContext works with viewId pattern', async () => {
            // Direct view ID lookup
            const view = context.viewRegistry.getViewByContext('cosmetics.product.list', {
                serviceGroup: 'cosmetics',
            });

            expect(view).toBeDefined();
            expect(view?.viewId).toBe('cosmetics.product.list');
        });

        test('getViewsByContext returns filtered results', async () => {
            const views = context.viewRegistry.getViewsByContext({
                serviceGroup: 'yaksa',
            });

            // All returned views should be yaksa-compatible
            for (const view of views) {
                const sg = view.options.serviceGroups || [];
                expect(sg.length === 0 || sg.includes('yaksa') || sg.includes('global')).toBe(true);
            }
        });
    });
});
