"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_kakao_1 = require("passport-kakao");
const passport_naver_v2_1 = require("passport-naver-v2");
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const emailService_1 = require("../services/emailService");
// User serialization for session
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepo.findOne({ where: { id } });
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
});
// Google OAuth Strategy - Only initialize if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/v1/auth/google/callback',
        scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        var _a, _b, _c, _d, _e, _f;
        try {
            const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
            // Check if user exists
            let user = await userRepo.findOne({
                where: [
                    { email: (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value },
                    { provider: 'google', provider_id: profile.id }
                ]
            });
            if (user) {
                // Update last login
                user.lastLoginAt = new Date();
                await userRepo.save(user);
                return done(null, user);
            }
            // Create new user
            user = userRepo.create({
                email: ((_d = (_c = profile.emails) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) || '',
                name: profile.displayName,
                firstName: (_e = profile.name) === null || _e === void 0 ? void 0 : _e.givenName,
                lastName: (_f = profile.name) === null || _f === void 0 ? void 0 : _f.familyName,
                provider: 'google',
                provider_id: profile.id,
                role: User_1.UserRole.CUSTOMER,
                status: User_1.UserStatus.ACTIVE, // Auto-approve social logins
                isEmailVerified: true, // Google emails are pre-verified
                password: '' // No password for social logins
            });
            await userRepo.save(user);
            // Send welcome email
            await emailService_1.emailService.sendWelcomeEmail(user.email, user.name || user.email);
            done(null, user);
        }
        catch (error) {
            done(error, undefined);
        }
    }));
}
// Kakao OAuth Strategy - Only initialize if credentials are provided
if (process.env.KAKAO_CLIENT_ID) {
    passport_1.default.use(new passport_kakao_1.Strategy({
        clientID: process.env.KAKAO_CLIENT_ID,
        clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
        callbackURL: '/api/v1/auth/kakao/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        var _a, _b, _c;
        try {
            const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
            const email = (_a = profile._json.kakao_account) === null || _a === void 0 ? void 0 : _a.email;
            if (!email) {
                return done(new Error('Email not provided by Kakao'), undefined);
            }
            // Check if user exists
            let user = await userRepo.findOne({
                where: [
                    { email },
                    { provider: 'kakao', provider_id: String(profile.id) }
                ]
            });
            if (user) {
                // Update last login
                user.lastLoginAt = new Date();
                await userRepo.save(user);
                return done(null, user);
            }
            // Create new user
            user = userRepo.create({
                email,
                name: profile.displayName || profile.username || ((_c = (_b = profile._json) === null || _b === void 0 ? void 0 : _b.properties) === null || _c === void 0 ? void 0 : _c.nickname) || '',
                provider: 'kakao',
                provider_id: String(profile.id),
                role: User_1.UserRole.CUSTOMER,
                status: User_1.UserStatus.ACTIVE,
                isEmailVerified: true,
                password: ''
            });
            await userRepo.save(user);
            // Send welcome email
            await emailService_1.emailService.sendWelcomeEmail(user.email, user.name || user.email);
            done(null, user);
        }
        catch (error) {
            done(error, undefined);
        }
    }));
}
// Naver OAuth Strategy - Only initialize if credentials are provided
if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
    passport_1.default.use(new passport_naver_v2_1.Strategy({
        clientID: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        callbackURL: '/api/v1/auth/naver/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
            const email = profile.email;
            if (!email) {
                return done(new Error('Email not provided by Naver'), undefined);
            }
            // Check if user exists
            let user = await userRepo.findOne({
                where: [
                    { email },
                    { provider: 'naver', provider_id: profile.id }
                ]
            });
            if (user) {
                // Update last login
                user.lastLoginAt = new Date();
                await userRepo.save(user);
                return done(null, user);
            }
            // Create new user
            user = userRepo.create({
                email,
                name: profile.displayName || profile.nickname,
                provider: 'naver',
                provider_id: profile.id,
                role: User_1.UserRole.CUSTOMER,
                status: User_1.UserStatus.ACTIVE,
                isEmailVerified: true,
                password: ''
            });
            await userRepo.save(user);
            // Send welcome email
            await emailService_1.emailService.sendWelcomeEmail(user.email, user.name || user.email);
            done(null, user);
        }
        catch (error) {
            done(error, undefined);
        }
    }));
}
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map