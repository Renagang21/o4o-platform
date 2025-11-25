import { Application, Request, Response, RequestHandler } from 'express';
import { standardLimiter, publicLimiter, settingsLimiter, ssoCheckLimiter, userPermissionsLimiter, enrollmentLimiter, adminReviewLimiter } from './rate-limiters.config.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { errorHandler, notFoundHandler } from '../middleware/error-handler.js';
import { deprecatedRoute, logDeprecatedUsage } from '../middleware/deprecated.middleware.js';
import { AppDataSource } from '../database/connection.js';
import { Post } from '../entities/Post.js';
import logger from '../utils/logger.js';

// Import all route modules
import authRoutes from '../routes/auth.js';
import authV2Routes from '../routes/auth-v2.js';
import socialAuthRoutes from '../routes/social-auth.js';
import authenticationRoutes from '../routes/authentication.routes.js'; // NEW: Unified authentication routes
import userRoutes from '../routes/user.js';
import userManagementRoutes from '../routes/users.routes.js';
import usersV1Routes from '../routes/v1/users.routes.js';
import userRoleRoutes from '../routes/v1/userRole.routes.js';
import adminRoutes from '../routes/admin.js';
import ecommerceSettingsRoutes from '../routes/ecommerce/settingsRoutes.js';
import cptRoutes from '../routes/cpt.js';
import postCreationRoutes from '../routes/post-creation/index.js';
import servicesRoutes from '../routes/services.js';
import contentRoutes from '../routes/content.js';
import cmsRoutes from '../routes/content/index.js';
import publicRoutes from '../routes/public.js';
import settingsRoutes from '../routes/settingsRoutes.js';
import emailAuthRoutes from '../routes/email-auth.routes.js';
import linkedAccountsRoutes from '../routes/linked-accounts.js';
import accountLinkingRoutes from '../routes/account-linking.routes.js';
import inventoryRoutes from '../routes/inventory.js';
import formsRoutes from '../routes/forms.js';
import monitoringRoutes from '../routes/monitoring.js';
import sessionsRoutes from '../routes/sessions.js';
import postsRoutes from '../routes/posts.js';
import reusableBlocksRoutes from '../routes/reusable-blocks.routes.js';
import blockPatternsRoutes from '../routes/block-patterns.routes.js';
import aiShortcodesRoutes from '../routes/ai-shortcodes.js';
import aiBlocksRoutes from '../routes/ai-blocks.js';
import aiReferencesRoutes from '../routes/ai-references.js';
import aiProxyRoutes from '../routes/ai-proxy.js';
import aiSchemaRoutes from '../routes/ai-schema.js';
import templatePartsRoutes from '../routes/template-parts.routes.js';
import categoriesRoutes from '../routes/categories.js';
import menusRoutes from '../routes/menus.js';
import healthRoutes from '../routes/health.js';
import metricsRoutes from '../routes/metrics.js';
import contentV1Routes from '../routes/v1/content.routes.js';
import platformV1Routes from '../routes/v1/platform.routes.js';
import adminV1Routes from '../routes/v1/admin.routes.js';
import mediaV1Routes from '../routes/v1/media.routes.js';
import themeRoutes from '../routes/v1/theme.routes.js';
import platformAppsV1Routes from '../routes/v1/apps.routes.js'; // Platform modules (ecommerce, etc.)
import pluginsV1Routes from '../routes/v1/plugins.routes.js';
import settingsV1Routes from '../routes/v1/settings.routes.js';
import customizerV1Routes from '../routes/v1/customizer.routes.js';
import customizerPresetsRoutes from '../routes/v1/customizer-presets.routes.js';
import galleryRoutes from '../routes/gallery.routes.js';
import acfV1Routes from '../routes/v1/acf.routes.js';
import pagesV1Routes from '../routes/v1/pages.routes.js';
import previewRoutes from '../routes/preview.js';
import approvalV1Routes from '../routes/v1/approval.routes.js';
import aiSettingsRoutes from '../routes/v1/ai-settings.routes.js';
import orderRoutes from '../routes/orders.routes.js';
import paymentRoutes from '../routes/payments.routes.js';
import appsRoutes from '../routes/apps.js'; // NEW: App System (Google AI, OpenAI, etc.)
import emailSettingsRoutes from '../routes/email-settings.routes.js';
import smtpRoutes from '../routes/v1/smtp.routes.js';
import dropshippingCPTRoutes from '../routes/cpt/dropshipping.routes.js';
import partnerRoutes from '../routes/partner.routes.js';
import adminManagementRoutes from '../routes/admin.routes.js';
import migrationRoutes from '../routes/migration.routes.js';
import tagRoutes from '../routes/content/tagRoutes.js';
import previewProxyRoutes from '../routes/v1/preview.routes.js';
import dropshippingAdminRoutes from '../routes/admin/dropshipping.routes.js';
import userAdminRoutes from '../routes/admin/users.routes.js';
import supplierAdminRoutes from '../routes/admin/suppliers.routes.js';
import adminOrdersRoutes from '../routes/admin/orders.routes.js';
import productsRoutes from '../routes/products.js';
import storefrontRoutes from '../routes/storefront.routes.js';
import partnersRoutes from '../routes/partners.js';
import sellerProductsRoutes from '../routes/seller-products.js';

