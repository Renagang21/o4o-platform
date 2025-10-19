"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reloadPassportStrategies = exports.initializePassport = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_kakao_1 = require("passport-kakao");
const passport_naver_v2_1 = require("passport-naver-v2");
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const emailService_1 = require("../services/emailService");
const Settings_1 = require("../entities/Settings");
const crypto_1 = require("../utils/crypto");
const logger_1 = __importDefault(require("../utils/logger"));
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
// Dynamic strategy management
class PassportManager {
    static async loadOAuthSettings() {
        var _a, _b, _c;
        try {
            // Check if AppDataSource is initialized
            if (!connection_1.AppDataSource.isInitialized) {
                // DataSource not initialized, using default settings
                return this.getDefaultSettings();
            }
            const settingsRepo = connection_1.AppDataSource.getRepository(Settings_1.Settings);
            const oauthSetting = await settingsRepo.findOne({
                where: { key: 'oauth_settings' }
            });
            if (!oauthSetting || !oauthSetting.value) {
                return this.getDefaultSettings();
            }
            const parsedData = typeof oauthSetting.value === 'string'
                ? JSON.parse(oauthSetting.value)
                : oauthSetting.value;
            // Decrypt client secrets
            if ((_a = parsedData.google) === null || _a === void 0 ? void 0 : _a.clientSecret) {
                try {
                    parsedData.google.clientSecret = (0, crypto_1.decrypt)(parsedData.google.clientSecret);
                }
                catch (error) {
                    logger_1.default.error('Failed to decrypt Google client secret');
                    parsedData.google.clientSecret = '';
                }
            }
            if ((_b = parsedData.kakao) === null || _b === void 0 ? void 0 : _b.clientSecret) {
                try {
                    parsedData.kakao.clientSecret = (0, crypto_1.decrypt)(parsedData.kakao.clientSecret);
                }
                catch (error) {
                    logger_1.default.error('Failed to decrypt Kakao client secret');
                    parsedData.kakao.clientSecret = '';
                }
            }
            if ((_c = parsedData.naver) === null || _c === void 0 ? void 0 : _c.clientSecret) {
                try {
                    parsedData.naver.clientSecret = (0, crypto_1.decrypt)(parsedData.naver.clientSecret);
                }
                catch (error) {
                    logger_1.default.error('Failed to decrypt Naver client secret');
                    parsedData.naver.clientSecret = '';
                }
            }
            return parsedData;
        }
        catch (error) {
            logger_1.default.error('Error loading OAuth settings:', error);
            return this.getDefaultSettings();
        }
    }
    static getDefaultSettings() {
        return {
            google: {
                provider: 'google',
                enabled: false,
                clientId: '',
                clientSecret: '',
                callbackUrl: '/api/v1/auth/google/callback',
                scope: ['profile', 'email']
            },
            kakao: {
                provider: 'kakao',
                enabled: false,
                clientId: '',
                clientSecret: '',
                callbackUrl: '/api/v1/auth/kakao/callback',
                scope: []
            },
            naver: {
                provider: 'naver',
                enabled: false,
                clientId: '',
                clientSecret: '',
                callbackUrl: '/api/v1/auth/naver/callback',
                scope: []
            }
        };
    }
    static async configureStrategies() {
        try {
            const settings = await this.loadOAuthSettings();
            // Clear existing strategies
            this.clearStrategies();
            // Configure Google strategy
            if (settings.google.enabled && settings.google.clientId && settings.google.clientSecret) {
                this.configureGoogleStrategy(settings.google);
            }
            // Configure Kakao strategy
            if (settings.kakao.enabled && settings.kakao.clientId) {
                this.configureKakaoStrategy(settings.kakao);
            }
            // Configure Naver strategy
            if (settings.naver.enabled && settings.naver.clientId && settings.naver.clientSecret) {
                this.configureNaverStrategy(settings.naver);
            }
            logger_1.default.info('OAuth strategies configured successfully');
        }
        catch (error) {
            logger_1.default.error('Error configuring OAuth strategies:', error);
        }
    }
    static clearStrategies() {
        this.activeStrategies.forEach(strategyName => {
            passport_1.default.unuse(strategyName);
        });
        this.activeStrategies.clear();
    }
    static configureGoogleStrategy(config) {
        passport_1.default.use(new passport_google_oauth20_1.Strategy({
            clientID: config.clientId,
            clientSecret: config.clientSecret,
            callbackURL: config.callbackUrl,
            scope: config.scope
        }, async (accessToken, refreshToken, profile, done) => {
            var _a, _b, _c, _d, _e, _f;
            try {
                const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
                let user = await userRepo.findOne({
                    where: [
                        { email: (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value },
                        { provider: 'google', provider_id: profile.id }
                    ]
                });
                if (user) {
                    user.lastLoginAt = new Date();
                    await userRepo.save(user);
                    return done(null, user);
                }
                user = userRepo.create({
                    email: ((_d = (_c = profile.emails) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) || '',
                    name: profile.displayName,
                    firstName: (_e = profile.name) === null || _e === void 0 ? void 0 : _e.givenName,
                    lastName: (_f = profile.name) === null || _f === void 0 ? void 0 : _f.familyName,
                    provider: 'google',
                    provider_id: profile.id,
                    role: User_1.UserRole.CUSTOMER,
                    status: User_1.UserStatus.ACTIVE,
                    isEmailVerified: true,
                    password: ''
                });
                await userRepo.save(user);
                await emailService_1.emailService.sendWelcomeEmail(user.email, user.name || user.email);
                done(null, user);
            }
            catch (error) {
                done(error, undefined);
            }
        }));
        this.activeStrategies.add('google');
        logger_1.default.info('Google OAuth strategy configured');
    }
    static configureKakaoStrategy(config) {
        passport_1.default.use(new passport_kakao_1.Strategy({
            clientID: config.clientId,
            clientSecret: config.clientSecret || '',
            callbackURL: config.callbackUrl
        }, async (accessToken, refreshToken, profile, done) => {
            var _a, _b, _c;
            try {
                const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
                const email = (_a = profile._json.kakao_account) === null || _a === void 0 ? void 0 : _a.email;
                if (!email) {
                    return done(new Error('Email not provided by Kakao'), undefined);
                }
                let user = await userRepo.findOne({
                    where: [
                        { email },
                        { provider: 'kakao', provider_id: String(profile.id) }
                    ]
                });
                if (user) {
                    user.lastLoginAt = new Date();
                    await userRepo.save(user);
                    return done(null, user);
                }
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
                await emailService_1.emailService.sendWelcomeEmail(user.email, user.name || user.email);
                done(null, user);
            }
            catch (error) {
                done(error, undefined);
            }
        }));
        this.activeStrategies.add('kakao');
        logger_1.default.info('Kakao OAuth strategy configured');
    }
    static configureNaverStrategy(config) {
        passport_1.default.use(new passport_naver_v2_1.Strategy({
            clientID: config.clientId,
            clientSecret: config.clientSecret,
            callbackURL: config.callbackUrl
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
                const email = profile.email;
                if (!email) {
                    return done(new Error('Email not provided by Naver'), undefined);
                }
                let user = await userRepo.findOne({
                    where: [
                        { email },
                        { provider: 'naver', provider_id: profile.id }
                    ]
                });
                if (user) {
                    user.lastLoginAt = new Date();
                    await userRepo.save(user);
                    return done(null, user);
                }
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
                await emailService_1.emailService.sendWelcomeEmail(user.email, user.name || user.email);
                done(null, user);
            }
            catch (error) {
                done(error, undefined);
            }
        }));
        this.activeStrategies.add('naver');
        logger_1.default.info('Naver OAuth strategy configured');
    }
    static async reloadStrategies() {
        await this.configureStrategies();
    }
    static getActiveStrategies() {
        return Array.from(this.activeStrategies);
    }
}
PassportManager.activeStrategies = new Set();
// Initialize strategies on startup
const initializePassport = async () => {
    await PassportManager.configureStrategies();
};
exports.initializePassport = initializePassport;
// Export reload function for use when settings change
const reloadPassportStrategies = async () => {
    await PassportManager.reloadStrategies();
};
exports.reloadPassportStrategies = reloadPassportStrategies;
exports.default = passport_1.default;
//# sourceMappingURL=passportDynamic.js.map