# 🔐 소셜 로그인 설정 시스템 - API 서버 구현 가이드

## 개요
이 문서는 O4O Platform의 소셜 로그인 설정 시스템을 위한 백엔드 API 구현 가이드입니다.
WordPress 스타일의 소셜 로그인 관리 기능을 구현하여 사용자 인증을 간소화합니다.

---

## 🗂️ Phase 1: 데이터베이스 설정

### 1.1 소셜 로그인 제공업체 Entity
**위치**: `/apps/api-server/src/entities/SocialLoginProvider.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany
} from 'typeorm';

export enum SocialProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
  MICROSOFT = 'microsoft',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  GITHUB = 'github',
  DISCORD = 'discord',
  KAKAO = 'kakao',
  NAVER = 'naver'
}

export interface ProviderScope {
  name: string;
  required: boolean;
  description: string;
}

export interface ButtonStyle {
  size: 'small' | 'medium' | 'large';
  style: 'icon' | 'text' | 'icon-text';
  color?: string;
  customClass?: string;
}

@Entity('social_login_providers')
@Index(['slug', 'isActive'])
export class SocialLoginProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SocialProvider,
    unique: true
  })
  slug: SocialProvider;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientSecret: string;

  @Column({ type: 'json', nullable: true })
  scopes: ProviderScope[];

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  redirectUri: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  buttonText: string;

  @Column({ type: 'json', nullable: true })
  buttonStyle: ButtonStyle;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  apiVersion: string;

  @Column({ type: 'json', nullable: true })
  additionalSettings: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  endpoints: {
    authorizationUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    revokeUrl?: string;
  };

  @Column({ type: 'json', nullable: true })
  fieldMapping: {
    id?: string;
    email?: string;
    name?: string;
    avatar?: string;
    [key: string]: string | undefined;
  };

  @Column({ type: 'int', default: 0 })
  loginCount: number;

  @Column({ type: 'int', default: 0 })
  signupCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserSocialAccount, account => account.provider)
  socialAccounts: UserSocialAccount[];
}
```

### 1.2 사용자 소셜 계정 Entity
**위치**: `/apps/api-server/src/entities/UserSocialAccount.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique
} from 'typeorm';
import { User } from './User';
import { SocialLoginProvider, SocialProvider } from './SocialLoginProvider';

@Entity('user_social_accounts')
@Unique(['userId', 'provider'])
@Index(['provider', 'socialId'])
export class UserSocialAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, user => user.socialAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: SocialProvider
  })
  provider: SocialProvider;

  @ManyToOne(() => SocialLoginProvider, provider => provider.socialAccounts)
  @JoinColumn({ name: 'provider', referencedColumnName: 'slug' })
  providerEntity: SocialLoginProvider;

  @Column({ type: 'varchar', length: 255 })
  socialId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ type: 'text', nullable: true })
  accessToken: string;

  @Column({ type: 'text', nullable: true })
  refreshToken: string;

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt: Date;

  @Column({ type: 'json', nullable: true })
  rawData: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 1.3 소셜 로그인 설정 Entity
**위치**: `/apps/api-server/src/entities/SocialLoginSettings.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('social_login_settings')
export class SocialLoginSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'json', nullable: true })
  value: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 설정 키 상수
export const SOCIAL_LOGIN_SETTINGS = {
  ENABLED: 'social_login_enabled',
  AUTO_REGISTER: 'auto_register_users',
  DEFAULT_ROLE: 'default_user_role',
  EMAIL_VERIFICATION: 'require_email_verification',
  USERNAME_PATTERN: 'username_generation_pattern',
  LOGIN_REDIRECT: 'login_redirect_url',
  SIGNUP_REDIRECT: 'signup_redirect_url',
  LOGOUT_REDIRECT: 'logout_redirect_url',
  FAILURE_REDIRECT: 'failure_redirect_url',
  BUTTON_POSITION: 'button_display_positions',
  SECURITY_SETTINGS: 'security_settings',
  RATE_LIMIT: 'rate_limit_settings',
  DATA_SYNC: 'data_sync_settings',
  ANALYTICS_ENABLED: 'analytics_enabled'
};
```

---

## 🔌 Phase 2: API 엔드포인트 구현

### 2.1 소셜 로그인 설정 Routes
**위치**: `/apps/api-server/src/routes/v1/social-auth-settings.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { checkPermission } from '../../middleware/permissions';
import AppDataSource from '../../database/data-source';
import { SocialLoginProvider, SocialProvider } from '../../entities/SocialLoginProvider';
import { SocialLoginSettings, SOCIAL_LOGIN_SETTINGS } from '../../entities/SocialLoginSettings';
import { UserSocialAccount } from '../../entities/UserSocialAccount';
import { encryptData, decryptData } from '../../utils/encryption';

