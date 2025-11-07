import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';
import logger from '../../utils/logger.js';
import { AppDataSource } from '../../database/connection.js';
import { Settings, ReadingSettings, PermalinkSettings } from '../../entities/Settings.js';
import { Post } from '../../entities/Post.js';
import { permalinkService } from '../../services/permalink.service.js';
import { settingsService } from '../../services/settingsService.js';
import { generateGlobalCSS } from '../../utils/customizer/css-generator.js';

const router: Router = Router();


// 설정 데이터 저장 (실제로는 DB 사용)
const settingsStore: Map<string, any> = new Map([
  ['general', {
    siteName: 'O4O Platform',
    siteDescription: '올인원 비즈니스 플랫폼',
    siteUrl: 'https://neture.co.kr',
    adminEmail: 'admin@neture.co.kr',
    timezone: 'Asia/Seoul',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
    language: 'ko',
    maintenanceMode: false,
    maintenanceMessage: '잠시 시스템 점검 중입니다.',
    allowRegistration: true,
    defaultUserRole: 'customer',
    requireEmailVerification: true,
    enableApiAccess: false,
    apiRateLimit: 100
  }],
  ['writing', {
    defaultPostCategory: 'uncategorized',
    defaultPostFormat: 'standard',
    enableMarkdown: true,
    enableRichEditor: true,
    autoSaveDraft: true,
    autoSaveInterval: 60,
    revisionsToKeep: 10,
    enableComments: true,
    requireCommentApproval: false,
    enablePingbacks: true,
    defaultCommentStatus: 'open',
    emailNewPost: false,
    allowEmojis: true
  }],
  ['reading', {
    postsPerPage: 10,
    feedItemsCount: 10,
    showFullContent: false,
    homepageDisplay: 'static_page',
    homepagePostsCount: 5,
    staticHomePage: 'test-homepage-id',
    staticPostsPage: null,
    enableRssFeed: true,
    enableSearch: true,
    searchEngine: 'internal',
    enableSitemap: true
  }],
  ['discussion', {
    enableComments: true,
    requireNameEmail: true,
    requireRegistration: false,
    closeCommentsAfterDays: 0,
    enableThreadedComments: true,
    threadDepth: 5,
    commentsPerPage: 50,
    defaultCommentOrder: 'oldest',
    requireModeration: false,
    moderationKeywords: [],
    blacklistKeywords: [],
    enableGravatar: true,
    defaultAvatar: 'mystery',
    maxLinks: 2,
    holdForModeration: false
  }],
  ['media', {
    thumbnailWidth: 150,
    thumbnailHeight: 150,
    mediumWidth: 300,
    mediumHeight: 300,
    largeWidth: 1024,
    largeHeight: 1024,
    uploadMaxSize: 10485760,
    allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    organizeByDate: true,
    optimizeImages: true,
    generateThumbnails: true,
    enableLazyLoad: true,
    cdnEnabled: false,
    cdnUrl: ''
  }],
  ['permalinks', {
    structure: '/%postname%/',
    categoryBase: 'category',
    tagBase: 'tag',
    customStructure: '',
    enablePrettyUrls: true,
    redirectOldUrls: true,
    trailingSlash: true,
    forceLowercase: false
  }],
  ['privacy', {
    enableCookieConsent: true,
    cookieConsentText: '이 사이트는 쿠키를 사용합니다.',
    privacyPolicyUrl: '/privacy',
    termsUrl: '/terms',
    enableGdpr: false,
    dataRetentionDays: 365,
    allowDataExport: true,
    allowDataDeletion: true,
    trackingEnabled: true,
    analyticsProvider: 'google',
    analyticsId: '',
    shareUserData: false
  }],
  ['oauth', {
    google: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      scopes: ['openid', 'profile', 'email']
    },
    kakao: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      scopes: ['profile_nickname', 'profile_image', 'account_email']
    },
    naver: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      scopes: ['name', 'email', 'profile_image']
    },
    enableSocialLogin: false,
    autoCreateUser: true,
    linkExistingAccount: true,
    requireEmailVerification: false
  }]
]);

