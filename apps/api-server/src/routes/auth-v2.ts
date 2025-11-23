import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../database/connection.js';
import { User, UserRole, UserStatus } from '../entities/User.js';
import { RoleAssignment } from '../entities/RoleAssignment.js';
import { authenticationService } from '../services/authentication.service.js';
import { UserService } from '../services/UserService.js';
import { SessionSyncService } from '../services/sessionSyncService.js';
import { PasswordResetService } from '../services/passwordResetService.js';
import { authenticateCookie, AuthRequest } from '../middleware/auth.middleware.js';
import { mapUserToMeResponse } from '../dto/auth/me-response.dto.js';

const router: Router = Router();

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
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

      const result = await authenticationService.login({
        provider: 'email',
        credentials: { email, password },
        ipAddress,
        userAgent
      });

      // Set httpOnly cookies (including sessionId)
      authenticationService.setAuthCookies(res, result.tokens, result.sessionId);

      // Return user data (no tokens in response body)
      res.json({
        success: true,
        message: 'Login successful',
        user: result.user
      });
    } catch (error: any) {
      console.error('[AUTH-V2 LOGIN ERROR]', error);

      // Handle authentication errors
      if (error.code === 'INVALID_CREDENTIALS') {
        return res.status(401).json({
          error: error.message,
          code: error.code
        });
      }

      if (error.code === 'ACCOUNT_NOT_ACTIVE' || error.code === 'ACCOUNT_LOCKED') {
        return res.status(403).json({
          error: error.message,
          code: error.code,
          details: error.details
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
      user.role = role as UserRole; // Keep for backward compatibility
      user.status = UserStatus.PENDING; // Requires admin approval

      await userRepository.save(user);

      // P1: Create RoleAssignment for the new user
      const assignmentRepository = AppDataSource.getRepository(RoleAssignment);
      const assignment = new RoleAssignment();
      assignment.userId = user.id;
      assignment.role = role || 'customer';
      assignment.isActive = true;
      assignment.validFrom = new Date();
      assignment.assignedAt = new Date();
      // assignedBy is null for self-registration

      await assignmentRepository.save(assignment);

      // Send email verification
      try {
        await PasswordResetService.requestEmailVerification(user.id);
      } catch (error) {
        // Error log removed
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
      // Error log removed
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

    const tokens = await authenticationService.refreshTokens(refreshToken);

    if (!tokens) {
      authenticationService.clearAuthCookies(res);
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Set new cookies
    authenticationService.setAuthCookies(res, tokens);

    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    // Error log removed
    authenticationService.clearAuthCookies(res);
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
      const payload = authenticationService.verifyAccessToken(accessToken);
      if (payload) {
        // Logout user (revokes tokens and removes session)
        await authenticationService.logout(payload.userId || payload.id || '', sessionId);
      }
    }

    // Clear cookies
    authenticationService.clearAuthCookies(res);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    // Error log removed
    // Still clear cookies even if error occurs
    authenticationService.clearAuthCookies(res);
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
});

/**
 * R-4-1: /me endpoint - Standardized response structure
 *
 * Returns user identity with role assignments.
 * Legacy fields (businessInfo, permissions, isActive, isEmailVerified) removed.
 */
router.get('/me', authenticateCookie, async (req: AuthRequest, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: (req.user as any)?.userId || (req.user as any)?.id },
      select: ['id', 'email', 'name', 'status', 'avatar', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Fetch role assignments
    const assignmentRepository = AppDataSource.getRepository(RoleAssignment);
    const assignments = await assignmentRepository.find({
      where: { userId: user.id },
      order: { assignedAt: 'DESC' }
    });

    // R-4-1: Use standard DTO mapper
    const response = mapUserToMeResponse(user, assignments);

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Logout from all devices
router.post('/logout-all', authenticateCookie, async (req: AuthRequest, res) => {
  try {
    if (!(req.user as any)?.userId && !(req.user as any)?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
    }

    const userId = (req.user as any).userId || (req.user as any)!.id;

    // Logout from all devices (revokes all tokens and removes all sessions)
    await authenticationService.logoutAll(userId);

    // Clear current session cookies
    authenticationService.clearAuthCookies(res);

    res.json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    // Error log removed
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
      // Error log removed
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
    } catch (error) {
      // Error log removed
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to reset password',
        code: 'RESET_FAILED'
      });
    }
  }
);

// Request email verification (for authenticated users)
router.post('/resend-verification-auth', authenticateCookie, async (req: AuthRequest, res) => {
  try {
    if (!(req.user as any)?.userId && !(req.user as any)?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
    }

    await PasswordResetService.requestEmailVerification((req.user as any).userId || (req.user as any)!.id);

    res.json({
      success: true,
      message: 'Verification email has been sent'
    });
  } catch (error) {
    // Error log removed
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to send verification email',
      code: 'VERIFICATION_REQUEST_FAILED'
    });
  }
});

// Request email verification (for unauthenticated users)
router.post('/resend-verification',
  body('email').isEmail().withMessage('Valid email is required'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      const userRepository = AppDataSource.getRepository(User);
      
      // Find user by email
      const user = await userRepository.findOne({ where: { email } });
      
      if (!user) {
        // Don't reveal if email exists
        return res.json({
          success: true,
          message: 'If an account exists with this email, a verification email has been sent.'
        });
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return res.status(400).json({
          error: 'Email is already verified',
          code: 'ALREADY_VERIFIED'
        });
      }

      // Send verification email
      try {
        await PasswordResetService.requestEmailVerification(user.id);
      } catch (error) {
        // Error log removed
        return res.status(500).json({
          error: 'Failed to send verification email',
          code: 'EMAIL_SEND_FAILED'
        });
      }

      res.json({
        success: true,
        message: 'Verification email has been sent'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

// Verify email with token (POST)
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
    } catch (error) {
      // Error log removed
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to verify email',
        code: 'VERIFICATION_FAILED'
      });
    }
  }
);

// Verify email with token (GET) - for email links
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        error: 'Verification token is required',
        code: 'MISSING_TOKEN'
      });
    }
    
    await PasswordResetService.verifyEmail(token);

    res.json({
      success: true,
      message: 'Email has been verified successfully'
    });
  } catch (error) {
    // Error log removed
    
    // Provide specific error codes based on error message
    const errorMessage = error instanceof Error ? error.message : '';
    let errorCode = 'VERIFICATION_FAILED';
    if (errorMessage.includes('expired')) {
      errorCode = 'TOKEN_EXPIRED';
    } else if (errorMessage.includes('invalid')) {
      errorCode = 'INVALID_TOKEN';
    } else if (errorMessage.includes('already verified')) {
      errorCode = 'ALREADY_VERIFIED';
    }
    
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to verify email',
      code: errorCode
    });
  }
});

export default router;