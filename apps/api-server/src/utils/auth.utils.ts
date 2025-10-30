import bcrypt from 'bcrypt';
import jwt, { Secret } from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload } from '../types/email-auth.js';
import logger from './logger.js';

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// JWT token generation
export const generateAccessToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  // Convert payload to plain object
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    emailVerified: payload.emailVerified
  };

  return jwt.sign(
    tokenPayload, 
    secret as Secret, 
    { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES || '15m' } as jwt.SignOptions
  );
};

export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }

  const tokenPayload = { userId };

  return jwt.sign(
    tokenPayload, 
    secret as Secret, 
    { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES || '7d' } as jwt.SignOptions
  );
};

export const verifyAccessToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    logger.error('Access token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }

  try {
    return jwt.verify(token, secret) as { userId: string };
  } catch (error) {
    logger.error('Refresh token verification failed:', error);
    throw new Error('Invalid or expired refresh token');
  }
};

// Random token generation
export const generateRandomToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Password strength validation
export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('대문자를 하나 이상 포함해야 합니다');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('소문자를 하나 이상 포함해야 합니다');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('숫자를 하나 이상 포함해야 합니다');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('특수문자를 하나 이상 포함해야 합니다');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Token expiry time calculation
export const getTokenExpiryDate = (expiresIn: string = '24h'): Date => {
  const now = new Date();
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  switch (unit) {
    case 'h':
      now.setHours(now.getHours() + value);
      break;
    case 'd':
      now.setDate(now.getDate() + value);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + value);
      break;
    default:
      now.setHours(now.getHours() + 24); // Default 24 hours
  }

  return now;
};

// Rate limiting key generation
export const getRateLimitKey = (identifier: string, action: string): string => {
  return `rate_limit:${action}:${identifier}`;
};