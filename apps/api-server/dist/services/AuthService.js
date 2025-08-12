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
exports.authService = exports.getAuthService = exports.AuthService = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const bcrypt = __importStar(require("bcryptjs"));
const uuid_1 = require("uuid");
const auth_1 = require("../types/auth");
class AuthService {
    constructor(userRepository) {
        this.userRepository = userRepository;
        // JWT 시크릿 필수 환경변수 검증
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET environment variable is required');
        }
        if (!process.env.JWT_REFRESH_SECRET) {
            throw new Error('JWT_REFRESH_SECRET environment variable is required');
        }
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
        // CLAUDE.md 정책 기반 쿠키 설정
        this.cookieConfig = {
            domain: '.neture.co.kr',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
        };
    }
    // 사용자 로그인 (Updated signature)
    async login(email, password, userAgent, ipAddress) {
        const domain = 'neture.co.kr';
        // 사용자 조회
        const user = await this.userRepository.findOne({
            where: { email, isActive: true }
        });
        if (!user) {
            throw new Error('Invalid credentials');
        }
        // 계정 잠금 확인
        if (user.isLocked) {
            throw new Error('Account is temporarily locked. Please try again later.');
        }
        // 비밀번호 검증
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            await this.handleFailedLogin(user);
            throw new Error('Invalid credentials');
        }
        // 로그인 성공 처리
        await this.handleSuccessfulLogin(user);
        // 토큰 생성
        const tokens = await this.generateTokens(user, domain);
        // Generate session ID for SSO
        const sessionId = (0, uuid_1.v4)();
        return {
            success: true,
            user: user.toPublicData(),
            tokens,
            sessionId
        };
    }
    // JWT 토큰 생성
    async generateTokens(user, domain) {
        const tokenFamily = (0, uuid_1.v4)();
        // Access Token (15분)
        const accessTokenPayload = {
            userId: user.id,
            sub: user.id,
            email: user.email,
            role: user.role,
            permissions: user.permissions || [],
            domain,
            exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15분
            iat: Math.floor(Date.now() / 1000)
        };
        // Refresh Token (7일)
        const refreshTokenPayload = {
            userId: user.id,
            sub: user.id,
            tokenVersion: 1,
            tokenFamily,
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7일
            iat: Math.floor(Date.now() / 1000)
        };
        const accessToken = jwt.sign(accessTokenPayload, this.jwtSecret);
        const refreshToken = jwt.sign(refreshTokenPayload, this.jwtRefreshSecret);
        // 사용자 토큰 패밀리 업데이트
        user.refreshTokenFamily = tokenFamily;
        await this.userRepository.save(user);
        return {
            accessToken,
            refreshToken,
            expiresIn: 15 * 60 // 15분 (초)
        };
    }
    // Access Token 검증
    verifyAccessToken(token) {
        try {
            const payload = jwt.verify(token, this.jwtSecret);
            // Return the payload with all required fields
            return {
                userId: payload.userId || payload.sub || '',
                email: payload.email || '',
                role: payload.role || auth_1.UserRole.CUSTOMER,
                ...payload
            };
        }
        catch (error) {
            return null;
        }
    }
    // Refresh Token으로 새 토큰 발급
    async refreshTokens(refreshToken, domain) {
        try {
            const payload = jwt.verify(refreshToken, this.jwtRefreshSecret);
            const user = await this.userRepository.findOne({
                where: {
                    id: payload.sub,
                    isActive: true,
                    refreshTokenFamily: payload.tokenFamily
                }
            });
            if (!user) {
                throw new Error('Invalid refresh token');
            }
            // 새 토큰 생성 (Refresh Token Rotation)
            return await this.generateTokens(user, domain);
        }
        catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }
    // 사용자 로그아웃 (토큰 무효화)
    async logout(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user) {
            // 토큰 패밀리 무효화
            user.refreshTokenFamily = null;
            await this.userRepository.save(user);
        }
    }
    // 비밀번호 해시화
    async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }
    // 사용자 생성
    async createUser(userData) {
        const hashedPassword = await this.hashPassword(userData.password);
        const user = this.userRepository.create({
            ...userData,
            password: hashedPassword,
            role: userData.role || auth_1.UserRole.CUSTOMER
        });
        return await this.userRepository.save(user);
    }
    // 역할별 기본 권한
    getDefaultPermissions(role) {
        const permissions = {
            customer: ['read:products', 'create:orders', 'read:own_orders'],
            seller: ['read:products', 'create:products', 'update:own_products', 'read:own_orders', 'read:analytics'],
            supplier: ['create:products', 'update:own_products', 'read:inventory', 'manage:inventory'],
            manager: ['read:all', 'manage:store', 'read:analytics'],
            admin: ['*'] // 모든 권한
        };
        return permissions[role] || permissions.customer;
    }
    // 로그인 실패 처리
    async handleFailedLogin(user) {
        user.loginAttempts += 1;
        // 5회 실패 시 30분 잠금
        if (user.loginAttempts >= 5) {
            user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30분
        }
        await this.userRepository.save(user);
    }
    // 로그인 성공 처리
    async handleSuccessfulLogin(user) {
        user.loginAttempts = 0;
        user.lockedUntil = null;
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);
    }
    // 쿠키 설정 반환
    getCookieConfig() {
        return {
            name: 'refreshToken',
            options: this.cookieConfig
        };
    }
    // === 추가된 메서드들 (Phase 2) ===
    // 사용자 ID로 조회
    async getUserById(id) {
        try {
            return await this.userRepository.findOne({ where: { id } });
        }
        catch (error) {
            console.error('Error getting user by id:', error);
            return null;
        }
    }
    // 사용자 역할 변경
    async updateUserRole(userId, role) {
        const user = await this.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        await this.userRepository.update(userId, { role });
        const updatedUser = await this.getUserById(userId);
        if (!updatedUser) {
            throw new Error('Failed to update user role');
        }
        return updatedUser;
    }
    // 비즈니스 정보 업데이트
    async updateUserBusinessInfo(userId, businessInfo) {
        const user = await this.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        await this.userRepository.update(userId, { businessInfo });
        const updatedUser = await this.getUserById(userId);
        if (!updatedUser) {
            throw new Error('Failed to update business info');
        }
        return updatedUser;
    }
    // 역할별 사용자 목록 조회
    async getUsersByRole(role) {
        try {
            return await this.userRepository.find({
                where: { role, isActive: true },
                select: ['id', 'email', 'firstName', 'lastName', 'name', 'role', 'status', 'createdAt']
            });
        }
        catch (error) {
            console.error('Error getting users by role:', error);
            return [];
        }
    }
    // 사용자 계정 정지
    async suspendUser(userId) {
        const user = await this.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        await this.userRepository.update(userId, {
            isActive: false,
            status: auth_1.UserStatus.SUSPENDED
        });
        const suspendedUser = await this.getUserById(userId);
        if (!suspendedUser) {
            throw new Error('Failed to suspend user');
        }
        return suspendedUser;
    }
    // Request metadata extraction
    getRequestMetadata(req) {
        const userAgent = req.get('user-agent') || 'unknown';
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        return { userAgent, ipAddress };
    }
    // Rotate refresh token (refresh token rotation)
    async rotateRefreshToken(refreshToken, userAgent, ipAddress) {
        try {
            const payload = jwt.verify(refreshToken, this.jwtRefreshSecret);
            const user = await this.userRepository.findOne({
                where: {
                    id: payload.sub || payload.userId,
                    isActive: true,
                    refreshTokenFamily: payload.tokenFamily
                }
            });
            if (!user) {
                return null;
            }
            // Generate new tokens with rotation
            const domain = 'neture.co.kr'; // Default domain
            return await this.generateTokens(user, domain);
        }
        catch (error) {
            return null;
        }
    }
    // Set auth cookies
    setAuthCookies(res, tokens) {
        const isProduction = process.env.NODE_ENV === 'production';
        // Access token cookie
        res.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });
        // Refresh token cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
    }
    // Clear auth cookies
    clearAuthCookies(res) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.clearCookie('sessionId');
    }
    // Revoke all user tokens
    async revokeAllUserTokens(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user) {
            user.refreshTokenFamily = null;
            await this.userRepository.save(user);
        }
    }
}
exports.AuthService = AuthService;
// Create singleton instance
let authServiceInstance = null;
const getAuthService = async () => {
    if (!authServiceInstance) {
        const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('../database/connection')));
        const { User } = await Promise.resolve().then(() => __importStar(require('../entities/User')));
        const userRepository = AppDataSource.getRepository(User);
        authServiceInstance = new AuthService(userRepository);
    }
    return authServiceInstance;
};
exports.getAuthService = getAuthService;
// Export singleton instance for backward compatibility
exports.authService = new Proxy({}, {
    get(_target, prop, receiver) {
        const service = (0, exports.getAuthService)();
        return Reflect.get(service, prop, receiver);
    }
});
//# sourceMappingURL=AuthService.js.map