/**
 * @route   GET /api/v1/settings/homepage
 * @desc    Get homepage settings (public endpoint for frontend)
 * @access  Public
 */
router.get('/homepage', async (req: Request, res: Response) => {
  const traceId = `hp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  try {
    // Enhanced logging for debugging and monitoring
    logger.debug('Homepage settings request:', {
      traceId,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      authorization: req.headers.authorization ? 'Present' : 'None',
      ip: req.ip,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });

    // Get settings from database (영속 저장소)
    const settingsRepository = AppDataSource.getRepository(Settings);
    let readingSettings: ReadingSettings;
    
    try {
      const dbSettings = await settingsRepository.findOne({ 
        where: { key: 'reading', type: 'reading' } 
      });
      
      if (dbSettings && dbSettings.value) {
        readingSettings = dbSettings.value as ReadingSettings;
        logger.debug('Reading settings loaded from database:', { traceId, settings: readingSettings });
      } else {
        // Fallback to default settings
        readingSettings = {
          homepageType: 'latest_posts',
          postsPerPage: 10,
          showSummary: 'excerpt',
          excerptLength: 150
        };
        logger.info('Using default reading settings (no DB record found):', { traceId });
      }
    } catch (dbError) {
      logger.warn('Database error, falling back to memory store:', { 
        traceId, 
        error: dbError instanceof Error ? dbError.message : 'Unknown DB error' 
      });
      
      // Fallback to memory store
      const fallbackSettings = settingsStore.get('reading') || {};
      readingSettings = {
        homepageType: fallbackSettings.homepageDisplay === 'static_page' ? 'static_page' : 'latest_posts',
        homepageId: fallbackSettings.staticHomePage,
        postsPerPage: fallbackSettings.postsPerPage || 10,
        showSummary: fallbackSettings.showFullContent ? 'full' : 'excerpt',
        excerptLength: fallbackSettings.excerptLength || 150
      };
    }
    
    // 페이지 검증 (원본 설정은 변조하지 않음)
    let validationReason: string | null = null;
    
    if (readingSettings.homepageType === 'static_page') {
      if (!readingSettings.homepageId) {
        // pageId가 없는 경우
        validationReason = 'missing_page_id';
        logger.warn('Homepage validation failed - missing pageId:', {
          traceId,
          reason: validationReason,
          originalType: readingSettings.homepageType
        });
      } else {
        // pageId가 있는 경우 검증
        try {
          const postRepository = AppDataSource.getRepository(Post);
          const page = await postRepository.findOne({
            where: { 
              id: readingSettings.homepageId,
              type: 'page'
            }
          });
          
          if (!page) {
            validationReason = 'page_not_found';
            logger.warn('Homepage validation failed - page not found:', {
              traceId,
              pageId: readingSettings.homepageId,
              reason: validationReason,
              originalType: readingSettings.homepageType
            });
          } else if (page.status !== 'publish') {
            validationReason = 'page_not_published';
            logger.warn('Homepage validation failed - page not published:', {
              traceId,
              pageId: readingSettings.homepageId,
              pageStatus: page.status,
              pageTitle: page.title,
              reason: validationReason,
              originalType: readingSettings.homepageType
            });
          } else {
            // 페이지가 유효함 - 검증 통과
            logger.debug('Homepage page validation passed:', {
              traceId,
              pageId: readingSettings.homepageId,
              pageTitle: page.title,
              pageStatus: page.status
            });
          }
        } catch (pageError) {
          validationReason = 'page_validation_error';
          logger.error('Error checking page validity (keeping original settings):', {
            traceId,
            pageId: readingSettings.homepageId,
            error: pageError instanceof Error ? pageError.message : 'Unknown page error',
            action: 'keep_original_settings'
          });
        }
      }
    }
    
    // 원본 설정을 그대로 응답에 사용
    const homepageSettings = {
      type: readingSettings.homepageType,
      pageId: readingSettings.homepageId || null,
      postsPerPage: readingSettings.postsPerPage || 10
    };
    
    const responseData: any = {
      success: true,
      data: homepageSettings
    };
    
    // 검증 실패한 경우 메타 정보 추가 (원본 설정은 유지)
    if (validationReason) {
      responseData.meta = {
        validation_failed: true,
        reason: validationReason,
        type: readingSettings.homepageType,
        pageId: readingSettings.homepageId
      };
    }
    
    logger.debug('Homepage settings response:', {
      traceId,
      success: true,
      settingsType: homepageSettings.type,
      pageId: homepageSettings.pageId,
      validation_failed: !!validationReason,
      validationReason,
      timestamp: new Date().toISOString()
    });
    
    res.json(responseData);
  } catch (error) {
    logger.error('Homepage settings error:', {
      traceId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch homepage settings'
    });
  }
});

/**
 * @route   GET /api/v1/settings/reading
 * @desc    Get reading settings (public endpoint for frontend)
 * @access  Public
 */
router.get('/reading', async (req: Request, res: Response) => {
  try {
    // Get reading settings from database
    const settingsRepository = AppDataSource.getRepository(Settings);
    const dbSettings = await settingsRepository.findOne({ 
      where: { key: 'reading', type: 'reading' } 
    });
    
    if (dbSettings && dbSettings.value) {
      return res.json({
        success: true,
        data: dbSettings.value
      });
    }
    
    // Fallback to default settings
    const defaultSettings = {
      homepageType: 'latest_posts',
      homepageId: undefined,  // Include homepageId to prevent initialization issues
      postsPerPage: 10,
      showSummary: 'excerpt',
      excerptLength: 150
    };
    
    res.json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    logger.error('Failed to fetch reading settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reading settings'
    });
  }
});

/**
 * @route   GET /api/v1/settings/customizer
 * @desc    Get customizer settings
 * @access  Public (for frontend theme rendering)
 */
router.get('/customizer',
  async (req: Request, res: Response) => {
    try {
      // Get customizer settings from database
      const settingsRepository = AppDataSource.getRepository(Settings);
      const dbSettings = await settingsRepository.findOne({
        where: { key: 'customizer', type: 'customizer' }
      });

      if (dbSettings && dbSettings.value) {
        return res.json({
          success: true,
          data: dbSettings.value
        });
      }

      // Fallback to default customizer settings
      const defaultSettings = {
        logo: null,
        siteName: 'O4O Platform',
        tagline: '통합 비즈니스 플랫폼',
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#f59e0b'
        },
        typography: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: {
            base: '16px',
            heading: '24px'
          }
        },
        layout: {
          headerStyle: 'default',
          footerStyle: 'default',
          containerWidth: 'wide'
        }
      };

      res.json({
        success: true,
        data: defaultSettings
      });
    } catch (error) {
      logger.error('Failed to fetch customizer settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customizer settings'
      });
    }
  }
);

/**
 * @route   GET /api/v1/settings/customizer/global-css
 * @desc    Get generated global CSS from customizer settings
 * @access  Public
 */
router.get('/customizer/global-css', async (req: Request, res: Response) => {
  try {
    // Get customizer settings from database
    const settingsRepository = AppDataSource.getRepository(Settings);
    const dbSettings = await settingsRepository.findOne({
      where: { key: 'customizer', type: 'customizer' }
    });

    let css = '';
    if (dbSettings && dbSettings.value) {
      // Generate CSS from settings
      css = generateGlobalCSS(dbSettings.value);
    } else {
      // Return empty CSS if no settings found
      css = '/* No customizer settings found */';
    }

    // Set proper headers for CSS
    res.set('Content-Type', 'text/css; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=30'); // 30 seconds cache
    res.set('X-Generated-At', new Date().toISOString());

    res.send(css);
  } catch (error) {
    logger.error('Failed to generate global CSS:', error);
    res.status(500).set('Content-Type', 'text/css').send('/* Error generating CSS */');
  }
});

/**
 * @route   GET /api/v1/settings/permalink
 * @desc    Get permalink settings
 * @access  Public
 */
router.get('/permalink', async (req: Request, res: Response) => {
  try {
    const settings = await permalinkService.getPermalinkSettings();

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Failed to get permalink settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get permalink settings'
    });
  }
});

/**
 * @route GET /v1/settings/auth
 * @desc Get authentication settings (role redirect map)
 * @access Public
 */
router.get('/auth', async (req: Request, res: Response) => {
  try {
    const authSettings = settingsStore.get('auth') || {
      roleRedirects: {
        user: '/',
        member: '/',
        contributor: '/',
        seller: '/seller/dashboard',
        vendor: '/vendor/console',
        partner: '/partner/portal',
        operator: '/admin',
        admin: '/admin',
      }
    };

    res.json({
      success: true,
      data: authSettings
    });
  } catch (error) {
    logger.error('Failed to get auth settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get auth settings'
    });
  }
});

/**
 * @route   GET /api/v1/settings/oauth/admin
 * @desc    Get OAuth settings with secrets (Admin only - for settings page)
 * @access  Private (Admin only)
 */
router.get('/oauth/admin', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Get OAuth settings from database
    const settingsRepository = AppDataSource.getRepository(Settings);
    const dbSettings = await settingsRepository.findOne({
      where: { key: 'oauth', type: 'oauth' }
    });

    let oauthSettings: any = {};

    if (dbSettings && dbSettings.value) {
      oauthSettings = dbSettings.value as any;
    } else {
      // Fallback to default OAuth settings
      oauthSettings = {
        google: {
          provider: 'google',
          enabled: false,
          clientId: '',
          clientSecret: '',
          callbackUrl: '',
          scope: []
        },
        kakao: {
          provider: 'kakao',
          enabled: false,
          clientId: '',
          clientSecret: '',
          callbackUrl: '',
          scope: []
        },
        naver: {
          provider: 'naver',
          enabled: false,
          clientId: '',
          clientSecret: '',
          callbackUrl: '',
          scope: []
        }
      };
    }

    // Return full settings including secrets for admin
    res.json({
      success: true,
      data: oauthSettings
    });
  } catch (error) {
    logger.error('Failed to fetch OAuth settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch OAuth settings'
    });
  }
});

/**
 * @route   GET /api/v1/settings/oauth
 * @desc    Get OAuth settings (Public - for login form to display providers)
 * @access  Public
 */
router.get('/oauth', async (req: Request, res: Response) => {
  try {
    // Get OAuth settings from database
    const settingsRepository = AppDataSource.getRepository(Settings);
    const dbSettings = await settingsRepository.findOne({
      where: { key: 'oauth', type: 'oauth' }
    });

    let oauthSettings: any = {};

    if (dbSettings && dbSettings.value) {
      oauthSettings = dbSettings.value as any;
    } else {
      // Fallback to default OAuth settings
      oauthSettings = {
        google: {
          provider: 'google',
          enabled: false,
          clientId: '',
          clientSecret: '',
          callbackUrl: '',
          scope: []
        },
        kakao: {
          provider: 'kakao',
          enabled: false,
          clientId: '',
          clientSecret: '',
          callbackUrl: '',
          scope: []
        },
        naver: {
          provider: 'naver',
          enabled: false,
          clientId: '',
          clientSecret: '',
          callbackUrl: '',
          scope: []
        }
      };
    }

    // 🔒 Security: Only expose safe fields to public (hide secrets)
    const publicSettings: any = {};
    for (const [provider, config] of Object.entries(oauthSettings)) {
      publicSettings[provider] = {
        provider: (config as any).provider || provider,
        enabled: (config as any).enabled || false,
        callbackUrl: (config as any).callbackUrl || '',
        scope: (config as any).scope || []
        // ❌ Do NOT expose: clientId, clientSecret
      };
    }

    res.json({
      success: true,
      data: publicSettings
    });
  } catch (error) {
    logger.error('Failed to fetch OAuth settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch OAuth settings'
    });
  }
});

/**
 * @route   GET /api/v1/settings/:section
 * @desc    Get settings for a specific section
 * @access  Private
 */
router.get('/:section', authenticate, async (req: Request, res: Response) => {
  try {
    const { section } = req.params;
    const settings = settingsStore.get(section);
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Settings section not found'
      });
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

/**
 * @route   PUT /api/v1/settings/reading
 * @desc    Update reading settings (특별히 홈페이지 설정 변환 처리)
 * @access  Private (Admin only)
 */
router.put('/reading',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const traceId = `rs-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      const newSettings = req.body;
      const user = (req as any).user;
      const actor = user?.id || user?.userId || 'unknown';

      // Log user authentication details for debugging
      logger.debug('Authenticated user details:', {
        traceId,
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
        hasUser: !!user,
        timestamp: new Date().toISOString()
      });

      logger.info('Reading settings update request:', {
        traceId,
        actor,
        payload: newSettings,
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
      });
      
      // 상세 디버깅 로그
      logger.debug('Detailed request analysis:', {
        traceId,
        homepageType: newSettings.homepageType,
        homepageId: newSettings.homepageId,
        hasHomepageId: !!newSettings.homepageId,
        homepageIdType: typeof newSettings.homepageId,
        homepageIdValue: JSON.stringify(newSettings.homepageId),
        fullPayload: JSON.stringify(newSettings, null, 2)
      });
      
      // 입력 검증
      if (!newSettings.homepageType) {
        logger.warn('Validation failed: homepageType is required:', { traceId, actor, payload: newSettings });
        return res.status(400).json({
          success: false,
          error: 'homepageType is required',
          code: 'MISSING_HOMEPAGE_TYPE'
        });
      }
      
      if (!['latest_posts', 'static_page'].includes(newSettings.homepageType)) {
        logger.warn('Validation failed: invalid homepageType:', { traceId, actor, homepageType: newSettings.homepageType });
        return res.status(400).json({
          success: false,
          error: 'homepageType must be either "latest_posts" or "static_page"',
          code: 'INVALID_HOMEPAGE_TYPE'
        });
      }
      
      if (newSettings.homepageType === 'static_page' && (!newSettings.homepageId || newSettings.homepageId.trim() === '')) {
        logger.warn('Validation failed: static_page requires valid pageId:', { 
          traceId, 
          actor, 
          homepageId: newSettings.homepageId,
          homepageIdType: typeof newSettings.homepageId
        });
        return res.status(400).json({
          success: false,
          error: 'homepageId is required when homepageType is static_page',
          code: 'MISSING_PAGE_ID'
        });
      }
      
      // pageId 유효성 검사 (static_page인 경우)
      if (newSettings.homepageType === 'static_page' && newSettings.homepageId) {
        try {
          const postRepository = AppDataSource.getRepository(Post);
          const page = await postRepository.findOne({
            where: { 
              id: newSettings.homepageId,
              type: 'page'
            }
          });
          
          if (!page) {
            logger.warn('Page not found during validation:', { 
              traceId, 
              actor, 
              pageId: newSettings.homepageId 
            });
            return res.status(400).json({
              success: false,
              error: `Page with ID '${newSettings.homepageId}' not found`,
              code: 'PAGE_NOT_FOUND'
            });
          }
          
          if (page.status !== 'publish') {
            logger.warn('Page not published during validation:', { 
              traceId, 
              actor, 
              pageId: newSettings.homepageId,
              currentStatus: page.status
            });
            return res.status(400).json({
              success: false,
              error: `Page '${page.title}' is not published (current status: ${page.status})`,
              code: 'PAGE_NOT_PUBLISHED'
            });
          }
          
          logger.debug('Page validation passed:', { 
            traceId, 
            pageId: newSettings.homepageId,
            pageTitle: page.title 
          });
        } catch (pageError) {
          logger.error('Error during page validation:', {
            traceId,
            actor,
            pageId: newSettings.homepageId,
            error: pageError instanceof Error ? pageError.message : 'Unknown page error'
          });
          
          return res.status(500).json({
            success: false,
            error: 'Failed to validate page',
            code: 'PAGE_VALIDATION_ERROR'
          });
        }
      }
      
      // ReadingSettings 형식으로 변환
      const readingSettings: ReadingSettings = {
        homepageType: newSettings.homepageType || 'latest_posts',
        homepageId: newSettings.homepageId,
        postsPerPage: newSettings.postsPerPage || 10,
        showSummary: newSettings.showSummary || 'excerpt',
        excerptLength: newSettings.excerptLength || 150
      };
      
      // DB에 영구 저장
      const settingsRepository = AppDataSource.getRepository(Settings);
      
      try {
        let dbSettings = await settingsRepository.findOne({ 
          where: { key: 'reading', type: 'reading' } 
        });
        
        if (dbSettings) {
          dbSettings.value = readingSettings;
          dbSettings.updatedAt = new Date();
        } else {
          dbSettings = settingsRepository.create({
            key: 'reading',
            type: 'reading',
            value: readingSettings,
            description: 'Homepage and reading display settings'
          });
        }
        
        await settingsRepository.save(dbSettings);
        
        logger.info('Reading settings saved to database:', {
          traceId,
          actor,
          settings: readingSettings,
          timestamp: new Date().toISOString()
        });
        
        // 메모리 스토어도 업데이트 (하위 호환성)
        const legacySettings = {
          homepageDisplay: readingSettings.homepageType,
          staticHomePage: readingSettings.homepageId,
          postsPerPage: readingSettings.postsPerPage,
          showFullContent: readingSettings.showSummary === 'full',
          excerptLength: readingSettings.excerptLength
        };
        settingsStore.set('reading', legacySettings);
        
        res.json({
          success: true,
          data: readingSettings,
          message: 'Reading settings updated successfully'
        });
        
      } catch (dbError) {
        logger.error('Database save failed:', {
          traceId,
          actor,
          error: dbError instanceof Error ? dbError.message : 'Unknown DB error',
          stack: dbError instanceof Error ? dbError.stack : undefined
        });
        
        // DB 실패 시 메모리에만 저장 (임시 보호)
        const legacySettings = {
          homepageDisplay: readingSettings.homepageType,
          staticHomePage: readingSettings.homepageId,
          postsPerPage: readingSettings.postsPerPage,
          showFullContent: readingSettings.showSummary === 'full',
          excerptLength: readingSettings.excerptLength
        };
        settingsStore.set('reading', legacySettings);
        
        logger.warn('Fallback to memory store due to DB error:', { traceId, actor });
        
        res.status(500).json({
          success: false,
          error: 'Database save failed, settings saved temporarily',
          code: 'DB_SAVE_FAILED'
        });
      }
      
    } catch (error) {
      logger.error('Reading settings update failed:', {
        traceId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to update reading settings',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @route   POST /api/v1/settings/customizer
 * @desc    Update customizer settings
 * @access  Private (Admin only)
 */
router.post('/customizer', authenticate, requireAdmin, updateCustomizerSettings);

/**
 * @route   PUT /api/v1/settings/customizer
 * @desc    Update customizer settings
 * @access  Private (Admin only)
 */
router.put('/customizer', authenticate, requireAdmin, updateCustomizerSettings);

/**
 * @route   PUT /api/v1/settings/permalink
 * @desc    Update permalink settings
 * @access  Private (Admin only)
 */
router.put('/permalink',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const settings: PermalinkSettings = req.body;

      // 설정 저장
      const result = await permalinkService.savePermalinkSettings(settings);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors,
          message: 'Invalid permalink settings'
        });
      }

      // 업데이트된 설정 반환
      const updatedSettings = await permalinkService.getPermalinkSettings();

      res.json({
        success: true,
        data: updatedSettings,
        message: 'Permalink settings updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update permalink settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update permalink settings'
      });
    }
  }
);

