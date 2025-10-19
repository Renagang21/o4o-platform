"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const jwt = __importStar(require("jsonwebtoken"));
const bcrypt = __importStar(require("bcryptjs"));
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_handler_1 = require("../middleware/error-handler");
const api_error_1 = require("../utils/api-error");
const env_validator_1 = require("../utils/env-validator");
const router = (0, express_1.Router)();
// 로그인
router.post('/login', (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'), (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'), (0, error_handler_1.asyncHandler)(async (req, res, next) => {
    var _a;
    // Validation check
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new api_error_1.ValidationError('Validation failed', errors.array());
    }
    const { email, password } = req.body;
    // Check if database is initialized
    if (!connection_1.AppDataSource.isInitialized) {
        throw new api_error_1.ServiceUnavailableError('Database service unavailable', 'DATABASE_UNAVAILABLE');
    }
    const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
    const user = await userRepository.findOne({
        where: { email },
        select: ['id', 'email', 'name', 'role', 'status', 'password', 'businessInfo'],
        relations: ['dbRoles', 'activeRole']
    });
    if (!user) {
        throw new api_error_1.UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }
    // 비밀번호가 설정되지 않은 사용자 (소셜 로그인 전용)
    if (!user.password) {
        throw new api_error_1.UnauthorizedError('Please use social login', 'SOCIAL_LOGIN_REQUIRED');
    }
    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        throw new api_error_1.UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }
    // 계정 상태 확인 (active 상태만 로그인 허용)
    if (user.status !== User_1.UserStatus.ACTIVE && user.status !== User_1.UserStatus.APPROVED) {
        throw new api_error_1.BadRequestError('Account not active', 'ACCOUNT_NOT_ACTIVE', { status: user.status });
    }
    // JWT 토큰 생성
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, env_validator_1.env.getString('JWT_SECRET'), { expiresIn: '7d' });
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
            roles: ((_a = user.dbRoles) === null || _a === void 0 ? void 0 : _a.map(r => ({
                id: r.id,
                name: r.name,
                displayName: r.displayName
            }))) || [],
            canSwitchRoles: user.hasMultipleRoles(),
            status: user.status,
            businessInfo: user.businessInfo
        }
    });
}));
// 회원가입
router.post('/register', (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'), (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'), (0, express_validator_1.body)('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'), (0, error_handler_1.asyncHandler)(async (req, res, next) => {
    // Validation check
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new api_error_1.ValidationError('Validation failed', errors.array());
    }
    const { email, password, name } = req.body;
    // Check if database is initialized
    if (!connection_1.AppDataSource.isInitialized) {
        throw new api_error_1.ServiceUnavailableError('Database service unavailable', 'DATABASE_UNAVAILABLE');
    }
    const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
    // 이메일 중복 확인
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
        throw new api_error_1.BadRequestError('Email already exists', 'EMAIL_EXISTS');
    }
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, env_validator_1.env.getNumber('BCRYPT_ROUNDS', 12));
    // 새 사용자 생성
    const user = new User_1.User();
    user.email = email;
    user.password = hashedPassword;
    user.name = name;
    user.role = User_1.UserRole.CUSTOMER; // 기본 역할
    user.status = User_1.UserStatus.PENDING; // 관리자 승인 필요
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
}));
// 토큰 검증
router.get('/verify', auth_middleware_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    return res.json({
        success: true,
        message: 'Token is valid',
        user: req.user
    });
}));
// 로그아웃 (클라이언트 측에서 토큰 삭제)
router.post('/logout', auth_middleware_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    // 서버 측에서는 특별히 할 일이 없음 (JWT는 stateless)
    // 향후 token blacklist 구현 시 여기서 처리
    return res.json({
        success: true,
        message: 'Logout successful'
    });
}));
// 인증 상태 확인
router.get('/status', auth_middleware_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    var _a;
    if (!req.user) {
        throw new api_error_1.UnauthorizedError('Not authenticated', 'NOT_AUTHENTICATED');
    }
    // Check if database is initialized
    if (!connection_1.AppDataSource.isInitialized) {
        throw new api_error_1.ServiceUnavailableError('Database service unavailable', 'DATABASE_UNAVAILABLE');
    }
    const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
    const user = await userRepository.findOne({
        where: { id: req.user.id },
        select: ['id', 'email', 'name', 'role', 'status', 'createdAt', 'lastLoginAt'],
        relations: ['dbRoles', 'activeRole']
    });
    if (!user) {
        throw new api_error_1.UnauthorizedError('User not found', 'USER_NOT_FOUND');
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
            roles: ((_a = user.dbRoles) === null || _a === void 0 ? void 0 : _a.map(r => ({
                id: r.id,
                name: r.name,
                displayName: r.displayName
            }))) || [],
            canSwitchRoles: user.hasMultipleRoles(),
            status: user.status,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
        },
        tokenInfo: {
            issuedAt: req.user.iat ? new Date(req.user.iat * 1000).toISOString() : null,
            expiresAt: req.user.exp ? new Date(req.user.exp * 1000).toISOString() : null
        }
    });
}));
exports.default = router;
//# sourceMappingURL=auth.js.map