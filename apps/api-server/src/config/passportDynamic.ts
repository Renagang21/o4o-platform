/**
 * Dynamic Passport OAuth Configuration
 *
 * Dynamically loads OAuth provider settings from database and configures
 * Passport strategies at runtime. Supports Google, Kakao, and Naver.
 *
 * Database key: 'oauth_settings'
 * Fallback: Environment variables → Default (all disabled)
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import { Strategy as NaverStrategy } from 'passport-naver-v2';
import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import { Settings as Setting } from '../entities/Settings.js';
import { decrypt } from '../utils/crypto.js';
import logger from '../utils/logger.js';
// WO-O4O-GOOGLE-IDENTITY-AUTOMATIC-EMAIL-MERGE-REMOVAL-V1 (WO-2B):
//   `SocialAuthService.handleSocialAuth`(이메일 OR provider_id 로 users 조회 → 자동 병합) 를 삭제했다.
//   passport strategy 등록 자체는 유지하되(passport 제거 = WO-2G), verify callback 은 어떤 경우에도
//   user 를 생성·병합·로그인시키지 않는다. Google Identity 정본은 linked_accounts(provider='google',
//   providerId=sub) 이며 users.provider/provider_id 는 정본이 아니다 (O4O-IDENTITY-ARCHITECTURE-V3 §3).
const LEGACY_SOCIAL_AUTH_DISABLED = 'LEGACY_SOCIAL_AUTH_DISABLED';

const rejectLegacySocialProfile = (provider: 'google' | 'kakao' | 'naver'): Error => {
  logger.warn('[passportDynamic] legacy social verify callback reached — auto-merge removed (WO-2B)', { provider });
  return new Error(LEGACY_SOCIAL_AUTH_DISABLED);
};

interface OAuthConfig {
  provider: string;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string[];
}

interface OAuthSettingsData {
  google: OAuthConfig;
  kakao: OAuthConfig;
  naver: OAuthConfig;
}

// User serialization for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id } });
    done(null, user as any);
  } catch (error: any) {
    done(error, null);
  }
});

// Dynamic strategy management
class PassportManager {
  private static activeStrategies: Set<string> = new Set();

  static async loadOAuthSettings(): Promise<OAuthSettingsData> {
    try {
      // Check if AppDataSource is initialized
      if (!AppDataSource.isInitialized) {
        const envSettings = this.getEnvSettings();
        if (this.hasValidEnvSettings(envSettings)) {
          logger.info('OAuth settings loaded from environment (DB not ready)');
          return envSettings;
        }
        logger.warn('No OAuth settings available, using defaults');
        return this.getDefaultSettings();
      }

      const settingsRepo = AppDataSource.getRepository(Setting);
      const oauthSetting = await settingsRepo.findOne({
        where: { key: 'oauth_settings' }
      });

      if (!oauthSetting || !oauthSetting.value) {
        const envSettings = this.getEnvSettings();
        if (this.hasValidEnvSettings(envSettings)) {
          logger.info('OAuth settings loaded from environment (no DB config)');
          return envSettings;
        }
        logger.warn('No OAuth settings in DB or environment, using defaults');
        return this.getDefaultSettings();
      }

      const parsedData = typeof oauthSetting.value === 'string'
        ? JSON.parse(oauthSetting.value)
        : oauthSetting.value as unknown as OAuthSettingsData;

      // Decrypt client secrets (if encrypted)
      // Handle both encrypted and plain-text secrets for backward compatibility
      if (parsedData.google?.clientSecret) {
        try {
          parsedData.google.clientSecret = decrypt(parsedData.google.clientSecret);
        } catch (error) {
          // If decryption fails, assume it's plain-text (legacy data)
          logger.warn('Google client secret not encrypted, using as-is');
        }
      }
      if (parsedData.kakao?.clientSecret) {
        try {
          parsedData.kakao.clientSecret = decrypt(parsedData.kakao.clientSecret);
        } catch (error) {
          // If decryption fails, assume it's plain-text (legacy data)
          logger.warn('Kakao client secret not encrypted, using as-is');
        }
      }
      if (parsedData.naver?.clientSecret) {
        try {
          parsedData.naver.clientSecret = decrypt(parsedData.naver.clientSecret);
        } catch (error) {
          // If decryption fails, assume it's plain-text (legacy data)
          logger.warn('Naver client secret not encrypted, using as-is');
        }
      }

      const enabledProviders = Object.keys(parsedData)
        .filter(key => parsedData[key as keyof OAuthSettingsData]?.enabled);

      logger.info('OAuth settings loaded from database', {
        source: 'database',
        enabledProviders: enabledProviders.length > 0 ? enabledProviders : ['none']
      });

      return parsedData;
    } catch (error) {
      logger.error('Error loading OAuth settings:', error);
      return this.getDefaultSettings();
    }
  }

  private static getEnvSettings(): OAuthSettingsData {
    // Use API URL for OAuth callbacks (not frontend URL)
    const apiUrl = process.env.API_URL || 'https://api.neture.co.kr';

    return {
      google: {
        provider: 'google',
        enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackUrl: `${apiUrl}/api/v1/social/google/callback`,
        scope: ['profile', 'email']
      },
      kakao: {
        provider: 'kakao',
        enabled: !!(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET),
        clientId: process.env.KAKAO_CLIENT_ID || '',
        clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
        callbackUrl: `${apiUrl}/api/v1/social/kakao/callback`,
        scope: []
      },
      naver: {
        provider: 'naver',
        enabled: !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
        clientId: process.env.NAVER_CLIENT_ID || '',
        clientSecret: process.env.NAVER_CLIENT_SECRET || '',
        callbackUrl: `${apiUrl}/api/v1/social/naver/callback`,
        scope: []
      }
    };
  }

  private static hasValidEnvSettings(settings: OAuthSettingsData): boolean {
    return settings.google.enabled || settings.kakao.enabled || settings.naver.enabled;
  }

  private static getDefaultSettings(): OAuthSettingsData {
    return {
      google: {
        provider: 'google',
        enabled: false,
        clientId: '',
        clientSecret: '',
        callbackUrl: '/api/v1/social/google/callback',
        scope: ['profile', 'email']
      },
      kakao: {
        provider: 'kakao',
        enabled: false,
        clientId: '',
        clientSecret: '',
        callbackUrl: '/api/v1/social/kakao/callback',
        scope: []
      },
      naver: {
        provider: 'naver',
        enabled: false,
        clientId: '',
        clientSecret: '',
        callbackUrl: '/api/v1/social/naver/callback',
        scope: []
      }
    };
  }

  static async configureStrategies(): Promise<void> {
    try {
      const settings = await this.loadOAuthSettings();

      // Clear existing strategies
      this.clearStrategies();

      const registeredStrategies: string[] = [];

      // Configure Google strategy
      if (settings.google.enabled && settings.google.clientId && settings.google.clientSecret) {
        this.configureGoogleStrategy(settings.google);
        registeredStrategies.push('google');
      } else if (settings.google.enabled) {
        logger.warn('Google OAuth enabled but missing credentials');
      }

      // Configure Kakao strategy
      if (settings.kakao.enabled && settings.kakao.clientId) {
        this.configureKakaoStrategy(settings.kakao);
        registeredStrategies.push('kakao');
      } else if (settings.kakao.enabled) {
        logger.warn('Kakao OAuth enabled but missing clientId');
      }

      // Configure Naver strategy
      if (settings.naver.enabled && settings.naver.clientId && settings.naver.clientSecret) {
        this.configureNaverStrategy(settings.naver);
        registeredStrategies.push('naver');
      } else if (settings.naver.enabled) {
        logger.warn('Naver OAuth enabled but missing credentials');
      }

      // Log final result
      if (registeredStrategies.length > 0) {
        logger.info(`OAuth strategies registered: ${registeredStrategies.join(', ')}`);
      } else {
        logger.warn('No OAuth strategies registered');
      }
    } catch (error) {
      logger.error('Error configuring OAuth strategies:', error);
    }
  }

  private static clearStrategies(): void {
    this.activeStrategies.forEach(strategyName => {
      passport.unuse(strategyName);
    });
    this.activeStrategies.clear();
  }

  private static configureGoogleStrategy(config: OAuthConfig): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    passport.use(new GoogleStrategy({
      clientID: config.clientId,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackUrl,
      scope: config.scope
    }, (_accessToken, _refreshToken, _profile, done) => {
      done(rejectLegacySocialProfile('google'), undefined);
    }) as any);

    this.activeStrategies.add('google');
  }

  private static configureKakaoStrategy(config: OAuthConfig): void {
    passport.use(new KakaoStrategy({
      clientID: config.clientId,
      clientSecret: config.clientSecret || '',
      callbackURL: config.callbackUrl
    }, (_accessToken: string, _refreshToken: string, _profile: any, done: any) => {
      done(rejectLegacySocialProfile('kakao'), undefined);
    }));

    this.activeStrategies.add('kakao');
  }

  private static configureNaverStrategy(config: OAuthConfig): void {
    passport.use(new NaverStrategy({
      clientID: config.clientId,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackUrl
    }, (_accessToken: string, _refreshToken: string, _profile: any, done: any) => {
      done(rejectLegacySocialProfile('naver'), undefined);
    }));

    this.activeStrategies.add('naver');
  }

  static async reloadStrategies(): Promise<void> {
    await this.configureStrategies();
  }

  static getActiveStrategies(): string[] {
    return Array.from(this.activeStrategies);
  }
}

// Initialize strategies on startup
export const initializePassport = async (): Promise<void> => {
  await PassportManager.configureStrategies();
};

// Export reload function for use when settings change
export const reloadPassportStrategies = async (): Promise<void> => {
  await PassportManager.reloadStrategies();
};

// Export function to get active strategies (for status endpoint)
export const getActiveStrategies = (): string[] => {
  return PassportManager.getActiveStrategies();
};

export default passport;