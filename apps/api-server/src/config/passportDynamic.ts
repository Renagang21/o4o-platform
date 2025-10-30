import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import { Strategy as NaverStrategy } from 'passport-naver-v2';
import { AppDataSource } from '../database/connection.js';
import { User, UserRole, UserStatus } from '../entities/User.js';
import { emailService } from '../services/emailService.js';
import { Settings as Setting } from '../entities/Settings.js';
import { decrypt } from '../utils/crypto.js';
import logger from '../utils/logger.js';

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
        // DataSource not initialized, using default settings
        return this.getDefaultSettings();
      }

      const settingsRepo = AppDataSource.getRepository(Setting);
      const oauthSetting = await settingsRepo.findOne({
        where: { key: 'oauth_settings' }
      });

      if (!oauthSetting || !oauthSetting.value) {
        return this.getDefaultSettings();
      }

      const parsedData = typeof oauthSetting.value === 'string'
        ? JSON.parse(oauthSetting.value)
        : oauthSetting.value as unknown as OAuthSettingsData;

      // Decrypt client secrets
      if (parsedData.google?.clientSecret) {
        try {
          parsedData.google.clientSecret = decrypt(parsedData.google.clientSecret);
        } catch (error) {
          logger.error('Failed to decrypt Google client secret');
          parsedData.google.clientSecret = '';
        }
      }
      if (parsedData.kakao?.clientSecret) {
        try {
          parsedData.kakao.clientSecret = decrypt(parsedData.kakao.clientSecret);
        } catch (error) {
          logger.error('Failed to decrypt Kakao client secret');
          parsedData.kakao.clientSecret = '';
        }
      }
      if (parsedData.naver?.clientSecret) {
        try {
          parsedData.naver.clientSecret = decrypt(parsedData.naver.clientSecret);
        } catch (error) {
          logger.error('Failed to decrypt Naver client secret');
          parsedData.naver.clientSecret = '';
        }
      }

      return parsedData;
    } catch (error) {
      logger.error('Error loading OAuth settings:', error);
      return this.getDefaultSettings();
    }
  }

  private static getDefaultSettings(): OAuthSettingsData {
    return {
      google: {
        provider: 'google',
        enabled: false,
        clientId: '',
        clientSecret: '',
        callbackUrl: '/api/v1/auth/google/callback',
        scope: ['profile', 'email']
      },
      kakao: {
        provider: 'kakao',
        enabled: false,
        clientId: '',
        clientSecret: '',
        callbackUrl: '/api/v1/auth/kakao/callback',
        scope: []
      },
      naver: {
        provider: 'naver',
        enabled: false,
        clientId: '',
        clientSecret: '',
        callbackUrl: '/api/v1/auth/naver/callback',
        scope: []
      }
    };
  }

  static async configureStrategies(): Promise<void> {
    try {
      const settings = await this.loadOAuthSettings();

      // Clear existing strategies
      this.clearStrategies();

      // Configure Google strategy
      if (settings.google.enabled && settings.google.clientId && settings.google.clientSecret) {
        this.configureGoogleStrategy(settings.google);
      }

      // Configure Kakao strategy
      if (settings.kakao.enabled && settings.kakao.clientId) {
        this.configureKakaoStrategy(settings.kakao);
      }

      // Configure Naver strategy
      if (settings.naver.enabled && settings.naver.clientId && settings.naver.clientSecret) {
        this.configureNaverStrategy(settings.naver);
      }

      logger.info('OAuth strategies configured successfully');
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
    passport.use(new GoogleStrategy({
      clientID: config.clientId,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackUrl,
      scope: config.scope
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const userRepo = AppDataSource.getRepository(User);
        
        let user = await userRepo.findOne({
          where: [
            { email: profile.emails?.[0]?.value },
            { provider: 'google', provider_id: profile.id }
          ]
        });

        if (user) {
          user.lastLoginAt = new Date();
          await userRepo.save(user);
          return done(null, user as any);
        }

        user = userRepo.create({
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          provider: 'google',
          provider_id: profile.id,
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          password: ''
        });

        await userRepo.save(user);
        await emailService.sendWelcomeEmail(user.email, user.name || user.email);

        done(null, user as any);
      } catch (error: any) {
        done(error as Error, undefined);
      }
    }));

    this.activeStrategies.add('google');
    logger.info('Google OAuth strategy configured');
  }

  private static configureKakaoStrategy(config: OAuthConfig): void {
    passport.use(new KakaoStrategy({
      clientID: config.clientId,
      clientSecret: config.clientSecret || '',
      callbackURL: config.callbackUrl
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        const userRepo = AppDataSource.getRepository(User);
        const email = profile._json.kakao_account?.email;
        
        if (!email) {
          return done(new Error('Email not provided by Kakao'), undefined);
        }

        let user = await userRepo.findOne({
          where: [
            { email },
            { provider: 'kakao', provider_id: String(profile.id) }
          ]
        });

        if (user) {
          user.lastLoginAt = new Date();
          await userRepo.save(user);
          return done(null, user as any);
        }

        user = userRepo.create({
          email,
          name: profile.displayName || profile.username || profile._json?.properties?.nickname || '',
          provider: 'kakao',
          provider_id: String(profile.id),
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          password: ''
        });

        await userRepo.save(user);
        await emailService.sendWelcomeEmail(user.email, user.name || user.email);

        done(null, user as any);
      } catch (error: any) {
        done(error as Error, undefined);
      }
    }));

    this.activeStrategies.add('kakao');
    logger.info('Kakao OAuth strategy configured');
  }

  private static configureNaverStrategy(config: OAuthConfig): void {
    passport.use(new NaverStrategy({
      clientID: config.clientId,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackUrl
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        const userRepo = AppDataSource.getRepository(User);
        const email = profile.email;
        
        if (!email) {
          return done(new Error('Email not provided by Naver'), undefined);
        }

        let user = await userRepo.findOne({
          where: [
            { email },
            { provider: 'naver', provider_id: profile.id }
          ]
        });

        if (user) {
          user.lastLoginAt = new Date();
          await userRepo.save(user);
          return done(null, user as any);
        }

        user = userRepo.create({
          email,
          name: profile.displayName || profile.nickname,
          provider: 'naver',
          provider_id: profile.id,
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          password: ''
        });

        await userRepo.save(user);
        await emailService.sendWelcomeEmail(user.email, user.name || user.email);

        done(null, user as any);
      } catch (error: any) {
        done(error as Error, undefined);
      }
    }));

    this.activeStrategies.add('naver');
    logger.info('Naver OAuth strategy configured');
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

export default passport;