// P0 RBAC - Role Enrollment Routes (Phase B)
import enrollmentsRoutes from '../routes/enrollments.routes.js';
import adminEnrollmentsRoutes from '../routes/admin/enrollments.routes.js';

// P3 - Role Applications Routes
import roleApplicationsRoutes from '../routes/role-applications.js';
import adminRoleApplicationsRoutes from '../routes/admin-role-applications.js';

// Gutenberg Content Management Routes
import postsApiRoutes from '../routes/api/posts.js';
import pagesApiRoutes from '../routes/api/pages.js';
import categoriesApiRoutes from '../routes/api/categories.js';
import tagsApiRoutes from '../routes/api/tags.js';
import acfRoutes from '../routes/acf.js';

// CPT-ACF Preset Routes
import presetRoutes from '../modules/cpt-acf/routes/preset.routes.js';

// V2 API Routes
import queryV2Routes from '../routes/v2/query.routes.js';
import sellerV2Routes from '../routes/v2/seller.routes.js';
import supplierV2Routes from '../routes/v2/supplier.routes.js';

// Phase PD-7 - Notifications
import notificationsRoutes from '../routes/notifications.routes.js';

// Entity API Routes (SSOT for dropshipping)
import entityRoutes from '../routes/entity/dropshipping-entity.routes.js';

// Phase 2 - Tracking & Commission Routes
import trackingRoutes from '../routes/v1/tracking.routes.js';
import operationsRoutes from '../routes/v1/operations.routes.js';

// Phase 3 - Search Routes
import searchRoutes from '../routes/v1/search.routes.js';

// Phase 3 - Widget Areas Routes
import widgetAreasRoutes from '../routes/v1/widget-areas.routes.js';

// Phase 4 - Cart Routes
import cartRoutes from '../routes/v1/cart.routes.js';

// Phase 5 - Role Applications Routes
import applicationsRoutes from '../routes/v1/applications.routes.js';

// Phase 7 - Partner Analytics Routes
import partnerAnalyticsRoutes from '../routes/analytics/partner-analytics.routes.js';

// Phase 8/9 - Supplier Policy & Seller Authorization Routes
import dsSellerAuthorizationRoutes from '../routes/ds-seller-authorization.routes.js';
import dsSellerProductRoutes from '../routes/ds-seller-product.routes.js';
import dsSettlementsRoutes from '../routes/ds-settlements.routes.js';

// Phase 6-5 - Partner Links, Analytics & Settlements Routes
import partnerLinksRoutes from '../routes/partner/links.routes.js';
import partnerAnalyticsV2Routes from '../routes/partner/analytics.routes.js';
import partnerSettlementsRoutes from '../routes/partner/settlements.routes.js';
import supplierSettlementsRoutes from '../routes/supplier/settlements.routes.js';
import sellerSettlementsRoutes from '../routes/seller/settlements.routes.js';
import adminSettlementsRoutes from '../routes/admin/settlements.routes.js';

// Phase PD-1 - Seller Dashboard Routes
import sellerDashboardRoutes from '../routes/seller-dashboard.routes.js';

// R-6-4 - Customer Dashboard Routes
import customerDashboardRoutes from '../routes/customer-dashboard.routes.js';

// R-6-5 - Wishlist Routes
import wishlistRoutes from '../routes/wishlist.routes.js';

// R-6-9 - Customer Orders Routes
import customerOrdersRoutes from '../routes/customer-orders.routes.js';