const router: Router = Router();

/**
 * @route   GET /api/v1/settings/social-auth/providers
 * @desc    Get all social login providers
 * @access  Private
 */
router.get('/providers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const providerRepository = AppDataSource.getRepository(SocialLoginProvider);
    
    const providers = await providerRepository.find({
      order: { sortOrder: 'ASC' },
      select: [
        'id', 'slug', 'name', 'isActive', 'buttonText', 
        'buttonStyle', 'sortOrder', 'loginCount', 'signupCount'
      ]
    });

    // Don't send sensitive data like clientSecret
    const sanitizedProviders = providers.map(p => ({
      ...p,
      hasCredentials: !!(p.clientId && p.clientSecret)
    }));

    res.json({
      success: true,
      data: sanitizedProviders
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch providers'
    });
  }
});

/**
 * @route   GET /api/v1/settings/social-auth/providers/:slug
 * @desc    Get specific provider settings (Admin only)
 * @access  Private (Admin)
 */
router.get('/providers/:slug',
  authenticateToken,
  checkPermission('settings:read'),
  async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const providerRepository = AppDataSource.getRepository(SocialLoginProvider);
      
      const provider = await providerRepository.findOne({
        where: { slug: slug as SocialProvider }
      });

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found'
        });
      }

      // Decrypt sensitive data for admin
      if (provider.clientSecret) {
        provider.clientSecret = decryptData(provider.clientSecret);
      }

      res.json({
        success: true,
        data: provider
      });
    } catch (error) {
      console.error('Error fetching provider:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch provider'
      });
    }
  }
);

/**
 * @route   PUT /api/v1/settings/social-auth/providers/:slug
 * @desc    Update provider settings (Admin only)
 * @access  Private (Admin)
 */
router.put('/providers/:slug',
  authenticateToken,
  checkPermission('settings:write'),
  async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const updateData = req.body;
      const providerRepository = AppDataSource.getRepository(SocialLoginProvider);
      
      let provider = await providerRepository.findOne({
        where: { slug: slug as SocialProvider }
      });

      if (!provider) {
        // Create new provider if doesn't exist
        provider = providerRepository.create({
          slug: slug as SocialProvider,
          name: updateData.name || slug,
          ...updateData
        });
      } else {
        // Update existing
        Object.assign(provider, updateData);
      }

      // Encrypt sensitive data
      if (provider.clientSecret) {
        provider.clientSecret = encryptData(provider.clientSecret);
      }

      // Generate redirect URI
      if (!provider.redirectUri) {
        provider.redirectUri = `${process.env.APP_URL}/auth/${slug}/callback`;
      }

      await providerRepository.save(provider);

      // Return without sensitive data
      const response = { ...provider };
      delete response.clientSecret;

      res.json({
        success: true,
        data: response,
        message: 'Provider settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating provider:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update provider'
      });
    }
  }
);

/**
 * @route   POST /api/v1/settings/social-auth/providers/:slug/toggle
 * @desc    Toggle provider active status
 * @access  Private (Admin)
 */
