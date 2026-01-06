import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../database/connection.js';
import { User, UserRole, UserStatus } from '../modules/auth/entities/User.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error-handler.js';
// Phase 5-B: ServiceUnavailableError removed - Auth doesn't return 503
import { UnauthorizedError, BadRequestError, ValidationError } from '../utils/api-error.js';
import { env } from '../utils/env-validator.js';
import { refreshTokenService } from '../modules/auth/services/refresh-token.service.js';
import * as cookieUtils from '../utils/cookie.utils.js';

const router: Router = Router();

// 로그인
router.post('/login',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  asyncHandler(async (req, res, next) => {
    // Validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }
      const { email, password } = req.body;

    // Phase 5-B: Auth ↔ Infra Separation
    // Auth는 DB 상태를 검사하지 않음. DB 실패 시 자연스럽게 에러 반환.
    // @see docs/architecture/auth-infra-separation.md

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'name', 'role', 'status', 'password', 'businessInfo'],
      relations: ['dbRoles', 'activeRole']
    });

    // 미가입 사용자 구분을 위한 에러 코드 분리
    if (!user) {
      throw new UnauthorizedError('User not found', 'USER_NOT_FOUND');
    }

    // 비밀번호가 설정되지 않은 사용자 (소셜 로그인 전용)
    if (!user.password) {
      throw new UnauthorizedError('Please use social login', 'SOCIAL_LOGIN_REQUIRED');
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // 계정 상태 확인 (active 상태만 로그인 허용)
    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.APPROVED) {
      throw new BadRequestError(
        'Account not active',
        'ACCOUNT_NOT_ACTIVE',
        { status: user.status }
      );
    }

    // JWT 액세스 토큰 생성 (15분 만료)
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.getString('JWT_SECRET') as jwt.Secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } as jwt.SignOptions
    );

    // Refresh 토큰 생성 (30일 만료)
    const refreshToken = await refreshTokenService.generateRefreshToken(
      user,
      req.body.deviceId,
      req.headers['user-agent'],
      req.ip
    );

      // 마지막 로그인 시간 업데이트
      user.lastLoginAt = new Date();
      await userRepository.save(user);

      // Get active role information
      const activeRole = user.getActiveRole();

      // Phase 6-7: Cookie Auth Primary
      // Set httpOnly cookies as primary authentication method
      // @see docs/architecture/auth-ssot-declaration.md (Phase 6-7)
      cookieUtils.setAuthCookies(res, {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60 // 15 minutes
      });

      // Response: Cookie is primary, JSON tokens are optional for legacy support
      // includeLegacyTokens defaults to false for new clients
      const includeLegacyTokens = req.body.includeLegacyTokens === true;

      return res.json({
        success: true,
        message: 'Login successful',
        // Phase 6-7: Tokens in body are optional, Cookie is primary
        ...(includeLegacyTokens && { accessToken, refreshToken, token: accessToken }),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role, // Legacy field for backward compatibility
          activeRole: activeRole ? {
            id: activeRole.id,
            name: activeRole.name,
            displayName: activeRole.displayName
          } : null,
          roles: user.dbRoles?.map(r => ({
            id: r.id,
            name: r.name,
            displayName: r.displayName
          })) || [],
          canSwitchRoles: user.hasMultipleRoles(),
          status: user.status,
          businessInfo: user.businessInfo
        }
      });
  })
);

