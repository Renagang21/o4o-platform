import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { UnifiedAuthService } from '../services/unified-auth.service';
import { authenticate } from '../middleware/auth.middleware';
import { AuthProvider, OAuthProfile } from '../types/account-linking';
import logger from '../utils/logger';

const router: Router = Router();
const unifiedAuthService = new UnifiedAuthService();

// Validation middleware
const validateDto = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Email login validation
const emailLoginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

// OAuth login validation
const oauthLoginValidation = [
  body('provider').isIn(['google', 'kakao', 'naver']).withMessage('Invalid provider'),
  body('profile.id').notEmpty().withMessage('Provider ID is required'),
  body('profile.email').isEmail().withMessage('Valid email is required'),
  body('profile.displayName').optional().isString(),
  body('profile.firstName').optional().isString(),
  body('profile.lastName').optional().isString(),
  body('profile.avatar').optional().isURL(),
  body('profile.emailVerified').optional().isBoolean()
];

/**
 * @route POST /api/auth/unified/login
 * @desc Unified login endpoint for email and OAuth
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { provider, email, password, oauthProfile } = req.body;
    
    // Get IP address
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    let result;

    if (provider === 'email') {
      // Validate email login
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      result = await unifiedAuthService.login({
        provider: 'email',
        credentials: { email, password },
        ipAddress,
        userAgent
      });
    } else if (['google', 'kakao', 'naver'].includes(provider)) {
      // Validate OAuth login
      if (!oauthProfile || !oauthProfile.id || !oauthProfile.email) {
        return res.status(400).json({
          success: false,
          message: 'OAuth profile is required'
        });
      }

      result = await unifiedAuthService.login({
        provider: provider as AuthProvider,
        oauthProfile: oauthProfile as OAuthProfile,
        ipAddress,
        userAgent
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider'
      });
    }

    // Set cookies if in production
    if (process.env.NODE_ENV === 'production') {
      res.cookie('accessToken', result.tokens.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        domain: '.neture.co.kr',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        domain: '.neture.co.kr',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }

    res.json(result);
  } catch (error: any) {
    logger.error('Unified login error:', error);
    
    if (error.message === 'Invalid credentials' || 
        error.message === 'Account is not active') {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

/**
 * @route POST /api/auth/unified/email
 * @desc Email/password login
 * @access Public
 */
router.post('/email', emailLoginValidation, validateDto, async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await unifiedAuthService.login({
      provider: 'email',
      credentials: { email, password },
      ipAddress,
      userAgent
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Email login error:', error);
    
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

/**
 * @route POST /api/auth/unified/oauth
 * @desc OAuth login
 * @access Public
 */
router.post('/oauth', oauthLoginValidation, validateDto, async (req, res) => {
  try {
    const { provider, profile } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await unifiedAuthService.login({
      provider: provider as AuthProvider,
      oauthProfile: profile as OAuthProfile,
      ipAddress,
      userAgent
    });

    res.json(result);
  } catch (error: any) {
    logger.error('OAuth login error:', error);
    res.status(500).json({
      success: false,
      message: 'OAuth login failed'
    });
  }
});

/**
 * @route GET /api/auth/unified/check-email
 * @desc Check available login methods for email
 * @access Public
 */
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const providers = await unifiedAuthService.getAvailableProviders(email);

    res.json({
      success: true,
      email,
      providers,
      hasAccount: providers.length > 0
    });
  } catch (error: any) {
    logger.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check email'
    });
  }
});

/**
 * @route GET /api/auth/unified/can-login
 * @desc Check if user can login with specific provider
 * @access Public
 */
router.get('/can-login', async (req, res) => {
  try {
    const { email, provider } = req.query;

    if (!email || typeof email !== 'string' || !provider || typeof provider !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email and provider are required'
      });
    }

    const canLogin = await unifiedAuthService.canLogin(email, provider as AuthProvider);

    res.json({
      success: true,
      canLogin
    });
  } catch (error: any) {
    logger.error('Can login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check login availability'
    });
  }
});

/**
 * @route POST /api/auth/unified/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Clear cookies
    if (process.env.NODE_ENV === 'production') {
      res.clearCookie('accessToken', {
        domain: '.neture.co.kr'
      });
      res.clearCookie('refreshToken', {
        domain: '.neture.co.kr'
      });
    }

    // TODO: Invalidate refresh token in database

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

export default router;