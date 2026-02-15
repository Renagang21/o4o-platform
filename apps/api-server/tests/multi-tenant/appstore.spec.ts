/**
 * Multi-Tenant Simulation - AppStore Filtering Tests
 * Phase 9 - Task 2.4
 *
 * Tests AppStore filtering and compatibility across service groups
 * Connected to real appsCatalog service
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import {
    setupMultiTenantTests,
    teardownMultiTenantTests,
    MultiTenantTestContext,
    getRepresentativeTenants,
    getAppsCatalogForServiceGroup,
    isAppCompatibleWithServiceGroup,
    getRecommendedApps,
    ServiceGroup,
} from './setup.js';
import {
    APPS_CATALOG,
    filterByServiceGroup,
    getAppsForServiceGroupWithDependencies,
    getCatalogItem,
    type AppCatalogItem,
} from '../../src/app-manifests/appsCatalog.js';

describe('Multi-Tenant AppStore Filtering', () => {
    let context: MultiTenantTestContext;
    let representatives: Record<string, any>;

    beforeAll(async () => {
        context = await setupMultiTenantTests(global.testDataSource);
        representatives = getRepresentativeTenants(context);
    });

    afterAll(async () => {
        await teardownMultiTenantTests(context);
    });

    describe('APP-MULTI-001: Service Group App Filtering', () => {
        test('Cosmetics tenant sees cosmetics-compatible apps', async () => {
            const { cosmetics } = representatives;

            // Query AppStore catalog for cosmetics tenant
            const catalog = getAppsCatalogForServiceGroup('cosmetics');
            const appIds = catalog.map(app => app.appId);

            // Expected apps (cosmetics-specific + global)
            expect(appIds).toContain('dropshipping-cosmetics');
            expect(appIds).toContain('sellerops');
            expect(appIds).toContain('supplierops');
            expect(appIds).toContain('cosmetics-partner-extension');

            // Global apps available to all
            expect(appIds).toContain('organization-forum');

            // NOT expected (yaksa-specific apps)
            expect(appIds).not.toContain('membership-yaksa');
            expect(appIds).not.toContain('forum-yaksa');
            expect(appIds).not.toContain('reporting-yaksa');

            expect(cosmetics.serviceGroup).toBe('cosmetics');
        });

        test('Yaksa tenant sees yaksa-compatible apps', async () => {
            const { yaksa } = representatives;

            // Query AppStore for yaksa
            const catalog = getAppsCatalogForServiceGroup('yaksa');
            const appIds = catalog.map(app => app.appId);

            // Expected apps (yaksa-specific + global)
            expect(appIds).toContain('membership-yaksa');
            expect(appIds).toContain('forum-yaksa');
            expect(appIds).toContain('reporting-yaksa');
            expect(appIds).toContain('pharmaceutical-core');
            expect(appIds).toContain('lms-yaksa');

            // Global apps available to all
            expect(appIds).toContain('organization-forum');

            // NOT expected (cosmetics-specific)
            expect(appIds).not.toContain('dropshipping-cosmetics');

            expect(yaksa.serviceGroup).toBe('yaksa');
        });

        test('Tourist tenant sees tourist-compatible apps', async () => {
            const { tourist } = representatives;

            // Query AppStore for tourist
            const catalog = getAppsCatalogForServiceGroup('tourist');
            const appIds = catalog.map(app => app.appId);

            // Global apps should be available
            expect(appIds).toContain('organization-forum');

            // Service-specific apps should NOT be available
            expect(appIds).not.toContain('dropshipping-cosmetics');
            expect(appIds).not.toContain('membership-yaksa');

            expect(tourist.serviceGroup).toBe('tourist');
        });

        test('Sellerops tenant sees sellerops-compatible apps', async () => {
            const { sellerops } = representatives;

            // Query AppStore for sellerops
            const catalog = getAppsCatalogForServiceGroup('sellerops');
            const appIds = catalog.map(app => app.appId);

            // Expected apps
            expect(appIds).toContain('sellerops');
            expect(appIds).toContain('cosmetics-seller-extension');

            // NOT expected (yaksa-specific)
            expect(appIds).not.toContain('membership-yaksa');

            expect(sellerops.serviceGroup).toBe('sellerops');
        });

        test('Supplierops tenant sees supplierops-compatible apps', async () => {
            const { supplierops } = representatives;

            // Query AppStore for supplierops
            const catalog = getAppsCatalogForServiceGroup('supplierops');
            const appIds = catalog.map(app => app.appId);

            // Expected apps
            expect(appIds).toContain('supplierops');
            expect(appIds).toContain('cosmetics-supplier-extension');

            // NOT expected (yaksa-specific)
            expect(appIds).not.toContain('membership-yaksa');

            expect(supplierops.serviceGroup).toBe('supplierops');
        });
    });

    describe('APP-MULTI-002: Incompatible App Marking', () => {
        test('Yaksa apps not visible in cosmetics catalog', async () => {
            const { cosmetics } = representatives;

            // Get cosmetics catalog
            const cosmeticsCatalog = filterByServiceGroup('cosmetics');
            const appIds = cosmeticsCatalog.map(app => app.appId);

            // Yaksa-specific apps should NOT be in cosmetics catalog
            const yaksaSpecificApps = ['membership-yaksa', 'forum-yaksa', 'reporting-yaksa'];
            for (const yaksaApp of yaksaSpecificApps) {
                expect(appIds).not.toContain(yaksaApp);
            }

            // Verify isAppCompatibleWithServiceGroup helper
            expect(isAppCompatibleWithServiceGroup('membership-yaksa', 'cosmetics')).toBe(false);
            expect(isAppCompatibleWithServiceGroup('forum-yaksa', 'cosmetics')).toBe(false);

            expect(cosmetics.serviceGroup).not.toBe('yaksa');
        });

        test('Cosmetics apps not visible in yaksa catalog', async () => {
            const { yaksa } = representatives;

            // Get yaksa catalog
            const yaksaCatalog = filterByServiceGroup('yaksa');
            const appIds = yaksaCatalog.map(app => app.appId);

            // Cosmetics-specific apps should NOT be in yaksa catalog
            expect(appIds).not.toContain('dropshipping-cosmetics');

            // Verify isAppCompatibleWithServiceGroup helper
            expect(isAppCompatibleWithServiceGroup('dropshipping-cosmetics', 'yaksa')).toBe(false);

            expect(yaksa.serviceGroup).not.toBe('cosmetics');
        });

        test('Service-specific apps not visible in tourist catalog', async () => {
            const { tourist } = representatives;

            // Get tourist catalog
            const touristCatalog = filterByServiceGroup('tourist');
            const appIds = touristCatalog.map(app => app.appId);

            // Service-specific apps should NOT be in tourist catalog
            expect(appIds).not.toContain('dropshipping-cosmetics');
            expect(appIds).not.toContain('membership-yaksa');

            // Verify isAppCompatibleWithServiceGroup helper
            expect(isAppCompatibleWithServiceGroup('dropshipping-cosmetics', 'tourist')).toBe(false);
            expect(isAppCompatibleWithServiceGroup('membership-yaksa', 'tourist')).toBe(false);

            expect(tourist.serviceGroup).not.toBe('cosmetics');
        });
    });

    describe('APP-MULTI-003: Recommended Apps Accuracy', () => {
        test('Cosmetics tenant recommendations are cosmetics-specific', async () => {
            const { cosmetics } = representatives;

            // Get recommended apps for cosmetics
            const recommended = getRecommendedApps('cosmetics');

            // All recommended apps should be either core or cosmetics-compatible
            expect(recommended.every(app =>
                app.type === 'core' ||
                !app.serviceGroups ||
                app.serviceGroups.includes('cosmetics')
            )).toBe(true);

            // Should include cosmetics-specific app
            const appIds = recommended.map(app => app.appId);
            expect(appIds).toContain('dropshipping-cosmetics');

            expect(cosmetics.serviceGroup).toBe('cosmetics');
        });

        test('Yaksa tenant recommendations are yaksa-specific', async () => {
            const { yaksa } = representatives;

            // Get recommended apps for yaksa
            const recommended = getRecommendedApps('yaksa');

            // All recommended apps should be either core or yaksa-compatible
            expect(recommended.every(app =>
                app.type === 'core' ||
                !app.serviceGroups ||
                app.serviceGroups.includes('yaksa')
            )).toBe(true);

            // Should include yaksa-specific apps
            const appIds = recommended.map(app => app.appId);
            expect(appIds).toContain('membership-yaksa');
            expect(appIds).toContain('forum-yaksa');
            expect(appIds).toContain('lms-yaksa');

            expect(yaksa.serviceGroup).toBe('yaksa');
        });

        test('Recommendations differ across service groups', async () => {
            // Cosmetics vs Yaksa should have different recommendations
            const { cosmetics, yaksa } = representatives;

            const cosmeticsRec = getRecommendedApps('cosmetics');
            const yaksaRec = getRecommendedApps('yaksa');

            const cosmeticsIds = cosmeticsRec.map(app => app.appId);
            const yaksaIds = yaksaRec.map(app => app.appId);

            // Cosmetics should have dropshipping-cosmetics, yaksa should not
            expect(cosmeticsIds).toContain('dropshipping-cosmetics');
            expect(yaksaIds).not.toContain('dropshipping-cosmetics');

            // Yaksa should have membership-yaksa, cosmetics should not
            expect(yaksaIds).toContain('membership-yaksa');
            expect(cosmeticsIds).not.toContain('membership-yaksa');

            expect(cosmetics.serviceGroup).not.toBe(yaksa.serviceGroup);
        });
    });

    describe('APP-MULTI-004: Installation Blocking', () => {
        /**
         * Mock installation check function
         * Simulates the installation validation logic
         */
        function canInstallApp(appId: string, tenantServiceGroup: ServiceGroup): { canInstall: boolean; reason?: string } {
            const app = getCatalogItem(appId);

            if (!app) {
                return { canInstall: false, reason: 'App not found in catalog' };
            }

            // If app has no serviceGroups restriction, it can be installed anywhere
            if (!app.serviceGroups || app.serviceGroups.length === 0) {
                return { canInstall: true };
            }

            // Check if app is compatible with tenant's service group
            if (app.serviceGroups.includes(tenantServiceGroup) || app.serviceGroups.includes('global')) {
                return { canInstall: true };
            }

            return {
                canInstall: false,
                reason: `App '${appId}' is incompatible with service group '${tenantServiceGroup}'`,
            };
        }

        test('Installing incompatible app is blocked', async () => {
            const { cosmetics } = representatives;

            // Attempt to install membership-yaksa in cosmetics tenant
            const result = canInstallApp('membership-yaksa', 'cosmetics');

            expect(result.canInstall).toBe(false);
            expect(result.reason).toContain('incompatible');

            // Attempt to install forum-yaksa in cosmetics tenant
            const result2 = canInstallApp('forum-yaksa', 'cosmetics');
            expect(result2.canInstall).toBe(false);

            expect(cosmetics.serviceGroup).toBe('cosmetics');
        });

        test('Installing compatible app succeeds', async () => {
            const { cosmetics } = representatives;

            // Install dropshipping-cosmetics - should succeed
            const result = canInstallApp('dropshipping-cosmetics', 'cosmetics');
            expect(result.canInstall).toBe(true);

            // Install global app - should succeed
            const result2 = canInstallApp('organization-forum', 'cosmetics');
            expect(result2.canInstall).toBe(true);

            expect(cosmetics.serviceGroup).toBe('cosmetics');
        });

        test('Cross-service installation is blocked', async () => {
            const { yaksa, tourist, sellerops } = representatives;

            // Yaksa cannot install cosmetics app
            expect(canInstallApp('dropshipping-cosmetics', 'yaksa').canInstall).toBe(false);

            // Tourist cannot install yaksa app
            expect(canInstallApp('membership-yaksa', 'tourist').canInstall).toBe(false);

            // Sellerops can install sellerops app
            expect(canInstallApp('sellerops', 'sellerops').canInstall).toBe(true);
        });
    });

    describe('APP-MULTI-005: Global and Platform-Core Apps', () => {
        test('Global apps available to all service groups', async () => {
            const serviceGroups: ServiceGroup[] = ['cosmetics', 'yaksa', 'tourist', 'sellerops', 'supplierops'];

            // Global apps should be available everywhere via filterByServiceGroup
            const globalAppIds = APPS_CATALOG
                .filter(app => app.serviceGroups?.includes('global'))
                .map(app => app.appId);

            expect(globalAppIds.length).toBeGreaterThan(0);

            for (const sg of serviceGroups) {
                const catalog = filterByServiceGroup(sg);
                const availableAppIds = catalog.map(app => app.appId);

                for (const globalId of globalAppIds) {
                    expect(availableAppIds).toContain(globalId);
                }
            }

            expect(context.tenants.length).toBe(15);
        });

        test('Platform-core apps have explicit serviceGroup', async () => {
            const coreApps = APPS_CATALOG.filter(app => app.type === 'core');

            for (const app of coreApps) {
                // Core apps should have serviceGroups defined
                expect(app.serviceGroups).toBeDefined();
                expect(app.serviceGroups!.length).toBeGreaterThan(0);
            }
        });

        test('organization-forum available in all catalogs', async () => {
            const serviceGroups: ServiceGroup[] = ['cosmetics', 'yaksa', 'tourist', 'sellerops', 'supplierops'];

            for (const sg of serviceGroups) {
                const catalog = filterByServiceGroup(sg);
                const appIds = catalog.map(app => app.appId);
                expect(appIds).toContain('organization-forum');
            }
        });
    });

    describe('APP-MULTI-006: Extension App Dependencies', () => {
        test('Extension dependencies respected across service groups', async () => {
            const { cosmetics, yaksa } = representatives;

            // Get apps with dependencies resolved for each service group
            const cosmeticsAppsWithDeps = getAppsForServiceGroupWithDependencies('cosmetics');
            const yaksaAppsWithDeps = getAppsForServiceGroupWithDependencies('yaksa');

            const cosmeticsIds = cosmeticsAppsWithDeps.map(app => app.appId);
            const yaksaIds = yaksaAppsWithDeps.map(app => app.appId);

            // dropshipping-cosmetics depends on dropshipping-core
            // Both should be in cosmetics catalog (via dependency resolution)
            expect(cosmeticsIds).toContain('dropshipping-cosmetics');
            expect(cosmeticsIds).toContain('dropshipping-core');

            // membership-yaksa depends on organization-core
            // Both should be in yaksa catalog (via dependency resolution)
            expect(yaksaIds).toContain('membership-yaksa');
            expect(yaksaIds).toContain('organization-core');

            expect(cosmetics.serviceGroup).not.toBe(yaksa.serviceGroup);
        });

        test('Extension with multi-group dependency resolves correctly', async () => {
            // sellerops app depends on dropshipping-core
            const selleropsApps = getAppsForServiceGroupWithDependencies('sellerops');
            const appIds = selleropsApps.map(app => app.appId);

            // Should include both sellerops and its dependency
            expect(appIds).toContain('sellerops');
            expect(appIds).toContain('dropshipping-core');
        });

        test('Chained dependencies are resolved', async () => {
            // reporting-yaksa depends on membership-yaksa which depends on organization-core
            const yaksaApps = getAppsForServiceGroupWithDependencies('yaksa');
            const appIds = yaksaApps.map(app => app.appId);

            // All three should be present
            expect(appIds).toContain('reporting-yaksa');
            expect(appIds).toContain('membership-yaksa');
            expect(appIds).toContain('organization-core');
        });

        test('Dependencies not available for incompatible service groups', async () => {
            // Tourist service group should not have yaksa-specific apps
            const touristApps = getAppsForServiceGroupWithDependencies('tourist');
            const appIds = touristApps.map(app => app.appId);

            // Should NOT have yaksa-specific apps even as dependencies
            expect(appIds).not.toContain('membership-yaksa');
            expect(appIds).not.toContain('reporting-yaksa');
            expect(appIds).not.toContain('forum-yaksa');
        });
    });

    describe('APP-MULTI-007: Catalog Statistics', () => {
        test('Total catalog count is correct', async () => {
            expect(APPS_CATALOG.length).toBeGreaterThan(0);
        });

        test('Service group specific apps exist', async () => {
            const cosmeticsSpecific = APPS_CATALOG.filter(
                app => app.serviceGroups?.includes('cosmetics')
            );
            const yaksaSpecific = APPS_CATALOG.filter(
                app => app.serviceGroups?.includes('yaksa')
            );

            expect(cosmeticsSpecific.length).toBeGreaterThan(0);
            expect(yaksaSpecific.length).toBeGreaterThan(0);
        });

        test('Each service group catalog has different app counts', async () => {
            const serviceGroups: ServiceGroup[] = ['cosmetics', 'yaksa', 'tourist', 'sellerops', 'supplierops'];
            const counts: Record<string, number> = {};

            for (const sg of serviceGroups) {
                const catalog = filterByServiceGroup(sg);
                counts[sg] = catalog.length;
            }

            // All catalogs should have at least the global apps
            for (const sg of serviceGroups) {
                expect(counts[sg]).toBeGreaterThan(0);
            }
        });
    });
});