// 회원가입 핸들러 (공통 로직)
const signupHandler = asyncHandler(async (req, res, next) => {
  // Validation check
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { email, password, passwordConfirm, name, tos } = req.body;

  // Check if signup is allowed
  if (env.getString('AUTH_ALLOW_SIGNUP', 'true') !== 'true') {
    throw new BadRequestError('Signup is currently disabled', 'SIGNUP_DISABLED');
  }

  // Phase 5-B: Auth ↔ Infra Separation - DB 상태 검사 제거

  // 비밀번호 확인 검증
  if (password !== passwordConfirm) {
    throw new BadRequestError('Passwords do not match', 'PASSWORD_MISMATCH');
  }

  // 약관 동의 검증
  if (!tos) {
    throw new BadRequestError('Terms of service must be accepted', 'TOS_NOT_ACCEPTED');
  }

  const userRepository = AppDataSource.getRepository(User);

  // 이메일 중복 확인
  const existingUser = await userRepository.findOne({ where: { email } });
  if (existingUser) {
    throw new BadRequestError('Email already exists', 'EMAIL_EXISTS');
  }

  // 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(password, env.getNumber('BCRYPT_ROUNDS', 12));

  // 새 사용자 생성
  const user = new User();
  user.email = email;
  user.password = hashedPassword;
  user.name = name || email.split('@')[0]; // 이름이 없으면 이메일 앞부분 사용
  user.role = UserRole.USER; // 기본 역할
  user.status = UserStatus.ACTIVE; // 즉시 활성화 (승인 대기 없음)

  await userRepository.save(user);

  // JWT 액세스 토큰 생성 (15분 만료)
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.getString('JWT_SECRET') as jwt.Secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } as jwt.SignOptions
  );

  // Refresh 토큰 생성 (30일 만료)
  const refreshToken = await refreshTokenService.generateRefreshToken(
    user,
    req.body.deviceId,
    req.headers['user-agent'],
    req.ip
  );

  // Phase 6-7: Cookie Auth Primary
  // Set httpOnly cookies as primary authentication method
  cookieUtils.setAuthCookies(res, {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60 // 15 minutes
  });

  // 역할별 기본 리다이렉트 경로
  const getRedirectPath = (role: UserRole): string => {
    switch (role) {
      case UserRole.SELLER:
        return '/seller/dashboard';
      case UserRole.PARTNER:
        return '/partner/portal';
      case UserRole.SUPPLIER:
        return '/supplier/dashboard';
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return '/admin';
      default:
        return '/';
    }
  };

  // Response: Cookie is primary, JSON tokens are optional for legacy support
  const includeLegacyTokens = req.body.includeLegacyTokens === true;

  return res.status(201).json({
    success: true,
    message: 'Signup successful',
    // Phase 6-7: Tokens in body are optional, Cookie is primary
    ...(includeLegacyTokens && { accessToken, refreshToken, token: accessToken }),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status
    },
    redirectUrl: getRedirectPath(user.role)
  });
});

// 회원가입 (새 엔드포인트)
router.post('/signup',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  body('passwordConfirm').notEmpty().withMessage('Password confirmation is required'),
  body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('tos').isBoolean().equals('true').withMessage('Terms of service must be accepted'),
  signupHandler
);

// 회원가입 (레거시 엔드포인트 - 호환성 유지)
router.post('/register',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  signupHandler
);

// 토큰 검증
router.get('/verify', authenticate, asyncHandler(async (req: Request, res) => {
  return res.json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
}));

// 로그아웃
// Phase 6-7: Cookie Auth Primary - clear httpOnly cookies on logout
router.post('/logout', authenticate, asyncHandler(async (req: Request, res) => {
  // Phase 6-7: Clear httpOnly cookies
  cookieUtils.clearAuthCookies(res);

  // 향후 token blacklist 구현 시 여기서 처리
  return res.json({
    success: true,
    message: 'Logout successful'
  });
}));

