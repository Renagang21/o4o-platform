"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStartupValidations = runStartupValidations;
const toss_payments_1 = require("./config/toss-payments");
const data_source_1 = __importDefault(require("./database/data-source"));
const database_validation_1 = require("./config/database-validation");
const logger_1 = __importDefault(require("./utils/logger"));
/**
 * Run all startup validations
 */
async function runStartupValidations() {
    logger_1.default.info('🚀 Running startup validations...');
    // 1. Environment variables
    const requiredEnvVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'REFRESH_TOKEN_SECRET',
    ];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
        console.warn('⚠️  Missing required environment variables:', missingVars);
    }
    // 2. Database connection
    const dbValid = await (0, database_validation_1.validateDatabaseConnection)(data_source_1.default);
    if (!dbValid) {
        console.warn('⚠️  Database connection validation failed');
    }
    // 3. TossPayments configuration
    (0, toss_payments_1.validateTossPaymentsConfig)();
    // 4. Check for shipments table
    try {
        await data_source_1.default.query('SELECT 1 FROM shipments LIMIT 1');
        logger_1.default.info('✅ Shipments table exists');
    }
    catch (error) {
        console.warn('⚠️  Shipments table not found. Run migrations: npm run migration:run');
    }
    logger_1.default.info('\n✅ Startup validations complete\n');
}
//# sourceMappingURL=startup-validation.js.map