import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { 
  RegisterUserDto, 
  LoginUserDto, 
  ResetPasswordRequestDto, 
  ResetPasswordDto,
  VerifyEmailDto,
  AuthResponse,
  AuthErrorCode,
  JwtPayload
} from '../types/email-auth';
import { validateDto } from '../middleware/validateDto';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../database/connection';
import { User } from '../entities/User';
import { EmailVerificationToken } from '../entities/EmailVerificationToken';
import { PasswordResetToken } from '../entities/PasswordResetToken';
import { emailService } from '../services/email.service';
import { refreshTokenService } from '../services/refreshToken.service';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  generateRandomToken,
  validatePasswordStrength,
  validateEmail,
  getTokenExpiryDate
} from '../utils/auth.utils';
import logger from '../utils/logger';
import { UserRole, UserStatus } from '../types/auth';

const router: Router = Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('유효한 이메일 주소를 입력하세요'),
  body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다'),
  body('name').trim().notEmpty().withMessage('이름을 입력하세요'),
  body('termsAccepted').isBoolean().equals('true').withMessage('이용약관에 동의해야 합니다'),
  body('privacyAccepted').isBoolean().equals('true').withMessage('개인정보처리방침에 동의해야 합니다')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('유효한 이메일 주소를 입력하세요'),
  body('password').notEmpty().withMessage('비밀번호를 입력하세요')
];

const resetPasswordRequestValidation = [
  body('email').isEmail().normalizeEmail().withMessage('유효한 이메일 주소를 입력하세요')
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('토큰이 필요합니다'),
  body('newPassword').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다'),
  body('confirmPassword').custom((value, { req }) => value === req.body.newPassword)
    .withMessage('비밀번호가 일치하지 않습니다')
];

// POST /api/auth/register - User registration
router.post('/register', 
  registerValidation,
  validateDto,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, marketingAccepted } = req.body as RegisterUserDto;
      
      const userRepository = AppDataSource.getRepository(User);
      const tokenRepository = AppDataSource.getRepository(EmailVerificationToken);
      
      // Check if user already exists
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '이미 등록된 이메일입니다',
          error: {
            code: AuthErrorCode.EMAIL_ALREADY_EXISTS,
            field: 'email'
          }
        });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          message: '비밀번호가 보안 요구사항을 충족하지 않습니다',
          errors: passwordValidation.errors,
          error: {
            code: AuthErrorCode.WEAK_PASSWORD,
            field: 'password'
          }
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = userRepository.create({
        email,
        password: hashedPassword,
        name,
        status: UserStatus.PENDING,
        businessInfo: null
      });

      await userRepository.save(user);

      // Generate verification token
      const verificationToken = generateRandomToken();
      const tokenEntity = tokenRepository.create({
        token: verificationToken,
        userId: user.id,
        email: user.email,
        expiresAt: getTokenExpiryDate('24h'),
        usedAt: null
      });

      await tokenRepository.save(tokenEntity);

      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
      await emailService.sendEmail({
        to: email,
        subject: '이메일 인증을 완료해주세요',
        template: 'verification',
        data: {
          name,
          actionUrl: verificationUrl,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@o4o.com',
          companyName: process.env.COMPANY_NAME || 'O4O Platform',
          year: new Date().getFullYear()
        }
      });

      res.status(201).json({
        success: true,
        message: '회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.'
      });
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }
);