// 인증 상태 확인
router.get('/status', authenticate, asyncHandler(async (req: Request, res) => {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated', 'NOT_AUTHENTICATED');
  }

  // Phase 5-B: Auth ↔ Infra Separation - DB 상태 검사 제거

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: { id: req.user.id },
    select: ['id', 'email', 'name', 'role', 'status', 'createdAt', 'lastLoginAt'],
    relations: ['dbRoles', 'activeRole']
  });

  if (!user) {
    throw new UnauthorizedError('User not found', 'USER_NOT_FOUND');
  }

  const activeRole = user.getActiveRole();

  return res.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role, // Legacy field
      activeRole: activeRole ? {
        id: activeRole.id,
        name: activeRole.name,
        displayName: activeRole.displayName
      } : null,
      roles: user.dbRoles?.map(r => ({
        id: r.id,
        name: r.name,
        displayName: r.displayName
      })) || [],
      canSwitchRoles: user.hasMultipleRoles(),
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    },
    tokenInfo: {
      issuedAt: (req.user as any).iat ? new Date((req.user as any).iat * 1000).toISOString() : null,
      expiresAt: (req.user as any).exp ? new Date((req.user as any).exp * 1000).toISOString() : null
    }
  });
}));

// 토큰 갱신 (Refresh Token)
// Phase 6-7: Cookie Auth Primary - refresh token can come from cookie or body
router.post('/refresh', asyncHandler(async (req: Request, res) => {
  // Phase 6-7: Try cookie first, then body for legacy support
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    // Clear any stale cookies
    cookieUtils.clearAuthCookies(res);
    throw new UnauthorizedError('Refresh token not provided', 'NO_REFRESH_TOKEN');
  }

  // Verify and refresh access token
  const result = await refreshTokenService.refreshAccessToken(refreshToken);

  if (result.error || !result.accessToken) {
    // Clear cookies on refresh failure
    cookieUtils.clearAuthCookies(res);
    throw new UnauthorizedError(result.error || 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  // Phase 6-7: Cookie Auth Primary
  // Set new tokens in httpOnly cookies
  cookieUtils.setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: refreshToken, // Keep same refresh token unless rotation
    expiresIn: 15 * 60 // 15 minutes
  });

  // Response: Cookie is primary, JSON tokens are optional for legacy support
  const includeLegacyTokens = req.body.includeLegacyTokens === true;

  return res.json({
    success: true,
    message: 'Token refreshed successfully',
    // Phase 6-7: Tokens in body are optional, Cookie is primary
    ...(includeLegacyTokens && {
      accessToken: result.accessToken,
      refreshToken
    }),
    expiresIn: 900 // 15 minutes
  });
}));

// 소셜 로그인 회원가입 완료 (추가 정보 입력)
router.post('/signup-complete',
  authenticate,
  body('phone').optional().matches(/^01[0-9]{8,9}$/).withMessage('Valid phone number is required'),
  body('tosAccepted').isBoolean().withMessage('Terms of service acceptance is required'),
  body('privacyAccepted').isBoolean().withMessage('Privacy policy acceptance is required'),
  body('marketingAccepted').optional().isBoolean(),
  asyncHandler(async (req: Request, res) => {
    // Validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { phone, tosAccepted, privacyAccepted, marketingAccepted, shippingAddress } = req.body;

    // Check if TOS and Privacy are accepted
    if (!tosAccepted || !privacyAccepted) {
      throw new BadRequestError('Terms of service and privacy policy must be accepted', 'TOS_NOT_ACCEPTED');
    }

    // Phase 5-B: Auth ↔ Infra Separation - DB 상태 검사 제거

    const userRepository = AppDataSource.getRepository(User);

    // Get authenticated user
    const userId = (req.user as any).id || (req.user as any).userId;
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedError('User not found', 'USER_NOT_FOUND');
    }

    // Update user with additional information
    if (phone) {
      // Store phone in appropriate field (adjust based on your User entity structure)
      // user.phone = phone; // Add this field to your User entity if needed
    }

    // Store consent flags (you may want to add these fields to User entity or create a separate consent table)
    // user.tosAccepted = tosAccepted;
    // user.privacyAccepted = privacyAccepted;
    // user.marketingAccepted = marketingAccepted || false;

    // Store shipping address if provided (adjust based on your data model)
    // This might go into a separate address table or user.defaultAddress field

    await userRepository.save(user);

    return res.json({
      success: true,
      message: 'Signup completed successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });
  })
);

export default router;