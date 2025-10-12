import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/adminOnly';
import { validateDto } from '../middleware/validateDto';
import {
  OAuthSettingsData,
  OAuthProvider,
  OAuthConfig,
  OAuthUpdateRequest,
  OAuthTestRequest
} from '../types/settings';
import { body } from 'express-validator';
import logger from '../utils/logger';
import { encrypt, decrypt } from '../utils/crypto';
import { AppDataSource } from '../database/connection';
import { Settings as Setting } from '../entities/Settings';
import { reloadPassportStrategies } from '../config/passportDynamic';
import { getOAuthProviderConfig } from '../config/oauth-providers';

const router: Router = Router();

// Validation rules
const oauthUpdateValidation = [
  body('provider').isIn(['google', 'kakao', 'naver']).withMessage('Invalid OAuth provider'),
  body('config').isObject().withMessage('Config must be an object'),
  body('config.enabled').optional().isBoolean(),
  body('config.clientId').optional().isString().trim(),
  body('config.clientSecret').optional().isString().trim(),
  body('config.scope').optional().isArray()
];

const oauthTestValidation = [
  body('provider').isIn(['google', 'kakao', 'naver']).withMessage('Invalid OAuth provider')
];

// Helper function to get default OAuth config
const getDefaultOAuthConfig = (provider: OAuthProvider): OAuthConfig => ({
  provider,
  enabled: false,
  clientId: '',
  clientSecret: '',
  callbackUrl: `${process.env.APP_URL || ''}/api/auth/callback/${provider}`,
  scope: []
});

// Helper function to get default OAuth settings
const getDefaultOAuthSettings = (): OAuthSettingsData => ({
  google: getDefaultOAuthConfig('google'),
  kakao: getDefaultOAuthConfig('kakao'),
  naver: getDefaultOAuthConfig('naver')
});

// Helper function to encrypt sensitive OAuth data
const encryptOAuthData = (data: OAuthSettingsData): OAuthSettingsData => {
  const encrypted = { ...data };
  
  Object.keys(encrypted).forEach((provider) => {
    const config = encrypted[provider as OAuthProvider];
    if (config.clientSecret) {
      config.clientSecret = encrypt(config.clientSecret);
    }
  });
  
  return encrypted;
};

// Helper function to decrypt sensitive OAuth data
const decryptOAuthData = (data: OAuthSettingsData): OAuthSettingsData => {
  const decrypted = { ...data };

  Object.keys(decrypted).forEach((provider) => {
    const config = decrypted[provider as OAuthProvider];
    if (config.clientSecret) {
      try {
        config.clientSecret = decrypt(config.clientSecret);
      } catch (error) {
        logger.error(`Failed to decrypt client secret for ${provider}:`, error);
        config.clientSecret = '';
      }
    }
  });

  return decrypted;
};

// Helper function to get OAuth settings from database
const getOAuthSettings = async (): Promise<OAuthSettingsData> => {
  const settingRepository = AppDataSource.getRepository(Setting);

  const oauthSetting = await settingRepository.findOne({
    where: { key: 'oauth_settings' }
  });

  if (!oauthSetting || !oauthSetting.value) {
    return getDefaultOAuthSettings();
  }

  try {
    const parsedData = typeof oauthSetting.value === 'string'
      ? JSON.parse(oauthSetting.value)
      : oauthSetting.value as unknown as OAuthSettingsData;
    return decryptOAuthData(parsedData);
  } catch (error) {
    logger.error('Failed to parse OAuth settings:', error);
    return getDefaultOAuthSettings();
  }
};

// GET /api/settings/oauth - Get OAuth settings
router.get('/oauth', authenticate, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const oauthData = await getOAuthSettings();

    res.json({
      success: true,
      data: oauthData
    });
  } catch (error) {
    logger.error('Error fetching OAuth settings:', error);
    next(error);
  }
});

