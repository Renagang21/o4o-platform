"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
exports.withTransaction = withTransaction;
exports.getDatabaseStats = getDatabaseStats;
// src/partner/database/connection.ts
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let db = null;
async function initializeDatabase() {
    if (db) {
        return db;
    }
    try {
        // 데이터베이스 디렉토리 생성
        const dbDir = path_1.default.join(__dirname, '../../../data');
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        // SQLite 데이터베이스 연결
        db = await (0, sqlite_1.open)({
            filename: path_1.default.join(dbDir, 'partner.db'),
            driver: sqlite3_1.default.Database
        });
        console.log('✅ Partner 데이터베이스 연결 성공');
        // 스키마 초기화
        await initializeSchema();
        return db;
    }
    catch (error) {
        console.error('❌ Partner 데이터베이스 연결 실패:', error);
        throw error;
    }
}
async function initializeSchema() {
    if (!db) {
        throw new Error('데이터베이스가 초기화되지 않았습니다.');
    }
    try {
        // 스키마 파일 읽기
        const schemaPath = path_1.default.join(__dirname, 'schema.sql');
        const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
        // SQL 문들을 분리하여 실행
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);
        for (const statement of statements) {
            await db.exec(statement);
        }
        console.log('✅ Partner 데이터베이스 스키마 초기화 완료');
    }
    catch (error) {
        console.error('❌ 스키마 초기화 실패:', error);
        throw error;
    }
}
async function getDatabase() {
    if (!db) {
        return await initializeDatabase();
    }
    return db;
}
async function closeDatabase() {
    if (db) {
        await db.close();
        db = null;
        console.log('✅ Partner 데이터베이스 연결 종료');
    }
}
// 트랜잭션 헬퍼
async function withTransaction(callback) {
    const database = await getDatabase();
    await database.run('BEGIN TRANSACTION');
    try {
        const result = await callback(database);
        await database.run('COMMIT');
        return result;
    }
    catch (error) {
        await database.run('ROLLBACK');
        throw error;
    }
}
// 데이터베이스 통계
async function getDatabaseStats() {
    const database = await getDatabase();
    const [partnerCount, activePartnerCount, pendingApplicationCount, clickCount, conversionCount, earningsSum] = await Promise.all([
        database.get('SELECT COUNT(*) as count FROM partner_profiles'),
        database.get('SELECT COUNT(*) as count FROM partner_profiles WHERE status = "active"'),
        database.get('SELECT COUNT(*) as count FROM partner_applications WHERE status = "pending"'),
        database.get('SELECT SUM(total_clicks) as total FROM partner_profiles'),
        database.get('SELECT SUM(total_conversions) as total FROM partner_profiles'),
        database.get('SELECT SUM(total_earnings) as total FROM partner_profiles')
    ]);
    return {
        totalPartners: partnerCount?.count || 0,
        activePartners: activePartnerCount?.count || 0,
        pendingApplications: pendingApplicationCount?.count || 0,
        totalClicks: clickCount?.total || 0,
        totalConversions: conversionCount?.total || 0,
        totalEarnings: parseFloat(earningsSum?.total) || 0
    };
}
