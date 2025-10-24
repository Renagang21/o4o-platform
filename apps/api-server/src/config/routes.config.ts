import { Application, Request, Response, RequestHandler } from 'express';
import { standardLimiter, publicLimiter, settingsLimiter, ssoCheckLimiter, userPermissionsLimiter } from './rate-limiters.config';
import { authenticateToken } from '../middleware/auth';
import { errorHandler, notFoundHandler } from '../middleware/error-handler';
import { AppDataSource } from '../database/connection';
import { Post } from '../entities/Post';
import logger from '../utils/logger';

// Import all route modules
import authRoutes from '../routes/auth';
import authV2Routes from '../routes/auth-v2';
import socialAuthRoutes from '../routes/social-auth';
import userRoutes from '../routes/user';
import userManagementRoutes from '../routes/users.routes';
import usersV1Routes from '../routes/v1/users.routes';
import adminRoutes from '../routes/admin';
import ecommerceSettingsRoutes from '../routes/ecommerce/settingsRoutes';
import cptRoutes from '../routes/cpt';
import postCreationRoutes from '../routes/post-creation';
import servicesRoutes from '../routes/services';
import signageRoutes from '../routes/signage';
import contentRoutes from '../routes/content';
import cmsRoutes from '../routes/content/index';
import publicRoutes from '../routes/public';
import settingsRoutes from '../routes/settingsRoutes';
import oauthSettingsRoutes from '../routes/settings.routes';
import emailAuthRoutes from '../routes/email-auth.routes';
import forumRoutes from '../routes/forum';
import linkedAccountsRoutes from '../routes/linked-accounts';
import accountLinkingRoutes from '../routes/account-linking.routes';
import unifiedAuthRoutes from '../routes/unified-auth.routes';
import inventoryRoutes from '../routes/inventory';
import formsRoutes from '../routes/forms';
import monitoringRoutes from '../routes/monitoring';
import sessionsRoutes from '../routes/sessions';
import postsRoutes from '../routes/posts';
import reusableBlocksRoutes from '../routes/reusable-blocks.routes';
import blockPatternsRoutes from '../routes/block-patterns.routes';
import aiShortcodesRoutes from '../routes/ai-shortcodes';
import aiBlocksRoutes from '../routes/ai-blocks';
import aiReferencesRoutes from '../routes/ai-references';
import aiProxyRoutes from '../routes/ai-proxy';
import aiSchemaRoutes from '../routes/ai-schema';
import templatePartsRoutes from '../routes/template-parts.routes';
import categoriesRoutes from '../routes/categories';
import menusRoutes from '../routes/menus';
import menuItemsRoutes from '../routes/menu-items';
import menuAdvancedRoutes from '../routes/menu-advanced';
import menuPhase3Routes from '../routes/menu-phase3';
import healthRoutes from '../routes/health';
import metricsRoutes from '../routes/metrics';
import contentV1Routes from '../routes/v1/content.routes';
import platformV1Routes from '../routes/v1/platform.routes';
import forumV1Routes from '../routes/v1/forum.routes';
import adminV1Routes from '../routes/v1/admin.routes';
import mediaV1Routes from '../routes/v1/media.routes';
import themeRoutes from '../routes/v1/theme.routes';
import platformAppsV1Routes from '../routes/v1/apps.routes'; // Platform modules (ecommerce, forum, etc.)
import pluginsV1Routes from '../routes/v1/plugins.routes';
import settingsV1Routes from '../routes/v1/settings.routes';
import customizerV1Routes from '../routes/v1/customizer.routes';
import galleryRoutes from '../routes/gallery.routes';
import acfV1Routes from '../routes/v1/acf.routes';
import pagesV1Routes from '../routes/v1/pages.routes';
import previewRoutes from '../routes/preview';
import approvalV1Routes from '../routes/v1/approval.routes';
import aiSettingsRoutes from '../routes/v1/ai-settings.routes';
import orderRoutes from '../routes/orders.routes';
import paymentRoutes from '../routes/payments.routes';
import appsRoutes from '../routes/apps'; // NEW: App System (Google AI, OpenAI, etc.)
import emailSettingsRoutes from '../routes/email-settings.routes';
import smtpRoutes from '../routes/v1/smtp.routes';
import dropshippingCPTRoutes from '../routes/cpt/dropshipping.routes';
import partnerRoutes from '../routes/partner.routes';
import adminManagementRoutes from '../routes/admin.routes';
import migrationRoutes from '../routes/migration.routes';
import tagRoutes from '../routes/content/tagRoutes';
import previewProxyRoutes from '../routes/v1/preview.routes';
import dropshippingAdminRoutes from '../routes/admin/dropshipping.routes';
import forumAdminRoutes from '../routes/admin/forum.routes';
import userAdminRoutes from '../routes/admin/users.routes';
import supplierAdminRoutes from '../routes/admin/suppliers.routes';
import productsRoutes from '../routes/products';
import partnersRoutes from '../routes/partners';
import sellerProductsRoutes from '../routes/seller-products';