/**
 * @route   POST /api/v1/settings/permalink/preview
 * @desc    Generate URL previews for permalink structure
 * @access  Private (Admin only)
 */
router.post('/permalink/preview',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { structure } = req.body;

      if (!structure) {
        return res.status(400).json({
          success: false,
          error: 'Structure parameter is required'
        });
      }

      const previews = await permalinkService.generateUrlPreviews(structure);

      res.json({
        success: true,
        data: previews
      });
    } catch (error) {
      logger.error('Failed to generate URL previews:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate URL previews'
      });
    }
  }
);

/**
 * @route   POST /api/v1/settings/permalink/validate
 * @desc    Validate permalink settings
 * @access  Private (Admin only)
 */
router.post('/permalink/validate',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const settings: PermalinkSettings = req.body;

      const validation = await (permalinkService as any).validatePermalinkSettings(settings);

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      logger.error('Failed to validate permalink settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate permalink settings'
      });
    }
  }
);

/**
 * @route   PUT /api/v1/settings/:section
 * @desc    Update settings for a specific section
 * @access  Private (Admin only)
 */
router.put('/:section',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { section } = req.params;
      const newSettings = req.body;
      
      if (!settingsStore.has(section)) {
        return res.status(404).json({
          success: false,
          error: 'Settings section not found'
        });
      }
      
      // 기존 설정과 병합
      const currentSettings = settingsStore.get(section);
      const updatedSettings = { ...currentSettings, ...newSettings };
      
      // 설정 저장
      settingsStore.set(section, updatedSettings);
      
      res.json({
        success: true,
        data: updatedSettings,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to update settings'
      });
    }
  }
);

