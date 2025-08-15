"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.AppDataSource = void 0;
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.closeDatabaseConnection = closeDatabaseConnection;
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/User");
const RefreshToken_1 = require("../entities/RefreshToken");
const PasswordResetToken_1 = require("../entities/PasswordResetToken");
const EmailVerificationToken_1 = require("../entities/EmailVerificationToken");
const ApprovalLog_1 = require("../entities/ApprovalLog");
const LinkedAccount_1 = require("../entities/LinkedAccount");
const AccountActivity_1 = require("../entities/AccountActivity");
const MediaFile_1 = require("../entities/MediaFile");
const MediaFolder_1 = require("../entities/MediaFolder");
const Product_1 = require("../entities/Product");
const ProductAttribute_1 = require("../entities/ProductAttribute");
const ProductAttributeValue_1 = require("../entities/ProductAttributeValue");
const ProductVariation_1 = require("../entities/ProductVariation");
const Order_1 = require("../entities/Order");
const OrderItem_1 = require("../entities/OrderItem");
const Cart_1 = require("../entities/Cart");
const CartItem_1 = require("../entities/CartItem");
const Category_1 = require("../entities/Category");
const Settings_1 = require("../entities/Settings");
const Coupon_1 = require("../entities/Coupon");
const Theme_1 = require("../entities/Theme");
const FundingProject_1 = require("../entities/crowdfunding/FundingProject");
const FundingReward_1 = require("../entities/crowdfunding/FundingReward");
const FundingBacking_1 = require("../entities/crowdfunding/FundingBacking");
const BackerReward_1 = require("../entities/crowdfunding/BackerReward");
const FundingUpdate_1 = require("../entities/crowdfunding/FundingUpdate");
const ForumCategory_1 = require("../entities/ForumCategory");
const ForumComment_1 = require("../entities/ForumComment");
const ForumPost_1 = require("../entities/ForumPost");
const ForumTag_1 = require("../entities/ForumTag");
// Digital Signage entities
const SignageContent_1 = require("../entities/SignageContent");
const SignageSchedule_1 = require("../entities/SignageSchedule");
const Store_1 = require("../entities/Store");
const StorePlaylist_1 = require("../entities/StorePlaylist");
const PlaylistItem_1 = require("../entities/PlaylistItem");
const ScreenTemplate_1 = require("../entities/ScreenTemplate");
const ContentUsageLog_1 = require("../entities/ContentUsageLog");
const Post_1 = require("../entities/Post");
const Page_1 = require("../entities/Page");
const ReusableBlock_1 = require("../entities/ReusableBlock");
const BlockPattern_1 = require("../entities/BlockPattern");
const TemplatePart_1 = require("../entities/TemplatePart");
// 환경변수 기본값 설정
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
// DB_PASSWORD는 반드시 문자열로 처리
const DB_PASSWORD = String(process.env.DB_PASSWORD || '');
const DB_NAME = process.env.DB_NAME || 'o4o_platform';
const NODE_ENV = process.env.NODE_ENV || 'development';
// TypeORM 데이터소스 설정
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    // 개발 환경 설정
    synchronize: false, // 자동 스키마 동기화 비활성화 (마이그레이션 사용)
    logging: NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    // 연결 풀 설정 (CLAUDE.md 정책 기반)
    extra: {
        max: 20, // 최대 연결 수
        min: 5, // 최소 연결 수
        idleTimeoutMillis: 30000, // 유휴 연결 타임아웃
        connectionTimeoutMillis: 2000, // 연결 타임아웃
    },
    // 엔티티 등록
    entities: NODE_ENV === 'production'
        ? ['dist/entities/**/*.js']
        : [
            User_1.User,
            RefreshToken_1.RefreshToken,
            PasswordResetToken_1.PasswordResetToken,
            EmailVerificationToken_1.EmailVerificationToken,
            ApprovalLog_1.ApprovalLog,
            LinkedAccount_1.LinkedAccount,
            AccountActivity_1.AccountActivity,
            MediaFile_1.MediaFile,
            MediaFolder_1.MediaFolder,
            Product_1.Product,
            ProductAttribute_1.ProductAttribute,
            ProductAttributeValue_1.ProductAttributeValue,
            ProductVariation_1.ProductVariation,
            Order_1.Order,
            OrderItem_1.OrderItem,
            Cart_1.Cart,
            CartItem_1.CartItem,
            Category_1.Category,
            Settings_1.Settings,
            Coupon_1.Coupon,
            Coupon_1.CouponUsage,
            Theme_1.Theme,
            Theme_1.ThemeInstallation,
            // Crowdfunding entities
            FundingProject_1.FundingProject,
            FundingReward_1.FundingReward,
            FundingBacking_1.FundingBacking,
            BackerReward_1.BackerReward,
            FundingUpdate_1.FundingUpdate,
            // Forum entities
            ForumCategory_1.ForumCategory,
            ForumPost_1.ForumPost,
            ForumComment_1.ForumComment,
            ForumTag_1.ForumTag,
            // Digital Signage entities
            SignageContent_1.SignageContent,
            SignageSchedule_1.SignageSchedule,
            Store_1.Store,
            StorePlaylist_1.StorePlaylist,
            PlaylistItem_1.PlaylistItem,
            ScreenTemplate_1.ScreenTemplate,
            ContentUsageLog_1.ContentUsageLog,
            // Content entities
            Post_1.Post,
            Page_1.Page,
            ReusableBlock_1.ReusableBlock,
            BlockPattern_1.BlockPattern,
            TemplatePart_1.TemplatePart
        ],
    // 마이그레이션 설정
    migrations: NODE_ENV === 'production'
        ? ['dist/database/migrations/*.js']
        : ['src/database/migrations/*.ts'],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: false, // 자동 마이그레이션 비활성화 (수동 실행)
    // SSL 설정 (프로덕션 환경)
    ssl: NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    // 캐시 설정
    cache: {
        type: 'database',
        tableName: 'typeorm_query_cache',
        duration: 30000 // 30초 캐시
    }
});
// 데이터베이스 연결 상태 모니터링
// 주의: main.ts에서 초기화하므로 여기서는 자동 초기화하지 않음
// PM2 클러스터 모드에서 중복 초기화 방지
/*
AppDataSource.initialize()
  .then(() => {
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
  });
*/
// 데이터베이스 헬스 체크 함수
async function checkDatabaseHealth() {
    var _a, _b;
    try {
        if (!exports.AppDataSource.isInitialized) {
            return { status: 'disconnected', error: 'DataSource not initialized' };
        }
        // 간단한 쿼리로 연결 상태 확인
        await exports.AppDataSource.query('SELECT 1');
        return {
            status: 'connected',
            host: DB_HOST,
            port: DB_PORT,
            database: DB_NAME,
            connectionCount: ((_b = (_a = exports.AppDataSource.driver) === null || _a === void 0 ? void 0 : _a.pool) === null || _b === void 0 ? void 0 : _b.size) || 0,
            maxConnections: 20,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}
// 데이터베이스 정리 함수 (종료 시 사용)
async function closeDatabaseConnection() {
    try {
        if (exports.AppDataSource.isInitialized) {
            await exports.AppDataSource.destroy();
        }
    }
    catch (error) {
        console.error('❌ Error closing database connection:', error);
    }
}
// initializeDatabase function for backward compatibility
const initializeDatabase = () => exports.AppDataSource.initialize();
exports.initializeDatabase = initializeDatabase;
// TypeORM CLI를 위한 default export
exports.default = exports.AppDataSource;
//# sourceMappingURL=connection.js.map