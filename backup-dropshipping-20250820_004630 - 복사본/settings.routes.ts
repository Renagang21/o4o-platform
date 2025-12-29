import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { checkPermission } from '../../middleware/permissions';

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
    homepageDisplay: 'latest',
    homepagePostsCount: 5,
    staticHomePage: null,
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
  }]
]);

/**
 * @route   GET /api/v1/settings/:section
 * @desc    Get settings for a specific section
 * @access  Private
 */
router.get('/:section', authenticateToken, async (req: Request, res: Response) => {
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
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

/**
 * @route   PUT /api/v1/settings/:section
 * @desc    Update settings for a specific section
 * @access  Private (Admin only)
 */
router.put('/:section', 
  authenticateToken,
  checkPermission('settings:write'),
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
      console.error('Error updating settings:', error);
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
  authenticateToken,
  checkPermission('settings:read'),
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
      console.error('Error fetching all settings:', error);
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
  authenticateToken,
  checkPermission('settings:write'),
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
      console.error('Error resetting settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset settings'
      });
    }
  }
);

export default router;