router.post('/providers/:slug/toggle',
  authenticateToken,
  checkPermission('settings:write'),
  async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const providerRepository = AppDataSource.getRepository(SocialLoginProvider);
      
      const provider = await providerRepository.findOne({
        where: { slug: slug as SocialProvider }
      });

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found'
        });
      }

      // Check if credentials are set before enabling
      if (!provider.isActive && (!provider.clientId || !provider.clientSecret)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot enable provider without credentials'
        });
      }

      provider.isActive = !provider.isActive;
      await providerRepository.save(provider);

      res.json({
        success: true,
        data: { isActive: provider.isActive },
        message: `Provider ${provider.isActive ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Error toggling provider:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle provider'
      });
    }
  }
);

/**
 * @route   GET /api/v1/settings/social-auth/general
 * @desc    Get general social login settings
 * @access  Private
 */
router.get('/general', authenticateToken, async (req: Request, res: Response) => {
  try {
    const settingsRepository = AppDataSource.getRepository(SocialLoginSettings);
    
    const settings = await settingsRepository.find();
    const settingsMap: Record<string, any> = {};
    
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    // Set defaults if not exists
    const defaultSettings = {
      [SOCIAL_LOGIN_SETTINGS.ENABLED]: true,
      [SOCIAL_LOGIN_SETTINGS.AUTO_REGISTER]: true,
      [SOCIAL_LOGIN_SETTINGS.DEFAULT_ROLE]: 'customer',
      [SOCIAL_LOGIN_SETTINGS.EMAIL_VERIFICATION]: false,
      [SOCIAL_LOGIN_SETTINGS.USERNAME_PATTERN]: '{provider}_{id}',
      [SOCIAL_LOGIN_SETTINGS.LOGIN_REDIRECT]: '/dashboard',
      [SOCIAL_LOGIN_SETTINGS.SIGNUP_REDIRECT]: '/welcome',
      [SOCIAL_LOGIN_SETTINGS.LOGOUT_REDIRECT]: '/',
      [SOCIAL_LOGIN_SETTINGS.FAILURE_REDIRECT]: '/login?error=social',
      [SOCIAL_LOGIN_SETTINGS.BUTTON_POSITION]: ['login', 'register', 'checkout'],
      [SOCIAL_LOGIN_SETTINGS.ANALYTICS_ENABLED]: true
    };

    const finalSettings = { ...defaultSettings, ...settingsMap };

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
 * @route   PUT /api/v1/settings/social-auth/general
 * @desc    Update general social login settings
 * @access  Private (Admin)
 */
router.put('/general',
  authenticateToken,
  checkPermission('settings:write'),
  async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const settingsRepository = AppDataSource.getRepository(SocialLoginSettings);
      
      for (const [key, value] of Object.entries(updates)) {
        let setting = await settingsRepository.findOne({ where: { key } });
        
        if (!setting) {
          setting = settingsRepository.create({ key, value });
        } else {
          setting.value = value;
        }
        
        await settingsRepository.save(setting);
      }

      res.json({
        success: true,
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
 * @route   GET /api/v1/settings/social-auth/stats
 * @desc    Get social login statistics
 * @access  Private (Admin)
 */
router.get('/stats',
  authenticateToken,
  checkPermission('settings:read'),
  async (req: Request, res: Response) => {
    try {
      const providerRepository = AppDataSource.getRepository(SocialLoginProvider);
      const accountRepository = AppDataSource.getRepository(UserSocialAccount);
      
      // Provider stats
      const providers = await providerRepository.find({
        select: ['slug', 'name', 'loginCount', 'signupCount', 'failureCount']
      });

      // User stats
      const totalAccounts = await accountRepository.count();
      const activeAccounts = await accountRepository.count({ where: { isActive: true } });
      
      // Recent activity
      const recentLogins = await accountRepository
        .createQueryBuilder('account')
        .select('account.provider', 'provider')
        .addSelect('COUNT(*)', 'count')
        .where('account.lastLoginAt > :date', { 
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        })
        .groupBy('account.provider')
        .getRawMany();

      res.json({
        success: true,
        data: {
          providers,
          accounts: {
            total: totalAccounts,
            active: activeAccounts
          },
          recentActivity: recentLogins,
          summary: {
            totalLogins: providers.reduce((sum, p) => sum + p.loginCount, 0),
            totalSignups: providers.reduce((sum, p) => sum + p.signupCount, 0),
            totalFailures: providers.reduce((sum, p) => sum + p.failureCount, 0)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  }
);

/**
 * @route   GET /api/v1/settings/social-auth/users/:userId/accounts
 * @desc    Get user's linked social accounts
 * @access  Private (User or Admin)
 */
router.get('/users/:userId/accounts',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requestingUser = req.user;
      
      // Check permission (user can only see their own accounts)
      if (requestingUser.id !== userId && requestingUser.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Permission denied'
        });
      }

      const accountRepository = AppDataSource.getRepository(UserSocialAccount);
      
      const accounts = await accountRepository.find({
        where: { userId },
        relations: ['providerEntity'],
        select: ['id', 'provider', 'email', 'name', 'isActive', 'lastLoginAt', 'createdAt']
      });

      res.json({
        success: true,
        data: accounts
      });
    } catch (error) {
      console.error('Error fetching user accounts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user accounts'
      });
    }
  }
);

/**
 * @route   DELETE /api/v1/settings/social-auth/users/:userId/accounts/:provider
 * @desc    Unlink social account
 * @access  Private (User or Admin)
 */
router.delete('/users/:userId/accounts/:provider',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { userId, provider } = req.params;
      const requestingUser = req.user;
      
      // Check permission
      if (requestingUser.id !== userId && requestingUser.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Permission denied'
        });
      }

      const accountRepository = AppDataSource.getRepository(UserSocialAccount);
      
      const result = await accountRepository.delete({
        userId,
        provider: provider as SocialProvider
      });

      if (result.affected === 0) {
        return res.status(404).json({
          success: false,
          error: 'Social account not found'
        });
      }

      res.json({
        success: true,
        message: 'Social account unlinked successfully'
      });
    } catch (error) {
      console.error('Error unlinking account:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unlink account'
      });
    }
  }
);

export default router;
```

### 2.2 OAuth 인증 처리 Routes
**위치**: `/apps/api-server/src/routes/v1/social-auth.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import passport from 'passport';
import { generateTokens } from '../../services/auth.service';
import { SocialLoginProvider } from '../../entities/SocialLoginProvider';
import { UserSocialAccount } from '../../entities/UserSocialAccount';
import { User } from '../../entities/User';
import AppDataSource from '../../database/data-source';

const router: Router = Router();

/**
 * @route   GET /api/v1/auth/social/:provider
 * @desc    Initiate social login
 * @access  Public
 */
router.get('/:provider', (req: Request, res: Response, next: any) => {
  const { provider } = req.params;
  const { redirect } = req.query;
  
  // Store redirect URL in session
  if (redirect) {
    req.session.redirectUrl = redirect as string;
  }
  
  // Use passport strategy
  passport.authenticate(provider, {
    scope: getProviderScopes(provider)
  })(req, res, next);
});

/**
 * @route   GET /api/v1/auth/social/:provider/callback
 * @desc    Handle social login callback
 * @access  Public
 */
router.get('/:provider/callback', 
  (req: Request, res: Response, next: any) => {
    const { provider } = req.params;
    
    passport.authenticate(provider, { session: false }, async (err, profile) => {
      if (err || !profile) {
        const failureRedirect = await getFailureRedirect();
        return res.redirect(failureRedirect);
      }
      
      try {
        // Process social login
        const result = await processSocialLogin(provider, profile);
        
        if (result.success) {
          // Generate JWT tokens
          const tokens = generateTokens(result.user);
          
          // Get redirect URL
          const redirectUrl = req.session.redirectUrl || 
                            (result.isNewUser ? await getSignupRedirect() : await getLoginRedirect());
          
          // Clear session
          delete req.session.redirectUrl;
          
          // Redirect with tokens
          res.redirect(`${redirectUrl}?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
        } else {
          const failureRedirect = await getFailureRedirect();
          res.redirect(`${failureRedirect}?error=${result.error}`);
        }
      } catch (error) {
        console.error('Social login error:', error);
        const failureRedirect = await getFailureRedirect();
        res.redirect(`${failureRedirect}?error=server_error`);
      }
    })(req, res, next);
  }
);

