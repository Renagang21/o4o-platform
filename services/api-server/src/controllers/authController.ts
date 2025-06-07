import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { getUserRepository, User, UserStatus } from '../models/User';
import { AuthRequest } from '../middleware/auth';

const generateToken = (userId: string) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      email,
      password,
      name,
      businessInfo
    } = req.body;

    const userRepository = getUserRepository();

    // 이메일 중복 확인
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    // 사용자 생성
    const user = userRepository.create({
      email,
      password,
      name,
      businessInfo,
      status: UserStatus.PENDING
    });

    await userRepository.save(user);

    // 비밀번호 제거 후 응답
    const userResponse = { ...user };
    delete userResponse.password;

    res.status(201).json({
      message: 'Registration successful. Please wait for admin approval.',
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'REGISTRATION_FAILED'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;
    const userRepository = getUserRepository();

    // 사용자 찾기
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 비밀번호 확인
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 계정 상태 확인
    if (user.status === UserStatus.PENDING) {
      return res.status(403).json({
        error: 'Account pending approval',
        code: 'ACCOUNT_PENDING'
      });
    }

    if (user.status === UserStatus.REJECTED) {
      return res.status(403).json({
        error: 'Account rejected',
        code: 'ACCOUNT_REJECTED'
      });
    }

    if (user.status === UserStatus.SUSPENDED) {
      return res.status(403).json({
        error: 'Account suspended',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // 로그인 시간 업데이트
    user.lastLoginAt = new Date();
    await userRepository.save(user);

    // JWT 토큰 생성
    const token = generateToken(user.id);

    // 사용자 정보 (비밀번호 제외)
    const userResponse = { ...user };
    delete userResponse.password;

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'LOGIN_FAILED'
    });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userRepository = getUserRepository();
    const user = await userRepository.findOne({ 
      where: { id: req.user.id },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'createdAt', 'updatedAt', 'lastLoginAt']
    });
    
    res.json({ user });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'PROFILE_FETCH_FAILED'
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const { name, businessInfo } = req.body;
    const userRepository = getUserRepository();

    await userRepository.update(req.user.id, {
      name,
      businessInfo
    });

    const user = await userRepository.findOne({ 
      where: { id: req.user.id },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'createdAt', 'updatedAt', 'lastLoginAt']
    });

    res.json({
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'PROFILE_UPDATE_FAILED'
    });
  }
};
