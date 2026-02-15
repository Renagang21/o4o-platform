/**
 * Multi-Tenant Simulation - Test Setup Helper
 * Phase 9 - Task 2.5
 *
 * Provides setup and teardown utilities for multi-tenant tests
 * Integrates with real platform services
 */

import { DataSource } from 'typeorm';
import { TenantFactory, SimulatedTenant } from './tenant-factory.js';
import { NavigationRegistry, navigationRegistry } from '../../../../packages/cms-core/src/view-system/navigation-registry.js';
import { ViewRegistry, viewRegistry } from '../../../../packages/cms-core/src/view-system/view-registry.js';
import { filterByServiceGroup, APPS_CATALOG, type ServiceGroup, type AppCatalogItem } from '../../src/app-manifests/appsCatalog.js';

export interface MultiTenantTestContext {
    dataSource: DataSource;
    factory: TenantFactory;
    tenants: SimulatedTenant[];
    cosmeticsTenants: SimulatedTenant[];
    yaksaTenants: SimulatedTenant[];
    touristTenants: SimulatedTenant[];
    selleropsTenants: SimulatedTenant[];
    supplieropsTenants: SimulatedTenant[];
    // Service instances
    navigationRegistry: NavigationRegistry;
    viewRegistry: ViewRegistry;
}

/**
 * View Query Context for testing
 */
export interface ViewQueryContext {
    tenantId?: string;
    serviceGroup?: ServiceGroup;
    permissions?: string[];
    roles?: string[];
}

/**
 * Test helper: Get navigation for a tenant context
 */
export function getNavigationForTenant(
    context: MultiTenantTestContext,
    tenantId: string,
    serviceGroup: ServiceGroup,
    roles?: string[]
): any[] {
    return context.navigationRegistry.getNavTreeByContext({
        tenantId,
        serviceGroup,
        roles,
    });
}

/**
 * Test helper: Get apps catalog for a service group
 */
export function getAppsCatalogForServiceGroup(serviceGroup: ServiceGroup): AppCatalogItem[] {
    return filterByServiceGroup(serviceGroup);
}

/**
 * Test helper: Check if app is compatible with service group
 */
export function isAppCompatibleWithServiceGroup(
    appId: string,
    serviceGroup: ServiceGroup
): boolean {
    const compatibleApps = filterByServiceGroup(serviceGroup);
    return compatibleApps.some(app => app.appId === appId);
}

/**
 * Test helper: Get recommended apps for a service group
 */
export function getRecommendedApps(serviceGroup: ServiceGroup): AppCatalogItem[] {
    return filterByServiceGroup(serviceGroup).filter(
        app => app.type === 'core' || app.serviceGroups?.includes(serviceGroup)
    );
}

/**
 * Test helper: Resolve view by context
 */
export function resolveViewByContext(
    context: MultiTenantTestContext,
    cptName: string,
    type: 'list' | 'detail' | 'edit' | 'create' | 'custom',
    queryContext: ViewQueryContext
): any | undefined {
    return context.viewRegistry.resolveView(cptName, type, queryContext);
}

/**
 * Test helper: Get views by service group
 */
export function getViewsByServiceGroup(
    context: MultiTenantTestContext,
    serviceGroup: ServiceGroup
): any[] {
    return context.viewRegistry.getViewsByServiceGroup(serviceGroup);
}

/**
 * Register test navigation items for each service group
 */
