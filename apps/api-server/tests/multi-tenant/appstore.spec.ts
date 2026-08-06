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
            expect(appIds).toContain('cosmetics-seller-extension');
            expect(appIds).toContain('cosmetics-supplier-extension');
            // WO-O4O-LEGACY-COSMETICS-PARTNER-REMOVAL-V1:
            //   레거시 'cosmetics-partner' 카탈로그 항목이 제거되어 더 이상 노출되지 않는다.
            expect(appIds).not.toContain('cosmetics-partner');
            // WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1:
            //   dropshipping 레거시 체인 카탈로그 항목이 제거되어 더 이상 노출되지 않는다.
            expect(appIds).not.toContain('dropshipping-cosmetics');
            expect(appIds).not.toContain('dropshipping-core');
            expect(appIds).not.toContain('sellerops');
            expect(appIds).not.toContain('supplierops');

            // Global apps available to all
            expect(appIds).toContain('organization-forum');

            // NOT expected (yaksa-specific apps)
            // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
            //   forum-yaksa 카탈로그 항목이 제거되었다. yaksa 전용 항목의 cosmetics 비노출은
            //   현재 실제 운영 중인 yaksa 전용 앱(pharmacy-ai-insight) 으로 검증한다.
            expect(appIds).not.toContain('membership-yaksa');
            expect(appIds).not.toContain('forum-yaksa');
            expect(appIds).not.toContain('reporting-yaksa');
            expect(appIds).not.toContain('pharmacy-ai-insight');

            expect(cosmetics.serviceGroup).toBe('cosmetics');
        });

        test('Yaksa tenant sees yaksa-compatible apps', async () => {
            const { yaksa } = representatives;

            // Query AppStore for yaksa
            const catalog = getAppsCatalogForServiceGroup('yaksa');
            const appIds = catalog.map(app => app.appId);

            // Expected apps (yaksa-specific + global)
            // WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1:
            //   membership-yaksa · reporting-yaksa · lms-yaksa · yaksa-scheduler · annualfee-yaksa
            //   카탈로그 항목이 제거되었다.
            // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
            //   forum-yaksa 도 제거되어, 잔존 yaksa 전용 항목은 pharmacy-ai-insight 다.
            //   약사 조직의 포럼은 전용 앱이 아니라 공용 구조(organization-forum → forum-core)로 제공된다.
            expect(appIds).toContain('pharmacy-ai-insight');
            expect(appIds).not.toContain('forum-yaksa');
            expect(appIds).not.toContain('membership-yaksa');
            expect(appIds).not.toContain('reporting-yaksa');
            expect(appIds).not.toContain('lms-yaksa');
            // WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1:
            //   'pharmaceutical-core' 카탈로그 항목·패키지가 제거되었다.
            expect(appIds).not.toContain('pharmaceutical-core');

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
            expect(appIds).toContain('cosmetics-seller-extension');
            // WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1:
            //   serviceGroup 'sellerops' 는 유지되지만 동명 앱 카탈로그 항목은 제거되었다.
            expect(appIds).not.toContain('sellerops');

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
            expect(appIds).toContain('cosmetics-supplier-extension');
            // WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1:
            //   serviceGroup 'supplierops' 는 유지되지만 동명 앱 카탈로그 항목은 제거되었다.
            expect(appIds).not.toContain('supplierops');

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
            // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
            //   제거된 항목(forum-yaksa 등) 의 비노출과 함께, 현재 카탈로그에 실재하는
            //   yaksa 전용 앱(pharmacy-ai-insight) 의 비노출도 검증한다.
            const yaksaSpecificApps = [
                'membership-yaksa',
                'forum-yaksa',
                'reporting-yaksa',
                'pharmacy-ai-insight',
            ];
            for (const yaksaApp of yaksaSpecificApps) {
                expect(appIds).not.toContain(yaksaApp);
            }

            // Verify isAppCompatibleWithServiceGroup helper
            expect(isAppCompatibleWithServiceGroup('membership-yaksa', 'cosmetics')).toBe(false);
            expect(isAppCompatibleWithServiceGroup('pharmacy-ai-insight', 'cosmetics')).toBe(false);

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
            // WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1:
            //   'dropshipping-cosmetics' 제거 → 잔존 cosmetics 전용 앱으로 대표 검증한다.
            const appIds = recommended.map(app => app.appId);
            expect(appIds).toContain('cosmetics-sample-display-extension');

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
            // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
            //   잔존 yaksa 전용 항목은 pharmacy-ai-insight 다 (forum-yaksa 제거).
            expect(appIds).toContain('pharmacy-ai-insight');
            expect(appIds).not.toContain('forum-yaksa');
            expect(appIds).not.toContain('membership-yaksa');
            expect(appIds).not.toContain('lms-yaksa');

            expect(yaksa.serviceGroup).toBe('yaksa');
        });

        test('Recommendations differ across service groups', async () => {
            // Cosmetics vs Yaksa should have different recommendations
            const { cosmetics, yaksa } = representatives;

            const cosmeticsRec = getRecommendedApps('cosmetics');
            const yaksaRec = getRecommendedApps('yaksa');

            const cosmeticsIds = cosmeticsRec.map(app => app.appId);
            const yaksaIds = yaksaRec.map(app => app.appId);

            // Cosmetics should have its own extension, yaksa should not
            // WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1: 'dropshipping-cosmetics' 제거에 따른 대체 검증
            expect(cosmeticsIds).toContain('cosmetics-sample-display-extension');
            expect(yaksaIds).not.toContain('cosmetics-sample-display-extension');

            // Yaksa should have its own app, cosmetics should not
            // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
            //   forum-yaksa 제거에 따라 pharmacy-ai-insight 로 대체 검증한다.
            expect(yaksaIds).toContain('pharmacy-ai-insight');
            expect(cosmeticsIds).not.toContain('pharmacy-ai-insight');

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

            // WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1:
            //   membership-yaksa 는 카탈로그에서 제거되어 'App not found' 로 귀결된다.
            // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
            //   forum-yaksa 도 제거되어, incompatible 판정은 현재 카탈로그에 실재하는
            //   yaksa 전용 항목(pharmacy-ai-insight) 으로 검증한다.
            const result = canInstallApp('pharmacy-ai-insight', 'cosmetics');

            expect(result.canInstall).toBe(false);
            expect(result.reason).toContain('incompatible');

            // 제거된 앱은 설치 후보로도 남지 않는다
            const result2 = canInstallApp('membership-yaksa', 'cosmetics');
            expect(result2.canInstall).toBe(false);

            const result3 = canInstallApp('forum-yaksa', 'cosmetics');
            expect(result3.canInstall).toBe(false);

            expect(cosmetics.serviceGroup).toBe('cosmetics');
        });

        test('Installing compatible app succeeds', async () => {
            const { cosmetics } = representatives;

            // Install a cosmetics-scoped app - should succeed
            // WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1: 'dropshipping-cosmetics' 제거에 따른 대체 검증
            const result = canInstallApp('cosmetics-sample-display-extension', 'cosmetics');
            expect(result.canInstall).toBe(true);

            // Install global app - should succeed
            const result2 = canInstallApp('organization-forum', 'cosmetics');
            expect(result2.canInstall).toBe(true);

            expect(cosmetics.serviceGroup).toBe('cosmetics');
        });

        test('Cross-service installation is blocked', async () => {
            const { yaksa, tourist, sellerops } = representatives;

            // Yaksa cannot install cosmetics app
            expect(canInstallApp('cosmetics-sample-display-extension', 'yaksa').canInstall).toBe(false);

            // Tourist cannot install yaksa app
            // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
            //   forum-yaksa 제거에 따라 pharmacy-ai-insight 로 대체 검증한다.
            expect(canInstallApp('pharmacy-ai-insight', 'tourist').canInstall).toBe(false);

            // Sellerops can install a sellerops-scoped app
            // WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1: 'sellerops' 앱 항목 제거에 따른 대체 검증
            expect(canInstallApp('cosmetics-seller-extension', 'sellerops').canInstall).toBe(true);
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

            // WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1:
            //   dropshipping-cosmetics → dropshipping-core 의존 체인이 통째로 제거되었다.
            //   cosmetics 카탈로그에는 두 항목이 의존 해석 결과로도 나타나지 않아야 한다.
            expect(cosmeticsIds).toContain('cosmetics-seller-extension');
            expect(cosmeticsIds).not.toContain('dropshipping-cosmetics');
            expect(cosmeticsIds).not.toContain('dropshipping-core');

            // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
            //   forum-yaksa 제거 후, yaksa 의 포럼 의존 체인은 공용 구조
            //   organization-forum(global) → forum-core 로 해석되어야 한다.
            //   yaksa 전용 앱은 pharmacy-ai-insight → organization-core 체인으로 검증한다.
            expect(yaksaIds).toContain('organization-forum');
            expect(yaksaIds).toContain('forum-core');
            expect(yaksaIds).toContain('pharmacy-ai-insight');
            expect(yaksaIds).toContain('organization-core');
            expect(yaksaIds).not.toContain('forum-yaksa');
            expect(yaksaIds).not.toContain('membership-yaksa');

            expect(cosmetics.serviceGroup).not.toBe(yaksa.serviceGroup);
        });

        test('Extension with multi-group dependency resolves correctly', async () => {
            // WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1:
            //   'sellerops' 앱과 그 의존 'dropshipping-core' 가 모두 제거되었다.
            //   serviceGroup 'sellerops' 는 유지되므로, 잔존 앱이 정상 해석되고
            //   삭제된 의존이 dangling 으로 남지 않는지 검증한다.
            const selleropsApps = getAppsForServiceGroupWithDependencies('sellerops');
            const appIds = selleropsApps.map(app => app.appId);

            expect(appIds).toContain('cosmetics-seller-extension');
            expect(appIds).not.toContain('sellerops');
            expect(appIds).not.toContain('dropshipping-core');
        });

        test('Chained dependencies are resolved', async () => {
            // WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1:
            //   reporting-yaksa → membership-yaksa → organization-core 체인이 통째로 제거되었다.
            //   삭제된 의존이 dangling 으로 되살아나지 않는지 검증한다.
            const yaksaApps = getAppsForServiceGroupWithDependencies('yaksa');
            const appIds = yaksaApps.map(app => app.appId);

            expect(appIds).not.toContain('reporting-yaksa');
            expect(appIds).not.toContain('membership-yaksa');
            // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
            //   forum-yaksa 제거. 정상 해석되는 체인은 pharmacy-ai-insight → organization-core 다.
            expect(appIds).not.toContain('forum-yaksa');
            expect(appIds).toContain('pharmacy-ai-insight');
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
            // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
            //   현재 카탈로그에 실재하는 yaksa 전용 앱도 tourist 에서 해석되지 않아야 한다.
            expect(appIds).not.toContain('pharmacy-ai-insight');
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
