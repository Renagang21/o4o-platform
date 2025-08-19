# 📋 WordPress 설정 메뉴 - API 서버 구현 가이드

## 개요
이 문서는 O4O Platform의 WordPress 스타일 설정 메뉴를 위한 백엔드 API 구현 가이드입니다.
일반, 쓰기, 읽기, 토론, 미디어, 고유주소, 개인정보 설정을 완벽하게 구현합니다.

---

## 🗂️ Phase 1: 데이터베이스 설정

### 1.1 통합 설정 Entity
**위치**: `/apps/api-server/src/entities/SiteSettings.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique
} from 'typeorm';

export enum SettingCategory {
  GENERAL = 'general',
  WRITING = 'writing',
  READING = 'reading',
  DISCUSSION = 'discussion',
  MEDIA = 'media',
  PERMALINKS = 'permalinks',
  PRIVACY = 'privacy',
  EMAIL = 'email',
  SEO = 'seo',
  SECURITY = 'security'
}

export enum SettingType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  COLOR = 'color',
  URL = 'url',
  EMAIL = 'email',
  DATETIME = 'datetime'
}

@Entity('site_settings')
@Unique(['category', 'key'])
@Index(['category', 'isPublic'])
export class SiteSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SettingCategory
  })
  category: SettingCategory;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'json', nullable: true })
  value: any;

  @Column({
    type: 'enum',
    enum: SettingType,
    default: SettingType.STRING
  })
  type: SettingType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  options: any; // For select/multiselect types

  @Column({ type: 'json', nullable: true })
  validation: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    email?: boolean;
    url?: boolean;
    custom?: string;
  };

  @Column({ type: 'boolean', default: false })
  isPublic: boolean; // Can be accessed without authentication

  @Column({ type: 'boolean', default: false })
  isReadonly: boolean; // Cannot be modified via UI

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 1.2 설정 이력 Entity (선택사항)
**위치**: `/apps/api-server/src/entities/SettingHistory.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from './User';
import { SiteSetting } from './SiteSettings';

@Entity('setting_history')
export class SettingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  settingId: string;

  @ManyToOne(() => SiteSetting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'settingId' })
  setting: SiteSetting;

  @Column({ type: 'json', nullable: true })
  oldValue: any;

  @Column({ type: 'json', nullable: true })
  newValue: any;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## 🔌 Phase 2: API 엔드포인트 구현

