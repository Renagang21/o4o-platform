"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRateLimitKey = exports.getTokenExpiryDate = exports.validateEmail = exports.validatePasswordStrength = exports.generateVerificationCode = exports.generateRandomToken = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = exports.comparePassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("./logger"));
// Password hashing
const hashPassword = async (password) => {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    return bcrypt_1.default.hash(password, saltRounds);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hash) => {
    return bcrypt_1.default.compare(password, hash);
};
exports.comparePassword = comparePassword;
// JWT token generation
const generateAccessToken = (payload) => {
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
    return jsonwebtoken_1.default.sign(tokenPayload, secret, { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES || '15m' });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (userId) => {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET not configured');
    }
    const tokenPayload = { userId };
    return jsonwebtoken_1.default.sign(tokenPayload, secret, { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES || '7d' });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyAccessToken = (token) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET not configured');
    }
    try {
        return jsonwebtoken_1.default.verify(token, secret);
    }
    catch (error) {
        logger_1.default.error('Access token verification failed:', error);
        throw new Error('Invalid or expired token');
    }
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET not configured');
    }
    try {
        return jsonwebtoken_1.default.verify(token, secret);
    }
    catch (error) {
        logger_1.default.error('Refresh token verification failed:', error);
        throw new Error('Invalid or expired refresh token');
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
// Random token generation
const generateRandomToken = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
exports.generateRandomToken = generateRandomToken;
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateVerificationCode = generateVerificationCode;
// Password strength validation
const validatePasswordStrength = (password) => {
    const errors = [];
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
exports.validatePasswordStrength = validatePasswordStrength;
// Email validation
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
// Token expiry time calculation
const getTokenExpiryDate = (expiresIn = '24h') => {
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
exports.getTokenExpiryDate = getTokenExpiryDate;
// Rate limiting key generation
const getRateLimitKey = (identifier, action) => {
    return `rate_limit:${action}:${identifier}`;
};
exports.getRateLimitKey = getRateLimitKey;
//# sourceMappingURL=auth.utils.js.map