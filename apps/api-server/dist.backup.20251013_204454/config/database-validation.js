"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryDatabaseConnection = exports.validateDatabaseConnection = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Validate database connection
 */
async function validateDatabaseConnection(dataSource) {
    try {
        if (!dataSource.isInitialized) {
            // Warning log removed
            return false;
        }
        // Test query
        await dataSource.query('SELECT 1');
        logger_1.default.info('✅ Database connection validated');
        return true;
    }
    catch (error) {
        // Error log removed
        return false;
    }
}
exports.validateDatabaseConnection = validateDatabaseConnection;
/**
 * Retry database connection
 */
async function retryDatabaseConnection(dataSource, maxRetries = 5, delay = 5000) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            if (!dataSource.isInitialized) {
                await dataSource.initialize();
            }
            await dataSource.query('SELECT 1');
            logger_1.default.info('✅ Database connected successfully');
            return true;
        }
        catch (error) {
            retries++;
            // Warning log removed
            if (retries < maxRetries) {
                logger_1.default.info(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    // Error log removed
    return false;
}
exports.retryDatabaseConnection = retryDatabaseConnection;
//# sourceMappingURL=database-validation.js.map