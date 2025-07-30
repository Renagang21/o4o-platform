import { Router } from 'express';
import { body } from 'express-validator';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../database/connection';
import { User, UserRole, UserStatus } from '../entities/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler, UnauthorizedError, BadRequestError } from '../middleware/errorHandler';
import { ok, created, unauthorized } from '../utils/apiResponse';

const router: Router = Router();

// 로그인
router.post('/login',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ 
        where: { email },
        select: ['id', 'email', 'name', 'role', 'status', 'password', 'businessInfo']
      });

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // 비밀번호가 설정되지 않은 사용자 (소셜 로그인 전용)
      if (!user.password) {
        return res.status(401).json({
          error: 'Please use social login',
          code: 'SOCIAL_LOGIN_REQUIRED'
        });
      }

      // 비밀번호 확인
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // 계정 상태 확인 (active 상태만 로그인 허용)
      if (user.status !== 'active') {
        return res.status(403).json({
          error: 'Account not active',
          code: 'ACCOUNT_NOT_ACTIVE',
          status: user.status
        });
      }

      // JWT 토큰 생성
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      // 마지막 로그인 시간 업데이트
      user.lastLoginAt = new Date();
      await userRepository.save(user);

      res.json({
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
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

// 회원가입
router.post('/register',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      const userRepository = AppDataSource.getRepository(User);
      
      // 이메일 중복 확인
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          error: 'Email already exists',
          code: 'EMAIL_EXISTS'
        });
      }

      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

      // 새 사용자 생성
      const user = new User();
      user.email = email;
      user.password = hashedPassword;
      user.name = name;
      user.role = UserRole.CUSTOMER; // 기본 역할
      user.status = UserStatus.PENDING; // 관리자 승인 필요

      await userRepository.save(user);

      res.status(201).json({
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
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

// 토큰 검증
router.get('/verify', authenticateToken, (req: AuthRequest, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
});

// 로그아웃 (클라이언트 측에서 토큰 삭제)
router.post('/logout', authenticateToken, (req: AuthRequest, res) => {
  // 서버 측에서는 특별히 할 일이 없음 (JWT는 stateless)
  // 향후 token blacklist 구현 시 여기서 처리
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

export default router;