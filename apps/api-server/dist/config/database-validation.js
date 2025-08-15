"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDatabaseConnection = validateDatabaseConnection;
exports.retryDatabaseConnection = retryDatabaseConnection;
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Validate database connection
 */
async function validateDatabaseConnection(dataSource) {
    try {
        if (!dataSource.isInitialized) {
            console.warn('⚠️  Database connection not initialized');
            return false;
        }
        // Test query
        await dataSource.query('SELECT 1');
        logger_1.default.info('✅ Database connection validated');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection validation failed:', error);
        return false;
    }
}
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
            console.warn(`⚠️  Database connection attempt ${retries}/${maxRetries} failed`);
            if (retries < maxRetries) {
                logger_1.default.info(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    console.error('❌ Failed to connect to database after maximum retries');
    return false;
}
//# sourceMappingURL=database-validation.js.map