/**
 * Process social login/signup
 */
async function processSocialLogin(provider: string, profile: any) {
  const userRepository = AppDataSource.getRepository(User);
  const accountRepository = AppDataSource.getRepository(UserSocialAccount);
  const providerRepository = AppDataSource.getRepository(SocialLoginProvider);
  
  // Check if provider is active
  const providerEntity = await providerRepository.findOne({
    where: { slug: provider, isActive: true }
  });
  
  if (!providerEntity) {
    return { success: false, error: 'provider_disabled' };
  }
  
  // Extract user data from profile
  const userData = extractUserData(provider, profile);
  
  // Check if social account exists
  let socialAccount = await accountRepository.findOne({
    where: {
      provider,
      socialId: userData.socialId
    },
    relations: ['user']
  });
  
  let user: User;
  let isNewUser = false;
  
  if (socialAccount) {
    // Existing social account
    user = socialAccount.user;
    
    // Update last login
    socialAccount.lastLoginAt = new Date();
    await accountRepository.save(socialAccount);
    
    // Increment login count
    await providerRepository.increment({ slug: provider }, 'loginCount', 1);
  } else {
    // New social account
    // Check if user with email exists
    if (userData.email) {
      user = await userRepository.findOne({
        where: { email: userData.email }
      });
    }
    
    if (!user) {
      // Check if auto-registration is enabled
      const autoRegister = await getSetting('auto_register_users');
      
      if (!autoRegister) {
        return { success: false, error: 'registration_disabled' };
      }
      
      // Create new user
      const defaultRole = await getSetting('default_user_role') || 'customer';
      
      user = userRepository.create({
        email: userData.email,
        name: userData.name,
        username: await generateUsername(provider, userData),
        role: defaultRole,
        emailVerified: !!userData.email,
        avatar: userData.avatar
      });
      
      await userRepository.save(user);
      isNewUser = true;
      
      // Increment signup count
      await providerRepository.increment({ slug: provider }, 'signupCount', 1);
    }
    
    // Create social account link
    socialAccount = accountRepository.create({
      userId: user.id,
      provider,
      socialId: userData.socialId,
      email: userData.email,
      name: userData.name,
      avatarUrl: userData.avatar,
      rawData: profile,
      lastLoginAt: new Date()
    });
    
    await accountRepository.save(socialAccount);
  }
  
  return { success: true, user, isNewUser };
}