function registerTestNavigationItems(navRegistry: NavigationRegistry): void {
    // Clear existing nav items for clean test
    navRegistry.clear();

    // Cosmetics navigation items
    navRegistry.registerNav({
        id: 'cosmetics-products',
        appId: 'dropshipping-cosmetics',
        label: 'Products',
        path: '/products',
        icon: 'package',
        order: 1,
        serviceGroups: ['cosmetics'],
    });
    navRegistry.registerNav({
        id: 'cosmetics-reviews',
        appId: 'dropshipping-cosmetics',
        label: 'Reviews',
        path: '/reviews',
        icon: 'star',
        order: 2,
        serviceGroups: ['cosmetics'],
    });
    navRegistry.registerNav({
        id: 'cosmetics-routines',
        appId: 'dropshipping-cosmetics',
        label: 'Routines',
        path: '/routines',
        icon: 'heart',
        order: 3,
        serviceGroups: ['cosmetics'],
    });

    // Yaksa navigation items
    navRegistry.registerNav({
        id: 'yaksa-members',
        appId: 'membership-yaksa',
        label: 'Members',
        path: '/members',
        icon: 'users',
        order: 1,
        serviceGroups: ['yaksa'],
    });
    navRegistry.registerNav({
        id: 'yaksa-subscriptions',
        appId: 'membership-yaksa',
        label: 'Subscriptions',
        path: '/subscriptions',
        icon: 'credit-card',
        order: 2,
        serviceGroups: ['yaksa'],
    });
    navRegistry.registerNav({
        id: 'yaksa-lms',
        appId: 'lms-yaksa',
        label: 'Education',
        path: '/education',
        icon: 'book',
        order: 3,
        serviceGroups: ['yaksa'],
    });

    // Tourist navigation items
    navRegistry.registerNav({
        id: 'tourist-tours',
        appId: 'tourist-core',
        label: 'Tours',
        path: '/tours',
        icon: 'map',
        order: 1,
        serviceGroups: ['tourist'],
    });
    navRegistry.registerNav({
        id: 'tourist-bookings',
        appId: 'tourist-core',
        label: 'Bookings',
        path: '/bookings',
        icon: 'calendar',
        order: 2,
        serviceGroups: ['tourist'],
    });
    navRegistry.registerNav({
        id: 'tourist-attractions',
        appId: 'tourist-core',
        label: 'Attractions',
        path: '/attractions',
        icon: 'landmark',
        order: 3,
        serviceGroups: ['tourist'],
    });

    // Sellerops navigation items
    navRegistry.registerNav({
        id: 'sellerops-inventory',
        appId: 'sellerops',
        label: 'Inventory',
        path: '/inventory',
        icon: 'box',
        order: 1,
        serviceGroups: ['sellerops'],
    });
    navRegistry.registerNav({
        id: 'sellerops-orders',
        appId: 'sellerops',
        label: 'Orders',
        path: '/orders',
        icon: 'shopping-cart',
        order: 2,
        serviceGroups: ['sellerops'],
    });
    navRegistry.registerNav({
        id: 'sellerops-settlements',
        appId: 'sellerops',
        label: 'Settlements',
        path: '/settlements',
        icon: 'dollar-sign',
        order: 3,
        serviceGroups: ['sellerops'],
    });

    // Supplierops navigation items
    navRegistry.registerNav({
        id: 'supplierops-catalog',
        appId: 'supplierops',
        label: 'Catalog',
        path: '/catalog',
        icon: 'list',
        order: 1,
        serviceGroups: ['supplierops'],
    });
    navRegistry.registerNav({
        id: 'supplierops-offers',
        appId: 'supplierops',
        label: 'Offers',
        path: '/offers',
        icon: 'tag',
        order: 2,
        serviceGroups: ['supplierops'],
    });
    navRegistry.registerNav({
        id: 'supplierops-fulfillment',
        appId: 'supplierops',
        label: 'Fulfillment',
        path: '/fulfillment',
        icon: 'truck',
        order: 3,
        serviceGroups: ['supplierops'],
    });

    // Admin navigation (available to admins across all service groups)
    navRegistry.registerNav({
        id: 'admin-dashboard',
        appId: 'platform-core',
        label: 'Admin Dashboard',
        path: '/admin',
        icon: 'settings',
        order: 100,
        roles: ['admin'],
        serviceGroups: ['global'],
    });
    navRegistry.registerNav({
        id: 'admin-users',
        appId: 'platform-core',
        label: 'Users',
        path: '/admin/users',
        icon: 'users',
        order: 101,
        parentId: 'admin-dashboard',
        roles: ['admin'],
        serviceGroups: ['global'],
    });
}

/**
 * Register test views for each service group
 */