// PUT /api/settings/oauth - Update OAuth settings
router.put('/oauth',
  authenticate,
  adminOnly,
  oauthUpdateValidation,
  validateDto,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider, config } = req.body as OAuthUpdateRequest;
      const settingRepository = AppDataSource.getRepository(Setting);

      // Get current settings
      const currentData = await getOAuthSettings();

      let oauthSetting = await settingRepository.findOne({
        where: { key: 'oauth_settings' }
      });

      // Update specific provider config
      currentData[provider] = {
        ...currentData[provider],
        ...config,
        provider, // Ensure provider is always set
        callbackUrl: `${process.env.APP_URL}/api/auth/callback/${provider}` // Ensure callback URL is correct
      };

      // Encrypt sensitive data before saving
      const encryptedData = encryptOAuthData(currentData);

      // Save to database
      if (oauthSetting) {
        oauthSetting.value = encryptedData as unknown as Record<string, unknown>;
        await settingRepository.save(oauthSetting);
      } else {
        oauthSetting = settingRepository.create({
          key: 'oauth_settings',
          value: encryptedData as unknown as Record<string, unknown>,
          type: 'json'
        });
        await settingRepository.save(oauthSetting);
      }

      // Reload Passport strategies with new configuration
      try {
        await reloadPassportStrategies();
        logger.info('Passport strategies reloaded successfully');
      } catch (passportError) {
        logger.error('Failed to reload Passport strategies:', passportError);
        // Don't fail the request, just log the error
      }

      res.json({
        success: true,
        message: `OAuth settings for ${provider} updated successfully`,
        data: currentData[provider]
      });
    } catch (error) {
      logger.error('Error updating OAuth settings:', error);
      next(error);
    }
  }
);

// POST /api/settings/oauth/test - Test OAuth connection
router.post('/oauth/test',
  authenticate,
  adminOnly,
  oauthTestValidation,
  validateDto,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider } = req.body as OAuthTestRequest;
      const settingRepository = AppDataSource.getRepository(Setting);
      
      // Get OAuth settings
      const oauthSetting = await settingRepository.findOne({
        where: { key: 'oauth_settings' }
      });

      if (!oauthSetting || !oauthSetting.value) {
        return res.status(400).json({
          success: false,
          message: 'OAuth settings not configured'
        });
      }

      let oauthData: OAuthSettingsData;
      try {
        const parsedData = typeof oauthSetting.value === 'string'
          ? JSON.parse(oauthSetting.value)
          : oauthSetting.value as unknown as OAuthSettingsData;
        oauthData = decryptOAuthData(parsedData);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to parse OAuth settings'
        });
      }

      const config = oauthData[provider];

      if (!config.enabled) {
        return res.status(400).json({
          success: false,
          message: `${provider} OAuth is not enabled`
        });
      }

      if (!config.clientId || !config.clientSecret) {
        return res.status(400).json({
          success: false,
          message: `${provider} OAuth credentials are not configured`
        });
      }

      // Get provider configuration
      const providerConfig = getOAuthProviderConfig(provider);

      if (!providerConfig) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OAuth provider'
        });
      }

      // TODO: Implement actual OAuth flow test
      // For now, just return the URLs to verify configuration

      res.json({
        success: true,
        message: `${provider} OAuth configuration is valid`,
        details: providerConfig
      });
    } catch (error) {
      logger.error('Error testing OAuth connection:', error);
      next(error);
    }
  }
);

// GET /api/settings/oauth/providers - Get enabled OAuth providers (public)
router.get('/oauth/providers', async (req: Request, res: Response) => {
  try {
    const oauthSettings = await getOAuthSettings();
    
    // Return only enabled status for each provider (no sensitive data)
    const providers = {
      google: { enabled: oauthSettings.google.enabled },
      kakao: { enabled: oauthSettings.kakao.enabled },
      naver: { enabled: oauthSettings.naver.enabled }
    };
    
    res.json({ providers });
  } catch (error: any) {
    logger.error('Failed to get OAuth providers:', error);
    res.status(500).json({ 
      message: 'OAuth 제공자 정보를 가져오는데 실패했습니다',
      providers: {
        google: { enabled: false },
        kakao: { enabled: false },
        naver: { enabled: false }
      }
    });
  }
});

export default router;