/**
 * Helper functions
 */
function getProviderScopes(provider: string): string[] {
  const defaultScopes: Record<string, string[]> = {
    google: ['email', 'profile'],
    facebook: ['email', 'public_profile'],
    github: ['user:email'],
    linkedin: ['r_liteprofile', 'r_emailaddress']
  };
  
  return defaultScopes[provider] || ['email'];
}

function extractUserData(provider: string, profile: any) {
  // Provider-specific data extraction
  switch (provider) {
    case 'google':
      return {
        socialId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value
      };
    case 'facebook':
      return {
        socialId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value
      };
    case 'github':
      return {
        socialId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName || profile.username,
        avatar: profile.photos?.[0]?.value
      };
    default:
      return {
        socialId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value
      };
  }
}

async function generateUsername(provider: string, userData: any): Promise<string> {
  const pattern = await getSetting('username_generation_pattern') || '{provider}_{id}';
  
  let username = pattern
    .replace('{provider}', provider)
    .replace('{id}', userData.socialId.substring(0, 8))
    .replace('{email}', userData.email?.split('@')[0] || '')
    .replace('{name}', userData.name?.toLowerCase().replace(/\s+/g, '_') || '');
  
  // Ensure uniqueness
  const userRepository = AppDataSource.getRepository(User);
  let counter = 0;
  let finalUsername = username;
  
  while (await userRepository.count({ where: { username: finalUsername } }) > 0) {
    counter++;
    finalUsername = `${username}_${counter}`;
  }
  
  return finalUsername;
}