/**
 * @route   GET /api/v1/settings
 * @desc    Get all settings
 * @access  Private (Admin only)
 */
router.get('/',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const allSettings: Record<string, any> = {};
      
      settingsStore.forEach((value, key) => {
        allSettings[key] = value;
      });
      
      res.json({
        success: true,
        data: allSettings
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to fetch settings'
      });
    }
  }
);

/**
 * @route   POST /api/v1/settings/reset/:section
 * @desc    Reset settings to default for a section
 * @access  Private (Admin only)
 */
router.post('/reset/:section',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { section } = req.params;
      
      // 기본값으로 리셋 (하드코딩된 초기값 사용)
      const defaultSettings: Record<string, any> = {
        general: {
          siteName: 'O4O Platform',
          siteDescription: '올인원 비즈니스 플랫폼',
          siteUrl: 'https://neture.co.kr',
          adminEmail: 'admin@neture.co.kr',
          timezone: 'Asia/Seoul',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm',
          language: 'ko',
          maintenanceMode: false,
          maintenanceMessage: '잠시 시스템 점검 중입니다.',
          allowRegistration: true,
          defaultUserRole: 'customer',
          requireEmailVerification: true,
          enableApiAccess: false,
          apiRateLimit: 100
        }
      };
      
      if (!defaultSettings[section]) {
        return res.status(404).json({
          success: false,
          error: 'Settings section not found'
        });
      }
      
      settingsStore.set(section, defaultSettings[section]);
      
      res.json({
        success: true,
        data: defaultSettings[section],
        message: 'Settings reset to default successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to reset settings'
      });
    }
  }
);