// Phase PD-8 - Admin Job Routes
import adminJobsRoutes from '../routes/admin/admin-jobs.routes.js';

// Phase PD-9 - Multichannel RPA Routes
import channelsRoutes from '../routes/v1/channels.routes.js';

// Dashboard controller
import { DashboardController } from '../controllers/dashboardController.js';

// UserRole controller
import { UserRoleController } from '../controllers/v1/userRole.controller.js';

/**
 * Setup all application routes
 * Organized by priority and feature domain
 */
export function setupRoutes(app: Application): void {
  // ============================================================================
  // 1. HEALTH & MONITORING (No rate limiting - highest priority)
  // ============================================================================
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      service: 'api-server'
    });
  });

  app.use('/api/health', healthRoutes);
  app.use('/metrics', metricsRoutes);

  app.get('/api/auth/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'auth',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/ecommerce/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'ecommerce',
      timestamp: new Date().toISOString()
    });
  });

  // ============================================================================
  // 2. AUTHENTICATION ROUTES (Before rate limiting)
  // ============================================================================
  // NEW: Unified authentication routes (recommended)
  app.use('/api/v1/authentication', authenticationRoutes);

  // Legacy: Basic auth routes (JWT-based) - @deprecated Use /api/v1/authentication instead
  app.use('/api/auth', authRoutes);
  app.use('/api/v1/auth', authRoutes);

  // Legacy: Cookie-based auth routes - @deprecated Use /api/v1/authentication instead
  app.use(
    '/api/v1/auth/cookie',
    deprecatedRoute('/api/v1/authentication', '2025-12-31T00:00:00Z'),
    logDeprecatedUsage('/api/v1/auth/cookie'),
    authV2Routes
  );

  // Social auth
  app.use('/api/v1/social', socialAuthRoutes);

  // Email auth
  app.use('/api/auth/email', emailAuthRoutes);

  // Account linking
  app.use('/api/auth/accounts', accountLinkingRoutes);

  // Legacy: Unified auth routes - @deprecated REMOVED (use /api/v1/authentication instead)
  // Routes have been removed after deprecation period

  // Linked accounts
  app.use('/accounts', linkedAccountsRoutes);
  app.use('/api/accounts', linkedAccountsRoutes);
  app.use('/api/v1/accounts', linkedAccountsRoutes);

  // ============================================================================
  // 3. PUBLIC ROUTES (Lenient rate limiting)
  // ============================================================================
  // Public API
  app.use('/api/public', publicLimiter, publicRoutes);
  app.use('/api/v1/public', publicLimiter, publicRoutes);

  // Public permalink settings
  app.get('/api/public/permalink-settings', async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          structure: '/%postname%/',
          categoryBase: 'category',
          tagBase: 'tag',
          removeStopWords: false,
          maxUrlLength: 75,
          autoFlushRules: true,
          enableSeoWarnings: true
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get permalink settings'
      });
    }
  });

  // Gutenberg Content Routes (public access)
  // Phase 2 Note: /api/posts is deprecated, use /api/v1/posts instead
  app.use('/api/posts', publicLimiter, postsApiRoutes);
  app.use('/api/v1/posts', publicLimiter, postsApiRoutes);
  app.use('/api/pages', publicLimiter, pagesApiRoutes);
  app.use('/api/v1/pages', publicLimiter, pagesApiRoutes);
  app.use('/api/categories', publicLimiter, categoriesApiRoutes);
  app.use('/api/tags', publicLimiter, tagsApiRoutes);

  // Gallery routes (public)
  app.use('/api/media/gallery', galleryRoutes);
  app.use('/api/media', galleryRoutes);

  // Preview routes
  app.use('/api/preview', publicLimiter, previewRoutes);
  app.use('/api/v1/preview', previewProxyRoutes);

  // ============================================================================
  // 4. SETTINGS ROUTES (Lenient rate limiting - before standard limiter)
  // ============================================================================
  // Public roles endpoint
  app.get('/api/v1/users/roles', (req: Request, res: Response) => {
    return UserRoleController.getRoles(req, res);
  });

  // Settings routes
  app.use('/api/v1/settings', settingsLimiter, settingsV1Routes); // Admin settings routes (OAuth, reading, etc.)
  app.use('/api/v1/customizer', settingsLimiter, customizerV1Routes);
  app.use('/api/customizer', settingsLimiter, customizerV1Routes);
  app.use('/api/v1/customizer-presets', settingsLimiter, customizerPresetsRoutes);
  app.use('/api/settings', settingsLimiter, settingsRoutes); // Legacy public settings
  app.use('/settings', settingsLimiter, settingsRoutes); // Legacy public settings

  // ============================================================================
  // 5. V1 API ROUTES (Protected with standard rate limiting)
  // ============================================================================
  // User management
  app.use('/api/v1/users', userPermissionsLimiter, usersV1Routes);
  app.use('/v1/users', userPermissionsLimiter, usersV1Routes);
  app.use('/api/users', standardLimiter, userRoutes);

  // User role and permissions management
  app.use('/api/v1/userRole', userPermissionsLimiter, userRoleRoutes);

  // App System (NEW - Google AI, OpenAI, etc.)
  app.use('/api/v1/apps', standardLimiter, appsRoutes);

  // Platform Apps (OLD - ecommerce, forum, etc. modules)
  app.use('/api/v1/platform/modules', standardLimiter, platformAppsV1Routes);

  // AI Routes
  app.use('/api/v1/ai/shortcodes', publicLimiter, aiShortcodesRoutes);
  app.use('/api/v1/ai/blocks', publicLimiter, aiBlocksRoutes);
  app.use('/api/v1/ai/references', standardLimiter, aiReferencesRoutes); // NEW: AI Reference Management
  app.use('/api/v1/ai/schema', publicLimiter, aiSchemaRoutes);
  app.use('/api/v1/ai', standardLimiter, aiProxyRoutes);
  app.use('/api/v1/ai-settings', standardLimiter, aiSettingsRoutes);

  // Content Management
  app.use('/api/v1/content', contentV1Routes);
  app.use('/api/v1/platform', platformV1Routes);
  app.use('/api/v1/media', mediaV1Routes);
  app.use('/api/v1/pages', pagesV1Routes);
  app.use('/api/v1/acf', acfV1Routes);

  // CPT-ACF Presets (Form, View, Template)
  app.use('/api/v1/presets', standardLimiter, presetRoutes);

  // V2 API - Advanced Query System
  app.use('/api/v2', standardLimiter, queryV2Routes);

  // V2 API - Seller Workflow (PD-3)
  app.use('/api/v2/seller', standardLimiter, sellerV2Routes);

  // V2 API - Supplier Orders (PD-4)
  app.use('/api/v2/supplier', standardLimiter, supplierV2Routes);

  // V2 API - Notifications (PD-7)
  app.use('/api/v2/notifications', standardLimiter, notificationsRoutes);

  // Entity API - SSOT for Dropshipping (Supplier, Partner)
  app.use('/api/v1/entity', standardLimiter, entityRoutes);

  // Phase 2 - Tracking & Commission (includes own rate limiters)
  app.use('/api/v1/tracking', trackingRoutes);
  app.use('/api/v1/operations', operationsRoutes); // Phase 2.2 - Operations Panel

  // Phase 3 - Search
  app.use('/api/v1/search', publicLimiter, searchRoutes);
  app.use('/api/search', publicLimiter, searchRoutes);

  // Phase 3 - Widget Areas
  app.use('/api/v1/widget-areas', standardLimiter, widgetAreasRoutes);

  // Phase 4 - Cart
  app.use('/api/v1/cart', publicLimiter, cartRoutes);
  app.use('/api/cart', publicLimiter, cartRoutes);

  // Phase 5 - Role Applications (Supplier, Seller, Partner)
  app.use('/api/v1/applications', standardLimiter, applicationsRoutes);

  // P0 RBAC - Role Enrollments (Phase B)
  app.use('/api/enrollments', enrollmentLimiter, enrollmentsRoutes);
  app.use('/api/v1/enrollments', enrollmentLimiter, enrollmentsRoutes);

  // P3 - Role Applications
  app.use('/api/v2/roles', standardLimiter, roleApplicationsRoutes);
  app.use('/api/v2/admin/roles', standardLimiter, adminRoleApplicationsRoutes);

  // Phase 7 - Partner Analytics (OLD PATH - Deprecated)
  app.use('/api/v1/analytics/partner', standardLimiter, partnerAnalyticsRoutes);

  // Phase 6-5 - Partner Links, Analytics & Settlements (NEW PATHS)
  app.use('/api/v1/partner/links', standardLimiter, partnerLinksRoutes);
  app.use('/api/v1/partner/analytics', standardLimiter, partnerAnalyticsV2Routes);
  app.use('/api/v1/partner/settlements', standardLimiter, partnerSettlementsRoutes);
  app.use('/api/v1/supplier/settlements', standardLimiter, supplierSettlementsRoutes);
  app.use('/api/v1/seller/settlements', standardLimiter, sellerSettlementsRoutes);
  app.use('/api/v1/admin/settlements', standardLimiter, adminSettlementsRoutes);

  // Phase PD-1 - Seller Dashboard
  app.use('/api/v1/seller/dashboard', standardLimiter, sellerDashboardRoutes);

  // R-6-4 - Customer Dashboard
  app.use('/api/v1/customer/dashboard', standardLimiter, customerDashboardRoutes);

  // R-6-5 - Wishlist
  app.use('/api/v1/customer/wishlist', standardLimiter, wishlistRoutes);

  // R-6-9 - Customer Orders
  app.use('/api/v1/customer/orders', standardLimiter, customerOrdersRoutes);

  // Phase PD-9 - Multichannel RPA
  app.use('/api/v1/channels', standardLimiter, channelsRoutes);

  // Phase 8/9 - Supplier Policy & Seller Authorization
  app.use('/api/v1/ds/seller/authorizations', standardLimiter, dsSellerAuthorizationRoutes);
  app.use('/api/v1/ds/seller/products', standardLimiter, dsSellerProductRoutes);
  app.use('/api/v1/ds/settlements', standardLimiter, dsSettlementsRoutes);

  // Categories & Menus (unified menu system)
  app.use('/api/v1/categories', categoriesRoutes);
  app.use('/api/v1/menus', menusRoutes); // All menu functionality in one route
  app.use('/api/menus', menusRoutes); // Public alias

  // Admin routes
  app.use('/api/admin', standardLimiter, adminRoutes);
  app.use('/api/v1/admin', adminV1Routes);
  app.use('/api/v1/approval/admin', adminManagementRoutes);
  app.use('/api/v1/approval', approvalV1Routes);

  // Email & SMTP
  app.use('/api/v1/email', emailSettingsRoutes);
  app.use('/api/v1/smtp', smtpRoutes);

  // Sessions & Monitoring
  app.use('/api/v1/sessions', standardLimiter, sessionsRoutes);
  app.use('/api/v1/monitoring', monitoringRoutes);
  app.use('/api/monitoring', monitoringRoutes);

  // Forms & Inventory
  app.use('/api/forms', formsRoutes);
  app.use('/api/inventory', inventoryRoutes);

  // Dropshipping & Ecommerce
  app.use('/api/v1/dropshipping', dropshippingCPTRoutes);
  app.use('/api/v1/dropshipping/partner', partnerRoutes);
  app.use('/api/v1/products', productsRoutes);
  app.use('/api/products', productsRoutes); // Legacy compatibility
  app.use('/api/partners', partnersRoutes);
  app.use('/api/seller-products', sellerProductsRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/v1/payments', paymentRoutes);

  // Phase 3: Storefront Order API
  app.use('/api/v1/storefront/orders', storefrontRoutes);
  app.use('/ecommerce', ecommerceSettingsRoutes);

  // Themes & Plugins
  app.use('/api/v1/themes', themeRoutes);
  app.use('/api/v1/apps/plugins', pluginsV1Routes);

  // Migration
  app.use('/api/v1/migration', migrationRoutes);

  // ============================================================================
  // 6. NON-V1 ROUTES (Legacy & Direct routes)
  // ============================================================================
  // Phase 2 Note: /api/cpt is deprecated, use /api/v1/cpt instead
  app.use('/api/cpt', standardLimiter, cptRoutes);
  app.use('/api/v1/cpt', standardLimiter, cptRoutes);
  app.use('/api/post-creation', standardLimiter, postCreationRoutes);
  app.use('/api/services', standardLimiter, servicesRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/cms', cmsRoutes);
  app.use('/api/reusable-blocks', reusableBlocksRoutes);
  app.use('/api/block-patterns', blockPatternsRoutes);
  app.use('/api/template-parts', templatePartsRoutes);
  app.use('/api/v1/template-parts', templatePartsRoutes);
  app.use('/api', tagRoutes);
  app.use('/api/acf', acfRoutes);

  // Admin sub-routes (v1)
  app.use('/api/v1/admin/dropshipping', standardLimiter, dropshippingAdminRoutes);
  app.use('/api/v1/admin/users', standardLimiter, userAdminRoutes);
  app.use('/api/v1/admin/suppliers', standardLimiter, supplierAdminRoutes);
  app.use('/api/v1/admin/orders', standardLimiter, adminOrdersRoutes);

  // Admin sub-routes (legacy)
  app.use('/api/admin/dropshipping', standardLimiter, dropshippingAdminRoutes);
  app.use('/api/admin/users', standardLimiter, userAdminRoutes);
  app.use('/api/admin/suppliers', standardLimiter, supplierAdminRoutes);
  app.use('/api/admin/orders', standardLimiter, adminOrdersRoutes);

  // P0 RBAC - Admin Enrollment Review (Phase B)
  app.use('/api/admin/enrollments', adminReviewLimiter, adminEnrollmentsRoutes);
  app.use('/api/v1/admin/enrollments', adminReviewLimiter, adminEnrollmentsRoutes);

  // Phase PD-8 - Admin Job Management
  app.use('/api/v2/admin/jobs', standardLimiter, adminJobsRoutes);

  // ============================================================================
  // 7. DASHBOARD ENDPOINTS
  // ============================================================================
  app.get('/ecommerce/dashboard/stats', DashboardController.getEcommerceStats as RequestHandler);
  app.get('/api/users/stats', DashboardController.getUserStats as RequestHandler);
  app.get('/api/admin/notifications', DashboardController.getNotifications as RequestHandler);
  app.get('/api/admin/activities', DashboardController.getActivities as RequestHandler);
  app.get('/api/system/health', DashboardController.getSystemHealth as RequestHandler);
  app.get('/api/admin/stats', DashboardController.getContentStats as RequestHandler);
  app.get('/api/dashboard/overview', DashboardController.getDashboardOverview as RequestHandler);

  // Post publish endpoint
  app.post('/api/posts/:id/publish', authenticateToken as RequestHandler, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!AppDataSource.isInitialized) {
        logger.error('Database not initialized');
        return res.status(503).json({
          error: { code: 'DB_NOT_READY', message: 'Database connection not available' }
        });
      }

      const postRepository = AppDataSource.getRepository(Post);
      const post = await postRepository.findOne({
        where: { id },
        relations: ['author', 'categories', 'tags']
      });

      if (!post) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Post not found' }
        });
      }

      post.status = 'publish';
      post.published_at = new Date();
      const updatedPost = await postRepository.save(post);

      return res.json({
        success: true,
        data: updatedPost
      });
    } catch (error) {
      logger.error('Error publishing post:', error);
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to publish post', details: (error as Error).message }
      });
    }
  });

  // ============================================================================
  // 8. ROOT ENDPOINT
  // ============================================================================
  app.get('/', (req, res) => {
    res.json({
      message: 'Neture API Server',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        users: '/api/users',
        admin: '/api/admin',
        ecommerce: '/api/ecommerce',
        orders: '/api/orders',
        cpt: '/api/cpt',
        postCreation: '/api/post-creation',
        services: '/api/services',
        content: {
          pages: '/api/admin/pages',
          media: '/api/admin/media',
          templates: '/api/admin/templates',
          customFields: '/api/admin/custom-field-groups'
        },
        forms: '/api/forms'
      },
      frontend: process.env.FRONTEND_URL || 'http://localhost:3011'
    });
  });

  // ============================================================================
  // 9. STUB ROUTES FOR ADMIN DASHBOARD COMPATIBILITY
  // ============================================================================
  // These routes return 200 with helpful messages instead of 404
  // Admin dashboard may request these endpoints for main site features

  app.get('/api/v1/auth/login', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Use POST method for login'
    });
  });

  app.get('/api/v1/template-parts/area/:area/active', (req, res) => {
    res.status(200).json({
      success: true,
      data: null,
      message: 'No template parts configured'
    });
  });

  app.get('/api/v1/settings/customizer', (req, res) => {
    res.status(200).json({
      success: true,
      data: {},
      message: 'No customizer settings configured'
    });
  });

  // ============================================================================
  // 10. ERROR HANDLERS (MUST BE LAST)
  // ============================================================================
  app.use(errorHandler as any);
  app.use('*', notFoundHandler as any);

  logger.info('✅ Routes configured successfully');
}