async function getSetting(key: string): Promise<any> {
  const settingsRepository = AppDataSource.getRepository(SocialLoginSettings);
  const setting = await settingsRepository.findOne({ where: { key } });
  return setting?.value;
}

async function getLoginRedirect(): Promise<string> {
  return await getSetting('login_redirect_url') || '/dashboard';
}

async function getSignupRedirect(): Promise<string> {
  return await getSetting('signup_redirect_url') || '/welcome';
}

async function getFailureRedirect(): Promise<string> {
  return await getSetting('failure_redirect_url') || '/login?error=social';
}

export default router;
```

---

## 🔧 Phase 3: Passport.js Strategy 설정

### 3.1 Passport Configuration
**위치**: `/apps/api-server/src/config/passport-social.ts`

```typescript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GitHubStrategy } from 'passport-github2';
import AppDataSource from '../database/data-source';
import { SocialLoginProvider } from '../entities/SocialLoginProvider';
import { decryptData } from '../utils/encryption';

export async function configureSocialPassport() {
  const providerRepository = AppDataSource.getRepository(SocialLoginProvider);
  
  // Load active providers
  const providers = await providerRepository.find({
    where: { isActive: true }
  });
  
  for (const provider of providers) {
    const clientId = provider.clientId;
    const clientSecret = decryptData(provider.clientSecret);
    const callbackURL = provider.redirectUri;
    
    switch (provider.slug) {
      case 'google':
        passport.use(new GoogleStrategy({
          clientID: clientId,
          clientSecret: clientSecret,
          callbackURL: callbackURL
        }, (accessToken, refreshToken, profile, done) => {
          return done(null, profile);
        }));
        break;
        
      case 'facebook':
        passport.use(new FacebookStrategy({
          clientID: clientId,
          clientSecret: clientSecret,
          callbackURL: callbackURL,
          profileFields: ['id', 'emails', 'name', 'picture.type(large)']
        }, (accessToken, refreshToken, profile, done) => {
          return done(null, profile);
        }));
        break;
        
      case 'github':
        passport.use(new GitHubStrategy({
          clientID: clientId,
          clientSecret: clientSecret,
          callbackURL: callbackURL
        }, (accessToken, refreshToken, profile, done) => {
          return done(null, profile);
        }));
        break;
        
      // Add more providers as needed
    }
  }
}
```

---

## 📦 Phase 4: 초기 데이터 시딩

### 4.1 Provider 초기 데이터
**위치**: `/apps/api-server/src/seeds/social-providers.seed.ts`

```typescript
import AppDataSource from '../database/data-source';
import { SocialLoginProvider, SocialProvider } from '../entities/SocialLoginProvider';

export async function seedSocialProviders() {
  const providerRepository = AppDataSource.getRepository(SocialLoginProvider);
  
  const providers = [
    {
      slug: SocialProvider.GOOGLE,
      name: 'Google',
      buttonText: 'Google로 계속하기',
      buttonStyle: {
        size: 'medium',
        style: 'icon-text',
        color: '#4285F4'
      },
      sortOrder: 1,
      scopes: [
        { name: 'email', required: true, description: '이메일 주소' },
        { name: 'profile', required: true, description: '기본 프로필 정보' }
      ],
      endpoints: {
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
      }
    },
    {
      slug: SocialProvider.FACEBOOK,
      name: 'Facebook',
      buttonText: 'Facebook으로 계속하기',
      buttonStyle: {
        size: 'medium',
        style: 'icon-text',
        color: '#1877F2'
      },
      sortOrder: 2,
      scopes: [
        { name: 'email', required: true, description: '이메일 주소' },
        { name: 'public_profile', required: true, description: '공개 프로필' }
      ],
      apiVersion: 'v12.0'
    },
    {
      slug: SocialProvider.KAKAO,
      name: 'Kakao',
      buttonText: '카카오로 시작하기',
      buttonStyle: {
        size: 'medium',
        style: 'icon-text',
        color: '#FEE500'
      },
      sortOrder: 3,
      endpoints: {
        authorizationUrl: 'https://kauth.kakao.com/oauth/authorize',
        tokenUrl: 'https://kauth.kakao.com/oauth/token',
        userInfoUrl: 'https://kapi.kakao.com/v2/user/me'
      }
    },
    {
      slug: SocialProvider.NAVER,
      name: 'Naver',
      buttonText: '네이버로 시작하기',
      buttonStyle: {
        size: 'medium',
        style: 'icon-text',
        color: '#03C75A'
      },
      sortOrder: 4,
      endpoints: {
        authorizationUrl: 'https://nid.naver.com/oauth2.0/authorize',
        tokenUrl: 'https://nid.naver.com/oauth2.0/token',
        userInfoUrl: 'https://openapi.naver.com/v1/nid/me'
      }
    }
  ];
  
  for (const providerData of providers) {
    const existing = await providerRepository.findOne({
      where: { slug: providerData.slug }
    });
    
    if (!existing) {
      const provider = providerRepository.create(providerData);
      await providerRepository.save(provider);
      console.log(`Seeded provider: ${provider.name}`);
    }
  }
}
```

---

## 🚀 Phase 5: 메인 서버 통합

### 5.1 서버 초기화
**파일**: `/apps/api-server/src/main.ts`

```typescript
import socialAuthSettingsRoutes from './routes/v1/social-auth-settings.routes';
import socialAuthRoutes from './routes/v1/social-auth.routes';
import { configureSocialPassport } from './config/passport-social';
import { seedSocialProviders } from './seeds/social-providers.seed';