/**
 * Handle customizer settings update (shared logic for POST and PUT)
 */
async function updateCustomizerSettings(req: Request, res: Response) {
  try {
    const newSettings = req.body;
    const actor = (req as any).user?.id || 'unknown';

    logger.info('Customizer settings update request:', {
      actor,
      settings: newSettings,
      timestamp: new Date().toISOString()
    });

    // Validate settings structure
    if (!newSettings.settings && !newSettings.type) {
      return res.status(400).json({
        success: false,
        error: 'Invalid customizer settings format'
      });
    }

    const customizerSettings = newSettings.settings || newSettings;

    // Add version and timestamp metadata
    const currentSettings = await settingsService.getSettings('customizer') as any;
    const currentVersion = currentSettings?._version || 0;
    const settingsWithMetadata = {
      ...customizerSettings,
      _version: currentVersion + 1,
      _updatedAt: new Date().toISOString()
    };

    // ✅ Use SettingsService - this automatically syncs template parts!
    const result = await settingsService.updateSettings('customizer', settingsWithMetadata);

    logger.info('Customizer settings and template parts saved successfully:', {
      actor,
      timestamp: new Date().toISOString()
    });

    // Also update memory store for backward compatibility
    settingsStore.set('customizer', customizerSettings);

    res.json({
      success: true,
      data: result,
      message: 'Customizer settings and template parts updated successfully'
    });

  } catch (error) {
    logger.error('Customizer settings update failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update customizer settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * @route PUT /v1/settings/auth
 * @desc Update authentication settings (role redirect map)
 * @access Admin only
 */
router.put('/auth', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { roleRedirects } = req.body;

    if (!roleRedirects || typeof roleRedirects !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'roleRedirects object is required'
      });
    }

    // Validate each redirect path starts with /
    for (const [role, path] of Object.entries(roleRedirects)) {
      if (typeof path !== 'string' || !path.startsWith('/')) {
        return res.status(400).json({
          success: false,
          error: `Invalid redirect path for role ${role}: must start with /`
        });
      }
    }

    const authSettings = {
      roleRedirects
    };

    settingsStore.set('auth', authSettings);

    res.json({
      success: true,
      data: authSettings,
      message: 'Auth settings updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update auth settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update auth settings'
    });
  }
});

