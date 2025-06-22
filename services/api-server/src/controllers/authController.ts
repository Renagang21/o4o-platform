import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../database/connection';
import { User, UserRole, UserStatus } from '../entities/User';

// 회원가입
export const register = async (req: Request, res: Response) => {
  try {
    // 유효성 검증
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, name, businessInfo } = req.body;

    const userRepository = AppDataSource.getRepository(User);

    // 이메일 중복 확인
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    // 새 사용자 생성
    const user = userRepository.create({
      email,
      password, // BeforeInsert에서 자동 해시
      name,
      role: UserRole.CUSTOMER,
      status: UserStatus.PENDING,
      businessInfo: businessInfo || null
    });

    await userRepository.save(user);

    // 응답에서 비밀번호 제외
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      businessInfo: user.businessInfo,
      createdAt: user.createdAt
    };

    res.status(201).json({
      message: 'Registration successful. Please wait for admin approval.',
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed'
    });
  }
};

// 로그인
export const login = async (req: Request, res: Response) => {
  try {
    // 유효성 검증
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password: loginPassword } = req.body;

    const userRepository = AppDataSource.getRepository(User);

    // 사용자 조회
    const user = await userRepository.findOne({ 
      where: { email },
      select: ['id', 'email', 'password', 'name', 'role', 'status', 'businessInfo', 'lastLoginAt']
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // 계정 승인 상태 확인
    if (user.status !== UserStatus.APPROVED) {
      return res.status(403).json({
        error: 'Account not approved',
        status: user.status
      });
    }

    // 비밀번호 확인
    const isPasswordValid = await user.comparePassword(loginPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // JWT 토큰 생성  
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // 로그인 시간 업데이트
    await userRepository.update(user.id, { lastLoginAt: new Date() });

    // 응답에서 비밀번호 제외
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      businessInfo: user.businessInfo,
      lastLoginAt: new Date()
    };

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed'
    });
  }
};

// 프로필 조회
export const getProfile = async (req: any, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    // 비밀번호 제외한 사용자 정보 반환
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      businessInfo: user.businessInfo,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    };

    res.json({
      user: userResponse
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile'
    });
  }
};

// 프로필 수정
export const updateProfile = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { name, businessInfo } = req.body;

    if (!user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const userRepository = AppDataSource.getRepository(User);

    // 업데이트할 데이터 준비
    const updateData: any = {};
    if (name) updateData.name = name;
    if (businessInfo) updateData.businessInfo = businessInfo;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No data to update'
      });
    }

    // 프로필 업데이트
    await userRepository.update(user.id, updateData);

    // 업데이트된 사용자 정보 조회
    const updatedUser = await userRepository.findOne({
      where: { id: user.id },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'createdAt', 'updatedAt', 'lastLoginAt']
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile'
    });
  }
};