### 2.1 설정 관리 Routes
**위치**: `/apps/api-server/src/routes/v1/site-settings.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { checkPermission } from '../../middleware/permissions';
import AppDataSource from '../../database/data-source';
import { SiteSetting, SettingCategory } from '../../entities/SiteSettings';
import { SettingHistory } from '../../entities/SettingHistory';
import { validateSettingValue } from '../../utils/validators';
import { cacheManager } from '../../services/cache.service';

const router: Router = Router();

/**
 * @route   GET /api/v1/settings/:category
 * @desc    Get settings by category
 * @access  Private (Public for some settings)
 */
router.get('/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const isAuthenticated = !!req.user;
    
    // Check if valid category
    if (!Object.values(SettingCategory).includes(category as SettingCategory)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }

    // Try to get from cache first
    const cacheKey = `settings:${category}`;
    const cached = await cacheManager.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached
      });
    }

    const settingRepository = AppDataSource.getRepository(SiteSetting);
    
    // Build query based on authentication
    const where: any = { category };
    if (!isAuthenticated) {
      where.isPublic = true;
    }

    const settings = await settingRepository.find({
      where,
      order: { sortOrder: 'ASC' }
    });

    // Convert to key-value object
    const settingsMap: Record<string, any> = {};
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });

    // Merge with defaults
    const defaults = getDefaultSettings(category as SettingCategory);
    const finalSettings = { ...defaults, ...settingsMap };

    // Cache the result
    await cacheManager.set(cacheKey, finalSettings, 300); // 5 minutes

    res.json({
      success: true,
      data: finalSettings
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
 * @route   PUT /api/v1/settings/:category
 * @desc    Update settings for a category
 * @access  Private (Admin only)
 */
router.put('/:category',
  authenticateToken,
  checkPermission('settings:write'),
  async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const updates = req.body;
      const userId = req.user.id;

      if (!Object.values(SettingCategory).includes(category as SettingCategory)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category'
        });
      }

      const settingRepository = AppDataSource.getRepository(SiteSetting);
      const historyRepository = AppDataSource.getRepository(SettingHistory);

      const errors: Record<string, string> = {};
      const updated: string[] = [];

      for (const [key, value] of Object.entries(updates)) {
        try {
          // Find or create setting
          let setting = await settingRepository.findOne({
            where: { category: category as SettingCategory, key }
          });

          if (!setting) {
            // Create new setting with metadata
            const metadata = getSettingMetadata(category as SettingCategory, key);
            if (!metadata) {
              errors[key] = 'Unknown setting key';
              continue;
            }

            setting = settingRepository.create({
              category: category as SettingCategory,
              key,
              ...metadata
            });
          }

          // Check if readonly
          if (setting.isReadonly) {
            errors[key] = 'Setting is readonly';
            continue;
          }

          // Validate value
          if (setting.validation) {
            const validationError = validateSettingValue(value, setting.validation);
            if (validationError) {
              errors[key] = validationError;
              continue;
            }
          }

          // Save history
          if (setting.id && setting.value !== value) {
            const history = historyRepository.create({
              settingId: setting.id,
              oldValue: setting.value,
              newValue: value,
              userId
            });
            await historyRepository.save(history);
          }

          // Update value
          setting.value = value;
          await settingRepository.save(setting);
          updated.push(key);

        } catch (error) {
          console.error(`Error updating setting ${key}:`, error);
          errors[key] = 'Failed to update';
        }
      }

      // Clear cache
      const cacheKey = `settings:${category}`;
      await cacheManager.del(cacheKey);

      res.json({
        success: Object.keys(errors).length === 0,
        updated,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        message: `Updated ${updated.length} settings`
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
 * @route   POST /api/v1/settings/:category/reset
 * @desc    Reset settings to defaults
 * @access  Private (Admin only)
 */
router.post('/:category/reset',
  authenticateToken,
  checkPermission('settings:write'),
  async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const { keys } = req.body; // Optional: specific keys to reset

      const settingRepository = AppDataSource.getRepository(SiteSetting);
      
      if (keys && Array.isArray(keys)) {
        // Reset specific keys
        await settingRepository.delete({
          category: category as SettingCategory,
          key: In(keys)
        });
      } else {
        // Reset entire category
        await settingRepository.delete({
          category: category as SettingCategory
        });
      }

      // Clear cache
      await cacheManager.del(`settings:${category}`);

      res.json({
        success: true,
        message: 'Settings reset to defaults'
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

/**
 * @route   GET /api/v1/settings/:category/schema
 * @desc    Get setting schema for a category
 * @access  Private
 */
router.get('/:category/schema',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      
      const schema = getSettingSchema(category as SettingCategory);
      
      if (!schema) {
        return res.status(404).json({
          success: false,
          error: 'Schema not found'
        });
      }

      res.json({
        success: true,
        data: schema
      });
    } catch (error) {
      console.error('Error fetching schema:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch schema'
      });
    }
  }
);

/**
 * Helper function: Get default settings
 */
function getDefaultSettings(category: SettingCategory): Record<string, any> {
  const defaults: Record<SettingCategory, Record<string, any>> = {
    [SettingCategory.GENERAL]: {
      siteName: 'O4O Platform',
      siteDescription: '올인원 비즈니스 플랫폼',
      siteUrl: process.env.APP_URL || 'https://neture.co.kr',
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
    },
    [SettingCategory.WRITING]: {
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
      allowEmojis: true,
      enableXmlRpc: false,
      enableAtomPub: false
    },
    [SettingCategory.READING]: {
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
      enableSitemap: true,
      discourageSearchEngines: false,
      showRelatedPosts: true,
      relatedPostsCount: 3
    },
    [SettingCategory.DISCUSSION]: {
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
      holdForModeration: false,
      commentNotification: true,
      moderationNotification: true,
      enablePingbacks: true,
      enableTrackbacks: true,
      pingbackExcerpt: true
    },
    [SettingCategory.MEDIA]: {
      thumbnailWidth: 150,
      thumbnailHeight: 150,
      thumbnailCrop: true,
      mediumWidth: 300,
      mediumHeight: 300,
      mediumCrop: false,
      largeWidth: 1024,
      largeHeight: 1024,
      largeCrop: false,
      uploadMaxSize: 10485760, // 10MB
      allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
      organizeByDate: true,
      optimizeImages: true,
      generateThumbnails: true,
      enableLazyLoad: true,
      cdnEnabled: false,
      cdnUrl: '',
      imageQuality: 82,
      convertToWebp: false,
      enableImageCompression: true,
      keepOriginal: true
    },
    [SettingCategory.PERMALINKS]: {
      structure: '/%postname%/',
      categoryBase: 'category',
      tagBase: 'tag',
      customStructure: '',
      enablePrettyUrls: true,
      redirectOldUrls: true,
      trailingSlash: true,
      forceLowercase: false,
      removeStopWords: false,
      maxUrlLength: 100,
      productBase: 'product',
      productCategoryBase: 'product-category',
      productTagBase: 'product-tag',
      searchBase: 'search'
    },
    [SettingCategory.PRIVACY]: {
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
      shareUserData: false,
      enableDnt: true,
      anonymizeIp: true,
      cookieLifetime: 365,
      sessionRecording: false
    },
    [SettingCategory.EMAIL]: {
      fromName: 'O4O Platform',
      fromEmail: 'noreply@neture.co.kr',
      smtpHost: '',
      smtpPort: 587,
      smtpEncryption: 'tls',
      smtpUsername: '',
      smtpPassword: '',
      emailProvider: 'smtp',
      sendgridApiKey: '',
      mailgunApiKey: '',
      mailgunDomain: '',
      sesRegion: 'us-east-1',
      testEmailAddress: '',
      emailLogging: true,
      bounceHandling: false
    },
    [SettingCategory.SEO]: {
      siteTitle: '',
      metaDescription: '',
      metaKeywords: [],
      enableOpenGraph: true,
      ogImage: '',
      enableTwitterCard: true,
      twitterUsername: '',
      enableSchema: true,
      sitemapEnabled: true,
      robotsTxt: '',
      enableBreadcrumbs: true,
      canonicalUrls: true,
      noindexEmptyCategories: true,
      noindexArchives: false,
      titleSeparator: '|'
    },
    [SettingCategory.SECURITY]: {
      enableTwoFactor: false,
      enforceStrongPasswords: true,
      minPasswordLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      passwordExpireDays: 0,
      maxLoginAttempts: 5,
      lockoutDuration: 30,
      enableCaptcha: true,
      captchaProvider: 'recaptcha',
      recaptchaSiteKey: '',
      recaptchaSecretKey: '',
      enableIpWhitelist: false,
      ipWhitelist: [],
      enableIpBlacklist: false,
      ipBlacklist: [],
      forceHttps: true,
      contentSecurityPolicy: '',
      enableRateLimit: true,
      rateLimitRequests: 100,
      rateLimitWindow: 60
    }
  };

  return defaults[category] || {};
}

/**
 * Helper function: Get setting metadata
 */
function getSettingMetadata(category: SettingCategory, key: string): any {
  const metadata: Record<string, any> = {
    general: {
      siteName: { 
        type: 'string', 
        label: '사이트 제목',
        description: '사이트의 이름입니다',
        validation: { required: true }
      },
      adminEmail: {
        type: 'email',
        label: '관리자 이메일',
        description: '관리 목적으로 사용되는 이메일 주소',
        validation: { required: true, email: true }
      },
      timezone: {
        type: 'select',
        label: '시간대',
        options: ['Asia/Seoul', 'Asia/Tokyo', 'America/New_York'],
        validation: { required: true }
      }
      // ... more metadata
    },
    // ... other categories
  };

  return metadata[category]?.[key];
}

/**
 * Helper function: Get setting schema
 */
function getSettingSchema(category: SettingCategory): any {
  // Return full schema for frontend form generation
  const schemas: Record<SettingCategory, any> = {
    [SettingCategory.GENERAL]: {
      sections: [
        {
          title: '사이트 정보',
          fields: [
            { key: 'siteName', type: 'text', label: '사이트 제목', required: true },
            { key: 'siteDescription', type: 'text', label: '태그라인' },
            { key: 'siteUrl', type: 'url', label: '사이트 주소', required: true },
            { key: 'adminEmail', type: 'email', label: '관리자 이메일', required: true }
          ]
        },
        {
          title: '지역화',
          fields: [
            { key: 'language', type: 'select', label: '언어', options: ['ko', 'en', 'ja'] },
            { key: 'timezone', type: 'select', label: '시간대' },
            { key: 'dateFormat', type: 'select', label: '날짜 형식' },
            { key: 'timeFormat', type: 'select', label: '시간 형식' }
          ]
        }
      ]
    }
    // ... other category schemas
  };

  return schemas[category];
}

export default router;
```

