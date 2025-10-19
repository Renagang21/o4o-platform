"use strict";
/**
 * Environment Variable Validator
 * 필수 환경 변수를 체크하고 기본값을 설정합니다.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const logger_1 = __importDefault(require("./logger"));
class EnvironmentValidator {
    constructor() {
        this.requiredVars = [
            'DB_HOST',
            'DB_PORT',
            'DB_USERNAME',
            'DB_PASSWORD',
            'DB_NAME',
            'JWT_SECRET',
        ];
        this.optionalVars = [
            'NODE_ENV',
            'PORT',
            'HOST',
            'SESSION_SECRET',
            'COOKIE_DOMAIN',
            'REDIS_HOST',
            'REDIS_PORT',
            'REDIS_PASSWORD',
            'REDIS_ENABLED',
            'SESSION_SYNC_ENABLED',
            'EMAIL_SERVICE_ENABLED',
            'BCRYPT_ROUNDS',
            'JWT_REFRESH_SECRET',
        ];
        this.env = process.env;
        this.validate();
    }
    validate() {
        const missingVars = [];
        // Check required variables
        for (const varName of this.requiredVars) {
            if (!this.env[varName]) {
                // Use defaults in development
                if (this.env.NODE_ENV !== 'production') {
                    this.setDefaults(varName);
                }
                else {
                    missingVars.push(varName);
                }
            }
        }
        // In production, fail if required vars are missing
        if (missingVars.length > 0 && this.env.NODE_ENV === 'production') {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}\n` +
                'Please set these in your .env file or environment.');
        }
        // Log configuration
        this.logConfiguration();
    }
    setDefaults(varName) {
        const defaults = {
            DB_HOST: 'localhost',
            DB_PORT: '5432',
            DB_USERNAME: 'postgres',
            DB_PASSWORD: '',
            DB_NAME: 'o4o_platform',
            JWT_SECRET: 'dev-jwt-secret-change-in-production',
            JWT_REFRESH_SECRET: 'dev-refresh-secret-change-in-production',
        };
        if (defaults[varName] !== undefined) {
            this.env[varName] = defaults[varName];
        }
    }
    logConfiguration() {
        logger_1.default.info('🔧 Environment Configuration:');
        logger_1.default.info(`  - Environment: ${this.env.NODE_ENV || 'development'}`);
        logger_1.default.info(`  - Database: ${this.env.DB_NAME}@${this.env.DB_HOST}:${this.env.DB_PORT}`);
        logger_1.default.info(`  - Server Port: ${this.env.PORT || '3001'}`);
        // Optional services
        if (this.env.REDIS_HOST) {
            logger_1.default.info(`  - Redis: ${this.env.REDIS_HOST}:${this.env.REDIS_PORT || '6379'}`);
        }
        else {
            logger_1.default.info('  - Redis: Not configured');
        }
        if (this.env.EMAIL_SERVICE_ENABLED === 'true') {
            logger_1.default.info('  - Email Service: Enabled');
        }
        else {
            logger_1.default.info('  - Email Service: Disabled');
        }
    }
    get(key, defaultValue) {
        const value = this.env[key];
        if (value === undefined || value === '') {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            if (this.requiredVars.includes(key)) {
                throw new Error(`Required environment variable ${key} is not set`);
            }
            return '';
        }
        // Type conversion for common types
        if (typeof defaultValue === 'boolean' || (defaultValue === undefined && (value === 'true' || value === 'false'))) {
            return (value === 'true');
        }
        if (typeof defaultValue === 'number' || (defaultValue === undefined && !isNaN(Number(value)))) {
            const num = Number(value);
            if (!isNaN(num)) {
                return num;
            }
        }
        return value;
    }
    /**
     * Get string value
     */
    getString(key, defaultValue) {
        return this.get(key, defaultValue);
    }
    /**
     * Get number value
     */
    getNumber(key, defaultValue) {
        const value = this.get(key, defaultValue === null || defaultValue === void 0 ? void 0 : defaultValue.toString());
        const num = Number(value);
        return isNaN(num) ? (defaultValue || 0) : num;
    }
    /**
     * Get boolean value
     */
    getBoolean(key, defaultValue = false) {
        const value = this.get(key, defaultValue.toString());
        return value === 'true' || value === '1';
    }
    /**
     * Check if environment is development
     */
    isDevelopment() {
        return this.env.NODE_ENV !== 'production';
    }
    /**
     * Check if environment is production
     */
    isProduction() {
        return this.env.NODE_ENV === 'production';
    }
    /**
     * Check if environment is test
     */
    isTest() {
        return this.env.NODE_ENV === 'test';
    }
}
// Singleton instance
exports.env = new EnvironmentValidator();
//# sourceMappingURL=env-validator.js.map