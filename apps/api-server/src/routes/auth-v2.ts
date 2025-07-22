import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../database/connection';
import { User, UserRole, UserStatus } from '../entities/User';
import { authService } from '../services/AuthService';
import { SessionSyncService } from '../services/sessionSyncService';
import { PasswordResetService } from '../services/passwordResetService';
import { authenticateCookie, AuthRequest } from '../middleware/auth-v2';

const router = Router();

// Login with httpOnly cookies
router.post('/login',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const { userAgent, ipAddress } = authService.getRequestMetadata(req);

      const result = await authService.login(email, password, userAgent, ipAddress);
      
      if (!result) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Set httpOnly cookies
      authService.setAuthCookies(res, result.tokens);
      
      // Set session ID cookie for SSO
      res.cookie('sessionId', result.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: process.env.COOKIE_DOMAIN || undefined // For cross-subdomain SSO
      });

      // Return user data (no tokens in response body)
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          status: result.user.status,
          businessInfo: result.user.businessInfo
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message.includes('Account is')) {
        return res.status(403).json({
          error: error.message,
          code: 'ACCOUNT_NOT_ACTIVE'
        });
      }
      
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

// Register
router.post('/register',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('role').optional().isIn(['customer', 'seller', 'supplier']).withMessage('Invalid role'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role = 'customer' } = req.body;
      
      const userRepository = AppDataSource.getRepository(User);
      
      // Check if email exists
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          error: 'Email already exists',
          code: 'EMAIL_EXISTS'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

      // Create new user
      const user = new User();
      user.email = email;
      user.password = hashedPassword;
      user.name = name;
      user.role = role as UserRole;
      user.status = UserStatus.PENDING; // Requires admin approval

      await userRepository.save(user);

      // Send email verification
      try {
        await PasswordResetService.requestEmailVerification(user.id);
      } catch (error) {
        console.error('Failed to send verification email:', error);
        // Don't fail registration if email fails
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token not provided',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    const { userAgent, ipAddress } = authService.getRequestMetadata(req);
    const tokens = await authService.rotateRefreshToken(refreshToken, userAgent, ipAddress);
    
    if (!tokens) {
      authService.clearAuthCookies(res);
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Set new cookies
    authService.setAuthCookies(res, tokens);

    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    authService.clearAuthCookies(res);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;
    const sessionId = req.cookies.sessionId;
    
    if (accessToken) {
      const payload = authService.verifyAccessToken(accessToken);
      if (payload) {
        // Revoke all refresh tokens for this user
        await authService.revokeAllUserTokens(payload.userId || payload.sub || '');
        
        // Remove SSO session
        if (sessionId) {
          await SessionSyncService.removeSession(sessionId, payload.userId || payload.sub || '');
        }
      }
    }

    // Clear cookies
    authService.clearAuthCookies(res);
    res.clearCookie('sessionId', {
      domain: process.env.COOKIE_DOMAIN || undefined
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookies even if error occurs
    authService.clearAuthCookies(res);
    res.clearCookie('sessionId', {
      domain: process.env.COOKIE_DOMAIN || undefined
    });
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
});

// Verify current session
router.get('/me', authenticateCookie, async (req: AuthRequest, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.user?.userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'permissions']
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Logout from all devices
router.post('/logout-all', authenticateCookie, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
    }

    // Revoke all refresh tokens
    await authService.revokeAllUserTokens(req.user.userId);
    
    // Remove all SSO sessions
    await SessionSyncService.removeAllUserSessions(req.user.userId);
    
    // Clear current session cookies
    authService.clearAuthCookies(res);
    res.clearCookie('sessionId', {
      domain: process.env.COOKIE_DOMAIN || undefined
    });

    res.json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Request password reset
router.post('/forgot-password',
  body('email').isEmail().withMessage('Valid email is required'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      
      await PasswordResetService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        error: 'Failed to process password reset request',
        code: 'RESET_REQUEST_FAILED'
      });
    }
  }
);

// Reset password with token
router.post('/reset-password',
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, password } = req.body;
      
      await PasswordResetService.resetPassword(token, password);

      res.json({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      res.status(400).json({
        error: error.message || 'Failed to reset password',
        code: 'RESET_FAILED'
      });
    }
  }
);

// Request email verification
router.post('/resend-verification', authenticateCookie, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
    }

    await PasswordResetService.requestEmailVerification(req.user.userId);

    res.json({
      success: true,
      message: 'Verification email has been sent'
    });
  } catch (error: any) {
    console.error('Email verification request error:', error);
    res.status(400).json({
      error: error.message || 'Failed to send verification email',
      code: 'VERIFICATION_REQUEST_FAILED'
    });
  }
});

// Verify email with token
router.post('/verify-email',
  body('token').notEmpty().withMessage('Verification token is required'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token } = req.body;
      
      await PasswordResetService.verifyEmail(token);

      res.json({
        success: true,
        message: 'Email has been verified successfully'
      });
    } catch (error: any) {
      console.error('Email verification error:', error);
      res.status(400).json({
        error: error.message || 'Failed to verify email',
        code: 'VERIFICATION_FAILED'
      });
    }
  }
);

export default router;