/**
 * @route   PUT /api/v1/settings/oauth
 * @desc    Update OAuth settings for a specific provider
 * @access  Private (Admin only)
 */
router.put('/oauth', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { provider, config } = req.body;
    const actor = (req as any).user?.id || 'unknown';

    logger.info('OAuth settings update request:', {
      actor,
      provider,
      hasClientId: !!config.clientId,
      hasClientSecret: !!config.clientSecret,
      enabled: config.enabled,
      timestamp: new Date().toISOString()
    });

    // Validate provider
    if (!provider || !['google', 'kakao', 'naver'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be one of: google, kakao, naver'
      });
    }

    // Validate required fields if enabled
    if (config.enabled && (!config.clientId || !config.clientSecret)) {
      return res.status(400).json({
        success: false,
        error: 'clientId and clientSecret are required when OAuth is enabled'
      });
    }

    // Get current OAuth settings from database
    const settingsRepository = AppDataSource.getRepository(Settings);
    let dbSettings = await settingsRepository.findOne({
      where: { key: 'oauth', type: 'oauth' }
    });

    let oauthSettings: any = {};

    if (dbSettings && dbSettings.value) {
      oauthSettings = dbSettings.value as any;
    } else {
      // Initialize with default structure
      oauthSettings = {
        google: { provider: 'google', enabled: false, clientId: '', clientSecret: '', callbackUrl: '', scope: [] },
        kakao: { provider: 'kakao', enabled: false, clientId: '', clientSecret: '', callbackUrl: '', scope: [] },
        naver: { provider: 'naver', enabled: false, clientId: '', clientSecret: '', callbackUrl: '', scope: [] }
      };
    }

    // Update specific provider
    oauthSettings[provider] = {
      ...oauthSettings[provider],
      ...config,
      provider // Ensure provider field is always set
    };

    // Save to database
    if (dbSettings) {
      dbSettings.value = oauthSettings;
      dbSettings.updatedAt = new Date();
    } else {
      dbSettings = settingsRepository.create({
        key: 'oauth',
        type: 'oauth',
        value: oauthSettings,
        description: 'OAuth provider settings for social login'
      });
    }

    await settingsRepository.save(dbSettings);

    logger.info('OAuth settings saved to database:', {
      actor,
      provider,
      enabled: config.enabled,
      clientId: config.clientId ? 'present' : 'empty',
      clientSecret: config.clientSecret ? 'present' : 'empty',
      timestamp: new Date().toISOString()
    });

    // Also update memory store for backward compatibility
    settingsStore.set('oauth', oauthSettings);

    // Return the complete settings so frontend can update its state
    res.json({
      success: true,
      data: oauthSettings,  // Return full oauth settings (all providers)
      message: `${provider} OAuth settings updated successfully`
    });

  } catch (error) {
    logger.error('OAuth settings update failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update OAuth settings'
    });
  }
});

export default router;