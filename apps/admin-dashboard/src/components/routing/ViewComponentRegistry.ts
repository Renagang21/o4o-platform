/**
 * View Component Registry
 *
 * Phase P0 Task B: Dynamic Routing System
 *
 * Maps viewId to lazy-loaded React components.
 * This serves as the bridge between manifest.viewTemplates and actual components.
 *
 * Migration Path:
 * 1. Components are registered here by viewId
 * 2. DynamicRouteLoader uses this to resolve viewId → component
 * 3. Apps can gradually migrate to manifest-based routing
 * 4. Eventually, component registration can move to app packages themselves
 */

import { lazy, ComponentType } from 'react';

// Type for lazy-loaded component
type LazyComponent = ComponentType<any>;

/**
 * Component entry with metadata
 */
interface ComponentEntry {
  component: React.LazyExoticComponent<LazyComponent>;
  /** Associated app for this component */
  appId?: string;
  /** Description for debugging */
  description?: string;
}

/**
 * View Component Registry
 *
 * Singleton registry for viewId → component mappings.
 * Supports dynamic registration from app packages.
 */
class ViewComponentRegistryClass {
  private components = new Map<string, ComponentEntry>();

  /**
   * Register a component by viewId
   */
  register(
    viewId: string,
    component: React.LazyExoticComponent<LazyComponent>,
    options?: { appId?: string; description?: string }
  ): void {
    if (this.components.has(viewId)) {
      console.warn(`[ViewComponentRegistry] Overwriting component for viewId: ${viewId}`);
    }

    this.components.set(viewId, {
      component,
      appId: options?.appId,
      description: options?.description,
    });
  }

  /**
   * Get component by viewId
   */
  get(viewId: string): React.LazyExoticComponent<LazyComponent> | undefined {
    return this.components.get(viewId)?.component;
  }

  /**
   * Check if viewId has a registered component
   */
  has(viewId: string): boolean {
    return this.components.has(viewId);
  }

  /**
   * Get component entry with metadata
   */
  getEntry(viewId: string): ComponentEntry | undefined {
    return this.components.get(viewId);
  }

