"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const email_auth_1 = require("../types/email-auth");
const validateDto_1 = require("../middleware/validateDto");
const auth_1 = require("../middleware/auth");
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const EmailVerificationToken_1 = require("../entities/EmailVerificationToken");
const PasswordResetToken_1 = require("../entities/PasswordResetToken");
const email_service_1 = require("../services/email.service");
const auth_utils_1 = require("../utils/auth.utils");
const logger_1 = __importDefault(require("../utils/logger"));
const auth_2 = require("../types/auth");
const router = (0, express_1.Router)();
// Validation rules
const registerValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('유효한 이메일 주소를 입력하세요'),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다'),
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('이름을 입력하세요'),
    (0, express_validator_1.body)('termsAccepted').isBoolean().equals('true').withMessage('이용약관에 동의해야 합니다'),
    (0, express_validator_1.body)('privacyAccepted').isBoolean().equals('true').withMessage('개인정보처리방침에 동의해야 합니다')
];
const loginValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('유효한 이메일 주소를 입력하세요'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('비밀번호를 입력하세요')
];
const resetPasswordRequestValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('유효한 이메일 주소를 입력하세요')
];
const resetPasswordValidation = [
    (0, express_validator_1.body)('token').notEmpty().withMessage('토큰이 필요합니다'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다'),
    (0, express_validator_1.body)('confirmPassword').custom((value, { req }) => value === req.body.newPassword)
        .withMessage('비밀번호가 일치하지 않습니다')
];
// POST /api/auth/register - User registration
router.post('/register', registerValidation, validateDto_1.validateDto, async (req, res, next) => {
    try {
        const { email, password, name, marketingAccepted } = req.body;
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        const tokenRepository = connection_1.AppDataSource.getRepository(EmailVerificationToken_1.EmailVerificationToken);
        // Check if user already exists
        const existingUser = await userRepository.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '이미 등록된 이메일입니다',
                error: {
                    code: email_auth_1.AuthErrorCode.EMAIL_ALREADY_EXISTS,
                    field: 'email'
                }
            });
        }
        // Validate password strength
        const passwordValidation = (0, auth_utils_1.validatePasswordStrength)(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: '비밀번호가 보안 요구사항을 충족하지 않습니다',
                errors: passwordValidation.errors,
                error: {
                    code: email_auth_1.AuthErrorCode.WEAK_PASSWORD,
                    field: 'password'
                }
            });
        }
        // Hash password
        const hashedPassword = await (0, auth_utils_1.hashPassword)(password);
        // Create user
        const user = userRepository.create({
            email,
            password: hashedPassword,
            name,
            status: auth_2.UserStatus.PENDING,
            businessInfo: null
        });
        await userRepository.save(user);
        // Generate verification token
        const verificationToken = (0, auth_utils_1.generateRandomToken)();
        const tokenEntity = tokenRepository.create({
            token: verificationToken,
            userId: user.id,
            email: user.email,
            expiresAt: (0, auth_utils_1.getTokenExpiryDate)('24h'),
            usedAt: null
        });
        await tokenRepository.save(tokenEntity);
        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
        await email_service_1.emailService.sendEmail({
            to: email,
            subject: '이메일 인증을 완료해주세요',
            template: 'verification',
            data: {
                name,
                actionUrl: verificationUrl,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@o4o.com',
                companyName: process.env.COMPANY_NAME || 'O4O Platform',
                year: new Date().getFullYear()
            }
        });
        res.status(201).json({
            success: true,
            message: '회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.'
        });
    }
    catch (error) {
        logger_1.default.error('Registration error:', error);
        next(error);
    }
});
// POST /api/auth/login - User login
router.post('/login', loginValidation, validateDto_1.validateDto, async (req, res, next) => {
    try {
        const { email, password, rememberMe } = req.body;
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        // Find user
        const user = await userRepository.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '이메일 또는 비밀번호가 올바르지 않습니다',
                error: {
                    code: email_auth_1.AuthErrorCode.INVALID_CREDENTIALS
                }
            });
        }
        // Check password
        const isPasswordValid = await (0, auth_utils_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            // TODO: Implement login attempt tracking
            return res.status(401).json({
                success: false,
                message: '이메일 또는 비밀번호가 올바르지 않습니다',
                error: {
                    code: email_auth_1.AuthErrorCode.INVALID_CREDENTIALS
                }
            });
        }
        // Check if email is verified
        if (user.status === auth_2.UserStatus.PENDING) {
            return res.status(403).json({
                success: false,
                message: '이메일 인증이 필요합니다',
                error: {
                    code: email_auth_1.AuthErrorCode.EMAIL_NOT_VERIFIED
                }
            });
        }
        // Check if account is locked
        if (user.status === auth_2.UserStatus.REJECTED || user.status === auth_2.UserStatus.INACTIVE) {
            return res.status(403).json({
                success: false,
                message: '계정이 비활성화되었습니다. 고객 지원팀에 문의하세요.',
                error: {
                    code: email_auth_1.AuthErrorCode.ACCOUNT_LOCKED
                }
            });
        }
        // Generate tokens
        const jwtPayload = {
            userId: user.id,
            email: user.email,
            role: user.role || auth_2.UserRole.CUSTOMER,
            emailVerified: true
        };
        const accessToken = (0, auth_utils_1.generateAccessToken)(jwtPayload);
        const refreshToken = rememberMe ? (0, auth_utils_1.generateRefreshToken)(user.id) : undefined;
        // Update last login
        user.lastLoginAt = new Date();
        await userRepository.save(user);
        const response = {
            success: true,
            message: '로그인 성공',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role || auth_2.UserRole.CUSTOMER,
                    emailVerified: true,
                    createdAt: user.createdAt
                },
                accessToken,
                refreshToken
            }
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Login error:', error);
        next(error);
    }
});
// POST /api/auth/verify-email - Verify email address
router.post('/verify-email', (0, express_validator_1.body)('token').notEmpty().withMessage('토큰이 필요합니다'), validateDto_1.validateDto, async (req, res, next) => {
    try {
        const { token } = req.body;
        const tokenRepository = connection_1.AppDataSource.getRepository(EmailVerificationToken_1.EmailVerificationToken);
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        // Find token
        const tokenEntity = await tokenRepository.findOne({
            where: { token },
            relations: ['user']
        });
        if (!tokenEntity) {
            return res.status(400).json({
                success: false,
                message: '유효하지 않은 토큰입니다',
                error: {
                    code: email_auth_1.AuthErrorCode.INVALID_TOKEN
                }
            });
        }
        // Check if token is expired
        if (new Date() > tokenEntity.expiresAt) {
            return res.status(400).json({
                success: false,
                message: '만료된 토큰입니다',
                error: {
                    code: email_auth_1.AuthErrorCode.TOKEN_EXPIRED
                }
            });
        }
        // Check if token is already used
        if (tokenEntity.usedAt) {
            return res.status(400).json({
                success: false,
                message: '이미 사용된 토큰입니다',
                error: {
                    code: email_auth_1.AuthErrorCode.INVALID_TOKEN
                }
            });
        }
        // Update user status
        const user = await userRepository.findOne({ where: { id: tokenEntity.userId } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다',
                error: {
                    code: email_auth_1.AuthErrorCode.USER_NOT_FOUND
                }
            });
        }
        user.status = auth_2.UserStatus.APPROVED;
        await userRepository.save(user);
        // Mark token as used
        tokenEntity.usedAt = new Date();
        await tokenRepository.save(tokenEntity);
        // Send welcome email
        await email_service_1.emailService.sendEmail({
            to: user.email,
            subject: `${user.name}님, 환영합니다!`,
            template: 'welcome',
            data: {
                name: user.name,
                actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@o4o.com',
                companyName: process.env.COMPANY_NAME || 'O4O Platform',
                year: new Date().getFullYear()
            }
        });
        res.json({
            success: true,
            message: '이메일 인증이 완료되었습니다'
        });
    }
    catch (error) {
        logger_1.default.error('Email verification error:', error);
        next(error);
    }
});
// POST /api/auth/password/reset-request - Request password reset
router.post('/password/reset-request', resetPasswordRequestValidation, validateDto_1.validateDto, async (req, res, next) => {
    try {
        const { email } = req.body;
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        const tokenRepository = connection_1.AppDataSource.getRepository(PasswordResetToken_1.PasswordResetToken);
        // Find user
        const user = await userRepository.findOne({ where: { email } });
        // Always return success to prevent email enumeration
        if (!user) {
            logger_1.default.info(`Password reset requested for non-existent email: ${email}`);
            return res.json({
                success: true,
                message: '비밀번호 재설정 링크가 이메일로 발송되었습니다'
            });
        }
        // Check for existing valid token
        const existingToken = await tokenRepository.findOne({
            where: {
                userId: user.id
            }
        });
        // Check if token is unused
        if (existingToken && !existingToken.usedAt && new Date() < existingToken.expiresAt) {
            // Token still valid, don't create new one
            return res.json({
                success: true,
                message: '비밀번호 재설정 링크가 이메일로 발송되었습니다'
            });
        }
        // Generate new token
        const resetToken = (0, auth_utils_1.generateRandomToken)();
        const tokenEntity = tokenRepository.create({
            token: resetToken,
            userId: user.id,
            email: user.email,
            expiresAt: (0, auth_utils_1.getTokenExpiryDate)('1h'),
            usedAt: null
        });
        await tokenRepository.save(tokenEntity);
        // Send password reset email
        const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
        await email_service_1.emailService.sendEmail({
            to: email,
            subject: '비밀번호 재설정 요청',
            template: 'passwordReset',
            data: {
                name: user.name,
                actionUrl: resetUrl,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@o4o.com',
                companyName: process.env.COMPANY_NAME || 'O4O Platform',
                year: new Date().getFullYear()
            }
        });
        res.json({
            success: true,
            message: '비밀번호 재설정 링크가 이메일로 발송되었습니다'
        });
    }
    catch (error) {
        logger_1.default.error('Password reset request error:', error);
        next(error);
    }
});
// POST /api/auth/password/reset - Reset password
router.post('/password/reset', resetPasswordValidation, validateDto_1.validateDto, async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        const tokenRepository = connection_1.AppDataSource.getRepository(PasswordResetToken_1.PasswordResetToken);
        const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        // Find token
        const tokenEntity = await tokenRepository.findOne({ where: { token } });
        if (!tokenEntity) {
            return res.status(400).json({
                success: false,
                message: '유효하지 않은 토큰입니다',
                error: {
                    code: email_auth_1.AuthErrorCode.INVALID_TOKEN
                }
            });
        }
        // Check if token is expired
        if (new Date() > tokenEntity.expiresAt) {
            return res.status(400).json({
                success: false,
                message: '만료된 토큰입니다',
                error: {
                    code: email_auth_1.AuthErrorCode.TOKEN_EXPIRED
                }
            });
        }
        // Check if token is already used
        if (tokenEntity.usedAt) {
            return res.status(400).json({
                success: false,
                message: '이미 사용된 토큰입니다',
                error: {
                    code: email_auth_1.AuthErrorCode.INVALID_TOKEN
                }
            });
        }
        // Validate password strength
        const passwordValidation = (0, auth_utils_1.validatePasswordStrength)(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: '비밀번호가 보안 요구사항을 충족하지 않습니다',
                errors: passwordValidation.errors,
                error: {
                    code: email_auth_1.AuthErrorCode.WEAK_PASSWORD,
                    field: 'newPassword'
                }
            });
        }
        // Update user password
        const user = await userRepository.findOne({ where: { id: tokenEntity.userId } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다',
                error: {
                    code: email_auth_1.AuthErrorCode.USER_NOT_FOUND
                }
            });
        }
        user.password = await (0, auth_utils_1.hashPassword)(newPassword);
        await userRepository.save(user);
        // Mark token as used
        tokenEntity.usedAt = new Date();
        await tokenRepository.save(tokenEntity);
        res.json({
            success: true,
            message: '비밀번호가 성공적으로 변경되었습니다'
        });
    }
    catch (error) {
        logger_1.default.error('Password reset error:', error);
        next(error);
    }
});
// POST /api/auth/refresh - Refresh access token
router.post('/refresh', (0, express_validator_1.body)('refreshToken').notEmpty().withMessage('리프레시 토큰이 필요합니다'), validateDto_1.validateDto, async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        // TODO: Implement refresh token verification with database
        // For now, returning error
        return res.status(501).json({
            success: false,
            message: 'Refresh token functionality not yet implemented'
        });
    }
    catch (error) {
        logger_1.default.error('Token refresh error:', error);
        next(error);
    }
});
// POST /api/auth/logout - Logout (authenticated)
router.post('/logout', auth_1.authenticateToken, async (req, res, next) => {
    try {
        // TODO: Implement token blacklisting or session management
        res.json({
            success: true,
            message: '로그아웃되었습니다'
        });
    }
    catch (error) {
        logger_1.default.error('Logout error:', error);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=email-auth.routes.js.map