// POST /api/auth/login - User login
router.post('/login',
  loginValidation,
  validateDto,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, rememberMe } = req.body as LoginUserDto;
      
      const userRepository = AppDataSource.getRepository(User);
      
      // Find user
      const user = await userRepository.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '이메일 또는 비밀번호가 올바르지 않습니다',
          error: {
            code: AuthErrorCode.INVALID_CREDENTIALS
          }
        });
      }

      // Get client info
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';
      const deviceId = req.body.deviceId || req.headers['x-device-id'] as string;

      // Check account lock status
      const lockStatus = await refreshTokenService.checkAccountLock(email);
      if (lockStatus.locked) {
        await refreshTokenService.trackLoginAttempt(
          email,
          false,
          ipAddress,
          userAgent,
          deviceId,
          'Account locked'
        );
        return res.status(429).json({
          success: false,
          message: `계정이 잠겼습니다. ${Math.ceil((lockStatus.lockDuration || 0) / 60000)}분 후에 다시 시도해주세요.`,
          error: {
            code: AuthErrorCode.ACCOUNT_LOCKED,
            lockDuration: lockStatus.lockDuration,
            attempts: lockStatus.attempts
          }
        });
      }

      // Check password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        // Track failed login attempt
        await refreshTokenService.trackLoginAttempt(
          email,
          false,
          ipAddress,
          userAgent,
          deviceId,
          'Invalid password'
        );
        return res.status(401).json({
          success: false,
          message: '이메일 또는 비밀번호가 올바르지 않습니다',
          error: {
            code: AuthErrorCode.INVALID_CREDENTIALS
          }
        });
      }

      // Check if email is verified
      if (user.status === UserStatus.PENDING) {
        return res.status(403).json({
          success: false,
          message: '이메일 인증이 필요합니다',
          error: {
            code: AuthErrorCode.EMAIL_NOT_VERIFIED
          }
        });
      }

      // Check if account is locked
      if (user.status === UserStatus.REJECTED || user.status === UserStatus.INACTIVE) {
        return res.status(403).json({
          success: false,
          message: '계정이 비활성화되었습니다. 고객 지원팀에 문의하세요.',
          error: {
            code: AuthErrorCode.ACCOUNT_LOCKED
          }
        });
      }

      // Track successful login
      await refreshTokenService.trackLoginAttempt(
        email,
        true,
        ipAddress,
        userAgent,
        deviceId
      );

      // Generate tokens
      const jwtPayload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role || UserRole.CUSTOMER,
        emailVerified: true
      };

      const accessToken = generateAccessToken(jwtPayload);
      const refreshToken = rememberMe ? 
        await refreshTokenService.generateRefreshToken(user, deviceId, userAgent, ipAddress) : 
        undefined;

      // Update last login
      user.lastLoginAt = new Date();
      await userRepository.save(user);

      const response: AuthResponse = {
        success: true,
        message: '로그인 성공',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || UserRole.CUSTOMER,
            emailVerified: true,
            createdAt: user.createdAt
          },
          accessToken,
          refreshToken
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }
);

// POST /api/auth/verify-email - Verify email address
router.post('/verify-email',
  body('token').notEmpty().withMessage('토큰이 필요합니다'),
  validateDto,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body as VerifyEmailDto;
      
      const tokenRepository = AppDataSource.getRepository(EmailVerificationToken);
      const userRepository = AppDataSource.getRepository(User);
      
      // Find token
      const tokenEntity = await tokenRepository.findOne({ 
        where: { token },
        relations: ['user']
      });

      if (!tokenEntity) {
        return res.status(400).json({
          success: false,
          message: '유효하지 않은 토큰입니다',
          error: {
            code: AuthErrorCode.INVALID_TOKEN
          }
        });
      }

      // Check if token is expired
      if (new Date() > tokenEntity.expiresAt) {
        return res.status(400).json({
          success: false,
          message: '만료된 토큰입니다',
          error: {
            code: AuthErrorCode.TOKEN_EXPIRED
          }
        });
      }

      // Check if token is already used
      if (tokenEntity.usedAt) {
        return res.status(400).json({
          success: false,
          message: '이미 사용된 토큰입니다',
          error: {
            code: AuthErrorCode.INVALID_TOKEN
          }
        });
      }

      // Update user status
      const user = await userRepository.findOne({ where: { id: tokenEntity.userId } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '사용자를 찾을 수 없습니다',
          error: {
            code: AuthErrorCode.USER_NOT_FOUND
          }
        });
      }

      user.status = UserStatus.APPROVED;
      await userRepository.save(user);

      // Mark token as used
      tokenEntity.usedAt = new Date();
      await tokenRepository.save(tokenEntity);

      // Send welcome email
      await emailService.sendEmail({
        to: user.email,
        subject: `${user.name}님, 환영합니다!`,
        template: 'welcome',
        data: {
          name: user.name,
          actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@o4o.com',
          companyName: process.env.COMPANY_NAME || 'O4O Platform',
          year: new Date().getFullYear()
        }
      });

      res.json({
        success: true,
        message: '이메일 인증이 완료되었습니다'
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      next(error);
    }
  }
);

