"use strict";
/**
 * Database Health Checker
 * 데이터베이스 연결 상태와 필수 테이블을 체크합니다.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseChecker = void 0;
const env_validator_1 = require("./env-validator");
const logger_1 = __importDefault(require("./logger"));
class DatabaseChecker {
    constructor(dataSource) {
        this.requiredTables = [
            'users',
            'settings',
        ];
        this.optionalTables = [
            'products',
            'orders',
            'categories',
            'inventory',
            'coupons',
            'themes',
            'posts',
            'pages',
        ];
        this.dataSource = dataSource;
    }
    /**
     * 데이터베이스 연결 체크
     */
    async checkConnection() {
        try {
            if (!this.dataSource.isInitialized) {
                logger_1.default.info('Initializing database connection...');
                await this.dataSource.initialize();
            }
            // Test query
            await this.dataSource.query('SELECT 1');
            logger_1.default.info('✅ Database connection successful');
            return true;
        }
        catch (error) {
            logger_1.default.error('❌ Database connection failed:', error);
            return false;
        }
    }
    /**
     * 필수 테이블 체크
     */
    async checkRequiredTables() {
        const missing = [];
        for (const table of this.requiredTables) {
            const exists = await this.tableExists(table);
            if (!exists) {
                missing.push(table);
            }
        }
        if (missing.length > 0) {
            logger_1.default.warn(`⚠️ Missing required tables: ${missing.join(', ')}`);
        }
        else {
            logger_1.default.info('✅ All required tables exist');
        }
        return {
            success: missing.length === 0,
            missing
        };
    }
    /**
     * 선택적 테이블 체크
     */
    async checkOptionalTables() {
        const existing = [];
        const missing = [];
        for (const table of this.optionalTables) {
            const exists = await this.tableExists(table);
            if (exists) {
                existing.push(table);
            }
            else {
                missing.push(table);
            }
        }
        if (missing.length > 0) {
            logger_1.default.info(`ℹ️ Optional tables not found: ${missing.join(', ')}`);
        }
        return { existing, missing };
    }
    /**
     * 테이블 존재 여부 체크
     */
    async tableExists(tableName) {
        var _a;
        try {
            const result = await this.dataSource.query(`SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`, [tableName]);
            return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.exists) || false;
        }
        catch (error) {
            logger_1.default.error(`Error checking table ${tableName}:`, error);
            return false;
        }
    }
    /**
     * 마이그레이션 상태 체크
     */
    async checkMigrations() {
        try {
            // Check if migrations table exists
            const migrationsTableExists = await this.tableExists('typeorm_migrations');
            if (!migrationsTableExists) {
                logger_1.default.warn('⚠️ Migrations table does not exist');
                return { executed: 0, pending: [] };
            }
            // Get executed migrations
            const executedMigrations = await this.dataSource.query('SELECT name FROM typeorm_migrations ORDER BY id');
            logger_1.default.info(`✅ Executed migrations: ${executedMigrations.length}`);
            return {
                executed: executedMigrations.length,
                pending: [] // TODO: Compare with available migrations
            };
        }
        catch (error) {
            logger_1.default.error('Error checking migrations:', error);
            return { executed: 0, pending: [] };
        }
    }
    /**
     * 전체 헬스 체크
     */
    async performHealthCheck() {
        logger_1.default.info('🏥 Starting database health check...');
        const connection = await this.checkConnection();
        if (!connection) {
            return {
                healthy: false,
                details: {
                    connection: false,
                    requiredTables: { success: false, missing: [] },
                    optionalTables: { existing: [], missing: [] },
                    migrations: { executed: 0, pending: [] }
                }
            };
        }
        const requiredTables = await this.checkRequiredTables();
        const optionalTables = await this.checkOptionalTables();
        const migrations = await this.checkMigrations();
        const healthy = connection && requiredTables.success;
        if (healthy) {
            logger_1.default.info('✅ Database health check passed');
        }
        else {
            logger_1.default.error('❌ Database health check failed');
        }
        return {
            healthy,
            details: {
                connection,
                requiredTables,
                optionalTables,
                migrations
            }
        };
    }
    /**
     * 테이블 생성 시도 (개발 환경에서만)
     */
    async tryCreateMissingTables() {
        if (!env_validator_1.env.isDevelopment()) {
            logger_1.default.warn('Table auto-creation is only available in development mode');
            return;
        }
        try {
            logger_1.default.info('Attempting to synchronize database schema...');
            await this.dataSource.synchronize();
            logger_1.default.info('✅ Database schema synchronized');
        }
        catch (error) {
            logger_1.default.error('Failed to synchronize database schema:', error);
        }
    }
}
exports.DatabaseChecker = DatabaseChecker;
//# sourceMappingURL=database-checker.js.map