// 라우트 등록
app.use('/api/v1/settings/social-auth', socialAuthSettingsRoutes);
app.use('/api/v1/auth/social', socialAuthRoutes);

// 서버 시작 시
const startServer = async () => {
  try {
    // ... 기존 코드
    
    // Social providers 초기화
    await seedSocialProviders();
    console.log('Social providers initialized');
    
    // Passport strategies 설정
    await configureSocialPassport();
    console.log('Social passport strategies configured');
    
    // ... 나머지 코드
  } catch (error) {
    console.error('Server startup error:', error);
  }
};
```

---

## 🔒 보안 고려사항

### 1. 데이터 암호화
```typescript
// utils/encryption.ts
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

export function encryptData(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decryptData(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 2. Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const socialAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per IP
  message: 'Too many login attempts, please try again later'
});

app.use('/api/v1/auth/social', socialAuthLimiter);
```

---

## 📊 모니터링 및 분석

### Analytics 이벤트 트래킹
```typescript
// services/analytics.service.ts
export async function trackSocialEvent(event: string, data: any) {
  // Google Analytics, Mixpanel 등 연동
  if (process.env.GA_TRACKING_ID) {
    // Track to Google Analytics
  }
  
  // Internal logging
  console.log(`[Social Auth Event] ${event}:`, data);
}

// Usage
trackSocialEvent('social_login_attempt', { provider, userId });
trackSocialEvent('social_login_success', { provider, userId, isNewUser });
trackSocialEvent('social_login_failure', { provider, error });
```

---

## 완료 체크리스트

### Phase 1 (데이터베이스)
- [ ] SocialLoginProvider Entity 생성
- [ ] UserSocialAccount Entity 생성
- [ ] SocialLoginSettings Entity 생성
- [ ] 마이그레이션 실행

### Phase 2 (API)
- [ ] 설정 관리 API 구현
- [ ] OAuth 인증 처리 구현
- [ ] 사용자 계정 연동 API 구현
- [ ] 통계 API 구현

### Phase 3 (인증)
- [ ] Passport strategies 설정
- [ ] Provider별 인증 로직 구현
- [ ] 콜백 처리 구현

### Phase 4 (보안)
- [ ] 데이터 암호화 구현
- [ ] Rate limiting 적용
- [ ] CSRF 보호
- [ ] State parameter 검증

### Phase 5 (테스트)
- [ ] 각 provider 인증 테스트
- [ ] 사용자 등록/로그인 플로우 테스트
- [ ] 계정 연동/해제 테스트
- [ ] 에러 처리 테스트

---

이 가이드를 따라 구현하시면 완전한 소셜 로그인 설정 시스템이 구축됩니다.