// Gutenberg Content Management Routes
import postsApiRoutes from '../routes/api/posts';
import pagesApiRoutes from '../routes/api/pages';
import categoriesApiRoutes from '../routes/api/categories';
import tagsApiRoutes from '../routes/api/tags';
import acfRoutes from '../routes/acf';

// Dashboard controller
import { DashboardController } from '../controllers/dashboardController';

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
  // Basic auth routes (JWT-based)
  app.use('/api/auth', authRoutes);
  app.use('/api/v1/auth', authRoutes);

  // Cookie-based auth routes
  app.use('/api/v1/auth/cookie', authV2Routes);

  // Social auth
  app.use('/api/v1/social', socialAuthRoutes);

  // Email auth
  app.use('/api/auth/email', emailAuthRoutes);

  // Account linking
  app.use('/api/auth/accounts', accountLinkingRoutes);
  app.use('/api/auth/unified', unifiedAuthRoutes);

  // Linked accounts
  app.use('/accounts', linkedAccountsRoutes);
  app.use('/api/v1/accounts', linkedAccountsRoutes);

  // SSO check (with lenient rate limiting)
  app.use('/api/v1/accounts/sso/check', ssoCheckLimiter);
  app.use('/accounts/sso/check', ssoCheckLimiter);

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
  app.get('/api/v1/users/roles', (req, res) => {
    const { UserRoleController } = require('../controllers/v1/userRole.controller');
    return UserRoleController.getRoles(req, res);
  });

  // Settings routes
  app.use('/api/v1/settings', settingsLimiter, settingsV1Routes);
  app.use('/api/v1/customizer', settingsLimiter, customizerV1Routes);
  app.use('/api/customizer', settingsLimiter, customizerV1Routes);
  app.use('/api/settings', settingsLimiter, settingsRoutes);
  app.use('/settings', settingsLimiter, settingsRoutes);
  app.use('/v1/settings', settingsV1Routes);

  // ============================================================================
  // 5. V1 API ROUTES (Protected with standard rate limiting)
  // ============================================================================
  // User management
  app.use('/api/v1/users', userPermissionsLimiter, usersV1Routes);
  app.use('/v1/users', userPermissionsLimiter, usersV1Routes);
  app.use('/api/users', standardLimiter, userRoutes);

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

  // Categories & Menus
  app.use('/api/v1/categories', categoriesRoutes);
  app.use('/api/v1/menus', menusRoutes);
  app.use('/api/menus', menusRoutes);
  app.use('/api/v1/menu-items', menuItemsRoutes);
  app.use('/api/v1/menus-advanced', menuAdvancedRoutes);
  app.use('/api/v1/menus-phase3', menuPhase3Routes);

  // Admin routes
  app.use('/api/admin', standardLimiter, adminRoutes);
  app.use('/api/v1/admin', adminV1Routes);
  app.use('/api/v1/approval/admin', adminManagementRoutes);
  app.use('/api/v1/approval', approvalV1Routes);

  // Forum
  app.use('/api/forum', standardLimiter, forumRoutes);
  app.use('/api/v1/forum', forumV1Routes);

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
  app.use('/api/products', productsRoutes);
  app.use('/api/partners', partnersRoutes);
  app.use('/api/seller-products', sellerProductsRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/ecommerce', ecommerceSettingsRoutes);

  // Themes & Plugins
  app.use('/api/v1/themes', themeRoutes);
  app.use('/api/v1/apps/plugins', pluginsV1Routes);

  // Migration
  app.use('/api/v1/migration', migrationRoutes);

  // ============================================================================
  // 6. NON-V1 ROUTES (Legacy & Direct routes)
  // ============================================================================
  app.use('/api/cpt', standardLimiter, cptRoutes);
  app.use('/api/v1/cpt', standardLimiter, cptRoutes);
  app.use('/api/post-creation', standardLimiter, postCreationRoutes);
  app.use('/api/services', standardLimiter, servicesRoutes);
  app.use('/api/signage', standardLimiter, signageRoutes);
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
  app.use('/api/v1/admin/forum', standardLimiter, forumAdminRoutes);
  app.use('/api/v1/admin/users', standardLimiter, userAdminRoutes);
  app.use('/api/v1/admin/suppliers', standardLimiter, supplierAdminRoutes);

  // Admin sub-routes (legacy)
  app.use('/api/admin/dropshipping', standardLimiter, dropshippingAdminRoutes);
  app.use('/api/admin/forum', standardLimiter, forumAdminRoutes);
  app.use('/api/admin/users', standardLimiter, userAdminRoutes);
  app.use('/api/admin/suppliers', standardLimiter, supplierAdminRoutes);

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
        signage: '/api/signage',
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
  // 9. ERROR HANDLERS (MUST BE LAST)
  // ============================================================================
  app.use(errorHandler as any);
  app.use('*', notFoundHandler as any);

  logger.info('✅ Routes configured successfully');
}
