import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../database/connection';
import { User, UserRole, UserStatus } from '../entities/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { UnauthorizedError, BadRequestError, ValidationError, ServiceUnavailableError } from '../utils/api-error';
import { env } from '../utils/env-validator';

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
      select: ['id', 'email', 'name', 'role', 'status', 'password', 'businessInfo']
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

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          businessInfo: user.businessInfo
        }
      });
  })
);

// 회원가입
router.post('/register',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  asyncHandler(async (req, res, next) => {
    // Validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { email, password, name } = req.body;
    
    // Check if database is initialized
    if (!AppDataSource.isInitialized) {
      throw new ServiceUnavailableError('Database service unavailable', 'DATABASE_UNAVAILABLE');
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
    user.name = name;
    user.role = UserRole.CUSTOMER; // 기본 역할
    user.status = UserStatus.PENDING; // 관리자 승인 필요

    await userRepository.save(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please wait for admin approval.',
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

// 토큰 검증
router.get('/verify', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  return res.json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
}));

// 로그아웃 (클라이언트 측에서 토큰 삭제)
router.post('/logout', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  // 서버 측에서는 특별히 할 일이 없음 (JWT는 stateless)
  // 향후 token blacklist 구현 시 여기서 처리
  return res.json({
    success: true,
    message: 'Logout successful'
  });
}));

// 인증 상태 확인
router.get('/status', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
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
    select: ['id', 'email', 'name', 'role', 'status', 'createdAt', 'lastLoginAt']
  });

  if (!user) {
    throw new UnauthorizedError('User not found', 'USER_NOT_FOUND');
  }

  return res.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
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