### 2.2 설정 서비스 계층
**위치**: `/apps/api-server/src/services/settings.service.ts`

```typescript
import AppDataSource from '../database/data-source';
import { SiteSetting, SettingCategory } from '../entities/SiteSettings';
import { cacheManager } from './cache.service';
import { EventEmitter } from 'events';

class SettingsService extends EventEmitter {
  private cache: Map<string, any> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize settings service
   */
  async initialize() {
    if (this.initialized) return;

    const settingRepository = AppDataSource.getRepository(SiteSetting);
    
    // Load all settings into memory
    const settings = await settingRepository.find();
    
    settings.forEach(setting => {
      const cacheKey = `${setting.category}:${setting.key}`;
      this.cache.set(cacheKey, setting.value);
    });

    this.initialized = true;
    console.log('Settings service initialized');
  }

  /**
   * Get setting value
   */
  async get(category: SettingCategory, key: string, defaultValue?: any): Promise<any> {
    const cacheKey = `${category}:${key}`;
    
    // Check memory cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Check Redis cache
    const redisValue = await cacheManager.get(cacheKey);
    if (redisValue !== null) {
      this.cache.set(cacheKey, redisValue);
      return redisValue;
    }

    // Load from database
    const settingRepository = AppDataSource.getRepository(SiteSetting);
    const setting = await settingRepository.findOne({
      where: { category, key }
    });

    if (setting) {
      this.cache.set(cacheKey, setting.value);
      await cacheManager.set(cacheKey, setting.value, 3600);
      return setting.value;
    }

    return defaultValue;
  }

  /**
   * Set setting value
   */
  async set(category: SettingCategory, key: string, value: any): Promise<void> {
    const settingRepository = AppDataSource.getRepository(SiteSetting);
    const cacheKey = `${category}:${key}`;

    let setting = await settingRepository.findOne({
      where: { category, key }
    });

    if (!setting) {
      setting = settingRepository.create({
        category,
        key,
        value
      });
    } else {
      setting.value = value;
    }

    await settingRepository.save(setting);

    // Update caches
    this.cache.set(cacheKey, value);
    await cacheManager.set(cacheKey, value, 3600);

    // Emit change event
    this.emit('settingChanged', { category, key, value });
  }

  /**
   * Get all settings for a category
   */
  async getCategory(category: SettingCategory): Promise<Record<string, any>> {
    const settingRepository = AppDataSource.getRepository(SiteSetting);
    
    const settings = await settingRepository.find({
      where: { category },
      order: { sortOrder: 'ASC' }
    });

    const result: Record<string, any> = {};
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });

    return result;
  }

  /**
   * Bulk update settings
   */
  async bulkUpdate(category: SettingCategory, updates: Record<string, any>): Promise<void> {
    const settingRepository = AppDataSource.getRepository(SiteSetting);

    for (const [key, value] of Object.entries(updates)) {
      await this.set(category, key, value);
    }

    // Clear category cache
    await cacheManager.del(`settings:${category}:*`);
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    await cacheManager.del('settings:*');
  }
}

export const settingsService = new SettingsService();
```

