import { Router, Request } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../database/connection.js';
import { User, UserRole, UserStatus } from '../entities/User.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { UnauthorizedError, BadRequestError, ValidationError, ServiceUnavailableError } from '../utils/api-error.js';
import { env } from '../utils/env-validator.js';

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

    // Check if database is initialized
    if (!AppDataSource.isInitialized) {
      throw new ServiceUnavailableError('Database service unavailable', 'DATABASE_UNAVAILABLE');
    }
      
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'name', 'role', 'status', 'password', 'businessInfo'],
      relations: ['dbRoles', 'activeRole']
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
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

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.getString('JWT_SECRET'),
      { expiresIn: '7d' }
    );

      // 마지막 로그인 시간 업데이트
      user.lastLoginAt = new Date();
      await userRepository.save(user);

      // Get active role information
      const activeRole = user.getActiveRole();

      return res.json({
        success: true,
        message: 'Login successful',
        token,
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

  // Check if database is initialized
  if (!AppDataSource.isInitialized) {
    throw new ServiceUnavailableError('Database service unavailable', 'DATABASE_UNAVAILABLE');
  }

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
  user.role = UserRole.CUSTOMER; // 기본 역할
  user.status = UserStatus.ACTIVE; // 즉시 활성화 (승인 대기 없음)

  await userRepository.save(user);

  // JWT 토큰 생성 (즉시 로그인)
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.getString('JWT_SECRET'),
    { expiresIn: '7d' }
  );

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
      case UserRole.MODERATOR:
        return '/admin';
      default:
        return '/';
    }
  };

  return res.status(201).json({
    success: true,
    message: 'Signup successful',
    token,
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

// 로그아웃 (클라이언트 측에서 토큰 삭제)
router.post('/logout', authenticate, asyncHandler(async (req: Request, res) => {
  // 서버 측에서는 특별히 할 일이 없음 (JWT는 stateless)
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

  // Check if database is initialized
  if (!AppDataSource.isInitialized) {
    throw new ServiceUnavailableError('Database service unavailable', 'DATABASE_UNAVAILABLE');
  }

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

export default router;