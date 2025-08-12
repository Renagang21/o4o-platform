"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const PasswordResetToken_1 = require("../entities/PasswordResetToken");
const EmailVerificationToken_1 = require("../entities/EmailVerificationToken");
const emailService_1 = require("./emailService");
const auth_1 = require("../types/auth");
class PasswordResetService {
    /**
     * Request password reset
     */
    static async requestPasswordReset(email) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const tokenRepo = connection_1.AppDataSource.getRepository(PasswordResetToken_1.PasswordResetToken);
        // Find user by email
        const user = await userRepo.findOne({ where: { email } });
        // Always return true to prevent email enumeration
        if (!user) {
            // console.log(`Password reset requested for non-existent email: ${email}`);
            return true;
        }
        // Invalidate any existing tokens
        await tokenRepo.update({ userId: user.id, usedAt: null }, { usedAt: new Date() });
        // Generate new token
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        // Create reset token
        const resetToken = tokenRepo.create({
            token: hashedToken,
            userId: user.id,
            user,
            expiresAt: new Date(Date.now() + this.RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
        });
        await tokenRepo.save(resetToken);
        // Send email
        await emailService_1.emailService.sendPasswordResetEmail(email, token);
        return true;
    }
    /**
     * Reset password with token
     */
    static async resetPassword(token, newPassword) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const tokenRepo = connection_1.AppDataSource.getRepository(PasswordResetToken_1.PasswordResetToken);
        // Hash the token
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        // Find valid token
        const resetToken = await tokenRepo.findOne({
            where: {
                token: hashedToken,
                usedAt: null
            },
            relations: ['user']
        });
        if (!resetToken) {
            throw new Error('Invalid or expired reset token');
        }
        // Check if token is expired
        if (resetToken.expiresAt < new Date()) {
            throw new Error('Reset token has expired');
        }
        // Hash new password
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        // Update user password
        resetToken.user.password = hashedPassword;
        resetToken.user.loginAttempts = 0; // Reset login attempts
        resetToken.user.lockedUntil = null; // Unlock account if locked
        await userRepo.save(resetToken.user);
        // Mark token as used
        resetToken.usedAt = new Date();
        await tokenRepo.save(resetToken);
        return true;
    }
    /**
     * Request email verification
     */
    static async requestEmailVerification(userId) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const tokenRepo = connection_1.AppDataSource.getRepository(EmailVerificationToken_1.EmailVerificationToken);
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }
        if (user.isEmailVerified) {
            throw new Error('Email already verified');
        }
        // Invalidate any existing tokens
        await tokenRepo.update({ userId: user.id, usedAt: null }, { usedAt: new Date() });
        // Generate new token
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        // Create verification token
        const verificationToken = tokenRepo.create({
            token: hashedToken,
            userId: user.id,
            user,
            expiresAt: new Date(Date.now() + this.VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
        });
        await tokenRepo.save(verificationToken);
        // Send email
        await emailService_1.emailService.sendEmailVerification(user.email, token);
        return true;
    }
    /**
     * Verify email with token
     */
    static async verifyEmail(token) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const tokenRepo = connection_1.AppDataSource.getRepository(EmailVerificationToken_1.EmailVerificationToken);
        // Hash the token
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        // Find valid token
        const verificationToken = await tokenRepo.findOne({
            where: {
                token: hashedToken,
                usedAt: null
            },
            relations: ['user']
        });
        if (!verificationToken) {
            throw new Error('Invalid or expired verification token');
        }
        // Check if token is expired
        if (verificationToken.expiresAt < new Date()) {
            throw new Error('Verification token has expired');
        }
        // Update user
        verificationToken.user.isEmailVerified = true;
        // If user was pending, approve them
        if (verificationToken.user.status === auth_1.UserStatus.PENDING) {
            verificationToken.user.status = auth_1.UserStatus.ACTIVE;
            verificationToken.user.approvedAt = new Date();
        }
        await userRepo.save(verificationToken.user);
        // Mark token as used
        verificationToken.usedAt = new Date();
        await tokenRepo.save(verificationToken);
        // Send welcome email
        await emailService_1.emailService.sendWelcomeEmail(verificationToken.user.email, verificationToken.user.name || verificationToken.user.email);
        return true;
    }
    /**
     * Clean up expired tokens
     */
    static async cleanupExpiredTokens() {
        const passwordTokenRepo = connection_1.AppDataSource.getRepository(PasswordResetToken_1.PasswordResetToken);
        const emailTokenRepo = connection_1.AppDataSource.getRepository(EmailVerificationToken_1.EmailVerificationToken);
        const now = new Date();
        // Delete expired password reset tokens
        await passwordTokenRepo
            .createQueryBuilder()
            .delete()
            .where('expiresAt < :now', { now })
            .orWhere('usedAt IS NOT NULL')
            .execute();
        // Delete expired email verification tokens
        await emailTokenRepo
            .createQueryBuilder()
            .delete()
            .where('expiresAt < :now', { now })
            .orWhere('usedAt IS NOT NULL')
            .execute();
    }
}
exports.PasswordResetService = PasswordResetService;
PasswordResetService.RESET_TOKEN_EXPIRY_HOURS = 1;
PasswordResetService.VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
//# sourceMappingURL=passwordResetService.js.map