---

## 📦 Phase 3: 초기 데이터 시딩

### 3.1 설정 시드 데이터
**위치**: `/apps/api-server/src/seeds/settings.seed.ts`

```typescript
import AppDataSource from '../database/data-source';
import { SiteSetting, SettingCategory, SettingType } from '../entities/SiteSettings';

export async function seedSettings() {
  const settingRepository = AppDataSource.getRepository(SiteSetting);

  const settingsData = [
    // General Settings
    {
      category: SettingCategory.GENERAL,
      key: 'siteName',
      type: SettingType.STRING,
      label: '사이트 제목',
      description: '사이트의 이름을 입력하세요',
      validation: { required: true },
      isPublic: true,
      sortOrder: 1
    },
    {
      category: SettingCategory.GENERAL,
      key: 'siteDescription',
      type: SettingType.STRING,
      label: '태그라인',
      description: '몇 단어로 사이트를 설명하세요',
      isPublic: true,
      sortOrder: 2
    },
    {
      category: SettingCategory.GENERAL,
      key: 'adminEmail',
      type: SettingType.EMAIL,
      label: '관리자 이메일',
      description: '관리 목적으로 사용되는 이메일 주소',
      validation: { required: true, email: true },
      sortOrder: 3
    },
    {
      category: SettingCategory.GENERAL,
      key: 'timezone',
      type: SettingType.SELECT,
      label: '시간대',
      options: [
        { value: 'Asia/Seoul', label: '서울' },
        { value: 'Asia/Tokyo', label: '도쿄' },
        { value: 'America/New_York', label: '뉴욕' }
      ],
      validation: { required: true },
      sortOrder: 4
    },

    // Media Settings
    {
      category: SettingCategory.MEDIA,
      key: 'thumbnailWidth',
      type: SettingType.NUMBER,
      label: '썸네일 너비',
      description: '썸네일 이미지의 기본 너비 (픽셀)',
      validation: { min: 50, max: 500 },
      sortOrder: 1
    },
    {
      category: SettingCategory.MEDIA,
      key: 'thumbnailHeight',
      type: SettingType.NUMBER,
      label: '썸네일 높이',
      description: '썸네일 이미지의 기본 높이 (픽셀)',
      validation: { min: 50, max: 500 },
      sortOrder: 2
    },
    {
      category: SettingCategory.MEDIA,
      key: 'uploadMaxSize',
      type: SettingType.NUMBER,
      label: '최대 업로드 크기',
      description: '최대 파일 업로드 크기 (바이트)',
      validation: { min: 1048576, max: 104857600 }, // 1MB - 100MB
      sortOrder: 3
    },
    {
      category: SettingCategory.MEDIA,
      key: 'allowedTypes',
      type: SettingType.MULTISELECT,
      label: '허용 파일 형식',
      options: [
        { value: 'jpg', label: 'JPG' },
        { value: 'png', label: 'PNG' },
        { value: 'gif', label: 'GIF' },
        { value: 'pdf', label: 'PDF' },
        { value: 'doc', label: 'DOC' },
        { value: 'mp4', label: 'MP4' }
      ],
      sortOrder: 4
    },

    // Permalink Settings
    {
      category: SettingCategory.PERMALINKS,
      key: 'structure',
      type: SettingType.SELECT,
      label: 'URL 구조',
      options: [
        { value: 'plain', label: '기본 (?p=123)' },
        { value: '/%postname%/', label: '글 이름' },
        { value: '/%year%/%monthnum%/%postname%/', label: '날짜와 이름' },
        { value: '/%category%/%postname%/', label: '카테고리와 이름' }
      ],
      validation: { required: true },
      sortOrder: 1
    },
    {
      category: SettingCategory.PERMALINKS,
      key: 'categoryBase',
      type: SettingType.STRING,
      label: '카테고리 베이스',
      description: '카테고리 URL의 기본 경로',
      validation: { pattern: '^[a-z0-9-]+$' },
      sortOrder: 2
    },

    // Privacy Settings
    {
      category: SettingCategory.PRIVACY,
      key: 'enableCookieConsent',
      type: SettingType.BOOLEAN,
      label: '쿠키 동의 활성화',
      description: '방문자에게 쿠키 사용 동의를 요청합니다',
      sortOrder: 1
    },
    {
      category: SettingCategory.PRIVACY,
      key: 'privacyPolicyUrl',
      type: SettingType.URL,
      label: '개인정보 처리방침 URL',
      description: '개인정보 처리방침 페이지 URL',
      validation: { url: true },
      sortOrder: 2
    },
    {
      category: SettingCategory.PRIVACY,
      key: 'dataRetentionDays',
      type: SettingType.NUMBER,
      label: '데이터 보관 기간',
      description: '사용자 데이터를 보관하는 일수',
      validation: { min: 30, max: 3650 },
      sortOrder: 3
    }
  ];

  for (const data of settingsData) {
    const existing = await settingRepository.findOne({
      where: { 
        category: data.category,
        key: data.key 
      }
    });

    if (!existing) {
      const setting = settingRepository.create(data);
      await settingRepository.save(setting);
      console.log(`Seeded setting: ${data.category}.${data.key}`);
    }
  }
}
```