  /**
   * Get all registered viewIds
   */
  list(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Get statistics
   */
  getStats(): { total: number; byApp: Record<string, number> } {
    const byApp: Record<string, number> = {};

    this.components.forEach((entry) => {
      const appId = entry.appId || 'unknown';
      byApp[appId] = (byApp[appId] || 0) + 1;
    });

    return {
      total: this.components.size,
      byApp,
    };
  }

  /**
   * Clear registry (for testing)
   */
  clear(): void {
    this.components.clear();
  }
}

// Export singleton
export const viewComponentRegistry = new ViewComponentRegistryClass();

// ============================================================================
// REGISTER CMS-CORE COMPONENTS
// ============================================================================

// CMS V2 Pages
viewComponentRegistry.register(
  'cms-core.templates-list',
  lazy(() => import('@/pages/cms/cpts/CMSCPTList')), // TODO: Replace with actual templates list
  { appId: 'cms-core', description: 'Templates List' }
);

viewComponentRegistry.register(
  'cms-core.cpt-list',
  lazy(() => import('@/pages/cms/cpts/CMSCPTList')),
  { appId: 'cms-core', description: 'CPT List' }
);

viewComponentRegistry.register(
  'cms-core.cpt-form',
  lazy(() => import('@/pages/cms/cpts/CPTForm')),
  { appId: 'cms-core', description: 'CPT Form' }
);

viewComponentRegistry.register(
  'cms-core.acf-list',
  lazy(() => import('@/pages/cms/fields/CMSFieldList')),
  { appId: 'cms-core', description: 'ACF Fields List' }
);

viewComponentRegistry.register(
  'cms-core.acf-form',
  lazy(() => import('@/pages/cms/fields/FieldForm')),
  { appId: 'cms-core', description: 'ACF Field Form' }
);

viewComponentRegistry.register(
  'cms-core.views-list',
  lazy(() => import('@/pages/cms/views/CMSViewList')),
  { appId: 'cms-core', description: 'Views List' }
);

viewComponentRegistry.register(
  'cms-core.views-form',
  lazy(() => import('@/pages/cms/views/ViewForm')),
  { appId: 'cms-core', description: 'View Form' }
);

viewComponentRegistry.register(
  'cms-core.pages-list',
  lazy(() => import('@/pages/cms/pages/CMSPageList')),
  { appId: 'cms-core', description: 'CMS Pages List' }
);

viewComponentRegistry.register(
  'cms-core.pages-form',
  lazy(() => import('@/pages/cms/pages/PageForm')),
  { appId: 'cms-core', description: 'CMS Page Form' }
);

viewComponentRegistry.register(
  'cms-core.view-designer',
  lazy(() => import('@/pages/cms/designer/ViewDesigner')),
  { appId: 'cms-core', description: 'Visual View Designer' }
);

// Media Library
viewComponentRegistry.register(
  'cms-core.media-list',
  lazy(() => import('@/pages/media/Media')),
  { appId: 'cms-core', description: 'Media Library' }
);

// ============================================================================
// REGISTER FORUM COMPONENTS
// ============================================================================

viewComponentRegistry.register(
  'forum.boards-list',
  lazy(() => import('@o4o/forum-core/src/admin-ui/pages/ForumBoardList')),
  { appId: 'forum', description: 'Forum Board List' }
);

viewComponentRegistry.register(
  'forum.categories',
  lazy(() => import('@o4o/forum-core/src/admin-ui/pages/ForumCategories')),
  { appId: 'forum', description: 'Forum Categories' }
);

viewComponentRegistry.register(
  'forum.post-detail',
  lazy(() => import('@o4o/forum-core/src/admin-ui/pages/ForumPostDetail')),
  { appId: 'forum', description: 'Forum Post Detail' }
);

viewComponentRegistry.register(
  'forum.post-form',
  lazy(() => import('@o4o/forum-core/src/admin-ui/pages/ForumPostForm')),
  { appId: 'forum', description: 'Forum Post Form' }
);

// ============================================================================
// REGISTER MEMBERSHIP COMPONENTS
// ============================================================================

viewComponentRegistry.register(
  'membership-yaksa.dashboard',
  lazy(() => import('@/pages/membership/dashboard/MembershipDashboard')),
  { appId: 'membership-yaksa', description: 'Membership Dashboard' }
);

viewComponentRegistry.register(
  'membership-yaksa.members-list',
  lazy(() => import('@/pages/membership/members/MemberManagement')),
  { appId: 'membership-yaksa', description: 'Member Management' }
);

viewComponentRegistry.register(
  'membership-yaksa.member-detail',
  lazy(() => import('@/pages/membership/members/MemberDetail')),
  { appId: 'membership-yaksa', description: 'Member Detail' }
);

viewComponentRegistry.register(
  'membership-yaksa.verifications',
  lazy(() => import('@/pages/membership/verifications/VerificationManagement')),
  { appId: 'membership-yaksa', description: 'Verifications' }
);

viewComponentRegistry.register(
  'membership-yaksa.categories',
  lazy(() => import('@/pages/membership/categories/CategoryManagement')),
  { appId: 'membership-yaksa', description: 'Categories' }
);

// ============================================================================
// REGISTER SELLEROPS COMPONENTS
// ============================================================================

viewComponentRegistry.register(
  'sellerops.router',
  lazy(() => import('@/pages/sellerops/SellerOpsRouter')),
  { appId: 'sellerops', description: 'SellerOps Router' }
);

// ============================================================================
// REGISTER SUPPLIEROPS COMPONENTS
// ============================================================================

viewComponentRegistry.register(
  'supplierops.router',
  lazy(() => import('@/pages/supplierops/SupplierOpsRouter')),
  { appId: 'supplierops', description: 'SupplierOps Router' }
);

// ============================================================================
// REGISTER PARTNEROPS COMPONENTS
// ============================================================================

viewComponentRegistry.register(
  'partnerops.router',
  lazy(() => import('@/pages/partnerops/PartnerOpsRouter')),
  { appId: 'partnerops', description: 'PartnerOps Router' }
);

// ============================================================================
// REGISTER DIGITAL SIGNAGE COMPONENTS
// ============================================================================

viewComponentRegistry.register(
  'digital-signage.router',
  lazy(() => import('@/pages/digital-signage/DigitalSignageRouter')),
  { appId: 'digital-signage-core', description: 'Digital Signage Router' }
);

// ============================================================================
// REGISTER LMS-YAKSA COMPONENTS
// ============================================================================

viewComponentRegistry.register(
  'lms-yaksa.router',
  lazy(() => import('@/pages/lms-yaksa/LmsYaksaRouter')),
  { appId: 'lms-yaksa', description: 'LMS Yaksa Router' }
);

// ============================================================================
// FALLBACK COMPONENTS
// ============================================================================

// Default fallback for unregistered views
const FallbackComponent = lazy(() =>
  Promise.resolve({
    default: () => {
      return null; // This will be replaced by the actual fallback
    },
  })
);

export default viewComponentRegistry;