// POST /api/auth/password/reset-request - Request password reset
router.post('/password/reset-request',
  resetPasswordRequestValidation,
  validateDto,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as ResetPasswordRequestDto;
      
      const userRepository = AppDataSource.getRepository(User);
      const tokenRepository = AppDataSource.getRepository(PasswordResetToken);
      
      // Find user
      const user = await userRepository.findOne({ where: { email } });
      
      // Always return success to prevent email enumeration
      if (!user) {
        logger.info(`Password reset requested for non-existent email: ${email}`);
        return res.json({
          success: true,
          message: '비밀번호 재설정 링크가 이메일로 발송되었습니다'
        });
      }

      // Check for existing valid token
      const existingToken = await tokenRepository.findOne({
        where: {
          userId: user.id
        }
      });
      
      // Check if token is unused
      if (existingToken && !existingToken.usedAt && new Date() < existingToken.expiresAt) {

        // Token still valid, don't create new one
        return res.json({
          success: true,
          message: '비밀번호 재설정 링크가 이메일로 발송되었습니다'
        });
      }

      // Generate new token
      const resetToken = generateRandomToken();
      const tokenEntity = tokenRepository.create({
        token: resetToken,
        userId: user.id,
        email: user.email,
        expiresAt: getTokenExpiryDate('1h'),
        usedAt: null
      });

      await tokenRepository.save(tokenEntity);

      // Send password reset email
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
      await emailService.sendEmail({
        to: email,
        subject: '비밀번호 재설정 요청',
        template: 'passwordReset',
        data: {
          name: user.name,
          actionUrl: resetUrl,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@o4o.com',
          companyName: process.env.COMPANY_NAME || 'O4O Platform',
          year: new Date().getFullYear()
        }
      });

      res.json({
        success: true,
        message: '비밀번호 재설정 링크가 이메일로 발송되었습니다'
      });
    } catch (error) {
      logger.error('Password reset request error:', error);
      next(error);
    }
  }
);

// POST /api/auth/password/reset - Reset password
router.post('/password/reset',
  resetPasswordValidation,
  validateDto,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = req.body as ResetPasswordDto;
      
      const tokenRepository = AppDataSource.getRepository(PasswordResetToken);
      const userRepository = AppDataSource.getRepository(User);
      
      // Find token
      const tokenEntity = await tokenRepository.findOne({ where: { token } });

      if (!tokenEntity) {
        return res.status(400).json({
          success: false,
          message: '유효하지 않은 토큰입니다',
          error: {
            code: AuthErrorCode.INVALID_TOKEN
          }
        });
      }

      // Check if token is expired
      if (new Date() > tokenEntity.expiresAt) {
        return res.status(400).json({
          success: false,
          message: '만료된 토큰입니다',
          error: {
            code: AuthErrorCode.TOKEN_EXPIRED
          }
        });
      }

      // Check if token is already used
      if (tokenEntity.usedAt) {
        return res.status(400).json({
          success: false,
          message: '이미 사용된 토큰입니다',
          error: {
            code: AuthErrorCode.INVALID_TOKEN
          }
        });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          message: '비밀번호가 보안 요구사항을 충족하지 않습니다',
          errors: passwordValidation.errors,
          error: {
            code: AuthErrorCode.WEAK_PASSWORD,
            field: 'newPassword'
          }
        });
      }

      // Update user password
      const user = await userRepository.findOne({ where: { id: tokenEntity.userId } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '사용자를 찾을 수 없습니다',
          error: {
            code: AuthErrorCode.USER_NOT_FOUND
          }
        });
      }

      user.password = await hashPassword(newPassword);
      await userRepository.save(user);

      // Mark token as used
      tokenEntity.usedAt = new Date();
      await tokenRepository.save(tokenEntity);

      res.json({
        success: true,
        message: '비밀번호가 성공적으로 변경되었습니다'
      });
    } catch (error) {
      logger.error('Password reset error:', error);
      next(error);
    }
  }
);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh',
  body('refreshToken').notEmpty().withMessage('리프레시 토큰이 필요합니다'),
  validateDto,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      
      // Refresh the access token
      const result = await refreshTokenService.refreshAccessToken(refreshToken);
      
      if (result.error) {
        return res.status(401).json({
          success: false,
          message: result.error,
          error: {
            code: AuthErrorCode.INVALID_TOKEN
          }
        });
      }

      res.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          tokenType: 'Bearer'
        }
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      next(error);
    }
  }
);

// POST /api/auth/logout - Logout (authenticated)
router.post('/logout',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
      
      if (refreshToken) {
        // Revoke specific refresh token
        await refreshTokenService.revokeToken(refreshToken, 'User logout');
      } else if (userId) {
        // Revoke all user tokens if no specific token provided
        await refreshTokenService.revokeAllUserTokens(userId, 'User logout');
      }
      
      res.json({
        success: true,
        message: '로그아웃되었습니다'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }
);

export default router;