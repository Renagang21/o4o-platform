"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupLoginAttemptsJob = exports.CleanupLoginAttemptsJob = void 0;
const LoginSecurityService_1 = require("../services/LoginSecurityService");
const logger_1 = __importDefault(require("../utils/logger"));
class CleanupLoginAttemptsJob {
    constructor() {
        this.intervalId = null;
        this.CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
        // Initialize without starting
    }
    async cleanup() {
        try {
            logger_1.default.info('Starting login attempts cleanup job');
            // Keep login attempts for 30 days
            const daysToKeep = parseInt(process.env.LOGIN_ATTEMPTS_RETENTION_DAYS || '30');
            const deletedCount = await LoginSecurityService_1.LoginSecurityService.clearOldLoginAttempts(daysToKeep);
            logger_1.default.info(`Login attempts cleanup completed. Deleted ${deletedCount} old records`);
        }
        catch (error) {
            logger_1.default.error('Error in login attempts cleanup job:', error);
        }
    }
    start() {
        logger_1.default.info('Starting login attempts cleanup scheduled job');
        // Run immediately on start
        this.cleanup().catch(err => logger_1.default.error('Cleanup job error:', err));
        // Then run every 24 hours
        this.intervalId = setInterval(() => {
            this.cleanup().catch(err => logger_1.default.error('Cleanup job error:', err));
        }, this.CLEANUP_INTERVAL);
    }
    stop() {
        logger_1.default.info('Stopping login attempts cleanup scheduled job');
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    // For manual execution
    async runNow() {
        logger_1.default.info('Running login attempts cleanup job manually');
        await this.cleanup();
    }
}
exports.CleanupLoginAttemptsJob = CleanupLoginAttemptsJob;
// Create and export singleton instance
exports.cleanupLoginAttemptsJob = new CleanupLoginAttemptsJob();
//# sourceMappingURL=cleanupLoginAttempts.js.map