function registerTestViews(vRegistry: ViewRegistry): void {
    // Clear existing views for clean test
    vRegistry.clear();

    // Mock component for testing
    const MockComponent = () => null;

    // Cosmetics views
    vRegistry.registerView('cosmetics.product.list', MockComponent, {
        type: 'list',
        cptName: 'product',
        serviceGroups: ['cosmetics'],
        priority: 100,
    }, 'dropshipping-cosmetics');

    vRegistry.registerView('cosmetics.product.detail', MockComponent, {
        type: 'detail',
        cptName: 'product',
        serviceGroups: ['cosmetics'],
        priority: 100,
    }, 'dropshipping-cosmetics');

    vRegistry.registerView('cosmetics.review.list', MockComponent, {
        type: 'list',
        cptName: 'review',
        serviceGroups: ['cosmetics'],
        priority: 100,
    }, 'dropshipping-cosmetics');

    // Yaksa views
    vRegistry.registerView('yaksa.member.list', MockComponent, {
        type: 'list',
        cptName: 'member',
        serviceGroups: ['yaksa'],
        priority: 100,
    }, 'membership-yaksa');

    vRegistry.registerView('yaksa.member.profile', MockComponent, {
        type: 'detail',
        cptName: 'member',
        serviceGroups: ['yaksa'],
        priority: 100,
    }, 'membership-yaksa');

    vRegistry.registerView('yaksa.post.list', MockComponent, {
        type: 'list',
        cptName: 'forum_post',
        serviceGroups: ['yaksa'],
        priority: 100,
    }, 'forum-yaksa');

    vRegistry.registerView('yaksa.course.list', MockComponent, {
        type: 'list',
        cptName: 'course',
        serviceGroups: ['yaksa'],
        priority: 100,
    }, 'lms-yaksa');

    vRegistry.registerView('yaksa.credit.list', MockComponent, {
        type: 'list',
        cptName: 'credit',
        serviceGroups: ['yaksa'],
        priority: 100,
    }, 'lms-yaksa');

    // Tourist views
    vRegistry.registerView('tourist.tour.list', MockComponent, {
        type: 'list',
        cptName: 'tour',
        serviceGroups: ['tourist'],
        priority: 100,
    }, 'tourist-core');

    vRegistry.registerView('tourist.booking.list', MockComponent, {
        type: 'list',
        cptName: 'booking',
        serviceGroups: ['tourist'],
        priority: 100,
    }, 'tourist-core');

    // Sellerops views
    vRegistry.registerView('sellerops.inventory.list', MockComponent, {
        type: 'list',
        cptName: 'inventory',
        serviceGroups: ['sellerops'],
        priority: 100,
    }, 'sellerops');

    vRegistry.registerView('sellerops.order.list', MockComponent, {
        type: 'list',
        cptName: 'order',
        serviceGroups: ['sellerops'],
        priority: 100,
    }, 'sellerops');

    // Supplierops views
    vRegistry.registerView('supplierops.catalog.list', MockComponent, {
        type: 'list',
        cptName: 'catalog',
        serviceGroups: ['supplierops'],
        priority: 100,
    }, 'supplierops');

    vRegistry.registerView('supplierops.offer.list', MockComponent, {
        type: 'list',
        cptName: 'offer',
        serviceGroups: ['supplierops'],
        priority: 100,
    }, 'supplierops');

    // Generic views (lower priority - used as fallback)
    vRegistry.registerView('generic.product.list', MockComponent, {
        type: 'list',
        cptName: 'product',
        priority: 10,
    }, 'cms-core');
}

/**
 * Setup multi-tenant test environment
 * Creates 15 tenants across 5 service groups
 */
export async function setupMultiTenantTests(
    dataSource: DataSource
): Promise<MultiTenantTestContext> {
    // Create tenant factory
    const factory = new TenantFactory(dataSource);

    // Generate all tenants
    const tenants = await factory.generateSimulation();

    // Organize by service group for easy access in tests
    const cosmeticsTenants = factory.getTenantsByServiceGroup('cosmetics');
    const yaksaTenants = factory.getTenantsByServiceGroup('yaksa');
    const touristTenants = factory.getTenantsByServiceGroup('tourist');
    const selleropsTenants = factory.getTenantsByServiceGroup('sellerops');
    const supplieropsTenants = factory.getTenantsByServiceGroup('supplierops');

    // Register test data in registries
    registerTestNavigationItems(navigationRegistry);
    registerTestViews(viewRegistry);

    const context: MultiTenantTestContext = {
        dataSource,
        factory,
        tenants,
        cosmeticsTenants,
        yaksaTenants,
        touristTenants,
        selleropsTenants,
        supplieropsTenants,
        navigationRegistry,
        viewRegistry,
    };

    return context;
}

/**
 * Teardown multi-tenant test environment
 * Cleans up all created tenants
 */
export async function teardownMultiTenantTests(
    context: MultiTenantTestContext
): Promise<void> {
    await context.factory.cleanup();

    // Clear test data from registries
    context.navigationRegistry.clear();
    context.viewRegistry.clear();
}

/**
 * Get a single tenant by service group and index (1-based)
 */
export function getTenant(
    context: MultiTenantTestContext,
    serviceGroup: string,
    index: number
): SimulatedTenant | undefined {
    const tenants = context.factory.getTenantsByServiceGroup(serviceGroup);
    return tenants[index - 1]; // Convert to 0-based
}

/**
 * Get first tenant from each service group (for quick access in tests)
 */
export function getRepresentativeTenants(
    context: MultiTenantTestContext
): Record<string, SimulatedTenant> {
    return {
        cosmetics: context.cosmeticsTenants[0],
        yaksa: context.yaksaTenants[0],
        tourist: context.touristTenants[0],
        sellerops: context.selleropsTenants[0],
        supplierops: context.supplieropsTenants[0],
    };
}

// Re-export ServiceGroup type for convenience
export type { ServiceGroup };
