import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticationService } from '../services/authentication.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { AuthProvider, OAuthProfile } from '../types/account-linking.js';
import logger from '../utils/logger.js';

const router: ExpressRouter = Router();

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

      result = await authenticationService.login({
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

      result = await authenticationService.login({
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

    // Set authentication cookies (handled by service)
    authenticationService.setAuthCookies(res, result.tokens, result.sessionId);

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

    const result = await authenticationService.login({
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

    const result = await authenticationService.login({
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

    const providers = await authenticationService.getAvailableProviders(email);

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

    const canLogin = await authenticationService.canLogin(email, provider as AuthProvider);

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
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const sessionId = req.cookies?.sessionId;

    if (userId) {
      // Logout user (revokes tokens and removes session)
      await authenticationService.logout(userId, sessionId);
    }

    // Clear cookies
    authenticationService.clearAuthCookies(res);

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

/**
 * @route GET /api/auth/unified/test-accounts
 * @desc Get test accounts for testing
 * @access Public
 */
router.get('/test-accounts', async (req, res) => {
  try {
    // Return sample test accounts from actual DB users with test role
    const testAccounts = await authenticationService.getTestAccounts();

    res.json({
      success: true,
      data: testAccounts
    });
  } catch (error: any) {
    logger.error('Get test accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test accounts'
    });
  }
});

/**
 * @route POST /api/auth/unified/find-id
 * @desc Find user ID by email
 * @access Public
 */
router.post('/find-id', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    await authenticationService.sendFindIdEmail(email);

    res.json({
      success: true,
      message: '입력하신 이메일로 아이디 정보를 발송했습니다.'
    });
  } catch (error: any) {
    logger.error('Find ID error:', error);

    // Don't reveal if email exists
    res.json({
      success: true,
      message: '입력하신 이메일로 아이디 정보를 발송했습니다.'
    });
  }
});

/**
 * @route POST /api/auth/unified/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    await authenticationService.requestPasswordReset(email);

    res.json({
      success: true,
      message: '비밀번호 재설정 링크를 이메일로 발송했습니다.'
    });
  } catch (error: any) {
    logger.error('Forgot password error:', error);

    // Don't reveal if email exists
    res.json({
      success: true,
      message: '비밀번호 재설정 링크를 이메일로 발송했습니다.'
    });
  }
});

/**
 * @route POST /api/auth/unified/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    await authenticationService.resetPassword(token, newPassword);

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });
  } catch (error: any) {
    logger.error('Reset password error:', error);

    if (error.code === 'INVALID_PASSWORD_RESET_TOKEN' || error.message === 'Invalid or expired token') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않거나 만료된 토큰입니다.'
      });
    }

    res.status(500).json({
      success: false,
      message: '비밀번호 재설정에 실패했습니다.'
    });
  }
});

export default router;