---

## 🔧 Phase 4: 유틸리티 함수

### 4.1 설정 검증 유틸리티
**위치**: `/apps/api-server/src/utils/validators.ts`

```typescript
export function validateSettingValue(value: any, validation: any): string | null {
  if (!validation) return null;

  // Required check
  if (validation.required && !value) {
    return 'This field is required';
  }

  // Type-specific validation
  if (validation.email && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Invalid email format';
    }
  }

  if (validation.url && value) {
    try {
      new URL(value);
    } catch {
      return 'Invalid URL format';
    }
  }

  // Numeric validation
  if (typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      return `Value must be at least ${validation.min}`;
    }
    if (validation.max !== undefined && value > validation.max) {
      return `Value must be at most ${validation.max}`;
    }
  }

  // String validation
  if (typeof value === 'string') {
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return 'Value does not match required pattern';
      }
    }
    if (validation.minLength && value.length < validation.minLength) {
      return `Minimum length is ${validation.minLength}`;
    }
    if (validation.maxLength && value.length > validation.maxLength) {
      return `Maximum length is ${validation.maxLength}`;
    }
  }

  // Array validation
  if (Array.isArray(value)) {
    if (validation.minItems && value.length < validation.minItems) {
      return `Minimum ${validation.minItems} items required`;
    }
    if (validation.maxItems && value.length > validation.maxItems) {
      return `Maximum ${validation.maxItems} items allowed`;
    }
  }

  return null;
}
```

