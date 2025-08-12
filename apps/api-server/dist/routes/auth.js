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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const jwt = __importStar(require("jsonwebtoken"));
const bcrypt = __importStar(require("bcryptjs"));
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 로그인
router.post('/login', (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'), (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'), async (req, res) => {
    try {
        const { email, password } = req.body;
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
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
        if (user.status !== User_1.UserStatus.ACTIVE && user.status !== User_1.UserStatus.APPROVED) {
            return res.status(403).json({
                error: 'Account not active',
                code: 'ACCOUNT_NOT_ACTIVE',
                status: user.status
            });
        }
        // JWT 토큰 생성
        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
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
    }
    catch (error) {
        console.error('Login error:', error);
        // PostgreSQL 권한 에러 체크
        if (error instanceof Error && error.message.includes('aclcheck_error')) {
            console.error('Database permission error - check PostgreSQL user permissions');
            return res.status(500).json({
                error: 'Database access error',
                code: 'DATABASE_PERMISSION_ERROR'
            });
        }
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});
// 회원가입
router.post('/register', (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'), (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'), (0, express_validator_1.body)('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'), async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
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
        const user = new User_1.User();
        user.email = email;
        user.password = hashedPassword;
        user.name = name;
        user.role = User_1.UserRole.CUSTOMER; // 기본 역할
        user.status = User_1.UserStatus.PENDING; // 관리자 승인 필요
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
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});
// 토큰 검증
router.get('/verify', auth_1.authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        user: req.user
    });
});
// 로그아웃 (클라이언트 측에서 토큰 삭제)
router.post('/logout', auth_1.authenticateToken, (req, res) => {
    // 서버 측에서는 특별히 할 일이 없음 (JWT는 stateless)
    // 향후 token blacklist 구현 시 여기서 처리
    res.json({
        success: true,
        message: 'Logout successful'
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map