### 4.2 캐시 서비스
**위치**: `/apps/api-server/src/services/cache.service.ts`

```typescript
import Redis from 'ioredis';

class CacheManager {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
  }

  async get(key: string): Promise<any> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.set(key, serialized, 'EX', ttl);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(pattern: string): Promise<void> {
    try {
      if (pattern.includes('*')) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        await this.redis.del(pattern);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }
}

export const cacheManager = new CacheManager();
```

---

## 🚀 Phase 5: 메인 서버 통합

### 5.1 서버 초기화
**파일**: `/apps/api-server/src/main.ts`

```typescript
import siteSettingsRoutes from './routes/v1/site-settings.routes';
import { settingsService } from './services/settings.service';
import { seedSettings } from './seeds/settings.seed';

// 라우트 등록
app.use('/api/v1/settings', siteSettingsRoutes);

// 서버 시작 시
const startServer = async () => {
  try {
    // ... 기존 코드
    
    // Settings 초기화
    await seedSettings();
    await settingsService.initialize();
    console.log('Settings service initialized');
    
    // 설정 변경 이벤트 리스너
    settingsService.on('settingChanged', ({ category, key, value }) => {
      console.log(`Setting changed: ${category}.${key} = ${value}`);
      
      // 특정 설정 변경 시 추가 작업
      if (category === 'general' && key === 'maintenanceMode') {
        // 유지보수 모드 처리
        if (value) {
          console.log('Maintenance mode enabled');
        }
      }
    });
    
    // ... 나머지 코드
  } catch (error) {
    console.error('Server startup error:', error);
  }
};
```

---

## 📊 Phase 6: 고급 기능

### 6.1 설정 Import/Export
```typescript
/**
 * @route   GET /api/v1/settings/export
 * @desc    Export all settings
 * @access  Private (Admin only)
 */
router.get('/export',
  authenticateToken,
  checkPermission('settings:write'),
  async (req: Request, res: Response) => {
    try {
      const settingRepository = AppDataSource.getRepository(SiteSetting);
      const settings = await settingRepository.find();
      
      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        settings: settings.map(s => ({
          category: s.category,
          key: s.key,
          value: s.value,
          type: s.type
        }))
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="settings-export.json"');
      res.json(exportData);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export settings'
      });
    }
  }
);

/**
 * @route   POST /api/v1/settings/import
 * @desc    Import settings
 * @access  Private (Admin only)
 */
router.post('/import',
  authenticateToken,
  checkPermission('settings:write'),
  async (req: Request, res: Response) => {
    try {
      const { settings } = req.body;
      
      if (!Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid import data'
        });
      }

      const settingRepository = AppDataSource.getRepository(SiteSetting);
      const imported = [];
      const errors = [];

      for (const item of settings) {
        try {
          let setting = await settingRepository.findOne({
            where: { 
              category: item.category,
              key: item.key 
            }
          });

          if (!setting) {
            setting = settingRepository.create(item);
          } else {
            setting.value = item.value;
          }

          await settingRepository.save(setting);
          imported.push(`${item.category}.${item.key}`);
        } catch (error) {
          errors.push({ key: `${item.category}.${item.key}`, error: error.message });
        }
      }

      // Clear all caches
      await cacheManager.del('settings:*');

      res.json({
        success: true,
        imported: imported.length,
        errors,
        message: `Imported ${imported.length} settings`
      });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import settings'
      });
    }
  }
);
```

---

## 🔒 보안 고려사항

1. **권한 관리**
   - 읽기: 일부 공개 설정 제외하고 인증 필요
   - 쓰기: `settings:write` 권한 필요 (Admin only)
   - 리셋: Super Admin 권한 필요

2. **입력 검증**
   - 각 설정 타입별 검증
   - SQL Injection 방지
   - XSS 방지 (HTML 설정값)

3. **민감 정보 보호**
   - 비밀번호, API 키 암호화 저장
   - 응답에서 민감 정보 제거

4. **감사 로그**
   - 모든 설정 변경 이력 저장
   - 변경한 사용자, 시간, 이전값 기록

---

## 완료 체크리스트

### 데이터베이스
- [ ] SiteSetting Entity 생성
- [ ] SettingHistory Entity 생성
- [ ] 마이그레이션 실행
- [ ] 초기 데이터 시딩

### API 구현
- [ ] CRUD API 엔드포인트
- [ ] 카테고리별 설정 관리
- [ ] 설정 스키마 API
- [ ] Import/Export 기능
- [ ] 설정 이력 관리

### 서비스 계층
- [ ] SettingsService 구현
- [ ] 캐시 관리
- [ ] 이벤트 처리
- [ ] 검증 로직

### 보안
- [ ] 권한 체크
- [ ] 입력 검증
- [ ] 민감 정보 암호화
- [ ] Rate limiting

### 테스트
- [ ] 각 카테고리 설정 테스트
- [ ] 권한 테스트
- [ ] 캐시 동작 테스트
- [ ] Import/Export 테스트

---

이 가이드를 따라 구현하시면 완전한 WordPress 스타일 설정 시스템이 구축됩니다.